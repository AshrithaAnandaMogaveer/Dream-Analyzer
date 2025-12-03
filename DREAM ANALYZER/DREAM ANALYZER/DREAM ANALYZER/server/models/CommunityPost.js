const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  content: {
    type: String,
    required: true
  },
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const communityPostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: String,
  content: {
    type: String,
    required: true
  },
  moodTag: {
    type: String,
    enum: ['Hopeful', 'Calm', 'Stressed', 'Anxious', 'Inspired', 'Peaceful', 'Confused', 'Excited', 'Fearful'],
    default: 'Calm'
  },
  anonymous: {
    type: Boolean,
    default: false
  },
  reactions: {
    love: { type: Number, default: 0 },
    thoughtful: { type: Number, default: 0 },
    dreamy: { type: Number, default: 0 },
    inspired: { type: Number, default: 0 },
    calming: { type: Number, default: 0 }
  },
  reactedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reactionType: String
  }],
  recommendations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [commentSchema],
  wellnessPoints: {
    type: Number,
    default: 2
  },
  aiReflection: String,
  country: String,
  // Dream visual fields
  dreamSummary: String,
  imageUrl: String,
  interpretation: String,
  dreamThemes: [String],
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dreamAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DreamAnalysis'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("CommunityPost", communityPostSchema);