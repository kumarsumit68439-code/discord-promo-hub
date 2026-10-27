/**
 * Discord slash commands for music (guild-scoped, registered on startup):
 *   /song play query:<name or link>   search YouTube (yt-dlp) and play in your voice channel
 *   /song join                        bot joins your voice channel
 *   /song leave                       bot leaves the voice channel
 * Uses the same mini-player + audio pipeline as the website (music-control.js).
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

const SONG_COMMAND = new SlashCommandBuilder()
  .setName('song')
  .setDescription('Promo Hub music')
  .addSubcommand((s) =>
    s
      .setName('play')
      .setDescription('Search and play a song in your voice channel')
      .addStringOption((o) => o.setName('query').setDescription('Song name or link').setRequired(true))
  )
  .addSubcommand((s) => s.setName('join').setDescription('Bot joins your voice channel'))
  .addSubcommand((s) => s.setName('leave').setDescription('Bot leaves the voice channel'));

function isHttp(s) {
  return /^https?:\/\/\/i.test(String(s || ''));
}

function isYouTubeLink(s) {
  return /^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(String(s || ''));
}

/** First YouTube search result via yt-dlp (flat, fast). */
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
      reject(new Error('search timeout'));
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
        reject(new Error(err.split('\n').filter(Boolean).pop() || 'no results'));
        return;
      }
      try {
        const j = JSON.parse(line);
        const thumbs = Array.isArray(j.thumbnails) ? j.thumbnails : [];
        resolve({
          title: j.title || 'Track',
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

/** Title / author / thumbnail for a YouTube link (no yt-dlp needed). */
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

function attach(bot, row) {
  const client = bot.client;

  const register = async () => {
    for (const g of client.guilds.cache.values()) {
      if (row.config && row.config.guildId && g.id !== row.config.guildId) continue;
      try {
        await g.commands.create(SONG_COMMAND.toJSON());
      } catch (e) {
        console.warn('[music-commands] register failed in ' + g.id + ':', e.message);
      }
    }
    console.log('[' + row.client_id + '] /song commands registered');
  };
  client.once('clientReady', () => void register());
  client.once('ready', () => void register());
  client.on('guildCreate', (g) => {
    g.commands.create(SONG_COMMAND.toJSON()).catch(() => null);
  });

  client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand() || i.commandName !== 'song' || !i.guild) return;
    try {
      const sub = i.options.getSubcommand();

      if (sub === 'leave') {
        const conn = getVoiceConnection(i.guild.id);
        if (conn) conn.destroy();
        if (bot.leaveVoice) await bot.leaveVoice().catch(() => null);
        await i.reply({ content: '👋 Voice channel chhod diya.', flags: EPHEMERAL });
        return;
      }

      const vc = i.member && i.member.voice && i.member.voice.channel;
      if (!vc) {
        await i.reply({ content: '🔊 Pehle kisi voice channel me join karo.', flags: EPHEMERAL });
        return;
      }
      await i.deferReply({ flags: EPHEMERAL });

      if (sub === 'join') {
        if (!bot.joinVoice) {
          await i.editReply('❌ Join abhi available nahi hai.');
          return;
        }
        const r = await bot.joinVoice(vc.id);
        await i.editReply('✅ ' + String(r || 'Joined') + ' · ' + vc.name);
        return;
      }

      // play
      const q = i.options.getString('query', true).trim();
      let track;
      if (isYouTubeLink(q)) {
        track = { url: q, ...(await ytOEmbed(q)) };
      } else if (isHttp(q)) {
        track = { url: q };
      } else {
        track = await ytSearch(q);
      }

      const textId = (row.config && row.config.musicChannelId) || i.channelId;
      const patched = { ...row, config: { ...(row.config || {}), voiceChannelId: vc.id, musicChannelId: textId } };
      const result = await music.sendMiniPlayer(
        client,
        patched,
        {
          url: track.url,
          title: track.title,
          channel: track.channel,
          thumbnail: track.thumbnail,
          by: i.user.username,
        },
        textId
      );
      await i.editReply('🎵 ' + result);
    } catch (e) {
      const msg = '❌ ' + String((e && e.message) || e).slice(0, 300);
      if (i.deferred || i.replied) await i.editReply(msg).catch(() => null);
      else await i.reply({ content: msg, flags: EPHEMERAL }).catch(() => null);
    }
  });
}

module.exports = { attach };
