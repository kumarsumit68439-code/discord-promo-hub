'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api';
import { FREE_MODULES, PlanState } from '@/lib/plans';
import { HOSTING_MODULES } from './botModuleList';
import {
  Bot, Sparkles, Lock, Crown, Copy, ExternalLink, Trash2, Power, Pencil, CheckCircle2,
  Send, LogOut, Mic, MicOff, Timer, Volume2, Trophy,
} from 'lucide-react';

const MODULES = HOSTING_MODULES;

type VoiceState = { desired?: boolean; connected?: boolean; channelId?: string; channelName?: string | null; muted?: boolean; aiOn?: boolean; until?: string | null };
type BotRow = {
  id: string; client_id: string; bot_name: string | null; modules: string[];
  config: Record<string, unknown>; enabled: boolean; status: string;
  last_error: string | null; last_heartbeat: string | null;
  voice_state?: VoiceState | null;
};

type Form = {
  clientId: string; botToken: string; modules: string[]; guildId: string;
  welcomeChannelId: string; welcomeRoleId: string; welcomeTitle: string;
  welcomeMessage: string; goodbyeMessage: string; welcomeImage: boolean;
  modLogChannelId: string; aiChannelId: string; supporterRoleId: string; aiProvider: string;
  supportChannelId: string; supportMessage: string; supportFaq: string;
  ticketChannelId: string; ticketCategoryId: string; ticketSupportRoleId: string; ticketLogChannelId: string;
  levelChannelId: string; protectLogChannelId: string; memberAddChannelId: string; inviteDmMessage: string; voiceChannelId: string;
};

