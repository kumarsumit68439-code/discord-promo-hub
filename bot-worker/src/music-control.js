/**
 * music-control.js — seek/next + name search + no play-dl YT
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');

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
  code = code.replace(
    /if \(playdl && isHttp\(url\)\) \{/,
    'if (playdl && isHttp(url) && !isYouTube(url)) {'
  );

  code = code.replace(
    "return 'YouTube audio blocked on this server. Set YOUTUBE_COOKIE on the worker, or try another song.';",
    "return 'YouTube stream fail. Update YOUTUBE_COOKIE on Railway, or try another song.';"
  );
  code = code.replace(
    "return 'This video needs login/age check. Add YOUTUBE_COOKIE on Back4App worker env.';",
    "return 'This video needs login/age check. Add YOUTUBE_COOKIE on Railway worker env.';"
  );

  const nl = String.fromCharCode(10);
  const helper = [
    'async function __dphSearchYt(q, payload) {',
    '  const { spawn } = require("child_process");',
    '  return new Promise((resolve, reject) => {',
    '    const args = ["--dump-json", "--flat-playlist", "--no-warnings", "--js-runtimes", "node", "ytsearch1:" + q];',
    '    let p;',
    '    try { p = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"], env: ytdlpEnv() }); }',
    '    catch (e) { reject(e); return; }',
    '    let out = ""; let err = "";',
    '    const t = setTimeout(() => { try { p.kill("SIGKILL"); } catch (_) {} reject(new Error("search timeout")); }, 30000);',
    '    p.stdout.on("data", (d) => (out += d));',
    '    p.stderr.on("data", (d) => (err += d));',
    '    p.on("close", () => {',
    '      clearTimeout(t);',
    '      const nl = String.fromCharCode(10);',
    '      const line = out.split(nl).find((l) => l.trim().startsWith("{"));',
    '      if (!line) { reject(new Error((err.split(nl).filter(Boolean).pop()) || ("No YouTube results for: " + q))); return; }',
    '      try {',
    '        const j = JSON.parse(line);',
    '        const u = (j.url && /^https?:/i.test(j.url)) ? j.url : ("https://www.youtube.com/watch?v=" + j.id);',
    '        if (!payload.title && j.title) payload.title = j.title;',
    '        if (!payload.channel && (j.channel || j.uploader)) payload.channel = j.channel || j.uploader;',
    '        if (!payload.thumbnail && Array.isArray(j.thumbnails) && j.thumbnails.length) payload.thumbnail = j.thumbnails[j.thumbnails.length - 1].url || "";',
    '        console.log("[music] name search ->", j.title || q, u);',
    '        resolve(u);',
    '      } catch (e) { reject(e); }',
    '    });',
    '  });',
    '}',
    '',
    'async function __dphSeek(guild, deltaSec) {',
    '  const s = sessions.get(guild.id);',
    '  if (!s || !s.player) throw new Error("Koi track nahi chal raha");',
    '  if (!s.ytFile || !require("fs").existsSync(s.ytFile)) throw new Error("Seek tabhi jab file play ho (YouTube download)");',
    '  s.seekOffset = Math.max(0, (s.seekOffset || 0) + Number(deltaSec || 0));',
    '  const { spawn } = require("child_process");',
    '  const { createAudioResource, StreamType } = require("@discordjs/voice");',
    '  const ff = spawn("ffmpeg", ["-ss", String(s.seekOffset), "-i", s.ytFile, "-f", "mp3", "-ac", "2", "-ar", "48000", "pipe:1"], { stdio: ["ignore", "pipe", "ignore"] });',
    '  const resource = createAudioResource(ff.stdout, { inputType: StreamType.Arbitrary, inlineVolume: true });',
    '  if (resource.volume) resource.volume.setVolume(1);',
    '  s.player.play(resource);',
    '  return s.seekOffset;',
    '}',
    '',
  ].join(nl);

  const anchor = 'async function sendMiniPlayer(client, row, payload, channelId) {';
  if (code.includes(anchor) && !code.includes('__dphSearchYt')) {
    code = code.replace(anchor, helper + anchor);
  }

  const old = "const url = ytUrl(payload.url || payload.query || '');";
  const neu = [
    "let url = ytUrl(payload.url || '');",
    "  if (!isHttp(url)) {",
    "    const qName = String(payload.query || payload.title || payload.url || '').trim();",
    "    if (qName && !isHttp(qName)) {",
    "      url = await __dphSearchYt(qName, payload);",
    "    } else {",
    "      url = ytUrl(payload.query || '');",
    "    }",
    "  }",
  ].join(nl);
  if (code.includes(old)) code = code.replace(old, neu);

  code = code.replace(
    /function playerRow\(videoId, paused\) \{[\s\S]*?\n\}/,
    [
      'function playerRow(videoId, paused) {',
      '  return new ActionRowBuilder().addComponents(',
      "    new ButtonBuilder().setCustomId('mph:back10:' + videoId).setLabel('-10s').setStyle(ButtonStyle.Secondary),",
      "    new ButtonBuilder().setCustomId('mph:pause:' + videoId).setLabel('Pause').setStyle(ButtonStyle.Primary).setDisabled(!!paused),",
      "    new ButtonBuilder().setCustomId('mph:next:' + videoId).setLabel('Next').setStyle(ButtonStyle.Success),",
      "    new ButtonBuilder().setCustomId('mph:fwd10:' + videoId).setLabel('+10s').setStyle(ButtonStyle.Secondary),",
      "    new ButtonBuilder().setCustomId('mph:stop:' + videoId).setLabel('Stop').setStyle(ButtonStyle.Danger)",
      '  );',
      '}',
      'function playerRow2(videoId, paused) {',
      '  return new ActionRowBuilder().addComponents(',
      "    new ButtonBuilder().setCustomId('mph:back30:' + videoId).setLabel('-30s').setStyle(ButtonStyle.Secondary),",
      "    new ButtonBuilder().setCustomId('mph:resume:' + videoId).setLabel('Resume').setStyle(ButtonStyle.Secondary).setDisabled(!paused),",
      "    new ButtonBuilder().setCustomId('mph:skip:' + videoId).setLabel('Skip').setStyle(ButtonStyle.Secondary),",
      "    new ButtonBuilder().setCustomId('mph:fwd30:' + videoId).setLabel('+30s').setStyle(ButtonStyle.Secondary),",
      "    new ButtonBuilder().setCustomId('mph:play:' + videoId).setLabel('Play').setStyle(ButtonStyle.Success)",
      '  );',
      '}',
    ].join(nl)
  );

  code = code.replace(
    "components: [playerRow(videoId, false), searchRow()],",
    "components: [playerRow(videoId, false), playerRow2(videoId, false), searchRow()],"
  );

  code = code.replace(
    "    if (action === 'skip') {\n      if (s && s.player) s.player.stop(true);\n      await interaction.reply({ content: '⏭️ Skip', flags: EPHEMERAL });\n      return true;\n    }",
    [
      "    if (action === 'back10' || action === 'fwd10' || action === 'back30' || action === 'fwd30') {",
      "      const map = { back10: -10, fwd10: 10, back30: -30, fwd30: 30 };",
      "      try {",
      "        const off = await __dphSeek(guild, map[action]);",
      "        await interaction.reply({ content: 'Seek -> ' + off + 's', flags: EPHEMERAL });",
      "      } catch (e) {",
      "        await interaction.reply({ content: 'Seek fail: ' + (e.message || e), flags: EPHEMERAL });",
      "      }",
      "      return true;",
      "    }",
      "    if (action === 'next' || action === 'skip') {",
      "      if (s && s.player) s.player.stop(true);",
      "      const n = s && s.queue && s.queue.length ? s.queue.length : 0;",
      "      await interaction.reply({ content: n ? ('Next - queue ' + n + ' left') : 'Next/Skip (empty queue = stop)', flags: EPHEMERAL });",
      "      return true;",
      "    }",
    ].join(nl)
  );

  const strat =
    "const strategies = [" +
    "{ client: 'android', cookies: true }," +
    "{ client: 'ios', cookies: true }," +
    "{ client: 'mweb', cookies: true }," +
    "{ client: 'tv_embedded', cookies: true }," +
    "{ client: 'web_embedded', cookies: true }," +
    "{ client: 'android', cookies: false }," +
    "{ client: 'ios', cookies: false }," +
    "{ client: null, cookies: true }," +
    "{ client: null, cookies: false }," +
    "];";
  code = code.replace(/const strategies = \[[\s\S]*?\];/, strat);

  code = code.replace(
    "s.current = { ...track, url };\n      s.player.play(resource);\n      console.log(",
    "s.current = { ...track, url };\n      s.seekOffset = 0;\n      s.player.play(resource);\n      console.log("
  );

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
