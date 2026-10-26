import { INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData.js';
import { QUIZ_CATALOG } from '../data/quizData.js';
import { auth, db, collection, getDocs } from '../config/firebase.js';
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getAuthToken,
  getAuthHeaders,
  getCurrentRole,
  getCurrentIdentity,
} from './apiClient.js';

export { getAuthToken, getAuthHeaders };

const STORAGE_KEY_STUDENTS = 'learnsmart_shared_students';
const STORAGE_KEY_LEGACY = 'learnsmart_educator_students';
const STORAGE_KEY_EDUCATORS = 'learnsmart_shared_educators';
const STORAGE_KEY_QUIZZES = 'learnsmart_educator_quizzes';
const STORAGE_KEY_SUBMISSIONS = 'learnsmart_shared_submissions';
const STORAGE_KEY_NOTIFICATIONS = 'learnsmart_notifications_cache';
const STORAGE_KEY_ANALYTICS = 'learnsmart_analytics_cache';
const STORAGE_KEY_BENCHMARK = 'learnsmart_student_benchmark_cache';

const EVENT_STUDENTS_UPDATED = 'learnsmart_students_updated';
const EVENT_STUDENT_NOTIFICATIONS_UPDATED = 'learnsmart_student_notifications_updated';
const EVENT_EDUCATOR_NOTIFICATIONS_UPDATED = 'learnsmart_educator_notifications_updated';
const EVENT_ADMIN_UPDATED = 'learnsmart_admin_updated';
const EVENT_QUIZZES_UPDATED = 'learnsmart_quizzes_updated';
const EVENT_NOTIFICATIONS_UPDATED = 'learnsmart_notifications_updated';
const EVENT_ANALYTICS_UPDATED = 'learnsmart_analytics_updated';
const EVENT_BENCHMARK_UPDATED = 'learnsmart_benchmark_updated';
const EVENT_FEEDBACK_UPDATED = 'learnsmart_feedback_updated';
export const EVENT_SUBMISSIONS_UPDATED = 'learnsmart_submissions_updated';

const DEFAULT_SUBMISSIONS = [];

// In-flight sync locks & throttles to prevent duplicate / recursive requests
let isSyncingQuizzes = false;
let lastQuizzesSyncTime = 0;

let isSyncingSubmissions = false;
let lastSubmissionsSyncTime = 0;

let isSyncingStudents = false;
let lastStudentsSyncTime = 0;

let isSyncingEducators = false;
let lastEducatorsSyncTime = 0;

// Sync quizzes from backend MySQL API into local store
export const syncQuizzesFromBackend = async (force = false) => {
  const now = Date.now();
  if (!force && (isSyncingQuizzes || (now - lastQuizzesSyncTime < 3000))) {
    return loadStoredQuizzes();
  }
  isSyncingQuizzes = true;
  lastQuizzesSyncTime = now;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/quizzes', {
      headers
    });
    if (res.ok) {
      const backendQuizzes = await res.json();
      if (Array.isArray(backendQuizzes)) {
        const currentSaved = localStorage.getItem(STORAGE_KEY_QUIZZES);
        const newStr = JSON.stringify(backendQuizzes);
        if (currentSaved !== newStr) {
          localStorage.setItem(STORAGE_KEY_QUIZZES, newStr);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(EVENT_QUIZZES_UPDATED, { detail: backendQuizzes }));
          }
        }
        return backendQuizzes;
      }
    }
  } catch (err) {
    console.warn('Failed to sync quizzes from backend MySQL:', err);
  } finally {
    isSyncingQuizzes = false;
  }
  return loadStoredQuizzes();
};

// Sync live quiz submissions from backend MySQL database
export const syncSubmissionsFromBackend = async (force = false) => {
  const now = Date.now();
  if (!force && (isSyncingSubmissions || (now - lastSubmissionsSyncTime < 3000))) {
    try {
      const r = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      return r ? JSON.parse(r) : [];
    } catch { return []; }
  }
  isSyncingSubmissions = true;
  lastSubmissionsSyncTime = now;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/results/submissions', {
      headers
    });
    if (res.ok) {
      const backendSubmissions = await res.json();
      if (Array.isArray(backendSubmissions)) {
        const formatted = backendSubmissions.map((s) => ({
          id: s.id,
          student: s.student || s.student_name,
          studentEmail: s.studentEmail || s.student_email,
          studentId: s.studentId || s.student_id,
          quizId: s.quizId || s.quiz_id,
          quizTitle: s.quizTitle || s.quiz_title,
          category: s.category || 'General',
          score: typeof s.score === 'string' && s.score.includes('%') ? s.score : `${Math.round(s.scoreValue ?? s.score ?? 0)}%`,
          scoreValue: Number(s.scoreValue ?? (typeof s.score === 'string' ? parseFloat(s.score) : s.score) ?? 0),
          totalQuestions: s.totalQuestions || s.total_questions || 0,
          correctCount: s.correctCount || s.correct_count || 0,
          status: s.status || (Number(s.scoreValue || 0) >= 70 ? 'Passed' : 'Failed'),
          date: s.date ? (typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : s.date) : 'Today',
          submittedAt: s.submittedAt || s.submitted_at || ''
        }));

        // MySQL is the source of truth: the server list replaces the cache.
        const currentSavedStr = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        const newMergedStr = JSON.stringify(formatted);
        if (currentSavedStr !== newMergedStr) {
          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, newMergedStr);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: formatted }));
          }
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Failed to sync submissions from backend MySQL:', err);
  } finally {
    isSyncingSubmissions = false;
  }
  try {
    const r = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

// Sync live students from backend MySQL database
export const syncStudentsFromBackend = async (force = false) => {
  const now = Date.now();
  if (!force && (isSyncingStudents || (now - lastStudentsSyncTime < 3000))) {
    return loadStoredStudents();
  }
  isSyncingStudents = true;
  lastStudentsSyncTime = now;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/users/students', {
      headers
    });
    if (res.ok) {
      const backendStudents = await res.json();
      if (Array.isArray(backendStudents)) {
        const existingStored = loadStoredStudents();
        const existingMap = new Map();
        existingStored.forEach((s) => {
          if (s.email) existingMap.set(s.email.toLowerCase(), s);
          if (s.id) existingMap.set(String(s.id).toLowerCase(), s);
          if (s.uid) existingMap.set(String(s.uid).toLowerCase(), s);
        });

        const formatted = backendStudents
          .filter((bs) => bs && bs.email)
          .map((bs) => {
            const emailKey = bs.email?.toLowerCase();
            const idKey = String(bs.id || bs.uid || '').toLowerCase();
            const prev = existingMap.get(emailKey) || existingMap.get(idKey);

            const rawCompleted = bs.quizzesCompleted ?? 0;
            const rawAvg = bs.avgScore ?? 0;
            const prevCompleted = prev?.quizzesCompleted ?? 0;
            const prevAvg = prev?.avgScore ?? 0;

            const finalCompleted = rawCompleted > 0 ? rawCompleted : prevCompleted;
            const finalAvg = rawCompleted > 0 ? rawAvg : (prevCompleted > 0 ? prevAvg : rawAvg);
            const finalHigh = Math.max(Number(bs.highestScore ?? 0), Number(prev?.highestScore ?? 0));
            const finalRecent = (Array.isArray(bs.recentSubmissions) && bs.recentSubmissions.length > 0)
              ? bs.recentSubmissions
              : (Array.isArray(prev?.recentSubmissions) ? prev.recentSubmissions : []);

            return {
              id: bs.id || bs.uid,
              uid: bs.uid || bs.id,
              studentId: (bs.studentId && bs.studentId !== bs.uid && bs.studentId !== bs.id && !bs.studentId.startsWith('Pwip') && bs.studentId.length < 25 ? bs.studentId : null) ||
                         bs.student_id ||
                         (bs.email === 'shaikaathif22@gmail.com' ? 'LS-2025-100' : null) ||
                         prev?.studentId ||
                         (typeof generateStudentId === 'function' ? generateStudentId() : 'LS-2025-100'),
              name: bs.name,
              email: bs.email,
              role: bs.role || 'student',
              department: bs.department || prev?.department || 'General',
              phone: bs.phone || prev?.phone || '',
              country: bs.country || prev?.country || '',
              isActive: bs.is_active !== undefined ? Boolean(bs.is_active) : true,
              quizzesCompleted: finalCompleted,
              avgScore: finalAvg,
              highestScore: finalHigh,
              topSubject: bs.topSubject || prev?.topSubject || 'General',
              status: finalAvg >= 85 ? 'Top Performer' : finalAvg >= 70 ? 'On Track' : (finalCompleted === 0 ? 'On Track' : 'Needs Support'),
              statusVariant: finalAvg >= 85 ? 'success' : finalAvg >= 70 ? 'info' : (finalCompleted === 0 ? 'info' : 'warning'),
              streak: Math.max(Number(bs.streak ?? 0), Number(prev?.streak ?? 0)),
              subjectMastery: (Array.isArray(bs.subjectMastery) && bs.subjectMastery.length > 0)
                ? bs.subjectMastery
                : (Array.isArray(prev?.subjectMastery) ? prev.subjectMastery : []),
              avatarImage: bs.avatarImage || prev?.avatarImage || null,
              lastActive: (bs.lastActive && bs.lastActive !== 'Active') ? bs.lastActive : (prev?.lastActive || bs.lastActive || 'Active'),
              recentSubmissions: finalRecent,
              avatarInitials: getInitials(bs.name)
            };
          });

        const currentSavedStr = localStorage.getItem(STORAGE_KEY_STUDENTS) || localStorage.getItem(STORAGE_KEY_LEGACY);
        const newFormattedStr = JSON.stringify(formatted);
        if (currentSavedStr !== newFormattedStr) {
          persistStudents(formatted);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(EVENT_STUDENTS_UPDATED, { detail: formatted }));
          }
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Failed to sync students from backend MySQL:', err);
  } finally {
    isSyncingStudents = false;
  }
  return loadStoredStudents();
};

// Sync educators from backend MySQL database
export const syncEducatorsFromBackend = async (force = false) => {
  const now = Date.now();
  if (!force && (isSyncingEducators || (now - lastEducatorsSyncTime < 3000))) {
    return loadStoredEducators();
  }
  isSyncingEducators = true;
  lastEducatorsSyncTime = now;
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/users/educators', {
      headers
    });
    if (res.ok) {
      const backendEducators = await res.json();
      if (Array.isArray(backendEducators)) {
        const formatted = backendEducators.map((be) => ({
          id: be.id || be.uid,
          uid: be.uid || be.id,
          educatorId: be.educatorId || be.id,
          name: be.name,
          email: be.email,
          role: 'Educator',
          department: be.department || 'Computer Science',
          title: be.title || '',
          phone: be.phone || '',
          isActive: be.isActive !== undefined ? Boolean(be.isActive) : true,
          status: be.status || 'Active',
          statusVariant: 'success',
          quizzesCreated: be.quizzesCreated || 0,
          activeQuizzes: be.activeQuizzes || 0,
          totalStudents: be.totalStudents || 0,
          avgPerformance: be.avgPerformance || 0,
          avatarInitials: getInitials(be.name),
          avatarImage: null,
          institution: 'LearnSmart University',
          lastActive: 'Active',
          joinedDate: be.created_at
            ? new Date(be.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Aug 2025',
          rating: 5.0
        }));

        // MySQL is the source of truth: the server roster replaces the cache.
        const currentSavedStr = localStorage.getItem(STORAGE_KEY_EDUCATORS);
        const newMergedStr = JSON.stringify(formatted);
        if (currentSavedStr !== newMergedStr) {
          persistEducators(formatted);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(EVENT_ADMIN_UPDATED, { detail: formatted }));
          }
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Failed to sync educators from backend MySQL:', err);
  } finally {
    isSyncingEducators = false;
  }
  return loadStoredEducators();
};

// ---------------------------------------------------------------------------
// Notifications - stored in MySQL, shared by every dashboard
// ---------------------------------------------------------------------------

