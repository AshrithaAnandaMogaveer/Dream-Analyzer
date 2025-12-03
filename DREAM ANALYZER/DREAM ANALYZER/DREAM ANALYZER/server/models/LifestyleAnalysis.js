const mongoose = require('mongoose');

const chartSnapshotSchema = new mongoose.Schema({
  type: { type: String, trim: true },
  data: { type: Object, default: {} }
}, { _id: false });

const lifestyleAnalysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, default: 'Lifestyle Analysis Snapshot' },
  // Old chart format (backwards compatible)
  correlation: chartSnapshotSchema, // mood/routine correlation graph snapshot
  themeFrequency: chartSnapshotSchema, // dream theme/emotion frequency snapshot
  activityBreakdown: chartSnapshotSchema, // activity pie charts snapshot
  // New modal format from LifestyleAnalysisModal
  dailyRoutineData: { type: Object, default: {} },
  dreamEntryData: { type: Object, default: {} },
  mentalHealthData: { type: Object, default: {} },
  lifestyleAnalysisData: { type: Object, default: {} },
  notes: { type: String, trim: true }
}, { timestamps: true });

lifestyleAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LifestyleAnalysis', lifestyleAnalysisSchema);
