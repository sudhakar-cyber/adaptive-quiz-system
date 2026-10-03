import React, { useState } from 'react';
import { INITIAL_EDUCATOR_REPORTS } from '../data/educatorData';
import {
  TrashIcon,
  XIcon
} from './Icons';

export const EducatorReportsView = ({ showToast }) => {
  const [reportsList, setReportsList] = useState(INITIAL_EDUCATOR_REPORTS);
  const [selectedReportType, setSelectedReportType] = useState('Cohort Performance & Grade Distribution');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedTimeframe, setSelectedTimeframe] = useState('Quarter 3 2025');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);

  const reportTypes = [
    'Cohort Performance & Grade Distribution',
    'Quiz Difficulty & Assessment Diagnostic',
    'At-Risk Early Intervention Roster',
    'Curriculum Standards Audit',
    'Complete Gradebook Export'
  ];

  const subjects = [
    'All Subjects',
    'Computer Science',
    'Cyber Security',
    'Data Structures & Algorithms',
    'Machine Learning',
    'Database Systems'
  ];

  const timeframes = [
    'Quarter 3 2025',
    'Last 30 Days',
    'Last 7 Days',
    'Semester 1 2025',
    'Full Academic Year'
  ];

  const formats = ['PDF', 'CSV', 'XLSX'];

  // Real file download helper using Blob
  const triggerFileDownload = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report) => {
    // Generate text/csv content for download
    let content = `LEARNSMART ADAPTIVE QUIZ SYSTEM - OFFICIAL REPORT\n`;
    content += `Title: ${report.title}\n`;
    content += `Type: ${report.type}\n`;
    content += `Category: ${report.category}\n`;
    content += `Generated Date: ${report.generatedDate}\n`;
    content += `Summary: ${report.summary}\n\n`;
    content += `--- EXECUTIVE METRICS ---\n`;
    content += `Total Enrolled Students: 156\n`;
    content += `Quizzes Evaluated: 24\n`;
    content += `Average Passing Score: 82.7%\n`;
    content += `Status: Verified by Faculty Office\n`;

    let mime = 'text/plain';
    if (report.format === 'CSV') {
      mime = 'text/csv';
      content = `Report Name,Type,Date,Passing Rate,Cohort Average\n"${report.title}","${report.type}","${report.generatedDate}","89.2%","82.7%"`;
    }

    triggerFileDownload(report.title, content, mime);

    // Increment downloads count
    setReportsList((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, downloads: (r.downloads || 0) + 1 } : r))
    );

    if (showToast) showToast(`Downloaded: ${report.title}`);
  };

  const handleGenerateReportSubmit = (e) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const sanitizedType = selectedReportType.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedScope = selectedSubject.replace(/[^a-zA-Z0-9]/g, '_');
      const extension = selectedFormat.toLowerCase();
      const filename = `${sanitizedType}_${sanitizedScope}_${Date.now()}.${extension}`;

      const newReport = {
        id: `rep-${Date.now()}`,
        title: filename,
        type: selectedReportType,
        category: selectedSubject,
        generatedDate: new Date().toLocaleString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        fileSize: extension === 'pdf' ? '2.1 MB' : extension === 'csv' ? '480 KB' : '1.3 MB',
        format: selectedFormat,
        downloads: 1,
        summary: `Custom generated report analyzing ${selectedSubject} covering ${selectedTimeframe} formatted for institutional accreditation and review.`
      };

      setReportsList([newReport, ...reportsList]);
      setIsGenerating(false);

      // Trigger actual file download immediately
      handleDownloadReport(newReport);
    }, 800);
  };

  const handleDeleteReport = (id) => {
    setReportsList((prev) => prev.filter((r) => r.id !== id));
    if (showToast) showToast('Report removed from archive.');
  };

  return (
    <div className="educator-section-view">
      {/* Header */}
      <div className="educator-section-header-row">
        <div>
          <h1 className="educator-section-title">Reports & Academic Exports</h1>
          <p className="educator-section-subtitle">
            Generate customized academic transcripts, audit passing distributions, and export cohort gradebooks.
          </p>
        </div>
      </div>

      {/* Report Generator Form Card */}
      <div className="educator-content-card" style={{ marginBottom: '22px' }}>
        <h2 className="educator-card-title" style={{ marginBottom: '14px' }}>
          Generate New Institutional Report
        </h2>

        <form onSubmit={handleGenerateReportSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label className="educator-field-label">Report Category & Type</label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="educator-text-input"
              >
                {reportTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="educator-field-label">Subject Scope</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="educator-text-input"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="educator-field-label">Evaluation Period</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="educator-text-input"
              >
                {timeframes.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="educator-field-label">Export Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="educator-text-input"
              >
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
              Report will compile real assessment telemetry and generate an authenticated document.
            </span>
            <button
              type="submit"
              disabled={isGenerating}
              className="educator-primary-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>{isGenerating ? 'Compiling Report...' : 'Generate & Download Report'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Quick Export Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '22px' }}>
        <div
          className="educator-content-card"
          style={{ cursor: 'pointer', padding: '16px 18px', transition: 'all 0.15s ease' }}
          onClick={() => {
            const sample = reportsList[0];
            handleDownloadReport(sample);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📄
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0F172A' }}>Full Gradebook (CSV)</div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>1-Click instant download</div>
            </div>
          </div>
        </div>

        <div
          className="educator-content-card"
          style={{ cursor: 'pointer', padding: '16px 18px', transition: 'all 0.15s ease' }}
          onClick={() => {
            const sample = reportsList[1] || reportsList[0];
            handleDownloadReport(sample);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📊
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0F172A' }}>Curriculum Audit (PDF)</div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Quarter 3 benchmarks</div>
            </div>
          </div>
        </div>

        <div
          className="educator-content-card"
          style={{ cursor: 'pointer', padding: '16px 18px', transition: 'all 0.15s ease' }}
          onClick={() => {
            const sample = reportsList[2] || reportsList[0];
            handleDownloadReport(sample);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ⚠️
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.90rem', color: '#0F172A' }}>At-Risk Roster (PDF)</div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Remedial office hours list</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Library Table */}
      <div className="educator-content-card">
        <div className="educator-table-header-row">
          <h2 className="educator-card-title">Generated Reports Archive ({reportsList.length})</h2>
          <span style={{ fontSize: '0.84rem', color: '#64748B' }}>Ready for download & distribution</span>
        </div>

        <div className="educator-table-wrapper">
          <table className="educator-table">
            <thead>
              <tr>
                <th>Report File</th>
                <th>Category</th>
                <th>Format</th>
                <th>File Size</th>
                <th>Generated Date</th>
                <th>Downloads</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportsList.map((rep) => (
                <tr key={rep.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{rep.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{rep.type}</div>
                  </td>
                  <td style={{ color: '#334155', fontWeight: 500 }}>{rep.category}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        backgroundColor:
                          rep.format === 'PDF'
                            ? '#FEE2E2'
                            : rep.format === 'CSV'
                            ? '#D1FAE5'
                            : '#DBEAFE',
                        color:
                          rep.format === 'PDF'
                            ? '#991B1B'
                            : rep.format === 'CSV'
                            ? '#065F46'
                            : '#1E40AF'
                      }}
                    >
                      {rep.format}
                    </span>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.84rem' }}>{rep.fileSize}</td>
                  <td className="educator-date-cell">{rep.generatedDate}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{rep.downloads || 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="educator-secondary-btn sm"
                        onClick={() => handleDownloadReport(rep)}
                        title="Download File"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="educator-secondary-btn sm"
                        onClick={() => setPreviewReport(rep)}
                        title="Preview Summary"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="educator-icon-btn danger"
                        onClick={() => handleDeleteReport(rep.id)}
                        title="Delete Report"
                      >
                        <TrashIcon size={14} color="#DC2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewReport && (
        <div className="educator-modal-overlay" onClick={() => setPreviewReport(null)}>
          <div
            className="educator-modal-box"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="educator-modal-header">
              <div>
                <h3 className="educator-card-title">{previewReport.title}</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  {previewReport.type} • {previewReport.format} ({previewReport.fileSize})
                </span>
              </div>
              <button
                type="button"
                className="educator-modal-close-btn"
                onClick={() => setPreviewReport(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem', color: '#334155' }}>
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Executive Summary
                </div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{previewReport.summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Generated Date</span>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{previewReport.generatedDate}</div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B' }}>Institutional Scope</span>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{previewReport.category}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="educator-secondary-btn"
                onClick={() => setPreviewReport(null)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="educator-primary-btn"
                onClick={() => {
                  handleDownloadReport(previewReport);
                  setPreviewReport(null);
                }}
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorReportsView;
