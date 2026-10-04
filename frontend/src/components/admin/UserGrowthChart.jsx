import React, { useState } from 'react';

// Chart data points matching the reference image curve exactly
// Y axis: 0 to 400, X axis: Jan–Jun
const DATA = [
  { label: 'Jan', value: 50 },
  { label: 'Feb', value: 100 },
  { label: 'Mar', value: 135 },
  { label: 'Apr', value: 170 },
  { label: 'May', value: 210 },
  { label: 'Jun', value: 240 },
];

const Y_TICKS = [400, 300, 200, 100, 0];

const W = 400;
const H = 180;
const PAD = { top: 14, right: 16, bottom: 28, left: 38 };

const plotX = (i) =>
  PAD.left + (i / (DATA.length - 1)) * (W - PAD.left - PAD.right);

const plotY = (v) =>
  PAD.top + (1 - v / 400) * (H - PAD.top - PAD.bottom);

// Build smooth cubic bezier path
const buildPath = () => {
  const pts = DATA.map((d, i) => ({ x: plotX(i), y: plotY(d.value) }));
  return pts.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) * 0.5;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) * 0.5;
    const cp2y = pt.y;
    return `${acc} C${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
  }, '');
};

const UserGrowthChart = () => {
  const [tooltip, setTooltip] = useState(null);
  const linePath = buildPath();
  const firstPt = { x: plotX(0), y: plotY(DATA[0].value) };
  const lastPt  = { x: plotX(DATA.length - 1), y: plotY(DATA[DATA.length - 1].value) };
  const bottomY = H - PAD.bottom;
  const areaPath = `${linePath} L${lastPt.x},${bottomY} L${firstPt.x},${bottomY} Z`;

  return (
    <div className="ugc-wrap">
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

        {/* Outer border box framing chart area matching reference image */}
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
        {Y_TICKS.map((v) => {
          const y = plotY(v);
          return (
            <g key={v}>
              <line
                x1={PAD.left} y1={y}
                x2={W - PAD.right} y2={y}
                stroke="#E2E8F0" strokeWidth="1"
              />
              <text
                x={PAD.left - 8} y={y + 4}
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
        {DATA.map((d, i) => {
          const cx = plotX(i);
          const cy = plotY(d.value);
          return (
            <g key={i}
              onMouseEnter={() => setTooltip({ x: cx, y: cy, label: d.label, value: d.value })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r="12" fill="transparent" />
              <circle cx={cx} cy={cy} r="5" fill="#8B5CF6" stroke="#fff" strokeWidth="2.5" />
            </g>
          );
        })}

        {/* X-axis labels */}
        {DATA.map((d, i) => (
          <text
            key={i}
            x={plotX(i)} y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#64748B"
            fontFamily="inherit"
            fontWeight="600"
          >
            {d.label}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 36} y={tooltip.y - 32}
              width="72" height="24"
              rx="6"
              fill="#1E1B4B"
            />
            <text
              x={tooltip.x} y={tooltip.y - 16}
              textAnchor="middle"
              fontSize="10"
              fill="#fff"
              fontFamily="inherit"
              fontWeight="700"
            >
              {tooltip.label}: {tooltip.value}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default UserGrowthChart;
