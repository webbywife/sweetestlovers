/* Sugar Valley sticker sheet — die-cut stickers + a full-cast poster, all composed client-side
   from art already on the page. `window.CAST` is set inline before this loads:
   [{slug, name, role, img, tone}] */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CAST = window.CAST || [];

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /** A white silhouette of `img` (alpha-matched), same size as drawn — used to build the die-cut ring. */
  function silhouette(img, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  /** Stamps a thick white die-cut ring around `img` at (cx,cy) sized to fit in `boxSize`, then the art on top. */
  function stampSticker(ctx, img, cx, cy, boxSize, ringWidth, shadow = true) {
    const scale = Math.min(boxSize / img.width, boxSize / img.height);
    const w = img.width * scale, h = img.height * scale;
    const x = cx - w / 2, y = cy - h / 2;
    const sil = silhouette(img, w, h);
    const steps = 20;
    if (shadow) {
      ctx.save(); ctx.globalAlpha = .18;
      ctx.drawImage(sil, x + ringWidth * .55, y + ringWidth * .9, w, h);
      ctx.restore();
    }
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      ctx.drawImage(sil, x + Math.cos(a) * ringWidth, y + Math.sin(a) * ringWidth, w, h);
    }
    ctx.drawImage(img, x, y, w, h);
    return { x, y, w, h };
  }

  function brandBadge(ctx, cx, cy, scale = 1) {
    ctx.save();
    ctx.textAlign = 'center';
    const w = 210 * scale, h = 46 * scale;
    ctx.fillStyle = '#fff';
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 3 * scale;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = '#D93A76';
    ctx.font = `800 ${15 * scale}px Nunito, sans-serif`;
    ctx.fillText('🍪 SUGAR VALLEY', cx, cy + 5 * scale, w - 20 * scale);
    ctx.restore();
  }

  /* ---------- one sticker: transparent PNG, die-cut border, small brand tag ---------- */
  async function drawOneSticker(entry) {
    const S = 900;
    const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    const img = await loadImg(entry.img);
    const box = stampSticker(ctx, img, S / 2, S * .46, S * .68, 16);
    brandBadge(ctx, S / 2, box.y + box.h - 6, 1.15);
    return canvas;
  }

  async function downloadCanvas(canvas, filename) {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve();
      }, 'image/png');
    });
  }

  $$('.dl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.closest('.sticker').dataset.slug;
      const entry = CAST.find(c => c.slug === slug);
      if (!entry) return;
      btn.classList.add('busy'); btn.querySelector('.txt').textContent = 'Making…';
      try {
        const canvas = await drawOneSticker(entry);
        await downloadCanvas(canvas, `${slug}-sugar-valley-sticker.png`);
        btn.classList.add('done'); btn.querySelector('.txt').textContent = 'Saved! ✓';
      } catch (e) {
        btn.querySelector('.txt').textContent = 'Try again';
      } finally {
        btn.classList.remove('busy');
        setTimeout(() => { btn.classList.remove('done'); btn.querySelector('.txt').textContent = 'Download'; }, 2200);
      }
    });
  });

  /* ---------- the full-cast poster ---------- */
  function heart(ctx, x, y, s, color, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(12, 21);
    ctx.bezierCurveTo(5, 15, 1, 11.5, 1, 7); ctx.bezierCurveTo(1, 3.6, 3.7, 1.5, 6.5, 1.5);
    ctx.bezierCurveTo(9, 1.5, 11, 3, 12, 5); ctx.bezierCurveTo(13, 3, 15, 1.5, 17.5, 1.5);
    ctx.bezierCurveTo(20.3, 1.5, 23, 3.6, 23, 7); ctx.bezierCurveTo(23, 11.5, 19, 15, 12, 21);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function spark(ctx, x, y, s, color, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s / 20, s / 20); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.bezierCurveTo(11, 6, 14, 9, 20, 10); ctx.bezierCurveTo(14, 11, 11, 14, 10, 20);
    ctx.bezierCurveTo(9, 14, 6, 11, 0, 10); ctx.bezierCurveTo(6, 9, 9, 6, 10, 0);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  async function drawPoster() {
    const cols = CAST.length > 24 ? 7 : CAST.length > 12 ? 6 : 4;
    const cell = 260, pad = 60, headerH = 320, footerH = 90;
    const rows = Math.ceil(CAST.length / cols);
    const W = pad * 2 + cols * cell;
    const H = headerH + rows * cell + footerH;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#FFD3E2'); grad.addColorStop(.35, '#FFF6EA'); grad.addColorStop(1, '#FFF6EA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    const rnd = mulberry32(42);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * (headerH + rows * cell);
      if (i % 2) heart(ctx, x, y, 16 + rnd() * 16, '#FF9EB9', .35);
      else spark(ctx, x, y, 14 + rnd() * 14, '#fff', .55);
    }

    ctx.textAlign = 'center';
    ctx.font = '400 96px "Bagel Fat One", cursive';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 18;
    ctx.strokeText('Meet the Sugar Valley Cast', W / 2, 150, W - 120);
    ctx.fillStyle = '#D93A76';
    ctx.fillText('Meet the Sugar Valley Cast', W / 2, 150, W - 120);
    ctx.font = '800 34px Nunito, sans-serif'; ctx.fillStyle = '#7A5570';
    ctx.fillText(`${CAST.length} sweet friends and counting`, W / 2, 202);

    ctx.fillStyle = '#fff'; roundRect(ctx, W / 2 - 300, 228, 600, 62, 31); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 4; roundRect(ctx, W / 2 - 300, 228, 600, 62, 31); ctx.stroke();
    ctx.font = '800 26px Nunito, sans-serif'; ctx.fillStyle = '#23896A';
    ctx.fillText('🍪 Your Daily Dose of Love & Sweetness', W / 2, 268, 560);

    const imgs = await Promise.all(CAST.map(c => loadImg(c.img).catch(() => null)));
    CAST.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = pad + col * cell + cell / 2, cy = headerH + row * cell + cell / 2;
      const img = imgs[i];
      if (img) {
        stampSticker(ctx, img, cx, cy - 14, cell * .68, 10, false);
      }
      ctx.font = '400 24px "Bagel Fat One", cursive'; ctx.fillStyle = '#4A2740';
      ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
      ctx.strokeText(c.name, cx, cy + cell * .40, cell - 20);
      ctx.fillText(c.name, cx, cy + cell * .40, cell - 20);
    });

    ctx.font = '700 24px Nunito, sans-serif'; ctx.fillStyle = '#7A4B45';
    ctx.fillText('#SugarValley #TheSweetestBakeOff', W / 2, H - 36, W - 120);
    return canvas;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const posterBtn = $('#posterBtn');
  if (posterBtn) {
    posterBtn.addEventListener('click', async () => {
      posterBtn.classList.add('busy'); posterBtn.querySelector('.txt').textContent = 'Building the poster…';
      try {
        const canvas = await drawPoster();
        await downloadCanvas(canvas, 'sugar-valley-cast-poster.png');
        const caption = `Meet the whole Sugar Valley cast — ${CAST.length} sweet friends and counting! 🍪 #SugarValley #TheSweetestBakeOff`;
        try { await navigator.clipboard.writeText(caption); } catch (e) { /* clipboard unavailable; poster still downloads */ }
        posterBtn.classList.add('done'); posterBtn.querySelector('.txt').textContent = 'Poster saved + caption copied!';
      } catch (e) {
        posterBtn.querySelector('.txt').textContent = 'Something went wrong — try again';
      } finally {
        posterBtn.classList.remove('busy');
        setTimeout(() => { posterBtn.classList.remove('done'); posterBtn.querySelector('.txt').textContent = 'Download the full poster'; }, 3200);
      }
    });
  }
})();
