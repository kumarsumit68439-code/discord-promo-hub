'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PremiumBadge from '@/components/PremiumBadge';
import { Search, User, MessagesSquare, UserPlus, Radio } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();

    const channel = supabase
      .channel('profiles-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Profile;
            setUsers((prev) => {
              if (prev.some((u) => u.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Profile;
            setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, ...row } : u)));
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as Profile;
            setUsers((prev) => prev.filter((u) => u.id !== row.id));
          }
        }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = users.filter((u) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return (
      (u.display_name || '').toLowerCase().includes(s) ||
      (u.discord_username || '').toLowerCase().includes(s) ||
      (u.bio || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-discord-darker pb-20">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-white">Search users</h1>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              live ? 'bg-discord-green/20 text-discord-green' : 'bg-white/5 text-gray-500'
            }`}
          >
            <Radio className="h-3 w-3" />
            {live ? 'Live' : 'Connecting…'}
          </span>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Premium users · Naye users live · Follow · Message
        </p>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
          />
        </div>

        <p className="mb-3 text-xs text-gray-500">{filtered.length} users</p>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const isMe = user?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={
                    'flex items-center gap-3 rounded-xl border p-3 ' +
                    (u.is_premium
                      ? 'border-amber-400/20 bg-gradient-to-r from-amber-500/5 to-discord-card'
                      : 'border-white/5 bg-discord-card')
                  }
                >
                  <Link href={`/u/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatar_url}
                        alt=""
                        className={
                          'h-11 w-11 rounded-full ' +
                          (u.is_premium ? 'ring-2 ring-amber-400/50' : '')
                        }
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-discord-blurple">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 truncate font-medium text-white">
                        <span className="truncate">{u.display_name || u.discord_username || 'User'}</span>
                        {isMe && <span className="text-xs text-discord-blurple">(you)</span>}
                        <PremiumBadge is_premium={u.is_premium} premium_until={u.premium_until} />
                      </p>
                      {u.bio ? (
                        <p className="truncate text-xs text-gray-400">{u.bio}</p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                  {!isMe && (
                    <>
                      <Link
                        href={`/u/${u.id}`}
                        className="rounded-lg bg-white/5 p-2 text-gray-400 hover:text-white"
                        title="Profile · Follow"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/messages/${u.id}`}
                        className="rounded-lg bg-white/5 p-2 text-gray-400 hover:text-discord-blurple"
                        title="Message"
                      >
                        <MessagesSquare className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-gray-500">
                No users found. Jab koi naya login karega, yahan live dikhega.
              </p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
