import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Share, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, T, H, Ring, Bars, Segmented, Btn, Input, Notice, Source, Loading } from '../components/ui';
import { useTheme } from '../theme';
import { useHealth } from '../context/HealthContext';
import { useProfile } from '../context/ProfileContext';
import { addWater, deleteWater, getWater, todayWater, waterByDay, series, fmt, fmtMin } from '../lib/data';
import { setReminder, reminderOn } from '../lib/notifications';
import { askAI, buildSummary } from '../lib/ai';
import { dayKey, numIn } from '../lib/validate';

function useToggle(group) { const [on, setOn] = useState(false); useEffect(() => { reminderOn(group).then(setOn); }, []); return [on, setOn]; }

export function SleepScreen({ navigation }) {
  const { today, days, mode } = useHealth(); const { profile, update } = useProfile();
  const [range, setRange] = useState('7'); const [hrs, setHrs] = useState(''); const [err, setErr] = useState(null);
  const [rem, setRem] = useToggle('sleep'); const [bed, setBed] = useState(22); const [msg, setMsg] = useState(null);
  const g = profile?.sleep_goal_min ?? 480; const st = today?.sleepStages;
  const saveGoal = async () => { const n = numIn(hrs, 3, 14); if (!n) return setErr('Enter 3 to 14 hours.'); setErr(null); await update({ sleep_goal_min: Math.round(n * 60) }); setHrs(''); };
  const toggle = async (v) => { const ok = await setReminder('sleep', v, [[bed, 0]], 'Wind down', 'Time to start getting ready for bed.'); setRem(ok && v); setMsg(ok ? null : 'Notifications are blocked. Allow them in system settings.'); };
  return (
    <Screen>
      <H>Sleep</H>
      {mode === 'none' && <Notice>No sleep data yet. Health Mate only shows sleep your watch records. Connect a watch on the My Watch tab.</Notice>}
      {mode === 'demo' && <Notice>Demo data, not real sleep.</Notice>}
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <Ring size={140} stroke={13} progress={(today?.sleepMin ?? 0) / g} color="#36C5B0"><T size={22} weight="700">{fmtMin(today?.sleepMin)}</T><T size={12} sub>goal {fmtMin(g)}</T></Ring>
        {st ? <T sub>{['deep', 'rem', 'light', 'awake'].filter((s) => st[s] != null).map((s) => `${s} ${fmtMin(st[s])}`).join(' · ')}</T> : <T size={13} sub>Sleep stages not provided by your watch.</T>}
        <Source kind={mode === 'demo' ? 'demo' : 'measured'} />
      </Card>
      <Segmented options={[['7', 'Weekly'], ['30', 'Monthly']]} value={range} onChange={setRange} />
      <Card><T weight="700" style={{ marginBottom: 8 }}>Sleep history</T><Bars data={series(days, 'sleepMin', Number(range), 1 / 60)} goal={g / 60} unit="h" format={(v) => v.toFixed(1)} /></Card>
      <Card style={{ gap: 8 }}>
        <T weight="700">Sleep goal</T><Input label="Hours per night" value={hrs} onChangeText={setHrs} keyboardType="decimal-pad" placeholder={String(g / 60)} error={err} /><Btn kind="ghost" title="Save goal" onPress={saveGoal} />
      </Card>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><T weight="700" style={{ flex: 1 }}>Bedtime reminder · {bed}:00</T><Switch value={rem} onValueChange={toggle} accessibilityLabel="Bedtime reminder" /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}><Btn kind="ghost" title="Earlier" style={{ flex: 1 }} onPress={() => setBed(Math.max(19, bed - 1))} /><Btn kind="ghost" title="Later" style={{ flex: 1 }} onPress={() => setBed(Math.min(24, bed + 1))} /></View>
        {msg ? <Notice kind="error">{msg}</Notice> : <T size={12} sub>Change the time, then switch the reminder off and on to apply it.</T>}
      </Card>
      <Btn title="Get sleep suggestions" onPress={() => navigation.navigate('AI Assistant', { prompt: 'Improve My Sleep' })} />
    </Screen>
  );
}

