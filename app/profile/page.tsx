'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import PremiumBadge from '@/components/PremiumBadge';
import { User, Save, CheckCircle2, XCircle, Mail, Hash, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, appUser, profile, loading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || appUser?.username || '');
      setBio(profile.bio || '');
    } else if (appUser) {
      setDisplayName(appUser.username);
    }
  }, [profile, appUser]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !appUser) return;
    setSaving(true);
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim() || appUser.username,
      bio: bio.trim() || null,
      discord_username: appUser.username,
      avatar_url: appUser.avatarUrl,
      discord_id: appUser.discordId,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user || !appUser) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <User className="mx-auto mb-4 h-12 w-12 text-discord-blurple" />
          <h1 className="mb-2 text-xl font-bold text-white">Your profile</h1>
          <p className="mb-6 text-gray-400">Login to edit profile and check Discord account</p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-discord-blurple px-6 py-3 text-sm font-semibold text-white"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const discordConnected = Boolean(appUser.discordId);

  return (
    <div className="min-h-screen bg-discord-darker pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Account & Profile</h1>

        {profile && (
          <div className="mb-4">
            <PremiumBadge
              is_premium={profile.is_premium}
              premium_until={profile.premium_until}
              size="md"
              showUntil
            />
            {!profile.is_premium && (
              <p className="mt-2 text-xs text-gray-500">
                Premium nahi hai ·{' '}
                <Link href="/pricing" className="text-amber-300 hover:underline">
                  Plan buy karein →
                </Link>
              </p>
            )}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/5 bg-discord-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
            <Shield className="h-4 w-4" /> Discord account check
          </h2>
          <div className="flex gap-4">
            {appUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appUser.avatarUrl}
                alt=""
                className={
                  'h-16 w-16 rounded-full ' +
                  (profile?.is_premium ? 'ring-2 ring-amber-400/60' : '')
                }
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-discord-blurple text-xl font-bold text-white">
                {appUser.username[0]}
              </div>
            )}
            <div>
              <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
                {appUser.username}
                <PremiumBadge is_premium={profile?.is_premium} premium_until={profile?.premium_until} />
              </p>
              {discordConnected ? (
                <span className="inline-flex items-center gap-1 text-xs text-discord-green">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Discord linked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                  <XCircle className="h-3.5 w-3.5" /> Email account (link Discord optional)
                </span>
              )}
              {user.email && (
                <p className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </p>
              )}
              {appUser.discordId && (
                <p className="flex items-center gap-1 text-sm text-gray-400">
                  <Hash className="h-3.5 w-3.5" /> {appUser.discordId}
                </p>
              )}
              <Link href={`/u/${user.id}`} className="mt-2 inline-block text-sm text-discord-blurple">
                View public profile →
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-discord-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-400">Edit profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-discord-darker px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-discord-darker px-3 py-2.5 text-sm text-white outline-none focus:border-discord-blurple"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
