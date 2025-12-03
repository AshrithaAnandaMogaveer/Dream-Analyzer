const RecentActivity = require('../models/RecentActivity');

// Utility: log an activity (best-effort)
async function logActivity(userId, type, details = {}) {
  try {
    if (!userId || !type) return;
    await RecentActivity.create({ user: userId, type, details });
  } catch (_) {
    // swallow logging errors
  }
}

// GET /api/recent-activity - current user's recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const items = await RecentActivity.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity', error: err.message });
  }
};

module.exports.logActivity = logActivity;

// POST /api/activity/log - create a new activity item
module.exports.logActivityEndpoint = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { type, description, details = {} } = req.body || {};
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!type) return res.status(400).json({ success: false, message: 'Activity type is required' });

    const activity = await RecentActivity.create({ user: userId, type, description, details });

    // Emit to the user room for real-time updates
    try {
      const io = req.app.get('io');
      if (io) io.to(String(userId)).emit('activity', { success: true, item: activity });
    } catch (_) {}

    res.json({ success: true, item: activity });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log activity', error: err.message });
  }
};
