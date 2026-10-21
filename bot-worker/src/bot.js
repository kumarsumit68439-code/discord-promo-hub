const {
  Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ChannelType, OverwriteType,
} = require('discord.js');
const { renderWelcomeCard } = require('./welcome-card');

function fillTemplate(tpl, member) {
  return String(tpl)
    .replace(/\{user\}/g, String(member))
    .replace(/\{username\}/g, member.user ? member.user.username : 'member')
    .replace(/\{server\}/g, member.guild?.name || 'server')
    .replace(/\{count\}/g, String(member.guild?.memberCount || 0))
    .replace(/\{link\}/g, '');
}

function xpForLevel(level) {
  return 100 + level * 50;
}

function createBot({ token, clientId, config = {}, label = clientId, onXp, onVoiceState }) {
  const has = (m) => (config.modules || []).includes(m);
  const log = (...a) => console.log('[' + label + ']', ...a);
  const warn = (...a) => console.warn('[' + label + ']', ...a);

  const commands = [new SlashCommandBuilder().setName('ping').setDescription('Check bot latency')];

  if (has('support')) {
    commands.push(new SlashCommandBuilder().setName('help').setDescription('Support / FAQ help'));
  }
  if (has('ticket')) {
    commands.push(
      new SlashCommandBuilder().setName('ticket-panel').setDescription('Post Create Ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
      new SlashCommandBuilder().setName('close-ticket').setDescription('Close this ticket channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    );
  }
  if (has('levels')) {
    commands.push(
      new SlashCommandBuilder().setName('rank').setDescription('Show your level')
        .addUserOption((o) => o.setName('member').setDescription('Optional member')),
      new SlashCommandBuilder().setName('leaderboard').setDescription('Top 10 levels in this server'),
    );
  }
  if (has('memberadd')) {
    commands.push(
      new SlashCommandBuilder().setName('invite-link').setDescription('Create a server invite link'),
      new SlashCommandBuilder().setName('send-invite').setDescription('DM a member an invite link')
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
    );
  }
  if (has('moderation')) {
    commands.push(
      new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
        .addIntegerOption((o) => o.setName('minutes').setDescription('1-40320').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
      new SlashCommandBuilder().setName('untimeout').setDescription('Remove timeout')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
    );
  }
  if (has('ban')) {
    commands.push(
      new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
        .addStringOption((o) => o.setName('reason').setDescription('Reason').setMaxLength(400)),
      new SlashCommandBuilder().setName('unban').setDescription('Unban by user ID')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((o) => o.setName('user_id').setDescription('User ID').setRequired(true)),
    );
  }
  if (has('supporter')) {
    commands.push(new SlashCommandBuilder().setName('supporter').setDescription('Manage supporter role')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addSubcommand((s) => s.setName('grant').setDescription('Grant').addUserOption((o) => o.setName('member').setRequired(true)))
      .addSubcommand((s) => s.setName('revoke').setDescription('Revoke').addUserOption((o) => o.setName('member').setRequired(true))));
  }
  if (has('invite')) {
    commands.push(
      new SlashCommandBuilder().setName('invites').setDescription('Your tracked invite count'),
      new SlashCommandBuilder().setName('invite-leaderboard').setDescription('Invite top 10'),
    );
  }

  const commandJson = commands.map((c) => c.toJSON());
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
  if (has('welcome') || has('invite') || has('supporter') || has('levels') || has('memberadd')) intents.push(GatewayIntentBits.GuildMembers);
  if (has('invite') || has('memberadd')) intents.push(GatewayIntentBits.GuildInvites);
  if (has('ai') || has('support') || has('levels') || has('protect') || has('ticket')) {
    intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
  }

  const client = new Client({ intents, partials: [Partials.Channel] });
  const aiLastUse = new Map();
  const inviteUses = new Map();
  const inviteCounts = new Map();
  const levels = new Map(); // key guild:user -> { xp, level }
  const recentMsg = new Map(); // spam track userId -> timestamps
  let voiceConn = null;
  let voiceState = { desired: false, connected: false, channelId: null, channelName: null, muted: false, aiOn: false, until: null };
  let voiceTimer = null;
  let protectStats = { scanned: 0, flagged: 0, last_scan: null };

  const key = (g, u) => g + ':' + u;

  function levelKey(guildId, userId) {
    return guildId + ':' + userId;
  }

  function getLevel(guildId, userId) {
    const k = levelKey(guildId, userId);
    if (!levels.has(k)) levels.set(k, { xp: 0, level: 0 });
    return levels.get(k);
  }

  async function addXp(member, amount, reason) {
    if (!has('levels') || member.user.bot) return;
    const row = getLevel(member.guild.id, member.id);
    row.xp += amount;
    let leveled = false;
    while (row.xp >= xpForLevel(row.level)) {
      row.xp -= xpForLevel(row.level);
      row.level += 1;
      leveled = true;
    }
    if (onXp) {
      try { await onXp({ guildId: member.guild.id, userId: member.id, xp: row.xp, level: row.level, username: member.user.username }); } catch (_) {}
    }
    if (leveled && config.levelChannelId) {
      const ch = await member.guild.channels.fetch(config.levelChannelId).catch(() => null);
      if (ch?.isTextBased()) {
        await ch.send('🎉 ' + member + ' leveled up to **Level ' + row.level + '**!').catch(() => null);
      }
    }
  }

  function reportVoice() {
    if (onVoiceState) onVoiceState({ ...voiceState });
  }

  async function joinVoice(channelId, minutes) {
    try {
      const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildVoice) throw new Error('Voice channel not found');
      const existing = getVoiceConnection(channel.guild.id);
      if (existing) existing.destroy();
      voiceConn = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: voiceState.muted,
      });
      voiceState = {
        desired: true,
        connected: true,
        channelId: channel.id,
        channelName: channel.name,
        muted: voiceState.muted,
        aiOn: voiceState.aiOn,
        until: minutes && Number(minutes) > 0 ? new Date(Date.now() + Number(minutes) * 60_000).toISOString() : null,
      };
      if (voiceTimer) clearTimeout(voiceTimer);
      if (voiceState.until) {
        const ms = new Date(voiceState.until).getTime() - Date.now();
        voiceTimer = setTimeout(() => { leaveVoice().catch(() => null); }, Math.max(1000, ms));
      }
      reportVoice();
      return 'Joined voice: ' + channel.name + (voiceState.until ? ' (timer set)' : ' (24/7 AFK)');
    } catch (err) {
      voiceState.connected = false;
      reportVoice();
      throw err;
    }
  }

  async function leaveVoice() {
    try {
      const { getVoiceConnection } = require('@discordjs/voice');
      for (const g of client.guilds.cache.values()) {
        const c = getVoiceConnection(g.id);
        if (c) c.destroy();
      }
    } catch (_) {}
    voiceConn = null;
    if (voiceTimer) clearTimeout(voiceTimer);
    voiceTimer = null;
    voiceState = { desired: false, connected: false, channelId: null, channelName: null, muted: false, aiOn: voiceState.aiOn, until: null };
    reportVoice();
    return 'Left voice channel';
  }

  async function setMute(muted) {
    voiceState.muted = Boolean(muted);
    try {
      for (const g of client.guilds.cache.values()) {
        const me = g.members.me;
        if (me?.voice?.channel) await me.voice.setMute(voiceState.muted).catch(() => null);
      }
    } catch (_) {}
    reportVoice();
    return voiceState.muted ? 'Mic muted' : 'Mic unmuted';
  }

  async function refreshInvites(guild) {
    try {
      const invites = await guild.invites.fetch();
      inviteUses.set(guild.id, new Map(invites.map((i) => [i.code, i.uses ?? 0])));
    } catch (err) { warn('Could not fetch invites', err.message); }
  }

  async function logModeration(guild, text) {
    if (!config.modLogChannelId) return;
    const ch = await guild.channels.fetch(config.modLogChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ content: text }).catch(() => null);
  }

  function canActOn(interaction, member, permission) {
    return interaction.memberPermissions?.has(permission) &&
      member.id !== interaction.user.id &&
      member.id !== interaction.guild.ownerId &&
      member.roles.highest.comparePositionTo(interaction.guild.members.me.roles.highest) < 0;
  }

  async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(token);
    const route = config.guildId
      ? Routes.applicationGuildCommands(clientId, config.guildId)
      : Routes.applicationCommands(clientId);
    await rest.put(route, { body: commandJson });
  }

  async function postTicketPanel(channel) {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🎟️ Support Tickets')
      .setDescription('To create a ticket use the **Create ticket** button.\nStaff will help you in a private channel.');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ph_create_ticket').setLabel('Create ticket').setStyle(ButtonStyle.Primary).setEmoji('🎟️'),
    );
    await channel.send({ embeds: [embed], components: [row] });
  }

  async function sendWelcome(member, inviterId, test = false) {
    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel?.isTextBased()) throw new Error('Welcome channel not found or not a text channel.');
    const title = fillTemplate(config.welcomeTitle || 'Welcome to {server}!', member).slice(0, 256);
    const desc = fillTemplate(config.welcomeMessage || 'Welcome {user}! You are member **#{count}**.', member).slice(0, 4000);
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(title).setDescription(desc).setTimestamp();
    if (has('invite')) embed.addFields({ name: 'Invited by', value: inviterId ? '<@' + inviterId + '>' : 'Unknown', inline: true });
    if (test) embed.setFooter({ text: 'Test message from Discord Promo Hub' });
    const payload = { content: String(member), embeds: [embed] };
    const png = config.welcomeImage === false ? null : await renderWelcomeCard(member);
    if (png) {
      payload.files = [new AttachmentBuilder(png, { name: 'welcome.png' })];
      embed.setImage('attachment://welcome.png');
    } else embed.setThumbnail(member.user.displayAvatarURL());
    await channel.send(payload);
  }

  async function sendTestWelcome() {
    if (!has('welcome')) throw new Error('Welcome module is not on');
    if (!config.welcomeChannelId) throw new Error('Set welcome channel ID');
    const guild = (config.guildId && client.guilds.cache.get(config.guildId)) || client.guilds.cache.first();
    if (!guild) throw new Error('Bot is not in any server');
    const me = guild.members.me || await guild.members.fetchMe();
    await sendWelcome(me, null, true);
  }

  client.once('clientReady', async () => {
    log('online as ' + client.user.tag);
    if (has('invite') || has('memberadd')) for (const g of client.guilds.cache.values()) await refreshInvites(g);
    try { await registerCommands(); log('slash commands registered'); }
    catch (err) { warn('slash command registration failed:', err.message); }
    if (has('ticket') && config.ticketChannelId) {
      for (const g of client.guilds.cache.values()) {
        if (config.guildId && g.id !== config.guildId) continue;
        const ch = await g.channels.fetch(config.ticketChannelId).catch(() => null);
        if (ch?.isTextBased()) {
          // only auto-post if channel is nearly empty (avoid spam)
          const msgs = await ch.messages.fetch({ limit: 5 }).catch(() => null);
          const hasPanel = msgs?.some((m) => m.author.id === client.user.id && m.components?.length);
          if (!hasPanel) await postTicketPanel(ch).catch((e) => warn('ticket panel', e.message));
        }
      }
    }
    config.onReady?.();
  });
  // discord.js v14 still emits 'ready'
  client.once('ready', () => {});

  client.on('inviteCreate', (i) => {
    if (!inviteUses.has(i.guild.id)) inviteUses.set(i.guild.id, new Map());
    inviteUses.get(i.guild.id).set(i.code, i.uses ?? 0);
  });
  client.on('inviteDelete', (i) => inviteUses.get(i.guild.id)?.delete(i.code));

  client.on('guildMemberAdd', async (member) => {
    if (config.guildId && member.guild.id !== config.guildId) return;
    let inviterId = null;
    if (has('invite')) {
      const old = inviteUses.get(member.guild.id) || new Map();
      try {
        const current = await member.guild.invites.fetch();
        const used = current.find((i) => (i.uses ?? 0) > (old.get(i.code) ?? 0));
        if (used?.inviter) {
          inviterId = used.inviter.id;
          const k = key(member.guild.id, inviterId);
          inviteCounts.set(k, (inviteCounts.get(k) || 0) + 1);
        }
        inviteUses.set(member.guild.id, new Map(current.map((i) => [i.code, i.uses ?? 0])));
      } catch (err) { warn('invite tracking', err.message); }
    }
    if (has('welcome') && config.welcomeChannelId)
      await sendWelcome(member, inviterId).catch((err) => warn('welcome', err.message));
    if (has('welcome') && config.welcomeRoleId) {
      const role = await member.guild.roles.fetch(config.welcomeRoleId).catch(() => null);
      if (role && role.position < member.guild.members.me.roles.highest.position)
        await member.roles.add(role, 'Welcome auto role').catch((err) => warn('welcome role', err.message));
    }
    if (has('levels')) getLevel(member.guild.id, member.id); // start at 0
  });

  client.on('guildMemberRemove', async (member) => {
    if (!has('welcome') || !config.welcomeChannelId) return;
    if (config.guildId && member.guild.id !== config.guildId) return;
    const ch = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (ch?.isTextBased()) {
      const text = fillTemplate(config.goodbyeMessage || 'Goodbye **{username}**.', member).slice(0, 1900);
      await ch.send(text).catch(() => null);
    }
  });

  // Protection: soft scan on each message (rate-limit + spam)
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    if (config.guildId && message.guild.id !== config.guildId) return;

    if (has('protect')) {
      protectStats.scanned += 1;
      protectStats.last_scan = new Date().toISOString();
      const uid = message.author.id;
      const now = Date.now();
      const arr = (recentMsg.get(uid) || []).filter((t) => now - t < 7000);
      arr.push(now);
      recentMsg.set(uid, arr);
      const inviteSpam = /(discord\.gg|discord\.com\/invite)\//i.test(message.content) && !message.member?.permissions?.has(PermissionFlagsBits.ManageMessages);
      if (arr.length >= 6 || inviteSpam) {
        protectStats.flagged += 1;
        await message.delete().catch(() => null);
        if (message.member?.moderatable) await message.member.timeout(60_000, 'PromoHub protect: spam').catch(() => null);
        if (config.protectLogChannelId) {
          const logCh = await message.guild.channels.fetch(config.protectLogChannelId).catch(() => null);
          if (logCh?.isTextBased()) await logCh.send('🛡️ Protect: timed out <@' + uid + '> for spam/invite.').catch(() => null);
        }
      }
    }

    if (has('levels')) await addXp(message.member || await message.guild.members.fetch(message.author.id), 8, 'chat');

    // Support FAQ
    if (has('support') && config.supportChannelId && message.channelId === config.supportChannelId && config.supportFaq) {
      const q = message.content.toLowerCase();
      const lines = String(config.supportFaq).split('\n').filter(Boolean);
      const hit = lines.find((l) => {
        const [k] = l.split('|');
        return k && q.includes(k.trim().toLowerCase());
      });
      if (hit) {
        const ans = hit.split('|').slice(1).join('|').trim();
        if (ans) await message.reply(ans.slice(0, 1900)).catch(() => null);
      }
    }

    // AI chat
    const ai = config.ai;
    if (has('ai') && ai?.apiKey && ai?.model) {
      const inAiChannel = Boolean(config.aiChannelId) && message.channelId === config.aiChannelId;
      if (config.aiChannelId && !inAiChannel) return;
      if (!inAiChannel && !message.mentions.has(client.user) && !message.content.startsWith('!ai ')) return;
      const prompt = message.content.replace(/<@!?\d+>/g, '').replace(/^!ai\s*/i, '').trim();
      if (!prompt) return;
      const last = aiLastUse.get(message.author.id) || 0;
      if (Date.now() - last < 3000) return;
      aiLastUse.set(message.author.id, Date.now());
      await message.channel.sendTyping().catch(() => null);
      try {
        const base = (ai.baseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
        const response = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + ai.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: ai.model, messages: [{ role: 'user', content: prompt }], max_tokens: 500 }),
        });
        if (!response.ok) throw new Error('AI HTTP ' + response.status);
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content;
        await message.reply(answer ? String(answer).slice(0, 1900) : 'No AI response.');
      } catch (err) {
        warn('AI failed', err.message);
        await message.reply('AI temporarily unavailable.').catch(() => null);
      }
    }
  });

  // Ticket button
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'ph_create_ticket') {
      if (!has('ticket')) return interaction.reply({ content: 'Ticket module off', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const name = ('ticket-' + interaction.user.username).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
      const overwrites = [
        { id: guild.id, type: OverwriteType.Role, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: client.user.id, type: OverwriteType.Member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      ];
      if (config.ticketSupportRoleId) {
        overwrites.push({ id: config.ticketSupportRoleId, type: OverwriteType.Role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      }
      try {
        const ch = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: config.ticketCategoryId || undefined,
          permissionOverwrites: overwrites,
          topic: 'Ticket by ' + interaction.user.id,
        });
        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ph_close_ticket').setLabel('Close ticket').setStyle(ButtonStyle.Danger),
        );
        await ch.send({
          content: interaction.user.toString() + (config.ticketSupportRoleId ? ' <@&' + config.ticketSupportRoleId + '>' : ''),
          embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Ticket opened').setDescription('Staff will help you soon. Click **Close ticket** when done.')],
          components: [closeRow],
        });
        await interaction.editReply({ content: 'Ticket created: ' + ch.toString() });
      } catch (err) {
        await interaction.editReply({ content: 'Could not create ticket: ' + err.message });
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === 'ph_close_ticket') {
      await interaction.reply({ content: 'Closing ticket in 3s…' });
      setTimeout(() => interaction.channel?.delete('Ticket closed').catch(() => null), 3000);
      return;
    }

    if (!interaction.isChatInputCommand() || !interaction.guild) return;
    const { commandName, guild } = interaction;
    try {
      if (commandName === 'ping') return interaction.reply({ content: 'Pong! ' + client.ws.ping + 'ms', ephemeral: true });

      if (commandName === 'help') {
        const text = (config.supportMessage || 'Support is here. Use the ticket panel or ask staff.') +
          (config.supportFaq ? '\n\nFAQ keywords: ' + String(config.supportFaq).split('\n').map((l) => l.split('|')[0]).filter(Boolean).join(', ') : '');
        return interaction.reply({ content: text.slice(0, 1900), ephemeral: true });
      }

      if (commandName === 'ticket-panel') {
        const ch = config.ticketChannelId
          ? await guild.channels.fetch(config.ticketChannelId).catch(() => null)
          : interaction.channel;
        if (!ch?.isTextBased()) return interaction.reply({ content: 'Set ticket channel ID first', ephemeral: true });
        await postTicketPanel(ch);
        return interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
      }

      if (commandName === 'close-ticket') {
        if (!interaction.channel?.name?.startsWith('ticket-')) return interaction.reply({ content: 'Not a ticket channel', ephemeral: true });
        await interaction.reply('Closing…');
        setTimeout(() => interaction.channel.delete('Closed by command').catch(() => null), 2000);
        return;
      }

      if (commandName === 'rank') {
        const user = interaction.options.getUser('member') || interaction.user;
        const row = getLevel(guild.id, user.id);
        return interaction.reply({ content: '**' + user.username + '** — Level **' + row.level + '** · XP **' + row.xp + '/' + xpForLevel(row.level) + '**', ephemeral: true });
      }

      if (commandName === 'leaderboard') {
        const rows = [...levels.entries()]
          .filter(([k]) => k.startsWith(guild.id + ':'))
          .map(([k, v]) => ({ id: k.split(':')[1], ...v }))
          .sort((a, b) => b.level - a.level || b.xp - a.xp)
          .slice(0, 10);
        const text = rows.length
          ? rows.map((r, i) => (i + 1) + '. <@' + r.id + '> — Lvl ' + r.level + ' (' + r.xp + ' xp)').join('\n')
          : 'No levels yet. Chat to earn XP!';
        return interaction.reply({ content: '🏆 **Top 10**\n' + text });
      }

      if (commandName === 'invite-link') {
        const ch = config.memberAddChannelId
          ? await guild.channels.fetch(config.memberAddChannelId).catch(() => null)
          : interaction.channel;
        if (!ch) return interaction.reply({ content: 'Channel not found', ephemeral: true });
        const inv = await ch.createInvite({ maxAge: 0, maxUses: 0, reason: 'Member add bot' }).catch((e) => null);
        if (!inv) return interaction.reply({ content: 'Cannot create invite (need Create Invite permission)', ephemeral: true });
        return interaction.reply({ content: 'Invite: https://discord.gg/' + inv.code, ephemeral: true });
      }

      if (commandName === 'send-invite') {
        const target = interaction.options.getUser('member', true);
        const ch = config.memberAddChannelId
          ? await guild.channels.fetch(config.memberAddChannelId).catch(() => null)
          : interaction.channel;
        const inv = ch ? await ch.createInvite({ maxAge: 86400, maxUses: 5, reason: 'DM invite' }).catch(() => null) : null;
        if (!inv) return interaction.reply({ content: 'Could not create invite', ephemeral: true });
        const link = 'https://discord.gg/' + inv.code;
        const msg = String(config.inviteDmMessage || 'Join our server: {link}').replace(/\{link\}/g, link);
        try {
          await target.send(msg);
          return interaction.reply({ content: 'Invite DM sent to ' + target.tag, ephemeral: true });
        } catch {
          return interaction.reply({ content: 'Could not DM user (DMs closed). Link: ' + link, ephemeral: true });
        }
      }

      if (commandName === 'invites') {
        const n = inviteCounts.get(key(guild.id, interaction.user.id)) || 0;
        return interaction.reply({ content: 'Tracked joins: **' + n + '**', ephemeral: true });
      }
      if (commandName === 'invite-leaderboard') {
        const rows = [...inviteCounts.entries()].filter(([k]) => k.startsWith(guild.id + ':')).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return interaction.reply({ content: rows.length ? rows.map(([k, n], i) => (i + 1) + '. <@' + k.split(':')[1] + '> — ' + n).join('\n') : 'No data yet', ephemeral: true });
      }

      if (commandName === 'supporter') {
        if (!config.supporterRoleId) return interaction.reply({ content: 'Set supporter role ID', ephemeral: true });
        const targetUser = interaction.options.getUser('member', true);
        const target = await guild.members.fetch(targetUser.id).catch(() => null);
        const role = await guild.roles.fetch(config.supporterRoleId).catch(() => null);
        if (!target || !role) return interaction.reply({ content: 'Member/role not found', ephemeral: true });
        const action = interaction.options.getSubcommand();
        if (action === 'grant') await target.roles.add(role);
        else await target.roles.remove(role);
        return interaction.reply({ content: 'Done: ' + action, ephemeral: true });
      }

      if (['timeout', 'untimeout', 'ban'].includes(commandName)) {
        const user = interaction.options.getUser('member', true);
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'Member not in server', ephemeral: true });
        const permission = commandName === 'ban' ? PermissionFlagsBits.BanMembers : PermissionFlagsBits.ModerateMembers;
        if (!canActOn(interaction, member, permission)) return interaction.reply({ content: 'Missing permission / hierarchy', ephemeral: true });
        const reason = interaction.options.getString('reason') || 'No reason';
        if (commandName === 'timeout') {
          const minutes = interaction.options.getInteger('minutes', true);
          await member.timeout(minutes * 60_000, reason);
          await logModeration(guild, 'Timeout ' + user.tag + ' ' + minutes + 'm by ' + interaction.user.tag);
          return interaction.reply({ content: 'Timed out ' + user.tag, ephemeral: true });
        }
        if (commandName === 'untimeout') {
          await member.timeout(null, reason);
          return interaction.reply({ content: 'Timeout removed', ephemeral: true });
        }
        await member.ban({ reason });
        await logModeration(guild, 'Ban ' + user.tag + ' by ' + interaction.user.tag);
        return interaction.reply({ content: 'Banned ' + user.tag, ephemeral: true });
      }

      if (commandName === 'unban') {
        const userId = interaction.options.getString('user_id', true);
        await guild.members.unban(userId);
        return interaction.reply({ content: 'Unbanned ' + userId, ephemeral: true });
      }
    } catch (err) {
      warn('command failed', err.message);
      const r = { content: 'Command failed: ' + err.message, ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(r).catch(() => null);
      else await interaction.reply(r).catch(() => null);
    }
  });

  client.on('error', (err) => warn('client error', err.message));

  return {
    client,
    sendTestWelcome,
    joinVoice,
    leaveVoice,
    setMute,
    setAiVoice(on) { voiceState.aiOn = Boolean(on); reportVoice(); return voiceState.aiOn ? 'AI voice on (text assist in VC chat)' : 'AI voice off'; },
    setTimer(minutes) {
      if (voiceTimer) clearTimeout(voiceTimer);
      if (!minutes || Number(minutes) <= 0) {
        voiceState.until = null;
        reportVoice();
        return 'Timer cleared — 24/7 AFK';
      }
      voiceState.until = new Date(Date.now() + Number(minutes) * 60_000).toISOString();
      voiceTimer = setTimeout(() => { leaveVoice().catch(() => null); }, Number(minutes) * 60_000);
      reportVoice();
      return 'Timer set for ' + minutes + ' minutes';
    },
    getVoiceState: () => ({ ...voiceState }),
    getProtectStats: () => ({ ...protectStats }),
    start: () => client.login(token),
    stop: async () => {
      try { await leaveVoice(); } catch (_) {}
      try { await client.destroy(); } catch (_) {}
    },
  };
}

module.exports = { createBot };
