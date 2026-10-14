/* RAMAYANA — the Yatra. A scroll-driven 3D flight through the epic.
 * Nine dioramas (intro + 7 Kandas + finale), one per chapter of the story.
 * The camera flies from diorama to diorama as you scroll; the HUD tracks
 * Rama's age and the era. Same butter-smooth playhead engine as HELIOS.
 */
import * as THREE from 'three';

const canvas = document.getElementById('film');
const hudKanda = document.getElementById('hudKanda');
const hudAge = document.getElementById('hudAge');
const hudEra = document.getElementById('hudEra');
const hudBar = document.getElementById('hudBar');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);

/* Seeded random for stable dioramas */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.getElementById('nogl').hidden = false;
  document.querySelectorAll('.chapter').forEach((el) => el.classList.add('is-active'));
  throw e;
}

const PR_CAP = isCoarse ? 1.5 : 2;
let pixelRatio = Math.min(devicePixelRatio || 1, PR_CAP);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060f);
scene.fog = new THREE.Fog(0x04060f, 60, 260);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);

/* ---------------- procedural textures ---------------- */
function canvasTex(w, h, painter) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  painter(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

/* Character sprites from the embedded pixel art (assets/img*.js) */
const charTex = {};
function loadCharacters() {
  const src = window.RAM_IMAGES || {};
  const loader = new THREE.TextureLoader();
  for (const key of Object.keys(src)) {
    const tex = loader.load('data:image/webp;base64,' + src[key]);
    tex.colorSpace = THREE.SRGBColorSpace;
    charTex[key] = tex;
  }
}

/* ---------------- build helpers ---------------- */
const MAT = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function box(w, h, d, c, x, y, z, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT(c, o));
  m.position.set(x, y, z);
  return m;
}
function cyl(rt, rb, h, c, x, y, z, seg = 10, o) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), MAT(c, o));
  m.position.set(x, y, z);
  return m;
}
function cone(r, h, c, x, y, z, seg = 8, o) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), MAT(c, o));
  m.position.set(x, y, z);
  return m;
}
function ball(r, c, x, y, z, o) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), MAT(c, o));
  m.position.set(x, y, z);
  return m;
}
function glowSprite(color, s, x, y, z, opacity = 0.9) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sp.scale.set(s, s, 1);
  sp.position.set(x, y, z);
  return sp;
}
/* Points cloud with per-point velocity; animate via driftPoints() */
function makePoints(n, color, size, area, seed, opacity = 0.8) {
  const r = mulberry32(seed);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * area[0];
    pos[i * 3 + 1] = r() * area[1];
    pos[i * 3 + 2] = (r() - 0.5) * area[2];
    vel[i * 3] = (r() - 0.5) * 1.2;
    vel[i * 3 + 1] = r() * 2.2;
    vel[i * 3 + 2] = (r() - 0.5) * 1.2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    map: glowTex,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    alphaTest: 0.01,
  });
  const pts = new THREE.Points(g, m);
  pts.userData = { vel, area, base: pos.slice() };
  return pts;
}
function driftPoints(pts, t, dt, mode) {
  const p = pts.geometry.attributes.position.array;
  const { vel, area, base } = pts.userData;
  const n = p.length / 3;
  for (let i = 0; i < n; i++) {
    if (mode === 'rise') {
      p[i * 3 + 1] += vel[i * 3 + 1] * dt * 3;
      p[i * 3] = base[i * 3] + Math.sin(t * 1.5 + i) * 2;
      if (p[i * 3 + 1] > area[1]) p[i * 3 + 1] = 0;
    } else if (mode === 'fall') {
      p[i * 3 + 1] -= vel[i * 3 + 1] * dt * 2;
      p[i * 3] = base[i * 3] + Math.sin(t + i * 1.7) * 3;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] = area[1];
    } else { // float
      p[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i * 2.1) * 3;
      p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.9 + i) * 2;
    }
  }
  pts.geometry.attributes.position.needsUpdate = true;
}
/* A palace silhouette: blocks, domes, spires */
function palaceGroup(s, color, seed) {
  const g = new THREE.Group();
  const r = mulberry32(seed);
  g.add(box(26 * s, 8 * s, 10 * s, color, 0, 4 * s, 0));
  g.add(box(16 * s, 6 * s, 8 * s, color, 0, 11 * s, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT(color));
  dome.position.set(0, 14 * s, 0);
  g.add(dome);
  g.add(cyl(0.3 * s, 0.3 * s, 4 * s, color, 0, 19 * s, 0));
  for (const sx of [-1, 1]) {
    const d2 = new THREE.Mesh(new THREE.SphereGeometry(2.6 * s, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT(color));
    d2.position.set(sx * 10 * s, 8 * s, 0);
    g.add(d2);
    g.add(cone(1.4 * s, 7 * s, color, sx * 15 * s, 11 * s, 0, 6));
  }
  for (let i = 0; i < 5; i++) {
    const wx = -9 * s + i * 4.5 * s;
    g.add(glowSprite(0xffca7a, 1.6 * s, wx, 5 * s, 5.2 * s, 0.85));
  }
  return g;
}
function treeGroup(x, z, s, leaf, trunk, seed) {
  const r = mulberry32(seed);
  const g = new THREE.Group();
  g.add(cyl(0.5 * s, 0.8 * s, 5 * s, trunk, 0, 2.5 * s, 0));
  for (let i = 0; i < 3; i++) {
    const b = ball((3.2 - i * 0.7) * s, leaf, (r() - 0.5) * 2 * s, (6 + i * 2.2) * s, (r() - 0.5) * 2 * s);
    g.add(b);
  }
  g.position.set(x, 0, z);
  return g;
}
/* Character billboard */
const charSprites = [];
function charSprite(key, x, y, z, s = 13) {
  if (!charTex[key]) return new THREE.Group();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: charTex[key], transparent: true, depthWrite: false }));
  sp.scale.set(s, s, 1);
  sp.position.set(x, y, z);
  sp.userData.baseY = y;
  sp.userData.ph = Math.random() * 9;
  charSprites.push(sp);
  return sp;
}

