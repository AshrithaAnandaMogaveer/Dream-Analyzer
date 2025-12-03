const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_BASE = process.env.STABILITY_API_BASE || 'https://api.stability.ai/v1/generation';
const STABILITY_ENGINE_ID = process.env.STABILITY_ENGINE_ID || 'stable-diffusion-xl-1024-v1-0';

// Check if API key is available
if (!STABILITY_API_KEY) {
  console.warn('[STABILITY] No Stability API key found. Set STABILITY_API_KEY in your environment variables.');
}

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(__dirname, '..', 'temp-images');

// Initialize the temp directory
async function initTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Initialize on require
initTempDir().catch(console.error);

// Generate fallback SVG (used when API fails or in test mode)
function generateFallbackSvg(prompt) {
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" fill="#666">
        ${prompt.substring(0, 100)}
      </text>
    </svg>`;
  return Buffer.from(svg);
}

// Generate image using Stability AI REST API
async function generateImageWithStability(prompt, options = {}) {
  const {
    width = 1024,
    height = 1024,
    steps = 30,
    cfgScale = 7,
    samples = 1,
    stylePreset = 'enhance',
  } = options;

  const finalPrompt = `A beautiful, detailed, and artistic visualization of: ${prompt}. Digital art, high quality, 8k, trending on artstation.`;

  console.log(`[STABILITY] Generating image with prompt: ${finalPrompt.substring(0, 100)}...`);

  // If no API key, use fallback
  if (!STABILITY_API_KEY) {
    console.warn('[STABILITY] No API key provided, using fallback image');
    throw new Error('no-api-key');
  }

  try {
    const formData = new FormData();
    
    // Add text prompt
    formData.append('text_prompts[0][text]', finalPrompt);
    formData.append('text_prompts[0][weight]', 1);
    
    // Add generation parameters
    formData.append('cfg_scale', cfgScale);
    formData.append('height', height);
    formData.append('width', width);
    formData.append('samples', samples);
    formData.append('steps', steps);
    formData.append('style_preset', stylePreset);

    const response = await axios.post(
      `${STABILITY_API_BASE}/${STABILITY_ENGINE_ID}/text-to-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
        },
        responseType: 'json',
        timeout: 60000, // 60 seconds
      }
    );

    if (!response.data.artifacts || !response.data.artifacts.length) {
      throw new Error('No image data in response');
    }

    // Get the first image from the response
    const imageData = response.data.artifacts[0].base64;
    const buffer = Buffer.from(imageData, 'base64');

    return {
      buffer,
      isFallback: false,
      mimeType: 'image/png',
      promptUsed: finalPrompt,
    };
  } catch (error) {
    console.error('[STABILITY] Error generating image:', error.message);
    if (error.response) {
      console.error('[STABILITY] Response status:', error.response.status);
      if (error.response.data) {
        console.error('[STABILITY] Error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Handle specific error cases
      if (error.response.status === 401) {
        console.error('[STABILITY] Authentication failed - check your API key');
      } else if (error.response.status === 429) {
        console.error('[STABILITY] Rate limit exceeded - too many requests');
      } else if (error.response.status >= 500) {
        console.error('[STABILITY] Server error - Stability AI might be experiencing issues');
      }
    } else if (error.request) {
      console.error('[STABILITY] No response received from server');
    }
    
    throw error;
  }
}

// Save image to disk and return URL
async function saveImageToDisk(buffer, mimeType = 'image/png') {
  const fileId = uuidv4();
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `${fileId}.${extension}`;
  const filePath = path.join(TEMP_DIR, filename);
  
  await fs.writeFile(filePath, buffer);
  
  return {
    fileId,
    filename,
    path: filePath,
    url: `/temp-images/${filename}`
  };
}

// Main function to generate and save image
async function generateAndSaveImage(prompt, options = {}) {
  try {
    // Check if we should use the test stub
    if (process.env.IMG_TEST_STUB === '1') {
      console.log('[STABILITY] Using test stub as IMG_TEST_STUB is set to 1');
      const fallbackBuffer = generateFallbackSvg(prompt);
      const savedImage = await saveImageToDisk(fallbackBuffer, 'image/svg+xml');
      return {
        ...savedImage,
        isFallback: true,
        promptUsed: prompt
      };
    }

    // Generate image using Stability AI
    const { buffer, promptUsed } = await generateImageWithStability(prompt, options);
    
    // Save to disk
    const savedImage = await saveImageToDisk(buffer, 'image/png');
    
    return {
      ...savedImage,
      isFallback: false,
      promptUsed
    };
  } catch (error) {
    console.error('Error in generateAndSaveImage:', error);
    // Fallback to SVG on error
    const fallbackBuffer = generateFallbackSvg(prompt);
    const savedImage = await saveImageToDisk(fallbackBuffer, 'image/svg+xml');
    return {
      ...savedImage,
      isFallback: true,
      promptUsed: prompt,
      error: error.message
    };
  }
}

module.exports = {
  generateImage: generateAndSaveImage,
  generateFallbackSvg,
  saveImageToDisk
};
