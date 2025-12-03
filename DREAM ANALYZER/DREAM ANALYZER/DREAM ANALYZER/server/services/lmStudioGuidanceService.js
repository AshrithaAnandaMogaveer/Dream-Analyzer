const axios = require('axios');

/**
 * Call LM Studio local API to generate Personalized Daily Guidance.
 *
 * This service is STRICTLY isolated to guidance generation and does not
 * modify or interpret any other Dream Analyzer features.
 *
 * It expects a pre-built USER_DATA object containing only Dream Diary
 * and Daily Routine information.
 */
async function generateDailyGuidanceWithLMStudio(userData = {}) {
  const baseUrl =
    process.env.LM_STUDIO_BASE_URL ||
    'http://localhost:1234/v1/chat/completions';
  const model = process.env.LM_STUDIO_MODEL || 'local-model';

  // Trea + LM Studio friendly, stable prompt template
  const prompt = `
✅ 

✅ Designed only for Personalized Guidance

🎯 For use with Trea + LM Studio local API

💡 Must NOT affect Dream Diary, Interpretation, Community, Profile, Sleep Score, etc.

---

⭐ For LM Studio Integration

🔥 

You are a dedicated “Personalized Daily Guidance Generator” inside the Dream Analyzer project.

Your ONLY responsibility is to analyze the user's Dream Diary and Daily Routine data 
and produce personalised wellness guidance in THREE specific categories:

1. Lifestyle Guidance
2. Sleep Schedule Advice
3. Stress-Free Living Guidance

STRICT RULES – FOLLOW EXACTLY:

1. DO NOT touch, modify, interpret, or comment on any other features of the Dream Analyzer app.
   You are NOT allowed to interfere with:
   - Dream Diary content
   - Dream Interpretation module (bottleneck model)
   - Emotional analysis
   - Mental health scoring
   - Community section
   - Profile section
   - Dream Summary
   - Sleep patterns calculation
   - Any existing AI or database logic
   Your task is strictly isolated to generating guidance ONLY.

2. Only use the data provided in USER_DATA. 
   If some information is missing, give gentle general suggestions without inventing false facts.

3. Output Format MUST be exactly:

### Personalised Guidance

#### 1. Lifestyle Guidance

{A detailed paragraph based on user habits, mood patterns, energy levels, dream context, 
 daily routine, stress indicators, and emotional tone.}

#### 2. Sleep Schedule Advice

{A detailed paragraph based on sleep timing, dream frequency, sleep quality, wakeup patterns, 
  fatigue levels, dream content impact, and circadian alignment.}

#### 3. Stress-Free Living Guidance

{A detailed paragraph based on stress markers in the dream diary, emotional tone, 
 daily workload, lifestyle pressures, relaxation habits, and coping patterns.}

4. Each section MUST be 6–8 sentences, supportive, actionable, non-judgmental, and personalised.

5. Tone must be warm, friendly, validating, and human-like. Avoid clinical or diagnostic language.

6. This guidance module works in a separate environment. 
   You must not influence ANY other feature or model in the Dream Analyzer project.

--------------------------

USER_DATA (use this for analysis):

${JSON.stringify(userData || {}, null, 2)}

--------------------------

Generate the personalized guidance now following all rules above.
  `.trim();

  try {
    const response = await axios.post(
      baseUrl,
      {
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a strictly isolated Personalized Daily Guidance Generator. You only generate guidance text and never modify or comment on any other feature.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        // Keep temperature moderate for warmth but stable formatting
        temperature: 0.6,
        max_tokens: 1024,
      },
      {
        timeout: Number(process.env.LM_STUDIO_TIMEOUT_MS || 15000),
      }
    );

    const text =
      response?.data?.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      throw new Error('Empty LM Studio guidance response');
    }

    return { ok: true, text };
  } catch (error) {
    console.error('LM Studio guidance error:', error.message || error);
    // Return ok: false so controller can use dynamic fallback based on user's routine data
    // Don't return static text here - let the controller handle fallback with actual user data
    return {
      ok: false,
      text: null,
      error: error.message || 'LM Studio request failed'
    };
  }
}

module.exports = {
  generateDailyGuidanceWithLMStudio,
};