/* ---------------- the nine dioramas ----------------
   Diorama i sits at z = -i * DZ. The camera flies down -Z. */
loadCharacters();
const DZ = 150;
const dioramas = [];
const animated = []; // {update(t, dt)}

function groundDisc(color, r = 70) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), MAT(color));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* 0 — INTRO: moonlit Ayodhya */
{
  const g = new THREE.Group();
  const stars = makePoints(500, 0xbfd0ff, 1.6, [400, 160, 60], 11, 0.85);
  stars.position.set(0, 40, -60);
  g.add(stars);
  animated.push({ pts: stars, mode: 'float' });
  g.add(glowSprite(0xf2eeda, 60, 40, 80, -108, 0.95));
  g.add(ball(9, 0xf2eeda, 40, 80, -108));
  const pal = palaceGroup(1.6, 0x1a2242, 12);
  pal.position.set(0, 0, -20);
  g.add(pal);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 26), MAT(0x16294f, { transparent: true, opacity: 0.9 }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.2, 26);
  g.add(river);
  const flies = makePoints(70, 0xffe9a0, 1.5, [120, 26, 80], 13, 0.9);
  g.add(flies);
  animated.push({ pts: flies, mode: 'float' });
  g.add(groundDisc(0x070b18));
  dioramas.push(g);
}

/* 1 — BALA: dawn of childhood, the yajna fire */
{
  const g = new THREE.Group();
  g.add(glowSprite(0xffb14e, 120, 0, 54, -108, 0.9));
  g.add(ball(13, 0xfff3c8, 0, 54, -108));
  const pal = palaceGroup(1.4, 0x3a1c3a, 21);
  pal.position.set(-24, 0, -16);
  g.add(pal);
  // yajna altar with flame
  g.add(box(6, 2, 6, 0x4a2c1a, 22, 1, 6));
  const flame = cone(2.2, 7, 0xff9a2a, 22, 6, 6, 8);
  g.add(flame);
  g.add(glowSprite(0xffb14e, 22, 22, 7, 6, 0.8));
  animated.push({ flame });
  const embers = makePoints(80, 0xffb060, 1.6, [60, 40, 40], 22, 0.9);
  embers.position.set(22, 4, 6);
  g.add(embers);
  animated.push({ pts: embers, mode: 'rise' });
  const r = mulberry32(23);
  for (let i = 0; i < 14; i++) g.add(treeGroup(-55 + r() * 110, -34 - r() * 20, 0.9 + r() * 0.7, 0x2a4a2a, 0x3a2a1a, 100 + i));
  g.add(charSprite('rama', -8, 8, 14, 13));
  g.add(charSprite('lakshmana', 8, 7, 16, 11));
  g.add(groundDisc(0x2a1a20));
  dioramas.push(g);
}

