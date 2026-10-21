import SiteHeader from '@/components/SiteHeader';
import { ExternalLink, Phone, Crown, AtSign } from 'lucide-react';

const LINKS = [
  { label: 'Discord Server 1', desc: 'Main community server join karo', href: 'https://discord.gg/vDDpCefyT' },
  { label: 'Discord Server 2', desc: 'Second community server join karo', href: 'https://discord.gg/cdKAgCZG4' },
  { label: 'Owner Discord', desc: 'Owner ke Discord se connect karo', href: 'https://discord.gg/n5HSeNQF' },
];

export default function OwnerDetailsPage() {
  return (
    <div className="min-h-screen bg-discord-darker pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
            <Crown className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Website Owner Details</h1>
            <p className="text-xs text-gray-400">Owner se contact ya servers join karne ke liye</p>
          </div>
        </div>

        <section className="mb-5 rounded-xl border border-white/10 bg-discord-card p-4">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-400">
                <Crown className="h-4 w-4" /> Owner Name
              </dt>
              <dd className="font-semibold text-white">CR7</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-400">
                <AtSign className="h-4 w-4" /> Discord Username
              </dt>
              <dd className="font-semibold text-white">jilowado</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4" /> Contact Number
              </dt>
              <dd>
                <a href="tel:+917742936593" className="font-semibold text-discord-green hover:underline">
                  7742936593
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-discord-card p-4 transition hover:bg-discord-hover"
            >
              <div>
                <p className="font-semibold text-white">{l.label}</p>
                <p className="text-xs text-gray-400">{l.desc}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-discord-blurple px-3 py-2 text-xs font-bold text-white">
                Open <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
