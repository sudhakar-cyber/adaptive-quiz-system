import { INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData.js';
import { QUIZ_CATALOG, INITIAL_NOTIFICATIONS } from '../data/quizData.js';
import { auth, db, collection, getDocs } from '../config/firebase.js';

const STORAGE_KEY_STUDENTS = 'learnsmart_shared_students';
const STORAGE_KEY_LEGACY = 'learnsmart_educator_students';
const STORAGE_KEY_EDUCATORS = 'learnsmart_shared_educators';
const STORAGE_KEY_QUIZZES = 'learnsmart_educator_quizzes';
const STORAGE_KEY_SUBMISSIONS = 'learnsmart_shared_submissions';
const STORAGE_KEY_STUDENT_NOTIFICATIONS = 'learnsmart_student_notifications';
const STORAGE_KEY_ADMIN_NOTIFICATIONS = 'learnsmart_admin_notifications';
const STORAGE_KEY_EDUCATOR_NOTIFICATIONS = 'learnsmart_educator_notifications';

const EVENT_STUDENTS_UPDATED = 'learnsmart_students_updated';
const EVENT_STUDENT_NOTIFICATIONS_UPDATED = 'learnsmart_student_notifications_updated';
const EVENT_EDUCATOR_NOTIFICATIONS_UPDATED = 'learnsmart_educator_notifications_updated';
const EVENT_ADMIN_UPDATED = 'learnsmart_admin_updated';
const EVENT_QUIZZES_UPDATED = 'learnsmart_quizzes_updated';
export const EVENT_SUBMISSIONS_UPDATED = 'learnsmart_submissions_updated';

const DEFAULT_SUBMISSIONS = [];

// Helper: Resolve Authorization Bearer Token for Backend API
export const getAuthToken = async () => {
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
  } catch {}
  const role = (typeof localStorage !== 'undefined' && localStorage.getItem('learnsmart_role')) ||
               (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('learnsmart_role'));
  if (role === 'admin') return 'admin-session-token';
  if (role === 'educator') return 'educator-session-token';
  return 'student-session-token';
};

// Sync quizzes from backend MySQL API into local store
export const syncQuizzesFromBackend = async () => {
  try {
    const token = await getAuthToken();
    const res = await fetch('/api/quizzes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const backendQuizzes = await res.json();
      if (Array.isArray(backendQuizzes)) {
        localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(backendQuizzes));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_QUIZZES_UPDATED, { detail: backendQuizzes }));
        }
        return backendQuizzes;
      }
    }
  } catch (err) {
    console.warn('Failed to sync quizzes from backend MySQL:', err);
  }
  return loadStoredQuizzes();
};

// Sync live quiz submissions from backend MySQL database
export const syncSubmissionsFromBackend = async () => {
  try {
    const token = await getAuthToken();
    const res = await fetch('/api/results/submissions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
          date: s.date ? (typeof s.date === 'string' && s.date.includes('T') ? new Date(s.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : s.date) : 'Today'
        }));

        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(formatted));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_SUBMISSIONS_UPDATED, { detail: formatted }));
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Failed to sync submissions from backend MySQL:', err);
  }
  return [];
};

// Sync live students from backend MySQL database
export const syncStudentsFromBackend = async () => {
  try {
    const token = await getAuthToken();
    const res = await fetch('/api/users/students', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const backendStudents = await res.json();
      if (Array.isArray(backendStudents)) {
        const formatted = backendStudents
          .filter((bs) => {
            if (!bs || !bs.email) return false;
            const em = (bs.email || '').toLowerCase();
            const nm = (bs.name || '').toLowerCase();
            const id = (bs.id || bs.uid || '').toLowerCase();
            if (em.includes('stud-dev') || em.includes('demo') || em.includes('student@learnsmart.edu')) return false;
            if (nm.includes('demo') || id.includes('stud-dev')) return false;
            return true;
          })
          .map((bs) => ({
            id: bs.id || bs.uid,
            uid: bs.uid || bs.id,
            studentId: bs.uid || bs.id,
            name: bs.name,
            email: bs.email,
            role: bs.role || 'student',
            department: bs.department || 'General',
            isActive: bs.is_active !== undefined ? Boolean(bs.is_active) : true,
            quizzesCompleted: 0,
            avgScore: 0,
            highestScore: 0,
            topSubject: 'General',
            status: 'On Track',
            statusVariant: 'info',
            lastActive: 'Active',
            avatarInitials: getInitials(bs.name)
          }));

        persistStudents(formatted);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_STUDENTS_UPDATED, { detail: formatted }));
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Failed to sync students from backend MySQL:', err);
  }
  return [];
};

