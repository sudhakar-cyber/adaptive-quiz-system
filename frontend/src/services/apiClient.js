import { auth } from '../config/firebase.js';

/**
 * Single place where the frontend talks to the FastAPI backend.
 *
 * The backend treats MySQL as the only source of truth, so every request
 * carries the identity headers the auth middleware needs:
 *   Authorization : Bearer <firebase id token or session token>
 *   X-User-Role  : the role of the signed in account (never trusted blindly)
 *   X-User-UID   : the database id of the account
 *   X-User-Email : the email of the account
 *   X-User-Name  : the display name of the account
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

export const ROLE_ADMIN = 'admin';
export const ROLE_EDUCATOR = 'educator';
export const ROLE_STUDENT = 'student';

const ROLE_HOME = {
  [ROLE_ADMIN]: '/admin-dashboard',
  [ROLE_EDUCATOR]: '/educator-dashboard',
  [ROLE_STUDENT]: '/dashboard',
};

/** The dashboard route that belongs to a role. */
export const homeRouteForRole = (role) => ROLE_HOME[(role || '').toLowerCase()] || '/login';

/** Reads the role of the current session from storage. */
export const getCurrentRole = () => {
  try {
    const role =
      (typeof localStorage !== 'undefined' && localStorage.getItem('learnsmart_role')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('learnsmart_role')) ||
      '';
    const normalized = String(role).toLowerCase();
    if (normalized === ROLE_ADMIN || normalized === ROLE_EDUCATOR || normalized === ROLE_STUDENT) {
      return normalized;
    }
    if (localStorage.getItem('learnsmart_admin') || sessionStorage.getItem('learnsmart_admin')) {
      return ROLE_ADMIN;
    }
    if (localStorage.getItem('learnsmart_educator') || sessionStorage.getItem('learnsmart_educator')) {
      return ROLE_EDUCATOR;
    }
    return null;
  } catch {
    return null;
  }
};

/** Reads the identity of the current session from storage. */
export const getCurrentIdentity = () => {
  const role = getCurrentRole() || ROLE_STUDENT;
  const read = (key) => {
    try {
      return (
        (typeof localStorage !== 'undefined' && localStorage.getItem(key)) ||
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) ||
        ''
      );
    } catch {
      return '';
    }
  };
  const readJson = (key) => {
    try {
      const raw = read(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  let email = '';
  let uid = '';
  let name = '';

  if (role === ROLE_EDUCATOR) {
    const educator = readJson('learnsmart_educator');
    email = educator?.email || read('learnsmart_email');
    uid = educator?.id || educator?.educatorId || read('learnsmart_uid') || 'edu-201';
    name = educator?.name || educator?.fullName || read('learnsmart_user');
  } else if (role === ROLE_ADMIN) {
    const admin = readJson('learnsmart_admin');
    email = admin?.email || read('learnsmart_email') || 'admin@learnsmart.edu';
    uid = admin?.uid || admin?.id || read('learnsmart_uid') || 'admin-system';
    name = admin?.name || admin?.fullName || read('learnsmart_user') || 'System Administrator';
  } else {
    const profile = readJson('learnsmart_student_profile');
    email = read('learnsmart_email') || profile?.email || auth?.currentUser?.email || '';
    uid = read('learnsmart_uid') || profile?.uid || auth?.currentUser?.uid || '';
    name = read('learnsmart_user') || profile?.fullName || auth?.currentUser?.displayName || '';
  }

  return { role, email, uid, name };
};

/** Resolves the bearer token used for backend requests. */
export const getAuthToken = async () => {
  const role = getCurrentRole() || ROLE_STUDENT;

  if (role === ROLE_EDUCATOR || role === ROLE_ADMIN) {
    try {
      if (auth?.currentUser) {
        const identity = getCurrentIdentity();
        if (
          identity.email &&
          auth.currentUser.email &&
          auth.currentUser.email.toLowerCase() === identity.email.toLowerCase()
        ) {
          const token = await auth.currentUser.getIdToken(false).catch(() => null);
          if (token) return token;
        }
      }
    } catch {
      /* fall through to the session token */
    }
    return role === ROLE_EDUCATOR ? 'educator-session-token' : 'admin-session-token';
  }

  try {
    if (auth) {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(false).catch(() => null);
        if (token) return token;
      }
    }
  } catch {
    /* fall through to the session token */
  }
  return 'student-session-token';
};

/** Builds the full authentication header bag for a backend request. */
export const getAuthHeaders = async () => {
  const headers = { Authorization: `Bearer ${await getAuthToken()}` };
  const identity = getCurrentIdentity();
  headers['X-User-Role'] = identity.role;
  if (identity.email) headers['X-User-Email'] = identity.email;
  if (identity.uid) headers['X-User-UID'] = identity.uid;
  if (identity.name) headers['X-User-Name'] = identity.name;
  return headers;
};

/**
 * Performs a request against the backend.
 *
 * Resolves with the parsed body and rejects with an Error carrying the
 * backend `detail` message so callers can surface it to the user.
 */
export const apiRequest = async (path, { method = 'GET', body, headers, signal, auth: useAuth = true } = {}) => {
  const requestHeaders = { ...(useAuth ? await getAuthHeaders() : {}) };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (headers) Object.assign(requestHeaders, headers);

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail =
      (payload && typeof payload === 'object' && (payload.detail || payload.message)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(Array.isArray(detail) ? detail.map((d) => d.msg || d).join(', ') : detail);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const apiGet = (path, options) => apiRequest(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) => apiRequest(path, { ...options, method: 'POST', body });
export const apiPut = (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body });
export const apiDelete = (path, options) => apiRequest(path, { ...options, method: 'DELETE' });

export const apiClient = {
  API_BASE,
  getCurrentRole,
  getCurrentIdentity,
  homeRouteForRole,
  getAuthToken,
  getAuthHeaders,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
};

export default apiClient;
