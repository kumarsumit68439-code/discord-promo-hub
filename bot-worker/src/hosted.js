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

function cleanEnv(v) {
  return String(v || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

/** Back4App sometimes caps one env value — allow key split across _2 / _3. */
function readServiceRoleKey() {
  const a = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const b = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY_2);
  const c = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY_3);
  if (b || c) return a + b + c;
  return a || cleanEnv(process.env.SUPABASE_SERVICE_KEY) || cleanEnv(process.env.SUPABASE_KEY);
}

function decodeJwtPayload(jwt) {
  try {
    const mid = String(jwt).split('.')[1];
    if (!mid) return null;
    const json = Buffer.from(mid.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function runHosted() {
  const url = cleanEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, '');
  const key = readServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (set service_role secret, not anon)'
    );
  }

  const keyLooksJwt = key.startsWith('eyJ') && key.split('.').length === 3;
  const payload = decodeJwtPayload(key);
  console.log(
    '[supabase] url=' +
      url +
      ' keyLen=' +
      key.length +
      ' parts=' +
      key.split('.').length +
      ' keyPrefix=' +
      key.slice(0, 15) +
      ' keySuffix=' +
      key.slice(-8) +
      ' jwt=' +
      keyLooksJwt
  );
  if (payload) {
    console.log(
      '[supabase] jwt.role=' +
        (payload.role || '?') +
        ' jwt.ref=' +
        (payload.ref || '?') +
        ' expectedRef=nimduknedcjsmimaszvu'
    );
  } else {
    console.error('[supabase] could not decode JWT payload — key is truncated or corrupted');
  }
  if (payload && payload.role === 'anon') {
    console.error('[supabase] WRONG KEY: this is the anon/public key. Use service_role (secret) instead.');
  }
  if (payload && payload.role && payload.role !== 'service_role') {
    console.error('[supabase] WRONG KEY role=' + payload.role + ' — need role=service_role');
  }
  if (payload && payload.ref && payload.ref !== 'nimduknedcjsmimaszvu') {
    console.error('[supabase] WRONG PROJECT ref=' + payload.ref + ' — URL/key project mismatch');
  }
  if (!keyLooksJwt) {
    console.error('[supabase] key is not a valid 3-part JWT (eyJ... . ... . ...)');
  }
  if (key.length < 150) {
    console.error('[supabase] key too short (' + key.length + '). Full service_role is usually 200–400 chars.');
  }

  try {
    const res = await fetch(url + '/rest/v1/rpc/list_runnable_hosted_bots', {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const text = await res.text();
    console.log('[supabase] httpProbe status=' + res.status + ' body=' + text.slice(0, 180));
  } catch (e) {
    console.error('[supabase] httpProbe exception:', e.message);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  try {
    const probe = await db.rpc('list_runnable_hosted_bots');
    if (probe.error) {
      console.error('[supabase] probe failed:', probe.error.message, probe.error.code || '');
      if (/invalid api key/i.test(probe.error.message || '')) {
        console.error(
          '[supabase] FIX: Supabase → Settings → API → service_role → Reveal → copy FULL key into SUPABASE_SERVICE_ROLE_KEY (no quotes). If Back4App cuts it, use KEY + KEY_2.'
        );
      }
    } else {
      console.log('[supabase] probe ok — runnable bots:', Array.isArray(probe.data) ? probe.data.length : 0);
    }
  } catch (e) {
    console.error('[supabase] probe exception:', e.message);
  }
  const running = new Map();
  const failed = new Map();

  async function aiConfig(row) {
    if (!row.modules || !row.modules.includes('ai')) return undefined;

    // Default provider: config → groq (empty aiProvider still works)
    let provider = String((row.config && row.config.aiProvider) || '')
      .toLowerCase()
      .trim();
    if (provider !== 'groq' && provider !== 'xai') provider = 'groq';

    const defaultModel = {
      groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      xai: process.env.XAI_MODEL || 'grok-2-latest',
    };

    // 1) Website-saved key (bot_provider_settings + vault)
    try {
      const { data } = await db.rpc('get_bot_provider_secret', {
        p_user_id: row.user_id,
        p_provider: provider,
      });
      if (data && data.api_key) {
        const model = data.model || defaultModel[provider];
        const envName = AI_ENV[provider];
        if (envName && !process.env[envName]) process.env[envName] = data.api_key;
        console.log(
          '[' + row.client_id + '] AI ready via website key · provider=' + provider + ' · model=' + model
        );
        return { apiKey: data.api_key, model, baseUrl: AI_BASE[provider] };
      }
    } catch (e) {
      console.warn('[' + row.client_id + '] get_bot_provider_secret:', e.message || e);
    }

    // 2) Worker env fallback (GROQ_API_KEY / XAI_API_KEY on Back4App)
    const envName = AI_ENV[provider];
    const envKey = envName ? process.env[envName] : '';
    if (envKey && String(envKey).trim()) {
      const model = defaultModel[provider];
      console.log('[' + row.client_id + '] AI ready via worker env ' + envName + ' · model=' + model);
      return { apiKey: String(envKey).trim(), model, baseUrl: AI_BASE[provider] };
    }

    for (const alt of ['groq', 'xai']) {
      if (alt === provider) continue;
      const altEnv = AI_ENV[alt];
      const altKey = altEnv && process.env[altEnv];
      if (altKey && String(altKey).trim()) {
        const model = defaultModel[alt];
        console.log('[' + row.client_id + '] AI ready via worker env ' + altEnv + ' · model=' + model);
        return { apiKey: String(altKey).trim(), model, baseUrl: AI_BASE[alt] };
      }
    }

    console.warn(
      '[' +
        row.client_id +
        '] AI module ON but no API key. Set GROQ_API_KEY on Back4App OR save Groq key on website Hosting → AI provider.'
    );
    return undefined;
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
    const entry = { bot: null, row, updated_at: row.updated_at, hasAi: Boolean(ai), problem: null };
    console.log(
      '[' +
        row.client_id +
        '] start · modules=' +
        (row.modules || []).join(',') +
        ' · AI=' +
        (ai ? 'on(' + ai.model + ')' : 'OFF') +
        ' · aiChannel=' +
        ((row.config && row.config.aiChannelId) || 'none')
    );
    const firstTime = row.status !== 'online';
    config.onReady = async () => {
      try {
        entry.problem = await checkConfig(entry.bot.client, row);
        await report(row.id, entry.problem);
        if (firstTime) await announce(entry);
      } catch (err) {
        console.error('[' + row.client_id + '] ready handler', err.message);
      }
    };
    entry.bot = createBot({
      token: row.token,
      clientId: row.client_id,
      config,
      label: row.client_id,
      onVoiceState: (state) => {
        void saveVoiceState(row.id, state);
      },
      onXp: async ({ guildId, userId, xp, level, username }) => {
        try {
          await db.from('bot_levels').upsert(
            {
              bot_id: row.id,
              guild_id: guildId,
              user_id: userId,
              username,
              xp,
              level,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'bot_id,guild_id,user_id' }
          );
        } catch (_) {}
      },
    });

    try {
      setupBuilder.attach(entry.bot.client, row);
    } catch (e) {
      console.error('[' + row.client_id + '] setup attach', e.message);
    }
    try {
      musicControl.attach(entry.bot.client);
    } catch (e) {
      console.error('[' + row.client_id + '] music attach', e.message);
    }
    try {
      musicCommands.attach(entry.bot, row);
    } catch (e) {
      console.error('[' + row.client_id + '] music commands attach', e.message);
    }

    running.set(row.id, entry);
    try {
      await entry.bot.start();
    } catch (err) {
      console.error('[' + row.client_id + '] login failed:', err.message);
      running.delete(row.id);
      await entry.bot.stop();
      if (allowAutoFix && /disallowed intents/i.test(err.message) && (await tryEnableIntents(row))) {
        await new Promise((r) => setTimeout(r, 3000));
        return startBot(row, false);
      }
      failed.set(row.id, { updated_at: row.updated_at, at: Date.now() });
      await db.rpc('set_hosted_bot_status', {
        p_id: row.id,
        p_status: 'error',
        p_error: friendlyError(err.message).slice(0, 300),
      });
    }
  }

  async function sync() {
    const { data, error } = await db.rpc('list_runnable_hosted_bots');
    if (error) {
      console.error('Sync failed:', error.message);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    const wanted = new Map(rows.map((r) => [r.id, r]));
    for (const [id, entry] of running) {
      const row = wanted.get(id);
      if (!row || row.updated_at !== entry.updated_at) {
        await entry.bot.stop();
        running.delete(id);
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

  async function heartbeat() {
    for (const [id, entry] of running) {
      if (!entry.bot.client.isReady()) continue;
      try {
        entry.problem = await checkConfig(entry.bot.client, entry.row);
      } catch (err) {
        console.error('config check', err.message);
      }
      await report(id, entry.problem);
      if (entry.bot.getProtectStats) await saveStats(id, entry.bot.getProtectStats());
      if (entry.bot.getVoiceState) await saveVoiceState(id, entry.bot.getVoiceState());
    }
  }

  let testBusy = false;
  async function processTestRequests() {
    if (testBusy) return;
    testBusy = true;
    try {
      const { data, error } = await db.rpc('list_pending_test_welcomes');
      if (error) return;
      for (const { id } of data || []) {
        const entry = running.get(id);
        if (entry && !entry.bot.client.isReady()) continue;
        let result;
        if (!entry) result = 'Failed: bot not online yet';
        else {
          try {
            await entry.bot.sendTestWelcome();
            result = 'Test welcome message sent.';
          } catch (err) {
            result = 'Failed: ' + friendlyTestError(err);
          }
        }
        await db.rpc('finish_test_welcome', { p_id: id, p_result: result });
      }
    } finally {
      testBusy = false;
    }
  }

  let voiceBusy = false;
  async function processVoiceCommands() {
    if (voiceBusy) return;
    voiceBusy = true;
    try {
      const { data, error } = await db
        .from('voice_commands')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) return;
      for (const cmd of data || []) {
        const entry = running.get(cmd.bot_id);
        let result = '';
        let status = 'done';
        try {
          if (!entry || !entry.bot.client.isReady()) {
            status = 'error';
            result = 'Bot offline';
          } else {
            const b = entry.bot;
            const action = cmd.action;
            if (action === 'join') result = await b.joinVoice(cmd.channel_id || entry.row.config?.voiceChannelId, cmd.minutes);
            else if (action === 'leave') result = await b.leaveVoice();
            else if (action === 'mute') result = await b.setMute(true);
            else if (action === 'unmute') result = await b.setMute(false);
            else if (action === 'timer') result = b.setTimer(cmd.minutes);
            else if (action === 'ai_on') result = b.setAiVoice(true);
            else if (action === 'ai_off') result = b.setAiVoice(false);
            else {
              status = 'error';
              result = 'Unknown action';
            }
          }
        } catch (err) {
          status = 'error';
          result = err.message || 'failed';
        }
        await db.from('voice_commands').update({ status, result, done_at: new Date().toISOString() }).eq('id', cmd.id);
      }
    } finally {
      voiceBusy = false;
    }
  }

  let botCmdBusy = false;
  async function processBotCommands() {
    if (botCmdBusy) return;
    botCmdBusy = true;
    try {
      const { data, error } = await db
        .from('bot_commands')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(20);
      if (error) return;
      for (const cmd of data || []) {
        const entry = running.get(cmd.bot_id);
        let result = '';
        let status = 'done';
        try {
          if (!entry || !entry.bot.client.isReady()) {
            status = 'error';
            result = 'Bot offline';
          } else {
            const client = entry.bot.client;
            const action = cmd.action;
            const payload = cmd.payload || {};
            const channelId =
              cmd.channel_id ||
              entry.row.config?.musicChannelId ||
              entry.row.config?.welcomeChannelId ||
              '';

            if (action === 'music_play') {
              result = await musicControl.sendMiniPlayer(client, entry.row, payload, channelId);
            } else if (action === 'music_skip' || action === 'music_pause' || action === 'music_resume' || action === 'music_stop') {
              result = 'Use Discord mini-player buttons (or re-send a track)';
            } else if (action === 'announce') {
              const text = String(payload.text || '').slice(0, 1800);
              const ch = await client.channels
                .fetch(channelId || entry.row.config?.modLogChannelId)
                .catch(() => null);
              if (ch && ch.isTextBased && ch.isTextBased() && text) {
                await ch.send(text);
                result = 'Sent';
              } else {
                status = 'error';
                result = 'Channel missing';
              }
            } else {
              status = 'error';
              result = 'Unknown action: ' + action;
            }
          }
        } catch (err) {
          status = 'error';
          result = (err && err.message) || 'failed';
        }
        await db
          .from('bot_commands')
          .update({ status, result: String(result).slice(0, 400), done_at: new Date().toISOString() })
          .eq('id', cmd.id);
      }
    } finally {
      botCmdBusy = false;
    }
  }

  await sync();
  setInterval(() => sync().catch((e) => console.error('sync', e.message)), SYNC_MS);
  setInterval(() => heartbeat().catch(() => null), HEARTBEAT_MS);
  setInterval(() => processTestRequests().catch((e) => console.error('test', e.message)), TEST_POLL_MS);
  setInterval(() => processVoiceCommands().catch((e) => console.error('voice', e.message)), VOICE_POLL_MS);
  setInterval(() => processBotCommands().catch((e) => console.error('botcmd', e.message)), 4000);
  console.log('Hosted mode running. Bots:', running.size);
}

module.exports = { runHosted };
