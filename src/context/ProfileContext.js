import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return setProfile(null);
    const { data, error: e } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (e) setError('Could not load your profile. Check your connection.'); else { setError(null); setProfile(data || { id: user.id }); }
  }, [user?.id]);
  useEffect(() => { load(); }, [load]);

  const update = async (patch) => {
    const { data, error: e } = await supabase.from('profiles').upsert({ id: user.id, ...patch }).select().single();
    if (e) return { error: 'Could not save. Please try again.' };
    setProfile(data); return { ok: true };
  };
  const defaults = { water_goal_ml: 2000, step_goal: 8000, sleep_goal_min: 480, active_goal_min: 30 };
  return <Ctx.Provider value={{ profile: profile ? { ...defaults, ...Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== null)) } : null, error, reload: load, update }}>{children}</Ctx.Provider>;
}
export const useProfile = () => useContext(Ctx);
