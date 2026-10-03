import React from 'react';

export const PlusSquareIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export const AnalyticsGraphIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"></path>
    <path d="M12 20V4"></path>
    <path d="M6 20v-6"></path>
  </svg>
);

export const DownloadTrayIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export const QuickActionCard = ({
  label,
  variant = 'blue', // 'blue', 'purple', 'green'
  icon: CustomIcon,
  onClick
}) => {
  const getIcon = () => {
    if (CustomIcon) return <CustomIcon size={20} />;
    switch (variant) {
      case 'blue':
        return <PlusSquareIcon size={20} />;
      case 'purple':
        return <AnalyticsGraphIcon size={20} />;
      case 'green':
        return <DownloadTrayIcon size={20} />;
      default:
        return <PlusSquareIcon size={20} />;
    }
  };

  return (
    <button
      type="button"
      className={`educator-quick-action-card action-${variant}`}
      onClick={onClick}
      aria-label={label}
    >
      <div className="educator-action-icon-box">
        {getIcon()}
      </div>
      <span className="educator-action-text">{label}</span>
    </button>
  );
};

export default QuickActionCard;
