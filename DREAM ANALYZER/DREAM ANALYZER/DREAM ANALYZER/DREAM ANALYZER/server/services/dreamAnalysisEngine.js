function buildDreamAnalysisJSON(userContext) {
  const ctx = userContext && typeof userContext === 'object' ? userContext : {};
  const hasStr = v => typeof v === 'string' && v.trim().length > 0;
  const hasObj = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
  const dreamText = hasStr(ctx.dream_text) ? ctx.dream_text : null;
  const routineObj = hasObj(ctx.routine) ? ctx.routine : null;
  const moodStr = hasStr(ctx.mood) ? ctx.mood : null;
  const recentArr = Array.isArray(ctx.recent_dreams) ? ctx.recent_dreams : null;
  const sleepStr = hasStr(ctx.sleep_quality) ? ctx.sleep_quality : null;
  const safetyObj = hasObj(ctx.safety_flags) ? ctx.safety_flags : null;
  const missing = [];
  if (!dreamText) missing.push('dream_text');
  if (!routineObj) missing.push('routine');
  if (!moodStr) missing.push('mood');
  if (!(Array.isArray(ctx.recent_dreams) && ctx.recent_dreams.length > 0)) missing.push('recent_dreams');
  if (!sleepStr) missing.push('sleep_quality');
  if (!safetyObj) missing.push('safety_flags');
  const used = [];
  if (dreamText) used.push('dream_text');
  if (routineObj) used.push('routine');
  if (moodStr) used.push('mood');
  if (Array.isArray(ctx.recent_dreams)) used.push('recent_dreams');
  if (sleepStr) used.push('sleep_quality');
  if (safetyObj) used.push('safety_flags');
  const observations = [];
  if (dreamText) observations.push('Dream text provided.');
  if (moodStr) observations.push(`Mood noted: ${moodStr}.`);
  if (sleepStr) observations.push(`Sleep quality: ${sleepStr}.`);
  if (routineObj) observations.push('Routine details included.');
  if (Array.isArray(ctx.recent_dreams) && ctx.recent_dreams.length > 0) observations.push(`Recent dreams count: ${ctx.recent_dreams.length}.`);
  const risk = !!(safetyObj && (safetyObj.self_harm === true || safetyObj.harm_others === true || safetyObj.imminent_danger === true));
  const suggestions = risk
    ? [
        'If you feel in danger, contact local emergency services now.',
        'Reach out to a trusted person or a professional immediately.',
        'Use a grounding breath: inhale 4, exhale 6, repeat 5 times.'
      ]
    : [
        'Keep a consistent sleep window this week.',
        'Write your dream within 2 minutes of waking.',
        'Try 1-minute slow breathing before bed.'
      ];
  const confidence =
    risk ? 'low' :
    (missing.length === 0 ? 'high' :
      ((used.length <= 1 || missing.length >= 4) ? 'low' : 'medium'));
  return {
    empathic_opener: 'Thanks for sharing your dream and context. I’ll keep this gentle.',
    observations: observations.slice(0, 3),
    suggestions: suggestions.slice(0, 3),
    reflection_question: 'Is any part of this dream linked to current stress?',
    brief_practice: 'Take 3 slow breaths and relax your shoulders.',
    missing_fields: missing,
    meta: {
      used_fields: used,
      confidence: confidence
    }
  };
}

module.exports = {
  buildDreamAnalysisJSON
};
