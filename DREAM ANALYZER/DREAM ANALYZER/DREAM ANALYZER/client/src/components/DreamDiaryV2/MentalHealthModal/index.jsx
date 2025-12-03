import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { apiFetch } from '../../../utils/safeFetch';
import { queueMentalHealthEntry } from '../../../utils/syncPending';
import './styles.css';

const MentalHealthModal = ({ open, onClose, onSubmitted }) => {
  // Audio state management
  const audioRefs = {
    breathing: useRef(null),
    ocean: useRef(null),
    bell: useRef(null)
  };
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);

  // Phase-2: Interactive UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [guidanceReady, setGuidanceReady] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    personalized: true,
    meditation: true,
    videos: true,
    workshops: true
  });
  const [audioState, setAudioState] = useState({
    breathing: 'stopped',
    ocean: 'stopped',
    bell: 'stopped'
  });
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved'
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle', 'submitting', 'submitted'
  const [guidanceContent, setGuidanceContent] = useState({
    lifestyle: '',
    sleep: '',
    stress: ''
  });
  const [dailyRoutineData, setDailyRoutineData] = useState(null);
  const [dreamEntryData, setDreamEntryData] = useState(null);

  // YouTube video IDs for meditation videos (using valid video IDs)
  const youtubeVideos = [
    { id: 'ZToicYcHIOU', title: '10-Minute Guided Meditation for Anxiety', duration: '10:23' },
    { id: 'inpok4MKVLM', title: 'Deep Sleep Meditation - Fall Asleep Fast', duration: '15:45' },
    { id: 'U9YKY7fdwyg', title: 'Morning Meditation for Positive Energy', duration: '12:10' },
    // Use a known-working video ID to avoid 404 thumbnail errors
    { id: '1ZYbU82GVz4', title: 'Stress Relief - Calming Piano Music', duration: '30:00' }
  ];

  // Wellness workshops data
  const wellnessWorkshops = [
    {
      title: 'Sleep Science Workshop',
      description: 'Understanding your sleep cycles and optimizing rest',
      icon: '🔬',
      url: 'https://www.soulsensei.in/course/l/shruti-maheshwari?slug=recharge-and-rise-the-ultimate-sleep-workshop&instance=424'
    },
    {
      title: 'Dream Journaling Class',
      description: 'Techniques for better dream recall and analysis',
      icon: '📖',
      url: 'https://www.masterclass.com/articles/how-to-keep-a-dream-journal'
    },
    {
      title: 'Mindfulness & Dreams',
      description: 'Connecting consciousness to dreams for deeper insights',
      icon: '🧠',
      url: 'https://www.psychologytoday.com/us/blog/dream-factory/201509/the-link-between-mindfulness-meditation-and-lucid-dreaming?msockid=1c612ef5089860a9009a385309146103'
    }
  ];

  // Fetch Daily Routine data
  const fetchDailyRoutine = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/routine/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyRoutineData(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching daily routine:', error);
    }
    return null;
  };

  // Fetch latest Dream Entry
  const fetchDreamEntry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dream-diary/diary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.analyses) ? data.analyses : []);
        if (items.length > 0) {
          const latest = items[0];
          setDreamEntryData({
            title: latest.title || latest.dreamText?.substring(0, 50) || 'Recent Dream',
            content: latest.dreamText || latest.summary || ''
          });
          return {
            title: latest.title || latest.dreamText?.substring(0, 50) || 'Recent Dream',
            content: latest.dreamText || latest.summary || ''
          };
        }
      }
    } catch (error) {
      console.error('Error fetching dream entry:', error);
    }
    return null;
  };

  // Generate personalized guidance based on Daily Routine data
  const generateGuidanceFromData = (routineData) => {
    if (!routineData || !routineData.entries || routineData.entries.length === 0) {
      return {
        lifestyle: 'Based on your routine patterns, maintaining a consistent schedule supports your overall wellbeing. Your current structure shows good foundations with room for gentle improvements in work-life balance. Consider incorporating short mindfulness breaks throughout your day to enhance mental clarity and reduce stress accumulation.',
        sleep: 'Your dream patterns suggest a need for improved sleep hygiene. Aim for 7-9 hours of quality sleep by establishing a relaxing bedtime routine. Avoid screens 1 hour before bed and create a calm, dark environment. Your dream recall indicates active subconscious processing, which benefits from proper rest cycles.',
        stress: 'Your emotional patterns show moderate stress levels that can be managed through regular practice. The combination of breathing exercises and mindful activities you\'ve been tracking shows positive engagement. Consider deepening your practice with progressive muscle relaxation and journaling to process daily stressors effectively.'
      };
    }

    const latestEntry = routineData.entries[0];
    const questionnaire = latestEntry.questionnaire || {};
    const dailyStructure = questionnaire.dailyStructure || {};
    const activities = questionnaire.activities || {};
    const social = questionnaire.social || {};
    const impact = questionnaire.impact || {};

    // Generate lifestyle guidance
    let lifestyleGuidance = 'Based on your daily routine patterns, ';
    if (dailyStructure.structureLevel >= 4) {
      lifestyleGuidance += 'you maintain excellent structure and consistency. ';
    } else if (dailyStructure.structureLevel >= 3) {
      lifestyleGuidance += 'you have good structure with some variability. ';
    } else {
      lifestyleGuidance += 'there\'s room to improve your daily structure. ';
    }
    
    if (activities.exerciseMinutes && activities.exerciseMinutes > 30) {
      lifestyleGuidance += 'Your regular exercise routine is supporting your physical and mental health. ';
    }
    
    lifestyleGuidance += 'Consider incorporating short mindfulness breaks throughout your day to enhance mental clarity and reduce stress accumulation.';

    // Generate sleep guidance
    let sleepGuidance = 'Your sleep patterns ';
    if (dailyStructure.wakeTime && dailyStructure.bedTime) {
      const wake = new Date(`2000-01-01T${dailyStructure.wakeTime}`);
      const bed = new Date(`2000-01-01T${dailyStructure.bedTime}`);
      if (bed > wake) bed.setDate(bed.getDate() + 1);
      const sleepHours = (bed - wake) / (1000 * 60 * 60);
      
      if (sleepHours >= 7 && sleepHours <= 9) {
        sleepGuidance += 'show healthy duration. ';
      } else if (sleepHours < 7) {
        sleepGuidance += 'indicate insufficient sleep. Aim for 7-9 hours. ';
      } else {
        sleepGuidance += 'may be excessive. ';
      }
    }
    
    sleepGuidance += 'Establish a relaxing bedtime routine, avoid screens 1 hour before bed, and create a calm, dark environment. Your dream recall indicates active subconscious processing, which benefits from proper rest cycles.';

    // Generate stress guidance
    let stressGuidance = 'Your stress management ';
    if (impact.moodImpact >= 4) {
      stressGuidance += 'appears effective with positive mood indicators. ';
    } else if (impact.moodImpact >= 3) {
      stressGuidance += 'is moderate and can be enhanced. ';
    } else {
      stressGuidance += 'needs attention. ';
    }
    
    if (social.peopleInteracted > 0) {
      stressGuidance += 'Your social interactions are contributing to emotional wellbeing. ';
    }
    
    stressGuidance += 'Consider deepening your practice with progressive muscle relaxation and journaling to process daily stressors effectively.';

    return {
      lifestyle: lifestyleGuidance,
      sleep: sleepGuidance,
      stress: stressGuidance
    };
  };

  const handleGenerateGuidance = async () => {
    setIsGenerating(true);
    setGuidanceReady(false);
    
    try {
      const token = localStorage.getItem('token');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch('/api/dream-diary/guidance/personalized', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ forDate: new Date().toISOString().slice(0,10) }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('Failed to generate guidance');
      const data = await res.json();
      const guidance = data?.personalized || {};
      setGuidanceContent({
        lifestyle: guidance.lifestyle || '',
        sleep: guidance.sleep || '',
        stress: guidance.stress || ''
      });
      setGuidanceReady(true);
    } catch (error) {
      console.error('Error generating guidance:', error);
      toast.error('Failed to generate guidance. Please try again.');
      setGuidanceReady(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEntry = async () => {
    setSaveStatus('saving');
    
    try {
      // Collect mental health data from the modal state
      const mentalHealthData = {
        personalizedGuidance: guidanceReady ? 
          `${guidanceContent.lifestyle}\n\n${guidanceContent.sleep}\n\n${guidanceContent.stress}` : "",
        lifestyleGuidance: guidanceContent.lifestyle || '',
        sleepAdvice: guidanceContent.sleep || '',
        stressGuidance: guidanceContent.stress || '',
        meditationPractices: [
          {
            name: "Breathing Exercise",
            description: "4-7-8 breathing technique for relaxation",
            audioState: audioState.breathing
          },
          {
            name: "Ocean Sounds",
            description: "Calming ocean waves meditation",
            audioState: audioState.ocean
          },
          {
            name: "Tuii Healing Bell",
            description: "Tibetan singing bowl healing",
            audioState: audioState.bell
          }
        ],
        recommendedVideos: youtubeVideos.map(video => ({
          title: video.title,
          duration: video.duration,
          videoId: video.id
        })),
        wellnessWorkshops: wellnessWorkshops,
        timestamp: new Date()
      };

      const response = await fetch('/api/dream-diary/mental-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ mentalHealthData })
      });

      const data = await response.json();

      if (response.ok) {
        setSaveStatus('saved');
        toast.success('Submitted successfully');
        
        if (onSubmitted) {
          onSubmitted(data);
        }
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to save mental health data');
      }
    } catch (error) {
      console.error('Error saving mental health entry:', error);
      toast.error('Failed to save mental health entry');
      setSaveStatus('idle');
    }
  };

  // Submit Entry - combines Daily Routine, Dream Entry, and Mental Health data with offline support
  const handleSubmitEntry = async () => {
    // Check if personal guidance has been generated first
    if (!guidanceReady) {
      toast.error('Please generate personal guidance first');
      return;
    }

    setSubmitStatus('submitting');

    try {
      const mentalHealthData = {
        personalizedGuidance: guidanceReady ?
          `${guidanceContent.lifestyle}\n\n${guidanceContent.sleep}\n\n${guidanceContent.stress}` : "",
        lifestyleGuidance: guidanceContent.lifestyle || '',
        sleepAdvice: guidanceContent.sleep || '',
        stressGuidance: guidanceContent.stress || '',
        meditationPractices: [
          {
            name: "Breathing Exercise",
            description: "4-7-8 breathing technique for relaxation",
            audioState: audioState.breathing
          },
          {
            name: "Ocean Sounds",
            description: "Calming ocean waves meditation",
            audioState: audioState.ocean
          },
          {
            name: "Tuii Healing Bell",
            description: "Tibetan singing bowl healing",
            audioState: audioState.bell
          }
        ],
        recommendedVideos: youtubeVideos.map(video => ({
          title: video.title,
          duration: video.duration,
          videoId: video.id
        })),
        wellnessWorkshops: wellnessWorkshops,
        timestamp: new Date()
      };
      try {
        const { response, data } = await apiFetch('/dream-diary/mental-health', {
          method: 'POST',
          body: JSON.stringify({ mentalHealthData })
        });

        if (response.ok && data.success) {
          setSubmitStatus('submitted');
          toast.success('Mental health entry submitted successfully');

          if (onSubmitted) {
            onSubmitted(data);
          }

          setTimeout(() => {
            setSubmitStatus('idle');
            setGuidanceReady(false);
            setGuidanceContent({
              lifestyle: '',
              sleep: '',
              stress: ''
            });
            setDailyRoutineData(null);
            setDreamEntryData(null);
            setAudioState({
              breathing: 'stopped',
              ocean: 'stopped',
              bell: 'stopped'
            });
            onClose();
          }, 2000);
        } else {
          throw new Error(`Server error: ${response.status} - ${data.error || 'Unknown error'}`);
        }
      } catch (networkError) {
        console.error('Network/server error during submit:', networkError);

        const localEntry = {
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          _synced: false,
          mentalHealthData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        queueMentalHealthEntry(mentalHealthData);

        setSubmitStatus('submitted');
        toast.success('Mental health entry saved locally');

        if (onSubmitted) {
          onSubmitted({ success: true, entry: localEntry, _localOnly: true });
        }

        setTimeout(() => {
          setSubmitStatus('idle');
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Unexpected error during submit flow:', error);
      toast.error('Unable to submit entry - please try again');
      setSubmitStatus('idle');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Toggle audio playback with actual audio control
  const toggleAudio = async (type) => {
    try {
      const audioElement = audioRefs[type].current;

      // Stop currently playing audio if different from requested
      if (currentPlayingAudio && currentPlayingAudio !== type) {
        const currentAudio = audioRefs[currentPlayingAudio].current;
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        setCurrentPlayingAudio(null);
        setAudioState(prev => ({ ...prev, [currentPlayingAudio]: 'stopped' }));
      }

      // If audio element doesn't exist, just toggle state for UI
      if (!audioElement) {
        setAudioState(prev => ({
          ...prev,
          [type]: prev[type] === 'playing' ? 'stopped' : 'playing'
        }));
        return;
      }

      if (audioState[type] === 'playing') {
        // Stop the audio
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioState(prev => ({ ...prev, [type]: 'stopped' }));
        setCurrentPlayingAudio(null);
      } else {
        // Start the audio with error handling
        try {
          await audioElement.play();
          setAudioState(prev => ({ ...prev, [type]: 'playing' }));
          setCurrentPlayingAudio(type);

          // Handle audio end event
          const handleEnded = () => {
            setAudioState(prev => ({ ...prev, [type]: 'stopped' }));
            setCurrentPlayingAudio(null);
          };

          audioElement.addEventListener('ended', handleEnded, { once: true });

        } catch (playError) {
          // Handle autoplay restrictions or other audio errors
          console.warn(`Audio play prevented for ${type}:`, playError);
          setAudioState(prev => ({ ...prev, [type]: 'stopped' }));

          // Show a brief toast or handle user interaction required
          toast.info('Click play again to start audio (browser requires user interaction)', {
            duration: 3000
          });
        }
      }
    } catch (error) {
      console.error('Audio toggle error:', error);
      toast.error('Audio unavailable at this time');
    }
  };

  // Cleanup audio on unmount or close
  useEffect(() => {
    if (!open) {
      // Reset all audio states
      setAudioState({
        breathing: 'stopped',
        ocean: 'stopped',
        bell: 'stopped'
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          className="mental-health-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="mental-health-modal-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mental-health-header">
              <h2 className="mental-health-title">Mental Health & Wellness</h2>
              <p className="mental-health-tagline">
                This guidance is based on your submitted data and is for informational purposes only. 
                It is not a substitute for professional medical advice.
              </p>
            </div>

            {/* Generate Button */}
            <div className="mental-health-generate-section">
              <button 
                className={`mental-health-generate-btn ${isGenerating ? 'loading' : ''}`}
                onClick={handleGenerateGuidance}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <div className="generate-loading">
                    <div className="loading-spinner"></div>
                    <span>Generating Guidance...</span>
                  </div>
                ) : (
                  'Generate Guidance'
                )}
              </button>
            </div>

            {/* Personalized Guidance Section */}
            <div className="mental-health-section">
              <div 
                className="mental-health-section-header"
                onClick={() => toggleSection('personalized')}
              >
                <h3 className="mental-health-section-title">Personalized Guidance</h3>
                <motion.div 
                  className="chevron-icon"
                  animate={{ rotate: expandedSections.personalized ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.div>
              </div>
              
              <AnimatePresence>
                {expandedSections.personalized && (
                  <motion.div 
                    className="mental-health-section-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mental-health-subsection">
                      <h4 className="mental-health-subsection-title">Lifestyle Guidance</h4>
                      <AnimatePresence>
                        {guidanceReady ? (
                          <motion.p 
                            className="mental-health-content-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          >
                            {guidanceContent.lifestyle}
                          </motion.p>
                        ) : (
                          <p className="mental-health-placeholder-text">
                            Your personalized lifestyle guidance will appear here based on your daily routines and wellness patterns.
                          </p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mental-health-subsection">
                      <h4 className="mental-health-subsection-title">Sleep Schedule Advice</h4>
                      <AnimatePresence>
                        {guidanceReady ? (
                          <motion.p 
                            className="mental-health-content-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            {guidanceContent.sleep}
                          </motion.p>
                        ) : (
                          <p className="mental-health-placeholder-text">
                            Your sleep schedule recommendations will appear here based on your dream patterns and sleep quality.
                          </p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mental-health-subsection">
                      <h4 className="mental-health-subsection-title">Stress-Free Living Guidance</h4>
                      <AnimatePresence>
                        {guidanceReady ? (
                          <motion.p 
                            className="mental-health-content-text"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          >
                            {guidanceContent.stress}
                          </motion.p>
                        ) : (
                          <p className="mental-health-placeholder-text">
                            Your stress management techniques and wellness strategies will appear here.
                          </p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Meditation Practices Section */}
            <div className="mental-health-section">
              <div 
                className="mental-health-section-header"
                onClick={() => toggleSection('meditation')}
              >
                <h3 className="mental-health-section-title">Meditation Practices</h3>
                <motion.div 
                  className="chevron-icon"
                  animate={{ rotate: expandedSections.meditation ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.div>
              </div>
              
              <AnimatePresence>
                {expandedSections.meditation && (
                  <motion.div 
                    className="mental-health-section-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mental-health-cards-grid">
                      <motion.div 
                        className={`mental-health-card ${audioState.breathing === 'playing' ? 'playing' : ''}`}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      >
                        <div className="mental-health-card-icon">🫁</div>
                        <h4 className="mental-health-card-title">Breathing Exercise</h4>
                        <p className="mental-health-card-description">
                          Calming breathing techniques for relaxation
                        </p>
                        <div className="mental-health-card-controls">
                          <button
                            className={`mental-health-control-btn ${audioState.breathing === 'playing' ? 'active' : ''}`}
                            onClick={() => toggleAudio('breathing')}
                            disabled={audioState.breathing === 'playing'}
                          >
                            {audioState.breathing === 'playing' ? 'Playing...' : 'Start'}
                          </button>
                          <button
                            className="mental-health-control-btn secondary"
                            onClick={() => toggleAudio('breathing')}
                            disabled={audioState.breathing === 'stopped'}
                          >
                            Stop
                          </button>
                        </div>
                        <audio
                          ref={audioRefs.breathing}
                          src="/meditation-sounds/breathing.mp3"
                          preload="none"
                          loop
                          onError={() => {
                            // Silently handle error - audio file may not be available
                            // Error will be handled in toggleAudio function
                          }}
                        />
                      </motion.div>

                      <motion.div 
                        className={`mental-health-card ${audioState.ocean === 'playing' ? 'playing' : ''}`}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      >
                        <div className="mental-health-card-icon">🌊</div>
                        <h4 className="mental-health-card-title">Ocean Wave Sound</h4>
                        <p className="mental-health-card-description">
                          Soothing ocean sounds for meditation
                        </p>
                        <div className="mental-health-card-controls">
                          <button 
                            className={`mental-health-control-btn ${audioState.ocean === 'playing' ? 'active' : ''}`}
                            onClick={() => toggleAudio('ocean')}
                            disabled={audioState.ocean === 'playing'}
                          >
                            {audioState.ocean === 'playing' ? 'Playing...' : 'Start'}
                          </button>
                          <button 
                            className="mental-health-control-btn secondary"
                            onClick={() => toggleAudio('ocean')}
                            disabled={audioState.ocean === 'stopped'}
                          >
                            Stop
                          </button>
                        </div>
                        <audio
                          ref={audioRefs.ocean}
                          src="/meditation-sounds/ocean.mp3"
                          preload="none"
                          loop
                          onError={() => {
                            // Silently handle error - audio file may not be available
                            // Error will be handled in toggleAudio function
                          }}
                        />
                      </motion.div>

                      <motion.div 
                        className={`mental-health-card ${audioState.bell === 'playing' ? 'playing' : ''}`}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      >
                        <div className="mental-health-card-icon">🔔</div>
                        <h4 className="mental-health-card-title">Tuii Healing Bell Sound</h4>
                        <p className="mental-health-card-description">
                          Tibetan singing bowl healing sounds
                        </p>
                        <div className="mental-health-card-controls">
                          <button
                            className={`mental-health-control-btn ${audioState.bell === 'playing' ? 'active' : ''}`}
                            onClick={() => toggleAudio('bell')}
                            disabled={audioState.bell === 'playing'}
                          >
                            {audioState.bell === 'playing' ? 'Playing...' : 'Start'}
                          </button>
                          <button
                            className="mental-health-control-btn secondary"
                            onClick={() => toggleAudio('bell')}
                            disabled={audioState.bell === 'stopped'}
                          >
                            Stop
                          </button>
                        </div>
                        <audio
                          ref={audioRefs.bell}
                          src="/meditation-sounds/tuii.mp3"
                          preload="none"
                          loop
                          onError={() => {
                            // Silently handle error - audio file may not be available
                            // Error will be handled in toggleAudio function
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recommended Meditation Videos Section */}
            <div className="mental-health-section">
              <div 
                className="mental-health-section-header"
                onClick={() => toggleSection('videos')}
              >
                <h3 className="mental-health-section-title">Recommended Meditation Videos</h3>
                <motion.div 
                  className="chevron-icon"
                  animate={{ rotate: expandedSections.videos ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.div>
              </div>
              
              <AnimatePresence>
                {expandedSections.videos && (
                  <motion.div 
                    className="mental-health-section-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mental-health-videos-grid">
                      {youtubeVideos.map((video, index) => (
                        <motion.div
                          key={`${video.id}-${index}`}
                          className="mental-health-video-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        >
                          <div className="mental-health-video-thumbnail">
                            <img 
                              src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                              alt={video.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            // Fallback if thumbnail fails to load
                            const target = e.target;
                            if (target) {
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && parent.querySelector('div[style*="font-size: 48px"]') === null) {
                                const fallback = document.createElement('div');
                                fallback.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 48px; background: linear-gradient(135deg, #ddd6fe, #e9d5ff);';
                                fallback.textContent = '🧘';
                                parent.appendChild(fallback);
                              }
                            }
                          }}
                            />
                            <div 
                              className="mental-health-video-play-overlay"
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                cursor: 'pointer',
                                transition: 'background-color 0.3s ease'
                              }}
                            >
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                              }}>
                                ▶
                              </div>
                            </div>
                          </div>
                          <h4 className="mental-health-video-title">{video.title}</h4>
                          <p className="mental-health-video-duration">{video.duration}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Wellness Workshops & Centers Section */}
            <div className="mental-health-section">
              <div 
                className="mental-health-section-header"
                onClick={() => toggleSection('workshops')}
              >
                <h3 className="mental-health-section-title">Wellness Workshops & Centers</h3>
                <motion.div 
                  className="chevron-icon"
                  animate={{ rotate: expandedSections.workshops ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.div>
              </div>
              
              <AnimatePresence>
                {expandedSections.workshops && (
                  <motion.div 
                    className="mental-health-section-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mental-health-list">
                      {wellnessWorkshops.map((workshop, index) => (
                        <motion.div 
                          key={index}
                          className="mental-health-list-item"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        >
                          <div className="mental-health-list-icon">{workshop.icon}</div>
                          <div className="mental-health-list-content">
                            <h4 className="mental-health-list-title">
                              <a href={workshop.url} target="_blank" rel="noopener noreferrer">{workshop.title}</a>
                            </h4>
                            <p className="mental-health-list-description">
                              {workshop.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Buttons */}
            <div className="mental-health-footer">
              <motion.button 
                className={`mental-health-footer-btn submit ${submitStatus}`}
                onClick={handleSubmitEntry}
                disabled={submitStatus !== 'idle' || saveStatus !== 'idle'}
                whileHover={{ scale: submitStatus === 'idle' && saveStatus === 'idle' ? 1.02 : 1 }}
                whileTap={{ scale: submitStatus === 'idle' && saveStatus === 'idle' ? 0.98 : 1 }}
                style={{
                  background: submitStatus === 'submitting' 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : submitStatus === 'submitted'
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  boxShadow: submitStatus === 'idle' ? '0 4px 16px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                {submitStatus === 'submitting' && (
                  <div className="btn-loading">
                    <div className="btn-spinner"></div>
                    <span>Submitting...</span>
                  </div>
                )}
                {submitStatus === 'submitted' && (
                  <div className="btn-success">
                    <div className="success-check">✓</div>
                    <span>Submitted!</span>
                  </div>
                )}
                {submitStatus === 'idle' && 'Submit Entry'}
              </motion.button>
              <motion.button 
                className="mental-health-footer-btn secondary"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MentalHealthModal;

