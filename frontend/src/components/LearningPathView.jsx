import React, { useMemo, useState, useEffect } from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  LockIcon,
  PlayIcon,
  AwardIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const LearningPathView = ({
  onStartQuizByTopic,
  completedQuizIds = [],
  quizHistory = [],
  totalQuizzesTaken = null,
  subjectProgress = null,
  averageScore = null,
  quizzes: initialQuizzes = null
}) => {
  // Real-time active quizzes state from educator/admin additions
  const [activeQuizzes, setActiveQuizzes] = useState(() => {
    if (Array.isArray(initialQuizzes) && initialQuizzes.length > 0) {
      return initialQuizzes;
    }
    return sharedDatabase.getPublishedQuizzes ? sharedDatabase.getPublishedQuizzes() : [];
  });

  useEffect(() => {
    if (Array.isArray(initialQuizzes)) {
      setActiveQuizzes(initialQuizzes);
    }
  }, [initialQuizzes]);

  // Real-time synchronization when educator or admin creates, updates, or deletes quizzes
  useEffect(() => {
    const handleUpdate = () => {
      setActiveQuizzes(sharedDatabase.getPublishedQuizzes ? sharedDatabase.getPublishedQuizzes() : []);
    };

    window.addEventListener('learnsmart_quizzes_updated', handleUpdate);
    window.addEventListener('learnsmart_quiz_completed', handleUpdate);
    window.addEventListener('learnsmart_activity_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('learnsmart_quizzes_updated', handleUpdate);
      window.removeEventListener('learnsmart_quiz_completed', handleUpdate);
      window.removeEventListener('learnsmart_activity_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Determine if student has 0 attempts / reset state
  const isReset =
    totalQuizzesTaken === 0 ||
    (totalQuizzesTaken === null &&
      (!completedQuizIds || completedQuizIds.length === 0) &&
      (!quizHistory || quizHistory.length === 0));

  // Build stages strictly based on published quizzes added by educator and admin
  const roadmapStages = useMemo(() => {
    if (!activeQuizzes || activeQuizzes.length === 0) {
      return [];
    }

    return activeQuizzes.map((quiz, index) => {
      const quizId = String(quiz.id || '').trim();
      const quizTitle = String(quiz.title || '').trim();

      // Check if student has completed this specific quiz added by educator/admin
      const attempt = (quizHistory || []).find((h) => {
        const hQuizId = String(h.quizId || h.id || '').trim();
        const hTitle = String(h.title || h.quizTitle || '').trim().toLowerCase();
        return (
          (quizId && hQuizId === quizId) ||
          (quizTitle && hTitle === quizTitle.toLowerCase())
        );
      });

      const isDone =
        !isReset &&
        (Boolean(
          completedQuizIds &&
            (completedQuizIds.includes(quiz.id) ||
              (quizId && completedQuizIds.includes(quizId)) ||
              (quizTitle && completedQuizIds.some((cId) => String(cId).toLowerCase() === quizTitle.toLowerCase())))
        ) ||
          Boolean(attempt));

      let score = 0;
      if (attempt) {
        const rawScore =
          attempt.scoreValue ??
          (typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score));
        score = isNaN(rawScore) ? 100 : Math.round(rawScore);
      } else if (isDone) {
        score = 100;
      }

      const stageNumber = String(index + 1).padStart(2, '0');
      const stageStatus = isDone ? 'completed' : 'active';
      const stageCompletion = isDone ? 100 : 0;

      // Dynamic modules generated from quiz questions or curriculum focus
      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
      let modules = [];

      if (questions.length > 0) {
        const topicMap = new Map();
        questions.forEach((q, qIdx) => {
          const rawTopic =
            q.topic ||
            q.category ||
            (q.question ? (q.question.length > 40 ? `${q.question.substring(0, 40)}...` : q.question) : `Topic ${qIdx + 1}`);
          if (!topicMap.has(rawTopic)) {
            topicMap.set(rawTopic, q);
          }
        });

        const topics = Array.from(topicMap.keys()).slice(0, 3);
        modules = topics.map((topName) => ({
          name: topName,
          status: isDone ? 'done' : 'in-progress',
          score: isDone ? `${score}%` : 'Pending'
        }));
      }

      if (modules.length === 0) {
        modules = [
          {
            name: `${quiz.category || 'Curriculum'} Core Principles & Concepts`,
            status: isDone ? 'done' : 'in-progress',
            score: isDone ? `${score}%` : 'Ready'
          },
          {
            name: 'Applied Scenario Practice & Critical Analysis',
            status: isDone ? 'done' : 'in-progress',
            score: isDone ? `${Math.max(60, score - 5)}%` : 'Queued'
          },
          {
            name: `Milestone Assessment Evaluation (${questions.length || quiz.questionsCount || 5} Questions)`,
            status: isDone ? 'done' : 'in-progress',
            score: isDone ? `${score}%` : 'Pending'
          }
        ];
      }

      return {
        id: quiz.id || index + 1,
        number: stageNumber,
        label: `Stage ${index + 1}`,
        quizId: quiz.id,
        quizTitle,
        requiredStage: index > 0 ? `Stage ${index}` : null,
        title: `Stage ${index + 1}: ${quizTitle}`,
        status: stageStatus,
        completion: stageCompletion,
        score,
        description:
          quiz.description ||
          quiz.recommendationReason ||
          `Official curriculum assessment in ${quiz.category || 'General'} added by educators and administrators. Complete to earn certification.`,
        modules,
        badge: `${quizTitle} Certified 🏅`,
        difficulty: quiz.difficulty || 'Medium',
        duration: quiz.duration || '15 mins',
        questionsCount: questions.length || quiz.questionsCount || 5
      };
    });
  }, [activeQuizzes, isReset, completedQuizIds, quizHistory]);

  // Dynamic statistics calculated directly from stage statuses
  const completedStagesCount = useMemo(() => {
    return roadmapStages.filter((s) => s.status === 'completed').length;
  }, [roadmapStages]);

  const activeStage = useMemo(() => {
    return roadmapStages.find((s) => s.status === 'active') || null;
  }, [roadmapStages]);

  const remainingStagesCount = useMemo(() => {
    return roadmapStages.filter((s) => s.status !== 'completed').length;
  }, [roadmapStages]);

  // Overall curriculum completion percentage
  const totalCurriculumPct = useMemo(() => {
    if (roadmapStages.length === 0) return 0;
    return Math.round((completedStagesCount / roadmapStages.length) * 100);
  }, [roadmapStages, completedStagesCount]);

  return (
    <div className="tab-view-container learning-path-view">
      <div className="learning-path-hero">
        <div className="path-hero-text">
          <div className="path-track-pill">
            <BookOpenIcon size={14} />
            <span>Personalized Adaptive Track: Curated by Educators & Admins</span>
          </div>
          <h2 className="path-hero-heading">Your Custom Roadmap to Mastery</h2>
          <p className="path-hero-desc">
            Your curriculum dynamically reflects assessments assigned by your educators and administrators.
            Complete stage assessments to demonstrate mastery and earn certification.
          </p>
        </div>

        <div className="path-progress-summary-card">
          <div className="summary-gauge-wrapper">
            <div
              className="summary-circle-gauge"
              style={{
                background: `conic-gradient(#1A6BFF 0% ${totalCurriculumPct}%, #E2E8F0 ${totalCurriculumPct}% 100%)`
              }}
            >
              <span className="summary-pct-num">{totalCurriculumPct}%</span>
            </div>
            <span className="summary-pct-sub">Curriculum Done</span>
          </div>
          <div className="summary-details-list">
            <div className="summary-detail-row">
              <span className="dot-green" />
              <span>
                {completedStagesCount} of {roadmapStages.length} {roadmapStages.length === 1 ? 'Quiz' : 'Quizzes'} Completed
              </span>
            </div>
            <div className="summary-detail-row">
              <span className="dot-blue" />
              <span>
                {activeStage
                  ? `${activeStage.quizTitle || activeStage.label} ready to take`
                  : roadmapStages.length > 0
                  ? 'All Stages Completed (100%)'
                  : 'No Quizzes Assigned'}
              </span>
            </div>
            <div className="summary-detail-row">
              <span className="dot-gray" />
              <span>
                {remainingStagesCount > 0
                  ? `${remainingStagesCount} ${remainingStagesCount === 1 ? 'Quiz' : 'Quizzes'} Remaining`
                  : roadmapStages.length > 0
                  ? 'Curriculum Completed'
                  : 'Awaiting Educator Assignment'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="roadmap-stages-flow">
        {roadmapStages.length === 0 ? (
          <div
            className="stage-card"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1A6BFF'
              }}
            >
              <BookOpenIcon size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              No Quizzes Published Yet
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '440px', margin: 0 }}>
              Quizzes added and published by educators or administrators will automatically appear here in your personalized learning roadmap.
            </p>
          </div>
        ) : (
          roadmapStages.map((stage) => {
            const isDone = stage.status === 'completed';
            const isActive = stage.status === 'active';

            return (
              <div
                key={stage.id}
                className={`stage-card ${stage.status}`}
              >
                <div className="stage-card-indicator">
                  <div className="stage-num-badge">
                    {isDone ? (
                      <CheckCircleIcon size={20} color="#FFFFFF" />
                    ) : (
                      <span>{stage.number}</span>
                    )}
                  </div>
                  <div className="stage-connector-line" />
                </div>

                <div className="stage-card-content">
                  <div className="stage-header-row">
                    <div>
                      <div className="stage-status-tag">
                        {isDone ? (
                          <span className="tag-done">✓ Completed</span>
                        ) : (
                          <span className="tag-active">▶ Ready to Start</span>
                        )}
                      </div>
                      <h3 className="stage-card-title">{stage.title}</h3>
                      <p className="stage-card-desc">{stage.description}</p>
                    </div>

                    <div className="stage-actions-box">
                      {isDone ? (
                        <button
                          type="button"
                          className="stage-action-outline-btn"
                          onClick={() => onStartQuizByTopic && onStartQuizByTopic(stage.quizId)}
                        >
                          <span>Review Material</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="stage-action-primary-btn"
                          onClick={() => onStartQuizByTopic && onStartQuizByTopic(stage.quizId)}
                        >
                          <PlayIcon size={16} />
                          <span>Start Stage Assessment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isActive && stage.completion > 0 && (
                    <div className="stage-progress-bar-wrap">
                      <div className="stage-progress-labels">
                        <span>{stage.label} Progress</span>
                        <span>{stage.completion}%</span>
                      </div>
                      <div className="stage-progress-track">
                        <div
                          className="stage-progress-fill"
                          style={{ width: `${stage.completion}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="stage-modules-list">
                    {stage.modules.map((mod, modIdx) => (
                      <div key={modIdx} className="stage-module-item">
                        <div className="module-left">
                          <span className="module-bullet">
                            {mod.status === 'done' ? '✓' : '▶'}
                          </span>
                          <span className="module-name">{mod.name}</span>
                        </div>
                        <div className="module-right">
                          <span
                            className={`module-score-badge ${
                              mod.status === 'done'
                                ? 'mod-done'
                                : 'mod-active'
                            }`}
                          >
                            {mod.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="stage-badge-footer">
                    <AwardIcon size={16} color="#475569" />
                    <span className="stage-badge-text">Milestone Reward: {stage.badge}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
