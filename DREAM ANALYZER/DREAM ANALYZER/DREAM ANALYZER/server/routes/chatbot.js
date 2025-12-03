const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const chatbotController = require('../controllers/chatbotController');
const auth = require('../middleware/auth');

// Limit image generation to 1 request per 2 seconds per user to avoid overload
const imageGenLimiter = rateLimit({
  windowMs: 2000,
  max: 1,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Prefer authenticated user id; fallback to IP
    return (req.user && (req.user.id || req.user._id)) || req.ip || 'anon';
  },
  message: { success: false, error: 'Too many image requests. Please wait a moment and try again.', retryAfter: 2 }
});

// POST /api/chatbot/analyze - Analyze dream text
router.post('/analyze', auth, chatbotController.analyzeDream);

// POST /api/chatbot/generate-image - Generate dream image (rate-limited)
router.post('/generate-image', auth, imageGenLimiter, chatbotController.generateImage);

// GET /api/chatbot/:userId/history - Get user's analysis history
router.get('/:userId/history', auth, chatbotController.getUserHistory);

module.exports = router;
