import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const RoutineAnalyticsBlock = () => {
  const [summary, setSummary] = useState(null);
  const [sleepAnalytics, setSleepAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const [r1, r2] = await Promise.all([
        fetch('/api/dream-diary/routine/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dream-diary/analytics/sleep', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (!r1.ok) setError('Failed routine summary');
      if (!r2.ok) setError(prev => prev ? prev + '; sleep analytics' : 'Failed sleep analytics');
      setSummary(d1);
      setSleepAnalytics(d2);
    } catch (e) {
      setError('Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const markToday = async (done) => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      today.setHours(0,0,0,0);
      const body = { date: today.toISOString(), items: (summary?.habits || []).map(h => ({ name: h.name, done })), notes: '' };
      await fetch('/api/dream-diary/routine/entry', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      fetchData();
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="block-card">
      <h3>Routine Analytics Block</h3>
      {loading && <p>Loading analytics…</p>}
      {error && <p className="error">{error}</p>}

      {summary && (
        <div className="routine-summary" style={{ display: 'grid', gap: 8 }}>
          <div><strong>Title:</strong> {summary.title || 'My Routine'}</div>
          <div><strong>Habits:</strong> {(summary.habits || []).map(h => h.name).join(', ') || 'None'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={() => markToday(true)}>Mark Today Done</button>
            <button onClick={() => markToday(false)}>Mark Today Missed</button>
          </div>
          <div>
            <strong>Calendar (recent):</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(summary.entries || []).slice(-14).map((e, idx) => {
                const anyDone = (e.items || []).some(i => i.done);
                return (
                  <span key={idx} title={new Date(e.date).toDateString()} style={{
                    display: 'inline-block', width: 14, height: 14, borderRadius: 3,
                    background: anyDone ? '#10b981' : '#ef4444'
                  }} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sleepAnalytics && (
        <div style={{ marginTop: 12 }}>
          <strong>Sleep Quality Distribution:</strong>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {['A','B','C','D','F'].map(g => (
              <span key={g} className="chip">{g}: {sleepAnalytics.sleepQualityDistribution?.[g] || 0}</span>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Avg Mental Wellness:</strong> {Math.round(sleepAnalytics.avgMentalWellness || 0)}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RoutineAnalyticsBlock;
