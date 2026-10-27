const path = require('path');

// Fix: "parent_id[CHANNEL_PARENT_INVALID_TYPE]: Not a category".
// If the Ticket category ID saved on the website is not a real category (for example a text channel ID),
// Discord rejects channel creation. Drop an invalid parent so the ticket channel is still created.
try {
  const { GuildChannelManager, ChannelType } = require('discord.js');
  const originalCreate = GuildChannelManager.prototype.create;
  GuildChannelManager.prototype.create = async function patchedCreate(options = {}) {
    const raw = options && options.parent;
    const parentId = raw && typeof raw === 'object' ? raw.id : raw;
    if (parentId) {
      const parent = await this.guild.channels.fetch(String(parentId)).catch(() => null);
      if (!parent || parent.type !== ChannelType.GuildCategory) {
        console.warn(
          '[ticket] category ID ' + parentId + ' is not a category channel, creating the channel without a category'
        );
        const { parent: _ignored, ...rest } = options;
        options = rest;
      }
    }
    return originalCreate.call(this, options);
  };
} catch (err) {
  console.error('category guard not installed:', err.message);
}

// Prefer the real source file (bot.runtime.js). Fallback to gzipped parts if missing.
let runtime;
try {
  runtime = require('./bot.runtime.js');
} catch (err) {
  console.error('[bot] failed to load bot.runtime.js:', err.message);
  if (/davey|Class extends value/i.test(String(err && err.message) + String(err && err.stack))) {
    console.error(
      '[bot] @snazzah/davey native module failed. Rebuild image with g++/python3, or pin a working @snazzah/davey version.'
    );
  }
  // Legacy gzip parts fallback
  try {
    const zlib = require('zlib');
    const Module = require('module');
    const b64 = [0, 1, 2, 3].map((i) => require('./bot-parts/gz' + i)).join('');
    const code = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
    const file = path.join(__dirname, 'bot.runtime.js');
    const m = new Module(file);
    m.filename = file;
    m.paths = Module._nodeModulePaths(__dirname);
    m._compile(code, file);
    runtime = m.exports;
    console.warn('[bot] loaded via gzip fallback');
  } catch (err2) {
    console.error('[bot] gzip fallback also failed:', err2.message);
    throw err;
  }
}

module.exports = runtime;
