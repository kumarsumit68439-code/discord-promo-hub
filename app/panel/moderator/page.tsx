'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { banUntilFromDuration, BanDuration } from '@/lib/admin';
import { Wrench, Ban, Unlock } from 'lucide-react';

export default function ModeratorPanel() {
  const { isModerator, loading, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isModerator) router.replace('/');
  }, [loading, isModerator, router]);

  useEffect(() => {
    if (!isModerator) return;
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setUsers(data || []));
  }, [isModerator]);

  async function ban(id: string, d: BanDuration) {
    const { ban_until, is_permanent_ban } = banUntilFromDuration(d);
    if (is_permanent_ban) {
      setMsg('Moderators cannot permanent ban — use Admin');
      return;
    }
    const { error } = await supabase.rpc('admin_set_ban', {
      target_id: id,
      banned: true,
      permanent: false,
      until_ts: ban_until,
      reason: 'Mod action',
    });
    setMsg(error ? error.message : `Banned ${d}`);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    setUsers(data || []);
  }

  async function unban(id: string) {
    const { error } = await supabase.rpc('admin_set_ban', {
      target_id: id,
      banned: false,
      permanent: false,
      until_ts: null,
      reason: null,
    });
    setMsg(error ? error.message : 'Unbanned');
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    setUsers(data || []);
  }

  if (loading || !isModerator) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Moderator role required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20">
            <Wrench className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Moderator Panel</h1>
            <p className="text-xs text-gray-400">Temp bans only (1h / 2h / 24h)</p>
          </div>
        </div>
        {msg && <p className="mb-4 text-sm text-gray-300">{msg}</p>}
        <div className="space-y-2">
          {users
            .filter((u) => u.id !== user?.id)
            .map((u) => (
              <div key={u.id} className="rounded-xl border border-white/5 bg-discord-card p-3">
                <p className="font-medium text-white">{u.display_name || 'User'}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
                {u.is_banned ? (
                  <button
                    onClick={() => unban(u.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-discord-green"
                  >
                    <Unlock className="h-3 w-3" /> Unban
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    {(['1h', '2h', '24h'] as BanDuration[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => ban(u.id, d)}
                        className="rounded bg-red-500/15 px-2 py-1 text-[10px] text-red-400"
                      >
                        <Ban className="mr-1 inline h-3 w-3" />
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
