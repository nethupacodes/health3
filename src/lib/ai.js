import { supabase } from './supabase';
import { fmtMin } from './data';

export const EMERGENCY = /(chest pain|can'?t breathe|cannot breathe|difficulty breathing|suicid|kill myself|end my life|self[- ]harm|overdose|stroke|unconscious|severe bleeding|faint(ed|ing)|heart attack)/i;

export function buildSummary({ days, mode, waterMl, profile, n = 7 }) {
  if (!days?.length && !waterMl) return '';
  const src = mode === 'demo' ? 'DEMO DATA (not real)' : 'measured by the user\'s watch via the phone health app';
  const rows = (days || []).slice(-n).map((d) => {
    const p = [d.date];
    if (d.steps != null) p.push(`steps ${Math.round(d.steps)}`);
    if (d.sleepMin != null) p.push(`sleep ${fmtMin(d.sleepMin)}`);
    if (d.hrAvg != null) p.push(`avg HR ${d.hrAvg} bpm`);
    if (d.calories != null) p.push(`active kcal ${Math.round(d.calories)}`);
    if (d.spo2Avg != null) p.push(`SpO2 ${d.spo2Avg}%`);
    return p.length > 1 ? p.join(', ') : null;
  }).filter(Boolean);
  return [`Source: ${src}. Missing values were not provided; do not guess them.`, ...rows,
    waterMl != null ? `Water logged today: ${waterMl} ml (goal ${profile?.water_goal_ml ?? 2000})` : '',
    profile?.age ? `Age ${profile.age}` : ''].filter(Boolean).join('\n');
}

export async function askAI(messages, summary) {
  const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages: messages.slice(-12), summary } });
  if (error) throw new Error('The assistant is unavailable right now. Please try again later.');
  if (!data?.reply) throw new Error('The assistant did not return an answer.');
  return data.reply;
}
