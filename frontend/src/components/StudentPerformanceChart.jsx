import React, { useState } from 'react';

export const PERFORMANCE_DATA = [
  { category: 'Excellent', percentage: 78, label: '78%', color: '#10B981' }, // Vibrant Emerald Green
  { category: 'Good', percentage: 65, label: '65%', color: '#2563EB' },      // Vibrant Blue
  { category: 'Average', percentage: 45, label: '45%', color: '#F97316' },   // Vibrant Orange
  { category: 'Below Avg', percentage: 12, label: '12%', color: '#EF4444' }  // Vibrant Coral/Red
];

export const StudentPerformanceChart = ({
  data,
  students = [],
  title = 'Student Performance',
  onViewAll
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Derive dynamic chart data from live students cohort
  const chartData = React.useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((item) => ({
        ...item,
        count: item.count !== undefined ? item.count : Math.round((item.percentage / 100) * (students?.length || 100))
      }));
    }

    if (!students || students.length === 0) {
      return [
        { category: 'Excellent', percentage: 0, count: 0, label: '0%', color: '#10B981' },
        { category: 'Good', percentage: 0, count: 0, label: '0%', color: '#2563EB' },
        { category: 'Average', percentage: 0, count: 0, label: '0%', color: '#F97316' },
        { category: 'Below Avg', percentage: 0, count: 0, label: '0%', color: '#EF4444' }
      ];
    }

    const total = students.length;
    let excellent = 0;
    let good = 0;
    let average = 0;
    let belowAvg = 0;

    students.forEach((s) => {
      const score = s.avgScore || 0;
      if (score >= 85 || s.status === 'Top Performer') {
        excellent++;
      } else if (score >= 70) {
        good++;
      } else if (score >= 50) {
        average++;
      } else {
        belowAvg++;
      }
    });

    return [
      {
        category: 'Excellent',
        percentage: Math.round((excellent / total) * 100),
        count: excellent,
        label: `${Math.round((excellent / total) * 100)}%`,
        color: '#10B981'
      },
      {
        category: 'Good',
        percentage: Math.round((good / total) * 100),
        count: good,
        label: `${Math.round((good / total) * 100)}%`,
        color: '#2563EB'
      },
      {
        category: 'Average',
        percentage: Math.round((average / total) * 100),
        count: average,
        label: `${Math.round((average / total) * 100)}%`,
        color: '#F97316'
      },
      {
        category: 'Below Avg',
        percentage: Math.round((belowAvg / total) * 100),
        count: belowAvg,
        label: `${Math.round((belowAvg / total) * 100)}%`,
        color: '#EF4444'
      }
    ];
  }, [data, students]);

  // SVG dimensions & grid configuration
  const svgWidth = 360;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Y-axis tick values (100, 75, 50, 25, 0)
  const yTicks = [100, 75, 50, 25, 0];

  // Bar layout
  const barCount = chartData.length;
  const slotWidth = chartWidth / barCount;
  const barWidth = 34; // Bar width matching image

  return (
    <div className="educator-content-card educator-chart-card">
      <div className="educator-table-header-row" style={{ marginBottom: '8px' }}>
        <div>
          <h2 className="educator-card-title">{title}</h2>
          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
            {students && students.length > 0 ? `${students.length} students enrolled` : 'Real-time cohort distribution'}
          </span>
        </div>
        {onViewAll && (
          <button
            type="button"
            className="educator-view-all-link"
            onClick={onViewAll}
            title="View complete student performance records"
          >
            View Details →
          </button>
        )}
      </div>

      <div className="educator-chart-container">
        <div className="educator-chart-svg-wrap">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="educator-chart-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal Grid lines & Y-axis labels */}
            {yTicks.map((tick) => {
              const yPos = paddingTop + chartHeight - (tick / 100) * chartHeight;
              return (
                <g key={tick}>
                  <text
                    x={paddingLeft - 8}
                    y={yPos + 4}
                    className="chart-axis-label"
                  >
                    {tick}
                  </text>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={svgWidth - paddingRight}
                    y2={yPos}
                    className="chart-grid-line"
                  />
                </g>
              );
            })}

            {/* Vertical Bars */}
            {chartData.map((item, index) => {
              const barHeight = Math.max(item.percentage > 0 ? 4 : 0, (item.percentage / 100) * chartHeight);
              const xPos =
                paddingLeft +
                index * slotWidth +
                (slotWidth - barWidth) / 2;
              const yPos = paddingTop + chartHeight - barHeight;
              const isHovered = hoveredIndex === index;

              return (
                <g
                  key={item.category}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Invisible Full-Column Hit Area to eliminate mouse jitter */}
                  <rect
                    x={paddingLeft + index * slotWidth}
                    y={0}
                    width={slotWidth}
                    height={svgHeight}
                    fill="transparent"
                    style={{ pointerEvents: 'all' }}
                  />

                  {/* Percentage Label on Top of the Bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={Math.max(14, yPos - 6)}
                    className="chart-bar-value"
                    style={{
                      fill: isHovered ? item.color : '#0F172A',
                      fontWeight: isHovered ? 800 : 700,
                      pointerEvents: 'none'
                    }}
                  >
                    {item.label || `${item.percentage}%`}
                  </text>

                  {/* The Bar */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={barHeight}
                    fill={item.color}
                    rx="4"
                    className={`chart-bar ${isHovered ? 'is-hovered' : ''} ${hoveredIndex !== null && !isHovered ? 'is-dimmed' : ''}`}
                    style={{
                      transformOrigin: `${xPos + barWidth / 2}px ${paddingTop + chartHeight}px`,
                      opacity: hoveredIndex !== null && !isHovered ? 0.35 : 1,
                      stroke: isHovered ? '#FFFFFF' : 'none',
                      strokeWidth: isHovered ? 2 : 0,
                      filter: isHovered ? `drop-shadow(0 2px 8px ${item.color}88)` : 'none',
                      transition: 'opacity 0.2s ease, filter 0.2s ease, stroke 0.2s ease, height 0.3s ease, y 0.3s ease',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Category Label below the Bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={svgHeight - 8}
                    className="chart-category-label"
                    style={{
                      fill: isHovered ? '#0F172A' : '#475569',
                      fontWeight: isHovered ? 700 : 600,
                      pointerEvents: 'none'
                    }}
                  >
                    {item.category}
                  </text>
                </g>
              );
            })}

            {/* In-chart floating tooltip badge */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (() => {
              const item = chartData[hoveredIndex];
              const itemHeight = Math.max(item.percentage > 0 ? 4 : 0, (item.percentage / 100) * chartHeight);
              const itemY = paddingTop + chartHeight - itemHeight;
              const colCenter = paddingLeft + hoveredIndex * slotWidth + slotWidth / 2;
              const tipW = 114;
              const tipH = 36;
              const tipX = Math.max(paddingLeft, Math.min(svgWidth - paddingRight - tipW, colCenter - tipW / 2));
              const tipY = itemY < 48 ? itemY + 8 : Math.max(6, itemY - tipH - 8);

              return (
                <g className="chart-floating-tooltip" pointerEvents="none">
                  <rect
                    x={tipX}
                    y={tipY}
                    width={tipW}
                    height={tipH}
                    rx="6"
                    fill="#0F172A"
                    stroke={item.color}
                    strokeWidth="1.5"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(15, 23, 42, 0.45))' }}
                  />
                  <text
                    x={tipX + tipW / 2}
                    y={tipY + 15}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="inherit"
                  >
                    {item.category}: {item.percentage}%
                  </text>
                  <text
                    x={tipX + tipW / 2}
                    y={tipY + 28}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="inherit"
                  >
                    {item.count ?? 0} {item.count === 1 ? 'student' : 'students'}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Hover info footer (Fixed height to eliminate layout shifting) */}
        <div
          className="chart-hover-footer"
          style={{
            height: '28px',
            minHeight: '28px',
            maxHeight: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '6px'
          }}
        >
          {hoveredIndex !== null && chartData[hoveredIndex] ? (
            <div
              className="chart-hover-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: `${chartData[hoveredIndex].color}15`,
                color: chartData[hoveredIndex].color,
                border: `1px solid ${chartData[hoveredIndex].color}40`,
                transition: 'all 0.15s ease'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: chartData[hoveredIndex].color
                }}
              />
              <span>
                {chartData[hoveredIndex].category}: {chartData[hoveredIndex].percentage}%
                {' • '}{chartData[hoveredIndex].count ?? 0} {chartData[hoveredIndex].count === 1 ? 'student' : 'students'}
              </span>
            </div>
          ) : (
            <span
              className="chart-hover-hint"
              style={{
                fontSize: '0.74rem',
                color: '#94A3B8',
                fontWeight: 500
              }}
            >
              Hover over any bar to inspect cohort breakdown
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceChart;
