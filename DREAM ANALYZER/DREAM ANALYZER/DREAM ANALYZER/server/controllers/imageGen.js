// server/controllers/imageGen.js
// Lightweight, safe mock image generator (NanoBanana placeholder).
// - Validates prompt
// - In-memory LRU cache
// - Simple per-ip rate limit (6 req/min)
// - Returns a placeholder imageUrl derived from the prompt (for dev)

const { LRUCache } = require('lru-cache');

const DEFAULT_DUMMY_IMAGE_BASE = 'https://dummyimage.com/1024x768/eeeeee/111111&text=';
const imageCache = new LRUCache({ 
  max: 500, 
  ttl: 1000 * 60 * 60 * 24, // 24h cache
  ttlAutopurge: true
});

// Simple per-IP limiter (in-memory)
const rateMap = new Map();
function tooManyRequests(ip) {
  const now = Date.now();
  let rec = rateMap.get(ip) || { count: 0, ts: now };
  if (now - rec.ts > 60_000) { // reset every minute
    rec.count = 0;
    rec.ts = now;
  }
  rec.count += 1;
  rateMap.set(ip, rec);
  return rec.count > 6; // 6 requests per minute
}

async function generateImageWithNanoBanana(req, res) {
  try {
    if (tooManyRequests(req.ip)) {
      return res.status(429).json({ error: 'Too many requests — slow down.' });
    }

    const { prompt } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const normalized = String(prompt).trim().toLowerCase();
    const cacheKey = `img:${normalized}`;
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Create a placeholder image URL that visually includes prompt text
    const short = encodeURIComponent(String(prompt).slice(0, 80));
    const imageUrl = `${DEFAULT_DUMMY_IMAGE_BASE}${short}`;

    const result = {
      success: true,
      service: 'NanoBanana-mock',
      prompt,
      imageUrl,
      cached: false,
    };

    imageCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('generateImageWithNanoBanana error:', err);
    return res.status(500).json({ error: 'Image generation failed' });
  }
}

// Export the function
module.exports = {
  generateImageWithNanoBanana
};
