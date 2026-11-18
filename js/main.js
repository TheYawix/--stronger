/* ============================================================
   w1cwmdev — Motion Engine & App Logic (Polar Night 2.0)
   ============================================================ */

(() => {
  'use strict';

  document.documentElement.classList.add('js-ready');

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const damp = (a, b, k) => a + (b - a) * k;

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(text, type = 'info') {
    const root = $('#toast-root');
    if (!root) return;
    const icon = type === 'error'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>';
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon}<span>${text}</span>`;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  function initConfigInjection() {
    if (typeof SITE === 'undefined') return;
    const tg = SITE.telegram;
    if (tg) {
      $$('[data-telegram-link]').forEach(a => a.setAttribute('href', `https://t.me/${tg}`));
      $$('[data-telegram-name]').forEach(el => { el.textContent = `@${tg}`; });
    }
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function initHeader() {
    const header = $('#site-header');
    const burger = $('#burger');
    const menu   = $('#mobile-menu');
    const toggle = (open) => {
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
    };

    const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (burger && menu) {
      burger.addEventListener('click', () => toggle(burger.getAttribute('aria-expanded') !== 'true'));
      $$('.nav-link', menu).forEach(a => a.addEventListener('click', () => toggle(false)));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
      window.addEventListener('resize', () => { if (window.innerWidth >= 768) toggle(false); });
    }
  }

  function initSnowToggle() {
    const btn = $('#snow-toggle');
    if (!btn) return;
    const sync = () => {
      const on = window.__snowfall ? window.__snowfall.running : true;
      btn.setAttribute('aria-pressed', String(on));
      btn.style.opacity = on ? '1' : '.5';
    };
    sync();
    btn.addEventListener('click', () => {
      if (!window.__snowfall) return;
      const on = window.__snowfall.toggle();
      localStorage.setItem('frost-snow', on ? '1' : '0');
      sync();
      toast(on ? 'Снег включён' : 'Снег выключен');
    });
  }

  function initStars() {
    const root = $('#stars');
    if (!root) return;
    const n = window.innerWidth < 640 ? 45 : 85;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const size = (1 + Math.random() * 1.8).toFixed(1);
      s.className = 'star';
      s.style.cssText = `width:${size}px;height:${size}px;left:${(Math.random()*100).toFixed(2)}%;top:${(Math.random()*100).toFixed(2)}%;--tw:${(2.5+Math.random()*4).toFixed(2)}s;--delay:${(-Math.random()*5).toFixed(2)}s;--o-max:${(.35+Math.random()*.55).toFixed(2)};--o-min:${(.05+Math.random()*.18).toFixed(2)};`;
      frag.appendChild(s);
    }
    root.appendChild(frag);
  }

  function initNavSpy() {
    const links = $$('.nav-spy');
    if (!links.length) return;
    const map = new Map();
    links.forEach(l => {
      const sec = $(l.getAttribute('href'));
      if (sec) map.set(sec, l);
    });

    const nav = links[0].parentElement;
    let glider = null;
    if (nav) {
      nav.classList.add('has-glider');
      glider = document.createElement('span');
      glider.className = 'nav-glider';
      nav.prepend(glider);
    }

    const moveGlider = (link) => {
      if (!glider || !link) return;
      glider.style.width = `${link.offsetWidth}px`;
      glider.style.transform = `translate3d(${link.offsetLeft}px, 0, 0)`;
      if (!glider.classList.contains('ready')) requestAnimationFrame(() => glider.classList.add('ready'));
    };

    const setActive = (link) => {
      links.forEach(l => l.classList.toggle('active', l === link));
      if (link) moveGlider(link);
    };

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(map.get(e.target));
      });
    }, { rootMargin: '-42% 0px -50% 0px' });

    map.forEach((_, sec) => io.observe(sec));
    window.addEventListener('resize', () => { const a = $('.nav-spy.active'); if (a) moveGlider(a); });
  }

  function initAccordion() {
    const items = $$('.faq-item');
    items.forEach(item => {
      const btn = $('.faq-trigger', item);
      const panel = $('.faq-panel', item);
      if (!btn || !panel) return;
      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        items.forEach(other => {
          if (other !== item) {
            $('.faq-trigger', other)?.setAttribute('aria-expanded', 'false');
            $('.faq-panel', other)?.classList.remove('open');
            other.dataset.open = 'false';
          }
        });
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.classList.toggle('open', !isOpen);
        item.dataset.open = String(!isOpen);
      });
    });
  }

  function initConstructor() {
    const form = $('#order-form');
    const o = typeof SITE !== 'undefined' && SITE.order;
    if (!form || !o) return;

    const typesBox = $('#order-types');
    const funcsBox = $('#order-functions');
    const termsBox = $('#order-terms');
    const linesEl  = $('#receipt-lines');
    const totalEl  = $('#order-total');
    const rangeEl  = $('#order-range');
    const msgEl    = $('#order-msg');
    const noteEl   = $('#order-note');

    const IC = {
      robot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="3.7" r="1.2"/><circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none"/><path d="M9.5 17h5"/></svg>',
      app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7 14h4M7 17h6"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
      shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.2 5.7.8-4.1 4 1 5.7L12 16l-5.2 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>',
      dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20.5 12 20.5z"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h7l2 2h9v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z"/></svg>',
      globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
      sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>',
      db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/></svg>',
      send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>',
      key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M18 12v3M21 12v2"/></svg>',
      plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"/></svg>',
      spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
      server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><circle cx="7" cy="7.5" r=".8" fill="currentColor"/><circle cx="7" cy="16.5" r=".8" fill="currentColor"/></svg>',
      bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    };
    const CHECK = '<svg class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>';
    const fmt = (n) => Math.round(n).toLocaleString('ru-RU') + ' ₽';

    const state = {
      type: o.types[0]?.id || null,
      functions: new Set(),
      term: o.terms[1]?.id || o.terms[0]?.id || null,
    };

    const makeChip = (item, selected, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'feature-chip';
      b.dataset.checked = String(selected);
      b.setAttribute('aria-pressed', String(selected));
      b.innerHTML = `<span class="chip-icon">${IC[item.icon] || ''}</span><span>${item.label}</span>${CHECK}`;
      b.addEventListener('click', () => onClick(b));
      return b;
    };

    const renderChips = () => {
      if (typesBox) {
        typesBox.innerHTML = '';
        o.types.forEach(t => {
          typesBox.appendChild(makeChip(t, state.type === t.id, () => {
            state.type = t.id;
            renderChips();
            recalc();
          }));
        });
      }
      if (funcsBox) {
        funcsBox.innerHTML = '';
        o.functions.forEach(f => {
          funcsBox.appendChild(makeChip(f, state.functions.has(f.id), () => {
            if (state.functions.has(f.id)) state.functions.delete(f.id);
            else state.functions.add(f.id);
            renderChips();
            recalc();
          }));
        });
      }
      if (termsBox) {
        termsBox.innerHTML = '';
        o.terms.forEach(tr => {
          termsBox.appendChild(makeChip(tr, state.term === tr.id, () => {
            state.term = tr.id;
            renderChips();
            recalc();
          }));
        });
      }
    };

    const recalc = () => {
      const tObj = o.types.find(x => x.id === state.type);
      const trObj = o.terms.find(x => x.id === state.term);
      const fObjs = o.functions.filter(x => state.functions.has(x.id));

      let sum = tObj ? tObj.price : 0;
      const rows = [];
      if (tObj) rows.push([tObj.label, tObj.price ? fmt(tObj.price) : 'обсудим']);
      fObjs.forEach(f => {
        sum += f.price;
        rows.push([f.label, `+ ${fmt(f.price)}`]);
      });

      const base = Math.max(o.minPrice || 1000, sum);
      const mult = trObj ? trObj.mult : 1;
      const total = Math.round((base * mult) / 100) * 100;
      if (trObj && trObj.mult !== 1) rows.push([trObj.label, `× ${trObj.mult}`]);

      if (linesEl) {
        linesEl.innerHTML = rows.length
          ? rows.map(([k, v]) => `<div class="receipt-row"><span>${k}</span><span class="dots"></span><span class="val">${v}</span></div>`).join('')
          : '<p class="receipt-empty">выберите параметры</p>';
      }

      if (totalEl) {
        totalEl.textContent = `от ${fmt(total)}`;
        totalEl.classList.remove('bump');
        void totalEl.offsetWidth;
        totalEl.classList.add('bump');
      }
      if (rangeEl && o.rangePercent) {
        const hi = Math.round((total * (1 + o.rangePercent)) / 100) * 100;
        rangeEl.textContent = `ориентир: ${fmt(total)} – ${fmt(hi)}`;
      }
    };

    renderChips();
    recalc();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tObj = o.types.find(x => x.id === state.type);
      const trObj = o.terms.find(x => x.id === state.term);
      const fObjs = o.functions.filter(x => state.functions.has(x.id));
      const msg = (msgEl?.value || '').trim();

      const text = [
        'Привет! Заявка с сайта:',
        `• Формат: ${tObj ? tObj.label : 'не выбран'}`,
        `• Функции: ${fObjs.length ? fObjs.map(f => f.label).join(', ') : 'базовый набор'}`,
        `• Срок: ${trObj ? trObj.label : 'обычный'}`,
        `• Оценка по чеку: ${totalEl?.textContent || ''}`,
        msg ? `• Описание: ${msg}` : '',
      ].filter(Boolean).join('\n');

      try {
        await navigator.clipboard.writeText(text);
        if (noteEl) noteEl.textContent = '✓ текст заявки скопирован в буфер';
      } catch (_) {}

      const tg = SITE.telegram || 'w1cwmdev';
      window.open(`https://t.me/${tg}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      toast('Заявка сформирована — открываю Telegram');
    });
  }

  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (REDUCED_MOTION) { els.forEach(el => el.classList.add('revealed')); return; }

    els.forEach(el => {
      const d = Number(el.dataset.reveal || 0);
      if (d) el.style.setProperty('--reveal-delay', `${d}ms`);
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      });
    }, { threshold: 0.08 });

    els.forEach(el => io.observe(el));
  }

  function initScrollFX() {
    const bar = $('.progress-bar');
    const heroFade = $('[data-hero-fade]');
    const hint = $('.scroll-hint');
    const processSec = $('#process');
    const processFill = $('#process-line-fill');
    const glow = $('#cursor-glow');

    if (!IS_TOUCH && glow && !REDUCED_MOTION) {
      let gx = -999, gy = -999, tx = -999, ty = -999;
      window.addEventListener('pointermove', e => {
        tx = e.clientX - 220;
        ty = e.clientY - 220;
      }, { passive: true });
      const loopGlow = () => {
        gx = damp(gx, tx, 0.12);
        gy = damp(gy, ty, 0.12);
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        requestAnimationFrame(loopGlow);
      };
      requestAnimationFrame(loopGlow);
    }

    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--scroll-progress', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');

      if (heroFade && !REDUCED_MOTION) {
        const p = Math.min(1, y / (window.innerHeight * 0.85));
        heroFade.style.opacity = String(Math.max(0.2, 1 - p * 0.8));
      }
      if (hint) hint.style.opacity = y > 90 ? '0' : '1';

      if (processSec && processFill) {
        const r = processSec.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (window.innerHeight * 0.72 - r.top) / (r.height * 0.6)));
        processFill.style.setProperty('--process-progress', prog.toFixed(3));
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length || REDUCED_MOTION) return;

    const run = (el) => {
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const dur = 900;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  function initHeroBotDemo() {
    const feed = $('#bot-demo-feed');
    const status = $('#bot-demo-status');
    const replay = $('#bot-demo-replay');
    const btns = $$('.bot-demo-btn');
    if (!feed) return;

    let timerIds = [];
    const clearTimers = () => { timerIds.forEach(clearTimeout); timerIds = []; };

    const addMsg = (cls, text) => {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      feed.appendChild(div);
      feed.scrollTop = feed.scrollHeight;
      return div;
    };

    const showTypingThenReply = (replyText, delay = 520) => {
      if (status) status.textContent = 'печатает...';
      const typing = document.createElement('div');
      typing.className = 'bot-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      feed.appendChild(typing);
      const id = setTimeout(() => {
        typing.remove();
        addMsg('bot-msg-bot', replyText);
        if (status) status.textContent = 'online • интерактивное превью';
      }, delay);
      timerIds.push(id);
    };

    const playIntro = () => {
      clearTimers();
      feed.innerHTML = '';
      if (REDUCED_MOTION) {
        addMsg('bot-msg-user', '/start');
        addMsg('bot-msg-bot', 'Привет! Я бот-напоминалка на aiogram. Выбери действие ниже 👇');
        return;
      }
      timerIds.push(setTimeout(() => addMsg('bot-msg-user', '/start'), 200));
      timerIds.push(setTimeout(() => showTypingThenReply('Привет! Я бот-напоминалка на aiogram. Выбери действие ниже 👇', 650), 550));
    };

    playIntro();
    replay?.addEventListener('click', playIntro);
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        clearTimers();
        feed.querySelectorAll('.bot-typing').forEach(n => n.remove());
        addMsg('bot-msg-user', btn.dataset.user || btn.textContent);
        showTypingThenReply(btn.dataset.reply || 'Готово!', 480);
      });
    });
  }

  function initSpotlight() {
    if (IS_TOUCH || REDUCED_MOTION) return;
    const cards = $$('.spotlight-card');
    if (!cards.length) return;

    let mx = -999, my = -999, raf = 0;
    const update = () => {
      raf = 0;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > window.innerHeight + 120) continue;
        cards[i].style.setProperty('--mx', `${(mx - rect.left).toFixed(1)}px`);
        cards[i].style.setProperty('--my', `${(my - rect.top).toFixed(1)}px`);
      }
    };
    window.addEventListener('pointermove', e => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  function initTilt() {
    if (IS_TOUCH || REDUCED_MOTION) return;
    const cards = $$('.service-card, .work-card, .process-step, .ide-window');
    cards.forEach(card => {
      card.classList.add('tilt-card');
      let glare = $('.glare', card);
      if (!glare) {
        glare = document.createElement('span');
        glare.className = 'glare';
        glare.setAttribute('aria-hidden', 'true');
        card.appendChild(glare);
      }

      let rx = 0, ry = 0, lift = 0, trx = 0, try_ = 0, tlift = 0, raf = 0;
      const tick = () => {
        rx = damp(rx, trx, 0.14);
        ry = damp(ry, try_, 0.14);
        lift = damp(lift, tlift, 0.14);
        card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        card.style.setProperty('--lift', `${lift.toFixed(2)}px`);
        if (Math.abs(rx - trx) > 0.02 || Math.abs(ry - try_) > 0.02 || Math.abs(lift - tlift) > 0.05) {
          raf = requestAnimationFrame(tick);
        } else { raf = 0; }
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        try_ = (px - 0.5) * 6;
        trx  = (0.5 - py) * 6;
        tlift = -4;
        card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        kick();
      });
      card.addEventListener('pointerleave', () => {
        trx = 0; try_ = 0; tlift = 0;
        kick();
      });
    });
  }

  function initMagnetic() {
    if (IS_TOUCH || REDUCED_MOTION) return;
    $$('.btn-primary, .btn-ghost').forEach(btn => {
      btn.classList.add('magnetic');
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  function initRipple() {
    if (REDUCED_MOTION) return;
    $$('.btn, .feature-chip').forEach(el => {
      el.addEventListener('pointerdown', e => {
        const r = el.getBoundingClientRect();
        const ink = document.createElement('span');
        const size = Math.max(r.width, r.height);
        ink.className = 'ripple-ink';
        ink.style.width = ink.style.height = `${size}px`;
        ink.style.left = `${e.clientX - r.left}px`;
        ink.style.top = `${e.clientY - r.top}px`;
        el.appendChild(ink);
        setTimeout(() => ink.remove(), 750);
      });
    });
  }

  function initSmoothAnchors() {
    if (REDUCED_MOTION) return;
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initSplitTitles() {
    const titles = $$('.section-title');
    if (!titles.length) return;
    titles.forEach(t => {
      t.classList.add('split-title');
      const words = t.textContent.trim().split(/\s+/);
      t.innerHTML = words.map((w, i) => `<span class="w"><span class="wi" style="--i:${i}">${w}</span></span>`).join(' ');
    });
    if (REDUCED_MOTION) { titles.forEach(t => t.classList.add('revealed')); return; }

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    titles.forEach(t => io.observe(t));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initConfigInjection();
    initHeader();
    initSnowToggle();
    initStars();
    initNavSpy();
    initAccordion();
    initConstructor();
    initReveal();
    initScrollFX();
    initCounters();
    initHeroBotDemo();
    initSpotlight();
    initTilt();
    initMagnetic();
    initRipple();
    initSmoothAnchors();
    initSplitTitles();
  });
})();
