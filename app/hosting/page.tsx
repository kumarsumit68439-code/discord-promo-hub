'use client';

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  Bot, ShieldCheck, MessageCircle, Sparkles, Clock3, Ban, Server,
  ExternalLink, Copy, Check, AlertTriangle, Settings2, TerminalSquare, Users, Ticket
} from 'lucide-react';

const services = [
  { id: 'welcome', title: 'Welcome Bot', icon: MessageCircle, color: 'text-cyan-300', detail: 'New member welcome embeds, welcome channel, member count and goodbye messages.' },
  { id: 'moderation', title: 'Timeout & Moderation Bot', icon: Clock3, color: 'text-amber-300', detail: 'Slash-command moderation with permission checks, audit reasons and configurable timeout limits.' },
  { id: 'ban', title: 'Ban Protection Bot', icon: Ban, color: 'text-rose-300', detail: 'Ban and unban commands, moderation logs and role-hierarchy validation.' },
  { id: 'ai', title: 'AI Chat Bot', icon: Sparkles, color: 'text-violet-300', detail: 'AI-powered server chat using a backend model provider and configurable channel rules.' },
  { id: 'supporter', title: 'Supporter Bot', icon: Users, color: 'text-emerald-300', detail: 'Grant or revoke a configured supporter role with permission checks and moderation logs.' },
  { id: 'invite', title: 'Invite Tracking Bot', icon: Ticket, color: 'text-sky-300', detail: 'Track attributed member joins and show invite counts and a leaderboard; durable storage needs a database.' },
];

export default function BotHostingPage() {
  const [clientId, setClientId] = useState('');
  const [selected, setSelected] = useState<string[]>(['welcome']);
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!/^\d{15,22}$/.test(clientId.trim())) return '';
    // Discord permission bitfield: request only what the selected modules need.
    let permissions = 1024n | 2048n | 16384n | 65536n; // View Channel, Send Messages, Embed Links, Read Message History
    if (selected.includes('moderation')) permissions |= 1099511627776n; // Moderate Members
    if (selected.includes('ban')) permissions |= 4n; // Ban Members
    if (selected.includes('supporter') || process.env.NEXT_PUBLIC_UNUSED) permissions |= 268435456n; // Manage Roles
    if (selected.includes('invite')) permissions |= 32n; // Manage Guild (invite tracking)
    return 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(clientId.trim()) +
      '&scope=bot%20applications.commands&permissions=' + permissions.toString();
  }, [clientId, selected]);

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-16">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#23274a] via-[#171b30] to-discord-card p-6 sm:p-10">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-discord-blurple/20 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> BOT CONTROL CENTER
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Discord Bot Hosting</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
              Configure welcome, moderation, ban-protection, AI chat, supporter roles and invite tracking from one place.
              Configure your Discord application, choose services and prepare a secure runtime deployment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#services" className="rounded-xl bg-discord-blurple px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">Explore bot services</a>
              <button onClick={() => setShowSetup((v) => !v)} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                <Settings2 className="mr-2 inline h-4 w-4" /> Setup guide
              </button>
            </div>
          </div>
        </section>

        <section id="services" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Choose bot services</h2>
              <p className="mt-1 text-sm text-gray-400">Select the modules you want to configure.</p>
            </div>
            <span className="rounded-lg border border-white/10 bg-discord-card px-3 py-1.5 text-xs text-gray-300">{selected.length} selected</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              const active = selected.includes(service.id);
              return (
                <button key={service.id} onClick={() => setSelected((prev) => active ? prev.filter((x) => x !== service.id) : [...prev, service.id])}
                  className={'rounded-2xl border p-5 text-left transition ' + (active ? 'border-discord-blurple/70 bg-discord-blurple/10' : 'border-white/10 bg-discord-card hover:border-white/20')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"><Icon className={'h-5 w-5 ' + service.color} /></div>
                    <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + (active ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-400')}>{active ? 'Selected' : 'Select'}</span>
                  </div>
                  <h3 className="mt-4 font-bold text-white">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{service.detail}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10"><Bot className="h-5 w-5 text-indigo-300" /></div>
              <div><h2 className="font-bold text-white">Connect Discord application</h2><p className="text-xs text-gray-400">Uses your application's Client ID to create an invite URL.</p></div>
            </div>
            <label htmlFor="client-id" className="mt-5 block text-sm font-medium text-gray-300">Discord Application Client ID</label>
            <input id="client-id" inputMode="numeric" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Enter your numeric Client ID"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple" />
            {clientId && !inviteUrl && <p className="mt-2 text-xs text-amber-300">Enter a valid Discord Application ID (15–22 digits).</p>}
            {inviteUrl && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4">
              <p className="text-sm font-semibold text-emerald-200">Invite URL ready</p>
              <p className="mt-1 break-all text-xs text-gray-400">Review the requested permissions on Discord before authorizing.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={inviteUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-discord-blurple px-4 py-2 text-sm font-semibold text-white">Open Discord invite <ExternalLink className="ml-1 inline h-4 w-4" /></a>
                <button onClick={copyInvite} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-200"><Copy className="mr-1 inline h-4 w-4" /> {copied ? 'Copied' : 'Copy link'}</button>
              </div>
            </div>}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <p className="text-xs leading-5 text-gray-300">Never paste a bot token into this page or browser storage. Keep tokens in your hosting provider's server-side environment variables and rotate any token that has been exposed.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10"><Server className="h-5 w-5 text-cyan-200" /></div>
              <div><h2 className="font-bold text-white">Runtime status</h2><p className="text-xs text-gray-400">Hosting readiness checklist</p></div>
            </div>
            <div className="mt-5 space-y-3">
              {[['Dashboard UI', 'Added to the website'], ['Discord bot worker', 'Worker source added; deploy as a persistent Node.js service'], ['Secret storage', 'Set DISCORD_BOT_TOKEN in worker host secrets'], ['AI provider', 'Optional AI_API_KEY and AI_MODEL in worker host secrets']].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 rounded-xl bg-black/15 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <div><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-gray-400">{value}</p></div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">This page prepares configuration; it does not claim a bot is running until a worker is connected and reports healthy.</p>
          </div>
        </section>

        {showSetup && <section className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold text-white"><TerminalSquare className="h-5 w-5 text-discord-blurple" /> Setup checklist</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-300">
            <li>Create an application in the Discord Developer Portal and copy its Client ID.</li>
            <li>Enable the Guild Members intent for join events when required by your welcome flow.</li>
            <li>Use the minimum bot permissions each feature needs; do not grant Administrator by default.</li>
            <li>Deploy the <code>bot-worker</code> folder as a persistent Node.js service using the included README and environment example. A standard Vercel serverless page alone is not a long-running bot host.</li>
            <li>For supporter roles, set SUPPORTER_ROLE_ID and grant the bot Manage Roles only if needed; keep the bot role above the supporter role.</li>
            <li>For invite tracking, grant the required invite visibility permission. Current counts are in-memory and reset after worker restart.</li>
            <li>Store BOT_TOKEN and AI provider keys as server-side environment secrets, never in client code or GitHub.</li>
          </ol>
        </section>}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-sm font-semibold text-white">Permissions & safety</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">Bots can only moderate members when the server owner grants the relevant permissions and Discord's role hierarchy allows the action. Use explicit server authorization and audit logs for moderation actions.</p>
          <a className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200" href="https://discord.com/developers/docs/topics/permissions" target="_blank" rel="noreferrer">Read Discord permissions documentation <ExternalLink className="h-4 w-4" /></a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
