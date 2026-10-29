/**
 * Lofi-style now-playing panel — YouTube, YT Music, Spotify, Deezer, Instagram
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

function qEnc(s) {
  return encodeURIComponent(String(s || '').slice(0, 90));
}

function splitTitleArtist(title, channel) {
  const t = String(title || 'Track').trim();
  const ch = String(channel || '').trim();
  for (const sep of [' — ', ' – ', ' - ', ' | ']) {
    if (t.includes(sep)) {
      const [a, ...rest] = t.split(sep);
      const b = rest.join(sep).trim();
      if (a && b) return { artist: a.trim(), song: b };
    }
  }
  return { artist: ch || 'Artist', song: t };
}

function buildNowPlayingPanel(track, by) {
  const title = String(track.title || 'Track').slice(0, 200);
  const channel = String(track.channel || '').slice(0, 100);
  const url = String(track.url || '');
  const thumb = String(track.thumbnail || '');
  const { artist, song } = splitTitleArtist(title, channel);
  const q = qEnc((artist !== 'Artist' ? artist + ' ' : '') + song);
  const qArtist = qEnc(artist);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: 'Playing song', iconURL: thumb || undefined })
    .setTitle('▶ ' + song.slice(0, 240))
    .setDescription(
      '**' + song + '**' +
      (artist ? '\n' + artist : '') +
      (channel && channel !== artist ? '\n📡 ' + channel : '')
    )
    .addFields({
      name: artist || 'Artist',
      value:
        '[YouTube](' + (url || 'https://youtube.com') + ') · ' +
        '[YT Music](https://music.youtube.com/search?q=' + q + ') · ' +
        '[Spotify](https://open.spotify.com/search/' + q + ') · ' +
        '[Deezer](https://www.deezer.com/search/' + q + ') · ' +
        '[Instagram](https://www.instagram.com/explore/search/keyword/?q=' + qArtist + ')',
      inline: false,
    })
    .setFooter({ text: by ? 'Promo Hub · ' + by : 'Promo Hub music' });
  if (url) embed.setURL(url);
  if (thumb) embed.setThumbnail(thumb);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji('▶️').setLabel('YouTube')
      .setURL(url || 'https://www.youtube.com/results?search_query=' + q),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji('🎵').setLabel('YT Music')
      .setURL('https://music.youtube.com/search?q=' + q),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji('💚').setLabel('Spotify')
      .setURL('https://open.spotify.com/search/' + q),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji('💜').setLabel('Deezer')
      .setURL('https://www.deezer.com/search/' + q),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji('📸').setLabel('Instagram')
      .setURL('https://www.instagram.com/explore/search/keyword/?q=' + qArtist)
  );

  return { embeds: [embed], components: [row1] };
}

module.exports = { buildNowPlayingPanel };
