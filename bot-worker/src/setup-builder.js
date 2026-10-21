/**
 * Server layout builder — creates categories, text channels, voice channels, roles.
 * Needs Administrator permission. Only Client ID + Token + optional Guild ID.
 * /setup-server  — MC GANG-style default template
 * /setup-ai      — Groq generates layout from a prompt, then creates it
 * /setup-roles   — standard roles + basic hierarchy
 */
const { ChannelType, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
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
        { name: '🎮｜Duo Game-VC', type: 'voice', userLimit: 2 },
        { name: '🎮｜Duo Game-VC #2', type: 'voice', userLimit: 2 },
        { name: '🎮｜Squad Game-VC', type: 'voice', userLimit: 4 },
        { name: '🎮｜Squad Game-VC #2', type: 'voice', userLimit: 4 },
        { name: '🚫｜AFK', type: 'voice', userLimit: 99 },
      ],
    },
    {
      name: '🎵｜MUSIC｜🎵',
      channels: [
        { name: '🎵｜music', type: 'text' },
        { name: '🎶｜Music #1', type: 'voice' },
        { name: '🎶｜Music #2', type: 'voice' },
      ],
    },
  ],
  topChannels: [{ name: 'get-roles', type: 'text' }],
};

const DEFAULT_ROLES = [
  { name: 'Owner', color: 0xe74c3c, hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  { name: 'Admin', color: 0xe67e22, hoist: true, permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers] },
  { name: 'Moderator', color: 0x9b59b6, hoist: true, permissions: [PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageMessages] },
  { name: 'VIP', color: 0xf1c40f, hoist: true, permissions: [] },
  { name: 'Member', color: 0x3498db, hoist: false, permissions: [] },
  { name: 'Bot', color: 0x2ecc71, hoist: false, permissions: [] },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createChannel(guild, parent, ch) {
  const opts = {
    name: ch.name.slice(0, 100),
    type: ch.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
    parent: parent || undefined,
  };
  if (ch.type === 'voice' && ch.userLimit) opts.userLimit = Math.min(99, Number(ch.userLimit) || 0);
  if (ch.topic) opts.topic = String(ch.topic).slice(0, 1024);
  return guild.channels.create(opts);
}

async function applyLayout(guild, layout) {
  const created = { categories: 0, text: 0, voice: 0, errors: [] };

  for (const ch of layout.topChannels || []) {
    try {
      await createChannel(guild, null, ch);
      if (ch.type === 'voice') created.voice++;
      else created.text++;
      await sleep(350);
    } catch (e) {
      created.errors.push(ch.name + ': ' + e.message);
    }
  }

  for (const cat of layout.categories || []) {
    let parent = null;
    try {
      parent = await guild.channels.create({
        name: String(cat.name).slice(0, 100),
        type: ChannelType.GuildCategory,
      });
      created.categories++;
      await sleep(350);
    } catch (e) {
      created.errors.push(cat.name + ': ' + e.message);
      continue;
    }
    for (const ch of cat.channels || []) {
      try {
        await createChannel(guild, parent.id, ch);
        if (ch.type === 'voice') created.voice++;
        else created.text++;
        await sleep(350);
      } catch (e) {
        created.errors.push(ch.name + ': ' + e.message);
      }
    }
  }
  return created;
}

async function applyRoles(guild) {
  const made = [];
  const errors = [];
  for (const r of DEFAULT_ROLES) {
    const exists = guild.roles.cache.find((x) => x.name.toLowerCase() === r.name.toLowerCase());
    if (exists) {
      made.push(exists.name + ' (exists)');
      continue;
    }
    try {
      const role = await guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        permissions: r.permissions,
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

async function groqLayout(prompt) {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';
  if (!key) throw new Error('GROQ_API_KEY not set on worker');

  const system = `You design Discord server channel layouts. Reply ONLY valid JSON (no markdown):
{"topChannels":[{"name":"channel-name","type":"text"|"voice","userLimit":optional}],"categories":[{"name":"CATEGORY","channels":[{"name":"...","type":"text"|"voice","userLimit":optional}]}]}
Rules: max 6 categories, max 12 channels per category, names under 100 chars, realistic gaming/community servers.`;

  let lastErr = '';
  for (const model of GROQ_MODELS) {
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
        lastErr = 'HTTP ' + res.status;
        continue;
      }
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content || '';
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(text);
      if (!parsed.categories && !parsed.topChannels) throw new Error('bad shape');
      return parsed;
    } catch (e) {
      lastErr = e.message;
    }
  }
  throw new Error('AI layout failed: ' + lastErr);
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
      if (hasBuilder) {
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-server')
            .setDescription('Create a full channel + VC layout (default gaming template)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-ai')
            .setDescription('AI generates channel/VC layout from your prompt, then creates it')
            .addStringOption((o) =>
              o.setName('prompt').setDescription('Describe the server (e.g. Minecraft clan with music VCs)').setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
      }
      if (hasSetup) {
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-roles')
            .setDescription('Create standard roles (Owner, Admin, Mod, VIP, Member, Bot)')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
        cmds.push(
          new SlashCommandBuilder()
            .setName('setup-full')
            .setDescription('Roles + default channel/VC layout in one go')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .toJSON()
        );
      }
      if (!cmds.length) return;
      // Register per-guild for faster availability
      for (const g of client.guilds.cache.values()) {
        if (config.guildId && g.id !== config.guildId) continue;
        await g.commands.set(cmds).catch((e) => console.error('[setup] cmd register', g.id, e.message));
      }
      console.log('[' + (row.client_id || 'bot') + '] setup commands registered');
    } catch (e) {
      console.error('[setup] ready', e.message);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    if (!['setup-server', 'setup-ai', 'setup-roles', 'setup-full'].includes(name)) return;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Administrator permission required.', ephemeral: true });
      return;
    }

    const guild = resolveGuild(client, config, interaction) || interaction.guild;
    if (!guild) {
      await interaction.reply({ content: 'Guild not found. Invite the bot and set Server ID if needed.', ephemeral: true });
      return;
    }

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.Administrator) && !me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'Bot needs **Administrator** (or Manage Channels + Manage Roles) and its role must be high enough.',
        ephemeral: true,
      });
      return;
    }

    try {
      if (name === 'setup-roles') {
        await interaction.deferReply({ ephemeral: true });
        const r = await applyRoles(guild);
        await interaction.editReply(
          'Roles: ' + (r.made.join(', ') || 'none') + (r.errors.length ? '\nErrors: ' + r.errors.join('; ') : '')
        );
        return;
      }

      if (name === 'setup-server' || name === 'setup-full') {
        await interaction.deferReply({ ephemeral: true });
        let msg = '';
        if (name === 'setup-full') {
          const r = await applyRoles(guild);
          msg += 'Roles: ' + (r.made.join(', ') || 'none') + '\n';
        }
        const c = await applyLayout(guild, DEFAULT_LAYOUT);
        msg +=
          'Created **' +
          c.categories +
          '** categories, **' +
          c.text +
          '** text, **' +
          c.voice +
          '** voice channels.';
        if (c.errors.length) msg += '\nSome errors: ' + c.errors.slice(0, 5).join('; ');
        await interaction.editReply(msg);
        return;
      }

      if (name === 'setup-ai') {
        const prompt = interaction.options.getString('prompt', true);
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('Generating layout with AI…');
        const layout = await groqLayout(prompt);
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
