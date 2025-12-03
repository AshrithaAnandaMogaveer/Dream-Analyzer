const EnhancedLifestyleAnalysis = require('../models/EnhancedLifestyleAnalysis');
const DreamDiary = require('../models/DreamDiary');
const Routine = require('../models/Routine');
const DreamAnalysis = require('../models/DreamAnalysis');
const { logActivity } = require('./recentActivityController');

// Helper function to calculate sleep categories
const categorizeSleep = (hours) => {
  if (hours > 7.5) return 'good';
  if (hours >= 6) return 'okay';
  return 'poor';
};

// Helper function to extract emotions from dream content
const extractEmotions = (dreamContent) => {
  const emotionKeywords = {
    happy: ['happy', 'joy', 'excited', 'cheerful', 'pleased', 'delighted'],
    sad: ['sad', 'cry', 'tears', 'depressed', 'melancholy', 'grief'],
    anxious: ['anxious', 'worried', 'nervous', 'panic', 'stress', 'fear'],
    neutral: ['normal', 'calm', 'peaceful', 'relaxed', 'okay', 'fine'],
    angry: ['angry', 'mad', 'rage', 'furious', 'irritated', 'annoyed']
  };

  const emotions = { happy: 0, sad: 0, anxious: 0, neutral: 0, angry: 0 };
  const content = dreamContent.toLowerCase();

  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        emotions[emotion]++;
      }
    });
  });

  return emotions;
};

// Generate analysis from provided entry IDs or latest entries
const generateAnalysis = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { dreamEntryId, dailyRoutineId, mentalHealthEntryId } = req.body;

    // Fetch latest entries if IDs not provided
    let dreamDiary, routine, analyses;

    if (dreamEntryId) {
      dreamDiary = await DreamDiary.findOne({ 
        user: userId, 
        'dreamEntries._id': dreamEntryId 
      });
    } else {
      dreamDiary = await DreamDiary.findOne({ user: userId })
        .sort({ 'dreamEntries.date': -1 });
    }

    if (dailyRoutineId) {
      routine = await Routine.findOne({ 
        user: userId, 
        _id: dailyRoutineId 
      });
    } else {
      routine = await Routine.findOne({ user: userId })
        .sort({ updatedAt: -1 });
    }

    // Get last 90 days of dream analyses for trends
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    analyses = await DreamAnalysis.find({ 
      user: userId, 
      createdAt: { $gte: startDate } 
    }).sort({ createdAt: 1 });

    // Compute metrics
    const metrics = {
      sleepDistribution: { good: 0, okay: 0, poor: 0 },
      sleepTrend: [],
      emotions: { happy: 0, sad: 0, neutral: 0, anxious: 0, angry: 0 },
      comparative: { routineScore: 0, engagementScore: 0, sleepScore: 0 }
    };

    // Sleep distribution from analyses
    analyses.forEach(analysis => {
      if (analysis.sleepHours) {
        const category = categorizeSleep(analysis.sleepHours);
        metrics.sleepDistribution[category]++;
        
        // Sleep trend data
        metrics.sleepTrend.push({
          date: analysis.createdAt.toISOString().split('T')[0],
          hours: analysis.sleepHours
        });
      }
    });

    // Emotions from dream entries
    if (dreamDiary && dreamDiary.dreamEntries) {
      dreamDiary.dreamEntries.forEach(entry => {
        const emotions = extractEmotions(entry.content);
        Object.keys(emotions).forEach(emotion => {
          metrics.emotions[emotion] += emotions[emotion];
        });
      });
    }

    // Comparative scores
    if (routine && routine.entries && routine.entries.length > 0) {
      const latestEntry = routine.entries[routine.entries.length - 1];
      
      // Routine score based on completion rate
      const completedItems = latestEntry.items.filter(item => item.done).length;
      const totalItems = latestEntry.items.length;
      metrics.comparative.routineScore = totalItems > 0 ? (completedItems / totalItems) * 5 : 0;

      // Engagement score from questionnaire
      if (latestEntry.questionnaire && latestEntry.questionnaire.activities) {
        const activities = Object.values(latestEntry.questionnaire.activities);
        const avgEngagement = activities.reduce((sum, val) => sum + (val || 0), 0) / activities.length;
        metrics.comparative.engagementScore = (avgEngagement / 5) * 5; // Normalize to 0-5 scale
      }
    }

    // Sleep score from recent analyses
    if (analyses.length > 0) {
      const recentSleep = analyses.slice(-7); // Last 7 entries
      const avgSleepHours = recentSleep.reduce((sum, a) => sum + (a.sleepHours || 0), 0) / recentSleep.length;
      metrics.comparative.sleepScore = Math.min(avgSleepHours / 8 * 5, 5); // Normalize to 0-5 scale
    }

    // Generate summary
    const summary = [];
    if (metrics.sleepDistribution.good > metrics.sleepDistribution.poor) {
      summary.push('Your sleep patterns are generally positive');
    } else if (metrics.sleepDistribution.poor > 0) {
      summary.push('Consider improving sleep consistency');
    }

    const dominantEmotion = Object.entries(metrics.emotions)
      .sort(([,a], [,b]) => b - a)[0];
    if (dominantEmotion && dominantEmotion[1] > 0) {
      summary.push(`Your dreams show more ${dominantEmotion[0]} emotional content`);
    }

    if (metrics.comparative.routineScore > 3) {
      summary.push('Your daily routine shows good structure');
    }

    const analysisData = {
      success: true,
      analysis: {
        summary: summary.join('. ') + '.',
        metrics,
        createdAt: new Date()
      }
    };

    res.json(analysisData);

  } catch (error) {
    console.error('Generate enhanced lifestyle analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to generate analysis', 
      details: error.message 
    });
  }
};

