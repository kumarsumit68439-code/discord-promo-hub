'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api';
import { FREE_MODULES, PlanState } from '@/lib/plans';
import {
  Bot, MessageCircle, Sparkles, Clock3, Ban, Users, Ticket, LifeBuoy, Trophy, ShieldAlert, Mic, UserPlus, Lock, Crown,
  Copy, ExternalLink, Trash2, Power, Pencil, CheckCircle2, ShieldCheck, Send, LogOut, MicOff, Timer, Volume2,
} from 'lucide-react';

const MODULES = [
  { id: 'welcome', title: 'Welcome Bot', icon: MessageCircle, detail: 'Welcome image + custom message when a member joins, optional auto role, goodbye message. (Free)' },
  { id: 'support', title: 'Support Bot', icon: LifeBuoy, detail: '/help command + auto answers from your FAQ in a support channel. (Free)' },
  { id: 'ticket', title: 'Ticket Bot', icon: Ticket, detail: 'Ticket Tool jaisa: "Create ticket" button, private ticket channel, close + transcript.' },
  { id: 'voice', title: 'Voice Bot (VC + AI)', icon: Mic, detail: 'VC join/leave, mic mute/unmute, 24/7 AFK, timer from website, AI voice conversation.' },
  { id: 'protect', title: 'Server Protection (AI)', icon: ShieldAlert, detail: 'AI live scan: messages har 2 second, channels/roles sweep, auto delete + timeout, log channel.' },
  { id: 'levels', title: 'Level-up Bot', icon: Trophy, detail: 'Members level 0 se shuru, chat + VC se XP, level-up message, live top 10 leaderboard + AI.' },
  { id: 'memberadd', title: 'Member Add Bot', icon: UserPlus, detail: '/invite-link aur /send-invite: member ko invite link bhejta hai taaki wo server join kare.' },
  { id: 'moderation', title: 'Timeout Bot', icon: Clock3, detail: '/timeout and /untimeout with permission and role-hierarchy checks.' },
  { id: 'ban', title: 'Ban Bot', icon: Ban, detail: '/ban and /unban with moderation log.' },
  { id: 'ai', title: 'AI Chat Bot', icon: Sparkles, detail: 'AI channel mein har message ka jawab. Needs an AI provider key saved below.' },
  { id: 'supporter', title: 'Supporter Bot', icon: Users, detail: '/supporter grant and revoke for a configured role.' },
  { id: 'invite', title: 'Invite Tracker', icon: Ticket, detail: 'Tracks who invited whom, /invites and /invite-leaderboard.' },
];

type VoiceState = { desired?: boolean; connected?: boolean; channelId?: string; channelName?: string | null; muted?: boolean; aiOn?: boolean; until?: string | null };
type Stats = { scanned?: number; flagged?: number; last_scan?: string | null; sweep_at?: string | null; sweep_findings?: number };

