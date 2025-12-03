require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('./config/database');

async function test() {
  try {
    await connectDB();
    console.log('Database connected');
  } catch (error) {
    console.log('Database failed:', error.message);
  }
}

test();
