const express = require('express');
const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const DreamAnalysis = require('../models/DreamAnalysis');
const User = require('../models/User');
const CommunityPost = require('../models/CommunityPost');
const Feedback = require('../models/Feedback');
const auth = require('../middleware/auth');
const { extractMoodLevelsFromText } = require('../services/aiService');
const analyticsController = require('../controllers/analyticsController');
const router = express.Router();

// @route   GET /api/analytics/user/:userId
// @desc    Get user analytics
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (req.userId.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.params.userId;
    const { period = '30' } = req.query; // days
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    // Dream analytics
    const dreamStats = await Dream.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalDreams: { $sum: 1 },
          averageIntensity: { $avg: '$intensity' },
          averageSleepQuality: { $avg: '$sleepQuality' },
          averageStressLevel: { $avg: '$stressLevel' },
          moodDistribution: { $push: '$mood' },
          intensityDistribution: { $push: '$intensity' }
        }
      }
    ]);

    // Dream patterns over time
    const dreamPatterns = await Dream.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          count: { $sum: 1 },
          avgIntensity: { $avg: '$intensity' },
          avgSleepQuality: { $avg: '$sleepQuality' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Community engagement
    const communityStats = await CommunityPost.aggregate([
      { $match: { author: mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: '$engagement.likes' } },
          totalComments: { $sum: { $size: '$engagement.comments' } },
          totalViews: { $sum: '$engagement.views' }
        }
      }
    ]);

    // Process mood distribution
    const moodDist = {};
    if (dreamStats.length > 0 && dreamStats[0].moodDistribution) {
      dreamStats[0].moodDistribution.forEach(mood => {
        moodDist[mood] = (moodDist[mood] || 0) + 1;
      });
    }

    // Process intensity distribution
    const intensityDist = {};
    if (dreamStats.length > 0 && dreamStats[0].intensityDistribution) {
      dreamStats[0].intensityDistribution.forEach(intensity => {
        intensityDist[intensity] = (intensityDist[intensity] || 0) + 1;
      });
    }

    res.json({
      period: `${period} days`,
      dreamStats: dreamStats[0] || {
        totalDreams: 0,
        averageIntensity: 0,
        averageSleepQuality: 0,
        averageStressLevel: 0
      },
      dreamPatterns,
      moodDistribution: moodDist,
      intensityDistribution: intensityDist,
      communityStats: communityStats[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0
      }
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ message: 'Error fetching user analytics' });
  }
});

// @route   GET /api/analytics/global
// @desc    Get global analytics
// @access  Public
router.get('/global', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    // User statistics
    const userStats = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          averageAge: { $avg: '$age' },
          genderDistribution: { $push: '$gender' },
          communityLevelDistribution: { $push: '$communityLevel' }
        }
      }
    ]);

    // Dream statistics
    const dreamStats = await Dream.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalDreams: { $sum: 1 },
          averageIntensity: { $avg: '$intensity' },
          moodDistribution: { $push: '$mood' },
          publicDreams: { $sum: { $cond: ['$isPublic', 1, 0] } }
        }
      }
    ]);

    // Community statistics
    const communityStats = await CommunityPost.aggregate([
      { $match: { createdAt: { $gte: startDate }, 'moderation.status': 'approved' } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $size: '$engagement.likes' } },
          totalComments: { $sum: { $size: '$engagement.comments' } },
          totalViews: { $sum: '$engagement.views' },
          categoryDistribution: { $push: '$category' }
        }
      }
    ]);

    // Feedback statistics
    const feedbackStats = await Feedback.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          typeDistribution: { $push: '$type' }
        }
      }
    ]);

    // Process distributions
    const processDistribution = (arr) => {
      const dist = {};
      arr.forEach(item => {
        dist[item] = (dist[item] || 0) + 1;
      });
      return dist;
    };

    res.json({
      period: `${period} days`,
      userStats: {
        ...userStats[0],
        genderDistribution: userStats[0] ? processDistribution(userStats[0].genderDistribution) : {},
        communityLevelDistribution: userStats[0] ? processDistribution(userStats[0].communityLevelDistribution) : {}
      },
      dreamStats: {
        ...dreamStats[0],
        moodDistribution: dreamStats[0] ? processDistribution(dreamStats[0].moodDistribution) : {}
      },
      communityStats: {
        ...communityStats[0],
        categoryDistribution: communityStats[0] ? processDistribution(communityStats[0].categoryDistribution) : {}
      },
      feedbackStats: {
        ...feedbackStats[0],
        typeDistribution: feedbackStats[0] ? processDistribution(feedbackStats[0].typeDistribution) : {}
      }
    });
  } catch (error) {
    console.error('Get global analytics error:', error);
    res.status(500).json({ message: 'Error fetching global analytics' });
  }
});

