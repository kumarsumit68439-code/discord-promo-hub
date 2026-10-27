const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { createBot } = require('./bot');
const setupBuilder = require('./setup-builder');
const musicControl = require('./music-control');
const musicCommands = require('./music-commands');

const AI_BASE = { groq: 'https://api.groq.com/openai/v1', xai: 'https://api.x.ai/v1' };
const AI_ENV = { groq: 'GROQ_API_KEY', xai: 'XAI_API_KEY' };
const SYNC_MS = 30_000;
const HEARTBEAT_MS = 60_000;
const TEST_POLL_MS = 5_000;
const VOICE_POLL_MS = 4_000;
const RETRY_AFTER_FAIL_MS = 120_000;

const FLAG_MEMBERS = 1 << 14;
const FLAG_MEMBERS_LIMITED = 1 << 15;
const FLAG_CONTENT = 1 << 18;
const FLAG_CONTENT_LIMITED = 1 << 19;

function friendlyError(raw) {
  const m = String(raw || '');
  if (/disallowed intents/i.test(m))
    return 'Privileged intents off. Discord Developer Portal > Bot: enable Server Members Intent (+ Message Content for AI/ticket/levels), Save.';
  if (/invalid token|TokenInvalid/i.test(m)) return 'Invalid bot token. Reset in Developer Portal and save again.';
  return m;
}

function friendlyTestError(err) {
  const code = err && err.code;
  if (code === 50013) return 'missing permission in welcome channel';
  if (code === 50001 || code === 10003) return 'cannot see welcome channel';
  return String((err && err.message) || err || 'unknown').slice(0, 250);
}

async function tryEnableIntents(row) {
  const mods = row.modules || [];
  const needMembers = mods.some((m) =>
    ['welcome', 'invite', 'supporter', 'levels', 'memberadd', 'security', 'tokenclaim', 'moderation', 'serversetup', 'channelbuilder'].includes(m)
  );
  const needContent = mods.some((m) =>
    ['ai', 'support', 'levels', 'protect', 'ticket', 'tokenclaim', 'security', 'music', 'simple'].includes(m)
  );
  const headers = { Authorization: 'Bot ' + row.token, 'Content-Type': 'application/json' };
  const api = 'https://discord.com/api/v10/applications/@me';
  try {
    const cur = await fetch(api, { headers });
    if (!cur.ok) return false;
    const app = await cur.json();
    const flags = Number(app.flags || 0);
    let want = flags;
    if (needMembers && !(flags & (FLAG_MEMBERS | FLAG_MEMBERS_LIMITED))) want |= FLAG_MEMBERS;
    if (needContent && !(flags & (FLAG_CONTENT | FLAG_CONTENT_LIMITED))) want |= FLAG_CONTENT;
    if (want === flags) return false;
    const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify({ flags: want }) });
    if (!res.ok) return false;
    console.log('[' + row.client_id + '] privileged intents enabled');
    return true;
  } catch (err) {
    console.error('[' + row.client_id + '] intents enable failed', err.message);
    return false;
  }
}

async function checkConfig(client, row) {
  const c = row.config || {};
  const guilds = [...client.guilds.cache.values()].filter((g) => !c.guildId || g.id === c.guildId);
  if (!guilds.length) {
    return c.guildId
      ? 'Bot is not in this Guild ID server. Invite the bot first.'
      : 'Bot is not in any server yet. Use Invite bot to server.';
  }
  return null;
}

async function runHosted() {
  // Trim: Back4App / Railway sometimes add trailing newlines or quotes around secrets.
  const url = String(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  )
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/$/, '');
  const key = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_KEY ||
      ''
  )
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (set service_role secret, not anon)'
    );
  }

  // Helpful diagnostics without leaking the full secret
  const keyLooksJwt = key.startsWith('eyJ');
  console.log(
    '[supabase] url=' +
      url +
      ' keyLen=' +
      key.length +
      ' keyPrefix=' +
      key.slice(0, 12) +
      '... jwt=' +
      keyLooksJwt
  );
  if (!keyLooksJwt) {
    console.error(
      '[supabase] key does not look like a JWT (should start with eyJ). You pasted anon/publishable or truncated value?'
    );
  }
  if (key.length < 100) {
    console.error(
      '[supabase] key is too short (' +
        key.length +
        ' chars). service_role JWT is usually 200+ chars — paste was likely cut off.'
    );
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  // Fail fast with a clear message instead of looping "Invalid API key"
  try {
    const probe = await db.rpc('list_runnable_hosted_bots');
    if (probe.error) {
      console.error('[supabase] probe failed:', probe.error.message, probe.error.code || '');
      if (/invalid api key/i.test(probe.error.message || '')) {
        console.error(
          '[supabase] FIX: Back4App env SUPABASE_SERVICE_ROLE_KEY must be the service_role secret from Supabase → Settings → API (Reveal). Not the anon/public key. Copy the full key with no spaces/quotes.'
        );
      }
    } else {
      const n = Array.isArray(probe.data) ? probe.data.length : 0;
      console.log('[supabase] probe ok — runnable bots:', n);
    }
  } catch (e) {
    console.error('[supabase] probe exception:', e.message);
  }
  const running = new Map();
  const failed = new Map();

  async function aiConfig(row) {
    const provider = row.config?.aiProvider;
    if (!row.modules.includes('ai') || !provider) return undefined;
    const { data } = await db.rpc('get_bot_provider_secret', { p_user_id: row.user_id, p_provider: provider });
    if (!data?.api_key || !data?.model) return undefined;
    // Some features (e.g. voice AI) read the key from the environment. If the host has no
    // GROQ_API_KEY / XAI_API_KEY set, reuse the key the owner saved on the website.
    const envName = AI_ENV[provider];
    if (envName && !process.env[envName]) process.env[envName] = data.api_key;
    return { apiKey: data.api_key, model: data.model, baseUrl: AI_BASE[provider] };
  }

  async function report(id, problem) {
    const args = problem
      ? { p_id: id, p_status: 'error', p_error: String(problem).slice(0, 300) }
      : { p_id: id, p_status: 'online', p_error: null };
    const { error } = await db.rpc('set_hosted_bot_status', args);
    if (error) console.error('status update failed', error.message);
  }

  async function saveVoiceState(id, state) {
    try {
      await db.from('hosted_bots').update({ voice_state: state, last_heartbeat: new Date().toISOString() }).eq('id', id);
    } catch (e) {
      console.error('voice_state save', e.message);
    }
  }

  async function saveStats(id, stats) {
    try {
      await db.from('hosted_bots').update({ stats, last_heartbeat: new Date().toISOString() }).eq('id', id);
    } catch (_) {}
  }

  async function announce(entry) {
    const c = entry.row.config || {};
    const channelId = (entry.row.modules.includes('welcome') && c.welcomeChannelId) || c.modLogChannelId || '';
    if (!channelId || entry.problem) return;
    for (const g of entry.bot.client.guilds.cache.values()) {
      if (c.guildId && g.id !== c.guildId) continue;
      const ch = await g.channels.fetch(channelId).catch(() => null);
      if (ch?.isTextBased()) {
        const name = entry.bot.client.user?.username || 'Bot';
        await ch.send('✅ **' + name + '** is online 24/7 via Discord Promo Hub.').catch(() => null);
        return;
      }
    }
  }

  async function startBot(row, allowAutoFix = true) {
    const ai = await aiConfig(row);
    const config = { ...row.config, modules: row.modules, ai };
    const entry { bot: null, row, updated_at: row.updated_at, hasAi: Boolean(ai), problem: null };
