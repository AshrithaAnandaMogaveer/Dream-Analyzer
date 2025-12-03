const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const {
  submitDailyRoutine,
  submitDreamEntry,
  fetchAnalysis,
  wellnessGuidance,
  personalizedGuidance,
  lmStudioPersonalizedGuidance,
  getLifestyleAnalysis,
  saveLifestyleAnalysis,
  generateLifestyleMetrics,
  mentalHealth
} = require('../controllers/dreamDiaryController');

// === CRITICAL FIX: Register the EnhancedLifestyleAnalysis model ===
const EnhancedLifestyleAnalysis = require('../models/EnhancedLifestyleAnalysis');

const router = express.Router();
console.log('Loading routes/dream-diary.js');

// Apply auth middleware to all routes
router.use(auth);
console.log('Auth middleware applied to dream-diary routes');

// Defensive: ensure mongoose is available
if (!mongoose || !mongoose.connection) {
  console.warn('Warning: mongoose connection not available when loading dream-diary routes.');
}

// Minimal History schema (safe fallback)
const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Lifestyle analysis' },
  analysis: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
}, { strict: false });

const History = mongoose.models.History || mongoose.model('History', HistorySchema);

// Utility: safe async handler wrapper
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// A small health route (optional)
router.get('/_health', (req, res) => res.json({ success: true, message: 'dream-diary route loaded' }));

// GET /api/dream-diary/diary  (list diary entries, paginated)
router.get('/diary', wrap(async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const skip = (page - 1) * limit;

    // Using History as diary fallback; replace with your actual model if you have one
    const items = await History.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('/diary error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'Diary fetch failed', details: err.message });
  }
}));

// Example analytics endpoint: /analytics/sleep (simple aggregated response)
router.get('/analytics/sleep', wrap(async (req, res) => {
  try {
    // placeholder aggregation; adapt to your data model
    const count = await History.countDocuments();
    return res.json({ success: true, data: { totalHistoryItems: count } });
  } catch (err) {
    console.error('/analytics/sleep error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'Analytics failed', details: err.message });
  }
}));

// GET /api/dream-diary/history (support ?page & ?limit and /history/:userId)
// Robust handler with validation, logging, and error handling
router.get('/history', wrap(async (req, res) => {
  try {
    // Debug logging - shows exactly what client sent
    console.log('GET /api/dream-diary/history req.query:', JSON.stringify(req.query));
    console.log('GET /api/dream-diary/history req.user:', req.user ? JSON.stringify({
      id: req.user.id,
      _id: req.user._id,
      email: req.user.email
    }) : 'null');
    console.log('GET /api/dream-diary/history req.userId:', req.userId);

    // Input validation and parsing
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    console.log('/history parsed params - page:', page, 'limit:', limit, 'skip:', skip);

    // User identity validation - try multiple sources
    const userId = req.userId || req.user?.id || req.user?._id || req.headers['x-user-id'] || req.query.userId;
    console.log('/history userId resolved to:', userId);

    if (!userId) {
      console.warn('GET /api/dream-diary/history: Missing user identity - req.userId:', !!req.userId, 'req.user:', !!req.user);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please log in to view your history'
      });
    }

    // Validate userId format for MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('GET /api/dream-diary/history: Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'User ID format is invalid'
      });
    }

    console.log('/history: Querying for user:', userId);

    // Primary query: EnhancedLifestyleAnalysis items
    let history = [];
    try {
      console.log('/history: Fetching EnhancedLifestyleAnalysis items');

      const items = await EnhancedLifestyleAnalysis.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      console.log('/history: Found', items.length, 'EnhancedLifestyleAnalysis items');

      // Map to standardized format
      history = items.map(item => ({
        _id: item._id,
        id: item._id, // Frontend compatibility
        userId: item.user,
        title: item.summary || 'Lifestyle Analysis',
        analysis: item.metrics || {},
        createdAt: item.createdAt,
        type: 'lifestyle_analysis' // Mark type for frontend
      }));

    } catch (primaryErr) {
      console.error('/history: EnhancedLifestyleAnalysis query failed:', primaryErr.message);
      console.error('/history: Primary query error stack:', primaryErr.stack);
    }

    // If no EnhancedLifestyleAnalysis items found, fallback to History model
    if (history.length === 0) {
      try {
        console.log('/history: No lifestyle items found, trying History fallback');
        const fallbackItems = await History.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        console.log('/history: Found', fallbackItems.length, 'fallback History items');

        history = fallbackItems.map(item => ({
          _id: item._id,
          id: item._id,
          userId: item.userId,
          title: item.title || 'Lifestyle Analysis',
          analysis: item.analysis || {},
          createdAt: item.createdAt,
          type: 'generic_history'
        }));

      } catch (fallbackErr) {
        console.error('/history: Fallback History query failed:', fallbackErr.message);
        // Don't fail the request if fallback fails, just return empty array
      }
    }

    // Get total count for pagination metadata
    let total = 0;
    try {
      total = await EnhancedLifestyleAnalysis.countDocuments({ user: userId });

      if (total === 0) {
        // If no enhanced items, count regular history items
        total = await History.countDocuments({ userId });
      }
    } catch (countErr) {
      console.warn('/history: Count query failed:', countErr.message);
      // Continue without total count
    }

    console.log('/history: Returning', history.length, 'items, total available:', total);

    // Return standardized response format
    return res.status(200).json({
      success: true,
      history: history,
      meta: {
        page,
        limit,
        total,
        hasMore: (page * limit) < total
      }
    });

  } catch (err) {
    console.error('GET /api/dream-diary/history: Main error handler:', err);
    console.error('GET /api/dream-diary/history: Error stack:', err.stack);

    // Return standardized error response
    return res.status(500).json({
      success: false,
      error: 'History fetch failed',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });

  }
}));

