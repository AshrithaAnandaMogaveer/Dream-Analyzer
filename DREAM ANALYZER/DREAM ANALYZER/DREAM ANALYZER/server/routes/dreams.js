const express = require('express');
const { body, validationResult } = require('express-validator');
const Dream = require('../models/Dream');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { analyzeDreamWithAI, generateDreamVisualization, extractMoodLevelsFromText, generateDreamImage } = require('../services/aiService');
const axios = require('axios');
const { buildSubheadingSections } = require('../services/dreamSubheadingBuilder');
const crypto = require('crypto');
const DreamAnalysis = require('../models/DreamAnalysis');
const router = express.Router();

// @route   POST /api/dreams/analyze
// @desc    Analyze a dream with AI
// @access  Private
router.post('/analyze', auth, [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required (1-100 characters)'),
  body('content').trim().isLength({ min: 10, max: 5000 }).withMessage('Content must be 10-5000 characters'),
  body('mood').isIn(['happy', 'sad', 'fearful', 'anxious', 'peaceful', 'confused', 'excited', 'neutral']).withMessage('Invalid mood'),
  body('intensity').isInt({ min: 1, max: 10 }).withMessage('Intensity must be 1-10'),
  body('sleepQuality').optional().isInt({ min: 1, max: 10 }),
  body('stressLevel').optional().isInt({ min: 1, max: 10 }),
  body('lifestyleFactors').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      content,
      mood,
      intensity,
      tags = [],
      sleepQuality,
      stressLevel,
      lifestyleFactors,
      isPublic = false,
      isAnonymous = false
    } = req.body;

    // Create dream record
    const dream = new Dream({
      user: req.userId,
      title,
      content,
      mood,
      intensity,
      tags,
      sleepQuality,
      stressLevel,
      lifestyleFactors,
      isPublic,
      isAnonymous
    });

    // Get user context for personalized analysis
    const user = await User.findById(req.userId);
    const userContext = {
      age: user.age,
      gender: user.gender,
      fieldOfWork: user.fieldOfWork,
      previousDreams: await Dream.find({ user: req.userId }).limit(10).select('content mood tags'),
      stressLevel: user.stressLevel,
      happinessLevel: user.happinessLevel
    };

    // Analyze dream with AI
    const aiAnalysis = await analyzeDreamWithAI(content, mood, intensity, userContext);
    dream.aiAnalysis = aiAnalysis;

    // Generate visual representation
    const visualization = await generateDreamVisualization(content, mood, aiAnalysis.interpretation);
    dream.visualRepresentation = visualization;

    await dream.save();

    // Update user patterns and levels
    await updateUserPatterns(req.userId, dream);

    res.json({
      message: 'Dream analyzed successfully',
      dream,
      analysis: aiAnalysis,
      visualization
    });
  } catch (error) {
    console.error('Dream analysis error:', error);
    res.status(500).json({ message: 'Error analyzing dream' });
  }
});

// @route   GET /api/dreams
// @desc    Get user's dreams
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, mood, tags } = req.query;
    const query = { user: req.userId };

    if (mood) query.mood = mood;
    if (tags) query.tags = { $in: tags.split(',') }

    const dreams = await Dream.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name profileImage');

    const total = await Dream.countDocuments(query);

    res.json({
      dreams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get dreams error:', error);
    res.status(500).json({ message: 'Error fetching dreams' });
  }
});

// @route   GET /api/dreams/:id
// @desc    Get specific dream
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const dream = await Dream.findOne({ _id: req.params.id, user: req.userId })
      .populate('user', 'name profileImage');

    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    res.json(dream);
  } catch (error) {
    console.error('Get dream error:', error);
    res.status(500).json({ message: 'Error fetching dream' });
  }
});

