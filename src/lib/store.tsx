// App-wide state: who's signed in, their diary, settings and friends.
// Reads come from Supabase (cached on the phone for instant start-up),
// writes are applied on screen first and then saved.
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  DEFAULT_SETTINGS,
  type Drink,
  type Meal,
  mealForHour,
  mergeSettings,
  type Profile,
  type Settings,
  shiftDay,
  stampFor,
  today,
  dayKey,
  uid,
} from './model';
import { supabase } from './supabase';
import { onWidgetTap, readPendingWidgetDrinks, updateWidget, widgetEnabled } from './widget-sync';

export type Friend = { profile: Profile; drinks: Drink[] };

type Data = {
  profile: Profile | null;
  settings: Settings;
  drinks: Drink[];
  friends: Friend[];
};

type Store = Data & {
  ready: boolean;
  session: Session | null;
  selectedDay: string;
  setSelectedDay: (day: string) => void;
  addDrink: (d: { name: string; ml: number; meal: Meal; day?: string }) => Promise<void>;
  removeDrink: (id: string) => Promise<void>;
  saveProfile: (patch: Partial<Pick<Profile, 'display_name' | 'goal_ml' | 'sharing'>>) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  addFriend: (code: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const EMPTY: Data = { profile: null, settings: DEFAULT_SETTINGS, drinks: [], friends: [] };
const StoreContext = createContext<Store | null>(null);

const cacheKey = (userId: string) => `quenchy-cache-v1-${userId}`;
function readCache(userId: string): Data | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Data;
    return { ...EMPTY, ...d, settings: mergeSettings(d.settings) };
  } catch {
    return null;
  }
}
function writeCache(userId: string, d: Data) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(d));
  } catch {}
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Check your connection and try again.';
}

