const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const imageController = require('../controllers/imageGen');

// Mock auth middleware for now - we'll add real auth later
const authenticate = (req, res, next) => {
  // For now, just add a dummy user ID for testing
  req.user = { id: 'test-user' };
  next();
};

// Per-user limiter: 1 request per 2 seconds
const nanoBananaLimiter = rateLimit({
  windowMs: 2000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => req.user?.id || req.ip,
  message: { error: 'Too many requests. Please wait 2 seconds before trying again.' }
});

// Slightly more permissive limiter for dream visualization
const dreamVisualizationLimiter = rateLimit({
  windowMs: 10000, // 10 second window
  max: 3, // 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, _res) => req.user?.id || req.ip,
  message: { error: 'Too many visualization requests. Please wait a moment before trying again.' }
});

// Route for generating images (Nano Banana / Gemini)
router.post('/generate', nanoBananaLimiter, imageController.generateImageWithNanoBanana);

// Alias for backward compatibility
router.post(
  '/generate-dream',
  authenticate,
  dreamVisualizationLimiter,
  imageController.generateImageWithNanoBanana
);

module.exports = router;
