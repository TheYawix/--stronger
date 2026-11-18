/* ============================================================
   stroxed — вся интерактивная логика страницы
   Модули: конфиг→DOM, шапка, звёзды, nav-spy, аккордеон FAQ,
   конструктор ТЗ (живая заявка в Telegram)
   ============================================================ */

(() => {
  'use strict';

  /* ---------- Утилиты ---------- */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* Физика инерции: экспоненциальное затухание, не зависящее от FPS.
     cur + (target - cur) * (1 - e^(-λ·dt)) — значение «догоняет» цель,
     быстро вначале и мягко в конце, как настоящая пружина.
     ⚙ lambda (жёсткость): 5 = ленивый дрейф … 18 = тугой отклик */
  const damp = (cur, target, lambda, dt) =>
    cur + (target - cur) * (1 - Math.exp(-lambda * dt));

  /* Анимации на сайте всегда включены — независимо от системных
     настроек reduced-motion (по решению владельца сайта) */
  const REDUCED_MOTION = false;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /** 12500 -> "12 500 ₽" */
  const money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

  /* Иконки toast: монохромные SVG-пути (stroke) */
  const TOAST_ICONS = {
    snow:  '<path d="M12 2v20M4 6l16 12M20 6L4 18M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2"/>',
    send:  '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
    copy:  '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    warn:  '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };

  /** Всплывающее уведомление внизу экрана (type: snow|send|copy|warn|check) */
  function toast(text, type = 'check') {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      (TOAST_ICONS[type] || TOAST_ICONS.check) + `</svg><span></span>`;
    el.lastElementChild.textContent = text;
    root.appendChild(el);
    // Убираем по факту конца CSS-анимации (жёсткий таймер срезал хвост
    // fade-out), setTimeout — страховка на случай усыпания анимаций
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'toast-out') el.remove();
    });
    setTimeout(() => el.remove(), 3400);
  }

  /* ============================================================
     1. Конфиг → DOM: подстановка контактов из js/config.js
     ============================================================ */
  function initConfigInjection() {
    $$('[data-telegram-link]').forEach((a) => { a.href = `https://t.me/${SITE.telegram}`; });
    $$('[data-telegram-name]').forEach((el) => { el.textContent = '@' + SITE.telegram; });
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ============================================================
     2. Шапка: фон при скролле + бургер мобильного меню
     ============================================================ */
  function initHeader() {
    const header = $('#site-header');
    const burger = $('#burger');
    const menu   = $('#mobile-menu');

    // Плотный фон после первых пикселей скролла
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Бургер
    const closeMenu = () => {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });

    // Закрываем меню: клик по ссылке, Escape, выход в десктопную ширину
    $$('.nav-link', menu).forEach((l) => l.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
        burger.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  /* ============================================================
     3. Кнопка вкл/выкл снега (канвас живёт в js/snow.js)
     ============================================================ */
  function initSnowToggle() {
    const btn = $('#snow-toggle');
    const snow = window.__snowfall;
    if (!btn || !snow) return;

    const render = (on) => {
      btn.style.opacity = on ? '1' : '.45';
      btn.setAttribute('aria-pressed', String(on));
    };
    render(snow.running);

    btn.addEventListener('click', () => {
      const on = snow.toggle();
      localStorage.setItem('frost-snow', on ? 'on' : 'off');
      render(on);
      toast(on ? 'Снег включён' : 'Снег выключен', 'snow');
    });
  }

  /* ============================================================
     4. Звёзды на фоне: генерируем точки с индивидуальным мерцанием
     ============================================================ */
  function initStars() {
    const layer = $('#stars');
    if (!layer) return;
    const count = Math.min(110, Math.floor((innerWidth * innerHeight) / 16000));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      const size = (0.8 + Math.random() * 1.6).toFixed(1);
      s.className = 'star';
      s.style.cssText = [
        `left:${(Math.random() * 100).toFixed(2)}%`,
        `top:${(Math.random() * 100).toFixed(2)}%`,
        `width:${size}px`, `height:${size}px`,
        `--tw:${(2.5 + Math.random() * 4).toFixed(1)}s`,
        `--delay:${(Math.random() * 5).toFixed(1)}s`,
        `--o-max:${(0.5 + Math.random() * 0.5).toFixed(2)}`,
        `--o-min:${(Math.random() * 0.2).toFixed(2)}`,
      ].join(';');
      frag.appendChild(s);
    }
    layer.appendChild(frag);
  }

  /* ============================================================
     5. Nav-spy: подсветка активного раздела в навигации
     ============================================================ */
  function initNavSpy() {
    const links = $$('.nav-spy');
    const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    /* --- Nav-glider: подсветка активного пункта скользит по меню --- */
    const nav = links[0]?.closest('nav');
    let glider = null;
    if (nav && !REDUCED_MOTION) {
      glider = document.createElement('span');
      glider.className = 'nav-glider';
      glider.setAttribute('aria-hidden', 'true');
      nav.appendChild(glider);
      nav.classList.add('has-glider');
    }
    const placeGlider = (animate) => {
      if (!glider) return;
      const active = $('.nav-spy.active', nav);
      // Меню скрыто (мобильная ширина) или активных ещё нет — гасим
      if (!active || !nav.offsetWidth) { glider.style.opacity = '0'; return; }
      glider.style.width = active.offsetWidth + 'px';
      glider.style.transform = `translateX(${active.offsetLeft}px)`;
      glider.style.opacity = '';
      if (animate) glider.classList.add('ready');
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          map.get(entry.target.id)?.classList.add('active');
          placeGlider(true);
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' }); // секция «активна», когда её пересекает середина экрана

    sections.forEach((s) => observer.observe(s));

    if (glider) {
      placeGlider(false); // стартовая позиция без анимации
      requestAnimationFrame(() => placeGlider(true));
      window.addEventListener('resize', () => placeGlider(true), { passive: true });
    }
  }

  /* ============================================================
     6. FAQ-аккордеон: одна открыта — остальные закрываются
     ============================================================ */
  function initAccordion() {
    const items = $$('.faq-item');
    items.forEach((item) => {
      const trigger = $('.faq-trigger', item);
      const panel   = $('.faq-panel', item);
      trigger.addEventListener('click', () => {
        const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
        // Закрываем все (режим «одна вкладка»)
        items.forEach((other) => {
          $('.faq-trigger', other).setAttribute('aria-expanded', 'false');
          $('.faq-panel', other).classList.remove('open');
          other.dataset.open = 'false';
        });
        if (willOpen) {
          trigger.setAttribute('aria-expanded', 'true');
          panel.classList.add('open');
          item.dataset.open = 'true';
        }
      });
    });
  }

  /* ============================================================
     7. Конструктор ТЗ: чипы из конфига + живая заявка в Telegram
     ============================================================ */

  /* Иконки чипов: монохромные SVG-пути (stroke), ключ — название чипа */
  const CHIP_ICONS = {
    'Mini App':              '<rect x="6.5" y="3" width="11" height="18" rx="2.5"/><path d="M10.5 18.5h3"/>',
    'Магазин или приватка':  '<path d="M3 4h18l-1.5 9.5a2 2 0 0 1-2 1.5H8"/><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 4h2l2 11"/>',
    'Парсер':                '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    'Юзербот':               '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    'VPN-бот':               '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    'Бот для звёзд':         '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6L7.1 18.2l.9-5.5-4-3.9L9.5 8z"/>',
    'Бот знакомств':         '<path d="M12 20.5S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20.5 12 20.5z"/>',
    'Бот для файлов':        '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7"/>',
    'Сайт':                  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
    'Другое':                '<path d="M4 12h16"/><circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    'Приём оплаты':          '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
    'Автовыдача':            '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
    'Админка':               '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    'Рассылка':              '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
    'Статистика':            '<path d="M5 20v-6M12 20V6M19 20v-9"/><path d="M3 20h18"/>',
    'Обязательная подписка': '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    'Как можно быстрее':     '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
    '3–5 дней':              '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    'Не горит':              '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.8"/>',
  };

  function initConstructor() {
    const form = $('#order-form');
    if (!form) return;
    const cfg = SITE.order;

    /* --- Рендер чипов: иконка + подпись + галочка выбранного --- */
    const chip = (name, label) => {
      const icon = CHIP_ICONS[label];
      const ico = icon
        ? `<span class="chip-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>`
        : '';
      return `
        <label class="feature-chip">
          <input type="checkbox" name="${name}" value="${label}" class="sr-only">
          ${ico}<span>${label}</span><span class="chip-check" aria-hidden="true">✔</span>
        </label>`;
    };

    $('#order-types').innerHTML = cfg.types.map((t) => chip('type', t.label)).join('');
    $('#order-functions').innerHTML = cfg.functions.map((f) => chip('fn', f.label)).join('');
    $('#order-terms').innerHTML = cfg.terms.map((t) => chip('term', t.label)).join('');

    // Подсветка выбранных чипов + пересчёт сметы.
    // «Когда нужно» — единственный выбор: новый чип снимает предыдущий
    form.addEventListener('change', (e) => {
      if (e.target.name === 'term' && e.target.checked) {
        $$('input[name="term"]', form).forEach((i) => {
          if (i !== e.target) i.checked = false;
        });
      }
      $$('label.feature-chip', form).forEach((label) => {
        label.dataset.checked = String(label.querySelector('input').checked);
      });
      recalc();
    });

    /* --- Примерная стоимость: база выбранных типов + функции × срочность --- */
    const totalEl = $('#order-total');
    const rangeEl = $('#order-range');
    const linesEl = $('#receipt-lines');

    function recalc() {
      const selected = (name) =>
        $$(`input[name="${name}"]:checked`, form).map((i) => i.value);
      const priceOf = (list, label) =>
        (list.find((x) => x.label === label) || {}).price || 0;
      const multOf = (label) =>
        (cfg.terms.find((x) => x.label === label) || {}).mult || 1;

      const base =
        selected('type').reduce((s, l) => s + priceOf(cfg.types, l), 0) +
        selected('fn').reduce((s, l) => s + priceOf(cfg.functions, l), 0);
      const term = selected('term')[0];
      const mult = multOf(term);
      const total = Math.round(base * mult);
      const r = cfg.rangePercent;

      /* --- Строки чека --- */
      const rows = [];
      selected('type').forEach((l) => {
        const p = priceOf(cfg.types, l);
        rows.push(`<div class="receipt-row"><span>${l}</span><span class="dots"></span><span class="val">${p ? money(p) : 'по задаче'}</span></div>`);
      });
      selected('fn').forEach((l) => {
        const p = priceOf(cfg.functions, l);
        rows.push(`<div class="receipt-row"><span>${l}</span><span class="dots"></span><span class="val">+${money(p)}</span></div>`);
      });
      if (term && mult > 1) {
        rows.push(`<div class="receipt-row"><span>срок · ${term.toLowerCase()}</span><span class="dots"></span><span class="val">×${String(mult).replace('.', ',')}</span></div>`);
      }
      linesEl.innerHTML = rows.length
        ? rows.join('')
        : '<p class="receipt-empty">отметь пункты слева — чек соберётся сам</p>';

      if (total > 0) {
        totalEl.textContent = money(total);
        rangeEl.textContent = `вилка: ${money(total * (1 - r))} — ${money(total * (1 + r))}`;
      } else {
        totalEl.textContent = `от ${money(cfg.minPrice)}`;
        rangeEl.textContent = '';
      }

      // Лёгкий «пульс» числа при пересчёте
      if (!REDUCED_MOTION) {
        totalEl.classList.remove('bump');
        void totalEl.offsetWidth; // reflow, чтобы анимация перезапустилась
        totalEl.classList.add('bump');
      }
      return total;
    }
    recalc(); // стартовое состояние

    /* --- Отправка: живое сообщение → буфер → чат в Telegram --- */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const val = (name) =>
        $$(`input[name="${name}"]:checked`, form).map((i) => i.value);
      const msg = $('#order-msg').value.trim().slice(0, 800);

      let s = 'Здравствуйте! Хочу заказать разработку.\n';
      const types = val('type');
      s += 'Что нужно: ' + (types.length ? types.join(', ') : 'уточню в чате') + '\n';
      const fns = val('fn');
      if (fns.length) s += 'Функции: ' + fns.join(', ') + '\n';
      const term = val('term')[0];
      if (term) s += 'Срок: ' + term + '\n';
      const total = recalc();
      if (total > 0) s += `Бюджет: примерно ${money(total)}\n`;
      if (msg) s += 'Описание: ' + msg + '\n';

      // Копия в буфер: если чат открылся пустым, текст можно вставить
      let copied = false;
      try {
        await navigator.clipboard.writeText(s);
        copied = true;
      } catch (_) { /* http/старые браузеры — просто открываем чат */ }

      const note = $('#order-note');
      if (note) {
        note.textContent = copied
          ? 'Текст заявки скопирован. Если чат открылся пустым, просто вставь его.'
          : '';
      }

      window.open(`https://t.me/${SITE.telegram}?text=${encodeURIComponent(s)}`, '_blank', 'noopener');
      toast('Откроется чат с готовым текстом — просто нажми «Отправить»', 'send');
    });
  }

  /* ============================================================
     10. Scroll-reveal: плавное появление блоков при прокрутке
     ============================================================ */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;

    // Без JS-анимаций: показываем всё сразу.
    // REDUCED_MOTION — константа false: анимации всегда включены
    if (!('IntersectionObserver' in window) || REDUCED_MOTION) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }

    // Каскадные индексы для тегов стека (CSS: .tech-tag, MOTION PACK)
    $$('.tech-tags').forEach((box) => {
      $$('.tech-tag', box).forEach((tag, i) => tag.style.setProperty('--i', i));
    });

    // Задержка каскада из data-reveal="<мс>"
    els.forEach((el) => el.style.setProperty('--reveal-delay', (el.dataset.reveal || 0) + 'ms'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target); // анимация один раз
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    els.forEach((el) => io.observe(el));
  }

  /* ============================================================
     11. СКРОЛЛ-ЭФФЕКТЫ: прогресс-бар, параллакс, уход героя
     Один scroll-листенер + один rAF-цикл на всё (производительность)
     ============================================================ */
  function initScrollFX() {
    const bar = $('.progress-bar');
    const aurora = $('#aurora-field');
    const hero = $('[data-hero-fade]');
    const hint = $('.scroll-hint');

    // Кэшируем метрики: чтение layout в каждом кадре — запрещено
    let maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    window.addEventListener('resize', () => {
      maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    }, { passive: true });

    let queued = false;
    let prevY = window.scrollY;
    let auroraPulse = 1; // сглаженный «импульс» сияния от скорости скролла

    const frame = () => {
      queued = false;
      const y = window.scrollY;

      // 1. Прогресс-бар: 0…1 страницы
      if (bar) bar.style.setProperty('--scroll-progress', (y / maxScroll).toFixed(4));

      // 2. Сияние «дышит» от скорости скролла.
      //    ⚙ /140 и 0.05 — чувствительность импульса.
      //    ВАЖНО: без параллакса — контейнер fixed, а пятна привязаны к
      //    его краям; любой сдвиг на 0.08·y уводит свет за экран (баг
      //    «свечение уезжает вверх при скролле»)
      if (!REDUCED_MOTION && aurora) {
        const speed = Math.min(Math.abs(y - prevY) / 140, 1);
        prevY = y;
        auroraPulse += (1 + speed * 0.05 - auroraPulse) * 0.09;
        aurora.style.transform = `scale(${auroraPulse.toFixed(4)})`;
      }

      // 3. Герой растворяется и уплывает вниз — «кино» при первом скролле
      if (!REDUCED_MOTION && hero) {
        const p = Math.min(y / (innerHeight * 0.85), 1); // ⚙ длина фазы ухода
        hero.style.opacity = (1 - p).toFixed(3);
        hero.style.transform = `translate3d(0, ${(p * 70).toFixed(1)}px, 0)`; // ⚙ глубина
      }

      // 4. Индикатор скролла прячется, как только началось чтение
      if (hint) hint.style.opacity = y > 140 ? '0' : '';
    };
    const onScroll = () => {
      if (queued) return; // максимум один rAF на кадр
      queued = true;
      requestAnimationFrame(frame);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    frame(); // стартовое состояние без ожидания скролла
  }

  /* ============================================================
     12. 3D-TILT КАРТОЧЕК + БЛИК ЗА КУРСОРОМ
     Карточка наклоняется к курсору на пружине, иконки «всплывают»
     по Z, стеклянный блик следует за мышью
     ============================================================ */
  function initTilt() {
    if (!FINE_POINTER || REDUCED_MOTION) return;

    const MAX_DEG = 5;   // ⚙ амплитуда наклона (3–10) — меньше = деликатнее
    const LIFT = -4;     // ⚙ подъём карточки под курсором, px
    const STIFF = 7;     // ⚙ жёсткость пружины (5 лениво … 16 резко)

    $$('.service-card, .work-card, .process-step').forEach((card) => {
      card.classList.add('tilt-card');

      // Блик инжектим из JS — HTML остаётся чистым
      const glare = document.createElement('span');
      glare.className = 'glare';
      glare.setAttribute('aria-hidden', 'true');
      card.appendChild(glare);

      const s = { rx: 0, ry: 0, lift: 0, gx: 50, gy: 50 }; // текущее (пружина)
      const t = { rx: 0, ry: 0, lift: 0, gx: 50, gy: 50 }; // целевое (курсор)
      let raf = null;
      let last = 0;
      let hovering = false;

      const tick = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
        last = now;
        let settled = true;
        for (const k in t) {
          s[k] = damp(s[k], t[k], STIFF, dt);
          if (Math.abs(t[k] - s[k]) > 0.01) settled = false;
        }
        card.style.setProperty('--rx', s.rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', s.ry.toFixed(2) + 'deg');
        card.style.setProperty('--lift', s.lift.toFixed(2) + 'px');
        card.style.setProperty('--gx', s.gx.toFixed(1) + '%');
        card.style.setProperty('--gy', s.gy.toFixed(1) + '%');

        if (settled && !hovering) { raf = null; return; } // физика утихла — спим
        raf = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); }
      };

      card.addEventListener('pointerenter', () => {
        hovering = true;
        t.lift = LIFT;
        wake();
      });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;  // -0.5…0.5 от центра
        const py = (e.clientY - r.top) / r.height - 0.5;
        t.ry = px * MAX_DEG * 2;   // наклон к курсору
        t.rx = -py * MAX_DEG * 2;
        t.gx = (px + 0.5) * 100;   // блик под курсором, %
        t.gy = (py + 0.5) * 100;
        wake();
      });
      card.addEventListener('pointerleave', () => {
        hovering = false;
        t.rx = t.ry = 0;
        t.lift = 0;
        t.gx = t.gy = 50; // блик мягко возвращается в центр и гаснет
        wake();
      });
    });
  }

  /* ============================================================
     13. МАГНИТНЫЕ КНОПКИ
     Кнопка «притягивается» к курсору и с инерцией возвращается —
     тот самый эффект «хочется кликать бесконечно»
     ============================================================ */
  function initMagnetic() {
    if (!FINE_POINTER || REDUCED_MOTION) return;

    const PULL = 0.18; // ⚙ сила притяжения (0–0.5) — меньше = мягче
    const MAX = 6;     // ⚙ предел смещения, px
    const STIFF = 8;   // ⚙ жёсткость возврата

    $$('.btn-primary, .btn-ghost').forEach((btn) => {
      btn.classList.add('magnetic');

      const s = { x: 0, y: 0 }; // текущее
      const t = { x: 0, y: 0 }; // целевое
      let raf = null;
      let last = 0;
      let hovering = false;

      const tick = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
        last = now;
        s.x = damp(s.x, t.x, STIFF, dt);
        s.y = damp(s.y, t.y, STIFF, dt);
        btn.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;

        const settled = Math.abs(t.x - s.x) + Math.abs(t.y - s.y) < 0.02;
        if (settled && !hovering) {
          btn.style.transform = ''; // вернуть управление CSS-правилам
          raf = null;
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); }
      };

      btn.addEventListener('pointerenter', () => { hovering = true; wake(); });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);  // вектор от центра
        const dy = e.clientY - (r.top + r.height / 2);
        t.x = Math.max(-MAX, Math.min(MAX, dx * PULL)); // клампим, чтобы не убегала
        t.y = Math.max(-MAX, Math.min(MAX, dy * PULL));
        wake();
      });
      btn.addEventListener('pointerleave', () => {
        hovering = false;
        t.x = t.y = 0; // цель = ноль → пружина сама вернёт кнопку
        wake();
      });
    });
  }

  /* ============================================================
     14. RIPPLE: волна от клика на кнопках
     Делегирование на document — работает и для будущих кнопок
     ============================================================ */
  function initRipple() {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn.sheen');
      if (!btn || REDUCED_MOTION) return;

      const r = btn.getBoundingClientRect();
      const ink = document.createElement('span');
      ink.className = 'ripple-ink';
      const size = Math.max(r.width, r.height) * 1.2; // волна всегда накрывает кнопку
      ink.style.width = ink.style.height = size + 'px';
      ink.style.left = (e.clientX - r.left) + 'px';
      ink.style.top = (e.clientY - r.top) + 'px';
      btn.appendChild(ink);
      ink.addEventListener('animationend', () => ink.remove(), { once: true });
    });
  }

  /* ============================================================
     14. ПЛАВНЫЙ ПЕРЕХОД ПО ЯКОРЯМ: своя анимация скролла
     Равномерный ease на любую дистанцию (нативный smooth в Chrome
     дёргается на длинных прыжках). Останавливается, если пользователь
     вмешался колесом/тачем — управление мгновенно возвращается ему
     ============================================================ */
  function initSmoothAnchors() {
    if (REDUCED_MOTION) return; // страховка: сейчас константа false

    const HEADER_OFFSET = 96; // высота шапки + воздух (≈ scroll-padding-top)

    let anim = null;
    const cancel = () => { if (anim) { cancelAnimationFrame(anim); anim = null; } };
    // Пользователь крутит сам — отдаём управление мгновенно
    ['wheel', 'touchstart', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, cancel, { passive: true }));

    const scrollTo = (targetY) => {
      const startY = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      const endY = Math.min(Math.max(targetY, 0), max);
      const dist = endY - startY;
      if (Math.abs(dist) < 2) return;
      const DUR = Math.min(900, 350 + Math.abs(dist) * 0.35); // ⚙ длительность
      const start = performance.now();
      cancel();
      const step = (now) => {
        const p = Math.min((now - start) / DUR, 1);
        const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart: быстрый старт, мягкая посадка
        window.scrollTo(0, startY + dist * eased);
        anim = p < 1 ? requestAnimationFrame(step) : null;
      };
      anim = requestAnimationFrame(step);
    };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      scrollTo(el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET);
      history.replaceState(null, '', `#${id}`); // хэш в адресе без рывка
    });
  }

  /* ============================================================
     15. ЗАГОЛОВКИ: пословный каскад «из-под маски»
     Слова выезжают по очереди с лёгким расфокусом
     ============================================================ */
  function initSplitTitles() {
    if (REDUCED_MOTION) return; // без анимаций заголовки не трогаем

    $$('.section-title').forEach((h) => {
      // split(' ') сохраняет &nbsp;: «и надёжный» едет как одно слово
      const words = h.textContent.trim().split(' ');
      h.innerHTML = words
        .map((w, i) => `<span class="w"><span class="wi" style="--i:${i}">${w}</span></span>`)
        .join(' ');
      h.classList.add('split-title');
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed'); // запускает CSS-каскад
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    $$('.split-title').forEach((h) => io.observe(h));
  }

  /* ============================================================
     Запуск всех модулей
     ============================================================ */
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
    initTilt();
    initMagnetic();
    initRipple();
    initSmoothAnchors();
    initSplitTitles();
  });
})();
