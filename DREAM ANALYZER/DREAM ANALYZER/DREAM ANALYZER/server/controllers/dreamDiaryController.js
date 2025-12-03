const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const DreamAnalysis = require('../models/DreamAnalysis');
const { 
  analyzeDreamWithAI, 
  generateDreamImage, 
  extractMoodLevelsFromText,
  generateLifestyleAnalysisMetricsAI
} = require('../services/aiService');
const { generateDailyGuidanceWithLMStudio } = require('../services/lmStudioGuidanceService');
const { client, callOpenAIWithFallback } = require('../services/openaiHelper');
const Routine = require('../models/Routine');
const DreamDiary = require('../models/DreamDiary');
const WellnessGuidance = require('../models/WellnessGuidance');
const LifestyleAnalysis = require('../models/LifestyleAnalysis');
const { logActivity } = require('./recentActivityController');

// Generate AI-based dream image
const generateImage = async (req, res) => {
  try {
    const { dreamText, analysisId } = req.body;
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!dreamText || !analysisId) {
      return res.status(400).json({ error: 'Dream text and analysis ID are required' });
    }

    // Extract keywords and themes for better image prompt
    const keywords = extractKeywords(dreamText);
    const emotions = detectEmotions(dreamText);
    const themes = extractThemes(keywords, dreamText);
    
    const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );
    
    const imagePrompt = `Dreamy surreal illustration of ${themes.join(' and ')}, ${dominantEmotion} atmosphere, ethereal pastel colors, symbolic and artistic, soft lighting, dreamlike quality`;

    // Generate image using AI service
    const imageResult = await generateDreamImage(imagePrompt);
    
    if (!imageResult || !imageResult.imageBase64) {
      return res.status(200).json({ 
        imageUrl: null,
        message: 'Image generation is temporarily unavailable',
        analysisId 
      });
    }

    const mime = imageResult.mimeType || 'image/png';
    const imageUrl = `data:${mime};base64,${imageResult.imageBase64}`;
    
    // Update analysis with generated image
    const analysis = await DreamAnalysis.findByIdAndUpdate(
      analysisId,
      {
        imageUrl,
        imagePrompt,
        imageGeneratedAt: new Date()
      },
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({
      imageUrl,
      analysisId: analysis._id,
      imagePrompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(200).json({ 
      imageUrl: null,
      message: 'Image generation failed, but analysis saved',
      error: error.message,
      analysisId: req.body.analysisId 
    });
  }
};



// ===== New Dream Diary Module: Daily Routine Questionnaire =====
// POST /api/dream-diary/daily-routine
const submitDailyRoutine = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, dailyStructure = {}, activities = {}, social = {}, impact = {}, notes = '' } = req.body || {};

    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(0,0,0,0);

    let routine = await Routine.findOne({ user: userId });
    if (!routine) {
      routine = await Routine.create({ user: userId, title: 'Daily Routine', habits: [], entries: [] });
    }

    const idx = routine.entries.findIndex(e => new Date(e.date).toDateString() === entryDate.toDateString());
    const questionnaire = { dailyStructure, activities, social, impact };

    if (idx >= 0) {
      routine.entries[idx].questionnaire = questionnaire;
      routine.entries[idx].notes = notes || routine.entries[idx].notes;
    } else {
      routine.entries.push({ date: entryDate, items: [], notes, questionnaire });
    }

    await routine.save();
    try { await logActivity(userId, 'daily_routine_submitted', { date: entryDate }); } catch (_) {}
    // Emit socket update to refresh client dashboards/diary
    try {
      const io = req.app && req.app.get ? req.app.get('io') : null;
      if (io) io.to(userId.toString()).emit('diary:updated', { when: new Date().toISOString(), kind: 'daily_routine' });
    } catch (_) {}
    res.json({ success: true, routine });
  } catch (error) {
    console.error('Submit daily routine error:', error);
    res.status(500).json({ error: 'Failed to submit daily routine', details: error.message });
  }
};

// ===== Dream Entry Alias (extended) =====
// POST /api/dream-diary/dream-entry
const submitDreamEntry = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      dreamTitle,
      summary,
      narrative = {},
      emotions = {},
      interpretation = {},
      date,
      duration,
      wakingEmotion,
      analysisId
    } = req.body || {};

    const content = [narrative.title, narrative.story, narrative.setting, narrative.symbols, narrative.sensory]
      .filter(Boolean).join('\n\n');

    const payload = {
      title: dreamTitle || narrative.title || 'Dream Entry',
      content: content || summary || 'Dream entry',
      analysisId,
      mood: wakingEmotion || 'neutral',
      intensity: emotions?.intensity || 5,
      tags: Object.keys(emotions || {}),
      isPublic: false,
      date: date || undefined
    };

    req.body = payload;
    return saveDreamEntry(req, res);
  } catch (error) {
    console.error('Submit dream entry error:', error);
    res.status(500).json({ error: 'Failed to submit dream entry', details: error.message });
  }
};

// ===== Fetch Dream Analysis by Title =====
// GET /api/dream-diary/fetch-analysis?title=...
const fetchAnalysis = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title } = req.query || {};
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Dream title is required' });
    }

    // Search for dream analysis by title (case-insensitive)
    const analysis = await DreamAnalysis.findOne({ 
      user: userId,
      $or: [
        { 'interpretationDetails.yourDream': { $regex: title, $options: 'i' } },
        { 'sections.yourDream': { $regex: title, $options: 'i' } },
        { summary: { $regex: title, $options: 'i' } }
      ]
    }).lean();

    if (!analysis) {
      return res.json({ success: false, message: 'No analysis found for this dream. Please analyze it in Chatbot first.' });
    }

    // Return the summary and analysisId
    res.json({ 
      success: true, 
      analysisId: analysis._id,
      summary: analysis.summary || analysis.interpretationDetails?.summaryAndInsights || analysis.sections?.summaryAndAdvice || 'No summary available',
      dreamText: analysis.dreamText,
      yourDream: analysis.interpretationDetails?.yourDream || analysis.sections?.yourDream || ''
    });
  } catch (error) {
    console.error('Fetch analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis', details: error.message });
  }
};

// ===== Wellness Guidance =====
// POST /api/dream-diary/wellness-guidance -> compute and return (and persist)
const wellnessGuidance = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { forDate, analysisId } = req.body || {};
    const entryDate = forDate ? new Date(forDate) : new Date();
    entryDate.setHours(0,0,0,0);

    const routine = await Routine.findOne({ user: userId }).lean();
    const analysis = analysisId ? await DreamAnalysis.findById(analysisId).lean() : await DreamAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean();

    const emotions = analysis?.emotions || { calmness: 0.4, joy: 0.2, anxiety: 0.2, fear: 0.1, sadness: 0.1, excitement: 0.0 };
    const themes = analysis?.themes || [];
    const stressLevel = Math.round(analysis?.stressScore ? analysis.stressScore / 10 : 5);

    const recommendations = generateMeditationRecommendations(emotions, themes, stressLevel);
    const youtubeVideos = getRecommendedVideos(emotions, themes);
    const breathingExercises = getBreathingExercises(stressLevel);

    // Generate dynamic personalized guidance text using AI
    let personalized = { lifestyle: '', sleep: '', stress: '' };
    try {
      const routineSummary = { entries: routine?.entries || [], stats: routine?.stats || {} };
      const dreamSummary = analysis?.summary || analysis?.interpretation || analysis?.sections?.overview || '';
      personalized = await generatePersonalizedGuidanceText({ routineSummary, mentalHealth: { emotions, stressLevel }, dreamSummary });
      const valid = personalized && typeof personalized === 'object' && ['lifestyle','sleep','stress'].every(k => typeof personalized[k] === 'string');
      if (!valid) personalized = { lifestyle: '', sleep: '', stress: '' };
    } catch (e) {
      personalized = { lifestyle: '', sleep: '', stress: '' };
    }

    const doc = await WellnessGuidance.create({
      user: userId,
      basedOn: { routineDate: entryDate, dreamAnalysisId: analysis?._id },
      summary: analysis?.interpretation || analysis?.summary || 'Personalized guidance based on your submitted data.',
      recommendations,
      meditation: { sounds: ['breath_in_out', 'wavy', 'tuii'], breathingExercises, youtubeVideos }
    });

    try { await logActivity(userId, 'wellness_guidance_generated', { guidanceId: doc._id }); } catch (_) {}
    res.json({ success: true, guidance: doc, personalized });
  } catch (error) {
    console.error('Wellness guidance error:', error);
    res.status(500).json({ error: 'Failed to generate guidance', details: error.message });
  }
};

