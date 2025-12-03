// server/routes/generateImage.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const { generateImage: generateWithStability } = require('../utils/stabilityGenerator');
const crypto = require('crypto');

// Promisify file system methods
const writeFile = promisify(fs.writeFile);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

// Import models
const DreamAnalysis = require('../models/DreamAnalysis');

let Jimp = null;
try { 
  const jimpModule = require('jimp');
  // Handle both CommonJS and ES module exports
  // Jimp can be exported as a default function or as an object with methods
  if (typeof jimpModule === 'function') {
    Jimp = jimpModule;
  } else if (jimpModule.default && typeof jimpModule.default === 'function') {
    Jimp = jimpModule.default;
  } else if (jimpModule.Jimp && typeof jimpModule.Jimp === 'function') {
    Jimp = jimpModule.Jimp;
  } else if (jimpModule.create && typeof jimpModule.create === 'function') {
    // Jimp might be an object with create method
    Jimp = jimpModule;
  } else {
    Jimp = null;
  }
} catch (e) { 
  console.warn('Jimp not available, will use SVG fallback:', e.message);
  Jimp = null; 
}

// Configure temp directory for image storage
const TEMP_DIR = path.join(__dirname, '..', 'temp-images');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Simple in-memory cache for generated images (24h TTL)
const imageCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      imageCache.delete(key);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupCache, 60 * 60 * 1000);

