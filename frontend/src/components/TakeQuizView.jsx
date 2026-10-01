import React, { useState } from 'react';
import {
  PythonIcon,
  ShieldIcon,
  CodeIcon,
  TargetIcon,
  SearchIcon,
  ClockIcon,
  StarIcon,
  FlameIcon,
  FilterIcon
} from './Icons';

export const TakeQuizView = ({ quizzes, onStartQuiz, externalSearch = '' }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

  const categories = ['All', 'Programming', 'Cyber Security', 'DSA', 'Mathematics'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const effectiveSearch = (externalSearch || localSearch).trim().toLowerCase();

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesCat =
      selectedCategory === 'All' || quiz.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDiff =
      selectedDifficulty === 'All' || quiz.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
    const matchesSearch =
      effectiveSearch === '' ||
      quiz.title.toLowerCase().includes(effectiveSearch) ||
      quiz.category.toLowerCase().includes(effectiveSearch) ||
      (quiz.description && quiz.description.toLowerCase().includes(effectiveSearch));

    return matchesCat && matchesDiff && matchesSearch;
  });

  const getQuizIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'programming':
        return <PythonIcon size={24} />;
      case 'cyber security':
        return <ShieldIcon size={24} color="#8B5CF6" />;
      case 'dsa':
        return <CodeIcon size={24} color="#1D68F2" />;
      default:
        return <TargetIcon size={24} color="#F59E0B" />;
    }
  };

  return (
    <div className="tab-view-container take-quiz-view">
      <div className="quiz-hero-banner">
        <div className="banner-left-info">
          <div className="banner-streak-badge">
            <FlameIcon size={16} color="#FF6B00" />
            <span>Daily Adaptive Challenge</span>
          </div>
          <h2 className="banner-title">Ready to challenge your knowledge today?</h2>
          <p className="banner-subtext">
            Adaptive quizzes continuously adjust difficulty to your individual performance.
            Earn double points and advance your learning streak!
          </p>
        </div>
        <div className="banner-right-action">
          <button
            type="button"
            className="banner-cta-button"
            onClick={() => onStartQuiz(quizzes[0])}
          >
            <span>Start Daily Challenge</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <div className="quiz-filters-toolbar">
        <div className="category-pills-row">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="filters-right-group">
          <div className="difficulty-select-wrap">
            <FilterIcon size={14} color="#64748B" />
            <select
              className="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              aria-label="Filter by difficulty"
            >
              {difficulties.map((diff) => (
                <option key={diff} value={diff}>
                  {diff === 'All' ? 'All Difficulties' : diff}
                </option>
              ))}
            </select>
          </div>

          <div className="quick-search-box">
            <SearchIcon size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search quiz..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="quick-search-input"
            />
          </div>
        </div>
      </div>

      <div className="quizzes-catalog-grid">
        {filteredQuizzes.length > 0 ? (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-catalog-card">
              <div className="catalog-card-top">
                <div className="catalog-icon-box">
                  {getQuizIcon(quiz.category)}
                </div>

                <div className="catalog-badges-wrap">
                  <span
                    className="quiz-badge"
                    style={{
                      backgroundColor: quiz.categoryBg || '#E6FAF0',
                      color: quiz.categoryColor || '#00BA88'
                    }}
                  >
                    {quiz.category}
                  </span>
                  <span
                    className="quiz-badge"
                    style={{
                      backgroundColor: quiz.diffBg || '#D1FAE5',
                      color: quiz.diffColor || '#047857'
                    }}
                  >
                    {quiz.difficulty}
                  </span>
                </div>
              </div>

              <div className="catalog-card-body">
                <h3 className="catalog-quiz-title">{quiz.title}</h3>
                <p className="catalog-quiz-desc">{quiz.description}</p>
              </div>

              <div className="catalog-meta-row">
                <span className="catalog-meta-item">
                  <TargetIcon size={14} color="#64748B" />
                  <span>{quiz.questionsLabel || `${quiz.questionsCount || 5} Questions`}</span>
                </span>
                <span className="catalog-meta-item">
                  <ClockIcon size={14} color="#64748B" />
                  <span>{quiz.duration || '5 mins'}</span>
                </span>
                <span className="catalog-meta-item">
                  <StarIcon size={14} color="#F59E0B" />
                  <span>Pass: 70%</span>
                </span>
              </div>

              <div className="catalog-card-footer">
                <button
                  type="button"
                  className="start-quiz-full-btn"
                  onClick={() => onStartQuiz(quiz)}
                >
                  <span>Take Quiz Now</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-quizzes-found">
            <p className="no-quizzes-msg">No quizzes match your selected filter criteria.</p>
            <button
              type="button"
              className="reset-filters-btn"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedDifficulty('All');
                setLocalSearch('');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
