'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { BanDuration, banUntilFromDuration } from '@/lib/admin';
import { Shield, Ban, Unlock, Search } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin, loading: authLoading, user, appUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/');
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setMsg('Load error: ' + error.message);
      setUsers([]);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function banUser(id: string, duration: BanDuration, reason: string) {
    if (id === user?.id) {
      setMsg('You cannot ban yourself');
      return;
    }
    setBusy(id);
    setMsg(null);
    const { ban_until, is_permanent_ban } = banUntilFromDuration(duration);
    const { error } = await supabase.rpc('admin_set_ban', {
      target_id: id,
      banned: true,
      permanent: is_permanent_ban,
      until_ts: ban_until,
      reason: reason || 'Violation of rules',
    });
    if (error) {
      setMsg('Ban failed: ' + error.message);
    } else {
      setMsg(`User banned (${duration}) successfully`);
    }
    await loadUsers();
    setBusy(null);
  }

  async function unbanUser(id: string) {
    setBusy(id);
    setMsg(null);
    const { error } = await supabase.rpc('admin_set_ban', {
      target_id: id,
      banned: false,
      permanent: false,
      until_ts: null,
      reason: null,
    });
    if (error) {
      setMsg('Unban failed: ' + error.message);
    } else {
      setMsg('User unbanned successfully');
    }
    await loadUsers();
    setBusy(null);
  }

  const filtered = users.filter((u) => {
    const s = q.toLowerCase();
    if (!s) return true;
    return (
      (u.display_name || '').toLowerCase().includes(s) ||
      (u.discord_username || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.discord_id || '').includes(s) ||
      u.id.includes(s)
    );
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">
          {authLoading ? 'Loading...' : 'Admin access only'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-400">
              Logged in as {appUser?.username || user?.email} · Discord{' '}
              {appUser?.discordId || '—'}
            </p>
          </div>
        </div>

        {msg && (
          <div className="mb-4 rounded-lg border border-white/10 bg-discord-card px-4 py-3 text-sm text-white">
            {msg}
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, Discord ID..."
            className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading users...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
            <p className="text-gray-400">No other users yet</p>
            <p className="mt-2 text-xs text-gray-500">
              Jab koi naya user Discord/email se login karega, yahan dikhega.
              Apne aap ko ban nahi kar sakte — ban buttons dusre users pe aate hain.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <div key={u.id} className="rounded-xl border border-white/5 bg-discord-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-discord-blurple text-sm font-bold text-white">
                          {(u.display_name || '?')[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          {u.display_name || u.discord_username || 'User'}
                          {isSelf && (
                            <span className="ml-2 text-xs text-amber-400">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{u.email || 'No email'}</p>
                        <p className="text-xs text-gray-500">
                          Discord: {u.discord_id || '—'} · {u.id.slice(0, 8)}…
                        </p>
                        {u.is_banned && (
                          <p className="mt-1 text-xs font-medium text-red-400">
                            BANNED {u.is_permanent_ban ? 'permanent' : u.ban_until || ''}
                            {u.ban_reason ? ` — ${u.ban_reason}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isSelf && (
                      <div className="flex flex-wrap gap-2">
                        {u.is_banned ? (
                          <button
                            disabled={busy === u.id}
                            onClick={() => unbanUser(u.id)}
                            className="flex items-center gap-1 rounded-lg bg-discord-green/20 px-3 py-1.5 text-xs font-semibold text-discord-green disabled:opacity-50"
                          >
                            <Unlock className="h-3.5 w-3.5" /> Unban
                          </button>
                        ) : (
                          (['1h', '2h', '24h', 'permanent'] as BanDuration[]).map((d) => (
                            <button
                              key={d}
                              disabled={busy === u.id}
                              onClick={() => {
                                const reason =
                                  window.prompt(`Ban reason (${d}):`, 'Violation of rules') ||
                                  'Violation of rules';
                                banUser(u.id, d, reason);
                              }}
                              className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-400 disabled:opacity-50"
                            >
                              <Ban className="mr-1 inline h-3 w-3" />
                              {d}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
