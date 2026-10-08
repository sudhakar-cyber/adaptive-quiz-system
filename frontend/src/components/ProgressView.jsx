import React, { useState, useMemo } from 'react';
import {
  StarIcon,
  FlameIcon,
  TargetIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  AwardIcon,
  RotateCcwIcon,
  XIcon,
  SparklesIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const ProgressView = ({
  quizzesTaken = 18,
  avgScore = '85.4%',
  streakDays = 7,
  quizHistory = [],
  subjectProgress = null,
  onRetakeQuiz,
  onStartQuiz
}) => {
  const [showPercentileModal, setShowPercentileModal] = useState(false);
  const isReset = quizzesTaken === 0;

  const getMastery = (score) => {
    if (score === 0) return 'Not Started';
    if (score >= 85) return 'Mastered';
    if (score >= 75) return 'Proficient';
    if (score >= 60) return 'Intermediate';
    return 'Developing';
  };

  const subjectBreakdown = subjectProgress
    ? subjectProgress.map((subj) => {
        const totalTopics =
          subj.name.includes('Math') || subj.name.includes('Data')
            ? 15
            : subj.name.includes('Python')
            ? 12
            : subj.name.includes('Security')
            ? 10
            : 8;
        const completedTopics =
          isReset || subj.score === 0
            ? 0
            : Math.min(totalTopics, Math.max(1, Math.round((subj.score / 100) * totalTopics)));
        const fullName =
          subj.name === 'Data Structures'
            ? 'Data Structures & Algorithms'
            : subj.name === 'Python'
            ? 'Python Programming'
            : subj.name === 'Others'
            ? 'Others (Cloud & OS)'
            : subj.name;

        return {
          name: fullName,
          score: isReset ? 0 : subj.score,
          color: subj.color,
          mastery: isReset || subj.score === 0 ? 'Not Started' : getMastery(subj.score),
          topicsCompleted: `${completedTopics} / ${totalTopics} Topics`,
          bgLight: subj.bgLight || '#F8FAFC'
        };
      })
    : [
        {
          name: 'Mathematics',
          score: isReset ? 0 : 90,
          color: '#00C48C',
          mastery: isReset ? 'Not Started' : 'Mastered',
          topicsCompleted: isReset ? '0 / 15 Topics' : '14 / 15 Topics',
          bgLight: '#E6FAF0'
        },
        {
          name: 'Data Structures & Algorithms',
          score: isReset ? 0 : 82,
          color: '#00D2D3',
          mastery: isReset ? 'Not Started' : 'Proficient',
          topicsCompleted: isReset ? '0 / 15 Topics' : '12 / 15 Topics',
          bgLight: '#E0FAFA'
        },
        {
          name: 'Python Programming',
          score: isReset ? 0 : 76,
          color: '#FFB900',
          mastery: isReset ? 'Not Started' : 'Intermediate',
          topicsCompleted: isReset ? '0 / 12 Topics' : '9 / 12 Topics',
          bgLight: '#FFF8E6'
        },
        {
          name: 'Web Security',
          score: isReset ? 0 : 68,
          color: '#FF7675',
          mastery: isReset ? 'Not Started' : 'Developing',
          topicsCompleted: isReset ? '0 / 10 Topics' : '6 / 10 Topics',
          bgLight: '#FFF0F0'
        },
        {
          name: 'Others (Cloud & OS)',
          score: isReset ? 0 : 60,
          color: '#6C5CE7',
          mastery: isReset ? 'Not Started' : 'Foundational',
          topicsCompleted: isReset ? '0 / 8 Topics' : '5 / 8 Topics',
          bgLight: '#F3E8FF'
        }
      ];

  const numericAvg = useMemo(() => {
    if (typeof avgScore === 'number') return isNaN(avgScore) ? 0 : avgScore;
    if (!avgScore) return 0;
    const cleaned = String(avgScore).replace('%', '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, [avgScore]);

  const percentileData = useMemo(() => {
    if (isReset || numericAvg === 0) {
      return {
        isRanked: false,
        percentile: 0,
        percentileDisplay: 'Unranked',
        topPercent: 0,
        topPercentDisplay: 'Unranked',
        rank: null,
        rankDisplay: 'Unranked',
        cohortSize: 85,
        cohortMedian: 72.0,
        tier: 'Unranked',
        tierBadgeColor: '#64748B',
        tierBadgeBg: '#F1F5F9',
        scoreDiff: 0,
        subjectStandings: subjectBreakdown.map((s) => ({
          name: s.name,
          score: s.score || 0,
          color: s.color,
          percentile: 0,
          tier: 'Not Started'
        }))
      };
    }

    // Cohort benchmark distribution: Mean = 72.0%, Standard Deviation = 11.5%
    const mean = 72.0;
    const std = 11.5;
    const z = (numericAvg - mean) / std;

    // Cumulative normal distribution CDF approximation (Abramowitz & Stegun)
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2.0);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const cdf = z > 0 ? 1.0 - p : p;

    const percentile = Math.min(99, Math.max(1, Math.round(cdf * 100)));
    const topPercent = Math.max(1, 100 - percentile);

    // Dynamic cohort size from shared database or standard cohort of 85
    let cohortTotal = 85;
    try {
      const students = sharedDatabase.getStudents();
      if (students && students.length > 5) {
        cohortTotal = Math.max(85, students.length);
      }
    } catch {}

    const rank = Math.max(1, Math.min(cohortTotal, Math.round(((100 - percentile) / 100) * cohortTotal) || 1));

    let tier = 'Developing';
    let tierBadgeColor = '#EA580C';
    let tierBadgeBg = '#FFF2E6';

    if (percentile >= 90) {
      tier = 'Elite / Top Tier';
      tierBadgeColor = '#7C3AED';
      tierBadgeBg = '#F3E8FF';
    } else if (percentile >= 75) {
      tier = 'Advanced';
      tierBadgeColor = '#2563EB';
      tierBadgeBg = '#EFF6FF';
    } else if (percentile >= 50) {
      tier = 'Proficient';
      tierBadgeColor = '#059669';
      tierBadgeBg = '#ECFDF5';
    } else if (percentile >= 30) {
      tier = 'Intermediate';
      tierBadgeColor = '#D97706';
      tierBadgeBg = '#FEF3C7';
    }

    const percentileDisplay = percentile >= 80 ? `Top ${topPercent}%` : `${percentile}th %ile`;

    // Compute subject standings relative to cohort benchmark
    const subjectStandings = subjectBreakdown.map((s) => {
      const sScore = s.score || 0;
      if (sScore === 0) {
        return {
          name: s.name,
          score: 0,
          color: s.color,
          percentile: 0,
          tier: 'Not Attempted'
        };
      }
      const subZ = (sScore - mean) / std;
      const subT = 1.0 / (1.0 + 0.2316419 * Math.abs(subZ));
      const subD = 0.3989423 * Math.exp(-subZ * subZ / 2.0);
      const subP = subD * subT * (0.3193815 + subT * (-0.3565638 + subT * (1.781478 + subT * (-1.821256 + subT * 1.330274))));
      const subCdf = subZ > 0 ? 1.0 - subP : subP;
      const subPct = Math.min(99, Math.max(1, Math.round(subCdf * 100)));
      let subTier = 'Developing';
      if (subPct >= 90) subTier = 'Elite (Top 10%)';
      else if (subPct >= 75) subTier = 'Advanced';
      else if (subPct >= 50) subTier = 'Proficient';
      else if (subPct >= 30) subTier = 'Intermediate';

      return {
        name: s.name,
        score: sScore,
        color: s.color,
        percentile: subPct,
        tier: subTier
      };
    });

    return {
      isRanked: true,
      percentile,
      percentileDisplay,
      topPercent,
      topPercentDisplay: `Top ${topPercent}%`,
      rank,
      rankDisplay: `Rank #${rank} in cohort`,
      cohortSize: cohortTotal,
      cohortMedian: mean,
      scoreDiff: +(numericAvg - mean).toFixed(1),
      tier,
      tierBadgeColor,
      tierBadgeBg,
      subjectStandings
    };
  }, [isReset, numericAvg, subjectBreakdown]);

  return (
    <div className="tab-view-container progress-view">
      <div className="tab-view-header">
        <div>
          <h2 className="tab-page-title">My Learning Progress & Analytics</h2>
          <p className="tab-page-subtitle">
            Comprehensive real-time tracking of your quiz performance, subject mastery, and history.
          </p>
        </div>
      </div>

      <div className="progress-kpi-grid">
        <div className="kpi-card card-kpi-blue">
          <div className="kpi-icon-wrap bg-blue-light">
            <TargetIcon size={24} color="#1D68F2" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Quizzes Completed</span>
            <span className="kpi-value">{quizzesTaken}</span>
            <span className="kpi-trend trend-up">
              <TrendingUpIcon size={12} color="#10B981" />
              <span>+3 this week</span>
            </span>
          </div>
        </div>

        <div className="kpi-card card-kpi-green">
          <div className="kpi-icon-wrap bg-green-light">
            <StarIcon size={24} color="#10B981" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Average Score</span>
            <span className="kpi-value">{avgScore}</span>
            <span className="kpi-trend trend-up">
              <TrendingUpIcon size={12} color="#10B981" />
              <span>+5.2% vs last month</span>
            </span>
          </div>
        </div>

        <div className="kpi-card card-kpi-orange">
          <div className="kpi-icon-wrap bg-orange-light">
            <FlameIcon size={24} color="#F97316" />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Current Streak</span>
            <span className="kpi-value">{streakDays} Days</span>
            <span className="kpi-subtext text-orange">Best streak: 12 days</span>
          </div>
        </div>

        <div
          className="kpi-card card-kpi-purple interactive-kpi-card"
          onClick={() => setShowPercentileModal(true)}
          role="button"
          tabIndex={0}
          title="Click to view detailed Global Percentile & Cohort Analytics"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowPercentileModal(true);
            }
          }}
        >
          <div className="kpi-icon-wrap bg-purple-light">
            <AwardIcon size={24} color="#8B5CF6" />
          </div>
          <div className="kpi-data">
            <div className="kpi-label-row">
              <span className="kpi-label">Global Percentile</span>
              <span className="kpi-click-pill">Details ↗</span>
            </div>
            <span className="kpi-value">
              {percentileData.isRanked ? percentileData.percentileDisplay : 'Unranked'}
            </span>
            <span className="kpi-subtext text-purple">
              {percentileData.isRanked
                ? `Rank #${percentileData.rank} in cohort`
                : 'Take a quiz to rank'}
            </span>
          </div>
        </div>
      </div>

      <div className="progress-details-grid">
        <div className="progress-section-card">
          <div className="section-card-header">
            <h3 className="section-card-title">Subject Mastery Breakdown</h3>
            <span className="section-badge-info">5 Active Subjects</span>
          </div>

          <div className="subject-progress-bars-list">
            {subjectBreakdown.map((subj) => (
              <div key={subj.name} className="subject-bar-item">
                <div className="subject-bar-header">
                  <div className="subject-name-group">
                    <span
                      className="subject-bar-dot"
                      style={{ backgroundColor: subj.color }}
                    />
                    <span className="subject-bar-title">{subj.name}</span>
                    <span
                      className="mastery-pill"
                      style={{ backgroundColor: subj.bgLight, color: subj.color }}
                    >
                      {subj.mastery}
                    </span>
                  </div>
                  <div className="subject-bar-score-group">
                    <span className="topics-count-text">{subj.topicsCompleted}</span>
                    <span className="subject-score-percent">{subj.score}%</span>
                  </div>
                </div>

                <div className="subject-progress-track">
                  <div
                    className="subject-progress-fill"
                    style={{
                      width: `${subj.score}%`,
                      backgroundColor: subj.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-section-card strengths-card">
          <div className="section-card-header">
            <h3 className="section-card-title">AI Performance Insights</h3>
          </div>

          <div className="insights-container">
            {isReset ? (
              <div className="insight-block insight-positive" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="insight-badge-pill" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                  <TargetIcon size={14} color="#1D4ED8" />
                  <span>Adaptive Diagnostic Ready</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                  Take quizzes in Mathematics, Python, Data Structures, or Web Security to unlock personalized AI diagnostic insights on your strengths and focus areas.
                </p>
              </div>
            ) : (
              <>
                <div className="insight-block insight-positive">
                  <div className="insight-badge-pill badge-green">
                    <CheckCircleIcon size={14} color="#059669" />
                    <span>Strongest Areas</span>
                  </div>
                  <ul className="insight-bullets">
                    {(() => {
                      const sorted = [...subjectBreakdown].filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
                      const top = sorted.slice(0, 2);
                      if (top.length === 0) {
                        return <li><strong>Getting Started:</strong> Practice core modules to build strength metrics.</li>;
                      }
                      return top.map((s) => (
                        <li key={s.name}>
                          <strong>{s.name}:</strong> {s.score}% mastery rate with solid accuracy.
                        </li>
                      ));
                    })()}
                  </ul>
                </div>

                <div className="insight-block insight-warning">
                  <div className="insight-badge-pill badge-amber">
                    <TargetIcon size={14} color="#D97706" />
                    <span>Recommended Focus Areas</span>
                  </div>
                  <ul className="insight-bullets">
                    {(() => {
                      const sorted = [...subjectBreakdown].sort((a, b) => a.score - b.score);
                      const bottom = sorted.slice(0, 2);
                      return bottom.map((s) => (
                        <li key={s.name}>
                          <strong>{s.name}:</strong> {s.score > 0 ? `Target ${s.score}% area to improve overall mastery.` : 'Not yet attempted. Take a quiz to assess skill level.'}
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </>
            )}

            <div className="weekly-goal-box">
              <div className="goal-text-row">
                <span className="goal-title">Weekly Goal: 4 Quizzes</span>
                <span className="goal-stat">{isReset ? '0 of 4 Done' : '3 of 4 Done'}</span>
              </div>
              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: isReset ? '0%' : '75%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-section-card history-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Recent Quiz Activity History</h3>
          <span className="section-badge-info">Last 4 Quizzes</span>
        </div>

        <div className="history-table-wrapper">
          <table className="quiz-history-table">
            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Category</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date Taken</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {quizHistory.length > 0 ? (
                quizHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold text-dark">{item.title}</td>
                    <td>
                      <span className="category-tag">{item.category}</span>
                    </td>
                    <td>
                      <span className="score-cell-badge">{item.score}%</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          item.score >= 80
                            ? 'status-mastered'
                            : item.score >= 70
                            ? 'status-passed'
                            : 'status-review'
                        }`}
                      >
                        {item.score >= 80 ? 'Mastered' : item.score >= 70 ? 'Passed' : 'Needs Review'}
                      </span>
                    </td>
                    <td className="text-muted">{item.date}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="retake-table-btn"
                        onClick={() => onRetakeQuiz && onRetakeQuiz(item.title)}
                      >
                        <RotateCcwIcon size={13} />
                        <span>Retake</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No recent quizzes found. Take a quiz to view your history!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Percentile & Cohort Analytics Modal */}
      {showPercentileModal && (
        <div
          className="percentile-modal-backdrop"
          onClick={() => setShowPercentileModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="percentile-modal-title"
        >
          <div
            className="percentile-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="percentile-modal-header">
              <div className="percentile-header-title-group">
                <div className="percentile-header-icon-wrap">
                  <AwardIcon size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 id="percentile-modal-title" className="percentile-modal-title">
                    Global Percentile & Cohort Standing
                  </h3>
                  <p className="percentile-modal-subtitle">
                    Comparative benchmark across {percentileData.cohortSize} active platform learners
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="percentile-modal-close-btn"
                onClick={() => setShowPercentileModal(false)}
                aria-label="Close dialog"
              >
                <XIcon size={18} color="#64748B" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="percentile-modal-body">
              {/* Hero Banner */}
              <div className="percentile-hero-banner">
                <div className="percentile-hero-left">
                  <span
                    className="percentile-tier-pill"
                    style={{
                      color: percentileData.tierBadgeColor,
                      backgroundColor: percentileData.tierBadgeBg
                    }}
                  >
                    {percentileData.tier}
                  </span>
                  <div className="percentile-hero-main-stat">
                    {percentileData.isRanked ? percentileData.percentileDisplay : 'Unranked'}
                  </div>
                  <p className="percentile-hero-desc">
                    {percentileData.isRanked ? (
                      <>
                        You scored higher than <strong>{percentileData.percentile}%</strong> of all learners in your cohort with an average of <strong>{numericAvg.toFixed(1)}%</strong>.
                      </>
                    ) : (
                      'You have not completed any quizzes yet. Take your first quiz to calculate your percentile and cohort rank.'
                    )}
                  </p>
                </div>

                <div className="percentile-hero-right">
                  <div className="cohort-rank-badge-box">
                    <span className="cohort-rank-label">Cohort Standing</span>
                    <span className="cohort-rank-value">
                      {percentileData.isRanked ? `#${percentileData.rank}` : '—'}
                      <span className="cohort-rank-total"> / {percentileData.cohortSize}</span>
                    </span>
                    {percentileData.isRanked && (
                      <span
                        className={`cohort-diff-tag ${
                          percentileData.scoreDiff >= 0 ? 'diff-positive' : 'diff-negative'
                        }`}
                      >
                        <TrendingUpIcon size={12} color={percentileData.scoreDiff >= 0 ? '#10B981' : '#EF4444'} />
                        <span>
                          {percentileData.scoreDiff >= 0 ? `+${percentileData.scoreDiff}%` : `${percentileData.scoreDiff}%`} vs median
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Percentile Distribution Scale */}
              <div className="percentile-distribution-section">
                <div className="distribution-header-row">
                  <span className="distribution-title">Cohort Distribution Scale</span>
                  <span className="distribution-hint">
                    {percentileData.isRanked
                      ? `Your Position: ${percentileData.percentile}th Percentile`
                      : 'Complete a quiz to place on scale'}
                  </span>
                </div>

                <div className="percentile-distribution-bar-wrapper">
                  <div className="percentile-distribution-bar">
                    <div className="dist-segment dist-segment-foundational">
                      <span>0–49% Foundational</span>
                    </div>
                    <div className="dist-segment dist-segment-proficient">
                      <span>50–74% Proficient</span>
                    </div>
                    <div className="dist-segment dist-segment-advanced">
                      <span>75–89% Advanced</span>
                    </div>
                    <div className="dist-segment dist-segment-elite">
                      <span>90–100% Top Tier</span>
                    </div>
                  </div>

                  {/* Marker Pin */}
                  {percentileData.isRanked && (
                    <div
                      className="percentile-marker-pin"
                      style={{
                        left: `${Math.min(96, Math.max(4, percentileData.percentile))}%`
                      }}
                    >
                      <div className="marker-tooltip">
                        <span>You ({percentileData.percentile}th %ile)</span>
                      </div>
                      <div className="marker-arrow" />
                      <div className="marker-dot" />
                    </div>
                  )}
                </div>

                <div className="distribution-scale-labels">
                  <span>0%ile (Min)</span>
                  <span>25%ile</span>
                  <span className="label-median">50%ile (Median)</span>
                  <span>75%ile</span>
                  <span className="label-top">90%ile (Elite)</span>
                  <span>100%ile</span>
                </div>
              </div>

              {/* Key Cohort Benchmark Stats */}
              <div className="percentile-stats-grid">
                <div className="pct-stat-card">
                  <span className="pct-stat-title">Your Average</span>
                  <span className="pct-stat-val text-primary-stat">{numericAvg.toFixed(1)}%</span>
                  <span className="pct-stat-note">Across all attempts</span>
                </div>
                <div className="pct-stat-card">
                  <span className="pct-stat-title">Cohort Median</span>
                  <span className="pct-stat-val text-slate-700">{percentileData.cohortMedian.toFixed(1)}%</span>
                  <span className="pct-stat-note">50th %ile benchmark</span>
                </div>
                <div className="pct-stat-card">
                  <span className="pct-stat-title">Cohort Size</span>
                  <span className="pct-stat-val text-slate-700">{percentileData.cohortSize}</span>
                  <span className="pct-stat-note">Active learners</span>
                </div>
                <div className="pct-stat-card">
                  <span className="pct-stat-title">Evaluated Quizzes</span>
                  <span className="pct-stat-val text-slate-700">{quizzesTaken}</span>
                  <span className="pct-stat-note">{quizzesTaken >= 5 ? 'High confidence' : 'Initial sample'}</span>
                </div>
              </div>

              {/* Subject Percentile Breakdown */}
              <div className="subject-standings-section">
                <h4 className="subject-standings-title">Subject Percentile Breakdown</h4>
                <div className="subject-standings-list">
                  {percentileData.subjectStandings.map((subj) => (
                    <div key={subj.name} className="subject-standing-row">
                      <div className="subj-standing-info">
                        <span
                          className="subj-standing-dot"
                          style={{ backgroundColor: subj.color }}
                        />
                        <span className="subj-standing-name">{subj.name}</span>
                        <span className="subj-standing-score">{subj.score}%</span>
                      </div>
                      <div className="subj-standing-rank">
                        <span
                          className={`subj-standing-badge ${
                            subj.percentile >= 75
                              ? 'badge-elite'
                              : subj.percentile >= 50
                              ? 'badge-proficient'
                              : subj.percentile > 0
                              ? 'badge-developing'
                              : 'badge-unranked'
                          }`}
                        >
                          {subj.percentile > 0 ? `${subj.percentile}th %ile` : 'Unranked'}
                        </span>
                        <span className="subj-standing-tier">{subj.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Strategic Recommendation */}
              <div className="percentile-ai-tip-box">
                <div className="ai-tip-header">
                  <SparklesIcon size={16} color="#7C3AED" />
                  <span className="ai-tip-title">AI Cohort Recommendation</span>
                </div>
                <p className="ai-tip-text">
                  {percentileData.isRanked ? (
                    <>
                      You are positioned in the <strong>{percentileData.tier}</strong> bracket.
                      Scoring 85%+ on your next quiz will boost your standing toward the top tier of all learners.
                    </>
                  ) : (
                    'Complete your first adaptive quiz to establish your baseline cohort standing and unlock personalized recommendations.'
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="percentile-modal-footer">
              <span className="percentile-footer-note">
                Rankings update in real time after each quiz attempt.
              </span>
              <div className="percentile-footer-actions">
                <button
                  type="button"
                  className="percentile-btn-secondary"
                  onClick={() => setShowPercentileModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="percentile-btn-primary"
                  onClick={() => {
                    setShowPercentileModal(false);
                    if (onStartQuiz) {
                      onStartQuiz();
                    } else if (onRetakeQuiz) {
                      onRetakeQuiz('Mathematics');
                    }
                  }}
                >
                  {percentileData.isRanked ? 'Take a Quiz to Level Up' : 'Start Your First Quiz'} ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
