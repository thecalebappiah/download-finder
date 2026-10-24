(() => {
  if (window.__dlFinder) { window.__dlFinder.toggle(); return; }

  const FILE_EXT = /\.(zip|rar|7z|tar|gz|tgz|bz2|xz|exe|msi|dmg|pkg|deb|rpm|appimage|apk|ipa|iso|img|bin|pdf|epub|mobi|docx?|xlsx?|pptx?|csv|mp3|mp4|mkv|avi|mov|torrent|jar|whl|ttf|otf)$/i;
  const DL_TEXT = /\b(download|télécharger|descargar|herunterladen|scarica|baixar)\b/i;
  const AD_ATTR = /(^|[\s_-])(ad|ads|adv|advert|advertisement|banner|sponsor|sponsored|promo|taboola|outbrain|adsbygoogle|popunder|affiliate|partner)([\s_-]|$)/i;
  const BAIT_TEXT = /\b(fast|faster|high[\s-]?speed|your pc|virus|speed up|scan|play now|watch|click here|install now|update now|cleaner|vpn|free download now|start now)\b/i;
  const SELECTOR = 'a[href], button, input[type=button], input[type=submit], [role=button]';
  const MARK = 'data-dlf';

  const siteKey = (h) => h.split('.').slice(-2).join('.');
  const textOf = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.05;
  }

  function analyze(el) {
    const text = textOf(el);
    const pos = []; const neg = [];
    let p = 0, n = 0;
    const add = (list, label, pts, isPos) => { list.push(label); if (isPos) p += pts; else n += pts; };

    let url = null;
    if (el.tagName === 'A') { try { url = new URL(el.href, location.href); } catch {} }

    const hasDlAttr = el.hasAttribute('download');
    const isFile = url && FILE_EXT.test(url.pathname);
    const textHit = DL_TEXT.test(text);
    const pathHit = url && /\/(download|dl|get|releases?)\b/i.test(url.pathname);
    if (!(hasDlAttr || isFile || textHit || pathHit)) return null;

    if (hasDlAttr) add(pos, 'Has a download attribute', 50, true);
    if (isFile) add(pos, 'Links straight to a file (' + url.pathname.split('.').pop().toLowerCase() + ')', 40, true);
    if (textHit) add(pos, 'Says “download”', 20, true);
    if (/^(download|download now|download file|télécharger)$/i.test(text)) add(pos, 'Plain, simple label', 5, true);
    if (pathHit) add(pos, 'Download-style URL path', 10, true);

    if (url) {
      const same = url.hostname === location.hostname || siteKey(url.hostname) === siteKey(location.hostname);
      if (same) add(pos, 'Stays on this site', 10, true);
      else if (!isFile && !hasDlAttr) add(neg, 'Goes to another site (' + url.hostname + ')', 30, false);
      if (el.target === '_blank' && !same && !isFile) add(neg, 'Opens a new tab to another site', 15, false);
    }
    if (/window\.open|popunder|location\.href/i.test(el.getAttribute('onclick') || '')) add(neg, 'Script-driven redirect', 20, false);
    if (BAIT_TEXT.test(text)) add(neg, 'Bait wording (“' + text.slice(0, 30) + '”)', 25, false);

    let adAncestor = false;
    for (let a = el, i = 0; a && a !== document.body && i < 8; a = a.parentElement, i++) {
      const sig = (a.id || '') + ' ' + (typeof a.className === 'string' ? a.className : '') + ' ' + (a.getAttribute('data-ad') || '');
      if (AD_ATTR.test(sig) || a.tagName === 'INS') { adAncestor = true; break; }
    }
    if (adAncestor) add(neg, 'Sits inside an ad container', 40, false);

    if (el.closest('main, article, [role=main]')) add(pos, 'In the main content area', 5, true);

    return { el, text: text || '(no label)', pos, neg, score: p - n, suspect: n >= 30 && n >= p - 20 };
  }

  function scan() {
    clearMarks();
    const results = [];
    document.querySelectorAll(SELECTOR).forEach((el) => {
      if (!visible(el)) return;
      const r = analyze(el);
      if (r) results.push(r);
    });
    const good = results.filter((r) => !r.suspect && r.score >= 20).sort((a, b) => b.score - a.score).slice(0, 4);
    const bad = results.filter((r) => r.suspect).sort((a, b) => b.score - a.score).slice(0, 6);
    return { good, bad };
  }

  // ---- highlighting ----
  const saved = new Map();
  function mark(el, color, dashed) {
    if (!saved.has(el)) saved.set(el, el.getAttribute('style'));
    el.setAttribute(MARK, '1');
    el.style.setProperty('outline', `4px ${dashed ? 'dashed' : 'solid'} ${color}`, 'important');
    el.style.setProperty('outline-offset', '3px', 'important');
  }
  function clearMarks() {
    saved.forEach((style, el) => {
      if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style);
      el.removeAttribute(MARK);
    });
    saved.clear();
  }
  function focusEl(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 });
  }

  // ---- panel ----
  let host, root;
  const css = `
    :host { all: initial; }
    .panel { position: fixed; top: 16px; right: 16px; width: 320px; max-height: 80vh; overflow: auto; z-index: 2147483647;
      font: 14px/1.4 system-ui, sans-serif; background: #fff; color: #1a1a1a; border: 1px solid #d0d0d0; border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,.25); padding: 12px; }
    @media (prefers-color-scheme: dark) { .panel { background: #1f1f23; color: #eee; border-color: #444; } .item { border-color: #444 !important; } }
    h2 { margin: 0 0 8px; font-size: 15px; display: flex; justify-content: space-between; align-items: center; }
    h3 { margin: 12px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; opacity: .7; }
    .item { border: 1px solid #ddd; border-radius: 8px; padding: 8px; margin-bottom: 6px; }
    .item.best { border-color: #1a9d4a; border-width: 2px; }
    .item.bad { border-color: #d33; border-style: dashed; }
    .label { font-weight: 600; word-break: break-word; }
    .why { font-size: 12px; opacity: .8; margin: 4px 0 6px; padding-left: 16px; }
    .why li.n { color: #d33; }
    button { font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #888; background: transparent; color: inherit; cursor: pointer; margin-right: 6px; }
    button.primary { background: #1a9d4a; border-color: #1a9d4a; color: #fff; }
    .x { border: none; font-size: 18px; padding: 0 4px; margin: 0; }
    .empty { opacity: .8; }
  `;

  function render() {
    const { good, bad } = scan();
    root.innerHTML = `<style>${css}</style><div class="panel"></div>`;
    const panel = root.querySelector('.panel');
    const head = document.createElement('h2');
    head.innerHTML = '<span>Download button finder</span>';
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Close';
    x.onclick = close; head.appendChild(x); panel.appendChild(head);

    if (!good.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = 'No trustworthy download button found yet. It may appear after a countdown or scroll. Try “Rescan”.';
      panel.appendChild(e);
    } else {
      const h = document.createElement('h3'); h.textContent = 'Most likely real'; panel.appendChild(h);
      good.forEach((r, i) => { mark(r.el, '#1a9d4a', false); panel.appendChild(card(r, i === 0 ? 'best' : '')); });
      focusEl(good[0].el);
    }
    if (bad.length) {
      const h = document.createElement('h3'); h.textContent = 'Likely fake / ads (avoid)'; panel.appendChild(h);
      bad.forEach((r) => { mark(r.el, '#d33', true); panel.appendChild(card(r, 'bad')); });
    }
    const rescan = document.createElement('button'); rescan.textContent = 'Rescan'; rescan.onclick = render;
    panel.appendChild(rescan);
  }

  function card(r, cls) {
    const d = document.createElement('div'); d.className = 'item ' + cls;
    const l = document.createElement('div'); l.className = 'label'; l.textContent = r.text; d.appendChild(l);
    const ul = document.createElement('ul'); ul.className = 'why';
    r.pos.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    r.neg.forEach((t) => { const li = document.createElement('li'); li.className = 'n'; li.textContent = t; ul.appendChild(li); });
    d.appendChild(ul);
    const show = document.createElement('button'); show.textContent = 'Show'; show.onclick = () => focusEl(r.el); d.appendChild(show);
    if (cls !== 'bad') {
      const go = document.createElement('button'); go.className = 'primary'; go.textContent = 'Click it'; go.onclick = () => r.el.click(); d.appendChild(go);
    }
    return d;
  }

  function open() {
    host = document.createElement('div'); host.id = 'dl-finder-host';
    root = host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(host);
    render();
  }
  function close() { clearMarks(); host?.remove(); host = null; }
  function toggle() { host ? close() : open(); }

  window.__dlFinder = { toggle };
  open();
})();
