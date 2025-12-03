import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheck, FaSpinner, FaPlus, FaMoon, FaCheckCircle } from 'react-icons/fa';
import './NightRoutineChecklist.css';

const DEFAULT_ITEMS = [
  { 
    name: 'No screens 1 hour before bed', 
    done: false, 
    impactMental: 2, 
    impactPhysical: 1,
    icon: '👁️',
    description: 'Reduces blue light exposure for better melatonin production'
  },
  { 
    name: 'Light stretching', 
    done: false, 
    impactMental: 1, 
    impactPhysical: 2,
    icon: '🧘',
    description: 'Gentle stretches to release muscle tension'
  },
  { 
    name: '5 min breathing', 
    done: false, 
    impactMental: 3, 
    impactPhysical: 0,
    icon: '🌬️',
    description: 'Deep breathing to activate the parasympathetic nervous system'
  },
  { 
    name: 'Herbal tea (no caffeine)', 
    done: false, 
    impactMental: 1, 
    impactPhysical: 1,
    icon: '☕',
    description: 'Warm, caffeine-free herbal tea to promote relaxation'
  },
  { 
    name: 'Journal 5 minutes', 
    done: false, 
    impactMental: 2, 
    impactPhysical: 0,
    icon: '📝',
    description: 'Clear your mind by writing down thoughts and reflections'
  }
];

const NightRoutineChecklist = () => {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const token = localStorage.getItem('token');

  // Load saved routine
  const loadRoutine = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dream-diary/routine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.items) {
          setItems(prev => prev.map(item => {
            const savedItem = data.items.find(i => i.name === item.name);
            return savedItem ? { ...item, done: savedItem.done } : item;
          }));
        }
      } else {
        // If no routine exists, create one
        await fetch('/api/dream-diary/routine', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            title: 'Night Routine', 
            habits: DEFAULT_ITEMS.map(i => ({ 
              name: i.name, 
              goalPerDay: 1,
              description: i.description
            })) 
          })
        });
      }
    } catch (err) {
      console.error('Error loading routine:', err);
      setError('Failed to load routine. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadRoutine();
    }
  }, [token, loadRoutine]);

  const toggle = (idx) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], done: !newItems[idx].done };
      return newItems;
    });
    setSaved(false);
  };

  const saveEntry = async () => {
    if (!token) {
      toast.error('Please log in to save your routine');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/dream-diary/routine/entry', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          items, 
          notes, 
          date: new Date().toISOString() 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save routine');
      }

      toast.success('Routine saved successfully!');
      setSaved(true);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save routine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completionPercentage = Math.round(
    (items.filter(item => item.done).length / items.length) * 100
  );

  if (loading) {
    return (
      <div className="night-routine-loading">
        <FaSpinner className="spin" />
        <p>Loading your night routine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="night-routine-error">
        <p>{error}</p>
        <button onClick={loadRoutine} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      className="night-routine-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="night-routine-header">
        <h3>
          <FaMoon className="moon-icon" />
          Night Routine
          <span className="completion">
            {completionPercentage}% Complete
          </span>
        </h3>
        <div className="progress-bar">
          <motion.div 
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="checklist-items">
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div
              key={item.name}
              className={`checklist-item ${item.done ? 'done' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <label className="checklist-label">
                <input 
                  type="checkbox" 
                  checked={item.done} 
                  onChange={() => toggle(idx)}
                  aria-label={item.name}
                />
                <span className="custom-checkbox">
                  {item.done && <FaCheck className="check-icon" />}
                </span>
                <div className="item-content">
                  <span className="item-name">
                    <span className="item-icon">{item.icon}</span>
                    {item.name}
                  </span>
                  <span className="item-description">{item.description}</span>
                </div>
              </label>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="notes-section">
        <label htmlFor="routine-notes" className="notes-label">
          Additional Notes
        </label>
        <textarea
          id="routine-notes"
          placeholder="Any thoughts or reflections before bed?"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          className="notes-textarea"
          rows="3"
        />
      </div>

      <div className="actions">
        <AnimatePresence>
          {saved && (
            <motion.span 
              className="save-success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FaCheckCircle /> Saved!
            </motion.span>
          )}
        </AnimatePresence>
        
        <button 
          onClick={saveEntry} 
          disabled={saving || (notes === '' && items.every(i => !i.done))}
          className={`save-btn ${saving ? 'saving' : ''}`}
          aria-busy={saving}
        >
          {saving ? (
            <>
              <FaSpinner className="spin" /> Saving...
            </>
          ) : (
            <>
              <FaPlus /> Save Entry
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default NightRoutineChecklist;
