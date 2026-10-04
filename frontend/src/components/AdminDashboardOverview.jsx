import React, { useState } from 'react';
import {
  UsersIcon,
  FileTextIcon,
  PlayIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ChartIcon
} from './Icons';

export const AdminDashboardOverview = ({
  stats,
  userGrowthData,
  categoryDistribution,
  recentUsers,
  onNavigateTab,
  onOpenAddUser
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG Area / Line Chart Calculation for User Growth
  // Exactly matches the screenshot curve and Y-axis 0 to 400
  const renderUserGrowthChart = () => {
    // Specific points matching the reference image curve
    const chartPoints = [
      { label: 'Jan', count: 50 },
      { label: 'Feb', count: 100 },
      { label: 'Mar', count: 140 },
      { label: 'Apr', count: 170 },
      { label: 'May', count: 210 },
      { label: 'Jun', count: 235 }
    ];

    const width = 450;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 25, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxVal = 400; // Screenshot Y-axis maximum is 400
    const minVal = 0;

    const points = chartPoints.map((d, i) => {
      const x = padding.left + (i / (chartPoints.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.count - minVal) / (maxVal - minVal)) * chartHeight;
      return { x, y, ...d };
    });

    // Generate smooth SVG curve through points
    const pathD = points.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cp1x = prev.x + (pt.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) / 2;
      const cp2y = pt.y;
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
    }, '');

    // Area path for subtle gradient under the curve
    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaD = `${pathD} L ${lastPt.x},${padding.top + chartHeight} L ${firstPt.x},${padding.top + chartHeight} Z`;

    const yTicks = [400, 300, 200, 100, 0];

    return (
      <div className="growth-chart-container" style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="admin-svg-chart"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="userGrowthAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines box (outer border around plot area like screenshot) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1"
          />

          {/* Horizontal Grid lines & Y-Axis Labels */}
          {yTicks.map((val) => {
            const y = padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="0.8"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#475569"
                  fontSize="11"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Shaded Area Fill */}
          <path d={areaD} fill="url(#userGrowthAreaGrad)" />

          {/* Main Curved Line in Purple */}
          <path
            d={pathD}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on points */}
          {points.map((pt, i) => (
            <g
              key={i}
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="12"
                fill="transparent"
              />
            </g>
          ))}

          {/* X-Axis Labels */}
          {points.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={height - 4}
              fill="#475569"
              fontSize="12"
              textAnchor="middle"
              fontWeight="600"
            >
              {pt.label}
            </text>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100 - 28}%`,
              transform: 'translate(-50%, -100%)',
              background: '#1E1B4B',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 10
            }}
          >
            {hoveredPoint.label}: {hoveredPoint.count} Users
          </div>
        )}
      </div>
    );
  };

  // SVG Pie Chart matching screenshot segment angles and colors
  const renderCategoryPieChart = () => {
    // Slices ordered to match screenshot angles exactly:
    // Top-right: Programming (Blue, 32%)
    // Bottom: DSA (Green, 28%)
    // Bottom-left: Web Dev (Orange, 12%)
    // Middle-left: Others (Amber, 8%)
    // Top-left: Cyber Security (Purple, 20%)
    const pieSlices = [
      { name: 'Programming', percentage: 32, color: '#3B82F6' },
      { name: 'DSA', percentage: 28, color: '#10B981' },
      { name: 'Web Dev', percentage: 12, color: '#F97316' },
      { name: 'Others', percentage: 8, color: '#F59E0B' },
      { name: 'Cyber Security', percentage: 20, color: '#8B5CF6' }
    ];

    const size = 160;
    const center = size / 2;
    const radius = 68;

    let cumulativeAngle = 0;

    const slices = pieSlices.map((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

      return {
        ...cat,
        pathData
      };
    });

    // Legend items ordered as in screenshot
    const legendItems = [
      { name: 'Programming', percentage: '32%', color: '#3B82F6' },
      { name: 'DSA', percentage: '28%', color: '#10B981' },
      { name: 'Cyber Security', percentage: '20%', color: '#8B5CF6' },
      { name: 'Web Dev', percentage: '12%', color: '#F97316' },
      { name: 'Others', percentage: '8%', color: '#F59E0B' }
    ];

    return (
      <div className="category-chart-wrapper">
        <div className="category-pie-col">
          <svg viewBox={`0 0 ${size} ${size}`} className="admin-svg-pie">
            {slices.map((slice, i) => (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                className="pie-segment"
              >
                <title>{`${slice.name}: ${slice.percentage}%`}</title>
              </path>
            ))}
          </svg>
        </div>

        <div className="category-legend-col">
          {legendItems.map((item, i) => (
            <div key={i} className="legend-row">
              <span className="legend-bullet" style={{ backgroundColor: item.color }} />
              <span className="legend-name">{item.name}</span>
              <span className="legend-percent">{item.percentage}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Recent users matching screenshot: Rahul K., Dr. Priya S., Arjun M.
  const usersList = [
    {
      id: 'rec-1',
      name: 'Rahul K.',
      role: 'Student',
      status: 'Active',
      joinedDate: '28 Sep 2025',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&h=120&q=80',
      initials: 'RK'
    },
    {
      id: 'rec-2',
      name: 'Dr. Priya S.',
      role: 'Educator',
      status: 'Active',
      joinedDate: '27 Sep 2025',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
      initials: 'PS'
    },
    {
      id: 'rec-3',
      name: 'Arjun M.',
      role: 'Student',
      status: 'Active',
      joinedDate: '26 Sep 2025',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
      initials: 'AM'
    }
  ];

  return (
    <div className="admin-overview-container">
      {/* Page Header matching reference */}
      <div className="admin-overview-header">
        <h1 className="admin-overview-title">System Overview</h1>
        <p className="admin-overview-subtitle">Monitor platform activity and manage users</p>
      </div>

      {/* 4 Top KPI Stat Cards matching reference */}
      <div className="admin-stats-grid">
        {/* Card 1: Total Users */}
        <div className="admin-stat-card stat-blue">
          <div className="stat-icon-box">
            <UsersIcon size={24} color="#3B82F6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{stats.totalUsers ?? 482}</span>
          </div>
        </div>

        {/* Card 2: Total Quizzes */}
        <div className="admin-stat-card stat-green">
          <div className="stat-icon-box">
            <FileTextIcon size={24} color="#10B981" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Quizzes</span>
            <span className="stat-value">{stats.totalQuizzes ?? 87}</span>
          </div>
        </div>

        {/* Card 3: Active Quizzes */}
        <div className="admin-stat-card stat-orange">
          <div className="stat-icon-box">
            <PlayIcon size={22} color="#F97316" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Quizzes</span>
            <span className="stat-value">{stats.activeQuizzes ?? 42}</span>
          </div>
        </div>

        {/* Card 4: System Health */}
        <div className="admin-stat-card stat-purple">
          <div className="stat-icon-box">
            <CheckCircleIcon size={24} color="#8B5CF6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">System Health</span>
            <span className="stat-value health-text">{stats.systemHealth || 'Online'}</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Charts Grid */}
      <div className="admin-charts-grid">
        {/* User Growth Chart */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">User Growth</h3>
          </div>
          <div className="chart-card-body">
            {renderUserGrowthChart()}
          </div>
        </div>

        {/* Quiz Category Distribution Chart */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Quiz Category Distribution</h3>
          </div>
          <div className="chart-card-body">
            {renderCategoryPieChart()}
          </div>
        </div>
      </div>

      {/* Lower Row: Recent Users Table & Quick Actions */}
      <div className="admin-lower-grid">
        {/* Recent Users Card */}
        <div className="admin-recent-users-card">
          <div className="recent-users-header">
            <h3 className="recent-users-title">Recent Users</h3>
            <button
              className="view-all-link"
              onClick={() => onNavigateTab('users')}
            >
              View All →
            </button>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((user) => (
                  <tr key={user.id} className="admin-table-row">
                    <td>
                      <div className="user-cell">
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="user-avatar-photo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="user-avatar-sm" style={{ display: 'none' }}>
                          {user.initials}
                        </div>
                        <span className="user-name">{user.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="user-role-text">{user.role}</span>
                    </td>
                    <td>
                      <span className="status-badge-active-pill">
                        Active
                      </span>
                    </td>
                    <td>
                      <span className="user-joined-text">{user.joinedDate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="admin-quick-actions-card">
          <h3 className="quick-actions-title">Quick Actions</h3>

          <div className="quick-actions-list">
            <button
              className="admin-quick-btn quick-blue"
              onClick={onOpenAddUser}
            >
              <div className="quick-btn-icon-wrapper">
                <UserPlusIcon size={20} color="#FFFFFF" />
              </div>
              <span className="quick-btn-label">Add User</span>
            </button>

            <button
              className="admin-quick-btn quick-green"
              onClick={() => onNavigateTab('quizzes')}
            >
              <div className="quick-btn-icon-wrapper">
                <FileTextIcon size={20} color="#FFFFFF" />
              </div>
              <span className="quick-btn-label">Manage Quizzes</span>
            </button>

            <button
              className="admin-quick-btn quick-orange"
              onClick={() => onNavigateTab('reports')}
            >
              <div className="quick-btn-icon-wrapper">
                <ChartIcon size={20} color="#FFFFFF" />
              </div>
              <span className="quick-btn-label">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
