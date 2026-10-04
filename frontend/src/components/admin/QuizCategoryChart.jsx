import React, { useState } from 'react';

// Slices in clockwise order starting from top (12 o'clock / -90 deg)
// Top-right: Programming (32%, Blue)
// Bottom-right: DSA (28%, Green)
// Bottom-left: Web Dev (12%, Orange)
// Left: Others (8%, Amber)
// Top-left: Cyber Security (20%, Purple)
const SLICES_DATA = [
  { name: 'Programming',    pct: 32, color: '#3B82F6' },
  { name: 'DSA',            pct: 28, color: '#22C55E' },
  { name: 'Web Dev',        pct: 12, color: '#F97316' },
  { name: 'Others',         pct:  8, color: '#F59E0B' },
  { name: 'Cyber Security', pct: 20, color: '#8B5CF6' },
];

// Legend items in exact order shown in reference screenshot
const LEGEND_ITEMS = [
  { name: 'Programming',    pct: 32, color: '#3B82F6' },
  { name: 'DSA',            pct: 28, color: '#22C55E' },
  { name: 'Cyber Security', pct: 20, color: '#8B5CF6' },
  { name: 'Web Dev',        pct: 12, color: '#F97316' },
  { name: 'Others',         pct:  8, color: '#F59E0B' },
];

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;

const buildSlices = () => {
  let angle = -90; // start at top (12 o'clock)
  return SLICES_DATA.map((cat) => {
    const deg = (cat.pct / 100) * 360;
    const startRad = (angle * Math.PI) / 180;
    const endRad = ((angle + deg) * Math.PI) / 180;

    const x1 = CX + R * Math.cos(startRad);
    const y1 = CY + R * Math.sin(startRad);
    const x2 = CX + R * Math.cos(endRad);
    const y2 = CY + R * Math.sin(endRad);

    const largeArc = deg > 180 ? 1 : 0;
    const d = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z`;
    angle += deg;
    return { ...cat, d };
  });
};

const QuizCategoryChart = () => {
  const [hovered, setHovered] = useState(null);
  const slices = buildSlices();

  return (
    <div className="qcc-wrap">
      {/* Pie Chart SVG */}
      <div className="qcc-chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="qcc-svg">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.d}
              fill={slice.color}
              stroke="#fff"
              strokeWidth="2.5"
              opacity={hovered === null || hovered === slice.name ? 1 : 0.65}
              onMouseEnter={() => setHovered(slice.name)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            >
              <title>{slice.name}: {slice.pct}%</title>
            </path>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="qcc-legend">
        {LEGEND_ITEMS.map((cat, i) => (
          <div
            key={i}
            className={`qcc-legend-row ${hovered === cat.name ? 'qcc-legend-hover' : ''}`}
            onMouseEnter={() => setHovered(cat.name)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="qcc-dot" style={{ background: cat.color }} />
            <span className="qcc-legend-name">{cat.name}</span>
            <span className="qcc-legend-pct">{cat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizCategoryChart;

