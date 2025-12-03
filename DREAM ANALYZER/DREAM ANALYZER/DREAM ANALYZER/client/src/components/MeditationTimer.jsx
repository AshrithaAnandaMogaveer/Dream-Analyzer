import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function MeditationTimer({ defaultMinutes = 10 }) {
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [minutesInput, setMinutesInput] = useState(defaultMinutes);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const total = Math.max(1, minutesInput * 60);
  const progress = 1 - secondsLeft / total;

  const start = () => {
    setSecondsLeft(minutesInput * 60);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setSecondsLeft(minutesInput * 60); };

  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const s = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div style={{ padding: 12, background: 'linear-gradient(135deg,#f5f0ff,#e0f7ff)', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h4 style={{ marginBottom: 8 }}>Meditation Timer</h4>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <input type="number" min={1} max={60} value={minutesInput} onChange={(e)=>setMinutesInput(Math.max(1,Math.min(60,Number(e.target.value)||1)))} style={{ width: 64 }} />
        <span>minutes</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={start} disabled={running} style={{ padding: '6px 10px', borderRadius: 8 }}>Start</button>
        <button onClick={pause} disabled={!running} style={{ padding: '6px 10px', borderRadius: 8 }}>Pause</button>
        <button onClick={reset} style={{ padding: '6px 10px', borderRadius: 8 }}>Reset</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <motion.div
          initial={false}
          animate={{ background: running ? 'rgba(147,197,253,0.4)' : 'rgba(221,214,254,0.4)' }}
          style={{ width: 120, height: 120, borderRadius: '50%', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <svg width="120" height="120">
            <circle cx="60" cy="60" r="54" stroke="#e5e7eb" strokeWidth="8" fill="none" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none"
              stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round"
              style={{ rotate: -90, transformOrigin: '50% 50%' }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ ease: 'easeInOut' }}
            />
          </svg>
          <div style={{ position: 'absolute', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{m}:{s}</div>
        </motion.div>
        <div style={{ color: '#6b7280' }}>
          Focus on slow, deep breathing. Inhale 4 • Hold 7 • Exhale 8.
        </div>
      </div>
    </div>
  );
}
