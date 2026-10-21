'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { Crown, Trophy } from 'lucide-react';

type Row = { user_id: string; username: string | null; avatar: string | null; xp: number; level: number; messages: number; voice_seconds: number };

function Board() {
  const bot = useSearchParams().get('bot') || '';
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [ai, setAi] = useState('');
  const [tracked, setTracked] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bot) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/leaderboard?bot=' + encodeURIComponent(bot), { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) throw new Error(d.error || 'Load nahi hua');
        setRows(d.rows || []); setName(d.bot?.name || ''); setAi(d.ai || ''); setTracked(d.tracked || 0); setError('');
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Load nahi hua'); }
    };
    void load();
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 5000); // live
    return () => { alive = false; window.clearInterval(t); };
  }, [bot]);

  if (!bot) {
    return (
      <p className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300">
        Apne Level bot ka leaderboard dekhne ke liye <Link href="/hosting" className="text-indigo-300 underline">Bots</Link> page par bot card ka “Leaderboard” button dabayein.
      </p>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-gray-400">{name || 'Level bot'} · {tracked} members tracked · live update har 5 second</p>
      {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      {ai && <p className="mt-4 rounded-xl border border-indigo-300/20 bg-indigo-300/10 p-3 text-sm text-indigo-100">🤖 {ai}</p>}
      {!error && rows.length === 0 && <p className="mt-6 text-sm text-gray-400">Abhi koi activity nahi. Members chat ya VC karenge to level badhega.</p>}
      <div className="mt-5 space-y-2">
        {rows.map((r, i) => (
          <div key={r.user_id} className={'flex items-center gap-3 rounded-2xl border p-3 ' + (i === 0 ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10 bg-discord-card')}>
            <span className="w-7 text-center text-lg font-black text-white">{i === 0 ? <Crown className="mx-auto h-5 w-5 text-amber-300" /> : i + 1}</span>
            {r.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatar} alt="" className="h-10 w-10 rounded-full" />
            ) : <div className="h-10 w-10 rounded-full bg-discord-blurple" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{r.username || r.user_id}</p>
              <p className="text-xs text-gray-500">{r.messages} msgs · {Math.round(r.voice_seconds / 60)} min VC · {r.xp} XP</p>
            </div>
            <span className="rounded-full bg-discord-blurple px-3 py-1 text-xs font-bold text-white">Level {r.level}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white"><Trophy className="h-6 w-6 text-amber-300" /> Level Leaderboard</h1>
        <Suspense fallback={null}><Board /></Suspense>
      </main>
    </div>
  );
}
