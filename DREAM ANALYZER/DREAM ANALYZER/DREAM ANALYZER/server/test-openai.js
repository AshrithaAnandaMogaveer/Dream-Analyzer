const axios = require('axios');
require('dotenv').config();

async function testOpenAIApi() {
  const API_KEY = process.env.GENERATOR_API_KEY || process.env.OPENAI_API_KEY;
  const API_URL = process.env.GENERATOR_API_BASE || 'https://api.openai.com/v1/engines';

  if (!API_KEY) {
    console.error('No API key found in environment variables');
    return;
  }

  console.log('Testing OpenAI API key...');
  console.log(`Using API URL: ${API_URL}`);
  
  try {
    // First, test if we can list models (requires API key)
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Successfully connected to OpenAI API');
    console.log('Available models:', response.data.data.map(m => m.id).join(', '));
    
    // Now test the image generation endpoint
    console.log('\nTesting image generation...');
    const imageResponse = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: "dall-e-3",
        prompt: "A serene lakeside at sunset with mountains in the background",
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        response_format: 'b64_json'
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        timeout: 30000
      }
    );

    console.log('✅ Successfully generated image!');
    console.log('Response status:', imageResponse.status);
    
    if (imageResponse.data?.data?.[0]?.b64_json) {
      console.log('Received image data (base64 encoded)');
    } else if (imageResponse.data?.url) {
      console.log('Received image URL:', imageResponse.data.url);
    } else {
      console.log('Unexpected response format:', JSON.stringify(imageResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing OpenAI API:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('Authentication failed - the provided API key is invalid or has insufficient permissions');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded - too many requests');
      } else if (error.response.status === 404) {
        console.error('Endpoint not found - check the API URL');
      } else if (error.response.status >= 500) {
        console.error('Server error - OpenAI API might be experiencing issues');
      }
    } else if (error.request) {
      console.error('No response received from the server');
      console.error('Request error:', error.message);
    } else {
      console.error('Error setting up the request:', error.message);
    }
  }
}

testOpenAIApi().catch(console.error);
