const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('./logger');

// Configuration
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_BASE = process.env.STABILITY_API_BASE || 'https://api.stability.ai/v1/generation';
const STABILITY_ENGINE_ID = process.env.STABILITY_ENGINE_ID || 'stable-diffusion-xl-1024-v1-0';

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

// Initialize temp directory on startup
initTempDir().catch(err => {
  logger.error('Failed to initialize temp directory:', err);
  process.exit(1);
});

// Simple in-memory cache for generated images (1 hour TTL)
const imageCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

// Clean up old cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      imageCache.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Generate a unique cache key for a prompt
function getCacheKey(prompt, options = {}) {
  try {
    const { width = 1024, height = 1024, style = 'enhance' } = options;
    const keyData = `${prompt}-${width}x${height}-${style}`;
    return crypto.createHash('sha256').update(keyData).digest('hex');
  } catch (error) {
    logger.error('Error generating cache key:', error);
    // Fallback to a simple hash if crypto fails
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Generate fallback SVG for when image generation fails
function generateFallbackSvg(prompt) {
  let hash;
  try {
    hash = crypto.createHash('sha256').update(prompt).digest('hex');
  } catch (error) {
    logger.error('Error generating hash for fallback SVG:', error);
    // Use a simple fallback hash if crypto fails
    hash = Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }
  const colors = [
    `hsl(${parseInt(hash.slice(0, 3), 16) % 360}, 70%, 80%)`,
    `hsl(${parseInt(hash.slice(3, 6), 16) % 360}, 70%, 70%)`,
    `hsl(${parseInt(hash.slice(6, 9), 16) % 360}, 70%, 60%)`
  ];

  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)" />
      <circle cx="30%" cy="30%" r="15%" fill="${colors[2]}" opacity="0.3" />
      <circle cx="70%" cy="70%" r="20%" fill="${colors[2]}" opacity="0.2" />
      <text x="50%" y="50%" 
            font-family="Arial, sans-serif" 
            font-size="16" 
            text-anchor="middle" 
            fill="#333"
            dominant-baseline="middle">
        ${escapeXml(prompt.substring(0, 100))}
      </text>
    </svg>
  `;
  
  return Buffer.from(svg);
}

// Escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate image using Stability AI
async function generateImageWithStability(prompt, options = {}) {
  if (!STABILITY_API_KEY) {
    logger.error('STABILITY_API_KEY is not set');
    throw new Error('Image generation service is not properly configured');
  }

  const {
    width = 1024,
    height = 1024,
    steps = 30,
    cfgScale = 7,
    samples = 1,
    stylePreset = 'enhance',
  } = options;

  const finalPrompt = `A beautiful, detailed, and artistic visualization of: ${prompt}. Digital art, high quality, 8k, trending on artstation.`;
  const cacheKey = getCacheKey(prompt, { width, height, style: stylePreset });
  
  // Check cache first
  const cached = imageCache.get(cacheKey);
  if (cached) {
    console.log(`[STABILITY] Serving from cache: ${cacheKey}`);
    return {
      buffer: cached.buffer,
      isFallback: false,
      mimeType: 'image/png',
      promptUsed: finalPrompt
    };
  }

  console.log(`[STABILITY] Generating image with prompt: ${finalPrompt.substring(0, 100)}...`);

  // If no API key, use fallback
  if (!STABILITY_API_KEY) {
    console.warn('[STABILITY] No API key provided, using fallback image');
    return {
      buffer: generateFallbackSvg(prompt),
      isFallback: true,
      mimeType: 'image/svg+xml',
      promptUsed: finalPrompt
    };
  }

  try {
    const requestData = {
      text_prompts: [
        {
          text: finalPrompt,
          weight: 1
        }
      ],
      cfg_scale: cfgScale,
      height: height,
      width: width,
      samples: samples,
      steps: steps,
      style_preset: stylePreset
    };

    console.log('[STABILITY] Sending request to Stability AI API');
    const response = await axios.post(
      `${STABILITY_API_BASE}/${STABILITY_ENGINE_ID}/text-to-image`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
        },
        responseType: 'json',
        timeout: 120000, // 120 seconds
      }
    );

    if (!response.data.artifacts || !response.data.artifacts.length) {
      throw new Error('No image data in response');
    }

    // Get the first image from the response
    const imageData = response.data.artifacts[0].base64;
    const buffer = Buffer.from(imageData, 'base64');

    // Cache the result
    imageCache.set(cacheKey, {
      buffer,
      timestamp: Date.now()
    });

    return {
      buffer,
      isFallback: false,
      mimeType: 'image/png',
      promptUsed: finalPrompt
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
    
    // Return fallback image on error
    return {
      buffer: generateFallbackSvg(prompt),
      isFallback: true,
      mimeType: 'image/svg+xml',
      promptUsed: finalPrompt
    };
  }
}

// Save image to disk and return URL
async function saveImageToDisk(buffer, mimeType = 'image/png') {
  const fileId = uuidv4();
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `${fileId}.${extension}`;
  const filePath = path.join(TEMP_DIR, filename);
  
  try {
    await fs.writeFile(filePath, buffer);
    return {
      url: `/temp-images/${filename}`,
      filePath,
      mimeType
    };
  } catch (error) {
    console.error('Error saving image to disk:', error);
    throw error;
  }
}

// Main function to generate and save image
async function generateAndSaveImage(prompt, options = {}) {
  try {
    // Generate the image
    const { buffer, isFallback, mimeType, promptUsed } = await generateImageWithStability(prompt, options);
    
    // Save to disk
    const { url, filePath } = await saveImageToDisk(buffer, mimeType);
    
    return {
      success: true,
      url,
      filePath,
      isFallback,
      promptUsed,
      mimeType
    };
  } catch (error) {
    console.error('Error in generateAndSaveImage:', error);
    // Return fallback SVG on error
    const fallbackBuffer = generateFallbackSvg(prompt);
    const { url, filePath } = await saveImageToDisk(fallbackBuffer, 'image/svg+xml');
    
    return {
      success: false,
      url,
      filePath,
      isFallback: true,
      promptUsed: prompt,
      mimeType: 'image/svg+xml',
      error: error.message
    };
  }
}

module.exports = {
  generateImage: generateImageWithStability,
  generateAndSaveImage,
  generateFallbackSvg,
  saveImageToDisk
};
