'use client';

import { useCallback, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { Check, X, Wallet } from 'lucide-react';

type Row = {
  id: string; amount: number; utr: string; status: 'pending' | 'approved' | 'rejected';
  ai_verdict: string | null; ai_reason: string | null; admin_note: string | null; created_at: string;
  profile: { display_name: string | null; discord_username: string | null; avatar_url: string | null } | null;
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'] as const;

export default function PaymentCheckPage() {
  const { isAdmin, loading } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/admin/payments?status=' + filter);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Load nahi hua');
      setRows(d.payments || []); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Load nahi hua'); }
  }, [filter]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 8000);
    return () => window.clearInterval(t);
  }, [isAdmin, load]);

  async function decide(id: string, decision: 'approve' | 'reject') {
    let note = '';
    if (decision === 'reject') {
      const n = window.prompt('Reject reason (user ko dikhega):', 'Payment nahi mila / UTR galat');
      if (n === null) return;
      note = n;
    } else if (!window.confirm('Payment mil gaya? Approve karne se user ka Premium turant chalu ho jayega.')) return;
    setBusyId(id);
    try {
      const r = await authFetch('/api/admin/payments', { method: 'POST', body: JSON.stringify({ id, decision, note }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyId(''); }
  }

  const badge = { pending: 'bg-amber-400/10 text-amber-200', approved: 'bg-emerald-400/10 text-emerald-200', rejected: 'bg-rose-400/10 text-rose-200' };

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white"><Wallet className="h-6 w-6 text-indigo-300" /> Payment Check</h1>
        <p className="mt-1 text-sm text-gray-400">UTR ko apne UPI app / bank statement mein match karein, phir approve karein.</p>

        {!loading && !isAdmin ? (
          <p className="mt-6 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200">Sirf admin ye page dekh sakta hai.</p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={'rounded-lg px-4 py-2 text-sm font-medium capitalize ' + (filter === f ? 'bg-discord-blurple text-white' : 'bg-discord-card text-gray-400')}>{f}</button>
              ))}
            </div>
            {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            {rows.length === 0 && !error && <p className="mt-6 text-sm text-gray-400">Koi payment nahi hai.</p>}
            <div className="mt-5 space-y-3">
              {rows.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-discord-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {p.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.profile.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                      ) : <div className="h-8 w-8 rounded-full bg-discord-blurple" />}
                      <div>
                        <p className="text-sm font-semibold text-white">{p.profile?.display_name || p.profile?.discord_username || 'User'}</p>
                        <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={'rounded-full px-3 py-1 text-xs ' + badge[p.status]}>{p.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <p className="text-gray-300">Amount: <b className="text-white">₹{p.amount}</b></p>
                    <p className="text-gray-300 sm:col-span-2">UTR: <b className="font-mono tracking-wider text-white">{p.utr}</b></p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    AI scan: <span className={p.ai_verdict === 'suspicious' ? 'text-amber-300' : 'text-gray-300'}>{p.ai_verdict || 'n/a'}</span>
                    {p.ai_reason ? ' · ' + p.ai_reason : ''}
                    {p.admin_note ? ' · Note: ' + p.admin_note : ''}
                  </p>
                  {p.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <button disabled={busyId === p.id} onClick={() => void decide(p.id, 'approve')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Check className="h-4 w-4" />Approve</button>
                      <button disabled={busyId === p.id} onClick={() => void decide(p.id, 'reject')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"><X className="h-4 w-4" />Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