// Generate a unique cache key for a prompt
function getCacheKey(prompt) {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

// Main route for generating images
router.post('/generate', async (req, res) => {
  const { prompt, analysisId } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  console.log(`[${new Date().toISOString()}] generate-image prompt= ${prompt} analysisId= ${analysisId || 'none'}`);
  
  try {
    // Check cache first
    const cacheKey = getCacheKey(prompt);
    const cached = imageCache.get(cacheKey);
    
    if (cached) {
      console.log(`[CACHE] Serving from cache: ${cacheKey}`);
      return res.json({
        success: true,
        imageUrl: cached.url,
        isFallback: cached.fallback,
        cached: true,
        promptUsed: cached.promptUsed
      });
    }

    const startTime = Date.now();
    
    // Generate the image using Stability AI
    const result = await generateWithStability(prompt, {
      width: 1024,
      height: 1024,
      steps: 30,
      cfgScale: 7,
      samples: 1,
      stylePreset: 'enhance'
    });
    
    // Save the image to disk
    const { buffer, isFallback, promptUsed, mimeType } = result;
    const fileId = uuidv4();
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${fileId}.${extension}`;
    const filePath = path.join(TEMP_DIR, filename);
    
    await fs.writeFile(filePath, buffer);
    
    const imageUrl = `/temp-images/${filename}`;
    
    // Cache the result
    imageCache.set(cacheKey, {
      createdAt: Date.now(),
      fileId,
      url: imageUrl,
      promptUsed,
      fallback: isFallback
    });
    
    console.log(`[${Date.now() - startTime}ms] ${isFallback ? 'Fallback' : 'Generated'} image saved: ${filename}`);
    
    res.json({
      success: true,
      imageUrl,
      isFallback,
      promptUsed
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // If we get here, both the main generation and fallback failed
    res.status(500).json({
      success: false,
      error: 'Failed to generate image. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rate limits: per-IP 1 per 3s, and 10 per minute
const limiterBurst = require('express-rate-limit')({ 
  windowMs: 60 * 1000, 
  max: 10, 
  standardHeaders: false, 
  legacyHeaders: false 
});
const limiterShort = require('express-rate-limit')({ 
  windowMs: 3000, 
  max: 1, 
  standardHeaders: false, 
  legacyHeaders: false 
});

// Concurrency control (max 2 concurrent)
let inFlight = 0;
const queue = [];
function acquire() {
  if (inFlight < 2) { 
    inFlight++; 
    return Promise.resolve(); 
  }
  return new Promise(resolve => queue.push(resolve)).then(() => { 
    inFlight++; 
  });
}
function release() {
  inFlight = Math.max(0, inFlight - 1);
  const next = queue.shift();
  if (next) next();
}

async function saveImageToDisk(buffer, fileId, fileExt = 'png') {
  const tempFile = path.join(TEMP_DIR, `.${fileId}.tmp`);
  const finalFile = path.join(TEMP_DIR, `${fileId}.${fileExt}`);
  
  try {
    // Write to temp file first
    await writeFile(tempFile, buffer);
    
    // Rename atomically
    try {
      await rename(tempFile, finalFile);
    } catch (err) {
      // If rename fails (e.g., file exists), just use it
      if (fs.existsSync(tempFile)) {
        await unlink(tempFile);
      }
    }
    
    return finalFile;
  } catch (err) {
    console.error('Failed to save image:', err);
    throw err;
  }
}

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateFallbackSvg(prompt) {
  // Create a deterministic hash from the prompt
  const hash = crypto.createHash('sha256').update(prompt).digest('hex');
  const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5);
  const promptPreview = escapeXml(prompt.slice(0, 100));
  const promptHash = hash.slice(0, 8);
  
  // Generate a consistent color scheme based on the prompt
  const colorSeed = parseInt(hash.slice(0, 8), 16);
  const hue = colorSeed % 360;
  const bgHue = (hue + 180) % 360; // Complementary color
  
  // Generate a color palette based on the prompt
  const colors = [
    `hsl(${hue}, 70%, 60%)`,        // Primary color
    `hsl(${(hue + 30) % 360}, 70%, 60%)`, // Analogous
    `hsl(${(hue + 180) % 360}, 70%, 60%)`, // Complementary
    `hsl(${(hue + 90) % 360}, 70%, 60%)`,  // Split complementary
    `hsl(${(hue + 270) % 360}, 70%, 60%)`  // Split complementary
  ];
  
  // Generate a random but consistent pattern based on the prompt
  const pattern = [];
  const shapeCount = 5 + (parseInt(hash[0], 16) % 5); // 5-10 shapes
  
  for (let i = 0; i < shapeCount; i++) {
    const type = parseInt(hash[i * 2], 16) % 3;
    const size = 20 + (parseInt(hash[i * 2 + 1], 16) * 3);
    const x = parseInt(hash[i * 3], 16) * 0.9 + 5; // 5-95%
    const y = parseInt(hash[i * 3 + 1], 16) * 0.9 + 5;
    const color = colors[parseInt(hash[i], 16) % colors.length];
    const opacity = 0.3 + (parseInt(hash[i * 2 + 2], 16) / 50);
    const rotation = parseInt(hash.slice(i * 2, i * 2 + 2), 16) % 360;
    
    let shape;
    switch (type) {
      case 0: // Circle
        shape = `<circle cx="${x}%" cy="${y}%" r="${size}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x}% ${y}%)" filter="blur(${size/10}px)" />`;
        break;
      case 1: // Rectangle
        shape = `<rect x="${x-5}%" y="${y-5}%" width="${size}%" height="${size}%" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x}% ${y}%)" filter="blur(${size/20}px)" />`;
        break;
      default: // Triangle
        const points = [
          [x, y - size/2],
          [x - size/2, y + size/2],
          [x + size/2, y + size/2]
        ].map(p => p.join(',')).join(' ');
        shape = `<polygon points="${points}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x}% ${y}%)" filter="blur(${size/15}px)" />`;
    }
    pattern.push(shape);
  }
  
  // Add some connecting lines between shapes
  const lines = [];
  for (let i = 0; i < shapeCount - 1; i++) {
    const x1 = 5 + (parseInt(hash[i * 3], 16) * 0.9);
    const y1 = 5 + (parseInt(hash[i * 3 + 1], 16) * 0.9);
    const x2 = 5 + (parseInt(hash[(i + 1) * 3], 16) * 0.9);
    const y2 = 5 + (parseInt(hash[(i + 1) * 3 + 1], 16) * 0.9);
    const color = colors[i % colors.length];
    
    lines.push(`<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="${color}" stroke-width="2" opacity="0.3" stroke-linecap="round" />`);
  }
  
  // Add some floating text elements with words from the prompt
  const floatingText = words.map((word, i) => {
    const x = 10 + (parseInt(hash[i * 2], 16) * 0.8);
    const y = 15 + (parseInt(hash[i * 2 + 1], 16) * 0.7);
    const size = 12 + (parseInt(hash[i], 16) % 20);
    const color = colors[(i + 2) % colors.length];
    const rotation = -15 + (parseInt(hash[i * 2], 16) % 30);
    
    return `<text x="${x}%" y="${y}%" 
            font-size="${size}" 
            fill="${color}" 
            opacity="0.6"
            transform="rotate(${rotation} ${x}% ${y}%)"
            font-family="Arial, sans-serif"
            text-anchor="middle"
            font-weight="${i % 2 ? 'bold' : 'normal'}"
            style="pointer-events: none; user-select: none;">
              ${escapeXml(word)}
            </text>`;
  });
  
  // Create the SVG
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1024" height="1024" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${bgHue}, 60%, 90%)" />
        <stop offset="100%" stop-color="hsl(${bgHue}, 40%, 80%)" />
      </linearGradient>
      <filter id="noise" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
        <feColorMatrix type="saturate" values="0.5"/>
      </filter>
      <filter id="blur">
        <feGaussianBlur stdDeviation="0.5" />
      </filter>
    </defs>
    
    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)" />
    <rect width="100%" height="100%" filter="url(#noise)" opacity="0.1"/>
    
    <!-- Pattern -->
    <g filter="url(#blur)">
      ${pattern.join('\n      ')}
      ${lines.join('\n      ')}
    </g>
    
    <!-- Floating text -->
    <g font-family="Arial, sans-serif">
      ${floatingText.join('\n      ')}
    </g>
    
    <!-- Main content -->
    <g transform="translate(0, 0)" font-family="Arial, sans-serif" text-anchor="middle">
      <text x="50%" y="40%" font-size="5" fill="hsl(${hue}, 70%, 30%)" font-weight="bold" text-anchor="middle">
        <tspan x="50%" dy="0">Dream Visualization</tspan>
      </text>
      <text x="50%" y="50%" font-size="2.5" fill="hsl(${hue}, 50%, 30%)" opacity="0.9" text-anchor="middle">
        <tspan x="50%" dy="0">${promptPreview}</tspan>
      </text>
      <text x="50%" y="60%" font-size="1.5" fill="hsl(${hue}, 30%, 40%)" opacity="0.7" text-anchor="middle">
        <tspan x="50%" dy="0">ID: ${promptHash}</tspan>
      </text>
      <text x="50%" y="95%" font-size="1.2" fill="hsl(${hue}, 20%, 50%)" opacity="0.6" text-anchor="middle">
        <tspan x="50%" dy="0">Generated: ${new Date().toLocaleString()}</tspan>
      </text>
    </g>
  </svg>`;
  
  return Buffer.from(svg, 'utf-8');
}

async function saveImageToDisk(buffer, fileId, fileExt = 'svg') {
  const tempFile = path.join(TEMP_DIR, `.${fileId}.tmp`);
  const finalFile = path.join(TEMP_DIR, `${fileId}.${fileExt}`);
  
  try {
    // Write to temp file first
    await writeFile(tempFile, buffer);
    
    // Rename atomically
    try {
      await rename(tempFile, finalFile);
    } catch (err) {
      // If rename fails (e.g., file exists), just use it
      if (fs.existsSync(tempFile)) {
        await unlink(tempFile);
      }
    }
    
    return finalFile;
  } catch (err) {
    console.error('Failed to save image:', err);
    throw err;
  }
}

router.post('/generate-image', limiterBurst, limiterShort, async (req, res) => {
  const startTime = Date.now();
  const analysisId = req.body?.analysisId || null;
  await acquire();
  
  try {
    const prompt = (req.body?.prompt || '').trim();
    if (!prompt) {
      return res.status(200).json({ 
        success: false, 
        message: 'Please provide a prompt',
        images: []
      });
    }
    
    if (prompt.length > 800) {
      return res.status(200).json({ 
        success: false, 
        message: 'Prompt is too long (max 800 characters)',
        images: []
      });
    }
    
    console.info(`[${new Date().toISOString()}] generate-image prompt=`, prompt.slice(0,200), 'analysisId=', analysisId);

    const finalPrompt = `A beautiful, detailed, and artistic visualization of: "${prompt}"`;
    const cacheKey = crypto.createHash('sha256').update(finalPrompt).digest('hex');
    const fileId = cacheKey.slice(0, 32);
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    
    // Check cache first
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.createdAt) < CACHE_TTL_MS) {
      const cachedUrl = `${protocol}://${host}/temp-images/${cached.fileId}.svg`;
      console.info(`[${Date.now() - startTime}ms] [CACHED] Image for prompt: ${prompt.slice(0, 60)}...`);
      
      const response = {
        success: true,
        images: [{
          id: cached.fileId,
          url: cachedUrl,
          dataUrl: cached.dataUrl,
          promptUsed: finalPrompt,
          fallback: cached.fallback || false
        }],
        promptUsed: finalPrompt
      };
      
      if (analysisId) {
        response.analysisId = analysisId;
      }
      
      return res.status(200).json(response);
    }
    
    let outBuffer = null;
    let isFallback = false;
    let errorMessage = '';

    try {
      if (process.env.IMG_TEST_STUB === '1') {
        throw new Error('stub-requested');
      }
      
      outBuffer = await fetchGeneratorImageBuffer(finalPrompt);
      console.info(`[${Date.now() - startTime}ms] Generated image for: ${prompt.slice(0, 60)}...`);
    } catch (err) {
      console.warn(`[${Date.now() - startTime}ms] Generator failed (${err.message}), using fallback for: ${prompt.slice(0, 60)}...`);
      isFallback = true;
      errorMessage = err.message;
      outBuffer = await generateFallbackSvg(finalPrompt);
    }
    
    try {
      // Save the image file
      const fileExt = isFallback ? 'svg' : 'png';
      const outName = `${fileId}.${fileExt}`;
      const tempFile = path.join(TEMP_DIR, `.${outName}.tmp`);
      const finalFile = path.join(TEMP_DIR, outName);
      
      // Write to temp file first
      await writeFile(tempFile, outBuffer);
      
      // Atomic rename
      try {
        await rename(tempFile, finalFile);
      } catch (err) {
        // If rename fails (e.g., file exists), just use it
        if (fs.existsSync(tempFile)) {
          await unlink(tempFile);
        }
      }
      
      // Create data URL
      const mimeType = isFallback ? 'image/svg+xml' : 'image/png';
      const dataUrl = `data:${mimeType};base64,${outBuffer.toString('base64')}`;
      const imageUrl = `${protocol}://${host}/temp-images/${outName}`;
      
      // Cache the result
      imageCache.set(cacheKey, {
        createdAt: Date.now(),
        fileId: fileId,
        url: imageUrl,
        dataUrl: dataUrl,
        promptUsed: finalPrompt,
        fallback: isFallback
      });
      
      console.info(`[${Date.now() - startTime}ms] ${isFallback ? 'Fallback' : 'Generated'} image saved: ${outName}`);
      
      const response = {
        success: true,
        images: [{
          id: fileId,
          url: imageUrl,
          dataUrl: dataUrl,
          promptUsed: finalPrompt,
          fallback: isFallback,
          ...(isFallback && { warning: 'Generated by fallback generator' })
        }],
        promptUsed: finalPrompt
      };
      
      // If analysisId is provided, update the analysis with the image
      if (analysisId) {
        try {
          const updates = {
            imageUrl: imageUrl,
            imageDataUrl: dataUrl,
            imageGeneratedAt: new Date(),
            imageMeta: {
              ...(isFallback && { fallback: true, reason: errorMessage }),
              generatedAt: new Date().toISOString()
            }
          };
          
          const updatedAnalysis = await DreamAnalysis.findByIdAndUpdate(
            analysisId,
            { $set: updates },
            { new: true, runValidators: true }
          );
          
          if (updatedAnalysis) {
            response.analysis = updatedAnalysis;
            console.info(`[${new Date().toISOString()}] Updated analysis ${analysisId} with image: ${imageUrl}`);
          } else {
            console.warn(`[${new Date().toISOString()}] Analysis ${analysisId} not found for update`);
          }
        } catch (updateError) {
          console.error(`[${new Date().toISOString()}] Failed to update analysis ${analysisId}:`, updateError);
          // Don't fail the request, just log the error and continue
          response.analysisUpdateError = 'Failed to update analysis with image';
        }
      }
      
      console.info(`[${new Date().toISOString()}] Saved image -> ${imageUrl} for analysisId: ${analysisId || 'none'}`);
      res.status(200).json(response);
    } catch (saveError) {
      console.error('Failed to save image:', saveError);
      
      // If we couldn't save the file, return a data URL directly
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
          <rect width="100%" height="100%" fill="#f0f0f0"/>
          <text x="50%" y="50%" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">
            Failed to generate image
          </text>
        </svg>`
      ).toString('base64')}`;
      
      const response = {
        success: true,
        images: [{
          id: `error-${Date.now()}`,
          dataUrl: dataUrl,
          promptUsed: finalPrompt,
          fallback: true,
          warning: 'Failed to save image, using in-memory fallback'
        }],
        promptUsed: finalPrompt,
        analysisId: analysisId
      };
      
      return res.status(200).json(response);
    }
  } catch (err) {
    console.error('generate-image fatal:', err);
    // last-resort fallback: SVG dataUrl
    try {
      const fb = await generateFallbackSvg(req.body?.prompt || 'Dream visualization');
      const dataUrl = `data:image/svg+xml;base64,${fb.toString('base64')}`;
      const response = { 
        success: true, 
        fallback: true, 
        images: [{ 
          id: 'fallback', 
          url: '', 
          dataUrl, 
          promptUsed: req.body?.prompt || '' 
        }],
        promptUsed: req.body?.prompt || '',
        message: 'Fallback generated' 
      };
      
      if (analysisId) {
        response.analysisId = analysisId;
      }
      
      return res.status(200).json(response);
    } catch (fallbackErr) {
      // Ultimate fallback - minimal PNG
      const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const response = { 
        success: true, 
        fallback: true, 
        images: [{ 
          id: 'fallback', 
          url: '', 
          dataUrl: `data:image/png;base64,${minimalPng}`, 
          promptUsed: req.body?.prompt || '' 
        }],
        promptUsed: req.body?.prompt || '',
        message: 'Fallback generated' 
      };
      
      if (analysisId) {
        response.analysisId = analysisId;
      }
      
      return res.status(200).json(response);
    }
  } finally {
    release();
  }
});

module.exports = router;
