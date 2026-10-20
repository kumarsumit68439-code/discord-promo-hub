'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      const code = searchParams.get('code');
      const err = searchParams.get('error_description') || searchParams.get('error');

      if (err) {
        setError(err);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      // Session ready — go home
      router.replace('/');
    }

    handle();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111214] px-4 text-center">
        <p className="text-lg font-semibold text-red-400">Login failed</p>
        <p className="max-w-md text-sm text-gray-400">{error}</p>
        <a
          href="/"
          className="rounded-lg bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4]"
        >
          Back to home
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#111214]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5865F2] border-t-transparent" />
      <p className="text-sm text-gray-400">Signing you in with Discord...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#111214]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5865F2] border-t-transparent" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}