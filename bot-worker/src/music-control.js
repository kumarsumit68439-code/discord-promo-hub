/**
 * Music control for hosted bots:
 * - Website queues music_play → worker sends interactive mini-player embed
 * - Buttons (play / pause / resume / skip / stop) work via Discord component interactions
 * - Real audio via @discordjs/voice:
 *     * YouTube: yt-dlp first (standalone binary, node as JS runtime), then play-dl, then SoundCloud
 *     * direct MP3 / radio stream URLs (any non-YouTube http(s) link) via ffmpeg
 *     * auto-plays in the configured voice channel when the website sends a track
 *     * the Play button plays the track in the voice channel the clicker is in
 * - Optional YOUTUBE_COOKIE env var (header string, "name=value; name2=value2", or Cookie-Editor JSON)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');

let playdl = null;
try {
  playdl = require('play-dl');
} catch {
  playdl = null;
}

/** Normalise whatever was pasted into YOUTUBE_COOKIE into a clean "name=value; name2=value2" header string. */
function cleanCookie(raw) {
  let c = String(raw || '').trim();
  if (!c) return '';
  if (c.startsWith('[')) {
    // Cookie-Editor "JSON" export
    try {
      const arr = JSON.parse(c);
      if (Array.isArray(arr)) {
        c = arr
          .filter((x) => x && x.name && x.value !== undefined && x.value !== null)
          .map((x) => x.name + '=' + x.value)
          .join('; ');
      }
    } catch {
      /* keep as is */
    }
  }
  c = c
    .replace(/^cookie\s*:\s*/i, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .replace(/;+\s*$/, '');
  return c;
}

/** yt-dlp needs a Netscape cookie file; build one from the header string. */
function writeCookieFile(cookie) {
  try {
    const lines = ['# Netscape HTTP Cookie File'];
    for (const part of cookie.split(';')) {
      const i = part.indexOf('=');
      if (i < 1) continue;
      const name = part.slice(0, i).trim();
      const value = part.slice(i + 1).trim();
      if (!name) continue;
      lines.push(['.youtube.com', 'TRUE', '/', 'TRUE', '2147483647', name, value].join('\t'));
    }
    const file = path.join(os.tmpdir(), 'yt-cookies.txt');
    fs.writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
    return file;
  } catch (e) {
    console.warn('[music] could not write cookie file:', e.message);
    return null;
  }
}

const ytCookie = cleanCookie(process.env.YOUTUBE_COOKIE);
let ytCookieFile = null;
if (ytCookie) {
  const names = ytCookie
    .split(';')
    .map((p) => p.split('=')[0].trim())
    .filter(Boolean);
  console.log('[music] YOUTUBE_COOKIE loaded: ' + names.length + ' cookies (' + names.join(', ') + ')');
  ytCookieFile = writeCookieFile(ytCookie);
  if (playdl) {
    try {
      playdl.setToken({ youtube: { cookie: ytCookie } });
    } catch (e) {
      console.warn('[music] could not set play-dl cookie:', e.message);
    }
  }
}

// Keep yt-dlp fresh (YouTube changes often). Fire and forget.
try {
  const upd = spawn('yt-dlp', ['-U'], { stdio: 'ignore' });
  upd.on('error', () => {});
} catch {
  /* yt-dlp not installed */
}

const EPHEMERAL = 64;

/** guildId -> { player, connection, queue, current, textChannelId, ytproc } */
const sessions = new Map();
/** guildId -> configured voice channel id (fallback for the Play button) */
const voiceHint = new Map();

let soundcloudReady = false;

function isHttp(s) {
  return /^https?:\/\//i.test(String(s || ''));
}

function isYouTube(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(host);
  } catch {
    return false;
  }
}

/** Any http(s) link that is not YouTube / SoundCloud is treated as a direct audio stream (mp3, radio, ...). */
function isDirectAudio(url) {
  if (!isHttp(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$|(^|\.)soundcloud\.com$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function titleFromUrl(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.hostname);
    return last.replace(/\.(mp3|m4a|aac|ogg|opus|wav|flac|m3u8?)$/i, '').replace(/[_-]+/g, ' ').slice(0, 120) || u.hostname;
  } catch {
    return 'Audio';
  }
}

function ytUrl(idOrUrl) {
  const s = String(idOrUrl || '');
  if (isHttp(s)) return s;
  if (/^[\w-]{11}$/.test(s)) return 'https://www.youtube.com/watch?v=' + s;
  return s;
}

function videoIdFrom(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    return u.searchParams.get('v') || '';
  } catch {
    return /^[\w-]{11}$/.test(url) ? url : '';
  }
}

