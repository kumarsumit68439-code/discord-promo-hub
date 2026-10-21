'use client';

import dynamic from 'next/dynamic';

/** Restored wrapper — full UI loads from HostedBotsView to avoid deploy breakage. */
const HostedBotsView = dynamic(() => import('./HostedBotsView'), {
  ssr: false,
  loading: () => (
    <div className="mt-10 rounded-2xl border border-white/10 bg-discord-card p-6 text-sm text-gray-400">
      Loading bot hosting…
    </div>
  ),
});

export default function HostedBots() {
  return <HostedBotsView />;
}
