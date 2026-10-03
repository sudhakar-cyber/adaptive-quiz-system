import React, { useState } from 'react';

export const PERFORMANCE_DATA = [
  { category: 'Excellent', percentage: 78, label: '78%', color: '#10B981' }, // Vibrant Emerald Green
  { category: 'Good', percentage: 65, label: '65%', color: '#2563EB' },      // Vibrant Blue
  { category: 'Average', percentage: 45, label: '45%', color: '#F97316' },   // Vibrant Orange
  { category: 'Below Avg', percentage: 12, label: '12%', color: '#EF4444' }  // Vibrant Coral/Red
];

export const StudentPerformanceChart = ({
  data = PERFORMANCE_DATA,
  title = 'Student Performance'
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

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
  const barCount = data.length;
  const slotWidth = chartWidth / barCount;
  const barWidth = 34; // Bar width matching image

  return (
    <div className="educator-content-card educator-chart-card">
      <h2 className="educator-card-title">{title}</h2>

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
            {data.map((item, index) => {
              const barHeight = (item.percentage / 100) * chartHeight;
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
                >
                  {/* Percentage Label on Top of the Bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={yPos - 6}
                    className="chart-bar-value"
                    style={{
                      fill: isHovered ? item.color : '#0F172A',
                      fontWeight: 700
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
                    className="chart-bar"
                    style={{
                      transformOrigin: `${xPos + barWidth / 2}px ${paddingTop + chartHeight}px`,
                      opacity: hoveredIndex !== null && !isHovered ? 0.7 : 1
                    }}
                  />

                  {/* Category Label below the Bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={svgHeight - 8}
                    className="chart-category-label"
                    style={{
                      fill: isHovered ? '#0F172A' : '#475569',
                      fontWeight: isHovered ? 700 : 600
                    }}
                  >
                    {item.category}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceChart;
