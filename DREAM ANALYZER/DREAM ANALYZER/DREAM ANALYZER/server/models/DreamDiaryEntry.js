const mongoose = require('mongoose');

const dreamDiaryEntrySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  dreamTitle: {
    type: String,
    required: true,
    trim: true
  },
  dailyRoutineData: {
    // Legacy fields (for backward compatibility)
    morningRoutine: { type: String, trim: true },
    afternoonActivities: { type: String, trim: true },
    eveningReflection: { type: String, trim: true },
    sleepQuality: { type: String, trim: true },
    mood: { type: String, trim: true },
    stressLevel: { type: String, trim: true },
    exercise: { type: String, trim: true },
    meditation: { type: String, trim: true },
    socialTime: { type: String, trim: true },
    workProductivity: { type: String, trim: true },
    // New questionnaire structure
    dailyStructure: { type: Object, default: {} },
    activities: { type: Object, default: {} },
    social: { type: Object, default: {} },
    impact: { type: Object, default: {} },
    notes: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  dreamEntryData: {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now }
  },
  mentalHealthData: {
    personalizedGuidance: { type: String, trim: true },
    lifestyleGuidance: { type: String, trim: true },
    sleepAdvice: { type: String, trim: true },
    stressGuidance: { type: String, trim: true },
    meditationPractices: [{
      name: { type: String, trim: true },
      description: { type: String, trim: true },
      audioState: { type: String, enum: ['playing', 'stopped'], default: 'stopped' }
    }],
    recommendedVideos: [{
      title: { type: String, trim: true },
      duration: { type: String, trim: true },
      thumbnail: { type: String, trim: true },
      videoId: { type: String, trim: true }
    }],
    wellnessWorkshops: [{
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      icon: { type: String, trim: true }
    }],
    timestamp: { type: Date, default: Date.now }
  },
  lifestyleAnalysisData: {
    // Chart data structures
    sleepPatterns: {
      pieData: { type: Array, default: [] },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true },
      score: { type: Number, min: 0, max: 100 }
    },
    sleepTrends: {
      lineData: { type: Array, default: [] },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    emotions: {
      pieData: { type: Array, default: [] },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    comparative: {
      barData: { type: Array, default: [] },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    // Legacy fields (for backward compatibility)
    stressLevels: {
      score: { type: Number, min: 0, max: 100 },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    moodTrends: {
      score: { type: Number, min: 0, max: 100 },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    activityBalance: {
      score: { type: Number, min: 0, max: 100 },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    overallWellness: {
      score: { type: Number, min: 0, max: 100 },
      insights: { type: String, trim: true },
      recommendations: { type: String, trim: true }
    },
    timestamp: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
dreamDiaryEntrySchema.index({ userId: 1, createdAt: -1 });
dreamDiaryEntrySchema.index({ dreamTitle: 1 });
dreamDiaryEntrySchema.index({ createdAt: -1 });

module.exports = mongoose.model('DreamDiaryEntry', dreamDiaryEntrySchema);
