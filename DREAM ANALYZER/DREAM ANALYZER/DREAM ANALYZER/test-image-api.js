const axios = require('axios');

async function testImageGeneration() {
  try {
    console.log('Testing image generation...');
    const response = await axios.post('http://localhost:5000/api/image/generate', {
      prompt: 'a beautiful sunset over mountains'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
    console.log('Image URL:', response.data.imageUrl);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testImageGeneration();
