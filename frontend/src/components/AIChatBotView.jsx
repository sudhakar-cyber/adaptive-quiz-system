import React, { useState, useRef, useEffect } from 'react';
import {
  BotIcon,
  SendIcon,
  SparklesIcon,
  PlayIcon,
  StarIcon
} from './Icons';
import { QUIZ_CATALOG } from '../data/quizData';

export const AIChatBotView = ({
  username = 'Student',
  quizzes = QUIZ_CATALOG,
  onStartQuiz,
  onBackToDashboard,
  onSwitchToAllQuizzes,
  completedQuizIds = []
}) => {
  const userInitials = (() => {
    const parts = (username || 'Student').split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (username ? username.slice(0, 2) : 'ST').toUpperCase();
  })();

  const [messages, setMessages] = useState(() => {
    // Initial welcome message from LearnSmart AI
    const recommended = quizzes.filter((q) => q.isRecommended).slice(0, 3);
    return [
      {
        id: 'msg-welcome',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Hello **${username}**! 👋 I'm your **LearnSmart Adaptive AI Tutor**.\n\nI monitor your learning progress and performance in real-time. Based on your profile, here are today's top personalized quiz recommendations for you:`,
        recommendedQuizzes: recommended,
        suggestedActions: [
          '🎯 Recommend a quiz for my skill level',
          '🐍 Show Python quizzes',
          '🛡️ Test my Cyber Security skills',
          '🌳 Algorithms & DSA practice',
          '💡 Explain Time Complexity in DSA'
        ]
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = (textToSend = null) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Simulate AI reasoning delay
    setTimeout(() => {
      const botResponse = generateAIResponse(query, username, quizzes, completedQuizIds);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    const recommended = quizzes.filter((q) => q.isRecommended).slice(0, 3);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Chat refreshed! How can I help with your quizzes and studies today, **${username}**?`,
        recommendedQuizzes: recommended,
        suggestedActions: [
          '🎯 Recommend a quiz for my skill level',
          '🐍 Show Python quizzes',
          '🛡️ Test my Cyber Security skills',
          '🌳 Algorithms & DSA practice'
        ]
      }
    ]);
  };

  return (
    <div className="ai-chatbot-page">
      {/* Bot Top Header */}
      <header className="ai-bot-header">
        <div className="ai-bot-header-left">
          <button
            type="button"
            className="ai-back-btn"
            onClick={onBackToDashboard}
            title="Return to Dashboard"
          >
            ← Dashboard
          </button>
          <div className="ai-avatar-badge">
            <div className="ai-bot-avatar">
              <BotIcon size={24} color="#FFFFFF" />
            </div>
            <span className="ai-status-dot" />
          </div>
          <div className="ai-bot-meta">
            <div className="ai-bot-title-row">
              <h1 className="ai-bot-title">LearnSmart AI Assistant</h1>
              <span className="ai-engine-pill">
                <SparklesIcon size={13} color="#2563EB" />
                Adaptive Engine Active
              </span>
            </div>
            <p className="ai-bot-subtitle">
              Personalized quiz recommendations, concept tutor, and adaptive study guidance.
            </p>
          </div>
        </div>

        <div className="ai-bot-header-right">
          <button
            type="button"
            className="ai-header-action-btn"
            onClick={onSwitchToAllQuizzes}
          >
            <StarIcon size={16} color="currentColor" />
            <span>Browse All Quizzes</span>
          </button>
          <button
            type="button"
            className="ai-header-clear-btn"
            onClick={handleClearChat}
            title="Clear conversation history"
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Chat Messages Container */}
      <div className="ai-chat-body">
        <div className="ai-messages-list">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
            >
              {msg.sender === 'bot' && (
                <div className="ai-msg-avatar">
                  <BotIcon size={18} color="#FFFFFF" />
                </div>
              )}

              <div className={`ai-message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                <div className="ai-msg-header">
                  <span className="ai-msg-sender">
                    {msg.sender === 'bot' ? 'LearnSmart AI' : username}
                  </span>
                  <span className="ai-msg-time">{msg.timestamp}</span>
                </div>

                <div className="ai-msg-content">
                  {renderFormattedText(msg.text)}
                </div>

                {/* Embedded Interactive Quiz Recommendations */}
                {msg.recommendedQuizzes && msg.recommendedQuizzes.length > 0 && (
                  <div className="ai-recommended-quizzes-grid">
                    {msg.recommendedQuizzes.map((quiz) => {
                      const isCompleted = completedQuizIds.includes(quiz.id);
                      return (
                        <div key={quiz.id} className="ai-quiz-card">
                          <div className="ai-quiz-card-top">
                            <span
                              className="ai-quiz-cat-badge"
                              style={{
                                backgroundColor: quiz.categoryBg || '#E6FAF0',
                                color: quiz.categoryColor || '#00BA88'
                              }}
                            >
                              {quiz.category}
                            </span>
                            <span
                              className="ai-quiz-diff-badge"
                              style={{
                                backgroundColor: quiz.diffBg || '#D1FAE5',
                                color: quiz.diffColor || '#047857'
                              }}
                            >
                              {quiz.difficulty}
                            </span>
                          </div>

                          <h4 className="ai-quiz-card-title">{quiz.title}</h4>
                          <p className="ai-quiz-card-desc">{quiz.description}</p>

                          <div className="ai-quiz-card-meta">
                            <span>⏱ {quiz.duration}</span>
                            <span>•</span>
                            <span>❓ {quiz.questionsCount || quiz.questions?.length} Qs</span>
                          </div>

                          {quiz.recommendationReason && (
                            <div className="ai-quiz-reason-pill">
                              <SparklesIcon size={12} color="#8B5CF6" />
                              <span>{quiz.recommendationReason}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            className={`ai-quiz-start-btn ${isCompleted ? 'completed' : ''}`}
                            onClick={() => onStartQuiz && onStartQuiz(quiz)}
                          >
                            <PlayIcon size={15} color="#FFFFFF" />
                            <span>{isCompleted ? 'Retake Quiz' : 'Start Recommended Quiz'}</span>
                            <span className="btn-arrow">→</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="ai-suggested-actions">
                    <span className="ai-actions-label">Suggested Follow-ups:</span>
                    <div className="ai-action-chips-wrap">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="ai-prompt-chip"
                          onClick={() => handleSendMessage(action)}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="ai-user-msg-avatar" title={username}>
                  {userInitials}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="ai-message-row bot-row">
              <div className="ai-msg-avatar">
                <BotIcon size={18} color="#FFFFFF" />
              </div>
              <div className="ai-message-bubble bot-bubble typing-bubble">
                <div className="ai-typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="typing-text">LearnSmart AI is finding optimal quizzes...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar Footer with Quick Chips */}
      <footer className="ai-bot-footer">
        <div className="ai-footer-chips-bar">
          <span className="ai-footer-chip-label">Quick Prompts:</span>
          <button
            type="button"
            className="ai-footer-chip"
            onClick={() => handleSendMessage('🎯 Recommend a quiz for my skill level')}
          >
            🎯 Best Quiz for Me
          </button>
          <button
            type="button"
            className="ai-footer-chip"
            onClick={() => handleSendMessage('🐍 Show Python quizzes')}
          >
            🐍 Python Quizzes
          </button>
          <button
            type="button"
            className="ai-footer-chip"
            onClick={() => handleSendMessage('🛡️ Test my Cyber Security skills')}
          >
            🛡️ Cyber Security
          </button>
          <button
            type="button"
            className="ai-footer-chip"
            onClick={() => handleSendMessage('🌳 Algorithms & DSA practice')}
          >
            🌳 DSA Practice
          </button>
          <button
            type="button"
            className="ai-footer-chip"
            onClick={() => handleSendMessage('📊 Where are my learning gaps?')}
          >
            📊 Learning Gaps
          </button>
        </div>

        <div className="ai-input-container">
          <div className="ai-input-prefix">
            <SparklesIcon size={20} color="#2563EB" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-input"
            placeholder="Ask for quiz recommendations or any topic (e.g. 'Recommend a quiz for Python' or 'What should I study?')..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            type="button"
            className="ai-send-btn"
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isTyping}
            aria-label="Send message"
          >
            <SendIcon size={18} color="#FFFFFF" />
          </button>
        </div>
        <div className="ai-input-hint">
          <span>Tip: Ask for specific topics, difficulty levels, or click any recommended quiz card above to start immediately!</span>
        </div>
      </footer>
    </div>
  );
};

// Helper to format bold markdown and line breaks
function renderFormattedText(text) {
  if (!text) return null;
  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    return (
      <p key={pIdx} className="ai-text-para">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {formatBold(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function formatBold(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Logic engine for dynamic, intelligent AI responses
function generateAIResponse(query, username, allQuizzes, completedIds) {
  const qLower = query.toLowerCase();

  // 1. Python Quizzes
  if (qLower.includes('python') || qLower.includes('programming')) {
    const pythonQuizzes = allQuizzes.filter((q) =>
      q.category.toLowerCase().includes('programming') ||
      q.title.toLowerCase().includes('python')
    );
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Great choice! 🐍 Python is one of the most in-demand programming languages for backend engineering, AI, and data science.\n\nHere are the recommended **Python** quizzes suited for your skill level:`,
      recommendedQuizzes: pythonQuizzes.length > 0 ? pythonQuizzes : allQuizzes.slice(0, 2),
      suggestedActions: [
        '💡 What are Python decorators?',
        '🎯 Recommend another challenge quiz',
        '🌳 Switch to Data Structures'
      ]
    };
  }

  // 2. Cyber Security Quizzes
  if (qLower.includes('security') || qLower.includes('cyber') || qLower.includes('hacker') || qLower.includes('defense')) {
    const secQuizzes = allQuizzes.filter((q) =>
      q.category.toLowerCase().includes('cyber') ||
      q.category.toLowerCase().includes('security') ||
      q.title.toLowerCase().includes('security')
    );
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🛡️ **Cyber Security** is critical in modern digital systems! Testing your knowledge of cryptography, authentication protocols, and threat vectors will sharpen your analytical skills.\n\nHere are the top **Cyber Security** quizzes ready for you:`,
      recommendedQuizzes: secQuizzes.length > 0 ? secQuizzes : allQuizzes.slice(0, 2),
      suggestedActions: [
        '🛡️ What is a Man-in-the-Middle attack?',
        '🎯 Recommend an advanced quiz',
        '🐍 Back to Python basics'
      ]
    };
  }

  // 3. Data Structures & Algorithms
  if (qLower.includes('dsa') || qLower.includes('structure') || qLower.includes('algorithm') || qLower.includes('tree') || qLower.includes('binary')) {
    const dsaQuizzes = allQuizzes.filter((q) =>
      q.category.toLowerCase().includes('dsa') ||
      q.title.toLowerCase().includes('data structure') ||
      q.title.toLowerCase().includes('tree') ||
      q.title.toLowerCase().includes('algorithm')
    );
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🌳 **Data Structures & Algorithms (DSA)** are the backbone of problem solving and technical interviews. Mastering trees, heaps, arrays, and graphs will accelerate your performance.\n\nHere are the recommended **DSA** quizzes for you:`,
      recommendedQuizzes: dsaQuizzes.length > 0 ? dsaQuizzes : allQuizzes.slice(0, 2),
      suggestedActions: [
        '💡 Explain Time Complexity in DSA',
        '🎯 Recommend a Beginner DSA quiz',
        '📊 Where are my learning gaps?'
      ]
    };
  }

  // 4. Time Complexity Explanation
  if (qLower.includes('time complexity') || qLower.includes('big o') || qLower.includes('complexity')) {
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `⏱️ **Time Complexity Explained Simply:**\n\nTime complexity measures how runtime grows as input size ($n$) increases:\n\n• **O(1) Constant Time:** Instant access (e.g. array indexing or hash map lookup).\n• **O(log n) Logarithmic Time:** Halving problem space each step (e.g. Binary Search).\n• **O(n) Linear Time:** Visiting every element once (e.g. single loop search).\n• **O(n log n) Linearithmic Time:** Optimal comparison sorting (e.g. Merge Sort, Quick Sort).\n• **O(n²) Quadratic Time:** Nested loops over inputs (e.g. Bubble Sort).\n\nReady to put this knowledge to the test? Here is a quiz to practice:`,
      recommendedQuizzes: allQuizzes.slice(0, 2),
      suggestedActions: [
        '🌳 Algorithms & DSA practice',
        '🎯 Recommend a quiz for my skill level',
        '🐍 Show Python quizzes'
      ]
    };
  }

  // 5. Gap / Weakness Analysis
  if (qLower.includes('gap') || qLower.includes('weak') || qLower.includes('focus') || qLower.includes('study')) {
    const uncompleted = allQuizzes.filter((q) => !completedIds.includes(q.id));
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `📊 **Adaptive Performance Analysis for ${username}:**\n\n• **Strongest Subject:** Programming & Python Core\n• **Recommended Growth Area:** Advanced Data Structures & Algorithm Design\n• **Suggested Strategy:** Focus on intermediate quizzes to boost consistency and complete your weekly learning goal.\n\nHere are the quizzes specifically recommended to strengthen your focus areas:`,
      recommendedQuizzes: uncompleted.slice(0, 3),
      suggestedActions: [
        '🎯 Start recommended focus quiz',
        '💡 Explain Binary Trees in detail',
        '🛡️ Practice Cyber Security'
      ]
    };
  }

  // 6. Generic Recommendations & Fallback
  const picks = allQuizzes.filter((q) => q.isRecommended || !completedIds.includes(q.id)).slice(0, 3);
  return {
    id: `bot-${Date.now()}`,
    sender: 'bot',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: `I've analyzed the curriculum and your current adaptive trajectory, **${username}**.\n\nHere are the highest-priority quizzes tailored to challenge your thinking and optimize retention:`,
    recommendedQuizzes: picks.length > 0 ? picks : allQuizzes.slice(0, 3),
    suggestedActions: [
      '🎯 Recommend a quiz for my skill level',
      '🐍 Show Python quizzes',
      '🛡️ Test my Cyber Security skills',
      '🌳 Algorithms & DSA practice'
    ]
  };
}

export default AIChatBotView;
