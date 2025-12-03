import React, { useMemo } from 'react';
import './DreamChart.css';

function moodIcon(analysis) {
  if (!analysis) return '•';
  const { dreamIntensity, emotions = {} } = analysis;
  const dominant = Object.entries(emotions).sort((a,b)=> (b[1]||0)-(a[1]||0))[0]?.[0];
  if (dominant === 'joy' || dominant === 'calmness') return '😊';
  if (dominant === 'fear' || dominant === 'anxiety') return '😰';
  if (dominant === 'sadness') return '😔';
  if (dominant === 'excitement') return '🤩';
  if (dreamIntensity === 'high') return '🔥';
  if (dreamIntensity === 'low') return '🌙';
  return '😶';
}

export default function MoodCalendar({ analyses = [], days = 30 }) {
  const byDate = useMemo(() => {
    const map = new Map();
    analyses.forEach(a => {
      const d = new Date(a.createdAt);
      d.setHours(0,0,0,0);
      map.set(d.toISOString().slice(0,10), a);
    });
    return map;
  }, [analyses]);

  const cells = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0,0,0,0);
    const key = d.toISOString().slice(0,10);
    const a = byDate.get(key);
    cells.push({ key, date: d, analysis: a });
  }

  return (
    <div className="dream-chart-card" style={{ padding: 12 }}>
      <h4 style={{ marginBottom: 8 }}>Mood Calendar</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((c, idx) => (
          <div key={c.key}
               title={`${c.key}${c.analysis ? `: ${c.analysis.dreamIntensity} intensity` : ''}`}
               style={{
                 aspectRatio: '1 / 1',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 borderRadius: 8,
                 background: c.analysis ? 'linear-gradient(135deg,#f5f0ff,#e0f7ff)' : '#f8fafc',
                 border: '1px solid #e5e7eb',
                 fontSize: 18
               }}>
            {moodIcon(c.analysis)}
          </div>
        ))}
      </div>
    </div>
  );
}
