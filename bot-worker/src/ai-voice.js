/**
 * AI Voice in VC — GROQ reply + TTS (Google translate TTS, no extra key)
 * Panel: text question → AI answer spoken in voice channel.
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { createAudioResource, getVoiceConnection, createAudioPlayer } = require('@discordjs/voice');
const { Readable } = require('stream');

const EPHEMERAL = 64;

function musicSessions() {
  try {
    return require('./music-control').sessions;
  } catch {
    return null;
  }
}

async function groqReply(userText) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY Railway pe set nahi hai');
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful Discord voice assistant. Answer in the same language as the user (Hindi or English). Keep answers short (1-3 sentences) for speaking aloud. No markdown, no emoji spam.',
        },
        { role: 'user', content: String(userText).slice(0, 500) },
      ],
      max_tokens: 180,
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('GROQ HTTP ' + r.status + ' ' + t.slice(0, 120));
  }
  const j = await r.json();
  const out = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!out) throw new Error('GROQ empty reply');
  return String(out).trim();
}

async function ttsBuffer(text) {
  const safe = String(text || '')
    .slice(0, 200)
    .replace(/[^\w\s.,!?'\-\u0900-\u097F]/gi, ' ')
    .trim();
  if (!safe) throw new Error('Empty speech text');
  const tl = /[\u0900-\u097F]/.test(safe) ? 'hi' : 'en';
  const url =
    'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=' +
    encodeURIComponent(safe) +
    '&tl=' +
    tl;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('TTS failed HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

async function speakInGuild(guild, text) {
  const sessions = musicSessions();
  let s = sessions && sessions.get(guild.id);
  const conn = getVoiceConnection(guild.id);
  if (!conn) throw new Error('Bot pehle voice channel me join kare (/music join)');

  if (!s || !s.player) {
    const player = createAudioPlayer();
    conn.subscribe(player);
    s = { player, connection: conn, queue: [], current: null, textChannelId: null, ytproc: null, ytFile: null };
    if (sessions) sessions.set(guild.id, s);
  }

  const buf = await ttsBuffer(text);
  const stream = Readable.from(buf);
  const resource = createAudioResource(stream, { inlineVolume: true });
  if (resource.volume) resource.volume.setVolume(1.3);
  s.player.play(resource);
  return true;
}

function buildAiPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle('AI Voice (VC)')
    .setDescription(
      'Bot **voice channel** me hai.\n' +
        '**AI Speak** dabao \u2192 sawal likho \u2192 jawab **VC me voice** se aayega (GROQ).\n' +
        '_Mic se direct sunna baad me; abhi text \u2192 AI \u2192 voice._'
    )
    .setFooter({ text: 'GROQ_API_KEY from Railway env' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('aiv:speak')
      .setLabel('AI Speak in VC')
      .setEmoji('🎙️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('aiv:help')
      .setLabel('Help')
      .setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}

async function sendAiPanel(channel) {
  if (!channel || !channel.isTextBased || !channel.isTextBased()) return;
  await channel.send(buildAiPanel());
}

function attach(client, row) {
  if (client.__aiVoiceAttached) return;
  client.__aiVoiceAttached = true;

  client.on('interactionCreate', async (i) => {
    try {
      if (i.isButton() && i.customId === 'aiv:help') {
        await i.reply({
          content:
            '1) `/music join` se bot VC me aaye\n' +
            '2) **AI Speak in VC** \u2192 sawal type karo\n' +
            '3) GROQ jawab \u2192 bot **voice** me bolega\n' +
            'Railway env: `GROQ_API_KEY` zaroori',
          flags: EPHEMERAL,
        });
        return;
      }
      if (i.isButton() && i.customId === 'aiv:speak') {
        const modal = new ModalBuilder()
          .setCustomId('aiv:modal')
          .setTitle('AI Voice \u2014 sawal poochho')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q')
                .setLabel('Kya poochna hai? (VC me jawab)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(400)
                .setPlaceholder('Example: Gravity kya hai? / Aaj motivaton do')
            )
          );
        await i.showModal(modal);
        return;
      }
      if (i.isModalSubmit() && i.customId === 'aiv:modal') {
        const q = i.fields.getTextInputValue('q') || '';
        await i.deferReply({ flags: EPHEMERAL });
        try {
          const answer = await groqReply(q);
          await speakInGuild(i.guild, answer);
          await i.editReply('VC me bol raha hai:\n> ' + answer.slice(0, 300));
        } catch (e) {
          await i.editReply('❌ ' + (e.message || e));
        }
      }
    } catch (e) {
      console.error('[ai-voice]', e.message || e);
    }
  });
}

module.exports = { attach, sendAiPanel, speakInGuild, buildAiPanel, groqReply };
