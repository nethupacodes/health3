// DEMO DATA ONLY. Generated locally, deterministic, never from a real device.
import { dayKey } from '../lib/validate';
const r = (i, s) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
export function demoDays(n = 30) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const steps = Math.round(4000 + r(i, 1) * 7000);
    out.push({
      date: dayKey(d), steps, distanceKm: +(steps * 0.00075).toFixed(2), calories: Math.round(180 + r(i, 2) * 320),
      activeMin: Math.round(15 + r(i, 3) * 60), sleepMin: Math.round(330 + r(i, 4) * 150),
      sleepStages: { deep: Math.round(50 + r(i, 5) * 40), rem: Math.round(70 + r(i, 6) * 40), light: Math.round(180 + r(i, 7) * 60), awake: Math.round(10 + r(i, 8) * 25) },
      hrAvg: Math.round(62 + r(i, 9) * 14), hrMin: Math.round(50 + r(i, 10) * 8), hrMax: Math.round(105 + r(i, 11) * 40), hrLatest: Math.round(64 + r(i, 12) * 14),
      spo2Avg: Math.round(95 + r(i, 13) * 4),
    });
  }
  return out;
}
export const demoWorkouts = () => [
  { name: 'Walking (demo)', minutes: 32, date: dayKey(new Date()) },
  { name: 'Cycling (demo)', minutes: 45, date: dayKey(Date.now() - 86400000 * 2) },
];
