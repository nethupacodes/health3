import React, { useState } from 'react';
import { Alert, Linking, Share, Switch, View } from 'react-native';
import { Screen, Card, T, H, Btn, Segmented, Notice } from '../components/ui';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';

export default function SettingsScreen({ navigation }) {
  const { pref, setPref } = useTheme(); const { user, signOut, forgot } = useAuth(); const { profile, update } = useProfile();
  const [msg, setMsg] = useState(null);
  const exportData = async () => {
    const [p, d, w] = await Promise.all([supabase.from('profiles').select('*'), supabase.from('doctors').select('*'), supabase.from('water_logs').select('*')]);
    if (p.error || d.error || w.error) return setMsg({ error: 'Could not export your data. Check your connection.' });
    Share.share({ message: JSON.stringify({ exportedAt: new Date().toISOString(), profile: p.data, doctors: d.data, water: w.data }, null, 2) });
  };
  const wipe = () => Alert.alert('Delete all my data?', 'This permanently deletes your profile details, doctors and water history. Your account stays.', [{ text: 'Cancel' }, { text: 'Delete data', style: 'destructive', onPress: async () => {
    const r = await Promise.all([supabase.from('water_logs').delete().eq('user_id', user.id), supabase.from('doctors').delete().eq('user_id', user.id)]);
    setMsg(r.some((x) => x.error) ? { error: 'Some data could not be deleted. Try again.' } : { ok: 'Your data was deleted.' });
  } }]);
  const delAcc = () => Alert.alert('Delete account?', 'Your account and all stored data will be permanently deleted. This cannot be undone.', [{ text: 'Cancel' }, { text: 'Delete account', style: 'destructive', onPress: async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) setMsg({ error: 'Could not delete the account. Try again.' }); else signOut();
  } }]);
  return (
    <Screen>
      <H>Settings</H>
      {msg?.error ? <Notice kind="error">{msg.error}</Notice> : null}{msg?.ok ? <Notice>{msg.ok}</Notice> : null}
      <Card style={{ gap: 10 }}><T weight="700">Appearance</T>
        <Segmented options={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} value={pref} onChange={setPref} /></Card>
      <Card style={{ gap: 8 }}><T weight="700">Notifications</T><T sub size={14}>Hydration and bedtime reminders are managed on the Water and Sleep screens.</T>
        <View style={{ flexDirection: 'row', gap: 8 }}><Btn kind="ghost" title="Water" style={{ flex: 1 }} onPress={() => navigation.navigate('Water')} /><Btn kind="ghost" title="Sleep" style={{ flex: 1 }} onPress={() => navigation.navigate('Sleep')} /></View></Card>
      <Card style={{ gap: 8 }}><T weight="700">Smartwatch and health permissions</T>
        <Btn kind="ghost" title="Manage My Watch" onPress={() => navigation.navigate('My Watch')} /><Btn kind="ghost" title="Open system permissions" onPress={() => Linking.openSettings()} /></Card>
      <Card style={{ gap: 8 }}><T weight="700">Privacy</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><T style={{ flex: 1 }} size={14}>Share a summary of my health data with Health Mate AI</T><Switch value={!!profile?.ai_share_consent} onValueChange={(v) => update({ ai_share_consent: v })} accessibilityLabel="Share health summary with AI" /></View>
        <T size={12} sub>Health readings stay on your phone. Only a short text summary is sent, and only when this is on.</T></Card>
      <Card style={{ gap: 8 }}><T weight="700">Account</T><T sub>{user?.email}</T>
        <Btn kind="ghost" title="Send password reset email" onPress={async () => { const r = await forgot(user.email); setMsg(r.error ? { error: r.error } : { ok: 'Reset email sent.' }); }} />
        <Btn kind="ghost" title="Export my data" onPress={exportData} /><Btn kind="ghost" title="Delete my data" onPress={wipe} /><Btn kind="danger" title="Delete account" onPress={delAcc} /><Btn kind="ghost" title="Sign out" onPress={signOut} /></Card>
    </Screen>
  );
}
