const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // Node 20 has no native WebSocket; supabase-js realtime needs a transport (ws ships with discord.js)
const { createBot } = require('./bot');

// Multi-tenant runner: reads bots saved from the website (tokens from Supabase Vault),
// runs one Discord client per bot and reports status/heartbeat/errors back to Supabase,
// so the website always shows the real state (online / error / offline).
const AI_BASE = { groq: 'https://api.groq.com/openai/v1', xai: 'https://api.x.ai/v1' };
const SYNC_MS = 30_000;
const HEARTBEAT_MS = 60_000;
const RETRY_AFTER_FAIL_MS = 120_000; // do not hammer Discord login (daily identify limit) after a failed login

// Turn raw Discord/discord.js errors into something a bot owner can act on.
function friendlyError(raw) {
  const m = String(raw || '');
  if (/disallowed intents/i.test(m)) return 'Privileged intents are off. Discord Developer Portal > Bot: turn ON Server Members Intent (and Message Content Intent for AI chat), then Save.';
  if (/invalid token|TokenInvalid/i.test(m)) return 'Invalid bot token. Reset the token in the Discord Developer Portal and save it here again.';
  if (/used disallowed|not.*enabled/i.test(m)) return m;
  return m;
}

// Checks that the IDs and permissions entered on the website really work in Discord.
// Returns a short problem description, or null when everything is fine.
async function checkConfig(client, row, hasAi) {
  const c = row.config || {};
  const mods = row.modules || [];
  const guilds = [...client.guilds.cache.values()].filter(g => !c.guildId || g.id === c.guildId);
  if (!guilds.length) {
    return c.guildId
      ? 'Bot is not in the server with this Guild ID. Use "Invite bot to server" and check the Guild ID.'
      : 'Bot is not in any server yet. Use "Invite bot to server" on this page.';
  }

  async function channelProblem(id, label, needs) {
    if (!id) return null;
    let hit = null;
    for (const g of guilds) {
      const ch = await g.channels.fetch(id).catch(() => null);
      if (ch) { hit = { g, ch }; break; }
    }
    if (!hit) return label + ' ID ' + id + ' was not found in the server. Check the ID and that the bot can see the channel.';
    if (!hit.ch.isTextBased()) return label + ' is not a text channel.';
    const me = hit.g.members.me;
    const missing = me ? hit.ch.permissionsFor(me)?.missing(needs) : [];
    if (missing && missing.length) return 'Bot is missing permission in ' + label + ': ' + missing.join(', ') + '.';
    return null;
  }

  async function roleProblem(id, label) {
    if (!id) return null;
    let hit = null;
    for (const g of guilds) {
      const role = await g.roles.fetch(id).catch(() => null);
      if (role) { hit = { g, role }; break; }
    }
    if (!hit) return label + ' ID ' + id + ' was not found in the server.';
    const me = hit.g.members.me;
    if (hit.role.managed || (me && hit.role.position >= me.roles.highest.position))
      return 'Move the bot role above the ' + label + ' in Server Settings > Roles.';
    return null;
  }

  const problems = [];
  if (mods.includes('welcome')) {
    problems.push(c.welcomeChannelId ? await channelProblem(c.welcomeChannelId, 'welcome channel', ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles']) : 'Welcome channel ID is required.');
    problems.push(await roleProblem(c.welcomeRoleId, 'auto role'));
  }
  if (['moderation', 'ban', 'supporter'].some(m => mods.includes(m)))
    problems.push(await channelProblem(c.modLogChannelId, 'mod log channel', ['ViewChannel', 'SendMessages']));
  if (mods.includes('supporter'))
    problems.push(c.supporterRoleId ? await roleProblem(c.supporterRoleId, 'supporter role') : 'Supporter role ID is required.');
  if (mods.includes('ai')) {
    problems.push(hasAi ? await channelProblem(c.aiChannelId, 'AI channel', ['ViewChannel', 'SendMessages'])
      : 'AI chat is on but no AI provider/API key is saved. Choose a provider and save the key on this page.');
  }
  return problems.find(Boolean) || null;
}

async function runHosted() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for hosted mode');
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
  const running = new Map(); // bot id -> { bot, row, updated_at, hasAi, problem }
  const failed = new Map();  // bot id -> { updated_at, at } (login failed, retry later)

  async function aiConfig(row) {
    const provider = row.config?.aiProvider;
    if (!row.modules.includes('ai') || !provider) return undefined;
    const { data } = await db.rpc('get_bot_provider_secret', { p_user_id: row.user_id, p_provider: provider });
    if (!data?.api_key || !data?.model) return undefined;
    return { apiKey: data.api_key, model: data.model, baseUrl: AI_BASE[provider] };
  }

  // Writes the real state into Supabase SQL (hosted_bots.status / last_error / last_heartbeat).
  async function report(id, problem) {
    const args = problem
      ? { p_id: id, p_status: 'error', p_error: String(problem).slice(0, 300) }
      : { p_id: id, p_status: 'online', p_error: null };
    const { error } = await db.rpc('set_hosted_bot_status', args);
    if (error) console.error('status update failed:', error.message);
  }

  // One confirmation message in Discord when a bot comes online after Verify / Update.
  async function announce(entry) {
    const c = entry.row.config || {};
    const channelId = (entry.row.modules.includes('welcome') && c.welcomeChannelId) || c.modLogChannelId || '';
    if (!channelId || entry.problem) return;
    for (const g of entry.bot.client.guilds.cache.values()) {
      if (c.guildId && g.id !== c.guildId) continue;
      const ch = await g.channels.fetch(channelId).catch(() => null);
      if (ch?.isTextBased()) {
        const name = entry.bot.client.user?.username || 'Bot';
        await ch.send('\u2705 **' + name + '** is online 24/7 and connected to Discord Promo Hub.').catch(() => null);
        return;
      }
    }
  }

  async function startBot(row) {
    const ai = await aiConfig(row);
    const config = { ...row.config, modules: row.modules, ai };
    const entry = { bot: null, row, updated_at: row.updated_at, hasAi: Boolean(ai), problem: null };
    const firstTime = row.status !== 'online'; // pending / error / offline -> just verified
    config.onReady = async () => {
      try {
        entry.problem = await checkConfig(entry.bot.client, row, entry.hasAi);
        await report(row.id, entry.problem);
        if (firstTime) await announce(entry);
      } catch (err) { console.error('[' + row.client_id + '] ready handler failed:', err.message); }
    };
    entry.bot = createBot({ token: row.token, clientId: row.client_id, config, label: row.client_id });
    running.set(row.id, entry);
    try { await entry.bot.start(); }
    catch (err) {
      console.error('[' + row.client_id + '] login failed:', err.message);
      running.delete(row.id);
      failed.set(row.id, { updated_at: row.updated_at, at: Date.now() });
      await entry.bot.stop();
      await db.rpc('set_hosted_bot_status', { p_id: row.id, p_status: 'error', p_error: friendlyError(err.message).slice(0, 300) });
    }
  }

  async function sync() {
    const { data, error } = await db.rpc('list_runnable_hosted_bots');
    if (error) { console.error('Sync failed:', error.message); return; }
    const wanted = new Map((data || []).map(r => [r.id, r]));
    for (const [id, entry] of running) {
      const row = wanted.get(id);
      if (!row || row.updated_at !== entry.updated_at) {
        await entry.bot.stop(); running.delete(id);
        await db.rpc('set_hosted_bot_status', { p_id: id, p_status: 'offline', p_error: null });
      }
    }
    for (const [id, f] of failed) {
      const row = wanted.get(id);
      if (!row || row.updated_at !== f.updated_at) failed.delete(id);
    }
    for (const row of wanted.values()) {
      if (running.has(row.id)) continue;
      const f = failed.get(row.id);
      if (f && Date.now() - f.at < RETRY_AFTER_FAIL_MS) continue;
      await startBot(row);
    }
  }

  // Every minute: prove the bot is alive and re-check the IDs/permissions, so fixing a
  // role or channel in Discord clears the error on the website without a restart.
  async function heartbeat() {
    for (const [id, entry] of running) {
      if (!entry.bot.client.isReady()) continue;
      try { entry.problem = await checkConfig(entry.bot.client, entry.row, entry.hasAi); }
      catch (err) { console.error('config check failed:', err.message); }
      await report(id, entry.problem);
    }
  }

  await sync();
  setInterval(() => sync().catch(e => console.error('sync error', e.message)), SYNC_MS);
  setInterval(() => heartbeat().catch(() => null), HEARTBEAT_MS);
  console.log('Hosted mode running. Bots:', running.size);
}

module.exports = { runHosted };
