/**
 * AI Voice in VC — GROQ reply + TTS
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

function pickText(j) {
  const c0 = j && j.choices && j.choices[0];
  if (!c0) return '';
  const m = c0.message || {};
  const parts = [m.content, m.reasoning, m.reasoning_content, c0.text];
  for (const p of parts) {
    if (typeof p === 'string' && p.trim()) return p.trim();
  }
  return '';
}

async function groqReply(userText) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY Railway pe set nahi hai');

  const models = [];
  const envM = (process.env.GROQ_MODEL || '').trim();
  const defaults = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
  ];
  if (envM && !/^openai\//i.test(envM)) models.push(envM);
  for (const d of defaults) if (!models.includes(d)) models.push(d);
  if (envM && !models.includes(envM)) models.push(envM);

  let lastErr = null;
  for (const model of models) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful Discord voice assistant. Answer in the same language as the user (Hindi or English). Keep answers short (1-3 sentences) for speaking aloud. No markdown.',
            },
            { role: 'user', content: String(userText).slice(0, 500) },
          ],
          max_tokens: 220,
          temperature: 0.7,
        }),
      });
      const raw = await r.text();
      let j = {};
      try {
        j = JSON.parse(raw);
      } catch {
        lastErr = new Error('GROQ bad JSON ' + r.status);
        continue;
      }
      if (!r.ok) {
        lastErr = new Error('GROQ HTTP ' + r.status + ' model=' + model + ' ' + raw.slice(0, 100));
        console.warn('[ai-voice]', lastErr.message);
        continue;
      }
      const out = pickText(j);
      if (out) {
        console.log('[ai-voice] groq ok model=' + model);
        return out;
      }
      lastErr = new Error('GROQ empty reply model=' + model);
      console.warn('[ai-voice]', lastErr.message);
    } catch (e) {
      lastErr = e;
      console.warn('[ai-voice] groq try', model, e.message || e);
    }
  }
  throw lastErr || new Error('GROQ empty reply');
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
        '**AI Speak** \u2192 sawal \u2192 jawab **VC me voice** (GROQ).'
    )
    .setFooter({ text: 'GROQ_API_KEY from Railway env' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('aiv:speak')
      .setLabel('AI Speak in VC')
      .setEmoji('🎙️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('aiv:help').setLabel('Help').setStyle(ButtonStyle.Secondary)
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
          content: '1) `/music join`\n2) **AI Speak in VC**\n3) Sawal type \u2192 bot VC me bolega',
          flags: EPHEMERAL,
        });
        return;
      }
      if (i.isButton() && i.customId === 'aiv:speak') {
        const modal = new ModalBuilder()
          .setCustomId('aiv:modal')
          .setTitle('AI Voice \u2014 sawal')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('q')
                .setLabel('Kya poochna hai? (VC me jawab)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(400)
                .setPlaceholder('Example: Gravity kya hai?')
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
          await i.editReply('\u274c ' + (e.message || e));
        }
      }
    } catch (e) {
      console.error('[ai-voice]', e.message || e);
    }
  });
}

module.exports = { attach, sendAiPanel, speakInGuild, buildAiPanel, groqReply };
