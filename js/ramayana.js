/* RAMAYANA — living painted film.
   A 2D canvas film: each Kanda gets a hand-painted animated scene
   (gradient skies, silhouettes, particles), crossfading as you scroll.
   Chapters drive the HUD: Kanda name, Rama's age, era, progress. */
(() => {
'use strict';

const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- utils ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function vgrad(stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/* ---------------- canvas sizing ---------------- */
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 1.75);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize);
resize();

/* ---------------- paint helpers ---------------- */
function stars(seed, n, t, maxA = 0.9) {
  const r = mulberry32(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H * 0.62, s = r() * 1.6 + 0.4;
    const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + r() * 9);
    ctx.globalAlpha = maxA * tw * (1 - y / (H * 0.7));
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function moon(x, y, r) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
  g.addColorStop(0, 'rgba(240,238,220,0.9)');
  g.addColorStop(0.25, 'rgba(240,238,220,0.28)');
  g.addColorStop(1, 'rgba(240,238,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#f2eeda';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(190,188,170,0.5)';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.15, 0, 7); ctx.fill();
}

function sun(x, y, r, core, glow) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 3.2);
  g.addColorStop(0, core);
  g.addColorStop(0.3, glow);
  g.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

function ridge(baseY, color, seed, jag = 0.35, minH = 60, maxH = 260) {
  const r = mulberry32(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, baseY);
  let x = 0;
  while (x < W) {
    const w = 60 + r() * 160;
    const h = minH + r() * (maxH - minH);
    ctx.lineTo(x + w * 0.5, baseY - h * (0.6 + r() * jag));
    ctx.lineTo(x + w, baseY - h * 0.25 * r());
    x += w;
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function pines(baseY, color, seed, n, hMin, hMax) {
  const r = mulberry32(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = r() * W, h = hMin + r() * (hMax - hMin), w = h * 0.28;
    ctx.fillRect(x - w * 0.08, baseY - h * 0.35, w * 0.16, h * 0.35); // trunk
    for (let k = 0; k < 4; k++) {
      const ty = baseY - h * 0.3 - (h * 0.7 * k) / 3;
      const tw = w * (1 - k * 0.2);
      ctx.beginPath();
      ctx.moveTo(x - tw, ty); ctx.lineTo(x + tw, ty); ctx.lineTo(x, ty - h * 0.28);
      ctx.closePath(); ctx.fill();
    }
  }
}

function canopyTrees(baseY, color, seed, n, hMin, hMax) {
  const r = mulberry32(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = r() * W, h = hMin + r() * (hMax - hMin);
    ctx.fillRect(x - h * 0.03, baseY - h * 0.5, h * 0.06, h * 0.5);
    const blobs = 3 + Math.floor(r() * 3);
    for (let b = 0; b < blobs; b++) {
      const bx = x + (r() - 0.5) * h * 0.5;
      const by = baseY - h * 0.55 - r() * h * 0.35;
      const br = h * (0.14 + r() * 0.14);
      ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
    }
  }
}

function palace(x, baseY, s, color) {
  ctx.fillStyle = color;
  const w = 300 * s;
  ctx.fillRect(x - w / 2, baseY - 90 * s, w, 90 * s);           // main block
  ctx.fillRect(x - w * 0.32, baseY - 150 * s, w * 0.64, 60 * s); // upper block
  // central dome
  ctx.beginPath(); ctx.arc(x, baseY - 150 * s, 46 * s, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - 3 * s, baseY - 230 * s, 6 * s, 40 * s);        // finial
  // side domes
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.arc(x + sx * w * 0.38, baseY - 90 * s, 30 * s, Math.PI, 0); ctx.fill();
    ctx.fillRect(x + sx * w * 0.38 - 2 * s, baseY - 150 * s, 4 * s, 32 * s);
    // spire
    ctx.beginPath();
    ctx.moveTo(x + sx * w * 0.52 - 8 * s, baseY - 90 * s);
    ctx.lineTo(x + sx * w * 0.52 + 8 * s, baseY - 90 * s);
    ctx.lineTo(x + sx * w * 0.52, baseY - 190 * s);
    ctx.closePath(); ctx.fill();
  }
}

function lankaTowers(x, baseY, s, color, seed) {
  const r = mulberry32(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    const tx = x + (r() - 0.5) * 560 * s;
    const th = (120 + r() * 160) * s, tw = (26 + r() * 22) * s;
    ctx.fillRect(tx - tw / 2, baseY - th, tw, th);
    ctx.beginPath(); ctx.arc(tx, baseY - th, tw * 0.7, Math.PI, 0); ctx.fill();
    ctx.fillRect(tx - 2 * s, baseY - th - 46 * s, 4 * s, 26 * s);
  }
}

function sea(y, cTop, cBot, t, amp = 7) {
  const g = ctx.createLinearGradient(0, y - 30, 0, H);
  g.addColorStop(0, cTop); g.addColorStop(1, cBot);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H); ctx.lineTo(0, y);
  const tt = reduced ? 0 : t;
  for (let x = 0; x <= W; x += 24) {
    ctx.lineTo(x, y + Math.sin(x * 0.02 + tt * 1.4) * amp + Math.sin(x * 0.05 - tt) * amp * 0.4);
  }
  ctx.lineTo(W, H);
  ctx.closePath(); ctx.fill();
}

function birds(n, t, color, seed, yBand = [0.12, 0.4]) {
  const r = mulberry32(seed);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const bx = (r() * 1.4 - 0.2 + (reduced ? 0 : t * 0.008 * (0.5 + r()))) % 1.2;
    const x = bx * W, y = H * (yBand[0] + r() * (yBand[1] - yBand[0]));
    const s = 6 + r() * 8, f = reduced ? 0 : Math.sin(t * 6 + r() * 9) * 3;
    ctx.beginPath();
    ctx.moveTo(x - s, y + f); ctx.quadraticCurveTo(x, y - 4 - f, x, y);
    ctx.quadraticCurveTo(x, y - 4 - f, x + s, y + f);
    ctx.stroke();
  }
}

