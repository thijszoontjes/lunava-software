/* Icon Smash: a tiny physics minigame for the Lunava apps section.
   Pick one of the app icons as your avatar, sling it at a tower built from the other icons. */
(() => {
  const root = document.querySelector('[data-smash]');
  if (!root) return;

  /* ---------- data ---------- */
  const ICONS = [
    { id: 'securesets', name: 'SecureSets', src: 'assets/branding/securesets-app-icon.png', href: 'securesets/' },
    { id: 'sunrise', name: 'Sunrise Alarm', src: 'assets/branding/sunrise-alarm-icon.png', href: 'sunrise-alarm/' },
    { id: 'last-train', name: 'The Last Train', src: 'assets/branding/the-last-train-icon.webp', href: 'the-last-train/' },
    { id: 'tunebeat', name: 'Tunebeat', src: 'assets/branding/tunebeat-icon.png', href: 'tunebeat/' },
    { id: 'stowmark', name: 'Stowmark', src: 'assets/branding/stowmark-app-icon.png', href: 'stowmark/' },
    { id: 'scribeloft', name: 'Scribeloft', src: 'assets/branding/scribeloft-app-icon.png', href: 'scribeloft/' },
    { id: 'packwick', name: 'Packwick', src: 'assets/branding/packwick-app-icon.png', href: 'packwick/' },
    { id: 'cardwren', name: 'Cardwren', src: 'assets/branding/cardwren-app-icon.png', href: 'cardwren/' },
    { id: 'towerlit', name: 'Towerlit', src: 'assets/branding/towerlit-app-icon.png', href: 'towerlit/' },
    { id: 'geowimble', name: 'GeoWimble', src: 'assets/branding/geowimble-app-icon.png', href: 'geowimble/' },
    { id: 'pagevane', name: 'Pagevane', src: 'assets/branding/pagevane-app-icon.png', href: 'pagevane/' }
  ];

  const BASE = root.dataset.smashBase || '';
  ICONS.forEach((i) => { i.src = BASE + i.src; i.href = BASE + i.href; });

  const S = 56;              // icon block size in world px
  const PR = 25;             // projectile radius
  const H = 560;             // world height
  const GROUND = H - 56;     // y of the ground surface
  const SLING_X = 128;
  const AIM = { x: SLING_X, y: GROUND - 132 };
  const MAX_PULL = 100;
  const LAUNCH_K = 0.17;     // px per step of launch speed per px of pull
  const GRAVITY_SCALE = 0.0012;
  const STEP = 1000 / 60;
  const G_STEP = GRAVITY_SCALE * STEP * STEP;
  const AIR = 0.001;
  const DMG_THRESHOLD = 3;
  const DMG_K = 12;

  const MATS = {
    wood:  { hp: 120, density: 0.0014, friction: 0.8, restitution: 0.04, shard: '#c98f5f' },
    stone: { hp: 240, density: 0.0024, friction: 0.9, restitution: 0.02, shard: '#9a9791' },
    glass: { hp: 36,  density: 0.0008, friction: 0.5, restitution: 0.02, shard: 'rgba(160, 215, 238, .8)' },
    tile:  { hp: 110, density: 0.0013, friction: 0.8, restitution: 0.04, shard: '#c4543b' },
    tnt:   { hp: 26,  density: 0.0012, friction: 0.7, restitution: 0.04, shard: '#c93a3a' }
  };

  const icon = (x, y) => ({ k: 'icon', x, y, w: S, h: S });
  const blk = (mat, x, y, w, h) => ({ k: 'block', mat, x, y, w, h });
  const tnt = (x, y) => ({ k: 'tnt', mat: 'tnt', x, y, w: 44, h: 44 });
  const ball = (x, y, r = 26, mat = 'stone') => ({ k: 'ball', mat, x, y, w: r * 2, h: r * 2, r });
  const roof = (x, base, w, h) => ({ k: 'roof', mat: 'tile', x, y: base - h / 2, w, h });

  // one storey: two walls, things inside, a ceiling. Returns the y of the next storey's floor.
  const story = (parts, cx, base, { iw, wall = 'wood', ceil = 'wood', items = [] }) => {
    const wx = iw / 2 + 10;
    parts.push(blk(wall, cx - wx, base - 30, 20, 60), blk(wall, cx + wx, base - 30, 20, 60));
    items.forEach(([type, dx]) => {
      if (type === 'icon') parts.push(icon(cx + dx, base - S / 2));
      else if (type === 'tnt') parts.push(tnt(cx + dx, base - 22));
      else if (type === 'ball') parts.push(ball(cx + dx, base - 27, 26, 'stone'));
    });
    parts.push(blk(ceil, cx, base - 70, iw + 48, 20));
    return base - 80;
  };

  const LEVELS = [
    {
      name: 'Cottage', shots: 3,
      build({ cx }) {
        const p = [];
        let b = GROUND;
        b = story(p, cx, b, { iw: 112, wall: 'stone', items: [['icon', -29], ['icon', 29]] });
        b = story(p, cx, b, { iw: 60, items: [['icon', 0]] });
        p.push(roof(cx, b, 140, 60));
        return p;
      }
    },
    {
      name: 'Glass house', shots: 4,
      build({ cx }) {
        const p = [];
        let b = GROUND;
        b = story(p, cx, b, { iw: 112, wall: 'stone', items: [['icon', -29], ['icon', 29]] });
        b = story(p, cx, b, { iw: 112, wall: 'glass', ceil: 'glass', items: [['icon', -29], ['icon', 29]] });
        b = story(p, cx, b, { iw: 60, wall: 'glass', items: [['icon', 0]] });
        p.push(roof(cx, b, 150, 56));
        return p;
      }
    },
    {
      name: 'Fortress', shots: 4,
      build({ cx }) {
        const p = [];
        let b = GROUND;
        b = story(p, cx, b, { iw: 112, wall: 'stone', ceil: 'stone', items: [['icon', -29], ['tnt', 30]] });
        b = story(p, cx, b, { iw: 112, wall: 'stone', items: [['icon', -29], ['icon', 29]] });
        b = story(p, cx, b, { iw: 60, items: [['icon', 0]] });
        p.push(roof(cx, b, 140, 60));
        return p;
      }
    },
    {
      name: 'Twin houses', shots: 5,
      build({ cx }) {
        const p = [];
        story(p, cx - 118, GROUND, { iw: 60, items: [['tnt', 0]] });
        story(p, cx + 118, GROUND, { iw: 60, items: [['icon', 0]] });
        p.push(blk('wood', cx, GROUND - 90, 344, 20));
        p.push(icon(cx - 118, GROUND - 100 - S / 2), icon(cx + 118, GROUND - 100 - S / 2));
        p.push(ball(cx, GROUND - 100 - 26));
        return p;
      }
    },
    {
      name: 'Pyramid', shots: 5,
      build({ cx }) {
        const p = [];
        for (let r = 0; r < 4; r++) {
          const n = 4 - r;
          for (let i = 0; i < n; i++) p.push(icon(cx + (i - (n - 1) / 2) * S, GROUND - S / 2 - r * S));
        }
        return p;
      }
    },
    {
      name: 'Surprise house', shots: 5, random: true,
      build({ cx, rnd }) {
        const p = [];
        const pick = (list) => list[Math.floor(rnd() * list.length)];
        const floors = 2 + Math.floor(rnd() * 2);
        let b = GROUND;
        let width = 112;
        for (let f = 0; f < floors; f++) {
          if (f > 0 && rnd() < 0.45) width = 60;
          const items = [];
          if (width === 112) {
            const combo = pick([['icon', 'icon'], ['icon', 'icon'], ['icon', 'tnt'], ['tnt', 'icon']]);
            items.push([combo[0], combo[0] === 'tnt' ? -28 : -29], [combo[1], combo[1] === 'tnt' ? 30 : 29]);
          } else {
            items.push([rnd() < 0.2 ? 'tnt' : 'icon', 0]);
          }
          b = story(p, cx, b, {
            iw: width,
            wall: pick(['wood', 'wood', 'stone', 'glass']),
            ceil: pick(['wood', 'wood', 'glass', 'stone']),
            items
          });
        }
        if (rnd() < 0.7) p.push(roof(cx, b, width + 80, 58));
        else p.push(tnt(cx, b - 22));
        return p;
      }
    }
  ];

  /* ---------- small helpers ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seeded = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const store = {
    read() { try { return JSON.parse(localStorage.getItem('lunava-icon-smash')) || {}; } catch (e) { return {}; } },
    write(data) { try { localStorage.setItem('lunava-icon-smash', JSON.stringify(data)); } catch (e) { /* storage unavailable */ } }
  };
  const saved = store.read();
  saved.best = saved.best || {};

  /* ---------- DOM refs ---------- */
  const stage = root.querySelector('[data-smash-stage]');
  const canvas = root.querySelector('[data-smash-canvas]');
  const aimZone = root.querySelector('[data-smash-aim]');
  const picker = root.querySelector('[data-smash-picker]');
  const levelBar = root.querySelector('[data-smash-levels]');
  const hudLevel = root.querySelector('[data-smash-level]');
  const hudScore = root.querySelector('[data-smash-score]');
  const hudShots = root.querySelector('[data-smash-shots]');
  const hint = root.querySelector('[data-smash-hint]');
  const panel = root.querySelector('[data-smash-panel]');
  const btnRestart = root.querySelector('[data-smash-restart]');
  const btnSound = root.querySelector('[data-smash-sound]');
  const live = root.querySelector('[data-smash-live]');
  const ctx = canvas.getContext('2d');

  /* ---------- state ---------- */
  let Matter = null;
  let engine = null;
  let world = null;
  let W = 960;
  let scale = 1;
  let dpr = 1;
  let avatarId = ICONS.some((i) => i.id === saved.avatar) ? saved.avatar : 'tunebeat';
  let levelIndex = 0;
  let sprites = {};
  let colors = {};
  let ents = new Map();
  let shards = [];
  let blasts = [];
  let rings = [];
  let puffs = [];
  let floaters = [];
  let trail = [];
  let phase = 'loading';   // ready | flying | settling | ended
  let shotsLeft = 0;
  let shotsUsed = 0;
  let score = 0;
  let projectile = null;
  let boosted = false;
  let pull = { x: -74, y: 40 };
  let dragging = false;
  let armed = false;
  let flightTime = 0;
  let calmSteps = 0;
  let winTimer = 0;
  let shake = 0;
  let visible = false;
  let running = false;
  let lastTime = 0;
  let acc = 0;
  let clock = 0;
  let sound = saved.sound === true;
  let generation = 0;

  /* ---------- audio ---------- */
  const sfx = (() => {
    let ac = null;
    let master = null;
    let noise = null;
    let lastThud = 0;
    const ensure = () => {
      if (!sound) return false;
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.32;
        master.connect(ac.destination);
        noise = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
      return true;
    };
    const burst = (freq, dur, vol, type = 'lowpass', q = 0.7) => {
      const src = ac.createBufferSource();
      src.buffer = noise;
      const f = ac.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(); src.stop(ac.currentTime + dur + 0.02);
    };
    const tone = (from, to, dur, vol, type = 'sine', delay = 0) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      const t0 = ac.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(from, t0);
      o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    };
    return {
      unlock() { ensure(); },
      launch() { if (ensure()) { tone(360, 120, 0.22, 0.35); burst(900, 0.12, 0.2, 'bandpass'); } },
      boost() { if (ensure()) tone(240, 760, 0.16, 0.28, 'triangle'); },
      thud(speed) {
        const now = performance.now();
        if (now - lastThud < 55 || !ensure()) return;
        lastThud = now;
        burst(260 + Math.random() * 120, 0.1 + Math.min(speed, 14) * 0.008, Math.min(0.9, 0.18 + speed * 0.05));
      },
      crack(mat) {
        if (!ensure()) return;
        if (mat === 'glass') { burst(5200, 0.28, 0.45, 'highpass', 0.8); tone(2400, 1500, 0.12, 0.12, 'triangle'); }
        else if (mat === 'stone') { burst(900, 0.26, 0.7, 'bandpass', 0.9); burst(120, 0.22, 0.8); }
        else { burst(2200, 0.22, 0.5, 'bandpass', 1.2); burst(180, 0.18, 0.7); }
      },
      boom() { if (ensure()) { burst(160, 0.7, 1, 'lowpass', 0.6); tone(110, 38, 0.6, 0.55, 'sawtooth'); } },
      win() { if (ensure()) [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.004, 0.26, 0.3, 'triangle', i * 0.11)); },
      lose() { if (ensure()) { tone(330, 210, 0.3, 0.3, 'triangle'); tone(247, 150, 0.4, 0.3, 'triangle', 0.18); } }
    };
  })();

  /* ---------- assets ---------- */
  const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const roundRectPath = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  const makeSprite = (img) => {
    const size = 160;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    roundRectPath(g, 0, 0, size, size, size * 0.225);
    g.save();
    g.clip();
    if (img) g.drawImage(img, 0, 0, size, size);
    else { g.fillStyle = '#7152b2'; g.fillRect(0, 0, size, size); }
    g.restore();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(20, 12, 8, .22)';
    roundRectPath(g, 1.5, 1.5, size - 3, size - 3, size * 0.225);
    g.stroke();
    // average colour for dust and sparks
    let color = '#c87855';
    try {
      const s = document.createElement('canvas');
      s.width = s.height = 1;
      const sg = s.getContext('2d');
      sg.drawImage(c, 0, 0, 1, 1);
      const d = sg.getImageData(0, 0, 1, 1).data;
      color = `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
    } catch (e) { /* tainted canvas, keep fallback */ }
    return { canvas: c, color };
  };

  const loadSprites = async () => {
    const imgs = await Promise.all(ICONS.map((i) => loadImage(i.src)));
    ICONS.forEach((i, n) => { sprites[i.id] = makeSprite(imgs[n]); });
  };

  /* ---------- level construction ---------- */
  const worldWidth = () => (stage.clientWidth < 700 ? 760 : 960);

  const resizeCanvas = () => {
    const w = stage.clientWidth || 600;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = w / W;
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    canvas.style.height = `${Math.round(H * scale)}px`;
    stage.style.height = `${Math.round(H * scale)}px`;
  };

  const buildLevel = () => {
    generation++;
    const level = LEVELS[levelIndex];
    W = worldWidth();
    resizeCanvas();
    let drift = 0;
    // random houses are rebuilt a few times if one turns out to be wobbly
    for (let attempt = 0; attempt < 12; attempt++) {
      drift = construct(level);
      if (!level.random || drift < 1.5) break;
    }
    shotsLeft = level.shots;
    shards = []; puffs = []; floaters = []; trail = []; blasts = []; rings = [];
    projectile = null; boosted = false; armed = true; dragging = false;
    flightTime = 0; calmSteps = 0; winTimer = 0; shake = 0;
    score = 0; shotsUsed = 0;
    phase = 'ready';
    hidePanel();
    updateHud();
    announce(`${level.name}. ${shotsLeft} shots.`);
  };

  // creates the engine and all bodies, lets everything settle, returns how far things moved while settling
  const construct = (level) => {
    const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;
    if (engine) Events.off(engine);
    // no body sleeping: a sleeping block can freeze half-way through tipping over and then hang in the air
    engine = Engine.create({ enableSleeping: false, positionIterations: 10, velocityIterations: 8 });
    world = engine.world;
    engine.gravity.y = 1;
    engine.gravity.scale = GRAVITY_SCALE;
    ents = new Map();
    armed = false;

    Composite.add(world, Bodies.rectangle(W / 2, GROUND + 60, W * 3, 120, { isStatic: true, friction: 1, frictionStatic: 1, label: 'ground' }));

    const rnd = level.random ? Math.random : seeded(7 + levelIndex);
    const others = ICONS.filter((i) => i.id !== avatarId);
    const order = others.slice();
    if (level.random) order.sort(() => Math.random() - 0.5);
    const parts = level.build({ cx: W - 200, rnd });
    let n = 0;
    const starts = [];
    parts.forEach((part) => {
      const mat = MATS[part.mat || 'wood'];
      const isIcon = part.k === 'icon';
      const opts = {
        friction: isIcon ? 0.7 : mat.friction,
        frictionStatic: 1.2,
        restitution: isIcon ? 0.04 : mat.restitution,
        density: isIcon ? 0.0016 : mat.density,
        slop: 0.04,
        sleepThreshold: 45,
        label: part.k
      };
      let body;
      if (part.k === 'ball') {
        body = Bodies.circle(part.x, part.y, part.r, opts);
      } else if (part.k === 'roof') {
        const hw = part.w / 2;
        body = Bodies.fromVertices(part.x, part.y + part.h / 6, [[
          { x: -hw, y: part.h / 3 }, { x: hw, y: part.h / 3 }, { x: 0, y: -part.h * 2 / 3 }
        ]], opts);
      } else {
        opts.chamfer = { radius: isIcon ? 10 : part.k === 'tnt' ? 6 : 3 };
        body = Bodies.rectangle(part.x, part.y, part.w, part.h, opts);
      }
      const hp = isIcon ? 64 : mat.hp;
      const meta = {
        k: part.k, mat: part.mat || (isIcon ? 'icon' : 'wood'), w: part.w, h: part.h, r: part.r,
        hp, max: hp, flash: 0, seed: 11 + n * 7 + levelIndex * 101 + parts.indexOf(part) * 13, dead: false, down: false
      };
      if (isIcon) { meta.icon = order[n % order.length]; n++; }
      ents.set(body.id, meta);
      Composite.add(world, body);
      starts.push([body, body.position.x, body.position.y]);
    });

    // let the structure settle before the player sees it
    for (let i = 0; i < 220; i++) Engine.update(engine, STEP);
    let drift = 0;
    starts.forEach(([b, x, y]) => { drift = Math.max(drift, Math.hypot(b.position.x - x, b.position.y - y)); });
    // wake everything up once more: a structure that only holds while asleep is no good
    const snap = starts.map(([b]) => [b.position.x, b.position.y]);
    Composite.allBodies(world).forEach((b) => { if (!b.isStatic) Sleeping.set(b, false); });
    for (let i = 0; i < 120; i++) Engine.update(engine, STEP);
    starts.forEach(([b], i) => { drift = Math.max(drift, Math.hypot(b.position.x - snap[i][0], b.position.y - snap[i][1])); });
    Composite.allBodies(world).forEach((b) => {
      if (!b.isStatic) { Body.setVelocity(b, { x: 0, y: 0 }); Body.setAngularVelocity(b, 0); }
    });
    Events.on(engine, 'collisionStart', onCollision);
    return drift;
  };

  /* ---------- collisions and damage ---------- */
  const onCollision = (event) => {
    if (!armed) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (rel < 2) continue;
      damage(a, b, rel);
      damage(b, a, rel);
      if (rel > 3.5) sfx.thud(rel);
      if (rel > 6 && !reducedMotion) shake = Math.max(shake, Math.min(6, rel * 0.35));
    }
  };

  const damage = (me, other, rel) => {
    const e = ents.get(me.id);
    if (!e || e.dead || e.k === 'proj') return;
    const ratio = other.isStatic ? 0.9 : clamp(other.mass / me.mass, 0.5, 2.2);
    const dmg = Math.max(0, rel - DMG_THRESHOLD) * DMG_K * ratio;
    if (dmg <= 0) return;
    e.hp -= dmg;
    e.flash = 1;
  };

  // Matter keeps sleeping bodies asleep when their support disappears, so things would hang in mid-air.
  // Whenever something is removed we wake every loose body so gravity gets its say.
  const wakeAll = () => {
    const { Composite, Sleeping } = Matter;
    for (const b of Composite.allBodies(world)) if (!b.isStatic && b.isSleeping) Sleeping.set(b, false);
    calmSteps = 0;
  };

  const destroy = (body, e, reason) => {
    e.dead = true;
    const { Composite } = Matter;
    const spr = e.icon ? sprites[e.icon.id] : null;
    const color = spr ? spr.color : (MATS[e.mat] || MATS.wood).shard;
    makeShards(body, e, spr, color);
    makePuffs(body.position.x, body.position.y, e.mat === 'glass' ? '#cfe9f4' : color, e.k === 'icon' ? 11 : 7);
    Composite.remove(world, body);
    wakeAll();
    if (e.k === 'tnt') blasts.push({ x: body.position.x, y: body.position.y });
    else sfx.crack(e.mat);
    if (!reducedMotion) shake = Math.max(shake, e.mat === 'glass' ? 3 : 7);
    if (e.k === 'icon') {
      e.down = true;
      const pts = reason === 'off' ? 50 : 100;
      score += pts;
      floaters.push({ x: body.position.x, y: body.position.y - 20, t: 0, text: `+${pts}` });
      updateHud();
    }
  };

  const blast = ({ x, y }) => {
    const { Composite, Body, Sleeping } = Matter;
    const R = 175;
    sfx.boom();
    rings.push({ x, y, t: 0 });
    makePuffs(x, y, '#ff9a3c', 16);
    makePuffs(x, y, '#5b4a42', 10);
    if (!reducedMotion) shake = Math.max(shake, 12);
    for (const b of Composite.allBodies(world)) {
      if (b.isStatic) continue;
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const f = 1 - d / R;
      const e = ents.get(b.id);
      if (e && e.k !== 'proj') { e.hp -= 190 * f * f; e.flash = 1; }
      Sleeping.set(b, false);
      const dv = 13 * f * clamp(5 / b.mass, 0.35, 1.5);
      const nx = d > 1 ? dx / d : 0;
      const ny = d > 1 ? dy / d : -1;
      Body.setVelocity(b, { x: b.velocity.x + nx * dv, y: b.velocity.y + ny * dv - dv * 0.35 });
    }
  };

  /* ---------- particles ---------- */
  const makeShards = (body, e, spr, color) => {
    const n = reducedMotion ? 5 : 8;
    const w = e.k === 'roof' ? e.w * 0.7 : e.w;
    const h = e.k === 'roof' ? e.h * 0.7 : e.h;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const dx = Math.cos(a) || 1e-6;
      const dy = Math.sin(a) || 1e-6;
      const t = Math.min(w / 2 / Math.abs(dx), h / 2 / Math.abs(dy));
      ring.push([dx * t, dy * t]);
    }
    const c = [(Math.random() - 0.5) * w * 0.3, (Math.random() - 0.5) * h * 0.3];
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    for (let i = 0; i < n; i++) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % n];
      const cx = (c[0] + p1[0] + p2[0]) / 3;
      const cy = (c[1] + p1[1] + p2[1]) / 3;
      const wx = body.position.x + cx * cos - cy * sin;
      const wy = body.position.y + cx * sin + cy * cos;
      const dirx = wx - body.position.x;
      const diry = wy - body.position.y;
      const dl = Math.hypot(dirx, diry) || 1;
      const sp = 2 + Math.random() * 4.5;
      shards.push({
        x: wx, y: wy, rot: body.angle,
        vx: body.velocity.x * 0.5 + (dirx / dl) * sp,
        vy: body.velocity.y * 0.5 + (diry / dl) * sp - 2.5 - Math.random() * 2,
        vr: (Math.random() - 0.5) * 0.45,
        tri: [[c[0] - cx, c[1] - cy], [p1[0] - cx, p1[1] - cy], [p2[0] - cx, p2[1] - cy]],
        off: [cx, cy], w, h, spr, color, age: 0, rest: false
      });
    }
    if (shards.length > 220) shards.splice(0, shards.length - 220);
  };

  const makePuffs = (x, y, color, count) => {
    const n = reducedMotion ? Math.ceil(count / 2) : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 2.4;
      puffs.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
        r: 5 + Math.random() * 9, grow: 0.25 + Math.random() * 0.35,
        life: 0, max: 26 + Math.random() * 20,
        color: Math.random() < 0.45 ? color : '#d8c9b8'
      });
    }
    if (puffs.length > 160) puffs.splice(0, puffs.length - 160);
  };

  /* ---------- shooting ---------- */
  const launchVelocity = () => ({ x: -pull.x * LAUNCH_K, y: -pull.y * LAUNCH_K });

  const clampPull = (px, py) => {
    let x = px;
    let y = py;
    const maxY = GROUND - PR - 3 - AIM.y;
    if (y > maxY) y = maxY;
    const len = Math.hypot(x, y);
    if (len > MAX_PULL) { x = (x / len) * MAX_PULL; y = (y / len) * MAX_PULL; }
    pull = { x, y };
  };

  const fire = () => {
    if (phase !== 'ready' || shotsLeft <= 0) return false;
    if (Math.hypot(pull.x, pull.y) < 16) return false;
    const { Bodies, Body, Composite } = Matter;
    const v = launchVelocity();
    const body = Bodies.circle(AIM.x + pull.x, AIM.y + pull.y, PR, {
      density: 0.0032, friction: 0.5, frictionStatic: 0.8, frictionAir: AIR, restitution: 0.18, label: 'proj', sleepThreshold: Infinity
    });
    ents.set(body.id, { k: 'proj', w: PR * 2, h: PR * 2, dead: false });
    Composite.add(world, body);
    Body.setVelocity(body, v);
    Body.setAngularVelocity(body, 0.12);
    projectile = body;
    boosted = false;
    shotsLeft--;
    shotsUsed++;
    flightTime = 0;
    calmSteps = 0;
    trail = [];
    phase = 'flying';
    hint.classList.add('is-gone');
    sfx.launch();
    updateHud();
    return true;
  };

  const boost = () => {
    if (phase !== 'flying' || !projectile || boosted) return;
    const { Body } = Matter;
    const v = projectile.velocity;
    if (Math.hypot(v.x, v.y) < 1) return;
    boosted = true;
    Body.setVelocity(projectile, { x: v.x * 1.5, y: v.y * 1.5 + 1.5 });
    makePuffs(projectile.position.x, projectile.position.y, '#ffb02e', 8);
    sfx.boost();
  };

  const endShot = () => {
    if (projectile) {
      makePuffs(projectile.position.x, projectile.position.y, (sprites[avatarId] || {}).color || '#c87855', 8);
      Matter.Composite.remove(world, projectile);
      ents.delete(projectile.id);
      projectile = null;
      wakeAll();
    }
    const remaining = targetsLeft();
    if (remaining === 0) return; // win timer handles it
    if (shotsLeft <= 0) { finish(false); return; }
    phase = 'ready';
    announce(`${shotsLeft} shot${shotsLeft === 1 ? '' : 's'} left, ${remaining} icons standing.`);
    updateHud();
  };

  const targetsLeft = () => {
    let n = 0;
    ents.forEach((e) => { if (e.k === 'icon' && !e.dead) n++; });
    return n;
  };

  /* ---------- simulation step ---------- */
  const step = () => {
    clock++;
    Matter.Engine.update(engine, STEP);
    const bodies = Matter.Composite.allBodies(world);
    let moving = false;

    for (const b of bodies) {
      if (b.isStatic) continue;
      const e = ents.get(b.id);
      if (!e) continue;
      if (e.k !== 'proj') {
        if (e.flash > 0) e.flash = Math.max(0, e.flash - 0.07);
        if (e.hp <= 0 && !e.dead) { destroy(b, e, 'hit'); continue; }
        if ((b.position.x > W + 70 || b.position.x < -70 || b.position.y > H + 200) && !e.dead) { destroy(b, e, 'off'); continue; }
      }
      if (!b.isSleeping && b.speed > 0.35) moving = true;
    }

    if (projectile) {
      flightTime++;
      if (!reducedMotion && flightTime % 2 === 0 && flightTime < 240) trail.push({ x: projectile.position.x, y: projectile.position.y, a: 1 });
      const outside = projectile.position.x > W + 90 || projectile.position.x < -90 || projectile.position.y > H + 200;
      const slow = projectile.speed < 0.45 && flightTime > 30;
      if (outside || (slow && !moving) || flightTime > 60 * 8) calmSteps += 6;
      else if (!moving && slow) calmSteps += 1;
      else if (!moving && flightTime > 45) calmSteps += 1;
      else calmSteps = Math.max(0, calmSteps - 1);
      if (calmSteps > 40) { calmSteps = 0; endShot(); }
    }

    if (phase !== 'ended' && targetsLeft() === 0 && armed) {
      winTimer++;
      if (winTimer > 85) finish(true);
    }

    while (blasts.length) blast(blasts.shift());

    for (const t of trail) t.a -= 0.025;
    trail = trail.filter((t) => t.a > 0);

    stepParticles();
  };

  const stepParticles = () => {
    for (const s of shards) {
      s.age++;
      if (s.rest) continue;
      s.vy += G_STEP * 0.9;
      s.x += s.vx; s.y += s.vy; s.rot += s.vr;
      if (s.y > GROUND - 3) {
        s.y = GROUND - 3;
        s.vy *= -0.32; s.vx *= 0.72; s.vr *= 0.6;
        if (Math.abs(s.vy) < 1.1) { s.vy = 0; s.vx *= 0.6; s.vr = 0; s.rest = Math.abs(s.vx) < 0.15; }
      }
    }
    shards = shards.filter((s) => s.age < 220);
    for (const p of puffs) { p.life++; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy = p.vy * 0.95 - 0.015; p.r += p.grow; }
    puffs = puffs.filter((p) => p.life < p.max);
    for (const f of floaters) { f.t++; f.y -= 0.55; }
    for (const r of rings) r.t++;
    rings = rings.filter((r) => r.t < 22);
    floaters = floaters.filter((f) => f.t < 70);
    if (shake > 0) shake = Math.max(0, shake - 0.45);
  };

  /* ---------- finish / panels ---------- */
  const finish = (won) => {
    if (phase === 'ended') return;
    phase = 'ended';
    const avatar = ICONS.find((i) => i.id === avatarId);
    const level = LEVELS[levelIndex];
    let stars = 0;
    if (won) {
      const bonus = shotsLeft * 250;
      score += bonus;
      stars = shotsUsed <= Math.ceil(level.shots / 2) ? 3 : shotsUsed < level.shots ? 2 : 1;
      const key = level.random ? 'random' : String(levelIndex);
      const prev = saved.best[key] || { score: 0, stars: 0 };
      saved.best[key] = { score: Math.max(prev.score, score), stars: Math.max(prev.stars, stars) };
      store.write(saved);
      renderLevelBar();
      sfx.win();
    } else {
      sfx.lose();
    }
    updateHud();
    const nextIndex = levelIndex + 1 < LEVELS.length ? levelIndex + 1 : 0;
    panel.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = won ? 'Tower down!' : 'So close.';
    const sub = document.createElement('p');
    sub.className = 'smash__panel-sub';
    sub.textContent = won
      ? `${avatar.name} cleared ${level.name.toLowerCase()} with ${shotsUsed} shot${shotsUsed === 1 ? '' : 's'}. Score ${score}.`
      : `${targetsLeft()} icon${targetsLeft() === 1 ? ' is' : 's are'} still standing. Give it another go.`;
    panel.append(title);
    if (won) {
      const st = document.createElement('div');
      st.className = 'smash__stars';
      st.setAttribute('role', 'img');
      st.setAttribute('aria-label', `${stars} of 3 stars`);
      st.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      panel.append(st);
    }
    panel.append(sub);
    const actions = document.createElement('div');
    actions.className = 'smash__panel-actions';
    if (won) actions.append(makeButton(LEVELS[nextIndex].random ? 'Surprise pile →' : 'Next level →', 'smash__btn smash__btn--primary', () => selectLevel(nextIndex)));
    actions.append(makeButton('Try again', won ? 'smash__btn' : 'smash__btn smash__btn--primary', () => selectLevel(levelIndex)));
    panel.append(actions);
    const link = document.createElement('a');
    link.className = 'smash__panel-link';
    link.href = avatar.href;
    link.textContent = `Meet ${avatar.name} →`;
    panel.append(link);
    panel.hidden = false;
    announce(won ? `Tower down! ${stars} stars.` : 'Out of shots.');
    const first = panel.querySelector('button');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
  };

  const hidePanel = () => { panel.hidden = true; panel.innerHTML = ''; };
  const makeButton = (label, cls, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };
  const announce = (text) => { if (live) live.textContent = text; };

  /* ---------- HUD, picker, level bar ---------- */
  const updateHud = () => {
    const level = LEVELS[levelIndex];
    hudLevel.textContent = level.random ? level.name : `Level ${levelIndex + 1} · ${level.name}`;
    hudScore.textContent = String(score);
    hudShots.textContent = String(shotsLeft);
  };

  const renderPicker = () => {
    picker.innerHTML = '';
    ICONS.forEach((i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'smash__avatar';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i.id === avatarId));
      b.setAttribute('aria-label', i.name);
      b.title = i.name;
      const img = document.createElement('img');
      img.src = i.src; img.alt = ''; img.width = 44; img.height = 44; img.decoding = 'async';
      b.append(img);
      b.addEventListener('click', () => {
        if (avatarId === i.id) return;
        avatarId = i.id;
        saved.avatar = i.id;
        store.write(saved);
        renderPicker();
        if (Matter) buildLevel();
      });
      picker.append(b);
    });
  };

  const renderLevelBar = () => {
    levelBar.innerHTML = '';
    LEVELS.forEach((l, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'smash__level';
      if (idx === levelIndex) b.setAttribute('aria-current', 'true');
      const best = saved.best[l.random ? 'random' : String(idx)];
      const name = document.createElement('span');
      name.textContent = l.random ? '?' : String(idx + 1);
      const stars = document.createElement('small');
      stars.setAttribute('aria-hidden', 'true');
      stars.textContent = best ? '★'.repeat(best.stars) + '☆'.repeat(3 - best.stars) : '☆☆☆';
      b.append(name, stars);
      b.setAttribute('aria-label', `${l.name}${best ? `, best ${best.stars} stars` : ''}`);
      b.addEventListener('click', () => selectLevel(idx));
      levelBar.append(b);
    });
  };

  const selectLevel = (idx) => {
    levelIndex = idx;
    renderLevelBar();
    if (Matter) buildLevel();
  };

  /* ---------- input ---------- */
  const toWorld = (event) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((event.clientX - r.left) / r.width) * W, y: ((event.clientY - r.top) / r.height) * H };
  };

  aimZone.addEventListener('pointerdown', (event) => {
    sfx.unlock();
    if (phase !== 'ready') return;
    dragging = true;
    aimZone.setPointerCapture(event.pointerId);
    const p = toWorld(event);
    clampPull(p.x - AIM.x, p.y - AIM.y);
    event.preventDefault();
  });
  aimZone.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = toWorld(event);
    clampPull(p.x - AIM.x, p.y - AIM.y);
  });
  const release = (event) => {
    if (!dragging) return;
    dragging = false;
    if (aimZone.hasPointerCapture && aimZone.hasPointerCapture(event.pointerId)) aimZone.releasePointerCapture(event.pointerId);
    if (event.type === 'pointercancel') return;
    if (!fire()) pull = Math.hypot(pull.x, pull.y) < 16 ? { x: -74, y: 40 } : pull;
  };
  aimZone.addEventListener('pointerup', release);
  aimZone.addEventListener('pointercancel', release);

  stage.addEventListener('pointerdown', () => { sfx.unlock(); boost(); });

  stage.addEventListener('keydown', (event) => {
    if (event.target.closest('button, a')) return;
    const key = event.key;
    if (phase === 'ready') {
      const ang = Math.atan2(pull.y, pull.x);
      const len = Math.hypot(pull.x, pull.y);
      let a = ang;
      let l = len;
      if (key === 'ArrowUp') a += 0.04;
      else if (key === 'ArrowDown') a -= 0.04;
      else if (key === 'ArrowLeft') l += 5;
      else if (key === 'ArrowRight') l -= 5;
      else if (key === ' ' || key === 'Enter') { event.preventDefault(); sfx.unlock(); fire(); return; }
      else return;
      event.preventDefault();
      l = clamp(l, 24, MAX_PULL);
      clampPull(Math.cos(a) * l, Math.sin(a) * l);
    } else if (phase === 'flying' && (key === ' ' || key === 'Enter')) {
      event.preventDefault();
      boost();
    }
  });

  btnRestart.addEventListener('click', () => { if (Matter) buildLevel(); });
  const paintSoundButton = () => {
    btnSound.setAttribute('aria-pressed', String(sound));
    btnSound.textContent = sound ? 'Sound on' : 'Sound off';
  };
  btnSound.addEventListener('click', () => {
    sound = !sound;
    saved.sound = sound;
    store.write(saved);
    paintSoundButton();
    if (sound) sfx.unlock();
  });

  /* ---------- rendering ---------- */
  const trajectory = () => {
    const pts = [];
    const v = launchVelocity();
    let x = AIM.x + pull.x;
    let y = AIM.y + pull.y;
    let vx = v.x;
    let vy = v.y;
    for (let i = 0; i < 150; i++) {
      vx *= 1 - AIR;
      vy = vy * (1 - AIR) + G_STEP;
      x += vx; y += vy;
      if (y > GROUND - 6) break;
      if (i % 5 === 4) pts.push([x, y]);
    }
    return pts;
  };

  const drawSprite = (spr, x, y, w, h, angle, alpha = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(spr.canvas, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  const drawCracks = (e, w, h) => {
    const level = e.hp / e.max;
    if (level > 0.72) return;
    const rnd = seeded(e.seed);
    const count = level > 0.4 ? 2 : 4;
    ctx.save();
    roundRectPath(ctx, -w / 2, -h / 2, w, h, w * 0.225);
    ctx.clip();
    for (let c = 0; c < count; c++) {
      // each crack starts on an edge and zig-zags towards the middle
      const fromTop = c % 2 === 0;
      let x = fromTop ? (rnd() - 0.5) * w : (c % 4 === 1 ? -w / 2 : w / 2);
      let y = fromTop ? -h / 2 : (rnd() - 0.5) * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (0 - x) * 0.2 + (rnd() - 0.5) * w * 0.3;
        y += (0 - y) * 0.25 + (rnd() - 0.2) * h * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(25, 14, 10, .62)';
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, .55)';
      ctx.stroke();
    }
    ctx.restore();
  };

  const crackLines = (e, w, h, n = 2) => {
    const rnd = seeded(e.seed + 5);
    ctx.beginPath();
    for (let c = 0; c < n; c++) {
      let x = (rnd() - 0.5) * w * 0.8;
      let y = -h / 2;
      ctx.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        x += (rnd() - 0.5) * w * 0.28;
        y += h * (0.28 + rnd() * 0.12);
        ctx.lineTo(x, y);
      }
    }
  };

  const drawBlock = (b, e) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const hurt = e.hp / e.max;
    let top = '#e2b183';
    let bottom = '#bd8052';
    let edge = 'rgba(86, 52, 30, .55)';
    if (e.mat === 'stone') { top = '#c3c0ba'; bottom = '#8f8c87'; edge = 'rgba(48, 46, 44, .65)'; }
    if (e.mat === 'glass') { top = 'rgba(214, 240, 250, .62)'; bottom = 'rgba(150, 205, 232, .5)'; edge = 'rgba(66, 130, 168, .9)'; }
    const g = ctx.createLinearGradient(0, -e.h / 2, 0, e.h / 2);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    roundRectPath(ctx, -e.w / 2, -e.h / 2, e.w, e.h, e.mat === 'stone' ? 5 : 4);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = e.mat === 'glass' ? 2 : 1.5;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    if (e.mat === 'stone') {
      const rnd = seeded(e.seed);
      ctx.fillStyle = 'rgba(60, 58, 55, .22)';
      for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc((rnd() - 0.5) * e.w, (rnd() - 0.5) * e.h, 1.5 + rnd() * 2.5, 0, 6.3); ctx.fill(); }
    } else if (e.mat === 'glass') {
      ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
      ctx.lineWidth = 3;
      const m = Math.min(e.w, e.h);
      ctx.beginPath();
      ctx.moveTo(-e.w / 2 + 3, -e.h / 2 + m * 0.7); ctx.lineTo(-e.w / 2 + m * 0.7, -e.h / 2 + 3);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(120, 76, 44, .28)';
      ctx.lineWidth = 1;
      const long = e.w > e.h;
      ctx.beginPath();
      if (long) { ctx.moveTo(-e.w / 2, -e.h * 0.1); ctx.lineTo(e.w / 2, -e.h * 0.1); } else { ctx.moveTo(-e.w * 0.1, -e.h / 2); ctx.lineTo(-e.w * 0.1, e.h / 2); }
      ctx.stroke();
    }
    if (hurt < 0.6) {
      ctx.strokeStyle = e.mat === 'glass' ? 'rgba(255, 255, 255, .95)' : 'rgba(30, 20, 14, .65)';
      ctx.lineWidth = 2;
      ctx.rotate(e.w > e.h ? 0 : Math.PI / 2);
      const bw = e.w > e.h ? e.w : e.h;
      const bh = e.w > e.h ? e.h : e.w;
      crackLines(e, bw, bh, hurt < 0.3 ? 3 : 2);
      ctx.stroke();
    }
    ctx.restore();
    if (e.flash > 0) { roundRectPath(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 4); ctx.fillStyle = `rgba(255,255,255,${e.flash * 0.6})`; ctx.fill(); }
    ctx.restore();
  };

  const drawRoof = (b, e) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const hw = e.w / 2;
    ctx.beginPath();
    ctx.moveTo(-hw, e.h / 3);
    ctx.lineTo(hw, e.h / 3);
    ctx.lineTo(0, -e.h * 2 / 3);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -e.h * 2 / 3, 0, e.h / 3);
    g.addColorStop(0, '#d9694e');
    g.addColorStop(1, '#a8432f');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(80, 30, 20, .7)';
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(80, 30, 20, .35)';
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 2; k++) {
      const y = e.h / 3 - (e.h * k) / 3;
      ctx.beginPath(); ctx.moveTo(-hw, y); ctx.lineTo(hw, y); ctx.stroke();
    }
    if (e.hp / e.max < 0.6) {
      ctx.strokeStyle = 'rgba(30, 14, 10, .7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, e.h / 3); ctx.lineTo(-hw * 0.1, 0); ctx.lineTo(-hw * 0.28, -e.h * 0.3); ctx.stroke();
    }
    if (e.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${e.flash * 0.55})`; ctx.fillRect(-hw, -e.h, e.w, e.h * 2); }
    ctx.restore();
    ctx.restore();
  };

  const drawBall = (b, e) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const g = ctx.createRadialGradient(-e.r * 0.35, -e.r * 0.4, e.r * 0.1, 0, 0, e.r);
    g.addColorStop(0, '#d2cfc9');
    g.addColorStop(1, '#85827d');
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(48, 46, 44, .65)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(60, 58, 55, .25)';
    for (const [x, y, r] of [[8, 6, 5], [-9, 10, 4], [4, -12, 3.5], [-12, -4, 3]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); }
    if (e.flash > 0) { ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 6.3); ctx.fillStyle = `rgba(255,255,255,${e.flash * 0.55})`; ctx.fill(); }
    ctx.restore();
  };

  const drawTnt = (b, e) => {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    roundRectPath(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 6);
    ctx.fillStyle = '#d1403a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(80, 20, 16, .8)';
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#f3e3c8';
    ctx.fillRect(-e.w / 2, -7, e.w, 14);
    ctx.fillStyle = 'rgba(80, 20, 16, .5)';
    ctx.fillRect(-e.w / 2 + 8, -e.h / 2, 3, e.h);
    ctx.fillRect(e.w / 2 - 11, -e.h / 2, 3, e.h);
    ctx.restore();
    ctx.fillStyle = '#3a2a24';
    ctx.font = '800 11px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 0, 1);
    if (e.flash > 0) { roundRectPath(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 6); ctx.fillStyle = `rgba(255,255,255,${e.flash * 0.6})`; ctx.fill(); }
    ctx.restore();
  };

  const drawScene = () => {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // clouds
    ctx.fillStyle = 'rgba(255, 255, 255, .7)';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 290 + clock * 0.08 * (1 + i * 0.3)) % (W + 240)) - 120;
      const cy = 70 + i * 38 + (i % 2) * 22;
      ctx.beginPath();
      ctx.moveTo(cx + 70, cy); ctx.ellipse(cx, cy, 70, 20, 0, 0, Math.PI * 2);
      ctx.moveTo(cx + 74, cy - 14); ctx.ellipse(cx + 34, cy - 14, 40, 20, 0, 0, Math.PI * 2);
      ctx.moveTo(cx + 4, cy - 8); ctx.ellipse(cx - 30, cy - 8, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // ground
    ctx.fillStyle = '#ecd8c0';
    ctx.fillRect(-10, GROUND, W + 20, H - GROUND + 10);
    ctx.fillStyle = '#c87855';
    ctx.fillRect(-10, GROUND, W + 20, 6);
    ctx.fillStyle = 'rgba(120, 78, 50, .12)';
    for (let x = 18; x < W; x += 54) ctx.fillRect(x, GROUND + 22 + ((x / 54) % 2) * 12, 26, 4);

    drawSling(false);

    // ammo waiting on the ground
    const avatarSprite = sprites[avatarId];
    for (let i = 0; i < shotsLeft - (phase === 'ready' ? 1 : 0); i++) {
      drawSprite(avatarSprite, 46 + i * 40, GROUND - 17, 34, 34, 0);
    }

    // bodies
    const bodies = Matter.Composite.allBodies(world);
    for (const b of bodies) {
      const e = ents.get(b.id);
      if (!e || b.isStatic || e.dead) continue;
      if (e.k === 'block') drawBlock(b, e);
      else if (e.k === 'roof') drawRoof(b, e);
      else if (e.k === 'ball') drawBall(b, e);
      else if (e.k === 'tnt') drawTnt(b, e);
    }
    for (const b of bodies) {
      const e = ents.get(b.id);
      if (!e || b.isStatic || e.dead || e.k !== 'icon') continue;
      const spr = sprites[e.icon.id];
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.drawImage(spr.canvas, -e.w / 2, -e.h / 2, e.w, e.h);
      drawCracks(e, e.w, e.h);
      if (e.flash > 0) {
        roundRectPath(ctx, -e.w / 2, -e.h / 2, e.w, e.h, e.w * 0.225);
        ctx.fillStyle = `rgba(255, 255, 255, ${e.flash * 0.55})`;
        ctx.fill();
      }
      ctx.restore();
    }

    // trail
    for (const t of trail) {
      ctx.fillStyle = `rgba(113, 82, 178, ${t.a * 0.35})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 + t.a * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // projectile (flying or on the sling)
    if (projectile) {
      drawSprite(avatarSprite, projectile.position.x, projectile.position.y, PR * 2.04, PR * 2.04, projectile.angle);
    } else if (phase === 'ready') {
      const px = AIM.x + pull.x;
      const py = AIM.y + pull.y;
      trajectory().forEach(([x, y], i) => {
        ctx.fillStyle = `rgba(41, 36, 42, ${Math.max(0.08, 0.5 - i * 0.017)})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.6, 3.4 - i * 0.05), 0, Math.PI * 2);
        ctx.fill();
      });
      drawSprite(avatarSprite, px, py, PR * 2.04, PR * 2.04, 0);
    }

    drawSling(true);

    // shards
    for (const s of shards) {
      const fade = s.age > 150 ? 1 - (s.age - 150) / 70 : 1;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.beginPath();
      ctx.moveTo(s.tri[0][0], s.tri[0][1]);
      ctx.lineTo(s.tri[1][0], s.tri[1][1]);
      ctx.lineTo(s.tri[2][0], s.tri[2][1]);
      ctx.closePath();
      if (s.spr) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(s.spr.canvas, -s.off[0] - s.w / 2, -s.off[1] - s.h / 2, s.w, s.h);
        ctx.restore();
      } else {
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(25, 14, 10, .35)';
      ctx.stroke();
      ctx.restore();
    }

    // dust
    for (const p of puffs) {
      const k = p.life / p.max;
      ctx.globalAlpha = (1 - k) * 0.55;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const r of rings) {
      const k = r.t / 22;
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.lineWidth = 8 * (1 - k) + 1;
      ctx.strokeStyle = '#ffb02e';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 20 + k * 150, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // score popups
    ctx.font = '700 20px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (const f of floaters) {
      ctx.globalAlpha = Math.min(1, (70 - f.t) / 25);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 253, 249, .95)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = '#7152b2';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  };

  const drawSling = (front) => {
    const baseY = GROUND;
    const forkY = AIM.y + 14;
    const px = projectile || phase !== 'ready' ? null : { x: AIM.x + pull.x, y: AIM.y + pull.y };
    // posts: back (left) is drawn first, front (right) after the projectile
    const post = (x, tilt, dark) => {
      ctx.strokeStyle = dark ? '#7a4b2d' : '#a2663e';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SLING_X, baseY + 2);
      ctx.lineTo(SLING_X, forkY + 34);
      ctx.lineTo(x + tilt, forkY);
      ctx.stroke();
    };
    const bandPoint = { x: AIM.x + (front ? 10 : -10), y: forkY - 2 };
    if (!front) post(SLING_X - 11, -2, true);
    if (px) {
      ctx.strokeStyle = '#4a2f26';
      ctx.lineWidth = front ? 5 : 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bandPoint.x, bandPoint.y);
      ctx.lineTo(px.x + (front ? 6 : -6), px.y);
      ctx.stroke();
    }
    if (front) post(SLING_X + 11, 2, false);
  };

  const frame = (time) => {
    if (!running) return;
    const dt = Math.min(64, time - lastTime || STEP);
    lastTime = time;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 4) { step(); acc -= STEP; guard++; }
    if (guard === 4) acc = 0;
    drawScene();
    requestAnimationFrame(frame);
  };

  const startLoop = () => {
    if (running || !Matter || !visible || document.hidden) return;
    running = true;
    lastTime = performance.now();
    acc = 0;
    requestAnimationFrame(frame);
  };
  const stopLoop = () => { running = false; };

  /* ---------- boot ---------- */
  let booted = false;
  const boot = async () => {
    if (booted) return;
    booted = true;
    root.classList.add('is-loading');
    try {
      await Promise.all([
        new Promise((resolve, reject) => {
          if (window.Matter) { resolve(); return; }
          const s = document.createElement('script');
          s.src = `${BASE}assets/vendor/matter.min.js?v=0.20.0`;
          s.onload = resolve;
          s.onerror = reject;
          document.head.append(s);
        }),
        loadSprites()
      ]);
    } catch (e) {
      root.classList.add('is-broken');
      return;
    }
    Matter = window.Matter;
    root.classList.remove('is-loading');
    buildLevel();
    startLoop();
  };

  renderPicker();
  renderLevelBar();
  paintSoundButton();
  updateHud();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) { boot(); startLoop(); } else stopLoop();
    }, { rootMargin: '200px 0px' }).observe(root);
  } else {
    visible = true;
    boot();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else startLoop(); });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!Matter) return;
      if (worldWidth() !== W) buildLevel(); else resizeCanvas();
    }, 120);
  }).observe(stage);

  // tiny hook for automated checks
  window.LunavaIconSmash = {
    get phase() { return phase; },
    get shotsLeft() { return shotsLeft; },
    get targets() { return Matter ? targetsLeft() : -1; },
    get score() { return score; },
    setPull(x, y) { clampPull(x, y); },
    fire,
    advance(n) { for (let i = 0; i < n; i++) step(); },
    selectLevel,
    levels: LEVELS.length,
    bodies() {
      return Matter ? Matter.Composite.allBodies(world).filter((b) => !b.isStatic).map((b) => ({ id: b.id, k: (ents.get(b.id) || {}).k, x: b.position.x, y: b.position.y, a: b.angle, sleeping: b.isSleeping })) : [];
    },
    settleCheck(steps = 240) {
      Matter.Composite.allBodies(world).forEach((b) => { if (!b.isStatic) Matter.Sleeping.set(b, false); });
      const before = this.bodies().filter((b) => b.k !== 'proj');
      armed = false;
      for (let i = 0; i < steps; i++) Matter.Engine.update(engine, STEP);
      armed = true;
      const after = this.bodies().filter((b) => b.k !== 'proj');
      return before.map((b) => { const a = after.find((x) => x.id === b.id); return a ? Math.hypot(a.x - b.x, a.y - b.y) : -1; });
    }
  };
})();
