'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { ROLE_LABEL, ROLE_COLOR, ROLE_POWERS, SiteRole } from '@/lib/roles';
import { Crown, Shield, Lock, Unlock, Trash2 } from 'lucide-react';

export default function OwnerPanel() {
  const { isOwner, loading, role, appLocked, appLockMessage, refreshProfile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isOwner) router.replace('/');
  }, [loading, isOwner, router]);

  useEffect(() => {
    if (!isOwner) return;
    supabase
      .from('profiles')
      .select('*')
      .neq('role', 'user')
      .then(({ data }) => setStaff(data || []));
  }, [isOwner]);

  async function toggleLock() {
    setBusy(true);
    const next = !appLocked;
    const { error } = await supabase.rpc('set_app_lock', {
      locked: next,
      msg: next ? 'Site locked by Owner — only staff can enter' : null,
    });
    setMsg(error ? error.message : next ? 'App LOCKED for normal users' : 'App UNLOCKED');
    await refreshProfile();
    setBusy(false);
  }

  async function deleteAccount(id: string) {
    if (!window.confirm('Delete this account permanently (soft delete)?')) return;
    setBusy(true);
    const { error } = await supabase.rpc('owner_delete_account', { target_id: id });
    setMsg(error ? error.message : 'Account deleted');
    const { data } = await supabase.from('profiles').select('*').neq('role', 'user');
    setStaff(data || []);
    setBusy(false);
  }

  if (loading || !isOwner) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Owner only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/20">
            <Crown className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Owner Panel</h1>
            <p className="text-xs text-gray-400">Full website control</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-discord-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Your powers</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {ROLE_POWERS.owner.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>

        {msg && <p className="mb-3 text-sm text-gray-300">{msg}</p>}

        {/* App lock */}
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">App Lock</p>
              <p className="text-xs text-gray-400">
                {appLocked
                  ? 'LOCKED — normal users blocked · staff/admin still in'
                  : 'Unlocked — everyone can use the site'}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={toggleLock}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
                appLocked
                  ? 'bg-discord-green/20 text-discord-green'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {appLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {appLocked ? 'Unlock' : 'Lock site'}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link href="/admin" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Shield className="mb-2 h-5 w-5 text-amber-400" />
            <p className="font-semibold text-white">Admin Panel</p>
            <p className="text-xs text-gray-400">Ban · roles · users</p>
          </Link>
          <Link
            href="/panel/reports"
            className="rounded-xl border border-white/10 bg-discord-card p-4"
          >
            <p className="font-semibold text-white">Reports</p>
            <p className="text-xs text-gray-400">User reports queue</p>
          </Link>
        </div>

        <h2 className="mb-3 text-sm font-semibold text-gray-300">Staff · delete account</h2>
        <div className="space-y-2">
          {staff.map((u) => {
            const r = (u.role as SiteRole) || 'user';
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-discord-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {u.display_name || 'User'}
                  </p>
                  <span className={`text-[10px] font-bold ${ROLE_COLOR[r]}`}>
                    {ROLE_LABEL[r]}
                  </span>
                </div>
                <button
                  disabled={busy}
                  onClick={() => deleteAccount(u.id)}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  title="Delete account"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
