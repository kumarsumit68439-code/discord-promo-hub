'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email',
      },
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      router.replace('/');
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setInfo('Check your email to confirm, or login if confirmations are disabled.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darker px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-discord-dark p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-discord-blurple">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Login' : 'Create account'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">Promo Hub — Discord or email</p>
        </div>

        <button
          onClick={discord}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-discord-blurple py-3 text-sm font-semibold text-white hover:bg-[#4752c4]"
        >
          <MessageCircle className="h-4 w-4" />
          Continue with Discord
        </button>

        <div className="relative mb-4 text-center text-xs text-gray-500">
          <span className="bg-discord-dark px-2 relative z-10">or email</span>
          <div className="absolute left-0 right-0 top-1/2 border-t border-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6)"
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-discord-green">{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button className="text-discord-blurple" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button className="text-discord-blurple" onClick={() => setMode('login')}>
                Login
              </button>
            </>
          )}
        </p>

        <Link href="/" className="mt-4 block text-center text-xs text-gray-500 hover:text-gray-300">
          ← Back to home (listings are public)
        </Link>
      </div>
    </div>
  );
}