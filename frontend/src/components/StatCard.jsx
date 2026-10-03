import React from 'react';

// Custom icons matching each stat card in the reference image
export const DocumentLinesIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <line x1="10" y1="9" x2="8" y2="9"></line>
  </svg>
);

export const StudentUserIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="10" cy="7" r="4"></circle>
    <path d="M18 8a3 3 0 0 1 0 6"></path>
    <path d="M22 21v-1.5a3 3 0 0 0-2-2.8"></path>
  </svg>
);

export const AscendingBarsIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="6"></line>
    <line x1="12" y1="20" x2="12" y2="10"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

export const ClockTimerIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

export const StatCard = ({
  title,
  value,
  variant = 'blue', // 'blue', 'green', 'amber', 'purple'
  icon: CustomIcon
}) => {
  // Select default icon based on variant if not passed
  const getIcon = () => {
    if (CustomIcon) return <CustomIcon size={22} />;
    switch (variant) {
      case 'blue':
        return <DocumentLinesIcon size={22} />;
      case 'green':
        return <StudentUserIcon size={22} />;
      case 'amber':
        return <AscendingBarsIcon size={22} />;
      case 'purple':
        return <ClockTimerIcon size={22} />;
      default:
        return <DocumentLinesIcon size={22} />;
    }
  };

  return (
    <div className={`educator-stat-card card-${variant}`}>
      <div className="educator-stat-icon-wrap">
        {getIcon()}
      </div>
      <div className="educator-stat-details">
        <span className="educator-stat-title">{title}</span>
        <span className="educator-stat-value">{value}</span>
      </div>
    </div>
  );
};

export default StatCard;
