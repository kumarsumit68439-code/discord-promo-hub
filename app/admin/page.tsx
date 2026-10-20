'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { BanDuration, banUntilFromDuration, isProtectedAccount } from '@/lib/admin';
import { ROLE_LABEL, ROLE_COLOR, SiteRole } from '@/lib/roles';
import { Shield, Ban, Unlock, Search } from 'lucide-react';

const ASSIGNABLE: SiteRole[] = ['user', 'helper', 'developer', 'moderator', 'admin', 'owner'];

export default function AdminPage() {
  const { isAdmin, isOwner, loading: authLoading, user, role } = useAuth();
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
    if (error) setMsg('Load error: ' + error.message);
    setUsers(data || []);
    setLoading(false);
  }

  async function banUser(id: string, duration: BanDuration, reason: string) {
    if (id === user?.id) return setMsg('Cannot ban yourself');
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
    setMsg(error ? 'Ban failed: ' + error.message : `Banned (${duration})`);
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
    setMsg(error ? 'Unban failed: ' + error.message : 'Unbanned');
    await loadUsers();
    setBusy(null);
  }

  async function setRole(id: string, newRole: SiteRole) {
    setBusy(id);
    setMsg(null);
    const { error } = await supabase.rpc('admin_set_role', {
      target_id: id,
      new_role: newRole,
    });
    setMsg(error ? 'Role failed: ' + error.message : `Role → ${ROLE_LABEL[newRole]}`);
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
      (u.role || '').includes(s) ||
      u.id.includes(s)
    );
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">
          {authLoading ? 'Loading...' : 'Admin access only — role required'}
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
              Your role: <span className="text-amber-400">{ROLE_LABEL[role]}</span> · Ban +
              assign roles
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
            placeholder="Search users..."
            className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const isSelf = u.id === user?.id;
              const uRole = (u.role as SiteRole) || 'user';
              const protectedUser = isProtectedAccount({
                email: u.email,
                discordId: u.discord_id,
              });
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
                          {isSelf && <span className="ml-2 text-xs text-amber-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{u.email || 'No email'}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLOR[uRole]}`}
                          >
                            {ROLE_LABEL[uRole]}
                          </span>
                          {protectedUser && (
                            <span className="inline-block rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                              Protected — cannot ban
                            </span>
                          )}
                        </div>
                        {u.is_banned && (
                          <p className="mt-1 text-xs font-medium text-red-400">
                            BANNED {u.is_permanent_ban ? 'permanent' : u.ban_until || ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isSelf && (
                      <div className="flex w-full flex-col gap-2 sm:w-auto">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">Role:</span>
                          {ASSIGNABLE.filter((r) => {
                            if (r === 'owner' || r === 'admin') return isOwner;
                            return true;
                          }).map((r) => (
                            <button
                              key={r}
                              disabled={busy === u.id || uRole === r}
                              onClick={() => setRole(u.id, r)}
                              className={`rounded-md px-2 py-1 text-[10px] font-semibold disabled:opacity-40 ${ROLE_COLOR[r]}`}
                            >
                              {ROLE_LABEL[r]}
                            </button>
                          ))}
                        </div>

                        {!protectedUser && (
                          <div className="flex flex-wrap gap-2">
                            {u.is_banned ? (
                              <button
                                disabled={busy === u.id}
                                onClick={() => unbanUser(u.id)}
                                className="flex items-center gap-1 rounded-lg bg-discord-green/20 px-3 py-1.5 text-xs font-semibold text-discord-green"
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
                                  className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-400"
                                >
                                  <Ban className="mr-1 inline h-3 w-3" />
                                  {d}
                                </button>
                              ))
                            )}
                          </div>
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
