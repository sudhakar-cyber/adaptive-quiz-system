import { INITIAL_EDUCATOR_STUDENTS, INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData.js';
import { INITIAL_NOTIFICATIONS, QUIZ_CATALOG } from '../data/quizData.js';

const STORAGE_KEY_STUDENTS = 'learnsmart_shared_students';
const STORAGE_KEY_LEGACY = 'learnsmart_educator_students';
const STORAGE_KEY_EDUCATORS = 'learnsmart_shared_educators';
const STORAGE_KEY_QUIZZES = 'learnsmart_educator_quizzes';
const STORAGE_KEY_SUBMISSIONS = 'learnsmart_shared_submissions';
const STORAGE_KEY_STUDENT_NOTIFICATIONS = 'learnsmart_student_notifications';
const STORAGE_KEY_ADMIN_NOTIFICATIONS = 'learnsmart_admin_notifications';

const EVENT_STUDENTS_UPDATED = 'learnsmart_students_updated';
const EVENT_STUDENT_NOTIFICATIONS_UPDATED = 'learnsmart_student_notifications_updated';
const EVENT_ADMIN_UPDATED = 'learnsmart_admin_updated';
const EVENT_QUIZZES_UPDATED = 'learnsmart_quizzes_updated';

const DEFAULT_SUBMISSIONS = [
  { id: 1, student: 'Rahul K.', quizTitle: 'Python Basics', score: '92%', status: 'Completed', date: '28 Sep 2025' },
  { id: 2, student: 'Priya S.', quizTitle: 'Data Structures', score: '85%', status: 'Completed', date: '27 Sep 2025' },
  { id: 3, student: 'Vikram M.', quizTitle: 'Web Security', score: '71%', status: 'In Progress', date: '26 Sep 2025' },
  { id: 4, student: 'Sneha R.', quizTitle: 'Algorithms', score: '88%', status: 'Completed', date: '25 Sep 2025' }
];

// Helper: Extract Initials from Full Name
export const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Helper: Generate Sequential Student ID
const generateStudentId = (existingList = []) => {
  const currentCount = existingList.length + 101;
  return `LS-2024-${currentCount}`;
};

// Base Seed Students with required role and metadata
const getInitialSeedStudents = () => {
  const seed = [...INITIAL_EDUCATOR_STUDENTS];

  // Ensure default Shaik Aathif student profile is included
  const hasShaik = seed.some((s) => s.name.toLowerCase().includes('shaik aathif') || s.email.toLowerCase().includes('shaik.aathif'));
  if (!hasShaik) {
    seed.unshift({
      id: 'stud-100',
      name: 'Shaik Aathif',
      email: 'shaik.aathif@learnsmart.edu',
      studentId: 'LS-2024-8841',
      quizzesCompleted: 18,
      avgScore: 85.4,
      highestScore: 95,
      topSubject: 'Python Basics',
      status: 'Top Performer',
      statusVariant: 'success',
      lastActive: 'Today',
      avatarInitials: 'SA',
      role: 'student',
      created_at: new Date('2025-08-15T09:00:00Z').toISOString(),
      isActive: true,
      subjectMastery: [
        { subject: 'Python Basics', score: 92 },
        { subject: 'Data Structures', score: 85 },
        { subject: 'Web Security', score: 80 }
      ],
      recentSubmissions: [
        { title: 'Python Basics & OOP', score: '92%', status: 'Completed', date: '28 Sep 2025' },
        { title: 'Data Structures & Algorithms', score: '88%', status: 'Completed', date: '21 Sep 2025' }
      ],
      feedbackNote: 'Strong self-directed learner. Ready for advanced capstone topics.'
    });
  }

  // Ensure every seed student has role = 'student', created_at, and isActive = true
  return seed.map((s, idx) => ({
    ...s,
    role: 'student',
    created_at: s.created_at || new Date(Date.now() - (seed.length - idx) * 86400000).toISOString(),
    isActive: s.isActive !== undefined ? s.isActive : true
  }));
};

// Initialize / Load Students from LocalStorage
const loadStoredStudents = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS) || localStorage.getItem(STORAGE_KEY_LEGACY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => ({
          ...s,
          role: 'student',
          isActive: s.isActive !== undefined ? s.isActive : true
        }));
      }
    }
  } catch (err) {
    console.warn('Failed to load students from localStorage:', err);
  }

  const initial = getInitialSeedStudents();
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(initial));
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(initial));
  } catch (err) {
    console.warn('Failed to seed students to localStorage:', err);
  }
  return initial;
};

