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
import { isOwnerBootstrap, isCurrentlyBanned } from '@/lib/admin';
import { SiteRole, isStaffLike } from '@/lib/roles';
import BanScreen from './BanScreen';

type AuthCtx = {
  user: User | null;
  appUser: AppUser | null;
  profile: Profile | null;
  role: SiteRole;
  isAdmin: boolean;
  isBoughtAdmin: boolean;
  isOwner: boolean;
  isActingOwner: boolean;
  isModerator: boolean;
  isDeveloper: boolean;
  isHelper: boolean;
  isStaff: boolean;
  isStaffLike: boolean;
  canAssignRoles: boolean;
  appLocked: boolean;
  appLockMessage: string;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function readAdminPanelUntil(p: Profile | null): string | null {
  if (!p) return null;
  const v = p.admin_panel_until;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appLocked, setAppLocked] = useState(false);
  const [appLockMessage, setAppLockMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    try {
      const au = getDiscordProfile(u);
      setAppUser(au);
      await ensureProfile(u);
      const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
      setProfile((data as Profile | null) || null);

      if (
        data &&
        data.role !== 'owner' &&
        isOwnerBootstrap({ email: u.email || data.email, discordId: au.discordId || data.discord_id })
      ) {
        await supabase.from('profiles').update({ role: 'owner' }).eq('id', u.id);
        const { data: again } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
        setProfile((again as Profile | null) || (data as Profile));
      }
    } catch (e) {
      console.error('loadProfile', e);
    }
  }, []);

  const loadAppLock = useCallback(async () => {
    try {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'app_lock').maybeSingle();
      const v = data?.value as { locked?: boolean; message?: string } | null;
      setAppLocked(!!v?.locked);
      setAppLockMessage(v?.message || 'Site is temporarily locked by Owner');
    } catch {
      /* ignore */
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user);
    await loadAppLock();
  }, [user, loadProfile, loadAppLock]);

  useEffect(() => {
    loadAppLock();
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await loadProfile(u);
        else {
          setAppUser(null);
          setProfile(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

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
  }, [loadProfile, loadAppLock]);

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

  const bootstrapOwner = isOwnerBootstrap({
    email: user?.email || profile?.email,
    discordId: appUser?.discordId || profile?.discord_id,
  });

  const role: SiteRole = bootstrapOwner ? 'owner' : ((profile?.role as SiteRole) || 'user');

  const adminUntilStr = readAdminPanelUntil(profile);
  const adminUntil = adminUntilStr ? new Date(adminUntilStr) : null;
  const isBoughtAdmin = Boolean(adminUntil && !Number.isNaN(adminUntil.getTime()) && adminUntil.getTime() > Date.now());

  const isOwner = role === 'owner';
  const isActingOwner = role === 'acting_owner' || role === 'owner';
  const isFullAdmin = ['admin', 'acting_owner', 'owner'].includes(role);
  const isAdmin = isFullAdmin || isBoughtAdmin;
  const isModerator = isFullAdmin || role === 'moderator';
  const isDeveloper = isModerator || role === 'developer';
  const isHelper = isDeveloper || role === 'helper';
  const isStaff = isHelper || role === 'staff';
  const staffLike = isStaffLike(role) || isBoughtAdmin;
  const canAssignRolesFlag = isFullAdmin || role === 'helper';

  const banned = profile ? isCurrentlyBanned(profile) : false;
  const blockedByLock = appLocked && user && !staffLike;

  return (
    <Ctx.Provider
      value={{
        user,
        appUser,
        profile,
        role,
        isAdmin,
        isBoughtAdmin,
        isOwner,
        isActingOwner,
        isModerator,
        isDeveloper,
        isHelper,
        isStaff,
        isStaffLike: staffLike,
        canAssignRoles: canAssignRolesFlag,
        appLocked,
        appLockMessage,
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
      ) : blockedByLock ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111214] px-6 text-center">
          <p className="text-2xl font-bold text-white">Site locked</p>
          <p className="max-w-md text-sm text-gray-400">{appLockMessage}</p>
          <p className="text-xs text-gray-600">Only staff can access right now</p>
          <button onClick={signOut} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white">
            Log out
          </button>
        </div>
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
