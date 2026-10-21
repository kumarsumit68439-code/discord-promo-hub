'use client';

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BotProviderSettings from '@/components/BotProviderSettings';
import HostedBots from '@/components/HostedBots';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function BotHostingPage() {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="min-h-screen bg-[#17181c] pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Bot hosting</h1>
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-[#949ba4]">
              Add your Client ID and bot token, then pick modules. Channel IDs are optional — you can fill them in later.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="#bot-form"
              className="rounded-md bg-[#5865f2] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#4752c4]"
            >
              Add bot
            </a>
            <button
              type="button"
              onClick={() => setShowSetup((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[13px] text-[#dbdee1] hover:bg-white/[0.06]"
            >
              Setup
              {showSetup ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {showSetup && (
          <section className="mb-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-4 text-[13px] leading-relaxed text-[#b5bac1]">
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>Discord Developer Portal → New Application → Bot → copy Client ID and Token.</li>
              <li>Enable Server Members Intent. For AI / tickets / levels, also enable Message Content Intent.</li>
              <li>Fill the form below → Save. Invite the bot to your server.</li>
              <li>Place the bot role above any roles it needs to assign.</li>
              <li>Keep the Railway worker running (SUPABASE_URL + SERVICE_ROLE_KEY).</li>
            </ol>
          </section>
        )}

        <HostedBots />

        <section className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-4">
          <p className="text-[13px] font-medium text-white">Always-on worker</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#949ba4]">
            This website runs on Vercel. Bots stay online through the Railway worker that holds the Discord gateway open.
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-white/[0.04] p-4">
          <p className="text-[12px] text-[#6d6f78]">
            Kick, ban, and role actions only work when the bot has permission and is high enough in the role hierarchy.{' '}
            <a
              className="inline-flex items-center gap-1 text-[#949ba4] underline-offset-2 hover:text-[#dbdee1] hover:underline"
              href="https://discord.com/developers/docs/topics/permissions"
              target="_blank"
              rel="noreferrer"
            >
              Permissions docs <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </section>

        <BotProviderSettings />
      </main>
      <SiteFooter />
    </div>
  );
}
