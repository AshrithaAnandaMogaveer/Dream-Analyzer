const mongoose = require('mongoose');

const RecentActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['input', 'analysis', 'image', 'comment_post', 'comment_like', 'feedback', 'login', 'signup', 'dream_saved'], 
    required: true 
  },
  description: { type: String },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

RecentActivitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RecentActivity', RecentActivitySchema);
