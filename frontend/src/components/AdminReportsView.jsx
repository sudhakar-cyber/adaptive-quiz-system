import React, { useState } from 'react';
import {
  FileTextIcon,
  CheckCircleIcon,
  ActivityIcon,
  BookOpenIcon,
  UsersIcon,
  TrophyIcon
} from './Icons';
import sharedDatabase from '../services/sharedDatabase';

export const AdminReportsView = ({
  students = [],
  educators = [],
  quizzes = [],
  stats = {}
}) => {
  const [downloading, setDownloading] = useState(null);

  const safeStudents = Array.isArray(students) && students.length > 0 ? students : (typeof sharedDatabase?.getStudents === 'function' ? sharedDatabase.getStudents() : []);
  const safeEducators = Array.isArray(educators) && educators.length > 0 ? educators : (typeof sharedDatabase?.getEducators === 'function' ? sharedDatabase.getEducators() : []);
  const safeQuizzes = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes : (typeof sharedDatabase?.getQuizzes === 'function' ? sharedDatabase.getQuizzes() : []);

  const handleDownload = (reportType) => {
    setDownloading(reportType);
    setTimeout(() => {
      // Create downloadable CSV simulation
      let csvContent = "data:text/csv;charset=utf-8,";
      if (reportType === 'students') {
        csvContent += "Student Name,Email,Student ID,Quizzes Completed,Avg Score,Status\n";
        safeStudents.forEach((s) => {
          csvContent += `"${s.name}","${s.email}","${s.studentId || 'N/A'}",${s.quizzesCompleted || 0},${s.avgScore || 0}%,"${s.status || 'Active'}"\n`;
        });
      } else if (reportType === 'quizzes') {
        csvContent += "Quiz Title,Category,Created By,Submissions,Avg Score,Status\n";
        safeQuizzes.forEach((q) => {
          csvContent += `"${q.title}","${q.category}","${q.createdBy || 'Educator'}",${q.submissionsCount || 0},${q.avgScore || 0}%,"${q.status || 'Active'}"\n`;
        });
      } else {
        csvContent += "Metric,Value\n";
        csvContent += `Total Users,${stats.totalUsers || 482}\n`;
        csvContent += `Total Quizzes,${stats.totalQuizzes || 87}\n`;
        csvContent += `System Health,${stats.systemHealth || 'Online'}\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `learnsmart_${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
    }, 600);
  };

  const reportsList = [
    {
      id: 'students',
      title: 'Student Performance & Mastery Audit',
      desc: 'Export complete performance records, average scores, and completion rates across all enrolled students.',
      records: `${safeStudents.length} Students`,
      badge: 'Academic Audit',
      color: '#3B82F6'
    },
    {
      id: 'quizzes',
      title: 'Curriculum & Quiz Effectiveness Report',
      desc: 'Analyze question difficulty, failure rates, time spent, and student mastery per quiz topic.',
      records: `${safeQuizzes.length} Quizzes`,
      badge: 'Curriculum Health',
      color: '#10B981'
    },
    {
      id: 'system',
      title: 'Platform Infrastructure & System Logs',
      desc: 'System uptime metrics, authentication telemetry, and real-time database sync logs.',
      records: '99.98% Uptime',
      badge: 'Infrastructure',
      color: '#8B5CF6'
    }
  ];

  return (
    <div className="admin-management-container">
      <div className="management-header">
        <div>
          <h1 className="management-title">System Reports</h1>
          <p className="management-subtitle">
            Generate and export institutional compliance, performance, and platform operational reports
          </p>
        </div>
      </div>

      <div className="reports-grid">
        {reportsList.map((rep) => (
          <div key={rep.id} className="report-card">
            <div className="report-card-top">
              <span className="report-badge" style={{ backgroundColor: `${rep.color}15`, color: rep.color }}>
                {rep.badge}
              </span>
              <span className="report-records-count">{rep.records}</span>
            </div>
            <h3 className="report-title">{rep.title}</h3>
            <p className="report-desc">{rep.desc}</p>
            <button
              className="report-download-btn"
              disabled={downloading === rep.id}
              onClick={() => handleDownload(rep.id)}
            >
              <FileTextIcon size={16} color="currentColor" />
              <span>{downloading === rep.id ? 'Generating CSV...' : 'Download CSV Report'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="admin-table-card" style={{ marginTop: '28px' }}>
        <div className="table-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
            Recent Administrative Audit Trail
          </h3>
        </div>
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Target Resource</th>
                <th>Executed By</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="admin-table-row">
                <td><strong>Quiz Published</strong></td>
                <td>Data Structures Mastery</td>
                <td>Course Educator</td>
                <td>Today, 14:22</td>
                <td><span className="status-badge active">Success</span></td>
              </tr>
              <tr className="admin-table-row">
                <td><strong>User Account Verified</strong></td>
                <td>Student Registration</td>
                <td>System Auto-Verify</td>
                <td>Today, 11:05</td>
                <td><span className="status-badge active">Success</span></td>
              </tr>
              <tr className="admin-table-row">
                <td><strong>Role Check Triggered</strong></td>
                <td>Admin Dashboard Gateway</td>
                <td>System Admin</td>
                <td>Today, 09:12</td>
                <td><span className="status-badge active">Authorized</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsView;
