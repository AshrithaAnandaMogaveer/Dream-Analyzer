const DreamAnalysis = require('../models/DreamAnalysis');

// GET /api/analytics/user/:userId
exports.getUserAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Fetch user's dream analyses
    const analyses = await DreamAnalysis.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });
    
    if (analyses.length === 0) {
      return res.json({
        emotionMix: { joy: 0, fear: 0, anxiety: 0, calmness: 0, sadness: 0, excitement: 0 },
        stressTrend: [],
        happinessTrend: [],
        frequentThemes: [],
        totalDreams: 0,
        averageStress: 0,
        averageHappiness: 0
      });
    }
    
    // Calculate emotion mix (average across all dreams)
    const emotionMix = {
      joy: 0,
      fear: 0,
      anxiety: 0,
      calmness: 0,
      sadness: 0,
      excitement: 0
    };
    
    analyses.forEach(analysis => {
      Object.keys(emotionMix).forEach(emotion => {
        emotionMix[emotion] += analysis.emotions[emotion] || 0;
      });
    });
    
    // Average emotions
    Object.keys(emotionMix).forEach(emotion => {
      emotionMix[emotion] = parseFloat((emotionMix[emotion] / analyses.length).toFixed(2));
    });
    
    // Stress and happiness trends
    const stressTrend = analyses.map(a => ({
      date: a.createdAt,
      value: a.stressScore
    }));
    
    const happinessTrend = analyses.map(a => ({
      date: a.createdAt,
      value: a.happinessScore
    }));
    
    // Frequent themes
    const themeCount = {};
    analyses.forEach(analysis => {
      analysis.themes.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });
    
    const frequentThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
    
    // Calculate averages
    const totalStress = analyses.reduce((sum, a) => sum + a.stressScore, 0);
    const totalHappiness = analyses.reduce((sum, a) => sum + a.happinessScore, 0);
    
    res.json({
      emotionMix,
      stressTrend,
      happinessTrend,
      frequentThemes,
      totalDreams: analyses.length,
      averageStress: Math.round(totalStress / analyses.length),
      averageHappiness: Math.round(totalHappiness / analyses.length),
      moodOverTime: analyses.map(a => ({
        date: a.createdAt,
        emotions: a.emotions
      }))
    });
    
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
};

// GET /api/analytics/summary
exports.getGlobalSummary = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Fetch all recent analyses
    const analyses = await DreamAnalysis.find({
      createdAt: { $gte: startDate }
    });
    
    if (analyses.length === 0) {
      return res.json({
        totalDreams: 0,
        emotionDistribution: {},
        popularThemes: [],
        averageStress: 0,
        averageHappiness: 0
      });
    }
    
    // Calculate emotion distribution
    const emotionDistribution = {
      joy: 0,
      fear: 0,
      anxiety: 0,
      calmness: 0,
      sadness: 0,
      excitement: 0
    };
    
    analyses.forEach(analysis => {
      Object.keys(emotionDistribution).forEach(emotion => {
        emotionDistribution[emotion] += analysis.emotions[emotion] || 0;
      });
    });
    
    // Average emotions
    Object.keys(emotionDistribution).forEach(emotion => {
      emotionDistribution[emotion] = parseFloat((emotionDistribution[emotion] / analyses.length).toFixed(2));
    });
    
    // Popular themes
    const themeCount = {};
    analyses.forEach(analysis => {
      analysis.themes.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });
    
    const popularThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));
    
    // Calculate global averages
    const totalStress = analyses.reduce((sum, a) => sum + a.stressScore, 0);
    const totalHappiness = analyses.reduce((sum, a) => sum + a.happinessScore, 0);
    
    res.json({
      totalDreams: analyses.length,
      emotionDistribution,
      popularThemes,
      averageStress: Math.round(totalStress / analyses.length),
      averageHappiness: Math.round(totalHappiness / analyses.length)
    });
    
  } catch (error) {
    console.error('Global summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
};