/* ---------------- particles ---------------- */
function makeParticles(n, seed, init) {
  const r = mulberry32(seed);
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(init(r, i));
  return arr;
}
function drawDots(arr, color, size, glow = 0) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color;
  for (const p of arr) {
    ctx.globalAlpha = p.a;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.s * size, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const drift = (arr, t, fn) => { if (!reduced) for (const p of arr) fn(p, t); };
/* ---------------- scenes ----------------
   Each painter: (p, t) — p = progress inside the scene's chapter (0..1),
   t = seconds. Painted fresh every frame. */
const scenes = {};

const fireflies = makeParticles(70, 11, (r) => ({
  x: r() * 2000, y: 0, s: 0.8 + r() * 1.8, a: 0.4 + r() * 0.6,
  ph: r() * 9, sp: 0.3 + r() * 0.7, base: 0.35 + r() * 0.55,
}));
const embers = makeParticles(90, 22, (r) => ({
  x: r() * 2000, y: r() * 1200, s: 0.8 + r() * 2.2, a: 0.5 + r() * 0.5,
  vy: 20 + r() * 60, sway: r() * 9, base: r(),
}));
const petals = makeParticles(60, 33, (r) => ({
  x: r() * 2000, y: r() * 1200, s: 1.5 + r() * 2.5, a: 0.5 + r() * 0.5,
  vy: 14 + r() * 30, sway: r() * 9, rot: r() * 9,
}));
const diyas = makeParticles(26, 44, (r) => ({
  x: r() * 2000, y: 0, s: 2 + r() * 3, a: 0.7 + r() * 0.3,
  ph: r() * 9, base: 0.55 + r() * 0.4,
}));

scenes.intro = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#04060f'], [0.55, '#0a1430'], [1, '#16294f']]);
  ctx.fillRect(0, 0, W, H);
  stars(7, 220, t);
  moon(W * 0.78, H * 0.2, 46);
  ridge(H * 0.86, '#0a1024', 101, 0.3, 40, 120);
  palace(W * 0.5, H * 0.9, 1.15, '#060a18');
  // river shimmer
  ctx.fillStyle = 'rgba(120,150,220,0.10)';
  ctx.fillRect(0, H * 0.9, W, H * 0.1);
  drift(fireflies, t, (q) => {
    q.x = (q.base * W * 1.2 + t * 12 * q.sp) % (W + 80) - 40;
    q.y = H * (0.55 + 0.3 * Math.sin(t * q.sp + q.ph)) + Math.sin(t * 2 + q.ph) * 14;
    q.a = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.6 + q.ph));
  });
  drawDots(fireflies.map(q => ({ ...q, x: q.x % (W + 80) })), '#ffe9a0', 1.6, 8);
};

