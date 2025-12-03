const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SD_API_URL = process.env.LOCAL_SD_API || 'http://127.0.0.1:7862';
const API_BASE = `${SD_API_URL}/sdapi/v1`;

/**
 * Generate an image using local Stable Diffusion WebUI API
 * @param {string} prompt - The text prompt for image generation
 * @param {object} options - Additional options for image generation
 * @returns {Promise<object>} - Returns the generated image data
 */
async function generateImage(prompt, options = {}) {
    try {
        const payload = {
            prompt: `${prompt}, high quality, detailed, 4k`,
            negative_prompt: 'blurry, low quality, distorted, bad anatomy, text, watermark',
            steps: 20,
            width: 512,
            height: 512,
            cfg_scale: 7,
            sampler_name: 'Euler a',
            ...options
        };

        console.log(`[Stable Diffusion] Generating image with prompt: ${prompt.substring(0, 100)}...`);
        
        const response = await axios.post(`${API_BASE}/txt2img`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000 // 5 minutes timeout
        });

        if (!response.data.images || !response.data.images[0]) {
            throw new Error('No image data received from Stable Diffusion API');
        }

        const base64Image = response.data.images[0];
        const buffer = Buffer.from(base64Image, 'base64');
        
        return {
            buffer,
            mimeType: 'image/png',
            isFallback: false,
            promptUsed: prompt,
            info: response.data.info ? JSON.parse(response.data.info) : {}
        };
    } catch (error) {
        console.error('[Stable Diffusion] Error generating image:', error.message);
        throw new Error(`Failed to generate image: ${error.message}`);
    }
}

/**
 * Save the generated image to disk
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimeType - MIME type of the image
 * @param {string} [subfolder='generated'] - Subfolder to save the image in
 * @returns {Promise<string>} - Path to the saved image
 */
async function saveImageToDisk(buffer, mimeType = 'image/png', subfolder = 'sd-generated') {
    try {
        // Define the uploads directory path
        const rootDir = path.join(__dirname, '..');
        const uploadsDir = path.join(rootDir, 'uploads', subfolder);
        
        // Create the directory if it doesn't exist
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Generate a unique filename
        const extension = mimeType.split('/')[1] || 'png';
        const filename = `${uuidv4()}.${extension}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Write the file
        await fs.writeFile(filePath, buffer);
        console.log(`Image saved to: ${filePath}`);
        
        // Return the relative path for the URL
        const relativePath = path.join('uploads', subfolder, filename).replace(/\\/g, '/');
        console.log(`Relative path: /${relativePath}`);
        return relativePath;
    } catch (error) {
        console.error('Error saving image to disk:', error);
        throw new Error(`Failed to save image: ${error.message}`);
    }
}

module.exports = {
    generateImage,
    saveImageToDisk
};
