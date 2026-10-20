'use client';

import { useEffect, useState } from 'react';
import { supabase, getDiscordProfile, AppUser } from '@/lib/supabase';
import { parseYouTubeId, YTVideo } from '@/lib/youtube';
import SiteHeader from '@/components/SiteHeader';
import { useMusicPlayer } from '@/components/MusicPlayerContext';
import { Search, Play, Link2, Music2, Loader2 } from 'lucide-react';

export default function MusicPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState<YTVideo[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play, current } = useMusicPlayer();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAppUser(session?.user ? getDiscordProfile(session.user) : null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setAppUser(session?.user ? getDiscordProfile(session.user) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email',
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    }
    setSearching(false);
  }

  function playFromUrl(e: React.FormEvent) {
    e.preventDefault();
    const id = parseYouTubeId(urlInput);
    if (!id) {
      setError('Invalid YouTube URL or video ID');
      return;
    }
    setError(null);
    play({
      id,
      title: 'YouTube video',
      channel: 'Direct link',
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    });
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-36">
      <SiteHeader
        profile={appUser}
        authLoading={authLoading}
        onLogin={signIn}
        onLogout={signOut}
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20">
            <Music2 className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">YouTube Music Engine</h1>
          <p className="mt-2 text-sm text-gray-400">
            Search or paste a link · plays in the mini player (YouTube Data API v3)
          </p>
        </div>

        {/* URL paste */}
        <form onSubmit={playFromUrl} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube URL or video ID..."
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            Play
          </button>
        </form>

        {/* Search */}
        <form onSubmit={search} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs, artists, remixes..."
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none focus:border-discord-blurple"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-discord-blurple px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4752c4] disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {error.includes('YOUTUBE_API_KEY') && (
              <p className="mt-1 text-xs text-red-400/80">
                Add <code className="text-red-200">YOUTUBE_API_KEY</code> in Vercel env, then
                redeploy.
              </p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((v) => {
              const active = current?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => play(v)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-discord-blurple/50 bg-discord-blurple/10'
                      : 'border-white/5 bg-discord-card hover:border-white/10 hover:bg-discord-hover'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="h-14 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{v.title}</p>
                    <p className="truncate text-xs text-gray-400">{v.channel}</p>
                  </div>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-discord-blurple text-white' : 'bg-white/5 text-gray-300'
                    }`}
                  >
                    <Play className="h-4 w-4 ml-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!searching && results.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-gray-500">
            <Music2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Search YouTube or paste a link to start streaming</p>
          </div>
        )}
      </main>
    </div>
  );
}