const fetch = require('node-fetch');
const { safeOpenAI } = require('../services/openaiHelper');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use GENERATOR_API_KEY if available, otherwise fall back to OPENAI_API_KEY
const OPENAI_KEY = process.env.GENERATOR_API_KEY || process.env.OPENAI_API_KEY || null;

if (!OPENAI_KEY) {
  console.warn('[image] No generator API key found (GENERATOR_API_KEY / OPENAI_API_KEY). Using fallbacks only.');
}

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

async function generateImage(prompt, userId) {
  const finalPrompt = `A dream-like digital artwork of: ${prompt}. Dreamy, ethereal, artistic style.`;
  
  if (process.env.IMG_TEST_STUB === '1' || !OPENAI_KEY) {
    console.info('[image] Using local stub/fallback image for prompt:', finalPrompt.slice(0, 120));
    return {
      buffer: generateFallbackSvg(finalPrompt),
      isFallback: true,
      mimeType: 'image/svg+xml',
      promptUsed: finalPrompt
    };
  }

  console.info('[image] Real generation mode: calling generator API for prompt:', finalPrompt.slice(0, 120));
  
  try {
    const response = await safeOpenAI(() => fetch(process.env.GENERATOR_API_BASE || 'https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      }),
      timeout: 60000 // 60 second timeout
    }));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[image] Generator request failed status=', response.status, 'body=', errorText);
      throw new Error(`Generator request failed: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    const imageUrl = json.data?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error('No image URL in generator response');
    }

    // Download the generated image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download generated image: ${imgResponse.status}`);
    }
    
    const buffer = await imgResponse.buffer();
    
    return {
      buffer,
      isFallback: false,
      mimeType: 'image/png',
      promptUsed: finalPrompt
    };
    
  } catch (err) {
    console.warn('[image] Generator failed, falling back to local SVG. reason=', err.message);
    return {
      buffer: generateFallbackSvg(finalPrompt),
      isFallback: true,
      mimeType: 'image/svg+xml',
      promptUsed: finalPrompt,
      error: err.message
    };
  }
}

async function saveImageToDisk(buffer, mimeType) {
  const tempDir = path.join(__dirname, '..', 'temp-images');
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  
  const fileId = uuidv4();
  const extension = mimeType.split('/')[1] || 'png';
  const filename = `${fileId}.${extension}`;
  const filePath = path.join(tempDir, filename);
  
  await fs.writeFile(filePath, buffer);
  
  return {
    fileId,
    filename,
    path: filePath,
    url: `/temp-images/${filename}`
  };
}

module.exports = {
  generateImage,
  saveImageToDisk,
  generateFallbackSvg
};
