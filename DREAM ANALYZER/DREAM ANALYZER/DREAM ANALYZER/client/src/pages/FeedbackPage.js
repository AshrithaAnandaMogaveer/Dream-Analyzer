import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaThumbsUp, 
  FaStar, 
  FaUser, 
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaPlus,
  FaQuoteLeft,
  FaChartBar,
  FaHeart,
  FaComment,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import './FeedbackPage.css';

const FeedbackPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filters = [
    { id: 'all', label: 'All Feedback' },
    { id: 'compliments', label: 'Compliments' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'bug-reports', label: 'Bug Reports' },
    { id: 'feature-requests', label: 'Feature Requests' }
  ];

  const sampleFeedback = [
    {
      id: 1,
      type: 'compliment',
      title: 'Amazing AI Analysis!',
      message: 'The dream analysis feature is incredibly accurate and helpful. It has given me insights I never would have thought of.',
      author: 'Sarah M.',
      rating: 5,
      category: 'functionality',
      date: '2024-01-15',
      likes: 12,
      comments: 3
    },
    {
      id: 2,
      type: 'feature-request',
      title: 'Voice Input for Dreams',
      message: 'It would be great to have voice input for recording dreams. Sometimes I wake up and want to quickly record my dream without typing.',
      author: 'Mike R.',
      rating: 4,
      category: 'ui-ux',
      date: '2024-01-14',
      likes: 8,
      comments: 5
    },
    {
      id: 3,
      type: 'suggestion',
      title: 'Better Dream Categories',
      message: 'Could you add more specific categories for dreams? Like lucid dreams, nightmares, recurring dreams, etc.',
      author: 'Emily C.',
      rating: 4,
      category: 'content',
      date: '2024-01-13',
      likes: 6,
      comments: 2
    },
    {
      id: 4,
      type: 'bug-report',
      title: 'App Crashes on iOS',
      message: 'The app keeps crashing when I try to save a dream on my iPhone. This happens every time I try to add an image.',
      author: 'John D.',
      rating: 2,
      category: 'performance',
      date: '2024-01-12',
      likes: 4,
      comments: 1
    }
  ];
  const [feedbackList, setFeedbackList] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('userFeedback') || '[]');
      return [...stored, ...sampleFeedback];
    } catch {
      return [...sampleFeedback];
    }
  });

  const [newFeedback, setNewFeedback] = useState({ type: 'compliment', title: '', message: '', rating: 0 });

  const filterType = activeFilter === 'all' ? null : ({
    compliments: 'compliment',
    suggestions: 'suggestion',
    'bug-reports': 'bug-report',
    'feature-requests': 'feature-request'
  }[activeFilter]);

  const filteredFeedback = feedbackList.filter(feedback => {
    const matchesFilter = !filterType || feedback.type === filterType;
    const q = searchQuery.toLowerCase();
    const matchesSearch = feedback.title.toLowerCase().includes(q) || feedback.message.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
  const sortedFeedback = [...filteredFeedback].sort((a, b) => (b.id || 0) - (a.id || 0));
  const visibleFeedback = showAll ? sortedFeedback : sortedFeedback.slice(0, 4);

  const handleSubmit = (e) => {
    e.preventDefault();
    const item = {
      id: Date.now(),
      type: newFeedback.type,
      title: newFeedback.title || 'Untitled',
      message: newFeedback.message || '',
      author: user?.name || user?.username || 'You',
      rating: newFeedback.rating,
      category: 'general',
      date: new Date().toLocaleDateString(),
      likes: 0,
      comments: 0
    };
    setFeedbackList(prev => [item, ...prev]);
    try {
      const stored = JSON.parse(localStorage.getItem('userFeedback') || '[]');
      localStorage.setItem('userFeedback', JSON.stringify([item, ...stored]));
    } catch {}
    setShowFeedbackForm(false);
    setNewFeedback({ type: 'compliment', title: '', message: '', rating: 0 });
  };

  const stats = {
    totalFeedback: 156,
    averageRating: 4.3,
    compliments: 89,
    suggestions: 34,
    bugReports: 18,
    featureRequests: 15
  };

  return (
    <div className="feedback-page">
      <div className="feedback-container">
        {/* Header */}
        <div className="feedback-header">
          <div className="header-content">
            <h1>Feedback & Reviews</h1>
            <p>See what our community is saying and share your thoughts</p>
          </div>
          {isAuthenticated && (
            <button 
              className="btn btn-primary submit-feedback-btn"
              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            >
              <FaPlus />
              Submit Feedback
            </button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <FaThumbsUp />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalFeedback}</div>
                <div className="stat-label">Total Feedback</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FaStar />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.averageRating}</div>
                <div className="stat-label">Average Rating</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FaHeart />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.compliments}</div>
                <div className="stat-label">Compliments</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FaComment />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.suggestions}</div>
                <div className="stat-label">Suggestions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="search-filters">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-buttons">
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && isAuthenticated && (
          <motion.div
            className="feedback-form-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="feedback-form">
              <h3>Submit Your Feedback</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Type of Feedback</label>
                  <select className="form-input" value={newFeedback.type} onChange={(e) => setNewFeedback({ ...newFeedback, type: e.target.value })}>
                    <option value="compliment">Compliment</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="bug-report">Bug Report</option>
                    <option value="feature-request">Feature Request</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description of your feedback"
                    value={newFeedback.title}
                    onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Please provide details about your feedback..."
                    value={newFeedback.message}
                    onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map(star => (
                      <FaStar
                        key={star}
                        className={`star ${star <= newFeedback.rating ? 'filled' : ''}`}
                        onClick={() => setNewFeedback({ ...newFeedback, rating: star })}
                      />
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" onClick={() => { setShowFeedbackForm(false); setNewFeedback({ type: 'compliment', title: '', message: '', rating: 0 }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* Feedback List */}
        <div className="feedback-list">
          {filteredFeedback.length === 0 ? (
            <div className="empty-state">
              <FaThumbsUp className="empty-icon" />
              <h3>No feedback found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
            <div className="feedback-grid">
              {visibleFeedback.map(feedback => (
                <motion.div
                  key={feedback.id}
                  className="feedback-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <div className="feedback-header">
                    <div className="feedback-meta">
                      <div className="author-info">
                        <div className="author-avatar">
                          <FaUser />
                        </div>
                        <div>
                          <div className="author-name">{feedback.author}</div>
                          <div className="feedback-date">
                            <FaCalendarAlt />
                            {feedback.date}
                          </div>
                        </div>
                      </div>
                      <div className="feedback-rating">
                        {[...Array(5)].map((_, i) => (
                          <FaStar
                            key={i}
                            className={`star ${i < feedback.rating ? 'filled' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className={`feedback-type ${feedback.type}`}>
                      {feedback.type.replace('-', ' ')}
                    </div>
                  </div>

                  <div className="feedback-content">
                    <h3 className="feedback-title">{feedback.title}</h3>
                    <p className="feedback-message">{feedback.message}</p>
                    <div className="feedback-category">
                      Category: {feedback.category}
                    </div>
                  </div>

                  <div className="feedback-actions">
                    <button className="action-btn like">
                      <FaHeart />
                      <span>{feedback.likes}</span>
                    </button>
                    <button className="action-btn comment">
                      <FaComment />
                      <span>{feedback.comments}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            {sortedFeedback.length > 4 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button
                  className="filter-btn active"
                  onClick={() => setShowAll(!showAll)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {showAll ? 'Show less' : 'Show more'} {showAll ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            )}
            </>
          )}
        </div>

        {/* Not Authenticated Message */}
        {!isAuthenticated && (
          <div className="auth-required">
            <FaQuoteLeft className="auth-icon" />
            <h3>Sign in to submit feedback</h3>
            <p>Join our community to share your thoughts and help us improve</p>
            <div className="auth-actions">
              <button className="btn btn-primary">Sign In</button>
              <button className="btn btn-secondary">Sign Up</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;














