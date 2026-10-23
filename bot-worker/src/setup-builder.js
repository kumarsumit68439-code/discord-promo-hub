/**
 * Server layout builder — creates categories, text channels, voice channels, roles.
 * Needs Administrator permission. Only Client ID + Token + optional Guild ID.
 * /setup-server  — MC GANG-style default template
 * /setup-ai      — Groq generates layout from a prompt, then creates it
 * /setup-roles   — standard roles + basic hierarchy
 */
const { ChannelType, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Current Groq production chat models (Oct 2026). Avoid deprecated ids (gemma2, mixtral, etc.)
// Llama 3.x may return 400 on free Developer plan if marked Enterprise — try gpt-oss first.
const GROQ_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'qwen/qwen3.8-27b',
];

/** Default template matching common gaming community layout (like MC GANG screenshots). */
const DEFAULT_LAYOUT = {
  categories: [
    {
      name: '📊｜SERVER STATS｜📊',
      channels: [{ name: '🍪｜members', type: 'text' }],
    },
    {
      name: '🍀｜SERVER INFO｜🍀',
      channels: [],
    },
    {
      name: '💬｜CHAT｜💬',
      channels: [
        { name: '📌｜announcements', type: 'text' },
        { name: '📊｜welcome', type: 'text' },
        { name: '🆙｜level-up', type: 'text' },
        { name: '📕｜news', type: 'text' },
        { name: '🎉｜giveaway', type: 'text' },
        { name: '💬｜main-chat', type: 'text' },
        { name: '📷｜off-topic', type: 'text' },
        { name: '🤖｜bot-commands', type: 'text' },
        { name: '💡｜suggestions', type: 'text' },
        { name: 'partnership', type: 'text' },
      ],
    },
    {
      name: '📞｜VOICE｜📞',
      channels: [
        { name: '📡｜Game Lobby-VC', type: 'voice' },
        { name: '🔊｜Public-VC', type: 'voice' },
        { name: '🔊｜Game-VC', type: 'voice' },
        { name: '🔊｜Game-VC#2', type: 'voice' },
        { name: '🔊｜Game-VC#3', type: 'voice' },
        { name: '🔊｜AFK', type: 'voice' },
      ],
    },
  ],
};

const DEFAULT_ROLES = [
  { name: 'Owner', color: 0xe74c3c, hoist: true },
  { name: 'Admin', color: 0xe67e22, hoist: true },
  { name: 'Moderator', color: 0xf1c40f, hoist: true },
  { name: 'VIP', color: 0x9b59b6, hoist: true },
  { name: 'Member', color: 0x3498db, hoist: false },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function applyLayout(guild, layout) {
  const made = { categories: 0, text: 0, voice: 0, errors: [] };
  const top = layout.topChannels || [];
  for (const ch of top) {
    try {
      const type = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
      const opts = { name: String(ch.name).slice(0, 100), type };
      if (type === ChannelType.GuildVoice && ch.userLimit) opts.userLimit = Math.min(99, Number(ch.userLimit) || 0);
      await guild.channels.create(opts);
      if (type === ChannelType.GuildVoice) made.voice++;
      else made.text++;
      await sleep(300);
    } catch (e) {
      made.errors.push(String(ch.name) + ': ' + e.message);
    }
  }
  for (const cat of layout.categories || []) {
    let parent = null;
    try {
      parent = await guild.channels.create({
        name: String(cat.name).slice(0, 100),
        type: ChannelType.GuildCategory,
      });
      made.categories++;
      await sleep(300);
    } catch (e) {
      made.errors.push('cat ' + cat.name + ': ' + e.message);
      continue;
    }
    for (const ch of cat.channels || []) {
      try {
        const type = ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const opts = { name: String(ch.name).slice(0, 100), type, parent: parent.id };
        if (type === ChannelType.GuildVoice && ch.userLimit) opts.userLimit = Math.min(99, Number(ch.userLimit) || 0);
        await guild.channels.create(opts);
        if (type === ChannelType.GuildVoice) made.voice++;
        else made.text++;
        await sleep(300);
      } catch (e) {
        made.errors.push(String(ch.name) + ': ' + e.message);
      }
    }
  }
  return made;
}

async function applyRoles(guild, roles) {
  const made = [];
  const errors = [];
  for (const r of roles || DEFAULT_ROLES) {
    try {
      const role = await guild.roles.create({
        name: String(r.name).slice(0, 100),
        color: r.color || 0x99aab5,
        hoist: Boolean(r.hoist),
        reason: 'Server setup bot',
      });
      made.push(role.name);
      await sleep(300);
    } catch (e) {
      errors.push(r.name + ': ' + e.message);
    }
  }
  return { made, errors };
}

async function resolveGroqKey(row) {
  // 1) Worker env (global fallback for all bots on this process)
  const envKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';
  if (envKey) return { key: envKey, model: process.env.GROQ_MODEL || null };

  // 2) Per-user key saved on website (Bot hosting → AI provider settings)
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !row?.user_id) {
    throw new Error(
      'GROQ_API_KEY not set on worker. Fix: Railway Variables me GROQ_API_KEY=gsk_... add karo, OR website /hosting pe Groq API key save karo (AI provider settings).'
    );
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const provider = row.config?.aiProvider || 'groq';
    const { data } = await db.rpc('get_bot_provider_secret', { p_user_id: row.user_id, p_provider: provider });
    if (data?.api_key) return { key: data.api_key, model: data.model || null };
  } catch (e) {
    console.error('resolveGroqKey', e.message);
  }
  throw new Error(
    'GROQ_API_KEY not set on worker. Fix: Railway Variables me GROQ_API_KEY=gsk_... add karo, OR website /hosting pe Groq API key save karo (AI provider settings).'
  );
}

