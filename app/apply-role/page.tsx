'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import {
  APPLY_QUESTIONS,
  APPLYABLE_ROLES,
  ApplyRole,
} from '@/lib/rules-content';
import { ROLE_LABEL, SiteRole } from '@/lib/roles';
import { ClipboardList } from 'lucide-react';

export default function ApplyRolePage() {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [requested, setRequested] = useState<ApplyRole>('staff');
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [a3, setA3] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<{ status: string; requested_role: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('role_applications')
      .select('status, requested_role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setMine(data || []));
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (a1.trim().length < 15 || a2.trim().length < 15 || a3.trim().length < 15) {
      setMsg('Har question ka answer kam se kam 15 characters likho (rules padh ke).');
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('role_applications').insert({
      user_id: user.id,
      requested_role: requested,
      q1: a1.trim(),
      q2: a2.trim(),
      q3: a3.trim(),
    });
    if (error) setMsg(error.message);
    else {
      setMsg('Application submitted! Staff review karega — approve hone par role mil jayega.');
      setA1('');
      setA2('');
      setA3('');
      const { data } = await supabase
        .from('role_applications')
        .select('status, requested_role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setMine(data || []);
    }
    setBusy(false);
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-discord-blurple/20">
            <ClipboardList className="h-6 w-6 text-discord-blurple" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Apply for role</h1>
            <p className="text-xs text-gray-400">
              Current: {ROLE_LABEL[role as SiteRole] || role} ·{' '}
              <Link href="/rules" className="text-discord-blurple underline">
                Read rules first
              </Link>
            </p>
          </div>
        </div>

        {mine.length > 0 && (
          <div className="mb-4 rounded-xl border border-white/10 bg-discord-card p-3 text-xs text-gray-400">
            <p className="mb-1 font-semibold text-gray-300">Your applications</p>
            {mine.map((m, i) => (
              <p key={i}>
                {m.requested_role} →{' '}
                <span
                  className={
                    m.status === 'approved'
                      ? 'text-discord-green'
                      : m.status === 'rejected'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }
                >
                  {m.status}
                </span>
              </p>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Role chaho</label>
            <select
              value={requested}
              onChange={(e) => setRequested(e.target.value as ApplyRole)}
              className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white"
            >
              {APPLYABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r as SiteRole] || r}
                </option>
              ))}
            </select>
          </div>

          {APPLY_QUESTIONS.map((q, idx) => (
            <div key={q.id}>
              <label className="mb-1 block text-sm font-medium text-white">
                Q{idx + 1}. {q.question}
              </label>
              <p className="mb-1 text-[11px] text-gray-500">{q.hint}</p>
              <textarea
                required
                rows={3}
                value={idx === 0 ? a1 : idx === 1 ? a2 : a3}
                onChange={(e) =>
                  idx === 0 ? setA1(e.target.value) : idx === 1 ? setA2(e.target.value) : setA3(e.target.value)
                }
                placeholder="Apna answer likho (rules ke hisaab se)..."
                className="w-full rounded-lg border border-white/10 bg-discord-card px-3 py-2 text-sm text-white outline-none focus:border-discord-blurple"
              />
            </div>
          ))}

          {msg && <p className="text-sm text-gray-300">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-discord-blurple py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </main>
    </div>
  );
}
