import React from 'react';
import capIcon from '../assets/cap_icon.png';

export const NavbarLogo = ({ centered = false, size = 'default' }) => {
  const isLarge = size === 'large';
  
  return (
    <div className={`logo-brand ${centered ? 'logo-centered' : ''}`}>
      <img
        src={capIcon}
        alt="LearnSmart Graduation Cap"
        className={`logo-cap ${isLarge ? 'logo-cap-lg' : ''}`}
      />
      <div className="logo-text-group">
        <span className={`logo-title ${isLarge ? 'logo-title-lg' : ''}`}>
          LearnSmart
        </span>
        <span className={`logo-subtitle ${isLarge ? 'logo-subtitle-lg' : ''}`}>
          Adaptive Quiz System
        </span>
      </div>
    </div>
  );
};
