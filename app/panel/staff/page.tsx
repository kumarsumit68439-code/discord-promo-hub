'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { ROLE_POWERS } from '@/lib/roles';
import { ClipboardList, Radio } from 'lucide-react';

export default function StaffPanel() {
  const { isStaff, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [listings, setListings] = useState(0);
  const [openReports, setOpenReports] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!loading && !isStaff && !isAdmin) router.replace('/');
  }, [loading, isStaff, isAdmin, router]);

  useEffect(() => {
    if (!isStaff && !isAdmin) return;
    (async () => {
      const [{ data: ps }, { count: lc }, { count: rc }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setUsers(ps || []);
      setListings(lc || 0);
      setOpenReports(rc || 0);
    })();

    const ch = supabase
      .channel('staff-scan')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);
        setUsers(data || []);
      })
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isStaff, isAdmin]);

  if (loading || (!isStaff && !isAdmin)) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Staff role required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20">
            <ClipboardList className="h-6 w-6 text-sky-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Staff Panel</h1>
            <p className="text-xs text-gray-400">Live site scan · reports</p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
              live ? 'bg-discord-green/20 text-discord-green' : 'bg-white/5 text-gray-500'
            }`}
          >
            <Radio className="h-3 w-3" /> {live ? 'Live' : '…'}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-discord-card p-3 text-center">
            <p className="text-lg font-bold text-white">{users.length}+</p>
            <p className="text-[10px] text-gray-500">Users</p>
          </div>
          <div className="rounded-xl bg-discord-card p-3 text-center">
            <p className="text-lg font-bold text-white">{listings}</p>
            <p className="text-[10px] text-gray-500">Listings</p>
          </div>
          <Link href="/panel/reports" className="rounded-xl bg-discord-card p-3 text-center">
            <p className="text-lg font-bold text-red-400">{openReports}</p>
            <p className="text-[10px] text-gray-500">Open reports</p>
          </Link>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-discord-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Powers</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {ROLE_POWERS.staff.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>

        <h2 className="mb-2 text-sm font-semibold text-gray-300">Recent users (live)</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-discord-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {u.display_name || 'User'}
                </p>
                <p className="text-[10px] text-gray-500">{u.role || 'user'}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
