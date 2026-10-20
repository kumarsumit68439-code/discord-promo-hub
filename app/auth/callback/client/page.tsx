'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = params.get('next') || '/';

    async function finish() {
      // Handle ?code= from OAuth redirect
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (err) {
          setError(err.message);
          return;
        }
        router.replace(next);
        return;
      }

      // Hash fragment tokens (implicit) — getSession picks them up
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(next);
      } else {
        // Wait briefly for onAuthStateChange
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) router.replace(next);
          else router.replace('/login');
        }, 800);
      }
    }

    finish();
  }, [params, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-discord-darker px-4 text-center">
        <p className="mb-4 text-red-400">{error}</p>
        <a href="/login" className="text-discord-blurple">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-discord-darker">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-discord-blurple border-t-transparent" />
        <p className="text-sm text-gray-400">Logging you in...</p>
      </div>
    </div>
  );
}
