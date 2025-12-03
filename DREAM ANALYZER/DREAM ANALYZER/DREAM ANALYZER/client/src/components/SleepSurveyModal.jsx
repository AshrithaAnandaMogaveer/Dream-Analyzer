import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './SleepSurveyModal.css';

const SleepSurveyModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    sleepHours: 8,
    wakeUps: 0,
    stressLevel: 5,
    sleepQuality: 'good',
    dreamIntensity: 'medium',
    bedtime: '22:00',
    wakeTime: '06:00',
    sleepEnvironment: 'quiet',
    preSleepActivity: 'reading',
    caffeineIntake: 'none'
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate sleep score
    const sleepScore = calculateSleepScore(formData);
    onSubmit({ ...formData, sleepScore });
    onClose();
  };

  const calculateSleepScore = (data) => {
    let score = 0;
    
    // Sleep hours (0-30 points)
    if (data.sleepHours >= 7 && data.sleepHours <= 9) score += 30;
    else if (data.sleepHours >= 6 && data.sleepHours <= 10) score += 20;
    else score += 10;
    
    // Wake ups (0-20 points)
    if (data.wakeUps === 0) score += 20;
    else if (data.wakeUps <= 2) score += 15;
    else if (data.wakeUps <= 4) score += 10;
    else score += 5;
    
    // Stress level (0-20 points)
    if (data.stressLevel <= 3) score += 20;
    else if (data.stressLevel <= 5) score += 15;
    else if (data.stressLevel <= 7) score += 10;
    else score += 5;
    
    // Sleep quality (0-20 points)
    const qualityScores = { excellent: 20, good: 15, fair: 10, poor: 5 };
    score += qualityScores[data.sleepQuality] || 0;
    
    // Environment (0-10 points)
    const envScores = { quiet: 10, moderate: 7, noisy: 3 };
    score += envScores[data.sleepEnvironment] || 0;
    
    return Math.min(score, 100);
  };

  const getSleepGrade = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="sleep-survey-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="sleep-survey-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <div className="survey-header">
          <h2>🌙 Sleep Quality Survey</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <div className="survey-content">
          {currentStep === 1 && (
            <div className="survey-step">
              <h3>Basic Sleep Information</h3>
              
              <div className="form-group">
                <label>How many hours did you sleep last night?</label>
                <div className="range-container">
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={formData.sleepHours}
                    onChange={(e) => handleInputChange('sleepHours', parseInt(e.target.value))}
                    className="range-input"
                  />
                  <span className="range-value">{formData.sleepHours} hours</span>
                </div>
              </div>

              <div className="form-group">
                <label>How many times did you wake up during the night?</label>
                <div className="range-container">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.wakeUps}
                    onChange={(e) => handleInputChange('wakeUps', parseInt(e.target.value))}
                    className="range-input"
                  />
                  <span className="range-value">{formData.wakeUps} times</span>
                </div>
              </div>

              <div className="form-group">
                <label>What time did you go to bed?</label>
                <input
                  type="time"
                  value={formData.bedtime}
                  onChange={(e) => handleInputChange('bedtime', e.target.value)}
                  className="time-input"
                />
              </div>

              <div className="form-group">
                <label>What time did you wake up?</label>
                <input
                  type="time"
                  value={formData.wakeTime}
                  onChange={(e) => handleInputChange('wakeTime', e.target.value)}
                  className="time-input"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="survey-step">
              <h3>Sleep Quality & Stress</h3>
              
              <div className="form-group">
                <label>Rate your overall sleep quality</label>
                <div className="radio-group">
                  {['excellent', 'good', 'fair', 'poor'].map(quality => (
                    <label key={quality} className="radio-label">
                      <input
                        type="radio"
                        name="sleepQuality"
                        value={quality}
                        checked={formData.sleepQuality === quality}
                        onChange={(e) => handleInputChange('sleepQuality', e.target.value)}
                      />
                      <span className="radio-text">{quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Rate your stress level (1-10)</label>
                <div className="range-container">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.stressLevel}
                    onChange={(e) => handleInputChange('stressLevel', parseInt(e.target.value))}
                    className="range-input"
                  />
                  <span className="range-value">{formData.stressLevel}/10</span>
                </div>
              </div>

              <div className="form-group">
                <label>How intense were your dreams?</label>
                <div className="radio-group">
                  {['low', 'medium', 'high'].map(intensity => (
                    <label key={intensity} className="radio-label">
                      <input
                        type="radio"
                        name="dreamIntensity"
                        value={intensity}
                        checked={formData.dreamIntensity === intensity}
                        onChange={(e) => handleInputChange('dreamIntensity', e.target.value)}
                      />
                      <span className="radio-text">{intensity.charAt(0).toUpperCase() + intensity.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="survey-step">
              <h3>Sleep Environment</h3>
              
              <div className="form-group">
                <label>How would you describe your sleep environment?</label>
                <div className="radio-group">
                  {['quiet', 'moderate', 'noisy'].map(env => (
                    <label key={env} className="radio-label">
                      <input
                        type="radio"
                        name="sleepEnvironment"
                        value={env}
                        checked={formData.sleepEnvironment === env}
                        onChange={(e) => handleInputChange('sleepEnvironment', e.target.value)}
                      />
                      <span className="radio-text">{env.charAt(0).toUpperCase() + env.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>What was your main pre-sleep activity?</label>
                <select
                  value={formData.preSleepActivity}
                  onChange={(e) => handleInputChange('preSleepActivity', e.target.value)}
                  className="select-input"
                >
                  <option value="reading">Reading</option>
                  <option value="watching-tv">Watching TV</option>
                  <option value="phone">Using phone/tablet</option>
                  <option value="meditation">Meditation</option>
                  <option value="music">Listening to music</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>When did you last have caffeine?</label>
                <div className="radio-group">
                  {['none', 'morning', 'afternoon', 'evening'].map(time => (
                    <label key={time} className="radio-label">
                      <input
                        type="radio"
                        name="caffeineIntake"
                        value={time}
                        checked={formData.caffeineIntake === time}
                        onChange={(e) => handleInputChange('caffeineIntake', e.target.value)}
                      />
                      <span className="radio-text">{time.charAt(0).toUpperCase() + time.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="survey-step">
              <h3>Sleep Analysis Results</h3>
              
              <div className="sleep-score">
                <div className="score-circle">
                  <div className="score-number">{calculateSleepScore(formData)}</div>
                  <div className="score-label">Sleep Score</div>
                </div>
                <div className="grade-badge">
                  Grade: {getSleepGrade(calculateSleepScore(formData))}
                </div>
              </div>

              <div className="sleep-recommendations">
                <h4>💡 Recommendations</h4>
                <ul>
                  {formData.sleepHours < 7 && <li>Try to get 7-9 hours of sleep</li>}
                  {formData.wakeUps > 2 && <li>Reduce nighttime disruptions</li>}
                  {formData.stressLevel > 6 && <li>Practice stress management techniques</li>}
                  {formData.sleepEnvironment === 'noisy' && <li>Create a quieter sleep environment</li>}
                  {formData.caffeineIntake === 'evening' && <li>Avoid caffeine in the evening</li>}
                  {formData.preSleepActivity === 'phone' && <li>Limit screen time before bed</li>}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="survey-actions">
          {currentStep > 1 && (
            <button className="btn-secondary" onClick={handlePrevious}>
              ← Previous
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button className="btn-primary" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit}>
              Complete Survey
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SleepSurveyModal;