const mongoose = require('mongoose');
const { Schema } = mongoose;

const EnhancedLifestyleAnalysisSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dreamEntryId: { type: Schema.Types.ObjectId, ref: 'DreamDiary.dreamEntries', default: null },
  dailyRoutineId: { type: Schema.Types.ObjectId, ref: 'Routine', default: null },
  mentalHealthEntryId: { type: Schema.Types.ObjectId, ref: 'DreamDiary.mentalHealthEntries', default: null },
  summary: { type: String, trim: true },              // short textual summary
  metrics: { type: Schema.Types.Mixed, default: {} },  // object containing computed numbers used for charts
  chartsMeta: { type: Schema.Types.Mixed, default: {} },// optional chart metadata (colors, ranges)
  createdAt: { type: Date, default: Date.now }
});

EnhancedLifestyleAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('EnhancedLifestyleAnalysis', EnhancedLifestyleAnalysisSchema);
