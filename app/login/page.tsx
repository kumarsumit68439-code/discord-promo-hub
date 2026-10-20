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
      // If email confirm disabled, session may exist
      if (data.session) {
        router.replace('/');
        return;
      }
      setInfo(
        'Account created. Check your email to confirm, then login. (Or disable email confirm in Supabase Auth settings.)'
      );
      setMode('login');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darker px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-discord-blurple shadow-lg shadow-discord-blurple/30">
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Login to Promo Hub' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Pehle login zaroori hai. Discord ya Email + Password se enter karo.
          </p>
        </div>

        {/* Discord */}
        <button
          type="button"
          onClick={discord}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-discord-blurple py-3.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
        >
          <MessageCircle className="h-5 w-5" />
          Login with Discord
        </button>

        <div className="relative mb-4 text-center text-xs text-gray-500">
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/10" />
          <span className="relative z-10 bg-discord-dark px-3">ya Email + Password</span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-xl border border-white/10 bg-discord-card py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full rounded-xl border border-white/10 bg-discord-card py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white/10 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Login with Email'
                : 'Sign up with Email'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              Naya account?{' '}
              <button
                type="button"
                className="font-medium text-discord-blurple hover:underline"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setInfo(null);
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Pehle se account hai?{' '}
              <button
                type="button"
                className="font-medium text-discord-blurple hover:underline"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setInfo(null);
                }}
              >
                Login
              </button>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-[11px] text-gray-600">
          Login ke baad: Promo · Search · Messages · Music · Profile · Follow
        </p>
      </div>
    </div>
  );
}
