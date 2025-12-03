// Quick database check script
// Run this to verify saved records exist and have correct user_id

const mongoose = require('mongoose');
require('dotenv').config();

// Server database connection
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/dream_analyzer', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const checkDatabase = async () => {
  try {
    console.log('Checking database for saved lifestyle analysis items...');

    // Check EnhancedLifestyleAnalysis collection
    const EnhancedLifestyleAnalysis = mongoose.model('EnhancedLifestyleAnalysis');
    const userId = '6925bd55607d6bb62a76438b'; // From your client logs

    const items = await EnhancedLifestyleAnalysis.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`Found ${items.length} EnhancedLifestyleAnalysis items for user ${userId}:`);
    items.forEach((item, i) => {
      console.log(`${i + 1}. ID: ${item._id}, Summary: ${item.summary}, Created: ${item.createdAt}`);
      console.log(`   Metrics keys: ${Object.keys(item.metrics || {}).join(', ')}`);
    });

    // Check basic History collection too
    const History = mongoose.model('History');
    const historyItems = await History.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`Found ${historyItems.length} History items for user ${userId}:`);
    historyItems.forEach((item, i) => {
      console.log(`${i + 1}. ID: ${item._id}, Title: ${item.title}, Created: ${item.createdAt}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Database check error:', err);
    process.exit(1);
  }
};

checkDatabase();