// Sync all platform data from backend MySQL database for live tracking
export const syncAllFromBackend = async () => {
  const [quizzes, submissions, students] = await Promise.allSettled([
    syncQuizzesFromBackend(),
    syncSubmissionsFromBackend(),
    syncStudentsFromBackend()
  ]);
  return {
    quizzes: quizzes.status === 'fulfilled' ? quizzes.value : [],
    submissions: submissions.status === 'fulfilled' ? submissions.value : [],
    students: students.status === 'fulfilled' ? students.value : []
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
  } catch (e) {}

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
    syncStudentsFromFirestore().catch(() => {});
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

const INITIAL_ADMIN_NOTIFICATIONS = [];

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
      localStorage.setItem(STORAGE_KEY_STUDENT_NOTIFICATIONS, JSON.stringify([]));
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
      } catch {}

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
              t.includes('python & programming') ||
              t.includes('operating systems core') ||
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
    } catch {}

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
    } catch {}

    // Synchronize live clean data from MySQL database
    syncAllFromBackend().catch(() => {});
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

// Load Admin Notifications
const loadAdminNotifications = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_NOTIFICATIONS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load admin notifications:', err);
  }

  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_NOTIFICATIONS, JSON.stringify(INITIAL_ADMIN_NOTIFICATIONS));
  } catch (err) {
    console.warn('Failed to seed admin notifications:', err);
  }
  return INITIAL_ADMIN_NOTIFICATIONS;
};

// Persist Admin Notifications
const persistAdminNotifications = (notifications) => {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to persist admin notifications:', err);
  }
  notifyAdminSubscribers();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }
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