type BotRow = {
  id: string; client_id: string; bot_name: string | null; modules: string[];
  config: Record<string, unknown>; enabled: boolean; status: string;
  last_error: string | null; last_heartbeat: string | null;
  voice_state?: VoiceState | null; stats?: Stats | null;
  test_requested_at?: string | null; test_result?: string | null; test_done_at?: string | null;
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
  levelChannelId: '', protectLogChannelId: '', memberAddChannelId: '', inviteDmMessage: 'Hey! Hamare server mein join karo: {link}', voiceChannelId: '',
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Website controls for the voice bot: join / leave VC, mic mute / unmute, AFK timer, AI voice chat.
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
      setNote('Command bhej diya, bot kuch seconds mein kaam karega…');
      for (let i = 0; i < 10; i++) {
        await sleep(2000);
        const rr = await authFetch('/api/voice?botId=' + bot.id + '&id=' + d.id);
        const dd = await rr.json();
        const c = dd.command;
        if (c && c.status !== 'pending') { setNote((c.status === 'done' ? '✅ ' : '❌ ') + (c.result || '')); return; }
      }
      setNote('Bot ne abhi jawab nahi diya. Worker offline ho sakta hai.');
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
          ? <>🟢 VC mein: <b className="text-white">{vs.channelName || vs.channelId}</b> · mic {vs.muted ? 'muted' : 'on'} · AI voice {vs.aiOn ? 'on' : 'off'} · {vs.until ? 'timer ' + Math.floor(left / 60) + 'm ' + (left % 60) + 's' : '24/7 AFK'}</>
          : vs.desired ? '🟡 VC se connect ho raha hai…' : 'Bot VC mein nahi hai.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input inputMode="numeric" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Voice channel ID" className={input + ' !mt-0 sm:max-w-[220px]'} />
        <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder="Timer min (khali = 24/7)" className={input + ' !mt-0 sm:max-w-[170px]'} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy} className={btn} onClick={() => void send('join', { minutes })}><Volume2 className="mr-1 inline h-3.5 w-3.5" />Join VC</button>
        <button disabled={busy} className={btn} onClick={() => void send('leave')}><LogOut className="mr-1 inline h-3.5 w-3.5" />Leave VC</button>
        <button disabled={busy} className={btn} onClick={() => void send('mute')}><MicOff className="mr-1 inline h-3.5 w-3.5" />Mute mic</button>
        <button disabled={busy} className={btn} onClick={() => void send('unmute')}><Mic className="mr-1 inline h-3.5 w-3.5" />Unmute mic</button>
        <button disabled={busy} className={btn} onClick={() => void send('timer', { minutes: minutes || 0 })}><Timer className="mr-1 inline h-3.5 w-3.5" />Set timer</button>
        <button disabled={busy} className={btn} onClick={() => void send(vs.aiOn ? 'ai_off' : 'ai_on')}><Sparkles className="mr-1 inline h-3.5 w-3.5" />AI voice {vs.aiOn ? 'off' : 'on'}</button>
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
      } catch { /* keep generic message */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    try { const d = await call({ action: 'status' }); setBots(d.bots || []); setPlan(d.plan || null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load bots'); }
  }, [call]);

  // Live status: poll every 5s while the tab is visible (worker -> Supabase SQL -> this page).
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const premium = Boolean(plan?.premium);
  const locked = (id: string) => !premium && !FREE_MODULES.includes(id);

  const toggleModule = (id: string) => {
    if (locked(id)) { setError('Ye bot Premium plan mein hai. Plans page se ₹20 ka plan lein.'); return; }
    setError('');
    set('modules', form.modules.includes(id) ? form.modules.filter((m) => m !== id) : [...form.modules, id]);
  };

  const inviteUrl = useMemo(() => {
    if (!/^\d{15,22}$/.test(form.clientId.trim())) return '';
    let p = 1024n | 2048n | 16384n | 65536n | 32768n; // view, send, embed, history, attach files
    const has = (m: string) => form.modules.includes(m);
    if (has('moderation') || has('protect')) p |= 1099511627776n; // timeout members
    if (has('ban')) p |= 4n;
    if (has('supporter') || has('ticket') || (has('welcome') && form.welcomeRoleId)) p |= 268435456n; // manage roles
    if (has('invite') || has('memberadd')) p |= 32n | 1n; // manage guild (invite tracking) + create invite
    if (has('ticket')) p |= 16n; // manage channels
    if (has('protect')) p |= 8192n; // manage messages
    if (has('voice')) p |= 1048576n | 2097152n; // connect + speak
    return 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(form.clientId.trim()) +
      '&scope=bot%20applications.commands&permissions=' + p.toString();
  }, [form.clientId, form.modules, form.welcomeRoleId]);

  const fill = (t: string) => t.replace(/\{user\}/g, '@NewMember').replace(/\{username\}/g, 'NewMember')
    .replace(/\{server\}/g, 'My Server').replace(/\{count\}/g, '128');

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      const { clientId, botToken, modules, ...config } = form;
      const d = await call({ action: 'save', clientId: clientId.trim(), botToken: botToken.trim(), modules, config });
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
      clientId: b.client_id, botToken: '', modules: b.modules,
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
            {premium ? <>Premium active ({plan.premium_until ? new Date(plan.premium_until).toLocaleDateString() + ' tak' : ''}): saare bots unlocked.</>
              : plan.free_expired ? 'Free plan ka 1 din khatam. Bots band hain, Premium lo.'
              : plan.free_expires_at ? <>Free plan: bots {new Date(plan.free_expires_at).toLocaleString()} tak chalenge. Sirf Welcome + Support bot free hain.</>
              : 'Free plan: pehla bot save karte hi 1 din ka timer shuru hoga. Sirf Welcome + Support bot free hain.'}
          </p>
          {!premium && <Link href="/pricing" className="rounded-lg bg-discord-blurple px-4 py-2 text-xs font-bold text-white">Premium ₹20</Link>}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Bot className="h-5 w-5 text-indigo-300" /> Add your bot</h2>
        <p className="mt-1 text-sm text-gray-400">Enter Client ID and Bot Token from the Discord Developer Portal. The token is verified with Discord, stored encrypted in Supabase Vault and never shown again. Kitne bhi bots add kar sakte ho.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-gray-300">Application / Client ID</label>
            <input inputMode="numeric" value={form.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Numeric Client ID" className={input} />
          </div>
          <div>
            <label className="text-sm text-gray-300">Bot Token {isEditing && <span className="text-xs text-gray-500">(leave empty to keep saved token)</span>}</label>
            <input type="password" autoComplete="off" value={form.botToken} onChange={(e) => set('botToken', e.target.value)} placeholder={isEditing ? 'Saved securely' : 'Paste bot token'} className={input} />
          </div>
          {field('Server (Guild) ID', 'guildId', 'optional, recommended', 'Limit bot to one server')}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-white">Modules</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon; const active = has(m.id); const lock = locked(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                className={'rounded-xl border p-4 text-left transition ' + (active ? 'border-discord-blurple/70 bg-discord-blurple/10' : 'border-white/10 bg-black/10 hover:border-white/20') + (lock ? ' opacity-70' : '')}>
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-indigo-300" />
                  {lock
                    ? <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200"><Lock className="h-3 w-3" />Premium</span>
                    : <span className={'rounded-full px-2 py-0.5 text-xs ' + (active ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-400')}>{active ? 'On' : 'Off'}</span>}
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
              {field('Welcome channel ID', 'welcomeChannelId', '', 'Channel ID')}
              {field('Auto role ID', 'welcomeRoleId', 'optional', 'Role given on join')}
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

        {has('support') && (
          <div className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-white sm:col-span-2">Support settings</h3>
            {field('Support channel ID', 'supportChannelId', 'FAQ auto-answer yahan chalega')}
            <div className="sm:col-span-2"><label className="text-sm text-gray-300">/help message</label>
              <textarea maxLength={1000} rows={2} value={form.supportMessage} onChange={(e) => set('supportMessage', e.target.value)} placeholder="Help chahiye? Support channel mein poochho." className={input} /></div>
            <div className="sm:col-span-2"><label className="text-sm text-gray-300">FAQ <span className="text-xs text-gray-500">har line: keyword1, keyword2 | jawab</span></label>
              <textarea maxLength={3000} rows={4} value={form.supportFaq} onChange={(e) => set('supportFaq', e.target.value)} placeholder={'price, kitna | Premium sirf ₹20 hai\nrules | Rules channel padhein'} className={input} /></div>
          </div>
        )}

        {has('ticket') && (
          <div className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-white sm:col-span-2">Ticket settings</h3>
            {field('Ticket panel channel ID', 'ticketChannelId', '"Create ticket" button yahan aayega')}
            {field('Ticket category ID', 'ticketCategoryId', 'optional')}
            {field('Support role ID', 'ticketSupportRoleId', 'tickets dekh sakega')}
            {field('Ticket log channel ID', 'ticketLogChannelId', 'transcript yahan jayega')}
          </div>
        )}

        {(has('moderation') || has('ban') || has('supporter') || has('ai')) && (
          <div className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
            {(has('moderation') || has('ban') || has('supporter')) && field('Mod log channel ID', 'modLogChannelId', 'optional')}
            {has('supporter') && field('Supporter role ID', 'supporterRoleId')}
            {has('ai') && (<>
              {field('AI channel ID', 'aiChannelId', 'bot replies to every message here')}
              <div><label className="text-sm text-gray-300">AI provider</label>
                <select value={form.aiProvider} onChange={(e) => set('aiProvider', e.target.value)} className={input}>
                  <option value="">Select (key saved below)</option><option value="groq">Groq</option><option value="xai">xAI Grok</option>
                </select></div>
            </>)}
          </div>
        )}

        {(has('levels') || has('protect') || has('memberadd') || has('voice')) && (
          <div className="mt-4 grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2">
            {has('levels') && field('Level-up channel ID', 'levelChannelId', 'optional, khali = jis channel mein chat kiya')}
            {has('protect') && field('Protection log channel ID', 'protectLogChannelId', 'scan alerts yahan aayenge')}
            {has('voice') && field('Default voice channel ID', 'voiceChannelId', 'optional')}
            {has('memberadd') && field('Invite channel ID', 'memberAddChannelId', 'optional, invite isi channel ka banega')}
            {has('memberadd') && (
              <div className="sm:col-span-2"><label className="text-sm text-gray-300">Invite DM message <span className="text-xs text-gray-500">{'{link}'} = invite link</span></label>
                <input maxLength={500} value={form.inviteDmMessage} onChange={(e) => set('inviteDmMessage', e.target.value)} className={input} /></div>
            )}
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
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Welcome/Invite/Protection need the Server Members intent; AI chat, Support FAQ and Protection need Message Content intent, both enabled in the Developer Portal. Bot role must sit above any role it manages. Reset your token if it was ever shared.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="font-bold text-white">Your hosted bots</h2>
        {bots.length === 0 && <p className="mt-3 text-sm text-gray-400">No bots yet.</p>}
        <div className="mt-3 space-y-3">
          {bots.map((b) => {
            const v = statusView(b);
            const st = b.stats || {};
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
                  {v.label === 'online' && b.modules.includes('protect') && (
                    <p className="mt-1 text-xs text-emerald-300">🛡️ Live scan: {st.scanned ?? 0} messages scanned, {st.flagged ?? 0} flagged{st.last_scan ? ', last scan ' + new Date(st.last_scan).toLocaleTimeString() : ''}{st.sweep_at ? ' · server sweep ' + new Date(st.sweep_at).toLocaleTimeString() + ' (' + (st.sweep_findings ?? 0) + ' issues)' : ''}</p>
                  )}
                  {b.test_requested_at && (Date.now() - new Date(b.test_requested_at).getTime() > 45_000
                    ? <p className="mt-1 text-xs text-amber-300">Test not picked up. The worker may be offline. Try again in a minute.</p>
                    : <p className="mt-1 text-xs text-indigo-300">Test requested, the worker will post it in a few seconds…</p>)}
                  {!b.test_requested_at && b.test_result && (
                    <p className={'mt-1 text-xs ' + (b.test_result.startsWith('Failed') ? 'text-rose-300' : 'text-emerald-300')}>{b.test_result}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {b.modules.includes('levels') && (
                    <Link href={'/leaderboard?bot=' + b.id} className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-200"><Trophy className="mr-1.5 inline h-3.5 w-3.5" />Leaderboard</Link>
                  )}
                  {b.modules.includes('welcome') && (
                    <button disabled={busy || !b.enabled || v.label !== 'online' || Boolean(b.test_requested_at && Date.now() - new Date(b.test_requested_at).getTime() < 45_000)}
                      onClick={() => void testWelcome(b)}
                      className="rounded-lg border border-discord-blurple/40 bg-discord-blurple/10 px-3 py-2 text-xs font-semibold text-indigo-200 disabled:opacity-40"
                      title={v.label === 'online' ? 'Post a sample welcome message in your welcome channel' : 'The bot must be online to send a test'}>
                      <Send className="mr-1.5 inline h-3.5 w-3.5" />Send test welcome
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
                {b.modules.includes('voice') && v.label === 'online' && <VoicePanel bot={b} />}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-gray-500">Status becomes <b>online</b> only after the always-on bot worker (Railway/Render/VPS) logs the bot in to Discord and every ID and permission checks out. If something is wrong the exact problem is shown here, and a bot whose worker stops answering switches to <b>offline</b> within 3 minutes.</p>
      </div>
    </section>
  );
}
