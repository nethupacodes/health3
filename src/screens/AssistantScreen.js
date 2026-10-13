import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T, H, Chip, Notice, Btn } from '../components/ui';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useHealth } from '../context/HealthContext';
import { askAI, buildSummary, EMERGENCY } from '../lib/ai';
import { getWater, todayWater } from '../lib/data';
import { clean } from '../lib/validate';

const QUICK = {
  'Analyze My Wellness': 'Analyze my wellness based on the data available to you. Mention what is missing.',
  'Improve My Sleep': 'Give me practical suggestions to improve my sleep, based on my data if available.',
  'Create a Workout Plan': 'Create a simple one-week workout plan suited to a beginner-to-intermediate level. Ask me about my fitness level and any limits if needed.',
  'Healthy Meal Suggestions': 'Suggest healthy meal ideas for a day. Ask about allergies or preferences if relevant.',
  'Hydration Advice': 'Give me hydration advice using my water intake today if available.',
  'My Weekly Progress': 'Summarize my last 7 days of available data and suggest one or two focus areas.',
};

export default function AssistantScreen({ route }) {
  const { c } = useTheme(); const { user } = useAuth(); const { profile, update } = useProfile(); const { days, mode } = useHealth();
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const list = useRef(null); const key = `hm.chat.${user?.id}`;
  const share = !!profile?.ai_share_consent;

  useEffect(() => { AsyncStorage.getItem(key).then((v) => v && setMsgs(JSON.parse(v))); }, [key]);
  const save = (m) => { setMsgs(m); AsyncStorage.setItem(key, JSON.stringify(m.slice(-60))).catch(() => {}); };

  const send = useCallback(async (raw) => {
    const q = clean(raw, 1000); if (!q || busy) return;
    setErr(null); setText('');
    const next = [...msgs, { role: 'user', content: q }]; save(next);
    if (EMERGENCY.test(q)) {
      save([...next, { role: 'assistant', emergency: true, content: 'This may be an emergency. Please contact your local emergency number now (in Sri Lanka: 1990 ambulance) or go to the nearest hospital. If you are thinking about harming yourself, reach out to a crisis line or someone you trust right away. I cannot assess emergencies.' }]);
      return;
    }
    setBusy(true);
    try {
      let water = null; if (share) { try { water = todayWater(await getWater(1)); } catch {} }
      const summary = share ? buildSummary({ days, mode, waterMl: water, profile }) : '';
      const reply = await askAI(next.map(({ role, content }) => ({ role, content })), summary);
      save([...next, { role: 'assistant', content: reply, ai: true }]);
    } catch (e) { setErr(String(e.message || e)); } finally { setBusy(false); }
  }, [msgs, busy, days, mode, profile, share]);

  useEffect(() => { const p = route?.params?.prompt; if (p && QUICK[p]) send(QUICK[p]); }, [route?.params?.prompt]);
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100); }, [msgs.length, busy]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><H style={{ flex: 1 }}>Health Mate AI</H>
            {msgs.length > 0 && <Pressable onPress={() => save([])} accessibilityLabel="Start a new conversation" style={{ padding: 8 }}><T weight="700" style={{ color: c.primary }}>New chat</T></Pressable>}</View>
          <Notice>Wellness guidance only. I can't diagnose conditions or replace a doctor. {share ? 'Your health summary is shared with the AI.' : 'Your health data is not shared unless you allow it.'}</Notice>
          {!share && <Btn kind="ghost" title="Allow sharing my health summary" onPress={() => update({ ai_share_consent: true })} style={{ minHeight: 44 }} />}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {Object.keys(QUICK).map((k) => <Chip key={k} label={k} onPress={() => send(QUICK[k])} />)}
          </ScrollView>
        </View>
        <FlatList ref={list} data={msgs} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<T sub style={{ textAlign: 'center', marginTop: 30 }}>Ask me about sleep, activity, meals, hydration or stress. Pick a quick action above to start.</T>}
          renderItem={({ item }) => {
            const me = item.role === 'user';
            return (
              <View style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: 4 }}>
                <View style={{ backgroundColor: me ? c.primary : item.emergency ? (c.dark ? '#3A1A1A' : '#FDECEC') : c.card, borderRadius: 16, padding: 12, borderWidth: me ? 0 : 1, borderColor: c.border }}>
                  <T style={me ? { color: c.onPrimary } : item.emergency ? { color: c.danger } : null} selectable>{item.content}</T>
                </View>
                {item.ai && <T size={11} sub>AI-generated · not medical advice</T>}
              </View>
            );
          }}
          ListFooterComponent={busy ? <T sub accessibilityLiveRegion="polite">Health Mate AI is thinking…</T> : err ? <Notice kind="error">{err}</Notice> : null} />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderColor: c.border, alignItems: 'flex-end' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Ask a follow-up…" placeholderTextColor={c.sub} multiline maxLength={1000} accessibilityLabel="Message"
            style={{ flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.border, color: c.text, paddingHorizontal: 14, paddingTop: 12, fontSize: 16 }} />
          <Pressable onPress={() => send(text)} disabled={busy || !text.trim()} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.5 : 1 }}>
            <Ionicons name="send" size={20} color={c.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
