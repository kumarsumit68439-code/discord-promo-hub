/**
 * music-control.js — assembles rich Lofi-style player + AI Speak
 */
const zlib = require('zlib');
const Module = require('module');
const parts = [
  require('./music-parts/p0.js'),
  require('./music-parts/p1.js'),
  require('./music-parts/p2.js'),
  require('./music-parts/p3.js'),
  require('./music-parts/p4.js')
];
const code = parts.join('');
// If content is already JS (loader), eval via Module
const m = new Module(__filename);
m.filename = __filename;
m.paths = module.paths;
m._compile(code, __filename);
module.exports = m.exports;
