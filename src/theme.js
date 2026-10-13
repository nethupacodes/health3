import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const light = {
  bg: '#FFFFFF', card: '#F5FAF8', text: '#12302A', sub: '#5B7A72', border: '#DDEEE7',
  primary: '#39B879', teal: '#36C5B0', onPrimary: '#06281D', danger: '#C93B3B', warn: '#FFF4D6', warnText: '#6B4E00', dark: false,
};
export const darkC = {
  bg: '#0D1815', card: '#15262A', text: '#EAF6F1', sub: '#9BBBB1', border: '#223630',
  primary: '#39B879', teal: '#36C5B0', onPrimary: '#06281D', danger: '#FF7B7B', warn: '#3A3115', warnText: '#FFE08A', dark: true,
};

const Ctx = createContext(null);
const KEY = 'hm.theme';

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [pref, setPref] = useState('light'); // White Mode is the default
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => v && setPref(v)).catch(() => {}); }, []);
  const set = (v) => { setPref(v); AsyncStorage.setItem(KEY, v).catch(() => {}); };
  const c = useMemo(() => (pref === 'dark' || (pref === 'system' && system === 'dark') ? darkC : light), [pref, system]);
  return <Ctx.Provider value={{ c, pref, setPref: set }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
