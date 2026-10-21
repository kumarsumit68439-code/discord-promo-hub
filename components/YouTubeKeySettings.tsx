'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Youtube, CheckCircle2 } from 'lucide-react';

export default function YouTubeKeySettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('youtube-search', { body });
    if (invokeError) {
      let msg = invokeError.message || 'Request failed';
      try {
        const ctx = (invokeError as { context?: Response }).context;
        const b = ctx ? await ctx.json() : null;
        if (b?.error) msg = String(b.error);
      } catch { /* keep generic message */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    try { const d = await call({ action: 'status' }); setConfigured(Boolean(d.configured)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load status'); }
  }, [call]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      await call({ action: 'set-key', key: key.trim() });
      setKey(''); setMessage('YouTube key verified and saved to Supabase Vault. Music search now works.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm('Remove the stored YouTube API key? Music search will stop working.')) return;
    setBusy(true); setError(''); setMessage('');
    try { await call({ action: 'delete-key' }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-bold text-white"><Youtube className="h-5 w-5 text-rose-300" /> YouTube API key (admin)</h2>
      <p className="mt-1 text-sm text-gray-400">Used by Music search. Stored encrypted in Supabase Vault, checked with YouTube before saving and never shown again.</p>
      <p className="mt-3 text-sm">Status: {configured === null ? <span className="text-gray-400">checking…</span> : configured ? <span className="text-emerald-300">key saved</span> : <span className="text-amber-300">not set</span>}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste YouTube Data API v3 key" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple" />
        <button disabled={busy || key.trim().length < 20} onClick={() => void save()} className="rounded-xl bg-discord-blurple px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? 'Please wait…' : configured ? 'Replace key' : 'Verify & save'}</button>
        {configured && <button disabled={busy} onClick={() => void remove()} className="rounded-xl border border-rose-400/20 px-4 py-2.5 text-sm text-rose-200">Remove</button>}
      </div>
      {message && <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
      {error && <p className="mt-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    </section>
  );
}
