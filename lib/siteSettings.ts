// Site customisation data: 100 themes, 100 animations, 100 effects and all languages.
// Everything is generated from small tables so the lists stay easy to maintain.

export type SiteSettings = {
  theme: string;
  animation: string;
  effect: string;
  language: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  theme: 'default',
  animation: 'default',
  effect: 'none',
  language: 'auto',
};

/* ------------------------------ Themes ------------------------------ */

export type ThemeDef = {
  id: string;
  name: string;
  swatch: [string, string, string];
  vars: Record<string, string>;
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = s / 100;
  const ll = l / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
const triplet = (c: [number, number, number]) => c.join(' ');
const hex = (c: [number, number, number]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

const HUES: Array<[string, number, number]> = [
  ['Blurple', 235, 1], ['Indigo', 255, 1], ['Violet', 270, 1], ['Purple', 285, 1], ['Magenta', 310, 1],
  ['Pink', 330, 1], ['Rose', 345, 1], ['Red', 0, 1], ['Orange', 22, 1], ['Amber', 40, 1],
  ['Yellow', 52, 1], ['Lime', 85, 1], ['Green', 125, 1], ['Emerald', 152, 1], ['Teal', 175, 1],
  ['Cyan', 190, 1], ['Sky', 205, 1], ['Blue', 220, 1], ['Slate', 215, 0.5], ['Mocha', 25, 0.55],
];

type ThemeStyle = { id: string; name: string; sat: number; l: [number, number, number, number]; aSat: number; aL: number; hueShift: number };
const THEME_STYLES: ThemeStyle[] = [
  { id: 'classic', name: 'Classic', sat: 12, l: [6, 10, 16, 21], aSat: 85, aL: 64, hueShift: 0 },
  { id: 'neon', name: 'Neon', sat: 45, l: [4, 7, 11, 15], aSat: 100, aL: 58, hueShift: 0 },
  { id: 'amoled', name: 'Amoled', sat: 18, l: [0, 3, 8, 12], aSat: 90, aL: 62, hueShift: 0 },
  { id: 'twilight', name: 'Twilight', sat: 30, l: [8, 12, 18, 23], aSat: 70, aL: 70, hueShift: 0 },
  { id: 'aurora', name: 'Aurora', sat: 26, l: [7, 11, 16, 21], aSat: 92, aL: 62, hueShift: 40 },
];

const DEFAULT_THEME: ThemeDef = {
  id: 'default',
  name: 'Discord Default',
  swatch: ['#2b2d31', '#5865f2', '#111214'],
  vars: {},
};

function buildTheme(hueName: string, hue: number, satMul: number, st: ThemeStyle): ThemeDef {
  const sat = st.sat * satMul;
  const darker = hslToRgb(hue, sat, st.l[0]);
  const dark = hslToRgb(hue, sat, st.l[1]);
  const card = hslToRgb(hue, sat, st.l[2]);
  const hover = hslToRgb(hue, sat, st.l[3]);
  const accent = hslToRgb(hue + st.hueShift, st.aSat, st.aL);
  return {
    id: `${hueName.toLowerCase()}-${st.id}`,
    name: `${hueName} ${st.name}`,
    swatch: [hex(card), hex(accent), hex(darker)],
    vars: {
      '--c-darker': triplet(darker),
      '--c-dark': triplet(dark),
      '--c-card': triplet(card),
      '--c-hover': triplet(hover),
      '--c-blurple': triplet(accent),
    },
  };
}

// 1 default + 100 generated (20 hues x 5 styles)
export const THEMES: ThemeDef[] = [
  DEFAULT_THEME,
  ...HUES.flatMap(([n, h, m]) => THEME_STYLES.map((st) => buildTheme(n, h, m, st))),
];

/* ---------------------------- Animations ---------------------------- */

export type AnimDef = { id: string; name: string; css?: { name: string; dur: string; ease: string } };

const ANIM_BASES = [
  'fadeIn', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoomIn', 'zoomOut', 'rotateIn', 'flipX', 'flipY',
  'bounceIn', 'blurIn', 'skewIn', 'swingIn', 'dropIn', 'popIn', 'rollIn', 'stretchIn', 'tiltIn', 'glitchIn',
];
const ANIM_TIMINGS = [
  { id: 'quick', name: 'Quick', dur: '0.25s', ease: 'ease-out' },
  { id: 'smooth', name: 'Smooth', dur: '0.5s', ease: 'ease' },
  { id: 'slow', name: 'Slow', dur: '0.9s', ease: 'ease-in-out' },
  { id: 'springy', name: 'Springy', dur: '0.6s', ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  { id: 'dramatic', name: 'Dramatic', dur: '1.2s', ease: 'cubic-bezier(0.16, 1, 0.3, 1)' },
];
const pretty = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

// 1 default (none) + 100 (20 motions x 5 timings)
export const ANIMATIONS: AnimDef[] = [
  { id: 'default', name: 'Default (no animation)' },
  ...ANIM_BASES.flatMap((b) =>
    ANIM_TIMINGS.map((t) => ({
      id: `${b}-${t.id}`,
      name: `${pretty(b)} · ${t.name}`,
      css: { name: `hub-a-${b}`, dur: t.dur, ease: t.ease },
    }))
  ),
];

/* ------------------------------ Effects ------------------------------ */

export type EffectType = {
  id: string;
  name: string;
  count: number;
  size: [number, number];
  vy: [number, number];
  vx: [number, number];
};
export const EFFECT_TYPES: EffectType[] = [
  { id: 'snow', name: 'Snowfall', count: 90, size: [1.5, 4], vy: [0.6, 1.8], vx: [-0.4, 0.4] },
  { id: 'stars', name: 'Twinkling Stars', count: 80, size: [1, 2.6], vy: [0, 0], vx: [0, 0] },
  { id: 'hearts', name: 'Floating Hearts', count: 28, size: [3, 6], vy: [-1.4, -0.5], vx: [-0.3, 0.3] },
  { id: 'bubbles', name: 'Bubbles', count: 40, size: [3, 9], vy: [-1.2, -0.3], vx: [-0.2, 0.2] },
  { id: 'rain', name: 'Rain', count: 110, size: [3, 7], vy: [9, 15], vx: [-1.5, -0.8] },
  { id: 'fireflies', name: 'Fireflies', count: 40, size: [1.5, 3], vy: [-0.3, 0.3], vx: [-0.3, 0.3] },
  { id: 'confetti', name: 'Confetti', count: 70, size: [3, 6], vy: [1, 2.6], vx: [-0.8, 0.8] },
  { id: 'sparks', name: 'Sparks', count: 60, size: [1, 2.4], vy: [-2.6, -0.8], vx: [-0.5, 0.5] },
  { id: 'petals', name: 'Petals', count: 40, size: [3, 6], vy: [0.8, 1.8], vx: [0.2, 1] },
  { id: 'matrix', name: 'Matrix Code', count: 60, size: [1, 1], vy: [1.5, 4], vx: [0, 0] },
];

export type Palette = { id: string; name: string; colors: string[] };
export const PALETTES: Palette[] = [
  { id: 'rainbow', name: 'Rainbow', colors: ['#ff5f6d', '#ffc371', '#fee75c', '#57f287', '#5865f2', '#eb459e'] },
  { id: 'ocean', name: 'Ocean', colors: ['#0ea5e9', '#38bdf8', '#22d3ee', '#67e8f9', '#3b82f6'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f97316', '#fb923c', '#f43f5e', '#fbbf24', '#e879f9'] },
  { id: 'neon', name: 'Neon', colors: ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff3131'] },
  { id: 'gold', name: 'Gold', colors: ['#fde047', '#facc15', '#f59e0b', '#fff7ae', '#d97706'] },
  { id: 'ice', name: 'Ice', colors: ['#e0f2fe', '#bae6fd', '#ffffff', '#c7d2fe', '#a5f3fc'] },
  { id: 'fire', name: 'Fire', colors: ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#fde047'] },
  { id: 'forest', name: 'Forest', colors: ['#22c55e', '#16a34a', '#86efac', '#4ade80', '#bef264'] },
  { id: 'candy', name: 'Candy', colors: ['#f9a8d4', '#c4b5fd', '#93c5fd', '#fde68a', '#fca5a5'] },
  { id: 'mono', name: 'Mono', colors: ['#ffffff', '#d4d4d8', '#a1a1aa', '#71717a', '#e4e4e7'] },
];

export type EffectDef = { id: string; name: string; type: string; colors: string[] };

// 1 none + 100 (10 effect types x 10 colour palettes)
export const EFFECTS: EffectDef[] = [
  { id: 'none', name: 'No effect', type: 'none', colors: [] },
  ...EFFECT_TYPES.flatMap((t) =>
    PALETTES.map((p) => ({ id: `${t.id}-${p.id}`, name: `${t.name} · ${p.name}`, type: t.id, colors: p.colors }))
  ),
];

/* ----------------------------- Languages ----------------------------- */

// [code, English name]. 'auto' = original site text (no translation).
export const LANGUAGES: Array<[string, string]> = [
  ['auto', 'Original (Default)'],
  ['af', 'Afrikaans'], ['sq', 'Albanian'], ['am', 'Amharic'], ['ar', 'Arabic'], ['hy', 'Armenian'],
  ['as', 'Assamese'], ['ay', 'Aymara'], ['az', 'Azerbaijani'], ['bm', 'Bambara'], ['eu', 'Basque'],
  ['be', 'Belarusian'], ['bn', 'Bengali'], ['bho', 'Bhojpuri'], ['bs', 'Bosnian'], ['bg', 'Bulgarian'],
  ['ca', 'Catalan'], ['ceb', 'Cebuano'], ['zh-CN', 'Chinese (Simplified)'], ['zh-TW', 'Chinese (Traditional)'],
  ['co', 'Corsican'], ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'], ['dv', 'Dhivehi'],
  ['doi', 'Dogri'], ['nl', 'Dutch'], ['en', 'English'], ['eo', 'Esperanto'], ['et', 'Estonian'],
  ['ee', 'Ewe'], ['fil', 'Filipino'], ['fi', 'Finnish'], ['fr', 'French'], ['fy', 'Frisian'],
  ['gl', 'Galician'], ['ka', 'Georgian'], ['de', 'German'], ['el', 'Greek'], ['gn', 'Guarani'],
  ['gu', 'Gujarati'], ['ht', 'Haitian Creole'], ['ha', 'Hausa'], ['haw', 'Hawaiian'], ['he', 'Hebrew'],
  ['hi', 'Hindi'], ['hmn', 'Hmong'], ['hu', 'Hungarian'], ['is', 'Icelandic'], ['ig', 'Igbo'],
  ['ilo', 'Ilocano'], ['id', 'Indonesian'], ['ga', 'Irish'], ['it', 'Italian'], ['ja', 'Japanese'],
  ['jv', 'Javanese'], ['kn', 'Kannada'], ['kk', 'Kazakh'], ['km', 'Khmer'], ['rw', 'Kinyarwanda'],
  ['gom', 'Konkani'], ['ko', 'Korean'], ['kri', 'Krio'], ['ku', 'Kurdish (Kurmanji)'], ['ckb', 'Kurdish (Sorani)'],
  ['ky', 'Kyrgyz'], ['lo', 'Lao'], ['la', 'Latin'], ['lv', 'Latvian'], ['ln', 'Lingala'],
  ['lt', 'Lithuanian'], ['lg', 'Luganda'], ['lb', 'Luxembourgish'], ['mk', 'Macedonian'], ['mai', 'Maithili'],
  ['mg', 'Malagasy'], ['ms', 'Malay'], ['ml', 'Malayalam'], ['mt', 'Maltese'], ['mi', 'Maori'],
  ['mr', 'Marathi'], ['mni-Mtei', 'Meiteilon (Manipuri)'], ['lus', 'Mizo'], ['mn', 'Mongolian'], ['my', 'Myanmar (Burmese)'],
  ['ne', 'Nepali'], ['no', 'Norwegian'], ['ny', 'Nyanja (Chichewa)'], ['or', 'Odia (Oriya)'], ['om', 'Oromo'],
  ['ps', 'Pashto'], ['fa', 'Persian'], ['pl', 'Polish'], ['pt', 'Portuguese'], ['pa', 'Punjabi'],
  ['qu', 'Quechua'], ['ro', 'Romanian'], ['ru', 'Russian'], ['sm', 'Samoan'], ['sa', 'Sanskrit'],
  ['gd', 'Scots Gaelic'], ['nso', 'Sepedi'], ['sr', 'Serbian'], ['st', 'Sesotho'], ['sn', 'Shona'],
  ['sd', 'Sindhi'], ['si', 'Sinhala'], ['sk', 'Slovak'], ['sl', 'Slovenian'], ['so', 'Somali'],
  ['es', 'Spanish'], ['su', 'Sundanese'], ['sw', 'Swahili'], ['sv', 'Swedish'], ['tg', 'Tajik'],
  ['ta', 'Tamil'], ['tt', 'Tatar'], ['te', 'Telugu'], ['th', 'Thai'], ['ti', 'Tigrinya'],
  ['ts', 'Tsonga'], ['tr', 'Turkish'], ['tk', 'Turkmen'], ['ak', 'Twi'], ['uk', 'Ukrainian'],
  ['ur', 'Urdu'], ['ug', 'Uyghur'], ['uz', 'Uzbek'], ['vi', 'Vietnamese'], ['cy', 'Welsh'],
  ['xh', 'Xhosa'], ['yi', 'Yiddish'], ['yo', 'Yoruba'], ['zu', 'Zulu'],
];

// Codes Google Translate expects when they differ from ours.
const GT_CODE: Record<string, string> = { he: 'iw', fil: 'tl' };
export const gtCode = (lang: string) => GT_CODE[lang] || lang;

const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/* ------------------------- Apply helpers ------------------------- */

export type CssState = { vars: Record<string, string>; anim: boolean; dir: 'ltr' | 'rtl' };

const MANAGED_VARS = ['--c-darker', '--c-dark', '--c-card', '--c-hover', '--c-blurple', '--anim-name', '--anim-dur', '--anim-ease'];

export function sanitizeSettings(raw: Partial<SiteSettings> | null | undefined): SiteSettings {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (!THEMES.some((t) => t.id === s.theme)) s.theme = DEFAULT_SETTINGS.theme;
  if (!ANIMATIONS.some((a) => a.id === s.animation)) s.animation = DEFAULT_SETTINGS.animation;
  if (!EFFECTS.some((e) => e.id === s.effect)) s.effect = DEFAULT_SETTINGS.effect;
  if (!LANGUAGES.some(([c]) => c === s.language)) s.language = DEFAULT_SETTINGS.language;
  return s;
}

export function buildCss(s: SiteSettings): CssState {
  const theme = THEMES.find((t) => t.id === s.theme) || DEFAULT_THEME;
  const anim = ANIMATIONS.find((a) => a.id === s.animation);
  const vars: Record<string, string> = { ...theme.vars };
  if (anim?.css) {
    vars['--anim-name'] = anim.css.name;
    vars['--anim-dur'] = anim.css.dur;
    vars['--anim-ease'] = anim.css.ease;
  }
  return { vars, anim: !!anim?.css, dir: RTL.has(s.language) ? 'rtl' : 'ltr' };
}

export function applyCssToDom(css: CssState) {
  const root = document.documentElement;
  MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
  Object.entries(css.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (css.anim) root.setAttribute('data-anim', '1');
  else root.removeAttribute('data-anim');
  root.dir = css.dir;
}
