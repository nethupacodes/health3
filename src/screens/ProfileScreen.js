import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, T, H, Btn, Input, Chip, Notice } from '../components/ui';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { pickAndUpload, useSignedUrl } from '../lib/storage';
import { clean, isPhone, numIn } from '../lib/validate';

const GOALS = ['Be more active', 'Sleep better', 'Drink more water', 'Reduce stress', 'Eat healthier', 'Lose weight', 'Build strength'];

export default function ProfileScreen({ navigation }) {
  const { c } = useTheme(); const { user, signOut } = useAuth(); const { profile, update, error } = useProfile();
  const [edit, setEdit] = useState(false); const [f, setF] = useState({}); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const avatar = useSignedUrl('avatars', profile?.avatar_path);
  useEffect(() => { if (profile) setF({ full_name: profile.full_name || '', phone: profile.phone || '', age: profile.age ? String(profile.age) : '', height_cm: profile.height_cm ? String(profile.height_cm) : '', weight_kg: profile.weight_kg ? String(profile.weight_kg) : '', goals: profile.goals || [] }); }, [profile, edit]);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const save = async () => {
    const e = {};
    if (clean(f.full_name).length < 2) e.full_name = 'Enter your name.';
    if (f.phone && !isPhone(f.phone)) e.phone = 'Enter a valid phone number.';
    if (f.age && !numIn(f.age, 5, 120)) e.age = 'Age must be 5–120.';
    if (f.height_cm && !numIn(f.height_cm, 50, 250)) e.height_cm = 'Height must be 50–250 cm.';
    if (f.weight_kg && !numIn(f.weight_kg, 15, 400)) e.weight_kg = 'Weight must be 15–400 kg.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    const r = await update({ full_name: clean(f.full_name, 80), phone: clean(f.phone, 20) || null, age: f.age ? Math.round(+f.age) : null, height_cm: f.height_cm ? +f.height_cm : null, weight_kg: f.weight_kg ? +f.weight_kg : null, goals: f.goals });
    setBusy(false); if (r.error) setMsg(r.error); else { setMsg(null); setEdit(false); }
  };
  const photo = async () => { try { const p = await pickAndUpload('avatars', `${user.id}/avatar-${Date.now()}.jpg`); if (p) await update({ avatar_path: p }); } catch (e) { setMsg(e.message); } };
  const toggleGoal = (g) => setF({ ...f, goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g] });

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pressable onPress={photo} accessibilityRole="button" accessibilityLabel="Change profile picture">
          {avatar ? <Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera" size={32} color={c.onPrimary} /></View>}
        </Pressable>
        <H>{profile?.full_name || 'Your profile'}</H><T sub>{user?.email}</T>
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {msg ? <Notice kind="error">{msg}</Notice> : null}
      {!edit ? (
        <Card style={{ gap: 8 }}>
          {[['Phone', profile?.phone], ['Age', profile?.age], ['Height', profile?.height_cm && `${profile.height_cm} cm`], ['Weight', profile?.weight_kg && `${profile.weight_kg} kg`], ['Goals', profile?.goals?.join(', ')], ['Smartwatch', profile?.watch_brand && `${profile.watch_brand}${profile.watch_model ? ' · ' + profile.watch_model : ''}`]].map(([l, v]) => (
            <View key={l}><T size={13} sub>{l}</T><T>{v || 'Not provided'}</T></View>))}
          <Btn title="Edit Profile" onPress={() => setEdit(true)} />
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          <Input label="Full name" value={f.full_name} onChangeText={set('full_name')} error={errs.full_name} />
          <Input label="Phone number" value={f.phone} onChangeText={set('phone')} error={errs.phone} keyboardType="phone-pad" />
          <T size={13} sub>Age, height and weight are optional.</T>
          <Input label="Age" value={f.age} onChangeText={set('age')} error={errs.age} keyboardType="number-pad" />
          <Input label="Height (cm)" value={f.height_cm} onChangeText={set('height_cm')} error={errs.height_cm} keyboardType="decimal-pad" />
          <Input label="Weight (kg)" value={f.weight_kg} onChangeText={set('weight_kg')} error={errs.weight_kg} keyboardType="decimal-pad" />
          <T size={14} weight="600">Wellness goals</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{GOALS.map((g) => <Chip key={g} label={g} active={f.goals?.includes(g)} onPress={() => toggleGoal(g)} />)}</View>
          <Btn title="Save Changes" onPress={save} loading={busy} />
          <Btn title="Cancel" kind="ghost" onPress={() => { setEdit(false); setErrs({}); }} />
        </Card>
      )}
      <Btn title="My Doctors" kind="ghost" onPress={() => navigation.navigate('Doctors')} icon={<Ionicons name="medkit-outline" size={20} color={c.text} />} />
      <Btn title="Settings" kind="ghost" onPress={() => navigation.navigate('Settings')} icon={<Ionicons name="settings-outline" size={20} color={c.text} />} />
      <Btn title="Sign out" kind="ghost" onPress={signOut} />
    </Screen>
  );
}