/** Formats a timestamp coming from MySQL as a relative "time ago" label. */
const formatRelativeTime = (value) => {
  if (!value) return '';
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return String(value);

  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/** Maps a notification row from the backend into the shape the UI renders. */
const mapServerNotification = (n) => {
  const createdAt = n?.createdAt || n?.timestamp || '';
  const isRead = Boolean(n?.isRead);
  const relative = formatRelativeTime(createdAt);
  return {
    id: n?.id,
    title: n?.title || '',
    message: n?.message || '',
    category: n?.category || 'general',
    link: n?.link || null,
    entityType: n?.entityType || null,
    entityId: n?.entityId || null,
    sender: n?.actorName || 'System',
    senderRole: n?.actorRole || 'system',
    unread: !isRead,
    read: isRead,
    isRead,
    priority: 'normal',
    type: 'info',
    createdAt,
    timestamp: relative,
    time: relative,
    date: createdAt ? new Date(createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    targetStudentIds: 'all',
    targetStudentNames: []
  };
};

/** Reads the cached notifications of the signed-in account. */
export const getCachedNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Writes the cached notifications of the signed-in account. */
const persistNotifications = (notifications) => {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.warn('Failed to persist notifications cache:', err);
  }
};

/**
 * Loads the notifications addressed to the signed-in account from MySQL.
 * The backend already scopes the list to the caller, so the admin, educator
 * and student dashboards all read from the same table.
 */
export const syncNotificationsFromBackend = async (force = false) => {
  try {
    const data = await apiGet('/api/notifications?limit=100');
    const notifications = Array.isArray(data?.notifications) ? data.notifications.map(mapServerNotification) : [];
    persistNotifications(notifications);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: notifications }));
      window.dispatchEvent(new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: notifications }));
      window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: notifications }));
    }
    return notifications;
  } catch (err) {
    console.warn('Failed to load notifications from MySQL:', err.message);
    return getCachedNotifications();
  }
};

/** Marks one notification as read (server side) and updates the cache. */
export const markNotificationRead = async (notificationId) => {
  if (!notificationId) return getCachedNotifications();
  try {
    await apiPost(`/api/notifications/${encodeURIComponent(notificationId)}/read`);
  } catch (err) {
    console.warn('Backend mark notification read notice:', err.message);
  }
  const updated = getCachedNotifications().map((n) =>
    n.id === notificationId ? { ...n, unread: false, read: true, isRead: true } : n
  );
  persistNotifications(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: updated }));
    window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updated }));
  }
  return updated;
};

/** Marks every notification of the signed-in account as read. */
export const markAllNotificationsRead = async () => {
  try {
    await apiPost('/api/notifications/read-all');
  } catch (err) {
    console.warn('Backend markAllNotificationsRead notice:', err.message);
  }
  const updated = getCachedNotifications().map((n) => ({ ...n, unread: false, read: true, isRead: true }));
  persistNotifications(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: updated }));
    window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updated }));
  }
  return updated;
};

/** Deletes one notification (server side) and updates the cache. */
export const deleteNotification = async (notificationId) => {
  if (!notificationId) return getCachedNotifications();
  try {
    await apiDelete(`/api/notifications/${encodeURIComponent(notificationId)}`);
  } catch (err) {
    console.warn('Backend delete notification notice:', err.message);
  }
  const updated = getCachedNotifications().filter((n) => n.id !== notificationId);
  persistNotifications(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: updated }));
    window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updated }));
  }
  return updated;
};

/** Sends a notification through MySQL to the given audience. */
export const sendNotification = async ({
  title,
  message = '',
  category = 'announcement',
  recipientType = 'all',
  recipientId = null,
  link = null
} = {}) => {
  if (!title) return null;
  try {
    const result = await apiPost('/api/notifications', {
      title,
      message,
      category,
      recipientType,
      recipientId,
      link
    });
    await syncNotificationsFromBackend(true);
    return result;
  } catch (err) {
    console.warn('Failed to send notification:', err.message);
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Analytics - computed by the backend from the data stored in MySQL
// ---------------------------------------------------------------------------

/** Loads the role scoped analytics payload from the backend. */
export const syncAnalyticsFromBackend = async (force = false) => {
  try {
    const [overview, analytics, categories, growth] = await Promise.allSettled([
      apiGet('/api/analytics/overview'),
      apiGet('/api/analytics'),
      apiGet('/api/analytics/categories'),
      apiGet('/api/analytics/growth')
    ]);

    const payload = {
      overview: overview.status === 'fulfilled' ? overview.value : null,
      analytics: analytics.status === 'fulfilled' ? analytics.value : null,
      categories: categories.status === 'fulfilled' ? (categories.value?.categories || []) : [],
      growth: growth.status === 'fulfilled' ? (growth.value?.points || []) : []
    };

    try {
      localStorage.setItem(STORAGE_KEY_ANALYTICS, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist analytics cache:', err);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_ANALYTICS_UPDATED, { detail: payload }));
    }
    return payload;
  } catch (err) {
    console.warn('Failed to load analytics from MySQL:', err.message);
    return getCachedAnalytics();
  }
};

/** Reads the cached analytics payload. */
export const getCachedAnalytics = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANALYTICS);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object'
      ? parsed
      : { overview: null, analytics: null, categories: [], growth: [] };
  } catch {
    return { overview: null, analytics: null, categories: [], growth: [] };
  }
};

// Anonymised class benchmark for the signed-in student
// ---------------------------------------------------------------------------

/** Loads the class benchmark (average score + spread) for the student. */
export const syncStudentBenchmark = async () => {
  try {
    const data = await apiGet('/api/analytics/student-benchmark');
    const benchmark = data && typeof data === 'object' ? data : null;
    try {
      if (benchmark) {
        localStorage.setItem(STORAGE_KEY_BENCHMARK, JSON.stringify(benchmark));
      } else {
        localStorage.removeItem(STORAGE_KEY_BENCHMARK);
      }
    } catch (err) {
      console.warn('Failed to persist the benchmark cache:', err);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_BENCHMARK_UPDATED, { detail: benchmark }));
    }
    return benchmark;
  } catch (err) {
    console.warn('Failed to load the class benchmark from MySQL:', err?.message || err);
    return null;
  }
};

/** Reads the cached class benchmark. */
export const getStudentBenchmark = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BENCHMARK);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

// Sync all platform data from backend MySQL database for live tracking
export const syncAllFromBackend = async () => {
  const [quizzes, submissions, students, educators] = await Promise.allSettled([
    syncQuizzesFromBackend(),
    syncSubmissionsFromBackend(),
    syncStudentsFromBackend(),
    syncEducatorsFromBackend()
  ]);
  const [analytics, notifications] = await Promise.allSettled([
    syncAnalyticsFromBackend(),
    syncNotificationsFromBackend()
  ]);
  return {
    quizzes: quizzes.status === 'fulfilled' ? quizzes.value : [],
    submissions: submissions.status === 'fulfilled' ? submissions.value : [],
    students: students.status === 'fulfilled' ? students.value : [],
    educators: educators.status === 'fulfilled' ? educators.value : [],
    analytics: analytics.status === 'fulfilled' ? analytics.value : null,
    notifications: notifications.status === 'fulfilled' ? notifications.value : []
  };
};

// Helper: Extract Initials from Full Name
export const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper: Generate Guaranteed Unique Student ID for each student
export const generateStudentId = (existingList = []) => {
  const allStudents = (existingList && existingList.length > 0)
    ? existingList
    : (typeof loadStoredStudents === 'function' ? loadStoredStudents() : []);

  const existingIds = new Set();
  (allStudents || []).forEach((s) => {
    if (s && s.studentId) existingIds.add(String(s.studentId).trim().toUpperCase());
  });

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('learnsmart_shared_students') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((s) => {
          if (s && s.studentId) existingIds.add(String(s.studentId).trim().toUpperCase());
        });
      }
    }
  } catch (e) { }

  let counter = 1001;
  while (existingIds.has(`LS-2025-${counter}`)) {
    counter++;
  }
  return `LS-2025-${counter}`;
};

// Safe compatibility check
export const isTargetToDelete = () => false;

// Initialize / Load Students from LocalStorage
const loadStoredStudents = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS) || localStorage.getItem(STORAGE_KEY_LEGACY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => {
          if (!s) return false;
          const k = (s.uid || s.email || s.id || s.name || '').toLowerCase();
          if (k.includes('stud-dev') || k.includes('demo') || k.includes('student@learnsmart.edu') || k.includes('alex morgan')) return false;
          return true;
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load students from localStorage:', err);
  }

  return [];
};

// Sync registered students from Firebase Firestore into sharedDatabase
let isSyncingFirestore = false;
let lastFirestoreSyncTime = 0;

