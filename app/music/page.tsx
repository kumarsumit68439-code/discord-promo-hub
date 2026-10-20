'use client';

import { useState } from 'react';
import { parseYouTubeId, YTVideo } from '@/lib/youtube';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useMusicPlayer } from '@/components/MusicPlayerContext';
import { Search, Play, Link2, Music2, Loader2, Maximize2 } from 'lucide-react';

export default function MusicPage() {
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState<YTVideo[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play, current, setFullscreen } = useMusicPlayer();

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
      if (!(data.items || []).length) setError('No results');
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

  function playTrack(v: YTVideo) {
    play(v, results.length ? results : [v]);
  }

  return (
    <div className="min-h-screen bg-discord-darker pb-36">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20">
            <Music2 className="h-6 w-6 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">YouTube Music</h1>
          <p className="mt-2 text-sm text-gray-400">
            Mini = song controls · Full screen = video · Seek / next / pause / back
          </p>
        </div>

        <form onSubmit={playFromUrl} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube URL or video ID..."
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white">
            Play
          </button>
        </form>

        <form onSubmit={search} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-lg border border-white/10 bg-discord-card py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-discord-blurple"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-2 rounded-lg bg-discord-blurple px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {current && (
          <button
            onClick={() => setFullscreen(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-discord-blurple/40 bg-discord-blurple/15 py-3 text-sm font-semibold text-discord-blurple"
          >
            <Maximize2 className="h-4 w-4" /> Open full screen video
          </button>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((v) => {
              const active = current?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => playTrack(v)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                    active
                      ? 'border-discord-blurple/50 bg-discord-blurple/10'
                      : 'border-white/5 bg-discord-card hover:bg-discord-hover'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt="" className="h-14 w-24 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{v.title}</p>
                    <p className="truncate text-xs text-gray-400">{v.channel}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                    <Play className="ml-0.5 h-4 w-4 text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!searching && results.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-gray-500">
            <Music2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Search or paste a YouTube link</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