// Helper: extract a section paragraph from LM Studio markdown by heading
function extractLmSection(markdownText, heading) {
  if (!markdownText || !heading) return '';
  
  // Try exact heading match first
  let idx = markdownText.indexOf(heading);
  
  // If not found, try without the number prefix (more flexible)
  if (idx === -1) {
    const headingWithoutNum = heading.replace(/#### \d+\.\s*/, '#### ');
    idx = markdownText.indexOf(headingWithoutNum);
  }
  
  // If still not found, try just the section name
  if (idx === -1) {
    const sectionName = heading.split('Guidance')[0]?.split('Advice')[0]?.trim() || '';
    if (sectionName) {
      const pattern = new RegExp(`####\\s+\\d+\\.\\s*${sectionName}`, 'i');
      const match = markdownText.match(pattern);
      if (match) idx = match.index;
    }
  }
  
  if (idx === -1) return '';
  
  const start = idx + (markdownText.substring(idx).match(/^####\s+\d+\.\s*[^\n]+\n/) || [''])[0].length;
  const rest = markdownText.slice(start);
  const nextHeadingIdx = rest.search(/####\s+\d+\./);
  const sectionBody = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  return sectionBody.trim();
}

// POST /api/dream-diary/guidance/lmstudio -> returns markdown guidance using LM Studio local API
// This endpoint is STRICTLY limited to generating text guidance and does not
// modify any Dream Diary, Interpretation, Community, Profile, or scoring logic.
const lmStudioPersonalizedGuidance = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only Dream Diary + Daily Routine data are used to build USER_DATA
    const dreamDiary = await DreamDiary.findOne({ user: userId })
      .select('dreamEntries')
      .lean();
    const routine = await Routine.findOne({ user: userId })
      .select('entries title stats')
      .lean();

    const userData = {
      dreamDiary: {
        totalEntries: Array.isArray(dreamDiary?.dreamEntries)
          ? dreamDiary.dreamEntries.length
          : 0,
        recentDreams: Array.isArray(dreamDiary?.dreamEntries)
          ? dreamDiary.dreamEntries
              .slice(-10)
              .map((e) => ({
                date: e.date,
                title: e.title,
                // keep content short to avoid overloading the model
                contentPreview:
                  typeof e.content === 'string'
                    ? e.content.slice(0, 600)
                    : '',
                tags: e.tags || [],
                mood: e.mood || null,
              }))
          : [],
      },
      dailyRoutine: {
        title: routine?.title || 'Daily Routine',
        stats: routine?.stats || {},
        totalEntries: Array.isArray(routine?.entries)
          ? routine.entries.length
          : 0,
        recentEntries: Array.isArray(routine?.entries)
          ? routine.entries.slice(-14).map((entry) => ({
              date: entry.date,
              items: Array.isArray(entry.items)
                ? entry.items.map((i) => ({
                    name: i.name,
                    done: !!i.done,
                    impactMental: i.impactMental,
                    impactPhysical: i.impactPhysical,
                  }))
                : [],
              questionnaire: entry.questionnaire || {},
              notes:
                typeof entry.notes === 'string'
                  ? entry.notes.slice(0, 400)
                  : '',
            }))
          : [],
      },
    };

    const lmResult = await generateDailyGuidanceWithLMStudio(userData);

    // Always return a stable, predictable structure for Trea/UI
    return res.status(200).json({
      success: true,
      source: lmResult.ok ? 'lm_studio' : 'fallback',
      guidance: lmResult.text,
    });
  } catch (error) {
    console.error('LM Studio personalized guidance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate LM Studio guidance',
      details: error.message,
    });
  }
};

// POST /api/dream-diary/guidance/personalized -> returns lifestyle/sleep/stress text using GPT
function buildRoutineFallbackGuidance(routineSummary = {}, analysis = null) {
  const entries = Array.isArray(routineSummary.entries) ? routineSummary.entries : [];
  const today = entries[entries.length - 1] || {};
  const q = today.questionnaire || {};
  const ds = q.dailyStructure || {};
  const act = q.activities || {};
  const soc = q.social || {};
  const imp = q.impact || {};
  const consistency = Number(routineSummary.stats?.avgConsistency || ds.consistencyScore || 60);
  const structureLevel = Number(ds.structureLevel || 3);
  const itemsDone = (today.items || []).filter(i => i.done).length;
  const totalItems = (today.items || []).length;
  const exerciseMinutes = Number(act.exerciseMinutes || 0);
  const peopleInteracted = Number(soc.peopleInteracted || 0);
  const moodImpact = Number(imp.moodImpact || 3);
  const energyImpact = Number(imp.energyImpact || 3);
  const stressLevel = Math.round(analysis?.stressScore ? analysis.stressScore / 10 : 5);

  // Build detailed, personalized lifestyle guidance (6-8 sentences)
  let lifestyle = '';
  if (structureLevel >= 4) {
    lifestyle = `Your daily routine shows strong structure and consistency, which is wonderful for maintaining stability in your life. `;
  } else if (structureLevel >= 3) {
    lifestyle = `Your routine has good structure with some natural variability, which shows you're balancing consistency with flexibility. `;
  } else {
    lifestyle = `Your routine could benefit from a bit more structure, and that's completely okay—small, gradual changes often work best. `;
  }
  
  if (exerciseMinutes > 30) {
    lifestyle += `Your regular exercise routine (${exerciseMinutes} minutes) is actively supporting both your physical and mental health, which is fantastic. `;
  } else if (exerciseMinutes > 0) {
    lifestyle += `You're getting some movement in (${exerciseMinutes} minutes), and even small amounts of physical activity can make a meaningful difference. `;
  } else {
    lifestyle += `Consider adding even just 10-15 minutes of movement to your day, whether that's a walk, stretching, or any activity you enjoy. `;
  }
  
  if (totalItems > 0) {
    const completionRate = Math.round((itemsDone / totalItems) * 100);
    lifestyle += `You've completed ${itemsDone} out of ${totalItems} routine items (${completionRate}%), which shows you're making progress. `;
  }
  
  lifestyle += `Your energy levels are at ${energyImpact}/5 and mood at ${moodImpact}/5, which gives us helpful information about how your routine is affecting you. `;
  lifestyle += `Try to balance focused work blocks with short recovery breaks—even 2-3 minutes of deep breathing or gentle stretching can help reset your system. `;
  lifestyle += `Remember that consistency in small habits often creates more lasting change than occasional big pushes, so be kind to yourself on days when things don't go perfectly. `;
  lifestyle += `Your routine is a living, evolving thing, and adjusting it based on how you actually feel is a sign of self-awareness, not failure.`;

  // Build detailed sleep guidance (6-8 sentences)
  let sleep = '';
  if (ds.wakeTime && ds.bedTime) {
    try {
      const wake = new Date(`2000-01-01T${ds.wakeTime}`);
      let bed = new Date(`2000-01-01T${ds.bedTime}`);
      if (bed <= wake) bed.setDate(bed.getDate() + 1);
      const hours = (bed - wake) / 3600000;
      
      if (hours >= 7 && hours <= 9) {
        sleep = `Your sleep window (${ds.bedTime} to ${ds.wakeTime}, about ${Math.round(hours)} hours) looks healthy and well-aligned with your body's needs. `;
      } else if (hours < 7) {
        sleep = `Your current sleep window (${ds.bedTime} to ${ds.wakeTime}, about ${Math.round(hours)} hours) is shorter than the recommended 7-9 hours, so consider gradually extending it if possible. `;
      } else {
        sleep = `Your sleep window (${ds.bedTime} to ${ds.wakeTime}, about ${Math.round(hours)} hours) is longer than typical—if you feel rested, that's great, but if you feel groggy, you might try reducing it slightly. `;
      }
    } catch (_) {
      sleep = `Your sleep schedule shows you're tracking your rest times, which is a helpful first step. `;
    }
  } else {
    sleep = `Establishing a consistent sleep schedule can significantly improve how you feel during the day. `;
  }
  
  sleep += `Start your wind-down routine about 60 minutes before your target bedtime, reducing screen time, dimming lights, and choosing calming activities. `;
  sleep += `Create a sleep environment that feels safe and restful—cool temperature, darkness, and quiet (or gentle white noise if you prefer). `;
  
  if (stressLevel >= 7) {
    sleep += `Since your stress levels are around ${stressLevel}/10, consider doing 4-7-8 breathing exercises for 3-5 minutes before bed to help your nervous system settle. `;
  } else if (stressLevel >= 5) {
    sleep += `With stress levels at ${stressLevel}/10, a brief pre-sleep ritual like journaling or gentle stretching can help signal to your body that it's time to rest. `;
  } else {
    sleep += `Your stress levels are relatively manageable, which is great for sleep quality—keep doing what's working for you. `;
  }
  
  sleep += `If your dreams feel intense or busy, try writing down a few thoughts or worries in a journal before bed so your mind doesn't have to hold onto them overnight. `;
  sleep += `Morning light exposure, even just 5-10 minutes near a window or outside, helps reset your internal clock and can make falling asleep easier at night. `;
  sleep += `Remember that sleep quality matters as much as quantity—focus on creating conditions that help you feel rested, rather than just hitting a specific number of hours.`;

  // Build detailed stress guidance (6-8 sentences)
  let stressText = '';
  if (peopleInteracted > 0) {
    stressText = `You've been interacting with ${peopleInteracted} ${peopleInteracted === 1 ? 'person' : 'people'} recently, which shows you have social connections available—these relationships can be important sources of support during stressful times. `;
  } else {
    stressText = `Consider reaching out to someone you trust, even briefly, as social connection can help buffer stress and remind you that you're not alone in facing challenges. `;
  }
  
  if (moodImpact >= 4) {
    stressText += `Your mood impact score of ${moodImpact}/5 suggests that your current stress management strategies are working well for you. `;
  } else if (moodImpact >= 3) {
    stressText += `Your mood impact is at ${moodImpact}/5, which indicates moderate stress levels that could benefit from some additional coping strategies. `;
  } else {
    stressText += `Your mood impact is at ${moodImpact}/5, which suggests stress might be affecting your wellbeing more than you'd like—this is a good time to prioritize stress reduction. `;
  }
  
  if (stressLevel >= 7) {
    stressText += `With stress levels around ${stressLevel}/10, it's especially important to build in regular micro-breaks throughout your day—even 30-60 seconds of slow breathing can help reset your system. `;
  } else if (stressLevel >= 5) {
    stressText += `Your stress levels are at ${stressLevel}/10, which is moderate—this is a good time to practice stress management techniques before things build up further. `;
  } else {
    stressText += `Your stress levels are relatively low (${stressLevel}/10), which is great—keep doing what's working, and consider these strategies as preventive maintenance. `;
  }
  
  stressText += `Try incorporating 3-4 micro-resets throughout your day: pause, take a slow breath in and a longer breath out, and briefly name what you're feeling without judgment. `;
  stressText += `Box breathing (inhale 4 counts, hold 4, exhale 4, hold 4) can be especially helpful before challenging tasks or when you notice tension building. `;
  stressText += `Regular small pleasures—whether that's music, movement, nature, creative activities, or connection with others—help train your nervous system to remember that safety and joy exist alongside stress. `;
  stressText += `Remember that managing stress isn't about eliminating it completely (which isn't realistic), but about building practices that help you return to a calmer baseline more easily over time.`;

  return { lifestyle, sleep, stress: stressText };
}

const personalizedGuidance = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { forDate } = req.body || {};
    const entryDate = forDate ? new Date(forDate) : new Date();
    entryDate.setHours(0,0,0,0);

    const routine = await Routine.findOne({ user: userId }).lean();
    const hasRoutine = Array.isArray(routine?.entries) && routine.entries.length > 0;
    if (!hasRoutine) {
      return res.status(400).json({ success: false, error: 'Daily routine not found. Submit your daily routine first.' });
    }

    // Pre-compute routine summary and latest analysis for LM + deterministic fallback
    const routineSummary = { entries: routine?.entries || [], stats: routine?.stats || {} };
    const analysis = await DreamAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean();

    // Prefer LM Studio local model for personalized guidance; fall back to
    // deterministic guidance if LM Studio is unavailable.
    let personalized = null;
    try {
      const dreamDiary = await DreamDiary.findOne({ user: userId })
        .select('dreamEntries')
        .lean();

      const userData = {
        dreamDiary: {
          totalEntries: Array.isArray(dreamDiary?.dreamEntries)
            ? dreamDiary.dreamEntries.length
            : 0,
          recentDreams: Array.isArray(dreamDiary?.dreamEntries)
            ? dreamDiary.dreamEntries.slice(-10).map((e) => ({
                date: e.date,
                title: e.title,
                contentPreview:
                  typeof e.content === 'string'
                    ? e.content.slice(0, 600)
                    : '',
                tags: e.tags || [],
                mood: e.mood || null,
              }))
            : [],
        },
        dailyRoutine: {
          title: routine?.title || 'Daily Routine',
          stats: routine?.stats || {},
          totalEntries: Array.isArray(routine?.entries)
            ? routine.entries.length
            : 0,
          recentEntries: Array.isArray(routine?.entries)
            ? routine.entries.slice(-14).map((entry) => ({
                date: entry.date,
                items: Array.isArray(entry.items)
                  ? entry.items.map((i) => ({
                      name: i.name,
                      done: !!i.done,
                      impactMental: i.impactMental,
                      impactPhysical: i.impactPhysical,
                    }))
                  : [],
                questionnaire: entry.questionnaire || {},
                notes:
                  typeof entry.notes === 'string'
                    ? entry.notes.slice(0, 400)
                    : '',
              }))
            : [],
        },
      };

      console.log('🔵 Calling LM Studio with userData (routine entries:', routine?.entries?.length || 0, ', dream entries:', dreamDiary?.dreamEntries?.length || 0, ')');
      const lmResult = await generateDailyGuidanceWithLMStudio(userData);
      console.log('🔵 LM Studio result:', { 
        ok: lmResult?.ok, 
        textLength: lmResult?.text?.length || 0,
        error: lmResult?.error || 'none'
      });
      
      if (lmResult && lmResult.ok && lmResult.text) {
        const full = lmResult.text;
        console.log('🔵 LM Studio response preview (first 300 chars):', full.substring(0, 300));
        
        const lifestyle = extractLmSection(
          full,
          '#### 1. Lifestyle Guidance'
        );
        const sleep = extractLmSection(
          full,
          '#### 2. Sleep Schedule Advice'
        );
        const stress = extractLmSection(
          full,
          '#### 3. Stress-Free Living Guidance'
        );

        console.log('🔵 Extracted sections:', {
          lifestyleLength: lifestyle?.length || 0,
          sleepLength: sleep?.length || 0,
          stressLength: stress?.length || 0,
          lifestylePreview: lifestyle?.substring(0, 100) || 'empty',
          sleepPreview: sleep?.substring(0, 100) || 'empty',
          stressPreview: stress?.substring(0, 100) || 'empty'
        });

        // Only use LM Studio result if we successfully extracted all three sections
        if (lifestyle && lifestyle.trim().length > 50 && 
            sleep && sleep.trim().length > 50 && 
            stress && stress.trim().length > 50) {
          personalized = {
            lifestyle: lifestyle.trim(),
            sleep: sleep.trim(),
            stress: stress.trim(),
          };
          console.log('✅ Using LM Studio guidance (dynamic)');
        } else {
          console.warn('⚠️ LM Studio response sections too short or missing, using dynamic fallback based on routine');
        }
      } else {
        console.warn('⚠️ LM Studio returned invalid result:', { 
          ok: lmResult?.ok, 
          hasText: !!lmResult?.text,
          error: lmResult?.error || 'unknown'
        });
        console.log('⚠️ Will use dynamic fallback based on user routine data');
      }
    } catch (e) {
      console.warn('LM Studio personalized guidance failed, falling back:', e.message);
      personalized = null;
    }

    const valid =
      personalized &&
      typeof personalized === 'object' &&
      ['lifestyle', 'sleep', 'stress'].every(
        (k) => typeof personalized[k] === 'string' && personalized[k].trim().length > 0
      );

    if (!valid) {
      console.log('🟡 Using dynamic fallback guidance based on routine data');
      console.log('🟡 Routine summary:', {
        entriesCount: routineSummary.entries?.length || 0,
        latestEntryDate: routineSummary.entries?.[routineSummary.entries.length - 1]?.date,
        hasAnalysis: !!analysis
      });
      personalized = buildRoutineFallbackGuidance(routineSummary, analysis);
      console.log('🟡 Fallback guidance generated:', {
        lifestyleLength: personalized?.lifestyle?.length || 0,
        sleepLength: personalized?.sleep?.length || 0,
        stressLength: personalized?.stress?.length || 0
      });
    }

    return res.json({ success: true, personalized, basedOn: { routineDate: entryDate, dreamAnalysisId: analysis?._id } });
  } catch (error) {
    console.error('Personalized guidance error:', error);

    // If anything went wrong above, try a last-chance dynamic fallback based on routine data
    try {
      const userId = req.userId || req.user?.id || req.user?._id;
      const routine = await Routine.findOne({ user: userId }).lean();
      const routineSummary = { entries: routine?.entries || [], stats: routine?.stats || {} };
      const analysis = await DreamAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
      const personalized = buildRoutineFallbackGuidance(routineSummary, analysis);

      return res.status(200).json({
        success: true,
        personalized,
        basedOn: { routineDate: null, dreamAnalysisId: analysis?._id || null },
        fallback: true,
      });
    } catch (innerErr) {
      console.error('Personalized guidance hard fallback failed:', innerErr);
      // Final ultra-safe static fallback
      const lifestyle =
        'Try to keep your days gently structured with a few consistent anchors like wake time, mealtimes, and short movement breaks. Small, realistic habits done regularly tend to support your mood and energy better than big changes.';
      const sleep =
        'Aim for a steady sleep window most nights, with a calming wind‑down routine, softer lighting, and less screen time before bed. Notice what helps you fall asleep more easily and repeat those cues so your body learns a predictable rhythm.';
      const stress =
        'When you notice tension building during the day, pause for a few slow breaths and briefly name what you are feeling. Protect small pockets of rest, movement, and connection so stress doesn’t have to build up without relief.';

      return res.status(200).json({
        success: true,
        personalized: { lifestyle, sleep, stress },
        basedOn: { routineDate: null, dreamAnalysisId: null },
        fallback: true,
      });
    }
  }
};

