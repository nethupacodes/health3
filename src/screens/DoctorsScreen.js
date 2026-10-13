import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, T, H, Btn, Input, Notice, Loading } from '../components/ui';
import { useTheme } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { pickAndUpload, useSignedUrl } from '../lib/storage';
import { clean, isPhone } from '../lib/validate';

const empty = { full_name: '', specialization: '', phone: '', clinic: '', address: '', notes: '', photo_path: null };

function Photo({ path, size = 52 }) {
  const { c } = useTheme(); const url = useSignedUrl('doctor-photos', path);
  return url ? <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel="Doctor photo" />
    : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.border, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person" size={size / 2} color={c.sub} /></View>;
}

export default function DoctorsScreen() {
  const { c } = useTheme(); const { user } = useAuth();
  const [docs, setDocs] = useState(null); const [q, setQ] = useState(''); const [err, setErr] = useState(null);
  const [form, setForm] = useState(null); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { supabase.from('doctors').select('*').order('full_name').then(({ data, error }) => { if (error) setErr('Could not load your doctors. Check your connection.'); else { setErr(null); setDocs(data); } }); }, []);
  useFocusEffect(load);
  const shown = (docs || []).filter((d) => (d.full_name + ' ' + d.specialization + ' ' + d.clinic).toLowerCase().includes(q.trim().toLowerCase()));
  const set = (k) => (v) => setForm({ ...form, [k]: v });

  const save = async () => {
    const e = {};
    if (clean(form.full_name).length < 2) e.full_name = "Enter the doctor's full name.";
    if (!clean(form.specialization)) e.specialization = 'Enter a specialization.';
    if (!isPhone(form.phone)) e.phone = 'Enter a valid phone number.';
    if (!clean(form.clinic)) e.clinic = 'Enter a hospital or clinic name.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    const row = { full_name: clean(form.full_name, 100), specialization: clean(form.specialization, 100), phone: clean(form.phone, 25), clinic: clean(form.clinic, 120), address: clean(form.address, 200) || null, notes: clean(form.notes, 500) || null, photo_path: form.photo_path };
    const { error } = form.id ? await supabase.from('doctors').update(row).eq('id', form.id) : await supabase.from('doctors').insert(row);
    setBusy(false);
    if (error) return setErrs({ form: 'Could not save. Please try again.' });
    setForm(null); load();
  };
  const photo = async () => {
    try { const id = form.id || Math.random().toString(36).slice(2); const p = await pickAndUpload('doctor-photos', `${user.id}/${id}.jpg`); if (p) setForm({ ...form, photo_path: p }); }
    catch (e) { setErrs({ form: e.message }); }
  };
  const del = (d) => Alert.alert('Delete doctor?', d.full_name, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('doctors').delete().eq('id', d.id); load(); } }]);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList data={shown} keyExtractor={(d) => d.id} contentContainerStyle={{ padding: 16, gap: 12 }} onRefresh={load} refreshing={false}
        ListHeaderComponent={<View style={{ gap: 10 }}>
          <H>My Doctors</H>
          <Input value={q} onChangeText={setQ} placeholder="Search by name, specialty or clinic" accessibilityLabel="Search doctors" />
          <Btn title="+ Add Doctor" onPress={() => { setErrs({}); setForm({ ...empty }); }} />
          {err ? <Notice kind="error">{err}</Notice> : null}
        </View>}
        ListEmptyComponent={docs ? <T sub style={{ textAlign: 'center', marginTop: 20 }}>{q ? 'No doctors match your search.' : 'No doctors saved yet. Tap + Add Doctor to save your first contact.'}</T> : err ? null : <Loading />}
        renderItem={({ item: d }) => (
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Photo path={d.photo_path} />
              <View style={{ flex: 1 }}><T weight="700" size={17}>{d.full_name}</T><T sub size={14}>{d.specialization}</T><T size={14}>{d.clinic}</T></View>
            </View>
            <T size={14}>{d.phone}</T>
            {d.address ? <T size={14} sub>{d.address}</T> : null}
            {d.notes ? <T size={14} sub>Notes: {d.notes}</T> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn title="Call Doctor" icon={<Ionicons name="call" size={18} color={c.onPrimary} />} style={{ flex: 2 }} onPress={() => Linking.openURL(`tel:${d.phone.replace(/[^\d+]/g, '')}`)} />
              <Btn title="Edit" kind="ghost" style={{ flex: 1 }} onPress={() => { setErrs({}); setForm({ ...empty, ...d, address: d.address || '', notes: d.notes || '' }); }} />
              <Btn title="Delete" kind="ghost" style={{ flex: 1 }} onPress={() => del(d)} />
            </View>
          </Card>
        )} />
      <Modal visible={!!form} animationType="slide" onRequestClose={() => setForm(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          {form && <FlatList data={[0]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }} renderItem={() => (
            <View style={{ gap: 12 }}>
              <H>{form.id ? 'Edit doctor' : 'Add doctor'}</H>
              <Pressable onPress={photo} accessibilityRole="button" accessibilityLabel="Choose doctor photo" style={{ alignItems: 'center', gap: 6 }}><Photo path={form.photo_path} size={80} /><T style={{ color: c.primary }} weight="700">{form.photo_path ? 'Change photo' : 'Add photo (optional)'}</T></Pressable>
              <Input label="Full name" value={form.full_name} onChangeText={set('full_name')} error={errs.full_name} />
              <Input label="Specialization" value={form.specialization} onChangeText={set('specialization')} error={errs.specialization} />
              <Input label="Phone number" value={form.phone} onChangeText={set('phone')} error={errs.phone} keyboardType="phone-pad" />
              <Input label="Hospital or clinic" value={form.clinic} onChangeText={set('clinic')} error={errs.clinic} />
              <Input label="Address (optional)" value={form.address} onChangeText={set('address')} />
              <Input label="Notes (optional)" value={form.notes} onChangeText={set('notes')} multiline style={{ minHeight: 80, paddingTop: 12 }} />
              {errs.form ? <Notice kind="error">{errs.form}</Notice> : null}
              <Btn title="Save Doctor" onPress={save} loading={busy} />
              <Btn title="Cancel" kind="ghost" onPress={() => setForm(null)} />
            </View>)} />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