async function groqLayout(prompt, row) {
  const { key, model: preferredModel } = await resolveGroqKey(row);

  const system = `You design Discord server channel layouts. Reply ONLY valid JSON (no markdown):
{"topChannels":[{"name":"channel-name","type":"text"|"voice","userLimit":optional}],"categories":[{"name":"CATEGORY","channels":[{"name":"...","type":"text"|"voice","userLimit":optional}]}]}
Rules: max 6 categories, max 12 channels per category, names under 100 chars, realistic gaming/community servers.`;

  let lastErr = '';
  const skipPreferred =
    preferredModel &&
    /whisper|tts|orpheus|guard|safeguard|prompt-guard/i.test(preferredModel);
  const models = preferredModel && !skipPreferred
    ? [preferredModel, ...GROQ_MODELS.filter((m) => m !== preferredModel)]
    : GROQ_MODELS;
  for (const model of models) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: String(prompt).slice(0, 1500) },
          ],
        }),
      });
      if (!res.ok) {
        let detail = '';
        try {
          const errBody = await res.json();
          detail = errBody?.error?.message || errBody?.message || JSON.stringify(errBody).slice(0, 120);
        } catch (_) {
          detail = (await res.text().catch(() => '')).slice(0, 120);
        }
        lastErr = model + ' → HTTP ' + res.status + (detail ? ': ' + detail : '');
        continue;
      }
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content || '';
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(text);
      if (!parsed.categories && !parsed.topChannels) throw new Error('bad shape');
      return parsed;
    } catch (e) {
      lastErr = (model || '') + ': ' + (e.message || String(e));
    }
  }
  throw new Error(
    'AI layout failed: ' +
      lastErr +
      ' — Free plan pe openai/gpt-oss-20b try hota hai. Website AI settings me chat model set karo, ya Railway GROQ_MODEL=openai/gpt-oss-20b.'
  );
}

function resolveGuild(client, config, interaction) {
  const gid = (config && config.guildId) || interaction.guildId;
  if (!gid) return null;
  return client.guilds.cache.get(gid) || null;
}

function attach(client, row) {
  const modules = row.modules || [];
  const hasBuilder = modules.includes('channelbuilder');
  const hasSetup = modules.includes('serversetup');
  if (!hasBuilder && !hasSetup) return;

  const config = row.config || {};

  client.once('ready', async () => {
    try {
      const cmds = [];
      if (hasSetup || hasBuilder) {
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-server')
            .setDescription('Create a default gaming/community server layout')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-ai')
            .setDescription('AI generates a channel layout from your prompt')
            .addStringOption((o) =>
              o.setName('prompt').setDescription('Describe the server (e.g. Minecraft SMP)').setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-roles')
            .setDescription('Create standard roles (Owner, Admin, Mod, VIP, Member)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
      }
      if (!cmds.length) return;
      await client.application.commands.set(cmds);
      console.log('[' + (row.client_id || 'bot') + '] setup commands registered');
    } catch (e) {
      console.error('[' + (row.client_id || 'bot') + '] setup register', e.message);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    if (!['setup-server', 'setup-ai', 'setup-roles'].includes(name)) return;

    try {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
        return;
      }
      const guild = resolveGuild(client, config, interaction) || interaction.guild;
      if (!guild) {
        await interaction.reply({ content: 'Guild not found. Set Guild ID on the website or run in a server.', ephemeral: true });
        return;
      }

      if (name === 'setup-server') {
        await interaction.deferReply({ ephemeral: true });
        const c = await applyLayout(guild, DEFAULT_LAYOUT);
        let msg =
          'Layout applied. Categories: ' +
          c.categories +
          ', text: ' +
          c.text +
          ', voice: ' +
          c.voice +
          '.';
        if (c.errors.length) msg += '\nSome errors: ' + c.errors.slice(0, 5).join('; ');
        await interaction.editReply(msg);
        return;
      }

      if (name === 'setup-roles') {
        await interaction.deferReply({ ephemeral: true });
        const c = await applyRoles(guild, DEFAULT_ROLES);
        let msg = 'Roles created: ' + (c.made.join(', ') || 'none');
        if (c.errors.length) msg += '\nSome errors: ' + c.errors.slice(0, 5).join('; ');
        await interaction.editReply(msg);
        return;
      }

      if (name === 'setup-ai') {
        const prompt = interaction.options.getString('prompt', true);
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('Generating layout with AI…');
        const layout = await groqLayout(prompt, row);
        const c = await applyLayout(guild, layout);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('AI server layout applied')
          .setDescription(
            'Categories: **' +
              c.categories +
              '** · Text: **' +
              c.text +
              '** · Voice: **' +
              c.voice +
              '**'
          )
          .setFooter({ text: 'Prompt: ' + prompt.slice(0, 80) });
        if (c.errors.length) embed.addFields({ name: 'Errors', value: c.errors.slice(0, 8).join('\n').slice(0, 1000) });
        await interaction.editReply({ content: null, embeds: [embed] });
      }
    } catch (e) {
      const text = 'Failed: ' + (e.message || String(e)).slice(0, 400);
      if (interaction.deferred || interaction.replied) await interaction.editReply(text).catch(() => null);
      else await interaction.reply({ content: text, ephemeral: true }).catch(() => null);
    }
  });
}

module.exports = { attach, DEFAULT_LAYOUT, applyLayout, applyRoles };