/* 2 — AYODHYA: the dusk of exile */
{
  const g = new THREE.Group();
  g.add(glowSprite(0xff8c42, 90, 34, 52, -108, 0.85));
  g.add(ball(10, 0xffd9a0, 34, 52, -108));
  const pal = palaceGroup(1.7, 0x160f2e, 31);
  pal.position.set(0, 0, -18);
  g.add(pal);
  // rows of lamps along the front
  for (let i = 0; i < 12; i++) {
    g.add(glowSprite(0xffca7a, 2.2, -30 + i * 5.5, 3.2, 2, 0.9));
  }
  const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 30), MAT(0x3a1c40, { transparent: true, opacity: 0.9 }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.2, 30);
  g.add(river);
  const diyas = makePoints(26, 0xffca7a, 2, [140, 3, 24], 32, 0.95);
  diyas.position.set(0, 1.4, 30);
  g.add(diyas);
  animated.push({ pts: diyas, mode: 'float' });
  g.add(charSprite('rama', -10, 8, 14, 13));
  g.add(charSprite('sita', 0, 7.5, 16, 12));
  g.add(charSprite('lakshmana', 10, 7, 15, 11));
  g.add(groundDisc(0x140d24));
  dioramas.push(g);
}

/* 3 — ARANYA: the deep forest */
{
  const g = new THREE.Group();
  const r = mulberry32(41);
  for (let i = 0; i < 34; i++) {
    g.add(treeGroup(-60 + r() * 120, -50 + r() * 70, 1.1 + r() * 1.1, 0x0e3a22, 0x2a1c10, 200 + i));
  }
  // god-ray shafts
  for (let i = 0; i < 4; i++) {
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(7, 70),
      MAT(0xffe9a0, { transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    shaft.position.set(-30 + i * 20, 30, -10 - i * 6);
    shaft.rotation.z = 0.22;
    g.add(shaft);
  }
  const flies = makePoints(110, 0xd8ffb0, 1.7, [130, 30, 90], 42, 0.9);
  g.add(flies);
  animated.push({ pts: flies, mode: 'float' });
  // the golden deer — a small glowing shape darting between trees
  const deer = glowSprite(0xffd76a, 7, 0, 5, 0, 0.95);
  g.add(deer);
  animated.push({ deer });
  g.add(charSprite('sita', -12, 8, 16, 12));
  g.add(charSprite('hanuman', 12, 8, 14, 12));
  g.add(groundDisc(0x0a2014));
  dioramas.push(g);
}

/* 4 — KISHKINDHA: mountains in the mist */
{
  const g = new THREE.Group();
  const r = mulberry32(51);
  for (let i = 0; i < 12; i++) {
    const h = 26 + r() * 44;
    const mtn = cone(16 + r() * 14, h, i % 2 ? 0x1e3c4c : 0x2a4c5e, -70 + r() * 140, h / 2, -46 - r() * 30, 7);
    g.add(mtn);
    const cap = cone(4 + r() * 3, 8, 0xdfeaf0, mtn.position.x, h - 4, mtn.position.z, 7);
    g.add(cap);
  }
  // waterfall
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(4, 44),
    MAT(0xdff2f2, { transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  fall.position.set(8, 24, -40);
  g.add(fall);
  animated.push({ fall });
  for (let i = 0; i < 3; i++) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(220, 16),
      MAT(0xcfe0e0, { transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide }));
    mist.position.set(0, 14 + i * 12, 6 - i * 14);
    g.add(mist);
    animated.push({ mist, i });
  }
  const birds = makePoints(40, 0x101c28, 1.4, [160, 60, 40], 52, 0.9);
  birds.position.set(0, 40, 10);
  g.add(birds);
  animated.push({ pts: birds, mode: 'float' });
  g.add(charSprite('hanuman', -10, 9, 16, 13));
  g.add(charSprite('rama', 10, 8, 18, 12));
  g.add(groundDisc(0x12242e));
  dioramas.push(g);
}

/* 5 — SUNDARA: the night crossing */
{
  const g = new THREE.Group();
  const stars = makePoints(400, 0xbfd0ff, 1.6, [400, 150, 60], 61, 0.8);
  stars.position.set(0, 50, -60);
  g.add(stars);
  animated.push({ pts: stars, mode: 'float' });
  g.add(glowSprite(0xf2eeda, 70, 30, 74, -108, 0.95));
  g.add(ball(11, 0xf2eeda, 30, 74, -108));
  // moon path on the sea
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), MAT(0x0a2038));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0, 20);
  g.add(sea);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(26, 120),
    MAT(0xf2eeda, { transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(30, 0.4, 20);
  g.add(path);
  // Lanka burning on the horizon
  const r = mulberry32(62);
  for (let i = 0; i < 7; i++) {
    const tx = -50 + i * 16 + (r() - 0.5) * 6, th = 14 + r() * 14;
    g.add(box(5, th, 5, 0x05070f, tx, th / 2, -52));
    g.add(cone(3.4, 6, 0x05070f, tx, th + 3, -52, 6));
    g.add(glowSprite(0xff8c30, 10 + r() * 8, tx, th * 0.7, -50, 0.75));
  }
  const embers = makePoints(90, 0xff9040, 1.8, [120, 44, 30], 63, 0.95);
  embers.position.set(0, 6, -46);
  g.add(embers);
  animated.push({ pts: embers, mode: 'rise' });
  // Hanuman's burning trail across the sky
  const arcPts = [];
  for (let i = 0; i <= 40; i++) {
    const a = i / 40;
    arcPts.push(new THREE.Vector3(lerp(-70, 40, a), 44 - Math.sin(a * Math.PI) * -26 - a * 10, -30));
  }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  g.add(arc);
  animated.push({ arc });
  g.add(charSprite('hanuman', -14, 10, 12, 13));
  g.add(charSprite('sita', 2, 9, 16, 12));
  g.add(charSprite('ravana', 16, 10, 10, 13));
  dioramas.push(g);
}

/* 6 — YUDDHA: war at dusk */
{
  const g = new THREE.Group();
  g.add(glowSprite(0xff6a2a, 130, 0, 57, -112, 0.9));
  g.add(ball(15, 0xffe0a8, 0, 57, -112));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 130), MAT(0x4a1410));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0, 24);
  g.add(sea);
  // Rama Setu — arc of stones
  const r = mulberry32(71);
  for (let i = 0; i <= 30; i++) {
    const a = i / 30;
    const bx = lerp(-90, 90, a);
    const bz = 24 - Math.sin(a * Math.PI) * 46;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 + r() * 1.6, 0), MAT(0x3a1c14));
    st.position.set(bx, 1.6, bz);
    st.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(st);
  }
  // war banners on the near shore
  for (let i = 0; i < 9; i++) {
    const bx = -64 + i * 16 + (r() - 0.5) * 6;
    g.add(box(0.8, 22 + r() * 8, 0.8, 0x1c0a08, bx, 11, 44));
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(9, 5),
      MAT(i % 2 ? 0xc22a1a : 0xe8a83a, { side: THREE.DoubleSide }));
    ban.position.set(bx + 4.8, 26, 44);
    g.add(ban);
    animated.push({ ban, ph: r() * 9 });
  }
  const embers = makePoints(120, 0xff7a30, 2, [170, 50, 90], 72, 0.95);
  g.add(embers);
  animated.push({ pts: embers, mode: 'rise' });
  g.add(charSprite('rama', -14, 10, 14, 14));
  g.add(charSprite('ravana', 14, 10, 12, 14));
  g.add(charSprite('lakshmana', 0, 8, 20, 11));
  g.add(groundDisc(0x2a0e0c));
  dioramas.push(g);
}

