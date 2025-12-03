const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

// Configuration
const LOCAL_SD_API = process.env.LOCAL_SD_API || 'http://127.0.0.1:7860';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-images');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateImage(prompt) {
  try {
    logger.info(`[LocalSD] Generating image with prompt: ${prompt.substring(0, 100)}...`);
    
    // First, check if the local server is running
    await axios.get(`${LOCAL_SD_API}/sdapi/v1/sd-models`);
    
    // Generate the image
    const response = await axios.post(`${LOCAL_SD_API}/sdapi/v1/txt2img`, {
      prompt: `${prompt}, high quality, detailed, 4k`,
      negative_prompt: 'blurry, low quality, distorted, bad anatomy, text, watermark',
      steps: 20,
      width: 512,
      height: 512,
      cfg_scale: 7,
      sampler_name: 'Euler a',
    });

    // Save the image
    const imageData = response.data.images[0];
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
    const filename = `${uuidv4()}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    fs.writeFileSync(filepath, imageBuffer);
    
    return {
      success: true,
      filepath: `/generated-images/${filename}`,
      localPath: filepath
    };
  } catch (error) {
    logger.error('[LocalSD] Error generating image:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: true
    };
  }
}

module.exports = {
  generateImage
};
