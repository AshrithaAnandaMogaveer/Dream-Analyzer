import React, { useEffect, useMemo, useState } from 'react';
import './DreamChart.css';

export default function RoutineDeviationChart() {
  const [summary, setSummary] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dream-diary/routine/summary?days=30', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setSummary(await res.json());
      } catch (_) {}
    }
    load();
  }, [token]);

  const data = useMemo(() => {
    if (!summary) return [];
    return summary.entries.map(e => {
      const completed = (e.items || []).filter(i => i.done).length;
      const total = (e.items || []).length || 1;
      const deviation = 1 - completed / total; // 0 perfect, 1 missed all
      const mental = (e.items || []).reduce((a,b)=> a + (b.impactMental||0), 0);
      const physical = (e.items || []).reduce((a,b)=> a + (b.impactPhysical||0), 0);
      return {
        date: new Date(e.date).toISOString().slice(5,10),
        deviation: +(deviation * 100).toFixed(0),
        mental,
        physical
      };
    });
  }, [summary]);

  return (
    <div className="dream-chart-card">
      <h4>Routine Deviation vs. Impact</h4>
      {data.length === 0 ? (
        <div style={{ color: '#6b7280' }}>No routine data yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {data.slice(-10).map((d) => (
            <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', alignItems: 'center', gap: 8 }}>
              <div style={{ color: '#6b7280' }}>{d.date}</div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Deviation</div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${d.deviation}%`, height: '100%', background: '#f59e0b' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span>🧠 {d.mental}</span>
                  <span>💪 {d.physical}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