/* 7 — UTTARA: the serene reign */
{
  const g = new THREE.Group();
  g.add(glowSprite(0xffd98a, 110, 0, 57, -108, 0.85));
  g.add(ball(12, 0xfff6dc, 0, 57, -108));
  const pal = palaceGroup(1.6, 0x2a3c58, 81);
  pal.position.set(0, 0, -20);
  g.add(pal);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(400, 34), MAT(0x3a6a94, { transparent: true, opacity: 0.92 }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.2, 30);
  g.add(river);
  const diyas = makePoints(30, 0xffe2a8, 2.2, [150, 3, 26], 82, 0.95);
  diyas.position.set(0, 1.6, 30);
  g.add(diyas);
  animated.push({ pts: diyas, mode: 'float' });
  const petals = makePoints(70, 0xffc4d0, 1.8, [150, 40, 80], 83, 0.9);
  g.add(petals);
  animated.push({ pts: petals, mode: 'fall' });
  const r = mulberry32(84);
  for (let i = 0; i < 10; i++) g.add(treeGroup(-55 + r() * 110, -30 - r() * 16, 0.8 + r() * 0.5, 0x2a5a3a, 0x3a2a1a, 300 + i));
  g.add(charSprite('rama', -8, 9, 14, 13));
  g.add(charSprite('sita', 8, 8.5, 16, 12));
  g.add(groundDisc(0x1c3038));
  dioramas.push(g);
}

