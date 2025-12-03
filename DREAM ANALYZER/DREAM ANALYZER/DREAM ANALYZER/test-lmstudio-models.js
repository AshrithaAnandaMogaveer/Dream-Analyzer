const axios = require('axios');

async function testModels() {
  console.log('🔍 Testing LM Studio Model Names...\n');
  
  const BASE_URL = 'http://192.168.31.35:1234';
  
  // First, try to get the list of available models
  try {
    console.log('1️⃣ Checking available models...');
    const modelsResp = await axios.get(`${BASE_URL}/v1/models`, { timeout: 5000 });
    console.log('✅ Available models:');
    console.log(JSON.stringify(modelsResp.data, null, 2));
  } catch (e) {
    console.log('⚠️ Could not fetch models list:', e.message);
  }
  
  console.log('\n2️⃣ Testing different model names...\n');
  
  const modelNamesToTry = [
    'llama-2-7b-chat',
    'local-model',
    'llama-2-7b',
    'llama2',
    '',  // Empty string (use default)
  ];
  
  for (const modelName of modelNamesToTry) {
    try {
      console.log(`Testing: "${modelName || '(empty)'}"`);
      
      const resp = await axios.post(`${BASE_URL}/v1/chat/completions`, {
        model: modelName,
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 5
      }, { 
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      
      if (resp.status === 200) {
        console.log(`  ✅ SUCCESS with "${modelName || '(empty)'}"`);
        console.log(`  Response: ${resp.data?.choices?.[0]?.message?.content}`);
        console.log(`  Actual model used: ${resp.data?.model}\n`);
        break; // Found working model name
      } else {
        console.log(`  ❌ Status ${resp.status}:`, resp.data?.error?.message || resp.data);
      }
    } catch (e) {
      console.log(`  ❌ Error:`, e.message);
    }
  }
}

testModels();
