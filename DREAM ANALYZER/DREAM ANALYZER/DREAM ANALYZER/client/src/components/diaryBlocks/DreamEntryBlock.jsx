import React, { useState } from 'react';
import { motion } from 'framer-motion';

const DreamEntryBlock = ({ onSaved }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const submitDream = async () => {
    if (!text || text.trim().length < 10) {
      setMessage('Please enter at least 10 characters.');
      return;
    }
    try {
      setSaving(true);
      setMessage('Analyzing dream...');
      const token = localStorage.getItem('token');

      // 1) Analyze
      let r = await fetch('/api/chatbot/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      const analysis = await r.json();
      if (!r.ok || !analysis?.id) {
        setMessage('Failed to analyze dream');
        return;
      }

      // 2) Generate image (non-blocking if it fails)
      const imagePrompt = analysis.imagePrompt;
      r = await fetch('/api/chatbot/generate-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ analysisId: analysis.id, imagePrompt })
      });
      await r.json().catch(() => ({}));

      // 3) Save dream entry
      const title = (text.split(/\s+/).slice(0, 6).join(' ') + (text.split(/\s+/).length > 6 ? '…' : '')) || 'Dream Entry';
      r = await fetch('/api/dream-diary/diary/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content: text, analysisId: analysis.id })
      });
      const saved = await r.json();
      if (!r.ok || !(saved?.id || saved?._id)) {
        setMessage('Dream saved with analysis but diary entry may be missing.');
      } else {
        setMessage('Dream saved successfully.');
      }
      onSaved && onSaved();
    } catch (e) {
      setMessage('An error occurred while saving your dream.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="block-card">
      <h3>Dream Entry Block</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your dream..."
        rows={5}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="primary" onClick={submitDream} disabled={saving}>
          {saving ? 'Submitting...' : 'Analyze & Save'}
        </button>
      </div>
      {message && <p className="hint">{message}</p>}
    </motion.div>
  );
};

export default DreamEntryBlock;