/* 8 — OUTRO: the eternal sunrise */
{
  const g = new THREE.Group();
  g.add(glowSprite(0xffaa46, 170, 0, 60, -112, 0.95));
  g.add(ball(20, 0xfff8e0, 0, 60, -112));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 200), MAT(0x7a3a14));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0, 40);
  g.add(sea);
  const diyas = makePoints(46, 0xffe6b0, 2.4, [200, 30, 120], 91, 0.95);
  g.add(diyas);
  animated.push({ pts: diyas, mode: 'rise' });
  const petals = makePoints(80, 0xffd9a8, 2, [200, 50, 120], 92, 0.9);
  g.add(petals);
  animated.push({ pts: petals, mode: 'rise' });
  dioramas.push(g);
}

dioramas.forEach((g, i) => {
  g.position.z = -i * DZ;
  scene.add(g);
});

/* ---------------- camera journey ----------------
   Chapters (DOM order): 0 intro, 1 bala, 2 ayodhya, 3 aranya, 4 kishkindha,
   5 sundara, 6 yuddha, 7 uttara, 8 roster, 9 outro.
   Dioramas: 0 intro, 1 bala, 2 ayodhya, 3 aranya, 4 kishkindha, 5 sundara,
   6 yuddha, 7 uttara, 8 outro. Roster reuses diorama 7. */
const CH_DIORAMA = [0, 1, 2, 3, 4, 5, 6, 7, 7, 8];

const BG_KEYS = [
  0x04060f, // intro — night
  0x3a2040, // bala — dawn violet
  0x2a1430, // ayodhya — dusk purple
  0x061a10, // aranya — deep forest
  0x14242e, // kishkindha — mist blue
  0x050a18, // sundara — night sea
  0x2a0d08, // yuddha — ember dark
  0x1c3038, // uttara — morning slate
  0x4a2408, // outro — golden dark
].map((c) => new THREE.Color(c));

const stops = [];
function buildStops() {
  stops.length = 0;
  chapters.forEach((ch, i) => {
    const d = CH_DIORAMA[i] ?? 8;
    const z = -d * DZ;
    // gentle push-in across each chapter
    stops.push({
      p: ch.from + (ch.to - ch.from) * 0.15,
      pos: [-6, 30, z + 86], look: [0, 12, z - 10],
    });
    stops.push({
      p: ch.from + (ch.to - ch.from) * 0.85,
      pos: [7, 20, z + 58], look: [0, 10, z - 14],
    });
  });
  stops.sort((a, b) => a.p - b.p);
}

/* ---------------- chapters & HUD ---------------- */
const chapterEls = [...document.querySelectorAll('.chapter')];
const chapters = chapterEls.map((el) => ({
  el,
  kanda: el.dataset.kanda || '',
  age: parseFloat(el.dataset.age || '0'),
  era: el.dataset.era || '',
  from: 0, to: 1, active: false,
}));

function measureChapters() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  chapterEls.forEach((el, i) => {
    chapters[i].from = clamp01(el.offsetTop / max);
    chapters[i].to = i === chapters.length - 1 ? 1 : clamp01((el.offsetTop + el.offsetHeight) / max);
  });
  buildStops();
  readScroll();
}

let targetP = 0, smoothP = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  targetP = max > 0 ? clamp01(scrollY / max) : 0;
}
addEventListener('scroll', readScroll, { passive: true });
let resizeT = 0;
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  clearTimeout(resizeT);
  resizeT = setTimeout(measureChapters, 150);
});
addEventListener('load', measureChapters);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measureChapters());

function activeChapter(p) {
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (p >= chapters[i].from - 0.001) return i;
  }
  return 0;
}

const _pos = new THREE.Vector3(), _look = new THREE.Vector3(), _c = new THREE.Color();