export function WaterScreen() {
  const { c } = useTheme(); const { profile, update } = useProfile();
  const [logs, setLogs] = useState(null); const [err, setErr] = useState(null); const [custom, setCustom] = useState(''); const [goal, setGoal] = useState('');
  const [on, setOn] = useToggle('water'); const [msg, setMsg] = useState(null);
  const load = useCallback(() => getWater(30).then((l) => { setLogs(l); setErr(null); }).catch((e) => setErr(e.message)), []);
  useFocusEffect(load);
  const g = profile?.water_goal_ml ?? 2000; const t = logs ? todayWater(logs) : 0;
  const add = async (ml) => { try { await addWater(ml); await load(); } catch (e) { setErr(e.message); } };
  const byDay = logs ? waterByDay(logs) : {};
  const data = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { label: dayKey(d).slice(8), value: byDay[dayKey(d)] ?? null }; });
  const todays = (logs || []).filter((l) => dayKey(l.logged_at) === dayKey(new Date()));
  const toggle = async (v) => { const ok = await setReminder('water', v, [[10, 0], [12, 30], [15, 0], [17, 30]], 'Hydration check', 'Time for a glass of water.'); setOn(ok && v); setMsg(ok ? null : 'Notifications are blocked. Allow them in system settings.'); };
  if (!logs && !err) return <Screen><Loading /></Screen>;
  return (
    <Screen onRefresh={load} refreshing={false}>
      <H>Water</H>
      {err ? <Notice kind="error">{err}</Notice> : null}
      <Card style={{ alignItems: 'center', gap: 10 }}>
        <Ring size={150} stroke={14} progress={t / g} color="#4FA3E0"><T size={24} weight="700">{t} ml</T><T size={12} sub>of {g} ml</T></Ring>
        <Source kind="logged" />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[150, 250, 500].map((ml) => <Btn key={ml} title={`+${ml}`} onPress={() => add(ml)} style={{ flex: 1 }} />)}</View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input label="Custom (ml)" value={custom} onChangeText={setCustom} keyboardType="number-pad" /></View>
          <Btn title="Add" kind="ghost" onPress={() => { const n = numIn(custom, 10, 3000); if (!n) return setErr('Enter 10 to 3000 ml.'); setCustom(''); add(Math.round(n)); }} />
        </View>
      </Card>
      <Card><T weight="700" style={{ marginBottom: 8 }}>Last 7 days</T><Bars data={data} goal={g} unit="ml" /></Card>
      <Card style={{ gap: 6 }}>
        <T weight="700">Today's entries</T>
        {todays.length === 0 ? <T sub>Nothing logged yet. Tap a button above to add water.</T> : todays.map((l) => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T style={{ flex: 1 }}>{new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {l.ml} ml</T>
            <Btn title="Delete" kind="ghost" style={{ minHeight: 40 }} onPress={() => Alert.alert('Delete entry?', `${l.ml} ml`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteWater(l.id).then(load).catch((e) => setErr(e.message)) }])} />
          </View>))}
      </Card>
      <Card style={{ gap: 8 }}>
        <T weight="700">Daily goal</T><Input label="Goal (ml)" value={goal} onChangeText={setGoal} keyboardType="number-pad" placeholder={String(g)} />
        <Btn kind="ghost" title="Save goal" onPress={() => { const n = numIn(goal, 500, 6000); if (!n) return setErr('Enter a goal from 500 to 6000 ml.'); update({ water_goal_ml: Math.round(n) }); setGoal(''); setErr(null); }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><T style={{ flex: 1 }}>Hydration reminders</T><Switch value={on} onValueChange={toggle} accessibilityLabel="Hydration reminders" /></View>
        {msg ? <Notice kind="error">{msg}</Notice> : null}
      </Card>
    </Screen>
  );
}

export function ReportsScreen() {
  const { days, mode } = useHealth(); const { profile } = useProfile();
  const [range, setRange] = useState('7'); const [logs, setLogs] = useState([]); const [ai, setAi] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  useFocusEffect(useCallback(() => { getWater(30).then(setLogs).catch(() => {}); }, []));
  const n = Number(range); const slice = days.slice(-n);
  const avg = (k) => { const v = slice.map((d) => d[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const wd = waterByDay(logs); const wv = Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return wd[dayKey(d)]; }).filter((x) => x != null);
  const wAvg = wv.length ? wv.reduce((a, b) => a + b, 0) / wv.length : null;
  const lines = [['Average heart rate', avg('hrAvg') == null ? '—' : `${fmt(avg('hrAvg'))} BPM`, 'measured'], ['Average steps', fmt(avg('steps')), 'measured'], ['Average sleep', fmtMin(avg('sleepMin')), 'measured'], ['Average active minutes', fmt(avg('activeMin')), 'estimate'], ['Average water logged', wAvg == null ? '—' : `${Math.round(wAvg)} ml`, 'logged']];
  const text = `Health Mate report (${n === 1 ? 'today' : `last ${n} days`})${mode === 'demo' ? ' — DEMO DATA' : ''}\n` + lines.map(([l, v]) => `${l}: ${v}`).join('\n') + (ai ? `\n\nAI-generated suggestion (not medical advice):\n${ai}` : '');
  const explain = async () => {
    setBusy(true); setErr(null);
    try { setAi(await askAI([{ role: 'user', content: `Explain my last ${n} days of data in plain language and suggest one or two small improvements. Do not invent missing values.` }], buildSummary({ days, mode, waterMl: null, profile, n }))); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <H>Health reports</H>
      <Segmented options={[['1', 'Daily'], ['7', 'Weekly'], ['30', 'Monthly']]} value={range} onChange={setRange} />
      {mode === 'none' && <Notice>No watch data yet. Water entries still appear below.</Notice>}
      {mode === 'demo' && <Notice>Demo data, not a real report.</Notice>}
      <Card style={{ gap: 10 }}>
        {lines.map(([l, v, s]) => <View key={l} style={{ gap: 2 }}><T sub size={13}>{l}</T><T weight="700" size={18}>{v}</T><Source kind={mode === 'demo' && s === 'measured' ? 'demo' : s} /></View>)}
      </Card>
      <Card><T weight="700" style={{ marginBottom: 8 }}>Steps</T><Bars data={series(days, 'steps', Math.max(n, 7))} unit="steps" /></Card>
      <Card><T weight="700" style={{ marginBottom: 8 }}>Sleep</T><Bars data={series(days, 'sleepMin', Math.max(n, 7), 1 / 60)} unit="h" format={(v) => v.toFixed(1)} /></Card>
      <Btn title="Explain with AI" kind="ghost" onPress={explain} loading={busy} />
      {err ? <Notice kind="error">{err}</Notice> : null}
      {ai ? <Card style={{ gap: 6 }}><Source kind="ai" /><T selectable>{ai}</T><T size={12} sub>Wellness information only. Not a diagnosis. Talk to a clinician about health concerns.</T></Card> : null}
      <Btn title="Share report" onPress={() => Share.share({ message: text })} />
    </Screen>
  );
}
