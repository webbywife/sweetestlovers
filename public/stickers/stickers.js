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

  /** A tinted silhouette (same alpha mask, filled with `color` instead of white). */
  function tintedSilhouette(img, w, h, color) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  function ring(ctx, sil, x, y, w, h, width, steps = 20) {
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      ctx.drawImage(sil, x + Math.cos(a) * width, y + Math.sin(a) * width, w, h);
    }
  }

  /** Die-cut sticker border around `img` at (cx,cy): a soft ground shadow, then a thick WHITE
      ring only (no colored outline — it sits on a pastel card backdrop now, so white alone
      already reads clearly), then the art on top. */
  function stampSticker(ctx, img, cx, cy, boxSize, ringWidth, opts = {}) {
    const { shadow = true, outline = null, outlineWidth = 0 } = opts;
    const scale = Math.min(boxSize / img.width, boxSize / img.height);
    const w = img.width * scale, h = img.height * scale;
    const x = cx - w / 2, y = cy - h / 2;
    if (shadow) {
      const shadowSil = silhouette(img, w, h);
      ctx.save(); ctx.globalAlpha = .18;
      ctx.drawImage(shadowSil, x + ringWidth * .55, y + ringWidth * .9, w, h);
      ctx.restore();
    }
    if (outline && outlineWidth > 0) {
      const outlineSil = tintedSilhouette(img, w, h, outline);
      ring(ctx, outlineSil, x, y, w, h, ringWidth + outlineWidth);
    }
    const whiteSil = silhouette(img, w, h);
    ring(ctx, whiteSil, x, y, w, h, ringWidth);
    ctx.drawImage(img, x, y, w, h);
    return { x, y, w, h };
  }

  /** The rounded card + pastel circular backdrop behind a sticker, matching the on-page
      preview tile's own look (radial gradient, white center fading to the character's tone). */
  function drawCard(ctx, W, H, cardY, cardSize, tone) {
    const r = 44;
    // cream card with a faint dot pattern + a thin hairline border (the ONLY outline left —
    // nothing brown touches the character itself anymore)
    ctx.fillStyle = '#FFFCF7';
    roundRect(ctx, W / 2 - cardSize / 2, cardY, cardSize, cardSize, r);
    ctx.fill();
    ctx.save();
    roundRect(ctx, W / 2 - cardSize / 2, cardY, cardSize, cardSize, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(122,75,69,.05)';
    for (let yy = cardY + 14; yy < cardY + cardSize; yy += 26) {
      for (let xx = W / 2 - cardSize / 2 + 14; xx < W / 2 + cardSize / 2; xx += 26) {
        ctx.beginPath(); ctx.arc(xx, yy, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#7A4B45'; ctx.globalAlpha = .35; ctx.lineWidth = 2.5;
    roundRect(ctx, W / 2 - cardSize / 2, cardY, cardSize, cardSize, r); ctx.stroke();
    ctx.globalAlpha = 1;

    const circleR = cardSize * .42;
    const ccx = W / 2, ccy = cardY + cardSize * .46;
    const grad = ctx.createRadialGradient(ccx - circleR * .16, ccy - circleR * .22, circleR * .1, ccx, ccy, circleR);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(.32, tone);
    grad.addColorStop(1, tone);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ccx, ccy, circleR, 0, Math.PI * 2); ctx.fill();
    return { ccx, ccy, circleR };
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

  /** Fits `text` to `maxWidth` by shrinking the font size (never below `min`), returns the used size. */
  function fitFont(ctx, text, family, weight, start, min, maxWidth) {
    let size = start;
    while (size > min) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  /* ---------- one sticker: a rounded card with a pastel circular backdrop (matching the
     on-page preview tile), a white-only die-cut ring — no brown outline on the character —
     name lettering below, brand tag overlapping the circle's bottom edge ---------- */
  async function drawOneSticker(entry) {
    const W = 900, H = 980;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';

    const cardSize = 800, cardY = 40;
    const { ccy, circleR } = drawCard(ctx, W, H, cardY, cardSize, entry.tone);

    const img = await loadImg(entry.img);
    const box = stampSticker(ctx, img, W / 2, ccy - 18, circleR * 1.42, 13);

    brandBadge(ctx, W / 2, cardY + cardSize * .855, 1.15);

    const name = entry.name;
    const size = fitFont(ctx, name, '"Bagel Fat One", cursive', 400, 66, 32, W - 90);
    ctx.font = `400 ${size}px "Bagel Fat One", cursive`;
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = size * .16;
    const nameY = cardY + cardSize + 64;
    ctx.strokeText(name, W / 2, nameY, W - 90);
    ctx.fillStyle = '#D93A76';
    ctx.fillText(name, W / 2, nameY, W - 90);

    return canvas;
  }

  const stickerCache = new Map();
  function getOrDrawSticker(entry) {
    if (!stickerCache.has(entry.slug)) stickerCache.set(entry.slug, drawOneSticker(entry));
    return stickerCache.get(entry.slug);
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

  $$('.sticker').forEach(card => {
    const slug = card.dataset.slug;
    const entry = CAST.find(c => c.slug === slug);
    if (!entry) return;
    const btn = $('.dl', card);
    btn.addEventListener('click', async () => {
      btn.classList.add('busy'); btn.querySelector('.txt').textContent = 'Making…';
      try {
        const canvas = await getOrDrawSticker(entry);
        await downloadCanvas(canvas, `${slug}-sugar-valley-sticker.png`);
        btn.classList.add('done'); btn.querySelector('.txt').textContent = 'Saved! ✓';
      } catch (e) {
        btn.querySelector('.txt').textContent = 'Try again';
      } finally {
        btn.classList.remove('busy');
        setTimeout(() => { btn.classList.remove('done'); btn.querySelector('.txt').textContent = 'Download'; }, 2200);
      }
    });
    if (window.SugarShare) {
      SugarShare.mount(card, {
        getCanvas: () => getOrDrawSticker(entry),
        filename: `${slug}-sugar-valley-sticker.png`,
        title: entry.name,
        text: `${entry.name} 🍪 #SugarValley #TheSweetestBakeOff`,
        pageUrl: `${location.origin}${location.pathname}#${slug}`,
      });
    }
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
        stampSticker(ctx, img, cx, cy - 14, cell * .68, 7, { shadow: false, outline: '#7A4B45', outlineWidth: 4 });
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
