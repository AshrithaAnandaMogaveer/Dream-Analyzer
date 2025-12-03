import React, { useState, useContext } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export default function WellnessGuidanceModal({ open, onClose, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dream-diary/wellness-guidance', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      onGenerated && onGenerated(data.guidance);
      toast.success('Personalized guidance generated');
    } catch (e) {
      console.error('Generate wellness failed', e);
      toast.error('Failed to generate guidance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
            <div className="modal-header">
              <h3>Mental Health & Wellness</h3>
              <button onClick={onClose}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
              <p style={{ color: '#6b7280' }}>This guidance is based on your submitted data and is for informational purposes. It is not a substitute for professional medical advice.</p>
              <button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate Personalized Guidance'}</button>
              <div className="meditation-block" style={{ padding: 12, background: '#0b1220', borderRadius: 8 }}>
                <h4>AI-guided Meditation</h4>
                <p>Includes breathing exercises and recommended YouTube videos tailored to your emotions.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={onClose}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
