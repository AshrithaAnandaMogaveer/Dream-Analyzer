const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const {
  generateAnalysis,
  storeAnalysis,
  getHistory,
  getAnalysisById
} = require('../controllers/enhancedLifestyleController');

const router = express.Router();

// Rate limiting for generate endpoint
const generateRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
  message: 'Too many analysis requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/dream-diary/lifestyle/generate - Generate analysis (reads entries, returns metrics; DOES NOT save)
router.post('/generate', 
  auth, 
  generateRateLimit,
  [
    body('dreamEntryId').optional().isMongoId().withMessage('Invalid dream entry ID'),
    body('dailyRoutineId').optional().isMongoId().withMessage('Invalid daily routine ID'),
    body('mentalHealthEntryId').optional().isMongoId().withMessage('Invalid mental health entry ID')
  ],
  generateAnalysis
);

// POST /api/dream-diary/lifestyle/store - Store analysis (auth required; saves generated analysis)
router.post('/store',
  auth,
  [
    body('summary').trim().isLength({ min: 1, max: 500 }).withMessage('Summary must be 1-500 characters'),
    body('metrics').isObject().withMessage('Metrics must be an object'),
    body('dreamEntryId').optional().isMongoId().withMessage('Invalid dream entry ID'),
    body('dailyRoutineId').optional().isMongoId().withMessage('Invalid daily routine ID'),
    body('mentalHealthEntryId').optional().isMongoId().withMessage('Invalid mental health entry ID'),
    body('chartsMeta').optional().isObject().withMessage('Charts metadata must be an object')
  ],
  storeAnalysis
);

// GET /api/dream-diary/lifestyle/history - Get paginated history (auth required)
router.get('/history',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  getHistory
);

// GET /api/dream-diary/lifestyle/:id - Get analysis by ID (auth required)
router.get('/:id',
  auth,
  getAnalysisById
);

module.exports = router;
