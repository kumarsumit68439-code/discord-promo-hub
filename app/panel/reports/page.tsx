'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { Flag } from 'lucide-react';

type ReportRow = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  reporter?: { display_name: string | null };
  reported?: { display_name: string | null };
};

export default function ReportsPage() {
  const { isStaffLike, loading, user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isStaffLike) router.replace('/');
  }, [loading, isStaffLike, router]);

  async function load() {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setRows((data as ReportRow[]) || []);
  }

  useEffect(() => {
    if (isStaffLike) load();
  }, [isStaffLike]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    setMsg(error ? error.message : `Marked ${status}`);
    load();
  }

  if (loading || !isStaffLike) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Staff access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20">
            <Flag className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reports</h1>
            <p className="text-xs text-gray-400">User → user reports · keep community safe</p>
          </div>
        </div>
        {msg && <p className="mb-3 text-sm text-gray-300">{msg}</p>}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/5 bg-discord-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.status === 'open'
                      ? 'bg-red-500/20 text-red-400'
                      : r.status === 'resolved'
                        ? 'bg-discord-green/20 text-discord-green'
                        : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-medium text-white">{r.reason}</p>
              {r.details && <p className="mt-1 text-xs text-gray-400">{r.details}</p>}
              <p className="mt-2 text-[11px] text-gray-500">
                Reported user:{' '}
                <Link href={`/u/${r.reported_id}`} className="text-discord-blurple underline">
                  {r.reported_id.slice(0, 8)}…
                </Link>
              </p>
              {r.status === 'open' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatus(r.id, 'reviewing')}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white"
                  >
                    Reviewing
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'resolved')}
                    className="rounded-lg bg-discord-green/20 px-3 py-1 text-xs text-discord-green"
                  >
                    Safe / Resolved
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'dismissed')}
                    className="rounded-lg bg-white/5 px-3 py-1 text-xs text-gray-400"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <p className="py-10 text-center text-gray-500">No reports yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