// ===== Lifestyle Analysis =====
// GET aggregates + history
const getLifestyleAnalysis = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // User ID validation removed - now supports string UUIDs

    const days = parseInt(req.query.days || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analyses = await DreamAnalysis.find({ user: userId, createdAt: { $gte: startDate } }).lean();
    const analytics = calculateSleepAnalytics(analyses);
    const insights = calculateDreamInsights(analyses);

    const correlation = { 
      type: 'line', 
      data: { 
        labels: analyses.map(a => new Date(a.createdAt).toLocaleDateString()), 
        datasets: [{ label: 'Mental Wellness', data: analyses.map(a => a.mentalWellness || 0) }] 
      } 
    };
    const themeFrequency = { 
      type: 'bar', 
      data: { 
        labels: (insights.topThemes || []).map(t => t.theme), 
        datasets: [{ label: 'Theme Count', data: (insights.topThemes || []).map(t => t.count) }] 
      } 
    };
    const activityBreakdown = { 
      type: 'pie', 
      data: { 
        labels: ['Physical', 'Social', 'Mental'], 
        datasets: [{ data: [analytics.avgPhysicalImpact || 0, 0, analytics.avgMentalWellness || 0] }] 
      } 
    };

    const history = await LifestyleAnalysis.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, correlation, themeFrequency, activityBreakdown, history });
  } catch (error) {
    console.error('Get lifestyle analysis error:', error);
    res.status(200).json({ success: true, correlation: null, themeFrequency: null, activityBreakdown: null, history: [], message: 'OK (fallback)'});
  }
};

