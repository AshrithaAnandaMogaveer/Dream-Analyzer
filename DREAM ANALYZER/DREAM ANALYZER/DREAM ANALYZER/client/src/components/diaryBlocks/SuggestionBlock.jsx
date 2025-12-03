import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SuggestionBlock = ({ onUpdated }) => {
  const [dreamText, setDreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');

  const getSuggestions = async () => {
    if (!dreamText || dreamText.trim().length < 10) {
      setError('Please provide at least 10 characters of dream text.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // 1) Analyze dream to get emotions and keywords/themes
      let r = await fetch('/api/chatbot/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dreamText })
      });
      const analysis = await r.json();
      if (!r.ok || !analysis?.emotions) {
        setError('Failed to analyze dream for suggestions.');
        setLoading(false);
        return;
      }

      // 2) Ask backend for meditation and recommendations (re-using endpoint)
      r = await fetch('/api/dream-diary/meditation', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamKeywords: analysis.keywords || [], emotions: analysis.emotions, stressLevel: analysis.stressScore || 5 })
      });
      const data = await r.json();
      if (!r.ok) {
        setError('Failed to get recommendations.');
      } else {
        const recs = data?.recommendations || [];
        setSuggestions([
          ...(analysis.suggestions || []),
          ...recs.map(r => `${r.title}: ${r.description}`)
        ].slice(0, 8));
        setVideos(data?.youtubeVideos || []);
        onUpdated && onUpdated();
      }
    } catch (e) {
      setError('Error generating suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="block-card">
      <h3>Suggestion Block</h3>
      <textarea
        value={dreamText}
        onChange={(e) => setDreamText(e.target.value)}
        placeholder="Paste your dream for personalized suggestions..."
        rows={4}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="primary" onClick={getSuggestions} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </button>
      </div>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
            <strong>Suggestions:</strong>
            <ul className="suggestions-list">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {videos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 12 }}>
            <strong>Recommended Videos:</strong>
            <ul className="videos-list">
              {videos.map((v, i) => (
                <li key={i}>
                  <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a> · {v.duration}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SuggestionBlock;
