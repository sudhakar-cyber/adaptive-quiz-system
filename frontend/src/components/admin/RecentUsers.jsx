import React from 'react';
import { sharedDatabase } from '../../services/sharedDatabase';

const RecentUsers = ({ onViewAll }) => {
  const users = React.useMemo(() => {
    try {
      const all = sharedDatabase.getUsers() || [];
      return all.slice(0, 5);
    } catch {
      return [];
    }
  }, []);

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
          {users.length > 0 ? (
            users.map((u) => {
              const avatar = u.avatarImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=4facfe&color=fff&size=128&bold=true`;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="ru-user-cell">
                      <img
                        src={avatar}
                        alt={u.name}
                        className="ru-avatar"
                        loading="lazy"
                      />
                      <span className="ru-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="ru-role">{u.role}</td>
                  <td>
                    <span className={`ru-active-badge ${u.isActive === false ? 'inactive' : ''}`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="ru-joined">{u.joinedDate || 'Recently'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                No registered users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default RecentUsers;