router.get('/history/:id', wrap(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    // Try to find in EnhancedLifestyleAnalysis first
    let entry = await EnhancedLifestyleAnalysis.findOne({ _id: id, user: userId }).lean();

    if (!entry) {
      // Fallback to History model
      entry = await History.findOne({ _id: id, userId }).lean();
    }

    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    // Transform to frontend format
    const transformedEntry = {
      _id: entry._id,
      id: entry._id,
      userId: entry.user || entry.userId,
      dreamTitle: entry.summary || entry.title || 'Lifestyle Analysis',
      createdAt: entry.createdAt,
      dailyRoutineData: entry.metrics?.dailyRoutineAnalysis,
      dreamEntryData: entry.metrics?.dreamAnalysis,
      mentalHealthData: entry.metrics?.mentalHealthAnalysis,
      lifestyleAnalysisData: entry.metrics?.lifestyleAnalysis || entry.metrics
    };

    return res.json({ success: true, entry: transformedEntry });
  } catch (err) {
    console.error('/history/:id error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History detail fetch failed', details: err.message });
  }
}));

router.get('/history/user/:userId', wrap(async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId param' });

    const items = await History.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('/history/user/:userId error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History fetch failed', details: err.message });
  }
}));

async function saveHistory(req, res) {
  try {
    console.log('POST /save-history called. Body keys:', Object.keys(req.body || {}));
    console.log('Auth middleware result:', { userId: req.userId, userIdType: typeof req.userId, hasUser: !!req.user, userIdAlt: req.user?.id });

    // Extract user ID - try multiple sources
    let userId = req.userId;
    if (!userId && req.user) userId = req.user.id || req.user._id;
    if (!userId && req.body.userId) userId = req.body.userId;

    if (!userId) {
      console.error('save-history: No userId found in req.userId, req.user, or req.body.userId');
      return res.status(401).json({ success: false, error: 'Unauthorized - no user ID found' });
    }

    console.log('save-history: Using userId:', userId);

    const { dreamTitle, lifestyleAnalysisData, notes, mentalHealthData, dailyRoutineData, dreamEntryData } = req.body;
    console.log('save-history: Extracted data - dreamTitle:', dreamTitle, 'hasData:', !!lifestyleAnalysisData, 'notes:', notes);

    // Validate required data
        let metrics = lifestyleAnalysisData;
    if (!metrics || Object.keys(metrics).length === 0) {
      metrics = {
        ...(dailyRoutineData ? { dailyRoutineAnalysis: dailyRoutineData } : {}),
        ...(dreamEntryData ? { dreamAnalysis: dreamEntryData } : {}),
        ...(mentalHealthData ? { mentalHealthAnalysis: mentalHealthData } : {})
      };
    }

    if (!metrics || Object.keys(metrics).length === 0) {
      console.error('save-history: No lifestyle analysis data provided');
      return res.status(400).json({ success: false, error: 'No lifestyle analysis data provided' });

    }

    // Check if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('save-history: Invalid userId format:', userId);
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    // Use the already imported EnhancedLifestyleAnalysis model

    console.log('save-history: Attempting to create document with:', {
      user: userId,
      summary: `Lifestyle Analysis: ${dreamTitle || 'Snapshot'}`,
      metrics: typeof metrics,
      metricsSize: JSON.stringify(metrics || {}).length
    });
    const analysis = await EnhancedLifestyleAnalysis.create({
      user: userId,
      summary: `Lifestyle Analysis: ${dreamTitle || 'Snapshot'}`,
      metrics: metrics || {},
      notes: notes || ''
    });
    console.log('save-history: Successfully created EnhancedLifestyleAnalysis with id:', analysis._id);

    // Log activity if possible
    try {
      await require('../controllers/recentActivityController').logActivity(userId, 'lifestyle_analysis_saved', { id: analysis._id });
      console.log('save-history: Activity logged successfully');
    } catch (activityErr) {
      console.warn('save-history: Failed to log activity (non-critical):', activityErr.message);
    }

    console.log('save-history: Returning success response with analysis id:', analysis._id);

    return res.status(201).json({
      success: true,
      entry: analysis,
      savedRecord: {
        id: analysis._id,
        title: analysis.summary,
        analysis: analysis.metrics,
        createdAt: analysis.createdAt,
        userId: analysis.user
      }
    });
  } catch (err) {
    console.error('save-history error:', err);
    console.error('save-history error stack:', err.stack);

    if (err.name === 'ValidationError') {
      console.error('save-history validation errors:', err.errors);
      return res.status(422).json({ success: false, error: 'Validation failed', details: err.errors });
    }

    if (err.name === 'MongoError' && err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Duplicate entry' });
    }

    return res.status(500).json({
      success: false,
      error: 'Database save failed',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

// POST /api/dream-diary/save-history
router.post('/save-history', wrap(saveHistory));

// GET /api/dream-diary/routine/summary
router.get('/routine/summary', wrap(async (req, res) => {
  try {
    // Return a basic routine summary structure with sample data
    const routineSummary = {
      entries: [
        {
          date: new Date().toISOString(),
          questionnaire: {
            dailyStructure: {
              structureLevel: 3,
              consistencyScore: 75
            },
            activities: [],
            social: [],
            impact: {
              moodImpact: 4,
              energyImpact: 3
            },
            notes: ''
          },
          metrics: {
            sleepQuality: 7.5,
            moodRating: 4,
            energyLevel: 3
          }
        }
      ],
      stats: {
        totalEntries: 1,
        avgConsistency: 75,
        avgMood: 4.0,
        avgEnergy: 3.0
      }
    };
    return res.json(routineSummary);
  } catch (err) {
    console.error('routine/summary error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'Routine summary failed', details: err.message });
  }
}));

// POST /api/dream-diary/daily-routine
router.post('/daily-routine', submitDailyRoutine);

// POST /api/dream-diary/dream-entry
router.post('/dream-entry', submitDreamEntry);

// GET /api/dream-diary/fetch-analysis
router.get('/fetch-analysis', fetchAnalysis);

// POST /api/dream-diary/mental-health (old format support)
router.post('/mental-health', mentalHealth);

// Support for the format used by MentalHealthModal
router.post('/wellness/:action?', (req, res) => {
  // Forward to mentalHealth controller but with different response format
  return mentalHealth(req, res);
});

// GET /api/dream-diary/lifestyle-analysis
router.get('/lifestyle-analysis', getLifestyleAnalysis);

// POST /api/dream-diary/lifestyle-analysis
router.post('/lifestyle-analysis', saveLifestyleAnalysis);

// DELETE /api/dream-diary/history/:id - Delete individual history entry
router.delete('/history/:id', wrap(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    console.log('DELETE /history/:id - Attempting to delete entry:', id, 'for user:', userId);

    // Try to delete from EnhancedLifestyleAnalysis first
    let deletedEntry = await EnhancedLifestyleAnalysis.findOneAndDelete({ _id: id, user: userId });

    if (!deletedEntry) {
      // Fallback to History model
      deletedEntry = await History.findOneAndDelete({ _id: id, userId });
    }

    if (!deletedEntry) {
      return res.status(404).json({ success: false, error: 'Entry not found or already deleted' });
    }

    console.log('DELETE /history/:id - Successfully deleted entry:', id);

    return res.json({
      success: true,
      message: 'History entry deleted successfully',
      deletedEntry: { _id: deletedEntry._id, title: deletedEntry.summary || deletedEntry.title }
    });
  } catch (err) {
    console.error('DELETE /history/:id error:', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History deletion failed', details: err.message });
  }
}));

// DELETE /api/dream-diary/history - Clear all history entries for user
router.delete('/history', wrap(async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    console.log('DELETE /history - Attempting to clear all entries for user:', userId);

    // Delete from EnhancedLifestyleAnalysis
    const deletedEnhanced = await EnhancedLifestyleAnalysis.deleteMany({ user: userId });

    // Delete from History model as fallback
    const deletedHistory = await History.deleteMany({ userId });

    const totalDeleted = deletedEnhanced.deletedCount + deletedHistory.deletedCount;

    console.log('DELETE /history - Successfully deleted', totalDeleted, 'entries for user:', userId);

    return res.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} history entries`,
      deletedCount: totalDeleted
    });
  } catch (err) {
    console.error('DELETE /history error:', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History clear failed', details: err.message });
  }
}));

// Generate dynamic personalized guidance (lifestyle/sleep/stress)
router.post('/guidance/personalized', wrap(personalizedGuidance));
// Generate LM Studio–based personalized guidance (markdown, strict format)
router.post('/guidance/personalized-lmstudio', wrap(lmStudioPersonalizedGuidance));
// Generate lifestyle analysis metrics via AI
router.post('/lifestyle/analysis/generate', wrap(generateLifestyleMetrics));

// Fallback error handler for this router (optional)
router.use((err, req, res, next) => {
  console.error('dream-diary router error handler caught:', err && (err.stack || err.message || err));
  return res.status(500).json({ success: false, error: 'Internal server error in dream-diary route', details: err.message });
});

module.exports = router;
