const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const recentActivityController = require('../controllers/recentActivityController');

// GET /api/recent-activity
router.get('/', auth, recentActivityController.getRecentActivity);

module.exports = router;
