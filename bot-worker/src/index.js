const {
  Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder,
  PermissionFlagsBits, EmbedBuilder, ChannelType
} = require('discord.js');

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
if (!token || !clientId) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID. Set them as worker secrets.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot and worker latency'),
  new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes (1-40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('untimeout').setDescription('Remove a member timeout')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to untimeout').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('unban').setDescription('Unban by user ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('Discord user ID').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setMaxLength(400)),
  new SlashCommandBuilder().setName('supporter').setDescription('Manage the configured supporter role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('grant').setDescription('Grant supporter role').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)))
    .addSubcommand(s => s.setName('revoke').setDescription('Remove supporter role').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))),
  new SlashCommandBuilder().setName('invites').setDescription('Show invite counts for this server'),
  new SlashCommandBuilder().setName('invite-leaderboard').setDescription('Show tracked invite leaderboard'),
].map(c => c.toJSON());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildInvites],
  partials: [Partials.Channel]
});

// In-memory invite counts reset if the worker restarts. Use a database for durable counts.
const inviteUses = new Map();
const inviteCounts = new Map();
const key = (guildId, userId) => guildId + ':' + userId;

async function refreshInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteUses.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses ?? 0])));
  } catch (err) {
    console.warn('Could not fetch invites for guild', guild.id, err.message);
  }
}
async function logModeration(guild, text) {
  const id = process.env.MOD_LOG_CHANNEL_ID;
  if (!id) return;
  const channel = await guild.channels.fetch(id).catch(() => null);
  if (channel && channel.isTextBased()) await channel.send({ content: text }).catch(() => null);
}
function canActOn(interaction, member, permission) {
  return interaction.memberPermissions?.has(permission) &&
    member.id !== interaction.user.id &&
    member.id !== interaction.guild.ownerId &&
    member.roles.highest.comparePositionTo(interaction.guild.members.me.roles.highest) < 0;
}
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(clientId, process.env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(clientId);
  await rest.put(route, { body: commands });
}

client.once('ready', async () => {
  console.log('Discord worker online as ' + client.user.tag);
  for (const guild of client.guilds.cache.values()) await refreshInvites(guild);
  try { await registerCommands(); console.log('Slash commands registered'); }
  catch (err) { console.error('Slash command registration failed:', err.message); }
});

client.on('inviteCreate', inv => {
  if (!inviteUses.has(inv.guild.id)) inviteUses.set(inv.guild.id, new Map());
  inviteUses.get(inv.guild.id).set(inv.code, inv.uses ?? 0);
});
client.on('inviteDelete', inv => inviteUses.get(inv.guild.id)?.delete(inv.code));

