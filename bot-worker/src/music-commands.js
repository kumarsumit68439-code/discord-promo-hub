/**
 * Discord slash commands for music:
 *   /music play query:<song name OR link>
 *   /music search / join / leave / skip / stop
 *   /song ... (alias)
 */
const { spawn } = require('child_process');
const { SlashCommandBuilder } = require('discord.js');
let getVoiceConnection = () => null;
try {
  getVoiceConnection = require('@discordjs/voice').getVoiceConnection;
} catch (err) {
  console.error('[music-commands] voice load failed:', err.message);
}
const music = require('./music-control');

const EPHEMERAL = 64;

function buildMusicCommand(name) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription('Promo Hub music — play by song name or link')
    .addSubcommand((s) =>
      s
        .setName('play')
        .setDescription('Search YouTube by song name (no URL needed) or paste a link, then play')
        .addStringOption((o) =>
          o
            .setName('query')
            .setDescription('Song name (e.g. "Shape of You") or YouTube/audio link')
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('search')
        .setDescription('Search and play a song by name (same as /music play)')
        .addStringOption((o) =>
          o.setName('query').setDescription('Song name to search on YouTube').setRequired(true)
        )
    )
    .addSubcommand((s) => s.setName('join').setDescription('Bot joins your voice channel'))
    .addSubcommand((s) => s.setName('leave').setDescription('Bot leaves the voice channel'))
    .addSubcommand((s) => s.setName('skip').setDescription('Skip the current track'))
    .addSubcommand((s) => s.setName('stop').setDescription('Stop music and clear queue'));
}

const MUSIC_COMMAND = buildMusicCommand('music');
const SONG_COMMAND = buildMusicCommand('song');

function isHttp(s) {
  return /^https?:\/\//i.test(String(s || ''));
}

function isYouTubeLink(s) {
  return /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(String(s || ''));
}

