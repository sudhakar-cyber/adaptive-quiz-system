import React, { useState, useMemo } from 'react';

const DEFAULT_CATEGORIES = [
  { name: 'Programming', pct: 32, count: 28, color: '#3B82F6' },
  { name: 'DSA', pct: 28, count: 24, color: '#22C55E' },
  { name: 'Cyber Security', pct: 20, count: 17, color: '#8B5CF6' },
  { name: 'Web Dev', pct: 12, count: 11, color: '#F97316' },
  { name: 'Others', pct: 8, count: 7, color: '#F59E0B' }
];

const CATEGORY_COLORS = {
  Programming: '#3B82F6',
  DSA: '#22C55E',
  'Cyber Security': '#8B5CF6',
  'Web Dev': '#F97316',
  Others: '#F59E0B'
};

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;

const normalizeCategory = (raw = '') => {
  const lower = raw.toLowerCase();
  if (lower.includes('program') || lower.includes('python') || lower.includes('java')) return 'Programming';
  if (lower.includes('dsa') || lower.includes('data structure') || lower.includes('algorithm')) return 'DSA';
  if (lower.includes('cyber') || lower.includes('security') || lower.includes('owasp')) return 'Cyber Security';
  if (lower.includes('web') || lower.includes('frontend') || lower.includes('react')) return 'Web Dev';
  return 'Others';
};

const QuizCategoryChart = ({ quizzes = [], onSelectCategory }) => {
  const [hovered, setHovered] = useState(null);

  const categoryItems = useMemo(() => {
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return DEFAULT_CATEGORIES;
    }

    const counts = {
      Programming: 0,
      DSA: 0,
      'Cyber Security': 0,
      'Web Dev': 0,
      Others: 0
    };

    quizzes.forEach((q) => {
      const bucket = normalizeCategory(q.category || q.title || '');
      counts[bucket] = (counts[bucket] || 0) + 1;
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    if (total === 0) return DEFAULT_CATEGORIES;

    const rawItems = Object.keys(counts)
      .map((name) => ({
        name,
        count: counts[name],
        pct: Math.round((counts[name] / total) * 100),
        color: CATEGORY_COLORS[name] || '#64748B'
      }))
      .filter((item) => item.count > 0);

    const pctSum = rawItems.reduce((sum, i) => sum + i.pct, 0);
    if (rawItems.length > 0 && pctSum !== 100) {
      rawItems[0].pct += 100 - pctSum;
    }

    return rawItems;
  }, [quizzes]);

  const slices = useMemo(() => {
    let angle = -90;
    return categoryItems.map((cat) => {
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
      return { ...cat, d, isFullCircle: cat.pct >= 99.9 };
    });
  }, [categoryItems]);

  return (
    <div className="qcc-wrap">
      {/* Pie Chart SVG */}
      <div className="qcc-chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="qcc-svg">
          {slices.map((slice, i) =>
            slice.isFullCircle ? (
              <circle
                key={slice.name || i}
                cx={CX}
                cy={CY}
                r={R}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="2.5"
                onMouseEnter={() => setHovered(slice.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCategory && onSelectCategory(slice.name)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${slice.name}: ${slice.pct}% (${slice.count} quizzes)`}</title>
              </circle>
            ) : (
              <path
                key={slice.name || i}
                d={slice.d}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="2.5"
                opacity={hovered === null || hovered === slice.name ? 1 : 0.65}
                onMouseEnter={() => setHovered(slice.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCategory && onSelectCategory(slice.name)}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              >
                <title>{`${slice.name}: ${slice.pct}% (${slice.count} quizzes)`}</title>
              </path>
            )
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="qcc-legend">
        {categoryItems.map((cat, i) => (
          <div
            key={cat.name || i}
            className={`qcc-legend-row ${hovered === cat.name ? 'qcc-legend-hover' : ''}`}
            onMouseEnter={() => setHovered(cat.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelectCategory && onSelectCategory(cat.name)}
            style={{ cursor: onSelectCategory ? 'pointer' : 'default' }}
          >
            <span className="qcc-dot" style={{ background: cat.color }} />
            <span className="qcc-legend-name">
              {cat.name}
              {cat.count !== undefined && (
                <span style={{ color: '#94A3B8', fontSize: '0.75rem', marginLeft: '5px' }}>
                  ({cat.count})
                </span>
              )}
            </span>
            <span className="qcc-legend-pct">{cat.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizCategoryChart;
