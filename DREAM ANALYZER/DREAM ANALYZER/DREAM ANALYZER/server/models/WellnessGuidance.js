const mongoose = require('mongoose');

const wellnessGuidanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  basedOn: {
    routineDate: { type: Date },
    dreamAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'DreamAnalysis' }
  },
  summary: { type: String, trim: true },
  recommendations: [
    {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      type: { type: String, trim: true },
      duration: { type: String, trim: true }
    }
  ],
  meditation: {
    sounds: [{ type: String }],
    breathingExercises: [
      {
        name: String,
        pattern: String,
        description: String,
        rounds: Number
      }
    ],
    youtubeVideos: [
      {
        title: String,
        url: String,
        duration: String,
        type: String
      }
    ]
  }
}, { timestamps: true });

wellnessGuidanceSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WellnessGuidance', wellnessGuidanceSchema);
