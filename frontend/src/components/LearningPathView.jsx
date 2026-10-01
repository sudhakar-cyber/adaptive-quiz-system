import React from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  LockIcon,
  StarIcon,
  PlayIcon,
  AwardIcon,
  TrophyIcon
} from './Icons';

export const LearningPathView = ({ onStartQuizByTopic }) => {
  const roadmapStages = [
    {
      id: 1,
      number: '01',
      title: 'Stage 1: Programming Foundations',
      status: 'completed',
      completion: 100,
      description: 'Core concepts in Python, procedural logic, control flows, and object-oriented modeling.',
      modules: [
        { name: 'Python Syntax, Variables & Operators', status: 'done', score: '95%' },
        { name: 'Functions, Scopes & Error Handling', status: 'done', score: '88%' },
        { name: 'Object-Oriented Programming (Classes & Inheritance)', status: 'done', score: '92%' }
      ],
      badge: 'Foundations Certified 🏅'
    },
    {
      id: 2,
      number: '02',
      title: 'Stage 2: Data Structures & Algorithms',
      status: 'active',
      completion: 75,
      description: 'Master linear and non-linear memory layouts, algorithmic complexity, sorting, and graph theory.',
      modules: [
        { name: 'Linear Data Structures (Arrays, Linked Lists, Stacks, Queues)', status: 'done', score: '84%' },
        { name: 'Sorting & Binary Search Algorithms', status: 'done', score: '80%' },
        { name: 'Trees, Binary Search Trees & Heaps', status: 'in-progress', score: 'Current' },
        { name: 'Dynamic Programming & Memoization', status: 'upcoming', score: 'Next' }
      ],
      badge: 'In Progress (Stage Milestone Test Ready)'
    },
    {
      id: 3,
      number: '03',
      title: 'Stage 3: Cyber Security & Web Defense',
      status: 'upcoming',
      completion: 20,
      description: 'Web vulnerability analysis, OWASP Top 10 defenses, HTTPS/TLS, and secure token authentication.',
      modules: [
        { name: 'Network Protocols & HTTPS Handshakes', status: 'done', score: '78%' },
        { name: 'OWASP Top 10 (SQLi, XSS, CSRF)', status: 'upcoming', score: 'Locked' },
        { name: 'Authentication, Password Hashing & JWT', status: 'upcoming', score: 'Locked' }
      ],
      badge: 'Security Sentinel'
    },
    {
      id: 4,
      number: '04',
      title: 'Stage 4: Advanced Systems & Cloud Architecture',
      status: 'locked',
      completion: 0,
      description: 'Microservices, distributed database indexing, caching strategies, and scalability design.',
      modules: [
        { name: 'Distributed Caching & Redis Patterns', status: 'locked', score: 'Locked' },
        { name: 'Database Sharding & Query Optimization', status: 'locked', score: 'Locked' },
        { name: 'Capstone System Design Assessment', status: 'locked', score: 'Locked' }
      ],
      badge: 'Master Architect 🏆'
    }
  ];

  return (
    <div className="tab-view-container learning-path-view">
      <div className="learning-path-hero">
        <div className="path-hero-text">
          <div className="path-track-pill">
            <BookOpenIcon size={14} />
            <span>Personalized Adaptive Track: Computer Science & Software Engineering</span>
          </div>
          <h2 className="path-hero-heading">Your Custom Roadmap to Mastery</h2>
          <p className="path-hero-desc">
            Your curriculum automatically adapts based on your quiz strengths and weaknesses.
            Complete stage assessments to unlock advanced topics and industry-recognized certificates.
          </p>
        </div>

        <div className="path-progress-summary-card">
          <div className="summary-circle-gauge">
            <span className="summary-pct-num">65%</span>
            <span className="summary-pct-sub">Curriculum Done</span>
          </div>
          <div className="summary-details-list">
            <div className="summary-detail-row">
              <span className="dot-green" />
              <span>1 Stage Completed</span>
            </div>
            <div className="summary-detail-row">
              <span className="dot-blue" />
              <span>Stage 2 in progress (75%)</span>
            </div>
            <div className="summary-detail-row">
              <span className="dot-gray" />
              <span>2 Stages Remaining</span>
            </div>
          </div>
        </div>
      </div>

      <div className="roadmap-stages-flow">
        {roadmapStages.map((stage) => {
          const isDone = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isLocked = stage.status === 'locked';

          return (
            <div
              key={stage.id}
              className={`stage-card ${stage.status}`}
            >
              <div className="stage-card-indicator">
                <div className="stage-num-badge">
                  {isDone ? (
                    <CheckCircleIcon size={20} color="#FFFFFF" />
                  ) : isLocked ? (
                    <LockIcon size={18} color="#94A3B8" />
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
                      {isDone && <span className="tag-done">✓ Completed</span>}
                      {isActive && <span className="tag-active">▶ Current Learning Stage</span>}
                      {stage.status === 'upcoming' && <span className="tag-upcoming">⏳ Up Next</span>}
                      {isLocked && <span className="tag-locked">🔒 Locked</span>}
                    </div>
                    <h3 className="stage-card-title">{stage.title}</h3>
                    <p className="stage-card-desc">{stage.description}</p>
                  </div>

                  <div className="stage-actions-box">
                    {isActive ? (
                      <button
                        type="button"
                        className="stage-action-primary-btn"
                        onClick={() => onStartQuizByTopic && onStartQuizByTopic('dsa')}
                      >
                        <PlayIcon size={16} />
                        <span>Resume Current Topic</span>
                      </button>
                    ) : isDone ? (
                      <button
                        type="button"
                        className="stage-action-outline-btn"
                        onClick={() => onStartQuizByTopic && onStartQuizByTopic('python-basics')}
                      >
                        <span>Review Material</span>
                      </button>
                    ) : (
                      <button type="button" className="stage-action-disabled-btn" disabled>
                        <span>Requires Stage 2</span>
                      </button>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="stage-progress-bar-wrap">
                    <div className="stage-progress-labels">
                      <span>Stage 2 Progress</span>
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
                          {mod.status === 'done' ? '✓' : mod.status === 'in-progress' ? '▶' : '•'}
                        </span>
                        <span className="module-name">{mod.name}</span>
                      </div>
                      <div className="module-right">
                        <span
                          className={`module-score-badge ${
                            mod.status === 'done'
                              ? 'mod-done'
                              : mod.status === 'in-progress'
                              ? 'mod-active'
                              : 'mod-lock'
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
        })}
      </div>
    </div>
  );
};
