import React from 'react';

const StatCard = ({ label, value, color, icon }) => {
  return (
    <div className={`asc-card asc-${color}`}>
      <div className={`asc-icon asc-icon-${color}`}>
        {icon}
      </div>
      <div className="asc-body">
        <span className="asc-label">{label}</span>
        <span className={`asc-value ${color === 'purple' ? 'asc-health' : ''}`}>{value}</span>
      </div>
    </div>
  );
};

export default StatCard;
