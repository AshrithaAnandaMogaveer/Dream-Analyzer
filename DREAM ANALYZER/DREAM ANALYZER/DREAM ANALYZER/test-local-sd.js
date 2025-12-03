const axios = require('axios');
const API_URL = "http://127.0.0.1:7861";
const API_BASE = `${API_URL}/sdapi/v1`;

async function testLocalSD() {
  try {
    console.log('Testing connection to local Stable Diffusion WebUI...');
    
    // Test basic API access
    console.log(`Testing connection to ${API_BASE}...`);
    try {
      const models = await axios.get(`${API_BASE}/sd-models`);
      console.log('✅ Success! Available models:', models.data.map(m => m.model_name).join(', '));
    } catch (error) {
      console.error('❌ Error accessing /sd-models, trying alternative endpoint...');
      const options = await axios.get(`${API_BASE}/options`);
      console.log('✅ Successfully connected to WebUI API! Current model:', options.data.sd_model_checkpoint);
    }
    
    // Test image generation
    console.log('\nTesting image generation...');
    const prompt = 'a beautiful landscape with mountains and a lake';
    
    // Test text-to-image generation
    console.log('\nTesting image generation...');
    console.log('\nSending request to generate image...');
    const response = await axios.post(`${API_BASE}/txt2img`, {
      prompt: `${prompt}, high quality, detailed, 4k`,
      negative_prompt: 'blurry, low quality, distorted, bad anatomy, text, watermark',
      steps: 20,
      width: 512,
      height: 512,
      cfg_scale: 7,
      sampler_name: 'Euler a',
    });

    // Save the generated image
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(process.cwd(), 'public', 'test-outputs');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const imageData = response.data.images[0];
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
    const filename = `test-${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, imageBuffer);
    
    console.log(`✅ Image generated and saved to: ${filepath}`);
    console.log('\n🎉 Local Stable Diffusion setup is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing local Stable Diffusion:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the WebUI running?');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure Stable Diffusion WebUI is running');
    console.log('2. Check that the API is enabled (should see "API available" in the WebUI console)');
    console.log('3. Verify the URL in your .env file matches the WebUI address');
  }
}

testLocalSD();
