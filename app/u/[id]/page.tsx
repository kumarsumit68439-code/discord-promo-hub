'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile, Listing } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import ReportButton from '@/components/ReportButton';
import PremiumBadge from '@/components/PremiumBadge';
import { badgeEmoji, badgeLabel } from '@/lib/badges';
import { ROLE_LABEL, ROLE_COLOR, SiteRole } from '@/lib/roles';
import { UserPlus, UserMinus, MessageSquare, Users, CheckCircle2 } from 'lucide-react';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: p }, { data: ls }, { count: fc }, { count: fg }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('listings')
          .select('*')
          .eq('user_id', id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      ]);
      setProfile(p);
      setListings(ls || []);
      setFollowers(fc || 0);
      setFollowing(fg || 0);
      if (user) {
        const { data: f } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .maybeSingle();
        setIsFollowing(!!f);
      }
      setLoading(false);
    })();
  }, [id, user]);

  async function toggleFollow() {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.id === id) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false);
      setFollowers((n) => Math.max(0, n - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
      setFollowers((n) => n + 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">User not found</p>
      </div>
    );
  }

  const name = profile.display_name || profile.discord_username || 'User';
  const uRole = (profile.role as SiteRole) || 'user';
  const badges = profile.badges || [];

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div
          className={
            'rounded-2xl border p-6 ' +
            (profile.is_premium && profile.premium_until && new Date(profile.premium_until) > new Date()
              ? 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-discord-card to-discord-card shadow-[0_0_40px_rgba(251,191,36,0.08)]'
              : 'border-white/5 bg-discord-card')
          }
        >
          <div className="flex flex-wrap items-start gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className={
                  'h-20 w-20 rounded-full ' +
                  (profile.is_premium ? 'ring-2 ring-amber-400/60 ring-offset-2 ring-offset-discord-card' : '')
                }
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-discord-blurple text-2xl font-bold text-white">
                {name[0]}
              </div>
            )}
            <div className="flex-1">
              <h1 className="flex flex-wrap items-center gap-1.5 text-xl font-bold text-white">
                {name}
                {profile.is_verified && (
                  <CheckCircle2 className="h-5 w-5 text-sky-400" aria-label="Verified" />
                )}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <PremiumBadge
                  is_premium={profile.is_premium}
                  premium_until={profile.premium_until}
                  size="md"
                  showUntil
                />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLOR[uRole]}`}>
                  {ROLE_LABEL[uRole]}
                </span>
                {badges.map((b) => (
                  <span
                    key={b}
                    title={badgeLabel(b)}
                    className="rounded-full bg-white/5 px-1.5 py-0.5 text-sm"
                  >
                    {badgeEmoji(b)}
                  </span>
                ))}
              </div>
              {profile.bio && <p className="mt-2 text-sm text-gray-400">{profile.bio}</p>}
              <div className="mt-3 flex gap-4 text-sm">
                <Link href={`/u/${id}/followers`} className="text-gray-300 hover:text-white">
                  <strong className="text-white">{followers}</strong> followers
                </Link>
                <Link href={`/u/${id}/following`} className="text-gray-300 hover:text-white">
                  <strong className="text-white">{following}</strong> following
                </Link>
              </div>
            </div>
          </div>

          {user?.id !== id && (
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={toggleFollow}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ${
                    isFollowing ? 'bg-white/10 text-white' : 'bg-discord-blurple text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" /> Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Follow
                    </>
                  )}
                </button>
                <Link
                  href={`/messages/${id}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-semibold text-white"
                >
                  <MessageSquare className="h-4 w-4" /> Message
                </Link>
              </div>
              <ReportButton targetId={id} />
            </div>
          )}
        </div>

        <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold uppercase text-gray-400">
          <Users className="h-4 w-4" /> Public listings
        </h2>
        {listings.length === 0 ? (
          <p className="text-sm text-gray-500">No public promos yet</p>
        ) : (
          <div className="space-y-2">
            {listings.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-white/5 bg-discord-card p-4"
              >
                <p className="font-medium text-white">{l.title}</p>
                <p className="text-xs text-gray-400">{l.type}</p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
