const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['bug-report', 'feature-request', 'general-feedback', 'complaint', 'compliment'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Feedback title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  category: {
    type: String,
    enum: ['ui-ux', 'functionality', 'performance', 'content', 'community', 'privacy', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document']
    },
    url: String,
    filename: String
  }],
  adminResponse: {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    respondedAt: Date
  },
  upvotes: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [String]
}, {
  timestamps: true
});

// Indexes
feedbackSchema.index({ type: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: 1 });
feedbackSchema.index({ isPublic: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);







