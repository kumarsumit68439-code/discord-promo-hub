'use client';

import {
  Pause,
  Play,
  X,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Music2,
} from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const {
    current,
    isPlaying,
    isFullscreen,
    currentTime,
    duration,
    error,
    toggle,
    stop,
    next,
    prev,
    seek,
    setFullscreen,
    playerHostId,
  } = useMusicPlayer();

  // Always mount YT host (needed for API). Position changes by mode.
  const playerBox = (
    <div
      id={playerHostId}
      className={isFullscreen ? 'h-full w-full' : 'h-full w-full'}
    />
  );

  if (!current) {
    // Keep host in DOM off-screen so API can init early
    return (
      <div className="pointer-events-none fixed -left-[9999px] top-0 h-1 w-1 overflow-hidden opacity-0">
        {playerBox}
      </div>
    );
  }

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  /* ========== FULL SCREEN VIDEO MODE ========== */
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-black">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{current.title}</p>
            <p className="truncate text-xs text-gray-400">{current.channel}</p>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            <Minimize2 className="h-4 w-4" /> Mini
          </button>
          <button
            onClick={stop}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-red-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <div className="absolute inset-0">{playerBox}</div>
        </div>

        {error && (
          <p className="bg-red-500/20 px-4 py-2 text-center text-sm text-red-300">{error}</p>
        )}

        <div className="border-t border-white/10 bg-discord-dark px-4 py-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-discord-blurple"
          />
          <div className="mb-3 flex justify-between text-[11px] text-gray-400">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prev}
              className="rounded-full p-3 text-white hover:bg-white/10"
              title="Previous / Restart"
            >
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              onClick={toggle}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-discord-blurple text-white shadow-lg"
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
            </button>
            <button
              onClick={next}
              className="rounded-full p-3 text-white hover:bg-white/10"
              title="Next"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ========== MINI MODE (audio / song only UI) ========== */
  return (
    <>
      {/* YT iframe off-screen but large enough for reliable playback */}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-0 overflow-hidden opacity-0"
        style={{ width: 320, height: 180 }}
        aria-hidden
      >
        {playerBox}
      </div>

      <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-white/10 bg-discord-dark/95 backdrop-blur-md sm:bottom-0">
        {/* Seek bar */}
        <div className="px-3 pt-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.25}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-discord-blurple"
            style={{
              background: `linear-gradient(to right, #5865F2 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
            }}
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-gray-500">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {error && (
          <p className="px-3 text-center text-[11px] text-red-400">{error}</p>
        )}

        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 pb-3 pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.thumbnail}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{current.title}</p>
            <p className="truncate text-xs text-gray-400">{current.channel}</p>
          </div>

          <button
            onClick={prev}
            className="rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Back"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-discord-blurple text-white hover:bg-[#4752c4]"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button
            onClick={next}
            className="rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white"
            title="Next"
          >
            <SkipForward className="h-5 w-5" />
          </button>

          <button
            onClick={() => setFullscreen(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
            title="Full screen video"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={stop}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
