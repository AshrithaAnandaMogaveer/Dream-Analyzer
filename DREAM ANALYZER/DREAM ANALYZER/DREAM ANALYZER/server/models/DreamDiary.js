const mongoose = require('mongoose');

const dreamEntrySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'DreamAnalysis' },
  summary: { type: String, trim: true },
  date: { type: Date, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const mentalHealthEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  lifestyleGuidance: { type: String, required: true, trim: true },
  sleepAdvice: { type: String, required: true, trim: true },
  stressGuidance: { type: String, required: true, trim: true },
  userMeditationChoice: { type: String, required: true, enum: ['breathing', 'ocean', 'tuii'] },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const dreamDiarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dreamEntries: [dreamEntrySchema],
  mentalHealthEntries: [mentalHealthEntrySchema]
}, {
  timestamps: true
});

// Note: unique: true on user creates index automatically
dreamDiarySchema.index({ 'dreamEntries.date': -1 });
dreamDiarySchema.index({ 'mentalHealthEntries.date': -1 });

module.exports = mongoose.model('DreamDiary', dreamDiarySchema);
