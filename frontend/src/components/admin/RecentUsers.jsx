import React from 'react';

const USERS = [
  {
    id: 1,
    name: 'Rahul K.',
    role: 'Student',
    status: 'Active',
    joined: '28 Sep 2025',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&h=120&q=80',
    fallback: 'https://ui-avatars.com/api/?name=Rahul+K&background=FDA085&color=fff&size=128&bold=true',
  },
  {
    id: 2,
    name: 'Dr. Priya S.',
    role: 'Educator',
    status: 'Active',
    joined: '27 Sep 2025',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
    fallback: 'https://ui-avatars.com/api/?name=Priya+S&background=a18cd1&color=fff&size=128&bold=true',
  },
  {
    id: 3,
    name: 'Arjun M.',
    role: 'Student',
    status: 'Active',
    joined: '26 Sep 2025',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    fallback: 'https://ui-avatars.com/api/?name=Arjun+M&background=4facfe&color=fff&size=128&bold=true',
  },
];

const RecentUsers = ({ onViewAll }) => {
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
          {USERS.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="ru-user-cell">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="ru-avatar"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = u.fallback;
                    }}
                  />
                  <span className="ru-name">{u.name}</span>
                </div>
              </td>
              <td className="ru-role">{u.role}</td>
              <td>
                <span className="ru-active-badge">Active</span>
              </td>
              <td className="ru-joined">{u.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default RecentUsers;
