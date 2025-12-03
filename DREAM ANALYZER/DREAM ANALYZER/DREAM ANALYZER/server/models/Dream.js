const mongoose = require('mongoose');

const dreamSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Dream title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Dream content is required'],
    trim: true,
    maxlength: [5000, 'Dream content cannot exceed 5000 characters']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'fearful', 'anxious', 'peaceful', 'confused', 'excited', 'neutral'],
    required: true
  },
  intensity: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  aiAnalysis: {
    interpretation: String,
    suggestions: [String],
    emotionalInsights: String,
    patterns: [String],
    confidence: Number,
    generatedAt: Date,
    sleepQuality: String,
    mentalWellness: Number,
    dreamIntensity: String,
    meditationRecommendations: [{
      type: String,
      title: String,
      description: String,
      duration: String,
      difficulty: String
    }]
  },
  visualRepresentation: {
    description: String,
    imageUrl: String,
    colors: [String],
    shapes: [String],
    emotions: [String]
  },
  sleepQuality: {
    type: Number,
    min: 1,
    max: 10
  },
  stressLevel: {
    type: Number,
    min: 1,
    max: 10
  },
  lifestyleFactors: {
    exercise: Boolean,
    meditation: Boolean,
    screenTime: Number,
    caffeine: Number,
    alcohol: Number
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  communityEngagement: {
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now }
    }],
    shares: Number
  }
}, {
  timestamps: true
});

// Index for better query performance
dreamSchema.index({ user: 1, date: -1 });
dreamSchema.index({ isPublic: 1, createdAt: -1 });
dreamSchema.index({ tags: 1 });
dreamSchema.index({ mood: 1 });

module.exports = mongoose.model('Dream', dreamSchema);

