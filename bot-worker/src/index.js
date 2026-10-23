const http = require('http');
const { createBot } = require('./bot');
const { runHosted } = require('./hosted');

// Health check server so platforms (Back4App, Railway, etc.) mark the container as healthy
const PORT = process.env.PORT || 8080;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});
healthServer.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Hosted mode: run every bot users saved from the website.
  runHosted().catch(err => { console.error(err); process.exit(1); });
} else {
  // Single-bot mode (env-configured), same as before.
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!token || !clientId) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID (or set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for hosted mode).');
    process.exit(1);
  }
  const e = process.env;
  const bot = createBot({
    token, clientId, label: clientId,
    config: {
      modules: ['welcome', 'moderation', 'ban', 'supporter', 'invite'].concat(e.AI_API_KEY && e.AI_MODEL ? ['ai'] : []),
      guildId: e.DISCORD_GUILD_ID, welcomeChannelId: e.WELCOME_CHANNEL_ID, welcomeRoleId: e.WELCOME_ROLE_ID,
      modLogChannelId: e.MOD_LOG_CHANNEL_ID, aiChannelId: e.AI_CHANNEL_ID, supporterRoleId: e.SUPPORTER_ROLE_ID,
      ai: e.AI_API_KEY && e.AI_MODEL ? { apiKey: e.AI_API_KEY, model: e.AI_MODEL, baseUrl: e.AI_BASE_URL } : undefined,
    },
  });
  bot.start();
}
