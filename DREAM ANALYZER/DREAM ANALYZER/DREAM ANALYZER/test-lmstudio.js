const axios = require('axios');

async function testLMStudio() {
  console.log('🔍 Testing LM Studio Connection...\n');
  
  const LM_STUDIO_URL = 'http://127.0.0.1:1234/v1/chat/completions';
  
  try {
    console.log('1️⃣ Checking if LM Studio is running on port 1234...');
    
    const response = await axios.post(LM_STUDIO_URL, {
      model: 'local-model',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, I am working!" in JSON format with a field called "message".' }
      ],
      temperature: 0.7,
      max_tokens: 100
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ LM Studio is running and responding!\n');
    console.log('📥 Response received:');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    
    const content = response.data?.choices?.[0]?.message?.content;
    if (content) {
      console.log('\n💬 AI Response:', content);
    }
    
    console.log('\n✅ LM Studio is working correctly!');
    console.log('   You can now use it for dream analysis.');
    
  } catch (error) {
    console.error('❌ Error connecting to LM Studio:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. This means:');
      console.error('   ❌ LM Studio is NOT running');
      console.error('   ❌ OR the server is not started in LM Studio');
      console.error('   ❌ OR it\'s running on a different port\n');
      console.error('   ✅ To fix:');
      console.error('      1. Open LM Studio');
      console.error('      2. Load a model');
      console.error('      3. Go to "Local Server" tab');
      console.error('      4. Click "Start Server"');
      console.error('      5. Make sure it says "Server running on port 1234"');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('   Request timed out. This means:');
      console.error('   ⚠️  LM Studio is running but not responding');
      console.error('   ⚠️  The model might be too slow');
      console.error('   ⚠️  The model might not be loaded properly\n');
      console.error('   ✅ To fix:');
      console.error('      1. Check if a model is loaded in LM Studio');
      console.error('      2. Try a smaller/faster model');
      console.error('      3. Check LM Studio logs for errors');
    } else {
      console.error('   Unexpected error:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
    }
    
    console.error('\n📋 Troubleshooting checklist:');
    console.error('   □ LM Studio application is open');
    console.error('   □ A model is downloaded and loaded');
    console.error('   □ Server is started (green "Running" indicator)');
    console.error('   □ Port is set to 1234');
    console.error('   □ No firewall blocking localhost:1234');
    
    process.exit(1);
  }
}

// Also test if port 1234 is accessible
async function checkPort() {
  console.log('🔍 Checking if port 1234 is accessible...\n');
  
  try {
    const response = await axios.get('http://127.0.0.1:1234', {
      timeout: 3000,
      validateStatus: () => true // Accept any status
    });
    
    console.log('✅ Port 1234 is accessible');
    console.log('   Status:', response.status);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Port 1234 is NOT accessible');
      console.error('   LM Studio server is not running\n');
    } else {
      console.log('⚠️  Port check inconclusive:', error.message);
    }
  }
}

// Run tests
(async () => {
  await checkPort();
  console.log('─'.repeat(60));
  await testLMStudio();
})();