client.on('guildMemberAdd', async member => {
  const old = inviteUses.get(member.guild.id) || new Map();
  let inviterId = null;
  try {
    const current = await member.guild.invites.fetch();
    const used = current.find(inv => (inv.uses ?? 0) > (old.get(inv.code) ?? 0));
    if (used?.inviter) {
      inviterId = used.inviter.id;
      const k = key(member.guild.id, inviterId);
      inviteCounts.set(k, (inviteCounts.get(k) || 0) + 1);
    }
    inviteUses.set(member.guild.id, new Map(current.map(inv => [inv.code, inv.uses ?? 0])));
  } catch (err) { console.warn('Invite tracking unavailable:', err.message); }

  const channelId = process.env.WELCOME_CHANNEL_ID;
  if (channelId) {
    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder().setColor(0x5865f2)
        .setTitle('Welcome to ' + member.guild.name + '!')
        .setDescription('Welcome ' + member + '! You are member **#' + member.guild.memberCount + '**.')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields({ name: 'Invited by', value: inviterId ? '<@' + inviterId + '>' : 'Unknown / vanity invite', inline: true })
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(err => console.warn('Welcome send failed:', err.message));
    }
  }
  if (process.env.WELCOME_ROLE_ID) {
    const role = await member.guild.roles.fetch(process.env.WELCOME_ROLE_ID).catch(() => null);
    if (role && role.position < member.guild.members.me.roles.highest.position) {
      await member.roles.add(role, 'Configured automatic welcome role').catch(err => console.warn('Welcome role failed:', err.message));
    }
  }
});
client.on('guildMemberRemove', async member => {
  const channelId = process.env.WELCOME_CHANNEL_ID;
  if (!channelId) return;
  const channel = await member.guild.channels.fetch(channelId).catch(() => null);
  if (channel?.isTextBased()) await channel.send('Goodbye **' + member.user.tag + '**.').catch(() => null);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !process.env.AI_API_KEY || !process.env.AI_MODEL) return;
  if (process.env.AI_CHANNEL_ID && message.channelId !== process.env.AI_CHANNEL_ID) return;
  if (!message.mentions.has(client.user) && !message.content.startsWith('!ai ')) return;
  const prompt = message.content.replace(/<@!?\d+>/g, '').replace(/^!ai\s*/i, '').trim();
  if (!prompt) return;
  await message.channel.sendTyping().catch(() => null);
  try {
    const base = (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const response = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.AI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.AI_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 500 })
    });
    if (!response.ok) throw new Error('AI provider HTTP ' + response.status);
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    if (answer) await message.reply(String(answer).slice(0, 1900));
    else await message.reply('AI provider returned no response.');
  } catch (err) {
    console.error('AI request failed:', err.message);
    await message.reply('AI is temporarily unavailable. Please try again later.').catch(() => null);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || !interaction.guild) return;
  const { commandName, guild } = interaction;
  try {
    if (commandName === 'ping') return interaction.reply({ content: 'Pong! Gateway latency: ' + client.ws.ping + 'ms', ephemeral: true });
    if (commandName === 'invites') {
      const count = inviteCounts.get(key(guild.id, interaction.user.id)) || 0;
      return interaction.reply({ content: 'Tracked joins attributed to your invites: **' + count + '**. Counts are currently in-memory and reset when the worker restarts.', ephemeral: true });
    }
    if (commandName === 'invite-leaderboard') {
      const rows = [...inviteCounts.entries()].filter(([k]) => k.startsWith(guild.id + ':')).sort((a,b) => b[1]-a[1]).slice(0,10);
      return interaction.reply({ content: rows.length ? rows.map(([k,n],i) => (i+1)+'. <@'+k.split(':')[1]+'> — '+n).join('\n') : 'No tracked invites yet.', ephemeral: true });
    }
    if (commandName === 'supporter') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: 'You need Manage Roles permission.', ephemeral: true });
      const roleId = process.env.SUPPORTER_ROLE_ID;
      if (!roleId) return interaction.reply({ content: 'Set SUPPORTER_ROLE_ID in worker secrets first.', ephemeral: true });
      const targetUser = interaction.options.getUser('member', true);
      const target = await guild.members.fetch(targetUser.id).catch(() => null);
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!target || !role || role.managed || role.position >= guild.members.me.roles.highest.position) return interaction.reply({ content: 'Target member or supporter role unavailable, or the bot role is too low.', ephemeral: true });
      const action = interaction.options.getSubcommand();
      if (action === 'grant') await target.roles.add(role, 'Supporter role granted by ' + interaction.user.tag);
      else await target.roles.remove(role, 'Supporter role revoked by ' + interaction.user.tag);
      await logModeration(guild, 'Supporter role ' + action + ': ' + target.user.tag + ' by ' + interaction.user.tag);
      return interaction.reply({ content: 'Supporter role ' + (action === 'grant' ? 'granted to ' : 'removed from ') + target.user.tag + '.', ephemeral: true });
    }
    if (commandName === 'timeout' || commandName === 'untimeout' || commandName === 'ban') {
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
        await logModeration(guild, 'Timeout removed: ' + user.tag + ' by ' + interaction.user.tag + '. Reason: ' + reason);
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
    console.error('Command failed:', err);
    const response = { content: 'Command failed. Check worker logs and bot permissions.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(response).catch(() => null);
    else await interaction.reply(response).catch(() => null);
  }
});

client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
client.login(token);
