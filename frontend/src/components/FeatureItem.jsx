import React from 'react';
import { TargetIcon, ChartIcon, StarIcon } from './Icons';

const FEATURES = [
  {
    id: 'personalized',
    title: 'Personalized Learning',
    description: 'Get quizzes tailored to your needs',
    iconBg: '#EBF3FE',
    icon: <TargetIcon size={24} color="#1D68F2" />
  },
  {
    id: 'progress',
    title: 'Track Your Progress',
    description: 'Monitor your performance easily',
    iconBg: '#E6FAF0',
    icon: <ChartIcon size={24} color="#00BA88" />
  },
  {
    id: 'recommendations',
    title: 'Smart Recommendations',
    description: 'Practice what matters most',
    iconBg: '#FFF2E6',
    icon: <StarIcon size={24} color="#FA8C16" />
  }
];

export const FeatureList = () => {
  return (
    <div className="features-container">
      {FEATURES.map((feature) => (
        <div key={feature.id} className="feature-item">
          <div
            className="feature-icon-wrapper"
            style={{ backgroundColor: feature.iconBg }}
          >
            {feature.icon}
          </div>
          <div className="feature-text">
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
