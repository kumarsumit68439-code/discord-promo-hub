/**
 * Music control for hosted bots:
 * - Website queues music_play → worker sends interactive mini-player embed
 * - Buttons (play / pause / skip / stop) work via Discord component interactions
 * - Optional real audio via play-dl + @discordjs/voice when a voice channel is known
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');

let playdl = null;
try {
  playdl = require('play-dl');
} catch {
  playdl = null;
}

/** guildId -> { player, connection, queue, current, textChannelId } */
const sessions = new Map();

function ytUrl(idOrUrl) {
  const s = String(idOrUrl || '');
  if (/^https?:\/\//i.test(s)) return s;
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

function playerRow(videoId, paused) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mph:resume:' + videoId)
      .setLabel('Resume')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!paused),
    new ButtonBuilder()
      .setCustomId('mph:pause:' + videoId)
      .setLabel('Pause')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!paused),
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

function searchRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mph:search')
      .setLabel('Search on website')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord-promo-hub-io-cr-7-c3d3.vercel.app/hosting')
  );
}

function buildEmbed({ title, channel, thumbnail, url, by, status }) {
  const e = new EmbedBuilder()
    .setColor(status === 'paused' ? 0xf59e0b : 0xa855f7)
    .setTitle(status === 'paused' ? '⏸️ Paused' : '🎵 Now playing')
    .setDescription('**' + (title || 'Track') + '**' + (channel ? '\n' + channel : ''))
    .setURL(url || null)
    .setFooter({ text: by ? 'Requested from Promo Hub · ' + by : 'Promo Hub music control' });
  if (thumbnail) e.setThumbnail(thumbnail);
  return e;
}

async function ensureSession(guild, voiceChannelId) {
  let s = sessions.get(guild.id);
  if (s && s.connection) return s;

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
    connection.destroy();
    throw new Error('Could not join voice: ' + (e.message || e));
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  s = { player, connection, queue: [], current: null, textChannelId: null };
  sessions.set(guild.id, s);

  player.on(AudioPlayerStatus.Idle, () => {
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

async function playTrack(guild, track) {
  if (!playdl) throw new Error('play-dl not available');
  const s = sessions.get(guild.id);
  if (!s) throw new Error('No voice session');

  const url = ytUrl(track.url || track.id);
  let streamInfo;
  try {
    streamInfo = await playdl.stream(url, { discordPlayerCompatibility: true });
  } catch (e) {
    // fallback: search by title
    if (track.title) {
      const found = await playdl.search(track.title, { limit: 1 });
      if (found[0]?.url) streamInfo = await playdl.stream(found[0].url, { discordPlayerCompatibility: true });
    }
    if (!streamInfo) throw e;
  }

  const resource = createAudioResource(streamInfo.stream, { inputType: streamInfo.type });
  s.current = { ...track, url };
  s.player.play(resource);
  return 'Playing in voice';
}

/**
 * Send mini player embed to text channel and optionally start audio in VC.
 */
async function sendMiniPlayer(client, row, payload, channelId) {
  const cfg = row.config || {};
  const textId = channelId || cfg.musicChannelId;
  if (!textId) throw new Error('Music channel ID missing');

  const title = String(payload.title || 'Track').slice(0, 200);
  const channelName = String(payload.channel || '').slice(0, 100);
  const thumbnail = String(payload.thumbnail || '');
  const url = ytUrl(payload.url || payload.query || '');
  const videoId = videoIdFrom(url) || 'unknown';
  const by = String(payload.by || 'website');

  const ch = await client.channels.fetch(textId).catch(() => null);
  if (!ch || !ch.isTextBased()) throw new Error('Music text channel not found');

  const embed = buildEmbed({ title, channel: channelName, thumbnail, url, by, status: 'playing' });
  const msg = await ch.send({
    content: '🎧 **Mini player** · control from Discord buttons or the website',
    embeds: [embed],
    components: [playerRow(videoId, false), searchRow()],
  });

  // Real audio if we have a voice channel
  const voiceId = cfg.voiceChannelId || cfg.musicVoiceChannelId || payload.voiceChannelId;
  let audioResult = 'Embed sent (no VC configured — set Voice channel ID on the bot for real audio)';
  if (voiceId && playdl && ch.guild) {
    try {
      const s = await ensureSession(ch.guild, String(voiceId));
      s.textChannelId = textId;
      if (s.current) {
        s.queue.push({ id: videoId, url, title, channel: channelName, thumbnail, messageId: msg.id });
        audioResult = 'Queued in VC (' + s.queue.length + ' ahead)';
      } else {
        await playTrack(ch.guild, { id: videoId, url, title, channel: channelName, thumbnail, messageId: msg.id });
        audioResult = 'Playing in voice channel';
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
    await interaction.reply({ content: 'Guild only', ephemeral: true });
    return true;
  }

  const s = sessions.get(guild.id);

  try {
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
      await interaction.reply({ content: '⏭️ Skip', ephemeral: true });
      return true;
    }
    if (action === 'stop') {
      if (s) {
        s.queue = [];
        s.current = null;
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
        sessions.delete(guild.id);
      }
      const conn = getVoiceConnection(guild.id);
      if (conn) conn.destroy();
      await interaction.update({
        content: '⏹️ Stopped',
        embeds: [],
        components: [],
      });
      return true;
    }
  } catch (e) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Error: ' + (e.message || e), ephemeral: true }).catch(() => null);
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
