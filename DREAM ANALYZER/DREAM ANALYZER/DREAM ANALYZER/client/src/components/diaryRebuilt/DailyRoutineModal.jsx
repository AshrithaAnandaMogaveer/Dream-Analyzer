import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { FaSun, FaTimes, FaCalendarAlt, FaUtensils, FaDumbbell, FaBriefcase, FaGamepad, FaUsers, FaHeart, FaChartLine, FaStickyNote } from 'react-icons/fa';

export default function DailyRoutineModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    // A. Daily Structure and Consistency
    dailyStructure: { wakeTime: '', bedTime: '', structureLevel: 3, adherence: 'mostly' },
    // B. Activities and Engagement
    activities: { meals: 3, exerciseMinutes: 0, taskCompleted: false, hobbyDone: false },
    // C. Social Interaction
    social: { peopleInteracted: 0, interactionQuality: 3 },
    // D. Impact of Routine
    impact: { moodImpact: 3, deviations: '' },
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const update = (path, value) => {
    setForm(prev => {
      const clone = { ...prev };
      const [top, key] = path.split('.');
      clone[top] = { ...clone[top], [key]: value };
      return clone;
    });
  };

  const submit = async () => {
    // basic validation
    if (!form.dailyStructure.wakeTime || !form.dailyStructure.bedTime) {
      toast.error('Please provide wake and bed times');
      return;
    }
    if (form.dailyStructure.structureLevel < 1 || form.dailyStructure.structureLevel > 5) {
      toast.error('Structure level must be between 1 and 5');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/dream-diary/daily-routine', form, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onSubmitted && onSubmitted(data);
      toast.success('Daily routine saved!');
      onClose && onClose();
    } catch (e) {
      console.error('Submit routine failed', e);
      toast.error('Failed to submit routine');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          className="modal-overlay" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}
        >
          <motion.div 
            className="modal-card" 
            initial={{ y: 40, opacity: 0, scale: 0.9 }} 
            animate={{ y: 0, opacity: 1, scale: 1 }} 
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 20px 60px rgba(31, 38, 135, 0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 28px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <FaSun style={{ fontSize: '2rem', color: 'rgba(255, 255, 255, 0.9)' }} />
                <h3 style={{ 
                  margin: 0, 
                  color: '#ffffff', 
                  fontSize: '1.8rem',
                  fontWeight: '700'
                }}>
                  Daily Routine
                </h3>
              </div>
              <button 
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div 
              style={{ 
                padding: '28px',
                maxHeight: 'calc(90vh - 140px)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* Section 1: Daily Structure & Consistency */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FaCalendarAlt style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                  Daily Structure & Consistency
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      What time did you wake up today?
                    </label>
                    <input 
                      type="time" 
                      value={form.dailyStructure.wakeTime} 
                      onChange={e => update('dailyStructure.wakeTime', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      What time did you go to bed last night?
                    </label>
                    <input 
                      type="time" 
                      value={form.dailyStructure.bedTime} 
                      onChange={e => update('dailyStructure.bedTime', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      How structured was your day? (1-5)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={form.dailyStructure.structureLevel} 
                        onChange={e => update('dailyStructure.structureLevel', Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        color: '#ffffff',
                        fontWeight: '600',
                        minWidth: '30px',
                        textAlign: 'center'
                      }}>
                        {form.dailyStructure.structureLevel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      Did you adhere to your planned routine?
                    </label>
                    <select 
                      value={form.dailyStructure.adherence} 
                      onChange={e => update('dailyStructure.adherence', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="yes" style={{ background: '#4c1d95' }}>Yes</option>
                      <option value="mostly" style={{ background: '#4c1d95' }}>Mostly</option>
                      <option value="no" style={{ background: '#4c1d95' }}>No</option>
                    </select>
                  </div>
                </div>
              </motion.section>

              {/* Section 2: Activities & Engagement */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FaUtensils style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                  Activities & Engagement
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      How many meals did you consume today?
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="10" 
                      value={form.activities.meals} 
                      onChange={e => update('activities.meals', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      How long did you exercise? (minutes)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="300" 
                      value={form.activities.exerciseMinutes} 
                      onChange={e => update('activities.exerciseMinutes', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      Did you complete any tasks related to work/study/goals?
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="taskCompleted" 
                          checked={form.activities.taskCompleted === true} 
                          onChange={() => update('activities.taskCompleted', true)}
                          style={{ accentColor: '#8b5cf6' }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Yes</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="taskCompleted" 
                          checked={form.activities.taskCompleted === false} 
                          onChange={() => update('activities.taskCompleted', false)}
                          style={{ accentColor: '#8b5cf6' }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>No</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      Did you do any leisure/hobby activity today?
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="hobbyDone" 
                          checked={form.activities.hobbyDone === true} 
                          onChange={() => update('activities.hobbyDone', true)}
                          style={{ accentColor: '#8b5cf6' }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Yes</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="hobbyDone" 
                          checked={form.activities.hobbyDone === false} 
                          onChange={() => update('activities.hobbyDone', false)}
                          style={{ accentColor: '#8b5cf6' }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>No</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Section 3: Social Interaction */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FaUsers style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                  Social Interaction
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      How many people did you interact with today?
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      max="50" 
                      value={form.social.peopleInteracted} 
                      onChange={e => update('social.peopleInteracted', Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      Rate quality of interactions (1-5)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={form.social.interactionQuality} 
                        onChange={e => update('social.interactionQuality', Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        color: '#ffffff',
                        fontWeight: '600',
                        minWidth: '30px',
                        textAlign: 'center'
                      }}>
                        {form.social.interactionQuality}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Section 4: Impact of Routine */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FaHeart style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                  Impact of Routine
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      How did today's routine affect your mood? (1-5)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={form.impact.moodImpact} 
                        onChange={e => update('impact.moodImpact', Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ 
                        color: '#ffffff',
                        fontWeight: '600',
                        minWidth: '30px',
                        textAlign: 'center'
                      }}>
                        {form.impact.moodImpact}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '500'
                    }}>
                      List any significant deviations and reasons
                    </label>
                    <textarea 
                      placeholder="e.g., Woke up late due to bad weather..."
                      value={form.impact.deviations} 
                      onChange={e => update('impact.deviations', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '1rem',
                        minHeight: '60px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </motion.section>

              {/* Notes Section */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <FaStickyNote style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                  Additional Notes
                </h4>
                <textarea 
                  placeholder="Any additional thoughts or reflections about your day..."
                  value={form.notes} 
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </motion.section>
            </div>

            {/* Footer */}
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 28px',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <button 
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = 'rgba(255, 255, 255, 0.9)';
                }}
              >
                Cancel
              </button>
              <button 
                onClick={submit} 
                disabled={submitting}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: submitting 
                    ? 'rgba(139, 92, 246, 0.5)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: submitting 
                    ? 'none' 
                    : '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.target.style.background = 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)';
                    e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    e.target.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)';
                    e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                  }
                }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    Saving...
                  </span>
                ) : (
                  'Save Routine'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
