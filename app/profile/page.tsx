'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  supabase,
  getDiscordProfile,
  AppUser,
  Profile,
} from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import {
  User,
  Save,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mail,
  Hash,
  Shield,
} from 'lucide-react';
import type { User as SBUser } from '@supabase/supabase-js';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SBUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setUser(session.user);
      const au = getDiscordProfile(session.user);
      setAppUser(au);
      await loadProfile(session.user.id, au);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUser(null);
        setAppUser(null);
        setProfile(null);
      } else {
        setUser(session.user);
        setAppUser(getDiscordProfile(session.user));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string, au: AppUser) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || au.username);
      setBio(data.bio || '');
    } else {
      // create profile row
      const row = {
        id: uid,
        display_name: au.username,
        discord_username: au.username,
        avatar_url: au.avatarUrl,
        discord_id: au.discordId,
        bio: null as string | null,
      };
      await supabase.from('profiles').upsert(row);
      setProfile({ ...row, bio: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setDisplayName(au.username);
      setBio('');
    }
  }

  async function signIn() {
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
    router.push('/');
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName.trim() || appUser?.username,
        bio: bio.trim() || null,
        discord_username: appUser?.username,
        avatar_url: appUser?.avatarUrl,
        discord_id: appUser?.discordId,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const discordConnected = Boolean(
    user?.app_metadata?.provider === 'discord' ||
      user?.identities?.some((i) => i.provider === 'discord')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader profile={null} authLoading onLogin={signIn} onLogout={signOut} />
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader profile={null} onLogin={signIn} onLogout={signOut} />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-discord-blurple/20">
            <User className="h-8 w-8 text-discord-blurple" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Discord Account</h1>
          <p className="mb-6 text-gray-400">
            Login with Discord to view your account status and edit your profile.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 rounded-lg bg-discord-blurple px-6 py-3 text-sm font-semibold text-white hover:bg-[#4752c4]"
          >
            <MessageCircle className="h-5 w-5" />
            Login with Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-28">
      <SiteHeader profile={appUser} onLogin={signIn} onLogout={signOut} />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Account & Profile</h1>

        {/* Discord account check */}
        <section className="mb-6 rounded-2xl border border-white/5 bg-discord-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <Shield className="h-4 w-4" />
            Discord Account Check
          </h2>

          <div className="flex items-start gap-4">
            {appUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appUser.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full ring-2 ring-discord-blurple/40"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-discord-blurple text-xl font-bold text-white">
                {appUser.username[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold text-white">{appUser.username}</span>
                {discordConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-discord-green/15 px-2.5 py-0.5 text-xs font-medium text-discord-green">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Discord linked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    <XCircle className="h-3.5 w-3.5" />
                    Not linked
                  </span>
                )}
              </div>

              <div className="grid gap-1.5 text-sm text-gray-400">
                {appUser.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {appUser.email}
                  </p>
                )}
                {appUser.discordId && (
                  <p className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Discord ID: {appUser.discordId}
                  </p>
                )}
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  User UID: {user.id.slice(0, 8)}…
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Edit profile */}
        <section className="rounded-2xl border border-white/5 bg-discord-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <User className="h-4 w-4" />
            Edit Profile
          </h2>

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={64}
                className="w-full rounded-lg border border-white/10 bg-discord-darker px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
                placeholder="Your public name"
              />
              <p className="mt-1 text-xs text-gray-500">
                Discord name stays the same; this is your hub display name.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-lg border border-white/10 bg-discord-darker px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
                placeholder="A short bio about you or your community..."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white hover:bg-[#4752c4] disabled:opacity-50"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save profile'}
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}