// @route   PUT /api/dreams/:id
// @desc    Update dream
// @access  Private
router.put('/:id', auth, [
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('content').optional().trim().isLength({ min: 10, max: 5000 }),
  body('mood').optional().isIn(['happy', 'sad', 'fearful', 'anxious', 'peaceful', 'confused', 'excited', 'neutral']),
  body('intensity').optional().isInt({ min: 1, max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dream = await Dream.findOne({ _id: req.params.id, user: req.userId });
    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        dream[key] = updates[key];
      }
    });

    // Re-analyze if content changed
    if (updates.content) {
      const user = await User.findById(req.userId);
      const userContext = {
        age: user.age,
        gender: user.gender,
        fieldOfWork: user.fieldOfWork,
        previousDreams: await Dream.find({ user: req.userId }).limit(10).select('content mood tags'),
        stressLevel: user.stressLevel,
        happinessLevel: user.happinessLevel
      };

      const aiAnalysis = await analyzeDreamWithAI(
        dream.content,
        dream.mood,
        dream.intensity,
        userContext
      );
      dream.aiAnalysis = aiAnalysis;

      const visualization = await generateDreamVisualization(
        dream.content,
        dream.mood,
        aiAnalysis.interpretation
      );
      dream.visualRepresentation = visualization;
    }

    await dream.save();

    res.json({
      message: 'Dream updated successfully',
      dream
    });
  } catch (error) {
    console.error('Update dream error:', error);
    res.status(500).json({ message: 'Error updating dream' });
  }
});

// @route   DELETE /api/dreams/:id
// @desc    Delete dream
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const dream = await Dream.findOneAndDelete({ _id: req.params.id, user: req.userId });
    
    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    res.json({ message: 'Dream deleted successfully' });
  } catch (error) {
    console.error('Delete dream error:', error);
    res.status(500).json({ message: 'Error deleting dream' });
  }
});

// @route   GET /api/dreams/public/feed
// @desc    Get public dreams feed
// @access  Public
router.get('/public/feed', async (req, res) => {
  try {
    const { page = 1, limit = 10, mood, tags } = req.query;
    const query = { isPublic: true };

    if (mood) query.mood = mood;
    if (tags) query.tags = { $in: tags.split(',') }

    const dreams = await Dream.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name profileImage communityLevel')
      .select('-aiAnalysis -visualRepresentation');

    const total = await Dream.countDocuments(query);

    res.json({
      dreams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get public dreams error:', error);
    res.status(500).json({ message: 'Error fetching public dreams' });
  }
});

// @route   POST /api/dreams/chat-analyze
// @desc    Analyze dream content for chat (lightweight, no DB save)
// @access  Private
router.post('/chat-analyze', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 5) {
      return res.status(400).json({ message: 'Dream content is required (min 5 chars)' });
    }

    const baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1/chat/completions';
    const model = process.env.LM_STUDIO_MODEL || 'local-model';

    const systemMsg = 'You analyze dreams and return strict JSON with fields required by the client.';
    const userMsg = `Analyze this dream and output JSON with keys: interpretation (string), emotionalInsights (string), suggestions (array of 3 short strings), mentalState (string), symbolism (array of strings), patterns (array of strings), mood (one of happy,sad,fearful,anxious,peaceful,confused,excited,neutral), intensity (1-10 number), confidence (0-100 number). Dream: ${content}`;

    const lmRes = await axios.post(
      baseUrl,
      {
        model,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ],
        temperature: Number(process.env.LM_STUDIO_TEMPERATURE || 0.6),
        max_tokens: Number(process.env.LM_STUDIO_MAX_TOKENS || 1024)
      },
      { timeout: Number(process.env.LM_STUDIO_TIMEOUT_MS || 15000) }
    );

    let txt = lmRes?.data?.choices?.[0]?.message?.content?.trim() || '';
    if (txt.startsWith('```')) {
      const idx = txt.indexOf('\n');
      const end = txt.lastIndexOf('```');
      txt = txt.slice(idx + 1, end).trim();
    }

    let parsed = {};
    try { parsed = JSON.parse(txt); } catch (_) { parsed = { interpretation: txt || 'Analysis unavailable' }; }

    const USER_CONTEXT = {
      dream_text: content,
      routine: {},
      mood: parsed.mood || 'neutral',
      recent_dreams: [],
      sleep_quality: null,
      safety_flags: {}
    };
    const sub = buildSubheadingSections(USER_CONTEXT);

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
      : (typeof parsed.suggestions === 'string' && parsed.suggestions.trim().length > 0
          ? parsed.suggestions.split(/\n|;|\.|,/).map(s => s.trim()).filter(Boolean).slice(0,3)
          : []);

    res.json({
      interpretation: parsed.interpretation || 'Analysis unavailable',
      suggestions,
      emotionalInsights: parsed.emotionalInsights || '',
      mentalState: parsed.mentalState || '',
      symbolism: Array.isArray(parsed.symbolism) ? parsed.symbolism : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      mood: parsed.mood || 'neutral',
      intensity: typeof parsed.intensity === 'number' ? parsed.intensity : determineIntensityFromAnalysis({ interpretation: parsed.interpretation || '', emotionalInsights: parsed.emotionalInsights || '', mentalState: parsed.mentalState || '' }),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 75,
      detailedAnalysis: parsed.detailedAnalysis || null,
      ...sub
    });
  } catch (error) {
    res.status(500).json({ message: 'Error analyzing dream' });
  }
});

