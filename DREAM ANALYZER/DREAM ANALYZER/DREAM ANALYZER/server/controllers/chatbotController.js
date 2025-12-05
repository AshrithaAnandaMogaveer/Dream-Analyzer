const DreamAnalysis = require('../models/DreamAnalysis');
const ImageCache = require('../models/ImageCache');
const crypto = require('crypto');
const axios = require('axios');
const { extractMoodLevelsFromText, generateDreamImage } = require('../services/aiService');
const { logActivity } = require('../controllers/recentActivityController');

// Keyword extraction with emotional context
const extractKeywords = (text) => {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'was', 'were', 'is', 'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'that', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'then', 'over', 'under', 'above', 'below', 'into', 'onto', 'from', 'across', 'between', 'within', 'without', 'feeling', 'feel', 'felt'];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Count frequency
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  // Get top keywords
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
};

// Detect emotions from text
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
  
  // Count emotion keywords
  Object.keys(emotionKeywords).forEach(emotion => {
    emotionKeywords[emotion].forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        emotions[emotion] += matches.length;
      }
    });
  });
  
  // Normalize to 0-1 scale
  const total = Object.values(emotions).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(emotions).forEach(key => {
      emotions[key] = parseFloat((emotions[key] / total).toFixed(2));
    });
  } else {
    // Default neutral emotions
    emotions.calmness = 0.5;
  }
  
  return emotions;
};

// Extract themes from keywords
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

