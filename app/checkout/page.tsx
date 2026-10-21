'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { getPlan, UPI_ID, UPI_NAME, PlanState, PLANS } from '@/lib/plans';
import { CheckCircle2, Clock, Copy, Smartphone, XCircle } from 'lucide-react';

type Payment = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  utr: string;
  plan?: string;
  amount?: number;
  admin_note: string | null;
  created_at: string;
};

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const search = useSearchParams();
  const planId = search.get('plan') || 'starter';
  const planDef = getPlan(planId) || PLANS[0];

  const [qr, setQr] = useState('');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [copied, setCopied] = useState(false);

  const upiUrl = useMemo(
    () =>
      'upi://pay?pa=' +
      encodeURIComponent(UPI_ID) +
      '&pn=' +
      encodeURIComponent(UPI_NAME) +
      '&am=' +
      planDef.price +
      '&cu=INR&tn=' +
      encodeURIComponent('PromoHub ' + planDef.name),
    [planDef]
  );

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) => m.default.toDataURL(upiUrl, { width: 320, margin: 2 }))
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [upiUrl]);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/payments');
      const d = await r.json();
      if (r.ok) {
        setPayments(d.payments || []);
        setPlan(d.plan || null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => window.clearInterval(t);
  }, [user, load]);

  const latest = payments[0];
  const pending = payments.find((p) => p.status === 'pending');
  const justApproved =
    latest?.status === 'approved' && Date.now() - new Date(latest.created_at).getTime() < 24 * 3600 * 1000;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const r = await authFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ utr, plan: planDef.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submit failed');
      setUtr('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  const success =
    justApproved ||
    (planDef.grantsPremium && plan?.premium && !pending) ||
    (planDef.grantsAdminPanel && plan?.admin_panel && !pending);

  return (
    <div className="min-h-screen bg-[#17181c] pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold text-white">Checkout · {planDef.name}</h1>
        <p className="mt-1 text-[13px] text-[#949ba4]">
          ₹{planDef.price} · {planDef.days} days · {planDef.tagline}
        </p>

        {!loading && !user ? (
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-6 text-center">
            <p className="text-[13px] text-[#dbdee1]">Sign in to complete purchase.</p>
            <Link href="/login" className="mt-4 inline-block rounded-md bg-[#5865f2] px-5 py-2.5 text-[13px] font-medium text-white">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            {success ? (
              <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-6 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
                <p className="mt-3 text-[15px] font-semibold text-emerald-200">Payment approved</p>
                <p className="mt-1 text-[13px] text-emerald-100/80">Your {planDef.name} plan is active. Enjoy.</p>
                <Link
                  href={planDef.grantsAdminPanel ? '/admin' : '/hosting'}
                  className="mt-4 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-[13px] font-medium text-white"
                >
                  {planDef.grantsAdminPanel ? 'Open admin' : 'Open hosting'}
                </Link>
              </div>
            ) : pending ? (
              <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-6 text-center">
                <Clock className="mx-auto h-9 w-9 animate-pulse text-amber-300" />
                <p className="mt-3 text-[15px] font-semibold text-amber-200">Waiting for admin approval</p>
                <p className="mt-1 text-[13px] text-amber-100/80">
                  UTR <b>{pending.utr}</b> is under review. This message clears when payment is confirmed.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-6">
                {latest?.status === 'rejected' && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-400/10 p-3 text-[13px] text-rose-200">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Previous payment rejected{latest.admin_note ? ': ' + latest.admin_note : ''}. Try again with a valid
                      UTR.
                    </span>
                  </div>
                )}
                <p className="text-[13px] font-medium text-white">1. Pay ₹{planDef.price} via UPI</p>
                <div className="mt-4 flex flex-col items-center">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="UPI QR" className="h-56 w-56 rounded-xl bg-white p-2" />
                  ) : (
                    <div className="h-56 w-56 animate-pulse rounded-xl bg-white/10" />
                  )}
                  <p className="mt-3 text-[13px] text-[#dbdee1]">{UPI_NAME}</p>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(UPI_ID);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    }}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#b5bac1]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied' : UPI_ID}
                  </button>
                  <a
                    href={upiUrl}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-4 py-2 text-[12px] font-medium text-white sm:hidden"
                  >
                    <Smartphone className="h-4 w-4" /> Open in UPI app
                  </a>
                </div>

                <p className="mt-6 text-[13px] font-medium text-white">2. Enter UTR / reference number</p>
                <input
                  inputMode="numeric"
                  maxLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  placeholder="12-digit UTR"
                  className="mt-2 w-full rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2.5 text-[13px] tracking-widest text-white outline-none focus:border-[#5865f2]/50"
                />
                <button
                  disabled={busy || utr.length !== 12}
                  onClick={() => void submit()}
                  className="mt-3 w-full rounded-md bg-[#5865f2] py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {busy ? 'Checking UTR…' : 'Submit UTR'}
                </button>
                {error && <p className="mt-3 rounded-md bg-rose-400/10 p-3 text-[13px] text-rose-200">{error}</p>}
                <p className="mt-3 text-[11px] text-[#6d6f78]">
                  We validate the UTR format first. An admin confirms the payment before the plan activates.
                </p>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
