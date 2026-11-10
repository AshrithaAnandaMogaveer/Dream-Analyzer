
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectWithFallback = async () => {
  const atlas = process.env.MONGO_URI_ATLAS || process.env.MONGO_URI;
  const local = process.env.MONGO_URI_LOCAL ||
    'mongodb://127.0.0.1:27017/dream_analyzer';

  const tryConnect = async (uri, label) => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      logger.info(`✅ MongoDB Connected Successfully (${label})`);
      return true;
    } catch (err) {
      logger.warn(`⚠️ MongoDB ${label} connection failed: ${err.message}`);
      return false;
    }
  };

  // Try Atlas first in production
  if (process.env.NODE_ENV === 'production') {
    if (atlas && await tryConnect(atlas, 'Atlas')) return;
    throw new Error('MongoDB Atlas connection failed');
  }

  // Local first during development
  if (await tryConnect(local, 'Local')) return;
  if (atlas && await tryConnect(atlas, 'Atlas')) return;

  throw new Error('All MongoDB connection attempts failed');
};

module.exports = connectWithFallback;
