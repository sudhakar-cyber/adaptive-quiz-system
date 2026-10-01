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
  AwardIcon
} from './Icons';
import { QUIZ_CATALOG, INITIAL_NOTIFICATIONS, INITIAL_HISTORY } from '../data/quizData';
import { QuizModal } from './QuizModal';
import { TakeQuizView } from './TakeQuizView';
import { ProgressView } from './ProgressView';
import { LearningPathView } from './LearningPathView';
import { NotificationsView, NotificationsDropdown } from './NotificationsView';
import { ProfileView, ProfileDropdownMenu } from './ProfileView';

export const Dashboard = ({ username = 'Shaik Aathif', onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredSubject, setHoveredSubject] = useState(null);
  const [performanceTimeframe, setPerformanceTimeframe] = useState('week');

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [activeQuizModal, setActiveQuizModal] = useState(null);

  const [currentUsername, setCurrentUsername] = useState(username || 'Shaik Aathif');
  const [profileImage, setProfileImage] = useState(() => {
    try {
      return localStorage.getItem('learnsmart_avatar') || null;
    } catch {
      return null;
    }
  });
  const [totalQuizzesTaken, setTotalQuizzesTaken] = useState(18);
  const [averageScore, setAverageScore] = useState(85.4);
  const [streakDays, setStreakDays] = useState(7);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [quizHistory, setQuizHistory] = useState(INITIAL_HISTORY);

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

  const displayName = (() => {
    if (!currentUsername || currentUsername.trim() === '') return 'Shaik Aathif';
    let name = currentUsername.split('@')[0];
    return name
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  })();

  const userInitials = (() => {
    if (!displayName) return 'SA';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  const weekPerformanceData = [
    { day: 'Mon', score: 32, avg: 22 },
    { day: 'Tue', score: 45, avg: 28 },
    { day: 'Wed', score: 54, avg: 35 },
    { day: 'Thu', score: 58, avg: 42 },
    { day: 'Fri', score: 68, avg: 50 },
    { day: 'Sat', score: 76, avg: 58 },
    { day: 'Sun', score: 86, avg: 64 }
  ];

  const monthPerformanceData = [
    { day: 'W1', score: 62, avg: 48 },
    { day: 'W2', score: 71, avg: 55 },
    { day: 'W3', score: 80, avg: 61 },
    { day: 'W4', score: 88, avg: 68 }
  ];

  const activePerformanceData =
    performanceTimeframe === 'week' ? weekPerformanceData : monthPerformanceData;

  const subjectProgress = [
    { name: 'Mathematics', score: 90, color: '#00C48C', pct: 0.28 },
    { name: 'Data Structures', score: 82, color: '#00D2D3', pct: 0.24 },
    { name: 'Python', score: 76, color: '#FFB900', pct: 0.20 },
    { name: 'Web Security', score: 68, color: '#FF7675', pct: 0.16 },
    { name: 'Others', score: 60, color: '#6C5CE7', pct: 0.12 }
  ];

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

  const avgPathPoints = activePerformanceData
    .map((d, i) => `${getX(i)},${getY(d.avg)}`)
    .join(' L ');

  const donutR = 54;
  const donutStroke = 18;
  const donutC = 2 * Math.PI * donutR;

  let runningPct = 0;
  const donutSegmentsWithOffsets = subjectProgress.map((seg) => {
    const currentOffset = -runningPct * donutC;
    runningPct += seg.pct;
    return {
      ...seg,
      dashArray: `${seg.pct * donutC} ${donutC}`,
      dashOffset: currentOffset
    };
  });

  const recommendedQuizzesList = QUIZ_CATALOG.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      q.category.toLowerCase().includes(query) ||
      q.difficulty.toLowerCase().includes(query)
    );
  }).slice(0, 3);

  const handleQuizCompleted = ({ quizTitle, category, score }) => {
    setTotalQuizzesTaken((prev) => prev + 1);

    setAverageScore((prev) => {
      const newAvg = (prev * totalQuizzesTaken + score) / (totalQuizzesTaken + 1);
      return Math.round(newAvg * 10) / 10;
    });

    const newHistoryItem = {
      id: Date.now(),
      title: quizTitle,
      category,
      score,
      status: score >= 80 ? 'Mastered' : score >= 70 ? 'Passed' : 'Needs Review',
      date: 'Just now'
    };
    setQuizHistory((prev) => [newHistoryItem, ...prev]);

    const newNotif = {
      id: Date.now(),
      title: `Quiz Completed: ${quizTitle}`,
      message: `You scored ${score}%! Your dashboard stats and mastery level have been updated.`,
      category: 'quiz',
      timestamp: 'Just now',
      unread: true
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`🎉 Quiz Finished! You scored ${score}%`);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const handleDismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleStartQuiz = (quiz) => {
    setActiveQuizModal(quiz);
  };

  const handleStartQuizByIdOrTitle = (identifier) => {
    const found =
      QUIZ_CATALOG.find((q) => q.id === identifier || q.title.toLowerCase() === identifier.toLowerCase()) ||
      QUIZ_CATALOG[0];
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
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="student-avatar-img" />
                ) : (
                  userInitials
                )}
              </div>
              <div className="user-meta">
                <span className="user-name">{displayName}</span>
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
                userInitials={userInitials}
                profileImage={profileImage}
                onClose={() => setShowProfileDropdown(false)}
                onNavigate={(tab) => setActiveTab(tab)}
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
                setActiveTab('take-quiz');
                showToast('Viewing All Recommended Quizzes');
              }}
            >
              <PlayIcon size={18} />
              <span>Recommended Quizzes</span>
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

        <main className="dashboard-content">
          {activeTab === 'dashboard' && (
            <>
              <section className="dashboard-greeting-banner">
                <div className="greeting-text-wrap">
                  <h1 className="greeting-title">Hello, {displayName}! 👋</h1>
                  <p className="greeting-subtext">Keep learning, you're doing great!</p>
                </div>
                <div className="greeting-cta-wrap">
                  <button
                    type="button"
                    className="greeting-quick-quiz-btn"
                    onClick={() => handleStartQuiz(QUIZ_CATALOG[0])}
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
                        <span>12% from last month</span>
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
                      <div className="stat-value">{averageScore}%</div>
                      <div className="stat-trend trend-green">
                        <TrendingUpIcon size={12} color="#10B981" />
                        <span>8% from last month</span>
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
                      <div className="stat-streak-msg">Keep it up! 🔥</div>
                    </div>
                  </div>
                </div>

                <div className="dash-stat-card card-purple-tint">
                  <div className="stat-card-inner">
                    <div className="stat-icon-wrapper stat-icon-purple">
                      <ListIcon size={24} color="#8B5CF6" />
                    </div>
                    <div className="stat-details">
                      <span className="stat-title">Recommended Quizzes</span>
                      <div className="stat-value">{QUIZ_CATALOG.length}</div>
                      <button
                        type="button"
                        className="stat-action-link"
                        onClick={() => setActiveTab('take-quiz')}
                      >
                        View All →
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
                          onClick={() => setPerformanceTimeframe('week')}
                        >
                          Week
                        </button>
                        <button
                          type="button"
                          className={`time-pill ${performanceTimeframe === 'month' ? 'active' : ''}`}
                          onClick={() => setPerformanceTimeframe('month')}
                        >
                          Month
                        </button>
                      </div>
                    </div>

                    <div className="performance-header-meta-row">
                      <span className="panel-subtitle-stat">Peak: 86% • Avg: 64%</span>
                      <div className="chart-legend">
                        <span className="legend-item">
                          <span className="legend-line line-solid" />
                          <span>Score</span>
                        </span>
                        <span className="legend-item">
                          <span className="legend-line line-dashed" />
                          <span>Avg</span>
                        </span>
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

                      <path
                        d={`M ${avgPathPoints}`}
                        fill="none"
                        stroke="#00D2D3"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                      />

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

                    {hoveredPoint !== null && (
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
                        <div className="tooltip-avg">
                          Class Avg: {activePerformanceData[hoveredPoint].avg}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dash-panel-card progress-panel">
                  <div className="panel-header">
                    <h2 className="panel-title">Subject-wise Progress</h2>
                    <span className="panel-badge-green">5 Subjects</span>
                  </div>

                  <div className="donut-content-row">
                    <div className="donut-chart-container">
                      <svg
                        viewBox="0 0 160 160"
                        className="donut-svg"
                      >
                        <g transform="rotate(-90 80 80)">
                          {donutSegmentsWithOffsets.map((seg, idx) => {
                            const isHovered =
                              hoveredSubject && hoveredSubject.name === seg.name;
                            return (
                              <circle
                                key={idx}
                                cx="80"
                                cy="80"
                                r={donutR}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={isHovered ? donutStroke + 3 : donutStroke}
                                strokeDasharray={seg.dashArray}
                                strokeDashoffset={seg.dashOffset}
                                strokeLinecap="butt"
                                style={{
                                  cursor: 'pointer',
                                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                                  opacity: hoveredSubject && !isHovered ? 0.45 : 1
                                }}
                                onMouseEnter={() => setHoveredSubject(seg)}
                                onMouseLeave={() => setHoveredSubject(null)}
                              />
                            );
                          })}
                        </g>
                      </svg>
                      <div className="donut-center-text">
                        <span className="donut-percentage">
                          {hoveredSubject ? `${hoveredSubject.score}%` : '78%'}
                        </span>
                        <span className="donut-sublabel">
                          {hoveredSubject ? hoveredSubject.name : 'Overall Progress'}
                        </span>
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
                    </div>
                  </div>
                </div>

                <div className="dash-panel-card quizzes-panel">
                  <div className="panel-header">
                    <h2 className="panel-title">Recommended Quizzes</h2>
                    <button
                      type="button"
                      className="panel-view-all-link"
                      onClick={() => setActiveTab('take-quiz')}
                    >
                      View All ({QUIZ_CATALOG.length}) →
                    </button>
                  </div>

                  <div className="recommended-quizzes-list">
                    {recommendedQuizzesList.map((quiz) => (
                      <div key={quiz.id} className="quiz-card-row">
                        <div className="quiz-icon-box">
                          {quiz.category === 'Programming' && <PythonIcon size={20} />}
                          {quiz.category === 'Cyber Security' && (
                            <ShieldIcon size={20} color="#8B5CF6" />
                          )}
                          {quiz.category === 'DSA' && <CodeIcon size={20} color="#1D68F2" />}
                          {quiz.category === 'Mathematics' && (
                            <TargetIcon size={20} color="#F59E0B" />
                          )}
                        </div>

                        <div className="quiz-info-col">
                          <h3 className="quiz-item-title">{quiz.title}</h3>
                          <div className="quiz-meta-badges">
                            <span
                              className="quiz-badge"
                              style={{
                                backgroundColor: quiz.categoryBg,
                                color: quiz.categoryColor
                              }}
                            >
                              {quiz.category}
                            </span>
                            <span
                              className="quiz-badge"
                              style={{
                                backgroundColor: quiz.diffBg,
                                color: quiz.diffColor
                              }}
                            >
                              {quiz.difficulty}
                            </span>
                            <span className="quiz-questions-count">
                              {quiz.questionsLabel || `${quiz.questions.length} Questions`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="start-quiz-btn"
                          onClick={() => handleStartQuiz(quiz)}
                          title={`Start ${quiz.title}`}
                        >
                          <span>Start Quiz</span>
                          <span>→</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {(activeTab === 'take-quiz' || activeTab === 'recommended') && (
            <TakeQuizView
              quizzes={QUIZ_CATALOG}
              onStartQuiz={handleStartQuiz}
              externalSearch={searchQuery}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressView
              quizzesTaken={totalQuizzesTaken}
              avgScore={`${averageScore}%`}
              streakDays={streakDays}
              quizHistory={quizHistory}
              onRetakeQuiz={handleStartQuizByIdOrTitle}
            />
          )}

          {activeTab === 'learning-path' && (
            <LearningPathView
              onStartQuizByTopic={(topic) => handleStartQuizByIdOrTitle(topic)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAllAsRead={handleMarkAllRead}
              onDismissNotification={handleDismissNotification}
              onNotificationAction={(n) => {
                if (n.category === 'quiz') setActiveTab('take-quiz');
                else if (n.category === 'streak') setActiveTab('progress');
                else if (n.category === 'milestone') setActiveTab('learning-path');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              displayName={displayName}
              userInitials={userInitials}
              profileImage={profileImage}
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
        </main>
      </div>

      {activeQuizModal && (
        <QuizModal
          quiz={activeQuizModal}
          onClose={() => setActiveQuizModal(null)}
          onComplete={handleQuizCompleted}
        />
      )}
    </div>
  );
};
