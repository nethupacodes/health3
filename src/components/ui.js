import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

export function Screen({ children, onRefresh, refreshing = false, scroll = true, pad = true }) {
  const { c } = useTheme();
  const body = pad ? { padding: 16, paddingBottom: 40, gap: 14 } : {};
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={body} keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}>{children}</ScrollView>
      ) : <View style={[{ flex: 1 }, pad && { padding: 16, gap: 14 }]}>{children}</View>}
    </SafeAreaView>
  );
}
export const Card = ({ children, style }) => { const { c } = useTheme(); return <View style={[{ backgroundColor: c.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: c.dark ? 0 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, style]}>{children}</View>; };
export const T = ({ children, style, sub, size = 15, weight = '400', ...p }) => { const { c } = useTheme(); return <Text {...p} style={[{ color: sub ? c.sub : c.text, fontSize: size, fontWeight: weight, lineHeight: size * 1.4 }, style]}>{children}</Text>; };
export const H = ({ children, style }) => <T size={22} weight="700" style={[{ lineHeight: 30 }, style]} accessibilityRole="header">{children}</T>;

export function Btn({ title, onPress, kind = 'primary', loading, disabled, style, icon }) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.danger : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? '#fff' : c.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!(disabled || loading) }}
      onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{ minHeight: 48, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: c.border }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{title}</Text></>}
    </Pressable>
  );
}

export function Input({ label, error, style, ...p }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <T size={14} weight="600">{label}</T> : null}
      <TextInput accessibilityLabel={label} placeholderTextColor={c.sub} {...p}
        style={[{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: error ? c.danger : c.border, backgroundColor: c.bg, color: c.text, paddingHorizontal: 14, fontSize: 16 }, style]} />
      {error ? <T size={13} style={{ color: c.danger }} accessibilityLiveRegion="polite">{error}</T> : null}
    </View>
  );
}

export function Ring({ size = 92, stroke = 9, progress = 0, color, children }) {
  const { c } = useTheme();
  const r = (size - stroke) / 2; const circ = 2 * Math.PI * r; const p = Math.max(0, Math.min(1, progress || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.round(p * 100)} percent of goal`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color || c.primary} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ * p} ${circ}`} />
      </Svg>
      {children}
    </View>
  );
}

// Tap a bar to read its value. Missing values are shown as gaps, never as zero.
export function Bars({ data, goal, unit = '', height = 120, format = (v) => String(Math.round(v)) }) {
  const { c } = useTheme(); const [sel, setSel] = useState(null);
  const vals = data.map((d) => d.value).filter((v) => v != null);
  if (!vals.length) return <T sub style={{ paddingVertical: 20, textAlign: 'center' }}>No data for this period yet.</T>;
  const max = Math.max(...vals, goal || 0, 1);
  const s = sel != null ? data[sel] : null;
  return (
    <View style={{ gap: 6 }}>
      <T size={13} sub>{s ? `${s.label}: ${s.value == null ? 'no data' : format(s.value) + ' ' + unit}` : 'Tap a bar for details'}</T>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: data.length > 14 ? 2 : 6 }}>
        {data.map((d, i) => (
          <Pressable key={i} onPress={() => setSel(i)} accessibilityLabel={`${d.label}: ${d.value == null ? 'no data' : format(d.value) + ' ' + unit}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View style={{ height: d.value == null ? 3 : Math.max(4, (d.value / max) * height), borderRadius: 4, backgroundColor: d.value == null ? c.border : sel === i ? c.teal : c.primary }} />
          </Pressable>
        ))}
      </View>
      {data.length <= 14 && <View style={{ flexDirection: 'row', gap: 6 }}>{data.map((d, i) => <T key={i} size={11} sub style={{ flex: 1, textAlign: 'center' }}>{d.label}</T>)}</View>}
    </View>
  );
}

export function Segmented({ options, value, onChange }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: c.border }} accessibilityRole="tablist">
      {options.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }} style={{ flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: value === k ? c.primary : 'transparent' }}>
          <Text style={{ color: value === k ? c.onPrimary : c.text, fontWeight: '600' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: active ? c.primary : c.card, borderWidth: 1, borderColor: active ? c.primary : c.border }}>
      <Text style={{ color: active ? c.onPrimary : c.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ kind = 'info', children }) {
  const { c } = useTheme();
  const bg = kind === 'error' ? (c.dark ? '#3A1A1A' : '#FDECEC') : c.warn; const fg = kind === 'error' ? c.danger : c.warnText;
  return <View style={{ backgroundColor: bg, borderRadius: 12, padding: 12 }} accessibilityLiveRegion="polite"><Text style={{ color: fg, fontSize: 14, lineHeight: 20 }}>{children}</Text></View>;
}
export const Source = ({ kind }) => { const { c } = useTheme(); const m = { measured: 'Measured', logged: 'Logged by you', estimate: 'Estimate', ai: 'AI suggestion', demo: 'Demo data' }; return <View style={{ alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: kind === 'demo' ? c.warn : c.border }}><Text style={{ fontSize: 11, fontWeight: '700', color: kind === 'demo' ? c.warnText : c.sub }}>{m[kind]}</Text></View>; };
export const Loading = () => { const { c } = useTheme(); return <View style={{ padding: 30 }}><ActivityIndicator color={c.primary} /></View>; };

export function Logo({ size = 96 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessibilityLabel="Health Mate logo">
      <Defs><LinearGradient id="g" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#39B879" /><Stop offset="1" stopColor="#36C5B0" /></LinearGradient></Defs>
      <Rect width="96" height="96" rx="26" fill="url(#g)" />
      <Path d="M48 74S22 58 22 40a13 13 0 0 1 26-5 13 13 0 0 1 26 5c0 18-26 34-26 34z" fill="#fff" />
      <Rect x="44" y="33" width="8" height="24" rx="2" fill="#36C5B0" /><Rect x="36" y="41" width="24" height="8" rx="2" fill="#36C5B0" />
      <Path d="M14 80h18l5-8 8 14 6-10h31" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </Svg>
  );
}
