const axios = require('axios');
require('dotenv').config();

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_BASE = process.env.STABILITY_API_BASE || 'https://api.stability.ai/v1/user/account';
const STABILITY_ENGINE_ID = process.env.STABILITY_ENGINE_ID || 'stable-diffusion-xl-1024-v1-0';

async function testStabilityAPI() {
  try {
    console.log('Testing Stability AI API connection...');
    console.log('Using API Key:', STABILITY_API_KEY ? '***' + STABILITY_API_KEY.slice(-4) : 'Not set!');
    
    // First, test authentication with account endpoint
    const accountResponse = await axios.get(STABILITY_API_BASE, {
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Authentication successful!');
    console.log('Account Info:', accountResponse.data);

    // Then test image generation endpoint
    const imageGenUrl = `https://api.stability.ai/v1/generation/${STABILITY_ENGINE_ID}/text-to-image`;
    console.log('\nTesting image generation endpoint...');
    
    const imageResponse = await axios.post(
      imageGenUrl,
      {
        text_prompts: [{
          text: 'a beautiful sunset over mountains',
          weight: 1
        }],
        cfg_scale: 7,
        height: 512,
        width: 512,
        steps: 30,
        samples: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
        },
        timeout: 30000 // 30 seconds timeout for generation
      }
    );

    console.log('✅ Image generation test successful!');
    console.log('Image generation response status:', imageResponse.status);
  } catch (error) {
    console.error('❌ Error testing Stability AI API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testStabilityAPI();
