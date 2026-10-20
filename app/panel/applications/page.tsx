'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { APPLY_QUESTIONS } from '@/lib/rules-content';
import { ROLE_LABEL, SiteRole } from '@/lib/roles';
import { ClipboardCheck } from 'lucide-react';

type AppRow = {
  id: string;
  user_id: string;
  requested_role: string;
  q1: string;
  q2: string;
  q3: string;
  status: string;
  created_at: string;
  review_note: string | null;
};

export default function ApplicationsReviewPage() {
  const { isStaffLike, loading, role } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!loading && !isStaffLike) router.replace('/');
  }, [loading, isStaffLike, router]);

  async function load() {
    let q = supabase
      .from('role_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data } = await q;
    setRows((data as AppRow[]) || []);
  }

  useEffect(() => {
    if (isStaffLike) load();
  }, [isStaffLike, filter]);

  async function review(id: string, approve: boolean) {
    const note =
      window.prompt(approve ? 'Approval note (optional):' : 'Reject reason:') || null;
    const { error } = await supabase.rpc('review_role_application', {
      app_id: id,
      approve,
      note,
    });
    setMsg(error ? error.message : approve ? 'Approved — role granted' : 'Rejected');
    load();
  }

  if (loading || !isStaffLike) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Staff only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
            <ClipboardCheck className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Role applications</h1>
            <p className="text-xs text-gray-400">
              Answers check → Approve / Reject · You: {ROLE_LABEL[role as SiteRole] || role}
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filter === 'pending' ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              filter === 'all' ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-400'
            }`}
          >
            All
          </button>
          <Link href="/rules" className="ml-auto text-xs text-discord-blurple underline">
            Rules
          </Link>
        </div>

        {msg && <p className="mb-3 text-sm text-gray-300">{msg}</p>}

        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/5 bg-discord-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">
                  {ROLE_LABEL[r.requested_role as SiteRole] || r.requested_role}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    r.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-400'
                      : r.status === 'approved'
                        ? 'bg-discord-green/20 text-discord-green'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <p className="mb-2 text-[10px] text-gray-500">
                User{' '}
                <Link href={`/u/${r.user_id}`} className="text-discord-blurple underline">
                  {r.user_id.slice(0, 8)}…
                </Link>{' '}
                · {new Date(r.created_at).toLocaleString()}
              </p>

              {[r.q1, r.q2, r.q3].map((ans, i) => (
                <div key={i} className="mb-2 rounded-lg bg-black/30 p-2">
                  <p className="text-[11px] font-medium text-gray-400">
                    Q{i + 1}. {APPLY_QUESTIONS[i]?.question}
                  </p>
                  <p className="mt-1 text-sm text-gray-200">{ans}</p>
                </div>
              ))}

              {r.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => review(r.id, true)}
                    className="flex-1 rounded-lg bg-discord-green/20 py-2 text-xs font-bold text-discord-green"
                  >
                    Approve → give role
                  </button>
                  <button
                    onClick={() => review(r.id, false)}
                    className="flex-1 rounded-lg bg-red-500/20 py-2 text-xs font-bold text-red-400"
                  >
                    Reject
                  </button>
                </div>
              )}
              {r.review_note && (
                <p className="mt-2 text-[11px] text-gray-500">Note: {r.review_note}</p>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <p className="py-10 text-center text-gray-500">No applications</p>
          )}
        </div>
      </main>
    </div>
  );
}
