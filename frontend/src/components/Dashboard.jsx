import React, { useState, useEffect, useRef } from 'react';
import capIcon from '../assets/cap_icon.png';
import {
  HomeIcon,
  StarIcon,
  PlayIcon,
  ChartIcon,
  BookOpenIcon,
  BellIcon,
  UserIcon,
  LogoutIcon,
  SearchIcon,
  TargetIcon,
  ClockIcon,
  ListIcon,
  PythonIcon,
  ShieldIcon,
  CodeIcon,
  TrendingUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  FlameIcon,
  BotIcon,
  SettingsIcon
} from './Icons';
import { QuizModal } from './QuizModal';
import { TakeQuizView } from './TakeQuizView';
import { AIChatBotView } from './AIChatBotView';
import { ProgressView } from './ProgressView';
import { LearningPathView } from './LearningPathView';
import { NotificationsDropdown } from './NotificationsView';
import { NotificationCenter, useServerNotifications } from './NotificationCenter';
import { ProfileView, ProfileDropdownMenu } from './ProfileView';
import { StudentSettingsView } from './StudentSettingsView';
import { sharedDatabase } from '../services/sharedDatabase';
import { auth, onAuthStateChanged } from '../config/firebase';
import { PortalSwitcher } from './PortalSwitcher';