// @route   POST /api/dreams/image
// @desc    Generate dream image from text (preview allowed)
// @access  Public (frontend will gate actual save for logged-in users)
router.post('/image', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({ message: 'Text is required (min 5 chars)' });
    }
    const img = await generateDreamImage(text);
    res.json(img);
  } catch (error) {
    console.error('Generate dream image error:', error);
    res.status(500).json({ message: 'Error generating dream image' });
  }
});

// Helper to determine mood from AI analysis
function determineMoodFromAnalysis(analysis) {
  const text = (analysis.interpretation + ' ' + analysis.emotionalInsights + ' ' + (analysis.mentalState || '')).toLowerCase();
  
  if (text.includes('happy') || text.includes('joy') || text.includes('excited') || text.includes('elated')) return 'happy';
  if (text.includes('sad') || text.includes('grief') || text.includes('loss') || text.includes('melancholy')) return 'sad';
  if (text.includes('fear') || text.includes('scared') || text.includes('afraid') || text.includes('terror')) return 'fearful';
  if (text.includes('anxious') || text.includes('worry') || text.includes('stress') || text.includes('nervous')) return 'anxious';
  if (text.includes('peace') || text.includes('calm') || text.includes('serene') || text.includes('tranquil')) return 'peaceful';
  if (text.includes('confus') || text.includes('uncertain') || text.includes('perplexed')) return 'confused';
  if (text.includes('excit') || text.includes('energetic') || text.includes('enthusiastic')) return 'excited';
  
  return 'neutral';
}

// Helper to determine intensity from AI analysis
function determineIntensityFromAnalysis(analysis) {
  const text = (analysis.interpretation + ' ' + analysis.emotionalInsights + ' ' + (analysis.mentalState || '')).toLowerCase();
  
  // High intensity keywords
  if (text.includes('overwhelming') || text.includes('intense') || text.includes('powerful') || 
      text.includes('extreme') || text.includes('vivid') || text.includes('profound')) {
    return Math.floor(Math.random() * 2) + 8; // 8-9
  }
  
  // Medium-high intensity
  if (text.includes('strong') || text.includes('significant') || text.includes('notable') ||
      text.includes('considerable')) {
    return Math.floor(Math.random() * 2) + 6; // 6-7
  }
  
  // Medium intensity
  if (text.includes('moderate') || text.includes('noticeable') || text.includes('present')) {
    return Math.floor(Math.random() * 2) + 5; // 5-6
  }
  
  // Low intensity
  if (text.includes('mild') || text.includes('subtle') || text.includes('gentle') || text.includes('slight')) {
    return Math.floor(Math.random() * 2) + 3; // 3-4
  }
  
  return 7; // Default medium-high
}

// Helper function to update user patterns
async function updateUserPatterns(userId, dream) {
  try {
    const user = await User.findById(userId);
    
    // Update stress and happiness levels based on dream
    if (dream.stressLevel) {
      user.stressLevel = Math.round((user.stressLevel + dream.stressLevel) / 2);
    }
    
    // Update dream patterns
    const existingPattern = user.dreamPatterns.find(p => p.pattern === dream.mood);
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.lastOccurrence = dream.date;
    } else {
      user.dreamPatterns.push({
        pattern: dream.mood,
        frequency: 1,
        lastOccurrence: dream.date
      });
    }

    await user.save();
  } catch (error) {
    console.error('Error updating user patterns:', error);
  }
}

module.exports = router;
