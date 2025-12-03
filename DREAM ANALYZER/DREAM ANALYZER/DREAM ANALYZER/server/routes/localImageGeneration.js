const express = require('express');
const router = express.Router();
const { generateImage } = require('../utils/localImageGenerator');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// Temporary directory for images
const TEMP_IMAGE_DIR = path.join(process.cwd(), 'temp-images');
if (!fs.existsSync(TEMP_IMAGE_DIR)) {
  fs.mkdirSync(TEMP_IMAGE_DIR, { recursive: true });
}

// Generate image from text prompt
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    logger.info(`[LocalImageGen] Generating image for prompt: ${prompt}`);
    
    // Try local generation first
    const result = await generateImage(prompt);
    
    if (result.success) {
      return res.json({
        success: true,
        imageUrl: result.filepath,
        localPath: result.localPath
      });
    }
    
    // Fallback to a simple SVG if local generation fails
    const fallbackSvg = generateFallbackSvg(prompt);
    const filename = `${uuidv4()}.svg`;
    const filepath = path.join(TEMP_IMAGE_DIR, filename);
    
    fs.writeFileSync(filepath, fallbackSvg);
    
    res.json({
      success: true,
      imageUrl: `/temp-images/${filename}`,
      isFallback: true
    });
    
  } catch (error) {
    logger.error('Error in local image generation:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.message
    });
  }
});

function generateFallbackSvg(text) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" font-family="Arial" font-size="3" text-anchor="middle" dominant-baseline="middle" fill="#666">
      ${text}\n(Image generation service unavailable)
    </text>
  </svg>`;
}

module.exports = router;