async function fetchAll(userId: string): Promise<Data> {
  const since = shiftDay(today(), -90);
  const [profileRes, settingsRes, drinksRes, linksRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, friend_code, goal_ml, sharing').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('data').eq('user_id', userId).maybeSingle(),
    supabase.from('drinks').select('*').eq('user_id', userId).gte('day', since).order('ts', { ascending: false }).limit(2000),
    supabase.from('friendships').select('friend_id').eq('user_id', userId),
  ]);
  for (const r of [profileRes, settingsRes, drinksRes, linksRes]) if (r.error) throw r.error;

  let profile = profileRes.data as Profile | null;
  if (!profile) {
    // Accounts made before the database was set up have no profile yet.
    const { data: u } = await supabase.auth.getUser();
    const name = (u.user?.user_metadata?.display_name as string | undefined) || u.user?.email?.split('@')[0] || 'Friend';
    const ins = await supabase
      .from('profiles')
      .insert({ id: userId, display_name: name })
      .select('id, display_name, friend_code, goal_ml, sharing')
      .single();
    if (ins.error) throw ins.error;
    profile = ins.data as Profile;
  }

  const ids = (linksRes.data ?? []).map((l) => l.friend_id as string);
  let friends: Friend[] = [];
  if (ids.length) {
    const fSince = shiftDay(today(), -30);
    const [fp, fd] = await Promise.all([
      supabase.from('profiles').select('id, display_name, friend_code, goal_ml, sharing').in('id', ids),
      supabase.from('drinks').select('*').in('user_id', ids).gte('day', fSince).order('ts', { ascending: false }).limit(3000),
    ]);
    if (fp.error) throw fp.error;
    if (fd.error) throw fd.error;
    const byUser = new Map<string, Drink[]>();
    for (const d of (fd.data ?? []) as Drink[]) byUser.set(d.user_id, [...(byUser.get(d.user_id) ?? []), d]);
    friends = ((fp.data ?? []) as Profile[]).map((p) => ({ profile: p, drinks: byUser.get(p.id) ?? [] }));
  }

  return {
    profile,
    settings: mergeSettings(settingsRes.data?.data),
    drinks: (drinksRes.data ?? []) as Drink[],
    friends,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(EMPTY);
  const [selectedDay, setSelectedDay] = useState(today());
  const userId = session?.user.id ?? null;
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // ---------- auth ----------
  const currentUser = useRef<string | null>(null);
  useEffect(() => {
    // Switching accounts (or signing out) starts from that person's cached data.
    const apply = (s: Session | null) => {
      const id = s?.user.id ?? null;
      if (id !== currentUser.current) {
        currentUser.current = id;
        setData(id ? (readCache(id) ?? EMPTY) : EMPTY);
      }
      setSession(s);
    };
    supabase.auth.getSession().then(({ data: s }) => {
      apply(s.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => apply(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---------- loading ----------
  const refresh = useCallback(async () => {
    if (!userId) return;
    const fresh = await fetchAll(userId);
    // Keep optimistic rows that haven't come back from the server yet.
    setData((cur) => {
      const pending = cur.drinks.filter((d) => d.id.startsWith('tmp-') && !fresh.drinks.some((f) => f.client_id === d.client_id));
      return { ...fresh, drinks: [...pending, ...fresh.drinks] };
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // refresh() only sets state after its network request finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch((e) => console.warn('[Quenchy] Load failed', e));
  }, [userId, refresh]);

  useEffect(() => {
    if (userId) writeCache(userId, data);
  }, [userId, data]);

  // Live updates from friends (and your other devices).
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refresh().catch(() => {}), 500);
    };
    const channel = supabase
      .channel('quenchy-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, soon)
      .subscribe();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setSelectedDay((d) => (d > today() ? today() : d));
        soon();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
      appSub.remove();
    };
  }, [userId, refresh]);

  // ---------- actions ----------
  const addDrink = useCallback<Store['addDrink']>(
    async ({ name, ml, meal, day }) => {
      if (!userId) return;
      const d = day ?? selectedDay;
      const clientId = uid();
      const ts = stampFor(d).toISOString();
      const temp: Drink = { id: 'tmp-' + clientId, user_id: userId, day: d, ts, name, ml: Math.round(ml), meal, client_id: clientId };
      setData((cur) => ({ ...cur, drinks: [temp, ...cur.drinks] }));
      const { data: row, error } = await supabase
        .from('drinks')
        .insert({ day: d, ts, name, ml: Math.round(ml), meal, client_id: clientId })
        .select('*')
        .single();
      if (error) {
        setData((cur) => ({ ...cur, drinks: cur.drinks.filter((x) => x.id !== temp.id) }));
        throw new Error(errorMessage(error));
      }
      setData((cur) => ({ ...cur, drinks: cur.drinks.map((x) => (x.id === temp.id ? (row as Drink) : x)) }));
    },
    [userId, selectedDay]
  );

  const removeDrink = useCallback<Store['removeDrink']>(async (id) => {
    const before = dataRef.current.drinks;
    setData((cur) => ({ ...cur, drinks: cur.drinks.filter((x) => x.id !== id) }));
    if (id.startsWith('tmp-')) return;
    const { error } = await supabase.from('drinks').delete().eq('id', id);
    if (error) {
      setData((cur) => ({ ...cur, drinks: before }));
      throw new Error(errorMessage(error));
    }
  }, []);

  const saveProfile = useCallback<Store['saveProfile']>(
    async (patch) => {
      if (!userId) return;
      setData((cur) => (cur.profile ? { ...cur, profile: { ...cur.profile, ...patch } } : cur));
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
      if (error) {
        refresh().catch(() => {});
        throw new Error(errorMessage(error));
      }
    },
    [userId, refresh]
  );

  const saveSettings = useCallback<Store['saveSettings']>(
    async (patch) => {
      if (!userId) return;
      const next = mergeSettings({ ...dataRef.current.settings, ...patch });
      setData((cur) => ({ ...cur, settings: next }));
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, data: next, updated_at: new Date().toISOString() });
      if (error) throw new Error(errorMessage(error));
    },
    [userId]
  );

  const addFriend = useCallback<Store['addFriend']>(
    async (code) => {
      const { error } = await supabase.rpc('add_friend', { code });
      if (error) throw new Error(errorMessage(error));
      await refresh();
    },
    [refresh]
  );

  const removeFriend = useCallback<Store['removeFriend']>(
    async (id) => {
      setData((cur) => ({ ...cur, friends: cur.friends.filter((f) => f.profile.id !== id) }));
      const { error } = await supabase.rpc('remove_friend', { other: id });
      if (error) throw new Error(errorMessage(error));
      await refresh();
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ---------- widget ----------
  // Every widget write goes through this queue: first save drinks tapped on the
  // widget, then push fresh totals, so a tap is never overwritten.
  const widgetQueue = useRef<Promise<void>>(Promise.resolve());
  const syncWidget = useCallback(() => {
    if (!widgetEnabled || !userId) return;
    widgetQueue.current = widgetQueue.current.then(async () => {
      const pending = await readPendingWidgetDrinks();
      let saved = true;
      if (pending.length) {
        const rows = pending.map((p) => {
          const at = new Date(p.ts);
          return {
            day: dayKey(at),
            ts: at.toISOString(),
            name: p.name,
            ml: Math.round(p.ml),
            meal: mealForHour(at.getHours()),
            client_id: p.id,
          };
        });
        const { error } = await supabase.from('drinks').upsert(rows, { onConflict: 'client_id', ignoreDuplicates: true });
        saved = !error;
        if (saved) await refresh().catch(() => {});
      }
      const d = dataRef.current;
      const t = today();
      const drank = d.drinks.reduce((s, x) => (x.day === t ? s + x.ml : s), 0);
      updateWidget(
        {
          day: t,
          drank,
          goal: d.profile?.goal_ml ?? 2000,
          unit: d.settings.unit,
          buttons: [
            { label: '+ Glass', name: 'Glass of water', ml: 250 },
            { label: '+ Bottle', name: 'Water bottle', ml: d.settings.bottleMl },
          ],
          friends: d.friends
            .filter((f) => f.profile.sharing)
            .map((f) => ({
              name: f.profile.display_name,
              goal: f.profile.goal_ml,
              drank: f.drinks.reduce((s, x) => (x.day === t ? s + x.ml : s), 0),
            })),
        },
        saved ? [] : pending
      );
    }).catch((e) => console.warn('[Quenchy] Widget sync failed', e));
  }, [userId, refresh]);

  useEffect(() => {
    if (!userId || !data.profile) return;
    syncWidget();
  }, [userId, data, syncWidget]);

  useEffect(() => {
    if (!userId) return;
    const off = onWidgetTap(syncWidget);
    const appSub = AppState.addEventListener('change', (s) => s === 'active' && syncWidget());
    return () => {
      off();
      appSub.remove();
    };
  }, [userId, syncWidget]);

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready,
      session,
      selectedDay,
      setSelectedDay,
      addDrink,
      removeDrink,
      saveProfile,
      saveSettings,
      addFriend,
      removeFriend,
      refresh,
      signOut,
    }),
    [data, ready, session, selectedDay, addDrink, removeDrink, saveProfile, saveSettings, addFriend, removeFriend, refresh, signOut]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Totals for one person's drinks on a day. */
export function dayTotal(drinks: Drink[], day: string): number {
  let s = 0;
  for (const d of drinks) if (d.day === day) s += d.ml;
  return s;
}