function render(p, t, dt) {
  // camera flight
  let i = 0;
  while (i < stops.length - 2 && p > stops[i + 1].p) i++;
  const A = stops[i], B = stops[i + 1];
  const tt = sstep(A.p, B.p, p);
  _pos.set(lerp(A.pos[0], B.pos[0], tt), lerp(A.pos[1], B.pos[1], tt), lerp(A.pos[2], B.pos[2], tt));
  _look.set(lerp(A.look[0], B.look[0], tt), lerp(A.look[1], B.look[1], tt), lerp(A.look[2], B.look[2], tt));
  camera.position.copy(_pos);
  if (!reducedMotion) {
    camera.position.x += Math.sin(t * 0.45) * 0.7;
    camera.position.y += Math.cos(t * 0.38) * 0.5;
  }
  camera.lookAt(_look);

  // background + fog follow the diorama under the playhead
  const ci = activeChapter(p);
  const d = CH_DIORAMA[ci] ?? 8;
  _c.copy(BG_KEYS[d]);
  scene.background.copy(_c);
  scene.fog.color.copy(_c);

  // per-diorama animation
  for (const a of animated) {
    if (a.pts) driftPoints(a.pts, t, dt, a.mode);
    if (a.flame && !reducedMotion) {
      const s = 1 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.06;
      a.flame.scale.set(s, 1 + Math.sin(t * 11) * 0.18, s);
    }
    if (a.deer && !reducedMotion) {
      const dx = Math.sin(t * 0.5) * 34;
      a.deer.position.x = dx;
      a.deer.position.z = -6 + Math.cos(t * 0.33) * 22;
    }
    if (a.fall && !reducedMotion) {
      a.fall.material.opacity = 0.35 + Math.sin(t * 7) * 0.15;
    }
    if (a.mist && !reducedMotion) {
      a.mist.position.x = Math.sin(t * 0.22 + a.i * 2.4) * 18;
    }
    if (a.arc && !reducedMotion) {
      a.arc.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
    }
    if (a.ban && !reducedMotion) {
      a.ban.rotation.y = Math.sin(t * 2.2 + a.ph) * 0.35;
    }
  }
  if (!reducedMotion) {
    for (const sp of charSprites) {
      sp.position.y = sp.userData.baseY + Math.sin(t * 1.2 + sp.userData.ph) * 0.9;
    }
  }

  // HUD
  const c = chapters[ci];
  if (hudKanda.textContent !== c.kanda) hudKanda.textContent = c.kanda;
  if (hudEra.textContent !== c.era) hudEra.textContent = c.era;
  let age = c.age;
  const n = chapters[ci + 1];
  if (n && n.age !== c.age) {
    const span = Math.max(n.from - c.from, 1e-6);
    age = lerp(c.age, n.age, clamp01((p - c.from) / span));
  }
  hudAge.textContent = 'Rama · age ' + Math.round(age);
  hudBar.style.width = (p * 100).toFixed(2) + '%';
  for (let k = 0; k < chapters.length; k++) {
    const on = k === ci;
    if (on !== chapters[k].active) {
      chapters[k].active = on;
      chapters[k].el.classList.toggle('is-active', on);
    }
  }

  renderer.render(scene, camera);
}

/* ---------------- main loop ---------------- */
let fpsEma = 60, lastQuality = 0;
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (dt > 0) fpsEma += (1 / dt - fpsEma) * 0.05;
  const now = performance.now() / 1000;
  if (now - lastQuality > 2.5) {
    lastQuality = now;
    if (fpsEma < 34 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
    } else if (fpsEma > 57 && pixelRatio < PR_CAP) {
      pixelRatio = Math.min(PR_CAP, pixelRatio + 0.25);
      renderer.setPixelRatio(pixelRatio);
    }
  }
  const k = 1 - Math.exp(-dt * 5.5);
  smoothP += (targetP - smoothP) * k;
  if (Math.abs(targetP - smoothP) < 0.0004) smoothP = targetP;
  render(smoothP, reducedMotion ? 0 : t, reducedMotion ? 0 : dt);
}

measureChapters();
readScroll();
if (reducedMotion) {
  const syncStatic = () => { readScroll(); render(targetP, 0, 0); };
  addEventListener('scroll', syncStatic, { passive: true });
  syncStatic();
} else {
  frame();
}
