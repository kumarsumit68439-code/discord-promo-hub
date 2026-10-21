// Site customisation: themes, animations, effects. Language is English only.

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
  language: 'en',
};

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

export const THEMES: ThemeDef[] = [
  DEFAULT_THEME,
  ...HUES.flatMap(([n, h, m]) => THEME_STYLES.map((st) => buildTheme(n, h, m, st))),
];

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

export const ANIMATIONS: AnimDef[] = [
  { id: 'default', name: 'None' },
  ...ANIM_BASES.flatMap((b) =>
    ANIM_TIMINGS.map((t) => ({
      id: `${b}-${t.id}`,
      name: `${pretty(b)} · ${t.name}`,
      css: { name: `hub-a-${b}`, dur: t.dur, ease: t.ease },
    }))
  ),
];

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

export const EFFECTS: EffectDef[] = [
  { id: 'none', name: 'No effect', type: 'none', colors: [] },
  ...EFFECT_TYPES.flatMap((t) =>
    PALETTES.map((p) => ({ id: `${t.id}-${p.id}`, name: `${t.name} · ${p.name}`, type: t.id, colors: p.colors }))
  ),
];

/** English only — translation UI removed. */
export const LANGUAGES: Array<[string, string]> = [['en', 'English']];

export const gtCode = (lang: string) => lang;

export type CssState = { vars: Record<string, string>; anim: boolean; dir: 'ltr' | 'rtl' };

const MANAGED_VARS = ['--c-darker', '--c-dark', '--c-card', '--c-hover', '--c-blurple', '--anim-name', '--anim-dur', '--anim-ease'];

export function sanitizeSettings(raw: Partial<SiteSettings> | null | undefined): SiteSettings {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  if (!THEMES.some((t) => t.id === s.theme)) s.theme = DEFAULT_SETTINGS.theme;
  if (!ANIMATIONS.some((a) => a.id === s.animation)) s.animation = DEFAULT_SETTINGS.animation;
  if (!EFFECTS.some((e) => e.id === s.effect)) s.effect = DEFAULT_SETTINGS.effect;
  s.language = 'en';
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
  return { vars, anim: !!anim?.css, dir: 'ltr' };
}

export function applyCssToDom(css: CssState) {
  const root = document.documentElement;
  MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
  Object.entries(css.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (css.anim) root.setAttribute('data-anim', '1');
  else root.removeAttribute('data-anim');
  root.dir = 'ltr';
}
