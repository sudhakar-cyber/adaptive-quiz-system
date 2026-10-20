export const INITIAL_EDUCATOR_QUIZZES = [];

export const INITIAL_EDUCATOR_STUDENTS = [];

export const INITIAL_EDUCATOR_NOTIFICATIONS = [];

export const INITIAL_EDUCATOR_REPORTS = [];

export const EDUCATOR_ANALYTICS_DATA = {
  kpis: {
    avgScore: '0%',
    completionRate: '0%',
    avgTimeSpent: '0 mins',
    passRate: '0%',
    activeStudents: 0,
    totalQuizzes: 0,
    questionsAnalyzed: 0
  },
  subjectBreakdown: [],
  weeklyTrends: [],
  hardestQuestions: []
};

export const INITIAL_EDUCATOR_PROFILE = {
  fullName: 'Dr. Sarah Jenkins',
  academicTitle: 'Faculty Member',
  department: 'Computer Science',
  institution: 'LearnSmart University',
  facultyId: 'FAC-CS-2025-101',
  email: 'educator@learnsmart.com',
  phone: '',
  officeLocation: '',
  officeHours: '',
  bio: '',
  teachingPhilosophy: '',
  assignedCourses: [],
  stats: {
    coursesInstructed: 0,
    totalStudents: 0,
    quizzesAuthored: 0,
    educatorRating: '5.0 / 5.0'
  }
};
