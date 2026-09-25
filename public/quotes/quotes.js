/* Sugar Valley quote posters. `window.QUOTES` and `window.CAST_IMAGES` are set inline before
   this loads: QUOTES = [{id,theme,text,tag,light,dark}], CAST_IMAGES = ["../images/characters/...webp", ...] */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const QUOTES = window.QUOTES || [];
  const CAST_IMAGES = window.CAST_IMAGES || [];
  const byId = Object.fromEntries(QUOTES.map(q => [q.id, q]));

  /* ---------- theme filter tabs ---------- */
  const tabs = $$('.tab');
  const cards = $$('.qcard');
  const countEl = $('.count');
  function applyFilter(theme) {
    let shown = 0;
    cards.forEach(c => {
      const on = theme === 'All' || c.dataset.theme === theme;
      c.hidden = !on;
      if (on) shown++;
    });
    countEl.textContent = `${shown} quote${shown === 1 ? '' : 's'}${theme === 'All' ? '' : ` on ${theme}`}`;
    tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.theme === theme)));
  }
  tabs.forEach(t => t.addEventListener('click', () => applyFilter(t.dataset.theme)));

  /* ---------- shared canvas helpers ---------- */
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function fitQuote(ctx, text, family, weight, start, min, maxWidth, maxLines) {
    let size = start, lines;
    while (size > min) {
      ctx.font = `${weight} ${size}px ${family}`;
      lines = wrapLines(ctx, text, maxWidth);
      if (lines.length <= maxLines) break;
      size -= 3;
    }
    return { size, lines };
  }
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
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function silhouette(img, w, h, color) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  /* ---------- the poster: 1080x1350 (portrait, IG/Pinterest-ready) ---------- */
  async function drawPoster(q) {
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(hashCode(q.id));

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, q.light); grad.addColorStop(.45, '#FFF6EA'); grad.addColorStop(1, '#FFF6EA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 20; i++) {
      const x = rnd() * W, y = rnd() * H * .62;
      if (i % 2) heart(ctx, x, y, 18 + rnd() * 20, '#fff', .55);
      else spark(ctx, x, y, 16 + rnd() * 18, q.dark, .3);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; roundRect(ctx, W / 2 - 260, 70, 520, 64, 32); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 4; roundRect(ctx, W / 2 - 260, 70, 520, 64, 32); ctx.stroke();
    ctx.fillStyle = q.dark;
    ctx.font = '800 24px Nunito, sans-serif';
    ctx.fillText(`🍪 SUGAR VALLEY · ON ${q.theme.toUpperCase()}`, W / 2, 111, 480);

    ctx.font = '400 220px "Bagel Fat One", cursive';
    ctx.fillStyle = q.dark; ctx.globalAlpha = .22;
    ctx.fillText('“', W / 2, 400);
    ctx.globalAlpha = 1;

    const { size, lines } = fitQuote(ctx, q.text, '"Bagel Fat One", cursive', 400, 82, 40, 880, 6);
    ctx.font = `400 ${size}px "Bagel Fat One", cursive`;
    const lineH = size * 1.16;
    const blockH = lines.length * lineH;
    const startY = H / 2 - blockH / 2 + size * .38;
    ctx.fillStyle = '#4A2740';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH, 900));

    try {
      const idx = Math.abs(hashCode(q.id)) % CAST_IMAGES.length;
      const img = await loadImg(CAST_IMAGES[idx]);
      const boxSize = 190;
      const scale = Math.min(boxSize / img.width, boxSize / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      const cx = W - 150, cy = H - 210;
      const sil = silhouette(img, iw, ih, '#fff');
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        ctx.drawImage(sil, cx - iw / 2 + Math.cos(a) * 8, cy - ih / 2 + Math.sin(a) * 8, iw, ih);
      }
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    } catch (e) { /* mascot art unreachable from this origin; poster still works without it */ }

    ctx.font = '800 26px Nunito, sans-serif'; ctx.fillStyle = '#7A5570';
    ctx.fillText('Your Daily Dose of Love & Sweetness', W / 2, H - 60, 700);
    ctx.font = '700 24px Nunito, sans-serif'; ctx.fillStyle = q.dark;
    ctx.fillText(`#SugarValley ${q.tag}`, W / 2, H - 26, 700);
    return canvas;
  }

  function downloadCanvas(canvas, filename) {
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

  $$('.qcard').forEach(card => {
    const q = byId[card.dataset.id];
    if (!q) return;
    const dl = $('.qbtn.dl', card);
    const cp = $('.qbtn.cp', card);
    dl.addEventListener('click', async () => {
      dl.classList.add('busy'); dl.querySelector('.txt').textContent = 'Making…';
      try {
        const canvas = await drawPoster(q);
        await downloadCanvas(canvas, `sugar-valley-${q.id}.png`);
        dl.classList.add('done'); dl.querySelector('.txt').textContent = 'Saved! ✓';
      } catch (e) {
        dl.querySelector('.txt').textContent = 'Try again';
      } finally {
        dl.classList.remove('busy');
        setTimeout(() => { dl.classList.remove('done'); dl.querySelector('.txt').textContent = 'Download'; }, 2000);
      }
    });
    cp.addEventListener('click', async () => {
      const caption = `"${q.text}" 🍪 #SugarValley ${q.tag} #TheSweetestBakeOff`;
      try { await navigator.clipboard.writeText(caption); } catch (e) { /* clipboard unavailable */ }
      cp.classList.add('done'); cp.querySelector('.txt').textContent = 'Copied!';
      setTimeout(() => { cp.classList.remove('done'); cp.querySelector('.txt').textContent = 'Copy caption'; }, 1800);
    });
  });
})();