// Max 5 buttons per row: Play, Pause, Resume, Skip, Stop
function playerRow(videoId, paused) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mph:play:' + videoId)
      .setLabel('▶ Play')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mph:pause:' + videoId)
      .setLabel('Pause')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!paused),
    new ButtonBuilder()
      .setCustomId('mph:resume:' + videoId)
      .setLabel('Resume')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!paused),
    new ButtonBuilder()
      .setCustomId('mph:skip:' + videoId)
      .setLabel('Skip')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mph:stop:' + videoId)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
  );
}

// Discord Link buttons must NOT have a custom id (URL and custom id are mutually exclusive).
function searchRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Search on website')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord-promo-hub.vercel.app/hosting')
  );
}

function buildEmbed({ title, channel, thumbnail, url, by, status }) {
  const e = new EmbedBuilder()
    .setColor(status === 'paused' ? 0xf59e0b : 0xa855f7)
    .setTitle(status === 'paused' ? '⏸️ Paused' : '🎵 Now playing')
    .setDescription('**' + (title || 'Track') + '**' + (channel ? '\n' + channel : ''))
    .setFooter({ text: by ? 'Requested from Promo Hub · ' + by : 'Promo Hub music control' });
  if (isHttp(url)) e.setURL(url);
  if (isHttp(thumbnail)) e.setThumbnail(thumbnail);
  return e;
}

function killYtdlp(s) {
  if (s && s.ytproc) {
    try {
      s.ytproc.kill('SIGKILL');
    } catch {
      /* */
    }
    s.ytproc = null;
  }
}

function destroySession(guildId) {
  const s = sessions.get(guildId);
  if (s) {
    s.queue = [];
    s.current = null;
    killYtdlp(s);
    try {
      s.player.stop(true);
    } catch {
      /* */
    }
    try {
      s.connection.destroy();
    } catch {
      /* */
    }
    sessions.delete(guildId);
  }
  const conn = getVoiceConnection(guildId);
  if (conn) {
    try {
      conn.destroy();
    } catch {
      /* */
    }
  }
}

async function ensureSession(guild, voiceChannelId) {
  let s = sessions.get(guild.id);
  if (s && s.connection) {
    const status = s.connection.state && s.connection.state.status;
    const sameChannel = s.connection.joinConfig && s.connection.joinConfig.channelId === String(voiceChannelId);
    if (status !== VoiceConnectionStatus.Destroyed && sameChannel) return s;
    destroySession(guild.id);
    s = null;
  }

  const channel = await guild.channels.fetch(voiceChannelId).catch(() => null);
  if (!channel || channel.type !== 2) {
    throw new Error('Voice channel not found (need a VC ID for real audio)');
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (e) {
    try {
      connection.destroy();
    } catch {
      /* already destroyed */
    }
    throw new Error('Could not join voice: ' + (e.message || e));
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  s = { player, connection, queue: [], current: null, textChannelId: null, ytproc: null };
  sessions.set(guild.id, s);

  player.on(AudioPlayerStatus.Idle, () => {
    killYtdlp(s);
    const next = s.queue.shift();
    if (next) {
      void playTrack(guild, next).catch(() => null);
    } else {
      s.current = null;
    }
  });

  player.on('error', (err) => {
    console.error('[music] player error', err.message);
  });

  return s;
}

function lastErrorLine(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const err = lines.filter((l) => /error/i.test(l));
  return (err.length ? err[err.length - 1] : lines[lines.length - 1] || '').replace(/^ERROR:\s*/i, '').slice(0, 220);
}

/** Start yt-dlp and resolve once it produced audio data (or reject with its error). */
function ytdlpStream(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'bestaudio[ext=webm]/bestaudio/best',
      '-o', '-',
      '--no-playlist',
      '--no-warnings',
      '--quiet',
      '--no-progress',
      '--js-runtimes', 'node',
    ];
    if (ytCookieFile) args.push('--cookies', ytCookieFile);
    args.push(url);

    let proc;
    try {
      proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      reject(new Error('yt-dlp not available: ' + e.message));
      return;
    }

    let err = '';
    let settled = false;
    const finish = (fn, v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(v);
    };
    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* */
      }
      finish(reject, new Error('yt-dlp timeout (45s)'));
    }, 45_000);

    proc.stderr.on('data', (d) => {
      err += d.toString();
      if (err.length > 6000) err = err.slice(-6000);
    });
    proc.on('error', (e) => finish(reject, new Error('yt-dlp not available: ' + e.message)));
    proc.stdout.once('readable', () => finish(resolve, { stream: proc.stdout, proc }));
    proc.on('close', (code) => {
      if (!settled) finish(reject, new Error(lastErrorLine(err) || 'yt-dlp exited with code ' + code));
    });
  });
}