// Seed Educators
const INITIAL_SEED_EDUCATORS = [
  {
    id: 'edu-201',
    name: 'Dr. Priya S.',
    email: 'priya.sharma@learnsmart.edu',
    educatorId: 'FAC-CS-2021-042',
    department: 'Computer Science & Engineering',
    institution: 'LearnSmart University',
    role: 'Educator',
    status: 'Active',
    statusVariant: 'success',
    joinedDate: '27 Sep 2025',
    lastActive: 'Today, 14:15',
    avatarInitials: 'PS',
    avatarImage: null,
    quizzesCreated: 8,
    activeQuizzes: 6,
    totalStudents: 156,
    avgPerformance: 84.6,
    rating: 4.9,
    isActive: true
  },
  {
    id: 'edu-202',
    name: 'Prof. Ramesh Verma',
    email: 'ramesh.verma@learnsmart.edu',
    educatorId: 'FAC-CS-2020-019',
    department: 'Cyber Security & Forensics',
    institution: 'LearnSmart University',
    role: 'Educator',
    status: 'Active',
    statusVariant: 'success',
    joinedDate: '15 Aug 2025',
    lastActive: 'Yesterday',
    avatarInitials: 'RV',
    avatarImage: null,
    quizzesCreated: 5,
    activeQuizzes: 4,
    totalStudents: 112,
    avgPerformance: 79.2,
    rating: 4.7,
    isActive: true
  },
  {
    id: 'edu-203',
    name: 'Dr. Kavita Sen',
    email: 'kavita.sen@learnsmart.edu',
    educatorId: 'FAC-CS-2022-064',
    department: 'Data Science & AI',
    institution: 'LearnSmart University',
    role: 'Educator',
    status: 'Active',
    statusVariant: 'success',
    joinedDate: '10 Jul 2025',
    lastActive: '3 days ago',
    avatarInitials: 'KS',
    avatarImage: null,
    quizzesCreated: 6,
    activeQuizzes: 5,
    totalStudents: 98,
    avgPerformance: 88.0,
    rating: 4.8,
    isActive: true
  },
  {
    id: 'edu-204',
    name: 'Prof. Ananya Iyer',
    email: 'ananya.iyer@learnsmart.edu',
    educatorId: 'FAC-CS-2023-088',
    department: 'Full Stack & Web Architecture',
    institution: 'LearnSmart University',
    role: 'Educator',
    status: 'Active',
    statusVariant: 'success',
    joinedDate: '01 Jun 2025',
    lastActive: '1 week ago',
    avatarInitials: 'AI',
    avatarImage: null,
    quizzesCreated: 4,
    activeQuizzes: 3,
    totalStudents: 85,
    avgPerformance: 81.4,
    rating: 4.6,
    isActive: true
  }
];

const INITIAL_ADMIN_NOTIFICATIONS = [
  {
    id: 'admin-notif-1',
    title: 'New Student Registered',
    message: 'Arjun M. completed registration for Computer Science & Engineering cohort.',
    category: 'user',
    timestamp: '10 mins ago',
    unread: true,
    type: 'success'
  },
  {
    id: 'admin-notif-2',
    title: 'New Quiz Published',
    message: 'Dr. Priya S. published "Web Security & OWASP Top 10" with 5 questions.',
    category: 'quiz',
    timestamp: '45 mins ago',
    unread: true,
    type: 'info'
  },
  {
    id: 'admin-notif-3',
    title: 'High Score Milestone',
    message: 'Rahul K. achieved 92% in Python Basics & OOP assessment.',
    category: 'academic',
    timestamp: '2 hours ago',
    unread: true,
    type: 'achievement'
  },
  {
    id: 'admin-notif-4',
    title: 'Quiz Attempt Spike',
    message: '18 new submissions recorded in Data Structures & Algorithms today.',
    category: 'activity',
    timestamp: '5 hours ago',
    unread: true,
    type: 'info'
  },
  {
    id: 'admin-notif-5',
    title: 'System Health Check: Online',
    message: 'All system microservices, database storage, and auth endpoints operating at 99.98% uptime.',
    category: 'system',
    timestamp: '1 day ago',
    unread: true,
    type: 'system'
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

// Load Stored Quizzes
const loadStoredQuizzes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_QUIZZES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load quizzes from localStorage:', err);
  }

  try {
    localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(INITIAL_EDUCATOR_QUIZZES));
  } catch (err) {
    console.warn('Failed to seed quizzes to localStorage:', err);
  }
  return INITIAL_EDUCATOR_QUIZZES;
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
  }
  notifyAdminSubscribers();
};

