import React, { useState, useMemo } from 'react';

const W = 400;
const H = 180;
const PAD = { top: 14, right: 16, bottom: 28, left: 38 };

const TIMEFRAME_SERIES = {
  '7D': [
    { label: 'Mon', base: 195 },
    { label: 'Tue', base: 204 },
    { label: 'Wed', base: 212 },
    { label: 'Thu', base: 220 },
    { label: 'Fri', base: 228 },
    { label: 'Sat', base: 235 },
    { label: 'Sun', base: 240 }
  ],
  '30D': [
    { label: 'Wk 1', base: 120 },
    { label: 'Wk 2', base: 165 },
    { label: 'Wk 3', base: 205 },
    { label: 'Wk 4', base: 240 }
  ],
  '6M': [
    { label: 'Jan', base: 50 },
    { label: 'Feb', base: 100 },
    { label: 'Mar', base: 135 },
    { label: 'Apr', base: 170 },
    { label: 'May', base: 210 },
    { label: 'Jun', base: 240 }
  ],
  '1Y': [
    { label: 'Q1', base: 60 },
    { label: 'Q2', base: 125 },
    { label: 'Q3', base: 185 },
    { label: 'Q4', base: 240 }
  ]
};

const UserGrowthChart = ({ users = [] }) => {
  const [timeframe, setTimeframe] = useState('6M');
  const [tooltip, setTooltip] = useState(null);

  const liveUserDelta = Math.max(0, (Array.isArray(users) ? users.length : 0));

  const data = useMemo(() => {
    const raw = TIMEFRAME_SERIES[timeframe] || TIMEFRAME_SERIES['6M'];
    return raw.map((item, idx) => ({
      label: item.label,
      value: idx === raw.length - 1 ? item.base + liveUserDelta : item.base + Math.round((liveUserDelta * (idx + 1)) / raw.length)
    }));
  }, [timeframe, liveUserDelta]);

  const maxY = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.value), 400);
    return Math.ceil(highest / 100) * 100;
  }, [data]);

  const yTicks = useMemo(() => {
    const step = maxY / 4;
    return [maxY, step * 3, step * 2, step, 0].map((v) => Math.round(v));
  }, [maxY]);

  const plotX = (i) =>
    PAD.left + (i / Math.max(1, data.length - 1)) * (W - PAD.left - PAD.right);

  const plotY = (v) =>
    PAD.top + (1 - v / maxY) * (H - PAD.top - PAD.bottom);

  const linePath = useMemo(() => {
    const pts = data.map((d, i) => ({ x: plotX(i), y: plotY(d.value) }));
    return pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cp1x = prev.x + (pt.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = prev.x + (pt.x - prev.x) * 0.5;
      const cp2y = pt.y;
      return `${acc} C${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
    }, '');
  }, [data, maxY]);

  const firstPt = { x: plotX(0), y: plotY(data[0].value) };
  const lastPt = { x: plotX(data.length - 1), y: plotY(data[data.length - 1].value) };
  const bottomY = H - PAD.bottom;
  const areaPath = `${linePath} L${lastPt.x},${bottomY} L${firstPt.x},${bottomY} Z`;

  return (
    <div className="ugc-wrap">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
          Active accounts: <strong style={{ color: '#0F172A' }}>{data[data.length - 1]?.value || 0}</strong>
        </span>
        <div style={{ display: 'inline-flex', gap: '4px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
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
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
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
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
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
          strokeWidth="3.2"
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
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r="12" fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? '6.5' : '5'}
                fill="#8B5CF6"
                stroke="#fff"
                strokeWidth="2.5"
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
            fontSize="11"
            fill="#64748B"
            fontFamily="inherit"
            fontWeight="600"
          >
            {d.label}
          </text>
        ))}

        {/* Clamped Tooltip */}
        {tooltip && (() => {
          const tipWidth = 84;
          const tipHeight = 24;
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
                {tooltip.label}: {tooltip.value}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

export default UserGrowthChart;
