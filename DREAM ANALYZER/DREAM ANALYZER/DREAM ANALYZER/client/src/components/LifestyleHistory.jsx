import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaEye, FaCalendarAlt, FaChartLine, FaTimes, FaTrash, FaTrashAlt, FaExpand, FaCompress, FaEdit, FaSave, FaTimes as FaTimesX, FaMoon, FaSun, FaHeart, FaChartBar, FaChartPie } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#ec4899'];

export default function LifestyleHistory({ open, onClose, onReRunAnalysis }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [saveTitleLoading, setSaveTitleLoading] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dream-diary/history?page=${page}&limit=${pagination.limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('LifestyleHistory: fetched data =', { success: data.success, history: data.history?.length, meta: data.meta });
        if (data.success) {
          setAnalyses(data.history || []);
          setPagination({
            page: data.meta?.page || 1,
            limit: data.meta?.limit || 10,
            total: data.meta?.total || 0,
            pages: Math.ceil((data.meta?.total || 0) / (data.meta?.limit || 10))
          });
        } else {
          console.error('Fetch history failed:', data.error);
          setAnalyses([]);
          setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
        }
      } else {
        console.error('API request failed:', res.status, res.statusText);
        setAnalyses([]);
        setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
      }
    } catch (e) {
      console.error('Fetch history error:', e);
      setAnalyses([]);
      setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dream-diary/history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // No longer need debug logs - component working
      if (data.success) {
        setSelectedAnalysis(data.entry);
      } else {
        console.error('Fetch detail failed:', data.error);
      }
    } catch (e) {
      console.error('Fetch detail error:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const deleteHistoryEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this history entry? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/dream-diary/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setAnalyses(prev => prev.filter(item => item._id !== id));
        console.log('History entry deleted successfully');
      } else {
        console.error('Delete failed:', res.statusText);
        alert('Failed to delete history entry. Please try again.');
      }
    } catch (e) {
      console.error('Delete error:', e);
      alert('An error occurred while deleting the entry.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const startEditingTitle = (id, currentTitle) => {
    setEditingTitle(id);
    setEditingTitleValue(currentTitle || '');
  };

  const saveTitleEdit = async (id) => {
    if (!editingTitleValue.trim()) {
      alert('Title cannot be empty');
      return;
    }

    setSaveTitleLoading(id);
    try {
      const res = await fetch(`/api/dream-diary/history/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dreamTitle: editingTitleValue.trim() })
      });

      if (res.ok) {
        setAnalyses(prev => prev.map(item =>
          item._id === id
            ? { ...item, dreamTitle: editingTitleValue.trim() }
            : item
        ));
        console.log('Title updated successfully');
        setEditingTitle(null);
        setEditingTitleValue('');
      } else {
        console.error('Save failed:', res.statusText);
        alert('Failed to save title. Please try again.');
      }
    } catch (e) {
      console.error('Save error:', e);
      alert('An error occurred while saving the title.');
    } finally {
      setSaveTitleLoading(null);
    }
  };

  const cancelTitleEdit = () => {
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  const clearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to delete ALL history entries? This action cannot be undone.')) {
      return;
    }

    setClearAllLoading(true);
    try {
      const res = await fetch('/api/dream-diary/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setAnalyses([]);
        setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
        console.log('All history entries cleared successfully');
      } else {
        console.error('Clear all failed:', res.statusText);
        alert('Failed to clear all history. Please try again.');
      }
    } catch (e) {
      console.error('Clear all error:', e);
      alert('An error occurred while clearing history.');
    } finally {
      setClearAllLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    } else {
      setSelectedAnalysis(null);
    }
  }, [open]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchHistory(newPage);
    }
  };

  // Chart data extraction - matches the structure saved by LifestyleAnalysisModal
  const sleepAnalysisData = selectedAnalysis?.metrics?.sleepDistribution
    ? [
        { name: 'Good (>7.5h)', value: selectedAnalysis.metrics.sleepDistribution.good || 0 },
        { name: 'Okay (6-7.5h)', value: selectedAnalysis.metrics.sleepDistribution.okay || 0 },
        { name: 'Poor (<6h)', value: selectedAnalysis.metrics.sleepDistribution.poor || 0 }
      ]
    : (selectedAnalysis?.lifestyleAnalysisData?.sleepPatterns?.pieData || []);

  const sleepPatternTrends = selectedAnalysis?.metrics?.sleepTrend
    || selectedAnalysis?.lifestyleAnalysisData?.sleepTrends?.lineData
    || [];

  const emotionsData = selectedAnalysis?.metrics?.emotions
    ? [
        { name: 'Happy', value: selectedAnalysis.metrics.emotions.happy || 0 },
        { name: 'Sad', value: selectedAnalysis.metrics.emotions.sad || 0 },
        { name: 'Neutral', value: selectedAnalysis.metrics.emotions.neutral || 0 },
        { name: 'Anxious', value: selectedAnalysis.metrics.emotions.anxious || 0 },
        { name: 'Angry', value: selectedAnalysis.metrics.emotions.angry || 0 }
      ].filter(item => item.value > 0)
    : (selectedAnalysis?.lifestyleAnalysisData?.emotions?.pieData || []);

  const emotionColor = (label) => {
    const n = (label || '').toLowerCase();
    if (n.includes('negative') || n.includes('sad') || n.includes('angry') || n.includes('anxious')) return '#ef4444';
    if (n.includes('neutral')) return '#fbbf24';
    return '#f97316';
  };

  const comparativeData = selectedAnalysis?.metrics?.comparative
    ? [
        { subject: 'Routine', score: selectedAnalysis.metrics.comparative.routineScore || 0 },
        { subject: 'Engagement', score: selectedAnalysis.metrics.comparative.engagementScore || 0 },
        { subject: 'Sleep', score: selectedAnalysis.metrics.comparative.sleepScore || 0 }
      ]
    : ((selectedAnalysis?.lifestyleAnalysisData?.comparative?.barData || [])
        .map(item => {
          if (item && 'category' in item && 'value' in item) {
            return { subject: item.category, score: item.value };
          }
          return item;
        }));

  // Check if we have any chart data
  const hasChartData = sleepAnalysisData.length > 0 || sleepPatternTrends.length > 0 || emotionsData.length > 0 || comparativeData.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-card xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '95vw'
            }}
          >
            <div className="modal-header" style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
              padding: '24px 32px',
              borderRadius: '20px 20px 0 0',
              borderBottom: '1px solid rgba(99,102,241,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <FaHistory style={{ fontSize: '28px', color: '#6366f1' }} />
                </motion.div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#4c1d95',
                  margin: 0
                }}>
                  Lifestyle Analysis History
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {analyses.length > 0 && (
                  <motion.button
                    onClick={clearAllHistory}
                    disabled={clearAllLoading}
                    whileHover={{ scale: clearAllLoading ? 1 : 1.05 }}
                    whileTap={{ scale: clearAllLoading ? 1 : 0.95 }}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '12px',
                      background: clearAllLoading
                        ? 'linear-gradient(145deg, #f1f5f9, #e2e8f0)'
                        : 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: clearAllLoading ? '#94a3b8' : 'white',
                      cursor: clearAllLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: clearAllLoading
                        ? '0 2px 8px rgba(0,0,0,0.1)'
                        : '0 4px 16px rgba(239,68,68,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <FaTrashAlt style={{ fontSize: '14px' }} />
                    {clearAllLoading ? 'Clearing...' : 'Clear All'}
                  </motion.button>
                )}
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(239,68,68,0.3)'
                  }}
                >
                  <FaTimes style={{ color: 'white', fontSize: '18px' }} />
                </motion.button>
              </div>
            </div>

            <div className="modal-body" style={{
              display: 'grid',
              gap: '16px',
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '20px'
            }}>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '60px 40px' }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #6366f1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                  }} />
                  <p style={{ color: '#64748b', fontSize: '16px' }}>Loading history...</p>
                </motion.div>
              )}

              {!loading && analyses.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', padding: '60px 40px' }}
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <FaChartLine style={{ fontSize: '64px', color: '#cbd5e1', marginBottom: '24px' }} />
                  </motion.div>
                  <h3 style={{ color: '#475569', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
                    No saved analyses found
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6 }}>
                    Generate and save your first lifestyle analysis to see it here
                  </p>
                </motion.div>
              )}

              {!loading && analyses.length > 0 && (
                <>
                  {analyses.map((analysis) => (
                    <motion.div
                      key={analysis._id}
                      className="history-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: '0 8px 32px rgba(99,102,241,0.15)'
                      }}
                      style={{
                        padding: '20px',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: '12px',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        gap: '16px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <FaCalendarAlt style={{ color: '#6366f1', fontSize: '16px' }} />
                          <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '16px' }}>
                            {formatDate(analysis.createdAt)}
                          </div>
                        </div>

                        {(analysis.dreamTitle || analysis.lifestyleAnalysisData) && (
                          <div style={{
                            color: '#64748b',
                            fontSize: '15px',
                            lineHeight: 1.5,
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            {editingTitle === analysis._id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingTitleValue}
                                  onChange={(e) => setEditingTitleValue(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveTitleEdit(analysis._id);
                                    } else if (e.key === 'Escape') {
                                      cancelTitleEdit();
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    minWidth: '200px',
                                    padding: '8px 12px',
                                    border: '1px solid rgba(59,130,246,0.4)',
                                    borderRadius: '6px',
                                    fontSize: '15px',
                                    outline: 'none',
                                    background: 'white'
                                  }}
                                  ref={(ref) => ref?.focus()}
                                />
                                <motion.button
                                  onClick={() => saveTitleEdit(analysis._id)}
                                  disabled={saveTitleLoading === analysis._id}
                                  whileHover={{ scale: saveTitleLoading === analysis._id ? 1 : 1.05 }}
                                  whileTap={{ scale: saveTitleLoading === analysis._id ? 1 : 0.95 }}
                                  style={{
                                    padding: '6px 10px',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '6px',
                                    background: saveTitleLoading === analysis._id
                                      ? 'rgba(16,185,129,0.2)'
                                      : 'linear-gradient(135deg, #10b981, #059669)',
                                    color: saveTitleLoading === analysis._id ? '#64748b' : 'white',
                                    cursor: saveTitleLoading === analysis._id ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  <FaSave style={{ fontSize: '10px' }} />
                                  {saveTitleLoading === analysis._id ? 'Saving...' : 'Save'}
                                </motion.button>
                                <motion.button
                                  onClick={cancelTitleEdit}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  style={{
                                    padding: '6px 10px',
                                    border: '1px solid rgba(107,114,128,0.3)',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  <FaTimesX style={{ fontSize: '10px' }} />
                                  Cancel
                                </motion.button>
                              </>
                            ) : (
                              <>
                                <span style={{
                                  flex: 1,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {analysis.dreamTitle || 'Untitled Entry'}
                                </span>
                                <motion.button
                                  onClick={() => startEditingTitle(analysis._id, analysis.dreamTitle)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  style={{
                                    padding: '6px 10px',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  <FaEdit style={{ fontSize: '10px' }} />
                                  Rename
                                </motion.button>
                              </>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8' }}>
                          {analysis.dreamEntryData && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📝 Dream Entry</span>
                          )}
                          {analysis.dailyRoutineData && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 Daily Routine</span>
                          )}
                          {analysis.mentalHealthData && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🧠 Mental Health</span>
                          )}
                          {analysis.lifestyleAnalysisData && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📊 Lifestyle Analysis</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <motion.button
                          onClick={() => fetchAnalysisDetail(analysis._id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <FaEye style={{ fontSize: '12px' }} />
                          View
                        </motion.button>

                        <motion.button
                          onClick={() => deleteHistoryEntry(analysis._id)}
                          disabled={deleteLoading === analysis._id}
                          whileHover={{ scale: deleteLoading === analysis._id ? 1 : 1.05 }}
                          whileTap={{ scale: deleteLoading === analysis._id ? 1 : 0.95 }}
                          style={{
                            padding: '8px 14px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px',
                            background: deleteLoading === analysis._id
                              ? 'linear-gradient(145deg, #f1f5f9, #e2e8f0)'
                              : 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: deleteLoading === analysis._id ? '#94a3b8' : 'white',
                            cursor: deleteLoading === analysis._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            boxShadow: deleteLoading === analysis._id
                              ? '0 2px 8px rgba(0,0,0,0.1)'
                              : '0 4px 16px rgba(239,68,68,0.3)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <FaTrash style={{ fontSize: '12px' }} />
                          {deleteLoading === analysis._id ? 'Deleting...' : 'Delete'}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '24px',
                        padding: '20px',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
                        borderRadius: '16px',
                        border: '1px solid rgba(99,102,241,0.2)'
                      }}
                    >
                      <motion.button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        whileHover={{ scale: pagination.page === 1 ? 1 : 1.05 }}
                        whileTap={{ scale: pagination.page === 1 ? 1 : 0.95 }}
                        style={{
                          padding: '10px 20px',
                          border: pagination.page === 1 ? '1px solid #e5e7eb' : '1px solid rgba(99,102,241,0.3)',
                          borderRadius: '12px',
                          background: pagination.page === 1
                            ? 'linear-gradient(145deg, #f1f5f9, #e2e8f0)'
                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: pagination.page === 1 ? '#94a3b8' : 'white',
                          cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: pagination.page === 1
                            ? '0 2px 8px rgba(0,0,0,0.1)'
                            : '0 4px 16px rgba(99,102,241,0.3)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Previous
                      </motion.button>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 20px',
                        color: '#475569',
                        fontSize: '15px',
                        fontWeight: '600'
                      }}>
                        Page {pagination.page} of {pagination.pages}
                      </div>

                      <motion.button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        whileHover={{ scale: pagination.page === pagination.pages ? 1 : 1.05 }}
                        whileTap={{ scale: pagination.page === pagination.pages ? 1 : 0.95 }}
                        style={{
                          padding: '10px 20px',
                          border: pagination.page === pagination.pages ? '1px solid #e5e7eb' : '1px solid rgba(99,102,241,0.3)',
                          borderRadius: '12px',
                          background: pagination.page === pagination.pages
                            ? 'linear-gradient(145deg, #f1f5f9, #e2e8f0)'
                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: pagination.page === pagination.pages ? '#94a3b8' : 'white',
                          cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: pagination.page === pagination.pages
                            ? '0 2px 8px rgba(0,0,0,0.1)'
                            : '0 4px 16px rgba(99,102,241,0.3)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Next
                      </motion.button>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            <motion.div
              className="modal-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '24px 32px',
                borderTop: '1px solid rgba(99,102,241,0.2)',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
                borderRadius: '0 0 20px 20px',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px 32px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Detail Modal */}
          {selectedAnalysis && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnalysis(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                zIndex: 9999
              }}
            >
              <motion.div
                className="modal-card"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: isMaximized ? '95vw' : '900px',
                  width: '95vw',
                  maxHeight: isMaximized ? '95vh' : 'auto'
                }}
              >
                <div className="modal-header" style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
                  padding: '24px 32px',
                  borderRadius: '20px 20px 0 0',
                  borderBottom: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <FaChartLine style={{ fontSize: '24px', color: '#6366f1' }} />
                    </motion.div>
                    <h3 style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#4c1d95',
                      margin: 0
                    }}>
                      LifeStyle Analysis Charts
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.button
                      onClick={() => setIsMaximized(!isMaximized)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
                      }}
                      title={isMaximized ? 'Minimize' : 'Maximize'}
                    >
                      {isMaximized ? (
                        <FaCompress style={{ color: 'white', fontSize: '16px' }} />
                      ) : (
                        <FaExpand style={{ color: 'white', fontSize: '16px' }} />
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => setSelectedAnalysis(null)}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(239,68,68,0.3)'
                      }}
                    >
                      <FaTimes style={{ color: 'white', fontSize: '16px' }} />
                    </motion.button>
                  </div>
                </div>

                <div className="modal-body" style={{
                  maxHeight: isMaximized ? '75vh' : '60vh',
                  overflowY: 'auto',
                  padding: '32px'
                }}>
                  {detailLoading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ textAlign: 'center', padding: '60px 40px' }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #e5e7eb',
                        borderTop: '3px solid #6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                      }} />
                      <p style={{ color: '#64748b', fontSize: '16px' }}>Loading details...</p>
                    </motion.div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Header */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            textAlign: 'center',
                            padding: '20px',
                            borderBottom: '2px solid rgba(99,102,241,0.2)',
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
                            borderRadius: '12px'
                          }}
                        >
                          <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1f2937',
                            margin: '0 0 8px 0'
                          }}>
                            {selectedAnalysis.dreamTitle || 'Lifestyle Analysis Report'}
                          </h3>
                          <p style={{
                            color: '#64748b',
                            fontSize: '14px',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}>
                            <FaCalendarAlt style={{ color: '#6366f1', fontSize: '12px' }} />
                            {formatDate(selectedAnalysis.createdAt)}
                          </p>
                        </motion.div>

                        {/* Charts - Display saved lifestyle analysis data */}
                        {selectedAnalysis && (
                          <>
                            {/* Charts section */}
                            {sleepAnalysisData.length > 0 && (
                              <section>
                                <h4>Sleep Distribution</h4>
                                <div style={{ width: '100%', height: 250 }}>
                                  <ResponsiveContainer>
                                    <PieChart>
                                      <Pie
                                        data={sleepAnalysisData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name}: ${value}`}
                                      >
                                        {sleepAnalysisData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </section>
                            )}

                            {sleepPatternTrends.length > 0 && (
                              <section>
                                <h4>Sleep Trend (Last 90 Days)</h4>
                                <div style={{ width: '100%', height: 250 }}>
                                  <ResponsiveContainer>
                                    <LineChart data={sleepPatternTrends}>
                                      <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 12 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                      />
                                      <YAxis 
                                        label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                                        domain={[0, 12]}
                                      />
                                      <Tooltip 
                                        formatter={(value) => [`${value} hours`, 'Sleep']}
                                        labelFormatter={(label) => `Date: ${label}`}
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="hours" 
                                        stroke="#60a5fa" 
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 5 }}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </section>
                            )}

                            {emotionsData.length > 0 && (
                              <section>
                                <h4>Dream Emotions</h4>
                                <div style={{ width: '100%', height: 250 }}>
                                  <ResponsiveContainer>
                                    <PieChart>
                                      <Pie
                                        data={emotionsData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name}: ${value}`}
                                      >
                                        {emotionsData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={emotionColor(entry.name)} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </section>
                            )}

                            {comparativeData.length > 0 && (
                              <section>
                                <h4>Comparative Scores</h4>
                                <div style={{ width: '100%', height: 250 }}>
                                  <ResponsiveContainer>
                                    <BarChart data={comparativeData}>
                                      <XAxis dataKey="subject" />
                                      <YAxis domain={[0, 5]} />
                                      <Tooltip 
                                        formatter={(value) => [`${value.toFixed(1)}/5`, 'Score']}
                                      />
                                      <Bar dataKey="score" fill="#3b82f6" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </section>
                            )}

                            {!hasChartData && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                  textAlign: 'center',
                                  padding: '80px 40px',
                                  background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))',
                                  borderRadius: '16px',
                                  border: '2px dashed rgba(99,102,241,0.3)'
                                }}
                              >
                                <motion.div
                                  animate={{ y: [0, -10, 0] }}
                                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                  style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '24px' }}
                                >
                                  📊
                                </motion.div>
                                <h3 style={{ color: '#475569', fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                                  No Chart Data Available
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6 }}>
                                  This entry doesn't contain lifestyle analysis data. Generate a new lifestyle analysis to view comprehensive charts and insights.
                                </p>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="modal-footer"
                  style={{
                    padding: '24px 32px',
                    borderTop: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}
                >
                  <motion.button
                    onClick={() => setSelectedAnalysis(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '12px 24px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Close
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
