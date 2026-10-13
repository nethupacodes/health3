import { Platform } from 'react-native';
import { dayKey } from '../lib/validate';

// ---------- Aggregation (shared by both platforms) ----------
// raw = { steps:[{t,v}], distance:[{t,v(m)}], calories:[{t,v}], hr:[{t,v}], spo2:[{t,v(%)}],
//         sleep:[{start,end,stage}], workouts:[{name,start,end}] }
export function aggregate(raw, days = 30) {
  const out = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); out[dayKey(d)] = { date: dayKey(d) }; }
  const sum = (arr, key, f) => (arr || []).forEach((x) => { const o = out[dayKey(x.t)]; if (o) o[key] = (o[key] || 0) + f(x.v); });
  sum(raw.steps, 'steps', (v) => v);
  sum(raw.distance, 'distanceKm', (v) => v / 1000);
  sum(raw.calories, 'calories', (v) => v);
  const grp = (arr) => { const g = {}; (arr || []).forEach((x) => { const k = dayKey(x.t); (g[k] = g[k] || []).push(x); }); return g; };
  const hg = grp(raw.hr);
  Object.keys(hg).forEach((k) => { const o = out[k]; if (!o) return; const v = hg[k].map((x) => x.v); o.hrAvg = Math.round(v.reduce((a, b) => a + b, 0) / v.length); o.hrMin = Math.min(...v); o.hrMax = Math.max(...v); o.hrLatest = hg[k].sort((a, b) => a.t - b.t).slice(-1)[0].v; });
  const sg = grp(raw.spo2);
  Object.keys(sg).forEach((k) => { const o = out[k]; if (o) o.spo2Avg = Math.round(sg[k].reduce((a, b) => a + b.v, 0) / sg[k].length); });
  (raw.sleep || []).forEach((s) => {
    const o = out[dayKey(new Date(s.end).getTime() + 12 * 3600e3)]; if (!o) return; // night is credited to the day you woke up
    const m = Math.max(0, Math.round((new Date(s.end) - new Date(s.start)) / 60000));
    if (s.stage === 'awake') { o.sleepStages = o.sleepStages || {}; o.sleepStages.awake = (o.sleepStages.awake || 0) + m; return; }
    if (s.stage === 'inbed') return;
    o.sleepMin = (o.sleepMin || 0) + m;
    if (['deep', 'rem', 'light'].includes(s.stage)) { o.sleepStages = o.sleepStages || {}; o.sleepStages[s.stage] = (o.sleepStages[s.stage] || 0) + m; }
  });
  (raw.workouts || []).forEach((w) => { const o = out[dayKey(w.start)]; if (o) o.activeMin = (o.activeMin || 0) + Math.round((new Date(w.end) - new Date(w.start)) / 60000); });
  return Object.values(out);
}

const iso = (d) => new Date(d).toISOString();
const range = (days) => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days); start.setHours(0, 0, 0, 0); return { start, end }; };

