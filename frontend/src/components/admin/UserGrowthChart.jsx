import React, { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../../services/apiClient';

const W = 400;
const H = 180;
const PAD = { top: 18, right: 16, bottom: 28, left: 36 };

/** Computes authentic cumulative user growth from the users list based on real created_at timestamps */
const computeLocalUserGrowth = (usersList, timeframe) => {
  const list = Array.isArray(usersList) ? usersList : [];
  const now = new Date();

  const parseCreated = (u) => {
    const raw = u.createdAt || u.created_at || u.joinedDate;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  if (timeframe === '7D') {
    const points = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(23, 59, 59, 999);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = list.filter((u) => {
        const dt = parseCreated(u);
        return dt ? dt <= d : true;
      }).length;
      points.push({ label, value: count });
    }
    return points;
  }

  if (timeframe === '30D') {
    const points = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      d.setHours(23, 59, 59, 999);
      const label = `Wk ${4 - i}`;
      const count = list.filter((u) => {
        const dt = parseCreated(u);
        return dt ? dt <= d : true;
      }).length;
      points.push({ label, value: count });
    }
    return points;
  }

  if (timeframe === '1Y') {
    const points = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 90);
      d.setHours(23, 59, 59, 999);
      const label = `Q${4 - i}`;
      const count = list.filter((u) => {
        const dt = parseCreated(u);
        return dt ? dt <= d : true;
      }).length;
      points.push({ label, value: count });
    }
    return points;
  }

  // Default: '6M' - past 6 calendar months ending with current month
  const points = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-US', { month: 'short' });
    const count = list.filter((u) => {
      const dt = parseCreated(u);
      return dt ? dt <= d : true;
    }).length;
    points.push({ label, value: count });
  }
  return points;
};

