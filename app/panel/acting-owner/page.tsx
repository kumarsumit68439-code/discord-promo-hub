'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { ROLE_POWERS } from '@/lib/roles';
import { Star, Lock, Unlock, Shield } from 'lucide-react';

export default function ActingOwnerPanel() {
  const { role, isActingOwner, isOwner, loading, appLocked, refreshProfile } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only acting_owner role (real owner uses /panel/owner)
  const allowed = role === 'acting_owner' || isOwner;

  useEffect(() => {
    if (!loading && !allowed) router.replace('/');
  }, [loading, allowed, router]);

  async function toggleLock() {
    setBusy(true);
    const next = !appLocked;
    const { error } = await supabase.rpc('set_app_lock', {
      locked: next,
      msg: next ? 'Site locked by Acting Owner' : null,
    });
    setMsg(error ? error.message : next ? 'App LOCKED' : 'App UNLOCKED');
    await refreshProfile();
    setBusy(false);
  }

  if (loading || !allowed) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Acting Owner only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
            <Star className="h-6 w-6 text-orange-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Acting Owner Panel</h1>
            <p className="text-xs text-gray-400">Same powers as Owner (assigned by Owner only)</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-discord-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Powers</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {ROLE_POWERS.acting_owner.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>

        {msg && <p className="mb-3 text-sm text-gray-300">{msg}</p>}

        <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">App Lock</p>
              <p className="text-xs text-gray-400">
                {appLocked ? 'LOCKED for normal users' : 'Site open'}
              </p>
            </div>
            <button
              disabled={busy}
              onClick={toggleLock}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${
                appLocked ? 'bg-discord-green/20 text-discord-green' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {appLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {appLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>

        <Link href="/admin" className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <p className="font-semibold text-white">Admin Panel</p>
            <p className="text-xs text-gray-400">Ban · roles · delete via Owner tools</p>
          </div>
        </Link>
      </main>
    </div>
  );
}
