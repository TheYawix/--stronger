/* ============================================================
   w1cwmdev — Motion Engine & App Logic (Polar Night 2.0)
   ============================================================ */

(() => {
  'use strict';

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

  /* ---------- 1. Config Injection ---------- */
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

  /* ---------- 2. Header & Mobile Menu ---------- */
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

  /* ---------- 3. Snow Toggle ---------- */
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

  /* ---------- 4. Polar Stars ---------- */
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

  /* ---------- 5. Nav Spy & Glider ---------- */
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

  /* ---------- 6. FAQ Accordion ---------- */
  function initAccordion() {
    const items = $$('.faq-item');
    items.forEach(item => {
      const btn = $('.faq-trigger', item);
      const panel = $('.faq-panel', item);
      if (!btn || !panel) return;
      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        item