'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';
import {
  Mic,
  MicOff,
  Volume2,
  LogOut,
  Timer,
  Sparkles,
  Send,
  Music2,
  Search,
  SkipBack,
  SkipForward,
  Pause,
  Play,
  Square,
  Trophy,
  Ticket,
  Shield,
} from 'lucide-react';

type BotRow = {
  id: string;
  client_id: string;
  bot_name: string | null;
  modules: string[] | null;
  config: Record<string, unknown> | null;
  enabled: boolean;
  status: string;
  voice_state?: {
    connected?: boolean;
    channelName?: string | null;
    channelId?: string;
    muted?: boolean;
    aiOn?: boolean;
    until?: string | null;
  } | null;
};

const input =
  'mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-discord-blurple';
const btn =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-white/10';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function queueAndWait(
  body: Record<string, unknown>,
  kind: 'voice' | 'bot' | 'test_welcome' = 'bot'
) {
  const r = await authFetch('/api/bot-control', { method: 'POST', body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Failed');
  if (kind === 'test_welcome' || !d.id) return d.result || 'Queued';
  for (let i = 0; i < 12; i++) {
    await sleep(1500);
    const rr = await authFetch('/api/bot-control?id=' + d.id + '&botId=' + body.botId);
    const dd = await rr.json();
    const c = dd.command;
    if (c && c.status !== 'pending') {
      return (c.status === 'done' ? '✅ ' : '❌ ') + (c.result || c.status);
    }
  }
  return 'Queued — worker will apply soon';
}

function VoiceControl({ bot }: { bot: BotRow }) {
  const vs = bot.voice_state || {};
  const cfg = bot.config || {};
  const [channel, setChannel] = useState(String(cfg.voiceChannelId || ''));
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function send(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setNote('');
    try {
      const msg = await queueAndWait({ botId: bot.id, action, channelId: channel.trim(), ...extra }, 'voice');
      setNote(String(msg));
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
        <Mic className="h-4 w-4" /> Voice control
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {vs.connected
          ? `🟢 In VC: ${vs.channelName || vs.channelId} · mic ${vs.muted ? 'muted' : 'on'}`
          : 'Not in a voice channel'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          inputMode="numeric"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Voice channel ID"
          className={input + ' !mt-0 sm:max-w-[200px]'}
        />
        <input
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
          placeholder="Timer min"
          className={input + ' !mt-0 sm:max-w-[100px]'}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy} className={btn} onClick={() => void send('join', { minutes })}>
          <Volume2 className="h-3.5 w-3.5" /> Join
        </button>
        <button disabled={busy} className={btn} onClick={() => void send('leave')}>
          <LogOut className="h-3.5 w-3.5" /> Leave
        </button>
        <button disabled={busy} className={btn} onClick={() => void send('mute')}>
          <MicOff className="h-3.5 w-3.5" /> Mute
        </button>
        <button disabled={busy} className={btn} onClick={() => void send('unmute')}>
          <Mic className="h-3.5 w-3.5" /> Unmute
        </button>
        <button disabled={busy} className={btn} onClick={() => void send('timer', { minutes: minutes || 0 })}>
          <Timer className="h-3.5 w-3.5" /> Timer
        </button>
        <button disabled={busy} className={btn} onClick={() => void send(vs.aiOn ? 'ai_off' : 'ai_on')}>
          <Sparkles className="h-3.5 w-3.5" /> AI voice
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-gray-300">{note}</p>}
    </div>
  );
}

type YTHit = { id: string; title: string; channel: string; thumbnail: string };

function MusicControl({ bot }: { bot: BotRow }) {
  const cfg = bot.config || {};
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<YTHit[]>([]);
  const [current, setCurrent] = useState<YTHit | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    setNote('');
    try {
      const r = await fetch('/api/youtube/search?q=' + encodeURIComponent(q.trim()) + '&max=8');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Search failed');
      const items = (d.items || d.results || []).map(
        (it: {
          id?: { videoId?: string } | string;
          snippet?: { title?: string; channelTitle?: string; thumbnails?: { medium?: { url?: string } } };
          title?: string;
          channel?: string;
          thumbnail?: string;
        }) => {
          const id = typeof it.id === 'string' ? it.id : it.id?.videoId || '';
          return {
            id,
            title: it.snippet?.title || it.title || 'Video',
            channel: it.snippet?.channelTitle || it.channel || '',
            thumbnail: it.snippet?.thumbnails?.medium?.url || it.thumbnail || '',
          };
        }
      );
      setHits(items.filter((x: YTHit) => x.id));
      if (!items.length) setNote('No results');
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function play(hit: YTHit) {
    setBusy(true);
    setNote('');
    setCurrent(hit);
    try {
      const url = 'https://www.youtube.com/watch?v=' + hit.id;
      const msg = await queueAndWait(
        {
          botId: bot.id,
          action: 'music_play',
          url,
          title: hit.title,
          query: hit.title,
          thumbnail: hit.thumbnail,
          artist: hit.channel,
          channelId: String(cfg.musicChannelId || ''),
        },
        'bot'
      );
      setNote('Sent to Discord: ' + String(msg));
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Play failed');
    } finally {
      setBusy(false);
    }
  }

  async function ctrl(action: string) {
    setBusy(true);
    setNote('');
    try {
      const msg = await queueAndWait({ botId: bot.id, action }, 'bot');
      setNote(String(msg));
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-fuchsia-200">
        <Music2 className="h-4 w-4" /> Music control
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Search → click a song or <b>Send to Discord</b>. Bot posts a mini player (Resume / Pause / Skip / Stop) in your
        music channel. Set <b>Voice channel ID</b> on the bot for real audio in VC.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void search()}
          placeholder="Search YouTube…"
          className={input + ' !mt-0 flex-1'}
        />
        <button disabled={searching} className={btn} onClick={() => void search()}>
          <Search className="h-3.5 w-3.5" />
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {current && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-2">
          {current.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.thumbnail} alt="" className="h-12 w-12 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-white/10">
              <Music2 className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{current.title}</p>
            <p className="truncate text-xs text-gray-500">{current.channel}</p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-fuchsia-400/60" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          disabled={busy || !current}
          className={btn + ' border-fuchsia-400/40 bg-fuchsia-500/20'}
          onClick={() => current && void play(current)}
        >
          <Send className="h-3.5 w-3.5" /> Send to Discord
        </button>
        <button disabled={busy} className={btn} onClick={() => void ctrl('music_pause')}>
          <Pause className="h-3.5 w-3.5" /> Pause
        </button>
        <button disabled={busy} className={btn} onClick={() => void ctrl('music_resume')}>
          <Play className="h-3.5 w-3.5" /> Resume
        </button>
        <button disabled={busy} className={btn} onClick={() => void ctrl('music_skip')}>
          <SkipForward className="h-3.5 w-3.5" /> Skip
        </button>
        <button disabled={busy} className={btn} onClick={() => void ctrl('music_stop')}>
          <Square className="h-3.5 w-3.5" /> Stop
        </button>
        <button disabled={busy || !hits[0]} className={btn} onClick={() => hits[0] && void play(hits[0])}>
          <SkipBack className="h-3.5 w-3.5" /> First result
        </button>
      </div>

      {hits.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void play(h)}
                className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-left hover:border-fuchsia-400/30"
              >
                {h.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.thumbnail} alt="" className="h-9 w-9 rounded object-cover" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{h.title}</span>
                  <span className="block truncate text-[10px] text-gray-500">{h.channel}</span>
                </span>
                <span className="shrink-0 text-[10px] font-bold text-fuchsia-300">Send</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-2 text-xs text-gray-300">{note}</p>}
    </div>
  );
}

function WelcomeControl({ bot }: { bot: BotRow }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  async function test() {
    setBusy(true);
    setNote('');
    try {
      const msg = await queueAndWait({ botId: bot.id, action: 'test_welcome' }, 'test_welcome');
      setNote(String(msg || 'Test welcome queued'));
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
      <p className="text-xs font-semibold text-emerald-200">Welcome control</p>
      <button disabled={busy} className={btn + ' mt-2'} onClick={() => void test()}>
        <Send className="h-3.5 w-3.5" /> Test welcome message
      </button>
      {note && <p className="mt-2 text-xs text-gray-300">{note}</p>}
    </div>
  );
}

function SimpleHints({ bot }: { bot: BotRow }) {
  const mods = bot.modules || [];
  return (
    <div className="space-y-2">
      {mods.includes('levels') && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">
          <p className="font-semibold">
            <Trophy className="mr-1 inline h-3.5 w-3.5" /> Level-up
          </p>
          <Link href={'/leaderboard?bot=' + bot.id} className="mt-1 inline-block text-amber-200 underline">
            Open leaderboard
          </Link>
        </div>
      )}
      {(mods.includes('ticket') || mods.includes('tokenclaim')) && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3 text-xs text-sky-100">
          <p className="font-semibold">
            <Ticket className="mr-1 inline h-3.5 w-3.5" /> Ticket / Token
          </p>
          <p className="mt-1 text-gray-400">Use Discord slash commands in the ticket panel channel.</p>
        </div>
      )}
      {(mods.includes('moderation') || mods.includes('security') || mods.includes('ban')) && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-100">
          <p className="font-semibold">
            <Shield className="mr-1 inline h-3.5 w-3.5" /> Mod / Security
          </p>
          <p className="mt-1 text-gray-400">/kick /timeout /ban · logs in your mod log channel.</p>
        </div>
      )}
      {(mods.includes('channelbuilder') || mods.includes('serversetup')) && (
        <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-3 text-xs text-indigo-100">
          <p className="font-semibold">Setup</p>
          <p className="mt-1">/setup-server · /setup-ai · /setup-roles · /setup-full</p>
        </div>
      )}
    </div>
  );
}

export default function BotControlPanel({ bot }: { bot: BotRow }) {
  const mods = bot.modules || [];
  const online = bot.enabled && bot.status === 'online';

  if (!bot.enabled) {
    return (
      <p className="mt-3 text-xs text-gray-500">Turn the bot on (Power) to open the control panel.</p>
    );
  }

  if (!online) {
    return (
      <p className="mt-3 text-xs text-amber-200/80">
        Status: <b>{bot.status}</b> — control panel appears when the worker marks the bot online (~30s).
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Live control panel</p>
      {mods.includes('voice') && <VoiceControl bot={bot} />}
      {mods.includes('music') && <MusicControl bot={bot} />}
      {mods.includes('welcome') && <WelcomeControl bot={bot} />}
      <SimpleHints bot={bot} />
    </div>
  );
}
