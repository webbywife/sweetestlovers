/* Sugar Valley social-share plugin — one small reusable widget, dropped into any page.
   Usage:
     SugarShare.mount(container, {
       getCanvas: async () => canvas,   // the image to share (required for native share)
       filename:  'sugar-valley-x.png',
       title:     'Sugar Valley',
       text:      'caption to share',   // used as the tweet/WhatsApp text and image alt
       pageUrl:   'https://sugarvalley.webprvw.xyz/...#id', // what platform links point at
     });
   Renders: native Share (Web Share API, image + text, where the browser supports it) plus
   Facebook / X / WhatsApp / Pinterest fallback links that always work (they share the page
   URL + caption — platforms other than native share can't accept a client-only image that
   was never uploaded anywhere, so the page itself carries the content). */
window.SugarShare = (() => {
  'use strict';

  const ICONS = {
    native: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V5.5h-3C11.5 5.5 10 7.1 10 9.6V12H7.5v3.5H10V22h3.5v-6.5H16l.5-3.5h-3V9.9c0-.6.3-.9.9-.9z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3l7.2 9.6L4.3 21h2.3l5.8-6.6 4.6 6.6H21l-7.5-10.1L20 3h-2.3l-5.3 6-4.2-6H4z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.5-1.2A9 9 0 1 0 12 3zm0 16.3a7.3 7.3 0 0 1-3.7-1l-.3-.2-2.7.7.7-2.6-.2-.3A7.3 7.3 0 1 1 12 19.3zm4-5.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.9-.3-1.7-1-.6-.6-1-1.3-1.2-1.5-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4 0-.1 0-.3 0-.4C10.5 9.4 10 8.2 9.8 8c-.2-.4-.3-.3-.5-.3h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.1 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.5.2 1 .1 1.3-.1.4-.2 1.3-.5 1.5-1 .2-.5.2-.9.1-1z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.7.2-2.5l1.4-6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.1 1.7 2.1 2.1 0 3.6-2.7 3.6-5.8 0-2.4-1.6-4.2-4.6-4.2-3.3 0-5.4 2.5-5.4 5.2 0 1 .3 1.7.8 2.2.2.2.2.4.2.7-.1.3-.2.8-.3 1-.1.2-.2.3-.5.2-1.4-.6-2-2.1-2-3.9 0-2.9 2.4-6.4 7.3-6.4 3.9 0 6.5 2.8 6.5 5.9 0 4-2.2 7-5.5 7-1.1 0-2.1-.6-2.5-1.2l-.7 2.6c-.2.9-.7 1.9-1.1 2.6A10 10 0 1 0 12 2z"/></svg>',
  };

  function svg(name, extraClass = '') {
    return `<svg class="si ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name].match(/<svg[^>]*>(.*)<\/svg>/s)[1]}</svg>`;
  }

  function mount(container, opts) {
    const { getCanvas, filename = 'sugar-valley.png', title = 'Sugar Valley', text = '', pageUrl = location.href } = opts;
    const row = document.createElement('div');
    row.className = 'share-row';

    const canShareFiles = !!(navigator.canShare && navigator.share);
    if (canShareFiles) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'sbtn native'; btn.title = 'Share';
      btn.innerHTML = svg('native') + '<span class="stxt">Share</span>';
      btn.addEventListener('click', async () => {
        try {
          const canvas = await getCanvas();
          const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text });
          } else {
            await navigator.share({ title, text, url: pageUrl });
          }
        } catch (e) { /* user cancelled the native share sheet, or it's unsupported here — the platform links below still work */ }
      });
      row.append(btn);
    }

    const enc = encodeURIComponent;
    const links = [
      { key: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(pageUrl)}`, label: 'Facebook' },
      { key: 'x', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(pageUrl)}`, label: 'X' },
      { key: 'whatsapp', href: `https://wa.me/?text=${enc(text + ' ' + pageUrl)}`, label: 'WhatsApp' },
      { key: 'pinterest', href: `https://pinterest.com/pin/create/button/?url=${enc(pageUrl)}&description=${enc(text)}`, label: 'Pinterest' },
    ];
    links.forEach(l => {
      const a = document.createElement('a');
      a.className = `sbtn ${l.key}`; a.href = l.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.title = `Share on ${l.label}`; a.setAttribute('aria-label', `Share on ${l.label}`);
      a.innerHTML = svg(l.key);
      row.append(a);
    });

    container.append(row);
    return row;
  }

  return { mount };
})();
