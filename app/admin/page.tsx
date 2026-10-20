'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { BanDuration, banUntilFromDuration, isProtectedAccount } from '@/lib/admin';
import { ROLE_LABEL, ROLE_COLOR, SiteRole } from '@/lib/roles';
import { BADGE_OPTIONS, badgeEmoji } from '@/lib/badges';
import { Shield, Ban, Unlock, Search, CheckCircle2 } from 'lucide-react';

const ASSIGNABLE: SiteRole[] = [
  'user',
  'staff',
  'helper',
  'developer',
  'moderator',
  'admin',
  'acting_owner',
  'owner',
];

export default function AdminPage() {
  const { isAdmin, isOwner, isActingOwner, isModerator, isDeveloper, isHelper, isStaff, loading: authLoading, user, role, appUser } = useAuth();
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
    setMsg(error ? 'Role failed: ' + error.message : `✅ Role set to ${ROLE_LABEL[newRole]}`);
    await loadUsers();
    setBusy(null);
  }

  async function toggleVerified(u: Profile) {
    setBusy(u.id);
    const next = !u.is_verified;
    const { error } = await supabase.rpc('staff_set_badges', {
      target_id: u.id,
      new_badges: u.badges || [],
      verified: next,
    });
    setMsg(error ? error.message : next ? '✅ Verified badge ON' : 'Verified OFF');
    await loadUsers();
    setBusy(null);
  }

  async function toggleBadge(u: Profile, badgeId: string) {
    setBusy(u.id);
    const current = u.badges || [];
    const next = current.includes(badgeId)
      ? current.filter((b) => b !== badgeId)
      : [...current, badgeId];
    const { error } = await supabase.rpc('staff_set_badges', {
      target_id: u.id,
      new_badges: next,
      verified: u.is_verified ?? null,
    });
    setMsg(error ? error.message : `Badges updated`);
    await loadUsers();
    setBusy(null);
  }

  const filtered = users.filter((u) => {
    const s = q.toLowerCase();
    if (!s) return true;
    return (
      (u.display_name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.discord_id || '').includes(s) ||
      (u.role || '').includes(s)
    );
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Admin only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-400">
              {appUser?.username} · Role:{' '}
              <span className="text-amber-400">{ROLE_LABEL[role]}</span>
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Link href="/panel/applications" className="rounded-lg bg-indigo-500/20 px-3 py-2 text-indigo-300">
            Role applications
          </Link>
          <Link href="/panel/reports" className="rounded-lg bg-red-500/15 px-3 py-2 text-red-300">
            Reports
          </Link>
          <Link href="/rules" className="rounded-lg bg-white/5 px-3 py-2 text-gray-400">
            Rules
          </Link>
        </div>

        <section className="mb-5 rounded-xl border border-white/10 bg-discord-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-white">Role Panels</h2>
            <p className="mt-1 text-xs text-gray-400">Panel links are shown according to your assigned role and existing access permissions.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {isStaff && <Link href="/panel/staff" className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-sm font-semibold text-sky-300 hover:bg-sky-500/20">Staff Panel</Link>}
            {isHelper && <Link href="/panel/helper" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20">Helper Panel</Link>}
            {isDeveloper && <Link href="/panel/developer" className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20">Developer Panel</Link>}
            {isModerator && <Link href="/panel/moderator" className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3 text-sm font-semibold text-violet-300 hover:bg-violet-500/20">Moderator Panel</Link>}
            {isActingOwner && <Link href="/panel/acting-owner" className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm font-semibold text-orange-300 hover:bg-orange-500/20">Acting Owner Panel</Link>}
            {isOwner && <Link href="/panel/owner" className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/20">Owner Panel</Link>}
          </div>
        </section>

        {msg && (
          <div className="mb-3 rounded-lg border border-white/10 bg-discord-card px-3 py-2 text-sm text-white">
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
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((u) => {
              const isSelf = u.id === user?.id;
              const uRole = (u.role as SiteRole) || 'user';
              const protectedUser = isProtectedAccount({
                email: u.email,
                discordId: u.discord_id,
              });
              const badges = u.badges || [];

              return (
                <div key={u.id} className="rounded-xl border border-white/10 bg-discord-card p-4">
                  <div className="flex gap-3">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-discord-blurple font-bold text-white">
                        {(u.display_name || '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1 font-semibold text-white">
                        {u.display_name || 'User'}
                        {u.is_verified && (
                          <span title="Verified" className="text-sky-400">
                            <CheckCircle2 className="inline h-4 w-4" />
                          </span>
                        )}
                        {isSelf && <span className="text-xs text-amber-400">(you)</span>}
                        {badges.map((b) => (
                          <span key={b} title={b} className="text-sm">
                            {badgeEmoji(b)}
                          </span>
                        ))}
                      </p>
                      <p className="text-xs text-gray-400">{u.email || '—'}</p>
                      <p className="text-[10px] text-gray-500">
                        Discord: {u.discord_id || '—'} · {u.id.slice(0, 8)}…
                      </p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLOR[uRole]}`}>
                        {ROLE_LABEL[uRole]}
                      </span>
                      {protectedUser && (
                        <span className="ml-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                          Protected
                        </span>
                      )}
                      {u.is_banned && <p className="mt-1 text-xs text-red-400">BANNED</p>}
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                      {/* ROLES — always visible */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-400/90">
                          Give role
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ASSIGNABLE.filter((r) => {
                            if (r === 'owner' || r === 'acting_owner' || r === 'admin') return isOwner;
                            return true;
                          }).map((r) => (
                            <button
                              key={r}
                              type="button"
                              disabled={busy === u.id || uRole === r}
                              onClick={() => setRole(u.id, r)}
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-40 ${
                                uRole === r
                                  ? 'border-discord-blurple bg-discord-blurple/30 text-white'
                                  : `${ROLE_COLOR[r]} border-white/10`
                              }`}
                            >
                              {ROLE_LABEL[r]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* VERIFIED + BADGES */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-400/90">
                          Badges · Verified
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={busy === u.id}
                            onClick={() => toggleVerified(u)}
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                              u.is_verified
                                ? 'border-sky-400 bg-sky-500/30 text-sky-200'
                                : 'border-white/10 bg-white/5 text-gray-400'
                            }`}
                          >
                            ✅ Verified
                          </button>
                          {BADGE_OPTIONS.filter((b) => b.id !== 'verified').map((b) => {
                            const on = badges.includes(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                disabled={busy === u.id}
                                onClick={() => toggleBadge(u, b.id)}
                                className={`rounded-lg border px-2 py-1.5 text-[11px] ${
                                  on
                                    ? 'border-discord-blurple/50 bg-discord-blurple/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400'
                                }`}
                              >
                                {b.emoji} {b.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* BAN */}
                      {!protectedUser && (
                        <div>
                          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400/90">
                            Ban
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {u.is_banned ? (
                              <button
                                type="button"
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
                                  type="button"
                                  disabled={busy === u.id}
                                  onClick={() => {
                                    const reason =
                                      window.prompt(`Ban (${d}):`, 'Violation of rules') ||
                                      'Violation of rules';
                                    banUser(u.id, d, reason);
                                  }}
                                  className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs text-red-400"
                                >
                                  <Ban className="mr-1 inline h-3 w-3" />
                                  {d}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
