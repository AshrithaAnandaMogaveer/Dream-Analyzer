import React, { useState, useCallback } from 'react';
import './ImageGenerator.css';

const ImageGenerator = () => {
  const [text, setText] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      console.log('Sending image generation request for:', text);
      const response = await fetch('http://localhost:5000/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ text }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image generation failed');
      }

      const data = await response.json();
      if (!data.image) {
        throw new Error('No image URL received');
      }
      setGeneratedImage(data.image);
    } catch (err) {
      setError(err.message);
      console.error('Image generation error:', err);
    } finally {
      setLoading(false);
    }
  }, [text]);

  return (
    <div className="image-generator">
      <h2>Dream Image Generator</h2>
      <p className="description">
        Transform your dreams into stunning visuals using AI. Describe your dream below,
        and our AI will create a unique artistic interpretation.
      </p>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your dream in detail (e.g., 'I was flying through purple clouds above a crystal city...')"
          rows={4}
          required
          minLength={10}
          maxLength={1000}
        />
        <div className="button-container">
          <button 
            type="submit" 
            disabled={loading || text.length < 10}
            className={loading ? 'loading' : ''}
          >
            {loading ? 'Creating Your Dream Vision...' : 'Generate Dream Image'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error">
          <p>Error: {error}</p>
          <p>Please try again or modify your dream description.</p>
        </div>
      )}
      
      {generatedImage && (
        <div className="generated-image">
          <img 
            src={generatedImage} 
            alt="AI visualization of your dream" 
            loading="lazy"
          />
          <div className="image-actions">
            <a 
              href={generatedImage} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="view-full"
            >
              View Full Size
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;