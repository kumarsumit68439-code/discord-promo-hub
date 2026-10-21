'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { Brain, Send } from 'lucide-react';

type Model = { id: string; kind: 'chat' | 'audio' | 'safety'; owned_by?: string };
type Msg = { role: 'user' | 'assistant'; content: string };

export default function AiPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/groq/models')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        const list: Model[] = d.models || [];
        setModels(list);
        setModel(d.defaultModel || list.find((m) => m.kind === 'chat')?.id || '');
      })
      .catch(() => setError('Models load nahi hue'));
  }, []);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setBusy(true); setError('');
    try {
      const r = await authFetch('/api/groq/chat', { method: 'POST', body: JSON.stringify({ model, messages: next }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'AI error');
      setMsgs([...next, { role: 'assistant', content: d.reply }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'AI error'); }
    finally { setBusy(false); }
  }

  const chat = models.filter((m) => m.kind === 'chat');

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-black text-white"><Brain className="h-6 w-6 text-indigo-300" /> Groq AI</h1>
        <p className="mt-1 text-sm text-gray-400">Groq ke saare live models ({models.length}) · free tier rate limits ke saath</p>

        {!user ? (
          <p className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-gray-300">AI use karne ke liye <Link href="/login" className="text-indigo-300 underline">login</Link> karein.</p>
        ) : (
          <>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-4 w-full rounded-xl border border-white/10 bg-discord-card px-3 py-2.5 text-sm text-white">
              {chat.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
            <div className="mt-4 min-h-[40vh] space-y-3 rounded-2xl border border-white/10 bg-discord-card p-4">
              {msgs.length === 0 && <p className="text-sm text-gray-500">Kuch bhi poochhein…</p>}
              {msgs.map((m, i) => (
                <div key={i} className={'max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ' + (m.role === 'user' ? 'ml-auto bg-discord-blurple text-white' : 'bg-black/25 text-gray-200')}>{m.content}</div>
              ))}
              {busy && <p className="text-xs text-gray-500">Soch raha hai…</p>}
              <div ref={end} />
            </div>
            {error && <p className="mt-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <div className="mt-3 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send(); }} placeholder="Message likhein…" className="flex-1 rounded-xl border border-white/10 bg-discord-card px-3 py-3 text-sm text-white outline-none focus:border-discord-blurple" />
              <button disabled={busy || !text.trim() || !model} onClick={() => void send()} className="rounded-xl bg-discord-blurple px-4 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
