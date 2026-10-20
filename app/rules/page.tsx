'use client';

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { SITE_RULES, PRIVACY_POINTS, SAFETY_POINTS } from '@/lib/rules-content';
import { Shield, Lock, Heart, ClipboardList } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-white">Rules · Privacy · Safety</h1>
        <p className="mb-8 text-sm text-gray-400">
          Promo Hub community guidelines. Staff roles must follow these.
        </p>

        <section className="mb-8 rounded-2xl border border-white/10 bg-discord-card p-5">
          <div className="mb-3 flex items-center gap-2 text-discord-blurple">
            <Shield className="h-5 w-5" />
            <h2 className="font-semibold text-white">Website rules</h2>
          </div>
          <ol className="list-inside list-decimal space-y-2 text-sm text-gray-300">
            {SITE_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-discord-card p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-400">
            <Lock className="h-5 w-5" />
            <h2 className="font-semibold text-white">Privacy</h2>
          </div>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-300">
            {PRIVACY_POINTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-discord-card p-5">
          <div className="mb-3 flex items-center gap-2 text-red-400">
            <Heart className="h-5 w-5" />
            <h2 className="font-semibold text-white">Safe & secure</h2>
          </div>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-300">
            {SAFETY_POINTS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <Link
          href="/apply-role"
          className="flex items-center justify-center gap-2 rounded-xl bg-discord-blurple py-3 text-sm font-bold text-white"
        >
          <ClipboardList className="h-4 w-4" /> Apply for staff role
        </Link>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          3 rule-based questions required · approval by staff
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