// @route   GET /api/analytics/insights/:userId
// @desc    Get personalized insights for user
// @access  Private
router.get('/insights/:userId', auth, async (req, res) => {
  try {
    if (req.userId.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get recent dreams for analysis
    const recentDreams = await Dream.find({ user: userId })
      .sort({ date: -1 })
      .limit(20);

    // Analyze patterns
    const insights = {
      sleepQuality: {
        average: recentDreams.reduce((sum, dream) => sum + (dream.sleepQuality || 0), 0) / recentDreams.length || 0,
        trend: 'stable' // This would be calculated based on historical data
      },
      stressLevel: {
        current: user.stressLevel,
        trend: 'stable'
      },
      happinessLevel: {
        current: user.happinessLevel,
        trend: 'stable'
      },
      dreamPatterns: {
        mostCommonMood: getMostCommonMood(recentDreams),
        averageIntensity: recentDreams.reduce((sum, dream) => sum + dream.intensity, 0) / recentDreams.length || 0,
        recurringThemes: getRecurringThemes(recentDreams)
      },
      recommendations: generateRecommendations(user, recentDreams)
    };

    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

// @route   POST /api/analytics/extract
// @desc    Extract happiness and stress levels from free text
// @access  Private (but we can allow guests to preview by not breaking)
router.post('/extract', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({ message: 'Text is required (min 5 chars)' });
    }
    const result = await extractMoodLevelsFromText(text);
    res.json(result);
  } catch (error) {
    console.error('Extract mood levels error:', error);
    res.status(500).json({ message: 'Error extracting mood levels' });
  }
});

// Helper functions
function getMostCommonMood(dreams) {
  const moodCount = {};
  dreams.forEach(dream => {
    moodCount[dream.mood] = (moodCount[dream.mood] || 0) + 1;
  });
  
  return Object.keys(moodCount).reduce((a, b) => 
    moodCount[a] > moodCount[b] ? a : b, 'neutral'
  );
}

function getRecurringThemes(dreams) {
  const allTags = dreams.flatMap(dream => dream.tags || []);
  const tagCount = {};
  allTags.forEach(tag => {
    tagCount[tag] = (tagCount[tag] || 0) + 1;
  });
  
  return Object.entries(tagCount)
    .filter(([tag, count]) => count > 1)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);
}

function generateRecommendations(user, dreams) {
  const recommendations = [];
  
  const avgSleepQuality = dreams.reduce((sum, dream) => sum + (dream.sleepQuality || 0), 0) / dreams.length;
  const avgStressLevel = dreams.reduce((sum, dream) => sum + (dream.stressLevel || 0), 0) / dreams.length;
  
  if (avgSleepQuality < 6) {
    recommendations.push({
      type: 'sleep',
      title: 'Improve Sleep Quality',
      description: 'Your sleep quality could be better. Try maintaining a consistent sleep schedule.',
      priority: 'high'
    });
  }
  
  if (avgStressLevel > 7) {
    recommendations.push({
      type: 'stress',
      title: 'Manage Stress Levels',
      description: 'Consider stress management techniques like meditation or exercise.',
      priority: 'high'
    });
  }
  
  if (user.stressLevel > 7) {
    recommendations.push({
      type: 'wellness',
      title: 'Focus on Wellness',
      description: 'Your stress levels are high. Consider wellness activities.',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

// New enhanced analytics routes
// GET /api/analytics/user/:userId/enhanced - Enhanced user analytics with DreamAnalysis
router.get('/user/:userId/enhanced', auth, analyticsController.getUserAnalytics);

// GET /api/analytics/summary - Global analytics summary
router.get('/summary', analyticsController.getGlobalSummary);

module.exports = router;



