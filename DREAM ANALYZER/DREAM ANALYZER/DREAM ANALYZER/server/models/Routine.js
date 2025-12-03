const mongoose = require('mongoose');

const routineEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  items: [{
    name: { type: String, required: true, trim: true, maxlength: 80 },
    done: { type: Boolean, default: false },
    impactMental: { type: Number, min: -10, max: 10, default: 0 },
    impactPhysical: { type: Number, min: -10, max: 10, default: 0 }
  }],
  notes: { type: String, trim: true, maxlength: 500 },
  questionnaire: {
    dailyStructure: { type: Object, default: {} },
    activities: { type: Object, default: {} },
    social: { type: Object, default: {} },
    impact: { type: Object, default: {} }
  }
}, { _id: false });

const routineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, maxlength: 100, default: 'Daily Routine' },
  habits: [{
    name: { type: String, required: true, trim: true, maxlength: 80 },
    goalPerDay: { type: Number, min: 0, max: 24, default: 1 },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: Date }
  }],
  entries: [routineEntrySchema]
}, {
  timestamps: true
});

routineSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Routine', routineSchema);


