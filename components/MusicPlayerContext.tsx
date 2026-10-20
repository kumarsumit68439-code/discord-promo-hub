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
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (opts: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (opts: string | { videoId: string }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type MusicCtx = {
  current: YTVideo | null;
  queue: YTVideo[];
  isPlaying: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  play: (video: YTVideo, queueList?: YTVideo[]) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setFullscreen: (v: boolean) => void;
  playerHostId: string;
};

const Ctx = createContext<MusicCtx | null>(null);
const PLAYER_HOST = 'yt-main-player';

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
  const [queue, setQueue] = useState<YTVideo[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingId = useRef<string | null>(null);
  const queueRef = useRef<YTVideo[]>([]);
  const currentRef = useRef<YTVideo | null>(null);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const playNextFromQueue = useCallback(() => {
    const q = queueRef.current;
    const cur = currentRef.current;
    if (!q.length || !cur) return;
    const idx = q.findIndex((v) => v.id === cur.id);
    const next = idx >= 0 && idx < q.length - 1 ? q[idx + 1] : null;
    if (next && playerRef.current && readyRef.current) {
      setCurrent(next);
      setError(null);
      try {
        playerRef.current.loadVideoById({ videoId: next.id });
        playerRef.current.playVideo();
      } catch {
        setError('Could not play next track');
      }
    }
  }, []);

  const ensurePlayer = useCallback(async () => {
    await loadYTApi();
    if (playerRef.current || !window.YT) return;

    const el = document.getElementById(PLAYER_HOST);
    if (!el) return;

    playerRef.current = new window.YT.Player(PLAYER_HOST, {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          readyRef.current = true;
          if (pendingId.current) {
            try {
              e.target.loadVideoById({ videoId: pendingId.current });
              e.target.playVideo();
            } catch {
              setError('Playback failed');
            }
            pendingId.current = null;
          }
        },
        onStateChange: (e: { data: number; target: YTPlayer }) => {
          const S = window.YT?.PlayerState;
          if (!S) return;
          if (e.data === S.PLAYING) {
            setIsPlaying(true);
            setError(null);
            try {
              setDuration(e.target.getDuration() || 0);
            } catch {
              /* */
            }
          } else if (e.data === S.PAUSED) {
            setIsPlaying(false);
          } else if (e.data === S.ENDED) {
            setIsPlaying(false);
            playNextFromQueue();
          }
        },
        onError: (e: { data: number }) => {
          // 2=invalid id, 5=html5, 100=not found, 101/150=embed not allowed
          const codes: Record<number, string> = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found / private',
            101: 'This video cannot be embedded — try another',
            150: 'This video cannot be embedded — try another',
          };
          setError(codes[e.data] || `YouTube error ${e.data}`);
          setIsPlaying(false);
        },
      },
    });
  }, [playNextFromQueue]);

  useEffect(() => {
    ensurePlayer();
    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* */
      }
      playerRef.current = null;
      readyRef.current = false;
    };
  }, [ensurePlayer]);

  // Progress ticker
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      try {
        const p = playerRef.current;
        if (!p) return;
        setCurrentTime(p.getCurrentTime() || 0);
        const d = p.getDuration() || 0;
        if (d) setDuration(d);
      } catch {
        /* */
      }
    }, 400);
    return () => clearInterval(t);
  }, [isPlaying]);

  const play = useCallback(
    async (video: YTVideo, queueList?: YTVideo[]) => {
      setError(null);
      setCurrent(video);
      setCurrentTime(0);
      setDuration(0);
      if (queueList && queueList.length) {
        setQueue(queueList);
      } else {
        setQueue((prev) => {
          if (prev.some((v) => v.id === video.id)) return prev;
          return [...prev, video];
        });
      }
      await ensurePlayer();
      if (readyRef.current && playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId: video.id });
          playerRef.current.playVideo();
          setIsPlaying(true);
        } catch {
          setError('Could not start playback');
          pendingId.current = video.id;
        }
      } else {
        pendingId.current = video.id;
        setIsPlaying(true);
      }
    },
    [ensurePlayer]
  );

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      const state = p.getPlayerState();
      const S = window.YT?.PlayerState;
      if (S && state === S.PLAYING) {
        p.pauseVideo();
        setIsPlaying(false);
      } else {
        p.playVideo();
        setIsPlaying(true);
      }
    } catch {
      setError('Player not ready');
    }
  }, []);

  const stop = useCallback(() => {
    try {
      playerRef.current?.stopVideo();
    } catch {
      /* */
    }
    setCurrent(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setFullscreen(false);
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    const cur = currentRef.current;
    if (!q.length) return;
    const idx = cur ? q.findIndex((v) => v.id === cur.id) : -1;
    const n = idx >= 0 && idx < q.length - 1 ? q[idx + 1] : q[0];
    if (n) play(n, q);
  }, [play]);

  const prev = useCallback(() => {
    const q = queueRef.current;
    const cur = currentRef.current;
    if (!q.length) return;
    // If >3s into song, restart; else previous track
    try {
      if (playerRef.current && playerRef.current.getCurrentTime() > 3) {
        playerRef.current.seekTo(0, true);
        setCurrentTime(0);
        return;
      }
    } catch {
      /* */
    }
    const idx = cur ? q.findIndex((v) => v.id === cur.id) : 0;
    const p = idx > 0 ? q[idx - 1] : q[q.length - 1];
    if (p) play(p, q);
  }, [play]);

  const seek = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(seconds, true);
      setCurrentTime(seconds);
    } catch {
      /* */
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        current,
        queue,
        isPlaying,
        isFullscreen,
        currentTime,
        duration,
        error,
        play,
        toggle,
        stop,
        next,
        prev,
        seek,
        setFullscreen,
        playerHostId: PLAYER_HOST,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}