// ---------- iOS: Apple HealthKit (needs a development build) ----------
function iosAdapter() {
  const AHK = require('react-native-health').default;
  const P = AHK.Constants.Permissions;
  const call = (name, opts) => new Promise((res, rej) => AHK[name](opts, (e, r) => (e ? rej(new Error(String(e))) : res(r))));
  return {
    async connect() {
      await new Promise((res, rej) => AHK.initHealthKit({ permissions: { read: [P.Steps, P.HeartRate, P.SleepAnalysis, P.DistanceWalkingRunning, P.ActiveEnergyBurned, P.OxygenSaturation, P.Workout], write: [] } }, (e) => (e ? rej(new Error(String(e))) : res())));
    },
    async read(days) {
      const { start, end } = range(days); const o = { startDate: iso(start), endDate: iso(end) };
      const safe = async (f) => { try { return await f(); } catch { return []; } };
      const steps = await safe(() => call('getDailyStepCountSamples', { ...o, period: 1440 }));
      const dist = await safe(() => call('getDailyDistanceWalkingRunningSamples', o));
      const cal = await safe(() => call('getActiveEnergyBurned', o));
      const hr = await safe(() => call('getHeartRateSamples', { ...o, ascending: true, limit: 3000 }));
      const spo = await safe(() => call('getOxygenSaturationSamples', o));
      const sl = await safe(() => call('getSleepSamples', o));
      const wk = await safe(async () => (await call('getAnchoredWorkouts', o)).data || []);
      const stage = { ASLEEP: 'asleep', CORE: 'light', DEEP: 'deep', REM: 'rem', AWAKE: 'awake', INBED: 'inbed' };
      return {
        steps: steps.map((x) => ({ t: x.startDate, v: x.value })),
        distance: dist.map((x) => ({ t: x.startDate, v: x.value })),
        calories: cal.map((x) => ({ t: x.startDate, v: x.value })),
        hr: hr.map((x) => ({ t: x.startDate, v: x.value })),
        spo2: spo.map((x) => ({ t: x.startDate, v: x.value <= 1 ? x.value * 100 : x.value })),
        sleep: sl.map((x) => ({ start: x.startDate, end: x.endDate, stage: stage[x.value] || 'asleep' })),
        workouts: wk.map((w) => ({ name: w.activityName || 'Workout', start: w.start, end: w.end })),
      };
    },
    async revoke() { /* iOS cannot revoke programmatically */ },
  };
}

// ---------- Android: Health Connect (needs a development build) ----------
function androidAdapter() {
  const HC = require('react-native-health-connect');
  const types = ['Steps', 'HeartRate', 'SleepSession', 'Distance', 'ActiveCaloriesBurned', 'OxygenSaturation', 'ExerciseSession'];
  return {
    async connect() {
      const st = await HC.getSdkStatus();
      if (st !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) throw new Error('Health Connect is not installed or needs an update. Install it from Google Play.');
      await HC.initialize();
      const granted = await HC.requestPermission(types.map((recordType) => ({ accessType: 'read', recordType })));
      if (!granted || granted.length === 0) throw new Error('No health permissions were granted.');
    },
    async read(days) {
      const { start, end } = range(days);
      const f = { timeRangeFilter: { operator: 'between', startTime: iso(start), endTime: iso(end) } };
      const get = async (t) => { try { return (await HC.readRecords(t, f)).records || []; } catch { return []; } };
      const [st, hr, sl, di, ca, sp, ex] = await Promise.all(types.map(get));
      const smap = { 1: 'awake', 2: 'asleep', 4: 'light', 5: 'deep', 6: 'rem', 7: 'awake' };
      const sleep = [];
      sl.forEach((s) => {
        if (s.stages && s.stages.length) s.stages.forEach((g) => { if (g.stage !== 3 && g.stage !== 0) sleep.push({ start: g.startTime, end: g.endTime, stage: smap[g.stage] || 'asleep' }); });
        else sleep.push({ start: s.startTime, end: s.endTime, stage: 'asleep' });
        // attribute whole session to its end day for aggregate(); stages carry session end via end field
      });
      return {
        steps: st.map((x) => ({ t: x.startTime, v: x.count })),
        distance: di.map((x) => ({ t: x.startTime, v: x.distance?.inMeters || 0 })),
        calories: ca.map((x) => ({ t: x.startTime, v: x.energy?.inKilocalories || 0 })),
        hr: hr.flatMap((x) => (x.samples || []).map((s) => ({ t: s.time, v: s.beatsPerMinute }))),
        spo2: sp.map((x) => ({ t: x.time, v: x.percentage?.value ?? x.percentage })),
        sleep,
        workouts: ex.map((x) => ({ name: x.title || 'Workout', start: x.startTime, end: x.endTime })),
      };
    },
    async revoke() { try { await HC.revokeAllPermissions(); } catch {} },
  };
}

export function getAdapter() {
  try {
    if (Platform.OS === 'ios') return { adapter: iosAdapter(), source: 'Apple Health' };
    if (Platform.OS === 'android') return { adapter: androidAdapter(), source: 'Health Connect' };
  } catch (e) { return { error: 'Health modules are not available in this build. Health data needs a development build (not Expo Go). See the README.' }; }
  return { error: 'Health data is only available on iPhone and Android.' };
}
