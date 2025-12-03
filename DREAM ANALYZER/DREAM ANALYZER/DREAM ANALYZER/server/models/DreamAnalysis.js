const mongoose = require('mongoose');

const dreamAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dreamText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  // Hash of original text for caching per-input
  textHash: {
    type: String,
    index: true
  },
  // Analysis results
  summary: {
    type: String,
    required: true
  },
  culturalContext: {
    type: String,
    trim: true
  },
  connectionsToWakingLife: {
    type: String,
    trim: true
  },
  themes: [{
    type: String,
    trim: true
  }],
  keywords: [{
    type: String,
    trim: true
  }],
  emotions: {
    joy: { type: Number, min: 0, max: 1, default: 0 },
    fear: { type: Number, min: 0, max: 1, default: 0 },
    anxiety: { type: Number, min: 0, max: 1, default: 0 },
    calmness: { type: Number, min: 0, max: 1, default: 0 },
    sadness: { type: Number, min: 0, max: 1, default: 0 },
    excitement: { type: Number, min: 0, max: 1, default: 0 },
    // Extended numeric scores for UI binding (0-100)
    happinessPct: { type: Number, min: 0, max: 100, default: 50 },
    stressPct: { type: Number, min: 0, max: 100, default: 50 }
  },
  stressScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  happinessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  // Image generation
  imagePrompt: {
    type: String
  },
  imageUrl: { 
    type: String, 
    default: null 
  },
  imageDataUrl: { 
    type: String, 
    default: null 
  },
  imageGeneratedAt: { 
    type: Date, 
    default: null 
  },
  imageMeta: {
    type: Object,
    default: {}
  },
  // Detailed interpretation
  interpretation: {
    type: String
  },
  symbolism: [{
    symbol: String,
    meaning: String
  }],
  suggestions: [{
    type: String
  }],
  // Enhanced analysis fields
  sleepQuality: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F'],
    default: 'C'
  },
  mentalWellness: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  dreamIntensity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  meditationRecommendations: [{
    type: {
      type: String,
      enum: ['breathing', 'guided', 'visualization', 'mindfulness']
    },
    title: String,
    description: String,
    duration: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  }],
  emotionalInsights: {
    type: String
  },
  patterns: [{
    type: String
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  // Structured interpretation sections
  interpretationDetails: {
    yourDream: { type: String },
    introduction: { type: String },
    overview: { type: String },
    keySymbolsAndElements: [{ symbol: String, meaning: String }],
    psychologicalInterpretations: { type: String },
    culturalContext: { type: String },
    connectionsToWakingLife: { type: String },
    summaryAndInsights: { type: String }
  },
  // New consolidated sections structure used by Analytics/Chat sync
  sections: {
    yourDream: { type: String },
    introduction: { type: String },
    overview: { type: String },
    keySymbolsAndElements: [{ symbol: String, meaning: String }],
    psychologicalInterpretation: { type: String },
    culturalContext: { type: String },
    connectionsToWakingLife: { type: String },
    summaryAndAdvice: { type: String }
  },
  remedies: [{ type: String }],
  // Metadata
  sharedToCommunity: {
    type: Boolean,
    default: false
  },
  communityPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost'
  }
}, {
  timestamps: true
});

// Indexes for performance
dreamAnalysisSchema.index({ user: 1, createdAt: -1 });
dreamAnalysisSchema.index({ themes: 1 });
dreamAnalysisSchema.index({ createdAt: -1 });
dreamAnalysisSchema.index({ user: 1, textHash: 1 });

module.exports = mongoose.model('DreamAnalysis', dreamAnalysisSchema);
