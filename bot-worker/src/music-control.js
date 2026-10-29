/**
 * music-control.js — load stable core + fix: name search + no play-dl YouTube
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CACHE = path.join('/tmp', 'dph-music-control-cache.js');
const RAW_URL =
  'https://raw.githubusercontent.com/kumarsumit68439-code/discord-promo-hub/a7229b0846d3c52d9736aadc5908334cf7375d08/bot-worker/src/music-control.js';

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

function applyPatches(code) {
  // 1) Skip play-dl for YouTube (Easter Egg source)
  code = code.replace(
    /if \(playdl && isHttp\(url\)\) \{/,
    'if (playdl && isHttp(url) && !isYouTube(url)) {'
  );

  // 2) Friendlier Easter Egg / Back4App text
  code = code.replace(
    "return 'YouTube audio blocked on this server. Set YOUTUBE_COOKIE on the worker, or try another song.';",
    "return 'YouTube stream fail (play-dl). Cookie / yt-dlp se try karo, ya dusra song.';"
  );
  code = code.replace(
    "return 'This video needs login/age check. Add YOUTUBE_COOKIE on Back4App worker env.';",
    "return 'This video needs login/age check. Add YOUTUBE_COOKIE on Railway worker env.';"
  );

  // 3) In sendMiniPlayer: resolve song name → YouTube URL via yt-dlp search
  const old = "const url = ytUrl(payload.url || payload.query || '');";
  const neu = `let url = ytUrl(payload.url || '');
  if (!isHttp(url)) {
    const qName = String(payload.query || payload.title || payload.url || '').trim();
    if (qName && !isHttp(qName)) {
      try {
        url = await (function searchYt(q) {
          return new Promise((resolve, reject) => {
            const args = ['--dump-json', '--flat-playlist', '--no-warnings', '--js-runtimes', 'node', 'ytsearch1:' + q];
            let p;
            try { p = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'], env: ytdlpEnv() }); }
            catch (e) { reject(e); return; }
            let out = '', err = '';
            const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} reject(new Error('search timeout')); }, 30000);
            p.stdout.on('data', d => out += d);
            p.stderr.on('data', d => err += d);
            p.on('close', () => {
              clearTimeout(t);
              const line = out.split('\n').find(l => l.trim().startsWith('{'));
              if (!line) { reject(new Error(err.split('\n').filter(Boolean).pop() || 'No YouTube results for: ' + q)); return; }
              try {
                const j = JSON.parse(line);
                const u = (j.url && /^https?:/i.test(j.url)) ? j.url : ('https://www.youtube.com/watch?v=' + j.id);
                if (!payload.title && j.title) payload.title = j.title;
                if (!payload.channel && (j.channel || j.uploader)) payload.channel = j.channel || j.uploader;
                if (!payload.thumbnail && Array.isArray(j.thumbnails) && j.thumbnails.length)
                  payload.thumbnail = j.thumbnails[j.thumbnails.length - 1].url || '';
                console.log('[music] name search →', j.title || q, u);
                resolve(u);
              } catch (e) { reject(e); }
            });
          });
        })(qName);
      } catch (se) {
        throw new Error('Search fail: ' + (se.message || se));
      }
    } else {
      url = ytUrl(payload.query || '');
    }
  }`;
  if (code.includes(old)) {
    code = code.replace(old, neu);
  } else {
    console.warn('[music] patch: sendMiniPlayer url line not found');
  }

  return code;
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

code = applyPatches(code);

const m = new Module(__filename);
m.filename = __filename;
m.paths = module.paths;
m._compile(code, __filename);
module.exports = m.exports;
