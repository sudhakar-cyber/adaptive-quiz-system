import React, { useState } from 'react';
import { XIcon, UserPlusIcon } from './Icons';

export const AdminAddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [idInput, setIdInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    onUserAdded({
      role,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: role === 'educator' ? department : undefined,
      customId: idInput.trim() || undefined
    });

    // Reset
    setName('');
    setEmail('');
    setIdInput('');
    setError('');
    onClose();
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-group">
            <div className="admin-logo-icon" style={{ width: '36px', height: '36px' }}>
              <UserPlusIcon size={18} color="#FFFFFF" />
            </div>
            <div>
              <h3 className="modal-user-name">Add New Platform User</h3>
              <span className="management-subtitle" style={{ fontSize: '0.78rem' }}>
                Onboard a new student or educator to the system
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <XIcon size={20} color="#64748B" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {error && (
              <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* Role selector */}
            <div className="form-group-field" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                User Role
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === 'student'}
                    onChange={() => setRole('student')}
                  />
                  <span>Student</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="role"
                    value="educator"
                    checked={role === 'educator'}
                    onChange={() => setRole('educator')}
                  />
                  <span>Educator</span>
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="form-group-field" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder={role === 'student' ? 'e.g. Vikram Sharma' : 'e.g. Dr. Rajesh Kumar'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                required
              />
            </div>

            {/* Email */}
            <div className="form-group-field" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. user@learnsmart.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                required
              />
            </div>

            {/* Custom / Optional ID */}
            <div className="form-group-field" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                {role === 'student' ? 'Student ID (Optional)' : 'Educator ID (Optional)'}
              </label>
              <input
                type="text"
                placeholder={role === 'student' ? 'Auto-generated if left blank (e.g. LS-2025-108)' : 'Auto-generated if left blank'}
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
              />
            </div>

            {/* Department (if Educator) */}
            {role === 'educator' && (
              <div className="form-group-field" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Software Engineering">Software Engineering</option>
                </select>
              </div>
            )}
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-primary-btn">
              <UserPlusIcon size={16} color="#FFFFFF" />
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddUserModal;
