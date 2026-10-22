const { createCanvas, loadImage } = require('@napi-rs/canvas');

// MEE6-style curve: XP needed to go from `level` to `level + 1`.
// Level 0 -> 100 XP, level 1 -> 155 XP (matches the "27 / 155 XP" card), etc.
const xpForNext = (level) => 5 * level * level + 50 * level + 100;

// Turn TOTAL xp into { level, xp (inside current level), need (for next level) }.
// Everyone starts at level 0.
function splitXp(totalXp) {
  let level = 0;
  let left = Math.max(0, Math.floor(Number(totalXp) || 0));
  while (left >= xpForNext(level)) {
    left -= xpForNext(level);
    level++;
  }
  return { level, xp: left, need: xpForNext(level) };
}

function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders a 934x282 rank / level-up card (MEE6 style).
 * opts: { user: DiscordUser, username?, level, xp, need, rank, accent?, bgFrom?, bgTo? }
 *  - level / xp / need: use splitXp(totalXp) to get them.
 * Returns a PNG Buffer, or null if rendering failed (caller should fall back to text).
 */
async function renderLevelCard(opts) {
  try {
    const W = 934, H = 282;
    const accent = opts.accent || '#4fc3f7';
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // background
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, opts.bgFrom || '#5a1f1f');
    g.addColorStop(1, opts.bgTo || '#1b1220');
    roundRect(ctx, 0, 0, W, H, 28);
    ctx.fillStyle = g;
    ctx.fill();

    // inner dark panel
    roundRect(ctx, 22, 22, W - 44, H - 44, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fill();

    // avatar
    const cx = 118, cy = H / 2, r = 78;
    try {
      const url = opts.user.displayAvatarURL({ extension: 'png', size: 256 });
      const res = await fetch(url);
      const img = await loadImage(Buffer.from(await res.arrayBuffer()));
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } catch (_) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#5865f2';
      ctx.fill();
    }
    // status dot
    ctx.beginPath();
    ctx.arc(cx + 56, cy + 56, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#23a55a';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#111';
    ctx.stroke();

    const left = 236;
    const right = W - 56;

    // rank + level (top right, right aligned)
    const rankTxt = '#' + (opts.rank || '-');
    const lvlTxt = String(opts.level);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(lvlTxt, right, 86);
    const lvlW = ctx.measureText(lvlTxt).width;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('LEVEL', right - lvlW - 10, 86);
    const lvlLabelW = ctx.measureText('LEVEL').width;

    const rankRight = right - lvlW - lvlLabelW - 40;
    ctx.font = 'bold 54px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(rankTxt, rankRight, 86);
    const rankW = ctx.measureText(rankTxt).width;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#b5bac1';
    ctx.fillText('RANK', rankRight - rankW - 10, 86);

    // username
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    const name = String(opts.username || (opts.user && opts.user.username) || 'user').slice(0, 20);
    ctx.fillText(name, left, 168);

    // xp text (right aligned above bar)
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ffffff';
    const needTxt = ' / ' + fmt(opts.need) + ' XP';
    ctx.fillText(needTxt, right, 168);
    const needW = ctx.measureText(needTxt).width;
    ctx.fillStyle = '#b5bac1';
    ctx.fillText(fmt(opts.xp), right - needW, 168);

    // progress bar
    const bx = left, by = 190, bw = right - left, bh = 36;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = '#484b4e';
    ctx.fill();
    const pct = Math.max(0, Math.min(1, opts.need ? opts.xp / opts.need : 0));
    const fw = Math.max(pct > 0 ? bh : 0, Math.round(bw * pct));
    if (fw > 0) {
      roundRect(ctx, bx, by, fw, bh, bh / 2);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.warn('Level card render failed:', err.message);
    return null;
  }
}

module.exports = { renderLevelCard, splitXp, xpForNext };
