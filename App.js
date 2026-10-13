import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { HealthProvider } from './src/context/HealthContext';
import { isConfigured } from './src/lib/supabase';
import { Logo, T, H, Screen, Notice } from './src/components/ui';
import { SignIn, Register, Forgot, ResetPassword } from './src/screens/AuthScreens';
import HomeScreen from './src/screens/HomeScreen';
import AssistantScreen from './src/screens/AssistantScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import WatchScreen from './src/screens/WatchScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DoctorsScreen from './src/screens/DoctorsScreen';
import { SleepScreen, WaterScreen, ReportsScreen } from './src/screens/TrackerScreens';

const Stack = createNativeStackNavigator(); const Tab = createBottomTabNavigator();
const ICONS = { Home: 'home', 'AI Assistant': 'sparkles', Activity: 'footsteps', 'My Watch': 'watch', Profile: 'person' };

function Tabs() {
  const { c } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.sub, tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border }, tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} /> })}>
      <Tab.Screen name="Home" component={HomeScreen} /><Tab.Screen name="AI Assistant" component={AssistantScreen} /><Tab.Screen name="Activity" component={ActivityScreen} /><Tab.Screen name="My Watch" component={WatchScreen} /><Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
const Splash = () => { const { c } = useTheme(); return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }}><Logo size={120} /><H>Health Mate</H><T sub>Your Health, Your Smart Companion.</T></View>; };

function Root() {
  const { c } = useTheme(); const { session, loading, recovery } = useAuth(); const [min, setMin] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMin(true), 1500); return () => clearTimeout(t); }, []);
  if (!isConfigured) return <Screen><H>Setup needed</H><Notice kind="error">Supabase is not configured. Copy .env.example to .env, add your project URL and anon key, then restart Expo. See the README.</Notice></Screen>;
  if (loading || !min) return <Splash />;
  const hdr = { headerTintColor: c.text, headerStyle: { backgroundColor: c.bg }, headerShadowVisible: false };
  return (
    <NavigationContainer theme={{ ...(c.dark ? DarkTheme : DefaultTheme), colors: { ...(c.dark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.bg, text: c.text, primary: c.primary, border: c.border } }}>
      <StatusBar barStyle={c.dark ? 'light-content' : 'dark-content'} />
      {!session ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="SignIn" component={SignIn} /><Stack.Screen name="Register" component={Register} /><Stack.Screen name="Forgot" component={Forgot} /></Stack.Navigator>
      ) : recovery ? <ResetPassword /> : (
        <ProfileProvider><HealthProvider>
          <Stack.Navigator screenOptions={hdr}>
            <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Doctors" component={DoctorsScreen} options={{ title: 'My Doctors' }} />
            <Stack.Screen name="Sleep" component={SleepScreen} /><Stack.Screen name="Water" component={WaterScreen} /><Stack.Screen name="Reports" component={ReportsScreen} /><Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </HealthProvider></ProfileProvider>
      )}
    </NavigationContainer>
  );
}
export default function App() { return <SafeAreaProvider><ThemeProvider><AuthProvider><Root /></AuthProvider></ThemeProvider></SafeAreaProvider>; }
