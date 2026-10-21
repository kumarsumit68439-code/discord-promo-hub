'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Bot, MessageCircle, Sparkles, Clock3, Ban, Users, Ticket,
  Copy, ExternalLink, Trash2, Power, Pencil, CheckCircle2, ShieldCheck,
} from 'lucide-react';

const MODULES = [
  { id: 'welcome', title: 'Welcome Bot', icon: MessageCircle, detail: 'Welcome image + custom message when a member joins, optional auto role, goodbye message.' },
  { id: 'moderation', title: 'Timeout Bot', icon: Clock3, detail: '/timeout and /untimeout with permission and role-hierarchy checks.' },
  { id: 'ban', title: 'Ban Bot', icon: Ban, detail: '/ban and /unban with moderation log.' },
  { id: 'ai', title: 'AI Chat Bot', icon: Sparkles, detail: 'Mention the bot or use !ai to chat. Needs an AI provider key saved below.' },
  { id: 'supporter', title: 'Supporter Bot', icon: Users, detail: '/supporter grant and revoke for a configured role.' },
  { id: 'invite', title: 'Invite Bot', icon: Ticket, detail: 'Tracks who invited whom, /invites and /invite-leaderboard.' },
];

type BotRow = {
  id: string; client_id: string; bot_name: string | null; modules: string[];
  config: Record<string, unknown>; enabled: boolean; status: string;
  last_error: string | null; last_heartbeat: string | null;
};

type Form = {
  clientId: string; botToken: string; modules: string[]; guildId: string;
  welcomeChannelId: string; welcomeRoleId: string; welcomeTitle: string;
  welcomeMessage: string; goodbyeMessage: string; welcomeImage: boolean;
  modLogChannelId: string; aiChannelId: string; supporterRoleId: string; aiProvider: string;
};

