import React, { useState } from 'react';
import { EDUCATOR_ANALYTICS_DATA } from '../data/educatorData';
import {
  ChartIcon,
  TargetIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon
} from './Icons';

export const EducatorAnalyticsView = ({ showToast }) => {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [activeSubject, setActiveSubject] = useState(null);

  const { kpis, subjectBreakdown, weeklyTrends, hardestQuestions } = EDUCATOR_ANALYTICS_DATA;

  // Multiplier or modifier depending on timeframe
  const timeframeMultiplier =
    timeframe === 'Last 7 Days'
      ? 0.3
      : timeframe === 'Last 30 Days'
      ? 1.0
      : timeframe === 'Semester 1'
      ? 3.2
      : 4.5;

  return (
    <div className="educator-section-view">
      {/* Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Assessment & Learning Analytics</h1>
          <p className="educator-section-subtitle">
            Comprehensive learning telemetry, difficulty calibration index, and curriculum gap diagnostics.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="educator-timeframe-pills">
          {['Last 7 Days', 'Last 30 Days', 'Semester 1', 'All Time'].map((tf) => (
            <button
              key={tf}
              type="button"
              className={`educator-time-pill ${timeframe === tf ? 'active' : ''}`}
              onClick={() => {
                setTimeframe(tf);
                if (showToast) showToast(`Analytics updated for: ${tf}`);
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="educator-stat-grid" style={{ marginBottom: '22px' }}>
        <div className="educator-stat-card card-blue">
          <div className="educator-stat-icon-wrap">
            <TargetIcon size={24} color="#2563EB" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Overall Avg. Score</span>
            <div className="educator-stat-value">{kpis.avgScore}</div>
          </div>
        </div>

        <div className="educator-stat-card card-green">
          <div className="educator-stat-icon-wrap">
            <CheckCircleIcon size={24} color="#10B981" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Assessment Pass Rate</span>
            <div className="educator-stat-value">{kpis.passRate}</div>
          </div>
        </div>

        <div className="educator-stat-card card-amber">
          <div className="educator-stat-icon-wrap">
            <ClockIcon size={24} color="#F59E0B" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Avg. Test Duration</span>
            <div className="educator-stat-value">{kpis.avgTimeSpent}</div>
          </div>
        </div>

        <div className="educator-stat-card card-purple">
          <div className="educator-stat-icon-wrap">
            <ChartIcon size={24} color="#8B5CF6" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Completion Rate</span>
            <div className="educator-stat-value">{kpis.completionRate}</div>
          </div>
        </div>
      </div>

      {/* Grid: Subject Breakdown & Weekly Submissions Volume */}
      <div className="educator-middle-grid" style={{ marginBottom: '22px' }}>
        {/* Subject-Wise Mastery Comparison */}
        <div className="educator-content-card">
          <div className="educator-table-header-row">
            <div>
              <h2 className="educator-card-title">Subject Mastery & Pass Rates</h2>
              <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                Performance across core technical subjects
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            {subjectBreakdown.map((item) => {
              const isHovered = activeSubject === item.subject;
              return (
                <div
                  key={item.subject}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: isHovered ? '#F1F5F9' : '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setActiveSubject(item.subject)}
                  onMouseLeave={() => setActiveSubject(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: item.color
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                        {item.subject}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.80rem' }}>
                      <span style={{ color: '#475569' }}>
                        Attempts: <strong>{Math.round(item.attempts * timeframeMultiplier)}</strong>
                      </span>
                      <span style={{ color: '#0F172A', fontWeight: 700 }}>
                        Avg: {item.avgScore}%
                      </span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>
                        Pass: {item.passRate}%
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar: Score vs Pass */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ width: '100%', height: '7px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.avgScore}%`,
                          height: '100%',
                          backgroundColor: item.color,
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="educator-content-card">
          <div className="educator-table-header-row">
            <div>
              <h2 className="educator-card-title">Submission Activity Trends</h2>
              <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                Weekly submission volume trajectory
              </span>
            </div>
          </div>

          <div style={{ height: '260px', width: '100%', position: 'relative', marginTop: '10px' }}>
            <svg viewBox="0 0 320 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[150, 100, 50, 0].map((val, idx) => {
                const y = 20 + idx * 50;
                return (
                  <g key={val}>
                    <line x1="30" y1={y} x2="310" y2={y} stroke="#EEF2F6" strokeDasharray="3 3" />
                    <text x="24" y={y + 4} fontSize="9" fill="#94A3B8" textAnchor="end">
                      {Math.round(val * timeframeMultiplier)}
                    </text>
                  </g>
                );
              })}

              {/* Area & Line */}
              <path
                d="M 50,140 Q 110,110 170,80 T 290,40 L 290,170 L 50,170 Z"
                fill="url(#trendGradient)"
              />
              <path
                d="M 50,140 Q 110,110 170,80 T 290,40"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[
                { x: 50, y: 140, label: 'W1' },
                { x: 130, y: 105, label: 'W2' },
                { x: 210, y: 75, label: 'W3' },
                { x: 290, y: 40, label: 'W4' }
              ].map((pt) => (
                <g key={pt.label}>
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                  <text x={pt.x} y="190" fontSize="10" fill="#64748B" textAnchor="middle" fontWeight="600">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem'
            }}
          >
            <span style={{ color: '#475569' }}>
              Trajectory: <strong style={{ color: '#10B981' }}>+24.5% vs previous cycle</strong>
            </span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              Peak day: Thursday (64 completions)
            </span>
          </div>
        </div>
      </div>

      {/* Hardest Questions & Learning Gaps Table */}
      <div className="educator-content-card">
        <div className="educator-table-header-row">
          <div>
            <h2 className="educator-card-title">Curriculum Diagnostics: Hardest Assessment Items</h2>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Identifies questions with highest student failure rate to guide lecture revisions
            </span>
          </div>
        </div>

        <div className="educator-table-wrapper">
          <table className="educator-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Question Snippet</th>
                <th>Assessment Quiz</th>
                <th>Incorrect Rate</th>
                <th>Common Misconception</th>
                <th>Suggested Pedagogical Action</th>
              </tr>
            </thead>
            <tbody>
              {hardestQuestions.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'normal' }}>
                    {item.question}
                  </td>
                  <td style={{ color: '#334155', fontWeight: 500 }}>{item.quiz}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontWeight: 700,
                        fontSize: '0.80rem'
                      }}
                    >
                      {item.failureRate} Missed
                    </span>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.82rem', whiteSpace: 'normal' }}>
                    {item.misconception}
                  </td>
                  <td style={{ color: '#1E40AF', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'normal' }}>
                    {item.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EducatorAnalyticsView;
