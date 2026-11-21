/**
 * Pure Image-to-ASCII Field Processor
 * Computes monochrome 15-bucket color palette, unsharp-masked luminance,
 * and 2.5D chamfer distance transform surface normals for rim lighting.
 */

export const RAMPS = {
  classic: ' .:-=+*#%@',
  fine: " .'`^,:;Il!i~+_-?]}1)|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@",
  symbols: ' .-+x*#',
  blocks: ' ░▒▓█'
};

export const TONE_LEVELS = 5;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

export function buildPalette(colors) {
  const sh = hexToRgb(colors.shadow);
  const md = hexToRgb(colors.mid);
  const hi = hexToRgb(colors.high);
  const rm = hexToRgb(colors.rim);
  const css = [];

  for (let r = 0; r < 3; r++) {
    for (let l = 0; l < TONE_LEVELS; l++) {
      const t = l / (TONE_LEVELS - 1);
      const base = t < 0.5 ? mixRgb(sh, md, t * 2) : mixRgb(md, hi, (t - 0.5) * 2);
      const col = mixRgb(base, rm, (r / 2) * 0.85);
      const alpha = Math.min(1, 0.45 + 0.55 * t + (r ? 0.15 : 0));
      css.push(`rgba(${col.join(',')}, ${alpha})`);
    }
  }

  return { css };
}

export function computeAsciiField(image, { cols, rows, light, rim }) {
  const sample = document.createElement('canvas');
  sample.width = cols;
  sample.height = rows;
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(image, 0, 0, cols, rows);

  const data = sctx.getImageData(0, 0, cols, rows).data;
  const n = cols * rows;
  const lum = new Float32Array(n);
  const isSubject = new Uint8Array(n);

  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] < 25) continue;
    isSubject[p] = 1;
    lum[p] = (0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2]) / 255;
  }

  // Spatial unsharp mask for crisp facial features
  const tone = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      if (!isSubject[p]) continue;
      let l = lum[p];
      if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) {
        const blur = (lum[p - 1] + lum[p + 1] + lum[p - cols] + lum[p + cols]) * 0.25;
        l += (l - blur) * 1.25;
      }
      tone[p] = Math.max(0.10, Math.min(1.0, l));
    }
  }

  // Two-pass chamfer distance transform for 2.5D surface normals
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) dist[p] = isSubject[p] ? 1e4 : 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      if (!dist[p]) continue;
      if (x > 0) dist[p] = Math.min(dist[p], dist[p - 1] + 1);
      if (y > 0) dist[p] = Math.min(dist[p], dist[p - cols] + 1);
      if (x > 0 && y > 0) dist[p] = Math.min(dist[p], dist[p - cols - 1] + 1.4);
      if (x < cols - 1 && y > 0) dist[p] = Math.min(dist[p], dist[p - cols + 1] + 1.4);
    }
  }

  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const p = y * cols + x;
      if (!dist[p]) continue;
      if (x < cols - 1) dist[p] = Math.min(dist[p], dist[p + 1] + 1);
      if (y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols] + 1);
      if (x < cols - 1 && y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols + 1] + 1.4);
      if (x > 0 && y < rows - 1) dist[p] = Math.min(dist[p], dist[p + cols - 1] + 1.4);
      if (dist[p] > 9e3) dist[p] = 40;
    }
  }

  // Pre-compute surface normal dot light for rim highlights
  const ln = Math.hypot(light[0], light[1]) || 1;
  const lx = light[0] / ln;
  const ly = light[1] / ln;
  const at = (x, y) => dist[Math.max(0, Math.min(rows - 1, y)) * cols + Math.max(0, Math.min(cols - 1, x))];

  const rimFacing = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      const d = dist[p];
      if (!d) continue;
      const nx = at(x + 1, y) - at(x - 1, y);
      const ny = at(x, y + 1) - at(x, y - 1);
      const facing = Math.max(0, -(nx * lx + ny * ly) / (Math.hypot(nx, ny) || 1));
      rimFacing[p] = Math.max(0, 1 - (d - 1) / 3.5) * (0.3 + 0.7 * facing) * rim;
    }
  }

  return { tone, isSubject, rimFacing };
}
