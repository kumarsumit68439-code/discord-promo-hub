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

  // Keep one host in DOM always
  useEffect(() => {
    if (!isFullscreen || !current) return;

    const fit = () => {
      const el = stageRef.current;
      if (!el) {
        resizePlayer(window.innerWidth, Math.max(200, window.innerHeight - 200));
        return;
      }
      const r = el.getBoundingClientRect();
      resizePlayer(r.width, r.height);
    };

    fit();
    const t = setTimeout(fit, 100);
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', fit);
    };
  }, [isFullscreen, current, resizePlayer]);

  // Mini mode size
  useEffect(() => {
    if (isFullscreen || !current) return;
    resizePlayer(320, 180);
  }, [isFullscreen, current, resizePlayer]);

  return (
    <>
      {/* Stable YT host — moved with CSS only */}
      <div
        id={playerHostId}
        style={
          !current
            ? {
                position: 'fixed',
                left: -9999,
                top: 0,
                width: 320,
                height: 180,
                opacity: 0,
                pointerEvents: 'none',
                zIndex: 0,
              }
            : isFullscreen
              ? {
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 1,
                  pointerEvents: 'auto',
                  zIndex: 1,
                }
              : {
                  position: 'fixed',
                  right: 0,
                  bottom: 0,
                  width: 320,
                  height: 180,
                  opacity: 0.02,
                  pointerEvents: 'none',
                  zIndex: 0,
                  overflow: 'hidden',
                }
        }
      />

      {!current ? null : isFullscreen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          {/* Top bar */}
          <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white sm:text-base">{current.title}</p>
              <p className="truncate text-xs text-gray-400">{current.channel}</p>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white"
            >
              <Minimize2 className="h-4 w-4" /> Mini
            </button>
            <button
              type="button"
              onClick={stop}
              className="shrink-0 rounded-lg p-2 text-gray-400 hover:text-red-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* VIDEO STAGE — host is portaled visually here via absolute child inside */}
          <div ref={stageRef} className="relative z-0 min-h-0 flex-1 bg-black">
            {/* When fullscreen, the #yt-main-player is position absolute inside this stage.
                We re-parent via fixed overlay trick: actually host is sibling.
                So we use a portal-like fixed region matching stage. */}
          </div>

          {/* Because YT host is a sibling fixed element, position it over the stage */}
          <FullscreenHostReposition hostId={playerHostId} stageRef={stageRef} />

          {error && (
            <p className="relative z-10 shrink-0 bg-red-500/20 px-4 py-2 text-center text-sm text-red-300">
              {error}
            </p>
          )}

          {/* Controls */}
          <div className="relative z-10 shrink-0 border-t border-white/10 bg-[#111214] px-4 py-4">
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
            <button type="button" onClick={stop} className="rounded-lg p-2 text-gray-400 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Positions the YT iframe host exactly over the video stage */
function FullscreenHostReposition({
  hostId,
  stageRef,
}: {
  hostId: string;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { resizePlayer } = useMusicPlayer();

  useEffect(() => {
    const place = () => {
      const host = document.getElementById(hostId);
      const stage = stageRef.current;
      if (!host || !stage) return;
      const r = stage.getBoundingClientRect();
      host.style.position = 'fixed';
      host.style.left = `${r.left}px`;
      host.style.top = `${r.top}px`;
      host.style.width = `${r.width}px`;
      host.style.height = `${r.height}px`;
      host.style.opacity = '1';
      host.style.pointerEvents = 'auto';
      host.style.zIndex = '101';
      host.style.background = '#000';
      resizePlayer(r.width, r.height);

      // Also stretch iframe inside if present
      const iframe = host.querySelector('iframe');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      }
    };

    place();
    const t1 = setTimeout(place, 50);
    const t2 = setTimeout(place, 200);
    window.addEventListener('resize', place);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', place);
    };
  }, [hostId, stageRef, resizePlayer]);

  return null;
}
