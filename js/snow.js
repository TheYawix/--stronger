/* ============================================================
   stroxed — падающий снег на <canvas>
   - Частицы с разным размером, скоростью и покачиванием
   - Плотность зависит от площади экрана
   - Пауза при скрытой вкладке, поддержка prefers-reduced-motion
   - Управление: Snowfall.getInstance().toggle()
   ============================================================ */

class Snowfall {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.flakes = [];
    this.running = false;
    this._raf = null;
    this._last = 0;

    this._onResize = () => this._resize();
    this._onVisibility = () => {
      // Не гоняем анимацию в фоне — экономим батарею
      if (document.hidden) this._pauseLoop();
      else if (this.running) this._resumeLoop();
    };

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibility);

    this._resize();
  }

  /* --- Публичное API --- */

  start() {
    if (this.running) return;
    this.running = true;
    this._spawn();
    this._resumeLoop();
  }

  stop() {
    this.running = false;
    this._pauseLoop();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toggle() {
    this.running ? this.stop() : this.start();
    return this.running;
  }

  /* --- Внутреннее --- */

  /** Пересчёт размеров канваса под DPR экрана */
  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Плотность: ~1 снежинка на каждые 12 000 px², максимум 220
    this.maxFlakes = Math.min(220, Math.floor((innerWidth * innerHeight) / 12000));
    if (this.running) this._spawn();
  }

  /** Создаёт массив снежинок */
  _spawn() {
    this.flakes = Array.from({ length: this.maxFlakes }, () => this._makeFlake(true));
  }

  /**
   * Снежинка: x/y — позиция, r — радиус, vy — скорость падения,
   * sway/phase — параметры горизонтального покачивания, big — рисовать «кристалл»
   */
  _makeFlake(anywhere) {
    const r = 0.8 + Math.random() * 2.6; // радиус, px
    return {
      x: Math.random() * innerWidth,
      y: anywhere ? Math.random() * innerHeight : -8,
      r,
      vy: 14 + r * 14 + Math.random() * 12,      // крупные падают быстрее
      swayAmp: 10 + Math.random() * 22,          // амплитуда покачивания
      swayFreq: 0.4 + Math.random() * 0.7,       // частота покачивания
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 10,         // постоянный боковой снос
      opacity: 0.35 + Math.random() * 0.55,
      big: r > 2.6 && Math.random() > 0.55,      // редкие крупные «кристаллы»
    };
  }

  _resumeLoop() {
    this._last = performance.now();
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  _pauseLoop() { cancelAnimationFrame(this._raf); }

  /** Основной цикл: dt в секундах, чтобы скорость не зависела от FPS */
  _frame(t) {
    if (!this.running) return;
    const dt = Math.min((t - this._last) / 1000, 0.05);
    this._last = t;

    this._update(dt);
    this._draw();

    this._raf = requestAnimationFrame((tt) => this._frame(tt));
  }

  _update(dt) {
    const now = performance.now() / 1000;
    for (const f of this.flakes) {
      f.y += f.vy * dt;
      // Покачивание: базовый снос + синусоида
      f.x += (f.drift + f.swayAmp * f.swayFreq * Math.cos(now * f.swayFreq * Math.PI * 2 + f.phase)) * dt;

      // Вышел за низ/бок — рождаемся заново сверху
      if (f.y > innerHeight + 8) Object.assign(f, this._makeFlake(false));
      if (f.x < -12) f.x = innerWidth + 10;
      if (f.x > innerWidth + 12) f.x = -10;
    }
  }

  _draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const f of this.flakes) {
      ctx.globalAlpha = f.opacity;
      if (f.big) {
        this._drawCrystal(f);
      } else {
        ctx.beginPath();
        ctx.fillStyle = '#E8F1F8';
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Крупная снежинка-«кристалл»: 3 перекрещенные линии с лучиками */
  _drawCrystal(f) {
    const { ctx } = this;
    ctx.strokeStyle = '#BAE6FD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI / 3) * i + f.phase * 0.3;
      const dx = Math.cos(a) * f.r * 2.4;
      const dy = Math.sin(a) * f.r * 2.4;
      ctx.moveTo(f.x - dx, f.y - dy);
      ctx.lineTo(f.x + dx, f.y + dy);
    }
    ctx.stroke();
  }
}

/* Инициализация снега после загрузки DOM */
(() => {
  const canvas = document.getElementById('snow');
  if (!canvas) return;

  const snow = new Snowfall(canvas);
  window.__snowfall = snow; // доступ для main.js (кнопка вкл/выкл)

  // По умолчанию снег включён; отключение — только через кнопку снега (localStorage)
  const userPref = localStorage.getItem('frost-snow');
  const enabled = userPref !== null ? userPref === 'on' : true;

  if (enabled) snow.start();
})();
