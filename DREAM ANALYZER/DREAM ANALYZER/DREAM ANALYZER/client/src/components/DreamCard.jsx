  import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaEye,
  FaTrash,
  FaHeart,
  FaBrain,
  FaMoon,
  FaStar,
  FaCalendarAlt,
  FaTag,
  FaImage,
  FaSpa
} from 'react-icons/fa';
import './DreamCard.css';

const DreamCard = ({ dream, onSelect, onDelete, onSave }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMoodColor = (mood) => {
    const moodColors = {
      happy: '#10b981',
      sad: '#3b82f6',
      fearful: '#ef4444',
      anxious: '#f59e0b',
      peaceful: '#8b5cf6',
      confused: '#6b7280',
      excited: '#ec4899',
      neutral: '#9ca3af'
    };
    return moodColors[mood] || moodColors.neutral;
  };

  const getIntensityColor = (intensity) => {
    const intensityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return intensityColors[intensity] || intensityColors.medium;
  };

  const getSleepQualityColor = (quality) => {
    const qualityColors = {
      A: '#10b981',
      B: '#22c55e',
      C: '#f59e0b',
      D: '#f97316',
      F: '#ef4444'
    };
    return qualityColors[quality] || qualityColors.C;
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <motion.div
      className="dream-card"
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect && onSelect(dream)}
    >
      <div className="dream-card-header">
        <div className="dream-date">
          <FaCalendarAlt className="date-icon" />
          <span>{formatDate(dream.createdAt)}</span>
        </div>
        <div className="dream-actions">
          <motion.button
            className="action-btn view-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(dream);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaEye />
          </motion.button>
          <motion.button
            className="action-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete(dream.id);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaTrash />
          </motion.button>
        </div>
      </div>

      {dream.imageUrl && (
        <div className="dream-image">
          <img src={dream.imageUrl} alt="Dream visualization" />
        </div>
      )}

      <div className="dream-content">
        <h3 className="dream-title">
          {dream.title || 'Untitled Dream'}
        </h3>
        
        <p className="dream-text">
          {truncateText(dream.dreamText || dream.content || 'No content available')}
        </p>

        {dream.themes && dream.themes.length > 0 && (
          <div className="dream-themes">
            {dream.themes.slice(0, 3).map((theme, index) => (
              <span key={index} className="theme-tag">
                <FaTag />
                {theme}
              </span>
            ))}
            {dream.themes.length > 3 && (
              <span className="theme-more">+{dream.themes.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      <div className="dream-metrics">
        <div className="metric">
          <div className="metric-icon">
            <FaHeart style={{ color: getMoodColor(dream.mood) }} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Mood</span>
            <span className="metric-value" style={{ color: getMoodColor(dream.mood) }}>
              {dream.mood || 'neutral'}
            </span>
          </div>
        </div>

        <div className="metric">
          <div className="metric-icon">
            <FaBrain style={{ color: getIntensityColor(dream.dreamIntensity) }} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Intensity</span>
            <span className="metric-value" style={{ color: getIntensityColor(dream.dreamIntensity) }}>
              {dream.dreamIntensity || 'medium'}
            </span>
          </div>
        </div>

        {dream.sleepQuality && (
          <div className="metric">
            <div className="metric-icon">
              <FaMoon style={{ color: getSleepQualityColor(dream.sleepQuality) }} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Sleep</span>
              <span className="metric-value" style={{ color: getSleepQualityColor(dream.sleepQuality) }}>
                {dream.sleepQuality}
              </span>
            </div>
          </div>
        )}
      </div>

      {dream.emotions && (
        <div className="dream-emotions">
          <div className="emotions-title">Emotions</div>
          <div className="emotions-bar">
            {Object.entries(dream.emotions).map(([emotion, value]) => (
              <div
                key={emotion}
                className="emotion-item"
                style={{ 
                  width: `${value * 100}%`,
                  backgroundColor: getMoodColor(emotion)
                }}
                title={`${emotion}: ${Math.round(value * 100)}%`}
              />
            ))}
          </div>
        </div>
      )}

      {dream.meditationRecommendations && dream.meditationRecommendations.length > 0 && (
        <div className="meditation-preview">
          <FaSpa className="meditation-icon" />
          <span>{dream.meditationRecommendations.length} meditation{dream.meditationRecommendations.length !== 1 ? 's' : ''} available</span>
        </div>
      )}

      <motion.div
        className="dream-card-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="overlay-content">
          <h4>Dream Analysis</h4>
          <p>{dream.summary || dream.interpretation || 'Click to view detailed analysis'}</p>
          <div className="overlay-actions">
            <button className="overlay-btn primary">
              <FaEye />
              View Details
            </button>
            {dream.meditationRecommendations && dream.meditationRecommendations.length > 0 && (
              <button className="overlay-btn secondary">
                <FaSpa />
                Meditate
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DreamCard;