function ytSearch(query) {
  return new Promise((resolve, reject) => {
    let p;
    try {
      p = spawn(
        'yt-dlp',
        ['--dump-json', '--flat-playlist', '--no-warnings', '--js-runtimes', 'node', 'ytsearch1:' + query],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (e) {
      reject(new Error('yt-dlp not available'));
      return;
    }
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      try {
        p.kill('SIGKILL');
      } catch {
        /* */
      }
      reject(new Error('search timeout — try again or paste a YouTube link'));
    }, 30_000);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error('yt-dlp not available: ' + e.message));
    });
    p.on('close', () => {
      clearTimeout(timer);
      const line = out.split('\n').find((l) => l.trim().startsWith('{'));
      if (!line) {
        reject(new Error(err.split('\n').filter(Boolean).pop() || 'No YouTube results for: ' + query));
        return;
      }
      try {
        const j = JSON.parse(line);
        const thumbs = Array.isArray(j.thumbnails) ? j.thumbnails : [];
        resolve({
          title: j.title || query,
          channel: j.channel || j.uploader || '',
          thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : '',
          url: isHttp(j.url) ? j.url : 'https://www.youtube.com/watch?v=' + j.id,
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function ytOEmbed(url) {
  try {
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url));
    if (!r.ok) return {};
    const j = await r.json();
    return { title: j.title, channel: j.author_name, thumbnail: j.thumbnail_url };
  } catch {
    return {};
  }
}

async function resolveTrack(q) {
  const query = String(q || '').trim();
  if (!query) throw new Error('Song name empty');
  if (isYouTubeLink(query)) {
    return { url: query, ...(await ytOEmbed(query)) };
  }
  if (isHttp(query)) {
    return { url: query, title: query };
  }
  return ytSearch(query);
}

function attach(bot, row) {
  const client = bot.client;

  const register = async () => {
    for (const g of client.guilds.cache.values()) {
      if (row.config && row.config.guildId && g.id !== row.config.guildId) continue;
      try {
        await g.commands.create(MUSIC_COMMAND.toJSON());
        await g.commands.create(SONG_COMMAND.toJSON());
      } catch (e) {
        console.warn('[music-commands] register failed in ' + g.id + ':', e.message);
      }
    }
    console.log('[' + row.client_id + '] /music and /song commands registered');
  };
  client.once('clientReady', () => void register());
  client.once('ready', () => void register());
  client.on('guildCreate', (g) => {
    g.commands.create(MUSIC_COMMAND.toJSON()).catch(() => null);
    g.commands.create(SONG_COMMAND.toJSON()).catch(() => null);
  });

  client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand() || !i.guild) return;
    if (i.commandName !== 'music' && i.commandName !== 'song') return;

    try {
      const sub = i.options.getSubcommand();

      if (sub === 'leave') {
        const conn = getVoiceConnection(i.guild.id);
        if (conn) conn.destroy();
        if (bot.leaveVoice) await bot.leaveVoice().catch(() => null);
        if (music.destroySession) music.destroySession(i.guild.id);
        await i.reply({ content: '👋 Voice channel chhod diya.', flags: EPHEMERAL });
        return;
      }

      if (sub === 'stop') {
        if (music.destroySession) music.destroySession(i.guild.id);
        const conn = getVoiceConnection(i.guild.id);
        if (conn) conn.destroy();
        await i.reply({ content: '⏹️ Music band, queue clear.', flags: EPHEMERAL });
        return;
      }

      if (sub === 'skip') {
        try {
          const sessions = music.sessions;
          const s = sessions && sessions.get(i.guild.id);
          if (s && s.player) {
            s.player.stop(true);
            await i.reply({ content: '⏭️ Skip.', flags: EPHEMERAL });
          } else {
            await i.reply({ content: 'Koi track nahi chal raha.', flags: EPHEMERAL });
          }
        } catch (e) {
          await i.reply({ content: '❌ Skip fail: ' + (e.message || e), flags: EPHEMERAL });
        }
        return;
      }

      let vc = i.member && i.member.voice && i.member.voice.channel;
      if (!vc) {
        try {
          const member = await i.guild.members.fetch({ user: i.user.id, force: true });
          vc = member && member.voice && member.voice.channel;
        } catch {
          /* */
        }
      }
      if (!vc) {
        const conn = getVoiceConnection(i.guild.id);
        if (conn && conn.joinConfig && conn.joinConfig.channelId) {
          vc = await i.guild.channels.fetch(conn.joinConfig.channelId).catch(() => null);
        }
      }
      if (!vc && row.config && row.config.voiceChannelId) {
        vc = await i.guild.channels.fetch(String(row.config.voiceChannelId)).catch(() => null);
      }

      if (sub === 'join') {
        if (!vc) {
          await i.reply({ content: '🔊 Pehle kisi voice channel me join karo.', flags: EPHEMERAL });
          return;
        }
        await i.deferReply({ flags: EPHEMERAL });
        if (!bot.joinVoice) {
          await i.editReply('❌ Join abhi available nahi hai.');
          return;
        }
        const r = await bot.joinVoice(vc.id);
        await i.editReply('✅ ' + String(r || 'Joined') + ' · ' + vc.name);
        return;
      }

      if (!vc) {
        await i.reply({
          content: '🔊 Pehle voice channel me join karo, phir `/music play query:song name` use karo.',
          flags: EPHEMERAL,
        });
        return;
      }

      await i.deferReply({ flags: EPHEMERAL });
      const q = i.options.getString('query', true).trim();
      await i.editReply('🔍 Searching: **' + q.slice(0, 80) + '** …');

      const track = await resolveTrack(q);

      const textId = (row.config && row.config.musicChannelId) || i.channelId;
      const patched = {
        ...row,
        config: {
          ...(row.config || {}),
          voiceChannelId: vc.id,
          musicChannelId: textId,
        },
      };

      const result = await music.sendMiniPlayer(
        client,
        patched,
        {
          url: track.url,
          title: track.title,
          channel: track.channel,
          thumbnail: track.thumbnail,
          by: i.user.username,
          voiceChannelId: vc.id,
        },
        textId
      );

      await i.editReply('🎵 **' + String(track.title || q).slice(0, 120) + '**\n' + result);
    } catch (e) {
      const msg = '❌ ' + String((e && e.message) || e).slice(0, 300);
      if (i.deferred || i.replied) await i.editReply(msg).catch(() => null);
      else await i.reply({ content: msg, flags: EPHEMERAL }).catch(() => null);
    }
  });
}

module.exports = { attach };
