'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { Code2 } from 'lucide-react';

export default function DeveloperPanel() {
  const { isDeveloper, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isDeveloper) router.replace('/');
  }, [loading, isDeveloper, router]);

  if (loading || !isDeveloper) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Developer role required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20">
            <Code2 className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Developer Panel</h1>
            <p className="text-xs text-gray-400">System & integration status</p>
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-white/10 bg-discord-card p-4 text-sm text-gray-300">
          <p>
            <span className="text-gray-500">App:</span> Discord Promo Hub
          </p>
          <p>
            <span className="text-gray-500">Auth:</span> Supabase Discord + Email
          </p>
          <p>
            <span className="text-gray-500">Realtime:</span> Messages + Profiles
          </p>
          <p>
            <span className="text-gray-500">YouTube:</span> Data API v3 search + IFrame player
          </p>
          <p>
            <span className="text-gray-500">Deploy:</span> Vercel production
          </p>
        </div>
      </main>
    </div>
  );
}
