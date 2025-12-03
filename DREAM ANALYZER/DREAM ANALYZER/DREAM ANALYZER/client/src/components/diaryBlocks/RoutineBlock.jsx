import React, { useState } from 'react';
import { motion } from 'framer-motion';

const RoutineBlock = ({ onSaved }) => {
  const [form, setForm] = useState({
    sleepDuration: '',
    bedtime: '',
    wakeTime: '',
    wakeups: 0,
    caffeine: '',
    preSleep: '',
    perception: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const saveRoutine = async () => {
    try {
      setSaving(true);
      setMessage('');
      const token = localStorage.getItem('token');
      // Minimal upsert using existing Routine endpoints; extend later
      const res = await fetch('/api/dream-diary/routine', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Routine', habits: [] })
      });
      if (res.ok) {
        setMessage('Routine saved');
        onSaved && onSaved();
      } else {
        setMessage('Failed to save routine');
      }
    } catch (e) {
      setMessage('Error saving routine');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="block-card">
      <h3>Routine Block</h3>
      <div className="block-grid">
        <input name="sleepDuration" value={form.sleepDuration} onChange={handleChange} placeholder="Sleep duration (hours)" />
        <input name="bedtime" value={form.bedtime} onChange={handleChange} placeholder="Bedtime (e.g., 23:00)" />
        <input name="wakeTime" value={form.wakeTime} onChange={handleChange} placeholder="Wake-up time (e.g., 07:00)" />
        <input name="wakeups" value={form.wakeups} onChange={handleChange} placeholder="Number of wake-ups" />
        <input name="caffeine" value={form.caffeine} onChange={handleChange} placeholder="Caffeine intake" />
        <input name="preSleep" value={form.preSleep} onChange={handleChange} placeholder="Pre-sleep consumption" />
        <input name="perception" value={form.perception} onChange={handleChange} placeholder="Sleep schedule perception" />
      </div>
      <button className="primary" onClick={saveRoutine} disabled={saving}>{saving ? 'Saving...' : 'Save Routine'}</button>
      {message && <p className="hint">{message}</p>}
    </motion.div>
  );
};

export default RoutineBlock;
