import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Btn, Input, T, H, Logo, Notice } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { clean, isEmail, isPhone, passwordProblem } from '../lib/validate';

const Header = ({ title, sub }) => (
  <View style={{ alignItems: 'center', gap: 8, marginVertical: 12 }}>
    <Logo size={72} /><H>{title}</H>{sub ? <T sub style={{ textAlign: 'center' }}>{sub}</T> : null}
  </View>
);

function Social() {
  const { oauth } = useAuth(); const { c } = useTheme();
  const [busy, setBusy] = useState(null); const [msg, setMsg] = useState(null);
  const go = async (p) => { setBusy(p); setMsg(null); const r = await oauth(p); setBusy(null); if (r.cancelled) setMsg('Sign-in was cancelled.'); else if (r.error) setMsg(r.error); };
  return (
    <View style={{ gap: 10 }}>
      <Btn kind="ghost" title="Continue with Google" loading={busy === 'google'} onPress={() => go('google')} icon={<Ionicons name="logo-google" size={20} color={c.text} />} />
      <Btn kind="ghost" title="Continue with Facebook" loading={busy === 'facebook'} onPress={() => go('facebook')} icon={<Ionicons name="logo-facebook" size={20} color="#1877F2" />} />
      {msg ? <Notice kind="error">{msg}</Notice> : null}
    </View>
  );
}
const Divider = () => { const { c } = useTheme(); return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /><T sub size={13}>or use email</T><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /></View>; };
const Link = ({ children, onPress }) => { const { c } = useTheme(); return <Pressable onPress={onPress} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '700', textAlign: 'center' }}>{children}</Text></Pressable>; };

export function SignIn({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isEmail(email)) return setErr('Enter a valid email address.');
    if (!pw) return setErr('Enter your password.');
    setBusy(true); setErr(null); const r = await signIn(email, pw); setBusy(false); if (r.error) setErr(r.error);
  };
  return (
    <Screen>
      <Header title="Welcome back" sub="Your Health, Your Smart Companion." />
      <Social /><Divider />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Input label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" textContentType="password" />
      {err ? <Notice kind="error">{err}</Notice> : null}
      <Btn title="Sign in" onPress={submit} loading={busy} />
      <Link onPress={() => navigation.navigate('Forgot')}>Forgot password?</Link>
      <Link onPress={() => navigation.navigate('Register')}>New here? Create an account</Link>
    </Screen>
  );
}

export function Register({ navigation }) {
  const { signUp } = useAuth();
  const [f, setF] = useState({ name: '', phone: '', email: '', pw: '', pw2: '' }); const [e, setE] = useState({}); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async () => {
    const er = {};
    if (clean(f.name).length < 2) er.name = 'Enter your full name.';
    if (!isPhone(f.phone)) er.phone = 'Enter a valid phone number, e.g. +94 77 123 4567.';
    if (!isEmail(f.email)) er.email = 'Enter a valid email address.';
    const pp = passwordProblem(f.pw); if (pp) er.pw = pp;
    if (f.pw !== f.pw2) er.pw2 = 'Passwords do not match.';
    setE(er); if (Object.keys(er).length) return;
    setBusy(true); const r = await signUp({ email: f.email, password: f.pw, fullName: clean(f.name, 80), phone: clean(f.phone, 20) }); setBusy(false);
    if (r.error) setMsg({ error: r.error }); else if (r.confirmEmail) setMsg({ ok: 'Account created. Check your email to confirm it, then sign in.' });
  };
  return (
    <Screen>
      <Header title="Create your account" />
      <Social /><Divider />
      <Input label="Full name" value={f.name} onChangeText={set('name')} error={e.name} autoComplete="name" />
      <Input label="Phone number" value={f.phone} onChangeText={set('phone')} error={e.phone} keyboardType="phone-pad" autoComplete="tel" />
      <Input label="Email" value={f.email} onChangeText={set('email')} error={e.email} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Password" value={f.pw} onChangeText={set('pw')} error={e.pw} secureTextEntry />
      <Input label="Confirm password" value={f.pw2} onChangeText={set('pw2')} error={e.pw2} secureTextEntry />
      {msg?.error ? <Notice kind="error">{msg.error}</Notice> : null}
      {msg?.ok ? <Notice>{msg.ok}</Notice> : null}
      <T size={13} sub style={{ textAlign: 'center' }}>By creating an account you agree to the{' '}
        <T size={13} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://example.com/terms')}>Terms of Service</T> and{' '}
        <T size={13} style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://example.com/privacy')}>Privacy Policy</T>.</T>
      <Btn title="Create account" onPress={submit} loading={busy} />
      <Link onPress={() => navigation.navigate('SignIn')}>Already have an account? Sign in</Link>
    </Screen>
  );
}

export function Forgot({ navigation }) {
  const { forgot } = useAuth();
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isEmail(email)) return setMsg({ error: 'Enter a valid email address.' });
    setBusy(true); const r = await forgot(email); setBusy(false);
    setMsg(r.error ? { error: r.error } : { ok: 'If an account exists for this email, a reset link is on its way. Open it on this phone.' });
  };
  return (
    <Screen>
      <Header title="Reset your password" sub="We'll email you a link to choose a new password." />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      {msg?.error ? <Notice kind="error">{msg.error}</Notice> : null}{msg?.ok ? <Notice>{msg.ok}</Notice> : null}
      <Btn title="Send reset link" onPress={submit} loading={busy} />
      <Link onPress={() => navigation.goBack()}>Back to sign in</Link>
    </Screen>
  );
}

export function ResetPassword() {
  const { setNewPassword, clearRecovery } = useAuth();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async () => {
    const p = passwordProblem(pw); if (p) return setErr(p); if (pw !== pw2) return setErr('Passwords do not match.');
    setBusy(true); const r = await setNewPassword(pw); setBusy(false); if (r.error) setErr(r.error);
  };
  return (
    <Screen>
      <Header title="Choose a new password" />
      <Input label="New password" value={pw} onChangeText={setPw} secureTextEntry />
      <Input label="Confirm new password" value={pw2} onChangeText={setPw2} secureTextEntry />
      {err ? <Notice kind="error">{err}</Notice> : null}
      <Btn title="Save new password" onPress={submit} loading={busy} />
      <Link onPress={clearRecovery}>Cancel</Link>
    </Screen>
  );
}
