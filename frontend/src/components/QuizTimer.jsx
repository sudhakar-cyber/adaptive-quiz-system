import React from 'react';
import { ClockIcon } from './Icons';

export const QuizTimer = ({ timeLeft }) => {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const isWarning = timeLeft < 60;

  return (
    <div className={`quiz-timer-pill ${isWarning ? 'timer-warning' : ''}`}>
      <ClockIcon size={16} color={isWarning ? '#EF4444' : '#1A6BFF'} />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default QuizTimer;
