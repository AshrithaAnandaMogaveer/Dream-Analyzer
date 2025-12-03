import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { FaCloud, FaMoon, FaSearch, FaBook, FaTimes, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function DreamEntryModal({ open, onClose, onSubmitted }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const [dreamTitle, setDreamTitle] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analysisNotFound, setAnalysisNotFound] = useState(false);

  // Fetch analysis when title changes
  useEffect(() => {
    if (dreamTitle.trim().length > 2) {
      fetchAnalysis(dreamTitle);
    } else {
      setSummary('');
      setAnalysisId('');
      setAnalysisNotFound(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [dreamTitle]);

  const fetchAnalysis = async (title) => {
    setLoadingSummary(true);
    setAnalysisNotFound(false);
    try {
      const { data } = await axios.get(`/api/dream-diary/fetch-analysis?title=${encodeURIComponent(title)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (data.success) {
        setSummary(data.summary);
        setAnalysisId(data.analysisId);
        setAnalysisNotFound(false);
      } else {
        setSummary('');
        setAnalysisId('');
        setAnalysisNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setSummary('');
      setAnalysisId('');
      setAnalysisNotFound(true);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSubmit = async () => {
    if (!dreamTitle.trim()) {
      toast.error('Please enter a dream title');
      return;
    }
    
    if (!analysisId) {
      toast.error('This dream has not been analyzed yet. Please analyze it in the Dream Chatbot first.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post('/api/dream-diary/dream-entry', {
        title: dreamTitle,
        summary: summary,
        analysisId: analysisId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Dream entry saved!');
      onSubmitted && onSubmitted(data);
      onClose && onClose();
      
      // Reset form
      setDreamTitle('');
      setSummary('');
      setAnalysisId('');
      setAnalysisNotFound(false);
    } catch (error) {
      console.error('Error saving dream entry:', error);
      toast.error('Failed to save dream entry');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDreamTitle('');
    setSummary('');
    setAnalysisId('');
    setAnalysisNotFound(false);
    setShowSuggestions(false);
    onClose && onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <motion.div 
            className="modal-card"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '85vh',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 100px rgba(139, 92, 246, 0.2)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Animated Background */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 60%, rgba(196, 181, 253, 0.2) 0%, transparent 50%)
              `,
              animation: 'float 8s ease-in-out infinite',
              zIndex: -1
            }} />

            {/* Header */}
            <div style={{
              padding: '28px 32px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <FaCloud style={{ color: '#ffffff', fontSize: '20px' }} />
                </motion.div>
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    color: '#ffffff',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}>
                    Dream Entry
                  </h2>
                  <p style={{ 
                    margin: '4px 0 0', 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.95rem'
                  }}>
                    Save your analyzed dream to your diary
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                }}
              >
                <FaTimes style={{ fontSize: '16px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{
              padding: '32px',
              maxHeight: 'calc(85vh - 200px)',
              overflowY: 'auto'
            }}>
              {/* Dream Title Input */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  marginBottom: '28px'
                }}
              >
                <label style={{
                  display: 'block',
                  color: '#ffffff',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '12px',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FaMoon style={{ marginRight: '8px', color: 'rgba(255, 255, 255, 0.8)' }} />
                  Dream Title
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={dreamTitle}
                    onChange={(e) => setDreamTitle(e.target.value)}
                    placeholder="Enter your dream title..."
                    style={{
                      width: '100%',
                      padding: '16px 20px 16px 50px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '1.05rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '1px solid rgba(139, 92, 246, 0.5)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                  />
                  <FaSearch style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '16px'
                  }} />
                </div>
              </motion.section>

              {/* Loading State */}
              {loadingSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '20px'
                  }}
                >
                  <FaSpinner style={{ 
                    animation: 'spin 1s linear infinite',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Searching for dream analysis...</span>
                </motion.div>
              )}

              {/* Analysis Not Found */}
              {analysisNotFound && !loadingSummary && dreamTitle.trim().length > 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '20px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <FaExclamationTriangle style={{ 
                    color: '#f87171',
                    fontSize: '24px'
                  }} />
                  <div>
                    <h4 style={{ 
                      margin: '0 0 8px 0',
                      color: '#fca5a5',
                      fontSize: '1.1rem',
                      fontWeight: '600'
                    }}>
                      Dream Not Analyzed Yet
                    </h4>
                    <p style={{ 
                      margin: 0,
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.95rem',
                      lineHeight: '1.5'
                    }}>
                      This dream has not been analyzed yet. Please analyze it in the Dream Chatbot first before adding it to your diary.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Summary Preview */}
              {summary && !loadingSummary && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    marginBottom: '28px'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <FaCheckCircle style={{ 
                      color: '#4ade80',
                      fontSize: '20px'
                    }} />
                    <h3 style={{ 
                      margin: 0,
                      color: '#ffffff',
                      fontSize: '1.3rem',
                      fontWeight: '600'
                    }}>
                      Dream Analysis Found
                    </h3>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 12px 0',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '1rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FaBook style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      Analysis Summary
                    </h4>
                    <p style={{ 
                      margin: 0,
                      color: 'rgba(255, 255, 255, 0.85)',
                      fontSize: '0.95rem',
                      lineHeight: '1.6'
                    }}>
                      {summary}
                    </p>
                  </div>
                </motion.section>
              )}
            </div>

            {/* Footer */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 32px',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <button 
                onClick={handleClose}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!analysisId || saving}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !analysisId || saving
                    ? 'rgba(107, 114, 128, 0.5)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: !analysisId || saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: !analysisId || saving
                    ? 'none' 
                    : '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (analysisId && !saving) {
                    e.target.style.background = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)';
                    e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (analysisId && !saving) {
                    e.target.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)';
                    e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                  }
                }}
              >
                {saving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    Saving...
                  </span>
                ) : (
                  'Save Dream Entry'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
