import React from 'react';
import { motion } from 'framer-motion';

const TagCloud = ({ themes = [] }) => {
  if (!themes || themes.length === 0) return null;

  const max = Math.max(...themes.map(t => t.count || 1), 1);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {themes.map((t, idx) => {
        const scale = 0.9 + ((t.count || 1) / max) * 0.8;
        const opacity = 0.6 + ((t.count || 1) / max) * 0.4;
        return (
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity, y: 0, scale }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              background: 'linear-gradient(135deg,#f5f0ff,#e0f7ff)',
              color: '#4b5563',
              fontWeight: 600,
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
            }}
          >
            {t.theme} ({t.count})
          </motion.span>
        );
      })}
    </div>
  );
};

export default TagCloud;


