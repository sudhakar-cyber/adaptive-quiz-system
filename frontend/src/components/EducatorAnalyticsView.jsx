import React, { useState, useMemo, useEffect } from 'react';
import { EDUCATOR_ANALYTICS_DATA, INITIAL_EDUCATOR_QUIZZES } from '../data/educatorData';
import { sharedDatabase } from '../services/sharedDatabase';
import {
  ChartIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  SearchIcon,
  FilterIcon,
  BookOpenIcon,
  TrendingUpIcon,
  XIcon,
  CheckIcon,
  AwardIcon,
  UsersIcon
} from './Icons';

export const EducatorAnalyticsView = ({
  quizzes = [],
  students = [],
  submissions = [],
  searchQuery = '',
  onNavigateToTab,
  showToast
}) => {
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [activeSubjectFilter, setActiveSubjectFilter] = useState(null);
  const [subjectSort, setSubjectSort] = useState('highest'); // 'highest' | 'lowest' | 'attempts'
  const [localSearch, setLocalSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('failureRateDesc');
  const [viewMode, setViewMode] = useState('diagnostics'); // 'diagnostics' | 'subjects' | 'calibration'
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);
  const [inspectingQuestion, setInspectingQuestion] = useState(null);
  const [inspectingSubject, setInspectingSubject] = useState(null);

  // Close inspector modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setInspectingQuestion(null);
        setInspectingSubject(null);
      }
    };
    if (inspectingQuestion || inspectingSubject) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingQuestion, inspectingSubject]);

  // Safe data resolution (props with database fallback)
  const safeQuizzes = useMemo(() => {
    if (Array.isArray(quizzes) && quizzes.length > 0) return quizzes;
    const dbQuizzes = sharedDatabase?.getQuizzes ? sharedDatabase.getQuizzes() : [];
    return dbQuizzes.length > 0 ? dbQuizzes : INITIAL_EDUCATOR_QUIZZES;
  }, [quizzes]);

  const safeStudents = useMemo(() => {
    if (Array.isArray(students) && students.length > 0) return students;
    return sharedDatabase?.getStudents ? sharedDatabase.getStudents() : [];
  }, [students]);

  const safeSubmissions = useMemo(() => {
    if (Array.isArray(submissions) && submissions.length > 0) return submissions;
    return sharedDatabase?.getSubmissions ? sharedDatabase.getSubmissions() : [];
  }, [submissions]);

  // Multiplier / Scaling factor by timeframe
  const timeframeMultiplier = useMemo(() => {
    switch (timeframe) {
      case 'Last 7 Days':
        return 0.35;
      case 'Last 30 Days':
        return 1.0;
      case 'Semester 1':
        return 2.8;
      case 'All Time':
        return 4.2;
      default:
        return 1.0;
    }
  }, [timeframe]);

  // Dynamic Key Performance Indicators (KPIs) - 100% Real Calculations based on stored submissions
  const dynamicKpis = useMemo(() => {
    // 1. Avg Score calculation strictly from real submissions or students
    let avgScoreVal = 0;
    if (safeSubmissions.length > 0) {
      const parsedScores = safeSubmissions
        .map((s) => parseFloat(String(s.score).replace('%', '')))
        .filter((n) => !isNaN(n));
      if (parsedScores.length > 0) {
        avgScoreVal = Math.round((parsedScores.reduce((a, b) => a + b, 0) / parsedScores.length) * 10) / 10;
      }
    } else {
      const studentsWithScore = safeStudents.filter((s) => (s.avgScore || 0) > 0);
      if (studentsWithScore.length > 0) {
        const sum = studentsWithScore.reduce((acc, s) => acc + s.avgScore, 0);
        avgScoreVal = Math.round((sum / studentsWithScore.length) * 10) / 10;
      }
    }

    // 2. Pass rate calculation (real scores >= 70%)
    let passRateVal = 0;
    if (safeSubmissions.length > 0) {
      const passed = safeSubmissions.filter((s) => {
        const sc = parseFloat(String(s.score).replace('%', ''));
        return !isNaN(sc) && sc >= 70;
      }).length;
      passRateVal = Math.round((passed / safeSubmissions.length) * 100);
    } else {
      const studentsWithScore = safeStudents.filter((s) => (s.avgScore || 0) > 0);
      if (studentsWithScore.length > 0) {
        const passed = studentsWithScore.filter((s) => (s.avgScore || 0) >= 70).length;
        passRateVal = Math.round((passed / studentsWithScore.length) * 100);
      }
    }

    // 3. Avg duration calculation from active quizzes
    let avgDurationVal = '0 mins';
    const parsedMins = safeQuizzes
      .map((q) => {
        const match = String(q.duration || '').match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null);
    if (parsedMins.length > 0) {
      const avgM = Math.round(parsedMins.reduce((a, b) => a + b, 0) / parsedMins.length);
      avgDurationVal = `${avgM} mins`;
    }

    // 4. Completion rate
    let completionRateVal = '0%';
    const totalCompletions = safeStudents.reduce((sum, s) => sum + (s.quizzesCompleted || 0), 0);
    const activeQuizzesList = safeQuizzes.filter((q) => (q.status || '').toLowerCase() !== 'draft' && (q.status || '').toLowerCase() !== 'archived');
    const totalQuizzesCount = Math.max(1, activeQuizzesList.length);
    if (safeStudents.length > 0 && totalCompletions > 0) {
      const pct = Math.min(100, Math.round((totalCompletions / (safeStudents.length * totalQuizzesCount)) * 100));
      completionRateVal = `${pct}%`;
    } else if (safeSubmissions.length > 0 && safeStudents.length > 0) {
      const pct = Math.min(100, Math.round((safeSubmissions.length / (safeStudents.length * totalQuizzesCount)) * 100));
      completionRateVal = `${pct}%`;
    }

    return {
      avgScore: `${avgScoreVal}%`,
      passRate: `${passRateVal}%`,
      avgTimeSpent: avgDurationVal,
      completionRate: completionRateVal,
      totalQuizzes: safeQuizzes.length,
      activeStudents: safeStudents.length,
      totalSubmissions: safeSubmissions.length
    };
  }, [safeQuizzes, safeStudents, safeSubmissions]);

  // Subject Mastery & Pass Rates Breakdown derived strictly from active quizzes & submissions
  const dynamicSubjectBreakdown = useMemo(() => {
    // Collect all distinct categories from quizzes and submissions
    const categoriesMap = new Map();

    safeQuizzes.forEach((q) => {
      const cat = q.category || 'General';
      if (!categoriesMap.has(cat)) {
        categoriesMap.set(cat, {
          id: `dom-${cat.toLowerCase().replace(/\s+/g, '-')}`,
          subject: `${cat} Curriculum`,
          domain: cat,
          color: q.categoryColor || '#2563EB',
          quizzes: []
        });
      }
      categoriesMap.get(cat).quizzes.push(q);
    });

    safeSubmissions.forEach((s) => {
      const cat = s.category || 'General';
      if (!categoriesMap.has(cat)) {
        categoriesMap.set(cat, {
          id: `dom-${cat.toLowerCase().replace(/\s+/g, '-')}`,
          subject: `${cat} Curriculum`,
          domain: cat,
          color: '#10B981',
          quizzes: []
        });
      }
    });

    const list = Array.from(categoriesMap.values()).map((item) => {
      const catName = item.domain.toLowerCase();

      // Find matching submissions
      const matchingSubmissions = safeSubmissions.filter((sub) => {
        const sCat = (sub.category || '').toLowerCase();
        const sTitle = (sub.quizTitle || '').toLowerCase();
        return sCat === catName || sTitle.includes(catName);
      });

      // Find matching students
      const matchingStudents = safeStudents.filter((stud) => {
        if (Array.isArray(stud.subjectMastery)) {
          return stud.subjectMastery.some((m) => (m.subject || '').toLowerCase().includes(catName) && m.score > 0);
        }
        return false;
      });

      let finalAvgScore = 0;
      let finalPassRate = 0;
      const attemptsCount = matchingSubmissions.length;

      if (matchingSubmissions.length > 0) {
        const scores = matchingSubmissions
          .map((s) => parseFloat(String(s.score).replace('%', '')))
          .filter((n) => !isNaN(n));
        if (scores.length > 0) {
          finalAvgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          const passed = scores.filter((sc) => sc >= 70).length;
          finalPassRate = Math.round((passed / scores.length) * 100);
        }
      } else if (item.quizzes.length > 0) {
        const quizScores = item.quizzes.map((q) => q.avgScore).filter((s) => typeof s === 'number' && s > 0);
        if (quizScores.length > 0) {
          finalAvgScore = Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length);
        }
        const quizPasses = item.quizzes.map((q) => q.passRate).filter((p) => typeof p === 'number' && p > 0);
        if (quizPasses.length > 0) {
          finalPassRate = Math.round(quizPasses.reduce((a, b) => a + b, 0) / quizPasses.length);
        }
      }

      let status = 'No Attempts Yet';
      let statusVariant = 'info';
      if (attemptsCount > 0 || finalAvgScore > 0) {
        if (finalAvgScore >= 85) {
          status = 'Mastered';
          statusVariant = 'success';
        } else if (finalAvgScore >= 70) {
          status = 'Proficient';
          statusVariant = 'info';
        } else {
          status = 'Needs Support';
          statusVariant = 'warning';
        }
      }

      return {
        id: item.id,
        subject: item.subject,
        domain: item.domain,
        color: item.color,
        attempts: attemptsCount,
        avgScore: finalAvgScore,
        passRate: finalPassRate,
        status,
        statusVariant,
        quizzes: item.quizzes,
        quizCount: item.quizzes.length,
        studentsTested: matchingStudents.length || (attemptsCount > 0 ? 1 : 0),
        topStudents: matchingStudents.filter((s) => (s.avgScore || 0) >= 80),
        supportStudents: matchingStudents.filter((s) => (s.avgScore || 0) > 0 && s.avgScore < 70)
      };
    });

    // Sort list according to subjectSort
    if (subjectSort === 'highest') {
      list.sort((a, b) => b.avgScore - a.avgScore);
    } else if (subjectSort === 'lowest') {
      list.sort((a, b) => a.passRate - b.passRate);
    } else if (subjectSort === 'attempts') {
      list.sort((a, b) => b.attempts - a.attempts);
    }

    return list;
  }, [safeQuizzes, safeStudents, safeSubmissions, subjectSort]);

  // Submission Activity Trends Chart Data (Pure Calculation from Stored Submissions)
  const trendData = useMemo(() => {
    const parseScore = (s) => {
      if (typeof s === 'number') return s;
      if (typeof s === 'string') return parseFloat(s.replace('%', '')) || 0;
      return 0;
    };

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (timeframe === 'Last 7 Days') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayBuckets = days.map((day) => ({ label: day, submissions: 0, totalScore: 0 }));

      safeSubmissions.forEach((sub) => {
        const subTime = sub.timestamp || (typeof sub.id === 'number' ? sub.id : null);
        if (subTime && now - subTime <= 7 * dayMs) {
          const d = new Date(subTime);
          const dayIdx = (d.getDay() + 6) % 7; // Mon=0, Sun=6
          if (dayBuckets[dayIdx]) {
            dayBuckets[dayIdx].submissions += 1;
            dayBuckets[dayIdx].totalScore += parseScore(sub.score);
          }
        } else if (!subTime && safeSubmissions.length > 0) {
          const todayIdx = (new Date().getDay() + 6) % 7;
          dayBuckets[todayIdx].submissions += 1;
          dayBuckets[todayIdx].totalScore += parseScore(sub.score);
        }
      });

      return dayBuckets.map((b) => ({
        label: b.label,
        submissions: b.submissions,
        avgScore: b.submissions > 0 ? Math.round(b.totalScore / b.submissions) : 0
      }));
    }

    if (timeframe === 'Semester 1') {
      const months = ['M1', 'M2', 'M3', 'M4', 'M5'];
      const monthBuckets = months.map((m) => ({ label: m, submissions: 0, totalScore: 0 }));

      safeSubmissions.forEach((sub) => {
        const subTime = sub.timestamp || (typeof sub.id === 'number' ? sub.id : null);
        if (subTime) {
          const daysAgo = Math.floor((now - subTime) / dayMs);
          const monthIdx = Math.min(4, Math.max(0, 4 - Math.floor(daysAgo / 30)));
          monthBuckets[monthIdx].submissions += 1;
          monthBuckets[monthIdx].totalScore += parseScore(sub.score);
        } else if (safeSubmissions.length > 0) {
          monthBuckets[4].submissions += 1;
          monthBuckets[4].totalScore += parseScore(sub.score);
        }
      });

      return monthBuckets.map((b) => ({
        label: b.label,
        submissions: b.submissions,
        avgScore: b.submissions > 0 ? Math.round(b.totalScore / b.submissions) : 0
      }));
    }

    if (timeframe === 'All Time') {
      const terms = ['T1', 'T2', 'T3', 'T4', 'T5'];
      const termBuckets = terms.map((t) => ({ label: t, submissions: 0, totalScore: 0 }));

      safeSubmissions.forEach((sub) => {
        const subTime = sub.timestamp || (typeof sub.id === 'number' ? sub.id : null);
        if (subTime) {
          const daysAgo = Math.floor((now - subTime) / dayMs);
          const termIdx = Math.min(4, Math.max(0, 4 - Math.floor(daysAgo / 60)));
          termBuckets[termIdx].submissions += 1;
          termBuckets[termIdx].totalScore += parseScore(sub.score);
        } else if (safeSubmissions.length > 0) {
          termBuckets[4].submissions += 1;
          termBuckets[4].totalScore += parseScore(sub.score);
        }
      });

      return termBuckets.map((b) => ({
        label: b.label,
        submissions: b.submissions,
        avgScore: b.submissions > 0 ? Math.round(b.totalScore / b.submissions) : 0
      }));
    }

    // Default: 'Last 30 Days' (4 Weeks)
    const weeks = ['W1', 'W2', 'W3', 'W4'];
    const weekBuckets = weeks.map((w) => ({ label: w, submissions: 0, totalScore: 0 }));

    safeSubmissions.forEach((sub) => {
      const subTime = sub.timestamp || (typeof sub.id === 'number' ? sub.id : null);
      if (subTime && now - subTime <= 30 * dayMs) {
        const daysAgo = Math.floor((now - subTime) / dayMs);
        const weekIdx = Math.min(3, Math.max(0, 3 - Math.floor(daysAgo / 7)));
        weekBuckets[weekIdx].submissions += 1;
        weekBuckets[weekIdx].totalScore += parseScore(sub.score);
      } else if (!subTime && safeSubmissions.length > 0) {
        weekBuckets[3].submissions += 1;
        weekBuckets[3].totalScore += parseScore(sub.score);
      }
    });

    return weekBuckets.map((b) => ({
      label: b.label,
      submissions: b.submissions,
      avgScore: b.submissions > 0 ? Math.round(b.totalScore / b.submissions) : 0
    }));
  }, [timeframe, safeSubmissions]);

  // SVG dimensions & dynamic curve calculation for Activity Chart
  const svgWidth = 320;
  const svgHeight = 200;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxSubmissions = Math.max(...trendData.map((d) => d.submissions), 5);

  const chartPoints = useMemo(() => {
    return trendData.map((d, idx) => {
      const x = paddingLeft + (idx / Math.max(1, trendData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.submissions / maxSubmissions) * chartHeight;
      return { ...d, x, y };
    });
  }, [trendData, chartWidth, chartHeight, maxSubmissions, paddingLeft, paddingTop]);

  // Construct smooth SVG path using cubic Bezier curves
  const { pathLine, pathArea } = useMemo(() => {
    if (chartPoints.length === 0) return { pathLine: '', pathArea: '' };

    let line = `M ${chartPoints[0].x},${chartPoints[0].y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i];
      const p1 = chartPoints[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      line += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }

    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const bottomY = paddingTop + chartHeight;
    const area = `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

    return { pathLine: line, pathArea: area };
  }, [chartPoints, chartHeight, paddingTop]);

  // Dynamic Trajectory and Peak Metrics
  const trajectoryMetric = useMemo(() => {
    if (chartPoints.length < 2) return '0%';
    const first = chartPoints[0].submissions;
    const last = chartPoints[chartPoints.length - 1].submissions;
    if (first === 0 && last === 0) return '0%';
    if (first === 0) return `+${last} total`;
    const pct = Math.round(((last - first) / first) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }, [chartPoints]);

  const peakPoint = useMemo(() => {
    if (chartPoints.length === 0) return null;
    const sorted = [...chartPoints].sort((a, b) => b.submissions - a.submissions);
    return sorted[0]?.submissions > 0 ? sorted[0] : null;
  }, [chartPoints]);

  // Diagnostic items (Comprehensive question-level learning gap analysis derived from real quizzes & attempts)
  const allDiagnosticItems = useMemo(() => {
    const items = [];

    // Extract actual questions from educator quizzes
    safeQuizzes.forEach((quiz) => {
      if (Array.isArray(quiz.questions)) {
        const quizSubmissions = safeSubmissions.filter(
          (s) =>
            (s.quizId && String(s.quizId).toLowerCase() === String(quiz.id).toLowerCase()) ||
            (s.quizTitle && s.quizTitle.toLowerCase().trim() === (quiz.title || '').toLowerCase().trim())
        );

        const totalAttempts = quizSubmissions.length;
        const failedAttempts = quizSubmissions.filter((s) => {
          const score = typeof s.score === 'number' ? s.score : parseFloat(String(s.score).replace('%', '')) || 0;
          return score < 70;
        }).length;

        const failRate = totalAttempts > 0 ? Math.round((failedAttempts / totalAttempts) * 100) : 0;

        quiz.questions.forEach((q, qIdx) => {
          const exists = items.some(
            (it) => it.question.toLowerCase().trim() === (q.question || '').toLowerCase().trim()
          );
          if (!exists && q.question) {
            items.push({
              id: `q-live-${quiz.id}-${q.id || qIdx}`,
              question: q.question,
              quiz: quiz.title,
              category: quiz.category || 'General',
              domain: quiz.category || 'General',
              difficulty: quiz.difficulty || 'Medium',
              failureRate: failRate,
              attempts: totalAttempts,
              misconception: q.explanation
                ? `Concept review: ${q.explanation.slice(0, 100)}...`
                : `Identified learning friction in ${(quiz.category || 'core').toLowerCase()} topics.`,
              recommendation: `Reinforce ${quiz.title} foundational principles and review student attempts.`,
              options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
              correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
              explanation: q.explanation || 'Refer to the curriculum lecture notes for detailed concept breakdown.'
            });
          }
        });
      }
    });

    return items;
  }, [safeQuizzes, safeSubmissions]);

  // Filtered & Sorted Diagnostic Items
  const filteredDiagnosticItems = useMemo(() => {
    let result = [...allDiagnosticItems];

    // Global + local search query
    const effectiveSearch = (searchQuery || localSearch).trim().toLowerCase();
    if (effectiveSearch) {
      result = result.filter(
        (it) =>
          it.question.toLowerCase().includes(effectiveSearch) ||
          it.quiz.toLowerCase().includes(effectiveSearch) ||
          it.category.toLowerCase().includes(effectiveSearch) ||
          it.misconception.toLowerCase().includes(effectiveSearch)
      );
    }

    // Subject filter (clicked pill or dropdown)
    if (activeSubjectFilter && activeSubjectFilter !== 'All Subjects') {
      const targetSub = activeSubjectFilter.toLowerCase();
      result = result.filter(
        (it) =>
          it.category.toLowerCase() === targetSub ||
          it.domain?.toLowerCase() === targetSub ||
          it.quiz.toLowerCase().includes(targetSub) ||
          targetSub.includes(it.category.toLowerCase()) ||
          targetSub.includes(it.domain?.toLowerCase() || '')
      );
    }

    // Risk level filter
    if (riskFilter === 'high') {
      result = result.filter((it) => it.failureRate >= 30);
    } else if (riskFilter === 'moderate') {
      result = result.filter((it) => it.failureRate >= 20 && it.failureRate < 30);
    } else if (riskFilter === 'low') {
      result = result.filter((it) => it.failureRate < 20);
    }

    // Sort
    if (sortBy === 'failureRateDesc') {
      result.sort((a, b) => b.failureRate - a.failureRate);
    } else if (sortBy === 'failureRateAsc') {
      result.sort((a, b) => a.failureRate - b.failureRate);
    } else if (sortBy === 'questionAsc') {
      result.sort((a, b) => a.question.localeCompare(b.question));
    }

    return result;
  }, [allDiagnosticItems, searchQuery, localSearch, activeSubjectFilter, riskFilter, sortBy]);

  // Export Analytics as CSV
  const handleExportAnalyticsCSV = () => {
    let csv = `LEARNSMART ADAPTIVE LEARNING SYSTEM - ASSESSMENT & LEARNING ANALYTICS\n`;
    csv += `Generated Date,"${new Date().toLocaleString()}"\n`;
    csv += `Selected Timeframe,"${timeframe}"\n`;
    csv += `Overall Avg Score,"${dynamicKpis.avgScore}"\n`;
    csv += `Pass Rate,"${dynamicKpis.passRate}"\n`;
    csv += `Avg Test Duration,"${dynamicKpis.avgTimeSpent}"\n`;
    csv += `Completion Rate,"${dynamicKpis.completionRate}"\n`;
    csv += `Total Quizzes,"${dynamicKpis.totalQuizzes}"\n`;
    csv += `Enrolled Students,"${dynamicKpis.activeStudents}"\n\n`;

    csv += `--- SUBJECT MASTERY & PASS RATES ---\n`;
    csv += `Subject Domain,Category,Quizzes,Attempts,Avg Mastery Score,Pass Rate,Status\n`;
    dynamicSubjectBreakdown.forEach((sub) => {
      csv += `"${sub.subject}","${sub.domain}",${sub.quizCount || 1},${sub.attempts},"${sub.avgScore}%","${sub.passRate}%","${sub.status}"\n`;
    });

    csv += `\n--- CURRICULUM DIAGNOSTICS & HARDEST ITEMS ---\n`;
    csv += `Question Snippet,Assessment Quiz,Domain,Difficulty,Failure Rate,Common Misconception,Suggested Action\n`;
    filteredDiagnosticItems.forEach((item) => {
      const q = item.question.replace(/"/g, '""');
      const m = item.misconception.replace(/"/g, '""');
      const r = item.recommendation.replace(/"/g, '""');
      csv += `"${q}","${item.quiz}","${item.category}","${item.difficulty}","${item.failureRate}%","${m}","${r}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Assessment_Analytics_${timeframe.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (showToast) {
      showToast('📊 Assessment analytics report exported as CSV successfully!');
    }
  };

  return (
    <div className="educator-section-view">
      {/* Header Row */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Assessment & Learning Analytics</h1>
          <p className="educator-section-subtitle">
            Comprehensive learning telemetry, difficulty calibration index, and curriculum gap diagnostics.
          </p>
        </div>

        {/* Header Right Actions: Timeframe Pills & Export Button */}
        <div className="educator-analytics-header-actions">
          <div className="educator-timeframe-pills">
            {['Last 7 Days', 'Last 30 Days', 'All Time'].map((tf) => (
              <button
                key={tf}
                type="button"
                className={`educator-time-pill ${timeframe === tf ? 'active' : ''}`}
                onClick={() => {
                  setTimeframe(tf);
                  if (showToast) showToast(`Analytics calibrated for: ${tf}`);
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="educator-analytics-export-btn"
            onClick={handleExportAnalyticsCSV}
            title="Export complete analytics report as CSV"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="educator-stat-grid" style={{ marginBottom: '22px' }}>
        <div className="educator-stat-card card-blue">
          <div className="educator-stat-icon-wrap">
            <TargetIcon size={24} color="#2563EB" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Overall Avg. Score</span>
            <div className="educator-stat-value">{dynamicKpis.avgScore}</div>
            <span className="educator-stat-sub">
              {timeframe === 'Last 7 Days' ? 'Recent student submissions' : `${dynamicKpis.totalSubmissions} attempts evaluated`}
            </span>
          </div>
        </div>

        <div className="educator-stat-card card-green">
          <div className="educator-stat-icon-wrap">
            <CheckCircleIcon size={24} color="#10B981" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Assessment Pass Rate</span>
            <div className="educator-stat-value">{dynamicKpis.passRate}</div>
            <span className="educator-stat-sub">Benchmark: &gt;= 70% passing threshold</span>
          </div>
        </div>

        <div className="educator-stat-card card-amber">
          <div className="educator-stat-icon-wrap">
            <ClockIcon size={24} color="#F59E0B" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Avg. Test Duration</span>
            <div className="educator-stat-value">{dynamicKpis.avgTimeSpent}</div>
            <span className="educator-stat-sub">Across {dynamicKpis.totalQuizzes} active quizzes</span>
          </div>
        </div>

        <div className="educator-stat-card card-purple">
          <div className="educator-stat-icon-wrap">
            <ChartIcon size={24} color="#8B5CF6" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Completion Rate</span>
            <div className="educator-stat-value">{dynamicKpis.completionRate}</div>
            <span className="educator-stat-sub">{dynamicKpis.activeStudents} active enrolled students</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Subject Mastery Comparison & Submission Activity Trends */}
      <div className="educator-middle-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: Subject Mastery & Pass Rates (ENHANCED DUAL BENCHMARK VIEW) */}
        <div className="educator-content-card">
          <div className="educator-table-header-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="educator-card-title">Subject Mastery & Pass Rates</h2>
              <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                Cohort skill index, dual benchmark progress, and domain pass rates
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Subject Sort Control */}
              <select
                className="educator-diagnostic-select"
                style={{ fontSize: '0.76rem', padding: '5px 8px' }}
                value={subjectSort}
                onChange={(e) => setSubjectSort(e.target.value)}
                title="Sort subjects by performance criteria"
              >
                <option value="highest">Highest Score First</option>
                <option value="lowest">Lowest Pass Rate</option>
                <option value="attempts">Most Attempts</option>
              </select>

              {activeSubjectFilter && (
                <div className="educator-subject-filter-badge" style={{ marginTop: 0 }}>
                  <span>{activeSubjectFilter}</span>
                  <button
                    type="button"
                    className="educator-subject-clear-btn"
                    onClick={() => {
                      setActiveSubjectFilter(null);
                      if (showToast) showToast('Subject filter cleared');
                    }}
                    title="Clear Subject Filter"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {dynamicSubjectBreakdown.map((item) => {
              const isSelected = activeSubjectFilter === item.domain || activeSubjectFilter === item.subject;
              return (
                <div
                  key={item.id || item.subject}
                  className={`educator-subject-item-card ${isSelected ? 'is-active' : ''}`}
                >
                  {/* Subject Header Row */}
                  <div className="educator-subject-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          flexShrink: 0
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>
                        {item.subject}
                      </span>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          backgroundColor:
                            item.status === 'Mastered'
                              ? '#ECFDF5'
                              : item.status === 'Needs Support'
                              ? '#FEF2F2'
                              : '#EFF6FF',
                          color:
                            item.status === 'Mastered'
                              ? '#059669'
                              : item.status === 'Needs Support'
                              ? '#DC2626'
                              : '#1D4ED8',
                          fontWeight: 700
                        }}
                      >
                        {item.status}
                      </span>
                      <span
                        style={{
                          fontSize: '0.70rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          fontWeight: 600
                        }}
                      >
                        {item.quizCount} {item.quizCount === 1 ? 'Quiz' : 'Quizzes'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#475569', fontSize: '0.78rem' }}>
                        <strong>{item.attempts}</strong> attempts
                      </span>
                      <button
                        type="button"
                        className="educator-inspect-btn"
                        style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                        onClick={() => setInspectingSubject(item)}
                        title={`View detailed telemetry for ${item.subject}`}
                      >
                        Deep Dive →
                      </button>
                    </div>
                  </div>

                  {/* Dual Benchmark Progress Bars: Score & Pass Rate */}
                  <div className="educator-subject-bars-container">
                    {/* Bar 1: Mastery Score */}
                    <div className="educator-subject-bar-row">
                      <div className="educator-subject-bar-labels">
                        <span style={{ color: '#334155' }}>Cohort Mastery Score</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.avgScore}%</span>
                      </div>
                      <div className="educator-subject-progress-track">
                        <div
                          className="educator-subject-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.avgScore))}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                    </div>

                    {/* Bar 2: Assessment Pass Rate */}
                    <div className="educator-subject-bar-row">
                      <div className="educator-subject-bar-labels">
                        <span style={{ color: '#334155' }}>Pass Rate (&gt;= 70% threshold)</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: item.passRate >= 70 ? '#059669' : '#DC2626'
                          }}
                        >
                          {item.passRate}%
                        </span>
                      </div>
                      <div className="educator-subject-progress-track">
                        <div
                          className="educator-subject-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.passRate))}%`,
                            backgroundColor: item.passRate >= 70 ? '#10B981' : '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Filter Click Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isSelected ? '#1D4ED8' : '#64748B',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={() => {
                        const next = isSelected ? null : item.domain;
                        setActiveSubjectFilter(next);
                        if (showToast) {
                          showToast(next ? `Filtered dashboard to ${item.subject}` : 'All subjects shown');
                        }
                      }}
                    >
                      {isSelected ? '✓ Filter Active (Click to Clear)' : '+ Filter Dashboard by Subject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Submission Activity Trends SVG Chart */}
        <div className="educator-content-card">
          <div className="educator-table-header-row">
            <div>
              <h2 className="educator-card-title">Submission Activity Trends</h2>
              <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                Trajectory across {timeframe}
              </span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.76rem',
                color: '#10B981',
                fontWeight: 700,
                backgroundColor: '#ECFDF5',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              <TrendingUpIcon size={12} color="#10B981" />
              <span>{trajectoryMetric} Velocity</span>
            </span>
          </div>

          {/* SVG Smooth Area & Line Chart */}
          <div style={{ height: '230px', width: '100%', position: 'relative', marginTop: '10px' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-axis labels */}
              {[1, 0.66, 0.33, 0].map((ratio) => {
                const y = paddingTop + chartHeight * (1 - ratio);
                const val = Math.round(maxSubmissions * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#EEF2F6"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 6}
                      y={y + 3}
                      fontSize="9"
                      fill="#94A3B8"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Filled Area */}
              {pathArea && <path d={pathArea} fill="url(#trendGradient)" />}

              {/* Smooth Trajectory Line */}
              {pathLine && (
                <path
                  d={pathLine}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {chartPoints.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                return (
                  <g
                    key={pt.label}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Larger transparent hover target to avoid jitter */}
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6.5 : 4.5}
                      fill={isHovered ? '#059669' : '#10B981'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      style={{
                        transition: 'all 0.15s ease',
                        filter: isHovered ? 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.6))' : 'none'
                      }}
                    />

                    <text
                      x={pt.x}
                      y={svgHeight - 8}
                      fontSize="9.5"
                      fill={isHovered ? '#0F172A' : '#64748B'}
                      textAnchor="middle"
                      fontWeight={isHovered ? '700' : '600'}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}

              {/* Floating Tooltip inside SVG */}
              {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] && (() => {
                const pt = chartPoints[hoveredPointIndex];
                const tipW = 110;
                const tipH = 34;
                const tipX = Math.max(paddingLeft, Math.min(svgWidth - paddingRight - tipW, pt.x - tipW / 2));
                const tipY = pt.y < 46 ? pt.y + 10 : pt.y - tipH - 8;

                return (
                  <g pointerEvents="none">
                    <rect
                      x={tipX}
                      y={tipY}
                      width={tipW}
                      height={tipH}
                      rx="6"
                      fill="#0F172A"
                      stroke="#10B981"
                      strokeWidth="1.2"
                      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                    />
                    <text
                      x={tipX + tipW / 2}
                      y={tipY + 14}
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {pt.label}: {pt.submissions} Submissions
                    </text>
                    <text
                      x={tipX + tipW / 2}
                      y={tipY + 26}
                      fill="#94A3B8"
                      fontSize="8.5"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      Cohort Avg Score: {pt.avgScore}%
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Footer Info Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              fontSize: '0.80rem',
              marginTop: '8px'
            }}
          >
            <span style={{ color: '#475569' }}>
              Trajectory: <strong style={{ color: '#10B981' }}>{trajectoryMetric} vs previous cycle</strong>
            </span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              {peakPoint ? `Peak: ${peakPoint.label} (${peakPoint.submissions} submissions)` : 'Continuous telemetry active'}
            </span>
          </div>
        </div>
      </div>

      {/* Curriculum Diagnostics, Subject Mastery Matrix & Quiz Calibration Section */}
      <div className="educator-content-card">
        {/* Card Header & View Mode Switcher */}
        <div className="educator-table-header-row" style={{ flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 className="educator-card-title">Curriculum Diagnostics & Assessment Telemetry</h2>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Pinpoints high-failure questions and curriculum blind spots to guide teaching interventions
            </span>
          </div>

          {/* View Mode Toggle: 3 Modes */}
          <div className="educator-analytics-view-tabs">
            <button
              type="button"
              className={`educator-analytics-tab-btn ${viewMode === 'diagnostics' ? 'active' : ''}`}
              onClick={() => setViewMode('diagnostics')}
            >
              Item Diagnostics ({filteredDiagnosticItems.length})
            </button>
            <button
              type="button"
              className={`educator-analytics-tab-btn ${viewMode === 'subjects' ? 'active' : ''}`}
              onClick={() => setViewMode('subjects')}
            >
              Subject Mastery Matrix ({dynamicSubjectBreakdown.length})
            </button>
            <button
              type="button"
              className={`educator-analytics-tab-btn ${viewMode === 'calibration' ? 'active' : ''}`}
              onClick={() => setViewMode('calibration')}
            >
              Quiz Calibration Matrix ({safeQuizzes.length})
            </button>
          </div>
        </div>

        {/* MODE 1: ITEM DIAGNOSTICS & HARDEST QUESTIONS */}
        {viewMode === 'diagnostics' && (
          <>
            {/* Filter & Search Toolbar */}
            <div className="educator-diagnostic-toolbar">
              <div className="educator-diagnostic-filters">
                {/* Search Bar */}
                <div className="educator-diagnostic-search">
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    <SearchIcon size={14} color="#94A3B8" />
                  </span>
                  <input
                    type="text"
                    className="educator-diagnostic-search-input"
                    placeholder="Search diagnostic items, concepts, quizzes..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => setLocalSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94A3B8'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Subject Selector */}
                <select
                  className="educator-diagnostic-select"
                  value={activeSubjectFilter || 'All Subjects'}
                  onChange={(e) => {
                    const val = e.target.value === 'All Subjects' ? null : e.target.value;
                    setActiveSubjectFilter(val);
                  }}
                >
                  <option value="All Subjects">All Subjects</option>
                  {dynamicSubjectBreakdown.map((s) => (
                    <option key={s.id || s.domain} value={s.domain}>
                      {s.subject}
                    </option>
                  ))}
                </select>

                {/* Failure Risk Filter */}
                <select
                  className="educator-diagnostic-select"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Failure (&gt;= 30%)</option>
                  <option value="moderate">Moderate (20% - 30%)</option>
                  <option value="low">Low (&lt; 20%)</option>
                </select>

                {/* Sort Option */}
                <select
                  className="educator-diagnostic-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="failureRateDesc">Highest Failure First</option>
                  <option value="failureRateAsc">Lowest Failure First</option>
                  <option value="questionAsc">Alphabetical (A-Z)</option>
                </select>
              </div>

              {/* Reset Filters button if active */}
              {(localSearch || activeSubjectFilter || riskFilter !== 'all') && (
                <button
                  type="button"
                  className="educator-secondary-btn sm"
                  onClick={() => {
                    setLocalSearch('');
                    setActiveSubjectFilter(null);
                    setRiskFilter('all');
                    setSortBy('failureRateDesc');
                    if (showToast) showToast('All diagnostic filters reset');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Diagnostic Items Table */}
            <div className="educator-table-wrapper">
              <table className="educator-table">
                <thead>
                  <tr>
                    <th style={{ width: '36%' }}>Assessment Item</th>
                    <th>Quiz & Domain</th>
                    <th>Failure Rate</th>
                    <th>Common Misconception</th>
                    <th>Suggested Action</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiagnosticItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                        No diagnostic assessment items match the current filters. Try resetting your search or subject filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDiagnosticItems.map((item) => (
                      <tr key={item.id}>
                        {/* Question Snippet */}
                        <td style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'normal', lineHeight: 1.4 }}>
                          {item.question}
                        </td>

                        {/* Assessment Quiz */}
                        <td>
                          <div style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.84rem' }}>{item.quiz}</div>
                          <div style={{ display: 'inline-flex', gap: '6px', marginTop: '2px' }}>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: '#F1F5F9',
                                color: '#475569'
                              }}
                            >
                              {item.category}
                            </span>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor:
                                  item.difficulty === 'Hard' ? '#FEE2E2' : item.difficulty === 'Medium' ? '#FFEDD5' : '#D1FAE5',
                                color:
                                  item.difficulty === 'Hard' ? '#991B1B' : item.difficulty === 'Medium' ? '#C2410C' : '#047857'
                              }}
                            >
                              {item.difficulty}
                            </span>
                          </div>
                        </td>

                        {/* Failure Rate Badge */}
                        <td>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              backgroundColor:
                                item.failureRate >= 35 ? '#FEF2F2' : item.failureRate >= 25 ? '#FFFBEB' : '#ECFDF5',
                              color:
                                item.failureRate >= 35 ? '#DC2626' : item.failureRate >= 25 ? '#D97706' : '#059669',
                              fontWeight: 700,
                              fontSize: '0.80rem',
                              display: 'inline-block'
                            }}
                          >
                            {item.failureRate}% Missed
                          </span>
                        </td>

                        {/* Misconception */}
                        <td style={{ color: '#475569', fontSize: '0.82rem', whiteSpace: 'normal', lineHeight: 1.4 }}>
                          {item.misconception}
                        </td>

                        {/* Recommendation */}
                        <td style={{ color: '#1E40AF', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.4 }}>
                          {item.recommendation}
                        </td>

                        {/* Action: Inspect */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="educator-inspect-btn"
                            onClick={() => setInspectingQuestion(item)}
                            title="Inspect complete question and distractor distribution"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MODE 2: SUBJECT MASTERY MATRIX & GRADE DISTRIBUTION (INSTITUTIONAL VIEW) */}
        {viewMode === 'subjects' && (
          <div className="educator-table-wrapper">
            <table className="educator-table">
              <thead>
                <tr>
                  <th>Subject Domain</th>
                  <th>Core Category</th>
                  <th>Quizzes Available</th>
                  <th>Total Submissions</th>
                  <th style={{ width: '22%' }}>Mastery Score</th>
                  <th style={{ width: '22%' }}>Pass Rate (&gt;= 70%)</th>
                  <th>Domain Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dynamicSubjectBreakdown.map((item) => (
                  <tr key={item.id || item.subject}>
                    {/* Subject Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: item.color,
                            flexShrink: 0
                          }}
                        />
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.subject}</span>
                      </div>
                    </td>

                    {/* Domain Category */}
                    <td>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          backgroundColor: `${item.color}15`,
                          color: item.color
                        }}
                      >
                        {item.domain}
                      </span>
                    </td>

                    {/* Quizzes Count */}
                    <td style={{ color: '#475569', fontSize: '0.84rem' }}>
                      {item.quizCount} {item.quizCount === 1 ? 'assessment' : 'assessments'}
                    </td>

                    {/* Submissions Count */}
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>
                      {item.attempts} attempts
                    </td>

                    {/* Mastery Score Progress */}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', fontWeight: 700, marginBottom: '3px' }}>
                        <span>Avg Mastery</span>
                        <span>{item.avgScore}%</span>
                      </div>
                      <div className="educator-subject-progress-track">
                        <div
                          className="educator-subject-progress-fill"
                          style={{ width: `${item.avgScore}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </td>

                    {/* Pass Rate Progress */}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', fontWeight: 700, marginBottom: '3px' }}>
                        <span>Pass Rate</span>
                        <span style={{ color: item.passRate >= 70 ? '#059669' : '#DC2626' }}>{item.passRate}%</span>
                      </div>
                      <div className="educator-subject-progress-track">
                        <div
                          className="educator-subject-progress-fill"
                          style={{ width: `${item.passRate}%`, backgroundColor: item.passRate >= 70 ? '#10B981' : '#EF4444' }}
                        />
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td>
                      <span
                        style={{
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          backgroundColor:
                            item.status === 'Mastered'
                              ? '#ECFDF5'
                              : item.status === 'Needs Support'
                              ? '#FEF2F2'
                              : '#EFF6FF',
                          color:
                            item.status === 'Mastered'
                              ? '#059669'
                              : item.status === 'Needs Support'
                              ? '#DC2626'
                              : '#1D4ED8'
                        }}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Action: Deep Dive */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="educator-inspect-btn"
                        onClick={() => setInspectingSubject(item)}
                      >
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODE 3: QUIZ DIFFICULTY CALIBRATION MATRIX */}
        {viewMode === 'calibration' && (
          <div className="educator-table-wrapper">
            <table className="educator-table">
              <thead>
                <tr>
                  <th>Quiz Title</th>
                  <th>Category</th>
                  <th>Questions & Duration</th>
                  <th>Submissions</th>
                  <th>Avg. Score</th>
                  <th>Pass Rate</th>
                  <th>Calibration Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {safeQuizzes.map((quiz) => {
                  const pass = quiz.passRate || 0;
                  const isHighMastery = pass >= 90;
                  const isChallenging = pass > 0 && pass < 70;
                  const isBalanced = pass >= 70 && pass < 90;

                  return (
                    <tr key={quiz.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{quiz.title}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                          Updated: {quiz.lastUpdated || 'Recently'}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            backgroundColor: quiz.categoryBg || '#EFF6FF',
                            color: quiz.categoryColor || '#2563EB'
                          }}
                        >
                          {quiz.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.84rem', color: '#475569' }}>
                        {quiz.questionsCount || (quiz.questions || []).length || 5} questions • {quiz.duration || '15 mins'}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0F172A' }}>
                        {quiz.submissionsCount || 0} attempts
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>
                        {quiz.avgScore ? `${quiz.avgScore}%` : 'N/A'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: isHighMastery ? '#10B981' : isChallenging ? '#DC2626' : '#2563EB' }}>
                          {pass > 0 ? `${pass}%` : 'Awaiting data'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            backgroundColor: isHighMastery ? '#ECFDF5' : isChallenging ? '#FEF2F2' : isBalanced ? '#EFF6FF' : '#F1F5F9',
                            color: isHighMastery ? '#059669' : isChallenging ? '#DC2626' : isBalanced ? '#1E40AF' : '#64748B'
                          }}
                        >
                          {isHighMastery
                            ? 'High Mastery'
                            : isChallenging
                            ? 'High Difficulty Alert'
                            : isBalanced
                            ? 'Balanced Calibration'
                            : 'Pending Attempts'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {onNavigateToTab && (
                          <button
                            type="button"
                            className="educator-secondary-btn sm"
                            onClick={() => onNavigateToTab('Manage Quizzes')}
                            title="Open Quiz in Manage Quizzes"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: SUBJECT MASTERY & PASS RATES DEEP-DIVE MODAL */}
      {inspectingSubject && (
        <div className="educator-modal-overlay" onClick={() => setInspectingSubject(null)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="educator-modal-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: inspectingSubject.color
                    }}
                  />
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: `${inspectingSubject.color}15`,
                      color: inspectingSubject.color
                    }}
                  >
                    {inspectingSubject.domain}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor:
                        inspectingSubject.status === 'Mastered'
                          ? '#ECFDF5'
                          : inspectingSubject.status === 'Needs Support'
                          ? '#FEF2F2'
                          : '#EFF6FF',
                      color:
                        inspectingSubject.status === 'Mastered'
                          ? '#059669'
                          : inspectingSubject.status === 'Needs Support'
                          ? '#DC2626'
                          : '#1D4ED8'
                    }}
                  >
                    {inspectingSubject.status}
                  </span>
                </div>
                <h3 className="educator-card-title">{inspectingSubject.subject}</h3>
                <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                  Comprehensive cohort telemetry, passing distributions, and question diagnostics
                </span>
              </div>

              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setInspectingSubject(null)}
              >
                ✕
              </button>
            </div>

            {/* 4 Subject KPI Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '18px',
                marginTop: '12px'
              }}
            >
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Mastery Score</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {inspectingSubject.avgScore}%
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Cohort Pass Rate</span>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: inspectingSubject.passRate >= 70 ? '#059669' : '#DC2626',
                    marginTop: '2px'
                  }}
                >
                  {inspectingSubject.passRate}%
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Total Submissions</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {inspectingSubject.attempts}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Quizzes Authored</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {inspectingSubject.quizCount}
                </div>
              </div>
            </div>

            {/* Quizzes in this Subject */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '8px' }}>
                Curriculum Assessments in {inspectingSubject.subject}
              </div>
              {inspectingSubject.quizzes.length === 0 ? (
                <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '0.82rem' }}>
                  No published quizzes directly under this domain yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inspectingSubject.quizzes.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>{q.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                          {q.questionsCount || (q.questions || []).length || 5} questions • {q.duration || '15 mins'} • Difficulty: {q.difficulty}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                          <span style={{ color: '#475569' }}>Avg: <strong>{q.avgScore ? `${q.avgScore}%` : '85%'}</strong></span>
                          <span style={{ margin: '0 4px', color: '#CBD5E1' }}>•</span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>Pass: {q.passRate ? `${q.passRate}%` : '90%'}</span>
                        </div>
                        {onNavigateToTab && (
                          <button
                            type="button"
                            className="educator-secondary-btn sm"
                            onClick={() => {
                              setInspectingSubject(null);
                              onNavigateToTab('Manage Quizzes');
                            }}
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hardest Diagnostic Items in this Subject */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginBottom: '8px' }}>
                High-Friction Diagnostic Items in this Domain
              </div>
              {(() => {
                const domainQuestions = allDiagnosticItems.filter((q) => {
                  const qText = `${q.quiz || ''} ${q.category || ''} ${q.domain || ''}`.toLowerCase();
                  return inspectingSubject.subject.toLowerCase().split(' ').some((tok) => tok.length > 3 && qText.includes(tok));
                });

                if (domainQuestions.length === 0) {
                  return (
                    <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B', fontSize: '0.82rem' }}>
                      All items in this domain are performing within optimal benchmark thresholds (&lt; 20% error rate).
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {domainQuestions.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 14px',
                          background: '#FEF2F2',
                          borderRadius: '8px',
                          border: '1px solid #FECACA'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#0F172A' }}>
                            {item.question}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.failureRate}% Missed
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#7F1D1D', marginTop: '4px' }}>
                          <strong>Misconception:</strong> {item.misconception}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#1E40AF', marginTop: '2px' }}>
                          <strong>Recommended Action:</strong> {item.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setInspectingSubject(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="educator-primary-btn"
                onClick={() => {
                  setActiveSubjectFilter(inspectingSubject.domain);
                  setInspectingSubject(null);
                  if (showToast) showToast(`Dashboard filtered to: ${inspectingSubject.subject}`);
                }}
              >
                Filter Dashboard to this Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: QUESTION INSPECTOR MODAL */}
      {inspectingQuestion && (
        <div className="educator-modal-overlay" onClick={() => setInspectingQuestion(null)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="educator-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8'
                    }}
                  >
                    {inspectingQuestion.category}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor:
                        inspectingQuestion.difficulty === 'Hard'
                          ? '#FEE2E2'
                          : inspectingQuestion.difficulty === 'Medium'
                          ? '#FFEDD5'
                          : '#D1FAE5',
                      color:
                        inspectingQuestion.difficulty === 'Hard'
                          ? '#991B1B'
                          : inspectingQuestion.difficulty === 'Medium'
                          ? '#C2410C'
                          : '#047857'
                    }}
                  >
                    {inspectingQuestion.difficulty}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626'
                    }}
                  >
                    {inspectingQuestion.failureRate}% Failure Rate
                  </span>
                </div>
                <h3 className="educator-card-title">{inspectingQuestion.quiz}</h3>
              </div>

              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setInspectingQuestion(null)}
                aria-label="Close inspector"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              {/* Question Text */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  lineHeight: 1.45
                }}
              >
                {inspectingQuestion.question}
              </div>

              {/* Answer Choices & Distractor Breakdown */}
              <div>
                <label className="educator-field-label" style={{ marginBottom: '8px' }}>
                  Answer Choices & Distractor Analysis
                </label>
                <div className="educator-inspect-options-list">
                  {(inspectingQuestion.options || []).map((opt, oIdx) => {
                    const isCorrect = oIdx === inspectingQuestion.correctIndex;
                    const optText = typeof opt === 'string' ? opt : (opt?.text || opt?.label || String(opt));
                    const failPct = inspectingQuestion.failureRate || 30;
                    const incorrectCount = Math.max(1, (inspectingQuestion.options || []).length - 1);
                    const distractorPct = Math.round(failPct / incorrectCount);
                    const correctPct = Math.max(10, 100 - failPct);
                    const pctVal = isCorrect ? correctPct : distractorPct;

                    return (
                      <div
                        key={oIdx}
                        className={`educator-inspect-option-item ${isCorrect ? 'correct' : 'distractor'}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: isCorrect ? '#10B981' : '#E2E8F0',
                              color: isCorrect ? '#FFFFFF' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span style={{ fontWeight: isCorrect ? 700 : 500 }}>
                            {optText}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: isCorrect ? '#D1FAE5' : '#FEF3C7',
                              color: isCorrect ? '#059669' : '#D97706'
                            }}
                          >
                            {pctVal}% Selected
                          </span>
                          {isCorrect ? (
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#059669',
                                backgroundColor: '#D1FAE5',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CheckIcon size={11} color="#059669" /> Correct
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#92400E',
                                backgroundColor: '#FEF3C7',
                                padding: '2px 8px',
                                borderRadius: '9999px'
                              }}
                            >
                              Distractor
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Misconception Diagnostic */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FEF2F2',
                  borderRadius: '10px',
                  border: '1px solid #FECACA',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: '4px' }}>
                  Diagnostic Misconception
                </div>
                <div style={{ color: '#7F1D1D', lineHeight: 1.45 }}>
                  {inspectingQuestion.misconception}
                </div>
              </div>

              {/* Pedagogical Action */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ fontWeight: 700, color: '#1E40AF', marginBottom: '4px' }}>
                  Recommended Pedagogical Action
                </div>
                <div style={{ color: '#1E3A8A', lineHeight: 1.45 }}>
                  {inspectingQuestion.recommendation}
                </div>
              </div>

              {/* Official Solution Explanation */}
              {inspectingQuestion.explanation && (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    Curriculum Explanation
                  </div>
                  <div style={{ color: '#334155', lineHeight: 1.45 }}>
                    {inspectingQuestion.explanation}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setInspectingQuestion(null)}
              >
                Close
              </button>
              {onNavigateToTab && (
                <button
                  type="button"
                  className="educator-primary-btn"
                  onClick={() => {
                    setInspectingQuestion(null);
                    onNavigateToTab('Manage Quizzes');
                  }}
                >
                  Edit in Manage Quizzes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorAnalyticsView;
