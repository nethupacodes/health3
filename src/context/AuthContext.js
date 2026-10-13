import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();
const Ctx = createContext(null);

export function parseAuthUrl(url) {
  const out = {};
  const part = url.split('#')[1] || url.split('?')[1] || '';
  part.split('&').forEach((kv) => {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
  });
  return out;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }).catch(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    // Password-reset deep links (healthmate://reset#access_token=...&type=recovery)
    const handle = async ({ url }) => {
      if (!url || !url.includes('type=recovery')) return;
      const p = parseAuthUrl(url);
      if (p.access_token && p.refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
        if (!error) setRecovery(true);
      }
    };
    Linking.getInitialURL().then((u) => u && handle({ url: u }));
    const l = Linking.addEventListener('url', handle);
    return () => { sub.subscription.unsubscribe(); l.remove(); };
  }, []);

  const friendly = (m = '') => {
    if (/invalid login/i.test(m)) return 'Email or password is incorrect.';
    if (/not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox.';
    if (/network|fetch/i.test(m)) return 'No connection. Check your internet and try again.';
    return m || 'Something went wrong. Please try again.';
  };

  const api = {
    session, user: session?.user ?? null, loading, recovery, clearRecovery: () => setRecovery(false),
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { error: friendly(error.message) } : { ok: true };
    },
    async signUp({ email, password, fullName, phone }) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName, phone } } });
      if (error) return { error: /registered|already/i.test(error.message) ? 'An account with this email already exists. Try signing in.' : friendly(error.message) };
      if (data.user && data.user.identities && data.user.identities.length === 0) return { error: 'An account with this email already exists. Try signing in or use Google/Facebook.' };
      return data.session ? { ok: true } : { ok: true, confirmEmail: true };
    },
    async oauth(provider) {
      try {
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
        if (error) return { error: friendly(error.message) };
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type !== 'success') return { cancelled: true };
        const p = parseAuthUrl(res.url);
        if (p.error_description) return { error: p.error_description };
        if (p.access_token && p.refresh_token) {
          const { error: e } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
          return e ? { error: friendly(e.message) } : { ok: true };
        }
        return { error: 'Sign-in did not complete. Please try again.' };
      } catch (e) { return { error: friendly(String(e.message || e)) }; }
    },
    async forgot(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('reset') });
      return error ? { error: friendly(error.message) } : { ok: true };
    },
    async setNewPassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) setRecovery(false);
      return error ? { error: friendly(error.message) } : { ok: true };
    },
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
