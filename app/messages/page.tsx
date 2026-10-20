'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, Profile, Message } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import SiteHeader from '@/components/SiteHeader';

type Thread = { otherId: string; last: Message; profile?: Profile };

export default function MessagesInbox() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const map = new Map<string, Message>();
      for (const m of data || []) {
        const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!map.has(other)) map.set(other, m);
      }
      const otherIds = [...map.keys()];
      let profiles: Profile[] = [];
      if (otherIds.length) {
        const { data: ps } = await supabase.from('profiles').select('*').in('id', otherIds);
        profiles = ps || [];
      }
      setThreads(
        otherIds.map((oid) => ({
          otherId: oid,
          last: map.get(oid)!,
          profile: profiles.find((p) => p.id === oid),
        }))
      );
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-discord-darker pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-xl font-bold text-white">Messages</h1>
        <p className="mb-4 text-xs text-gray-500">
          Open a user profile → Message to start a chat
        </p>
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.otherId}
              href={`/messages/${t.otherId}`}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-discord-card p-3 hover:bg-discord-hover"
            >
              {t.profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.profile.avatar_url} alt="" className="h-11 w-11 rounded-full" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-discord-blurple" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {t.profile?.display_name || t.profile?.discord_username || 'User'}
                </p>
                <p className="truncate text-xs text-gray-400">{t.last.content}</p>
              </div>
            </Link>
          ))}
          {threads.length === 0 && (
            <p className="py-10 text-center text-gray-500">No conversations yet</p>
          )}
        </div>
      </main>
    </div>
  );
}