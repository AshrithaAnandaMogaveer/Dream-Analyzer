function buildSubheadingSections(userContext) {
  const ctx = userContext && typeof userContext === 'object' ? userContext : {};
  const text = typeof ctx.dream_text === 'string' ? ctx.dream_text.trim() : '';
  const lower = text.toLowerCase();
  const words = (lower.match(/\b[a-zA-Z']+\b/g) || []).filter(w => w.length > 2);
  const stop = new Set(['the','and','but','with','from','that','this','have','had','was','were','are','been','will','would','could','should','into','onto','over','under','then','there','their','them','they','for','you','your','yours','mine','his','her','hers','its','our','ours','who','what','when','where','why','how','a','an','to','of','in','on','at','as','by','or','if','so','not','no','yes','me','my','we','us']);
  const freq = {};
  for (const w of words) { if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1; }
  const ranked = Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(([w])=>w);
  const top = ranked.slice(0,6);
  const emoMap = {
    calm:['calm','peace','serene','quiet','still','relief'],
    joy:['joy','happy','love','smile','light','bright','celebrate'],
    fear:['fear','scared','afraid','panic','terror','nightmare','chase','monster'],
    sadness:['sad','cry','alone','loss','tears','blue'],
    anger:['angry','rage','fight','shout','burn'],
    curiosity:['curious','explore','search','mystery','unknown']
  };
  let mood = null;
  for (const [k,arr] of Object.entries(emoMap)) { if (arr.some(a=>lower.includes(a))) { mood = k; break; } }
  const themes = [
    {key:'water', words:['water','ocean','sea','river','lake','rain','wave']},
    {key:'flying', words:['fly','flying','sky','soar']},
    {key:'falling', words:['fall','falling','drop']},
    {key:'chase', words:['chase','running','pursue','escape']},
    {key:'teeth', words:['tooth','teeth','dentist']},
    {key:'snake', words:['snake','serpent']},
    {key:'school', words:['school','exam','class','teacher']},
    {key:'forest', words:['forest','woods','trees']},
    {key:'house', words:['house','home','room','door','window']},
    {key:'city', words:['city','street','traffic']}
  ];
  const activeThemes = themes.filter(t=>t.words.some(w=>lower.includes(w))).map(t=>t.key);
  const setting = activeThemes[0] || (lower.includes('night')?'night':(lower.includes('day')?'day':null));
  const sentences = (text.split(/(?<=[.!?])\s+/) || []).filter(s=>s.trim().length>0).slice(0,3);
  const introduction = [(mood ? `Tone feels ${mood}.` : `Tone is neutral.`), (setting ? `Scene features ${setting}.` : `Scene is unspecified.`)].join(' ');
  const overview = [(sentences[0] || `A brief scene unfolds with ${top.slice(0,3).join(', ')}.`), (top.length>0 ? `Motifs include ${top.slice(0,3).join(', ')}.` : `Motifs are subtle.`)].join(' ');
  const symbolTemplates = [w=>`"${w}" may point to personal meaning around ${w}.`, w=>`"${w}" could reflect attention toward ${w}.`, w=>`"${w}" often symbolizes shifts related to ${w}.`];
  const keySymbols = {};
  for (let i=0;i<Math.min(3,top.length);i++) { const w = top[i]; keySymbols[w] = symbolTemplates[i % symbolTemplates.length](w); }
  const psychological = [(mood ? `Emotional drivers include ${mood}.` : `Emotional drivers are mixed.`), (activeThemes.length>0 ? `Underlying needs relate to ${activeThemes.join(', ')}.` : `Underlying needs are exploratory.`)].join(' ');
  const culturalMap = {
    water:'Water is linked to cleansing and transition across traditions.',
    flying:'Flying is associated with freedom and expanded perspective.',
    falling:'Falling is connected to control and stability concerns.',
    chase:'Chase motifs echo avoidance or urgency themes.',
    teeth:'Teeth signs often mirror vulnerability and self-image.',
    snake:'Snakes are tied to transformation and renewal.',
    school:'School scenes relate to learning and evaluation pressures.',
    forest:'Forests align with exploration of the unknown.',
    house:'Houses mirror self-structure and boundaries.',
    city:'Cities reflect complexity and social engagement.'
  };
  const cultural = activeThemes.length>0 ? culturalMap[activeThemes[0]] : 'Cultural context points to cycles and change.';
  const connections = activeThemes.length>0 ? `Where does ${activeThemes[0]} show up in your week?` : 'What recent event echoes this dream tone?';
  const summary = activeThemes.includes('chase') ? 'Practice a 30-second grounding breath after stress.' : activeThemes.includes('water') ? 'Notice one small transition and journal it tonight.' : activeThemes.includes('falling') ? 'Add one stabilizing routine before bed.' : 'Write two lines about what felt most vivid.';
  return {
    yourDream: text || 'No dream content available',
    introduction,
    overview,
    keySymbols,
    psychological,
    cultural,
    connections,
    summary
  };
}

module.exports = { buildSubheadingSections };
