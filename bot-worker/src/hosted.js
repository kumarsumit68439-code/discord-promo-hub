const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // Node 20 has no native WebSocket; supabase-js realtime needs a transport (ws ships with discord.js)
const { createBot } = require('./bot');

// Multi-tenant runner: reads bots saved from the website (tokens from Supabase Vault),
// runs one Discord client per bot and reports status/heartbeat back to Supabase.
const AI_BASE = { groq: 'https://api.groq.com/openai/v1', xai: 'https://api.x.ai/v1' };

async function runHosted() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for hosted mode');
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
  const running = new Map(); // bot id -> { bot, updated_at }
  const SYNC_MS = 30_000;

  async function aiConfig(row) {
    const provider = row.config?.aiProvider;
    if (!row.modules.includes('ai') || !provider) return undefined;
    const { data } = await db.rpc('get_bot_provider_secret', { p_user_id: row.user_id, p_provider: provider });
    if (!data?.api_key || !data?.model) return undefined;
    return { apiKey: data.api_key, model: data.model, baseUrl: AI_BASE[provider] };
  }

  async function startBot(row) {
    const config = { ...row.config, modules: row.modules, ai: await aiConfig(row) };
    config.onReady = () => db.rpc('set_hosted_bot_status', { p_id: row.id, p_status: 'online', p_error: null });
    const bot = createBot({ token: row.token, clientId: row.client_id, config, label: row.client_id });
    running.set(row.id, { bot, updated_at: row.updated_at });
    try { await bot.start(); }
    catch (err) {
      console.error('[' + row.client_id + '] login failed:', err.message);
      running.delete(row.id);
      await bot.stop();
      await db.rpc('set_hosted_bot_status', { p_id: row.id, p_status: 'error', p_error: String(err.message).slice(0, 300) });
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
    for (const row of wanted.values()) if (!running.has(row.id)) await startBot(row);
  }

  async function heartbeat() {
    for (const [id, { bot }] of running) {
      if (bot.client.isReady()) await db.rpc('set_hosted_bot_status', { p_id: id, p_status: 'online', p_error: null });
    }
  }

  await sync();
  setInterval(() => sync().catch(e => console.error('sync error', e.message)), SYNC_MS);
  setInterval(() => heartbeat().catch(() => null), 60_000);
  console.log('Hosted mode running. Bots:', running.size);
}

module.exports = { runHosted };
