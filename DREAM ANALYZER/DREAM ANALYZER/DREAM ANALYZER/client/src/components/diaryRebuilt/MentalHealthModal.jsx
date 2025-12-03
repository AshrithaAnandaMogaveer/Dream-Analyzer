import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import useLoopAudio from '../../hooks/useLoopAudio';
import { queueMentalHealthEntry } from '../../utils/syncPending';
import {
  FaHeart,
  FaSpa,
  FaWater,
  FaWind,
  FaPlay,
  FaPause,
  FaYoutube,
  FaExternalLinkAlt,
  FaClock,
  FaBrain,
  FaLeaf,
  FaSun,
  FaTimes,
  FaWifi,
  FaExclamationTriangle
} from 'react-icons/fa';

// Import audio files
import breathingAudio from '../../assets/audio/breathing.mp3';
import oceanAudio from '../../assets/audio/ocean.mp3';
import bellAudio from '../../assets/audio/bell.mp3';

export default function MentalHealthModal({ open, onClose, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedMeditation, setSelectedMeditation] = useState('');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [guidance, setGuidance] = useState({
    lifestyle: '',
    sleep: '',
    stress: ''
  });
  
  // Initialize audio hooks
  const { start: startBreathing, stop: stopBreathing } = useLoopAudio(breathingAudio);
  const { start: startOcean, stop: stopOcean } = useLoopAudio(oceanAudio);
  const { start: startBell, stop: stopBell } = useLoopAudio(bellAudio);
  
  const { token } = useAuth();

  // AI-generated guidance based on user data
  useEffect(() => {
    if (open) {
      generateGuidance();
    }
  }, [open]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateGuidance = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/dream-diary/guidance/personalized', { forDate: new Date().toISOString().slice(0,10) }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const guidance = res?.data?.personalized || {};
      setGuidance({
        lifestyle: guidance.lifestyle || '',
        sleep: guidance.sleep || '',
        stress: guidance.stress || ''
      });

    } catch (error) {
      console.error('Failed to generate dynamic guidance:', error);
      toast.error('Failed to generate personalized guidance');

      // Fallback to basic guidance if dynamic generation fails
      setGuidance({
        lifestyle: "Focus on establishing consistent daily routines that support your natural energy patterns. Consider incorporating short mindfulness breaks throughout your day and ensure balanced nutrition with adequate hydration. Building healthy boundaries between work and personal time will significantly enhance your overall wellbeing.",
        sleep: "Your sleep quality appears to need attention. Consider establishing a consistent sleep schedule with appropriate wind-down routines before bed. Optimize your sleep environment and monitor factors that might be disrupting your rest patterns.",
        stress: "Based on your patterns, implementing regular stress management techniques would be beneficial. Consider incorporating breathing exercises, maintaining social connections, and developing healthy coping strategies for when stress levels rise."
      });
    } finally {
      setLoading(false);
    }
  };

  // Dynamic analysis functions for personalized guidance
  const analyzeSleepPatterns = (dreamAnalyses) => {
    const sleepGrades = dreamAnalyses.map(analysis => analysis.sleepQuality).filter(Boolean);
    const avgQuality = sleepGrades.length > 0 ?
      sleepGrades.reduce((sum, grade) => {
        const gradeMap = { A: 4, B: 3, C: 2, D: 1, F: 0 };
        return sum + (gradeMap[grade] || 2);
      }, 0) / sleepGrades.length : 2;

    return {
      quality: avgQuality >= 3 ? 'good' : avgQuality >= 2 ? 'moderate' : 'poor',
      consistency: sleepGrades.length > 5 ? 'consistent' : 'variable',
      improvement: avgQuality < 2 ? 'significant' : avgQuality < 3 ? 'moderate' : 'minor'
    };
  };

  const analyzeRoutineConsistency = (routineEntries) => {
    if (routineEntries.length < 3) return { level: 'unknown', routines: [], days: 0 };

    const consistencyScore = routineEntries.length >= 7 ? 'high' :
                           routineEntries.length >= 4 ? 'moderate' : 'low';

    return {
      level: consistencyScore,
      routines: routineEntries,
      days: routineEntries.length,
      improvement: consistencyScore === 'low' ? 'focus needed' : 'maintenance'
    };
  };

  const analyzeDreamThemes = (dreamAnalyses) => {
    const themes = [];
    const emotions = [];

    dreamAnalyses.forEach(analysis => {
      if (analysis.themes) themes.push(...analysis.themes);
      if (analysis.emotions) {
        Object.keys(analysis.emotions).forEach(emotion => {
          if (analysis.emotions[emotion] > 0.3) emotions.push(emotion);
        });
      }
    });

    const dominantThemes = themes.reduce((acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {});

    const themeFrequency = Object.entries(dominantThemes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([theme, freq]) => ({ theme, frequency: freq }));

    return {
      dominant: themeFrequency,
      emotional: emotions.slice(0, 3),
      processing: emotions.length > 2 ? 'active' : 'moderate'
    };
  };

  const analyzeEnergyPatterns = (wellnessEntries) => {
    // Analyze recent wellness entries for energy/mood patterns
    const entries = wellnessEntries.filter(entry =>
      entry.createdAt && new Date(entry.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    if (entries.length === 0) return { pattern: 'unknown', trends: [] };

    const recentPatterns = entries.map(entry => ({
      date: new Date(entry.createdAt),
      energy: entry.analysis?.energyLevel || 'moderate',
      mood: entry.analysis?.moodRating || 3
    }));

    return {
      pattern: recentPatterns.length > 3 ? 'established' : 'developing',
      trends: recentPatterns,
      averageEnergy: recentPatterns.reduce((sum, p) => sum + (p.mood || 3), 0) / recentPatterns.length
    };
  };

  // Personalized guidance generators
  const generatePersonalizedLifestyleGuidance = (routineConsistency, energyPatterns, dreamThemes) => {
    let guidance = '';

    // Opening based on routine consistency
    if (routineConsistency.level === 'high') {
      guidance += "Your established routine shows excellent structure and consistency. ";
    } else if (routineConsistency.level === 'moderate') {
      guidance += "Your developing routine has good potential but could benefit from increased consistency. ";
    } else {
      guidance += " Building a consistent daily routine will provide the foundation for optimal wellbeing. ";
    }

    // Energy pattern considerations
    if (energyPatterns.pattern === 'established') {
      const avgMood = energyPatterns.averageEnergy;
      if (avgMood > 4) {
        guidance += "Your recent energy patterns indicate strong overall vitality. Focus on maintaining this momentum with sustainable habits that prevent burnout. ";
      } else if (avgMood > 3) {
        guidance += "Your energy levels are moderate and stable. Consider incorporating more movement and nutrition strategies to boost your vitality. ";
      } else {
        guidance += "Your recent energy patterns suggest room for improvement. Prioritize restorative activities and nutrition to rebuild your natural energy reserves. ";
      }
    }

    // Personalized routine recommendations
    guidance += "Based on your " + (routineConsistency.days || 0) + " tracked days, here are targeted improvements: ";

    if (dreamThemes.processing === 'active') {
      guidance += "Your active dream processing indicates high subconscious activity - prioritize morning mindfulness practices to integrate these insights. ";
    }

    // Specific recommendations based on data
    guidance += `Implement a ${routineConsistency.level === 'low' ? 'structured 30-day routine-building plan' : 'refined optimization approach'} that includes:

• ${getEnergyBasedExercise(energyPatterns)} for ${getTimingRecommendation(routineConsistency)}
• ${getNutritionalStrategy(dreamThemes)} nutrition focusing on ${getHydrationNeeds(energyPatterns)}
• ${getBoundaryStrategy(routineConsistency)} to protect your personal time
• ${getSocialStrategy(dreamThemes)} connection practices tailored to your patterns
• Weekly ${getCreativeOutlet(energyPatterns)} time for genuine fulfillment

Track your progress through a detailed wellness journal noting energy levels, sleep quality, and emotional patterns. Use this data to continuously refine your routine for maximum effectiveness.`;

    return guidance;
  };

  const generatePersonalizedSleepGuidance = (sleepPatterns, routineConsistency, dreamThemes, energyPatterns) => {
    let guidance = '';

    if (sleepPatterns.quality === 'good') {
      guidance += "Your sleep quality metrics show strong foundations. Focus on maintaining excellent sleep hygiene and preventing disruption. ";
    } else if (sleepPatterns.quality === 'moderate') {
      guidance += "Your sleep patterns need moderate improvement. Address environmental and behavioral factors systematically. ";
    } else {
      guidance += "Your sleep quality requires significant attention. Implement comprehensive sleep optimization immediately. ";
    }

    guidance += `Based on your ${sleepPatterns.consistency} sleep patterns and recent data, implement this ${dreamThemes.processing === 'active' ? 'intensive' : 'progressive'} sleep protocol:

SLEEP TIMING: Establish ${getSleepSchedule(routineConsistency)} hours (aiming for ${getOptimalBedtime(routineConsistency)}) with zero variation on weekends for circadian synchronization.

SLEEP ENVIRONMENT: Optimize your bedroom for restorative rest by maintaining ${getTemperatureRecommendation()} temperature, using ${sleepPatterns.improvement === 'significant' ? 'complete blackout curtains' : 'effective light blocking'}, and incorporating ${getNoiseSolution(dreamThemes)} for consistent soundscaping.

PRE-BEDTIME ROUTINE: Begin your 90-minute power-down sequence at 9:30 PM for a 10:00 PM bedtime with progressive activities: dim all lights gradually, engage in reading physical books for relaxation when dream processing is active, meditative reflection practice, and finish with gentle stretching or deep breathing.

DIETARY CONSIDERATIONS: ${getCaffeineProtocol(routineConsistency)} caffeine, ${getAlcoholGuidance(dreamThemes)}, and complete food consumption ${getEatingCutoff()} hours before bed to ensure proper digestion and metabolic reset.

ENHANCED HYGIENE: ${getHygieneRecommendations(routineConsistency)} sunlight exposure in the morning, timing exercise ${getExerciseTiming(routineConsistency)}, and tracking your sleep metrics to identify patterns.

ADDITIONAL SUPPORT: Consider ${getSupplementGuidance(dreamThemes)} if medically appropriate. Create your sleep sanctuary with ${getSanctuaryElements()} to signal restorative time to your body.

Monitor your progress and adjust based on sleep quality metrics, dream recall patterns, and morning energy levels.`;

    return guidance;
  };

  const generatePersonalizedStressGuidance = (energyPatterns, dreamThemes, routineConsistency) => {
    let guidance = '';

    const stressLevel = getStressAssessment(energyPatterns, dreamThemes);

    if (stressLevel === 'low') {
      guidance += "Your current stress indicators are well-managed. Focus on prevention and building resilience. ";
    } else if (stressLevel === 'moderate') {
      guidance += "You're experiencing moderate stress levels that require proactive management strategies. ";
    } else {
      guidance += "Your stress patterns indicate the need for immediate intervention and comprehensive coping strategies. ";
    }

    guidance += `Based on your ${dreamThemes.emotional?.length || 0} emotional patterns and energy trends, implement this ${stressLevel} stress management framework:

PHYSICAL TECHNIQUES: Practice ${getPhysicalRelaxation(dreamThemes)} - focusing on ${getMuscleGroupSequence()} for systematic release during ${getTensionTiming(routineConsistency)}.

MENTAL REFRAMING: Maintain a ${getJournalingDepth(dreamThemes)} gratitude journal capturing ${getGratitudeTargets(energyPatterns)} daily entries. Challenge ${getDistortionsToAddress(dreamThemes)} by pausing to examine evidence when they arise.

SOCIAL SUPPORT: ${getSocialProtocol(stressLevel)} connection practices, scheduling ${getInteractionFrequency(energyPatterns)} interactions and considering ${getProfessionalSupport(stressLevel)} for comprehensive care.

IMMEDIATE COPING: Deploy ${getCrisisTechniques(dreamThemes)} when stress surges, utilizing ${getGroundingSequence()} and ${getBreathingPattern(stressLevel)} for rapid stabilization.

LONG-TERM RESILIENCE: Identify your specific ${getTriggerIdentification(energyPatterns)} and develop ${getPreventionPlans(stressLevel)} using ${getManagementTools(routineConsistency)}.

PROFESSIONAL RESOURCES: ${getTherapyRecommendations(stressLevel)} including ${getTherapyTypes(dreamThemes)} techniques and evidence-based programs.

TRACKING SYSTEM: Monitor your stress effectiveness daily, noting which interventions work best for different ${getStressContext(routineConsistency)} to build your personalized coping toolkit.`;

    return guidance;
  };

  // Helper functions for dynamic content generation
  const getEnergyBasedExercise = (energyPatterns) => {
    const avgLow = energyPatterns.averageEnergy < 3;
    return avgLow ? 'light morning walks (15-20 minutes) and restorative yoga' :
           energyPatterns.averageEnergy < 4 ? 'moderate daily movement including brisk walks and stretching' :
           'energizing morning exercises and sustained physical activity';
  };

  const getTimingRecommendation = (routineConsistency) => {
    return routineConsistency.level === 'low' ? 'daily morning sessions' :
           'consistent timing aligned with your natural energy peaks';
  };

  const getNutritionalStrategy = (dreamThemes) => {
    const activeProcessing = dreamThemes.processing === 'active';
    return activeProcessing ? 'brain-supportive' : 'energy-stabilizing';
  };

  const getStressAssessment = (energyPatterns, dreamThemes) => {
    const lowEnergy = energyPatterns.averageEnergy < 3.5;
    const activeEmotional = dreamThemes.emotional?.length > 2;
    return lowEnergy || activeEmotional ? 'high' : 'moderate';
  };

  const getSleepSchedule = (routineConsistency) => {
    return routineConsistency.level === 'high' ? '7-9' : '8-10';
  };

  const getPhysicalRelaxation = (dreamThemes) => {
    return dreamThemes.dominant?.some(t => t.theme === 'chase') ?
           'progressive muscle relaxation' : 'body scan meditation';
  };

  const getHydrationNeeds = (energyPatterns) => {
    return energyPatterns.averageEnergy < 3 ? 'increased hydration to support energy recovery' :
           'balanced hydration throughout the day';
  };

  const getBoundaryStrategy = (routineConsistency) => {
    return routineConsistency.level === 'low' ? 'strict digital boundaries during work hours' :
           'conscious transitions between work and personal activities';
  };

  const getSocialStrategy = (dreamThemes) => {
    const activeEmotional = dreamThemes.emotional?.length > 1;
    return activeEmotional ? 'deeper emotional connection-building activities' :
           'consistent but manageable social engagement';
  };

  const getCreativeOutlet = (energyPatterns) => {
    return energyPatterns.averageEnergy < 3.5 ? 'gentle creative expression like journaling or light drawing' :
           'energizing creative activities like music, painting, or crafting';
  };

  const getTemperatureRecommendation = () => '65-68°F (18-20°C)';
  const getWinddownDuration = () => '90-minute';
  const getWindDownStartTime = () => '9:30 PM for a 10:00 PM bedtime';
  const getCalmingActivity = (dreamThemes) => dreamThemes.processing === 'active' ? 'reading physical books' : 'gentle stretching';
  const getReflectionPractice = (energyPatterns) => energyPatterns.averageEnergy < 3.5 ? 'briefer gratitude reflections' : 'extended evening journaling';
  const getCaffeineProtocol = (routineConsistency) => routineConsistency.level === 'low' ? 'complete caffeine cessation after 10 AM' : 'caffeine completely eliminated after 2 PM';
  const getAlcoholGuidance = (dreamThemes) => dreamThemes.processing === 'active' ? 'alcohol consumption limited to weekends' : 'moderate alcohol use with extended cutoff times';
  const getEatingCutoff = () => '2-3';
  const getHygieneRecommendations = (routineConsistency) => routineConsistency.level === 'low' ? 'mandatory 30-minute morning sunlight exposure' : '15-30 minute morning sunlight exposure';
  const getExerciseTiming = (routineConsistency) => routineConsistency.level === 'low' ? 'flexible timing allowing for CIRCADIAN rhythm adjustment' : 'optimal timing avoiding sleep interference';
  const getSupplementGuidance = (dreamThemes) => dreamThemes.processing === 'active' ? 'chamomile tea, magnesium, or medical consultation' : 'consultation with healthcare provider';
  const getSanctuaryElements = () => 'comfortable bedding, aromatherapy diffusers with lavender, and comforting visual cues';
  const getOptimalBedtime = (routineConsistency) => routineConsistency.level === 'low' ? '9:30 PM' : '10:00 PM';
  const getNoiseSolution = (dreamThemes) => dreamThemes.emotional?.includes('anxiety') ? 'white noise machines with consistent oceanic sounds' : 'earplugs for ambient sound blocking';

  const getMuscleGroupSequence = () => 'toes, feet, calves, thighs, abdomen, chest, arms, neck, and face';
  const getTensionTiming = (routineConsistency) => routineConsistency.level === 'low' ? 'evening routine after dinner' : 'morning or evening based on energy patterns';
  const getJournalingDepth = (dreamThemes) => dreamThemes.processing === 'active' ? 'detailed emotional processing' : 'focused reflection';
  const getGratitudeTargets = (energyPatterns) => energyPatterns.averageEnergy < 3.5 ? '3-5 specific entries focusing on small wins' : '5-7 detailed entries including relationships and growth';
  const getDistortionsToAddress = (dreamThemes) => dreamThemes.emotional?.filter(e => e !== 'calmness') || ['automatic negative thoughts'];
  const getSocialProtocol = (stressLevel) => stressLevel === 'high' ? 'immediate crisis-support focused connection' : 'weekly planned interpersonal engagement';
  const getInteractionFrequency = (energyPatterns) => energyPatterns.averageEnergy < 3.5 ? 'brief daily check-ins' : 'extended weekly connections';
  const getProfessionalSupport = (stressLevel) => stressLevel === 'high' ? 'immediate professional consultation strongly recommended' : 'consider professional support as needed';
  const getCrisisTechniques = (dreamThemes) => dreamThemes.dominant?.some(t => t.theme === 'chase') ? 'immediate grounding techniques with physical anchoring' : 'breath-focused crisis interventions';
  const getGroundingSequence = () => '5-4-3-2-1 sensory grounding (5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste)';
  const getBreathingPattern = (stressLevel) => stressLevel === 'high' ? '4-4-4 emergency breathing (inhale 4, hold 4, exhale 4)' : '4-7-8 relaxation breathing';
  const getTriggerIdentification = (energyPatterns) => energyPatterns.averageEnergy < 3.5 ? 'work deadlines, relationship conflicts, and environmental stressors' : 'context-specific stressors and pressure points';
  const getPreventionPlans = (stressLevel) => stressLevel === 'high' ? 'immediate intervention strategies and safety planning' : 'long-term resilience-building approaches';
  const getManagementTools = (routineConsistency) => routineConsistency.level === 'low' ? 'simple Eisenhower matrix prioritization' : 'comprehensive stress management toolkit';
  const getTherapyRecommendations = (stressLevel) => stressLevel === 'high' ? 'urgent referral for' : 'consider exploring';
  const getTherapyTypes = (dreamThemes) => dreamThemes.processing === 'active' ? 'EMDR therapy or trauma-informed approaches' : 'CBT, mindfulness-based therapy, or solution-focused counseling';
  const getStressContext = (routineConsistency) => routineConsistency.level === 'low' ? 'both professional and personal contexts' : 'situation-specific stress triggers';

  const toggleAudio = (type) => {
    // Stop all audio first
    stopBreathing();
    stopOcean();
    stopBell();
    
    if (playingAudio === type) {
      setPlayingAudio(null);
    } else {
      // Start the selected audio
      switch(type) {
        case 'breathing':
          startBreathing();
          break;
        case 'ocean':
          startOcean();
          break;
        case 'tuii':
          startBell();
          break;
        default:
          break;
      }
      setPlayingAudio(type);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMeditation) {
      toast.error('Please select a meditation practice');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        mentalHealthData: {
          lifestyleGuidance: guidance.lifestyle,
          sleepAdvice: guidance.sleep,
          stressGuidance: guidance.stress,
          meditationPractices: [{
            name: selectedMeditation,
            description: meditationOptions.find(opt => opt.id === selectedMeditation)?.guidance || selectedMeditation,
            audioState: 'stopped'
          }],
          recommendedVideos: youtubeVideos.slice(0, 3).map(video => ({
            title: video.title,
            duration: video.duration,
            thumbnail: video.thumbnail,
            videoId: video.videoId
          })),
          wellnessWorkshops: workshops.slice(0, 3).map(workshop => ({
            title: workshop.name,
            description: workshop.description,
            icon: 'workshop'
          }))
        }
      };

      console.log('DEBUG: MentalHealthModal submitting data:', submitData);

      if (navigator.onLine) {
        // Online: Submit immediately to server
        const { data } = await axios.post('/api/dream-diary/mental-health', submitData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('DEBUG: MentalHealthModal submit response:', data);
        toast.success('Submitted successfully');
        onSubmitted && onSubmitted(data);
        onClose && onClose();
        resetForm();
      } else {
        // Offline: Queue for later sync
        const queuedEntry = queueMentalHealthEntry(submitData);
        console.log('DEBUG: MentalHealthModal queued entry:', queuedEntry);
        toast.success('Submitted successfully');
        onSubmitted && onSubmitted({ _local: true, id: queuedEntry.id });
        onClose && onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Submit mental health failed', error);
      console.log('DEBUG: Mental health submit error details:', error.response?.data);

      // If online submission failed due to network, try queuing
      if (navigator.onLine && error.code === 'NETWORK_ERROR') {
        toast.error('Network issue detected - saving locally for sync later');
        const submitData = {
          mentalHealthData: {
            lifestyleGuidance: guidance.lifestyle,
            sleepAdvice: guidance.sleep,
            stressGuidance: guidance.stress,
            meditationPractices: [{
              name: selectedMeditation,
              description: meditationOptions.find(opt => opt.id === selectedMeditation)?.guidance || selectedMeditation,
              audioState: 'stopped'
            }],
            recommendedVideos: youtubeVideos.slice(0, 3).map(video => ({
              title: video.title,
              duration: video.duration,
              thumbnail: video.thumbnail,
              videoId: video.videoId
            })),
            wellnessWorkshops: workshops.slice(0, 3).map(workshop => ({
              title: workshop.name,
              description: workshop.description,
              icon: 'workshop'
            }))
          }
        };
        const queuedEntry = queueMentalHealthEntry(submitData);
        console.log('DEBUG: MentalHealthModal queued failed entry:', queuedEntry);
        onSubmitted && onSubmitted({ _local: true, id: queuedEntry.id });
        onClose && onClose();
        resetForm();
      } else {
        toast.error('Failed to save mental health entry');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMeditation('');
    setPlayingAudio(null);
    setGuidance({ lifestyle: '', sleep: '', stress: '' });
  };

  const handleClose = () => {
    // Stop all audio
    stopBreathing();
    stopOcean();
    stopBell();
    setPlayingAudio(null);
    resetForm();
    onClose && onClose();
  };

  const meditationOptions = [
    {
      id: 'breathing',
      title: 'Breathing Exercise',
      description: 'Calm your mind with guided breathing techniques',
      icon: FaWind,
      color: '#4A90E2',
      audioPath: '', // Using useLoopAudio hook instead
      guidance: 'Focus on deep, slow breaths. Inhale for 4 counts, hold for 4, exhale for 6. This activates your parasympathetic nervous system, reducing stress and promoting relaxation.'
    },
    {
      id: 'ocean',
      title: 'Ocean Wave Sounds',
      description: 'Immerse yourself in calming ocean waves',
      icon: FaWater,
      color: '#2E86AB',
      audioPath: '/meditation-sounds/ocean.mp3',
      guidance: 'Let the rhythmic ocean waves wash away your worries. Close your eyes and visualize yourself on a peaceful beach, feeling the gentle breeze and hearing the natural rhythm of water.'
    },
    {
      id: 'tuii',
      title: 'Tuii Healing Bell',
      description: 'Experience the healing vibrations of Tibetan bells',
      icon: FaSpa,
      color: '#8E44AD',
      audioPath: '/meditation-sounds/tuii.mp3',
      guidance: 'The resonant tones of Tibetan singing bowls create a meditative state. Allow the vibrations to flow through your body, releasing tension and promoting deep relaxation.'
    }
  ];

  const youtubeVideos = [
    {
      id: '1',
      title: '10-Minute Guided Meditation for Anxiety',
      thumbnail: 'https://img.youtube.com/vi/1nBW9pG2A6U/hqdefault.jpg',
      videoId: '1nBW9pG2A6U',
      duration: '10:23'
    },
    {
      id: '2',
      title: 'Deep Sleep Meditation - Fall Asleep Fast',
      thumbnail: 'https://img.youtube.com/vi/2JSMZfA2bLQ/hqdefault.jpg',
      videoId: '2JSMZfA2bLQ',
      duration: '15:45'
    },
    {
      id: '3',
      title: 'Morning Meditation for Positive Energy',
      thumbnail: 'https://img.youtube.com/vi/6p_yAdFSWbk/hqdefault.jpg',
      videoId: '6p_yAdFSWbk',
      duration: '12:10'
    },
    {
      id: '4',
      title: 'Stress Relief - Calming Piano Music',
      thumbnail: 'https://img.youtube.com/vi/lfcLkP_tj4E/hqdefault.jpg',
      videoId: 'lfcLkP_tj4E',
      duration: '30:00'
    }
  ];

  const workshops = [
    {
      id: '1',
      name: 'Mindfulness Center',
      category: 'Mindfulness',
      city: 'San Francisco',
      description: 'Expert-led mindfulness workshops and retreats'
    },
    {
      id: '2',
      name: 'Wellness Yoga Studio',
      category: 'Yoga & Wellness',
      city: 'New York',
      description: 'Holistic approach combining yoga and meditation'
    },
    {
      id: '3',
      name: 'Mental Health Institute',
      category: 'Mental Wellness',
      city: 'Los Angeles',
      description: 'Professional mental health and wellness programs'
    },
    {
      id: '4',
      name: 'Peaceful Retreat Center',
      category: 'Meditation',
      city: 'Colorado Springs',
      description: 'Silent meditation retreats in nature'
    }
  ];

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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <motion.div
            className="mental-health-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,248,255,0.95) 100%)',
              borderRadius: '24px',
              padding: '40px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              position: 'relative'
            }}
          >
            {/* Animated Background Elements */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              borderRadius: '24px',
              pointerEvents: 'none'
            }}>
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  width: '60px',
                  height: '60px',
                  background: 'radial-gradient(circle, rgba(138,43,226,0.1) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />
              <motion.div
                animate={{ y: [0, 15, 0], rotate: [0, -180, -360] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: '70%',
                  right: '15%',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(46,134,171,0.1) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />
              <motion.div
                animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  bottom: '20%',
                  left: '20%',
                  width: '40px',
                  height: '40px',
                  background: 'radial-gradient(circle, rgba(142,68,173,0.1) 0%, transparent 70%)',
                  borderRadius: '50%'
                }}
              />
            </div>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative', zIndex: 1 }}>
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  background: 'rgba(255,255,255,0.9)',
                  border: '2px solid #E91E63',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(233,30,99,0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                <FaTimes style={{ color: '#E91E63', fontSize: '16px' }} />
              </motion.button>
              
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ display: 'inline-block' }}
              >
                <FaHeart style={{ fontSize: '48px', color: '#E91E63', marginBottom: '10px' }} />
              </motion.div>
              <h2 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: '#2C3E50',
                margin: '0 0 15px 0',
                background: 'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Mental Health & Wellness
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#7F8C8D',
                lineHeight: '1.6',
                maxWidth: '600px',
                margin: '0 auto',
                fontStyle: 'italic'
              }}>
                "This guidance is based on your submitted data and is for informational purposes only. It is not a substitute for professional medical advice."
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #E91E63',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ marginTop: '20px', color: '#7F8C8D' }}>Generating personalized guidance...</p>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* AI Guidance Sections */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    color: '#2C3E50', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaBrain style={{ color: '#9C27B0' }} />
                    Personalized Guidance
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(142,68,173,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <h4 style={{ color: '#8E44AD', margin: '0 0 10px 0', fontSize: '16px' }}>
                        <FaLeaf style={{ marginRight: '8px' }} />
                        Lifestyle Guidance
                      </h4>
                      <p style={{ margin: 0, color: '#5D6D7E', lineHeight: '1.6', fontSize: '14px' }}>
                        {guidance.lifestyle}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(46,134,171,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <h4 style={{ color: '#2E86AB', margin: '0 0 10px 0', fontSize: '16px' }}>
                        <FaClock style={{ marginRight: '8px' }} />
                        Sleep Schedule Advice
                      </h4>
                      <p style={{ margin: 0, color: '#5D6D7E', lineHeight: '1.6', fontSize: '14px' }}>
                        {guidance.sleep}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      style={{
                        background: 'rgba(255,255,255,0.7)',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(233,30,99,0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <h4 style={{ color: '#E91E63', margin: '0 0 10px 0', fontSize: '16px' }}>
                        <FaSpa style={{ marginRight: '8px' }} />
                        Stress-Free Living Guidance
                      </h4>
                      <p style={{ margin: 0, color: '#5D6D7E', lineHeight: '1.6', fontSize: '14px' }}>
                        {guidance.stress}
                      </p>
                    </motion.div>
                  </div>
                </div>

                {/* Meditation Guidance */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    color: '#2C3E50', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaSpa style={{ color: '#8E44AD' }} />
                    Meditation Practices
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {meditationOptions.map((option, index) => {
                      const Icon = option.icon;
                      return (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -5 }}
                          onClick={() => setSelectedMeditation(option.id)}
                          style={{
                            background: selectedMeditation === option.id 
                              ? `linear-gradient(135deg, ${option.color}22 0%, ${option.color}11 100%)`
                              : 'rgba(255,255,255,0.7)',
                            padding: '20px',
                            borderRadius: '16px',
                            border: selectedMeditation === option.id 
                              ? `2px solid ${option.color}`
                              : '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: option.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '15px'
                            }}>
                              <Icon style={{ color: 'white', fontSize: '18px' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, color: '#2C3E50', fontSize: '16px' }}>{option.title}</h4>
                              <p style={{ margin: '5px 0 0 0', color: '#7F8C8D', fontSize: '12px' }}>{option.description}</p>
                            </div>
                          </div>
                          
                          <div style={{ marginBottom: '15px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAudio(option.id);
                              }}
                              style={{
                                background: option.color,
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {playingAudio === option.id ? <FaPause /> : <FaPlay />}
                              {playingAudio === option.id ? 'Stop' : 'Start'}
                            </button>
                          </div>
                          
                          <p style={{ 
                            margin: 0, 
                            color: '#5D6D7E', 
                            fontSize: '13px',
                            lineHeight: '1.5',
                            fontStyle: 'italic'
                          }}>
                            {option.guidance}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* YouTube Videos */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    color: '#2C3E50', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaYoutube style={{ color: '#FF0000' }} />
                    Recommended Meditation Videos
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {youtubeVideos.map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.1)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            {video.duration}
                          </div>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '13px', 
                            color: '#2C3E50',
                            lineHeight: '1.3'
                          }}>
                            {video.title}
                          </h4>
                          <a
                            href={`https://www.youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: '#FF0000',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            <FaYoutube />
                            Watch on YouTube
                            <FaExternalLinkAlt style={{ fontSize: '10px' }} />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Workshops */}
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    color: '#2C3E50', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FaSun style={{ color: '#F39C12' }} />
                    Wellness Workshops & Centers
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {workshops.map((workshop, index) => (
                      <motion.div
                        key={workshop.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          padding: '20px',
                          borderRadius: '16px',
                          border: '1px solid rgba(0,0,0,0.1)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        <div style={{
                          display: 'inline-block',
                          background: '#F39C12',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '500',
                          marginBottom: '10px'
                        }}>
                          {workshop.category}
                        </div>
                        <h4 style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '16px', 
                          color: '#2C3E50',
                          fontWeight: '600'
                        }}>
                          {workshop.name}
                        </h4>
                        <p style={{ 
                          margin: '0 0 8px 0', 
                          color: '#7F8C8D', 
                          fontSize: '13px',
                          lineHeight: '1.4'
                        }}>
                          {workshop.description}
                        </p>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginTop: '12px'
                        }}>
                          <span style={{ color: '#95A5A6', fontSize: '12px' }}>
                            📍 {workshop.city}
                          </span>
                          <button
                            style={{
                              background: '#F39C12',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            Visit Website
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '15px', 
                  justifyContent: 'center',
                  marginTop: '30px',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '12px 30px',
                      border: '2px solid #BDC3C7',
                      background: 'transparent',
                      color: '#7F8C8D',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !selectedMeditation}
                    style={{
                      padding: '12px 30px',
                      border: 'none',
                      background: loading || !selectedMeditation
                        ? '#BDC3C7'
                        : 'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
                      color: 'white',
                      borderRadius: '25px',
                      cursor: loading || !selectedMeditation ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease',
                      boxShadow: loading || !selectedMeditation
                        ? 'none'
                        : '0 4px 15px rgba(233,30,99,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {(loading || !selectedMeditation) ? (
                      <>
                        {loading && <FaWifi style={{ fontSize: '14px' }} />}
                        {loading ? 'Saving...' : 'Save Entry'}
                      </>
                    ) : (
                      <>
                        {isOnline ? <FaWifi style={{ fontSize: '14px' }} /> : <FaExclamationTriangle style={{ fontSize: '14px' }} />}
                        {isOnline ? 'Save Entry' : 'Save (Syncs Online)'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