scenes.bala = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#2b1a4e'], [0.45, '#a34a3a'], [0.72, '#ff9a3c'], [1, '#ffd97a']]);
  ctx.fillRect(0, 0, W, H);
  sun(W * 0.5, lerp(H * 0.75, H * 0.42, p), 54, '#fff3c8', 'rgba(255,180,80,0.55)');
  ridge(H * 0.8, 'rgba(90,40,60,0.85)', 202, 0.35, 50, 170);
  palace(W * 0.32, H * 0.92, 1.3, 'rgba(40,16,40,0.95)');
  pines(H * 0.97, 'rgba(30,20,35,0.9)', 203, 26, 60, 150);
  birds(7, t, 'rgba(40,20,40,0.8)', 204);
  // yajna flame glow on the horizon
  const fg = ctx.createRadialGradient(W * 0.68, H * 0.88, 4, W * 0.68, H * 0.88, 190);
  fg.addColorStop(0, 'rgba(255,200,90,0.75)');
  fg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(W * 0.68 - 200, H * 0.88 - 200, 400, 220);
  drift(embers, t, (q) => {
    q.y -= q.vy * 0.016; q.x += Math.sin(t * 2 + q.sway) * 0.6;
    if (q.y < H * 0.3) { q.y = H * 0.92; q.x = W * (0.55 + q.base * 0.3); }
  });
  drawDots(embers, '#ffcf7a', 1.4, 10);
};

scenes.ayodhya = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#160f33'], [0.5, '#5a2358'], [0.78, '#c8503f'], [1, '#ff8c42']]);
  ctx.fillRect(0, 0, W, H);
  sun(W * 0.72, H * (0.62 + p * 0.1), 40, '#ffd9a0', 'rgba(255,140,66,0.5)');
  palace(W * 0.5, H * 0.88, 1.5, '#120a24');
  // palace lamps
  const r = mulberry32(305);
  ctx.save(); ctx.shadowColor = '#ffca7a'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffd9a0';
  for (let i = 0; i < 26; i++) {
    const lx = W * 0.5 + (r() - 0.5) * 380, ly = H * 0.88 - r() * 130;
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i));
    ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, 7); ctx.fill();
  }
  ctx.restore();
  sea(H * 0.88, 'rgba(200,90,80,0.55)', 'rgba(20,8,30,0.95)', t, 5);
  // floating diyas on the river
  drift(diyas, t, (q) => {
    q.x = (q.base * W * 1.2 + t * 8) % (W + 60) - 30;
    q.y = H * (0.9 + 0.06 * Math.sin(t + q.ph));
    q.a = 0.5 + 0.4 * Math.abs(Math.sin(t * 2.2 + q.ph));
  });
  drawDots(diyas, '#ffca7a', 1.5, 12);
};

scenes.aranya = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#03130b'], [0.6, '#0a2e1c'], [1, '#134a2a']]);
  ctx.fillRect(0, 0, W, H);
  // god rays
  ctx.save(); ctx.globalAlpha = 0.10;
  const rg = ctx.createLinearGradient(0, 0, W, H);
  rg.addColorStop(0, '#ffe9a0'); rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg;
  for (let i = 0; i < 4; i++) {
    const x = W * (0.15 + i * 0.22) + Math.sin(t * 0.2 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 220, H); ctx.lineTo(x + 60, H);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  canopyTrees(H * 0.72, '#0a2417', 401, 22, 200, 420);
  canopyTrees(H * 0.9, '#06170f', 402, 30, 160, 340);
  pines(H * 1.0, '#030c07', 403, 30, 200, 420);
  // mist bands
  ctx.fillStyle = 'rgba(200,230,200,0.05)';
  for (let i = 0; i < 3; i++) {
    const my = H * (0.55 + i * 0.14) + Math.sin(t * 0.3 + i * 2) * 12;
    ctx.fillRect(0, my, W, 46);
  }
  drift(fireflies, t, (q) => {
    q.x = (q.base * W * 1.2 + t * 10 * q.sp) % (W + 80) - 40;
    q.y = H * (0.4 + 0.4 * Math.sin(t * q.sp * 0.7 + q.ph)) + Math.sin(t * 2 + q.ph) * 16;
    q.a = 0.2 + 0.6 * Math.abs(Math.sin(t * 1.4 + q.ph));
  });
  drawDots(fireflies, '#d8ffb0', 1.7, 9);
};

