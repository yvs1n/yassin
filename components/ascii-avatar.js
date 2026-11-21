/**
 * High-Definition Cyber ASCII Avatar Renderer
 * Renders a pre-cached ASCII base buffer at 60 FPS with silhouette-only
 * spotlight hover highlight and on-demand talking mouth shimmer.
 */

import { RAMPS, TONE_LEVELS, buildPalette, computeAsciiField } from './ascii-processor.js';

const DEFAULT_COLORS = {
  shadow: '#363945',
  mid: '#a6afc0',
  high: '#ffffff',
  rim: '#e4f2ff'
};

export class AsciiAvatar {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.box = canvas.parentElement;

    this.src = options.src || 'img/yassin-ascii-source.png';
    this.font = options.font || 'Fira Code, JetBrains Mono, "Courier New", monospace';
    this.cols = options.cols || 140;
    this.ramp = options.ramp || 'classic';
    this.fps = options.fps || 60;
    this.gamma = options.gamma ?? 1.0;
    this.rim = options.rim ?? 1.15;
    this.light = options.light || [0.6, -0.8];
    this.onReady = options.onReady || null;
    this.onLayout = options.onLayout || null;

    this.aspect = 0.6;
    this.pal = buildPalette(options.colors || DEFAULT_COLORS);
    this.image = new Image();
    this.ready = false;
    this.visible = true;
    this.isTalking = false;
    this.pointer = null;
    this.raf = null;
    this.lastTime = 0;

    this.crop = null;
    this.field = null;
    this.baseCanvas = null;
    this.fs = 0;

    this.initEvents();
    this.load();
  }

  load() {
    this.image.crossOrigin = 'anonymous';
    this.image.onload = () => {
      const w = this.image.naturalWidth || this.image.width;
      const h = this.image.naturalHeight || this.image.height;
      const cols = this.cols;
      const rows = Math.round(cols * this.aspect * (h / w));

      this.crop = { cols, rows };
      this.field = computeAsciiField(this.image, {
        cols,
        rows,
        light: this.light,
        rim: this.rim
      });

      this.ready = true;
      this.layout();
      if (typeof this.onReady === 'function') this.onReady();
    };
    this.image.onerror = () => {
      if (!this.image.src.endsWith('yassin-ascii-source.png')) {
        this.image.src = 'img/yassin-ascii-source.png';
      }
    };
    this.image.src = this.src;
  }

  layout() {
    if (!this.crop || !this.box) return;
    const boxW = this.box.clientWidth || Math.min(window.innerWidth * 0.88, 880);
    this.fs = boxW / (this.crop.cols * this.aspect);
    const W = Math.round(this.crop.cols * this.aspect * this.fs);
    const H = Math.round(this.crop.rows * this.fs);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `600 ${this.fs}px ${this.font}`;
    this.ctx.textBaseline = 'top';
    this.ctx.textRendering = 'optimizeSpeed';

    this.renderBaseFrame(dpr);
    this.draw();
    if (typeof this.onLayout === 'function') this.onLayout();
  }

  renderBaseFrame(dpr) {
    if (!this.crop || !this.field) return;
    const { cols, rows } = this.crop;
    const { tone, isSubject, rimFacing } = this.field;
    const ramp = RAMPS[this.ramp] || RAMPS.classic;
    const top = ramp.length - 1;
    const rimFloor = Math.max(1, Math.ceil(top * 0.22));

    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = this.canvas.width;
    this.baseCanvas.height = this.canvas.height;
    const bctx = this.baseCanvas.getContext('2d', { alpha: true });
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.font = `600 ${this.fs}px ${this.font}`;
    bctx.textBaseline = 'top';
    bctx.textRendering = 'optimizeSpeed';

    for (let y = 0; y < rows; y++) {
      const bufs = [];
      for (let x = 0; x < cols; x++) {
        const p = y * cols + x;
        if (!isSubject[p]) continue;

        const rim = rimFacing[p];
        let idx = Math.round(Math.pow(tone[p], this.gamma) * top);
        idx = Math.max(1, Math.min(top, idx));
        if (rim > 0.45) idx = Math.max(idx, rimFloor);

        const r = rim > 0.6 ? 2 : rim > 0.25 ? 1 : 0;
        const level = Math.round((idx / top) * (TONE_LEVELS - 1));
        const k = r * TONE_LEVELS + level;
        (bufs[k] ||= new Array(cols).fill(' '))[x] = ramp[idx];
      }

      for (let k = 0; k < bufs.length; k++) {
        if (!bufs[k]) continue;
        bctx.fillStyle = this.pal.css[k];
        bctx.fillText(bufs[k].join(''), 0, y * this.fs);
      }
    }
  }

  draw() {
    if (!this.ready || !this.crop || !this.baseCanvas) return;
    const { cols, rows } = this.crop;
    const cw = this.fs * this.aspect;

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.baseCanvas, 0, 0);

    // Silhouette-only spotlight highlight using source-atop
    if (this.pointer) {
      this.ctx.globalCompositeOperation = 'source-atop';
      const radius = Math.max(160, this.canvas.width * 0.18);
      const grad = this.ctx.createRadialGradient(
        this.pointer.x, this.pointer.y, 0,
        this.pointer.x, this.pointer.y, radius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Subtle mouth shimmer while Digital Twin is speaking
    if (this.isTalking && Math.random() < 0.45) {
      this.ctx.globalCompositeOperation = 'source-over';
      const mx0 = Math.round(cols * 0.44);
      const mx1 = Math.round(cols * 0.56);
      const my0 = Math.round(rows * 0.48);
      const my1 = Math.round(rows * 0.54);
      this.ctx.fillStyle = this.pal.css[this.pal.css.length - 1];
      for (let my = my0; my <= my1; my++) {
        for (let mx = mx0; mx <= mx1; mx++) {
          if (Math.random() < 0.3) {
            this.ctx.fillText('~', mx * cw, my * this.fs);
          }
        }
      }
    }

    this.ctx.restore();
  }

  setTalking(isTalking) {
    this.isTalking = !!isTalking;
    if (this.isTalking) {
      this.startTalkingLoop();
    } else {
      this.stopTalkingLoop();
      this.draw();
    }
  }

  startTalkingLoop() {
    if (this.raf) return;
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      if (!this.ready || now - this.lastTime < 1000 / this.fps || document.hidden || !this.visible) return;
      this.lastTime = now;
      if (this.isTalking) this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stopTalkingLoop() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  initEvents() {
    this.canvas.addEventListener('pointermove', (e) => {
      const scaleX = this.canvas.width / this.canvas.clientWidth;
      const scaleY = this.canvas.height / this.canvas.clientHeight;
      this.pointer = { x: e.offsetX * scaleX, y: e.offsetY * scaleY };
      this.draw();
    }, { passive: true });

    const clearPointer = () => {
      if (this.pointer !== null) {
        this.pointer = null;
        this.draw();
      }
    };

    this.canvas.addEventListener('pointerleave', clearPointer, { passive: true });

    const dock = document.getElementById('twin-dock');
    if (dock) dock.addEventListener('pointerenter', clearPointer, { passive: true });

    if (this.box) {
      new ResizeObserver(() => this.layout()).observe(this.box);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(this.box);
    }
  }
}
