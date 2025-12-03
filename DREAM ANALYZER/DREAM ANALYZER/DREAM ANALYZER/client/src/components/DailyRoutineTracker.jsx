import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FaPlus, FaBell, FaCheck, FaListUl } from 'react-icons/fa';
import './DreamInsights.css';

const DailyRoutineTracker = () => {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('Daily Routine');
  const [newHabit, setNewHabit] = useState('');
  const [impact, setImpact] = useState({ mental: 0, physical: 0 });
  const [alertMsg, setAlertMsg] = useState('');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dream-diary/routine/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setTitle(data.title || 'Daily Routine');
      setHabits(data.habits || []);
      setEntries(data.entries || []);
      setImpact({ mental: data.avgMentalImpact || 0, physical: data.avgPhysicalImpact || 0 });

      // Alert if any habit streak was broken today
      const today = new Date(); today.setHours(0,0,0,0);
      const missed = (data.habits || []).filter(h => !h.lastCompletedDate || new Date(h.lastCompletedDate).toDateString() !== today.toDateString());
      if (missed.length > 0) setAlertMsg(`You have ${missed.length} habit(s) pending today. Stay on track!`);
      else setAlertMsg('All good! Keep the momentum.');
    } catch (e) {
      console.error('Routine summary error:', e);
    }
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    const token = localStorage.getItem('token');
    await fetch('/api/dream-diary/routine', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, habits: [{ name: newHabit, goalPerDay: 1 }] })
    });
    setNewHabit('');
    fetchSummary();
  };

  const completeToday = async (habitName) => {
    const token = localStorage.getItem('token');
    const today = new Date(); today.setHours(0,0,0,0);
    await fetch('/api/dream-diary/routine/entry', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today.toISOString(),
        items: [{ name: habitName, done: true, impactMental: 1, impactPhysical: 1 }]
      })
    });
    fetchSummary();
  };

  const chartData = [
    { name: 'Mental', value: Math.max(0, impact.mental * 10), color: '#8b5cf6' },
    { name: 'Physical', value: Math.max(0, impact.physical * 10), color: '#22c55e' }
  ];

  return (
    <div className="dream-insights" style={{ padding: 16 }}>
      <div className="insights-header">
        <h2><FaListUl style={{ marginRight: 8 }} />{title}</h2>
      </div>
      <AnimatePresence>
        {alertMsg && (
          <motion.div className="insight-section overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="section-header">
              <h3><FaBell /> Alerts</h3>
            </div>
            <p>{alertMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="insight-section">
        <div className="section-header">
          <h3>Habits</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={newHabit} onChange={(e) => setNewHabit(e.target.value)} placeholder="Add a habit (e.g., Meditation)" />
          <button className="btn btn-primary" onClick={addHabit}><FaPlus /> Add</button>
        </div>
        <div className="patterns-list">
          {habits.map((h) => (
            <div key={h.name} className="pattern-item" style={{ alignItems: 'center' }}>
              <div className="pattern-bullet">•</div>
              <div className="pattern-text">
                {h.name} — Streak: {h.streak || 0} (Best: {h.bestStreak || 0})
              </div>
              <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => completeToday(h.name)}>
                <FaCheck /> Done Today
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="insight-section">
        <div className="section-header"><h3>Impact</h3></div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DailyRoutineTracker;


