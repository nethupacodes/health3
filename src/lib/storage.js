import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export async function pickAndUpload(bucket, path) {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
  if (r.canceled || !r.assets?.[0]?.base64) return null;
  const { error } = await supabase.storage.from(bucket).upload(path, decode(r.assets[0].base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('Could not upload the photo.');
  return path;
}
export function useSignedUrl(bucket, path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let live = true;
    if (!path) { setUrl(null); return; }
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => live && setUrl(data?.signedUrl || null));
    return () => { live = false; };
  }, [bucket, path]);
  return url;
}
