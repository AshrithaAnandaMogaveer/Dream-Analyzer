import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './DreamJournal.css';

const DreamJournal = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Fetching dream journal for user:', user._id);
      
      const { data } = await axios.get(`/api/chatbot/${user._id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10, page: 1 }
      });
      
      console.log('Dream journal entries received:', data.analyses?.length || 0);
      setEntries(data.analyses || []);
    } catch (error) {
      console.error('Fetch entries error:', error);
      console.error('Error details:', error.response?.data);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEmotionColor = (emotions) => {
    if (!emotions) return '#999';
    const max = Math.max(...Object.values(emotions));
    if (emotions.joy === max) return '#FFD700';
    if (emotions.fear === max) return '#DC143C';
    if (emotions.calmness === max) return '#98FB98';
    if (emotions.anxiety === max) return '#FF8C00';
    return '#999';
  };

  if (loading) {
    return (
      <div className="dream-journal">
        <div className="panel-header">
          <h3>📔 Dream Journal</h3>
        </div>
        <div className="loading">Loading journal...</div>
      </div>
    );
  }

  return (
    <div className="dream-journal">
      <div className="panel-header">
        <h3>📔 Dream Journal</h3>
        <span className="entry-count">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <p>No dreams yet</p>
          <small>Your analyzed dreams will appear here</small>
        </div>
      ) : (
        <div className="entries-list">
          {entries.map((entry) => (
            <motion.div
              key={entry._id}
              className="journal-entry"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setSelectedEntry(entry)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="entry-header">
                <span className="entry-date">{formatDate(entry.createdAt)}</span>
                <span 
                  className="emotion-dot" 
                  style={{ backgroundColor: getEmotionColor(entry.emotions) }}
                />
              </div>
              
              <div className="entry-summary">
                {entry.summary?.substring(0, 80)}...
              </div>

              {entry.themes && entry.themes.length > 0 && (
                <div className="entry-themes">
                  {entry.themes.slice(0, 3).map((theme, i) => (
                    <span key={i} className="theme-badge">{theme}</span>
                  ))}
                </div>
              )}

              {entry.imageUrl && (
                <div className="entry-image-indicator">
                  🎨 Has visual
                </div>
              )}

              <div className="entry-scores">
                <div className="score-item">
                  <span className="score-icon">😊</span>
                  <span className="score-value">{entry.happinessScore}</span>
                </div>
                <div className="score-item">
                  <span className="score-icon">😰</span>
                  <span className="score-value">{entry.stressScore}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="entry-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              className="entry-modal"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="modal-close" 
                onClick={() => setSelectedEntry(null)}
              >
                ×
              </button>

              <h3>Dream Entry</h3>
              <p className="modal-date">{formatDate(selectedEntry.createdAt)}</p>

              {selectedEntry.imageUrl && (
                <div className="modal-image">
                  <img src={selectedEntry.imageUrl} alt="Dream visualization" />
                </div>
              )}

              <div className="modal-summary">
                <h4>Summary</h4>
                <p>{selectedEntry.summary}</p>
              </div>

              {selectedEntry.interpretation && (
                <div className="modal-interpretation">
                  <h4>Interpretation</h4>
                  <p>{selectedEntry.interpretation}</p>
                </div>
              )}

              <div className="modal-themes">
                <h4>Themes</h4>
                <div className="themes-wrap">
                  {selectedEntry.themes?.map((theme, i) => (
                    <span key={i} className="theme-badge">{theme}</span>
                  ))}
                </div>
              </div>

              <div className="modal-scores">
                <div className="score-card">
                  <span className="score-icon">😊</span>
                  <div className="score-label">Happiness</div>
                  <div className="score-value-large">{selectedEntry.happinessScore}</div>
                </div>
                <div className="score-card">
                  <span className="score-icon">😰</span>
                  <div className="score-label">Stress</div>
                  <div className="score-value-large">{selectedEntry.stressScore}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DreamJournal;
