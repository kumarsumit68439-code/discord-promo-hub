'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { PLANS, PlanState } from '@/lib/plans';
import { Check, Crown, Shield, Sparkles, Zap } from 'lucide-react';

const FREE_FEATURES = [
  'Simple bot hosting (forever free)',
  'Welcome + Support + Simple command bots',
  'Custom command prefix',
  'Normal listing promotion',
];

const ICONS = {
  starter: Zap,
  pro: Sparkles,
  vip: Crown,
  admin_panel: Shield,
} as const;

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
    <div className="min-h-screen bg-[#17181c] pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white">Plans</h1>
        <p className="mx-auto mt-2 max-w-lg text-center text-[13px] text-[#949ba4]">
          Free simple hosting never expires. Paid plans unlock every module until they end — then bots go offline until you renew.
        </p>

        {plan?.premium && plan.premium_until && (
          <p className="mx-auto mt-4 max-w-md rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-center text-[13px] text-emerald-200">
            Premium active until {new Date(plan.premium_until).toLocaleDateString()}
          </p>
        )}
        {plan?.admin_panel && plan.admin_panel_until && (
          <p className="mx-auto mt-2 max-w-md rounded-lg border border-indigo-400/20 bg-indigo-400/10 p-3 text-center text-[13px] text-indigo-200">
            Admin panel access until {new Date(plan.admin_panel_until).toLocaleDateString()}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-[#2b2d31] p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#6d6f78]">Free</p>
            <p className="mt-1 text-3xl font-semibold text-white">₹0</p>
            <p className="mt-1 text-[12px] text-[#949ba4]">Simple hosting, no expiry</p>
            <ul className="mt-4 space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[#dbdee1]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/hosting"
              className="mt-5 block rounded-md border border-white/10 py-2.5 text-center text-[13px] font-medium text-white hover:bg-white/[0.04]"
            >
              Open hosting
            </Link>
          </div>

          {PLANS.map((p) => {
            const Icon = ICONS[p.id];
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-5 ${
                  p.vip
                    ? 'border-amber-400/30 bg-gradient-to-b from-amber-400/5 to-[#2b2d31]'
                    : p.id === 'admin_panel'
                      ? 'border-indigo-400/25 bg-[#2b2d31]'
                      : 'border-white/[0.06] bg-[#2b2d31]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6d6f78]">{p.name}</p>
                  <Icon className="h-4 w-4 text-[#949cf7]" />
                </div>
                <p className="mt-1 text-3xl font-semibold text-white">
                  ₹{p.price}
                  <span className="text-sm font-normal text-[#6d6f78]"> / {p.days}d</span>
                </p>
                <p className="mt-1 text-[12px] text-[#949ba4]">{p.tagline}</p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#dbdee1]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/checkout?plan=${p.id}`}
                  className="mt-5 block rounded-md bg-[#5865f2] py-2.5 text-center text-[13px] font-medium text-white hover:bg-[#4752c4]"
                >
                  Buy ₹{p.price}
                </Link>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