export const sharedDatabase = {
  syncQuizzesFromBackend: () => syncQuizzesFromBackend(),
  syncSubmissionsFromBackend: () => syncSubmissionsFromBackend(),
  syncStudentsFromBackend: () => syncStudentsFromBackend(),
  syncAllFromBackend: () => syncAllFromBackend(),

  syncStudentsFromFirestore: (force = false) => {
    return syncStudentsFromBackend();
  },

  // Get active students list
  getStudents: () => {
    syncStudentsFromBackend().catch(() => {});
    const all = loadStoredStudents();
    return all.filter((s) => s.isActive !== false);
  },

  // Get all students including inactive
  getAllStudents: () => {
    syncStudentsFromFirestore().catch(() => {});
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
    const lower = identifier.trim().toLowerCase();
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
      quizzesCompleted: 0,
      avgScore: 0,
      highestScore: 0,
      topSubject: 'General / Onboarding',
      status: 'On Track',
      statusVariant: 'info',
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
      recentSubmissions: [],
      feedbackNote: 'New student registered. Welcome to LearnSmart Adaptive Learning!'
    };

    all.unshift(newStudent);
    persistStudents(all);
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

    // Sync student creation to backend MySQL
    (async () => {
      try {
        const token = await getAuthToken();
        await fetch('/api/users/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: fullName,
            email: cleanEmail,
            studentId: finalStudentId,
            department: 'Computer Science'
          })
        });
      } catch (err) {
        console.warn('Backend student creation sync note:', err);
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

    // Delete student and attempts in backend MySQL
    (async () => {
      try {
        const token = await getAuthToken();
        const targetParam = removedTarget?.email || removedTarget?.id || cleanId;
        await fetch(`/api/users/students/${encodeURIComponent(targetParam)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        syncSubmissionsFromBackend().catch(() => {});
      } catch (err) {
        console.warn('Backend student deletion sync note:', err);
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
        syncAllFromBackend().catch(() => {});
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
    } catch {}

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

    const realName =
      (studentName && studentName.trim() && studentName !== 'Student') ||
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

      // Sync attempt with backend API asynchronously
      (async () => {
        try {
          const token = await getAuthToken();
          const targetQuizId = quizId || `quiz-${encodeURIComponent(quizTitle.toLowerCase().replace(/\s+/g, '-'))}`;
          
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
          if (realUid) headers['X-User-UID'] = realUid;
          if (realEmail) headers['X-User-Email'] = realEmail;
          if (realName) headers['X-User-Name'] = realName;

          const res = await fetch(`/api/quizzes/${targetQuizId}/attempt`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              studentName: realName,
              studentEmail: realEmail,
              studentId: realUid || student.uid || student.id,
              quizTitle,
              category,
              score,
              correctCount,
              totalQuestions,
              answers
            })
          });
          if (!res.ok) {
            const errDetail = await res.text().catch(() => '');
            if (res.status === 409) {
              console.warn(`[LearnSmart] Duplicate submission prevented: ${errDetail}`);
            } else {
              console.warn(`[LearnSmart] Quiz attempt sync response: ${res.status} - ${errDetail}`);
            }
          } else {
            const data = await res.json();
            console.log('[LearnSmart] Genuine quiz attempt saved to MySQL database:', data);
            // Trigger instant live tracking synchronization from MySQL
            await syncSubmissionsFromBackend();
            await syncQuizzesFromBackend();
          }
        } catch (apiErr) {
          console.warn('[LearnSmart] Backend sync error (attempt saved locally):', apiErr);
        }
      })();
    }
  },

  // Get student notifications (all or student specific)
  getStudentNotifications: (studentEmailOrId = null) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENT_NOTIFICATIONS);
      const list = saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
      if (!studentEmailOrId) return list;
      return list.filter((n) => {
        if (!n.targetStudentIds || n.targetStudentIds === 'all') return true;
        if (Array.isArray(n.targetStudentIds)) {
          return n.targetStudentIds.includes(studentEmailOrId) || n.targetStudentIds.includes('all');
        }
        return true;
      });
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  // Educator sends notification to selected or all students
  sendStudentNotification: ({
    title,
    message,
    category = 'announcement',
    targetStudentIds = 'all',
    targetStudentNames = [],
    educatorName = 'Educator',
    priority = 'normal',
    broadcastId = null
  }) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENT_NOTIFICATIONS);
      const list = saved !== null ? JSON.parse(saved) : [...INITIAL_NOTIFICATIONS];
      const newNotif = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        message,
        category,
        timestamp: 'Just now',
        unread: true,
        priority,
        sender: educatorName,
        targetStudentIds,
        targetStudentNames,
        broadcastId: broadcastId || null,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      const updated = [newNotif, ...list];
      localStorage.setItem(STORAGE_KEY_STUDENT_NOTIFICATIONS, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: updated })
        );
        window.dispatchEvent(new Event('storage'));
      }
      return newNotif;
    } catch (e) {
      console.warn('Failed to send student notification:', e);
      return null;
    }
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
    try {
      const notifKey = STORAGE_KEY_EDUCATOR_NOTIFICATIONS;
      const rawNotifs = localStorage.getItem(notifKey);
      const currentNotifs = rawNotifs !== null ? JSON.parse(rawNotifs) : [];
      const newNotif = {
        id: `ed-notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        message,
        category,
        type,
        time: 'Just now',
        timestamp: 'Just now',
        unread: true,
        read: false,
        sender,
        priority,
        broadcastId: broadcastId || null,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      const updatedNotifs = [newNotif, ...currentNotifs];
      localStorage.setItem(notifKey, JSON.stringify(updatedNotifs));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updatedNotifs })
        );
        window.dispatchEvent(new Event('storage'));
      }
      return newNotif;
    } catch (err) {
      console.warn('Failed to dispatch educator notification:', err);
      return null;
    }
  },

  // ==========================================
  // EDUCATOR MANAGEMENT
  // ==========================================
  getEducators: () => {
    const all = loadStoredEducators();
    return all.filter((e) => e.isActive !== false);
  },

  getAllEducators: () => {
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
    const found = all.find(
      (e) =>
        (e.email && e.email.toLowerCase() === lower) ||
        (e.name && e.name.toLowerCase() === lower) ||
        (e.educatorId && e.educatorId.toLowerCase() === lower) ||
        ((e.email || '').split('@')[0].toLowerCase() === lower.split('@')[0])
    );
    if (found) return found;
    if (lower === 'educator@learnsmart.com' || lower === 'educator') {
      return INITIAL_SEED_EDUCATORS[0];
    }
    return null;
  },

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

  addEducator: ({
    name = '',
    email = '',
    password = '',
    department = 'Computer Science',
    institution = 'LearnSmart University',
    educatorId = ''
  }) => {
    const all = loadStoredEducators();
    const fullName = name.trim() || 'New Faculty';
    const cleanEmail = email.trim().toLowerCase();

    const newEducator = {
      id: `edu-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      password: password || '',
      educatorId: educatorId.trim() || `FAC-CS-2025-${all.length + 101}`,
      department: department.trim() || 'Computer Science',
      institution: institution.trim() || 'LearnSmart University',
      role: 'Educator',
      status: 'Active',
      statusVariant: 'success',
      joinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastActive: 'Just now',
      avatarInitials: getInitials(fullName),
      avatarImage: null,
      quizzesCreated: 0,
      activeQuizzes: 0,
      totalStudents: 0,
      avgPerformance: 0,
      rating: 5.0,
      isActive: true
    };

    all.unshift(newEducator);
    persistEducators(all);

    sharedDatabase.sendAdminNotification({
      title: 'New Educator Enrolled',
      message: `${fullName} was onboarded to the ${department} faculty.`,
      category: 'user',
      type: 'info'
    });

    return newEducator;
  },

  updateEducator: (id, updates) => {
    const all = loadStoredEducators();
    const idx = all.findIndex((e) => e.id === id || e.educatorId === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      persistEducators(all);
      return all[idx];
    }
    return null;
  },

  removeEducator: (id) => {
    const all = loadStoredEducators();
    const updated = all.filter((e) => e.id !== id && e.educatorId !== id);
    persistEducators(updated);
    return updated;
  },

  // Resolve registered email from username, name, or email string
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

  // Update password across student, educator, or admin records
  updateUserPassword: (email, newPassword) => {
    if (!email || !newPassword) return false;
    const cleanEmail = email.trim().toLowerCase();
    let updated = false;

    // Check students
    const students = loadStoredStudents();
    const studentIdx = students.findIndex(
      (s) => s.email && s.email.toLowerCase() === cleanEmail
    );
    if (studentIdx !== -1) {
      students[studentIdx].password = newPassword;
      persistStudents(students);
      updated = true;
    }

    // Check educators
    const educators = loadStoredEducators();
    const eduIdx = educators.findIndex(
      (e) => e.email && e.email.toLowerCase() === cleanEmail
    );
    if (eduIdx !== -1) {
      educators[eduIdx].password = newPassword;
      persistEducators(educators);
      updated = true;
    }

    // Check admin
    const STORAGE_KEY_ADMIN = 'learnsmart_shared_admin';
    try {
      const rawAdmin = localStorage.getItem(STORAGE_KEY_ADMIN);
      if (rawAdmin) {
        const adminObj = JSON.parse(rawAdmin);
        if (adminObj && adminObj.email && adminObj.email.toLowerCase() === cleanEmail) {
          adminObj.password = newPassword;
          localStorage.setItem(STORAGE_KEY_ADMIN, JSON.stringify(adminObj));
          updated = true;
        }
      }
    } catch {}

    return updated;
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
      createdBy: quizData.createdBy || 'Educator',
      questions: quizData.questions || []
    };

    all.unshift(newQuiz);
    persistQuizzes(all);

    // Sync with backend API asynchronously
    (async () => {
      try {
        const token = await getAuthToken();
        await fetch('/api/quizzes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newQuiz)
        });
      } catch (e) {}
    })();

    sharedDatabase.sendAdminNotification({
      title: isDraft ? 'Quiz Draft Created' : 'New Quiz Published',
      message: `"${newQuiz.title}" ${isDraft ? 'saved as draft' : 'published'} under ${newQuiz.category}.`,
      category: 'quiz',
      type: 'info'
    });

    // Notify students ONLY if published
    if (isPub) {
      sharedDatabase.sendStudentNotification({
        title: `New Quiz: ${newQuiz.title}`,
        message: `A new ${newQuiz.difficulty} assessment in ${newQuiz.category} has been published by your instructor. Test your knowledge now!`,
        category: 'quiz',
        type: 'info'
      });
    }

    return newQuiz;
  },

  updateQuiz: (id, updates) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => String(q.id).trim() === String(id).trim());
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates, lastUpdated: 'Just now' };
      persistQuizzes(all);

      // Sync with backend API asynchronously
      (async () => {
        try {
          const token = await getAuthToken();
          await fetch(`/api/quizzes/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(all[idx])
          });
        } catch (e) {}
      })();

      return all[idx];
    }
    return null;
  },

  removeQuiz: (id) => {
    const all = loadStoredQuizzes();
    const updated = all.filter((q) => String(q.id).trim() !== String(id).trim());
    persistQuizzes(updated);
    return updated;
  },

  toggleQuizStatus: (id) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => String(q.id).trim() === String(id).trim());
    if (idx !== -1) {
      const current = all[idx].status || 'Active';
      all[idx].status = current === 'Active' ? 'Draft' : 'Active';
      persistQuizzes(all);
      return all[idx];
    }
    return null;
  },

  // ==========================================
  // SUBMISSIONS
  // ==========================================
  getSubmissions: () => {
    // Trigger asynchronous live synchronization with MySQL
    syncSubmissionsFromBackend().catch(() => {});

    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}

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

    const admin = {
      id: 'admin-001',
      name: 'System Admin',
      email: 'admin@learnsmart.edu',
      role: 'Admin',
      userType: 'admin',
      status: 'Active',
      statusVariant: 'success',
      joinedDate: '01 Jan 2025',
      lastActive: 'Now',
      avatarInitials: 'A',
      department: 'Platform Operations',
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
  // SYSTEM OVERVIEW & METRICS (MATCHES ATTACHED IMAGE)
  // ==========================================
  getSystemStats: () => {
    const students = sharedDatabase.getStudents();
    const educators = sharedDatabase.getEducators();
    const quizzes = sharedDatabase.getQuizzes();
    const submissions = sharedDatabase.getSubmissions();

    const liveTotalUsers = students.length + educators.length + 1;
    const liveTotalQuizzes = quizzes.length;
    const liveActiveQuizzes = quizzes.filter((q) => {
      const s = (q.status || '').toLowerCase().trim();
      return s === 'active' || s === 'published' || !s;
    }).length;
    const liveCompleted = submissions.length;

    // Real Platform Average Score
    let avgScore = 0;
    if (submissions.length > 0) {
      const sum = submissions.reduce((acc, sub) => {
        const sc = typeof sub.score === 'number' ? sub.score : parseFloat(String(sub.score).replace('%', '')) || 0;
        return acc + sc;
      }, 0);
      avgScore = Math.round((sum / submissions.length) * 10) / 10;
    } else {
      const validScores = students.filter((s) => (s.avgScore || 0) > 0);
      if (validScores.length > 0) {
        avgScore = Math.round((validScores.reduce((acc, s) => acc + s.avgScore, 0) / validScores.length) * 10) / 10;
      }
    }

    // Real Pass Rate (Benchmark: >= 70%)
    let passRate = '0%';
    if (submissions.length > 0) {
      const passed = submissions.filter((sub) => {
        const sc = typeof sub.score === 'number' ? sub.score : parseFloat(String(sub.score).replace('%', '')) || 0;
        return sc >= 70;
      }).length;
      passRate = `${Math.round((passed / submissions.length) * 100)}%`;
    }

    // Real Completion Rate
    let completionRate = '0%';
    if (liveCompleted > 0 && liveActiveQuizzes > 0 && students.length > 0) {
      const pct = Math.min(100, Math.round((liveCompleted / (students.length * liveActiveQuizzes)) * 100));
      completionRate = `${pct}%`;
    } else if (liveCompleted > 0) {
      completionRate = '100%';
    }

    return {
      totalUsers: liveTotalUsers,
      totalQuizzes: liveTotalQuizzes,
      activeQuizzes: liveActiveQuizzes,
      systemHealth: 'Online',
      totalStudents: students.length,
      totalEducators: educators.length,
      completedQuizzes: liveCompleted,
      avgScore: `${avgScore}%`,
      passRate,
      completionRate,
      serverUptime: '99.98%',
      apiLatency: '42ms'
    };
  },

  // User Growth Chart Data (Area/Line graph matching attached image)
  getUserGrowthData: (timeframe = '6 Months') => {
    const students = sharedDatabase.getStudents();
    const educators = sharedDatabase.getEducators();
    const totalUsers = students.length + educators.length + 1;

    switch (timeframe) {
      case '7 Days':
        return [
          { label: 'Mon', count: totalUsers },
          { label: 'Tue', count: totalUsers },
          { label: 'Wed', count: totalUsers },
          { label: 'Thu', count: totalUsers },
          { label: 'Fri', count: totalUsers },
          { label: 'Sat', count: totalUsers },
          { label: 'Sun', count: totalUsers }
        ];
      case '30 Days':
        return [
          { label: 'Week 1', count: totalUsers },
          { label: 'Week 2', count: totalUsers },
          { label: 'Week 3', count: totalUsers },
          { label: 'Week 4', count: totalUsers }
        ];
      case '3 Months':
        return [
          { label: 'Month 1', count: totalUsers },
          { label: 'Month 2', count: totalUsers },
          { label: 'Month 3', count: totalUsers }
        ];
      case '1 Year':
        return [
          { label: 'Q1', count: totalUsers },
          { label: 'Q2', count: totalUsers },
          { label: 'Q3', count: totalUsers },
          { label: 'Q4', count: totalUsers }
        ];
      case '6 Months':
      default:
        return [
          { label: 'Jan', count: totalUsers },
          { label: 'Feb', count: totalUsers },
          { label: 'Mar', count: totalUsers },
          { label: 'Apr', count: totalUsers },
          { label: 'May', count: totalUsers },
          { label: 'Jun', count: totalUsers }
        ];
    }
  },

  // Quiz Category Distribution (Donut/Pie Chart matching real quizzes)
  getQuizCategoryDistribution: () => {
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

  // Admin Notifications
  getAdminNotifications: () => {
    return loadAdminNotifications();
  },

  markAdminNotificationRead: (id) => {
    const list = loadAdminNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, unread: false } : n));
    persistAdminNotifications(updated);
    return updated;
  },

  markAllAdminNotificationsRead: () => {
    const list = loadAdminNotifications();
    const updated = list.map((n) => ({ ...n, unread: false }));
    persistAdminNotifications(updated);
    return updated;
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
    const list = loadAdminNotifications();
    const newNotif = {
      id: `admin-notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      category,
      type,
      timestamp: 'Just now',
      unread: true,
      broadcastId: broadcastId || null,
      rawTitle: rawTitle || title,
      targetAudience: targetAudience || null
    };
    const updated = [newNotif, ...list];
    persistAdminNotifications(updated);
    return newNotif;
  },

  // Synchronize notification deletion across Student and Educator dashboards
  syncNotificationDeletionAcrossDashboards: (targetNotif) => {
    if (!targetNotif) return;
    const bId = targetNotif.broadcastId;
    const cleanMsg = (targetNotif.message || '').trim().toLowerCase();
    const rawTitle = (targetNotif.rawTitle || '').trim().toLowerCase();
    const fullTitle = (targetNotif.title || '').trim().toLowerCase();
    const strippedTitle = (targetNotif.title || '').replace(/^sent to [^:]+:\s*/i, '').trim().toLowerCase();

    // 1. Delete matching from Student notifications
    try {
      const studentRaw = localStorage.getItem(STORAGE_KEY_STUDENT_NOTIFICATIONS);
      if (studentRaw) {
        const studentList = JSON.parse(studentRaw);
        if (Array.isArray(studentList)) {
          const updatedStudents = studentList.filter((sn) => {
            if (sn.id && sn.id === targetNotif.id) return false;
            if (bId && sn.broadcastId && sn.broadcastId === bId) return false;
            const snMsg = (sn.message || '').trim().toLowerCase();
            const snTitle = (sn.title || '').trim().toLowerCase();
            if (cleanMsg && snMsg === cleanMsg) {
              if (rawTitle && snTitle === rawTitle) return false;
              if (strippedTitle && snTitle === strippedTitle) return false;
              if (fullTitle && snTitle === fullTitle) return false;
              if (fullTitle.includes(snTitle) || snTitle.includes(strippedTitle)) return false;
              const sender = (sn.sender || '').trim().toLowerCase();
              if (sender === 'administrator' || sender === 'admin') return false;
            }
            return true;
          });

          if (updatedStudents.length !== studentList.length) {
            localStorage.setItem(STORAGE_KEY_STUDENT_NOTIFICATIONS, JSON.stringify(updatedStudents));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: updatedStudents })
              );
              window.dispatchEvent(new Event('storage'));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync student notification deletion:', err);
    }

    // 2. Delete matching from Educator notifications
    try {
      const edRaw = localStorage.getItem(STORAGE_KEY_EDUCATOR_NOTIFICATIONS);
      if (edRaw) {
        const edList = JSON.parse(edRaw);
        if (Array.isArray(edList)) {
          const updatedEducators = edList.filter((en) => {
            if (en.id && en.id === targetNotif.id) return false;
            if (bId && en.broadcastId && en.broadcastId === bId) return false;
            const enMsg = (en.message || '').trim().toLowerCase();
            const enTitle = (en.title || '').trim().toLowerCase();
            if (cleanMsg && enMsg === cleanMsg) {
              if (rawTitle && enTitle === rawTitle) return false;
              if (strippedTitle && enTitle === strippedTitle) return false;
              if (fullTitle && enTitle === fullTitle) return false;
              if (fullTitle.includes(enTitle) || enTitle.includes(strippedTitle)) return false;
              const sender = (en.sender || '').trim().toLowerCase();
              if (sender === 'administrator' || sender === 'admin') return false;
            }
            return true;
          });

          if (updatedEducators.length !== edList.length) {
            localStorage.setItem(STORAGE_KEY_EDUCATOR_NOTIFICATIONS, JSON.stringify(updatedEducators));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updatedEducators })
              );
              window.dispatchEvent(new Event('storage'));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync educator notification deletion:', err);
    }
  },

  deleteAdminNotification: (idOrNotif) => {
    const list = loadAdminNotifications();
    const targetId = typeof idOrNotif === 'object' && idOrNotif !== null ? idOrNotif.id : idOrNotif;
    const targetNotif = typeof idOrNotif === 'object' && idOrNotif !== null 
      ? idOrNotif 
      : list.find((n) => n.id === targetId);

    const updatedAdmin = list.filter((n) => n.id !== targetId);
    persistAdminNotifications(updatedAdmin);

    if (targetNotif) {
      sharedDatabase.syncNotificationDeletionAcrossDashboards(targetNotif);
    }

    return updatedAdmin;
  },

  clearAllAdminNotifications: () => {
    const list = loadAdminNotifications();
    list.forEach((notif) => {
      sharedDatabase.syncNotificationDeletionAcrossDashboards(notif);
    });
    persistAdminNotifications([]);
    return [];
  },

  // Educator Notification Deletion (with reflection to Student Dashboard)
  deleteEducatorNotification: (idOrNotif) => {
    try {
      const notifKey = STORAGE_KEY_EDUCATOR_NOTIFICATIONS;
      const rawNotifs = localStorage.getItem(notifKey);
      const list = rawNotifs !== null ? JSON.parse(rawNotifs) : [];

      const targetId = typeof idOrNotif === 'object' && idOrNotif !== null ? idOrNotif.id : idOrNotif;
      const targetNotif = typeof idOrNotif === 'object' && idOrNotif !== null
        ? idOrNotif
        : list.find((n) => n.id === targetId);

      const updatedEducators = list.filter((n) => n.id !== targetId);
      localStorage.setItem(notifKey, JSON.stringify(updatedEducators));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: updatedEducators })
        );
        window.dispatchEvent(new Event('storage'));
      }

      // If this notification was sent to students, remove it from Student notifications
      if (targetNotif) {
        const bId = targetNotif.broadcastId;
        const rawTitle = (targetNotif.rawTitle || (targetNotif.title || '').replace(/^sent:\s*/i, '')).trim().toLowerCase();

        // Extract raw message if it was formatted like: Delivered to All Students: "..."
        let rawMsg = targetNotif.rawMessage;
        if (!rawMsg && targetNotif.message) {
          const matchQuote = targetNotif.message.match(/"([^"]+)"/);
          rawMsg = matchQuote ? matchQuote[1] : targetNotif.message;
        }
        const cleanMsg = (rawMsg || '').trim().toLowerCase();

        try {
          const studentRaw = localStorage.getItem(STORAGE_KEY_STUDENT_NOTIFICATIONS);
          if (studentRaw) {
            const studentList = JSON.parse(studentRaw);
            if (Array.isArray(studentList)) {
              const updatedStudents = studentList.filter((sn) => {
                if (sn.id && sn.id === targetNotif.id) return false;
                if (bId && sn.broadcastId && sn.broadcastId === bId) return false;

                const snMsg = (sn.message || '').trim().toLowerCase();
                const snTitle = (sn.title || '').trim().toLowerCase();

                if (cleanMsg && (snMsg === cleanMsg || snMsg.includes(cleanMsg) || cleanMsg.includes(snMsg))) {
                  if (rawTitle && (snTitle === rawTitle || snTitle.includes(rawTitle) || rawTitle.includes(snTitle))) {
                    return false;
                  }
                  if (targetNotif.category === 'sent') return false;
                }
                return true;
              });

              if (updatedStudents.length !== studentList.length) {
                localStorage.setItem(STORAGE_KEY_STUDENT_NOTIFICATIONS, JSON.stringify(updatedStudents));
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: updatedStudents })
                  );
                  window.dispatchEvent(new Event('storage'));
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to sync student notification deletion from educator:', e);
        }
      }

      return updatedEducators;
    } catch (err) {
      console.warn('Failed to delete educator notification:', err);
      return [];
    }
  },

  clearAllEducatorNotifications: () => {
    try {
      const notifKey = STORAGE_KEY_EDUCATOR_NOTIFICATIONS;
      const rawNotifs = localStorage.getItem(notifKey);
      const list = rawNotifs !== null ? JSON.parse(rawNotifs) : [];
      list.forEach((n) => {
        if (n.category === 'sent' || n.broadcastId) {
          sharedDatabase.deleteEducatorNotification(n);
        }
      });
      localStorage.setItem(notifKey, JSON.stringify([]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_EDUCATOR_NOTIFICATIONS_UPDATED, { detail: [] })
        );
        window.dispatchEvent(new Event('storage'));
      }
      return [];
    } catch (err) {
      console.warn('Failed to clear educator notifications:', err);
      return [];
    }
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
        e.key === STORAGE_KEY_ADMIN_NOTIFICATIONS
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
  saveQuizFeedback: (feedbackData) => {
    try {
      const STORAGE_KEY_FEEDBACKS = 'learnsmart_quiz_feedbacks';
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_FEEDBACKS) || '[]');
      const newFeedback = {
        id: `fb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...feedbackData
      };
      const updated = [newFeedback, ...existing];
      localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(updated));

      // Push real-time notification to educator notifications
      try {
        const notifKey = 'learnsmart_educator_notifications';
        const rawNotifs = localStorage.getItem(notifKey);
        const currentNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
        const newNotif = {
          id: `ed-notif-${Date.now()}`,
          title: `Quiz Feedback: ${feedbackData.quizTitle || 'Assessment'}`,
          message: `${feedbackData.studentName || 'Student'} rated "${feedbackData.quizTitle || 'Quiz'}" with ${feedbackData.clarityRating || 5}/5 stars: "${(feedbackData.comments || '').slice(0, 80)}..."`,
          category: 'feedback',
          type: 'feedback',
          time: 'Just now',
          read: false,
          sender: feedbackData.studentName || 'Student'
        };
        const updatedNotifs = [newNotif, ...currentNotifs];
        localStorage.setItem(notifKey, JSON.stringify(updatedNotifs));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.warn('Failed to dispatch educator notification for feedback:', err);
      }

      return newFeedback;
    } catch (e) {
      console.warn('Failed to save quiz feedback:', e);
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