// POST save snapshot
const saveLifestyleAnalysis = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle both old format (correlation, themeFrequency, etc.) and new format from modal
    const { correlation, themeFrequency, activityBreakdown, notes, dreamTitle, dailyRoutineData, dreamEntryData, mentalHealthData, lifestyleAnalysisData } = req.body || {};

    let doc;
    if (lifestyleAnalysisData) {
      // New format from LifestyleAnalysisModal - save the full analysis data
      doc = await LifestyleAnalysis.create({
        user: userId,
        title: dreamTitle || 'Lifestyle Analysis Snapshot',
        dailyRoutineData,
        dreamEntryData,
        mentalHealthData,
        lifestyleAnalysisData,
        notes: notes || ''
      });
    } else {
      // Old format - save chart data directly
      doc = await LifestyleAnalysis.create({ user: userId, correlation, themeFrequency, activityBreakdown, notes });
    }

    try { await logActivity(userId, 'lifestyle_analysis_saved', { id: doc._id }); } catch (_) {}
    res.json({ success: true, item: doc });
  } catch (error) {
    console.error('Save lifestyle analysis error:', error);
    res.status(500).json({ error: 'Failed to save lifestyle analysis', details: error.message });
  }
};

// POST /api/dream-diary/lifestyle/analysis/generate -> AI metrics for charts (FIXED)
const generateLifestyleMetrics = async (req, res) => {
  try {
    console.log('generateLifestyleMetrics called');
    const userId = req.userId || req.user?.id || req.user?._id;
    if (!userId) {
      console.error('No userId found');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Try to get routine, but don't fail if it doesn't exist
    let routine = null;
    try {
      routine = await Routine.findOne({ user: userId }).lean();
    } catch (err) {
      console.warn('Routine lookup failed:', err.message);
    }

    const hasRoutine = Array.isArray(routine?.entries) && routine.entries.length > 0;
    
    // Get recent analyses for mental health data
    let recentAnalyses = [];
    try {
      recentAnalyses = await DreamAnalysis.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
    } catch (err) {
      console.warn('Recent analyses lookup failed:', err.message);
    }

    const routineSummary = { entries: routine?.entries || [], stats: routine?.stats || {}, habits: routine?.habits || [] };
    const mentalHealth = recentAnalyses?.[0]?.emotions ? { 
      emotions: recentAnalyses[0].emotions, 
      stressLevel: Math.round((recentAnalyses[0].stressScore || 50)/10) 
    } : {
      emotions: { joy: 0.3, calmness: 0.4, anxiety: 0.2, sadness: 0.1 },
      stressLevel: 5
    };
    const recentDreams = recentAnalyses.map(a => ({ 
      date: a.createdAt, 
      mood: Object.keys(a.emotions || {}).sort((x,y) => (a.emotions[y]||0)-(a.emotions[x]||0))[0] || 'neutral', 
      title: a.summary || '' 
    }));

    // Try AI generation with timeout, but don't fail if it doesn't work
    let personalized = null;
    let ai = null;
    
    try {
      const aiPromise = Promise.all([
        generatePersonalizedGuidanceText({ routineSummary, mentalHealth, dreamSummary: recentAnalyses?.[0]?.summary || '' }),
        generateLifestyleAnalysisMetricsAI({ routineSummary, mentalHealth, recentDreams })
      ]);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000));
      
      [personalized, ai] = await Promise.race([aiPromise, timeoutPromise]);
      
      const metrics = ai?.metrics || {};
      const emptyMetrics = !metrics || (
        (Array.isArray(metrics.sleepTrend) ? metrics.sleepTrend.length === 0 : true) &&
        (!metrics.sleepDistribution || Object.values(metrics.sleepDistribution).every(v => v === 0))
      );

      if (!emptyMetrics) {
        console.log('Returning AI-generated metrics');
        return res.json({ success: true, ...ai });
      }
    } catch (err) {
      if (err.message === 'AI_TIMEOUT') {
        console.warn('AI generation timed out, using computed metrics');
      } else {
        console.warn('AI generation failed:', err.message);
      }
    }

    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    const days = routineSummary.entries.map(e => ({ date: e.date || e.createdAt || new Date(), items: Array.isArray(e.items)?e.items:[], questionnaire: e.questionnaire || {} }));
    const count = days.length;
    const engagement = days.reduce((acc,d)=> acc + (d.items.length>0?1:0), 0);
    const stress = (mentalHealth.stressLevel || 5);
    const calm = (mentalHealth.emotions?.calmness || 0);
    const anxious = (mentalHealth.emotions?.anxiety || 0);
    const jitter = ((Date.now()%7)-3);
    const sleepGuidanceBoost = String(personalized?.sleep||'').length>0 ? 5 : 0;
    const lifestyleBoost = String(personalized?.lifestyle||'').length>0 ? 3 : 0;

    const sleepTrend = days.slice(-7).map((d,i)=>({ date: new Date(d.date).toISOString().slice(0,10), hours: clamp(7 + ((i%3)-1)*0.5 + (jitter*0.1), 4, 12) }));
    const good = clamp(Math.round(40 + calm*40 - anxious*30 - stress*3 + sleepGuidanceBoost + jitter), 0, 100);
    const okay = clamp(Math.round(40 + (1 - calm)*20 - (stress*2) + lifestyleBoost - Math.max(0, jitter)), 0, 100);
    const poor = clamp(100 - good - okay, 0, 100);
    const emotions = {
      happy: clamp(Math.round((mentalHealth.emotions?.joy || 0.3) * 100),0,100),
      sad: clamp(Math.round((mentalHealth.emotions?.sadness || 0.1) * 100 + Math.max(0, -jitter)),0,100),
      neutral: clamp(50 - Math.round((mentalHealth.emotions?.joy || 0.3)*20),0,100),
      anxious: clamp(Math.round((anxious) * 100 - sleepGuidanceBoost),0,100),
      angry: clamp(Math.round((mentalHealth.emotions?.anger || 0.05) * 100),0,100)
    };
    const wellnessScore = clamp(
      Math.round(
        (mentalHealth.emotions?.joy || 0.3) * 100 * 0.6 +
        (mentalHealth.emotions?.calmness || 0.4) * 100 * 0.4 -
        (mentalHealth.emotions?.anxiety || 0.2) * 100 * 0.7 -
        (mentalHealth.emotions?.sadness || 0.1) * 100 * 0.5 -
        (mentalHealth.emotions?.anger || 0.05) * 100 * 0.4
      ),
      0,
      100
    );
    const comparative = {
      routineScore: clamp(count * 8 + engagement * 5 + lifestyleBoost, 0, 100),
      engagementScore: clamp(Math.round((engagement / Math.max(1,count)) * 100), 0, 100),
      sleepScore: clamp(Math.round(80 - stress*8 + calm*20 - anxious*20 + sleepGuidanceBoost + jitter), 0, 100)
    };
    comparative.wellnessScore = wellnessScore;

    const computed = { metrics: { sleepDistribution: { good, okay, poor }, sleepTrend, emotions, comparative }, summary: 'Lifestyle metrics computed from your daily routine and personalized guidance.' };
    return res.json({ success: true, ...computed });
  } catch (error) {
    console.error('Generate lifestyle metrics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate lifestyle metrics', details: error.message });
  }
};

