// Quick test to verify LM Studio connection
const axios = require('axios');

async function testConnection() {
  console.log('🔍 Testing LM Studio connection...\n');
  
  const url = 'http://127.0.0.1:1234/v1/models';
  
  try {
    console.log(`📍 Checking: ${url}`);
    const response = await axios.get(url, { timeout: 5000 });
    console.log('✅ LM Studio is running!');
    console.log('📋 Available models:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Cannot connect to LM Studio');
    if (error.code === 'ECONNREFUSED') {
      console.log('   → LM Studio server is not running');
      console.log('   → Please start LM Studio and enable the local server');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Connection timeout - check if port 1234 is correct');
    } else {
      console.log('   → Error:', error.message);
    }
    return false;
  }
}

testConnection();
