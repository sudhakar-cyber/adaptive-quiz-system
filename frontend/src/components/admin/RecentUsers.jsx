import React, { useMemo } from 'react';
import { sharedDatabase } from '../../services/sharedDatabase';

const getInitials = (name = '') => {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return 'U';
};

const ROLE_COLORS = {
  student: '#3B82F6',
  educator: '#10B981',
  admin: '#6C5CE7'
};

const RecentUsers = ({ users: propUsers = [], searchQuery = '', onViewAll }) => {
  const recentList = useMemo(() => {
    let source = Array.isArray(propUsers) && propUsers.length > 0 ? propUsers : [];
    if (source.length === 0) {
      try {
        source = typeof sharedDatabase?.getUsers === 'function' ? sharedDatabase.getUsers() || [] : [];
      } catch {
        source = [];
      }
    }

    // Prioritize students and educators first so newly added/registered accounts appear at the top
    const nonAdmins = source.filter((u) => (u.role || '').toLowerCase() !== 'admin');
    const admins = source.filter((u) => (u.role || '').toLowerCase() === 'admin');
    let ordered = [...nonAdmins, ...admins];

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      ordered = ordered.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.role || '').toLowerCase().includes(q)
      );
    }

    return ordered.slice(0, 5);
  }, [propUsers, searchQuery]);

  return (
    <>
      <div className="ru-header">
        <h3 className="ru-title">Recent Users</h3>
        <button
          className="ru-view-all"
          onClick={onViewAll}
          type="button"
        >
          View All →
        </button>
      </div>

      <table className="ru-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {recentList.length > 0 ? (
            recentList.map((u) => {
              const roleKey = (u.role || 'student').toLowerCase();
              const badgeColor = ROLE_COLORS[roleKey] || '#3B82F6';
              const isInactive = u.isActive === false || (u.status || '').toLowerCase() === 'inactive';
              const isSupport = (u.status || '').toLowerCase() === 'needs support';

              return (
                <tr
                  key={u.id || u.email || u.name}
                  onClick={onViewAll}
                  style={{ cursor: onViewAll ? 'pointer' : 'default' }}
                >
                  <td>
                    <div className="ru-user-cell">
                      {u.avatarImage ? (
                        <img
                          src={u.avatarImage}
                          alt={u.name}
                          className="ru-avatar"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="ru-avatar"
                          style={{
                            background: badgeColor,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          {u.avatarInitials || getInitials(u.name)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="ru-name">{u.name}</span>
                        {u.email && (
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{u.email}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="ru-role">{u.role || 'Student'}</td>
                  <td>
                    <span
                      className="ru-active-badge"
                      style={
                        isInactive
                          ? { background: '#EF4444', color: '#FFFFFF' }
                          : isSupport
                            ? { background: '#F59E0B', color: '#FFFFFF' }
                            : undefined
                      }
                    >
                      {isInactive ? 'Inactive' : u.status || 'Active'}
                    </span>
                  </td>
                  <td className="ru-joined">{u.joinedDate || u.joined || 'Recently'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                {searchQuery ? `No users matching "${searchQuery}"` : 'No registered users yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default RecentUsers;