// Analyze dream with enhanced AI
const analyzeDream = async (req, res) => {
  try {
    const { dreamText, sleepHours, wakeups, stressLevel } = req.body;
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!dreamText || dreamText.trim().length < 10) {
      return res.status(400).json({ error: 'Dream text must be at least 10 characters long' });
    }

    // Extract keywords and emotions
    const keywords = extractKeywords(dreamText);
    const emotions = detectEmotions(dreamText);
    const themes = extractThemes(keywords, dreamText);
    
    // Calculate enhanced scores
    const stressScore = Math.round(
      (emotions.fear * 100 + emotions.anxiety * 100 + emotions.sadness * 70) / 2.7
    );
    const happinessScore = Math.round(
      (emotions.joy * 100 + emotions.excitement * 80 + emotions.calmness * 60) / 2.4
    );

    // Calculate sleep quality grade
    const sleepQuality = calculateSleepQuality(sleepHours, wakeups, stressLevel);
    
    // Calculate mental wellness score
    const mentalWellness = calculateMentalWellness(emotions, stressScore, happinessScore);
    
    // Calculate dream intensity
    const dreamIntensity = calculateDreamIntensity(emotions, themes, dreamText.length);

    // Generate AI analysis
    let aiAnalysis = {};
    try {
      aiAnalysis = await analyzeDreamWithAI(dreamText, emotions, { 
        stressLevel: stressScore / 10,
        happinessLevel: happinessScore / 10,
        sleepHours: sleepHours || 8,
        wakeups: wakeups || 0
      }, {});
    } catch (error) {
      console.error('AI analysis error:', error);
      aiAnalysis = generateFallbackAnalysis(dreamText, emotions, themes);
    }

    // Generate meditation recommendations
    const meditationRecommendations = generateMeditationRecommendations(emotions, themes, stressScore);

    // Create comprehensive analysis
    const analysis = new DreamAnalysis({
      user: userId,
      dreamText,
      summary: aiAnalysis.interpretation || `Your dream explores themes of ${themes.join(', ')}`,
      themes,
      keywords,
      emotions,
      stressScore,
      happinessScore,
      sleepQuality,
      mentalWellness,
      dreamIntensity,
      meditationRecommendations,
      interpretation: aiAnalysis.detailedAnalysis?.psychologicalInterpretation || aiAnalysis.interpretation,
      suggestions: aiAnalysis.suggestions || [],
      emotionalInsights: aiAnalysis.emotionalInsights || '',
      symbolism: aiAnalysis.symbolism || keywords.slice(0, 5),
      patterns: aiAnalysis.patterns || themes.slice(0, 3),
      confidence: aiAnalysis.confidence || 75
    });

    await analysis.save();

    res.json({
      id: analysis._id,
      summary: analysis.summary,
      themes,
      keywords,
      emotions,
      stressScore,
      happinessScore,
      sleepQuality,
      mentalWellness,
      dreamIntensity,
      meditationRecommendations,
      interpretation: analysis.interpretation,
      suggestions: analysis.suggestions,
      emotionalInsights: analysis.emotionalInsights,
      symbolism: analysis.symbolism,
      patterns: analysis.patterns,
      confidence: analysis.confidence,
      createdAt: analysis.createdAt
    });

  } catch (error) {
    console.error('Dream analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze dream', details: error.message });
  }
};

// Get dream diary entries
const getDreamDiary = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const analyses = await DreamAnalysis.find({ user: userId })
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');

    const total = await DreamAnalysis.countDocuments({ user: userId });

    // Calculate summary statistics with error handling
    let stats = { totalDreams: 0, avgStress: 0, avgHappiness: 0 };
    try {
      stats = await calculateDreamStats(userId);
    } catch (statsErr) {
      console.warn('calculateDreamStats error:', statsErr.message);
      // Use safe defaults
      stats = { totalDreams: total || 0, avgStress: 0, avgHappiness: 0 };
    }

    res.json({
      analyses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats
    });

  } catch (error) {
    console.error('Get dream diary error:', error);
    res.status(200).json({ analyses: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 }, stats: { totalDreams: 0, avgStress: 0, avgHappiness: 0 }, message: 'OK (fallback)'});
  }
};

// Save dream entry to diary
const saveDreamEntry = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const source = { ...(req.query || {}), ...(typeof req.body === 'object' ? req.body : {}) };
    const {
      title,
      content,
      analysisId,
      mood,
      intensity,
      tags = [],
      isPublic = false
    } = source;

    // Derive missing fields from analysis if possible to be more tolerant
    let derivedTitle = title;
    let derivedContent = content;
    let analysis = null;
    if ((!derivedTitle || !derivedContent) && analysisId) {
      try {
        analysis = await DreamAnalysis.findById(analysisId).lean();
        if (analysis) {
          if (!derivedTitle) {
            const base = (analysis.dreamText || analysis.summary || 'Dream Entry').trim();
            const words = base.split(/\s+/).slice(0, 6).join(' ');
            derivedTitle = words + (base.split(/\s+/).length > 6 ? '…' : '');
          }
          if (!derivedContent) {
            derivedContent = analysis.dreamText || analysis.summary || 'Dream entry';
          }
        }
      } catch (_) { /* ignore */ }
    }

    if (!derivedTitle) derivedTitle = 'Dream Entry';
    if (!derivedContent) derivedContent = analysis?.dreamText || analysis?.summary || 'Dream entry';

    // Create dream entry
    const dream = new Dream({
      user: userId,
      title: derivedTitle,
      content: derivedContent,
      mood: mood || 'neutral',
      intensity: intensity || 5,
      tags,
      isPublic,
      aiAnalysis: {
        interpretation: '',
        suggestions: [],
        emotionalInsights: '',
        patterns: [],
        confidence: 0,
        generatedAt: new Date()
      }
    });

    // If analysisId provided, link the analysis
    if (analysisId) {
      const analysisDoc = analysis || await DreamAnalysis.findById(analysisId);
      if (analysisDoc && analysisDoc.user.toString() === userId) {
        dream.aiAnalysis = {
          interpretation: analysisDoc.interpretation,
          suggestions: analysisDoc.suggestions,
          emotionalInsights: analysisDoc.emotionalInsights,
          patterns: analysisDoc.patterns,
          confidence: analysisDoc.confidence,
          generatedAt: analysisDoc.createdAt
        };
        dream.visualRepresentation = {
          description: analysisDoc.imagePrompt,
          imageUrl: analysisDoc.imageUrl,
          colors: [],
          shapes: [],
          emotions: Object.keys(analysisDoc.emotions || {})
        };
      }
    }

    await dream.save();

    // Emit live update to this user's room
    try {
      const io = req.app.get('io');
      io && io.to(userId).emit('diary:updated', { id: dream._id, createdAt: dream.createdAt });
    } catch (_) {}

    res.json({
      id: dream._id,
      title: dream.title,
      content: dream.content,
      mood: dream.mood,
      intensity: dream.intensity,
      tags: dream.tags,
      isPublic: dream.isPublic,
      aiAnalysis: dream.aiAnalysis,
      visualRepresentation: dream.visualRepresentation,
      createdAt: dream.createdAt
    });

  } catch (error) {
    console.error('Save dream entry error:', error);
    res.status(500).json({ error: 'Failed to save dream entry', details: error.message });
  }
};

