const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/dream_analyzer', {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 45000,
    });
    console.log('Connected successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
