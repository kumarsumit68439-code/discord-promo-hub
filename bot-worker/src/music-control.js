/**
 * music-control.js — fetches known-good implementation at boot
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

const CACHE = path.join('/tmp', 'dph-music-control-cache.js');
const RAW_URL = 'https://raw.githubusercontent.com/kumarsumit68439-code/discord-promo-hub/a7229b0846d3c52d9736aadc5908334cf7375d08/bot-worker/src/music-control.js';

function loadFromString(code) {
  const m = new Module(__filename);
  m.filename = __filename;
  m.paths = module.paths;
  m._compile(code, __filename);
  return m.exports;
}

function fetchSync(url) {
  const { execFileSync } = require('child_process');
  try {
    return execFileSync('curl', ['-fsSL', url], { encoding: 'utf8', timeout: 20000, maxBuffer: 2e6 });
  } catch (e) {
    try {
      return fs.readFileSync(CACHE, 'utf8');
    } catch {
      throw e;
    }
  }
}

let code;
try {
  code = fetchSync(RAW_URL);
  fs.writeFileSync(CACHE, code);
} catch (e) {
  try {
    code = fs.readFileSync(CACHE, 'utf8');
  } catch {
    module.exports = {
      attach() { console.error('[music] control not loaded', e && e.message); },
      sendMiniPlayer() { throw new Error('music-control failed to load: ' + (e && e.message)); },
      ytUrl: (u) => u,
      destroySession() {},
      sessions: new Map(),
    };
    return;
  }
}
module.exports = loadFromString(code);
