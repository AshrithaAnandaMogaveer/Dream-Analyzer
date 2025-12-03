const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function testSdApi() {
    try {
        console.log('Testing Stable Diffusion API integration...');
        
        // Test the /sdapi/v1/sd-models endpoint
        console.log('\n1. Testing model listing...');
        const modelsResponse = await axios.get('http://127.0.0.1:7862/sdapi/v1/sd-models');
        console.log('✅ Success! Available models:', modelsResponse.data.map(m => m.model_name).join(', '));
        
        // Test the /api/sd/generate endpoint
        console.log('\n2. Testing image generation...');
        const prompt = 'a beautiful landscape with mountains and a lake, sunset, 4k, highly detailed';
        console.log(`Generating image with prompt: "${prompt}"`);
        
        const response = await axios.post('http://localhost:5000/api/sd/generate', {
            prompt: prompt,
            options: {
                steps: 20,
                width: 512,
                height: 512
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Image generated successfully!');
        console.log('Image URL:', `http://localhost:5000${response.data.imageUrl}`);
        
    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testSdApi();
