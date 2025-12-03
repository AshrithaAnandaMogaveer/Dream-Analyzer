import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBrain,
  FaChevronDown,
  FaChevronUp,
  FaMoon,
  FaStar,
  FaQuoteLeft,
  FaQuoteRight
} from 'react-icons/fa';
import './DreamInsights.css';

const DreamInsights = ({ dream }) => {
  const [expandedSections, setExpandedSections] = useState({
    yourDream: true,
    introduction: true,
    overview: true,
    keySymbols: true,
    psychological: true,
    cultural: true,
    connections: true,
    summary: true
  });

  // Define the correct order of sections
  const sectionOrder = [
    'yourDream',
    'introduction',
    'overview',
    'keySymbols',
    'psychological',
    'cultural',
    'connections',
    'summary'
  ];

  // Section titles and icons
  const sectionTitles = {
    yourDream: '🌙 Your Dream',
    introduction: '🔍 Introduction',
    overview: '📜 Overview',
    keySymbols: '🔑 Key Symbols & Elements',
    psychological: '🧠 Psychological Interpretation',
    cultural: '🌍 Cultural Context',
    connections: '🔗 Connections to Waking Life',
    summary: '💡 Summary & Advice'
  };

  const sectionIcons = {
    yourDream: '🌙',
    introduction: '🔍',
    overview: '📜',
    keySymbols: '🔑',
    psychological: '🧠',
    cultural: '🌍',
    connections: '🔗',
    summary: '💡'
  };

  // Helper functions for metrics
  const getIntensityColor = (intensity) => {
    if (!intensity) return '#6b7280';
    switch(intensity.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low':
      default: return '#10b981';
    }
  };

  const getSleepQualityColor = (quality) => {
    if (!quality) return '#6b7280';
    switch(quality.toLowerCase()) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor':
      default: return '#ef4444';
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!dream) return null;

  // Use dream.interpretation or dream directly for backward compatibility
  const _dreamData = dream.interpretation || dream;
  
  // Helper function to render section content with proper formatting
  const renderSectionContent = (content) => {
    if (!content) return null;
    
    if (typeof content === 'string') {
      return content.split('\n').map((paragraph, i) => (
        <p key={i}>{paragraph || <br />}</p>
      ));
    }
    
    if (Array.isArray(content)) {
      return (
        <ul>
          {content.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }
    
    if (typeof content === 'object') {
      return (
        <div className="json-content">
          {JSON.stringify(content, null, 2)}
        </div>
      );
    }
    
    return content;
  };
  

  return (
    <div className="dream-insights">
      <motion.div
        className="insights-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2>
          <FaBrain className="header-icon" />
          Dream Analysis
        </h2>
        <p className="dream-date">{formatDate(dream.createdAt)}</p>
      </motion.div>

      <div className="insights-content">
        {/* Metrics Section - Only show if we have metrics */}
        {(dream.dreamIntensity || dream.sleepQuality || dream.mentalWellness) && (
          <motion.div 
            className="metrics-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="metrics-grid">
              {dream.dreamIntensity && (
                <div className="metric-card">
                  <div className="metric-icon">
                    <FaBrain style={{ color: getIntensityColor(dream.dreamIntensity) }} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Intensity</span>
                    <span className="metric-value" style={{ color: getIntensityColor(dream.dreamIntensity) }}>
                      {dream.dreamIntensity}
                    </span>
                  </div>
                </div>
              )}

              {dream.sleepQuality && (
                <div className="metric-card">
                  <div className="metric-icon">
                    <FaMoon style={{ color: getSleepQualityColor(dream.sleepQuality) }} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Sleep Quality</span>
                    <span className="metric-value" style={{ color: getSleepQualityColor(dream.sleepQuality) }}>
                      {dream.sleepQuality}
                    </span>
                  </div>
                </div>
              )}

              {dream.mentalWellness && (
                <div className="metric-card">
                  <div className="metric-icon">
                    <FaStar style={{ color: dream.mentalWellness >= 70 ? '#10b981' : dream.mentalWellness >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Mental Wellness</span>
                    <span className="metric-value" style={{ color: dream.mentalWellness >= 70 ? '#10b981' : dream.mentalWellness >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {dream.mentalWellness}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Content Sections */}
        <div className="sections-container">
          {/* 1. Your Dream */}
          <div className="section-card">
            <h3>{sectionTitles.yourDream}</h3>
            <div className="section-content">
              <div className="dream-quote">
                <FaQuoteLeft className="quote-icon" />
                <p>{dream.dreamText || dream.content || 'No dream content available'}</p>
                <FaQuoteRight className="quote-icon" />
              </div>
            </div>
          </div>

          {/* 2. Introduction */}
          {dream.introduction && (
            <div className="section-card">
              <h3>{sectionTitles.introduction}</h3>
              <div className="section-content">
                {renderSectionContent(dream.introduction)}
              </div>
            </div>
          )}

          {/* 3. Overview */}
          {dream.overview && dream.overview !== dream.introduction && (
            <div className="section-card">
              <h3>{sectionTitles.overview}</h3>
              <div className="section-content">
                {renderSectionContent(dream.overview)}
              </div>
            </div>
          )}

          {/* 4. Key Symbols & Elements */}
          {dream.keySymbols && Object.keys(dream.keySymbols).length > 0 && (
            <div className="section-card">
              <h3>{sectionTitles.keySymbols}</h3>
              <div className="section-content">
                <div className="symbols-container">
                  {Object.entries(dream.keySymbols).map(([symbol, meaning]) => (
                    <div key={symbol} className="symbol-item">
                      <div className="symbol-name">{symbol}</div>
                      <div className="symbol-meaning">{meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Psychological Interpretation */}
          {dream.psychological && (
            <div className="section-card">
              <h3>{sectionTitles.psychological}</h3>
              <div className="section-content">
                {renderSectionContent(dream.psychological)}
              </div>
            </div>
          )}

          {/* 6. Cultural Context */}
          {dream.cultural && (
            <div className="section-card">
              <h3>{sectionTitles.cultural}</h3>
              <div className="section-content">
                {renderSectionContent(dream.cultural)}
              </div>
            </div>
          )}

          {/* 7. Connections to Waking Life */}
          {dream.connections && (
            <div className="section-card">
              <h3>{sectionTitles.connections}</h3>
              <div className="section-content">
                {renderSectionContent(dream.connections)}
              </div>
            </div>
          )}

          {/* 8. Summary & Advice */}
          {dream.summary && dream.summary !== dream.introduction && dream.summary !== dream.overview && (
            <div className="section-card">
              <h3>{sectionTitles.summary}</h3>
              <div className="section-content">
                {renderSectionContent(dream.summary)}
              </div>
            </div>
          )}
        </div>

        {/* Server-provided subheadings only; no fallback rendering */}
      </div>
    </div>
  );
};

export default DreamInsights;
