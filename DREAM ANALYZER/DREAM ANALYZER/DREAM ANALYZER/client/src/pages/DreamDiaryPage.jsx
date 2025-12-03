import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import WellnessGuidanceModal from '../components/WellnessGuidanceModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import DreamCard from '../components/DreamCard';
import DreamChart from '../components/DreamChart';
import DreamInsights from '../components/DreamInsights';
import LoadingSpinner from '../components/LoadingSpinner';
import DailyRoutineTracker from '../components/DailyRoutineTracker';
import TagCloud from '../components/TagCloud';
import MeditationPlayer from '../components/MeditationPlayer';
import SleepSurveyModal from '../components/SleepSurveyModal';
import MoodCalendar from '../components/MoodCalendar';
import MeditationTimer from '../components/MeditationTimer';
import NightRoutineChecklist from '../components/NightRoutineChecklist';
import RoutineDeviationChart from '../components/RoutineDeviationChart';
import { useSocket } from '../contexts/SocketContext';
import { 
  FaSearch, 
  FaMoon, 
  FaHeart,
  FaCalendarAlt,
  FaBrain,
  FaSun,
  FaChartLine,
  FaHistory,
  FaHeartbeat
} from 'react-icons/fa';
import './DreamDiaryPage.css';
import DailyRoutineModal from '../components/diaryRebuilt/DailyRoutineModal';
import DreamEntryModal from '../components/diaryRebuilt/DreamEntryModal';
import MentalHealthModal from '../components/diaryRebuilt/MentalHealthModal';
import LifestyleAnalysisModal from '../components/diaryRebuilt/LifestyleAnalysisModal';
import LifestyleHistory from '../components/LifestyleHistory';

// Phase-1: Import V2 components (only used when feature flag is enabled)
if (process.env.REACT_APP_DREAM_DIARY_V2 === 'true') {
  var MentalHealthModalV2 = require('../components/DreamDiaryV2/MentalHealthModal').default;
}

// Lazy-loaded Diary Blocks (non-destructive)
const RoutineBlock = lazy(() => import('../components/diaryBlocks/RoutineBlock'));
const DreamEntryBlock = lazy(() => import('../components/diaryBlocks/DreamEntryBlock'));
const SuggestionBlock = lazy(() => import('../components/diaryBlocks/SuggestionBlock'));
const MeditationBlock = lazy(() => import('../components/diaryBlocks/MeditationBlock'));
const RoutineAnalyticsBlock = lazy(() => import('../components/diaryBlocks/RoutineAnalyticsBlock'));