const EMPTY: Form = {
  clientId: '', botToken: '', modules: ['welcome'], guildId: '', welcomeChannelId: '', welcomeRoleId: '',
  welcomeTitle: 'Welcome to {server}!',
  welcomeMessage: 'Welcome {user}! You are member #{count}. Enjoy your stay!',
  goodbyeMessage: 'Goodbye {username}.',
  welcomeImage: true, modLogChannelId: '', aiChannelId: '', supporterRoleId: '', aiProvider: '',
  supportChannelId: '', supportMessage: '', supportFaq: '',
  ticketChannelId: '', ticketCategoryId: '', ticketSupportRoleId: '', ticketLogChannelId: '',
  levelChannelId: '', protectLogChannelId: '', memberAddChannelId: '', inviteDmMessage: 'Hey! Join our server: {link}', voiceChannelId: '',
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const input = 'mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple';
const statusStyle: Record<string, string> = {
  online: 'bg-emerald-400/10 text-emerald-200',
  pending: 'bg-amber-400/10 text-amber-200',
  offline: 'bg-white/5 text-gray-400',
  error: 'bg-rose-400/10 text-rose-200',
};
const STALE_MS = 3 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusView(b: BotRow): { label: string; style: string; note: string } {
  if (!b.enabled) return { label: 'disabled', style: statusStyle.offline, note: '' };
  if (b.status === 'online') {
    const age = b.last_heartbeat ? Date.now() - new Date(b.last_heartbeat).getTime() : Number.POSITIVE_INFINITY;
    if (age > STALE_MS) return { label: 'offline', style: statusStyle.offline, note: 'Worker is not responding (no heartbeat for over 3 minutes).' };
    return { label: 'online', style: statusStyle.online, note: '' };
  }
  return { label: b.status, style: statusStyle[b.status] || statusStyle.offline, note: '' };
}

function VoicePanel({ bot }: { bot: BotRow }) {
  const vs = (bot.voice_state || {}) as VoiceState;
  const [channel, setChannel] = useState(str(bot.config?.voiceChannelId));
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setNote('');
    try {
      const r = await authFetch('/api/voice', { method: 'POST', body: JSON.stringify({ botId: bot.id, action, channelId: channel.trim(), ...extra }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setNote('Command sent…');
      for (let i = 0; i < 10; i++) {
        await sleep(2000);
        const rr = await authFetch('/api/voice?botId=' + bot.id + '&id=' + d.id);
        const dd = await rr.json();
        const c = dd.command;
        if (c && c.status !== 'pending') { setNote((c.status === 'done' ? '✅ ' : '❌ ') + (c.result || '')); return; }
      }
      setNote('Bot has not replied yet. Worker may be offline.');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  const left = vs.until ? Math.max(0, Math.round((new Date(vs.until).getTime() - now) / 1000)) : 0;
  const btn = 'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40';
  return (
    <div className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-white"><Mic className="h-4 w-4 text-indigo-300" /> Voice control</p>
      <p className="mt-1 text-xs text-gray-400">
        {vs.connected
          ? <>🟢 VC: <b className="text-white">{vs.channelName || vs.channelId}</b> · mic {vs.muted ? 'muted' : 'on'} · AI {vs.aiOn ? 'on' : 'off'} · {vs.until ? 'timer ' + Math.floor(left / 60) + 'm' : '24/7 AFK'}</>
          : vs.desired ? '🟡 Connecting…' : 'Bot is not in a voice channel.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input inputMode="numeric" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Voice channel ID" className={input + ' !mt-0 sm:max-w-[220px]'} />
        <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder="Timer min" className={input + ' !mt-0 sm:max-w-[120px]'} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy} className={btn} onClick={() => void send('join', { minutes })}><Volume2 className="mr-1 inline h-3.5 w-3.5" />Join</button>
        <button disabled={busy} className={btn} onClick={() => void send('leave')}><LogOut className="mr-1 inline h-3.5 w-3.5" />Leave</button>
        <button disabled={busy} className={btn} onClick={() => void send('mute')}><MicOff className="mr-1 inline h-3.5 w-3.5" />Mute</button>
        <button disabled={busy} className={btn} onClick={() => void send('unmute')}><Mic className="mr-1 inline h-3.5 w-3.5" />Unmute</button>
        <button disabled={busy} className={btn} onClick={() => void send('timer', { minutes: minutes || 0 })}><Timer className="mr-1 inline h-3.5 w-3.5" />Timer</button>
        <button disabled={busy} className={btn} onClick={() => void send(vs.aiOn ? 'ai_off' : 'ai_on')}><Sparkles className="mr-1 inline h-3.5 w-3.5" />AI voice</button>
      </div>
      {note && <p className="mt-2 text-xs text-gray-300">{note}</p>}
    </div>
  );
}

export default function HostedBots() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [plan, setPlan] = useState<PlanState | null>(null);
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
      } catch { /* keep */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    try { const d = await call({ action: 'status' }); setBots(d.bots || []); setPlan(d.plan || null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load bots'); }
  }, [call]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const premium = Boolean(plan?.premium);
  const locked = (id: string) => !premium && !FREE_MODULES.includes(id);

  const toggleModule = (id: string) => {
    if (locked(id)) { setError('This module needs a paid plan. Open Plans to unlock.'); return; }
    setError('');
    set('modules', form.modules.includes(id) ? form.modules.filter((m) => m !== id) : [...form.modules, id]);
  };

  const inviteUrl = useMemo(() => {
    if (!/^\d{15,22}$/.test(form.clientId.trim())) return '';
    let p = 1024n | 2048n | 16384n | 65536n | 32768n;
    const has = (m: string) => form.modules.includes(m);
    if (has('moderation') || has('protect') || has('security')) p |= 1099511627776n;
    if (has('ban') || has('security') || has('moderation')) p |= 4n;
    if (has('moderation') || has('security')) p |= 2n;
    if (has('supporter') || has('ticket') || has('tokenclaim') || (has('welcome') && form.welcomeRoleId)) p |= 268435456n;
    if (has('invite') || has('memberadd')) p |= 32n | 1n;
    if (has('ticket') || has('tokenclaim') || has('security')) p |= 16n;
    if (has('protect') || has('security')) p |= 8192n;
    if (has('security')) p |= 8n;
    if (has('voice')) p |= 1048576n | 2097152n;
    if (has('channelbuilder') || has('serversetup')) p |= 8n; // Administrator
    return 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(form.clientId.trim()) +
      '&scope=bot%20applications.commands&permissions=' + p.toString();
  }, [form.clientId, form.modules, form.welcomeRoleId]);

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const { clientId, botToken, modules, ...config } = form;
      const d = await call({ action: 'save', clientId: clientId.trim(), botToken: botToken.trim(), modules, config });
      setMessage('Saved' + (d.botName ? ' bot "' + d.botName + '"' : '') + '. Worker will come online in ~30s.');
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

  async function testWelcome(b: BotRow) {
    setBusy(true); setError(''); setMessage('');
    try { await call({ action: 'test_welcome', id: b.id }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Test failed'); }
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
      clientId: b.client_id, botToken: '', modules: b.modules?.length ? b.modules : ['welcome'],
      guildId: str(c.guildId), welcomeChannelId: str(c.welcomeChannelId), welcomeRoleId: str(c.welcomeRoleId),
      welcomeTitle: str(c.welcomeTitle) || EMPTY.welcomeTitle, welcomeMessage: str(c.welcomeMessage) || EMPTY.welcomeMessage,
      goodbyeMessage: str(c.goodbyeMessage) || EMPTY.goodbyeMessage, welcomeImage: c.welcomeImage !== false,
      modLogChannelId: str(c.modLogChannelId), aiChannelId: str(c.aiChannelId),
      supporterRoleId: str(c.supporterRoleId), aiProvider: str(c.aiProvider),
      supportChannelId: str(c.supportChannelId), supportMessage: str(c.supportMessage), supportFaq: str(c.supportFaq),
      ticketChannelId: str(c.ticketChannelId), ticketCategoryId: str(c.ticketCategoryId),
      ticketSupportRoleId: str(c.ticketSupportRoleId), ticketLogChannelId: str(c.ticketLogChannelId),
      levelChannelId: str(c.levelChannelId), protectLogChannelId: str(c.protectLogChannelId),
      memberAddChannelId: str(c.memberAddChannelId), inviteDmMessage: str(c.inviteDmMessage) || EMPTY.inviteDmMessage,
      voiceChannelId: str(c.voiceChannelId),
    });
    window.scrollTo({ top: document.getElementById('bot-form')?.offsetTop ?? 0, behavior: 'smooth' });
  }

  const isEditing = bots.some((b) => b.client_id === form.clientId.trim());
  const has = (m: string) => form.modules.includes(m);
  const canSave = /^\d{15,22}$/.test(form.clientId.trim()) && form.modules.length > 0 && (isEditing || form.botToken.trim().length > 20);

  const field = (label: string, key: keyof Form, hint = '', ph = 'ID') => (
    <div><label className="text-sm text-gray-300">{label} {hint && <span className="text-xs text-gray-500">{hint}</span>}</label>
      <input inputMode="numeric" value={String(form[key])} onChange={(e) => set(key, e.target.value as Form[typeof key])} placeholder={ph} className={input} /></div>
  );

  return (
    <section id="bot-form" className="mt-10 space-y-6">
      {plan && (
        <div className={'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm ' + (premium ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : plan.free_expired ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-white/10 bg-discord-card text-gray-300')}>
          <p className="flex items-center gap-2">
            {premium ? <Crown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {premium ? <>Premium active until {plan.premium_until ? new Date(plan.premium_until).toLocaleDateString() : '—'}: all modules unlocked.</>
              : plan.free_expired ? 'Free trial ended. Buy a plan to unlock premium bots.'
              : 'Free forever: Simple, Welcome, Support. Other modules need a plan.'}
          </p>
          {!premium && <Link href="/pricing" className="rounded-lg bg-discord-blurple px-4 py-2 text-xs font-bold text-white">View plans</Link>}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Bot className="h-5 w-5 text-indigo-300" /> Add your bot</h2>
        <p className="mt-1 text-sm text-gray-400">Client ID + Bot Token. Channel & VC Builder and Server Setup need only optional Server ID — no channel IDs.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-gray-300">Application / Client ID</label>
            <input inputMode="numeric" value={form.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Numeric Client ID" className={input} />
          </div>
          <div>
            <label className="text-sm text-gray-300">Bot Token {isEditing && <span className="text-xs text-gray-500">(empty = keep)</span>}</label>
            <input type="password" autoComplete="off" value={form.botToken} onChange={(e) => set('botToken', e.target.value)} placeholder={isEditing ? 'Saved securely' : 'Paste bot token'} className={input} />
          </div>
          {field('Server (Guild) ID', 'guildId', 'optional', 'Limit bot to one server')}
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-white">Modules ({form.modules.length} selected)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULES.map((m) => {
            const on = form.modules.includes(m.id);
            const isLocked = locked(m.id);
            const Icon = m.icon;
            const isSetup = m.id === 'channelbuilder' || m.id === 'serversetup';
            return (
              <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                className={'flex items-start gap-3 rounded-xl border p-3 text-left transition ' + (on ? 'border-discord-blurple bg-discord-blurple/15' : isLocked ? 'border-white/5 bg-black/20 opacity-70' : isSetup ? 'border-indigo-400/30 bg-indigo-400/5 hover:border-indigo-400/50' : 'border-white/10 bg-black/15 hover:border-white/20')}>
                <Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (on ? 'text-indigo-300' : isSetup ? 'text-indigo-300' : 'text-gray-400')} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                    {m.title}
                    {isSetup && <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-200">SETUP</span>}
                    {isLocked && <Lock className="h-3 w-3 text-amber-300" />}
                    {on && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-gray-400">{m.detail}</p>
                </div>
              </button>
            );
          })}
        </div>

        {(has('channelbuilder') || has('serversetup')) && (
          <div className="mt-5 space-y-2 rounded-xl border border-indigo-400/25 bg-indigo-400/10 p-4 text-sm text-indigo-100">
            <p className="font-semibold text-white">Channel & VC Builder / Server Setup</p>
            <p className="text-xs leading-5 text-indigo-100/90">
              No channel IDs needed. Save with Client ID + Token (+ optional Server ID), invite with <b>Administrator</b>, then in Discord:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-indigo-50">
              {has('channelbuilder') && <li><code className="rounded bg-black/30 px-1">/setup-server</code> — default categories, text channels & VCs</li>}
              {has('channelbuilder') && <li><code className="rounded bg-black/30 px-1">/setup-ai</code> — AI builds layout from your prompt</li>}
              {has('serversetup') && <li><code className="rounded bg-black/30 px-1">/setup-roles</code> — Owner, Admin, Mod, VIP, Member, Bot</li>}
              {has('serversetup') && <li><code className="rounded bg-black/30 px-1">/setup-full</code> — roles + full channel layout</li>}
            </ul>
          </div>
        )}

        {has('welcome') && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Welcome</p>
            {field('Welcome channel ID', 'welcomeChannelId')}
            {field('Auto role ID', 'welcomeRoleId', 'optional')}
            <div><label className="text-sm text-gray-300">Welcome message</label>
              <textarea value={form.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)} rows={2} className={input} /></div>
          </div>
        )}
        {(has('ticket') || has('tokenclaim')) && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Ticket / Token claim</p>
            {field('Ticket panel channel ID', 'ticketChannelId')}
            {field('Ticket category ID', 'ticketCategoryId', 'optional')}
            {field('Support role ID', 'ticketSupportRoleId')}
            {field('Ticket log channel ID', 'ticketLogChannelId', 'optional')}
          </div>
        )}
        {(has('moderation') || has('ban') || has('security')) && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Moderation / Security log</p>
            {field('Mod log channel ID', 'modLogChannelId')}
          </div>
        )}
        {has('voice') && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Voice</p>
            {field('Default voice channel ID', 'voiceChannelId')}
          </div>
        )}

        {inviteUrl && (
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={inviteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-discord-blurple px-4 py-2.5 text-sm font-bold text-white">
              <ExternalLink className="h-4 w-4" /> Invite bot to server
            </a>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200">
              <Copy className="h-4 w-4" />{copied ? 'Copied' : 'Copy invite'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        {message && <p className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

        <button type="button" disabled={busy || !canSave} onClick={() => void save()}
          className="mt-5 w-full rounded-xl bg-discord-blurple py-3 text-sm font-bold text-white disabled:opacity-40">
          {busy ? 'Saving…' : isEditing ? 'Update bot' : 'Verify token & host bot'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Your hosted bots</h2>
        <p className="mt-1 text-xs text-gray-500">Status updates every few seconds from the Railway worker.</p>
        <div className="mt-4 space-y-3">
          {bots.length === 0 && <p className="text-sm text-gray-400">No bots yet. Add one above.</p>}
          {bots.map((b) => {
            const v = statusView(b);
            return (
              <div key={b.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{b.bot_name || b.client_id}</p>
                    <p className="text-xs text-gray-500">{(b.modules || []).join(', ')}</p>
                    {b.last_error && <p className="mt-1 text-xs text-rose-300">{b.last_error}</p>}
                    {v.note && <p className="mt-1 text-xs text-amber-200">{v.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {b.modules.includes('levels') && (
                      <Link href={'/leaderboard?bot=' + b.id} className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200"><Trophy className="mr-1.5 inline h-3.5 w-3.5" />Leaderboard</Link>
                    )}
                    {b.modules.includes('welcome') && (
                      <button disabled={busy || !b.enabled || v.label !== 'online'} onClick={() => void testWelcome(b)}
                        className="rounded-lg border border-discord-blurple/40 bg-discord-blurple/10 px-3 py-2 text-xs font-semibold text-indigo-200 disabled:opacity-40">
                        <Send className="mr-1.5 inline h-3.5 w-3.5" />Test welcome
                      </button>
                    )}
                    <span className={'rounded-full px-3 py-1 text-xs ' + v.style}>
                      {v.label === 'online' && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />}
                      {v.label}
                    </span>
                    <button onClick={() => edit(b)} className="rounded-lg border border-white/10 p-2 text-gray-200" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button disabled={busy} onClick={() => void toggle(b)} className="rounded-lg border border-white/10 p-2 text-gray-200" title="Enable / disable"><Power className="h-4 w-4" /></button>
                    <button disabled={busy} onClick={() => void remove(b)} className="rounded-lg border border-rose-400/20 p-2 text-rose-200" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {b.modules.includes('voice') && v.label === 'online' && <VoicePanel bot={b} />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
