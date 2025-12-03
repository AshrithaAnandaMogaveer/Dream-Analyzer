import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './MeditationPlayer.css';

const MeditationPlayer = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [selectedType, setSelectedType] = useState('breathing');
  const [isTimerMode, setIsTimerMode] = useState(false);

  const meditationTypes = [
    {
      id: 'breathing',
      name: 'Breathing Exercise',
      description: '4-7-8 breathing technique',
      duration: 300,
      color: '#4ECDC4'
    },
    {
      id: 'body-scan',
      name: 'Body Scan',
      description: 'Progressive relaxation',
      duration: 600,
      color: '#45B7D1'
    },
    {
      id: 'mindfulness',
      name: 'Mindfulness',
      description: 'Present moment awareness',
      duration: 900,
      color: '#96CEB4'
    },
    {
      id: 'sleep',
      name: 'Sleep Meditation',
      description: 'Guided sleep preparation',
      duration: 1200,
      color: '#DDA0DD'
    }
  ];

  const selectedMeditation = meditationTypes.find(m => m.id === selectedType);

  useEffect(() => {
    let interval;
    if (isPlaying && isTimerMode) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isTimerMode, duration]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    const meditation = meditationTypes.find(m => m.id === type);
    setDuration(meditation.duration);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const progress = (currentTime / duration) * 100;

  return (
    <motion.div 
      className="meditation-player-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="meditation-player"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <div className="meditation-header">
          <h3>🧘 Meditation Player</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="meditation-types">
          {meditationTypes.map(type => (
            <button
              key={type.id}
              className={`meditation-type ${selectedType === type.id ? 'active' : ''}`}
              onClick={() => handleTypeChange(type.id)}
              style={{ 
                borderColor: type.color,
                backgroundColor: selectedType === type.id ? type.color + '20' : 'transparent'
              }}
            >
              <div className="type-name">{type.name}</div>
              <div className="type-desc">{type.description}</div>
              <div className="type-duration">{formatTime(type.duration)}</div>
            </button>
          ))}
        </div>

        <div className="meditation-controls">
          <div className="timer-section">
            <div className="timer-display">
              {formatTime(isTimerMode ? currentTime : duration - currentTime)}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: selectedMeditation.color
                }}
              />
            </div>
          </div>

          <div className="control-buttons">
            <button 
              className="control-btn reset-btn"
              onClick={handleReset}
              disabled={isPlaying}
            >
              ↻ Reset
            </button>
            <button 
              className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlayPause}
              style={{ backgroundColor: selectedMeditation.color }}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button 
              className={`control-btn timer-btn ${isTimerMode ? 'active' : ''}`}
              onClick={() => setIsTimerMode(!isTimerMode)}
            >
              ⏱️ {isTimerMode ? 'Timer' : 'Countdown'}
            </button>
          </div>
        </div>

        <div className="meditation-guidance">
          {selectedType === 'breathing' && (
            <div className="breathing-guide">
              <h4>4-7-8 Breathing Technique</h4>
              <p>Inhale for 4 counts, hold for 7 counts, exhale for 8 counts</p>
            </div>
          )}
          {selectedType === 'body-scan' && (
            <div className="body-scan-guide">
              <h4>Body Scan Instructions</h4>
              <p>Focus on each part of your body from head to toe, releasing tension</p>
            </div>
          )}
          {selectedType === 'mindfulness' && (
            <div className="mindfulness-guide">
              <h4>Mindfulness Practice</h4>
              <p>Observe your thoughts and feelings without judgment</p>
            </div>
          )}
          {selectedType === 'sleep' && (
            <div className="sleep-guide">
              <h4>Sleep Preparation</h4>
              <p>Relax your body and mind for peaceful sleep</p>
            </div>
          )}
        </div>

        <div className="meditation-tips">
          <h4>💡 Tips for Better Meditation</h4>
          <ul>
            <li>Find a quiet, comfortable space</li>
            <li>Close your eyes and focus on your breath</li>
            <li>Don't worry if your mind wanders - gently return focus</li>
            <li>Practice regularly for best results</li>
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MeditationPlayer;