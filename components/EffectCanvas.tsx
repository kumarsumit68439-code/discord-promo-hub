'use client';

import { useEffect, useRef } from 'react';
import { EFFECTS, EFFECT_TYPES } from '@/lib/siteSettings';

type Particle = { x: number; y: number; s: number; vx: number; vy: number; rot: number; vr: number; col: string; ph: number; ch: string; a: number };

const MATRIX_CHARS = '01ｱｲｳｴｵｶｷｸｹｺ';

export default function EffectCanvas({ effect }: { effect: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const def = EFFECTS.find((e) => e.id === effect);
    const canvas = ref.current;
    if (!def || def.type === 'none' || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cfg = EFFECT_TYPES.find((t) => t.id === def.type);
    const ctx = canvas.getContext('2d');
    if (!cfg || !ctx) return;

    const type = def.type;
    const colors = def.colors;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const count = w < 640 ? Math.round(cfg.count * 0.55) : cfg.count;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: rnd(0, w),
        y: rnd(0, h),
        s: rnd(cfg.size[0], cfg.size[1]),
        vx: rnd(cfg.vx[0], cfg.vx[1]),
        vy: rnd(cfg.vy[0], cfg.vy[1]),
        rot: rnd(0, 6.283),
        vr: rnd(-0.04, 0.04),
        col: colors[Math.floor(Math.random() * colors.length)],
        ph: rnd(0, 6.283),
        ch: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
        a: rnd(0.45, 0.95),
      });
    }

    const sways = type === 'snow' || type === 'petals' || type === 'hearts' || type === 'bubbles' || type === 'confetti';

    const draw = (p: Particle, t: number) => {
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.col;
      ctx.strokeStyle = p.col;
      switch (type) {
        case 'snow':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.283);
          ctx.fill();
          break;
        case 'stars': {
          ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.002 + p.ph));
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? p.s * 0.4 : p.s * 1.6;
            const ang = (i * Math.PI) / 4;
            ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'hearts':
          ctx.font = `${Math.round(p.s * 4)}px serif`;
          ctx.fillText('♥', p.x, p.y);
          break;
        case 'bubbles':
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * 1.6, 0, 6.283);
          ctx.stroke();
          break;
        case 'rain':
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
          break;
        case 'fireflies':
          ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.002 + p.ph));
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.283);
          ctx.fill();
          break;
        case 'confetti':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.s, -p.s / 2, p.s * 2, p.s);
          break;
        case 'sparks':
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, 6.283);
          ctx.fill();
          break;
        case 'petals':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s * 1.4, p.s * 0.7, 0, 0, 6.283);
          ctx.fill();
          break;
        case 'matrix':
          ctx.font = '14px monospace';
          ctx.fillText(p.ch, p.x, p.y);
          break;
      }
      ctx.restore();
    };

    const loop = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx + (sways ? Math.sin(t * 0.0015 + p.ph) * 0.3 : 0);
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 30) { p.y = -30; p.x = rnd(0, w); }
        else if (p.y < -30) { p.y = h + 30; p.x = rnd(0, w); }
        if (p.x > w + 30) p.x = -30;
        else if (p.x < -30) p.x = w + 30;
        draw(p, t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [effect]);

  if (effect === 'none') return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[35]" />;
}
