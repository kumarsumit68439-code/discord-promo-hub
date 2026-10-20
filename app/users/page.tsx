'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Search, User, MessagesSquare, UserPlus } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) => {
    const s = q.toLowerCase();
    if (!s) return true;
    return (
      (u.display_name || '').toLowerCase().includes(s) ||
      (u.discord_username || '').toLowerCase().includes(s) ||
      (u.bio || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-discord-darker pb-20">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Search users</h1>
        <p className="mb-4 text-sm text-gray-400">
          Account check · Follow · Message — har user pe open karo
        </p>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-discord-card p-3"
              >
                <Link href={`/u/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="h-11 w-11 rounded-full" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-discord-blurple">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {u.display_name || u.discord_username || 'User'}
                    </p>
                    {u.bio && <p className="truncate text-xs text-gray-400">{u.bio}</p>}
                  </div>
                </Link>
                <Link
                  href={`/u/${u.id}`}
                  className="rounded-lg bg-white/5 p-2 text-gray-400 hover:text-white"
                  title="Check profile · Follow"
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
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-gray-500">No users found</p>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