export const UserGrowthChart = ({ users = [], onSelectPoint }) => {
  const [timeframe, setTimeframe] = useState('6M');
  const [tooltip, setTooltip] = useState(null);
  const [growthPoints, setGrowthPoints] = useState(null);

  const totalUsers = Array.isArray(users) ? users.length : 0;
  const activeUsers = Array.isArray(users)
    ? users.filter((u) => u.status !== 'Inactive' && u.isActive !== false).length
    : 0;

  // Real-time synchronization from MySQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchGrowth = async () => {
      try {
        const tfParam = timeframe === '7D' ? '7D' : timeframe === '30D' ? '30D' : timeframe === '1Y' ? '1Y' : '6M';
        const res = await apiGet(`/api/analytics/growth?timeframe=${encodeURIComponent(tfParam)}`);
        if (isMounted && res && Array.isArray(res.points) && res.points.length > 0) {
          setGrowthPoints(res.points);
        }
      } catch (err) {
        // Fallback to local computation
      }
    };

    fetchGrowth();
    const handleUpdate = () => fetchGrowth();
    window.addEventListener('learnsmart_students_updated', handleUpdate);
    window.addEventListener('learnsmart_admin_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('learnsmart_students_updated', handleUpdate);
      window.removeEventListener('learnsmart_admin_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [timeframe]);

  // Compute authentic dataset
  const data = useMemo(() => {
    if (Array.isArray(growthPoints) && growthPoints.length > 0) {
      return growthPoints.map((pt) => ({
        label: pt.label,
        value: typeof pt.count === 'number' ? pt.count : Number(pt.count || 0)
      }));
    }
    return computeLocalUserGrowth(users, timeframe);
  }, [growthPoints, users, timeframe]);

  // Dynamically compute maxY based on actual user counts
  const maxY = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.value), totalUsers, 1);
    if (highest <= 4) return 4;
    if (highest <= 8) return 8;
    if (highest <= 16) return 16;
    if (highest <= 30) return 32;
    if (highest <= 60) return 64;
    if (highest <= 100) return 100;
    return Math.ceil(highest / 20) * 20;
  }, [data, totalUsers]);

  const yTicks = useMemo(() => {
    const step = maxY / 4;
    return [maxY, Math.round(step * 3), Math.round(step * 2), Math.round(step), 0];
  }, [maxY]);

  const plotX = (i) =>
    PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right);

  const plotY = (v) =>
    PAD.top + (1 - v / Math.max(1, maxY)) * (H - PAD.top - PAD.bottom);

  const linePath = useMemo(() => {
    const pts = data.map((d, i) => ({ x: plotX(i), y: plotY(d.value) }));
    return pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
      const prev = arr[i - 1];
      const cp1x = (prev.x + (pt.x - prev.x) * 0.5).toFixed(2);
      const cp1y = prev.y.toFixed(2);
      const cp2x = (prev.x + (pt.x - prev.x) * 0.5).toFixed(2);
      const cp2y = pt.y.toFixed(2);
      return `${acc} C${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
    }, '');
  }, [data, maxY]);

  const firstPt = { x: plotX(0), y: plotY(data[0]?.value || 0) };
  const lastPt = { x: plotX(Math.max(0, data.length - 1)), y: plotY(data[data.length - 1]?.value || 0) };
  const bottomY = H - PAD.bottom;
  const areaPath = `${linePath} L${lastPt.x.toFixed(2)},${bottomY} L${firstPt.x.toFixed(2)},${bottomY} Z`;

  return (
    <div className="ugc-wrap">
      {/* Header Info & Timeframe Selectors */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
          Active accounts: <strong style={{ color: '#0F172A', fontSize: '0.90rem' }}>{totalUsers}</strong>
          {activeUsers < totalUsers && (
            <span style={{ color: '#94A3B8', fontSize: '0.72rem', marginLeft: '6px' }}>
              ({activeUsers} active)
            </span>
          )}
        </span>
        <div style={{ display: 'inline-flex', gap: '3px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
          {['7D', '30D', '6M', '1Y'].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setTooltip(null);
              }}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: timeframe === tf ? '#6C5CE7' : 'transparent',
                color: timeframe === tf ? '#FFFFFF' : '#64748B',
                transition: 'all 0.15s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="ugc-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Outer border box framing chart area */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={W - PAD.left - PAD.right}
          height={H - PAD.top - PAD.bottom}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {/* Y-axis grid lines & labels */}
        {yTicks.map((v) => {
          const y = plotY(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 7}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="#64748B"
                fontFamily="inherit"
                fontWeight="600"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#ugGrad)" />

        {/* Curve line */}
        <path
          d={linePath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + hover hit targets */}
        {data.map((d, i) => {
          const cx = plotX(i);
          const cy = plotY(d.value);
          const isHovered = tooltip && tooltip.label === d.label;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setTooltip({ x: cx, y: cy, label: d.label, value: d.value })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onSelectPoint && onSelectPoint()}
              style={{ cursor: onSelectPoint ? 'pointer' : 'default' }}
            >
              <circle cx={cx} cy={cy} r="14" fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? '6' : '4.5'}
                fill="#8B5CF6"
                stroke="#fff"
                strokeWidth="2.5"
                style={{ transition: 'r 0.15s ease' }}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={d.label}
            x={plotX(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#64748B"
            fontFamily="inherit"
            fontWeight="600"
          >
            {d.label}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const tipWidth = 92;
          const tipHeight = 25;
          const clampedX = Math.max(
            PAD.left + tipWidth / 2,
            Math.min(W - PAD.right - tipWidth / 2, tooltip.x)
          );
          const clampedY = Math.max(PAD.top + tipHeight + 6, tooltip.y);
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={clampedX - tipWidth / 2}
                y={clampedY - tipHeight - 8}
                width={tipWidth}
                height={tipHeight}
                rx="6"
                fill="#1E1B4B"
              />
              <text
                x={clampedX}
                y={clampedY - 16}
                textAnchor="middle"
                fontSize="10"
                fill="#fff"
                fontFamily="inherit"
                fontWeight="700"
              >
                {tooltip.label}: {tooltip.value} users
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default UserGrowthChart;
