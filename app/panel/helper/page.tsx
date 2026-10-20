'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';
import { HeartHandshake } from 'lucide-react';

export default function HelperPanel() {
  const { isHelper, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isHelper && !isAdmin) router.replace('/');
  }, [loading, isHelper, isAdmin, router]);

  if (loading || (!isHelper && !isAdmin)) {
    return (
      <div className="min-h-screen bg-discord-darker">
        <SiteHeader />
        <p className="py-20 text-center text-gray-400">Helper role required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
            <HeartHandshake className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Helper Panel</h1>
            <p className="text-xs text-gray-400">Guide users · light support</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-gray-300">
          <p>Helpers can assist new users with:</p>
          <ul className="list-inside list-disc space-y-1 text-gray-400">
            <li>How to publish Discord / website promos</li>
            <li>How to search users & follow</li>
            <li>How to use Messages</li>
            <li>Music player basics</li>
          </ul>
          <Link href="/users" className="mt-4 inline-block text-discord-blurple underline">
            Open user search →
          </Link>
        </div>
      </main>
    </div>
  );
}
