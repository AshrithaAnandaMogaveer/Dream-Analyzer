import React, { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import './ImageGenerator.css';

const NanoBananaImageGenerator = () => {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { on, off } = useSocket();

  useEffect(() => {
    const handler = (payload) => {
      if (payload?.type === 'imageGenerated') {
        // Optionally react to server-side updates
        // For now, just log to keep coordination without UI disruption
        // console.log('diary:updated', payload);
      }
    };
    on('diary:updated', handler);
    return () => off('diary:updated', handler);
  }, [on, off]);

  const handleGenerate = useCallback(async (e) => {
    e.preventDefault();
    if (!text || text.trim().length < 10) {
      toast.error('Please describe your dream (min 10 characters).');
      return;
    }
    setLoading(true);
    setImage(null);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, style }),
        signal: controller.signal
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Image generation failed');
      }
      if (!data?.image) {
        throw new Error('No image returned');
      }

      setImage(data.image);
      if (data.cacheHit) {
        toast.success('Loaded from cache');
      } else if (data.fallback) {
        toast('Using fallback image source', { icon: '🖼️' });
      } else {
        toast.success('Image generated');
      }
    } catch (err) {
      console.error('Generation error', err);
      toast.error(err.message || 'Failed to generate image');
    } finally {
      clearTimeout(id);
      setLoading(false);
    }
  }, [text, style]);

  return (
    <div className="image-generator">
      <h2>Dream Image Generator</h2>
      <p className="description">
        Generate a dynamic visualization from your dream. Default style is ethereal, symbolic, surreal with soft pastel colors.
      </p>

      <form onSubmit={handleGenerate}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your dream (e.g., I was dancing on stage...)"
          rows={4}
          required
          minLength={10}
          maxLength={1000}
        />
        <input
          type="text"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="Optional style override (e.g., watercolor, neon cyberpunk)"
        />
        <div className="button-container">
          <button type="submit" disabled={loading || text.length < 10} className={loading ? 'loading' : ''}>
            {loading ? 'Creating Your Dream Vision...' : 'Generate Image'}
          </button>
        </div>
      </form>

      {image && (
        <div className="generated-image">
          <img src={image} alt="Dream visualization" loading="lazy" />
          <div className="image-actions">
            <a href={image} target="_blank" rel="noopener noreferrer" className="view-full">
              View Full Size
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NanoBananaImageGenerator;
