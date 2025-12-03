const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { logActivityEndpoint } = require('../controllers/recentActivityController');

// POST /api/activity/log - log a new user activity
router.post('/log', auth, logActivityEndpoint);

module.exports = router;
