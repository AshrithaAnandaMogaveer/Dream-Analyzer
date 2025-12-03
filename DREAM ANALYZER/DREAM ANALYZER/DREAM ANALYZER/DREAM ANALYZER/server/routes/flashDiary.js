const express = require('express');
const auth = require('../middleware/auth');
const { personalizedGuidanceFlash, generateLifestyleMetricsFlash } = require('../controllers/flashController');

const router = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(auth);

router.post('/guidance/personalized/flash', wrap(personalizedGuidanceFlash));
router.post('/lifestyle/analysis/generate/flash', wrap(generateLifestyleMetricsFlash));

module.exports = router;
