'use client';

import { useEffect, useRef } from 'react';
import {
  Pause,
  Play,
  X,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useMusicPlayer } from './MusicPlayerContext';

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function hideHost(hostId: string) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.width = '320px';
  host.style.height = '180px';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '0';
  host.style.visibility = 'hidden';
  const iframe = host.querySelector('iframe');
  if (iframe) {
    iframe.style.width = '320px';
    iframe.style.height = '180px';
  }
}

function showHostOverStage(
  hostId: string,
  stage: HTMLElement,
  resizePlayer: (w: number, h: number) => void
) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const r = stage.getBoundingClientRect();
  host.style.position = 'fixed';
  host.style.left = `${r.left}px`;
  host.style.top = `${r.top}px`;
  host.style.width = `${r.width}px`;
  host.style.height = `${r.height}px`;
  host.style.opacity = '1';
  host.style.visibility = 'visible';
  host.style.pointerEvents = 'auto';
  host.style.zIndex = '110';
  host.style.background = '#000';
  resizePlayer(r.width, r.height);
  const iframe = host.querySelector('iframe');
  if (iframe) {
    iframe.style.width = '100%';
    iframe.style.height = '100%';
  }
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
    resizePlayer,
    playerHostId,
  } = useMusicPlayer();

  const stageRef = useRef<HTMLDivElement>(null);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Host visibility by mode
  useEffect(() => {
    if (!current) {
      hideHost(playerHostId);
      return;
    }

    if (!isFullscreen) {
      // Mini = audio only, video hidden off-screen (YT still plays)
      hideHost(playerHostId);
      resizePlayer(320, 180);
      return;
    }

    const place = () => {
      const stage = stageRef.current;
      if (stage) showHostOverStage(playerHostId, stage, resizePlayer);
    };
    place();
    const t1 = setTimeout(place, 50);
    const t2 = setTimeout(place, 250);
    window.addEventListener('resize', place);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', place);
    };
  }, [current, isFullscreen, playerHostId, resizePlayer]);

  // Always mount host node for YT API
  return (
    <>
      <div
        id={playerHostId}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 320,
          height: 180,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {!current ? null : isFullscreen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="relative z-[120] flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{current.title}</p>
              <p className="truncate text-xs text-gray-400">{current.channel}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                hideHost(playerHostId);
                setFullscreen(false);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white"
            >
              <Minimize2 className="h-4 w-4" /> Mini
            </button>
            <button
              type="button"
              onClick={() => {
                hideHost(playerHostId);
                stop();
              }}
              className="shrink-0 rounded-lg p-2 text-gray-400 hover:text-red-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={stageRef} className="relative min-h-0 flex-1 bg-black" />

          {error && (
            <p className="relative z-[120] shrink-0 bg-red-500/20 px-4 py-2 text-center text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="relative z-[120] shrink-0 border-t border-white/10 bg-[#111214] px-4 py-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#5865F2]"
            />
            <div className="mb-3 flex justify-between text-[11px] text-gray-400">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={prev} className="rounded-full p-3 text-white hover:bg-white/10">
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={toggle}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2] text-white"
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
              </button>
              <button type="button" onClick={next} className="rounded-full p-3 text-white hover:bg-white/10">
                <SkipForward className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-white/10 bg-[#111214]/95 backdrop-blur-md sm:bottom-0">
          <div className="px-3 pt-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.25}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[#5865F2]"
              style={{
                background: `linear-gradient(to right, #5865F2 ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
              }}
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-gray-500">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {error && <p className="px-3 text-center text-[11px] text-red-400">{error}</p>}

          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 pb-3 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{current.title}</p>
              <p className="truncate text-xs text-gray-400">{current.channel}</p>
            </div>
            <button type="button" onClick={prev} className="rounded-full p-2 text-gray-300 hover:bg-white/10">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2] text-white"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <button type="button" onClick={next} className="rounded-full p-2 text-gray-300 hover:bg-white/10">
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="rounded-lg p-2 text-gray-400 hover:text-white"
              title="Full screen video"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                hideHost(playerHostId);
                stop();
              }}
              className="rounded-lg p-2 text-gray-400 hover:text-red-400"
              title="Stop"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