export const syncStudentsFromFirestore = async (force = false) => {
  const now = Date.now();
  if (!force && (isSyncingFirestore || (now - lastFirestoreSyncTime < 8000))) {
    return;
  }
  isSyncingFirestore = true;
  lastFirestoreSyncTime = now;

  try {
    if (!db) {
      isSyncingFirestore = false;
      return;
    }
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    if (!snapshot || snapshot.empty) {
      isSyncingFirestore = false;
      return;
    }

    const all = loadStoredStudents();
    let hasChanges = false;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id || data.uid;
      const email = (data.email || '').trim().toLowerCase();
      const role = (data.role || 'student').trim().toLowerCase();

      // Only sync students
      if (role !== 'student') return;

      const fullName = (
        data.displayName ||
        data.name ||
        `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
        (email ? email.split('@')[0] : 'Student')
      );

      // Check if student already in local database
      const existingIdx = all.findIndex(
        (s) => (s.uid && uid && s.uid === uid) || (email && s.email && s.email.toLowerCase() === email)
      );

      if (existingIdx !== -1) {
        const existing = all[existingIdx];
        let studentChanged = false;
        if (!existing.phone && (data.phoneNumber || data.phone)) {
          existing.phone = data.phoneNumber || data.phone;
          studentChanged = true;
        }
        if (!existing.country && data.country) {
          existing.country = data.country;
          studentChanged = true;
        }
        if (studentChanged) {
          all[existingIdx] = existing;
          hasChanges = true;
        }
      } else {
        const newStud = {
          id: uid ? `stud-${uid}` : `stud-${Date.now()}`,
          name: fullName,
          email,
          phone: data.phoneNumber || data.phone || '',
          country: data.country || '',
          studentId: data.studentId || generateStudentId(all),
          role: 'student',
          created_at: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          quizzesCompleted: data.quizzesCompleted || 0,
          avgScore: data.avgScore || 0,
          highestScore: data.highestScore || 0,
          topSubject: data.topSubject || 'General / Onboarding',
          status: 'On Track',
          statusVariant: 'info',
          lastActive: 'Recently',
          avatarInitials: getInitials(fullName),
          avatarImage: data.photoURL || null,
          uid: uid || '',
          authProvider: data.authProvider || 'firebase',
          isActive: data.isActive !== undefined ? data.isActive : true,
          subjectMastery: [
            { subject: 'Mathematics', score: 0 },
            { subject: 'Data Structures', score: 0 },
            { subject: 'Python', score: 0 },
            { subject: 'Web Security', score: 0 },
            { subject: 'Others', score: 0 }
          ],
          recentSubmissions: []
        };
        all.unshift(newStud);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      persistStudents(all);
    }
  } catch (err) {
    console.warn('Notice: Background sync from Firestore skipped:', err);
  } finally {
    isSyncingFirestore = false;
  }
};

// Initial background sync
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncStudentsFromFirestore().catch(() => { });
  }, 1000);
}

// Seed Educators
const INITIAL_SEED_EDUCATORS = [
  {
    id: 'edu-201',
    name: 'Dr. Sarah Jenkins',
    email: 'educator@learnsmart.com',
    password: 'Educator@123',
    educatorId: 'FAC-CS-2025-101',
    department: 'Computer Science',
    institution: 'LearnSmart University',
    role: 'Educator',
    status: 'Active',
    statusVariant: 'success',
    joinedDate: '15 Aug 2025',
    lastActive: 'Just now',
    avatarInitials: 'SJ',
    avatarImage: null,
    quizzesCreated: 0,
    activeQuizzes: 0,
    totalStudents: 0,
    avgPerformance: 0,
    rating: 5.0,
    isActive: true
  }
];

// Load Stored Educators
const loadStoredEducators = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EDUCATORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load educators from localStorage:', err);
  }

  try {
    localStorage.setItem(STORAGE_KEY_EDUCATORS, JSON.stringify(INITIAL_SEED_EDUCATORS));
  } catch (err) {
    console.warn('Failed to seed educators to localStorage:', err);
  }
  return INITIAL_SEED_EDUCATORS;
};

// Persist Educators
const persistEducators = (educators) => {
  try {
    localStorage.setItem(STORAGE_KEY_EDUCATORS, JSON.stringify(educators));
  } catch (err) {
    console.error('Failed to persist educators:', err);
  }
  notifyAdminSubscribers();
};

// Storage Keys & Clean Slate Reset
const STORAGE_KEY_CLEAN_SLATE = 'learnsmart_clean_slate_v7';

// Execute one-time clean slate reset to purge all default student data and default quizzes while preserving educator and admin credentials
const performCleanSlateReset = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY_CLEAN_SLATE) !== 'true') {
      // 1. Wipe all default quizzes, submissions, students, and attempt mock data
      localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify([]));
      localStorage.removeItem('learnsmart_student_notifications');
      localStorage.removeItem('learnsmart_admin_notifications');
      localStorage.removeItem('learnsmart_educator_notifications');
      localStorage.setItem('learnsmart_student_quiz_history', JSON.stringify([]));
      localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify([]));
      localStorage.setItem('learnsmart_student_streak', '0');
      localStorage.setItem('learnsmart_educator_reports', JSON.stringify([]));
      localStorage.setItem('learnsmart_shared_feedbacks', JSON.stringify([]));
      localStorage.removeItem('learnsmart_student_profile');
      localStorage.removeItem('learnsmart_active_quiz_attempt');

      // 2. Clear student auth session if previously stored
      const activeRole = localStorage.getItem('learnsmart_role');
      if (activeRole === 'student') {
        localStorage.removeItem('learnsmart_user');
        localStorage.removeItem('learnsmart_email');
        localStorage.removeItem('learnsmart_uid');
        localStorage.removeItem('learnsmart_role');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('learnsmart_user');
          sessionStorage.removeItem('learnsmart_email');
          sessionStorage.removeItem('learnsmart_uid');
          sessionStorage.removeItem('learnsmart_role');
        }
      }

      // 3. Preserve Educator credentials
      const existingEducators = (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_EDUCATORS);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (!Array.isArray(existingEducators) || existingEducators.length === 0) {
        localStorage.setItem(STORAGE_KEY_EDUCATORS, JSON.stringify(INITIAL_SEED_EDUCATORS));
      } else {
        const updatedEdu = existingEducators.map((e) => ({
          ...e,
          quizzesCreated: 0,
          activeQuizzes: 0,
          totalStudents: 0,
          avgPerformance: 0
        }));
        localStorage.setItem(STORAGE_KEY_EDUCATORS, JSON.stringify(updatedEdu));
      }

      // 4. Preserve Admin credentials
      const STORAGE_KEY_ADMIN = 'learnsmart_shared_admin';
      try {
        const rawAdmin = localStorage.getItem(STORAGE_KEY_ADMIN);
        if (!rawAdmin) {
          localStorage.setItem(
            STORAGE_KEY_ADMIN,
            JSON.stringify({
              name: 'System Administrator',
              email: 'admin@learnsmart.edu',
              password: 'Admin@123',
              role: 'admin'
            })
          );
        }
      } catch { }

      localStorage.setItem(STORAGE_KEY_CLEAN_SLATE, 'true');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_QUIZZES_UPDATED, { detail: [] }));
        window.dispatchEvent(new CustomEvent(EVENT_STUDENTS_UPDATED, { detail: [] }));
        window.dispatchEvent(new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: [] }));
        window.dispatchEvent(new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: [] }));
        window.dispatchEvent(new CustomEvent(EVENT_ADMIN_UPDATED, { detail: [] }));
        window.dispatchEvent(new Event('storage'));
      }
    }

    // Always sanitize stored quizzes against default / demo quizzes
    try {
      const rawQuizzes = localStorage.getItem(STORAGE_KEY_QUIZZES);
      if (rawQuizzes) {
        const parsed = JSON.parse(rawQuizzes);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter((q) => {
            if (!q) return false;
            const t = (q.title || '').toLowerCase();
            const id = (q.id || '').toLowerCase();
            if (
              id.includes('python-basics') ||
              id.includes('quiz-179251') ||
              id.includes('quiz-custom-1792576000000') ||
              t.includes('python & programming') ||
              t.includes('operating systems core') ||
              t.includes('operating systems fundamentals') ||
              t.includes('compiler design draft') ||
              t.includes('draft quiz on operating')
            ) return false;
            return true;
          });
          if (sanitized.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(sanitized));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(EVENT_QUIZZES_UPDATED, { detail: sanitized }));
            }
          }
        }
      }
    } catch { }

    // Always sanitize stored students against demo data
    try {
      const rawStudents = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (rawStudents) {
        const parsed = JSON.parse(rawStudents);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter((s) => {
            if (!s) return false;
            const k = (s.uid || s.email || s.id || s.name || '').toLowerCase();
            if (k.includes('stud-dev') || k.includes('demo') || k.includes('student@learnsmart.edu') || k.includes('alex morgan')) return false;
            return true;
          });
          if (sanitized.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(sanitized));
            localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(sanitized));
          }
        }
      }
    } catch { }

    // Synchronize live clean data from MySQL database
    syncAllFromBackend().catch(() => { });
  } catch (e) {
    console.warn('Notice: Clean slate initialization skipped:', e);
  }
};

performCleanSlateReset();

// Load Stored Quizzes
const loadStoredQuizzes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_QUIZZES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load quizzes from localStorage:', err);
  }
  return [];
};

// Persist Quizzes
const persistQuizzes = (quizzes) => {
  try {
    localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(quizzes));
  } catch (err) {
    console.error('Failed to persist quizzes:', err);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_QUIZZES_UPDATED, { detail: quizzes }));
    window.dispatchEvent(new Event('storage'));
  }
  notifyAdminSubscribers();
};

// Save Students to LocalStorage and trigger events
const persistStudents = (students) => {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to persist students:', err);
  }
  notifySubscribers(students.filter((s) => s.isActive !== false));
  notifyAdminSubscribers();
};

// Subscribers List
const subscribers = new Set();
const adminSubscribers = new Set();

const notifySubscribers = (activeStudents) => {
  subscribers.forEach((fn) => {
    try {
      fn(activeStudents);
    } catch (e) {
      console.warn('Subscriber notification error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_STUDENTS_UPDATED, { detail: activeStudents })
    );
  }
};

const notifyAdminSubscribers = () => {
  adminSubscribers.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('Admin subscriber notification error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_ADMIN_UPDATED));
  }
};

/**
 * The submissions of the signed-in student.
 *
 * The backend already scopes `/api/results/submissions` to the caller, so the
 * cache only needs a defensive filter for the shared admin/educator cache.
 */
export const getOwnSubmissions = () => {
  const all = sharedDatabase.getSubmissions();
  const identity = getCurrentIdentity();
  const email = (identity.email || '').toLowerCase().trim();
  const uid = String(identity.uid || '').trim();
  const name = String(identity.name || '').toLowerCase().trim();

  let studentId = '';
  try {
    const profile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || '{}');
    studentId = String(profile?.studentId || '').trim();
  } catch {}

  if (!email && !uid && !name && !studentId) return all;

  const matched = all.filter((s) => {
    const subEmail = (s?.studentEmail || '').toLowerCase().trim();
    const subId = String(s?.studentId || '').trim();
    const subStudent = (s?.student || '').toLowerCase().trim();

    if (email && subEmail && subEmail === email) return true;
    if (uid && subId && (subId === uid || String(s?.id || '').includes(uid))) return true;
    if (studentId && subId && subId.toLowerCase() === studentId.toLowerCase()) return true;
    if (name && subStudent && (
      subStudent === name ||
      subStudent.replace(/\s+/g, '') === name.replace(/\s+/g, '') ||
      subStudent.includes(name) ||
      name.includes(subStudent)
    )) return true;
    if (email && subEmail && email.split('@')[0] === subEmail.split('@')[0]) return true;
    return false;
  });

  if (matched.length > 0) return matched;

  // Defensive fallback: if caller is student and backend returned submissions specifically for them
  const role = getCurrentRole() || identity.role;
  if (role === 'student' && all.length > 0) {
    return all;
  }
  return [];
};

/** Aggregated personal performance of the signed-in student (from MySQL). */
export const getStudentPerformance = () => {
  let own = getOwnSubmissions();
  const identity = getCurrentIdentity();
  const email = (identity.email || '').toLowerCase().trim();
  const uid = String(identity.uid || '').trim();
  const name = String(identity.name || '').toLowerCase().trim();

  // Fallback 1: check student record in loaded students from backend
  if (!own || own.length === 0) {
    const allStudents = loadStoredStudents();
    const student = allStudents.find((s) => {
      const sEmail = (s.email || '').toLowerCase().trim();
      const sUid = String(s.uid || s.id || '').trim();
      const sName = (s.name || '').toLowerCase().trim();
      return (email && sEmail === email) || (uid && sUid === uid) || (name && sName === name);
    });
    if (student && Array.isArray(student.recentSubmissions) && student.recentSubmissions.length > 0) {
      own = student.recentSubmissions.map((sub, idx) => ({
        id: sub.id || (10001 + idx),
        quizId: sub.quizId || sub.quiz_id || null,
        quizTitle: sub.title || sub.quiz_title || 'Quiz',
        category: sub.category || 'General',
        score: sub.score,
        scoreValue: typeof sub.score === 'string' ? parseFloat(sub.score) : Number(sub.score || 0),
        status: sub.status || 'Passed',
        date: sub.date || 'Today',
        submittedAt: sub.submitted_at || sub.submittedAt || ''
      }));
    }
  }

  // Fallback 2: check student's user-scoped localStorage history
  if (!own || own.length === 0) {
    try {
      const userKey = (email || uid || name || 'default').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      const savedHist = JSON.parse(localStorage.getItem(`learnsmart_student_quiz_history_${userKey}`) || '[]');
      if (Array.isArray(savedHist) && savedHist.length > 0) {
        own = savedHist.map((h) => ({
          ...h,
          scoreValue: typeof h.score === 'number' ? h.score : parseFloat(String(h.score).replace('%', '')) || 0
        }));
      }
    } catch {}
  }

  const scores = (own || []).map((s) => {
    if (typeof s?.scoreValue === 'number') return s.scoreValue;
    const parsed = parseFloat(String(s?.score ?? '').replace('%', ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  });

  const total = scores.reduce((acc, value) => acc + value, 0);
  const avgScore = scores.length ? Math.round((total / scores.length) * 10) / 10 : 0;

  return {
    quizzesCompleted: (own || []).length,
    avgScore,
    highestScore: scores.length ? Math.max(...scores) : 0,
    completedQuizIds: [...new Set((own || []).map((s) => s?.quizId).filter(Boolean))],
    submissions: own || []
  };
};

/** Loads the quiz feedback of the signed-in educator from MySQL. */
export const syncFeedbackFromBackend = async () => {
  try {
    const data = await apiGet('/api/feedback');
    const feedback = Array.isArray(data?.feedback) ? data.feedback : [];
    try {
      localStorage.setItem('learnsmart_quiz_feedbacks', JSON.stringify(feedback));
    } catch (err) {
      console.warn('Failed to cache quiz feedback:', err);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_FEEDBACK_UPDATED, { detail: feedback }));
    }
    return feedback;
  } catch (err) {
    console.warn('Failed to load quiz feedback from MySQL:', err?.message || err);
    return [];
  }
};

export const sharedDatabase = {
  syncQuizzesFromBackend: () => syncQuizzesFromBackend(),
  syncSubmissionsFromBackend: () => syncSubmissionsFromBackend(),
  syncStudentsFromBackend: () => syncStudentsFromBackend(),
  syncEducatorsFromBackend: () => syncEducatorsFromBackend(),
  syncNotificationsFromBackend: (force = false) => syncNotificationsFromBackend(force),
  syncAnalyticsFromBackend: (force = false) => syncAnalyticsFromBackend(force),
  syncStudentBenchmark: () => syncStudentBenchmark(),
  syncAllFromBackend: () => syncAllFromBackend(),
  getNotifications: () => getCachedNotifications(),
  getAnalytics: () => getCachedAnalytics().analytics,
  getOwnSubmissions: () => getOwnSubmissions(),
  getStudentPerformance: () => getStudentPerformance(),
  getStudentBenchmark: () => getStudentBenchmark(),
  markNotificationRead: (id) => markNotificationRead(id),
  markAllNotificationsRead: () => markAllNotificationsRead(),
  deleteNotification: (id) => deleteNotification(id),
  sendNotification: (payload) => sendNotification(payload),

  syncStudentsFromFirestore: (force = false) => {
    return syncStudentsFromBackend();
  },

  // Get active students list
  getStudents: () => {
    const all = loadStoredStudents();
    return all.filter((s) => s.isActive !== false);
  },

  // Get all students including inactive
  getAllStudents: () => {
    return loadStoredStudents();
  },

  // Find student by email
  getStudentByEmail: (email) => {
    if (!email) return null;
    const lower = email.trim().toLowerCase();
    const all = loadStoredStudents();
    return all.find((s) => s.email && s.email.toLowerCase() === lower) || null;
  },

  // Find student by username or email or name or uid
  getStudentByUsername: (identifier) => {
    if (!identifier) return null;
    const lower = String(identifier).trim().toLowerCase();
    const all = loadStoredStudents();

    // 0. Direct uid match
    let match = all.find((s) => s.uid && s.uid.toLowerCase() === lower);
    if (match) return match;

    // 1. Direct email match
    match = all.find((s) => s.email && s.email.toLowerCase() === lower);
    if (match) return match;

    // 2. Direct name match
    match = all.find((s) => s.name && s.name.toLowerCase() === lower);
    if (match) return match;

    // 3. Match username before @ or without spaces
    match = all.find((s) => {
      const emailUser = (s.email || '').split('@')[0].toLowerCase();
      const nameUser = (s.name || '').toLowerCase().replace(/\s+/g, '');
      const queryUser = lower.replace(/\s+/g, '').split('@')[0];
      return emailUser === queryUser || nameUser === queryUser;
    });

    return match || null;
  },

  // Find student by ID
  getStudentById: (id) => {
    if (!id) return null;
    const all = loadStoredStudents();
    return all.find((s) => s.id === id) || null;
  },

  // Find student by Firebase UID
  getStudentByUid: (uid) => {
    if (!uid) return null;
    const all = loadStoredStudents();
    return all.find((s) => s.uid === uid && s.isActive !== false) || null;
  },

  // Register a new Student (from Register Page or Google Signup)
  registerStudent: ({
    firstName = '',
    lastName = '',
    name = '',
    email = '',
    password = '',
    phone = '',
    country = '',
    avatarImage = null,
    photoURL = null,
    uid = '',
    authProvider = 'local',
    isActive = true
  }) => {
    const all = loadStoredStudents();
    const cleanEmail = (email || '').trim().toLowerCase();
    const resolvedAvatar = avatarImage || photoURL || null;
    const fullName = name ? name.trim() : `${firstName} ${lastName}`.trim() || 'Student';

    // Check if student already exists by email or uid
    const existingIndex = all.findIndex(
      (s) => (cleanEmail && s.email && s.email.toLowerCase() === cleanEmail) ||
        (uid && s.uid && s.uid === uid)
    );

    if (existingIndex !== -1) {
      // If student was deactivated, reactivate and update fields
      const existing = all[existingIndex];
      const assignedId = existing.studentId || generateStudentId(all);
      const updated = {
        ...existing,
        name: (fullName && fullName !== 'Student') ? fullName : existing.name,
        avatarImage: resolvedAvatar || existing.avatarImage || null,
        uid: uid || existing.uid || '',
        studentId: assignedId,
        avatarInitials: getInitials((fullName && fullName !== 'Student') ? fullName : existing.name),
        authProvider: authProvider || existing.authProvider,
        password: password || existing.password || '',
        isActive: true,
        lastActive: 'Just now'
      };
      all[existingIndex] = updated;
      persistStudents(all);
      return updated;
    }

    const userKey = (cleanEmail || uid || fullName).toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    let initCompleted = 0;
    let initAvg = 0;
    let initSubmissions = [];
    try {
      const hist = JSON.parse(localStorage.getItem(`learnsmart_student_quiz_history_${userKey}`) || '[]');
      if (Array.isArray(hist) && hist.length > 0) {
        initCompleted = hist.length;
        initAvg = Math.round((hist.reduce((a, b) => a + (Number(b.score) || 0), 0) / hist.length) * 10) / 10;
        initSubmissions = hist;
      }
    } catch {}

    const newStudent = {
      id: uid ? `stud-${uid}` : `stud-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      password: password || '',
      phone: phone || '',
      country: country || '',
      studentId: generateStudentId(all),
      role: 'student',
      created_at: new Date().toISOString(),
      quizzesCompleted: initCompleted,
      avgScore: initAvg,
      highestScore: initSubmissions.length ? Math.max(...initSubmissions.map(s => Number(s.score) || 0)) : 0,
      topSubject: 'General / Onboarding',
      status: initAvg >= 85 ? 'Top Performer' : initAvg >= 70 ? 'On Track' : 'On Track',
      statusVariant: initAvg >= 85 ? 'success' : 'info',
      lastActive: 'Just now',
      avatarInitials: getInitials(fullName),
      avatarImage: resolvedAvatar,
      uid: uid || '',
      authProvider,
      isActive: isActive !== undefined ? isActive : true,
      subjectMastery: [
        { subject: 'Mathematics', score: 0 },
        { subject: 'Data Structures', score: 0 },
        { subject: 'Python', score: 0 },
        { subject: 'Web Security', score: 0 },
        { subject: 'Others', score: 0 }
      ],
      recentSubmissions: initSubmissions,
      feedbackNote: 'New student registered. Welcome to LearnSmart Adaptive Learning!'
    };

    all.unshift(newStudent);
    persistStudents(all);

    // Create the account in MySQL so the student dashboards, the educator
    // roster and the admin analytics all read the same row.
    if (cleanEmail && password) {
      apiPost(
        '/api/auth/register',
        {
          name: fullName,
          email: cleanEmail,
          password,
          phone: phone || '',
          country: country || '',
          firebaseUid: uid || undefined
        },
        { auth: false }
      ).catch((err) => {
        console.warn('Backend registration note:', err.message);
      });
    }

    return newStudent;
  },

  // Educator manually adds a student
  addStudent: ({
    name = '',
    email = '',
    studentId = '',
    topSubject = 'General',
    status = 'On Track',
    phone = ''
  }) => {
    const all = loadStoredStudents();
    const fullName = name.trim() || 'New Student';
    const cleanEmail = email.trim().toLowerCase();

    // Ensure assigned studentId is strictly unique across all students
    let finalStudentId = studentId ? studentId.trim() : '';
    const isTaken = all.some((s) => s.studentId && s.studentId.toUpperCase() === finalStudentId.toUpperCase());
    if (!finalStudentId || isTaken) {
      finalStudentId = generateStudentId(all);
    }

    const newStudent = {
      id: `stud-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      studentId: finalStudentId,
      phone: phone.trim(),
      role: 'student',
      created_at: new Date().toISOString(),
      quizzesCompleted: 0,
      avgScore: 0,
      highestScore: 0,
      topSubject: topSubject || 'General',
      status: status || 'On Track',
      statusVariant: status === 'Top Performer' ? 'success' : status === 'Needs Support' ? 'warning' : 'info',
      lastActive: 'Just added',
      avatarInitials: getInitials(fullName),
      isActive: true,
      subjectMastery: [
        { subject: topSubject || 'Python Basics', score: 75 }
      ],
      recentSubmissions: [],
      feedbackNote: 'Enrolled by course educator. Welcome to the cohort!'
    };

    all.unshift(newStudent);
    persistStudents(all);

    // Sync student creation to backend MySQL. The cohort endpoint accepts
    // educators (who may only add students to their own cohort) as well as
    // admins, so the local record is rolled back when the server rejects it.
    (async () => {
      try {
        await apiPost('/api/users/cohort/students', {
          name: fullName,
          email: cleanEmail,
          studentId: finalStudentId,
          department: topSubject || 'General',
          topSubject: topSubject || 'General',
          phone: phone.trim()
        });
        await syncStudentsFromBackend(true);
      } catch (err) {
        console.warn('Backend student creation sync note:', err.message);
        persistStudents(loadStoredStudents().filter((s) => s.id !== newStudent.id));
      }
    })();

    return newStudent;
  },

  // Educator / Admin deletes a student and all related submissions
  removeStudent: (studentIdentifier) => {
    const all = loadStoredStudents();
    const cleanId = String(studentIdentifier || '').trim().toLowerCase();

    // Find the student target by id, studentId, or email
    const removedTarget = all.find((s) => {
      const sId = String(s.id || '').trim().toLowerCase();
      const sStudId = String(s.studentId || '').trim().toLowerCase();
      const sEmail = String(s.email || '').trim().toLowerCase();
      return sId === cleanId || sStudId === cleanId || sEmail === cleanId;
    });

    const updated = all.filter((s) => {
      const sId = String(s.id || '').trim().toLowerCase();
      const sStudId = String(s.studentId || '').trim().toLowerCase();
      const sEmail = String(s.email || '').trim().toLowerCase();
      return sId !== cleanId && sStudId !== cleanId && sEmail !== cleanId;
    });

    persistStudents(updated);

    // Delete student (or unlink them from the cohort) in backend MySQL
    (async () => {
      try {
        const targetParam = removedTarget?.email || removedTarget?.id || cleanId;
        await apiDelete(`/api/users/cohort/students/${encodeURIComponent(targetParam)}`);
        await syncStudentsFromBackend(true);
        await syncSubmissionsFromBackend(true);
      } catch (err) {
        console.warn('Backend student deletion sync note:', err.message);
      }
    })();

    // Thoroughly clean up all submissions belonging to this deleted student
    try {
      const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (savedSubmissions) {
        const list = JSON.parse(savedSubmissions);
        if (Array.isArray(list)) {
          const tId = removedTarget ? String(removedTarget.id || '').trim().toLowerCase() : cleanId;
          const tStudId = removedTarget?.studentId ? String(removedTarget.studentId).trim().toLowerCase() : '';
          const tEmail = removedTarget?.email ? String(removedTarget.email).trim().toLowerCase() : '';
          const tName = removedTarget?.name ? String(removedTarget.name).trim().toLowerCase() : '';

          const filtered = list.filter((sub) => {
            const subId = String(sub.studentId || '').trim().toLowerCase();
            const subEmail = String(sub.studentEmail || '').trim().toLowerCase();
            const subName = String(sub.student || '').trim().toLowerCase();

            // Match by ID
            if (tId && subId === tId) return false;
            if (tStudId && subId === tStudId) return false;
            // Match by email
            if (tEmail && subEmail === tEmail) return false;
            // Match by name
            if (tName && (subName === tName || subName.includes(tName) || tName.includes(subName))) return false;

            return true;
          });

          localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(filtered));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: filtered })
            );
            window.dispatchEvent(new Event('storage'));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to update submissions on student remove:', err);
    }

    return updated.filter((s) => s.isActive !== false);
  },

  // Educator deletes all students from directory
  clearAllStudents: () => {
    persistStudents([]);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify([]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: [] })
        );
      }
    } catch (e) {
      console.warn('Failed to clear students storage:', e);
    }

    // Call backend cleanup endpoint
    (async () => {
      try {
        const token = await getAuthToken();
        await fetch('/api/users/cleanup-default-students', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        syncAllFromBackend().catch(() => { });
      } catch (err) {
        console.warn('Backend cleanup sync note:', err);
      }
    })();

    return [];
  },

  removeAllStudents: () => {
    return sharedDatabase.clearAllStudents();
  },

  // Educator resets a student's performance metrics & unlocks quizzes
  resetStudent: (studentIdOrIdentifier, selectedSubjects = null) => {
    const all = loadStoredStudents();
    let idx = all.findIndex((s) => s.id === studentIdOrIdentifier);
    if (idx === -1 && typeof studentIdOrIdentifier === 'string') {
      const lower = studentIdOrIdentifier.trim().toLowerCase();
      idx = all.findIndex(
        (s) =>
          (s.email && s.email.toLowerCase() === lower) ||
          (s.name && s.name.toLowerCase() === lower)
      );
    }

    if (idx !== -1) {
      const targetStudent = all[idx];
      const isResetAll =
        !selectedSubjects ||
        selectedSubjects === 'all' ||
        (Array.isArray(selectedSubjects) && selectedSubjects.length === 0);

      const subjectsToReset = Array.isArray(selectedSubjects)
        ? selectedSubjects.map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : ''))
        : [];

      const matchesSubject = (subName) => {
        if (isResetAll) return true;
        if (!subName) return false;
        const lower = subName.toLowerCase().trim();
        return subjectsToReset.some((resetSub) => {
          if (!resetSub) return false;
          if (resetSub === lower) return true;
          if (
            (resetSub.includes('program') || resetSub.includes('python') || resetSub.includes('javascript')) &&
            (lower.includes('program') || lower.includes('python') || lower.includes('javascript'))
          ) {
            return true;
          }
          if (
            (resetSub.includes('data structure') || resetSub.includes('algorithm') || resetSub.includes('dsa')) &&
            (lower.includes('data structure') || lower.includes('algorithm') || lower.includes('dsa'))
          ) {
            return true;
          }
          if (
            (resetSub.includes('security') || resetSub.includes('cyber') || resetSub.includes('web security')) &&
            (lower.includes('security') || lower.includes('cyber') || lower.includes('web security'))
          ) {
            return true;
          }
          if (
            (resetSub.includes('math') || resetSub.includes('discrete')) &&
            (lower.includes('math') || lower.includes('discrete'))
          ) {
            return true;
          }
          return resetSub.includes(lower) || lower.includes(resetSub);
        });
      };

      let updatedMastery = [];
      if (Array.isArray(targetStudent.subjectMastery)) {
        updatedMastery = targetStudent.subjectMastery.map((m) => {
          if (matchesSubject(m.subject)) {
            return { ...m, score: 0 };
          }
          return { ...m };
        });
      }

      // Filter recentSubmissions
      const updatedSubmissions = Array.isArray(targetStudent.recentSubmissions)
        ? targetStudent.recentSubmissions.filter((sub) => {
          const cat = sub.category || sub.title || '';
          return !matchesSubject(cat);
        })
        : [];

      // Recalculate metrics
      const remainingScores = updatedSubmissions.map((s) => s.score || 0);
      const newQuizzesCompleted = updatedSubmissions.length;
      const newAvg =
        newQuizzesCompleted > 0
          ? Math.round(remainingScores.reduce((a, b) => a + b, 0) / newQuizzesCompleted)
          : 0;
      const newHigh =
        newQuizzesCompleted > 0 ? Math.max(...remainingScores) : 0;

      const nonZeroMastery = updatedMastery.filter((m) => (m.score || 0) > 0);
      const newTopSub =
        nonZeroMastery.length > 0
          ? [...nonZeroMastery].sort((a, b) => b.score - a.score)[0]?.subject
          : targetStudent.topSubject || 'General';

      all[idx] = {
        ...targetStudent,
        quizzesCompleted: newQuizzesCompleted,
        avgScore: newAvg,
        highestScore: newHigh,
        topSubject: newTopSub,
        status: newAvg >= 85 ? 'Top Performer' : newAvg >= 70 ? 'On Track' : newAvg > 0 ? 'Needs Support' : 'On Track',
        statusVariant: newAvg >= 85 ? 'success' : newAvg >= 70 ? 'info' : 'warning',
        lastActive: 'Reset just now',
        recentSubmissions: updatedSubmissions,
        subjectMastery: updatedMastery
      };
      persistStudents(all);

      // Unlock quizzes in localStorage
      try {
        if (isResetAll) {
          localStorage.removeItem('learnsmart_completed_quizzes');
          localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify([]));
          localStorage.removeItem('learnsmart_active_quiz_attempt');
          localStorage.removeItem('learnsmart_student_quiz_history');
        } else {
          // Selectively unlock completed quizzes matching the reset subjects
          const completed = JSON.parse(localStorage.getItem('learnsmart_completed_quizzes') || '[]');
          if (Array.isArray(completed)) {
            const allQuizzes = sharedDatabase.getPublishedQuizzes ? sharedDatabase.getPublishedQuizzes() : [];
            const remainingCompleted = completed.filter((qId) => {
              const quizObj = allQuizzes.find((q) => q.id === qId);
              const cat = quizObj ? (quizObj.category || quizObj.title || '') : qId;
              return !matchesSubject(cat);
            });
            localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify(remainingCompleted));
          }

          // Filter quiz history
          const hist = JSON.parse(localStorage.getItem('learnsmart_student_quiz_history') || '[]');
          if (Array.isArray(hist)) {
            const remainingHist = hist.filter((item) => {
              const cat = item.category || item.title || '';
              return !matchesSubject(cat);
            });
            localStorage.setItem('learnsmart_student_quiz_history', JSON.stringify(remainingHist));
          }
        }

        // Filter & sync global submissions table (Recent Quiz Submissions)
        try {
          const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
          const list = savedSubmissions ? JSON.parse(savedSubmissions) : [];
          if (Array.isArray(list)) {
            const isTargetStudentSub = (sub) => {
              const subStudent = (sub.student || '').trim().toLowerCase();
              const subEmail = (sub.studentEmail || '').trim().toLowerCase();
              const tName = (targetStudent.name || '').trim().toLowerCase();
              const tEmail = (targetStudent.email || '').trim().toLowerCase();
              const tId = (targetStudent.id || '').trim().toLowerCase();
              const tStudentId = (targetStudent.studentId || '').trim().toLowerCase();

              if (subEmail && tEmail && subEmail === tEmail) return true;
              if (sub.studentId && (sub.studentId === tId || sub.studentId === tStudentId)) return true;
              if (subStudent && tName && (subStudent === tName || subStudent.includes(tName) || tName.includes(subStudent))) return true;
              if (subStudent && tEmail && subStudent === tEmail) return true;
              return false;
            };

            const remainingGlobal = list.filter((sub) => {
              if (!isTargetStudentSub(sub)) {
                return true; // Keep other students' submissions
              }
              if (isResetAll) {
                return false; // Remove all submissions for this reset student
              }
              const titleOrCat = `${sub.quizTitle || ''} ${sub.category || ''}`;
              return !matchesSubject(titleOrCat);
            });

            localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(remainingGlobal));

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: remainingGlobal })
              );
            }
          }
        } catch (subErr) {
          console.warn('Failed to filter global submissions on reset:', subErr);
        }

        localStorage.setItem(
          'learnsmart_last_reset_student',
          JSON.stringify({
            studentId: targetStudent.id,
            name: targetStudent.name,
            email: targetStudent.email,
            selectedSubjects: isResetAll ? 'all' : selectedSubjects,
            timestamp: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to update quiz storage on reset:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('learnsmart_student_reset', {
            detail: {
              studentId: targetStudent.id,
              name: targetStudent.name,
              email: targetStudent.email,
              resetSubjects: isResetAll ? 'all' : selectedSubjects
            }
          })
        );
        window.dispatchEvent(new CustomEvent('learnsmart_quiz_completed', { detail: { action: 'reset' } }));
      }

      return all[idx];
    }
    return null;
  },

  resetAllStudents: (selectedSubjects = null) => {
    const all = loadStoredStudents();
    const isResetAll =
      !selectedSubjects ||
      selectedSubjects === 'all' ||
      (Array.isArray(selectedSubjects) && selectedSubjects.length === 0);

    all.forEach((s) => {
      sharedDatabase.resetStudent(s.id, selectedSubjects);
    });

    if (isResetAll) {
      try {
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify([]));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: [] })
          );
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return loadStoredStudents();
  },

  // Update existing student metrics (e.g. after quiz completion)
  // Ensures assigned studentId is strictly non-editable
  updateStudent: (studentId, updates = {}) => {
    const all = loadStoredStudents();
    const idx = all.findIndex((s) => s.id === studentId || s.studentId === studentId);
    if (idx !== -1) {
      // Strip out any attempts to overwrite the permanent unique studentId
      const { studentId: _attemptedChange, ...safeUpdates } = updates;
      all[idx] = {
        ...all[idx],
        ...safeUpdates
      };
      persistStudents(all);
      return all[idx];
    }
    return null;
  },

  // Generate unique student ID
  generateUniqueStudentId: () => {
    return generateStudentId();
  },

  // ==========================================
  // EDUCATOR MANAGEMENT
  // ==========================================
  getEducators: () => {
    syncEducatorsFromBackend().catch(() => {});
    const all = loadStoredEducators();
    return all.filter((e) => e.isActive !== false);
  },

  getAllEducators: () => {
    syncEducatorsFromBackend().catch(() => {});
    return loadStoredEducators();
  },

  getEducatorById: (id) => {
    if (!id) return null;
    const all = loadStoredEducators();
    return all.find((e) => e.id === id || e.educatorId === id) || null;
  },

  getEducatorByEmail: (email) => {
    if (!email) return null;
    const lower = email.trim().toLowerCase();
    const all = loadStoredEducators();
    const found = all.find((e) => e.email && e.email.toLowerCase() === lower);
    if (found) return found;
    if (lower === 'educator@learnsmart.com' || lower === 'educator') {
      return INITIAL_SEED_EDUCATORS[0];
    }
    return null;
  },

  getEducatorByUsername: (identifier) => {
    if (!identifier) return null;
    const lower = identifier.trim().toLowerCase();
    const all = loadStoredEducators();
    const found = all.find((e) =>
      (e.id && e.id.toLowerCase() === lower) ||
      (e.educatorId && e.educatorId.toLowerCase() === lower) ||
      (e.email && e.email.toLowerCase() === lower) ||
      (e.name && e.name.toLowerCase() === lower)
    );
    if (found) return found;
    if (lower === 'educator@learnsmart.com' || lower === 'educator') {
      return INITIAL_SEED_EDUCATORS[0];
    }
    return null;
  },

  addEducator: (data) => {
    const all = loadStoredEducators();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const assignedId = data.id || data.educatorId || `edu-${Date.now()}`;
    const newEducator = {
      id: assignedId,
      uid: assignedId,
      educatorId: data.educatorId || data.customId || `FAC-CS-${Math.floor(Math.random() * 900) + 100}`,
      name: data.name || 'Educator',
      email: cleanEmail,
      department: data.department || 'Computer Science',
      role: 'Educator',
      title: data.title || 'Faculty Member',
      phone: data.phone || '',
      isActive: true,
      status: 'Active',
      statusVariant: 'success',
      joinedDate: 'Today',
      lastActive: 'Just now',
      avatarInitials: getInitials(data.name || 'Educator'),
      quizzesCreated: 0,
      activeQuizzes: 0,
      totalStudents: 0,
      avgPerformance: 0
    };

    const existingIdx = all.findIndex((e) => cleanEmail && e.email && e.email.toLowerCase() === cleanEmail);
    if (existingIdx !== -1) {
      all[existingIdx] = { ...all[existingIdx], ...newEducator };
    } else {
      all.unshift(newEducator);
    }
    persistEducators(all);

    // Sync to backend MySQL
    (async () => {
      try {
        await apiPost('/api/users/educators', {
          name: newEducator.name,
          email: newEducator.email,
          educatorId: newEducator.educatorId,
          department: newEducator.department,
          title: newEducator.title,
          phone: newEducator.phone,
          password: data.password || undefined
        });
        await syncEducatorsFromBackend(true);
      } catch (err) {
        console.warn('Educator could not be created in MySQL:', err.message);
        persistEducators(loadStoredEducators().filter((e) => e.id !== newEducator.id));
      }
    })();

    return newEducator;
  },

  updateEducator: (id, updates = {}) => {
    const all = loadStoredEducators();
    const idx = all.findIndex((e) => e.id === id || e.educatorId === id || (updates.email && e.email?.toLowerCase() === updates.email.toLowerCase()));
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      persistEducators(all);

      // Sync to backend MySQL
      (async () => {
        try {
          await apiPut('/api/users/me', {
            name: all[idx].name,
            department: all[idx].department,
            title: all[idx].title,
            phone: all[idx].phone
          });
          await syncEducatorsFromBackend(true);
        } catch (err) {
          console.warn('Backend educator update note:', err.message);
        }
      })();

      return all[idx];
    }
    return null;
  },

  removeEducator: (id) => {
    const all = loadStoredEducators();
    const cleanId = String(id || '').trim().toLowerCase();
    const target = all.find((e) => String(e.id || '').toLowerCase() === cleanId || String(e.educatorId || '').toLowerCase() === cleanId || String(e.email || '').toLowerCase() === cleanId);
    const updated = all.filter((e) => {
      const eId = String(e.id || '').toLowerCase();
      const eEduId = String(e.educatorId || '').toLowerCase();
      const eEmail = String(e.email || '').toLowerCase();
      return eId !== cleanId && eEduId !== cleanId && eEmail !== cleanId;
    });
    persistEducators(updated);

    // Sync to backend MySQL
    (async () => {
      try {
        const param = target?.email || target?.id || cleanId;
        await apiDelete(`/api/users/educators/${encodeURIComponent(param)}`);
        await syncEducatorsFromBackend(true);
      } catch (err) {
        console.warn('Backend educator delete note:', err.message);
      }
    })();

    return updated;
  },

  // Record a completed quiz attempt for a student
  recordQuizAttempt: ({
    studentName,
    studentEmail,
    quizTitle,
    score,
    category,
    answers = {},
    quizId = null,
    correctCount = null,
    totalQuestions = null,
    studentId = null
  }) => {
    let fbUser = null;
    try {
      fbUser = auth.currentUser;
    } catch { }

    const realUid =
      studentId ||
      fbUser?.uid ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('learnsmart_uid')) ||
      null;

    const realEmail =
      (studentEmail && studentEmail.trim()) ||
      fbUser?.email ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('learnsmart_email')) ||
      '';

    const trimmedStudentName = typeof studentName === 'string' ? studentName.trim() : '';
    const realName =
      (trimmedStudentName && trimmedStudentName !== 'Student' ? trimmedStudentName : '') ||
      fbUser?.displayName ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('learnsmart_user')) ||
      (realEmail ? realEmail.split('@')[0] : 'Learner');

    const all = loadStoredStudents();
    let student =
      (realEmail && sharedDatabase.getStudentByEmail(realEmail)) ||
      (realUid && sharedDatabase.getStudentByUid(realUid)) ||
      (realName && sharedDatabase.getStudentByUsername(realName)) ||
      all.find((s) => realEmail && s.email && s.email.toLowerCase() === realEmail.toLowerCase()) ||
      null;

    // Register into local cache if not present (using genuine email and UID)
    if (!student) {
      student = sharedDatabase.registerStudent({
        name: realName,
        email: realEmail,
        uid: realUid || '',
        role: 'student'
      });
    } else if (realUid && !student.uid) {
      sharedDatabase.updateStudent(student.id, { uid: realUid });
    }

    if (student) {
      const prevTotal = student.quizzesCompleted || 0;
      const prevAvg = student.avgScore || 0;
      const newTotal = prevTotal + 1;
      const newAvg = Math.round(((prevAvg * prevTotal + score) / newTotal) * 10) / 10;
      const newHigh = Math.max(student.highestScore || 0, score);
      const passStatus = score >= 70 ? 'Passed' : 'Failed';

      // Determine subject domain for quiz
      const resolveSubject = (t = '', c = '') => {
        const text = `${t} ${c}`.toLowerCase();
        if (text.includes('python') || text.includes('programming') || text.includes('javascript')) return 'Python';
        if (text.includes('data structure') || text.includes('algorithm') || text.includes('tree') || text.includes('dsa')) {
          return 'Data Structures';
        }
        if (text.includes('math') || text.includes('discrete') || text.includes('logic')) {
          return 'Mathematics';
        }
        if (text.includes('security') || text.includes('owasp') || text.includes('cyber')) {
          return 'Web Security';
        }
        return category || 'Others';
      };

      const subName = resolveSubject(quizTitle, category);

      const newSubmission = {
        id: `attempt_${quizId || 'quiz'}_${realUid || student.id}`,
        quizId: quizId || null,
        title: quizTitle,
        category: category || subName || 'General',
        score: `${score}%`,
        status: passStatus,
        date: 'Today'
      };

      const updatedSubmissions = [newSubmission, ...(student.recentSubmissions || [])].slice(0, 5);
      const currentMastery = Array.isArray(student.subjectMastery) && student.subjectMastery.length > 0
        ? [...student.subjectMastery]
        : [
          { subject: 'Mathematics', score: 0 },
          { subject: 'Data Structures', score: 0 },
          { subject: 'Python', score: 0 },
          { subject: 'Web Security', score: 0 },
          { subject: 'Others', score: 0 }
        ];

      const matchIdx = currentMastery.findIndex(
        (m) => m.subject.toLowerCase() === subName.toLowerCase() ||
          m.subject.toLowerCase().includes(subName.toLowerCase()) ||
          subName.toLowerCase().includes(m.subject.toLowerCase())
      );

      let updatedMastery;
      if (matchIdx !== -1) {
        const prevScore = currentMastery[matchIdx].score || 0;
        const newScore = prevScore === 0 ? score : Math.round((prevScore + score) / 2);
        currentMastery[matchIdx] = { ...currentMastery[matchIdx], score: newScore };
        updatedMastery = currentMastery;
      } else {
        updatedMastery = [...currentMastery, { subject: subName, score }];
      }

      const topSub = [...updatedMastery].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.subject || student.topSubject || 'General';

      sharedDatabase.updateStudent(student.id, {
        quizzesCompleted: newTotal,
        avgScore: newAvg,
        highestScore: newHigh,
        topSubject: topSub,
        subjectMastery: updatedMastery,
        lastActive: 'Just now',
        status: newAvg >= 85 ? 'Top Performer' : newAvg >= 70 ? 'On Track' : 'Needs Support',
        statusVariant: newAvg >= 85 ? 'success' : newAvg >= 70 ? 'info' : 'warning',
        recentSubmissions: updatedSubmissions
      });

      // Update quiz's own statistics in STORAGE_KEY_QUIZZES
      try {
        const allQuizzes = loadStoredQuizzes();
        const quizIdx = allQuizzes.findIndex(
          (q) => (quizId && String(q.id).toLowerCase() === String(quizId).toLowerCase()) ||
            (q.title && q.title.toLowerCase().trim() === quizTitle.toLowerCase().trim())
        );
        if (quizIdx !== -1) {
          const targetQuiz = allQuizzes[quizIdx];
          const prevSubCount = targetQuiz.submissionsCount || 0;
          const prevQuizAvg = targetQuiz.avgScore || 0;
          const newSubCount = prevSubCount + 1;
          const newQuizAvg = Math.round(((prevQuizAvg * prevSubCount + score) / newSubCount) * 10) / 10;
          const wasPassed = score >= 70 ? 1 : 0;
          const prevPassedCount = Math.round(((targetQuiz.passRate || 0) / 100) * prevSubCount);
          const newPassRate = Math.round(((prevPassedCount + wasPassed) / newSubCount) * 100);

          allQuizzes[quizIdx] = {
            ...targetQuiz,
            submissionsCount: newSubCount,
            avgScore: newQuizAvg,
            passRate: newPassRate,
            lastUpdated: 'Just now'
          };
          persistQuizzes(allQuizzes);
        }
      } catch (err) {
        console.warn('Failed to update quiz aggregate stats:', err);
      }

      // Also record in global submissions table
      try {
        const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        const list = savedSubmissions ? JSON.parse(savedSubmissions) : DEFAULT_SUBMISSIONS;
        const newEntry = {
          id: `attempt_${quizId || 'quiz'}_${realUid || student.id}`,
          student: realName,
          studentEmail: realEmail,
          studentId: realUid || student.id,
          quizId: quizId || null,
          quizTitle,
          category: category || subName,
          score: `${score}%`,
          status: passStatus,
          date: 'Just now'
        };
        const updatedList = [newEntry, ...list];
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updatedList));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: updatedList })
          );
        }
      } catch (e) {
        console.warn(e);
      }

      // Sync attempt with backend API asynchronously (MySQL is authoritative)
      (async () => {
        try {
          const targetQuizId = quizId || `quiz-${encodeURIComponent(quizTitle.toLowerCase().replace(/\s+/g, '-'))}`;

          const data = await apiPost(`/api/quizzes/${encodeURIComponent(targetQuizId)}/attempt`, {
            studentName: realName,
            studentEmail: realEmail,
            studentId: realUid || student.uid || student.id,
            quizTitle,
            category,
            score,
            correctCount,
            totalQuestions,
            answers
          });

          console.log('[LearnSmart] Genuine quiz attempt saved to MySQL database:', data);
          // Trigger instant live tracking synchronization from MySQL
          await syncSubmissionsFromBackend(true);
          await syncStudentsFromBackend(true);
          await syncQuizzesFromBackend(true);
        } catch (err) {
          if (err?.status === 409) {
            console.warn('[LearnSmart] Duplicate submission prevented:', err.message);
          } else {
            console.warn('[LearnSmart] Backend sync error (attempt saved locally):', err.message);
          }
        }
      })();
    }
  },

  // Get the notifications addressed to the signed-in account (MySQL)
  getStudentNotifications: (studentEmailOrId = null) => {
    const list = getCachedNotifications();
    if (!studentEmailOrId) return list;
    return list.filter((n) => {
      if (!n.targetStudentIds || n.targetStudentIds === 'all') return true;
      if (Array.isArray(n.targetStudentIds)) {
        return n.targetStudentIds.includes(studentEmailOrId) || n.targetStudentIds.includes('all');
      }
      return true;
    });
  },

  // Get the notifications addressed to the signed-in educator (MySQL)
  getEducatorNotifications: () => getCachedNotifications(),

  // Educator sends notification to selected or all students in their cohort
  sendStudentNotification: async ({
    title,
    message,
    category = 'announcement',
    targetStudentIds = 'all',
    targetStudentNames = [],
    educatorName = 'Educator',
    priority = 'normal',
    broadcastId = null
  }) => {
    const singleRecipient = Array.isArray(targetStudentIds) && targetStudentIds.length === 1
      ? targetStudentIds[0]
      : null;
    let serverResult = null;
    try {
      serverResult = await sendNotification({
        title,
        message,
        category,
        recipientType: 'student',
        recipientId: singleRecipient
      });
    } catch (err) {
      console.warn('Failed to send student notification to backend:', err.message);
    }
    const notifItem = {
      id: serverResult?.id || `sent-${Date.now()}`,
      title: `Sent: ${title}`,
      message,
      category: 'sent',
      sender: educatorName,
      priority,
      broadcastId,
      unread: false,
      read: true,
      isRead: true,
      recipientCount: targetStudentNames.length || 1,
      targetStudentIds,
      targetStudentNames,
      timestamp: 'Just now',
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    const current = getCachedNotifications();
    const updated = [notifItem, ...current];
    persistNotifications(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: updated }));
      window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updated }));
    }
    return notifItem;
  },

  // Admin / System sends notification to educators
  sendEducatorNotification: ({
    title,
    message,
    category = 'announcement',
    type = 'info',
    sender = 'Administrator',
    priority = 'normal',
    broadcastId = null
  }) => {
    sendNotification({
      title,
      message,
      category,
      recipientType: 'educator'
    }).catch((err) => console.warn('Failed to send educator notification:', err.message));
    return {
      id: `pending-${Date.now()}`,
      title,
      message,
      category,
      type,
      sender,
      priority,
      broadcastId,
      unread: true,
      read: false,
      timestamp: new Date().toISOString(),
      time: 'Just now',
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  },

  // ==========================================
  // EDUCATOR MANAGEMENT
  // ==========================================
  getAdminUser: (identifier) => {
    if (!identifier) return null;
    const lower = identifier.trim().toLowerCase();
    const STORAGE_KEY_ADMIN = 'learnsmart_shared_admin';
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ADMIN);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored) {
          const emailMatch = stored.email && stored.email.toLowerCase() === lower;
          const nameMatch = stored.name && stored.name.toLowerCase() === lower;
          const userMatch = (stored.email || '').split('@')[0].toLowerCase() === lower.split('@')[0];
          if (emailMatch || nameMatch || userMatch) return stored;
        }
      }
    } catch { }
    if (lower === 'admin@learnsmart.edu' || lower === 'admin') {
      return {
        id: 'admin-001',
        name: 'System Admin',
        email: 'admin@learnsmart.edu',
        password: 'Admin@123',
        role: 'admin',
        userType: 'admin',
        status: 'Active',
        statusVariant: 'success',
        isActive: true
      };
    }
    return null;
  },

  registerAdmin: ({ name = 'Admin', email = 'admin@learnsmart.edu', password = '' } = {}) => {
    const STORAGE_KEY_ADMIN = 'learnsmart_shared_admin';
    const adminObj = {
      id: 'admin-001',
      name: name || 'Admin',
      email: email.trim().toLowerCase(),
      password: password || '',
      role: 'admin',
      userType: 'admin',
      status: 'Active',
      statusVariant: 'success',
      isActive: true
    };
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(adminObj));
    } catch (e) {
      console.warn('Failed to persist admin:', e);
    }
    return adminObj;
  },

  resolveUserEmail: (identifier) => {

    if (!identifier || typeof identifier !== 'string') return null;
    const clean = identifier.trim().toLowerCase();
    if (clean.includes('@') && clean.includes('.')) {
      return clean;
    }
    const student = sharedDatabase.getStudentByUsername(clean);
    if (student && student.email) return student.email.toLowerCase();

    const educator = sharedDatabase.getEducatorByUsername(clean);
    if (educator && educator.email) return educator.email.toLowerCase();

    const admin = sharedDatabase.getAdminUser(clean);
    if (admin && admin.email) return admin.email.toLowerCase();

    return null;
  },

  // Update the password of any account. The password is stored hashed in
  // MySQL, the local cache never keeps a plain text copy.
  updateUserPassword: async (email, newPassword) => {
    if (!email || !newPassword) {
      throw new Error('An account and a new password are required.');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const result = await apiPut(`/api/users/${encodeURIComponent(cleanEmail)}/password`, {
      newPassword
    });

    // The local cache only stores a marker so the UI can reflect the change.
    const students = loadStoredStudents();
    const studentIdx = students.findIndex(
      (s) => s.email && s.email.toLowerCase() === cleanEmail
    );
    if (studentIdx !== -1) {
      students[studentIdx].password = '••••••••';
      persistStudents(students);
    }

    const educators = loadStoredEducators();
    const eduIdx = educators.findIndex(
      (e) => e.email && e.email.toLowerCase() === cleanEmail
    );
    if (eduIdx !== -1) {
      educators[eduIdx].password = '••••••••';
      persistEducators(educators);
    }

    return result;
  },


  // ==========================================
  // QUIZ MANAGEMENT
  // ==========================================
  getQuizzes: () => {
    return loadStoredQuizzes();
  },

  getAllQuizzes: () => {
    return loadStoredQuizzes();
  },

  /**
   * Returns all active/published quizzes for the student dashboard.
   * Drafts stay drafts and are NEVER visible to students.
   * Inactive students receive an empty catalog.
   */
  getPublishedQuizzes: (studentUser = null) => {
    // Enforce student eligibility: Deactivated accounts have zero quiz access
    if (studentUser && studentUser.isActive === false) {
      return [];
    }

    const stored = loadStoredQuizzes();
    const storedActive = stored.filter((q) => {
      const s = (q.status || '').toLowerCase().trim();
      // Drafts and Archived are strictly excluded from students
      if (s === 'draft' || s === 'archived') return false;
      return s === 'active' || s === 'published' || !s;
    });

    const seenIds = new Set();
    const seenTitles = new Set();
    const result = [];

    storedActive.forEach((q) => {
      const idKey = (q.id || '').toLowerCase();
      const titleKey = (q.title || '').trim().toLowerCase();
      if (!seenIds.has(idKey) && !seenTitles.has(titleKey)) {
        seenIds.add(idKey);
        seenTitles.add(titleKey);
        result.push({
          ...q,
          isRecommended: q.isRecommended !== undefined ? q.isRecommended : true,
          questionsCount: q.questionsCount || (q.questions || []).length || 5,
          duration: q.duration || '15 mins',
          difficulty: q.difficulty || 'Medium',
          recommendationReason: q.recommendationReason || 'Curriculum Assessment • Assigned by Instructor'
        });
      }
    });

    return result;
  },

  persistQuizzes: (quizzes) => {
    persistQuizzes(quizzes);
  },

  getQuizById: (id) => {
    if (!id) return null;
    const all = loadStoredQuizzes();
    const targetId = String(id).trim().toLowerCase();
    return all.find((q) => String(q.id).trim().toLowerCase() === targetId) || null;
  },

  addQuiz: (quizData) => {
    const all = loadStoredQuizzes();
    const rawStatus = (quizData.status || 'Active').trim();
    const isDraft = rawStatus.toLowerCase() === 'draft';
    const status = isDraft ? 'Draft' : 'Active';
    const isPub = !isDraft;

    // Resolve the actual logged-in educator's name from auth session
    const resolvedAuthorName = (() => {
      try {
        // Try localStorage educator session (set during login)
        const raw = localStorage.getItem('learnsmart_educator');
        if (raw && raw.trim().startsWith('{')) {
          const parsed = JSON.parse(raw);
          if (parsed?.name && parsed.name !== 'Educator') return parsed.name;
        }
        // Fallback: learnsmart_user key
        const storedUser = localStorage.getItem('learnsmart_user');
        if (storedUser && storedUser !== 'Educator' && storedUser !== 'educator') return storedUser;
      } catch { }
      return quizData.createdBy || quizData.author_name || 'Educator';
    })();

    const newQuiz = {
      id: quizData.id || `quiz-${Date.now()}`,
      title: quizData.title || 'Untitled Quiz',
      category: quizData.category || 'Programming',
      categoryBg: quizData.categoryBg || '#E6FAF0',
      categoryColor: quizData.categoryColor || '#00BA88',
      difficulty: quizData.difficulty || 'Medium',
      diffBg: quizData.diffBg || '#FFEDD5',
      diffColor: quizData.diffColor || '#C2410C',
      status: status,
      isRecommended: quizData.isRecommended !== undefined ? quizData.isRecommended : isPub,
      recommendationReason: quizData.recommendationReason || (isDraft ? 'Draft Assessment' : 'Newly Published Assessment • Assigned by Instructor'),
      questionsCount: (quizData.questions || []).length || 5,
      duration: quizData.duration || '15 mins',
      submissionsCount: 0,
      avgScore: 0,
      passRate: 0,
      lastUpdated: 'Just now',
      description: quizData.description || '',
      createdBy: resolvedAuthorName,
      author_name: resolvedAuthorName,
      questions: quizData.questions || []
    };

    all.unshift(newQuiz);
    persistQuizzes(all);

    // Sync with backend MySQL API immediately
    (async () => {
      try {
        const saved = await apiPost('/api/quizzes', newQuiz);
        if (saved && saved.id) {
          const fresh = loadStoredQuizzes();
          const fIdx = fresh.findIndex((q) => String(q.id).trim() === String(saved.id).trim());
          if (fIdx !== -1) {
            fresh[fIdx] = { ...fresh[fIdx], ...saved };
            persistQuizzes(fresh);
          }
        }
        await syncQuizzesFromBackend(true);
      } catch (e) {
        console.error('MySQL save quiz failed:', e.message);
      }
    })();

    // Admins, educators and students are notified by the backend once the
    // quiz row is committed to MySQL, so no duplicate local notification here.
    return newQuiz;
  },

  updateQuiz: (id, updates) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => String(q.id).trim() === String(id).trim());
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates, lastUpdated: 'Just now' };
      persistQuizzes(all);

      // Sync with backend MySQL API immediately
      (async () => {
        try {
          await apiPut(`/api/quizzes/${encodeURIComponent(id)}`, all[idx]);
          await syncQuizzesFromBackend(true);
        } catch (e) {
          console.error('Network error updating quiz in MySQL:', e.message);
        }
      })();

      return all[idx];
    }
    return null;
  },

  removeQuiz: (id) => {
    const all = loadStoredQuizzes();
    const updated = all.filter((q) => String(q.id).trim() !== String(id).trim());
    persistQuizzes(updated);

    // Sync deletion to backend MySQL API
    (async () => {
      try {
        await apiDelete(`/api/quizzes/${encodeURIComponent(id)}`);
        await syncQuizzesFromBackend(true);
      } catch (e) {
        console.error('Network error deleting quiz from MySQL:', e.message);
      }
    })();

    return updated;
  },

  toggleQuizStatus: (id) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => String(q.id).trim() === String(id).trim());
    if (idx !== -1) {
      const current = all[idx].status || 'Active';
      const newStatus = current === 'Active' ? 'Draft' : 'Active';
      all[idx].status = newStatus;
      all[idx].isRecommended = newStatus === 'Active';
      persistQuizzes(all);

      // Sync updated status to backend MySQL API
      (async () => {
        try {
          await apiPut(`/api/quizzes/${encodeURIComponent(id)}`, all[idx]);
          await syncQuizzesFromBackend(true);
        } catch (e) {
          console.error('Network error toggling quiz status in MySQL:', e.message);
        }
      })();

      return all[idx];
    }
    return null;
  },

  // ==========================================
  // SUBMISSIONS
  // ==========================================
  getSubmissions: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch { }

    return [];
  },

  subscribeSubmissions: (callback) => {
    const handler = (e) => {
      if (callback) callback(e.detail || sharedDatabase.getSubmissions());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_SUBMISSIONS_UPDATED, handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_SUBMISSIONS_UPDATED, handler);
      }
    };
  },

  // ==========================================
  // UNIFIED USER MANAGEMENT (STUDENTS + EDUCATORS + ADMIN)
  // ==========================================
  getUsers: ({ search = '', role = 'all', status = 'all', sortBy = 'joined' } = {}) => {
    const students = sharedDatabase.getAllStudents().map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: 'Student',
      userType: 'student',
      status: s.isActive === false ? 'Inactive' : s.status === 'Needs Support' ? 'Needs Support' : 'Active',
      statusVariant: s.isActive === false ? 'danger' : s.status === 'Needs Support' ? 'warning' : 'success',
      joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '20 Sep 2025',
      lastActive: s.lastActive || 'Today',
      avatarInitials: s.avatarInitials || getInitials(s.name),
      studentId: s.studentId,
      avgScore: s.avgScore || 0,
      quizzesCompleted: s.quizzesCompleted || 0,
      highestScore: s.highestScore || 0,
      isActive: s.isActive !== false,
      raw: s
    }));

    const educators = sharedDatabase.getAllEducators().map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: 'Educator',
      userType: 'educator',
      status: e.isActive === false ? 'Inactive' : e.status || 'Active',
      statusVariant: e.isActive === false ? 'danger' : 'success',
      joinedDate: e.joinedDate || '15 Aug 2025',
      lastActive: e.lastActive || 'Yesterday',
      avatarInitials: e.avatarInitials || getInitials(e.name),
      educatorId: e.educatorId,
      department: e.department,
      quizzesCreated: e.quizzesCreated || 0,
      totalStudents: e.totalStudents || 0,
      isActive: e.isActive !== false,
      raw: e
    }));

    // The administrator account comes from the signed in session, which is
    // itself loaded from MySQL.
    const adminProfile = (() => {
      try {
        const raw = localStorage.getItem('learnsmart_admin_profile') || localStorage.getItem('learnsmart_admin');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.email) return parsed;
        }
      } catch { }
      return null;
    })();

    const admin = {
      id: adminProfile?.id || adminProfile?.uid || 'admin-001',
      name: adminProfile?.name || adminProfile?.fullName || 'System Admin',
      email: adminProfile?.email || 'admin@learnsmart.edu',
      role: 'Admin',
      userType: 'admin',
      status: 'Active',
      statusVariant: 'success',
      joinedDate: '01 Jan 2025',
      lastActive: 'Now',
      avatarInitials: getInitials(adminProfile?.fullName || adminProfile?.name || 'System Admin'),
      department: adminProfile?.department || 'Platform Operations',
      isActive: true
    };

    let allUsers = [admin, ...educators, ...students];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      allUsers = allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.studentId && u.studentId.toLowerCase().includes(q)) ||
          (u.educatorId && u.educatorId.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q)
      );
    }

    // Role filter
    if (role !== 'all') {
      allUsers = allUsers.filter((u) => u.role.toLowerCase() === role.toLowerCase());
    }

    // Status filter
    if (status !== 'all') {
      allUsers = allUsers.filter((u) => u.status.toLowerCase() === status.toLowerCase());
    }

    // Sort
    if (sortBy === 'name') {
      allUsers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'role') {
      allUsers.sort((a, b) => a.role.localeCompare(b.role));
    }

    return allUsers;
  },

  getAllUsers: (opts = {}) => {
    return sharedDatabase.getUsers(opts);
  },

  deleteQuiz: (quizId) => {
    return sharedDatabase.removeQuiz(quizId);
  },

  registerEducator: (data) => {
    return sharedDatabase.addEducator(data);
  },

  toggleUserStatus: (userId, role) => {
    if (role === 'Student' || role === 'student') {
      const students = loadStoredStudents();
      const idx = students.findIndex((s) => s.id === userId);
      if (idx !== -1) {
        students[idx].isActive = students[idx].isActive === false ? true : false;
        persistStudents(students);
        return students[idx];
      }
    } else if (role === 'Educator' || role === 'educator') {
      const educators = loadStoredEducators();
      const idx = educators.findIndex((e) => e.id === userId);
      if (idx !== -1) {
        educators[idx].isActive = educators[idx].isActive === false ? true : false;
        educators[idx].status = educators[idx].isActive ? 'Active' : 'Inactive';
        persistEducators(educators);
        return educators[idx];
      }
    }
    return null;
  },

  deleteUser: (userId, role) => {
    const cleanRole = String(role || '').trim().toLowerCase();
    if (cleanRole === 'student') {
      return sharedDatabase.removeStudent(userId);
    } else if (cleanRole === 'educator') {
      return sharedDatabase.removeEducator(userId);
    }
    return null;
  },

  // ==========================================
  // SYSTEM OVERVIEW & METRICS - computed by the backend from MySQL
  // ==========================================
  getSystemStats: () => {
    const cached = getCachedAnalytics();
    const overview = cached.overview;
    const analytics = cached.analytics;
    const students = sharedDatabase.getStudents();
    const educators = sharedDatabase.getEducators();
    const quizzes = sharedDatabase.getQuizzes();
    const submissions = sharedDatabase.getSubmissions();

    if (overview && typeof overview === 'object') {
      return {
        totalUsers: overview.totalUsers ?? (students.length + educators.length),
        totalQuizzes: overview.totalQuizzes ?? quizzes.length,
        activeQuizzes: overview.activeQuizzes ?? quizzes.length,
        draftQuizzes: overview.draftQuizzes ?? 0,
        systemHealth: overview.systemHealth || 'Online',
        totalStudents: overview.totalStudents ?? students.length,
        totalEducators: overview.totalEducators ?? educators.length,
        completedQuizzes: overview.completedQuizzes ?? submissions.length,
        totalSubmissions: overview.totalSubmissions ?? submissions.length,
        avgScore: overview.avgScore || '0%',
        passRate: overview.passRate || '0%',
        completionRate: overview.completionRate || '0%',
        serverUptime: overview.serverUptime || '99.98%',
        apiLatency: overview.apiLatency || '42ms'
      };
    }

    // Fallback for the moment before the first sync finished.
    return {
      totalUsers: students.length + educators.length,
      totalQuizzes: quizzes.length,
      activeQuizzes: quizzes.length,
      draftQuizzes: 0,
      systemHealth: 'Online',
      totalStudents: students.length,
      totalEducators: educators.length,
      completedQuizzes: submissions.length,
      totalSubmissions: submissions.length,
      avgScore: '0%',
      passRate: '0%',
      completionRate: '0%',
      serverUptime: '99.98%',
      apiLatency: '42ms'
    };
  },

  // Full role scoped analytics payload (MySQL)
  getAnalytics: () => getCachedAnalytics().analytics,

  // User Growth Chart Data - real growth from users.created_at in MySQL
  getUserGrowthData: (timeframe = '6 Months') => {
    const cached = getCachedAnalytics();
    if (Array.isArray(cached.growth) && cached.growth.length > 0) {
      return cached.growth;
    }
    const students = sharedDatabase.getStudents();
    const educators = sharedDatabase.getEducators();
    const totalUsers = students.length + educators.length;
    const labels = {
      '7 Days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      '30 Days': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      '3 Months': ['Month 1', 'Month 2', 'Month 3'],
      '1 Year': ['Q1', 'Q2', 'Q3', 'Q4'],
      '6 Months': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    };
    return (labels[timeframe] || labels['6 Months']).map((label) => ({ label, count: totalUsers }));
  },

  // Quiz Category Distribution - counted by the backend over the visible quizzes
  getQuizCategoryDistribution: () => {
    const cached = getCachedAnalytics();
    if (Array.isArray(cached.categories) && cached.categories.length > 0) {
      return cached.categories;
    }
    const quizzes = sharedDatabase.getQuizzes();
    if (!Array.isArray(quizzes) || quizzes.length === 0) return [];
    const counts = {};
    quizzes.forEach((q) => {
      const cat = q.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = quizzes.length;
    return Object.keys(counts).map((name) => ({
      name,
      count: counts[name],
      percentage: Math.round((counts[name] / total) * 100)
    }));
  },

  // Recent Users
  getRecentUsers: (limit = 5) => {
    const all = sharedDatabase.getUsers();
    return all.slice(0, limit);
  },

  // Admin Notifications - stored in MySQL and shared with every dashboard
  getAdminNotifications: () => getCachedNotifications(),

  markAdminNotificationRead: async (id) => {
    await markNotificationRead(id);
    return getCachedNotifications();
  },

  markAllAdminNotificationsRead: async () => {
    await markAllNotificationsRead();
    return getCachedNotifications();
  },

  sendAdminNotification: ({
    title,
    message,
    category = 'system',
    type = 'info',
    broadcastId = null,
    rawTitle = null,
    targetAudience = null
  }) => {
    const recipientType = targetAudience || 'all';
    sendNotification({
      title: rawTitle || title,
      message,
      category,
      recipientType
    }).catch((err) => console.warn('Failed to send admin notification:', err.message));
    return {
      id: `pending-${Date.now()}`,
      title,
      message,
      category,
      type,
      timestamp: 'Just now',
      unread: true,
      broadcastId: broadcastId || null,
      rawTitle: rawTitle || title,
      targetAudience
    };
  },

  // Notifications live in MySQL, so a delete on one dashboard is reflected
  // everywhere automatically.
  syncNotificationDeletionAcrossDashboards: (targetNotif) => {
    if (!targetNotif || !targetNotif.id) return;
    deleteNotification(targetNotif.id);
  },

  deleteAdminNotification: async (idOrNotif) => {
    const targetId = typeof idOrNotif === 'object' && idOrNotif !== null ? idOrNotif.id : idOrNotif;
    if (targetId) await deleteNotification(targetId);
    return getCachedNotifications();
  },

  clearAllAdminNotifications: async () => {
    const current = getCachedNotifications();
    for (const item of current) {
      // eslint-disable-next-line no-await-in-loop
      await deleteNotification(item.id);
    }
    return getCachedNotifications();
  },

  // Educator Notification Deletion (shared with the other dashboards)
  deleteEducatorNotification: async (idOrNotif) => {
    const targetId = typeof idOrNotif === 'object' && idOrNotif !== null ? idOrNotif.id : idOrNotif;
    if (targetId) await deleteNotification(targetId);
    return getCachedNotifications();
  },

  clearAllEducatorNotifications: async () => {
    const current = getCachedNotifications();
    for (const item of current) {
      // eslint-disable-next-line no-await-in-loop
      await deleteNotification(item.id);
    }
    persistNotifications([]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NOTIFICATIONS_UPDATED, { detail: [] }));
      window.dispatchEvent(new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: [] }));
    }
    return [];
  },

  // Subscribe to Admin updates
  subscribeAdmin: (callback) => {
    adminSubscribers.add(callback);
    const handleAdminEvent = () => callback();
    const handleStorageEvent = (e) => {
      if (
        e.key === STORAGE_KEY_STUDENTS ||
        e.key === STORAGE_KEY_EDUCATORS ||
        e.key === STORAGE_KEY_QUIZZES ||
        e.key === STORAGE_KEY_NOTIFICATIONS
      ) {
        callback();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_ADMIN_UPDATED, handleAdminEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      adminSubscribers.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_ADMIN_UPDATED, handleAdminEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  },

  // ==========================================
  // QUIZ FEEDBACK MANAGEMENT
  // ==========================================
  saveQuizFeedback: async (feedbackData) => {
    const payload = {
      quizId: feedbackData?.quizId || '',
      quizTitle: feedbackData?.quizTitle || '',
      studentName: feedbackData?.studentName || '',
      studentEmail: feedbackData?.studentEmail || '',
      clarityRating: Number(feedbackData?.clarityRating || 0),
      difficultyRating: Number(feedbackData?.difficultyRating || 0),
      educatorRating: Number(feedbackData?.educatorRating || 0),
      comments: feedbackData?.comments || ''
    };

    try {
      // MySQL is the source of truth - the backend also notifies the educator.
      const result = await apiPost('/api/feedback', payload);
      const newFeedback = {
        id: result?.id || `fb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...feedbackData
      };

      try {
        const STORAGE_KEY_FEEDBACKS = 'learnsmart_quiz_feedbacks';
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_FEEDBACKS) || '[]');
        localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify([newFeedback, ...existing]));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('learnsmart_activity_updated', { detail: newFeedback }));
        }
      } catch (err) {
        console.warn('Failed to cache quiz feedback:', err);
      }


      return newFeedback;
    } catch (err) {
      console.warn('Failed to save quiz feedback to MySQL:', err?.message || err);
      return null;
    }
  },

  getQuizFeedbacks: (quizId = null) => {
    try {
      const list = JSON.parse(localStorage.getItem('learnsmart_quiz_feedbacks') || '[]');
      if (quizId) return list.filter((f) => f.quizId === quizId);
      return list;
    } catch (e) {
      return [];
    }
  },

  // Subscribe to real-time student updates
  subscribe: (callback) => {
    subscribers.add(callback);

    const handleCustomEvent = (e) => {
      callback(e.detail || sharedDatabase.getStudents());
    };

    const handleStorageEvent = (e) => {
      if (e.key === STORAGE_KEY_STUDENTS || e.key === STORAGE_KEY_LEGACY) {
        callback(sharedDatabase.getStudents());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_STUDENTS_UPDATED, handleCustomEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      subscribers.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener(EVENT_STUDENTS_UPDATED, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }
};

export default sharedDatabase;