const EMPTY: Form = {
  clientId: '', botToken: '', modules: ['welcome'], guildId: '', welcomeChannelId: '', welcomeRoleId: '',
  welcomeTitle: 'Welcome to {server}!',
  welcomeMessage: 'Welcome {user}! You are member #{count}. Enjoy your stay!',
  goodbyeMessage: 'Goodbye {username}.',
  welcomeImage: true, modLogChannelId: '', aiChannelId: '', supporterRoleId: '', aiProvider: '',
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const input = 'mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple';
const statusStyle: Record<string, string> = {
  online: 'bg-emerald-400/10 text-emerald-200',
  pending: 'bg-amber-400/10 text-amber-200',
  offline: 'bg-white/5 text-gray-400',
  error: 'bg-rose-400/10 text-rose-200',
};

// The worker sends a heartbeat every minute. No heartbeat for 3+ minutes means the
// 24/7 worker (Railway) is down, so the website shows offline instead of a stale "online".
const STALE_MS = 3 * 60 * 1000;

function statusView(b: BotRow): { label: string; style: string; note: string } {
  if (!b.enabled) return { label: 'disabled', style: statusStyle.offline, note: '' };
  if (b.status === 'online') {
    const age = b.last_heartbeat ? Date.now() - new Date(b.last_heartbeat).getTime() : Number.POSITIVE_INFINITY;
    if (age > STALE_MS) {
      return { label: 'offline', style: statusStyle.offline, note: 'Worker is not responding (no heartbeat for over 3 minutes).' };
    }
    return { label: 'online', style: statusStyle.online, note: '' };
  }
  return { label: b.status, style: statusStyle[b.status] || statusStyle.offline, note: '' };
}

export default function HostedBots() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('discord-bot-hosting', { body });
    if (invokeError) {
      let msg = invokeError.message || 'Could not reach hosting service';
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
    try { const d = await call({ action: 'status' }); setBots(d.bots || []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load bots'); }
  }, [call]);

  // Live status: poll every 5s while the tab is visible (worker -> Supabase SQL -> this page).
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const toggleModule = (id: string) =>
    set('modules', form.modules.includes(id) ? form.modules.filter((m) => m !== id) : [...form.modules, id]);

  const inviteUrl = useMemo(() => {
    if (!/^\d{15,22}$/.test(form.clientId.trim())) return '';
    let p = 1024n | 2048n | 16384n | 65536n | 32768n; // view, send, embed, history, attach files
    if (form.modules.includes('moderation')) p |= 1099511627776n;
    if (form.modules.includes('ban')) p |= 4n;
    if (form.modules.includes('supporter') || (form.modules.includes('welcome') && form.welcomeRoleId)) p |= 268435456n;
    if (form.modules.includes('invite')) p |= 32n;
    return 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(form.clientId.trim()) +
      '&scope=bot%20applications.commands&permissions=' + p.toString();
  }, [form.clientId, form.modules, form.welcomeRoleId]);

  const fill = (t: string) => t.replace(/\{user\}/g, '@NewMember').replace(/\{username\}/g, 'NewMember')
    .replace(/\{server\}/g, 'My Server').replace(/\{count\}/g, '128');

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const d = await call({
        action: 'save', clientId: form.clientId.trim(), botToken: form.botToken.trim(), modules: form.modules,
        config: {
          guildId: form.guildId, welcomeChannelId: form.welcomeChannelId, welcomeRoleId: form.welcomeRoleId,
          welcomeTitle: form.welcomeTitle, welcomeMessage: form.welcomeMessage, goodbyeMessage: form.goodbyeMessage,
          welcomeImage: form.welcomeImage, modLogChannelId: form.modLogChannelId, aiChannelId: form.aiChannelId,
          supporterRoleId: form.supporterRoleId, aiProvider: form.aiProvider,
        },
      });
      setMessage('Saved' + (d.botName ? ' bot "' + d.botName + '"' : '') + '. The 24/7 worker connects it to Discord within ~30 seconds; the status below turns online (or shows exactly what is wrong).');
      setForm((f) => ({ ...f, botToken: '' }));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  async function toggle(b: BotRow) {
    setBusy(true); setError('');
    try { await call({ action: 'toggle', id: b.id, enabled: !b.enabled }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function remove(b: BotRow) {
    if (!window.confirm('Delete this bot and its stored token?')) return;
    setBusy(true); setError('');
    try { await call({ action: 'delete', id: b.id }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  function edit(b: BotRow) {
    const c = b.config || {};
    setForm({
      clientId: b.client_id, botToken: '', modules: b.modules,
      guildId: str(c.guildId), welcomeChannelId: str(c.welcomeChannelId), welcomeRoleId: str(c.welcomeRoleId),
      welcomeTitle: str(c.welcomeTitle) || EMPTY.welcomeTitle, welcomeMessage: str(c.welcomeMessage) || EMPTY.welcomeMessage,
      goodbyeMessage: str(c.goodbyeMessage) || EMPTY.goodbyeMessage, welcomeImage: c.welcomeImage !== false,
      modLogChannelId: str(c.modLogChannelId), aiChannelId: str(c.aiChannelId),
      supporterRoleId: str(c.supporterRoleId), aiProvider: str(c.aiProvider),
    });
    window.scrollTo({ top: document.getElementById('bot-form')?.offsetTop ?? 0, behavior: 'smooth' });
  }

  const isEditing = bots.some((b) => b.client_id === form.clientId.trim());
  const has = (m: string) => form.modules.includes(m);
  const canSave = /^\d{15,22}$/.test(form.clientId.trim()) && form.modules.length > 0 && (isEditing || form.botToken.trim().length > 20);

  return (
    <section id="bot-form" className="mt-10 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Bot className="h-5 w-5 text-indigo-300" /> Add your bot</h2>
        <p className="mt-1 text-sm text-gray-400">Enter Client ID and Bot Token from the Discord Developer Portal. The token is verified with Discord, stored encrypted in Supabase Vault and never shown again.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-gray-300">Application / Client ID</label>
            <input inputMode="numeric" value={form.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Numeric Client ID" className={input} />
          </div>
          <div>
            <label className="text-sm text-gray-300">Bot Token {isEditing && <span className="text-xs text-gray-500">(leave empty to keep saved token)</span>}</label>
            <input type="password" autoComplete="off" value={form.botToken} onChange={(e) => set('botToken', e.target.value)} placeholder={isEditing ? 'Saved securely' : 'Paste bot token'} className={input} />
          </div>
          <div>
            <label className="text-sm text-gray-300">Server (Guild) ID <span className="text-xs text-gray-500">optional, recommended</span></label>
            <input inputMode="numeric" value={form.guildId} onChange={(e) => set('guildId', e.target.value)} placeholder="Limit bot to one server" className={input} />
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-white">Modules</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon; const active = has(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                className={'rounded-xl border p-4 text-left transition ' + (active ? 'border-discord-blurple/70 bg-discord-blurple/10' : 'border-white/10 bg-black/10 hover:border-white/20')}>
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-indigo-300" />
                  <span className={'rounded-full px-2 py-0.5 text-xs ' + (active ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-400')}>{active ? 'On' : 'Off'}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{m.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">{m.detail}</p>
              </button>
            );
          })}
        </div>

        {has('welcome') && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-sm font-semibold text-white">Welcome settings</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm text-gray-300">Welcome channel ID</label>
                <input inputMode="numeric" value={form.welcomeChannelId} onChange={(e) => set('welcomeChannelId', e.target.value)} placeholder="Channel ID" className={input} /></div>
              <div><label className="text-sm text-gray-300">Auto role ID <span className="text-xs text-gray-500">optional</span></label>
                <input inputMode="numeric" value={form.welcomeRoleId} onChange={(e) => set('welcomeRoleId', e.target.value)} placeholder="Role given on join" className={input} /></div>
              <div className="sm:col-span-2"><label className="text-sm text-gray-300">Welcome title</label>
                <input maxLength={100} value={form.welcomeTitle} onChange={(e) => set('welcomeTitle', e.target.value)} className={input} /></div>
              <div className="sm:col-span-2"><label className="text-sm text-gray-300">Welcome message</label>
                <textarea maxLength={1000} rows={3} value={form.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)} className={input} /></div>
              <div className="sm:col-span-2"><label className="text-sm text-gray-300">Goodbye message</label>
                <input maxLength={300} value={form.goodbyeMessage} onChange={(e) => set('goodbyeMessage', e.target.value)} className={input} /></div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.welcomeImage} onChange={(e) => set('welcomeImage', e.target.checked)} /> Send welcome image card
            </label>
            <p className="mt-2 text-xs text-gray-500">Placeholders: {'{user}'} mention, {'{username}'}, {'{server}'}, {'{count}'} member number.</p>
            <div className="mt-3 rounded-lg border-l-4 border-discord-blurple bg-black/25 p-3">
              <p className="text-xs text-gray-500">Preview</p>
              <p className="mt-1 text-sm font-bold text-white">{fill(form.welcomeTitle)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{fill(form.welcomeMessage)}</p>
            </div>
          </div>
        )}

        {(has('moderation') || has('ban') || has('supporter') || has('ai')) && (
          <div className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
            {(has('moderation') || has('ban') || has('supporter')) && (
              <div><label className="text-sm text-gray-300">Mod log channel ID <span className="text-xs text-gray-500">optional</span></label>
                <input inputMode="numeric" value={form.modLogChannelId} onChange={(e) => set('modLogChannelId', e.target.value)} className={input} /></div>
            )}
            {has('supporter') && (
              <div><label className="text-sm text-gray-300">Supporter role ID</label>
                <input inputMode="numeric" value={form.supporterRoleId} onChange={(e) => set('supporterRoleId', e.target.value)} className={input} /></div>
            )}
            {has('ai') && (<>
              <div><label className="text-sm text-gray-300">AI channel ID <span className="text-xs text-gray-500">optional</span></label>
                <input inputMode="numeric" value={form.aiChannelId} onChange={(e) => set('aiChannelId', e.target.value)} className={input} /></div>
              <div><label className="text-sm text-gray-300">AI provider</label>
                <select value={form.aiProvider} onChange={(e) => set('aiProvider', e.target.value)} className={input}>
                  <option value="">Select (key saved below)</option><option value="groq">Groq</option><option value="xai">xAI Grok</option>
                </select></div>
            </>)}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button disabled={busy || !canSave} onClick={() => void save()} className="rounded-xl bg-discord-blurple px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
            {busy ? 'Please wait…' : isEditing ? 'Update bot' : 'Verify token & host bot'}
          </button>
          {inviteUrl && (<>
            <a href={inviteUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white">Invite bot to server <ExternalLink className="ml-1 inline h-4 w-4" /></a>
            <button onClick={() => { void navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-200"><Copy className="mr-1 inline h-4 w-4" />{copied ? 'Copied' : 'Copy invite'}</button>
          </>)}
        </div>
        {message && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Welcome needs the Server Members intent, AI chat needs Message Content intent, both enabled in the Developer Portal. Bot role must sit above any role it manages. Reset your token if it was ever shared.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="font-bold text-white">Your hosted bots</h2>
        {bots.length === 0 && <p className="mt-3 text-sm text-gray-400">No bots yet.</p>}
        <div className="mt-3 space-y-3">
          {bots.map((b) => {
            const v = statusView(b);
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/15 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{b.bot_name || b.client_id}</p>
                  <p className="text-xs text-gray-500">{b.modules.join(', ')}</p>
                  {v.note
                    ? <p className="mt-1 text-xs text-amber-300">{v.note}</p>
                    : b.enabled && b.status === 'error' && b.last_error
                      ? <p className="mt-1 text-xs text-rose-300">{b.last_error}</p>
                      : null}
                  {v.label === 'online' && b.last_heartbeat && (
                    <p className="mt-1 text-xs text-gray-500">Live: last heartbeat {new Date(b.last_heartbeat).toLocaleTimeString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={'rounded-full px-3 py-1 text-xs ' + v.style}>
                    {v.label === 'online' && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />}
                    {v.label}
                  </span>
                  <button onClick={() => edit(b)} className="rounded-lg border border-white/10 p-2 text-gray-200" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button disabled={busy} onClick={() => void toggle(b)} className="rounded-lg border border-white/10 p-2 text-gray-200" title="Enable / disable"><Power className="h-4 w-4" /></button>
                  <button disabled={busy} onClick={() => void remove(b)} className="rounded-lg border border-rose-400/20 p-2 text-rose-200" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-500">Status becomes <b>online</b> only after the always-on bot worker (Railway/Render/VPS) logs the bot in to Discord and every ID and permission checks out. If something is wrong the exact problem is shown here, and a bot whose worker stops answering switches to <b>offline</b> within 3 minutes.</p>
      </div>
    </section>
  );
}
