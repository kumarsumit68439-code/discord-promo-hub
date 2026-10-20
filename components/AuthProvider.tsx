'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  supabase,
  getDiscordProfile,
  ensureProfile,
  AppUser,
  Profile,
} from '@/lib/supabase';
import { isAdminUser, isCurrentlyBanned } from '@/lib/admin';
import BanScreen from './BanScreen';

type AuthCtx = {
  user: User | null;
  appUser: AppUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const au = getDiscordProfile(u);
    setAppUser(au);
    await ensureProfile(u);
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    setProfile(data || null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u);
      else {
        setAppUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u);
      else {
        setAppUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function signInDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email',
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
    setProfile(null);
    window.location.href = '/login';
  }

  const isAdmin = isAdminUser({
    email: user?.email || profile?.email,
    discordId: appUser?.discordId || profile?.discord_id,
  });

  const banned = profile ? isCurrentlyBanned(profile) : false;

  return (
    <Ctx.Provider
      value={{
        user,
        appUser,
        profile,
        isAdmin,
        loading,
        refreshProfile,
        signInDiscord,
        signOut,
      }}
    >
      {banned && user ? (
        <BanScreen
          reason={profile?.ban_reason}
          isPermanent={profile?.is_permanent_ban}
          banUntil={profile?.ban_until}
          onLogout={signOut}
          onTryOtherLogin={async () => {
            await supabase.auth.signOut();
            setUser(null);
            setAppUser(null);
            setProfile(null);
            window.location.href = '/login';
          }}
        />
      ) : (
        children
      )}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth within AuthProvider');
  return ctx;
}
