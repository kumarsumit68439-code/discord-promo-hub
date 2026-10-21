'use client';

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BotProviderSettings from '@/components/BotProviderSettings';
import HostedBots from '@/components/HostedBots';
import { Server, ShieldCheck, ExternalLink, Settings2, TerminalSquare } from 'lucide-react';

export default function BotHostingPage() {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
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
              Host welcome, timeout, ban, AI chat, supporter and invite bots. Add your Client ID and Bot Token, pick modules and write your own welcome message.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#bot-form" className="rounded-xl bg-discord-blurple px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">Add a bot</a>
              <button type="button" onClick={() => setShowSetup((v) => !v)} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                <Settings2 className="mr-2 inline h-4 w-4" /> Setup guide
              </button>
            </div>
          </div>
        </section>

        <HostedBots />

        <section className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10"><Server className="h-5 w-5 text-cyan-200" /></div>
            <div><h2 className="font-bold text-white">Always-on worker</h2><p className="text-xs text-gray-400">Needed so bots stay online 24/7</p></div>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-black/15 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
            <p className="text-xs leading-5 text-gray-300">Vercel only serves this website. Bots run in the <code>bot-worker</code> service (Railway, Render or a VPS) with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set. It reads bots saved here and keeps them online.</p>
          </div>
        </section>

        {showSetup && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-bold text-white"><TerminalSquare className="h-5 w-5 text-discord-blurple" /> Setup checklist</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-300">
              <li>Create an application in the Discord Developer Portal, copy the Client ID and reset/copy the Bot Token.</li>
              <li>Enable Server Members Intent (welcome, invite) and Message Content Intent (AI chat).</li>
              <li>Paste Client ID and token above, choose modules, write your welcome message and press Verify token &amp; host bot.</li>
              <li>Use Invite bot to server, then put the bot role above any role it must give.</li>
              <li>Run the <code>bot-worker</code> service so the bot goes online.</li>
            </ol>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-sm font-semibold text-white">Permissions &amp; safety</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">Bots can only moderate members when the server owner grants the relevant permissions and Discord&apos;s role hierarchy allows the action.</p>
          <a className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200" href="https://discord.com/developers/docs/topics/permissions" target="_blank" rel="noreferrer">Discord permissions documentation <ExternalLink className="h-4 w-4" /></a>
        </section>
        <BotProviderSettings />
      </main>
      <SiteFooter />
    </div>
  );
}
