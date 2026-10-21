'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function discord() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email',
      },
    });
    if (err) setError(err.message);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.replace('/');
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data.session) {
        router.replace('/');
        return;
      }
      setInfo('Account created. Check your email to confirm, then sign in.');
      setMode('login');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#17181c] px-4">
      <div className="w-full max-w-md rounded-xl border border-white/[0.08] bg-[#1e1f22] p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5865f2] text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-xl font-semibold text-white">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#949ba4]">
            Use Discord or email and password to continue.
          </p>
        </div>

        <button
          type="button"
          onClick={discord}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#5865f2] py-3 text-[13px] font-medium text-white hover:bg-[#4752c4]"
        >
          <MessageCircle className="h-4 w-4" />
          Continue with Discord
        </button>

        <div className="relative mb-4 text-center text-[11px] text-[#6d6f78]">
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/[0.06]" />
          <span className="relative z-10 bg-[#1e1f22] px-3">or email</span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d6f78]" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-md border border-white/10 bg-[#2b2d31] py-2.5 pl-10 pr-3 text-[13px] text-white outline-none focus:border-[#5865f2]/50"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d6f78]" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full rounded-md border border-white/10 bg-[#2b2d31] py-2.5 pl-10 pr-3 text-[13px] text-white outline-none focus:border-[#5865f2]/50"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
          )}
          {info && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-400">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white/10 py-2.5 text-[13px] font-medium text-white hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in with email' : 'Sign up with email'}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#949ba4]">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                type="button"
                className="font-medium text-[#949cf7] hover:underline"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setInfo(null);
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-[#949cf7] hover:underline"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfo(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
