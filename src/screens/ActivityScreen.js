import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen, Card, T, H, Ring, Bars, Segmented, Btn, Input, Notice, Source } from '../components/ui';
import { useTheme } from '../theme';
import { useHealth } from '../context/HealthContext';
import { useProfile } from '../context/ProfileContext';
import { series, fmt } from '../lib/data';
import { numIn } from '../lib/validate';

export default function ActivityScreen({ navigation }) {
  const { c } = useTheme(); const { today, days, workouts, mode, sync, busy } = useHealth(); const { profile, update } = useProfile();
  const [range, setRange] = useState('7'); const [goal, setGoal] = useState(''); const [gerr, setGerr] = useState(null);
  const sg = profile?.step_goal ?? 8000;
  const saveGoal = async () => { const n = numIn(goal, 1000, 100000); if (!n) return setGerr('Enter a goal between 1,000 and 100,000 steps.'); setGerr(null); const r = await update({ step_goal: Math.round(n) }); if (r.error) setGerr(r.error); else setGoal(''); };
  return (
    <Screen onRefresh={sync} refreshing={busy}>
      <H>Activity</H>
      {mode === 'none' && <Notice>No watch connected, so there is no activity data. Connect one on the My Watch tab, or try demo mode there.</Notice>}
      {mode === 'demo' && <Notice>Demo data, not from a real watch.</Notice>}
      <Card style={{ alignItems: 'center', gap: 10 }}>
        <Ring size={150} stroke={14} progress={(today?.steps ?? 0) / sg}><T size={30} weight="700">{fmt(today?.steps)}</T><T size={12} sub>of {sg} steps</T></Ring>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          {[['Distance', fmt(today?.distanceKm, 2), 'km'], ['Calories', fmt(today?.calories), 'kcal'], ['Active', fmt(today?.activeMin), 'min']].map(([l, v, u]) => (
            <View key={l} style={{ alignItems: 'center' }}><T size={13} sub>{l}</T><T weight="700" size={18}>{v}<T size={12} sub> {u}</T></T></View>
          ))}
        </View>
        <Source kind={mode === 'demo' ? 'demo' : 'measured'} />
      </Card>
      <Segmented options={[['7', 'Weekly'], ['30', 'Monthly']]} value={range} onChange={setRange} />
      <Card><T weight="700" style={{ marginBottom: 8 }}>Steps</T><Bars data={series(days, 'steps', Number(range))} goal={sg} unit="steps" /></Card>
      <Card style={{ gap: 8 }}>
        <T weight="700">Fitness goal</T>
        <Input label="Daily step goal" value={goal} onChangeText={setGoal} keyboardType="number-pad" placeholder={String(sg)} error={gerr} />
        <Btn title="Save goal" kind="ghost" onPress={saveGoal} />
      </Card>
      <Card style={{ gap: 6 }}>
        <T weight="700">Workouts</T>
        {workouts.length === 0 ? <T sub>No workouts recorded by your watch in the last 30 days.</T> : workouts.slice(0, 8).map((w, i) => <T key={i}>{w.date} · {w.name} · {w.minutes} min</T>)}
      </Card>
      <Btn title="Get activity recommendations" onPress={() => navigation.navigate('AI Assistant', { prompt: 'Create a Workout Plan' })} />
    </Screen>
  );
}
