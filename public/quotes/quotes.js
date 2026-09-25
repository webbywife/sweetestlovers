/* Sugar Valley quote posters. `window.QUOTES` and `window.CAST_BY_THEME` are set inline before
   this loads: QUOTES = [{id,theme,text,tag,light,dark}], CAST_BY_THEME = {theme: ["../images/characters/...webp", ...]} */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const QUOTES = window.QUOTES || [];
  const CAST_BY_THEME = window.CAST_BY_THEME || {};
  const byId = Object.fromEntries(QUOTES.map(q => [q.id, q]));
  const canvasCache = new Map(); // quote id -> rendered canvas, so the preview and the download share one render

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
  /* ---------- line-art decoration kit: every background motif is stroke-only, never filled,
     so it reads as delicate kawaii linework instead of flat clip-art shapes ---------- */
  function withStroke(ctx, x, y, s, rot, color, alpha, width, draw) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.lineWidth = width / s; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    draw(ctx); ctx.restore();
  }
  function lineHeart(ctx, x, y, s, color, alpha = 1, rot = 0) {
    withStroke(ctx, x, y, s / 24, rot, color, alpha, 6, c => {
      c.beginPath(); c.moveTo(12, 21);
      c.bezierCurveTo(5, 15, 1, 11.5, 1, 7); c.bezierCurveTo(1, 3.6, 3.7, 1.5, 6.5, 1.5);
      c.bezierCurveTo(9, 1.5, 11, 3, 12, 5); c.bezierCurveTo(13, 3, 15, 1.5, 17.5, 1.5);
      c.bezierCurveTo(20.3, 1.5, 23, 3.6, 23, 7); c.bezierCurveTo(23, 11.5, 19, 15, 12, 21);
      c.closePath(); c.stroke();
    });
  }
  function lineStar(ctx, x, y, s, color, alpha = 1, rot = 0) {
    withStroke(ctx, x, y, s / 24, rot, color, alpha, 5.5, c => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2, r = i % 2 === 0 ? 12 : 5;
        const px = 12 + Math.cos(a) * r, py = 12 + Math.sin(a) * r;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.closePath(); c.stroke();
    });
  }
  function lineCloud(ctx, x, y, s, color, alpha = 1, rot = 0) {
    withStroke(ctx, x, y, s / 60, rot, color, alpha, 3.2, c => {
      c.beginPath();
      c.moveTo(10, 42);
      c.bezierCurveTo(-4, 42, -4, 22, 10, 21);
      c.bezierCurveTo(11, 8, 30, 6, 36, 17);
      c.bezierCurveTo(48, 12, 60, 22, 54, 33);
      c.bezierCurveTo(62, 34, 62, 44, 52, 44);
      c.lineTo(10, 44); c.closePath(); c.stroke();
    });
  }
  function lineRainbow(ctx, x, y, s, colors, alpha = 1, rot = 0) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 100, s / 100);
    ctx.lineCap = 'round';
    colors.forEach((c, i) => {
      const r = Math.max(4, 40 - i * 8); // must stay positive — arc() throws on r <= 0
      ctx.beginPath();
      ctx.strokeStyle = c; ctx.lineWidth = 7;
      ctx.arc(0, 0, r, Math.PI, 2 * Math.PI);
      ctx.stroke();
    });
    ctx.restore();
  }
  function lineFlower(ctx, x, y, s, color, alpha = 1, rot = 0) {
    withStroke(ctx, x, y, s / 30, rot, color, alpha, 3, c => {
      for (let i = 0; i < 6; i++) {
        c.save(); c.rotate((Math.PI / 3) * i);
        c.beginPath(); c.ellipse(0, -10, 6, 10, 0, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
      c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.stroke();
    });
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

  /* ---------- the poster: 1080x1350 (portrait, IG/Pinterest-ready) ----------
     Restructured after a reference (@komal_reads-style quote carousels): clean stacked
     zones, not overlapping ones — a bold top-anchored headline, a heart divider, then a
     full illustrated "stage" below that's composed to fill its zone (a ground platform +
     concentrated scenery under the characters), not 2-3 small icons adrift in empty
     canvas. Layout is fully computed before anything is drawn. */
  async function drawPoster(q) {
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const rnd = mulberry32(hashCode(q.id));
    ctx.textAlign = 'center';

    // 1) quote text — the headline, top-anchored, clean (nothing overlaps it)
    const headerBottom = 150, footerTop = H - 100;
    const dividerY = headerBottom + 34;
    const textTop = dividerY + 90;
    ctx.font = '400 74px "Bagel Fat One", cursive'; // fitQuote resets this per candidate size anyway
    const { size, lines } = fitQuote(ctx, q.text, '"Bagel Fat One", cursive', 400, 74, 38, 860, 5);
    const lineH = size * 1.16;
    const textBottom = textTop + size * .82 + (lines.length - 1) * lineH + size * .3;

    // 2) the illustrated stage: everything from the divider-under-the-quote down to the
    // footer is ONE composed scene — a ground platform under 2-3 theme-matched characters,
    // with scenery concentrated around them so the zone reads as full, not empty
    const stageDividerY = textBottom + 46;
    const stageTop = stageDividerY + 40;
    const pool = (CAST_BY_THEME[q.theme] || []).slice();
    const count = pool.length >= 3 && rnd() > .35 ? 3 : Math.min(2, pool.length);
    const chosen = [];
    for (let i = 0; i < count && pool.length; i++) chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const positions = count === 3
      ? [{ dx: -220, dy: 10, box: 230 }, { dx: 220, dy: 10, box: 230 }, { dx: 0, dy: -25, box: 290 }]
      : count === 2
        ? [{ dx: -170, dy: 0, box: 270 }, { dx: 170, dy: 0, box: 270 }]
        : [{ dx: 0, dy: 0, box: 290 }];
    const platformW = Math.max(...positions.map(p => Math.abs(p.dx))) * 2 + 260;
    const platformH = 60;
    // the platform's vertical center sits right at the characters' feet line, so its top
    // half is hidden behind their legs (grounded) and its bottom half shows as a stage lip
    const feetOffset = Math.max(...positions.map(p => p.dy + p.box / 2));
    const topOffset = Math.min(...positions.map(p => p.dy - p.box / 2));
    const relTop = topOffset, relBottom = feetOffset + platformH / 2;
    const available = footerTop - stageTop;
    const platformCy = stageTop + Math.max(20, (available - (relBottom - relTop)) / 2) - relTop;

    // 3) background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, q.light); grad.addColorStop(.4, '#FFF6EA'); grad.addColorStop(1, '#FFF6EA');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // decoration lives ONLY inside the stage zone now, clustered around the platform so
    // the illustration reads as one full scene instead of scattered confetti
    const PASTELS = ['#FFB3C7', '#FFD0B0', '#A8E6CF', '#BFE5F7', '#D9CCF5'];
    const scene = Math.floor(rnd() * 4); // 0 clouds · 1 stars · 2 rainbow · 3 flowers
    const stageInClear = (x, y) =>
      y > platformCy + topOffset - 30 && y < platformCy + feetOffset + platformH / 2 + 30 &&
      x > W / 2 - platformW / 2 - 40 && x < W / 2 + platformW / 2 + 40;
    const scatterStage = (n, draw) => {
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          x = W / 2 + (rnd() - .5) * (platformW + 420);
          y = stageTop + rnd() * (footerTop - stageTop - 20);
          tries++;
        } while (stageInClear(x, y) && tries < 8);
        draw(x, y, i);
      }
    };
    if (scene === 0) {
      scatterStage(9, (x, y) => lineCloud(ctx, x, y, 65 + rnd() * 80, rnd() > .5 ? '#fff' : q.dark, .4 + rnd() * .3));
    } else if (scene === 1) {
      scatterStage(13, (x, y) => lineStar(ctx, x, y, 18 + rnd() * 24, rnd() > .5 ? '#fff' : q.dark, .45 + rnd() * .35, rnd() * Math.PI));
    } else if (scene === 2) {
      lineRainbow(ctx, W / 2, stageTop - 10, 3.6 + rnd() * .6, PASTELS, .9, 0);
      scatterStage(8, (x, y) => lineStar(ctx, x, y, 16 + rnd() * 18, '#fff', .4 + rnd() * .3, rnd() * Math.PI));
    } else {
      scatterStage(10, (x, y) => lineFlower(ctx, x, y, 36 + rnd() * 30, PASTELS[Math.floor(rnd() * PASTELS.length)], .55 + rnd() * .3, rnd() * Math.PI));
    }
    scatterStage(8, (x, y) => lineHeart(ctx, x, y, 15 + rnd() * 16, '#fff', .45 + rnd() * .25, (rnd() - .5) * .6));

    // a couple of quiet accents up in the headline zone too, so it isn't bare
    lineHeart(ctx, W / 2, dividerY - 120, 20, q.dark, .18, 0);

    // 4) the ground platform + character group — one composed little scene
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.fillStyle = q.light;
    roundRect(ctx, W / 2 - platformW / 2, platformCy + feetOffset - platformH / 2, platformW, platformH, platformH / 2);
    ctx.fill();
    ctx.restore();

    const stampDieCut = (img, cx, cy, boxSize) => {
      const scale = Math.min(boxSize / img.width, boxSize / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      const sil = silhouette(img, iw, ih, '#fff');
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        ctx.drawImage(sil, cx - iw / 2 + Math.cos(a) * 9, cy - ih / 2 + Math.sin(a) * 9, iw, ih);
      }
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    };
    try {
      const imgs = await Promise.all(chosen.map(loadImg));
      imgs.forEach((img, i) => stampDieCut(img, W / 2 + positions[i].dx, platformCy + positions[i].dy, positions[i].box));
    } catch (e) { /* character art unreachable from this origin; poster still works without it */ }

    // 5) header pill + heart divider + quote headline
    ctx.fillStyle = '#fff'; roundRect(ctx, W / 2 - 260, 70, 520, 64, 32); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 4; roundRect(ctx, W / 2 - 260, 70, 520, 64, 32); ctx.stroke();
    ctx.fillStyle = q.dark;
    ctx.font = '800 24px Nunito, sans-serif';
    ctx.fillText(`🍪 SUGAR VALLEY · ON ${q.theme.toUpperCase()}`, W / 2, 111, 480);
    lineHeart(ctx, W / 2, dividerY, 22, q.dark, .55, 0);

    ctx.font = `400 ${size}px "Bagel Fat One", cursive`;
    ctx.fillStyle = '#4A2740';
    const firstBaseline = textTop + size * .82;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, firstBaseline + i * lineH, 900));

    // 6) the divider between quote and illustration — a thin line with a heart at center,
    // echoing the reference's "headline / body" separator
    ctx.strokeStyle = q.dark; ctx.globalAlpha = .35; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 220, stageDividerY); ctx.lineTo(W / 2 - 24, stageDividerY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 24, stageDividerY); ctx.lineTo(W / 2 + 220, stageDividerY); ctx.stroke();
    ctx.globalAlpha = 1;
    lineHeart(ctx, W / 2, stageDividerY - 6, 20, q.dark, .7, 0);

    // 7) footer
    ctx.font = '800 26px Nunito, sans-serif'; ctx.fillStyle = '#7A5570';
    ctx.fillText('Your Daily Dose of Love & Sweetness', W / 2, H - 60, 700);
    ctx.font = '700 24px Nunito, sans-serif'; ctx.fillStyle = q.dark;
    ctx.fillText(`#SugarValley ${q.tag}`, W / 2, H - 26, 700);
    return canvas;
  }

  /** Draws once per quote and reuses the result — the visible preview and the eventual
      download are always pixel-identical, and clicking Download after the preview has
      already rendered is instant. */
  async function getOrDrawPoster(q) {
    if (!canvasCache.has(q.id)) canvasCache.set(q.id, drawPoster(q));
    return canvasCache.get(q.id);
  }

  /* ---------- lazy preview: render a card's poster once it scrolls near view ---------- */
  const previewObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      obs.unobserve(card);
      const q = byId[card.dataset.id];
      const box = $('.preview', card);
      if (!q || !box) return;
      getOrDrawPoster(q).then(canvas => {
        const img = new Image();
        img.alt = `Preview of the ${q.theme} poster: “${q.text}”`;
        img.src = canvas.toDataURL('image/png');
        box.replaceChildren(img);
        box.classList.add('ready');
      }).catch(() => { box.classList.add('failed'); });
    });
  }, { rootMargin: '400px 0px' });
  $$('.qcard').forEach(card => previewObserver.observe(card));

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
        const canvas = await getOrDrawPoster(q);
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

    if (window.SugarShare) {
      const pageUrl = `${location.origin}${location.pathname}#${q.id}`;
      SugarShare.mount($('.actions', card), {
        getCanvas: () => getOrDrawPoster(q),
        filename: `sugar-valley-${q.id}.png`,
        title: 'Sugar Valley',
        text: `"${q.text}" 🍪 #SugarValley ${q.tag} #TheSweetestBakeOff`,
        pageUrl,
      });
    }
  });

  /* a shared link (#quote-id) scrolls to and briefly highlights that card */
  if (location.hash) {
    const target = document.querySelector(`.qcard[data-id="${location.hash.slice(1)}"]`);
    if (target) {
      target.hidden = false;
      setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target.classList.add('pulse');
        setTimeout(() => target.classList.remove('pulse'), 2200);
      }, 300);
    }
  }
})();