// POST /api/chatbot/analyze
exports.analyzeDream = async (req, res) => {
  try {
    // Be tolerant about input names and sources
    const rawText = (req.body && (req.body.text ?? req.body.dreamText ?? req.body.message)) ?? req.query?.text;
    const text = typeof rawText === 'string' ? rawText : '';
    const userId = (req.body && req.body.userId) || req.userId;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Dream text must be at least 10 characters long' });
    }
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID required' });
    }
    
    // Log the raw input once
    logActivity(userId, 'input', { text: text.slice(0, 2000) });

    // Compute hash for caching
    const textHash = crypto.createHash('sha256').update(text).digest('hex');

    // ❌ CACHE DISABLED - Always generate fresh LM Studio analysis
    console.log('🔄 Cache disabled - generating fresh LM Studio analysis for every request');
    
    // Extract keywords and emotions
    const keywords = extractKeywords(text);
    const emotions = detectEmotions(text);
    const themes = extractThemes(keywords, text);
    
    // Calculate stress and happiness scores
    const stressScore = Math.round(
      (emotions.fear * 100 + emotions.anxiety * 100 + emotions.sadness * 70) / 2.7
    );
    const happinessScore = Math.round(
      (emotions.joy * 100 + emotions.excitement * 80 + emotions.calmness * 60) / 2.4
    );
    
    // Prepare variables that will be populated by LM Studio
    let aiSummary = null;
    let interpretation = null;
    let suggestions = null;
    let aiAnalysis = {};
    
    // Generate image prompt
    const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
      emotions[a] > emotions[b] ? a : b
    );
    
    const imagePrompt = `Dreamy surreal illustration of ${themes.join(' and ')}, ${dominantEmotion} atmosphere, ethereal pastel colors, symbolic and artistic`;
    
    // Build default symbolism and sanitize AI symbolism to match schema
    const defaultSymbolism = (keywords || []).slice(0, 5).map(k => ({ symbol: String(k), meaning: '' }));
    const sanitizeSymbolism = (sym) => {
      if (!Array.isArray(sym)) return defaultSymbolism;
      return sym
        .map((entry) => {
          if (!entry) return null;
          if (typeof entry === 'string') {
            return { symbol: entry, meaning: '' };
          }
          if (typeof entry === 'object') {
            const symbol = entry.symbol || entry.word || entry.name || entry.key || '';
            const meaning = entry.meaning || entry.definition || entry.note || '';
            if (!symbol || typeof symbol !== 'string') return null;
            return { symbol, meaning: String(meaning || '') };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 10);
    };

    let interpretationDetails;
    let sections = null;
    let sectionEmotions = null;
    let remedies = null;

    const baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1/chat/completions';
    const model = process.env.LM_STUDIO_MODEL || 'local-model';
    // Mistral only supports user/assistant roles, so combine system prompt into user message
    const userPrompt = `Analyze this dream: "${text.slice(0,800)}"

Write your analysis in this format:

SUMMARY: [Summarize the dream in 2-3 sentences]
INTRODUCTION: [Introduce your analysis in 2-3 sentences]
OVERVIEW: [Describe main themes in 3-4 sentences]
SYMBOL1: [First key symbol name]
MEANING1: [Explain this symbol in 2 sentences]
SYMBOL2: [Second key symbol name]
MEANING2: [Explain this symbol in 2 sentences]
SYMBOL3: [Third key symbol name]
MEANING3: [Explain this symbol in 2 sentences]
PSYCHOLOGICAL: [Psychological analysis in 4-5 sentences]
CULTURAL: [Cultural meanings in 2-3 sentences]
WAKING_LIFE: [Connect to real life in 3-4 sentences]
ADVICE: [Insights and advice in 3-4 sentences]
REMEDY1: [One practical suggestion]
REMEDY2: [One practical suggestion]
REMEDY3: [One practical suggestion]
REMEDY4: [One practical suggestion]`;

    const sanitizeJson = (raw) => {
      if (typeof raw !== 'string') return '{}';
      let trimmed = raw.trim();
      
      // Remove markdown code blocks
      if (trimmed.startsWith('```')) {
        trimmed = trimmed.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      }
      
      // Remove any text before the first brace
      const firstBrace = trimmed.indexOf('{');
      if (firstBrace > 0) {
        trimmed = trimmed.substring(firstBrace);
      }
      
      // Remove any text after the closing brace
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace < trimmed.length - 1) {
        trimmed = trimmed.substring(0, lastBrace + 1);
      }
      
      // CRITICAL: Replace single quotes with double quotes for JSON keys and values
      // But be careful not to replace apostrophes inside words
      trimmed = trimmed.replace(/'([a-zA-Z_][a-zA-Z0-9_]*)'\s*:/g, '"$1":'); // 'key': -> "key":
      trimmed = trimmed.replace(/:\s*'([^']*)'/g, ':"$1"'); // : 'value' -> : "value"
      
      // Fix unquoted string values
      trimmed = trimmed.replace(/":\s*([^"{\[\d\-][^,}\]]*?)([,}\]])/g, (match, value, ending) => {
        const val = value.trim();
        if (/^(\d+\.?\d*|true|false|null)$/i.test(val)) {
          return match;
        }
        return `": "${val}"${ending}`;
      });
      
      // Fix trailing commas
      trimmed = trimmed.replace(/,(\s*[\]}])/g, '$1');
      
      // Fix missing commas between fields
      trimmed = trimmed.replace(/"\s*"([a-zA-Z])/g, '","$1');
      trimmed = trimmed.replace(/\}\s*"([a-zA-Z])/g, '},"$1');
      
      // Fix missing commas in arrays
      trimmed = trimmed.replace(/\}\s*\{/g, '},{');
      
      // Fix missing commas after arrays
      trimmed = trimmed.replace(/\]\s*"([a-zA-Z])/g, '],"$1');
      
      // Remove line breaks and extra whitespace inside string values
      trimmed = trimmed.replace(/":\s*"([^"]*?)"/g, (match, content) => {
        const cleaned = content
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\bof\s+of\b/gi, 'of')
          .replace(/\s+([.,!?])/g, '$1')
          .trim();
        return `": "${cleaned}"`;
      });
      
      // Remove excessive whitespace
      trimmed = trimmed.replace(/\s{2,}/g, ' ');
      
      // Remove any trailing comments or text (like "// NO trailing commas...")
      trimmed = trimmed.replace(/\/\/.*$/gm, '');
      
      return trimmed;
    };

    console.log('🔵 Attempting LM Studio call...');
    console.log('📍 URL:', baseUrl);
    console.log('🤖 Model:', model);
    console.log('⏱️ Timeout:', process.env.LM_STUDIO_TIMEOUT_MS || 15000, 'ms');
    
    try {
      const resp = await axios.post(
        baseUrl,
        {
          model,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 1200,
          stream: false
        },
        { 
          timeout: Number(process.env.LM_STUDIO_TIMEOUT_MS || 120000),
          validateStatus: (status) => status < 500
        }
      );
      
      // Check for errors
      if (resp.status !== 200) {
        console.error('❌ LM Studio returned error status:', resp.status);
        console.error('Response data:', JSON.stringify(resp.data, null, 2));
        
        // If model crashed, throw to use fallback
        if (resp.data?.error && resp.data.error.includes('crashed')) {
          console.error('⚠️ Model crashed - will use fallback analysis');
          throw new Error('Model crashed');
        }
        
        throw new Error(`LM Studio error: ${resp.status} - ${JSON.stringify(resp.data)}`);
      }
      
      console.log('✅ LM Studio responded successfully!');
      const raw = resp?.data?.choices?.[0]?.message?.content?.trim() || '';
      console.log('📥 Raw response (first 500 chars):', raw.substring(0, 500));
      
      // Parse the plain text format into structured JSON
      const parseTextResponse = (text) => {
        const extract = (label) => {
          // More flexible regex that handles various formats
          const regex = new RegExp(`${label}:\\s*\\[?([^\\[\\]]+?)(?=\\n\\s*[A-Z_]+:|$)`, 'is');
          const match = text.match(regex);
          if (match) {
            let content = match[1].trim();
            // Clean up whitespace but preserve sentence structure
            content = content.replace(/\s+/g, ' ').trim();
            // Remove any trailing punctuation artifacts
            content = content.replace(/\s+([.,!?])/g, '$1');
            return content;
          }
          return '';
        };
        
        const symbols = [];
        for (let i = 1; i <= 5; i++) {
          const symbol = extract(`SYMBOL${i}`);
          const meaning = extract(`MEANING${i}`);
          if (symbol && meaning && symbol.length > 2 && meaning.length > 10) {
            symbols.push({ symbol, meaning });
          }
        }
        
        // If no symbols found, extract from keywords
        if (symbols.length === 0 && keywords.length > 0) {
          keywords.slice(0, 3).forEach(kw => {
            symbols.push({ 
              symbol: kw.charAt(0).toUpperCase() + kw.slice(1), 
              meaning: `This symbol represents an important element in your dream, reflecting aspects of ${themes[0] || 'your subconscious mind'} and personal experiences.` 
            });
          });
        }
        
        // Extract all sections with better fallbacks
        const summary = extract('SUMMARY');
        const intro = extract('INTRODUCTION');
        const overview = extract('OVERVIEW');
        const psych = extract('PSYCHOLOGICAL');
        const cultural = extract('CULTURAL');
        const waking = extract('WAKING_LIFE');
        const advice = extract('ADVICE');
        
        return {
          sections: {
            yourDream: summary && summary.length > 20 ? summary : text.slice(0, 300),
            introduction: intro && intro.length > 30 ? intro : `This dream reveals fascinating insights about ${themes.join(', ')}. The symbols and emotions present offer valuable clues about your subconscious mind.`,
            overview: overview && overview.length > 30 ? overview : `The dream centers on themes of ${themes.join(' and ')}, featuring ${keywords.slice(0,2).join(' and ')} as key elements.`,
            keySymbolsAndElements: symbols,
            psychologicalInterpretation: psych && psych.length > 40 ? psych : `From a psychological perspective, this dream reflects your current emotional state and inner processing. The themes of ${themes[0] || 'personal growth'} suggest active subconscious work.`,
            culturalContext: cultural && cultural.length > 30 ? cultural : `Across various cultures, dreams about ${keywords[0] || 'these themes'} carry symbolic meanings related to transformation and personal development.`,
            connectionsToWakingLife: waking && waking.length > 30 ? waking : `Consider how the themes of ${themes.join(' and ')} might relate to your current life circumstances, relationships, or challenges you're facing.`,
            summaryAndAdvice: advice && advice.length > 30 ? advice : `Reflect on the themes and symbols in this dream. Consider keeping a dream journal to track patterns and deepen your self-understanding.`
          },
          emotions: emotions,
          remedies: [
            extract('REMEDY1'),
            extract('REMEDY2'),
            extract('REMEDY3'),
            extract('REMEDY4')
          ].filter(r => r && r.length > 10)
        };
      };
      
      let parsed;
      try {
        parsed = parseTextResponse(raw);
      } catch(jsonErr) {
        console.log('⚠️ Failed to parse response:', jsonErr.message);
        // Use fallback with empty sections
        parsed = {
          sections: {
            yourDream: text,
            introduction: '',
            overview: '',
            keySymbolsAndElements: [],
            psychologicalInterpretation: '',
            culturalContext: '',
            connectionsToWakingLife: '',
            summaryAndAdvice: ''
          },
          emotions: emotions,
          remedies: []
        };
      }
      const pSections = parsed.sections || {};
      const minLen = (s, n) => typeof s === 'string' && s.trim().length >= n;
      const normalizeSymbols = (arr) => {
        if (!Array.isArray(arr)) return (keywords || []).slice(0,3).map(kw => ({ symbol: kw, meaning: '' }));
        return arr
          .map((entry) => {
            if (!entry) return null;
            if (typeof entry === 'string') return { symbol: entry, meaning: '' };
            if (typeof entry === 'object') {
              const symbol = String(entry.symbol || entry.word || entry.name || '').trim();
              const meaning = String(entry.meaning || entry.definition || '').trim();
              if (!symbol) return null;
              return { symbol, meaning };
            }
            return null;
          })
          .filter(s => s && s.symbol && s.symbol.length >= 3)
          .filter(Boolean)
          .slice(0, 8);
      };
      sections = {
        yourDream: typeof pSections.yourDream === 'string' && pSections.yourDream.trim() ? pSections.yourDream : text,
        introduction: typeof pSections.introduction === 'string' ? pSections.introduction : '',
        overview: typeof pSections.overview === 'string' ? pSections.overview : `Detected themes: ${themes.join(', ')}`,
        keySymbolsAndElements: normalizeSymbols(pSections.keySymbolsAndElements),
        psychologicalInterpretation: typeof pSections.psychologicalInterpretation === 'string' ? pSections.psychologicalInterpretation : '',
        culturalContext: typeof pSections.culturalContext === 'string' ? pSections.culturalContext : '',
        connectionsToWakingLife: typeof pSections.connectionsToWakingLife === 'string' ? pSections.connectionsToWakingLife : '',
        summaryAndAdvice: typeof pSections.summaryAndAdvice === 'string' ? pSections.summaryAndAdvice : ''
      };
      sectionEmotions = parsed.emotions && typeof parsed.emotions === 'object' ? parsed.emotions : emotions;
      remedies = Array.isArray(parsed.remedies) ? parsed.remedies.slice(0,6) : [];

      // Check if we have the minimum required content
      const hasMinimumContent = (
        sections.yourDream && sections.yourDream.length > 20 &&
        sections.introduction && sections.introduction.length > 30 &&
        sections.overview && sections.overview.length > 30
      );

      if (!hasMinimumContent) {
        console.log('⚠️ Analysis incomplete - using what we have');
      } else {
        console.log('✅ LM Studio analysis parsed successfully');
      }
      interpretationDetails = {
        yourDream: sections.yourDream,
        introduction: sections.introduction,
        overview: sections.overview,
        keySymbolsAndElements: sections.keySymbolsAndElements,
        psychologicalInterpretations: sections.psychologicalInterpretation,
        culturalContext: sections.culturalContext,
        connectionsToWakingLife: sections.connectionsToWakingLife,
        summaryAndInsights: sections.summaryAndAdvice
      };
      aiSummary = sections.overview || sections.introduction || sections.yourDream;
      suggestions = remedies; // Use remedies as suggestions
      console.log('✅ Remedies/Suggestions generated:', remedies?.length || 0, 'items');
      interpretationDetails = {
        yourDream: sections.yourDream,
        introduction: sections.introduction,
        overview: sections.overview,
        keySymbolsAndElements: sections.keySymbolsAndElements,
        psychologicalInterpretations: sections.psychologicalInterpretation,
        culturalContext: sections.culturalContext,
        connectionsToWakingLife: sections.connectionsToWakingLife,
        summaryAndInsights: sections.summaryAndAdvice
      };
    } catch (e) {
      console.error('❌ LM Studio call failed:', e.message);
      console.error('   Error code:', e.code);
      console.log('🟡 Using DYNAMIC fallback analysis based on dream content');
      
      // Build detailed, personalized fallback analysis (like personalized guidance does)
      const keySymbols = (keywords || []).slice(0, 5).map(kw => ({ 
        symbol: kw.charAt(0).toUpperCase() + kw.slice(1), 
        meaning: `The symbol "${kw}" in your dream represents aspects of ${themes[0] || 'your inner world'}, reflecting your personal experiences and subconscious thoughts.` 
      }));
      const emotionText = Object.keys(emotions).sort((a,b) => emotions[b] - emotions[a])[0] || 'contemplative';
      const themeText = themes.slice(0, 2).join(' and ') || 'personal growth';
      const keywordText = keywords.slice(0, 2).join(' and ') || 'symbolic elements';
      interpretationDetails = {
        yourDream: text,
        introduction: `Your dream reveals fascinating patterns related to ${themeText}. The ${emotionText} tone and presence of ${keywordText} offer valuable insights into your subconscious mind and current emotional state.`,
        overview: `This dream centers on themes of ${themes.join(', ')}, featuring ${keywordText} as central elements. The narrative suggests you're actively processing experiences related to ${themes[0] || 'personal development'}.`,
        keySymbolsAndElements: keySymbols,
        psychologicalInterpretations: `From a psychological perspective, this dream reflects your current emotional landscape and inner processing. The presence of ${keywordText} suggests you're working through ${themes[0] || 'important life experiences'}. Dreams serve as your mind's way of integrating daily experiences, processing emotions, and exploring unresolved thoughts. The ${emotionText} emotional tone indicates how you're relating to these themes in your waking life.`,
        culturalContext: `Across various cultures and traditions, dreams about ${keywords[0] || 'these themes'} carry rich symbolic meanings. In many traditions, such dreams represent transformation, inner wisdom, or messages from the subconscious. The symbols in your dream connect to universal human experiences and archetypal patterns that have been recognized throughout history. Different cultures might interpret ${keywords[0] || 'these elements'} as signs of personal growth, spiritual development, or important life transitions.`,
        connectionsToWakingLife: `Consider how the themes of ${themeText} might relate to your current life circumstances. Are there situations, relationships, or challenges that resonate with these dream elements? The ${emotionText} emotions you experienced may mirror feelings you're processing in your daily life. Reflect on recent events or ongoing situations involving ${themes[0] || 'personal growth'}. Your dream may be highlighting areas that need attention or offering perspective on current challenges.`,
        summaryAndInsights: `This dream highlights your journey through ${themeText}, with the symbols suggesting a period of ${emotions.joy > 0.3 ? 'positive growth and self-discovery' : emotions.fear > 0.3 ? 'working through challenges and building resilience' : 'self-reflection and deeper understanding'}. Key insights: Your subconscious is actively processing ${themes[0] || 'life experiences'}, the ${emotionText} tone reflects your current emotional state, and the symbols point to ${themes[1] || 'personal development'}. Consider keeping a dream journal to track patterns, reflect on how these themes connect to your waking life, and practice mindfulness to deepen your self-understanding.`
      };
      sectionEmotions = emotions;
      remedies = [
        `Keep a dream journal to track recurring patterns and themes related to ${themes[0] || 'your dreams'}`,
        `Reflect on how ${themeText} connects to your current life experiences and relationships`,
        `Practice mindfulness or meditation to better understand your ${emotionText} feelings`,
        `Consider discussing your dreams with someone you trust to gain new perspectives`,
        `Explore the personal meaning of ${keywords[0] || 'key symbols'} in your life context`
      ];
      sections = {
        yourDream: interpretationDetails.yourDream || text,
        introduction: interpretationDetails.introduction || '',
        overview: interpretationDetails.overview || `Themes present: ${themes.join(', ')}`,
        keySymbolsAndElements: interpretationDetails.keySymbolsAndElements || (keywords || []).slice(0,3).map(kw => ({ symbol: kw, meaning: '' })),
        psychologicalInterpretation: interpretationDetails.psychologicalInterpretations || '',
        culturalContext: interpretationDetails.culturalContext || '',
        connectionsToWakingLife: interpretationDetails.connectionsToWakingLife || '',
        summaryAndAdvice: interpretationDetails.summaryAndInsights || ''
      };
      aiSummary = sections.overview || sections.introduction || sections.yourDream;
      suggestions = remedies; // Use remedies as suggestions in fallback too
      
      console.log('✅ Dynamic fallback analysis generated successfully');
      console.log('   Sections:', Object.keys(sections));
      console.log('   Introduction length:', sections.introduction?.length || 0);
      console.log('   Overview length:', sections.overview?.length || 0);
      console.log('   Psychological length:', sections.psychologicalInterpretation?.length || 0);
    }

    // Create dream analysis record with enhanced fields
    const analysis = new DreamAnalysis({
      user: userId,
      dreamText: text,
      textHash,
      summary: aiSummary,
      themes,
      keywords,
      emotions: { 
        ...emotions,
        happinessPct: typeof happinessScore === 'number' ? happinessScore : 50,
        stressPct: typeof stressScore === 'number' ? stressScore : 50
      },
      stressScore,
      happinessScore,
      imagePrompt,
      interpretation,
      interpretationDetails: {
        ...(aiAnalysis.detailedAnalysis || {}),
        culturalContext: aiAnalysis.culturalContext,
        connectionsToWakingLife: aiAnalysis.connectionsToWakingLife
      },
      sections: sections || undefined,
      sectionEmotions: sectionEmotions || undefined,
      remedies: remedies || undefined,
      culturalContext: aiAnalysis.culturalContext || '',
      connectionsToWakingLife: aiAnalysis.connectionsToWakingLife || '',
      suggestions,
      emotionalInsights: aiAnalysis.emotionalInsights || '',
      symbolism: sanitizeSymbolism(aiAnalysis.symbolism || defaultSymbolism),
      patterns: aiAnalysis.patterns || themes.slice(0, 3),
      confidence: aiAnalysis.confidence || 75,
      sleepQuality: 'C', // Default, will be updated with survey data
      mentalWellness: Math.round((happinessScore - stressScore + 100) / 2),
      dreamIntensity: themes.length > 3 ? 'high' : themes.length > 1 ? 'medium' : 'low',
    });
    
    // Try to save, but don't fail if it doesn't work
    let saved = false;
    try {
      await analysis.save();
      saved = true;
      console.log('✅ Analysis saved to database');
      // Log analysis creation
      logActivity(userId, 'analysis', { analysisId: analysis._id, themes, keywords });
      try { const io = req.app.get('io'); if (io) io.to(userId.toString()).emit('diary:updated', { id: analysis._id }); } catch(_) {}
    } catch (saveError) {
      console.error('⚠️ Failed to save analysis to database:', saveError.message);
      // Continue anyway - we can still return the analysis
    }
    
    const data = saved ? analysis.toObject() : {
      _id: Date.now().toString(),
      dreamText: text,
      summary: aiSummary,
      themes,
      keywords,
      emotions,
      stressScore,
      happinessScore,
      imagePrompt,
      interpretation,
      interpretationDetails,
      sections,
      suggestions,
      emotionalInsights: aiAnalysis.emotionalInsights || '',
      symbolism: sanitizeSymbolism(aiAnalysis.symbolism || defaultSymbolism),
      patterns: aiAnalysis.patterns || themes.slice(0, 3),
      confidence: aiAnalysis.confidence || 75,
      sleepQuality: 'C',
      mentalWellness: Math.round((happinessScore - stressScore + 100) / 2),
      dreamIntensity: themes.length > 3 ? 'high' : themes.length > 1 ? 'medium' : 'low',
      createdAt: new Date()
    };
    data.id = data._id;
    
    res.json({ 
      success: true, 
      data, 
      id: analysis._id, 
      summary: aiSummary, 
      themes, 
      keywords, 
      emotions, 
      stressScore, 
      happinessScore, 
      imagePrompt, 
      interpretation, 
      suggestions, 
      emotionalInsights: analysis.emotionalInsights, 
      symbolism: analysis.symbolism, 
      patterns: analysis.patterns, 
      confidence: analysis.confidence, 
      sleepQuality: analysis.sleepQuality, 
      mentalWellness: analysis.mentalWellness, 
      dreamIntensity: analysis.dreamIntensity, 
      createdAt: analysis.createdAt, 
      interpretationDetails: analysis.interpretationDetails,
      sections: sections || undefined,
      emotionsDetailed: sectionEmotions || undefined,
      remedies: remedies || undefined,
      culturalContext: analysis.culturalContext,
      connectionsToWakingLife: analysis.connectionsToWakingLife
    });
    
  } catch (error) {
    console.error('❌ Dream analysis error:', error);
    console.error('Error stack:', error.stack);
    
    if (error?.message === 'OPENAI_AUTH' || error?.status === 401) {
      return res.status(401).json({ 
        success: false, 
        error: 'OpenAI API key invalid or unauthorized',
        message: 'Authentication failed'
      });
    }
    res.status(500).json({ success: false, error: 'Failed to analyze dream', details: error.message });
  }
};

