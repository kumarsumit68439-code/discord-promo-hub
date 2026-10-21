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
            <h1 className="text-xl font-semibold text-white sm:text-2xl">Bot hosting</h1>
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-[#949ba4]">
              Client ID + token lagao, modules chuno. Channel IDs optional — baad mein bhi add kar sakte ho.
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
              <li>Discord Developer Portal → New Application → Bot → copy Client ID + Token.</li>
              <li>Intents: Server Members on. AI / ticket / levels ke liye Message Content bhi on.</li>
              <li>Neeche form fill → Save. Invite link se bot server mein daalo.</li>
              <li>Bot role hierarchy mein upar rakho (roles dena ho to).</li>
              <li>Railway pe worker chalna chahiye (SUPABASE_URL + SERVICE_ROLE_KEY).</li>
            </ol>
          </section>
        )}

        <HostedBots />

        <section className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-4">
          <p className="text-[13px] font-medium text-white">24/7 worker</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#949ba4]">
            Site Vercel pe hai. Bots Railway (ya koi VPS) pe chalte hain — wahi gateway open rakhta hai.
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-white/[0.04] p-4">
          <p className="text-[12px] text-[#6d6f78]">
            Moderation / kick / ban tabhi kaam karega jab server pe bot ko permission mile aur role hierarchy allow kare.{' '}
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
