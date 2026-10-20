import React, { useState, useMemo } from 'react';

const CATEGORY_COLORS = {
  'Programming': '#3B82F6',        // Vibrant Blue
  'Cyber Security': '#8B5CF6',     // Purple
  'DSA': '#10B981',                // Emerald Green
  'Data Structures': '#10B981',    // Emerald Green
  'Machine Learning': '#EC4899',   // Pink
  'Cloud Computing': '#06B6D4',    // Cyan
  'Databases': '#F59E0B',          // Amber
  'Database Systems': '#F59E0B',   // Amber
  'Web Development': '#F97316',    // Orange
  'Web Dev': '#F97316',            // Orange
  'Mathematics': '#6366F1',        // Indigo
  'Math': '#6366F1',               // Indigo
  'General': '#64748B',            // Slate
  'Others': '#94A3B8'              // Gray
};

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4',
  '#F59E0B', '#F97316', '#6366F1', '#14B8A6', '#F43F5E', '#84CC16'
];

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 68;
const INNER_R = 40;

const QuizCategoryChart = ({ quizzes = [], onSelectCategory }) => {
  const [hovered, setHovered] = useState(null);

  const categoryItems = useMemo(() => {
    const list = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes : [];
    if (list.length === 0) {
      return [];
    }

    const counts = {};
    list.forEach((q) => {
      let cat = (q.category || '').trim();
      if (!cat) cat = 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = list.length;
    let paletteIdx = 0;

    return Object.keys(counts)
      .map((name) => {
        const count = counts[name];
        const pct = Math.max(1, Math.round((count / total) * 100));
        const color = CATEGORY_COLORS[name] || PALETTE[paletteIdx++ % PALETTE.length];
        return { name, count, pct, color };
      })
      .sort((a, b) => b.count - a.count);
  }, [quizzes]);

  const totalQuizzes = useMemo(() => {
    return categoryItems.reduce((acc, c) => acc + c.count, 0);
  }, [categoryItems]);

  const slices = useMemo(() => {
    if (categoryItems.length === 0 || totalQuizzes === 0) return [];

    if (categoryItems.length === 1) {
      return [{
        ...categoryItems[0],
        isFullCircle: true
      }];
    }

    let angle = -90;
    return categoryItems.map((cat) => {
      const deg = (cat.count / totalQuizzes) * 360;
      const startRad = (angle * Math.PI) / 180;
      const endRad = ((angle + deg) * Math.PI) / 180;

      const x1 = CX + R * Math.cos(startRad);
      const y1 = CY + R * Math.sin(startRad);
      const x2 = CX + R * Math.cos(endRad);
      const y2 = CY + R * Math.sin(endRad);

      const largeArc = deg > 180 ? 1 : 0;
      const d = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      angle += deg;
      return { ...cat, d, isFullCircle: false };
    });
  }, [categoryItems, totalQuizzes]);

  return (
    <div className="qcc-wrap">
      {/* Pie / Donut Chart SVG */}
      <div className="qcc-chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="qcc-svg">
          {categoryItems.length === 0 ? (
            <g>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E2E8F0" strokeWidth="16" />
              <text cx={CX} cy={CY + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#94A3B8">
                No Quizzes
              </text>
            </g>
          ) : (
            <>
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
                    style={{ cursor: onSelectCategory ? 'pointer' : 'default' }}
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
                    opacity={hovered === null || hovered === slice.name ? 1 : 0.55}
                    onMouseEnter={() => setHovered(slice.name)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onSelectCategory && onSelectCategory(slice.name)}
                    style={{
                      cursor: onSelectCategory ? 'pointer' : 'default',
                      transition: 'opacity 0.18s, transform 0.18s'
                    }}
                  >
                    <title>{`${slice.name}: ${slice.pct}% (${slice.count} quizzes) - Click to view`}</title>
                  </path>
                )
              )}

              {/* Modern Donut Cutout */}
              <circle
                cx={CX}
                cy={CY}
                r={INNER_R}
                fill="#FFFFFF"
                stroke="#F8FAFC"
                strokeWidth="1.5"
              />
              <text
                x={CX}
                y={CY - 1}
                textAnchor="middle"
                fontSize="17"
                fontWeight="800"
                fill="#0F172A"
              >
                {totalQuizzes}
              </text>
              <text
                x={CX}
                y={CY + 13}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fill="#64748B"
                letterSpacing="0.4"
              >
                QUIZZES
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="qcc-legend">
        {categoryItems.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            No quizzes categorized yet.
          </div>
        ) : (
          categoryItems.map((cat, i) => (
            <div
              key={cat.name || i}
              className={`qcc-legend-row ${hovered === cat.name ? 'qcc-legend-hover' : ''}`}
              onMouseEnter={() => setHovered(cat.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectCategory && onSelectCategory(cat.name)}
              title={`Click to filter quizzes by ${cat.name}`}
              style={{ cursor: onSelectCategory ? 'pointer' : 'default' }}
            >
              <span className="qcc-dot" style={{ background: cat.color }} />
              <span className="qcc-legend-name">
                {cat.name}
                <span style={{ color: '#94A3B8', fontSize: '0.74rem', marginLeft: '6px', fontWeight: 600 }}>
                  ({cat.count})
                </span>
              </span>
              <span className="qcc-legend-pct">{cat.pct}%</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuizCategoryChart;
