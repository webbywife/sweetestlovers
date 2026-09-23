/* Shared behavior for every Sugar Valley character page.
   Each page sets `window.PROFILE` before loading this script:
   { slug, name, role, light, dark, cards: [{key,label,img,quote,source,tag,captions:[...]}] } */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const P = window.PROFILE;
  if (!P) return;

  const stageImg = $('.pstage img');
  const badge = $('.mood-badge');
  const qtext = $('.qtext');
  const qsource = $('.qsource');
  const capWrap = $('.qcaptions');
  let current = P.cards[0];

  function render(card, push) {
    current = card;
    stageImg.classList.add('swap');
    setTimeout(() => {
      stageImg.src = card.img;
      stageImg.alt = `${P.name} — ${card.label}`;
      stageImg.classList.remove('swap');
    }, card.img === stageImg.src ? 0 : 140);
    badge.textContent = card.label;
    qtext.textContent = card.quote;
    qsource.textContent = card.source === 'book' ? 'From The Sweetest Bake-Off' : 'A Sugar Valley original';
    $$('.pick').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === card.key)));
    $$('.mini').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === card.key)));
    capWrap.innerHTML = card.captions.map((c, i) =>
      `<div class="qcap"><span>${c}</span><button type="button" data-i="${i}">Copy</button></div>`).join('');
    capWrap.classList.remove('open');
    if (push) history.replaceState(null, '', `#${card.key}`);
  }

  $$('.pick, .mini').forEach(b => b.addEventListener('click', () => {
    const card = P.cards.find(c => c.key === b.dataset.key);
    if (card) render(card, true);
  }));

  const startKey = location.hash.replace('#', '');
  render(P.cards.find(c => c.key === startKey) || P.cards[0], false);

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* clipboard truly unavailable; button just won't confirm */ }
      ta.remove();
    }
    if (btn) {
      const was = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = was; }, 1600);
    }
  }

  $('.qbtn.copy').addEventListener('click', e => {
    capWrap.classList.toggle('open');
  });
  capWrap.addEventListener('click', e => {
    const btn = e.target.closest('button[data-i]');
    if (!btn) return;
    copyText(current.captions[Number(btn.dataset.i)], btn);
  });

  /* ---------- shareable quote card, drawn on a hidden canvas ---------- */
  function wrapLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function heart(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(12, 21);
    ctx.bezierCurveTo(5, 15, 1, 11.5, 1, 7);
    ctx.bezierCurveTo(1, 3.6, 3.7, 1.5, 6.5, 1.5);
    ctx.bezierCurveTo(9, 1.5, 11, 3, 12, 5);
    ctx.bezierCurveTo(13, 3, 15, 1.5, 17.5, 1.5);
    ctx.bezierCurveTo(20.3, 1.5, 23, 3.6, 23, 7);
    ctx.bezierCurveTo(23, 11.5, 19, 15, 12, 21);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  async function drawCard(card) {
    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#FFF6EA');
    grad.addColorStop(.55, P.light + '55');
    grad.addColorStop(1, P.light);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // scattered hearts + dots, kept off the card center
    const rnd = mulberry32(hashCode(P.slug + card.key));
    for (let i = 0; i < 16; i++) {
      const x = rnd() * W, y = rnd() * 300;
      if (x > 300 && x < 780) continue;
      heart(ctx, x, y, 16 + rnd() * 18, i % 2 ? '#fff' : P.dark + '33');
    }

    // top ribbon: brand + tagline
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    roundRect(ctx, W / 2 - 300, 34, 600, 74, 37); ctx.fill();
    ctx.strokeStyle = P.dark; ctx.lineWidth = 5; roundRect(ctx, W / 2 - 300, 34, 600, 74, 37); ctx.stroke();
    ctx.fillStyle = P.dark;
    ctx.font = '700 30px Nunito, sans-serif';
    ctx.fillText('🍪 SUGAR VALLEY', W / 2, 72, 560);
    ctx.font = '800 17px Nunito, sans-serif';
    ctx.fillStyle = '#B4557F';
    ctx.fillText('Your Daily Dose of Love & Sweetness', W / 2, 96, 560);

    // character art
    try {
      const img = await loadImg(card.img);
      const maxW = 560, maxH = 480;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.save();
      ctx.shadowColor = 'rgba(122,75,69,.28)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 10;
      ctx.drawImage(img, W / 2 - iw / 2, 158, iw, ih);
      ctx.restore();
    } catch (e) { /* image not reachable from this origin; card still renders without it */ }

    // mood pill
    ctx.font = '800 26px Nunito, sans-serif';
    const pillText = card.label.toUpperCase();
    const pillW = ctx.measureText(pillText).width + 64;
    roundRect(ctx, W / 2 - pillW / 2, 600, pillW, 52, 26); ctx.fillStyle = P.dark; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(pillText, W / 2, 636);

    // quote card
    ctx.font = '800 40px Nunito, sans-serif';
    const lines = wrapLines(ctx, `“${card.quote.replace(/[“”]/g, '')}”`, 860);
    const lineH = 52;
    const boxH = 90 + lines.length * lineH + 70;
    const boxY = 676;
    ctx.fillStyle = '#fff';
    roundRect(ctx, 90, boxY, 900, boxH, 34); ctx.fill();
    ctx.strokeStyle = P.dark; ctx.lineWidth = 5; roundRect(ctx, 90, boxY, 900, boxH, 34); ctx.stroke();
    ctx.fillStyle = '#4A2740';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, boxY + 70 + i * lineH, 860));
    ctx.font = '700 24px Nunito, sans-serif';
    ctx.fillStyle = '#7A5570';
    ctx.fillText(`— ${P.name}`, W / 2, boxY + 70 + lines.length * lineH + 40);

    // bottom tag
    ctx.font = '700 22px Nunito, sans-serif';
    ctx.fillStyle = P.dark;
    ctx.fillText(`${card.tag}  ·  #TheSweetestBakeOff #SugarValley`, W / 2, H - 34, 900);

    return canvas;
  }

  function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const dlBtn = $('.qbtn.dl');
  dlBtn.addEventListener('click', async () => {
    dlBtn.classList.add('busy'); dlBtn.querySelector('.txt').textContent = 'Preparing…';
    try {
      const canvas = await drawCard(current);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const filename = `${P.slug}-${current.key}-sugar-valley.png`;
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          navigator.share({ files: [new File([blob], filename, { type: 'image/png' })], title: `${P.name} — ${current.label}`, text: current.captions[0] }).catch(() => {});
        } else {
          const a = document.createElement('a');
          a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        dlBtn.classList.add('done');
        setTimeout(() => dlBtn.classList.remove('done'), 1800);
      }, 'image/png');
    } finally {
      dlBtn.classList.remove('busy'); dlBtn.querySelector('.txt').textContent = 'Download shareable image';
    }
  });
})();

