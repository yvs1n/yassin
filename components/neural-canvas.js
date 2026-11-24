/**
 * Lightweight 3D-Projected Neural Network Canvas (Zero-Dependency 2D Canvas)
 * Replaces 600 KB Three.js WebGL runtime with ~3 KB vanilla perspective math,
 * preserving depth fog, neuron axons, dendrites, mouse parallax, and mobile gyro.
 */

export function initNeuralCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth <= 900;
  const isLowPower = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  const PARTICLE_COUNT = isLowPower ? 90 : 124;
  const NEURON_RATIO = 0.28;
  const NEURON_RANGE_SQ = 130 * 130;
  const DENDRITE_RANGE_SQ = 60 * 60;
  const FRAME_MS = 1000 / 30;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let halfW = width * 0.5;
  let halfH = height * 0.5;
  let camZ = isMobile ? 120 : 200;
  let focal = halfH / Math.tan((75 * Math.PI) / 360);

  const px = new Float32Array(PARTICLE_COUNT);
  const py = new Float32Array(PARTICLE_COUNT);
  const pz = new Float32Array(PARTICLE_COUNT);
  const vx = new Float32Array(PARTICLE_COUNT);
  const vy = new Float32Array(PARTICLE_COUNT);
  const vz = new Float32Array(PARTICLE_COUNT);
  const isNeuron = new Uint8Array(PARTICLE_COUNT);
  const bright = new Float32Array(PARTICLE_COUNT);

  const sx = new Float32Array(PARTICLE_COUNT);
  const sy = new Float32Array(PARTICLE_COUNT);
  const sz = new Float32Array(PARTICLE_COUNT);
  const visible = new Uint8Array(PARTICLE_COUNT);

  const spread = isMobile ? 0.6 : 1.0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    px[i] = (Math.random() - 0.5) * 700 * spread;
    py[i] = (Math.random() - 0.5) * 700 * spread;
    pz[i] = (Math.random() - 0.5) * 500 * spread;

    const hub = Math.random() < NEURON_RATIO ? 1 : 0;
    isNeuron[i] = hub;
    const speed = hub ? 0.2 : 0.35;
    vx[i] = (Math.random() - 0.5) * speed;
    vy[i] = (Math.random() - 0.5) * speed;
    vz[i] = (Math.random() - 0.5) * speed;
    bright[i] = hub ? 0.9 + Math.random() * 0.1 : 0.28 + Math.random() * 0.2;
  }

  let mouseX = 0;
  let mouseY = 0;
  let camX = 0;
  let camY = 0;
  let rotY = 0;
  let sceneRotX = 0;
  let sceneRotY = 0;
  let gyroEnabled = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    halfW = width * 0.5;
    halfH = height * 0.5;
    camZ = width <= 900 ? 120 : 200;
    focal = halfH / Math.tan((75 * Math.PI) / 360);
    const dpr = isLowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (prefersReducedMotion) renderFrame(false, 1);
  }

  function gyroHandler(e) {
    if (e.gamma != null && e.beta != null) {
      gyroEnabled = true;
      mouseX = e.gamma * 12;
      mouseY = (e.beta - 45) * 12;
    }
  }

  function enableGyro() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === 'granted') window.addEventListener('deviceorientation', gyroHandler, { passive: true });
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', gyroHandler, { passive: true });
    }
  }
  window.enableGyro = enableGyro;

  document.addEventListener('click', enableGyro, { once: true, passive: true });
  document.addEventListener('touchstart', enableGyro, { once: true, passive: true });
  document.addEventListener('mousemove', (e) => {
    if (gyroEnabled) return;
    mouseX = (e.clientX - halfW) * 0.5;
    mouseY = (e.clientY - halfH) * 0.5;
  }, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  function renderFrame(move, timeScale) {
    ctx.clearRect(0, 0, width, height);
    rotY += 0.0005 * timeScale;

    if (gyroEnabled) {
      sceneRotX += (-mouseY * 0.0003 - sceneRotX) * 0.05;
      sceneRotY += (mouseX * 0.0003 - sceneRotY) * 0.05;
      camX += (0 - camX) * 0.05;
      camY += (0 - camY) * 0.05;
    } else {
      camX += (mouseX - camX) * 0.025;
      camY += (-mouseY - camY) * 0.025;
      sceneRotX += (0 - sceneRotX) * 0.05;
      sceneRotY += (0 - sceneRotY) * 0.05;
    }

    const ay = rotY + sceneRotY;
    const cosY = Math.cos(ay);
    const sinY = Math.sin(ay);
    const cosX = Math.cos(sceneRotX);
    const sinX = Math.sin(sceneRotX);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (move) {
        px[i] += vx[i] * timeScale;
        py[i] += vy[i] * timeScale;
        pz[i] += vz[i] * timeScale;
        if (Math.abs(px[i]) > 350) vx[i] *= -1;
        if (Math.abs(py[i]) > 350) vy[i] *= -1;
        if (Math.abs(pz[i]) > 250) vz[i] *= -1;
      }

      const x1 = px[i] * cosY + pz[i] * sinY;
      const z1 = -px[i] * sinY + pz[i] * cosY;
      const y2 = py[i] * cosX - z1 * sinX;
      const z2 = py[i] * sinX + z1 * cosX;

      const dz = camZ - z2;
      if (dz <= 8) {
        visible[i] = 0;
        continue;
      }
      visible[i] = 1;
      const scale = focal / dz;
      sx[i] = halfW + (x1 - camX) * scale;
      sy[i] = halfH - (y2 - camY) * scale;
      sz[i] = dz;
    }

    // Batched Dendrite Lines (faint) & Neuron Axon Lines (bright)
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (!isNeuron[i] || !visible[i]) continue;
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (isNeuron[j] || !visible[j]) continue;
        const dx = px[i] - px[j];
        const dy = py[i] - py[j];
        const dz = pz[i] - pz[j];
        if (dx * dx + dy * dy + dz * dz < DENDRITE_RANGE_SQ) {
          ctx.moveTo(sx[i], sy[i]);
          ctx.lineTo(sx[j], sy[j]);
        }
      }
    }
    ctx.strokeStyle = 'rgba(136, 136, 136, 0.10)';
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (!isNeuron[i] || !visible[i]) continue;
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (!isNeuron[j] || !visible[j]) continue;
        const dx = px[i] - px[j];
        const dy = py[i] - py[j];
        const dz = pz[i] - pz[j];
        if (dx * dx + dy * dy + dz * dz < NEURON_RANGE_SQ) {
          ctx.moveTo(sx[i], sy[i]);
          ctx.lineTo(sx[j], sy[j]);
        }
      }
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.stroke();

    // Crisp perspective-attenuated square nodes (faithful to WebGL gl_PointCoord)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (!visible[i]) continue;
      const dz = sz[i];
      const fog = Math.exp(-dz * dz * 0.0000022);
      const size = Math.max(1.2, Math.min(5.5, (2.5 * focal) / dz));
      const c = Math.round(bright[i] * 255);
      ctx.fillStyle = `rgba(${c}, ${c}, ${c}, ${(0.85 * fog).toFixed(2)})`;
      ctx.fillRect(sx[i] - size * 0.5, sy[i] - size * 0.5, size, size);
    }
  }

  resize();
  if (prefersReducedMotion) {
    renderFrame(false, 1);
    return;
  }

  let lastTime = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const elapsed = now - lastTime;
    if (elapsed < FRAME_MS) return;
    lastTime = now - (elapsed % FRAME_MS);
    renderFrame(true, Math.min(elapsed / 16.6667, 2.5));
  }
  requestAnimationFrame(loop);
}
