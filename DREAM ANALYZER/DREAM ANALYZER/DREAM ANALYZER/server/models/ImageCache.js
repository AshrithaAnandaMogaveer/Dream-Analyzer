const mongoose = require('mongoose');

const ImageCacheSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  promptHash: { type: String, required: true, index: true, unique: true },
  imageUrl: { type: String, required: true },
  modelUsed: { type: String, default: 'OpenAI' },
  meta: { type: Object, default: {} },
  cacheHitCount: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('ImageCache', ImageCacheSchema);