const DreamDiaryPage = () => {
  const { user: _user } = useAuth(); // Marked as intentionally unused
  const RESET_DIARY = false; // legacy flag
  const _SIMPLE_DIARY = false; // Marked as intentionally unused
  const BLANK_DIARY = true; // render enhanced diary UI only (remove legacy blocks)
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSleepSurvey, setShowSleepSurvey] = useState(false);
  const [showMeditationPlayer, setShowMeditationPlayer] = useState(false);
  const [selectedDream, setSelectedDream] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'blocks'
  const { on: onSocket, off: offSocket } = useSocket();
  const [quotesIndex, setQuotesIndex] = useState(0);
  const quotes = [
    'Small consistent habits shape a calmer mind.',
    'Your dreams whisper what your days forget.',
    'Wellness grows where awareness flows.',
    'Breathe in peace, breathe out tension.'
  ];
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lifestyleHistory, setLifestyleHistory] = useState([]);
  
  // Phase-1: V2 modal states (only used when feature flag is enabled)
  const [showWellnessModalV2, setShowWellnessModalV2] = useState(false);
  const fetchedOnceRef = useRef(false);

  // Define all data fetching functions first using useCallback
  const fetchDreamDiary = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/diary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDreams(data.analyses || []);
      }
    } catch (error) {
      console.error('Error fetching dream diary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/analytics/sleep', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      // Get user ID from token decoding or use a fallback
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload.userId;

      const response = await fetch(`/api/analytics/insights/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  }, []);

  const fetchLifestyleHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/history?page=1&limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Server returns { success: true, history: [...], meta: {...} }
        setLifestyleHistory(data.history || data.data || []);
        console.log('Fetched lifestyle history:', data.history || data.data);
      } else {
        console.error('Failed to fetch lifestyle history:', response.status, response.statusText);
      }
    } catch (e) {
      console.error('Error fetching lifestyle history:', e);
    }
  }, []);

  const handleSaveDream = useCallback(async (dreamData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/diary/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dreamData)
      });
      
      if (response.ok) {
        const newDream = await response.json();
        setDreams(prev => [newDream, ...prev]);
        // Fetch fresh data after saving
        await Promise.all([
          fetchAnalytics(),
          fetchInsights()
        ]);
      }
    } catch (error) {
      console.error('Error saving dream:', error);
    }
  }, [fetchAnalytics, fetchInsights]);

  const handleDeleteDream = useCallback(async (dreamId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dream-diary/diary/${dreamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setDreams(prev => prev.filter(dream => (dream.id || dream._id) !== dreamId));
        fetchAnalytics();
        fetchInsights();
      }
    } catch (error) {
      console.error('Error deleting dream:', error);
    }
  }, [fetchAnalytics, fetchInsights]);

  const _fetchData = async () => {
    await fetchDreamDiary();
    await fetchAnalytics();
    await fetchInsights();
    await fetchLifestyleHistory();
  };

  useEffect(() => {
    if (fetchedOnceRef.current) return;
    
    const fetchInitialData = async () => {
      try {
        await Promise.all([
          fetchDreamDiary(),
          fetchAnalytics(),
          fetchInsights(),
          fetchLifestyleHistory()
        ]);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchedOnceRef.current = true;
    fetchInitialData();
  }, [fetchDreamDiary, fetchAnalytics, fetchInsights, fetchLifestyleHistory]);

  useEffect(() => {
    if (RESET_DIARY || BLANK_DIARY) return;
    const handleDiaryUpdated = () => {
      fetchDreamDiary();
      fetchAnalytics();
      fetchInsights();
    };
    const handleRoutineUpdated = () => {
      fetchAnalytics();
    };
    onSocket('diary:updated', handleDiaryUpdated);
    onSocket('routine:updated', handleRoutineUpdated);
    return () => {
      offSocket('diary:updated', handleDiaryUpdated);
      offSocket('routine:updated', handleRoutineUpdated);
    };
  }, [RESET_DIARY, BLANK_DIARY, fetchDreamDiary, fetchAnalytics, fetchInsights, onSocket, offSocket]);

  useEffect(() => {
    if (RESET_DIARY || BLANK_DIARY || !quotes.length) return;
    const id = setInterval(() => {
      setQuotesIndex((i) => (i + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(id);
  }, [RESET_DIARY, BLANK_DIARY, quotes.length]);

  // Dream filtering logic
  const filteredDreams = dreams.filter(dream => {
    const matchesFilter = filter === 'all' || 
      (filter === 'recent' && new Date(dream.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (filter === 'intense' && dream.dreamIntensity === 'high') ||
      (filter === 'vivid' && dream.dreamVividness === 'vivid');
    
    const matchesSearch = searchTerm === '' || 
      dream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dream.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (RESET_DIARY) {
    return (
      <div className="dream-diary-page" style={{ minHeight: '60vh' }} />
    );
  }

  // Enhanced Dream Diary UI only (no legacy blocks/lists/filters)
  if (BLANK_DIARY) {
    return (
      <div className="dream-diary-page">
        <div className="dream-diary-header">
          <motion.div
            className="header-content"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h1 style={{
              background: 'linear-gradient(90deg,#4c1d95,#7c3aed,#06b6d4)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              Dream Diary
            </h1>
            <AnimatePresence mode="wait">
              <motion.p
                key={quotesIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6 }}
                style={{ minHeight: 24, color: '#6b7280' }}
              >
                {quotes[quotesIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="dialogue-grid">
          <motion.div 
            className="dialogue-box" 
            whileHover={{ scale: 1.02, y: -8 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRoutineModal(true)}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3>
              <FaSun className="box-icon" />
              Daily Routine
            </h3>
            <p>Record today's structure and adherence to your planned routine. Track your daily patterns and build consistency.</p>
          </motion.div>
          
          <motion.div 
            className="dialogue-box" 
            whileHover={{ scale: 1.02, y: -8 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDreamModal(true)}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3>
              <FaMoon className="box-icon" />
              Dream Entry
            </h3>
            <p>Document key dream details for reflection and insights. Capture your subconscious experiences and patterns.</p>
          </motion.div>
          
          <motion.div 
            className="dialogue-box" 
            whileHover={{ scale: 1.02, y: -8 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Phase-1: Use V2 modal when feature flag is enabled
              if (process.env.REACT_APP_DREAM_DIARY_V2 === 'true') {
                setShowWellnessModalV2(true);
              } else {
                setShowWellnessModal(true);
              }
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3>
              <FaHeartbeat className="box-icon" />
              Mental Health & Wellness
            </h3>
            <p>Get tailored guidance to support your wellbeing. Monitor your emotional health and receive personalized insights.</p>
          </motion.div>
          
          <motion.div 
            className="dialogue-box" 
            whileHover={{ scale: 1.02, y: -8 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAnalysisModal(true)}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3>
              <FaChartLine className="box-icon" />
              Lifestyle Analysis
            </h3>
            <p>Review patterns, themes, and saved snapshots. Analyze your habits and discover meaningful connections.</p>
          </motion.div>
          
          <motion.div 
            className="dialogue-box" 
            whileHover={{ scale: 1.02, y: -8 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowHistoryModal(true)}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3>
              <FaHistory className="box-icon" />
              History
            </h3>
            <p>Browse through your complete dream and wellness journey. Reflect on your progress and growth over time.</p>
          </motion.div>
        </div>

        <DailyRoutineModal
          open={showRoutineModal}
          onClose={() => setShowRoutineModal(false)}
          onSubmitted={() => { fetchAnalytics(); fetchLifestyleHistory(); }}
        />
        <DreamEntryModal
          open={showDreamModal}
          onClose={() => setShowDreamModal(false)}
          onSubmitted={() => { fetchDreamDiary(); fetchAnalytics(); fetchInsights(); }}
        />
        <MentalHealthModal
          open={showWellnessModal}
          onClose={() => setShowWellnessModal(false)}
          onSubmitted={() => { fetchDreamDiary(); fetchAnalytics(); fetchInsights(); }}
        />
        {/* Phase-1: V2 Mental Health Modal (only when feature flag is enabled) */}
        {process.env.REACT_APP_DREAM_DIARY_V2 === 'true' && MentalHealthModalV2 && (
          <MentalHealthModalV2
            open={showWellnessModalV2}
            onClose={() => setShowWellnessModalV2(false)}
          />
        )}
        <LifestyleAnalysisModal
          open={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          onSaved={() => { fetchLifestyleHistory(); }}
        />
        <LifestyleHistory
          open={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          onReRunAnalysis={() => setShowAnalysisModal(true)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dream-diary-loading">
        <LoadingSpinner 
          message="Loading your dream diary..." 
          size="large" 
          fullScreen={true}
        />
      </div>
    );
  }

  // SIMPLE_DIARY disabled: fall through to legacy layout without dialogue boxes

  return (
    <div className="dream-diary-page">
      <div className="dream-diary-header">
        <motion.div
          className="header-content"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1>
            <FaMoon className="header-icon" />
            Dream Diary
          </h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={quotesIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6 }}
              style={{ minHeight: 24 }}
            >
              {quotes[quotesIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <div className="header-actions" style={{ gap: 8 }}>
          <div className="tabs" style={{ display: 'flex', gap: 8 }}>
            <button
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Diary List
            </button>
            <button
              className={`tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
              onClick={() => setActiveTab('blocks')}
            >
              Diary Blocks
            </button>
          </div>
          <motion.button
            className="sleep-survey-btn"
            onClick={() => setShowSleepSurvey(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaCalendarAlt />
            Sleep Survey
          </motion.button>
          <motion.button
            className="meditation-btn"
            onClick={() => setShowMeditationPlayer(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🧘 Meditation
          </motion.button>
        </div>
      </div>

      {/* Dialogue boxes removed as requested */}

      {/* History below boxes */}
      {lifestyleHistory.length > 0 && (
        <div className="history-section">
          <h3>Saved Analyses</h3>
          <div className="history-list">
            {lifestyleHistory.map((h) => (
              <div key={h._id || h.id} className="history-item">
                <div>
                  <div className="history-title">{h.title || 'Lifestyle Analysis Snapshot'}</div>
                  <div className="history-date">{new Date(h.createdAt).toLocaleString()}</div>
                  {h.lifestyleAnalysisData && (
                    <div className="history-charts-count">
                      {Object.keys(h.lifestyleAnalysisData).length} charts saved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dream-diary-content">
        <div className="dream-diary-sidebar">
          <motion.div
            className="sidebar-section"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h3>Filters</h3>
            <div className="filter-buttons">
              {[
                { key: 'all', label: 'All Dreams', icon: <FaMoon /> },
                { key: 'recent', label: 'Recent', icon: <FaCalendarAlt /> },
                { key: 'intense', label: 'Intense', icon: <FaBrain /> },
                { key: 'peaceful', label: 'Peaceful', icon: <FaHeart /> }
              ].map(filterOption => (
                <button
                  key={filterOption.key}
                  className={`filter-btn ${filter === filterOption.key ? 'active' : ''}`}
                  onClick={() => setFilter(filterOption.key)}
                >
                  {filterOption.icon}
                  {filterOption.label}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="sidebar-section"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3>Search</h3>
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search dreams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </motion.div>

          <motion.div
            className="sidebar-section"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="createdAt">Date</option>
              <option value="dreamIntensity">Intensity</option>
              <option value="stressScore">Stress Level</option>
              <option value="happinessScore">Happiness</option>
            </select>
          </motion.div>

          {analytics && (
            <motion.div
              className="sidebar-section"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h3>Sleep Analytics</h3>
              <DreamChart data={analytics} />
            </motion.div>
          )}

          {analytics?.avgEmotions && (
            <motion.div
              className="sidebar-section"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <h3>Emotion Radar</h3>
              <DreamChart data={analytics} type="radar" />
            </motion.div>
          )}

          {analytics?.moodSummary && (
            <motion.div
              className="sidebar-section"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3>Summary</h3>
              <p style={{ color: '#6b7280', lineHeight: 1.5 }}>{analytics.moodSummary}</p>
            </motion.div>
          )}

          {insights?.topThemes && insights.topThemes.length > 0 && (
            <motion.div
              className="sidebar-section"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              <h3>Tag Cloud</h3>
              <TagCloud themes={insights.topThemes} />
            </motion.div>
          )}

          <motion.div
            className="sidebar-section"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <MoodCalendar analyses={dreams} days={30} />
          </motion.div>
        </div>

        <div className="dream-diary-main">
          {activeTab === 'blocks' && (
            <motion.div
              className="blocks-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Suspense fallback={<div style={{ padding: 16 }}>Loading Diary Blocks…</div>}>
                <motion.div
                  className="dreams-grid"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={itemVariants}>
                    <RoutineBlock onSaved={() => { fetchAnalytics(); fetchInsights(); }} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <DreamEntryBlock onSaved={() => { fetchDreamDiary(); fetchAnalytics(); fetchInsights(); }} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <SuggestionBlock onUpdated={() => { fetchAnalytics(); }} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <MeditationBlock onUpdated={() => { /* optional persist */ }} />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <RoutineAnalyticsBlock />
                  </motion.div>
                </motion.div>
              </Suspense>
            </motion.div>
          )}

          {activeTab === 'list' && (
            <>
              <motion.div
                className="dreams-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <NightRoutineChecklist />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <MeditationTimer defaultMinutes={10} />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <RoutineDeviationChart />
                </motion.div>
              </motion.div>

              <motion.div
                className="dreams-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={itemVariants}>
                  <DailyRoutineTracker />
                </motion.div>
              </motion.div>

              <motion.div
                className="dreams-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {filteredDreams.map((dream, index) => (
                    <motion.div
                      key={dream.id || dream._id || index}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <DreamCard
                        dream={dream}
                        onSelect={setSelectedDream}
                        onDelete={handleDeleteDream}
                        onSave={handleSaveDream}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {filteredDreams.length === 0 && (
                <motion.div
                  className="empty-state"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FaMoon className="empty-icon" />
                  <h3>No dreams found</h3>
                  <p>Start by analyzing a dream in the chatbot to see it here</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {console.log('Selected Dream Data in Diary Page:', selectedDream)}
      {selectedDream && (
        <motion.div
          className="dream-detail-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="modal-content">
            <button
              className="close-btn"
              onClick={() => setSelectedDream(null)}
            >
              ×
            </button>
            {console.log('Selected Dream Data:', selectedDream)}
            <DreamInsights 
              dream={{
                ...selectedDream,
                // Map the data to match the expected structure
                yourDream: selectedDream.dreamText || selectedDream.content,
                introduction: selectedDream.summary,
                overview: selectedDream.summary,
                keySymbols: selectedDream.keywords?.reduce((acc, keyword) => ({
                  ...acc,
                  [keyword]: `This symbol represents ${keyword} in your dream.`
                }), {}) || {},
                psychological: selectedDream.emotions ? 
                  `Emotional analysis: ${JSON.stringify(selectedDream.emotions, null, 2)}` : 
                  'No psychological analysis available.',
                cultural: selectedDream.culturalContext || 'No cultural context available.',
                connections: selectedDream.connectionsToWakingLife || 'No connections to waking life identified.',
                summary: selectedDream.summary || 'No summary available.'
              }} 
            />
            {selectedDream.meditationRecommendations && (
              <MeditationPlayer recommendations={selectedDream.meditationRecommendations} />
            )}
          </div>
        </motion.div>
      )}

      {showSleepSurvey && (
        <SleepSurveyModal
          onClose={() => setShowSleepSurvey(false)}
          onSubmit={handleSaveDream}
        />
      )}

      {showMeditationPlayer && (
        <MeditationPlayer
          onClose={() => setShowMeditationPlayer(false)}
        />
      )}

      {/* New Rebuilt Modals */}
      <DailyRoutineModal
        open={showRoutineModal}
        onClose={() => setShowRoutineModal(false)}
        onSubmitted={() => { fetchAnalytics(); fetchLifestyleHistory(); }}
      />
      <DreamEntryModal
        open={showDreamModal}
        onClose={() => setShowDreamModal(false)}
        onSubmitted={() => { fetchDreamDiary(); fetchAnalytics(); fetchInsights(); }}
      />
      <WellnessGuidanceModal
        open={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        onGenerated={() => { /* optional UI feedback */ }}
      />
      {/* Phase-1: V2 Mental Health Modal (only when feature flag is enabled) */}
      {process.env.REACT_APP_DREAM_DIARY_V2 === 'true' && MentalHealthModalV2 && (
        <MentalHealthModalV2
          open={showWellnessModalV2}
          onClose={() => setShowWellnessModalV2(false)}
        />
      )}
      <LifestyleAnalysisModal
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        onSaved={() => { fetchLifestyleHistory(); }}
      />
      <LifestyleHistory
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onReRunAnalysis={() => setShowAnalysisModal(true)}
      />
    </div>
  );
};

// Phase-0: Feature flag for Dream Diary V2 (no visual changes yet)
if (process.env.REACT_APP_DREAM_DIARY_V2 === 'true') {
  // Mount future Dream Diary V2 components here when implemented
}

export default DreamDiaryPage;
