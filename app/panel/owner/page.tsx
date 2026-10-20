'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { ROLE_LABEL, ROLE_COLOR, SiteRole } from '@/lib/roles';
import { Crown, Shield, Users } from 'lucide-react';

export default function OwnerPanel() {
  const { isOwner, loading, role } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<Profile[]>([]);

  useEffect(() => {
    if (!loading && !isOwner) router.replace('/');
  }, [loading, isOwner, router]);

  useEffect(() => {
    if (!isOwner) return;
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['owner', 'admin', 'moderator', 'developer', 'helper'])
      .then(({ data }) => setStaff(data || []));
  }, [isOwner]);

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
            <p className="text-xs text-gray-400">Max 2 owners · full control</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
          >
            <Shield className="mb-2 h-5 w-5 text-amber-400" />
            <p className="font-semibold text-white">Admin Panel</p>
            <p className="text-xs text-gray-400">Ban · roles · users</p>
          </Link>
          <div className="rounded-xl border border-white/10 bg-discord-card p-4">
            <Users className="mb-2 h-5 w-5 text-gray-400" />
            <p className="font-semibold text-white">Your role</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${ROLE_COLOR[role]}`}>
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>

        <h2 className="mb-3 text-sm font-semibold text-gray-300">Staff & roles</h2>
        <div className="space-y-2">
          {staff.map((u) => {
            const r = (u.role as SiteRole) || 'user';
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-discord-card p-3"
              >
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-discord-blurple" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {u.display_name || u.discord_username || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLOR[r]}`}>
                  {ROLE_LABEL[r]}
                </span>
              </div>
            );
          })}
          {staff.length === 0 && (
            <p className="text-sm text-gray-500">No staff yet — assign roles in Admin Panel</p>
          )}
        </div>
      </main>
    </div>
  );
}
