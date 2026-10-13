import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { Screen, Card, T, H, Btn, Chip, Input, Segmented, Bars, Notice, Source } from '../components/ui';
import { useTheme } from '../theme';
import { useHealth } from '../context/HealthContext';
import { useProfile } from '../context/ProfileContext';
import { series, fmt, fmtMin } from '../lib/data';
import { clean } from '../lib/validate';

const BRANDS = ['Apple Watch', 'Samsung Galaxy Watch', 'Google Pixel Watch / Fitbit', 'Garmin', 'Huawei', 'Amazfit / Xiaomi', 'Other'];
const METRICS = {
  hr: ['Heart rate', 'hrAvg', 'BPM', 1, 0], steps: ['Steps', 'steps', 'steps', 1, 0], dist: ['Distance', 'distanceKm', 'km', 1, 2],
  cal: ['Calories', 'calories', 'kcal', 1, 0], sleep: ['Sleep', 'sleepMin', 'h', 1 / 60, 1], act: ['Active min', 'activeMin', 'min', 1, 0], spo2: ['SpO₂', 'spo2Avg', '%', 1, 0],
};
const HELP = [
  ['Nothing shows up', 'Open your watch\'s companion app and make sure it is syncing to ' + (Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect') + '. Health Mate reads from there, not directly from the watch.'],
  ['Permission was denied', Platform.OS === 'ios' ? 'Open Settings → Health → Data Access & Devices → Health Mate and turn on the categories you want.' : 'Open Health Connect → App permissions → Health Mate and allow the data types you want.'],
  ['Data looks old', 'Open the companion app to force a sync, then tap Sync now here.'],
  ['This build says health modules are unavailable', 'Health access does not work in Expo Go. Use a development build (see the README).'],
];

export default function WatchScreen() {
  const { c } = useTheme(); const H_ = useHealth(); const { profile, update } = useProfile();
  const { mode, today, days, lastSync, busy, error, source } = H_;
  const [metric, setMetric] = useState('hr'); const [range, setRange] = useState('7'); const [model, setModel] = useState(profile?.watch_model || ''); const [open, setOpen] = useState(null);
  const brand = profile?.watch_brand; const [lbl, key, unit, k, dec] = METRICS[metric];
  const savedWatch = (b) => update({ watch_brand: b, watch_model: clean(model, 60) });
  const label = mode === 'connected' ? 'Connected' : mode === 'demo' ? 'Demo mode' : 'Not connected';
  const todayVal = () => {
    if (!today || today[key] == null) return 'Not provided by your watch';
    if (metric === 'sleep') return fmtMin(today.sleepMin);
    return `${fmt(today[key] * k, dec)} ${unit}`;
  };
  return (
    <Screen onRefresh={H_.sync} refreshing={busy}>
      <H>My Watch</H>
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <Svg width={90} height={110} viewBox="0 0 90 110" accessibilityLabel="Smartwatch illustration">
          <Rect x="28" y="0" width="34" height="24" rx="6" fill={c.border} /><Rect x="28" y="86" width="34" height="24" rx="6" fill={c.border} />
          <Rect x="10" y="22" width="70" height="66" rx="18" fill={c.text} /><Rect x="16" y="28" width="58" height="54" rx="13" fill={c.dark ? '#0D1815' : '#fff'} />
          <Path d="M24 56h10l4-9 6 17 5-12h15" stroke={c.primary} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /><Circle cx="68" cy="34" r="2" fill={c.teal} />
        </Svg>
        <T weight="700" size={18}>{brand || 'Choose your watch'}{profile?.watch_model ? ` · ${profile.watch_model}` : ''}</T>
        <T sub>Status: <T weight="700" style={{ color: mode === 'connected' ? c.primary : c.text }}>{label}</T>{source && mode === 'connected' ? ` via ${source}` : ''}</T>
        <T size={13} sub>Last sync: {lastSync ? lastSync.toLocaleString() : 'Never'}</T>
        <T size={13} sub>Battery: not available (Apple Health and Health Connect don't share it)</T>
        {mode === 'demo' && <Source kind="demo" />}
      </Card>
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card style={{ gap: 10 }}>
        <T weight="700">Your watch</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{BRANDS.map((b) => <Chip key={b} label={b} active={brand === b} onPress={() => savedWatch(b)} />)}</View>
        <Input label="Model (optional)" value={model} onChangeText={setModel} onEndEditing={() => brand && savedWatch(brand)} placeholder="e.g. Series 9" />
        <T size={13} sub>Health Mate reads your watch's data from {Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}. Your watch's own app must be syncing there. Which measurements appear depends on your watch.</T>
      </Card>

      <View style={{ gap: 10 }}>
        {mode !== 'connected' && <Btn title={Platform.OS === 'ios' ? 'Connect Apple Health' : 'Connect Health Connect'} onPress={H_.connect} loading={busy} />}
        {mode !== 'none' && <Btn title="Sync now" kind="ghost" onPress={H_.sync} loading={busy} />}
        {mode !== 'none' && <Btn title="Disconnect" kind="danger" onPress={H_.disconnect} />}
        {mode === 'none' && <Btn title="Try demo mode (fake data)" kind="ghost" onPress={H_.startDemo} />}
        {mode === 'connected' && Platform.OS === 'ios' && <T size={12} sub>On iPhone, disconnecting stops Health Mate from reading. To revoke access fully, use Settings → Health → Data Access.</T>}
      </View>

      <Card style={{ gap: 10 }}>
        <T weight="700">Health data</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(METRICS).map(([id, m]) => <Chip key={id} label={m[0]} active={metric === id} onPress={() => setMetric(id)} />)}</View>
        <Segmented options={[['1', 'Daily'], ['7', 'Weekly'], ['30', 'Monthly']]} value={range} onChange={setRange} />
        {range === '1' ? (
          <View style={{ gap: 4 }}>
            <T sub size={13}>Today · {lbl}</T><T size={24} weight="700">{todayVal()}</T>
            {metric === 'hr' && today?.hrMin != null && <T sub>Range today: {today.hrMin}–{today.hrMax} BPM</T>}
            {metric === 'sleep' && today?.sleepStages && <T sub>{['deep', 'rem', 'light', 'awake'].filter((s) => today.sleepStages[s] != null).map((s) => `${s} ${fmtMin(today.sleepStages[s])}`).join(' · ') || 'Stages not provided'}</T>}
          </View>
        ) : <Bars data={series(days, key, Number(range), k)} unit={unit} format={(v) => v.toFixed(dec)} />}
        {mode === 'none' ? <T size={12} sub>Connect a watch or use demo mode to see charts.</T> : <T size={12} sub>Gaps mean your watch did not provide that measurement on that day.</T>}
      </Card>

      <Card style={{ gap: 6 }}>
        <T weight="700">Permissions</T>
        <T sub>Health Mate asks to read steps, heart rate, sleep, distance, active calories, blood oxygen and workouts. It never writes to your health data.</T>
        <Btn title="Open system settings" kind="ghost" onPress={() => Linking.openSettings()} />
      </Card>
      <Card style={{ gap: 4 }}>
        <T weight="700">Troubleshooting</T>
        {HELP.map(([q, a], i) => (
          <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={{ paddingVertical: 10 }}>
            <T weight="600">{q}</T>{open === i && <T sub style={{ marginTop: 4 }}>{a}</T>}
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
