const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Renders a 1024x400 welcome card PNG. Returns null if canvas/fonts are unavailable,
// so the caller can fall back to a normal embed.
async function renderWelcomeCard(member) {
  try {
    const W = 1024, H = 400;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#23274a'); g.addColorStop(0.6, '#5865f2'); g.addColorStop(1, '#171b30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(24, 24, W - 48, H - 48);

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const res = await fetch(avatarUrl);
    const img = await loadImage(Buffer.from(await res.arrayBuffer()));
    const cx = 190, cy = H / 2, r = 108;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('WELCOME', 340, 150);
    const name = (member.displayName || member.user.username).slice(0, 22);
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(name, 340, 225);
    ctx.fillStyle = '#c7d2fe';
    ctx.font = '30px sans-serif';
    ctx.fillText('to ' + member.guild.name.slice(0, 30), 340, 272);
    ctx.fillText('Member #' + member.guild.memberCount, 340, 318);
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.warn('Welcome card render failed:', err.message);
    return null;
  }
}

module.exports = { renderWelcomeCard };