scenes.kishkindha = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#0a1c28'], [0.55, '#274b5e'], [0.85, '#6fa0a8'], [1, '#a8c8c0']]);
  ctx.fillRect(0, 0, W, H);
  ridge(H * 0.7, 'rgba(30,60,75,0.9)', 501, 0.5, 140, 380);
  ridge(H * 0.85, 'rgba(18,38,50,0.95)', 502, 0.4, 100, 260);
  // waterfall streak
  const wx = W * (0.3 + 0.04 * Math.sin(t * 0.2));
  const wg = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.85);
  wg.addColorStop(0, 'rgba(230,245,245,0.0)');
  wg.addColorStop(0.5, 'rgba(230,245,245,0.5)');
  wg.addColorStop(1, 'rgba(230,245,245,0.1)');
  ctx.fillStyle = wg;
  ctx.fillRect(wx - 9, H * 0.3, 18, H * 0.55);
  ridge(H * 1.0, '#0a1820', 503, 0.3, 60, 180);
  birds(9, t, 'rgba(15,30,40,0.85)', 504);
  ctx.fillStyle = 'rgba(220,235,235,0.07)';
  for (let i = 0; i < 3; i++) {
    const my = H * (0.5 + i * 0.13) + Math.sin(t * 0.25 + i * 2.4) * 14;
    ctx.fillRect(0, my, W, 40);
  }
};

scenes.sundara = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#020610'], [0.55, '#0a2342'], [0.8, '#123a63'], [1, '#0a1c34']]);
  ctx.fillRect(0, 0, W, H);
  stars(8, 160, t, 0.7);
  moon(W * 0.68, H * 0.2, 58);
  // moon path on the sea
  const mg = ctx.createLinearGradient(0, H * 0.66, 0, H);
  mg.addColorStop(0, 'rgba(240,238,220,0.30)');
  mg.addColorStop(1, 'rgba(240,238,220,0.02)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.moveTo(W * 0.6, H * 0.66); ctx.lineTo(W * 0.76, H * 0.66);
  ctx.lineTo(W * 0.84, H); ctx.lineTo(W * 0.52, H);
  ctx.closePath(); ctx.fill();
  sea(H * 0.66, '#0e2c52', '#030a18', t, 8);
  // Lanka on the horizon, burning
  lankaTowers(W * 0.24, H * 0.68, 0.8, '#050914', 601);
  const fl = ctx.createRadialGradient(W * 0.24, H * 0.6, 6, W * 0.24, H * 0.6, 260);
  fl.addColorStop(0, 'rgba(255,140,50,0.5)');
  fl.addColorStop(1, 'rgba(255,80,30,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(W * 0.24 - 270, H * 0.6 - 270, 540, 340);
  // Hanuman's burning trail across the sky
  ctx.save();
  ctx.strokeStyle = 'rgba(255,150,60,0.75)';
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.shadowColor = '#ff9040'; ctx.shadowBlur = 18;
  ctx.beginPath();
  const ax0 = W * (0.05 + p * 0.1), ay0 = H * 0.55;
  ctx.moveTo(ax0, ay0);
  ctx.quadraticCurveTo(W * 0.42, H * 0.05, W * (0.72 - p * 0.08), H * 0.34);
  ctx.stroke();
  ctx.restore();
  drift(embers, t, (q) => {
    q.y -= q.vy * 0.014; q.x += Math.sin(t * 2 + q.sway) * 0.8;
    if (q.y < H * 0.25) { q.y = H * 0.66; q.x = W * (0.1 + q.base * 0.35); }
  });
  drawDots(embers, '#ffb060', 1.5, 10);
};

scenes.yuddha = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#1a0505'], [0.5, '#6e1a10'], [0.78, '#c33d1e'], [1, '#ff7a2a']]);
  ctx.fillRect(0, 0, W, H);
  sun(W * 0.5, H * (0.66 - p * 0.06), 66, '#ffe0a8', 'rgba(255,110,40,0.55)');
  sea(H * 0.7, 'rgba(160,50,30,0.6)', 'rgba(30,8,8,0.95)', t, 9);
  // Rama Setu — arc of stones across the sea
  ctx.fillStyle = '#2a1210';
  const r = mulberry32(701);
  for (let i = 0; i <= 40; i++) {
    const bx = (i / 40) * W;
    const by = H * 0.7 - Math.sin((i / 40) * Math.PI) * H * 0.1;
    const bs = 14 + r() * 22;
    ctx.beginPath();
    ctx.ellipse(bx, by + r() * 8, bs, bs * 0.55, 0, 0, 7);
    ctx.fill();
  }
  // banner poles on the near shore
  ctx.fillStyle = '#160606';
  const br = mulberry32(702);
  for (let i = 0; i < 8; i++) {
    const px = br() * W, ph = 120 + br() * 120;
    ctx.fillRect(px, H - ph, 7, ph);
    ctx.beginPath();
    ctx.moveTo(px + 7, H - ph); ctx.lineTo(px + 66, H - ph + 20); ctx.lineTo(px + 7, H - ph + 44);
    ctx.closePath(); ctx.fill();
  }
  drift(embers, t, (q) => {
    q.y -= q.vy * 0.02; q.x += Math.sin(t * 2.4 + q.sway) * 1;
    if (q.y < 0) { q.y = H; q.x = q.base * W; }
    q.a = 0.35 + 0.5 * Math.abs(Math.sin(t * 3 + q.sway));
  });
  drawDots(embers, '#ff8a3c', 1.8, 12);
};