/** SoundCloud fallback when YouTube blocks the server IP. Returns a play-dl stream or null. */
async function soundcloudFallback(track) {
  if (!playdl) return null;
  try {
    if (!soundcloudReady) {
      const clientId = await playdl.getFreeClientID();
      playdl.setToken({ soundcloud: { client_id: clientId } });
      soundcloudReady = true;
    }
    const q = [track.title, track.channel].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!q) return null;
    const found = await playdl.search(q, { source: { soundcloud: 'tracks' }, limit: 1 });
    if (found && found[0] && found[0].url) {
      return await playdl.stream(found[0].url);
    }
  } catch (e) {
    console.warn('[music] soundcloud fallback failed:', e.message || e);
  }
  return null;
}

async function playTrack(guild, track) {
  const s = sessions.get(guild.id);
  if (!s) throw new Error('No voice session');

  const url = ytUrl(track.url || track.id);
  killYtdlp(s);

  // Direct MP3 / radio stream: ffmpeg handles it, no YouTube involved.
  if (isDirectAudio(url)) {
    const resource = createAudioResource(url, { inputType: StreamType.Arbitrary });
    s.current = { ...track, url };
    s.player.play(resource);
    return 'Playing (direct audio)';
  }

  let firstErr = null;

  // 1) YouTube via yt-dlp
  if (isYouTube(url)) {
    try {
      const { stream, proc } = await ytdlpStream(url);
      s.ytproc = proc;
      const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
      s.current = { ...track, url };
      s.player.play(resource);
      return 'Playing (YouTube via yt-dlp)';
    } catch (e) {
      firstErr = e;
      console.warn('[music] yt-dlp failed:', e && e.message ? e.message : e);
    }
  }

  // 2) play-dl
  let streamInfo = null;
  let source = 'YouTube';
  if (playdl) {
    try {
      streamInfo = await playdl.stream(url, { discordPlayerCompatibility: true });
    } catch (e) {
      if (!firstErr) firstErr = e;
      console.warn('[music] play-dl failed:', e && e.message ? e.message : e);
    }
  }

  // 3) SoundCloud
  if (!streamInfo) {
    streamInfo = await soundcloudFallback(track);
    if (streamInfo) source = 'SoundCloud';
  }

  if (!streamInfo) throw firstErr || new Error('No playable source found');

  const resource = createAudioResource(streamInfo.stream, { inputType: streamInfo.type });
  s.current = { ...track, url };
  s.player.play(resource);
  return 'Playing (' + source + ')';
}

/**
 * Send mini player embed to text channel and optionally start audio in VC.
 */
async function sendMiniPlayer(client, row, payload, channelId) {
  const cfg = row.config || {};
  const textId = channelId || cfg.musicChannelId;
  if (!textId) throw new Error('Music channel ID missing');

  const url = ytUrl(payload.url || payload.query || '');
  const direct = isDirectAudio(url);
  const title = String(payload.title || (direct ? titleFromUrl(url) : 'Track')).slice(0, 200);
  const channelName = String(payload.channel || (direct ? 'Direct audio' : '')).slice(0, 100);
  const thumbnail = String(payload.thumbnail || '');
  const videoId = (direct ? '' : videoIdFrom(url)) || 'unknown';
  const by = String(payload.by || 'website');

  const ch = await client.channels.fetch(textId).catch(() => null);
  if (!ch || !ch.isTextBased()) throw new Error('Music text channel not found');

  const embed = buildEmbed({ title, channel: channelName, thumbnail, url, by, status: 'playing' });
  const msg = await ch.send({
    content: '🎧 **Mini player** · press ▶ Play (join a voice channel first) or control from the website',
    embeds: [embed],
    components: [playerRow(videoId, false), searchRow()],
  });

  // Real audio if we have a voice channel
  const voiceId = cfg.voiceChannelId || cfg.musicVoiceChannelId || payload.voiceChannelId;
  if (voiceId && ch.guild) voiceHint.set(ch.guild.id, String(voiceId));
  let audioResult = 'Embed sent (no VC configured — press ▶ Play in a voice channel, or set Voice channel ID on the bot)';
  if (voiceId && ch.guild) {
    try {
      const s = await ensureSession(ch.guild, String(voiceId));
      s.textChannelId = textId;
      const track = { id: videoId, url, title, channel: channelName, thumbnail, messageId: msg.id };
      if (s.current) {
        s.queue.push(track);
        audioResult = 'Queued in VC (' + s.queue.length + ' ahead)';
      } else {
        const r = await playTrack(ch.guild, track);
        audioResult = r + ' in voice channel';
      }
    } catch (e) {
      audioResult = 'Embed sent; audio failed: ' + (e.message || e);
    }
  }

  return audioResult + ' · msg ' + msg.id;
}

