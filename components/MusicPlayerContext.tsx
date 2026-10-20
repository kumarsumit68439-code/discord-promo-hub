'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { YTVideo } from '@/lib/youtube';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (id: string) => void;
  getPlayerState: () => number;
  destroy: () => void;
};

type MusicCtx = {
  current: YTVideo | null;
  isPlaying: boolean;
  isMinimized: boolean;
  play: (video: YTVideo) => void;
  toggle: () => void;
  stop: () => void;
  setMinimized: (v: boolean) => void;
};

const Ctx = createContext<MusicCtx | null>(null);

function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<YTVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setMinimized] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingId = useRef<string | null>(null);

  const ensurePlayer = useCallback(async () => {
    await loadYTApi();
    if (playerRef.current) return;

    const el = document.getElementById('yt-hidden-player');
    if (!el || !window.YT) return;

    playerRef.current = new window.YT.Player('yt-hidden-player', {
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (e) => {
          readyRef.current = true;
          if (pendingId.current) {
            e.target.loadVideoById(pendingId.current);
            pendingId.current = null;
          }
        },
        onStateChange: (e) => {
          const S = window.YT?.PlayerState;
          if (!S) return;
          if (e.data === S.PLAYING) setIsPlaying(true);
          else if (e.data === S.PAUSED || e.data === S.ENDED) setIsPlaying(false);
        },
      },
    });
  }, []);

  useEffect(() => {
    ensurePlayer();
    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [ensurePlayer]);

  const play = useCallback(
    async (video: YTVideo) => {
      setCurrent(video);
      setMinimized(false);
      await ensurePlayer();
      if (readyRef.current && playerRef.current) {
        playerRef.current.loadVideoById(video.id);
        playerRef.current.playVideo();
      } else {
        pendingId.current = video.id;
      }
      setIsPlaying(true);
    },
    [ensurePlayer]
  );

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const state = p.getPlayerState();
    const S = window.YT?.PlayerState;
    if (S && state === S.PLAYING) {
      p.pauseVideo();
      setIsPlaying(false);
    } else {
      p.playVideo();
      setIsPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
    setCurrent(null);
    setIsPlaying(false);
  }, []);

  return (
    <Ctx.Provider
      value={{ current, isPlaying, isMinimized, play, toggle, stop, setMinimized }}
    >
      {/* Hidden YT host */}
      <div className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden opacity-0">
        <div id="yt-hidden-player" />
      </div>
      {children}
    </Ctx.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}