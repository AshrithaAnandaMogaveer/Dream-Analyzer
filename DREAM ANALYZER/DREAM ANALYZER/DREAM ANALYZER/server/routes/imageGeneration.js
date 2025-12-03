const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { generateImage, saveImageToDisk } = require('../utils/stableDiffusionGenerator');

// Configuration
const TEMP_DIR = path.join(__dirname, '..', 'temp-images');

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Failed to create temp directory:', error);
      throw error;
    }
  }
}

// Initialize temp directory
ensureTempDir().catch(console.error);

// Simple in-memory cache for generated images (24h TTL)
const imageCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Clean up old cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      imageCache.delete(key);
      // Optionally delete the file from disk
      if (entry.filePath) {
        fs.unlink(entry.filePath).catch(console.error);
      }
    }
  }
}

// Run cleanup every hour
setInterval(cleanupCache, 60 * 60 * 1000);

// Generate a unique cache key for a prompt
function getCacheKey(prompt, options = {}) {
  const { width = 1024, height = 1024, style = 'enhance' } = options;
  const keyData = `${prompt}-${width}x${height}-${style}`;
  return crypto.createHash('sha256').update(keyData).digest('hex');
}

/**
 * @route POST /api/generate-image
 * @description Generate an image using local Stable Diffusion
 * @body {string} prompt - The text prompt for image generation
 * @body {string} [analysisId] - Optional analysis ID to associate with the image
 * @returns {Object} Image URL and metadata
 */
router.post('/generate', async (req, res) => {
  const { prompt, analysisId } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ 
      success: false, 
      error: 'Prompt is required' 
    });
  }

  // Generate a unique cache key
  const cacheKey = getCacheKey(prompt);
  const cached = imageCache.get(cacheKey);

  // Check cache first
  if (cached) {
    logger.info(`[Image Generation] Serving from cache for prompt: ${prompt.substring(0, 50)}...`);
    return res.json({
      success: true,
      imageUrl: cached.url,
      isCached: true,
      prompt: prompt,
      analysisId
    });
  }

  logger.info(`[Image Generation] Request received - Prompt: "${prompt}"`);
  
  try {
    const startTime = Date.now();
    
    // Generate the image using Stable Diffusion
    const imageData = await generateImage(prompt, {
      steps: 20,
      width: 512,
      height: 512,
      negative_prompt: 'blurry, low quality, distorted, bad anatomy, text, watermark'
    });
    
    // Save the image to disk
    const imagePath = await saveImageToDisk(
      imageData.buffer,
      'image/png',
      'sd-generated'
    );
    
    const imageUrl = `/${imagePath}`;
    const filePath = path.join(__dirname, '..', imagePath);
    
    // Cache the result
    imageCache.set(cacheKey, {
      url: imageUrl,
      filePath: filePath,
      prompt: prompt,
      createdAt: Date.now()
    });
    
    const generationTime = Date.now() - startTime;
    logger.info(`[Image Generation] Image generated in ${generationTime}ms: ${imageUrl}`);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      prompt: prompt,
      isCached: false,
      generationTime: generationTime,
      analysisId
    });
    
  } catch (error) {
    logger.error('[Image Generation] Error generating image:', {
      error: error.message,
      stack: error.stack,
      prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
    });

    // Simple error response
    res.status(500).json({
      success: false,
      error: 'Failed to generate image',
      message: error.message,
      prompt: prompt,
      analysisId
    });
  }
});

module.exports = router;
