import { INITIAL_EDUCATOR_STUDENTS } from '../data/educatorData.js';

const STORAGE_KEY_STUDENTS = 'learnsmart_shared_students';
const STORAGE_KEY_LEGACY = 'learnsmart_educator_students';
const STORAGE_KEY_SUBMISSIONS = 'learnsmart_shared_submissions';
const EVENT_STUDENTS_UPDATED = 'learnsmart_students_updated';

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

// Save Students to LocalStorage and trigger events
const persistStudents = (students) => {
  try {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(students));
  } catch (err) {
    console.error('Failed to persist students:', err);
  }
  notifySubscribers(students.filter((s) => s.isActive !== false));
};

// Subscribers List
const subscribers = new Set();

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

  // Find student by username or email or name
  getStudentByUsername: (identifier) => {
    if (!identifier) return null;
    const lower = identifier.trim().toLowerCase();
    const all = loadStoredStudents();

    // 1. Direct email match
    let match = all.find((s) => s.email && s.email.toLowerCase() === lower);
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

  // Register a new Student (from Register Page or Google Signup)
  registerStudent: ({
    firstName = '',
    lastName = '',
    name = '',
    email = '',
    password = '',
    phone = '',
    country = '',
    authProvider = 'local'
  }) => {
    const all = loadStoredStudents();
    const cleanEmail = (email || '').trim().toLowerCase();
    const fullName = name ? name.trim() : `${firstName} ${lastName}`.trim() || 'Student';

    // Check if student already exists
    const existingIndex = all.findIndex(
      (s) => s.email && s.email.toLowerCase() === cleanEmail
    );

    if (existingIndex !== -1) {
      // If student was deactivated, reactivate
      const existing = all[existingIndex];
      const updated = {
        ...existing,
        isActive: true,
        lastActive: 'Just now'
      };
      all[existingIndex] = updated;
      persistStudents(all);
      return updated;
    }

    const newStudent = {
      id: `stud-${Date.now()}`,
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
