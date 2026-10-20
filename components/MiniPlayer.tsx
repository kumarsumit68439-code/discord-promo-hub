'use client';

import { Pause, Play, X, ChevronDown, ChevronUp, Music2 } from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';

export default function MiniPlayer() {
  const { current, isPlaying, isMinimized, toggle, stop, setMinimized } = useMusicPlayer();

  if (!current) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-discord-blurple shadow-lg shadow-discord-blurple/30 transition hover:scale-105"
        title="Open player"
      >
        <Music2 className={`h-5 w-5 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-discord-dark/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.thumbnail}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{current.title}</p>
          <p className="truncate text-xs text-gray-400">{current.channel}</p>
        </div>
        <button
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-discord-blurple text-white transition hover:bg-[#4752c4]"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button
          onClick={() => setMinimized(true)}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
          title="Minimize"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={stop}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Optional visual embed for video mode */}
      <div className="mx-auto hidden max-w-6xl px-4 pb-3 sm:block">
        <div className="overflow-hidden rounded-xl border border-white/5 bg-black">
          <iframe
            key={current.id}
            title={current.title}
            className="aspect-video w-full max-h-48"
            src={`https://www.youtube.com/embed/${current.id}?autoplay=0&rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-1 text-center text-[10px] text-gray-600">
          Audio plays via YouTube engine · use controls above or the embed
        </p>
      </div>
    </div>
  );
}