scenes.uttara = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#0e2a4a'], [0.5, '#4a86b0'], [0.78, '#ffd9a0'], [1, '#ffe9b8']]);
  ctx.fillRect(0, 0, W, H);
  sun(W * 0.5, lerp(H * 0.6, H * 0.34, p), 50, '#fff6dc', 'rgba(255,210,130,0.5)');
  ridge(H * 0.8, 'rgba(70,110,140,0.7)', 801, 0.3, 40, 140);
  palace(W * 0.5, H * 0.9, 1.35, 'rgba(35,55,85,0.95)');
  sea(H * 0.9, 'rgba(150,190,220,0.5)', 'rgba(25,60,95,0.9)', t, 5);
  birds(6, t, 'rgba(40,60,90,0.8)', 802);
  drift(diyas, t, (q) => {
    q.x = (q.base * W * 1.2 + t * 7) % (W + 60) - 30;
    q.y = H * (0.9 + 0.05 * Math.sin(t * 0.9 + q.ph));
    q.a = 0.5 + 0.4 * Math.abs(Math.sin(t * 2 + q.ph));
  });
  drawDots(diyas, '#ffe2a8', 1.6, 12);
  drift(petals, t, (q) => {
    q.y -= q.vy * 0.016; q.x += Math.sin(t * 1.4 + q.sway) * 0.9;
    if (q.y < 0) { q.y = H; q.x = q.base * W; }
  });
  ctx.save();
  ctx.fillStyle = '#ffc4d0';
  for (const q of petals) {
    ctx.globalAlpha = q.a * 0.85;
    ctx.beginPath();
    ctx.ellipse((q.x % (W + 40)), q.y, q.s, q.s * 0.6, q.rot + t * 0.4, 0, 7);
    ctx.fill();
  }
  ctx.restore();
};

