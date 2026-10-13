import React, { useCallback, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Card, T, H, Ring, Notice, Source } from '../components/ui';
import { useTheme } from '../theme';
import { useProfile } from '../context/ProfileContext';
import { useHealth } from '../context/HealthContext';
import { useSignedUrl } from '../lib/storage';
import { getWater, todayWater, fmt, fmtMin } from '../lib/data';

const TIPS = ['Drink a glass of water when you wake up.', 'A 10-minute walk after meals is an easy way to add active minutes.', 'Keep a regular bedtime, even on weekends.', 'Take three slow breaths before a stressful task.', 'Stand up and stretch every hour you sit.', 'Try to get daylight in the morning to support your sleep rhythm.', 'Add one extra serving of vegetables to a meal today.'];

function Metric({ icon, label, value, unit, note, color, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value} ${unit || ''}`} style={{ width: '48%' }}>
      <Card style={{ gap: 4 }}>
        <Ionicons name={icon} size={22} color={color || c.primary} />
        <T size={13} sub>{label}</T>
        <T size={22} weight="700">{value}<T size={13} sub> {unit}</T></T>
        {note ? <T size={11} sub>{note}</T> : null}
      </Card>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { c } = useTheme(); const { profile } = useProfile(); const { today, mode, sync } = useHealth();
  const [water, setWater] = useState(null); const [werr, setWerr] = useState(false);
  const avatar = useSignedUrl('avatars', profile?.avatar_path);
  const load = useCallback(() => { getWater(1).then((l) => { setWater(todayWater(l)); setWerr(false); }).catch(() => setWerr(true)); }, []);
  useFocusEffect(load);
  const name = (profile?.full_name || '').split(' ')[0];
  const h = new Date().getHours(); const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const wg = profile?.water_goal_ml ?? 2000; const sg = profile?.step_goal ?? 8000; const slg = profile?.sleep_goal_min ?? 480;
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const go = (n, p) => navigation.navigate(n, p);
  const miss = mode === 'none' ? 'Connect a watch' : 'Not provided';
  return (
    <Screen onRefresh={() => { load(); sync(); }} refreshing={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => go('Profile')} accessibilityLabel="Open profile">
          {avatar ? <Image source={{ uri: avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><T weight="700" style={{ color: c.onPrimary }}>{(name || '?')[0].toUpperCase()}</T></View>}
        </Pressable>
        <View style={{ flex: 1 }}><T size={13} sub>{greet}</T><H>{name || 'there'}</H></View>
        <Pressable onPress={() => go('Settings')} accessibilityLabel="Notifications and settings" style={{ padding: 10 }}><Ionicons name="notifications-outline" size={24} color={c.text} /></Pressable>
        <Pressable onPress={() => go('Settings')} accessibilityLabel="Settings" style={{ padding: 10 }}><Ionicons name="settings-outline" size={24} color={c.text} /></Pressable>
      </View>

      {mode === 'demo' && <Notice>Demo data: these health numbers are made up and not from a real watch. Water is what you logged.</Notice>}
      {mode === 'none' && <Pressable onPress={() => go('My Watch')}><Notice>No watch connected. Health numbers will appear here once you connect Apple Health or Health Connect on the My Watch tab.</Notice></Pressable>}

      <Card>
        <T weight="700" style={{ marginBottom: 10 }}>Today's goals</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[['Steps', today?.steps, sg, c.primary, 'footsteps-outline'], ['Sleep', today?.sleepMin, slg, c.teal, 'moon-outline'], ['Water', water, wg, '#4FA3E0', 'water-outline']].map(([l, v, g, col, ic]) => (
            <View key={l} style={{ alignItems: 'center', gap: 6 }}>
              <Ring size={88} progress={v != null ? v / g : 0} color={col}><Ionicons name={ic} size={22} color={col} /></Ring>
              <T size={13} weight="600">{l}</T>
              <T size={12} sub>{v == null ? '—' : l === 'Sleep' ? fmtMin(v) : l === 'Water' ? `${v} ml` : Math.round(v)}</T>
            </View>
          ))}
        </View>
        {werr && <T size={12} style={{ color: c.danger, marginTop: 8 }}>Could not load water. Pull down to retry.</T>}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        <Metric icon="heart-outline" color="#E5566D" label="Heart rate" value={fmt(today?.hrLatest ?? today?.hrAvg)} unit="BPM" note={today?.hrLatest == null && today?.hrAvg == null ? miss : mode === 'demo' ? 'Demo' : 'Latest reading'} onPress={() => go('My Watch')} />
        <Metric icon="footsteps-outline" label="Steps" value={fmt(today?.steps)} unit="" note={today?.steps == null ? miss : `Goal ${sg}`} onPress={() => go('Activity')} />
        <Metric icon="flame-outline" color="#F08A3C" label="Calories burned" value={fmt(today?.calories)} unit="kcal" note={today?.calories == null ? miss : 'Active energy'} onPress={() => go('Activity')} />
        <Metric icon="timer-outline" label="Active minutes" value={fmt(today?.activeMin)} unit="min" note={today?.activeMin == null ? miss : 'From workouts'} onPress={() => go('Activity')} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        {[['AI Health Assistant', 'sparkles-outline', () => go('AI Assistant')], ['Connect Smartwatch', 'watch-outline', () => go('My Watch')], ['My Doctors', 'medkit-outline', () => go('Doctors')], ['Sleep', 'moon-outline', () => go('Sleep')], ['Water', 'water-outline', () => go('Water')], ['Health Reports', 'bar-chart-outline', () => go('Reports')]].map(([l, ic, fn]) => (
          <Pressable key={l} onPress={fn} accessibilityRole="button" style={{ width: '48%' }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 }}><Ionicons name={ic} size={24} color={c.primary} /><T weight="600" style={{ flex: 1 }}>{l}</T></Card>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: 6 }}><Source kind="estimate" /><T weight="700">Daily wellness tip</T><T>{tip}</T>
        <Pressable onPress={() => go('AI Assistant', { prompt: 'Analyze My Wellness' })} style={{ minHeight: 44, justifyContent: 'center' }}><T weight="700" style={{ color: c.primary }}>Get personalized suggestions from Health Mate AI</T></Pressable>
      </Card>
    </Screen>
  );
}
