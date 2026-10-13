import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aggregate, getAdapter } from '../health';
import { demoDays, demoWorkouts } from '../health/demo';

const Ctx = createContext(null);
const KEY = 'hm.health.mode';

export function HealthProvider({ children }) {
  const [mode, setMode] = useState('none'); // none | connected | demo
  const [days, setDays] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const ad = useRef(null);

  const read = useCallback(async () => {
    const g = ad.current || getAdapter();
    if (g.error) throw new Error(g.error);
    ad.current = g; setSource(g.source);
    const raw = await g.adapter.read(30);
    setDays(aggregate(raw, 30));
    setWorkouts((raw.workouts || []).map((w) => ({ name: w.name, minutes: Math.round((new Date(w.end) - new Date(w.start)) / 60000), date: String(w.start).slice(0, 10) })).reverse());
    setLastSync(new Date());
  }, []);

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      const g = getAdapter(); if (g.error) throw new Error(g.error);
      await g.adapter.connect(); ad.current = g; setSource(g.source);
      await read(); setMode('connected'); await AsyncStorage.setItem(KEY, 'connected');
    } catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const sync = async () => {
    setBusy(true); setError(null);
    try { if (mode === 'demo') { setDays(demoDays()); setLastSync(new Date()); } else await read(); }
    catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    try { await ad.current?.adapter.revoke(); } catch {}
    setMode('none'); setDays([]); setWorkouts([]); setLastSync(null); setError(null); await AsyncStorage.removeItem(KEY);
  };
  const startDemo = async () => { setDays(demoDays()); setWorkouts(demoWorkouts()); setLastSync(new Date()); setMode('demo'); setError(null); await AsyncStorage.setItem(KEY, 'demo'); };

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(async (m) => {
      if (m === 'demo') startDemo();
      else if (m === 'connected') { try { const g = getAdapter(); if (g.error) throw new Error(g.error); await g.adapter.connect(); ad.current = g; await read(); setMode('connected'); } catch (e) { setError(String(e.message || e)); } }
    });
  }, []);

  const today = days.length ? days[days.length - 1] : null;
  return <Ctx.Provider value={{ mode, days, today, workouts, lastSync, busy, error, source, connect, sync, disconnect, startDemo }}>{children}</Ctx.Provider>;
}
export const useHealth = () => useContext(Ctx);
