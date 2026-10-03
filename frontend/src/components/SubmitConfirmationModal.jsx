import React from 'react';

export const SubmitConfirmationModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="quiz-modal-backdrop"
      style={{ zIndex: 10001, backgroundColor: 'rgba(15, 23, 42, 0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div
        className="quiz-modal-card"
        style={{
          maxWidth: '460px',
          padding: '24px 28px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.35)',
          animation: 'modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: '#1A6BFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h3
            id="submit-modal-title"
            style={{
              margin: '0 0 8px 0',
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0F172A'
            }}
          >
            Submit Test?
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '0.90rem',
              color: '#64748B',
              lineHeight: 1.5
            }}
          >
            Are you sure you want to submit your test? You will not be able to change your answers after submission.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '12px'
          }}
        >
          <button
            type="button"
            className="quiz-btn-nav quiz-btn-secondary"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center', padding: '10px 16px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="quiz-btn-nav quiz-btn-submit"
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center', padding: '10px 16px', backgroundColor: '#10B981' }}
          >
            Submit Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitConfirmationModal;