// Update dream entry
const updateDreamEntry = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updates = req.body;

    const dream = await Dream.findOneAndUpdate(
      { _id: id, user: userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!dream) {
      return res.status(404).json({ error: 'Dream entry not found' });
    }

    res.json(dream);

  } catch (error) {
    console.error('Update dream entry error:', error);
    res.status(500).json({ error: 'Failed to update dream entry', details: error.message });
  }
};

// Delete dream entry
const deleteDreamEntry = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const dream = await Dream.findOneAndDelete({ _id: id, user: userId });

    if (!dream) {
      return res.status(404).json({ error: 'Dream entry not found' });
    }

    res.json({ message: 'Dream entry deleted successfully' });

  } catch (error) {
    console.error('Delete dream entry error:', error);
    res.status(500).json({ error: 'Failed to delete dream entry', details: error.message });
  }
};

// ===== Daily Routine Tracker =====

const upsertRoutine = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, habits = [] } = req.body || {};

    const routine = await Routine.findOneAndUpdate(
      { user: userId },
      { $set: { title }, $setOnInsert: { habits: [] } },
      { upsert: true, new: true }
    );

    // Merge habits by name
    const existing = new Map(routine.habits.map(h => [h.name.toLowerCase(), h]));
    habits.forEach(h => {
      const key = (h.name || '').toLowerCase();
      if (!key) return;
      if (!existing.has(key)) {
        routine.habits.push({ name: h.name, goalPerDay: h.goalPerDay || 1, streak: 0, bestStreak: 0 });
      } else {
        const ref = existing.get(key);
        ref.goalPerDay = h.goalPerDay || ref.goalPerDay;
      }
    });

    await routine.save();
    // Emit live update
    try {
      const io = req.app.get('io');
      io && io.to(userId).emit('routine:updated', { when: new Date().toISOString() });
    } catch (_) {}
    res.json(routine);
  } catch (error) {
    console.error('Upsert routine error:', error);
    res.status(500).json({ error: 'Failed to upsert routine', details: error.message });
  }
};

const recordRoutineEntry = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { date, items = [], notes = '' } = req.body || {};
    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(0,0,0,0);

    const routine = await Routine.findOne({ user: userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    // Update streaks for completed items
    const completedNames = new Set(items.filter(i => i.done).map(i => (i.name || '').toLowerCase()));
    routine.habits.forEach(h => {
      const key = h.name.toLowerCase();
      if (completedNames.has(key)) {
        // if lastCompletedDate is yesterday or undefined, increment streak
        const last = h.lastCompletedDate ? new Date(h.lastCompletedDate) : null;
        const yesterday = new Date(entryDate);
        yesterday.setDate(yesterday.getDate() - 1);
        if (!last || last.toDateString() === yesterday.toDateString()) {
          h.streak = (h.streak || 0) + 1;
        } else if (last.toDateString() !== entryDate.toDateString()) {
          h.streak = 1;
        }
        h.bestStreak = Math.max(h.bestStreak || 0, h.streak || 0);
        h.lastCompletedDate = entryDate;
      } else {
        // break streak if today not completed and last completion not today
        const last = h.lastCompletedDate ? new Date(h.lastCompletedDate) : null;
        if (last && last.toDateString() !== entryDate.toDateString()) {
          h.streak = 0;
        }
      }
    });

    // Upsert entry for the day
    const idx = routine.entries.findIndex(e => new Date(e.date).toDateString() === entryDate.toDateString());
    if (idx >= 0) {
      routine.entries[idx].items = items;
      routine.entries[idx].notes = notes;
    } else {
      routine.entries.push({ date: entryDate, items, notes });
    }

    await routine.save();
    res.json(routine);
  } catch (error) {
    console.error('Record routine entry error:', error);
    res.status(500).json({ error: 'Failed to record routine entry', details: error.message });
  }
};

const getRoutineSummary = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { days = 30 } = req.query;
    const routine = await Routine.findOne({ user: userId });
    if (!routine) return res.json({ habits: [], entries: [] });

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    const entries = routine.entries.filter(e => new Date(e.date) >= since);

    // Compute effects
    let mental = 0, physical = 0, totalItems = 0;
    entries.forEach(e => {
      e.items.forEach(i => {
        mental += i.impactMental || 0;
        physical += i.impactPhysical || 0;
        totalItems += 1;
      });
    });
    const avgMentalImpact = totalItems ? +(mental / totalItems).toFixed(2) : 0;
    const avgPhysicalImpact = totalItems ? +(physical / totalItems).toFixed(2) : 0;

    res.json({
      title: routine.title,
      habits: routine.habits,
      entries,
      avgMentalImpact,
      avgPhysicalImpact
    });
  } catch (error) {
    console.error('Get routine summary error:', error);
    res.status(200).json({ habits: [], entries: [], avgMentalImpact: 0, avgPhysicalImpact: 0, message: 'OK (fallback)' });
  }
};

// Get meditation recommendations
const recommendMeditation = async (req, res) => {
  try {
    const { dreamKeywords, emotions, stressLevel } = req.body;

    const recommendations = generateMeditationRecommendations(emotions, dreamKeywords, stressLevel);

    res.json({
      recommendations,
      youtubeVideos: getRecommendedVideos(emotions, dreamKeywords),
      breathingExercises: getBreathingExercises(stressLevel)
    });

  } catch (error) {
    console.error('Meditation recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
};

// Helper function to calculate sleep analytics
const calculateSleepAnalytics = (analyses) => {
  if (!analyses || analyses.length === 0) {
    return {
      sleepQualityDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      avgMentalWellness: 0,
      dreamIntensityDistribution: { low: 0, medium: 0, high: 0 },
      avgStress: 0,
      avgHappiness: 0
    };
  }

  const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let totalWellness = 0;
  const intensityDist = { low: 0, medium: 0, high: 0 };
  let totalStress = 0;
  let totalHappiness = 0;

  analyses.forEach(a => {
    const quality = a.sleepQuality || 'C';
    distribution[quality] = (distribution[quality] || 0) + 1;
    totalWellness += a.mentalWellness || 0;
    const intensity = a.dreamIntensity || 5;
    if (intensity <= 3) intensityDist.low++;
    else if (intensity <= 7) intensityDist.medium++;
    else intensityDist.high++;
    totalStress += a.stressScore || 0;
    totalHappiness += a.happinessScore || 0;
  });

  return {
    sleepQualityDistribution: distribution,
    avgMentalWellness: +(totalWellness / analyses.length).toFixed(2),
    dreamIntensityDistribution: intensityDist,
    avgStress: +(totalStress / analyses.length).toFixed(2),
    avgHappiness: +(totalHappiness / analyses.length).toFixed(2)
  };
};

// Helper function to calculate dream insights
const calculateDreamInsights = (analyses) => {
  if (!analyses || analyses.length === 0) {
    return {
      topThemes: [],
      topEmotions: [],
      recurringSymbols: []
    };
  }

  const themeCounts = {};
  const emotionCounts = {};
  const symbolCounts = {};

  analyses.forEach(a => {
    (a.themes || []).forEach(t => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
    Object.entries(a.emotions || {}).forEach(([e, v]) => {
      emotionCounts[e] = (emotionCounts[e] || 0) + (v || 0);
    });
    (a.symbolism || []).forEach(s => {
      symbolCounts[s] = (symbolCounts[s] || 0) + 1;
    });
  });

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, value]) => ({ emotion, value: +(value / analyses.length).toFixed(2) }));

  const recurringSymbols = Object.entries(symbolCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }));

  return { topThemes, topEmotions, recurringSymbols };
};

