const axios = require('axios');

async function quickTest() {
  console.log('🔍 Quick LM Studio Test with 2 minute timeout...\n');
  
  const LM_STUDIO_URL = 'http://192.168.31.35:1234/v1/chat/completions';
  
  try {
    console.log('⏱️ Starting request at:', new Date().toLocaleTimeString());
    
    const response = await axios.post(LM_STUDIO_URL, {
      model: 'llama-2-7b-chat',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Say "OK" in one word.' }
      ],
      temperature: 0.7,
      max_tokens: 10
    }, {
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('⏱️ Response received at:', new Date().toLocaleTimeString());
    console.log('✅ Success!');
    console.log('Response:', response.data?.choices?.[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ECONNABORTED') {
      console.error('\n⚠️ Still timing out after 2 minutes!');
      console.error('Your model is too slow. Try:');
      console.error('1. Enable GPU acceleration in LM Studio');
      console.error('2. Download a faster model like TinyLlama or Phi-2');
    }
  }
}

quickTest();
