'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { PREMIUM_DAYS, PREMIUM_PRICE, PlanState } from '@/lib/plans';
import { Check, Crown, Lock, Sparkles } from 'lucide-react';

const FREE_FEATURES = ['1 din ke liye bot hosting', 'Welcome bot', 'Support bot', 'Normal promotion'];
const PREMIUM_FEATURES = [
  'Saare bots use karein, kitne bhi bots add karein',
  'Ticket bot (Create ticket button, Ticket Tool jaisa)',
  'Voice bot: VC join/leave, mute/unmute, 24/7 AFK, timer + AI voice chat',
  'Server Protection bot: AI live scan (har 2 second)',
  'Level-up bot + AI leaderboard (top 10)',
  'Member Add / Invite bot, Moderation, Ban, AI chat, Supporter',
  'High promotion + High advertisement: aapki listing sabse upar, ⭐ Premium badge',
  `${PREMIUM_DAYS} din ki validity`,
];

export default function PricingPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanState | null>(null);

  useEffect(() => {
    if (!user) return;
    authFetch('/api/payments')
      .then((r) => r.json())
      .then((d) => setPlan(d.plan || null))
      .catch(() => null);
  }, [user]);

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-center text-3xl font-black text-white sm:text-4xl">Plans</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-400">Sirf 2 plans. Free mein basic bots, Premium mein sab kuch.</p>

        {plan?.premium && plan.premium_until && (
          <p className="mx-auto mt-5 max-w-md rounded-xl bg-emerald-400/10 p-3 text-center text-sm text-emerald-200">
            ⭐ Aapka Premium active hai: {new Date(plan.premium_until).toLocaleDateString()} tak
          </p>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-discord-card p-6">
            <p className="text-sm font-semibold text-gray-400">FREE</p>
            <p className="mt-2 text-4xl font-black text-white">₹0</p>
            <ul className="mt-5 space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{f}</li>
              ))}
              <li className="flex items-start gap-2 text-sm text-gray-500"><Lock className="mt-0.5 h-4 w-4 shrink-0" />Baaki sab bots Premium mein</li>
            </ul>
            <Link href="/hosting" className="mt-6 block rounded-xl border border-white/15 py-3 text-center text-sm font-bold text-white hover:bg-white/5">Free shuru karein</Link>
          </div>

          <div className="relative rounded-2xl border border-discord-blurple/60 bg-gradient-to-br from-[#23274a] to-discord-card p-6">
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-discord-blurple px-3 py-1 text-xs font-bold text-white"><Crown className="h-3 w-3" /> POPULAR</span>
            <p className="text-sm font-semibold text-indigo-200">PREMIUM</p>
            <p className="mt-2 text-4xl font-black text-white">₹{PREMIUM_PRICE}<span className="text-base font-semibold text-gray-400"> / {PREMIUM_DAYS} din</span></p>
            <ul className="mt-5 space-y-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-200"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />{f}</li>
              ))}
            </ul>
            <Link href="/checkout?plan=premium" className="mt-6 block rounded-xl bg-discord-blurple py-3 text-center text-sm font-bold text-white hover:brightness-110">
              Premium kharidein ₹{PREMIUM_PRICE}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
