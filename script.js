/**
 * Yassin Ragab — Portfolio Entry Point
 * Wires the Neural Canvas, Hero Layout, ASCII Hologram Avatar, and Digital Twin Dock.
 */

import { AsciiAvatar } from './components/ascii-avatar.js';
import { initHeroLayout, updateMobileHeroLayout } from './components/hero-layout.js';
import { initNeuralCanvas } from './components/neural-canvas.js';
import { initTwinDock } from './components/twin-dock.js';

function boot() {
  initNeuralCanvas();
  initHeroLayout();

  const canvas = document.getElementById('ascii-avatar-canvas');
  let avatar = null;

  if (canvas) {
    avatar = new AsciiAvatar(canvas, {
      src: 'img/yassin-ascii-source.webp?v=27',
      cols: 140,
      ramp: 'classic',
      fps: 60,
      gamma: 1.0,
      rim: 1.15,
      onReady: updateMobileHeroLayout,
      onLayout: updateMobileHeroLayout
    });
    window.__avatar = avatar;
  }

  initTwinDock({ avatar });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
