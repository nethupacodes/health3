import { supabase } from './supabase';
import { dayKey } from './validate';

export async function getWater(days = 30) {
  const since = new Date(); since.setDate(since.getDate() - days + 1); since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.from('water_logs').select('id, ml, logged_at').gte('logged_at', since.toISOString()).order('logged_at', { ascending: false });
  if (error) throw new Error('Could not load water history.');
  return data;
}
export const addWater = async (ml) => { const { error } = await supabase.from('water_logs').insert({ ml }); if (error) throw new Error('Could not save. Check your connection.'); };
export const deleteWater = async (id) => { const { error } = await supabase.from('water_logs').delete().eq('id', id); if (error) throw new Error('Could not delete.'); };
export const waterByDay = (logs) => { const m = {}; logs.forEach((l) => { const k = dayKey(l.logged_at); m[k] = (m[k] || 0) + l.ml; }); return m; };
export const todayWater = (logs) => waterByDay(logs)[dayKey(new Date())] || 0;

export function series(days, key, n, scale = 1) {
  return days.slice(-n).map((d) => ({ label: d.date.slice(8), value: d[key] == null ? null : d[key] * scale }));
}
export const fmtMin = (m) => (m == null ? '—' : `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`);
export const fmt = (v, d = 0) => (v == null ? '—' : Number(v).toFixed(d));
