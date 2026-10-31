import React, { useState, useEffect } from 'react';
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
import { sharedDatabase } from '../services/sharedDatabase';

export const TakeQuizView = ({
  quizzes: passedQuizzes,
  onStartQuiz,
  externalSearch = '',
  completedQuizIds = [],
  isRecommendedView = false
}) => {
  const [internalQuizzes, setInternalQuizzes] = useState(() => {
    if (Array.isArray(passedQuizzes) && passedQuizzes.length > 0) return passedQuizzes;
    return typeof sharedDatabase?.getPublishedQuizzes === 'function' ? sharedDatabase.getPublishedQuizzes() : [];
  });

  useEffect(() => {
    if (Array.isArray(passedQuizzes) && passedQuizzes.length > 0) {
      setInternalQuizzes(passedQuizzes);
    }
  }, [passedQuizzes]);

  useEffect(() => {
    if (typeof sharedDatabase?.syncQuizzesFromBackend === 'function') {
      sharedDatabase.syncQuizzesFromBackend(true).then((synced) => {
        if (Array.isArray(synced) && synced.length > 0) {
          setInternalQuizzes(typeof sharedDatabase?.getPublishedQuizzes === 'function' ? sharedDatabase.getPublishedQuizzes() : synced);
        }
      }).catch(() => {});
    }

    const handleUpdate = () => {
      if (typeof sharedDatabase?.getPublishedQuizzes === 'function') {
        setInternalQuizzes(sharedDatabase.getPublishedQuizzes());
      }
    };
    window.addEventListener('learnsmart_quizzes_updated', handleUpdate);
    return () => window.removeEventListener('learnsmart_quizzes_updated', handleUpdate);
  }, []);

  const quizzes = internalQuizzes.length > 0
    ? internalQuizzes
    : (Array.isArray(passedQuizzes) && passedQuizzes.length > 0 ? passedQuizzes : (typeof sharedDatabase?.getPublishedQuizzes === 'function' ? sharedDatabase.getPublishedQuizzes() : []));

  const [selectedCategory, setSelectedCategory] = useState(() =>
    isRecommendedView ? 'Recommended' : 'All'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedAuthor, setSelectedAuthor] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

  const isQuizCompleted = (quiz) => {
    if (!quiz) return false;
    const qId = String(quiz.id || '').trim();
    const qTitle = String(quiz.title || '').trim().toLowerCase();
    return (completedQuizIds || []).some((item) => {
      if (!item) return false;
      const itemStr = String(item).trim();
      return (
        item === quiz.id ||
        itemStr === qId ||
        itemStr.toLowerCase() === qTitle ||
        (qId && (itemStr === `quiz-${qId}` || qId === `quiz-${itemStr}`))
      );
    });
  };

  React.useEffect(() => {
    if (isRecommendedView) {
      setSelectedCategory('Recommended');
    } else {
      setSelectedCategory('All');
    }
  }, [isRecommendedView]);

  const baseCategories = ['Programming', 'Cyber Security', 'DSA', 'Mathematics'];
  const extraCategories = Array.from(
    new Set((quizzes || []).map((q) => q.category).filter(Boolean))
  ).filter((c) => !baseCategories.some((b) => b.toLowerCase() === c.toLowerCase()));
  const categories = ['Recommended', 'All', ...baseCategories, ...extraCategories];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  const effectiveSearch = (externalSearch || localSearch).trim().toLowerCase();

  const filteredQuizzes = (quizzes || []).filter((quiz) => {
    let matchesCat = true;
    if (selectedCategory === 'Recommended') {
      const hasAnyRec = (quizzes || []).some((q) => q.isRecommended === true);
      matchesCat = hasAnyRec ? quiz.isRecommended === true : true;
    } else if (selectedCategory !== 'All') {
      matchesCat = (quiz.category || '').toLowerCase() === selectedCategory.toLowerCase();
    }

    const quizDiff = (quiz.difficulty || 'Medium').toLowerCase();
    const matchesDiff =
      selectedDifficulty === 'All' || quizDiff === selectedDifficulty.toLowerCase();

    const authorName = (quiz.author_name || quiz.authorName || '').toLowerCase();
    const authorRole = (quiz.author_role || '').toLowerCase();
    const isEdu = authorRole === 'educator' || authorName.includes('sarah') || authorName.includes('educator') || (quiz.author_id && String(quiz.author_id).startsWith('edu'));
    const isAdmin = authorRole === 'admin' || authorName.includes('admin') || (quiz.author_id && String(quiz.author_id).startsWith('admin'));

    let matchesAuth = true;
    if (selectedAuthor === 'Educator') {
      matchesAuth = isEdu;
    } else if (selectedAuthor === 'Admin') {
      matchesAuth = isAdmin;
    }

    const matchesSearch =
      effectiveSearch === '' ||
      (quiz.title || '').toLowerCase().includes(effectiveSearch) ||
      (quiz.category || '').toLowerCase().includes(effectiveSearch) ||
      (quiz.description && quiz.description.toLowerCase().includes(effectiveSearch)) ||
      authorName.includes(effectiveSearch) ||
      authorRole.includes(effectiveSearch) ||
      (effectiveSearch.includes('educator') && isEdu) ||
      (effectiveSearch.includes('admin') && isAdmin) ||
      (effectiveSearch.includes('sarah') && isEdu);

    return matchesCat && matchesDiff && matchesAuth && matchesSearch;
  });

  const handleResetFilters = () => {
    setSelectedCategory(isRecommendedView ? 'Recommended' : 'All');
    setSelectedDifficulty('All');
    setSelectedAuthor('All');
    setLocalSearch('');
  };

  const getQuizIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('program') || cat.includes('python') || cat.includes('javascript')) {
      return <PythonIcon size={24} />;
    }
    if (cat.includes('secur') || cat.includes('cyber')) {
      return <ShieldIcon size={24} color="#8B5CF6" />;
    }
    if (cat.includes('dsa') || cat.includes('algo') || cat.includes('data')) {
      return <CodeIcon size={24} color="#1D68F2" />;
    }
    return <TargetIcon size={24} color="#F59E0B" />;
  };

  const isShowingRecommendations = selectedCategory === 'Recommended';

  return (
    <div className="tab-view-container take-quiz-view">
      <div className={`quiz-hero-banner ${isShowingRecommendations ? 'recommended-hero-banner' : ''}`}>
        <div className="banner-left-info">
          <div className="banner-streak-badge">
            {isShowingRecommendations ? (
              <>
                <StarIcon size={16} color="#F59E0B" />
                <span>AI Adaptive Recommendations</span>
              </>
            ) : (
              <>
                <FlameIcon size={16} color="#FF6B00" />
                <span>Daily Adaptive Challenge</span>
              </>
            )}
          </div>
          <h2 className="banner-title">
            {isShowingRecommendations
              ? 'Personalized Recommended Quizzes For You'
              : 'Ready to challenge your knowledge today?'}
          </h2>
          <p className="banner-subtext">
            {isShowingRecommendations
              ? 'Based on your diagnostic scores, performance history, and curriculum priorities, these adaptive quizzes target your skill gaps and reinforce key concepts.'
              : 'Adaptive quizzes continuously adjust difficulty to your individual performance. Earn double points and advance your learning streak!'}
          </p>
        </div>
        <div className="banner-right-action">
          <button
            type="button"
            className="banner-cta-button"
            onClick={() => {
              const target =
                filteredQuizzes.find((q) => !isQuizCompleted(q)) ||
                filteredQuizzes[0] ||
                quizzes[0];
              onStartQuiz(target);
            }}
            title={isShowingRecommendations ? 'Start Top Recommendation' : 'Start Daily Challenge'}
          >
            <span>
              {isShowingRecommendations ? 'Start Recommended Quiz' : 'Start Daily Challenge'}
            </span>
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
              className={`category-pill ${selectedCategory === cat ? 'active' : ''} ${cat === 'Recommended' ? 'recommended-pill' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'Recommended' ? '★ Recommended' : cat}
            </button>
          ))}
        </div>

        <div className="filters-right-group">
          <div className="difficulty-select-wrap author-select-wrap">
            <select
              className="difficulty-select"
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              aria-label="Filter by author"
              style={{ minWidth: '130px' }}
            >
              <option value="All">All Authors</option>
              <option value="Educator">Educator (Dr. Sarah)</option>
              <option value="Admin">Admin (System)</option>
            </select>
          </div>

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
                  {quiz.isRecommended && (
                    <span className="quiz-badge badge-rec-tag">
                      ★ Recommended
                    </span>
                  )}
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
                  <span
                    className="quiz-badge"
                    style={{
                      backgroundColor: (quiz.author_role === 'admin' || (quiz.author_id && String(quiz.author_id).startsWith('admin'))) ? '#EDE9FE' : '#E0F2FE',
                      color: (quiz.author_role === 'admin' || (quiz.author_id && String(quiz.author_id).startsWith('admin'))) ? '#6D28D9' : '#0369A1',
                      fontWeight: 600
                    }}
                  >
                    👤 {quiz.author_name || quiz.authorName || ((quiz.author_role === 'admin' || (quiz.author_id && String(quiz.author_id).startsWith('admin'))) ? 'Admin' : 'Dr. Sarah Jenkins')}
                  </span>
                </div>
              </div>

              <div className="catalog-card-body">
                <h3 className="catalog-quiz-title">{quiz.title}</h3>
                <p className="catalog-quiz-desc">{quiz.description}</p>
                {quiz.recommendationReason && (
                  <div className="quiz-card-rec-reason">
                    <span>{quiz.recommendationReason}</span>
                  </div>
                )}
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
                <span className="catalog-meta-item" style={{ color: '#475569', fontWeight: 500 }}>
                  <span>By {quiz.author_name || quiz.authorName || ((quiz.author_role === 'admin' || (quiz.author_id && String(quiz.author_id).startsWith('admin'))) ? 'System Admin' : 'Dr. Sarah Jenkins')}</span>
                </span>
              </div>

              <div className="catalog-card-footer">
                <button
                  type="button"
                  className={`start-quiz-full-btn ${isQuizCompleted(quiz) ? 'completed-btn' : ''}`}
                  onClick={() => onStartQuiz(quiz)}
                  title={isQuizCompleted(quiz) ? 'Quiz already completed' : `Start ${quiz.title}`}
                >
                  <span>{isQuizCompleted(quiz) ? 'Completed ✓' : 'Take Quiz Now'}</span>
                  <span>{isQuizCompleted(quiz) ? '' : '→'}</span>
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
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
