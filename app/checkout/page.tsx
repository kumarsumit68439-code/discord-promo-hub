'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/api';
import { PREMIUM_DAYS, PREMIUM_PRICE, UPI_ID, UPI_NAME, PlanState } from '@/lib/plans';
import { CheckCircle2, Clock, Copy, Smartphone, XCircle } from 'lucide-react';

type Payment = { id: string; status: 'pending' | 'approved' | 'rejected'; utr: string; admin_note: string | null; created_at: string };

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const [qr, setQr] = useState('');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [copied, setCopied] = useState(false);

  const upiUrl = 'upi://pay?pa=' + encodeURIComponent(UPI_ID) + '&pn=' + encodeURIComponent(UPI_NAME) + '&am=' + PREMIUM_PRICE + '&cu=INR&tn=' + encodeURIComponent('PromoHub Premium');

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) => m.default.toDataURL(upiUrl, { width: 320, margin: 2 }))
      .then((url) => { if (alive) setQr(url); })
      .catch(() => null);
    return () => { alive = false; };
  }, [upiUrl]);

  const load = useCallback(async () => {
    try {
      const r = await authFetch('/api/payments');
      const d = await r.json();
      if (r.ok) { setPayments(d.payments || []); setPlan(d.plan || null); }
    } catch { /* ignore */ }
  }, []);

  // Live: poll every 5s so the waiting message disappears the moment admin approves.
  useEffect(() => {
    if (!user) return;
    void load();
    const t = window.setInterval(() => { if (!document.hidden) void load(); }, 5000);
    return () => window.clearInterval(t);
  }, [user, load]);

  const latest = payments[0];
  const pending = payments.find((p) => p.status === 'pending');
  const justApproved = latest?.status === 'approved' && Date.now() - new Date(latest.created_at).getTime() < 24 * 3600 * 1000;

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = await authFetch('/api/payments', { method: 'POST', body: JSON.stringify({ utr }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submit nahi hua');
      setUtr('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Submit nahi hua'); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-black text-white">Checkout: Premium</h1>
        <p className="mt-1 text-sm text-gray-400">₹{PREMIUM_PRICE} · {PREMIUM_DAYS} din · saare bots</p>

        {!loading && !user ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-6 text-center">
            <p className="text-sm text-gray-300">Plan kharidne ke liye pehle login karein.</p>
            <Link href="/login" className="mt-4 inline-block rounded-xl bg-discord-blurple px-5 py-3 text-sm font-bold text-white">Login</Link>
          </div>
        ) : (
          <>
            {justApproved || (plan?.premium && !pending) ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
                <p className="mt-3 text-lg font-bold text-emerald-200">Payment done ✅ Plan buy ho gaya!</p>
                <p className="mt-1 text-sm text-emerald-100/80">Enjoy 🎉 Ab saare bots use kar sakte ho.</p>
                <Link href="/hosting" className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white">Bots par jayein</Link>
              </div>
            ) : pending ? (
              <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
                <Clock className="mx-auto h-10 w-10 animate-pulse text-amber-300" />
                <p className="mt-3 text-lg font-bold text-amber-200">Waiting for admin approval…</p>
                <p className="mt-1 text-sm text-amber-100/80">Aapka UTR <b>{pending.utr}</b> check ho raha hai. Admin payment confirm karte hi ye message hat jayega aur plan chalu ho jayega.</p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-discord-card p-6">
                {latest?.status === 'rejected' && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Pichla payment reject hua{latest.admin_note ? ': ' + latest.admin_note : ''}. Sahi UTR ke saath dobara try karein.</span>
                  </div>
                )}
                <p className="text-sm font-semibold text-white">1. QR scan karke ₹{PREMIUM_PRICE} pay karein</p>
                <div className="mt-4 flex flex-col items-center">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="UPI QR" className="h-64 w-64 rounded-2xl bg-white p-2" />
                  ) : <div className="h-64 w-64 animate-pulse rounded-2xl bg-white/10" />}
                  <p className="mt-3 text-sm text-gray-300">{UPI_NAME}</p>
                  <button onClick={() => { void navigator.clipboard.writeText(UPI_ID); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-200">
                    <Copy className="h-3.5 w-3.5" />{copied ? 'Copied' : UPI_ID}
                  </button>
                  <a href={upiUrl} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white sm:hidden"><Smartphone className="h-4 w-4" />UPI app mein kholein</a>
                </div>

                <p className="mt-6 text-sm font-semibold text-white">2. Payment ke baad UTR / Ref No. daalein</p>
                <input inputMode="numeric" maxLength={12} value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))} placeholder="12 digit UTR number" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm tracking-widest text-white outline-none focus:border-discord-blurple" />
                <button disabled={busy || utr.length !== 12} onClick={() => void submit()} className="mt-3 w-full rounded-xl bg-discord-blurple py-3 text-sm font-bold text-white disabled:opacity-40">
                  {busy ? 'AI UTR check kar raha hai…' : 'UTR submit karein'}
                </button>
                {error && <p className="mt-3 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
                <p className="mt-3 text-xs text-gray-500">AI pehle UTR ka pattern check karta hai, phir admin payment confirm karta hai. Confirm hone ke baad hi plan chalu hota hai.</p>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
