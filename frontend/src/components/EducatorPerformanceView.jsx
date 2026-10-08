import React, { useState } from 'react';
import {
  SearchIcon,
  CheckCircleIcon,
  StarIcon,
  TargetIcon,
  XIcon,
  TrashIcon
} from './Icons';
import { sharedDatabase } from '../services/sharedDatabase';

export const EducatorPerformanceView = ({
  students = [],
  showToast,
  externalSearch = '',
  onAddStudent,
  onRemoveStudent,
  onClearAllStudents,
  onResetStudent
}) => {
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('score-desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [studentToReset, setStudentToReset] = useState(null);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    studentId: '',
    topSubject: 'Python Basics',
    status: 'On Track',
    phone: ''
  });

  // Filtering
  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        !searchQuery.trim() ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.topSubject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || student.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'score-desc') return b.avgScore - a.avgScore;
      if (sortBy === 'score-asc') return a.avgScore - b.avgScore;
      if (sortBy === 'quizzes-desc') return b.quizzesCompleted - a.quizzesCompleted;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  // Cohort summary calculations
  const totalCount = students.length;
  const avgCohortScore =
    totalCount > 0
      ? (students.reduce((sum, s) => sum + s.avgScore, 0) / totalCount).toFixed(1)
      : 0;
  const topPerformersCount = students.filter((s) => s.status === 'Top Performer').length;
  const atRiskCount = students.filter((s) => s.status === 'Needs Support').length;
  const onTrackCount = students.filter((s) => s.status === 'On Track').length;

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Name', 'Email', 'Quizzes Completed', 'Average Score (%)', 'Top Subject', 'Status', 'Last Active'];
    const rows = filteredStudents.map((s) => [
      s.studentId,
      `"${s.name}"`,
      s.email,
      s.quizzesCompleted,
      s.avgScore,
      `"${s.topSubject}"`,
      s.status,
      s.lastActive
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Performance_Cohort_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) showToast('Student performance records exported successfully (CSV)!');
  };

  const handleDownloadStudentPDF = (student) => {
    if (!student) return;
    if (showToast) showToast(`Generating PDF performance report for ${student.name}...`);

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const masteryRows = (
      student.subjectMastery && student.subjectMastery.length > 0
        ? student.subjectMastery
        : [
            { subject: student.topSubject || 'Core Concepts', score: student.avgScore || 85 },
            { subject: 'Problem Solving & Logic', score: Math.min(100, Math.round((student.avgScore || 80) * 0.95)) },
            { subject: 'Applied Technical Practice', score: Math.min(100, Math.round((student.avgScore || 75) * 0.9)) }
          ]
    )
      .map(
        (m) => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${m.subject}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 700; color: #0F172A;">${m.score}%</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: ${
              m.score >= 85 ? '#D1FAE5' : m.score >= 70 ? '#EFF6FF' : '#FEF3C7'
            }; color: ${
              m.score >= 85 ? '#047857' : m.score >= 70 ? '#1D4ED8' : '#B45309'
            };">
              ${m.score >= 85 ? 'Mastered' : m.score >= 70 ? 'Proficient' : 'Needs Reinforcement'}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const recentSubmissionsRows = (
      student.recentSubmissions && student.recentSubmissions.length > 0
        ? student.recentSubmissions
        : [
            {
              title: `${student.topSubject || 'General'} Diagnostic Assessment`,
              score: `${student.avgScore || 85}%`,
              status: 'Completed',
              date: student.lastActive || 'Recent'
            }
          ]
    )
      .map(
        (sub) => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${sub.title}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${sub.date}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: 700; color: #0F172A;">${sub.score}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #DCFCE7; color: #15803D;">
              ${sub.status}
            </span>
          </td>
        </tr>
      `
      )
      .join('');

    const feedbackText = student.feedbackNote || (student.name + ' demonstrates solid mastery in ' + (student.topSubject || 'Core Concepts') + ' with an average score of ' + student.avgScore + '%. Recommended to continue participating in advanced adaptive challenge modules.');

    const htmlContent = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <title>' + student.name + ' - Performance Report</title>' +
'  <style>' +
'    @page { size: A4 portrait; margin: 15mm; }' +
'    * { box-sizing: border-box; }' +
'    body {' +
'      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;' +
'      color: #0F172A;' +
'      margin: 0;' +
'      padding: 24px;' +
'      background: #FFFFFF;' +
'      -webkit-print-color-adjust: exact !important;' +
'      print-color-adjust: exact !important;' +
'    }' +
'    .header-bar {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: flex-start;' +
'      border-bottom: 2px solid #2563EB;' +
'      padding-bottom: 16px;' +
'      margin-bottom: 20px;' +
'    }' +
'    .brand-title {' +
'      font-size: 24px;' +
'      font-weight: 800;' +
'      color: #2563EB;' +
'      margin: 0;' +
'    }' +
'    .brand-sub {' +
'      font-size: 13px;' +
'      color: #64748B;' +
'      margin-top: 4px;' +
'    }' +
'    .doc-badge { text-align: right; }' +
'    .doc-badge h2 {' +
'      margin: 0;' +
'      font-size: 16px;' +
'      font-weight: 700;' +
'      color: #0F172A;' +
'      text-transform: uppercase;' +
'    }' +
'    .doc-badge p {' +
'      margin: 4px 0 0 0;' +
'      font-size: 12px;' +
'      color: #64748B;' +
'    }' +
'    .student-card {' +
'      background: #F8FAFC;' +
'      border: 1px solid #E2E8F0;' +
'      border-radius: 12px;' +
'      padding: 16px 20px;' +
'      margin-bottom: 20px;' +
'      display: grid;' +
'      grid-template-columns: repeat(4, 1fr);' +
'      gap: 16px;' +
'    }' +
'    .info-item label {' +
'      display: block;' +
'      font-size: 11px;' +
'      text-transform: uppercase;' +
'      color: #64748B;' +
'      font-weight: 700;' +
'      margin-bottom: 4px;' +
'    }' +
'    .info-item span {' +
'      font-size: 15px;' +
'      font-weight: 700;' +
'      color: #0F172A;' +
'    }' +
'    .metrics-grid {' +
'      display: grid;' +
'      grid-template-columns: repeat(4, 1fr);' +
'      gap: 12px;' +
'      margin-bottom: 22px;' +
'    }' +
'    .metric-box {' +
'      border: 1px solid #E2E8F0;' +
'      border-radius: 10px;' +
'      padding: 12px;' +
'      text-align: center;' +
'      background: #FFFFFF;' +
'    }' +
'    .metric-value {' +
'      font-size: 22px;' +
'      font-weight: 800;' +
'      color: #2563EB;' +
'      margin-top: 4px;' +
'    }' +
'    .metric-label {' +
'      font-size: 12px;' +
'      color: #64748B;' +
'      font-weight: 600;' +
'    }' +
'    .section-title {' +
'      font-size: 15px;' +
'      font-weight: 700;' +
'      color: #0F172A;' +
'      margin: 18px 0 10px 0;' +
'      border-left: 4px solid #2563EB;' +
'      padding-left: 10px;' +
'    }' +
'    table {' +
'      width: 100%;' +
'      border-collapse: collapse;' +
'      margin-bottom: 20px;' +
'      font-size: 13px;' +
'    }' +
'    th {' +
'      background: #F1F5F9;' +
'      color: #475569;' +
'      text-align: left;' +
'      padding: 10px 14px;' +
'      font-weight: 700;' +
'      font-size: 11px;' +
'      text-transform: uppercase;' +
'      border-bottom: 1px solid #CBD5E1;' +
'    }' +
'    .feedback-box {' +
'      background: #F0FDF4;' +
'      border: 1px solid #BBF7D0;' +
'      border-radius: 10px;' +
'      padding: 14px 18px;' +
'      margin-bottom: 24px;' +
'    }' +
'    .feedback-box h4 {' +
'      margin: 0 0 6px 0;' +
'      color: #166534;' +
'      font-size: 13px;' +
'      font-weight: 700;' +
'    }' +
'    .feedback-box p {' +
'      margin: 0;' +
'      color: #15803D;' +
'      font-size: 13px;' +
'      line-height: 1.5;' +
'    }' +
'    .footer-bar {' +
'      margin-top: 24px;' +
'      border-top: 1px solid #E2E8F0;' +
'      padding-top: 14px;' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      font-size: 11px;' +
'      color: #94A3B8;' +
'    }' +
'    .seal {' +
'      font-weight: 700;' +
'      color: #2563EB;' +
'      border: 1px solid #BFDBFE;' +
'      padding: 5px 10px;' +
'      border-radius: 6px;' +
'      background: #EFF6FF;' +
'    }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header-bar">' +
'    <div>' +
'      <h1 class="brand-title">LearnSmart</h1>' +
'      <div class="brand-sub">Adaptive Learning &amp; Assessment System &bull; Official Student Performance Transcript</div>' +
'    </div>' +
'    <div class="doc-badge">' +
'      <h2>Academic Evaluation</h2>' +
'      <p>Issued: ' + currentDate + '</p>' +
'    </div>' +
'  </div>' +
'  <div class="student-card">' +
'    <div class="info-item">' +
'      <label>Student Name</label>' +
'      <span>' + student.name + '</span>' +
'    </div>' +
'    <div class="info-item">' +
'      <label>Student ID</label>' +
'      <span>' + student.studentId + '</span>' +
'    </div>' +
'    <div class="info-item">' +
'      <label>Email Address</label>' +
'      <span style="font-size: 13px;">' + student.email + '</span>' +
'    </div>' +
'    <div class="info-item">' +
'      <label>Academic Status</label>' +
'      <span style="color: ' + (student.avgScore >= 85 ? '#047857' : '#1D4ED8') + '">' + student.status + '</span>' +
'    </div>' +
'  </div>' +
'  <div class="metrics-grid">' +
'    <div class="metric-box">' +
'      <div class="metric-label">Quizzes Completed</div>' +
'      <div class="metric-value">' + student.quizzesCompleted + '</div>' +
'    </div>' +
'    <div class="metric-box">' +
'      <div class="metric-label">Average Score</div>' +
'      <div class="metric-value">' + student.avgScore + '%</div>' +
'    </div>' +
'    <div class="metric-box">' +
'      <div class="metric-label">Highest Score</div>' +
'      <div class="metric-value" style="color: #059669;">' + (student.highestScore || student.avgScore) + '%</div>' +
'    </div>' +
'    <div class="metric-box">' +
'      <div class="metric-label">Top Subject</div>' +
'      <div class="metric-value" style="font-size: 15px; color: #7C3AED; line-height: 28px;">' + student.topSubject + '</div>' +
'    </div>' +
'  </div>' +
'  <h3 class="section-title">Subject Mastery &amp; Competency Diagnostic</h3>' +
'  <table>' +
'    <thead>' +
'      <tr>' +
'        <th>Subject Domain</th>' +
'        <th style="text-align: center;">Mastery Score</th>' +
'        <th style="text-align: right;">Proficiency Level</th>' +
'      </tr>' +
'    </thead>' +
'    <tbody>' +
        masteryRows +
'    </tbody>' +
'  </table>' +
'  <h3 class="section-title">Recent Quiz Assessments &amp; Testing History</h3>' +
'  <table>' +
'    <thead>' +
'      <tr>' +
'        <th>Assessment Title</th>' +
'        <th>Date Attempted</th>' +
'        <th style="text-align: center;">Score</th>' +
'        <th style="text-align: right;">Status</th>' +
'      </tr>' +
'    </thead>' +
'    <tbody>' +
        recentSubmissionsRows +
'    </tbody>' +
'  </table>' +
'  <div class="feedback-box">' +
'    <h4>Educator Evaluation &amp; Diagnostic Note</h4>' +
'    <p>' + feedbackText + '</p>' +
'  </div>' +
'  <div class="footer-bar">' +
'    <div>' +
'      Verified by Department of Academic Evaluation &bull; LearnSmart Educational Platform' +
'    </div>' +
'    <div class="seal">' +
'      AUTHENTICATED: LS-2025-' + student.studentId +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to popup window:', err);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(htmlContent);
          win.document.close();
          win.focus();
          win.print();
        }
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 2000);
      }
    }, 300);
  };

  const handleSendFeedback = (e) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;
    if (showToast) {
      showToast(`Guidance note sent to ${selectedStudent.name}!`);
    }
    setFeedbackInput('');
  };

  const handleCreateStudent = (e) => {
    e.preventDefault();
    if (!newStudentForm.name.trim()) {
      if (showToast) showToast('Please enter the student\'s full name.');
      return;
    }
    if (!newStudentForm.email.trim()) {
      if (showToast) showToast('Please enter the student\'s email.');
      return;
    }

    if (onAddStudent) {
      onAddStudent(newStudentForm);
    }
    setOpenAddModal(false);
    setNewStudentForm({
      name: '',
      email: '',
      studentId: '',
      topSubject: 'Python Basics',
      status: 'On Track',
      phone: ''
    });
  };

  const handleConfirmRemove = () => {
    if (studentToRemove && onRemoveStudent) {
      onRemoveStudent(studentToRemove.id);
      if (selectedStudent && selectedStudent.id === studentToRemove.id) {
        setSelectedStudent(null);
      }
    }
    setStudentToRemove(null);
  };

  const handleConfirmReset = () => {
    if (studentToReset) {
      if (onResetStudent) {
        onResetStudent(studentToReset.id);
      } else {
        sharedDatabase.resetStudent(studentToReset.id);
      }
      if (selectedStudent && selectedStudent.id === studentToReset.id) {
        setSelectedStudent((prev) => ({
          ...prev,
          quizzesCompleted: 0,
          avgScore: 0,
          highestScore: 0,
          status: 'On Track',
          statusVariant: 'info',
          lastActive: 'Reset just now',
          recentSubmissions: [],
          subjectMastery: (prev.subjectMastery || []).map((m) => ({ ...m, score: 0 }))
        }));
      }
      if (showToast) {
        showToast(`Performance progress for ${studentToReset.name} has been reset.`);
      }
    }
    setStudentToReset(null);
  };

  const renderStatusBadge = (status) => {
    let bg = '#ECFDF5';
    let color = '#065F46';
    if (status === 'On Track') {
      bg = '#EFF6FF';
      color = '#1D4ED8';
    } else if (status === 'Needs Support') {
      bg = '#FEF2F2';
      color = '#DC2626';
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: bg,
          color: color
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="educator-section-view">
      {/* Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Student Performance</h1>
          <p className="educator-section-subtitle">
            Monitor mastery levels, track individual score trajectories, and identify students needing academic assistance.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="educator-secondary-btn"
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export Cohort CSV</span>
          </button>
        </div>
      </div>

      {/* Cohort KPI Stat Cards */}
      <div className="educator-stat-grid" style={{ marginBottom: '22px' }}>
        <div className="educator-stat-card card-blue">
          <div className="educator-stat-icon-wrap">
            <TargetIcon size={24} color="#2563EB" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Cohort Average Score</span>
            <div className="educator-stat-value">{avgCohortScore}%</div>
          </div>
        </div>

        <div className="educator-stat-card card-green">
          <div className="educator-stat-icon-wrap">
            <StarIcon size={24} color="#10B981" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Top Performers (≥85%)</span>
            <div className="educator-stat-value">{topPerformersCount}</div>
          </div>
        </div>

        <div className="educator-stat-card card-amber">
          <div className="educator-stat-icon-wrap">
            <CheckCircleIcon size={24} color="#F59E0B" />
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">On Track (70–84%)</span>
            <div className="educator-stat-value">{onTrackCount}</div>
          </div>
        </div>

        <div className="educator-stat-card card-purple">
          <div className="educator-stat-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="educator-stat-details">
            <span className="educator-stat-title">Needs Support (&lt;70%)</span>
            <div className="educator-stat-value" style={{ color: '#DC2626' }}>
              {atRiskCount}
            </div>
          </div>
        </div>
      </div>

      {/* Mastery Tier Distribution Bar */}
      <div className="educator-content-card" style={{ marginBottom: '22px' }}>
        <h3 className="educator-card-title" style={{ marginBottom: '14px' }}>
          Cohort Mastery Tier Distribution
        </h3>
        <div style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#F1F5F9' }}>
          {totalCount > 0 ? (
            <>
              <div
                style={{
                  width: `${(topPerformersCount / totalCount) * 100}%`,
                  backgroundColor: '#10B981',
                  transition: 'width 0.3s ease'
                }}
                title={`Top Performers: ${topPerformersCount}`}
              />
              <div
                style={{
                  width: `${(onTrackCount / totalCount) * 100}%`,
                  backgroundColor: '#3B82F6',
                  transition: 'width 0.3s ease'
                }}
                title={`On Track: ${onTrackCount}`}
              />
              <div
                style={{
                  width: `${(atRiskCount / totalCount) * 100}%`,
                  backgroundColor: '#EF4444',
                  transition: 'width 0.3s ease'
                }}
                title={`Needs Support: ${atRiskCount}`}
              />
            </>
          ) : (
            <div style={{ width: '100%', backgroundColor: '#E2E8F0' }} title="No enrolled students" />
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ color: '#334155' }}>
              Top Performers (≥85%): <strong>{topPerformersCount} students</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
            <span style={{ color: '#334155' }}>
              On Track (70–84%): <strong>{onTrackCount} students</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            <span style={{ color: '#334155' }}>
              Needs Support (&lt;70%): <strong>{atRiskCount} students</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="educator-filter-toolbar">
        <div className="educator-filter-search-box">
          <SearchIcon size={18} color="#64748B" />
          <input
            type="text"
            placeholder="Search students by name, email, student ID, top subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="educator-clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <XIcon size={14} color="#64748B" />
            </button>
          )}
        </div>

        <div className="educator-filter-selects">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="educator-select-input"
          >
            <option value="All">Status: All</option>
            <option value="Top Performer">Top Performers</option>
            <option value="On Track">On Track</option>
            <option value="Needs Support">Needs Support</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="educator-select-input"
          >
            <option value="score-desc">Sort: Highest Score</option>
            <option value="score-asc">Sort: Lowest Score</option>
            <option value="quizzes-desc">Sort: Most Quizzes</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Students Directory Table Card */}
      <div className="educator-content-card">
        <div className="educator-table-header-row">
          <div>
            <h2 className="educator-card-title" style={{ margin: 0 }}>
              Enrolled Students Directory ({filteredStudents.length})
            </h2>
            <span style={{ fontSize: '0.84rem', color: '#64748B' }}>
              Showing active course roster
            </span>
          </div>
        </div>

        <div className="educator-table-wrapper">
          <table className="educator-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Quizzes Taken</th>
                <th>Average Score</th>
                <th>Top Subject</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0
                          }}
                        >
                          {student.avatarInitials}
                        </div>
                        <div>
                          <div className="educator-student-name">{student.name}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                      {student.studentId}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>
                      {student.quizzesCompleted}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '6px',
                            borderRadius: '3px',
                            background: '#E2E8F0',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${student.avgScore}%`,
                              height: '100%',
                              backgroundColor:
                                student.avgScore >= 85
                                  ? '#10B981'
                                  : student.avgScore >= 70
                                  ? '#3B82F6'
                                  : '#EF4444'
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{student.avgScore}%</span>
                      </div>
                    </td>
                    <td style={{ color: '#334155', fontWeight: 500 }}>{student.topSubject}</td>
                    <td>{renderStatusBadge(student.status)}</td>
                    <td className="educator-date-cell">{student.lastActive}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="educator-secondary-btn sm"
                          onClick={() => setSelectedStudent(student)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="educator-pdf-btn sm"
                          onClick={() => handleDownloadStudentPDF(student)}
                          title={`Download ${student.name}'s performance PDF`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <path d="M12 18v-6"></path>
                            <path d="M9 15l3 3 3-3"></path>
                          </svg>
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          className="educator-reset-btn sm"
                          onClick={() => setStudentToReset(student)}
                          title={`Reset ${student.name}'s performance records`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                          <span>Reset</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px 20px', color: '#94A3B8' }}>
                    {students.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#64748B' }}>
                          No enrolled students in the directory.
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                          Enrolled students will appear here automatically.
                        </span>
                      </div>
                    ) : (
                      `No students found matching "${searchQuery}".`
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Student Drilldown Details */}
      {selectedStudent && (
        <div
          className="educator-modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="educator-modal-box"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.05rem'
                  }}
                >
                  {selectedStudent.avatarInitials}
                </div>
                <div>
                  <h3 className="educator-card-title" style={{ margin: 0 }}>
                    {selectedStudent.name}
                  </h3>
                  <span style={{ fontSize: '0.80rem', color: '#64748B' }}>
                    {selectedStudent.studentId} • {selectedStudent.email}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="educator-pdf-btn sm"
                  onClick={() => handleDownloadStudentPDF(selectedStudent)}
                  title="Download Performance PDF Report"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M12 18v-6"></path>
                    <path d="M9 15l3 3 3-3"></path>
                  </svg>
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  className="educator-reset-btn sm"
                  onClick={() => setStudentToReset(selectedStudent)}
                  title="Reset Student Performance"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  className="educator-modal-close-btn"
                  onClick={() => setSelectedStudent(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Average Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {selectedStudent.avgScore}%
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quizzes Taken</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                  {selectedStudent.quizzesCompleted}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Performance Status</div>
                <div style={{ marginTop: '4px' }}>{renderStatusBadge(selectedStudent.status)}</div>
              </div>
            </div>

            {/* Subject Mastery Progress Bars */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Subject Mastery Breakdown
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedStudent.subjectMastery &&
                  selectedStudent.subjectMastery.map((sub) => (
                    <div key={sub.subject}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{sub.subject}</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{sub.score}%</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${sub.score}%`,
                            height: '100%',
                            backgroundColor: sub.score >= 85 ? '#10B981' : sub.score >= 70 ? '#3B82F6' : '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent Submissions */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Recent Quiz Attempts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedStudent.recentSubmissions &&
                  selectedStudent.recentSubmissions.map((sub, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#1E293B' }}>{sub.title}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{sub.date}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{sub.score}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Educator Guidance Note Form */}
            <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                Send Guidance / Mentoring Feedback
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#475569' }}>
                {selectedStudent.feedbackNote}
              </p>
              <form onSubmit={handleSendFeedback} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type guidance note for this student..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="educator-text-input"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
                />
                <button type="submit" className="educator-primary-btn" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
                  Send
                </button>
              </form>
            </div>

            {/* Remove student footer */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
              <button
                type="button"
                className="educator-danger-btn sm"
                onClick={() => setStudentToRemove(selectedStudent)}
              >
                <TrashIcon size={14} color="#DC2626" />
                <span>Remove Student from Roster</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Student Modal */}
      {openAddModal && (
        <div className="educator-modal-overlay" onClick={() => setOpenAddModal(false)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title" style={{ margin: 0 }}>
                + Add New Student to Cohort
              </h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setOpenAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className="educator-text-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.sharma@learnsmart.edu"
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  className="educator-text-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Student ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={newStudentForm.studentId}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentId: e.target.value })}
                    className="educator-text-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    className="educator-text-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Primary Subject
                  </label>
                  <select
                    value={newStudentForm.topSubject}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, topSubject: e.target.value })}
                    className="educator-select-input"
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="Python Basics">Python Basics</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Web Security">Web Security</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Cloud Computing">Cloud Computing</option>
                    <option value="General">General / Onboarding</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Initial Status
                  </label>
                  <select
                    value={newStudentForm.status}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, status: e.target.value })}
                    className="educator-select-input"
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="On Track">On Track</option>
                    <option value="Top Performer">Top Performer</option>
                    <option value="Needs Support">Needs Support</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="educator-secondary-btn"
                  onClick={() => setOpenAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="educator-primary-btn"
                >
                  Save & Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Removal Modal */}
      {studentToRemove && (
        <div className="educator-modal-overlay" onClick={() => setStudentToRemove(null)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title" style={{ margin: 0, color: '#DC2626' }}>
                Remove Student from Active Roster?
              </h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setStudentToRemove(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: '14px 0' }}>
              Are you sure you want to remove <strong>{studentToRemove.name}</strong> ({studentToRemove.email}) from the active cohort?
              They will be removed from your student directory and will no longer have access to the student dashboard.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setStudentToRemove(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="educator-danger-btn"
                onClick={handleConfirmRemove}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Reset Performance Modal */}
      {studentToReset && (
        <div className="educator-modal-overlay" onClick={() => setStudentToReset(null)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <h3 className="educator-card-title" style={{ margin: 0, color: '#EA580C' }}>
                Reset Student Performance?
              </h3>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setStudentToReset(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, margin: '14px 0' }}>
              Are you sure you want to reset all quiz progress and performance records for <strong>{studentToReset.name}</strong> ({studentToReset.email})?
              Their average score, completed quizzes, and recent submissions will be reset to initial state.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setStudentToReset(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="educator-reset-confirm-btn"
                onClick={handleConfirmReset}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EducatorPerformanceView;