async function handleButton(interaction) {
  if (!interaction.isButton()) return false;
  const id = interaction.customId || '';
  if (!id.startsWith('mph:')) return false;

  const parts = id.split(':');
  const action = parts[1];
  const videoId = parts[2] || '';
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'Guild only', flags: EPHEMERAL });
    return true;
  }

  const s = sessions.get(guild.id);

  try {
    if (action === 'play') {
      await interaction.deferReply({ flags: EPHEMERAL });
      const emb = interaction.message && interaction.message.embeds && interaction.message.embeds[0];
      // YouTube tracks carry the video id; direct audio tracks keep their link in the embed URL.
      const trackUrl = videoId && videoId !== 'unknown' ? ytUrl(videoId) : emb && emb.url;
      if (!trackUrl) {
        await interaction.editReply('❌ Is track ka link nahi mila.');
        return true;
      }
      const vcId = (interaction.member && interaction.member.voice && interaction.member.voice.channelId) || voiceHint.get(guild.id);
      if (!vcId) {
        await interaction.editReply('🔊 Pehle kisi voice channel me join karo, phir ▶ Play dabao.');
        return true;
      }
      const descLines = String((emb && emb.description) || '').split('\n');
      const track = {
        id: videoId || 'unknown',
        url: trackUrl,
        title: (descLines[0] || '').replace(/\*\*/g, '').trim(),
        channel: descLines[1] || '',
        thumbnail: (emb && emb.thumbnail && emb.thumbnail.url) || '',
        messageId: interaction.message && interaction.message.id,
      };
      try {
        const sess = await ensureSession(guild, String(vcId));
        if (sess.current) {
          sess.queue.push(track);
          await interaction.editReply('➕ Queue me add hua (' + sess.queue.length + ' aage).');
        } else {
          const r = await playTrack(guild, track);
          await interaction.editReply('▶️ ' + r + ' · voice channel me chal raha hai.');
        }
      } catch (e) {
        await interaction.editReply('❌ Play nahi ho paya: ' + (e.message || e));
      }
      return true;
    }
    if (action === 'pause') {
      if (s?.player) s.player.pause();
      await interaction.update({
        embeds: [
          buildEmbed({
            title: s?.current?.title || 'Track',
            channel: s?.current?.channel,
            thumbnail: s?.current?.thumbnail,
            url: s?.current?.url,
            status: 'paused',
          }),
        ],
        components: [playerRow(videoId, true), searchRow()],
      });
      return true;
    }
    if (action === 'resume') {
      if (s?.player) s.player.unpause();
      await interaction.update({
        embeds: [
          buildEmbed({
            title: s?.current?.title || 'Track',
            channel: s?.current?.channel,
            thumbnail: s?.current?.thumbnail,
            url: s?.current?.url,
            status: 'playing',
          }),
        ],
        components: [playerRow(videoId, false), searchRow()],
      });
      return true;
    }
    if (action === 'skip') {
      if (s?.player) s.player.stop(true);
      await interaction.reply({ content: '⏭️ Skip', flags: EPHEMERAL });
      return true;
    }
    if (action === 'stop') {
      destroySession(guild.id);
      await interaction.update({
        content: '⏹️ Stopped',
        embeds: [],
        components: [],
      });
      return true;
    }
  } catch (e) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Error: ' + (e.message || e), flags: EPHEMERAL }).catch(() => null);
    }
  }
  return true;
}

function attach(client) {
  if (client.__musicControlAttached) return;
  client.__musicControlAttached = true;
  client.on('interactionCreate', (interaction) => {
    void handleButton(interaction).catch((e) => console.error('[music] interaction', e.message));
  });
}

module.exports = {
  attach,
  sendMiniPlayer,
  ytUrl,
};