/* ---------- hub "Share" buttons: one tap makes + downloads a quote card for characters
   that don't have a full profile page (image + name + category + personality, no quote) ---------- */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('.share')];
  if (!buttons.length) return;

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
  async function drawSweetheartCard(d) {
    const W = 1080, H = 1080;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#FFF6EA'); grad.addColorStop(.55, d.tone + '55'); grad.addColorStop(1, d.tone);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; roundRect(ctx, W / 2 - 300, 34, 600, 74, 37); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 5; roundRect(ctx, W / 2 - 300, 34, 600, 74, 37); ctx.stroke();
    ctx.fillStyle = '#7A4B45'; ctx.font = '700 30px Nunito, sans-serif'; ctx.fillText('🍪 SUGAR VALLEY', W / 2, 72, 560);
    ctx.font = '800 17px Nunito, sans-serif'; ctx.fillStyle = '#B4557F';
    ctx.fillText('Your Daily Dose of Love & Sweetness', W / 2, 96, 560);
    try {
      const img = await loadImg(d.img);
      const maxW = 620, maxH = 520;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.drawImage(img, W / 2 - iw / 2, 168, iw, ih);
    } catch (e) { /* image unreachable from this origin; card still renders without it */ }
    ctx.font = '800 26px Nunito, sans-serif';
    const pillText = d.category.toUpperCase();
    const pillW = ctx.measureText(pillText).width + 64;
    roundRect(ctx, W / 2 - pillW / 2, 630, pillW, 52, 26); ctx.fillStyle = '#7A4B45'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(pillText, W / 2, 666);
    ctx.font = '400 60px "Bagel Fat One", cursive'; ctx.fillStyle = '#4A2740';
    ctx.fillText(d.name, W / 2, 750, 900);
    ctx.font = '700 34px Nunito, sans-serif';
    const lines = wrapLines(ctx, d.vibe, 820);
    const lineH = 44; const boxH = 60 + lines.length * lineH + 30; const boxY = 790;
    ctx.fillStyle = '#fff'; roundRect(ctx, 110, boxY, 860, boxH, 32); ctx.fill();
    ctx.strokeStyle = '#7A4B45'; ctx.lineWidth = 5; roundRect(ctx, 110, boxY, 860, boxH, 32); ctx.stroke();
    ctx.fillStyle = '#7A5570'; ctx.font = '700 italic 32px Nunito, sans-serif';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, boxY + 54 + i * lineH, 820));
    ctx.font = '700 22px Nunito, sans-serif'; ctx.fillStyle = '#7A4B45';
    ctx.fillText('#TheSweetestBakeOff #SugarValley', W / 2, H - 34, 900);
    return canvas;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.pcard');
      const d = {
        name: card.dataset.name, category: card.dataset.category, vibe: card.dataset.vibe,
        img: card.querySelector('.art img').getAttribute('src'), tone: card.style.getPropertyValue('--tone').trim() || '#FFB3C7'
      };
      const caption = `Meet ${d.name} — ${d.vibe}. 🍪 One of Sugar Valley's sweethearts! #SugarValley #TheSweetestBakeOff`;
      btn.classList.add('busy'); btn.querySelector('.txt').textContent = 'Making…';
      try {
        const canvas = await drawSweetheartCard(d);
        canvas.toBlob(async blob => {
          const filename = `${card.dataset.slug}-sugar-valley.png`;
          try { await navigator.clipboard.writeText(caption); } catch (e) { /* clipboard unavailable; image still downloads */ }
          if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
            navigator.share({ files: [new File([blob], filename, { type: 'image/png' })], title: d.name, text: caption }).catch(() => {});
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          }
          btn.classList.add('done'); btn.querySelector('.txt').textContent = 'Saved + caption copied!';
          setTimeout(() => { btn.classList.remove('done', 'busy'); btn.querySelector('.txt').textContent = 'Share'; }, 2200);
        }, 'image/png');
      } catch (e) {
        btn.classList.remove('busy'); btn.querySelector('.txt').textContent = 'Share';
      }
    });
  });
})();
