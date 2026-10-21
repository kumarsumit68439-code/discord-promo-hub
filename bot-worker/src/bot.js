const parts = [
require('./bot-parts/part_0'),
require('./bot-parts/part_1'),
require('./bot-parts/part_2'),
require('./bot-parts/part_3'),
require('./bot-parts/part_4'),
require('./bot-parts/part_5'),
require('./bot-parts/part_6'),
require('./bot-parts/part_7'),
require('./bot-parts/part_8')
];
const code = parts.join('');
const Module = require('module');
const path = require('path');
const m = new Module(module.filename);
m.filename = path.join(__dirname, 'bot.runtime.js');
m.paths = module.paths;
m._compile(code, m.filename);
module.exports = m.exports;