// Get sleep analytics
const getSleepAnalytics = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { days = 30 } = req.query;

    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analyses = await DreamAnalysis.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).select('sleepQuality mentalWellness dreamIntensity emotions stressScore happinessScore createdAt');

    const analytics = calculateSleepAnalytics(analyses);

    // Add enhanced aggregates for UI clarity
    if (analyses.length > 0) {
      const emotionsSum = analyses.reduce((sum, a) => {
        Object.entries(a.emotions || {}).forEach(([k, v]) => {
          sum[k] = (sum[k] || 0) + (v || 0);
        });
        return sum;
      }, {});
      const avgEmotions = {};
      Object.keys(emotionsSum).forEach(k => {
        avgEmotions[k] = +(emotionsSum[k] / analyses.length).toFixed(2);
      });

      const dominantEmotion = Object.entries(avgEmotions)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'calmness';

      analytics.avgEmotions = avgEmotions;
      analytics.moodSummary = `Dominant mood: ${dominantEmotion}. Mental wellness averages ${Math.round(analytics.avgMentalWellness)}%.`;
    }

    res.json(analytics);

  } catch (error) {
    console.error('Sleep analytics error:', error);
    res.status(200).json({ message: 'OK (fallback)', sleepQualityDistribution: { A:0,B:0,C:0,D:0,F:0 }, avgMentalWellness: 0, dreamIntensityDistribution: { low:0, medium:0, high:0 } });
  }
};

// Get dream insights
const getDreamInsights = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { days = 30 } = req.query;
    // Ensure userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analyses = await DreamAnalysis.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).select('themes emotions symbolism createdAt');

    const insights = calculateDreamInsights(analyses);
    res.json(insights);
  } catch (error) {
    console.error('Get dream insights error:', error);
    res.status(200).json({ topThemes: [], topEmotions: [], recurringSymbols: [], message: 'OK (fallback)' });
  }
};


// Helper functions
const extractKeywords = (text) => {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'was', 'were', 'is', 'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'that', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

const detectEmotions = (text) => {
  const textLower = text.toLowerCase();
  
  const emotionKeywords = {
    joy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'delighted', 'cheerful', 'blissful', 'ecstatic', 'love', 'loved'],
    fear: ['scared', 'fear', 'terrified', 'afraid', 'frightened', 'horror', 'panic', 'nightmare', 'monster', 'danger'],
    anxiety: ['anxious', 'worried', 'nervous', 'stressed', 'uneasy', 'tense', 'restless', 'overwhelmed', 'panic'],
    calmness: ['calm', 'peaceful', 'serene', 'relaxed', 'tranquil', 'quiet', 'gentle', 'soothing', 'zen'],
    sadness: ['sad', 'depressed', 'lonely', 'hopeless', 'crying', 'tears', 'miserable', 'grief', 'sorrow'],
    excitement: ['excited', 'thrilled', 'energized', 'enthusiastic', 'eager', 'passionate', 'vibrant']
  };
  
  const emotions = {
    joy: 0,
    fear: 0,
    anxiety: 0,
    calmness: 0,
    sadness: 0,
    excitement: 0
  };
  
  Object.keys(emotionKeywords).forEach(emotion => {
    emotionKeywords[emotion].forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        emotions[emotion] += matches.length;
      }
    });
  });
  
  const total = Object.values(emotions).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(emotions).forEach(key => {
      emotions[key] = parseFloat((emotions[key] / total).toFixed(2));
    });
  } else {
    emotions.calmness = 0.5;
  }
  
  return emotions;
};

const extractThemes = (keywords, text) => {
  const themeMap = {
    'flying': ['flying', 'flight', 'soaring', 'airborne', 'wings'],
    'water': ['water', 'ocean', 'sea', 'river', 'swimming', 'drowning'],
    'falling': ['falling', 'dropped', 'plummeting'],
    'chase': ['chased', 'running', 'escaping', 'pursued'],
    'death': ['death', 'dying', 'dead', 'killed'],
    'family': ['mother', 'father', 'sister', 'brother', 'family'],
    'work': ['work', 'office', 'boss', 'job', 'career'],
    'school': ['school', 'teacher', 'exam', 'test', 'class'],
    'love': ['love', 'romance', 'kiss', 'relationship'],
    'freedom': ['freedom', 'free', 'liberation', 'escape'],
    'transformation': ['change', 'transform', 'becoming', 'metamorphosis']
  };
  
  const themes = [];
  const textLower = text.toLowerCase();
  
  Object.keys(themeMap).forEach(theme => {
    const hasTheme = themeMap[theme].some(word => 
      textLower.includes(word) || keywords.includes(word)
    );
    if (hasTheme) {
      themes.push(theme);
    }
  });
  
  return themes.length > 0 ? themes : ['exploration', 'discovery'];
};

const calculateSleepQuality = (sleepHours, wakeups, stressLevel) => {
  let score = 0;
  
  // Sleep hours scoring (0-40 points)
  if (sleepHours >= 7 && sleepHours <= 9) score += 40;
  else if (sleepHours >= 6 && sleepHours <= 10) score += 30;
  else if (sleepHours >= 5 && sleepHours <= 11) score += 20;
  else score += 10;
  
  // Wakeups scoring (0-30 points)
  if (wakeups === 0) score += 30;
  else if (wakeups <= 2) score += 20;
  else if (wakeups <= 4) score += 10;
  
  // Stress level scoring (0-30 points)
  if (stressLevel <= 3) score += 30;
  else if (stressLevel <= 5) score += 20;
  else if (stressLevel <= 7) score += 10;
  
  // Convert to letter grade
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const calculateMentalWellness = (emotions, stressScore, happinessScore) => {
  const positiveEmotions = emotions.joy + emotions.calmness + emotions.excitement;
  const negativeEmotions = emotions.fear + emotions.anxiety + emotions.sadness;
  
  let wellness = 50; // Base score
  
  wellness += (happinessScore - 5) * 5; // Happiness contribution
  wellness -= (stressScore - 5) * 3; // Stress penalty
  wellness += positiveEmotions * 20; // Positive emotions bonus
  wellness -= negativeEmotions * 15; // Negative emotions penalty
  
  return Math.max(0, Math.min(100, Math.round(wellness)));
};

const calculateDreamIntensity = (emotions, themes, textLength) => {
  const emotionIntensity = Object.values(emotions).reduce((a, b) => a + b, 0);
  const themeIntensity = themes.length * 0.1;
  const lengthIntensity = Math.min(textLength / 1000, 1);
  
  const totalIntensity = (emotionIntensity + themeIntensity + lengthIntensity) / 3;
  
  if (totalIntensity >= 0.7) return 'high';
  if (totalIntensity >= 0.4) return 'medium';
  return 'low';
};

const generateMeditationRecommendations = (emotions, themes, stressLevel) => {
  const recommendations = [];
  
  if (emotions.anxiety > 0.3 || stressLevel > 7) {
    recommendations.push({
      type: 'breathing',
      title: '4-7-8 Breathing',
      description: 'Inhale for 4, hold for 7, exhale for 8. Repeat 4 times.',
      duration: '5 minutes',
      difficulty: 'beginner'
    });
  }
  
  if (emotions.fear > 0.3) {
    recommendations.push({
      type: 'guided',
      title: 'Fear Release Meditation',
      description: 'Visualize releasing fears and embracing inner strength.',
      duration: '10 minutes',
      difficulty: 'intermediate'
    });
  }
  
  if (themes.includes('water')) {
    recommendations.push({
      type: 'visualization',
      title: 'Ocean Wave Meditation',
      description: 'Imagine gentle ocean waves washing away stress.',
      duration: '15 minutes',
      difficulty: 'beginner'
    });
  }
  
  if (emotions.calmness > 0.3) {
    recommendations.push({
      type: 'mindfulness',
      title: 'Present Moment Awareness',
      description: 'Focus on the present moment and your breathing.',
      duration: '8 minutes',
      difficulty: 'beginner'
    });
  }
  
  return recommendations.slice(0, 3);
};

const getRecommendedVideos = (emotions, themes) => {
  const videos = [];
  
  if (emotions.anxiety > 0.3) {
    videos.push({
      title: 'Anxiety Relief Meditation',
      url: 'https://www.youtube.com/watch?v=ZToicYcHIOU',
      duration: '10 minutes',
      type: 'meditation'
    });
  }
  
  if (themes.includes('flying')) {
    videos.push({
      title: 'Freedom and Liberation Meditation',
      url: 'https://www.youtube.com/watch?v=inpok4MKVLM',
      duration: '15 minutes',
      type: 'visualization'
    });
  }
  
  videos.push({
    title: 'Deep Sleep Meditation',
    url: 'https://www.youtube.com/watch?v=1ZYbU82GVz4',
    duration: '20 minutes',
    type: 'sleep'
  });
  
  return videos.slice(0, 3);
};

const getBreathingExercises = (stressLevel) => {
  const exercises = [];
  
  if (stressLevel > 7) {
    exercises.push({
      name: 'Box Breathing',
      pattern: '4-4-4-4',
      description: 'Inhale, hold, exhale, hold - each for 4 counts',
      rounds: 5
    });
  }
  
  exercises.push({
    name: 'Deep Belly Breathing',
    pattern: 'Slow and deep',
    description: 'Breathe deeply into your belly, expanding on inhale',
    rounds: 10
  });
  
  return exercises;
};

const calculateDreamStats = async (userId) => {
  const totalDreams = await DreamAnalysis.countDocuments({ user: userId });
  const avgStress = await DreamAnalysis.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, avgStress: { $avg: '$stressScore' } } }
  ]);
  const avgHappiness = await DreamAnalysis.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, avgHappiness: { $avg: '$happinessScore' } } }
  ]);
  
  return {
    totalDreams,
    avgStress: avgStress[0]?.avgStress || 0,
    avgHappiness: avgHappiness[0]?.avgHappiness || 0
  };
};