export const Dashboard = ({ username = 'Student', onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredSubject, setHoveredSubject] = useState(null);
  const [performanceTimeframe, setPerformanceTimeframe] = useState('week');

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [startEditProfile, setStartEditProfile] = useState(false);

  // Dynamic quizzes catalog synchronized with Educator & Admin published quizzes
  const [quizzesList, setQuizzesList] = useState(() => sharedDatabase.getPublishedQuizzes());

  useEffect(() => {
    // Initial and periodic sync with backend MySQL database
    if (typeof sharedDatabase?.syncAllFromBackend === 'function') {
      sharedDatabase.syncAllFromBackend().then(() => {
        setQuizzesList(sharedDatabase.getPublishedQuizzes());
      }).catch(() => {});
    }

    const liveTimer = setInterval(() => {
      if (typeof sharedDatabase?.syncAllFromBackend === 'function') {
        sharedDatabase.syncAllFromBackend().catch(() => {});
      }
    }, 10000);

    const handleQuizzesUpdate = () => {
      setQuizzesList(sharedDatabase.getPublishedQuizzes());
    };

    window.addEventListener('learnsmart_quizzes_updated', handleQuizzesUpdate);
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'learnsmart_educator_quizzes') {
        handleQuizzesUpdate();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(liveTimer);
      window.removeEventListener('learnsmart_quizzes_updated', handleQuizzesUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Authenticated Firebase user state
  const [firebaseUser, setFirebaseUser] = useState(() => auth.currentUser);

  // Anonymised class benchmark (average score + spread) from MySQL.
  const [benchmark, setBenchmark] = useState(() => {
    try {
      return sharedDatabase.getStudentBenchmark?.() || null;
    } catch {
      return null;
    }
  });

  // Load the anonymised class benchmark (real average + spread from MySQL).
  useEffect(() => {
    let cancelled = false;

    const applyBenchmark = (data) => {
      if (!cancelled) setBenchmark(data || null);
    };

    const readCached = () => {
      try {
        return sharedDatabase.getStudentBenchmark?.() || null;
      } catch {
        return null;
      }
    };

    const loadBenchmark = () => {
      try {
        const request = sharedDatabase.syncStudentBenchmark?.();
        if (!request || typeof request.then !== 'function') {
          applyBenchmark(readCached());
          return;
        }
        request
          .then((data) => applyBenchmark(data || readCached()))
          .catch(() => applyBenchmark(readCached()));
      } catch {
        applyBenchmark(readCached());
      }
    };

    const handleBenchmarkUpdate = (e) => applyBenchmark(e.detail || readCached());
    const handleSubmissionsUpdate = () => loadBenchmark();

    loadBenchmark();
    window.addEventListener('learnsmart_benchmark_updated', handleBenchmarkUpdate);
    window.addEventListener('learnsmart_submissions_updated', handleSubmissionsUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('learnsmart_benchmark_updated', handleBenchmarkUpdate);
      window.removeEventListener('learnsmart_submissions_updated', handleSubmissionsUpdate);
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        let resolvedName = null;
        try {
          const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
          if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
            resolvedName = savedProfile.fullName.trim();
          }
        } catch {}
        if (!resolvedName) {
          const storedUser = localStorage.getItem('learnsmart_user');
          if (storedUser && storedUser.trim() && storedUser !== 'Student' && !storedUser.includes('@')) {
            resolvedName = storedUser.trim();
          }
        }
        if (resolvedName) {
          setCurrentUsername(resolvedName);
        } else if (user.displayName && user.displayName.trim()) {
          setCurrentUsername(user.displayName.trim());
        }
        if (user.photoURL) {
          setProfileImage(user.photoURL);
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen for real-time user profile updates across tabs and components
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const newName = e.detail?.fullName || (typeof e.detail === 'string' ? e.detail : null);
      if (newName && newName.trim()) {
        setCurrentUsername(newName.trim());
      }
      if (e.detail?.profileImage !== undefined) {
        setProfileImage(e.detail.profileImage);
      }
    };
    window.addEventListener('learnsmart_user_profile_updated', handleProfileUpdate);
    window.addEventListener('learnsmart_user_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('learnsmart_user_profile_updated', handleProfileUpdate);
      window.removeEventListener('learnsmart_user_updated', handleProfileUpdate);
    };
  }, []);

  const [activeQuizModal, setActiveQuizModal] = useState(() => {
    try {
      const savedAttempt = localStorage.getItem('learnsmart_active_quiz_attempt');
      if (savedAttempt) {
        const parsed = JSON.parse(savedAttempt);
        if (parsed && parsed.status === 'in-progress' && parsed.quiz) {
          return parsed.quiz;
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return null;
  });

  const [completedQuizzes, setCompletedQuizzes] = useState(() => {
    try {
      const student = sharedDatabase.getStudentByUsername(username);
      if (student && student.quizzesCompleted === 0) {
        return [];
      }
      const saved = localStorage.getItem('learnsmart_completed_quizzes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentStudent = sharedDatabase.getStudentByUsername(username);

  const [currentUsername, setCurrentUsername] = useState(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
      if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
        return savedProfile.fullName.trim();
      }
    } catch {}
    const storedUser = localStorage.getItem('learnsmart_user');
    if (storedUser && storedUser.trim() && storedUser !== 'Student' && !storedUser.includes('@')) {
      return storedUser.trim();
    }
    if (auth.currentUser?.displayName && auth.currentUser.displayName.trim()) {
      return auth.currentUser.displayName.trim();
    }
    return username || 'Student';
  });
  const [profileImage, setProfileImage] = useState(() => {
    try {
      return auth.currentUser?.photoURL || localStorage.getItem('learnsmart_avatar') || null;
    } catch {
      return null;
    }
  });
  const [totalQuizzesTaken, setTotalQuizzesTaken] = useState(() => {
    if (currentStudent?.quizzesCompleted !== undefined) return currentStudent.quizzesCompleted;
    try {
      const savedHistory = JSON.parse(localStorage.getItem('learnsmart_student_quiz_history') || 'null');
      if (Array.isArray(savedHistory)) return savedHistory.length;
    } catch {}
    return 0;
  });
  const [averageScore, setAverageScore] = useState(() => {
    if (currentStudent?.avgScore !== undefined) return currentStudent.avgScore;
    try {
      const savedHistory = JSON.parse(localStorage.getItem('learnsmart_student_quiz_history') || 'null');
      if (Array.isArray(savedHistory) && savedHistory.length > 0) {
        const sum = savedHistory.reduce((acc, q) => acc + (Number(q.score) || 0), 0);
        return Math.round((sum / savedHistory.length) * 10) / 10;
      }
    } catch {}
    return 0;
  });
  const [streakDays, setStreakDays] = useState(() => {
    try {
      const stored = localStorage.getItem('learnsmart_student_streak');
      if (stored !== null) return parseInt(stored, 10) || 0;
    } catch {}
    return 0;
  });
  const {
    notifications,
    unreadCount: unreadNotifCount,
    markAllRead: markAllNotificationsRead,
    remove: dismissServerNotification
  } = useServerNotifications();

  const [quizHistory, setQuizHistory] = useState(() => {
    try {
      const student = sharedDatabase.getStudentByUsername(username);
      if (student && student.quizzesCompleted === 0) {
        return [];
      }
      const saved = localStorage.getItem('learnsmart_student_quiz_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (username) {
      setCurrentUsername(username);
    }
  }, [username]);

  // Synchronize student data in real-time when student metrics change
  useEffect(() => {
    const handleStudentSync = () => {
      // The performance of the signed-in student is derived from the attempts
      // stored in MySQL.
      const performance = sharedDatabase.getStudentPerformance();
      if (performance.quizzesCompleted > 0) {
        setTotalQuizzesTaken(performance.quizzesCompleted);
        setAverageScore(performance.avgScore);
        setCompletedQuizzes(performance.completedQuizIds);
        setQuizHistory(
          performance.submissions.map((s, idx) => {
            const submittedAt = s.submittedAt || '';
            const parsed = submittedAt ? Date.parse(submittedAt) : NaN;
            const scoreValue = Number(s.scoreValue ?? 0);
            return {
              id: 10001 + idx,
              quizId: s.quizId || null,
              timestamp: Number.isNaN(parsed) ? Date.now() : parsed,
              createdAt: submittedAt || new Date().toISOString(),
              title: s.quizTitle || 'Quiz',
              category: s.category || 'General',
              score: scoreValue,
              status:
                s.status || (scoreValue >= 80 ? 'Mastered' : scoreValue >= 70 ? 'Passed' : 'Needs Review'),
              date: s.date || 'Today'
            };
          })
        );
      }
    };

    const handleSubmissionsSync = () => {
      handleStudentSync();
    };

    // Pull the personal attempts from MySQL.
    sharedDatabase.syncSubmissionsFromBackend(true).then(() => handleStudentSync()).catch(() => {});

    const handleResetEvent = (e) => {
      const resetInfo = e?.detail;
      const currentProfile = sharedDatabase.getStudentByUsername(currentUsername || username);

      const isMatch =
        !resetInfo ||
        !resetInfo.studentId ||
        (currentProfile && currentProfile.id === resetInfo.studentId) ||
        (resetInfo.email && currentProfile?.email && resetInfo.email.toLowerCase() === currentProfile.email.toLowerCase()) ||
        (resetInfo.name && (currentUsername || '').toLowerCase().includes(resetInfo.name.toLowerCase()));

      if (isMatch) {
        setTotalQuizzesTaken(0);
        setAverageScore(0);
        setCompletedQuizzes([]);
        setQuizHistory([]);
        setStreakDays(0);
        setActiveQuizModal(null);

        try {
          localStorage.removeItem('learnsmart_completed_quizzes');
          localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify([]));
          localStorage.removeItem('learnsmart_active_quiz_attempt');
          localStorage.removeItem('learnsmart_student_quiz_history');
        } catch (err) {
          console.warn(err);
        }

        // The reset itself is persisted in MySQL by the backend, which also
        // writes the matching notification for this student.
        showToast('🔄 Your educator has reset your quiz progress. All quizzes are unlocked!');
      }
    };

    const handleNotificationSync = () => {
      // The shared notification cache is refreshed by useServerNotifications.
    };

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key === 'learnsmart_shared_students' ||
        e.key === 'learnsmart_educator_students' ||
        e.key === 'learnsmart_last_reset_student' ||
        e.key === 'learnsmart_completed_quizzes'
      ) {
        handleStudentSync();
      }
      if (e.key === 'learnsmart_student_notifications') {
        handleNotificationSync();
      }
    };

    const unsubscribe = sharedDatabase.subscribe(handleStudentSync);
    window.addEventListener('learnsmart_student_reset', handleResetEvent);
    window.addEventListener('learnsmart_student_notifications_updated', handleNotificationSync);
    window.addEventListener('learnsmart_submissions_updated', handleSubmissionsSync);
    window.addEventListener('storage', handleStorageChange);

    // Run initial sync check
    handleStudentSync();

    return () => {
      unsubscribe();
      window.removeEventListener('learnsmart_student_reset', handleResetEvent);
      window.removeEventListener('learnsmart_student_notifications_updated', handleNotificationSync);
      window.removeEventListener('learnsmart_submissions_updated', handleSubmissionsSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUsername, username]);

  const notifDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Determine display name: Prioritize the student's saved full name from their profile
  const displayName = (() => {
    // 1. Saved student profile has highest priority for custom display name
    try {
      const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
      if (savedProfile?.fullName && savedProfile.fullName.trim() && !savedProfile.fullName.includes('@') && savedProfile.fullName !== 'Student') {
        return savedProfile.fullName.trim();
      }
    } catch {}

    // 2. Explicit current state or stored active username
    if (currentUsername && currentUsername.trim() && currentUsername !== 'Student' && !currentUsername.includes('@')) {
      return currentUsername.trim();
    }

    const storedUser = localStorage.getItem('learnsmart_user');
    if (storedUser && storedUser.trim() && storedUser !== 'Student' && !storedUser.includes('@')) {
      return storedUser.trim();
    }

    // 3. Authenticated Firebase user's explicit displayName
    if (firebaseUser?.displayName && firebaseUser.displayName.trim().length > 0) {
      return firebaseUser.displayName.trim();
    }

    // 4. Formatted email prefix from Firebase auth
    if (firebaseUser?.email && firebaseUser.email.includes('@')) {
      const emailPrefix = firebaseUser.email.split('@')[0];
      return emailPrefix
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // 5. Fallback from username prop or raw string
    const raw = currentUsername || username || localStorage.getItem('learnsmart_user');
    if (!raw || raw.trim() === '') return 'Student';

    if (raw.includes('@')) {
      const emailPrefix = raw.split('@')[0];
      return emailPrefix
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    return raw.trim();
  })();

  // User email displayed separately
  const userEmail = (() => {
    if (firebaseUser?.email) return firebaseUser.email;
    const storedEmail = localStorage.getItem('learnsmart_email');
    if (storedEmail) return storedEmail;
    try {
      const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
      if (savedProfile?.email) return savedProfile.email;
    } catch {}
    const student =
      sharedDatabase.getStudentByUsername(displayName) ||
      sharedDatabase.getStudentByUsername(currentUsername);
    if (student?.email) return student.email;
    return displayName && displayName !== 'Student'
      ? `${displayName.toLowerCase().replace(/\s+/g, '.')}@learnsmart.edu`
      : '';
  })();

  // Unique user ID from Firebase or storage
  const userUid = (() => {
    if (firebaseUser?.uid) return firebaseUser.uid;
    const storedUid = localStorage.getItem('learnsmart_uid');
    if (storedUid) return storedUid;
    try {
      const savedProfile = JSON.parse(localStorage.getItem('learnsmart_student_profile') || 'null');
      if (savedProfile?.uid) return savedProfile.uid;
    } catch {}
    const student =
      sharedDatabase.getStudentByUsername(displayName) ||
      sharedDatabase.getStudentByUsername(currentUsername);
    if (student?.uid) return student.uid;
    return '';
  })();

  // Effective profile avatar image
  const effectiveProfileImage = (() => {
    if (profileImage) return profileImage;
    if (firebaseUser?.photoURL) return firebaseUser.photoURL;
    const storedAvatar = localStorage.getItem('learnsmart_avatar');
    if (storedAvatar) return storedAvatar;
    const student =
      sharedDatabase.getStudentByUsername(displayName) ||
      sharedDatabase.getStudentByUsername(currentUsername);
    if (student?.avatarImage) return student.avatarImage;
    return null;
  })();

  const userInitials = (() => {
    if (!displayName) return 'SA';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return 'SA';
  })();

  const isZeroQuizzes = totalQuizzesTaken === 0 && quizHistory.length === 0;

  // Real class benchmark average from MySQL (anonymised, computed by the backend).
  const cohortAverage = React.useMemo(() => {
    const mean = Number(benchmark?.meanScore);
    return Number.isFinite(mean) && mean > 0 ? Math.round(mean * 10) / 10 : null;
  }, [benchmark]);

  // The benchmark only exists once there are real attempts to average.
  const hasCohortAverage = cohortAverage !== null;

  // Parse quiz attempt dates and scores robustly
  const parseAttempt = React.useCallback((item, index = 0) => {
    const score = typeof item.score === 'number' ? item.score : parseFloat(item.score) || 0;
    let date = null;

    if (item.timestamp) {
      date = new Date(item.timestamp);
    } else if (item.createdAt) {
      date = new Date(item.createdAt);
    } else if (item.date) {
      const dStr = String(item.date).toLowerCase();
      if (dStr.includes('today') || dStr.includes('just now')) {
        date = new Date();
      } else if (dStr.includes('yesterday')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        date = d;
      } else {
        const parsed = new Date(item.date);
        if (!isNaN(parsed.getTime())) {
          date = parsed;
        }
      }
    }

    if (!date || isNaN(date.getTime())) {
      const d = new Date();
      d.setDate(d.getDate() - index);
      date = d;
    }

    return {
      ...item,
      score,
      parsedDate: date
    };
  }, []);

  // Dynamically tracked Week performance data (Mon to Sun)
  const weekPerformanceData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (isZeroQuizzes || quizHistory.length === 0) {
      return days.map((day) => ({ day, score: 0, avg: 0 }));
    }

    // The class benchmark is a single real figure - the measured class average.
    const dayClassAvgs = days.map(() => (hasCohortAverage ? cohortAverage : 0));

    const attempts = [...quizHistory]
      .map((item, idx) => parseAttempt(item, idx))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    const attemptsByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    attempts.forEach((att) => {
      const dayOfWeek = (att.parsedDate.getDay() + 6) % 7; // 0=Mon, ..., 6=Sun
      attemptsByDay[dayOfWeek].push(att.score);
    });

    const activeDaysCount = Object.values(attemptsByDay).filter((arr) => arr.length > 0).length;

    if (activeDaysCount >= 3) {
      let lastKnownScore = null;
      const scores = [];
      const firstActiveKey = Object.keys(attemptsByDay).find((k) => attemptsByDay[k].length > 0);
      const initialScore =
        firstActiveKey !== undefined
          ? Math.round(
              attemptsByDay[firstActiveKey].reduce((a, b) => a + b, 0) /
                attemptsByDay[firstActiveKey].length
            )
          : attempts[0].score;

      for (let i = 0; i < 7; i++) {
        if (attemptsByDay[i].length > 0) {
          const dayAvg = Math.round(
            attemptsByDay[i].reduce((a, b) => a + b, 0) / attemptsByDay[i].length
          );
          lastKnownScore = dayAvg;
          scores.push(dayAvg);
        } else {
          scores.push(lastKnownScore !== null ? lastKnownScore : initialScore);
        }
      }
      return days.map((day, i) => ({ day, score: scores[i], avg: dayClassAvgs[i] }));
    }

    const allScores = attempts.map((a) => a.score);
    if (allScores.length === 1) {
      return days.map((day, i) => ({ day, score: allScores[0], avg: dayClassAvgs[i] }));
    }

    return days.map((day, i) => {
      const idx = Math.min(allScores.length - 1, Math.round((i / 6) * (allScores.length - 1)));
      return { day, score: allScores[idx], avg: dayClassAvgs[i] };
    });
  }, [isZeroQuizzes, quizHistory, cohortAverage, hasCohortAverage, parseAttempt]);

  // Dynamically tracked Month performance data (W1 to W4)
  const monthPerformanceData = React.useMemo(() => {
    const weeks = ['W1', 'W2', 'W3', 'W4'];
    if (isZeroQuizzes || quizHistory.length === 0) {
      return weeks.map((day) => ({ day, score: 0, avg: 0 }));
    }

    // The class benchmark is a single real figure - the measured class average.
    const weekClassAvgs = weeks.map(() => (hasCohortAverage ? cohortAverage : 0));

    const attempts = [...quizHistory]
      .map((item, idx) => parseAttempt(item, idx))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    const allScores = attempts.map((a) => a.score);
    if (allScores.length === 1) {
      return weeks.map((w, i) => ({
        day: w,
        score: allScores[0],
        avg: weekClassAvgs[i]
      }));
    }

    const weekBuckets = { 0: [], 1: [], 2: [], 3: [] };
    attempts.forEach((att) => {
      const dayOfMonth = att.parsedDate.getDate();
      const weekIdx = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
      weekBuckets[weekIdx].push(att.score);
    });

    const activeWeekCount = Object.values(weekBuckets).filter((arr) => arr.length > 0).length;

    if (activeWeekCount >= 2) {
      let lastKnown = null;
      const firstActive = Object.keys(weekBuckets).find((k) => weekBuckets[k].length > 0);
      const initialScore =
        firstActive !== undefined
          ? Math.round(
              weekBuckets[firstActive].reduce((a, b) => a + b, 0) /
                weekBuckets[firstActive].length
            )
          : allScores[0];

      return weeks.map((w, i) => {
        if (weekBuckets[i].length > 0) {
          const wAvg = Math.round(
            weekBuckets[i].reduce((a, b) => a + b, 0) / weekBuckets[i].length
          );
          lastKnown = wAvg;
          return { day: w, score: wAvg, avg: weekClassAvgs[i] };
        }
        return {
          day: w,
          score: lastKnown !== null ? lastKnown : initialScore,
          avg: weekClassAvgs[i]
        };
      });
    }

    return weeks.map((w, i) => {
      const idx = Math.min(allScores.length - 1, Math.round((i / 3) * (allScores.length - 1)));
      return {
        day: w,
        score: allScores[idx],
        avg: weekClassAvgs[i]
      };
    });
  }, [isZeroQuizzes, quizHistory, cohortAverage, hasCohortAverage, parseAttempt]);

  const activePerformanceData =
    performanceTimeframe === 'week' ? weekPerformanceData : monthPerformanceData;

  // Real-time Peak and Average score calculation for the selected timeframe & history
  const performanceStats = React.useMemo(() => {
    if (isZeroQuizzes || quizHistory.length === 0) {
      return { peak: '0%', avg: '0%' };
    }

    const activeScores = activePerformanceData.map((d) => d.score).filter((s) => s > 0);
    const allHistoryScores = quizHistory
      .map((q) => (typeof q.score === 'number' ? q.score : parseFloat(q.score) || 0))
      .filter((s) => s > 0);

    const scoresToUse = activeScores.length > 0 ? activeScores : allHistoryScores;
    if (scoresToUse.length === 0) {
      return { peak: '0%', avg: '0%' };
    }

    const peak = Math.max(...scoresToUse);
    const avg = Math.round(scoresToUse.reduce((a, b) => a + b, 0) / scoresToUse.length);

    return {
      peak: `${peak}%`,
      avg: `${avg}%`
    };
  }, [isZeroQuizzes, quizHistory, activePerformanceData]);

  // Colour palette for the subject-wise panels (assigned in a stable order).
  const SUBJECT_PALETTE = [
    { color: '#00C48C', bgLight: '#E6FAF0' },
    { color: '#00D2D3', bgLight: '#E0FAFA' },
    { color: '#FFB900', bgLight: '#FFF8E6' },
    { color: '#FF7675', bgLight: '#FFF0F0' },
    { color: '#6C5CE7', bgLight: '#F3E8FF' },
    { color: '#1D68F2', bgLight: '#EAF1FE' },
    { color: '#14B8A6', bgLight: '#E6F9F6' },
    { color: '#F472B6', bgLight: '#FDECF5' }
  ];

  // Friendly labels for the categories stored in MySQL.
  const formatSubjectName = (category = '') => {
    const raw = String(category || '').trim();
    if (!raw) return 'General';
    const labels = {
      dsa: 'Data Structures & Algorithms',
      'data structures': 'Data Structures & Algorithms',
      cybersecurity: 'Cyber Security',
      'cyber security': 'Cyber Security',
      math: 'Mathematics'
    };
    return labels[raw.toLowerCase()] || raw;
  };

  // Subjects are derived from what the student actually attempted plus the
  // published quiz catalog - never from a hardcoded list.
  const subjectProgress = React.useMemo(() => {
    const attemptsBySubject = new Map();

    quizHistory.forEach((item, idx) => {
      const parsed = parseAttempt(item, idx);
      const subject = formatSubjectName(item.category || parsed.category);
      if (!attemptsBySubject.has(subject)) attemptsBySubject.set(subject, []);
      attemptsBySubject.get(subject).push({
        score: parsed.score,
        quizKey: item.quizId || parsed.quizId || item.title || parsed.title || `attempt-${idx}`
      });
    });

    const availableBySubject = new Map();
    (quizzesList || []).forEach((quiz) => {
      const subject = formatSubjectName(quiz.category);
      availableBySubject.set(subject, (availableBySubject.get(subject) || 0) + 1);
    });

    // Subjects the student can still work on, even without an attempt.
    availableBySubject.forEach((_count, subject) => {
      if (!attemptsBySubject.has(subject)) attemptsBySubject.set(subject, []);
    });

    return [...attemptsBySubject.entries()]
      .sort(([nameA, listA], [nameB, listB]) => {
        const aAttempted = listA.length > 0;
        const bAttempted = listB.length > 0;
        if (aAttempted !== bAttempted) return aAttempted ? -1 : 1;
        return nameA.localeCompare(nameB);
      })
      .map(([subject, list], idx) => {
        const palette = SUBJECT_PALETTE[idx % SUBJECT_PALETTE.length];
        const scores = list.map((a) => a.score).filter((s) => Number.isFinite(s));
        const score = scores.length
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : 0;
        const quizzesTaken = new Set(list.map((a) => a.quizKey)).size;
        const quizzesAvailable = availableBySubject.get(subject) || quizzesTaken;

        return {
          name: subject,
          score,
          color: palette.color,
          bgLight: palette.bgLight,
          attemptsCount: list.length,
          quizzesTaken,
          quizzesAvailable,
          isAttempted: list.length > 0
        };
      });
  }, [quizHistory, quizzesList, parseAttempt]);

  const overallProgress = subjectProgress.length
    ? Math.round(subjectProgress.reduce((sum, s) => sum + s.score, 0) / subjectProgress.length)
    : 0;

  const chartW = 350;
  const chartH = 150;
  const padLeft = 32;
  const padBottom = 24;
  const padTop = 14;
  const padRight = 14;

  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  const getX = (idx) => padLeft + (idx / (activePerformanceData.length - 1)) * innerW;
  const getY = (val) => padTop + innerH - (val / 100) * innerH;

  const scorePathPoints = activePerformanceData
    .map((d, i) => `${getX(i)},${getY(d.score)}`)
    .join(' L ');
  const scoreAreaPoints = `${getX(0)},${getY(0)} L ${scorePathPoints} L ${getX(
    activePerformanceData.length - 1
  )},${getY(0)} Z`;

  const avgPathPoints = hasCohortAverage
    ? activePerformanceData.map((d, i) => `${getX(i)},${getY(d.avg)}`).join(' L ')
    : '';

  const donutR = 54;
  const donutStroke = 18;
  const donutC = 2 * Math.PI * donutR;
  const numSubjects = subjectProgress.length || 5;
  const sectorLen = donutC / numSubjects;
  const sectorGap = 3;
  const maxArc = sectorLen - sectorGap;

  const donutSegments = subjectProgress.map((seg, idx) => {
    const slotOffset = -(idx * sectorLen);
    const fillArc =
      isZeroQuizzes || seg.score <= 0
        ? 0
        : Math.min(maxArc, Math.max(1, (seg.score / 100) * maxArc));

    return {
      ...seg,
      slotOffset,
      trackDashArray: `${maxArc} ${donutC - maxArc}`,
      fillDashArray: `${fillArc} ${donutC - fillArc}`,
      hitDashArray: `${sectorLen} ${donutC - sectorLen}`,
      fillArc
    };
  });

  const recommendedQuizzesList = (() => {
    const list = quizzesList.filter((q) => q.isRecommended);
    const pool = list.length > 0 ? list : quizzesList;
    if (!searchQuery.trim()) return pool.slice(0, 3);
    const query = searchQuery.toLowerCase();
    return pool.filter((q) =>
      (q.title || '').toLowerCase().includes(query) ||
      (q.category || '').toLowerCase().includes(query) ||
      (q.difficulty || '').toLowerCase().includes(query)
    ).slice(0, 3);
  })();

  const handleQuizCompleted = ({
    quizId,
    quizTitle,
    category,
    score,
    correctCount,
    totalQuestions,
    answers,
    selectedAnswers
  }) => {
    if (quizId) {
      setCompletedQuizzes((prev) => {
        if (!prev.includes(quizId)) {
          const next = [...prev, quizId];
          try {
            localStorage.setItem('learnsmart_completed_quizzes', JSON.stringify(next));
          } catch (e) {
            console.warn(e);
          }
          return next;
        }
        return prev;
      });
    }

    const nextTotal = totalQuizzesTaken + 1;
    setTotalQuizzesTaken(nextTotal);

    setAverageScore((prev) => {
      if (totalQuizzesTaken === 0 || !prev) {
        return score;
      }
      const newAvg = (prev * totalQuizzesTaken + score) / nextTotal;
      return Math.round(newAvg * 10) / 10;
    });

    setStreakDays((prev) => {
      const nextStreak = prev > 0 ? prev : 1;
      try {
        localStorage.setItem('learnsmart_student_streak', String(nextStreak));
      } catch (e) {
        console.warn(e);
      }
      return nextStreak;
    });

    const now = Date.now();
    const newHistoryItem = {
      id: now,
      timestamp: now,
      createdAt: new Date(now).toISOString(),
      title: quizTitle,
      category,
      score,
      status: score >= 80 ? 'Mastered' : score >= 70 ? 'Passed' : 'Needs Review',
      date: 'Today, ' + new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setQuizHistory((prev) => {
      const updated = [newHistoryItem, ...prev];
      try {
        localStorage.setItem('learnsmart_student_quiz_history', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    // The receipt notification is written to MySQL by the backend when the
    // attempt is stored, so it shows up in the notification centre on the
    // next sync instead of only in the browser.

    // Resolve authentic Firebase user details
    const activeUid = firebaseUser?.uid || auth.currentUser?.uid || localStorage.getItem('learnsmart_uid') || '';
    const activeEmail = firebaseUser?.email || auth.currentUser?.email || localStorage.getItem('learnsmart_email') || currentStudent?.email || '';
    const activeName = displayName || currentUsername || firebaseUser?.displayName || auth.currentUser?.displayName || localStorage.getItem('learnsmart_user') || 'Student';

    // Record quiz attempt into shared database so Educator Dashboard updates
    sharedDatabase.recordQuizAttempt({
      studentName: activeName,
      studentEmail: activeEmail,
      studentId: activeUid,
      quizTitle,
      score,
      category,
      quizId,
      answers: answers || selectedAnswers || {},
      correctCount,
      totalQuestions
    });

    showToast(`🎉 Quiz Finished! You scored ${score}%`);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    showToast('All notifications marked as read');
  };

  const handleDismissNotification = (id) => {
    dismissServerNotification(id);
  };

  const handleStartQuiz = (quiz) => {
    if (!quiz) return;
    if (completedQuizzes.includes(quiz.id)) {
      showToast('Quiz already completed');
      return;
    }
    setActiveQuizModal(quiz);
  };

  const handleStartQuizByIdOrTitle = (identifier, allowRetake = false) => {
    const found =
      quizzesList.find((q) => q.id === identifier || q.title.toLowerCase() === identifier.toLowerCase()) ||
      quizzesList[0];
    if (!found) return;
    if (completedQuizzes.includes(found.id) && !allowRetake) {
      showToast('Quiz already completed');
      return;
    }
    setActiveQuizModal(found);
  };

  return (
    <div className="dashboard-layout">
      {toastMessage && (
        <div className="dashboard-toast" role="alert">
          <CheckCircleIcon size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="dashboard-navbar">
        <div className="navbar-left">
          <div
            className="logo-brand"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <img src={capIcon} alt="LearnSmart Cap" className="logo-cap" />
            <div className="logo-text-group">
              <span className="logo-title">LearnSmart</span>
              <span className="logo-subtitle">Adaptive Quiz System</span>
            </div>
          </div>
        </div>

        <div className="navbar-center">
          <div className="dashboard-search-bar">
            <SearchIcon size={18} color="#8A99AD" />
            <input
              type="text"
              className="dashboard-search-input"
              placeholder="Search quizzes, topics, DSA..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'take-quiz' && activeTab !== 'dashboard') {
                  setActiveTab('take-quiz');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('take-quiz');
                }
              }}
            />
          </div>
        </div>

        <div className="navbar-right">
          <div className="navbar-bell-container" ref={notifDropdownRef}>
            <button
              type="button"
              className={`navbar-icon-button ${showNotifDropdown ? 'active-btn' : ''}`}
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowProfileDropdown(false);
              }}
              aria-label={`${unreadNotifCount} notifications`}
              aria-expanded={showNotifDropdown}
            >
              <BellIcon size={20} color="#475569" />
              {unreadNotifCount > 0 && (
                <span className="notification-badge">{unreadNotifCount}</span>
              )}
            </button>

            {showNotifDropdown && (
              <NotificationsDropdown
                notifications={notifications}
                onClose={() => setShowNotifDropdown(false)}
                onViewAll={() => setActiveTab('notifications')}
                onMarkAllAsRead={handleMarkAllRead}
              />
            )}
          </div>

          <div className="user-profile-header-container" ref={profileDropdownRef}>
            <div
              className={`user-profile-header ${showProfileDropdown ? 'active-header' : ''}`}
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifDropdown(false);
              }}
              aria-expanded={showProfileDropdown}
              role="button"
              tabIndex={0}
            >
              <div className="student-avatar-badge" aria-label={displayName}>
                {effectiveProfileImage ? (
                  <img
                    src={effectiveProfileImage}
                    alt={displayName}
                    className="student-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <div className="user-meta">
                <span className="user-name">{displayName}</span>
                {userEmail && <span className="user-email" title={userEmail}>{userEmail}</span>}
                <span className="user-role">Student</span>
              </div>
              <span
                className={`user-dropdown-arrow ${showProfileDropdown ? 'rotated' : ''}`}
                aria-hidden="true"
              >
                <ChevronDownIcon size={14} color="#64748B" />
              </span>
            </div>

            {showProfileDropdown && (
              <ProfileDropdownMenu
                displayName={displayName}
                userEmail={userEmail}
                userInitials={userInitials}
                profileImage={effectiveProfileImage}
                uid={userUid}
                onClose={() => setShowProfileDropdown(false)}
                onNavigate={(tab) => {
                  if (tab === 'edit-profile') {
                    setActiveTab('profile');
                    setStartEditProfile(true);
                  } else {
                    setActiveTab(tab);
                  }
                }}
                onLogout={onLogout}
              />
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <HomeIcon size={19} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'take-quiz' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('take-quiz');
              }}
            >
              <StarIcon size={19} color="currentColor" />
              <span>Take Quiz</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'recommended' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('recommended');
              }}
            >
              <BotIcon size={19} />
              <span>Recommended Quizzes</span>
              <span className="sidebar-badge-ai">AI Chat</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'progress' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('progress');
              }}
            >
              <ChartIcon size={19} color="currentColor" />
              <span>My Progress</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'learning-path' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('learning-path');
              }}
            >
              <BookOpenIcon size={19} />
              <span>Learning Path</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
              }}
            >
              <BellIcon size={19} />
              <span>Notifications</span>
              {unreadNotifCount > 0 && (
                <span className="sidebar-badge">{unreadNotifCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
              }}
            >
              <UserIcon size={19} color="currentColor" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('settings');
              }}
            >
              <SettingsIcon size={19} color="currentColor" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button
              type="button"
              className="sidebar-logout-button"
              onClick={onLogout}
            >
              <LogoutIcon size={19} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className={`dashboard-content ${activeTab === 'recommended' ? 'dashboard-content-chat' : ''}`}>
          {activeTab === 'dashboard' && (
            <>
              <section className="dashboard-greeting-banner">
                <div className="greeting-text-wrap">
                  <h1 className="greeting-title">Hello, {displayName}! 👋</h1>
                  <p className="greeting-subtext">Keep learning, you're doing great!</p>
                  {userEmail && (
                    <div className="greeting-email-badge">
                      <span>{userEmail}</span>
                    </div>
                  )}
                </div>
                <div className="greeting-cta-wrap">
                  <button
                    type="button"
                    className="greeting-quick-quiz-btn"
                    onClick={() => handleStartQuiz(quizzesList[0])}
                  >
                    <PlayIcon size={16} />
                    <span>Quick Quiz</span>
                  </button>
                </div>
              </section>

              <section className="dashboard-stats-grid">
                <div className="dash-stat-card card-blue-tint">
                  <div className="stat-card-inner">
                    <div className="stat-icon-wrapper stat-icon-blue">
                      <TargetIcon size={24} color="#1D68F2" />
                    </div>
                    <div className="stat-details">
                      <span className="stat-title">Total Quizzes Taken</span>
                      <div className="stat-value">{totalQuizzesTaken}</div>
                      <div className="stat-trend trend-green">
                        <TrendingUpIcon size={12} color="#10B981" />
                        <span>{isZeroQuizzes ? 'Ready to start' : 'Active learner'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dash-stat-card card-green-tint">
                  <div className="stat-card-inner">
                    <div className="stat-icon-wrapper stat-icon-green">
                      <StarIcon size={24} color="#10B981" />
                    </div>
                    <div className="stat-details">
                      <span className="stat-title">Average Score</span>
                      <div className="stat-value">{isZeroQuizzes ? '0%' : `${averageScore}%`}</div>
                      <div className="stat-trend trend-green">
                        <TrendingUpIcon size={12} color="#10B981" />
                        <span>{isZeroQuizzes ? 'No quizzes yet' : 'Real-time tracked'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dash-stat-card card-amber-tint">
                  <div className="stat-card-inner">
                    <div className="stat-icon-wrapper stat-icon-amber">
                      <ClockIcon size={24} color="#F97316" />
                    </div>
                    <div className="stat-details">
                      <span className="stat-title">Learning Streak</span>
                      <div className="stat-value">{streakDays} Days</div>
                      <div className="stat-streak-msg">{streakDays > 0 ? 'Keep it up! 🔥' : 'Start your streak! 🔥'}</div>
                    </div>
                  </div>
                </div>

                <div
                  className="dash-stat-card card-purple-tint clickable-card"
                  onClick={() => setActiveTab('recommended')}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-card-inner">
                    <div className="stat-icon-wrapper stat-icon-purple">
                      <ListIcon size={24} color="#8B5CF6" />
                    </div>
                    <div className="stat-details">
                      <span className="stat-title">Recommended Quizzes</span>
                      <div className="stat-value">{quizzesList.filter((q) => q.isRecommended).length || quizzesList.length}</div>
                      <button
                        type="button"
                        className="stat-action-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('recommended');
                        }}
                      >
                        View Recommended →
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid-row">
                <div className="dash-panel-card performance-panel">
                  <div className="performance-panel-header">
                    <div className="performance-header-top-row">
                      <h2 className="panel-title">Your Performance</h2>
                      <div className="timeframe-toggle-pills">
                        <button
                          type="button"
                          className={`time-pill ${performanceTimeframe === 'week' ? 'active' : ''}`}
                          onClick={() => {
                            setPerformanceTimeframe('week');
                            setHoveredPoint(null);
                          }}
                        >
                          Week
                        </button>
                        <button
                          type="button"
                          className={`time-pill ${performanceTimeframe === 'month' ? 'active' : ''}`}
                          onClick={() => {
                            setPerformanceTimeframe('month');
                            setHoveredPoint(null);
                          }}
                        >
                          Month
                        </button>
                      </div>
                    </div>

                    <div className="performance-header-meta-row">
                      <span className="panel-subtitle-stat">
                        Peak: {performanceStats.peak} • Avg: {performanceStats.avg}
                      </span>
                      <div className="chart-legend">
                        <span className="legend-item">
                          <span className="legend-line line-solid" />
                          <span>Score</span>
                        </span>
                        {hasCohortAverage && (
                          <span className="legend-item">
                            <span className="legend-line line-dashed" />
                            <span>Class Avg</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="performance-chart-wrapper">
                    <svg
                      viewBox={`0 0 ${chartW} ${chartH}`}
                      className="performance-svg-chart"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <linearGradient
                          id="scoreGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#1A6BFF" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#1A6BFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[100, 75, 50, 25, 0].map((v) => (
                        <g key={v}>
                          <line
                            x1={padLeft}
                            y1={getY(v)}
                            x2={chartW - padRight}
                            y2={getY(v)}
                            stroke="#EEF2F6"
                            strokeWidth="1"
                          />
                          <text
                            x={padLeft - 8}
                            y={getY(v) + 3}
                            fontSize="9"
                            fill="#64748B"
                            textAnchor="end"
                            fontFamily="inherit"
                            fontWeight="500"
                          >
                            {v}
                          </text>
                        </g>
                      ))}

                      <line
                        x1={padLeft}
                        y1={padTop}
                        x2={padLeft}
                        y2={getY(0)}
                        stroke="#CBD5E1"
                        strokeWidth="1.2"
                      />

                      <path d={`M ${scoreAreaPoints}`} fill="url(#scoreGradient)" />

                      {hasCohortAverage && (
                        <path
                          d={`M ${avgPathPoints}`}
                          fill="none"
                          stroke="#00D2D3"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                          strokeLinecap="round"
                        />
                      )}

                      <path
                        d={`M ${scorePathPoints}`}
                        fill="none"
                        stroke="#1A6BFF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {activePerformanceData.map((d, i) => (
                        <circle
                          key={i}
                          cx={getX(i)}
                          cy={getY(d.score)}
                          r={hoveredPoint === i ? 6 : 4}
                          fill="#1A6BFF"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={() => setHoveredPoint(i)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}

                      {activePerformanceData.map((d, i) => (
                        <text
                          key={d.day}
                          x={getX(i)}
                          y={chartH - 4}
                          fontSize="9.5"
                          fill="#475569"
                          textAnchor="middle"
                          fontWeight="600"
                          fontFamily="inherit"
                        >
                          {d.day}
                        </text>
                      ))}
                    </svg>

                    {hoveredPoint !== null && activePerformanceData[hoveredPoint] && (
                      <div
                        className="chart-tooltip"
                        style={{
                          left: `${(getX(hoveredPoint) / chartW) * 100}%`,
                          top: `${(getY(activePerformanceData[hoveredPoint].score) / chartH) * 100 - 18}%`
                        }}
                      >
                        <div className="tooltip-day">{activePerformanceData[hoveredPoint].day}</div>
                        <div className="tooltip-score">
                          Score: <strong>{activePerformanceData[hoveredPoint].score}%</strong>
                        </div>
                        {hasCohortAverage && (
                          <div className="tooltip-avg">
                            Class Avg: {activePerformanceData[hoveredPoint].avg}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="dash-panel-card progress-panel">
                  <div className="panel-header">
                    <h2 className="panel-title">Subject-wise Progress</h2>
                    <span className="panel-badge-green">
                      {subjectProgress.length} {subjectProgress.length === 1 ? 'Subject' : 'Subjects'}
                    </span>
                  </div>

                  <div className="donut-content-row">
                    <div className="donut-chart-wrapper">
                      <div className="donut-chart-container">
                        <svg
                          viewBox="0 0 160 160"
                          className="donut-svg"
                        >
                          <g transform="rotate(-90 80 80)">
                            {/* Background sector tracks with gaps */}
                            {donutSegments.map((seg, idx) => (
                              <circle
                                key={`track-${idx}`}
                                cx="80"
                                cy="80"
                                r={donutR}
                                fill="transparent"
                                stroke="#E2E8F0"
                                strokeWidth={donutStroke}
                                strokeDasharray={seg.trackDashArray}
                                strokeDashoffset={seg.slotOffset}
                                strokeLinecap="butt"
                              />
                            ))}

                            {/* Active colored progress fill arcs */}
                            {donutSegments.map((seg, idx) => {
                              if (seg.fillArc <= 0) return null;
                              const isHovered =
                                hoveredSubject && hoveredSubject.name === seg.name;
                              return (
                                <circle
                                  key={`fill-${idx}`}
                                  cx="80"
                                  cy="80"
                                  r={donutR}
                                  fill="transparent"
                                  stroke={seg.color}
                                  strokeWidth={isHovered ? donutStroke + 4 : donutStroke}
                                  strokeDasharray={seg.fillDashArray}
                                  strokeDashoffset={seg.slotOffset}
                                  strokeLinecap="butt"
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                                    opacity: hoveredSubject && !isHovered ? 0.4 : 1
                                  }}
                                  onMouseEnter={() => setHoveredSubject(seg)}
                                  onMouseLeave={() => setHoveredSubject(null)}
                                />
                              );
                            })}

                            {/* Transparent hover hit-areas covering each sector */}
                            {donutSegments.map((seg, idx) => (
                              <circle
                                key={`hit-${idx}`}
                                cx="80"
                                cy="80"
                                r={donutR}
                                fill="transparent"
                                stroke="transparent"
                                strokeWidth={donutStroke + 8}
                                strokeDasharray={seg.hitDashArray}
                                strokeDashoffset={seg.slotOffset}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredSubject(seg)}
                                onMouseLeave={() => setHoveredSubject(null)}
                                onClick={() => setActiveTab('progress')}
                              >
                                <title>{`${seg.name}: ${seg.score}%`}</title>
                              </circle>
                            ))}
                          </g>
                        </svg>
                        <div className="donut-center-text">
                          <span className="donut-percentage">
                            {hoveredSubject ? `${hoveredSubject.score}%` : `${overallProgress}%`}
                          </span>
                        </div>
                      </div>

                      {/* Subject name moved outside of the circle and below it */}
                      <div className="donut-outside-label">
                        {hoveredSubject ? (
                          <div
                            className="donut-outside-pill"
                            style={{
                              borderColor: `${hoveredSubject.color}45`,
                              backgroundColor: `${hoveredSubject.color}14`
                            }}
                          >
                            <span
                              className="donut-outside-dot"
                              style={{ backgroundColor: hoveredSubject.color }}
                            />
                            <span
                              className="donut-outside-name"
                              title={hoveredSubject.name}
                            >
                              {hoveredSubject.name}
                            </span>
                          </div>
                        ) : (
                          <div className="donut-outside-pill">
                            <span className="donut-outside-dot overall" />
                            <span
                              className="donut-outside-name"
                              title="Overall Progress"
                            >
                              Overall Progress
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="donut-legend-list">
                      {subjectProgress.map((item) => {
                        const isHovered =
                          hoveredSubject && hoveredSubject.name === item.name;
                        return (
                          <div
                            key={item.name}
                            className={`donut-legend-item ${isHovered ? 'hovered' : ''}`}
                            onMouseEnter={() => setHoveredSubject(item)}
                            onMouseLeave={() => setHoveredSubject(null)}
                            onClick={() => {
                              setActiveTab('progress');
                            }}
                            title="Click to view detailed progress"
                          >
                            <div className="legend-item-info">
                              <span
                                className="legend-dot"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="legend-subject-name">{item.name}</span>
                              <span className="legend-subject-pct">{item.score}%</span>
                            </div>
                            <div className="mini-progress-track">
                              <div
                                className="mini-progress-fill"
                                style={{
                                  width: `${item.score}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {subjectProgress.length === 0 && (
                        <span className="legend-subject-name">
                          No quiz subjects available yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dash-panel-card quizzes-panel">
                  <div className="panel-header">
                    <div className="panel-header-title-group">
                      <h2 className="panel-title">Recommended Quizzes</h2>
                      <span className="panel-badge-purple">AI Adaptive</span>
                    </div>
                    <button
                      type="button"
                      className="panel-view-all-link"
                      onClick={() => setActiveTab('recommended')}
                      title="View all recommended quizzes"
                    >
                      View All ({quizzesList.filter((q) => q.isRecommended).length || quizzesList.length}) →
                    </button>
                  </div>

                  {recommendedQuizzesList.length === 0 ? (
                    <div className="recommended-empty-state">
                      <p className="empty-state-msg">
                        {searchQuery.trim()
                          ? `No quizzes match "${searchQuery}"`
                          : "No quizzes published yet. Check back soon for new assessments!"}
                      </p>
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          className="empty-state-clear-btn"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="recommended-quizzes-list">
                      {recommendedQuizzesList.map((quiz) => {
                        const isDone = completedQuizzes.includes(quiz.id);
                        return (
                          <div key={quiz.id} className="quiz-card-row">
                            <div
                              className="quiz-icon-box"
                              style={{
                                backgroundColor: quiz.categoryBg || '#F8FAFC'
                              }}
                            >
                              {quiz.category === 'Programming' && <PythonIcon size={20} />}
                              {quiz.category === 'Cyber Security' && (
                                <ShieldIcon size={20} color="#8B5CF6" />
                              )}
                              {quiz.category === 'DSA' && <CodeIcon size={20} color="#1D68F2" />}
                              {quiz.category === 'Mathematics' && (
                                <TargetIcon size={20} color="#F59E0B" />
                              )}
                              {quiz.category !== 'Programming' &&
                                quiz.category !== 'Cyber Security' &&
                                quiz.category !== 'DSA' &&
                                quiz.category !== 'Mathematics' && (
                                  <TargetIcon size={20} color="#10B981" />
                                )}
                            </div>

                            <div className="quiz-info-col">
                              <div className="quiz-row-title-wrap">
                                <h3 className="quiz-item-title" title={quiz.title}>
                                  {quiz.title}
                                </h3>
                                {quiz.isRecommended && (
                                  <span className="quiz-mini-rec-badge">★ AI</span>
                                )}
                              </div>

                              <div className="quiz-meta-badges">
                                <span
                                  className="quiz-badge"
                                  style={{
                                    backgroundColor: quiz.categoryBg || '#F1F5F9',
                                    color: quiz.categoryColor || '#475569'
                                  }}
                                >
                                  {quiz.category}
                                </span>
                                <span
                                  className="quiz-badge"
                                  style={{
                                    backgroundColor: quiz.diffBg || '#FEF3C7',
                                    color: quiz.diffColor || '#B45309'
                                  }}
                                >
                                  {quiz.difficulty}
                                </span>
                                <span className="quiz-questions-count">
                                  {quiz.questionsCount || quiz.questions?.length || 5} Qs • {quiz.duration || '5m'}
                                </span>
                              </div>

                              {quiz.recommendationReason && (
                                <div
                                  className="quiz-rec-hint-text"
                                  title={quiz.recommendationReason}
                                >
                                  <span className="rec-hint-icon">⚡</span>
                                  <span className="rec-hint-text-inner">
                                    {quiz.recommendationReason}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="quiz-action-col">
                              <button
                                type="button"
                                className={`start-quiz-btn ${isDone ? 'completed-btn' : ''}`}
                                onClick={() => handleStartQuiz(quiz)}
                                title={isDone ? 'Quiz already completed' : `Start ${quiz.title}`}
                              >
                                <span>{isDone ? 'Done ✓' : 'Start'}</span>
                                {!isDone && <span>→</span>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'take-quiz' && (
            <TakeQuizView
              quizzes={quizzesList}
              onStartQuiz={handleStartQuiz}
              externalSearch={searchQuery}
              completedQuizIds={completedQuizzes}
              isRecommendedView={false}
              onSwitchToAll={() => setActiveTab('take-quiz')}
            />
          )}

          {activeTab === 'recommended' && (
            <AIChatBotView
              username={displayName}
              quizzes={quizzesList}
              onStartQuiz={handleStartQuiz}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onSwitchToAllQuizzes={() => setActiveTab('take-quiz')}
              completedQuizIds={completedQuizzes}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressView
              quizzesTaken={totalQuizzesTaken}
              avgScore={`${averageScore}%`}
              streakDays={streakDays}
              quizHistory={quizHistory}
              subjectProgress={subjectProgress}
              benchmark={benchmark}
              onRetakeQuiz={handleStartQuizByIdOrTitle}
              onStartQuiz={() => setActiveTab('take-quiz')}
            />
          )}

          {activeTab === 'learning-path' && (
            <LearningPathView
              onStartQuizByTopic={(topic) => handleStartQuizByIdOrTitle(topic, true)}
              completedQuizIds={completedQuizzes}
              quizHistory={quizHistory}
              totalQuizzesTaken={totalQuizzesTaken}
              subjectProgress={subjectProgress}
              averageScore={averageScore}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationCenter
              notifications={notifications}
              onMarkAllAsRead={handleMarkAllRead}
              onDismissNotification={handleDismissNotification}
              onNotificationAction={(n) => {
                if (n.category === 'quiz') setActiveTab('take-quiz');
                else if (n.category === 'streak') setActiveTab('progress');
                else if (n.category === 'milestone') setActiveTab('learning-path');
              }}
              subtitle="Stay up to date with quiz evaluations, streak milestones, and personalized study alerts."
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              displayName={displayName}
              userEmail={userEmail}
              userInitials={userInitials}
              profileImage={effectiveProfileImage}
              uid={userUid}
              startInEditMode={startEditProfile}
              onEditClosed={() => setStartEditProfile(false)}
              onUpdateProfile={(updatedData) => {
                let updatedName = null;
                if (typeof updatedData === 'string') {
                  setCurrentUsername(updatedData);
                  updatedName = updatedData;
                } else {
                  if (updatedData.fullName) {
                    setCurrentUsername(updatedData.fullName);
                    updatedName = updatedData.fullName;
                  }
                  if (updatedData.profileImage !== undefined) {
                    setProfileImage(updatedData.profileImage);
                    try {
                      if (updatedData.profileImage) {
                        localStorage.setItem('learnsmart_avatar', updatedData.profileImage);
                      } else {
                        localStorage.removeItem('learnsmart_avatar');
                      }
                    } catch (e) {
                    }
                  }
                }
                if (updatedName) {
                  try {
                    localStorage.setItem('learnsmart_user', updatedName);
                  } catch (e) {
                  }
                }
                showToast('Profile and picture updated successfully!');
              }}
              onLogout={onLogout}
            />
          )}

          {activeTab === 'settings' && (
            <StudentSettingsView showToast={showToast} />
          )}
        </main>
      </div>

      {activeQuizModal && (
        <QuizModal
          quiz={activeQuizModal}
          studentName={currentUsername}
          onClose={() => setActiveQuizModal(null)}
          onComplete={handleQuizCompleted}
          showToast={showToast}
        />
      )}
    </div>
  );
};
