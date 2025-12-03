const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const getUris = () => {
  const local = process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/dream_analyzer';
  const atlas = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;
  return { local, atlas };
};

const connectWithFallback = async () => {
  const { local, atlas } = getUris();

  const tryConnect = async (uri, label) => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds
      });
      logger.info(`✅ MongoDB Connected Successfully (${label})`);
      return true;
    } catch (err) {
      logger.warn(`⚠️  MongoDB ${label} connection failed: ${err.message}`);
      return false;
    }
  };

  // Try local first
  if (await tryConnect(local, 'Local')) return;

  // Fallback to Atlas
  if (atlas && await tryConnect(atlas, 'Atlas')) return;

  logger.error('❌ All MongoDB connection attempts failed. Set MONGO_URI_ATLAS or ensure local MongoDB is running.');
  throw new Error('MongoDB connection failed');
};

module.exports = connectWithFallback;