scenes.outro = (p, t) => {
  ctx.fillStyle = vgrad([[0, '#3a1c00'], [0.5, '#b35a1e'], [0.78, '#ff9a3c'], [1, '#ffe9b8']]);
  ctx.fillRect(0, 0, W, H);
  sun(W * 0.5, H * (0.52 - p * 0.08), 88, '#fff8e0', 'rgba(255,170,70,0.6)');
  sea(H * 0.78, 'rgba(255,170,90,0.45)', 'rgba(90,40,10,0.9)', t, 6);
  drift(diyas, t, (q) => {
    q.x = (q.base * W * 1.2 + t * 6) % (W + 60) - 30;
    q.y = H * (0.78 + 0.12 * Math.sin(t * 0.8 + q.ph)) - p * H * 0.1;
    q.a = 0.5 + 0.45 * Math.abs(Math.sin(t * 2 + q.ph));
  });
  drawDots(diyas, '#ffe6b0', 2, 16);
  drift(petals, t, (q) => {
    q.y -= q.vy * 0.02; q.x += Math.sin(t * 1.6 + q.sway);
    if (q.y < 0) { q.y = H; q.x = q.base * W; }
    q.a = 0.4 + 0.5 * Math.abs(Math.sin(t + q.sway));
  });
  ctx.save();
  ctx.fillStyle = '#ffd9a8';
  for (const q of petals) {
    ctx.globalAlpha = q.a * 0.8;
    ctx.beginPath();
    ctx.ellipse((q.x % (W + 40)), q.y, q.s * 1.2, q.s * 0.7, q.rot + t * 0.5, 0, 7);
    ctx.fill();
  }
  ctx.restore();
};

/* ---------------- driver ---------------- */
const chapters = [...document.querySelectorAll('.chapter')].map((el) => ({
  el,
  scene: el.dataset.scene || 'intro',
  kanda: el.dataset.kanda || '',
  age: parseFloat(el.dataset.age || '0'),
  era: el.dataset.era || '',
  top: 0, bottom: 0,
}));

const hudKanda = document.getElementById('hudKanda');
const hudAge = document.getElementById('hudAge');
const hudEra = document.getElementById('hudEra');
const hudBar = document.getElementById('hudBar');

function measure() {
  const max = document.documentElement.scrollHeight - innerHeight;
  for (const c of chapters) {
    c.top = c.el.offsetTop / Math.max(max, 1);
    c.bottom = (c.el.offsetTop + c.el.offsetHeight) / Math.max(max, 1);
  }
}
measure();
let rszT;
addEventListener('resize', () => { clearTimeout(rszT); rszT = setTimeout(measure, 150); });
addEventListener('load', measure);

let targetP = 0, smoothP = 0;
let curScene = chapters[0] ? chapters[0].scene : 'intro';
let prevScene = curScene, blend = 1;

addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  targetP = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
}, { passive: true });

function activeChapter(p) {
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (p >= chapters[i].top - 0.001) return i;
  }
  return 0;
}

function updateHUD(p) {
  const i = activeChapter(p);
  const c = chapters[i];
  const want = c.scene;
  if (want !== curScene) { prevScene = curScene; curScene = want; blend = 0; }

  hudKanda.textContent = c.kanda;
  hudEra.textContent = c.era;

  // Rama's age: interpolate between chapter ages
  let age = c.age;
  const n = chapters[i + 1];
  if (n && n.age !== c.age) {
    const span = Math.max(n.top - c.top, 1e-6);
    const f = clamp((p - c.top) / span, 0, 1);
    age = lerp(c.age, n.age, f);
  }
  hudAge.textContent = 'Rama · age ' + Math.round(age);

  hudBar.style.width = (p * 100).toFixed(2) + '%';

  // intra-chapter progress for the scene painter
  const span = Math.max(c.bottom - c.top, 1e-6);
  return clamp((p - c.top) / span, 0, 1);
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  const t = reduced ? 0 : now / 1000;

  // damped playhead
  const k = 1 - Math.exp(-5.5 * dt);
  smoothP += (targetP - smoothP) * k;
  if (Math.abs(targetP - smoothP) < 0.0004) smoothP = targetP;

  const p = updateHUD(smoothP);

  // crossfade scenes
  if (blend < 1) blend = Math.min(1, blend + dt * 1.6);

  const paint = scenes[curScene] || scenes.intro;
  if (blend < 1 && scenes[prevScene]) {
    ctx.save();
    scenes[prevScene](p, t);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = blend;
    paint(p, t);
    ctx.restore();
  } else {
    paint(p, t);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