// Duplicate calculateSleepAnalytics and calculateDreamInsights functions removed - using the ones defined at lines 802-884

const generateFallbackAnalysis = (dreamText, emotions, themes) => {
  return {
    interpretation: `Your dream explores themes of ${themes.join(', ')}. The emotional landscape suggests you're processing important life experiences.`,
    suggestions: [
      'Keep a dream journal to track patterns',
      'Reflect on how these themes relate to your waking life',
      'Practice stress-reduction techniques before bed'
    ],
    emotionalInsights: `The ${Object.keys(emotions).filter(e => emotions[e] > 0.1).join(', ')} emotions in your dream indicate active emotional processing.`,
    symbolism: themes.slice(0, 3),
    patterns: ['emotional processing', 'subconscious communication'],
    confidence: 65
  };
};

// ===== Mental Health & Wellness =====
// POST /api/dream-diary/mental-health -> save mental health entry (FIXED - more flexible)
const mentalHealth = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Handle both old flat format and new nested mentalHealthData format
    const payload = req.body && req.body.mentalHealthData
      ? req.body.mentalHealthData
      : (req.body || {});

    // Extract all possible fields from nested structure
    let lifestyleGuidance = payload.lifestyleGuidance || '';
    let sleepAdvice = payload.sleepAdvice || '';
    let stressGuidance = payload.stressGuidance || '';
    let userMeditationChoice = payload.userMeditationChoice || payload.meditationPractices?.[0]?.name || '';

    // Map meditation practice names to schema enum values
    const meditationMap = {
      'breathing': 'breathing',
      'Breathing Exercise': 'breathing',
      'breathing exercise': 'breathing',
      'ocean': 'ocean',
      'Ocean Sounds': 'ocean',
      'ocean sounds': 'ocean',
      'tuii': 'tuii',
      'Tuii Healing Bell': 'tuii',
      'tuii healing bell': 'tuii'
    };
    
    // Normalize meditation choice to enum value
    const normalizedMeditation = meditationMap[userMeditationChoice] || meditationMap[userMeditationChoice?.toLowerCase()] || 'breathing';

    // More flexible validation - allow partial data or any non-empty string
    const hasAnyData = 
      (lifestyleGuidance && lifestyleGuidance.trim().length > 0) ||
      (sleepAdvice && sleepAdvice.trim().length > 0) ||
      (stressGuidance && stressGuidance.trim().length > 0) ||
      (payload.personalizedGuidance && payload.personalizedGuidance.trim().length > 0);
    
    if (!hasAnyData) {
      console.warn('Mental health submission rejected - no valid data fields:', {
        hasLifestyle: !!lifestyleGuidance,
        hasSleep: !!sleepAdvice,
        hasStress: !!stressGuidance,
        hasMeditation: !!userMeditationChoice,
        hasPersonalized: !!payload.personalizedGuidance,
        payloadKeys: Object.keys(payload)
      });
      return res.status(400).json({ 
        success: false, 
        error: 'At least one field is required',
        message: 'Please provide at least one of: lifestyleGuidance, sleepAdvice, stressGuidance, or userMeditationChoice'
      });
    }

    // Ensure all required fields have non-empty values (schema requirement)
    lifestyleGuidance = (lifestyleGuidance && lifestyleGuidance.trim()) || 'No lifestyle guidance provided';
    sleepAdvice = (sleepAdvice && sleepAdvice.trim()) || 'No sleep advice provided';
    stressGuidance = (stressGuidance && stressGuidance.trim()) || 'No stress guidance provided';

    // Find or create Dream Diary document
    let dreamDiary = await DreamDiary.findOne({ user: userId });
    if (!dreamDiary) {
      dreamDiary = await DreamDiary.create({ 
        user: userId, 
        dreamEntries: [],
        mentalHealthEntries: []
      });
    }

    // Create mental health entry with all required fields
    const mentalHealthEntry = {
      date: new Date(),
      lifestyleGuidance: lifestyleGuidance,
      sleepAdvice: sleepAdvice,
      stressGuidance: stressGuidance,
      userMeditationChoice: normalizedMeditation, // Use normalized enum value
      timestamp: new Date()
    };

    // Add to mentalHealthEntries array
    if (!Array.isArray(dreamDiary.mentalHealthEntries)) {
      dreamDiary.mentalHealthEntries = [];
    }
    dreamDiary.mentalHealthEntries.push(mentalHealthEntry);
    
    try {
      await dreamDiary.save();
      console.log('✅ Mental health entry saved successfully for user:', userId);
    } catch (saveError) {
      console.error('❌ Failed to save mental health entry:', saveError);
      console.error('❌ Save error details:', {
        message: saveError.message,
        name: saveError.name,
        errors: saveError.errors,
        mentalHealthEntry: mentalHealthEntry
      });
      throw saveError; // Re-throw to be caught by outer catch
    }

    try { await logActivity(userId, 'mental_health_entry_saved', { id: mentalHealthEntry._id }); } catch (_) {}

    res.status(200).json({ 
      success: true, 
      entry: mentalHealthEntry,
      message: 'Mental health entry saved successfully'
    });

  } catch (error) {
    console.error('Mental health entry error:', error);
    res.status(500).json({ error: 'Failed to save mental health entry', details: error.message });
  }
};

// Update an analysis with an image URL and data URL
const updateAnalysisWithImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, imageDataUrl } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Analysis ID is required' });
    }
    
    if (!imageUrl && !imageDataUrl) {
      return res.status(400).json({ error: 'Either imageUrl or imageDataUrl is required' });
    }

    const analysis = await DreamAnalysis.findById(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Ensure the user owns this analysis
    if (String(analysis.user) !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this analysis' });
    }

    // Update image fields
    const updates = { 
      ...(imageUrl && { imageUrl }),
      ...(imageDataUrl && { imageDataUrl }),
      imageGeneratedAt: new Date(),
      imageMeta: {
        ...(analysis.imageMeta || {}),
        updatedAt: new Date().toISOString()
      }
    };

    const updatedAnalysis = await DreamAnalysis.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Log the activity
    await logActivity(req.user.id, 'ANALYSIS_IMAGE_UPDATE', {
      analysisId: id,
      hasImageUrl: !!imageUrl,
      hasDataUrl: !!imageDataUrl
    });

    res.json({ 
      success: true, 
      analysis: updatedAnalysis 
    });
  } catch (error) {
    console.error('Error updating analysis with image:', error);
    res.status(500).json({ 
      error: 'Failed to update analysis with image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateImage,
  analyzeDream,
  recommendMeditation,
  getDreamDiary,
  saveDreamEntry,
  updateDreamEntry,
  deleteDreamEntry,
  getSleepAnalytics,
  getDreamInsights,
  upsertRoutine,
  recordRoutineEntry,
  getRoutineSummary,
  submitDailyRoutine,
  submitDreamEntry,
  fetchAnalysis,
  wellnessGuidance,
  personalizedGuidance,
  lmStudioPersonalizedGuidance,
  getLifestyleAnalysis,
  saveLifestyleAnalysis,
  generateLifestyleMetrics,
  mentalHealth,
  updateAnalysisWithImage
};