// Store generated analysis
const storeAnalysis = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { 
      dreamEntryId, 
      dailyRoutineId, 
      mentalHealthEntryId, 
      summary, 
      metrics, 
      chartsMeta 
    } = req.body;

    if (!summary || !metrics) {
      return res.status(400).json({ 
        error: 'Summary and metrics are required' 
      });
    }

    const analysis = await EnhancedLifestyleAnalysis.create({
      user: userId,
      dreamEntryId,
      dailyRoutineId,
      mentalHealthEntryId,
      summary,
      metrics,
      chartsMeta
    });

    try { 
      await logActivity(userId, 'enhanced_lifestyle_analysis_saved', { id: analysis._id }); 
    } catch (_) {}

    res.status(201).json({ 
      success: true, 
      analysis 
    });

  } catch (error) {
    console.error('Store enhanced lifestyle analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to store analysis', 
      details: error.message 
    });
  }
};

// Get paginated history
const getHistory = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 items
    const skip = (page - 1) * limit;

    const analyses = await EnhancedLifestyleAnalysis.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('dreamEntryId', 'title date')
      .populate('dailyRoutineId', 'title updatedAt')
      .populate('mentalHealthEntryId', 'date userMeditationChoice');

    const total = await EnhancedLifestyleAnalysis.countDocuments({ user: userId });

    res.json({
      success: true,
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get enhanced lifestyle history error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch history', 
      details: error.message 
    });
  }
};

// Get analysis by ID
const getAnalysisById = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const analysis = await EnhancedLifestyleAnalysis.findOne({ 
      _id: id, 
      user: userId 
    })
    .populate('dreamEntryId', 'title content date')
    .populate('dailyRoutineId', 'title entries')
    .populate('mentalHealthEntryId', 'date lifestyleGuidance sleepAdvice stressGuidance userMeditationChoice');

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Get enhanced lifestyle analysis by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analysis', 
      details: error.message 
    });
  }
};

module.exports = {
  generateAnalysis,
  storeAnalysis,
  getHistory,
  getAnalysisById
};
