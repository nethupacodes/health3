import 'react-native-get-random-values';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

// Session tokens are too large for SecureStore alone: encrypt with AES, keep the key in SecureStore.
class LargeSecureStore {
  async getItem(key) {
    const enc = await AsyncStorage.getItem(key);
    if (!enc) return enc;
    const hex = await SecureStore.getItemAsync(key);
    if (!hex) return null;
    const c = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(hex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(c.decrypt(aesjs.utils.hex.toBytes(enc)));
  }
  async setItem(key, value) {
    const k = crypto.getRandomValues(new Uint8Array(32));
    const c = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(c.encrypt(aesjs.utils.utf8.toBytes(value))));
  }
  async removeItem(key) { await AsyncStorage.removeItem(key); await SecureStore.deleteItemAsync(key); }
}

export const supabase = createClient(SUPABASE_URL || 'http://invalid.local', SUPABASE_KEY || 'missing', {
  auth: { storage: new LargeSecureStore(), autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
