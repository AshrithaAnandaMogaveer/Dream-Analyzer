const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', process.env.MONGO_URI_LOCAL);

    await mongoose.connect(process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/dream_analyzer', {
      // Remove deprecated options if any
    });

    console.log('✅ Connected successfully');

    // Test listing databases if possible
    const admin = mongoose.connection.db.admin();
    const listDatabases = await admin.listDatabases();
    console.log('Available databases:', listDatabases.databases.map(db => db.name));

    await mongoose.disconnect();
    console.log('Disconnected successfully');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
