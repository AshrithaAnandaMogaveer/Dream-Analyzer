// server/routes/cleanDreamDiary.js - Clean, defensive implementation
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
console.log('Loading routes/dream-diary.js');

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
router.get('/history', wrap(async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const skip = (page - 1) * limit;

    // If userId passed as query param, filter by it (frontend sometimes uses this)
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;

    const items = await History.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('/history error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History fetch failed', details: err.message });
  }
}));

router.get('/history/:userId', wrap(async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId param' });

    const items = await History.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('/history/:userId error', err && (err.stack || err.message || err));
    return res.status(500).json({ success: false, error: 'History fetch failed', details: err.message });
  }
}));

// POST /api/dream-diary/save-history (accepts userId from request body)
router.post('/save-history', wrap(async (req, res) => {
  try {
    console.log('POST /save-history called. Body keys:', Object.keys(req.body || {}));
    console.log('Auth middleware result:', { userId: req.userId, user: req.user });

    const userId = req.body.userId || req.body.userId || req.userId || req.user?.id;
    if (!userId) {
      console.warn('save-history: missing userId in both body and auth');
      console.log('Request body userId:', req.body.userId);
      console.log('Request auth userId:', req.userId);
      console.log('Request user.id:', req.user?.id);
      return res.status(400).json({ success: false, error: 'Missing userId, please check auth headers' });
    }

    const payload = {
      userId,
      title: req.body.dreamTitle || req.body.title || 'Lifestyle analysis',
      analysis: req.body.analysis || req.body.lifestyleAnalysisData || req.body,
    };

    console.log('save-history: payload prepared:', {
      userId: payload.userId,
      title: payload.title,
      analysisKeys: typeof payload.analysis === 'object' ? Object.keys(payload.analysis).slice(0,5) : typeof payload.analysis
    });

    // If analysis is huge, this may throw; wrap in try/catch
    const saved = await History.create(payload);
    console.log('save-history: saved id=', saved._id);
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('save-history error', err && (err.stack || err.message || err));
    if (err.name === 'ValidationError') {
      return res.status(422).json({ success: false, error: 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Database save failed', details: err.message });
  }
}));

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

// Fallback error handler for this router (optional)
router.use((err, req, res, next) => {
  console.error('dream-diary router error handler caught:', err && (err.stack || err.message || err));
  return res.status(500).json({ success: false, error: 'Internal server error in dream-diary route', details: err.message });
});

module.exports = router;
