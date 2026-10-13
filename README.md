[README.md](https://github.com/user-attachments/files/33365833/README.md)
# Health Mate (React Native / Expo)

White-mode-first wellness app: Supabase auth (email, Google, Facebook), AI assistant through a backend, Apple Health / Health Connect data, water tracking, sleep and activity views, reports, and personal doctor contacts.

> **Status: not yet run.** This code was written without being able to install packages or launch a simulator. Expect to fix small errors on first run. Nothing here was tested on a device, with real OAuth credentials, or with a real watch.

## 1. Create the project and install packages

```bash
npx create-expo-app@latest health-mate --template blank
cd health-mate
# copy this folder's App.js, app.json, babel.config.js, src/, supabase/ over the generated files
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context react-native-svg \
  @react-native-async-storage/async-storage expo-secure-store expo-linking expo-web-browser \
  expo-image-picker expo-notifications expo-build-properties
npm install @supabase/supabase-js aes-js react-native-get-random-values base64-arraybuffer \
  react-native-health react-native-health-connect expo-health-connect
```
`npx expo install --fix` aligns versions with your Expo SDK. **Check the config-plugin names** for `react-native-health`, `react-native-health-connect` and `expo-health-connect` against each library's README; they change between versions.

## 2. Supabase
1. Create a project. Run `supabase/schema.sql` in the SQL editor (tables, row-level security, photo buckets, account deletion).
2. Copy `.env.example` to `.env` and fill in the project URL and anon key. (The anon key is public by design; RLS protects the data.)
3. **Auth → URL Configuration → Redirect URLs:** add `healthmate://**` (and your Expo Go/dev URL while testing, printed by `Linking.createURL('auth-callback')`).
4. **Auth → Providers → Google:** create an OAuth client in Google Cloud Console (Web application), set its redirect URI to `https://YOUR-PROJECT.supabase.co/auth/v1/callback`, paste client ID and secret into Supabase.
5. **Auth → Providers → Facebook:** create a Facebook app (Facebook Login), add the same callback URL as a valid OAuth redirect, paste app ID and secret.
6. **Auth → Providers → Email:** decide whether email confirmation is required (the app handles both).

## 3. AI backend
```bash
supabase functions deploy ai-chat
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # optional: AI_MODEL=...
```
The key never reaches the app. The function requires a signed-in user. Add rate limiting before a public launch.

## 4. Run
Health access needs native modules, so **Expo Go will not work** for the watch features:
```bash
npx expo prebuild
npx expo run:ios       # or run:android (Health Connect must be installed on the phone)
```
Without a build, everything except health data still runs; the Watch screen says why health data is unavailable.

## How the watch connection works (honest version)
- Health Mate reads from **Apple Health** (iPhone) or **Health Connect** (Android). Your watch's own app (Apple Watch, Galaxy Wearable, Fitbit, Garmin Connect, Zepp, etc.) must sync into those. Which metrics appear depends on the watch.
- **Not implemented:** direct Bluetooth Low Energy pairing, watch battery level (neither platform shares it), and manufacturer-specific SDKs. The Watch screen says "not available" instead of showing made-up values.
- iOS never tells an app which read permissions were refused; a refused category just returns no data, which the app shows as "—".
- **Demo mode** uses generated numbers, clearly labelled everywhere, and is never enabled automatically.
- Daily view shows today's value; weekly/monthly show bars (tap a bar for its value). No hourly chart yet.
- Sleep is credited to the day you woke up (a 12-hour offset heuristic); naps near midnight can land on the wrong day.

## Privacy design
- Health readings are fetched on-device and not stored in the cloud. Only water logs, doctors and profile are in Supabase, protected by row-level security.
- Session tokens are AES-encrypted, with the key in the OS keychain/keystore.
- AI receives a short text summary only after you switch on sharing; chat history is stored on the phone only.
- Doctor and profile photos are in private buckets and shown with short-lived signed URLs.
- Emergency wording in chat shows a safety message instead of calling the AI. The Sri Lanka number (1990) should be checked against local guidance.

## Known gaps
- No automated tests; no offline queue (water logging needs a connection); only English.
- Terms/Privacy links point to `example.com` placeholders.
- Buttons use the brand green with dark text for contrast; white on #39B879 fails accessibility contrast.
- Active minutes come only from logged workouts. Heart-rate, SpO₂ and workouts on iOS use library calls I couldn't verify against your installed version.
