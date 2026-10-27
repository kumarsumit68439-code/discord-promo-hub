const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const Module = require('module');

// Fix: "parent_id[CHANNEL_PARENT_INVALID_TYPE]: Not a category".
try {
  const { GuildChannelManager, ChannelType } = require('discord.js');
  const originalCreate = GuildChannelManager.prototype.create;
  GuildChannelManager.prototype.create = async function patchedCreate(options = {}) {
    const raw = options && options.parent;
    const parentId = raw && typeof raw === 'object' ? raw.id : raw;
    if (parentId) {
      const parent = await this.guild.channels.fetch(String(parentId)).catch(() => null);
      if (!parent || parent.type !== ChannelType.GuildCategory) {
        console.warn('[ticket] category ID ' + parentId + ' is not a category channel, creating without category');
        const { parent: _ignored, ...rest } = options;
        options = rest;
      }
    }
    return originalCreate.call(this, options);
  };
} catch (err) {
  console.error('category guard not installed:', err.message);
}

function loadFromGzip() {
  const b64 = [0, 1, 2, 3].map((i) => require('./bot-parts/gz' + i)).join('');
  return zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
}

function loadRuntime() {
  const runtimePath = path.join(__dirname, 'bot.runtime.js');

  // 1) Prefer on-disk file if present
  if (fs.existsSync(runtimePath)) {
    try {
      return require(runtimePath);
    } catch (err) {
      console.error('[bot] bot.runtime.js exists but failed to load:', err.message);
    }
  }

  // 2) Materialize from gzip parts, then require the real file (fixes virtual Module issues)
  try {
    const code = loadFromGzip();
    fs.writeFileSync(runtimePath, code, 'utf8');
    console.log('[bot] wrote bot.runtime.js from gzip parts (' + code.length + ' bytes)');
    try {
      delete require.cache[require.resolve(runtimePath)];
    } catch (_) {}
    return require(runtimePath);
  } catch (err) {
    console.error('[bot] gzip materialize failed:', err.message);
  }

  // 3) Last resort: in-memory Module compile
  try {
    const code = loadFromGzip();
    const m = new Module(runtimePath);
    m.filename = runtimePath;
    m.paths = Module._nodeModulePaths(__dirname);
    m._compile(code, runtimePath);
    console.warn('[bot] loaded via in-memory Module compile');
    return m.exports;
  } catch (err) {
    console.error('[bot] all load strategies failed:', err.message);
    throw err;
  }
}

module.exports = loadRuntime();
