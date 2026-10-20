const {
  Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, EmbedBuilder, AttachmentBuilder
} = require('discord.js');
const { renderWelcomeCard } = require('./welcome-card');

// One factory = one Discord bot. Used for both the single env-configured bot and for
// every bot hosted from the website (multi-tenant mode).
function createBot({ token, clientId, config = {}, label = clientId }) {
  const has = (m) => config.modules.includes(m);
  const log = (...a) => console.log('[' + label + ']', ...a);
  const warn = (...a) => console.warn('[' + label + ']', ...a);

  const commands = [new SlashCommandBuilder().setName('ping').setDescription('Check bot latency')];
  if (has('moderation')) {
    commands.push(
      new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to timeout').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes (1-40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
      new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member timeout')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to untimeout').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
    );
  }
  if (has('ban')) {
    commands.push(
      new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
      new SlashCommandBuilder().setName('unban').setDescription('Unban by user ID')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o.setName('user_id').setDescription('Discord user ID').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
    );
  }
  if (has('supporter')) {
    commands.push(new SlashCommandBuilder().setName('supporter').setDescription('Manage the configured supporter role')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addSubcommand(s => s.setName('grant').setDescription('Grant supporter role').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)))
      .addSubcommand(s => s.setName('revoke').setDescription('Remove supporter role').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))));
  }
  if (has('invite')) {
    commands.push(
      new SlashCommandBuilder().setName('invites').setDescription('Show your tracked invite count'),
      new SlashCommandBuilder().setName('invite-leaderboard').setDescription('Show tracked invite leaderboard'),
    );
  }
  const commandJson = commands.map(c => c.toJSON());

  // Only request privileged intents for modules that need them (they must also be enabled in the Developer Portal).
  const intents = [GatewayIntentBits.Guilds];
  if (has('welcome') || has('invite') || has('supporter')) intents.push(GatewayIntentBits.GuildMembers);
  if (has('invite')) intents.push(GatewayIntentBits.GuildInvites);
  if (has('ai') && config.ai?.apiKey) intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
  const client = new Client({ intents, partials: [Partials.Channel] });

  const inviteUses = new Map();
  const inviteCounts = new Map(); // in-memory; resets on restart
  const key = (g, u) => g + ':' + u;

  async function refreshInvites(guild) {
    try {
      const invites = await guild.invites.fetch();
      inviteUses.set(guild.id, new Map(invites.map(i => [i.code, i.uses ?? 0])));
    } catch (err) { warn('Could not fetch invites for', guild.id, err.message); }
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
    const route = config.guildId ? Routes.applicationGuildCommands(clientId, config.guildId) : Routes.applicationCommands(clientId);
    await rest.put(route, { body: commandJson });
  }

  client.once('ready', async () => {
    log('online as ' + client.user.tag);
    if (has('invite')) for (const g of client.guilds.cache.values()) await refreshInvites(g);
    try { await registerCommands(); log('slash commands registered'); }
    catch (err) { warn('slash command registration failed:', err.message); }
    config.onReady?.();
  });

  client.on('inviteCreate', i => { if (!inviteUses.has(i.guild.id)) inviteUses.set(i.guild.id, new Map()); inviteUses.get(i.guild.id).set(i.code, i.uses ?? 0); });
  client.on('inviteDelete', i => inviteUses.get(i.guild.id)?.delete(i.code));

  client.on('guildMemberAdd', async member => {
    if (config.guildId && member.guild.id !== config.guildId) return;
    let inviterId = null;
    if (has('invite')) {
      const old = inviteUses.get(member.guild.id) || new Map();
      try {
        const current = await member.guild.invites.fetch();
        const used = current.find(i => (i.uses ?? 0) > (old.get(i.code) ?? 0));
        if (used?.inviter) { inviterId = used.inviter.id; const k = key(member.guild.id, inviterId); inviteCounts.set(k, (inviteCounts.get(k) || 0) + 1); }
        inviteUses.set(member.guild.id, new Map(current.map(i => [i.code, i.uses ?? 0])));
      } catch (err) { warn('invite tracking unavailable:', err.message); }
    }
    if (has('welcome') && config.welcomeChannelId) {
      const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        const embed = new EmbedBuilder().setColor(0x5865f2)
          .setTitle('Welcome to ' + member.guild.name + '!')
          .setDescription('Welcome ' + member + '! You are member **#' + member.guild.memberCount + '**.')
          .setTimestamp();
        if (has('invite')) embed.addFields({ name: 'Invited by', value: inviterId ? '<@' + inviterId + '>' : 'Unknown / vanity invite', inline: true });
        const payload = { content: '' + member, embeds: [embed] };
        const png = config.welcomeImage === false ? null : await renderWelcomeCard(member);
        if (png) { payload.files = [new AttachmentBuilder(png, { name: 'welcome.png' })]; embed.setImage('attachment://welcome.png'); }
        else embed.setThumbnail(member.user.displayAvatarURL());
        await channel.send(payload).catch(err => warn('welcome send failed:', err.message));
      }
    }
    if (has('welcome') && config.welcomeRoleId) {
      const role = await member.guild.roles.fetch(config.welcomeRoleId).catch(() => null);
      if (role && role.position < member.guild.members.me.roles.highest.position)
        await member.roles.add(role, 'Configured automatic welcome role').catch(err => warn('welcome role failed:', err.message));
    }
  });
  client.on('guildMemberRemove', async member => {
    if (!has('welcome') || !config.welcomeChannelId) return;
    if (config.guildId && member.guild.id !== config.guildId) return;
    const ch = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send('Goodbye **' + member.user.tag + '**.').catch(() => null);
  });

  client.on('messageCreate', async message => {
    const ai = config.ai;
    if (!has('ai') || !ai?.apiKey || !ai?.model || message.author.bot || !message.guild) return;
    if (config.guildId && message.guild.id !== config.guildId) return;
    if (config.aiChannelId && message.channelId !== config.aiChannelId) return;
    if (!message.mentions.has(client.user) && !message.content.startsWith('!ai ')) return;
    const prompt = message.content.replace(/<@!?\d+>/g, '').replace(/^!ai\s*/i, '').trim();
    if (!prompt) return;
    await message.channel.sendTyping().catch(() => null);
    try {
      const base = (ai.baseUrl || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
      const response = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + ai.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ai.model, messages: [{ role: 'user', content: prompt }], max_tokens: 500 })
      });
      if (!response.ok) throw new Error('AI provider HTTP ' + response.status);
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;
      await message.reply(answer ? String(answer).slice(0, 1900) : 'AI provider returned no response.');
    } catch (err) {
      warn('AI request failed:', err.message);
      await message.reply('AI is temporarily unavailable. Please try again later.').catch(() => null);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || !interaction.guild) return;
    const { commandName, guild } = interaction;
    try {
      if (commandName === 'ping') return interaction.reply({ content: 'Pong! Gateway latency: ' + client.ws.ping + 'ms', ephemeral: true });
      if (commandName === 'invites') {
        const n = inviteCounts.get(key(guild.id, interaction.user.id)) || 0;
        return interaction.reply({ content: 'Tracked joins from your invites: **' + n + '** (resets when the worker restarts).', ephemeral: true });
      }
      if (commandName === 'invite-leaderboard') {
        const rows = [...inviteCounts.entries()].filter(([k]) => k.startsWith(guild.id + ':')).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return interaction.reply({ content: rows.length ? rows.map(([k, n], i) => (i + 1) + '. <@' + k.split(':')[1] + '> — ' + n).join('\n') : 'No tracked invites yet.', ephemeral: true });
      }
      if (commandName === 'supporter') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: 'You need Manage Roles permission.', ephemeral: true });
        if (!config.supporterRoleId) return interaction.reply({ content: 'Set the Supporter Role ID in the hosting dashboard first.', ephemeral: true });
        const targetUser = interaction.options.getUser('member', true);
        const target = await guild.members.fetch(targetUser.id).catch(() => null);
        const role = await guild.roles.fetch(config.supporterRoleId).catch(() => null);
        if (!target || !role || role.managed || role.position >= guild.members.me.roles.highest.position)
          return interaction.reply({ content: 'Target member or supporter role unavailable, or the bot role is too low.', ephemeral: true });
        const action = interaction.options.getSubcommand();
        if (action === 'grant') await target.roles.add(role, 'Supporter granted by ' + interaction.user.tag);
        else await target.roles.remove(role, 'Supporter revoked by ' + interaction.user.tag);
        await logModeration(guild, 'Supporter role ' + action + ': ' + target.user.tag + ' by ' + interaction.user.tag);
        return interaction.reply({ content: 'Supporter role ' + (action === 'grant' ? 'granted to ' : 'removed from ') + target.user.tag + '.', ephemeral: true });
      }
      if (['timeout', 'untimeout', 'ban'].includes(commandName)) {
        const user = interaction.options.getUser('member', true);
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
        const permission = commandName === 'ban' ? PermissionFlagsBits.BanMembers : PermissionFlagsBits.ModerateMembers;
        if (!canActOn(interaction, member, permission)) return interaction.reply({ content: 'Missing permission or Discord role hierarchy prevents this action.', ephemeral: true });
        const reason = interaction.options.getString('reason') || 'No reason provided';
        if (commandName === 'timeout') {
          const minutes = interaction.options.getInteger('minutes', true);
          await member.timeout(minutes * 60 * 1000, reason);
          await logModeration(guild, 'Timeout: ' + user.tag + ' for ' + minutes + 'm by ' + interaction.user.tag + '. Reason: ' + reason);
          return interaction.reply({ content: 'Timed out ' + user.tag + ' for ' + minutes + ' minute(s).', ephemeral: true });
        }
        if (commandName === 'untimeout') {
          await member.timeout(null, reason);
          await logModeration(guild, 'Timeout removed: ' + user.tag + ' by ' + interaction.user.tag);
          return interaction.reply({ content: 'Timeout removed for ' + user.tag + '.', ephemeral: true });
        }
        await member.ban({ reason });
        await logModeration(guild, 'Ban: ' + user.tag + ' by ' + interaction.user.tag + '. Reason: ' + reason);
        return interaction.reply({ content: 'Banned ' + user.tag + '.', ephemeral: true });
      }
      if (commandName === 'unban') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: 'You need Ban Members permission.', ephemeral: true });
        const userId = interaction.options.getString('user_id', true);
        if (!/^\d{15,22}$/.test(userId)) return interaction.reply({ content: 'Enter a valid Discord user ID.', ephemeral: true });
        await guild.members.unban(userId, interaction.options.getString('reason') || 'No reason provided');
        await logModeration(guild, 'Unban: ' + userId + ' by ' + interaction.user.tag);
        return interaction.reply({ content: 'Unbanned user ID ' + userId + '.', ephemeral: true });
      }
    } catch (err) {
      warn('command failed:', err.message);
      const r = { content: 'Command failed. Check bot permissions and role hierarchy.', ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.followUp(r).catch(() => null);
      else await interaction.reply(r).catch(() => null);
    }
  });

  client.on('error', err => warn('client error:', err.message));

  return {
    client,
    start: () => client.login(token),
    stop: async () => { try { await client.destroy(); } catch (_) { /* ignore */ } },
  };
}

module.exports = { createBot };
