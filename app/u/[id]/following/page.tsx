'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, Profile } from '@/lib/supabase';
import SiteHeader from '@/components/SiteHeader';

export default function FollowingPage() {
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', id);
      const ids = (rows || []).map((r) => r.following_id);
      if (!ids.length) {
        setList([]);
        return;
      }
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      setList(data || []);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-discord-darker">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-xl font-bold text-white">Following</h1>
        <div className="space-y-2">
          {list.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.id}`}
              className="flex items-center gap-3 rounded-xl bg-discord-card p-3 hover:bg-discord-hover"
            >
              {u.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full" />
              )}
              <span className="text-white">{u.display_name || u.discord_username}</span>
            </Link>
          ))}
          {list.length === 0 && <p className="text-gray-500">Not following anyone</p>}
        </div>
      </main>
    </div>
  );
}