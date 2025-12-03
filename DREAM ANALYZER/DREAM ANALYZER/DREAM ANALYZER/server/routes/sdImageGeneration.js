const express = require('express');
const router = express.Router();
const { generateImage, saveImageToDisk } = require('../utils/stableDiffusionGenerator');

// Import auth middleware with error handling
let authenticateToken;
try {
    const auth = require('../middleware/auth');
    authenticateToken = auth.authenticateToken || ((req, res, next) => next()); // Fallback if auth is not available
} catch (error) {
    console.warn('Auth middleware not found, proceeding without authentication');
    authenticateToken = (req, res, next) => next(); // No-op middleware if auth is not available
}

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ message: 'Stable Diffusion API is working!' });
});

/**
 * @route POST /api/sd/generate
 * @desc Generate an image using Stable Diffusion
 * @access Private
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { prompt, options = {} } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Generate the image
        const imageData = await generateImage(prompt, options);
        
        // Save the image to disk
        const imagePath = await saveImageToDisk(
            imageData.buffer, 
            imageData.mimeType,
            'sd-generated'
        );

        // Return the image URL and metadata
        res.json({
            success: true,
            imageUrl: `/${imagePath}`,
            prompt: imageData.promptUsed,
            isFallback: imageData.isFallback,
            info: imageData.info
        });

    } catch (error) {
        console.error('Error in SD image generation:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate image' 
        });
    }
});

module.exports = router;