// Load Admin Notifications
const loadAdminNotifications = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_NOTIFICATIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
    return all.find((s) => s.email && s.email.toLowerCase() === lower && s.isActive !== false) || null;
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
    authProvider = 'local'
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
      const updated = {
        ...existing,
        name: (fullName && fullName !== 'Student') ? fullName : existing.name,
        avatarImage: resolvedAvatar || existing.avatarImage || null,
        uid: uid || existing.uid || '',
        avatarInitials: getInitials((fullName && fullName !== 'Student') ? fullName : existing.name),
        authProvider: authProvider || existing.authProvider,
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
      isActive: true,
      subjectMastery: [
        { subject: 'Python Basics', score: 0 },
        { subject: 'Data Structures', score: 0 },
        { subject: 'Web Security', score: 0 }
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

    const newStudent = {
      id: `stud-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      studentId: studentId.trim() || generateStudentId(all),
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
    return newStudent;
  },

  // Educator deletes / deactivates a student
  removeStudent: (studentId) => {
    const all = loadStoredStudents();
    const updated = all.filter((s) => s.id !== studentId);
    persistStudents(updated);
    return updated.filter((s) => s.isActive !== false);
  },

  // Educator resets a student's performance metrics & unlocks quizzes
  resetStudent: (studentIdOrIdentifier) => {
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
      all[idx] = {
        ...targetStudent,
        quizzesCompleted: 0,
        avgScore: 0,
        highestScore: 0,
        status: 'On Track',
        statusVariant: 'info',
        lastActive: 'Reset just now',
        recentSubmissions: [],
        subjectMastery: (targetStudent.subjectMastery || []).map((m) => ({ ...m, score: 0 }))
      };
      persistStudents(all);

      // Clear student's completed quiz locks so all quizzes unlock in student dashboard
      try {
        localStorage.removeItem('learnsmart_completed_quizzes');
        localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify([]));
        localStorage.removeItem('learnsmart_active_quiz_attempt');
        localStorage.setItem(
          'learnsmart_last_reset_student',
          JSON.stringify({
            studentId: targetStudent.id,
            name: targetStudent.name,
            email: targetStudent.email,
            timestamp: Date.now()
          })
        );
      } catch (err) {
        console.warn('Failed to clear quiz storage on reset:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('learnsmart_student_reset', {
            detail: {
              studentId: targetStudent.id,
              name: targetStudent.name,
              email: targetStudent.email
            }
          })
        );
      }

      return all[idx];
    }
    return null;
  },

  // Update existing student metrics (e.g. after quiz completion)
  updateStudent: (studentId, updates) => {
    const all = loadStoredStudents();
    const idx = all.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...updates
      };
      persistStudents(all);
      return all[idx];
    }
    return null;
  },

  // Record a completed quiz attempt for a student
  recordQuizAttempt: ({ studentName, studentEmail, quizTitle, score, category }) => {
    const all = loadStoredStudents();
    const student =
      all.find((s) => studentEmail && s.email && s.email.toLowerCase() === studentEmail.toLowerCase()) ||
      all.find((s) => studentName && s.name && s.name.toLowerCase() === studentName.toLowerCase()) ||
      all[0];

    if (student) {
      const prevTotal = student.quizzesCompleted || 0;
      const prevAvg = student.avgScore || 0;
      const newTotal = prevTotal + 1;
      const newAvg = Math.round(((prevAvg * prevTotal + score) / newTotal) * 10) / 10;
      const newHigh = Math.max(student.highestScore || 0, score);

      const newSubmission = {
        title: quizTitle,
        score: `${score}%`,
        status: 'Completed',
        date: 'Today'
      };

      const updatedSubmissions = [newSubmission, ...(student.recentSubmissions || [])].slice(0, 5);

      sharedDatabase.updateStudent(student.id, {
        quizzesCompleted: newTotal,
        avgScore: newAvg,
        highestScore: newHigh,
        lastActive: 'Just now',
        status: newAvg >= 85 ? 'Top Performer' : newAvg >= 70 ? 'On Track' : 'Needs Support',
        statusVariant: newAvg >= 85 ? 'success' : newAvg >= 70 ? 'info' : 'warning',
        recentSubmissions: updatedSubmissions
      });

      // Also record in global submissions table
      try {
        const savedSubmissions = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        const list = savedSubmissions ? JSON.parse(savedSubmissions) : DEFAULT_SUBMISSIONS;
        const newEntry = {
          id: Date.now(),
          student: student.name,
          quizTitle,
          score: `${score}%`,
          status: 'Completed',
          date: 'Just now'
        };
        const updatedList = [newEntry, ...list];
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updatedList));
      } catch (e) {
        console.warn(e);
      }
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
    educatorName = 'Dr. Priya S.',
    priority = 'normal'
  }) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENT_NOTIFICATIONS);
      const list = saved ? JSON.parse(saved) : [...INITIAL_NOTIFICATIONS];
      const newNotif = {
        id: `notif-${Date.now()}`,
        title,
        message,
        category,
        timestamp: 'Just now',
        unread: true,
        priority,
        sender: educatorName,
        targetStudentIds,
        targetStudentNames,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      const updated = [newNotif, ...list];
      localStorage.setItem(STORAGE_KEY_STUDENT_NOTIFICATIONS, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_STUDENT_NOTIFICATIONS_UPDATED, { detail: updated })
        );
      }
      return newNotif;
    } catch (e) {
      console.warn('Failed to send student notification:', e);
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

  addEducator: ({
    name = '',
    email = '',
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

  // ==========================================
  // QUIZ MANAGEMENT
  // ==========================================
  getQuizzes: () => {
    return loadStoredQuizzes();
  },

  getAllQuizzes: () => {
    return loadStoredQuizzes();
  },

  getQuizById: (id) => {
    const all = loadStoredQuizzes();
    return all.find((q) => q.id === id) || null;
  },

  addQuiz: (quizData) => {
    const all = loadStoredQuizzes();
    const newQuiz = {
      id: quizData.id || `quiz-${Date.now()}`,
      title: quizData.title || 'Untitled Quiz',
      category: quizData.category || 'Programming',
      categoryBg: quizData.categoryBg || '#E6FAF0',
      categoryColor: quizData.categoryColor || '#00BA88',
      difficulty: quizData.difficulty || 'Medium',
      diffBg: quizData.diffBg || '#FFEDD5',
      diffColor: quizData.diffColor || '#C2410C',
      status: quizData.status || 'Active',
      questionsCount: (quizData.questions || []).length || 5,
      duration: quizData.duration || '15 mins',
      submissionsCount: 0,
      avgScore: 0,
      passRate: 0,
      lastUpdated: 'Just now',
      description: quizData.description || '',
      createdBy: quizData.createdBy || 'Dr. Priya S.',
      questions: quizData.questions || []
    };

    all.unshift(newQuiz);
    persistQuizzes(all);

    sharedDatabase.sendAdminNotification({
      title: 'New Quiz Published',
      message: `"${newQuiz.title}" created under ${newQuiz.category}.`,
      category: 'quiz',
      type: 'info'
    });

    return newQuiz;
  },

  updateQuiz: (id, updates) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => q.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates, lastUpdated: 'Just now' };
      persistQuizzes(all);
      return all[idx];
    }
    return null;
  },

  removeQuiz: (id) => {
    const all = loadStoredQuizzes();
    const updated = all.filter((q) => q.id !== id);
    persistQuizzes(updated);
    return updated;
  },

  toggleQuizStatus: (id) => {
    const all = loadStoredQuizzes();
    const idx = all.findIndex((q) => q.id === id);
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      return saved ? JSON.parse(saved) : DEFAULT_SUBMISSIONS;
    } catch {
      return DEFAULT_SUBMISSIONS;
    }
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
    if (role === 'Student' || role === 'student') {
      return sharedDatabase.removeStudent(userId);
    } else if (role === 'Educator' || role === 'educator') {
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
    const liveActiveQuizzes = quizzes.filter((q) => q.status === 'Active' || !q.status).length;
    const liveCompleted = submissions.length;

    const validScores = students.filter((s) => s.avgScore > 0);
    const avgScore = validScores.length > 0
      ? Math.round((validScores.reduce((acc, s) => acc + (s.avgScore || 0), 0) / validScores.length) * 10) / 10
      : 82.5;

    return {
      totalUsers: 480 + liveTotalUsers,
      totalQuizzes: 80 + liveTotalQuizzes,
      activeQuizzes: 40 + liveActiveQuizzes,
      systemHealth: 'Online',
      totalStudents: students.length,
      totalEducators: educators.length,
      completedQuizzes: 150 + liveCompleted,
      avgScore: `${avgScore}%`,
      completionRate: '82.7%',
      serverUptime: '99.98%',
      apiLatency: '42ms'
    };
  },

  // User Growth Chart Data (Area/Line graph matching attached image)
  getUserGrowthData: (timeframe = '6 Months') => {
    const students = sharedDatabase.getStudents();
    const educators = sharedDatabase.getEducators();
    const extra = students.length + educators.length;

    switch (timeframe) {
      case '7 Days':
        return [
          { label: 'Mon', count: 320 + extra },
          { label: 'Tue', count: 345 + extra },
          { label: 'Wed', count: 370 + extra },
          { label: 'Thu', count: 395 + extra },
          { label: 'Fri', count: 420 + extra },
          { label: 'Sat', count: 455 + extra },
          { label: 'Sun', count: 482 + extra }
        ];
      case '30 Days':
        return [
          { label: 'Week 1', count: 210 + extra },
          { label: 'Week 2', count: 290 + extra },
          { label: 'Week 3', count: 380 + extra },
          { label: 'Week 4', count: 482 + extra }
        ];
      case '3 Months':
        return [
          { label: 'Month 1', count: 260 + extra },
          { label: 'Month 2', count: 360 + extra },
          { label: 'Month 3', count: 482 + extra }
        ];
      case '1 Year':
        return [
          { label: 'Q1', count: 120 + extra },
          { label: 'Q2', count: 220 + extra },
          { label: 'Q3', count: 340 + extra },
          { label: 'Q4', count: 482 + extra }
        ];
      case '6 Months':
      default:
        return [
          { label: 'Jan', count: 50 },
          { label: 'Feb', count: 100 },
          { label: 'Mar', count: 140 },
          { label: 'Apr', count: 170 },
          { label: 'May', count: 210 },
          { label: 'Jun', count: 240 }
        ];
    }
  },

  // Quiz Category Distribution (Donut/Pie Chart matching attached image)
  getQuizCategoryDistribution: () => {
    return [
      { name: 'Programming', percentage: 32, count: 28, color: '#3B82F6' },
      { name: 'DSA', percentage: 28, count: 24, color: '#10B981' },
      { name: 'Cyber Security', percentage: 20, count: 17, color: '#8B5CF6' },
      { name: 'Web Dev', percentage: 12, count: 11, color: '#F97316' },
      { name: 'Others', percentage: 8, count: 7, color: '#F59E0B' }
    ];
  },

  // Recent Users (Matching table in attached image)
  getRecentUsers: (limit = 3) => {
    const base = [
      {
        id: 'rec-1',
        name: 'Rahul K.',
        role: 'Student',
        status: 'Active',
        statusVariant: 'success',
        joinedDate: '28 Sep 2025',
        avatarInitials: 'RK'
      },
      {
        id: 'rec-2',
        name: 'Dr. Priya S.',
        role: 'Educator',
        status: 'Active',
        statusVariant: 'success',
        joinedDate: '27 Sep 2025',
        avatarInitials: 'PS'
      },
      {
        id: 'rec-3',
        name: 'Arjun M.',
        role: 'Student',
        status: 'Active',
        statusVariant: 'success',
        joinedDate: '26 Sep 2025',
        avatarInitials: 'AM'
      }
    ];

    const students = sharedDatabase.getStudents();
    const extraStudents = students
      .filter((s) => s.id !== 'stud-100' && s.id !== 'stud-101')
      .slice(0, 2)
      .map((s) => ({
        id: s.id,
        name: s.name,
        role: 'Student',
        status: s.isActive === false ? 'Inactive' : 'Active',
        statusVariant: s.isActive === false ? 'danger' : 'success',
        joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
        avatarInitials: s.avatarInitials || getInitials(s.name)
      }));

    return [...extraStudents, ...base].slice(0, limit);
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

  sendAdminNotification: ({ title, message, category = 'system', type = 'info' }) => {
    const list = loadAdminNotifications();
    const newNotif = {
      id: `admin-notif-${Date.now()}`,
      title,
      message,
      category,
      type,
      timestamp: 'Just now',
      unread: true
    };
    const updated = [newNotif, ...list];
    persistAdminNotifications(updated);
    return newNotif;
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
