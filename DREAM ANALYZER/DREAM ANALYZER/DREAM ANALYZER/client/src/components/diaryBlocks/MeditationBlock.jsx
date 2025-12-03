import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SOUNDS = [
  { key: 'water', label: 'Wavy Water', type: 'noise' },
  { key: 'breath', label: 'Breath In / Out', type: 'tone', freq: 432 },
  { key: 'tuiiii', label: 'Tuiiii', type: 'tone', freq: 528 },
  { key: 'flowers', label: 'Falling Flowers', type: 'chime' }
];

const MeditationBlock = ({ onUpdated }) => {
  const [selected, setSelected] = useState('water');
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const ensureCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  };

  const play = async () => {
    try {
      const ctx = ensureCtx();
      stop();
      const config = SOUNDS.find(s => s.key === selected);
      if (!config) return;

      if (config.type === 'tone') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = config.freq || 440;
        gain.gain.value = 0.05;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        sourceRef.current = osc;
      } else if (config.type === 'noise') {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.02;
        whiteNoise.connect(gain).connect(ctx.destination);
        whiteNoise.loop = true;
        whiteNoise.start();
        sourceRef.current = whiteNoise;
      } else if (config.type === 'chime') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        setTimeout(() => { try { osc.stop(); } catch (e) {} }, 3000);
        sourceRef.current = osc;
      }
      setPlaying(true);
      setMessage('Playing meditation sound...');
    } catch (e) {
      setMessage('Unable to play sound.');
    }
  };

  const stop = () => {
    try {
      if (sourceRef.current) {
        if (sourceRef.current.stop) sourceRef.current.stop();
        sourceRef.current.disconnect && sourceRef.current.disconnect();
      }
    } catch {}
    sourceRef.current = null;
    setPlaying(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="block-card">
      <h3>Meditation Block</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {SOUNDS.map(s => (
          <button
            key={s.key}
            className={`chip ${selected === s.key ? 'active' : ''}`}
            onClick={() => setSelected(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" onClick={play} disabled={playing}>Play</button>
        <button onClick={stop} disabled={!playing}>Stop</button>
      </div>
      {message && <p className="hint" style={{ marginTop: 8 }}>{message}</p>}
      <div style={{ marginTop: 12 }}>
        <strong>Meditation Videos:</strong>
        <ul className="videos-list">
          <li><a href="https://www.youtube.com/watch?v=ZToicYcHIOU" target="_blank" rel="noreferrer">4-7-8 Breathing</a></li>
          <li><a href="https://www.youtube.com/watch?v=inpok4MKVLM" target="_blank" rel="noreferrer">Freedom & Relaxation</a></li>
          <li><a href="https://www.youtube.com/watch?v=1ZYbU82GVz4" target="_blank" rel="noreferrer">Deep Sleep Meditation</a></li>
        </ul>
      </div>
    </motion.div>
  );
};

export default MeditationBlock;
