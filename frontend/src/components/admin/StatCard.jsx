import React from 'react';

const StatCard = ({ label, value, subtitle, color, icon, onClick }) => {
  return (
    <div
      className={`asc-card asc-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? `Click to view ${label}` : undefined}
      aria-label={label}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className={`asc-icon asc-icon-${color}`}>
        {icon}
      </div>
      <div className="asc-body">
        <span className="asc-label">{label}</span>
        <span className={`asc-value ${color === 'purple' ? 'asc-health' : ''}`}>{value}</span>
        {subtitle && (
          <span style={{ fontSize: '0.73rem', color: '#64748B', fontWeight: 600, marginTop: '3px' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