// POST /api/chatbot/generate-image
exports.generateImage = async (req, res) => {
  try {
    // Prefer explicit dreamText, but accept legacy imagePrompt
    let dreamText = (req.body && (req.body.dreamText ?? req.body.text)) ?? req.query?.dreamText;
    let imagePrompt = (req.body && (req.body.imagePrompt ?? req.body.prompt)) ?? req.query?.imagePrompt;
    const analysisId = (req.body && (req.body.analysisId ?? req.body.id)) ?? req.query?.analysisId;
    const userId = (req.body && (req.body.userId)) || req.userId;
    
    if (!dreamText && !imagePrompt && !analysisId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // If prompt missing, derive from analysis
    if (!imagePrompt && analysisId) {
      const existing = await DreamAnalysis.findById(analysisId).lean();
      if (existing) {
        imagePrompt = existing.imagePrompt;
        if (!imagePrompt) {
          const themes = existing.themes || [];
          const emotions = existing.emotions || {};
          const dominantEmotion = Object.keys(emotions).reduce((a, b) => (emotions[a]||0) > (emotions[b]||0) ? a : b, 'calmness');
          imagePrompt = `Dreamy surreal illustration of ${themes.join(' and ') || 'symbolic landscapes'}, ${dominantEmotion} atmosphere, ethereal pastel colors, symbolic and artistic`;
        }
      }
    }
    if (!imagePrompt && dreamText) {
      imagePrompt = `${dreamText}. Style: dreamy surreal illustration, pastel palette, soft glowing light, cinematic composition, symbolic elements`;
    }
    if (!imagePrompt) {
      return res.status(400).json({ success: false, error: 'Missing imagePrompt' });
    }
    
    console.log('Generating image with prompt:', imagePrompt);

    // Prompt-hash caching (hash by the final prompt string)
    const promptHash = crypto.createHash('sha256').update(imagePrompt).digest('hex');
    try {
      const cached = await ImageCache.findOne({ promptHash }).lean();
      if (cached && cached.imageUrl) {
        // Update hit count asynchronously
        ImageCache.updateOne({ _id: cached._id }, { $inc: { cacheHitCount: 1 } }).catch(()=>{});
        // Persist to analysis as well
        await DreamAnalysis.findByIdAndUpdate(analysisId, {
          imageUrl: cached.imageUrl,
          imagePrompt: imagePrompt,
          imageGeneratedAt: new Date()
        });
        // Log cached image serve
        logActivity(userId, 'image', { analysisId, cached: true, imageUrl: cached.imageUrl });
        try { const io = req.app.get('io'); if (io && userId) io.to(userId.toString()).emit('diary:updated', { id: analysisId }); } catch(_) {}
        return res.json({
          success: true,
          imageUrl: cached.imageUrl,
          analysisId,
          cached: true,
          cacheHit: true,
          service: cached.modelUsed || 'cache',
          prompt: imagePrompt
        });
      }
    } catch (e) {
      console.warn('Image cache lookup failed:', e.message);
    }
    
    // Generate image using AI service (returns URL or '/fallback.svg')
    const imageUrl = await generateDreamImage(imagePrompt);

    // Save to cache (best-effort)
    try {
      await ImageCache.create({
        prompt: imagePrompt,
        promptHash,
        imageUrl,
        modelUsed: 'NanoBanana',
        meta: { createdAt: new Date() }
      });
    } catch (e) {
      // Ignore duplicate key errors etc.
    }
    
    console.log('Image generated successfully, updating analysis');
    
    // Update analysis with image
    const analysis = await DreamAnalysis.findByIdAndUpdate(
      analysisId,
      {
        imageUrl,
        imageGeneratedAt: new Date()
      },
      { new: true }
    );
    
    if (!analysis) {
      console.log('Analysis not found with ID:', analysisId);
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    console.log('Analysis updated with image');
    
    // Log fresh image generation
    logActivity(userId, 'image', { analysisId: analysis._id, cached: false, imageUrl });
    try { const io = req.app.get('io'); if (io && userId) io.to(userId.toString()).emit('diary:updated', { id: analysis._id }); } catch(_) {}
    res.json({
      success: true,
      imageUrl,
      analysisId: analysis._id,
      cached: false,
      cacheHit: false,
      service: imageUrl === '/fallback.svg' ? 'SVG-Fallback' : 'NanoBanana',
      prompt: imagePrompt
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    if (error?.message === 'OPENAI_AUTH' || error?.status === 401) {
      return res.status(401).json({ success: false, imageUrl: null, message: 'OpenAI API key invalid or unauthorized' });
    }
    res.status(200).json({ 
      success: false,
      imageUrl: null,
      message: 'Image generation failed, but analysis saved',
      error: error.message,
      analysisId 
    });
  }
};

// GET /api/chatbot/:userId/history
exports.getUserHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const analyses = await DreamAnalysis.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    const total = await DreamAnalysis.countDocuments({ user: userId });
    
    res.json({
      analyses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
};
