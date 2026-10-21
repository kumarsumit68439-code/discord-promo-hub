'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FREE_MODULES, PlanState } from '@/lib/plans';
import { HOSTING_MODULES } from './botModuleList';
import {
  Bot, Lock, Crown, Copy, ExternalLink, Trash2, Power, Pencil, CheckCircle2,
} from 'lucide-react';

const MODULES = HOSTING_MODULES;

type BotRow = {
  id: string;
  client_id: string;
  bot_name: string | null;
  modules: string[] | null;
  config: Record<string, unknown> | null;
  enabled: boolean;
  status: string;
  last_error: string | null;
  last_heartbeat: string | null;
};

type Form = {
  clientId: string;
  botToken: string;
  modules: string[];
  guildId: string;
  welcomeChannelId: string;
  welcomeRoleId: string;
  welcomeMessage: string;
  ticketChannelId: string;
  ticketCategoryId: string;
  ticketSupportRoleId: string;
  ticketLogChannelId: string;
  modLogChannelId: string;
  voiceChannelId: string;
};

const EMPTY: Form = {
  clientId: '',
  botToken: '',
  modules: ['welcome'],
  guildId: '',
  welcomeChannelId: '',
  welcomeRoleId: '',
  welcomeMessage: 'Welcome {user}! You are member #{count}.',
  ticketChannelId: '',
  ticketCategoryId: '',
  ticketSupportRoleId: '',
  ticketLogChannelId: '',
  modLogChannelId: '',
  voiceChannelId: '',
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const input =
  'mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple';

export default function HostedBotsView() {
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
      } catch {
        /* keep */
      }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await call({ action: 'status' });
      setBots(d.bots || []);
      setPlan(d.plan || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load bots');
    }
  }, [call]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  const premium = Boolean(plan?.premium);
  const locked = (id: string) => !premium && !FREE_MODULES.includes(id);

  const toggleModule = (id: string) => {
    if (locked(id)) {
      setError('This module needs a paid plan. Open Plans to unlock.');
      return;
    }
    setError('');
    set(
      'modules',
      form.modules.includes(id) ? form.modules.filter((m) => m !== id) : [...form.modules, id]
    );
  };

  const inviteUrl = useMemo(() => {
    if (!/^\d{15,22}$/.test(form.clientId.trim())) return '';
    let p = 1024n | 2048n | 16384n | 65536n | 32768n;
    const has = (m: string) => form.modules.includes(m);
    if (has('moderation') || has('protect') || has('security')) p |= 1099511627776n;
    if (has('ban') || has('security') || has('moderation')) p |= 4n;
    if (has('channelbuilder') || has('serversetup') || has('security')) p |= 8n;
    if (has('voice')) p |= 1048576n | 2097152n;
    if (has('ticket') || has('tokenclaim')) p |= 16n | 268435456n;
    return (
      'https://discord.com/oauth2/authorize?client_id=' +
      encodeURIComponent(form.clientId.trim()) +
      '&scope=bot%20applications.commands&permissions=' +
      p.toString()
    );
  }, [form.clientId, form.modules]);

  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { clientId, botToken, modules, ...rest } = form;
      const config = { ...rest };
      const d = await call({
        action: 'save',
        clientId: clientId.trim(),
        botToken: botToken.trim(),
        modules,
        config,
      });
      setMessage('Saved' + (d.botName ? ' bot "' + d.botName + '"' : '') + '. Worker online in ~30s.');
      setForm((f) => ({ ...f, botToken: '' }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(b: BotRow) {
    setBusy(true);
    setError('');
    try {
      await call({ action: 'toggle', id: b.id, enabled: !b.enabled });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: BotRow) {
    if (!window.confirm('Delete this bot and its stored token?')) return;
    setBusy(true);
    setError('');
    try {
      await call({ action: 'delete', id: b.id });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  function edit(b: BotRow) {
    const c = b.config || {};
    setForm({
      clientId: b.client_id,
      botToken: '',
      modules: b.modules?.length ? b.modules : ['welcome'],
      guildId: str(c.guildId),
      welcomeChannelId: str(c.welcomeChannelId),
      welcomeRoleId: str(c.welcomeRoleId),
      welcomeMessage: str(c.welcomeMessage) || EMPTY.welcomeMessage,
      ticketChannelId: str(c.ticketChannelId),
      ticketCategoryId: str(c.ticketCategoryId),
      ticketSupportRoleId: str(c.ticketSupportRoleId),
      ticketLogChannelId: str(c.ticketLogChannelId),
      modLogChannelId: str(c.modLogChannelId),
      voiceChannelId: str(c.voiceChannelId),
    });
    window.scrollTo({ top: document.getElementById('bot-form')?.offsetTop ?? 0, behavior: 'smooth' });
  }

  const isEditing = bots.some((b) => b.client_id === form.clientId.trim());
  const has = (m: string) => form.modules.includes(m);
  const canSave =
    /^\d{15,22}$/.test(form.clientId.trim()) &&
    form.modules.length > 0 &&
    (isEditing || form.botToken.trim().length > 20);

  const field = (label: string, key: keyof Form, hint = '') => (
    <div>
      <label className="text-sm text-gray-300">
        {label} {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </label>
      <input
        inputMode="numeric"
        value={String(form[key])}
        onChange={(e) => set(key, e.target.value as Form[typeof key])}
        className={input}
      />
    </div>
  );

  return (
    <section id="bot-form" className="mt-10 space-y-6">
      {plan && (
        <div
          className={
            'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm ' +
            (premium
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border-white/10 bg-discord-card text-gray-300')
          }
        >
          <p className="flex items-center gap-2">
            {premium ? <Crown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {premium
              ? `Premium active until ${plan.premium_until ? new Date(plan.premium_until).toLocaleDateString() : '—'}`
              : 'Free: Simple, Welcome, Support. Other modules need a plan.'}
          </p>
          {!premium && (
            <Link href="/pricing" className="rounded-lg bg-discord-blurple px-4 py-2 text-xs font-bold text-white">
              View plans
            </Link>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Bot className="h-5 w-5 text-indigo-300" /> Add your bot
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Client ID + Token. Channel &amp; VC Builder / Server Setup need no channel IDs.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-gray-300">Application / Client ID</label>
            <input
              inputMode="numeric"
              value={form.clientId}
              onChange={(e) => set('clientId', e.target.value)}
              className={input}
              placeholder="Numeric Client ID"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Bot Token</label>
            <input
              type="password"
              autoComplete="off"
              value={form.botToken}
              onChange={(e) => set('botToken', e.target.value)}
              className={input}
              placeholder={isEditing ? 'Leave empty to keep' : 'Paste bot token'}
            />
          </div>
          {field('Server (Guild) ID', 'guildId', 'optional')}
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold text-white">Modules ({form.modules.length})</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULES.map((m) => {
            const on = form.modules.includes(m.id);
            const isLocked = locked(m.id);
            const Icon = m.icon;
            const isSetup = m.id === 'channelbuilder' || m.id === 'serversetup';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleModule(m.id)}
                className={
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition ' +
                  (on
                    ? 'border-discord-blurple bg-discord-blurple/15'
                    : isLocked
                      ? 'border-white/5 bg-black/20 opacity-70'
                      : isSetup
                        ? 'border-indigo-400/30 bg-indigo-400/5'
                        : 'border-white/10 bg-black/15')
                }
              >
                <Icon className={'mt-0.5 h-5 w-5 shrink-0 ' + (on || isSetup ? 'text-indigo-300' : 'text-gray-400')} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                    {m.title}
                    {isSetup && (
                      <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-200">SETUP</span>
                    )}
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
          <div className="mt-5 rounded-xl border border-indigo-400/25 bg-indigo-400/10 p-4 text-xs text-indigo-100">
            <p className="font-semibold text-white">Setup commands (Discord)</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {has('channelbuilder') && <li>/setup-server · /setup-ai</li>}
              {has('serversetup') && <li>/setup-roles · /setup-full</li>}
            </ul>
          </div>
        )}

        {has('welcome') && (
          <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Welcome</p>
            {field('Welcome channel ID', 'welcomeChannelId')}
            {field('Auto role ID', 'welcomeRoleId', 'optional')}
            <textarea
              value={form.welcomeMessage}
              onChange={(e) => set('welcomeMessage', e.target.value)}
              rows={2}
              className={input}
            />
          </div>
        )}

        {inviteUrl && (
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-discord-blurple px-4 py-2.5 text-sm font-bold text-white"
            >
              <ExternalLink className="h-4 w-4" /> Invite bot
            </a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy invite'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        {message && <p className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

        <button
          type="button"
          disabled={busy || !canSave}
          onClick={() => void save()}
          className="mt-5 w-full rounded-xl bg-discord-blurple py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? 'Saving…' : isEditing ? 'Update bot' : 'Verify token & host bot'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Your hosted bots</h2>
        <div className="mt-4 space-y-3">
          {bots.length === 0 && <p className="text-sm text-gray-400">No bots yet.</p>}
          {bots.map((b) => {
            const mods = b.modules || [];
            return (
              <div key={b.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{b.bot_name || b.client_id}</p>
                    <p className="text-xs text-gray-500">{mods.join(', ') || 'no modules'}</p>
                    {b.last_error && <p className="mt-1 text-xs text-rose-300">{b.last_error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">{b.status}</span>
                    <button type="button" onClick={() => edit(b)} className="rounded-lg border border-white/10 p-2 text-gray-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy} onClick={() => void toggle(b)} className="rounded-lg border border-white/10 p-2 text-gray-200">
                      <Power className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy} onClick={() => void remove(b)} className="rounded-lg border border-rose-400/20 p-2 text-rose-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
