import { apiGet, apiPost, getCurrentIdentity } from './apiClient.js';
import { sharedDatabase } from './sharedDatabase.js';

export const EVENT_ACTIVITY_UPDATED = 'learnsmart_activity_updated';

export const activityService = {
  /**
   * Generates fallback activity entries from local sharedDatabase submissions
   * to guarantee the feed is populated even during network or session transitions.
   */
  getFallbackActivities: (studentIdFilter = null) => {
    try {
      // 1. First check explicitly saved activity records
      let savedActivities = [];
      try {
        const rawSaved = localStorage.getItem('learnsmart_saved_activities');
        if (rawSaved) savedActivities = JSON.parse(rawSaved);
      } catch {}

      if (Array.isArray(savedActivities) && savedActivities.length > 0) {
        if (!studentIdFilter) return savedActivities;
        const sFilter = String(studentIdFilter).toLowerCase().trim();
        const filtered = savedActivities.filter((a) => {
          return (
            String(a.actorId || '').toLowerCase().includes(sFilter) ||
            String(a.actorName || '').toLowerCase().includes(sFilter) ||
            String(a.summary || '').toLowerCase().includes(sFilter)
          );
        });
        if (filtered.length > 0) return filtered;
      }

      // 2. Synthesize activities from shared submissions and student quiz history
      let submissions = [];
      try {
        const rawSub = localStorage.getItem('learnsmart_shared_submissions') || localStorage.getItem('learnsmart_submissions');
        if (rawSub) submissions = JSON.parse(rawSub);
      } catch {}

      if (!Array.isArray(submissions) || submissions.length === 0) {
        if (typeof sharedDatabase?.getSubmissions === 'function') {
          submissions = sharedDatabase.getSubmissions();
        }
      }

      // Also check local student quiz history
      try {
        const identity = getCurrentIdentity();
        const userKey = (identity.email || identity.uid || identity.name || 'default').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
        const userHistRaw = localStorage.getItem(`learnsmart_student_quiz_history_${userKey}`) || localStorage.getItem('learnsmart_student_quiz_history');
        if (userHistRaw) {
          const parsedHist = JSON.parse(userHistRaw);
          if (Array.isArray(parsedHist)) {
            parsedHist.forEach((h) => {
              if (!submissions.some((s) => (s.quizId && s.quizId === h.quizId) || s.title === h.title || s.quizTitle === h.title)) {
                submissions.push({
                  id: h.id,
                  quizId: h.quizId,
                  title: h.title,
                  category: h.category,
                  score: h.score,
                  status: h.status,
                  student: identity.name || 'Student',
                  studentEmail: identity.email || '',
                  studentId: identity.uid || '',
                  date: h.date || 'Today',
                  submittedAt: h.createdAt || ''
                });
              }
            });
          }
        }
      } catch {}

      if (!Array.isArray(submissions)) return [];

      const filterNorm = studentIdFilter && String(studentIdFilter).toLowerCase().trim() !== 'null'
        ? String(studentIdFilter).toLowerCase().trim()
        : '';

      const list = [];
      submissions.forEach((sub, idx) => {
        const actorName = sub.student || sub.studentName || 'Learner';
        const actorId = sub.studentId || sub.uid || sub.id || '';
        const actorEmail = sub.studentEmail || sub.email || '';

        if (filterNorm) {
          const match =
            String(actorId).toLowerCase().includes(filterNorm) ||
            actorName.toLowerCase().includes(filterNorm) ||
            actorEmail.toLowerCase().includes(filterNorm);
          if (!match) return;
        }

        const scoreRaw = String(sub.score || '0').replace('%', '').trim();
        const score = parseFloat(scoreRaw) || 0;
        const isPass = sub.status === 'Passed' || sub.status === 'Mastered' || (score >= 70);
        const quizTitle = sub.title || sub.quizTitle || 'Quiz Assessment';

        list.push({
          id: sub.id || `local_sub_${idx}_${Date.now()}`,
          actorId,
          actorName,
          actorRole: 'student',
          action: 'attempt.submitted',
          entityType: 'quiz',
          entityId: sub.quizId || sub.id || 'quiz',
          summary: `${actorName} submitted '${quizTitle}' and scored ${Math.round(score)}% (${isPass ? 'Passed' : 'Needs Review'})`,
          metadata: {
            score,
            status: isPass ? 'Passed' : 'Needs Review',
            quizTitle,
            category: sub.category || 'General',
            correctCount: sub.correctCount,
            totalQuestions: sub.totalQuestions
          },
          createdAt: sub.submittedAt || sub.createdAt || sub.date || new Date().toISOString()
        });
      });

      return list;
    } catch (e) {
      console.warn('[ActivityService] Error compiling fallback activities:', e);
      return [];
    }
  },

  /**
   * Fetches activities from MySQL backend with role-based scoping and filters.
   * Admin sees platform-wide events; Educators see their students' events; Students see their own.
   */
  getActivities: async ({
    limit = 50,
    action = null,
    studentId = null,
    roleFilter = null,
    search = ''
  } = {}) => {
    try {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      if (action && action !== 'all') params.set('action', action);
      if (
        studentId &&
        String(studentId).trim() !== '' &&
        String(studentId).toLowerCase() !== 'null' &&
        String(studentId).toLowerCase() !== 'undefined'
      ) {
        params.set('student_id', String(studentId).trim());
      }
      if (roleFilter && roleFilter !== 'all') params.set('role_filter', roleFilter);
      if (search && search.trim()) params.set('search', search.trim());

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiGet(`/api/activity${query}`);
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      if (entries.length > 0) {
        try {
          localStorage.setItem('learnsmart_saved_activities', JSON.stringify(entries));
        } catch {}
        return entries;
      }
      return activityService.getFallbackActivities(studentId);
    } catch (err) {
      console.warn('[ActivityService] Failed to load activities from API, using fallback:', err?.message || err);
      return activityService.getFallbackActivities(studentId);
    }
  },

  /**
   * Records a student activity event directly in MySQL database.
   */
  logActivity: async ({
    action,
    entityType = 'quiz',
    entityId = null,
    summary = '',
    metadata = null,
    studentId = null,
    studentName = null,
    studentEmail = null
  }) => {
    try {
      const identity = getCurrentIdentity();
      const resolvedStudentId = studentId || identity.uid || localStorage.getItem('learnsmart_uid') || '';
      const resolvedStudentName = studentName || identity.name || localStorage.getItem('learnsmart_user') || 'Student';
      const resolvedEmail = studentEmail || identity.email || localStorage.getItem('learnsmart_email') || '';

      const payload = {
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        summary: summary || `${resolvedStudentName} performed ${action}`,
        metadata: {
          ...metadata,
          email: resolvedEmail
        },
        student_id: resolvedStudentId,
        student_name: resolvedStudentName,
        student_email: resolvedEmail
      };

      // 1. Immediately cache in local storage so the activity appears instantly and persists across reloads
      try {
        const newAct = {
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          actorId: resolvedStudentId,
          actorName: resolvedStudentName,
          actorRole: 'student',
          action,
          entityType,
          entityId,
          summary: payload.summary,
          metadata: payload.metadata,
          createdAt: new Date().toISOString()
        };
        const currentSaved = JSON.parse(localStorage.getItem('learnsmart_saved_activities') || '[]');
        const updatedSaved = [newAct, ...currentSaved].slice(0, 100);
        localStorage.setItem('learnsmart_saved_activities', JSON.stringify(updatedSaved));
      } catch (cacheErr) {
        console.warn('Local activity cache note:', cacheErr);
      }

      const result = await apiPost('/api/activity', payload);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_ACTIVITY_UPDATED, { detail: payload }));
        try {
          localStorage.setItem('learnsmart_activity_sync', JSON.stringify({ ...payload, _t: Date.now() }));
        } catch {}
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('learnsmart_telemetry_stream');
            bc.postMessage(payload);
            bc.close();
          }
        } catch {}
      }

      return result;
    } catch (err) {
      console.warn('[ActivityService] Failed to record activity to backend:', err?.message || err);
      // Still notify local UI and other tabs
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent(EVENT_ACTIVITY_UPDATED, { detail: { action, summary } }));
          localStorage.setItem('learnsmart_activity_sync', JSON.stringify({ action, summary, _t: Date.now() }));
        } catch {}
      }
      return null;
    }
  },

  /**
   * Logs when a student starts a quiz session.
   */
  logQuizStart: async (quiz, studentInfo = null) => {
    if (!quiz) return;
    try {
      const identity = getCurrentIdentity();
      const sId = studentInfo?.id || studentInfo?.uid || identity.uid || localStorage.getItem('learnsmart_uid') || '';
      const sName = studentInfo?.name || identity.name || localStorage.getItem('learnsmart_user') || 'Student';
      const sEmail = studentInfo?.email || identity.email || localStorage.getItem('learnsmart_email') || '';

      const targetQuizId = quiz.id || `quiz-${encodeURIComponent(quiz.title || 'assessment')}`;

      // Call dedicated start endpoint on backend
      try {
        await apiPost(`/api/quizzes/${encodeURIComponent(targetQuizId)}/start`, {
          studentName: sName,
          studentEmail: sEmail,
          studentId: sId,
          quizTitle: quiz.title || 'Assessment',
          category: quiz.category || 'General'
        });
      } catch (e) {
        // Fallback to direct activity logging
        await activityService.logActivity({
          action: 'quiz.started',
          entityType: 'quiz',
          entityId: targetQuizId,
          summary: `${sName} started '${quiz.title || 'Assessment'}' (${quiz.category || 'General'})`,
          metadata: {
            quizTitle: quiz.title,
            category: quiz.category,
            difficulty: quiz.difficulty,
            questionsCount: quiz.questionsCount || quiz.questions?.length || 5
          },
          studentId: sId,
          studentName: sName,
          studentEmail: sEmail
        });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_ACTIVITY_UPDATED, { detail: { action: 'quiz.started' } }));
        try {
          localStorage.setItem('learnsmart_activity_sync', JSON.stringify({ action: 'quiz.started', _t: Date.now() }));
        } catch {}
      }
    } catch (err) {
      console.warn('[ActivityService] Error in logQuizStart:', err?.message || err);
    }
  },

  /**
   * Logs a student milestone or streak achievement.
   */
  logMilestone: async (title, details = {}) => {
    try {
      const identity = getCurrentIdentity();
      const sName = identity.name || localStorage.getItem('learnsmart_user') || 'Student';
      return await activityService.logActivity({
        action: 'learning.milestone',
        entityType: 'milestone',
        entityId: details?.topic || 'learning-path',
        summary: `${sName} achieved milestone: ${title}`,
        metadata: details
      });
    } catch (e) {
      console.warn('[ActivityService] logMilestone note:', e);
    }
  },

  /**
   * Logs AI adaptive chatbot interaction.
   */
  logAiInteraction: async (topicOrAction, details = {}) => {
    try {
      const identity = getCurrentIdentity();
      const sName = identity.name || localStorage.getItem('learnsmart_user') || 'Student';
      return await activityService.logActivity({
        action: 'ai.assisted',
        entityType: 'ai-tutor',
        entityId: 'tutor-chat',
        summary: `${sName} consulted AI Study Assistant for "${topicOrAction}"`,
        metadata: details
      });
    } catch (e) {
      console.warn('[ActivityService] logAiInteraction note:', e);
    }
  },

  /**
   * Subscribes to live activity changes across tabs and local events.
   */
  subscribe: (callback) => {
    if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};
    const handler = (e) => callback(e?.detail);
    window.addEventListener(EVENT_ACTIVITY_UPDATED, handler);

    // Cross-tab storage synchronization
    const storageHandler = (e) => {
      if (
        e.key === 'learnsmart_activity_sync' ||
        e.key === 'learnsmart_submissions' ||
        e.key === 'learnsmart_educator_quizzes' ||
        e.key === 'learnsmart_shared_students'
      ) {
        callback();
      }
    };
    window.addEventListener('storage', storageHandler);

    // Cross-tab broadcast channel
    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('learnsmart_telemetry_stream');
        bc.onmessage = () => callback();
      }
    } catch {}

    return () => {
      window.removeEventListener(EVENT_ACTIVITY_UPDATED, handler);
      window.removeEventListener('storage', storageHandler);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }
};

export default activityService;
