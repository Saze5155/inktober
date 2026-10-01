// Le monde ouvert d'Enxor : le Hameau (le village de la team) entouré de trois régions de l'univers.
//   Le Hameau des Encrés (nord-ouest) · Le Seuil (nord-est) · Rive-Basse (sud-ouest) · Cendre-Gravée (sud-est)
// Le sol des régions est dessiné par morceaux (tuiles) à la demande, pour rester léger.
window.World = (() => {
  const { INK, PAPER } = Ink;
  const TAU = Math.PI * 2;
  const W = 5200, H = 4600;

  const REGIONS = [
    { id: "hameau", name: "Le Hameau des Encrés", sub: "Là où vit la DreamTeam", x: 0, y: 0, w: 3000, h: 2400, color: "#efe5d0" },
    { id: "seuil", name: "Le Seuil", sub: "Là où l'ombre de la vallée touche la lumière de la crête", x: 3000, y: 0, w: 2200, h: 2400, color: "#8d8a7c", mood: "seuil" },
    { id: "rive", name: "Rive-Basse", sub: "Le village des pilotis, au-dessus de la cité engloutie", x: 0, y: 2400, w: 3000, h: 2200, color: "#2a3640", mood: "rive" },
    { id: "cendre", name: "Cendre-Gravée", sub: "Un avant-poste perdu dans le désert de sable noir", x: 3000, y: 2400, w: 2200, h: 2200, color: "#3a3431", mood: "cendre" },
  ];
  const regionAt = (x, y) => REGIONS.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || REGIONS[0];

  // ---------- Géographie ----------

  // Le Seuil
  const PILLAR = { x: 4100, y: 960 };
  const TENEBROS = { x: 3480, y: 1560 };
  const SOLUMBRIS = { x: 4720, y: 1560 };
  const MOUNTAINS = 240;
  const splitX = (y) => 4100 + (y - 1200) * 0.12; // ligne entre l'ombre et la lumière

  // Rive-Basse
  const shoreY = (x) => 2700 + Math.sin(x / 210) * 30;
  const coastX = (y) => 2850 + Math.sin(y / 170) * 60;
  const isSea = (x, y) => y > 2400 && x < coastX(y) && y > shoreY(x);
  const WALKS = [
    { x: 1460, y: 2600, w: 90, h: 1720 },
    { x: 500, y: 3180, w: 2000, h: 80 },
    { x: 850, y: 3900, w: 1400, h: 80 },
    { x: 1150, y: 3480, w: 420, h: 260 },
  ];
  const HUTS = [[700, 3140], [1000, 3140], [2000, 3140], [2300, 3140], [800, 3370], [2200, 3370], [1000, 3860], [2000, 3860], [1200, 4090], [1800, 4090]]
    .map(([x, y], i) => ({ x, y, seed: i }));
  const PLATFORMS = HUTS.map((h) => ({ x: h.x - 80, y: h.y - 120, w: 160, h: 160 }));
  const SPOTS = [
    { x: 525, y: 3220, bx: 420, by: 3230 }, { x: 2475, y: 3220, bx: 2590, by: 3230 },
    { x: 875, y: 3940, bx: 770, by: 3950 }, { x: 2225, y: 3940, bx: 2340, by: 3950 },
    { x: 1505, y: 4295, bx: 1505, by: 4420 },
  ];

  // Cendre-Gravée
  const WELL = { x: 4100, y: 3500 };
  const HOUSES = [-35, 10, 55, 100, 145, 190, 235].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    return { x: Math.round(WELL.x + Math.cos(a) * 360), y: Math.round(WELL.y + Math.sin(a) * 250), seed: i };
  });

  const PATHS = [
    [[3000, 1300], [3400, 1220], [3800, 1080], [4100, 1060]],
    [[4100, 1060], [3750, 1300], [3480, 1650]],
    [[4100, 1060], [4450, 1300], [4720, 1650]],
    [[4100, 1060], [4200, 1700], [4250, 2400], [4150, 3000], [4100, 3400]],
    [[2400, 2560], [2900, 2600], [3300, 2850], [3700, 3150], [3990, 3420]],
    [[1500, 2400], [1505, 2620]],
    [[1500, 2480], [2000, 2540], [2400, 2560]],
  ];

  const inRect = (x, y, r, m = 0) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;

  // collisions des régions (le hameau garde les siennes dans main.js)
  const SOLIDS = [
    { x: PILLAR.x - 60, y: PILLAR.y - 40, w: 120, h: 50 },
    { x: TENEBROS.x - 200, y: TENEBROS.y - 70, w: 400, h: 70 },
    { x: SOLUMBRIS.x - 200, y: SOLUMBRIS.y - 70, w: 400, h: 70 },
    ...HUTS.map((h) => ({ x: h.x - 58, y: h.y - 34, w: 116, h: 34 })),
    ...HOUSES.map((h) => ({ x: h.x - 72, y: h.y - 40, w: 144, h: 40 })),
    { x: WELL.x - 42, y: WELL.y - 26, w: 84, h: 40 },
  ];

  function blocked(x, y) {
    if (x < 20 || y < 40 || x > W - 20 || y > H - 20) return true;
    if (x >= 3000 && y < MOUNTAINS) return true;
    if (isSea(x, y) && !WALKS.some((r) => inRect(x, y, r)) && !PLATFORMS.some((r) => inRect(x, y, r))) return true;
    return SOLIDS.some((b) => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 6 && y < b.y + b.h + 6);
  }

  // ---------- Petits outils ----------

  const SCALE = 2;
  const cache = new Map();
  function sprite(key, w, h, ax, ay, draw) {
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = w * SCALE;
    c.height = h * SCALE;
    Object.assign(c, { w, h, ax, ay });
    const g = c.getContext("2d");
    g.scale(SCALE, SCALE);
    g.translate(ax, ay);
    draw(g);
    cache.set(key, c);
    return c;
  }
  const blit = (ctx, s, x, y) => ctx.drawImage(s, x - s.ax, y - s.ay, s.w, s.h);
  const boil = (t) => Math.floor(t * 4) % 3;
  const box = (g, r, x, y, w, h, color, o = {}) => {
    const pts = Ink.rect(x, y, w, h);
    Ink.fill(g, pts, r, color, o.amp ?? 1.2);
    if (o.hatch) Ink.hatch(g, pts, r, { gap: o.hatch, alpha: o.ha ?? 0.3, color: o.hc ?? INK, angle: o.angle });
    Ink.stroke(g, pts, r, { w: o.w ?? 2, closed: true, step: 10 });
  };
  const shape = (g, r, pts, color, o = {}) => {
    Ink.fill(g, pts, r, color, o.amp ?? 1.2);
    if (o.hatch) Ink.hatch(g, pts, r, { gap: o.hatch, alpha: o.ha ?? 0.3, color: o.hc ?? INK });
    Ink.stroke(g, pts, r, { w: o.w ?? 2, closed: true, step: 10 });
  };

  // ---------- Le sol, tuile par tuile ----------

  const TILE = 800;
  const tiles = new Map();
  let grain = null;

  function getTile(tx, ty) {
    const key = tx + "," + ty;
    let c = tiles.get(key);
    if (c) { tiles.delete(key); tiles.set(key, c); return c; }
    c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    const g = c.getContext("2d");
    if (!grain) grain = Ink.grain(g);
    g.translate(-tx * TILE, -ty * TILE);
    const x0 = tx * TILE, y0 = ty * TILE;
    for (const reg of REGIONS) {
      if (reg.id === "hameau") continue;
      if (reg.x >= x0 + TILE || reg.x + reg.w <= x0 || reg.y >= y0 + TILE || reg.y + reg.h <= y0) continue;
      g.save();
      g.beginPath();
      g.rect(reg.x, reg.y, reg.w, reg.h);
      g.clip();
      GROUND[reg.id](g, x0, y0, Ink.rng(tx * 7919 + ty * 104729 + reg.id.length));
      g.restore();
    }
    drawPaths(g, Ink.rng(tx * 31 + ty * 17));
    tiles.set(key, c);
    if (tiles.size > 20) tiles.delete(tiles.keys().next().value);
    return c;
  }

  // grandes taches (brume, dunes) générées une seule fois pour tout le monde, pour éviter les coutures entre tuiles
  const fr = Ink.rng(2468);
  const MISTS = Array.from({ length: 140 }, () => ({ x: 3000 + fr() * 2200, y: 200 + fr() * 2200 }));
  const DUNES = Array.from({ length: 60 }, () => ({ x: 3000 + fr() * 2200, y: 2400 + fr() * 2200, dark: fr() < 0.5 }));
  function blobs(g, x0, y0, list, rad, color) {
    for (const b of list) {
      if (b.x < x0 - rad || b.x > x0 + TILE + rad || b.y < y0 - rad || b.y > y0 + TILE + rad) continue;
      const c = color(b);
      if (!c) continue;
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, rad);
      gr.addColorStop(0, c);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(b.x - rad, b.y - rad, rad * 2, rad * 2);
    }
  }

  function scatter(g, x0, y0, r, n, fn) {
    for (let i = 0; i < n; i++) fn(x0 + r() * TILE, y0 + r() * TILE);
  }

  // fondu entre deux régions : une bande qui passe de `rgb` (opaque) à transparent
  function band(g, x, y, w, h, vertical, rgb) {
    const gr = vertical ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
  }

  const GROUND = {
    seuil(g, x0, y0, r) {
      g.fillStyle = "#e3c88f";
      g.fillRect(3000, 0, 2200, 2400);
      // côté ombre
      g.fillStyle = "#3d4150";
      g.beginPath();
      g.moveTo(3000, 0);
      for (let y = 0; y <= 2400; y += 100) g.lineTo(splitX(y), y);
      g.lineTo(3000, 2400);
      g.closePath();
      g.fill();
      for (let k = 1; k <= 6; k++) {
        g.strokeStyle = `rgba(61,65,80,${0.5 - k * 0.07})`;
        g.lineWidth = 22;
        g.beginPath();
        for (let y = 0; y <= 2400; y += 100) g.lineTo(splitX(y) + k * 18, y);
        g.stroke();
      }
      g.fillStyle = grain;
      g.fillRect(x0, y0, TILE, TILE);
      band(g, 3000, 0, 260, 2400, false, "239,229,208");
      blobs(g, x0, y0, MISTS, 120, (b) => (b.x < splitX(b.y) - 60 ? "rgba(200,205,220,.10)" : null));
      scatter(g, x0, y0, r, 24, (x, y) => { if (x > splitX(y)) Ink.grass(g, x, y, r); });
      scatter(g, x0, y0, r, 14, (x, y) => (r() < 0.5 ? Ink.stone(g, x, y, r) : Ink.crack(g, x, y, r)));
      // montagnes du fond
      if (y0 < 500) {
        const rr = Ink.rng(999);
        for (let x = 2950; x < 5250; x += 110 + rr() * 60) {
          const h = 140 + rr() * 170, w = 120 + rr() * 90;
          const dark = x + w / 2 < splitX(0);
          const pts = [[x - w / 2, MOUNTAINS + 10], [x - w * 0.1, MOUNTAINS - h], [x + w * 0.15, MOUNTAINS - h + 30], [x + w / 2, MOUNTAINS + 10]];
          shape(g, rr, pts, dark ? "#2b2e3a" : "#c9a76a", { hatch: 6, ha: 0.25, hc: dark ? PAPER : INK });
        }
      }
    },
    rive(g, x0, y0, r) {
      g.fillStyle = "#d9cdb4";
      g.fillRect(0, 2400, 3000, 2200);
      g.fillStyle = grain;
      g.fillRect(x0, y0, TILE, TILE);
      band(g, 0, 2400, 3000, 160, true, "239,229,208");
      // la mer noire
      g.fillStyle = "#1d2833";
      g.beginPath();
      for (let x = 0; x <= 3000; x += 40) g.lineTo(Math.min(x, coastX(shoreY(x))), shoreY(x));
      for (let y = shoreY(3000); y <= 4600; y += 40) g.lineTo(coastX(y), y);
      g.lineTo(0, 4600);
      g.closePath();
      g.fill();
      Ink.stroke(g, Array.from({ length: 76 }, (_, i) => [i * 40, shoreY(i * 40)]), r, { w: 2, alpha: 0.6, passes: 1 });
      // la cité engloutie, visible sous l'eau
      const cr = Ink.rng(4242);
      for (let i = 0; i < 70; i++) {
        const bx = cr() * 2800, by = 2800 + cr() * 1750, bw = 60 + cr() * 140, bh = 50 + cr() * 120;
        if (bx + bw < x0 || bx > x0 + TILE || by + bh < y0 || by > y0 + TILE) continue;
        g.strokeStyle = "rgba(160,190,200,.13)";
        g.lineWidth = 2;
        g.strokeRect(bx, by, bw, bh);
        for (let wy = by + 12; wy < by + bh - 12; wy += 22) for (let wx = bx + 10; wx < bx + bw - 14; wx += 24) g.strokeRect(wx, wy, 10, 12);
      }
      scatter(g, x0, y0, r, 60, (x, y) => {
        if (isSea(x, y)) {
          g.strokeStyle = "rgba(239,229,208,.12)";
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(x, y, 8 + r() * 14, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        } else if (r() < 0.5) Ink.stone(g, x, y, r);
      });
      // pontons, plateformes et pilotis
      for (const w of [...WALKS, ...PLATFORMS]) {
        if (w.x > x0 + TILE || w.x + w.w < x0 || w.y > y0 + TILE || w.y + w.h < y0) continue;
        const pr = Ink.rng(w.x * 3 + w.y);
        g.fillStyle = INK;
        for (let px = w.x + 6; px < w.x + w.w; px += 40) for (const py of [w.y + w.h + 4]) { g.beginPath(); g.ellipse(px, py, 5, 3, 0, 0, TAU); g.fill(); }
        box(g, pr, w.x, w.y, w.w, w.h, "#8a6a48", { w: 2.2 });
        g.strokeStyle = "rgba(29,26,32,.35)";
        g.lineWidth = 1;
        if (w.w > w.h) for (let px = w.x + 18; px < w.x + w.w; px += 18) { g.beginPath(); g.moveTo(px, w.y + 2); g.lineTo(px, w.y + w.h - 2); g.stroke(); }
        else for (let py = w.y + 18; py < w.y + w.h; py += 18) { g.beginPath(); g.moveTo(w.x + 2, py); g.lineTo(w.x + w.w - 2, py); g.stroke(); }
      }
      // étals du marché
      if (x0 < 1600 && x0 + TILE > 1100 && y0 < 3800 && y0 + TILE > 3400) {
        const mr = Ink.rng(77);
        for (const [sx, sy] of [[1200, 3520], [1420, 3520], [1460, 3660]]) {
          box(g, mr, sx, sy, 80, 36, "#a88a5f", { hatch: 5 });
          for (let k = 0; k < 4; k++) Ink.fill(g, Ink.ellipse(sx + 12 + k * 18, sy + 18, 8, 4, 10), mr, "#5b8c5a", 0.5);
        }
        g.strokeStyle = "rgba(29,26,32,.5)";
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(1300 + k * 10, 3600); g.lineTo(1340 + k * 10, 3700); g.stroke(); }
      }
    },
    cendre(g, x0, y0, r) {
      g.fillStyle = "#3a3431";
      g.fillRect(3000, 2400, 2200, 2200);
      band(g, 3000, 2400, 2200, 240, true, "150,130,100");
      band(g, 3000, 2400, 220, 2200, false, "217,205,180");
      g.fillStyle = grain;
      g.fillRect(x0, y0, TILE, TILE);
      // dunes et stries de vent
      blobs(g, x0, y0, DUNES, 260, (b) => (b.dark ? "rgba(30,26,24,.35)" : "rgba(90,80,72,.35)"));
      g.strokeStyle = "rgba(239,229,208,.07)";
      g.lineWidth = 2;
      for (let k = 0; k < 26; k++) {
        const sx = x0 + r() * TILE, sy = y0 + r() * TILE, len = 120 + r() * 220;
        g.beginPath();
        for (let d = 0; d <= len; d += 12) g.lineTo(sx + d, sy + Math.sin(d / 30 + k) * 6);
        g.stroke();
      }
      scatter(g, x0, y0, r, 10, (x, y) => Ink.stone(g, x, y, r));
      // crânes à moitié enfouis (le symbole de Silentis)
      scatter(g, x0, y0, r, 2, (x, y) => {
        if (Math.hypot(x - WELL.x, y - WELL.y) < 450) return;
        g.fillStyle = "#cfc3ad";
        g.beginPath(); g.ellipse(x, y, 14, 11, 0, Math.PI, 0); g.fill();
        g.fillStyle = INK;
        for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 5, y - 4, 3, 0, TAU); g.fill(); }
      });
    },
  };

  function drawPaths(g, r) {
    for (const p of PATHS) {
      Ink.stroke(g, p, r, { w: 36, color: "rgba(120,95,70,.16)", passes: 1, amp: 8, step: 50 });
      Ink.stroke(g, p, r, { w: 1.4, color: "rgba(29,26,32,.25)", passes: 1, amp: 4, step: 24 });
    }
  }

  function drawGround(ctx, cam, vw, vh, villageBg) {
    const x1 = cam.x + vw, y1 = cam.y + vh;
    for (let ty = Math.floor(Math.max(0, cam.y) / TILE); ty * TILE < Math.min(y1, H); ty++) {
      for (let tx = Math.floor(Math.max(0, cam.x) / TILE); tx * TILE < Math.min(x1, W); tx++) {
        const x0 = tx * TILE, y0 = ty * TILE;
        if (x0 + TILE <= 3000 && y0 + TILE <= 2400) continue; // entièrement dans le hameau
        ctx.drawImage(getTile(tx, ty), x0, y0);
      }
    }
    if (cam.x < 3000 && cam.y < 2400) ctx.drawImage(villageBg, 0, 0);
  }

  // ---------- Bâtiments ----------

  function pillarSprite(f) {
    return sprite(`pillar|${f}`, 220, 640, 110, 610, (g) => {
      const r = Ink.rng(11 + f * 7919);
      Ink.shadow(g, 30, 6, 110, 20, 0.25);
      box(g, r, -80, -30, 160, 36, "#8d8a7c", { hatch: 6 });
      // la colonne : moitié noire, moitié blanche, sommet brisé
      const top = [[-46, -560], [-30, -585], [-10, -566], [8, -600], [26, -572], [46, -590]];
      const left = [[-46, -30], ...top.slice(0, 4), [0, -30]];
      const right = [[0, -30], [8, -600], [26, -572], [46, -590], [46, -30]];
      Ink.fill(g, left, r, "#1d1a20", 1);
      Ink.fill(g, right, r, "#f2ead8", 1);
      for (let y = -90; y > -560; y -= 70) {
        Ink.stroke(g, [[-46, y], [46, y]], r, { w: 2, color: INK, passes: 1 });
        Ink.stroke(g, [[-44, y + 6], [-2, y + 6]], r, { w: 1, color: PAPER, passes: 1, alpha: 0.4 });
      }
      Ink.stroke(g, [[-46, -30], ...top, [46, -30]], r, { w: 2.6 });
      // symboles des jumeaux : disque noir cerclé de lumière, soleil gris-doré
      g.strokeStyle = "#e9e3d0"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(-22, -330, 13, 0, TAU); g.stroke();
      g.fillStyle = "#b9a46a";
      g.beginPath(); g.arc(22, -330, 9, 0, TAU); g.fill();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        g.strokeStyle = "#8a7a50"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(22 + Math.cos(a) * 12, -330 + Math.sin(a) * 12); g.lineTo(22 + Math.cos(a) * 18, -330 + Math.sin(a) * 18); g.stroke();
      }
    });
  }

  function tenebrosSprite(f) {
    return sprite(`ten|${f}`, 480, 420, 240, 380, (g) => {
      const r = Ink.rng(31 + f * 7919);
      Ink.shadow(g, 0, 8, 240, 30, 0.3);
      // marches
      for (let i = 0; i < 3; i++) box(g, r, -200 + i * 14, -20 + i * 10, 400 - i * 28, 14, "#4a4d5a", { w: 1.6 });
      // façade de pierre sombre
      box(g, r, -190, -300, 380, 280, "#2f3240", { hatch: 7, hc: PAPER, ha: 0.08 });
      shape(g, r, [[-215, -300], [0, -380], [215, -300]], "#22242f", { hatch: 6, hc: PAPER, ha: 0.1 });
      // l'arche et la statue encapuchonnée
      const arch = [[-70, -20], [-70, -200], ...Ink.ellipse(0, -200, 70, 60, 14, Math.PI, Math.PI * 2).slice(1, -1), [70, -200], [70, -20]];
      Ink.fill(g, arch, r, "#0d0e14", 1);
      Ink.stroke(g, arch, r, { w: 2.2, closed: true });
      shape(g, r, [[-30, -20], [-36, -150], [-20, -205], [0, -215], [20, -205], [36, -150], [30, -20]], "#1d1e28", { w: 1.4 });
      // piliers
      for (const x of [-150, 110]) box(g, r, x, -290, 40, 270, "#3a3d4c", { hatch: 5, hc: PAPER, ha: 0.1 });
      // disque noir cerclé de lumière (symbole de Tenebros)
      g.fillStyle = INK;
      g.beginPath(); g.arc(0, -318, 22, 0, TAU); g.fill();
      g.strokeStyle = "#cfd6e6"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, -318, 26, 0, TAU); g.stroke();
    });
  }

  function solumbrisSprite(f) {
    return sprite(`sol|${f}`, 480, 440, 240, 400, (g) => {
      const r = Ink.rng(57 + f * 7919);
      Ink.shadow(g, 0, 8, 240, 30, 0.22);
      for (let i = 0; i < 3; i++) box(g, r, -200 + i * 14, -20 + i * 10, 400 - i * 28, 14, "#d8c39a", { w: 1.6 });
      box(g, r, -190, -290, 380, 270, "#e9d6a8", { hatch: 8, ha: 0.12 });
      shape(g, r, [[-215, -290], [0, -360], [215, -290]], "#d9b66a", { hatch: 6, ha: 0.2 });
      // colonnes
      for (const x of [-170, -95, 65, 140]) box(g, r, x, -280, 30, 260, "#f2e4c0", { w: 1.8 });
      // entrée lumineuse et statue
      const door = [[-55, -20], [-55, -170], ...Ink.ellipse(0, -170, 55, 50, 12, Math.PI, Math.PI * 2).slice(1, -1), [55, -170], [55, -20]];
      Ink.fill(g, door, r, "#fff1c8", 1);
      Ink.stroke(g, door, r, { w: 2 });
      shape(g, r, [[-18, -20], [-24, -120], [0, -160], [24, -120], [18, -20]], "#c9a227", { w: 1.4 });
      // fanions
      g.strokeStyle = INK; g.lineWidth = 1.2;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(0, -335); g.quadraticCurveTo(s * 120, -300, s * 230, -330); g.stroke();
        for (let k = 1; k < 9; k++) {
          const x = s * k * 26, y = -335 + Math.sin((k / 9) * Math.PI) * 26 - (k / 9) * 0;
          g.fillStyle = ["#e0662f", "#e9b04a", "#b3261e", "#f2ead8"][k % 4];
          g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x, y + 14); g.fill();
        }
      }
      // soleil gris-doré (symbole de Solumbris)
      g.fillStyle = "#b9a46a";
      g.beginPath(); g.arc(0, -312, 18, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    });
  }

  function hutSprite(seed, f) {
    return sprite(`hut|${seed}|${f}`, 180, 200, 90, 175, (g) => {
      const r = Ink.rng(seed * 13 + f * 7919);
      const c = ["#8a6a48", "#7a5a3c", "#9a7a56"][seed % 3];
      box(g, r, -55, -80, 110, 80, c, { hatch: 6, angle: 1.4, ha: 0.25 });
      shape(g, r, [[-70, -74], [-50, -128], [52, -128], [70, -74]], "#4a4550", { hatch: 5 });
      box(g, r, -12, -44, 24, 44, INK, { w: 1.4 });
      box(g, r, 20, -64, 18, 16, "#2b2731", { w: 1.4 });
      Ink.stroke(g, [[30, -128], [30, -150]], r, { w: 3 });
      // filet de pêche accroché
      g.strokeStyle = "rgba(29,26,32,.6)";
      g.lineWidth = 0.8;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-50 + k * 6, -70); g.lineTo(-44 + k * 6, -20); g.stroke(); }
    });
  }

  function houseSprite(seed, f) {
    return sprite(`adobe|${seed}|${f}`, 200, 170, 100, 145, (g) => {
      const r = Ink.rng(seed * 29 + f * 7919);
      Ink.shadow(g, 0, 4, 90, 14, 0.3);
      const h = 70 + (seed % 3) * 12;
      shape(g, r, [[-72, 0], [-72, -h], [-60, -h - 8], [60, -h - 8], [72, -h], [72, 0]], "#bfa483", { hatch: 7, ha: 0.18 });
      // poutres qui dépassent
      for (const x of [-50, -20, 10, 40]) Ink.stroke(g, [[x, -h + 4], [x - 6, -h + 12]], r, { w: 4, color: "#5a3a22", passes: 1 });
      box(g, r, -16, -46, 32, 46, "#2b2320", { w: 1.6 });
      box(g, r, 30, -h + 22, 18, 16, "#2b2320", { w: 1.4 });
      box(g, r, -54, -h + 22, 18, 16, "#2b2320", { w: 1.4 });
      // sable noir accumulé au pied
      Ink.fill(g, Ink.ellipse(-50, 2, 34, 8, 12), r, "#2a2523", 2);
    });
  }

  function wellSprite(f) {
    return sprite(`well|${f}`, 140, 150, 70, 110, (g) => {
      const r = Ink.rng(5 + f * 7919);
      Ink.shadow(g, 0, 6, 54, 14, 0.3);
      const ring = Ink.ellipse(0, 0, 44, 20, 22);
      Ink.fill(g, ring, r, "#8d8070");
      Ink.hatch(g, ring, r, { gap: 5, alpha: 0.3 });
      Ink.stroke(g, ring, r, { w: 2.2, closed: true });
      Ink.fill(g, Ink.ellipse(0, -2, 32, 13, 18), r, "#141a20", 1);
      for (const s of [-1, 1]) Ink.stroke(g, [[s * 38, 2], [s * 34, -86]], r, { w: 4 });
      Ink.stroke(g, [[-42, -84], [42, -84]], r, { w: 4, color: "#5a3a22" });
      Ink.stroke(g, [[0, -84], [0, -40]], r, { w: 1 });
      box(g, r, -9, -42, 18, 16, "#6b4426", { w: 1.4 });
    });
  }

  // ---------- Habitants ----------

  let npcs = [];
  function setNpcs(list) { npcs = list || []; }
  const npcPos = (n, t) => ({ x: n.x + Math.sin(t * 0.3 + n.x) * 14, y: n.y + Math.sin(t * 0.21 + n.y) * 6 });

  function items(ctx, t, vis, talked) {
    const out = [];
    const f = boil(t);
    if (vis(PILLAR.x, PILLAR.y)) out.push({ y: PILLAR.y, draw: () => blit(ctx, pillarSprite(f), PILLAR.x, PILLAR.y) });
    if (vis(TENEBROS.x, TENEBROS.y)) out.push({ y: TENEBROS.y, draw: () => { blit(ctx, tenebrosSprite(f), TENEBROS.x, TENEBROS.y); runes(ctx, t); } });
    if (vis(SOLUMBRIS.x, SOLUMBRIS.y)) out.push({ y: SOLUMBRIS.y, draw: () => { blit(ctx, solumbrisSprite(f), SOLUMBRIS.x, SOLUMBRIS.y); braziers(ctx, t); } });
    for (const h of HUTS) if (vis(h.x, h.y)) out.push({ y: h.y, draw: () => blit(ctx, hutSprite(h.seed, f), h.x, h.y) });
    for (const h of HOUSES) if (vis(h.x, h.y)) out.push({ y: h.y, draw: () => blit(ctx, houseSprite(h.seed, f), h.x, h.y) });
    if (vis(WELL.x, WELL.y)) out.push({ y: WELL.y, draw: () => blit(ctx, wellSprite(f), WELL.x, WELL.y) });
    for (const n of npcs) {
      const p = npcPos(n, t);
      if (!vis(p.x, p.y)) continue;
      out.push({
        y: p.y,
        draw: () => {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (n.small) ctx.scale(0.75, 0.75);
          Ink.enxor(ctx, 0, 0, t, { seed: n.x % 97, color: n.color, wear: n.wear, face: Math.cos(t * 0.3 + n.x) > 0 ? 1 : -1, moving: false });
          ctx.restore();
        },
        label: () => {
          Ink.label(ctx, n.name, p.x, p.y - (n.small ? 46 : 58), { size: 13, color: "#8a5a1a" });
          if (!talked.has(n.id)) Ink.word(ctx, "!", p.x, p.y - (n.small ? 66 : 80) + Math.sin(t * 4) * 3, 22, "#e0662f", 900);
        },
      });
    }
    return out;
  }

  function runes(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [dx, dy] of [[-130, -240], [-130, -170], [-130, -100], [130, -240], [130, -170], [130, -100]]) {
      const a = 0.4 + Math.sin(t * 2 + dx + dy) * 0.3;
      const x = TENEBROS.x + dx, y = TENEBROS.y + dy;
      ctx.strokeStyle = `rgba(110,170,255,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // rune : un trait vertical et des branches
      const k = (dx + dy) % 3;
      ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
      if (k === 0) { ctx.moveTo(x, y - 6); ctx.lineTo(x + 7, y - 12); ctx.moveTo(x, y + 1); ctx.lineTo(x + 7, y - 5); }
      else if (k === 1 || k === -1) { ctx.moveTo(x - 7, y - 7); ctx.lineTo(x, y); ctx.lineTo(x + 7, y - 7); }
      else { ctx.moveTo(x, y - 12); ctx.lineTo(x + 7, y - 5); ctx.lineTo(x, y + 2); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function braziers(ctx, t) {
    for (const dx of [-215, 215]) {
      const x = SOLUMBRIS.x + dx, y = SOLUMBRIS.y + 10;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 3, y - 40, 6, 40);
      ctx.fillStyle = "#6b4426";
      ctx.beginPath(); ctx.ellipse(x, y - 40, 14, 5, 0, 0, TAU); ctx.fill();
      for (const [c, w, h] of [["#e0662f", 12, 30], ["#e9b04a", 7, 20]]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x - w, y - 42);
        ctx.quadraticCurveTo(x - w, y - 42 - h * 0.7, x + Math.sin(t * 9 + dx) * 3, y - 42 - h);
        ctx.quadraticCurveTo(x + w, y - 42 - h * 0.6, x + w, y - 42);
        ctx.fill();
      }
    }
  }

  // ---------- Ambiance : brume, sable, poussière dorée ----------

  function overlay(ctx, cam, vw, vh, t) {
    const reg = regionAt(cam.x + vw / 2, cam.y + vh / 2);
    ctx.save();
    if (reg.id === "rive") {
      for (let i = 0; i < 9; i++) {
        const x = ((i * 523 + t * 14) % 3400) - 200, y = 2750 + ((i * 377) % 1800);
        if (x < cam.x - 400 || x > cam.x + vw + 400 || y < cam.y - 300 || y > cam.y + vh + 300) continue;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 320);
        g.addColorStop(0, "rgba(230,225,210,.16)");
        g.addColorStop(1, "rgba(230,225,210,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 320, y - 320, 640, 640);
      }
      // lumière dorée de fin d'après-midi
      ctx.fillStyle = "rgba(233,176,74,.06)";
      ctx.fillRect(cam.x, cam.y, vw, vh);
    } else if (reg.id === "cendre") {
      ctx.fillStyle = "rgba(20,16,14,.35)";
      for (let i = 0; i < 70; i++) {
        const x = cam.x + ((i * 97 + t * (60 + (i % 5) * 20)) % (vw + 100)) - 50;
        const y = cam.y + ((i * 211) % vh) + Math.sin(t + i) * 8;
        ctx.fillRect(x, y, 3 + (i % 3) * 3, 1.5);
      }
    } else if (reg.id === "seuil") {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 30; i++) {
        const x = cam.x + ((i * 173 + t * 8) % vw), y = cam.y + ((i * 311 - t * 6) % vh + vh) % vh;
        if (x < splitX(y)) continue;
        ctx.fillStyle = `rgba(255,220,140,${0.25 + Math.sin(t * 2 + i) * 0.15})`;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function lights(vis) {
    const L = [];
    if (vis(PILLAR.x, PILLAR.y)) L.push({ x: PILLAR.x, y: PILLAR.y - 300, r: 320, k: 0.8, color: "rgba(220,220,240,.15)" });
    if (vis(TENEBROS.x, TENEBROS.y)) L.push({ x: TENEBROS.x, y: TENEBROS.y - 150, r: 260, k: 0.7, color: "rgba(110,170,255,.25)" });
    if (vis(SOLUMBRIS.x, SOLUMBRIS.y)) L.push({ x: SOLUMBRIS.x, y: SOLUMBRIS.y - 100, r: 380, k: 1, color: "rgba(255,190,90,.35)" });
    for (const h of HUTS) if (vis(h.x, h.y)) L.push({ x: h.x + 29, y: h.y - 56, r: 140 });
    for (const h of HOUSES) if (vis(h.x, h.y)) L.push({ x: h.x, y: h.y - 30, r: 150 });
    if (vis(WELL.x, WELL.y)) L.push({ x: WELL.x, y: WELL.y - 30, r: 180, k: 0.8 });
    return L;
  }

  // ---------- Interactions ----------

  function interactables() {
    return [
      ...npcs.map((n) => ({ kind: "npc", id: n.id, x: n.x, y: n.y, r: 75, label: `Parler à ${n.name}`, hit: { x: n.x - 30, y: n.y - 60, w: 60, h: 70 } })),
      ...SPOTS.map((s, i) => ({ kind: "spot", id: "spot" + i, x: s.x, y: s.y, r: 55, label: "Pêcher", spot: s })),
    ];
  }

  // où tombe le bouchon d'un pêcheur sur les pontons
  function spotBobber(e) {
    let best = null, bd = 90;
    for (const s of SPOTS) {
      const d = Math.hypot(s.x - e.x, s.y - e.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best && { x: best.bx, y: best.by };
  }

  // ---------- Carte du monde ----------

  function drawMap(g, w, h, players, meId, ents) {
    const s = Math.min(w / W, h / H);
    g.save();
    g.scale(s, s);
    for (const reg of REGIONS) {
      g.fillStyle = reg.color;
      g.fillRect(reg.x, reg.y, reg.w, reg.h);
    }
    g.fillStyle = "#e3c88f";
    g.beginPath();
    for (let y = 0; y <= 2400; y += 200) g.lineTo(splitX(y), y);
    g.lineTo(5200, 2400); g.lineTo(5200, 0); g.closePath(); g.fill();
    g.fillStyle = "#d9cdb4";
    g.fillRect(0, 2400, 3000, 300);
    g.fillStyle = "#1d2833";
    g.beginPath();
    for (let x = 0; x <= 3000; x += 100) g.lineTo(Math.min(x, coastX(shoreY(x))), shoreY(x));
    for (let y = 2700; y <= 4600; y += 100) g.lineTo(coastX(y), y);
    g.lineTo(0, 4600); g.closePath(); g.fill();
    g.fillStyle = "#8a6a48";
    for (const r of [...WALKS, ...PLATFORMS]) g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = "rgba(29,26,32,.4)";
    g.lineWidth = 30;
    for (const p of PATHS) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    const mark = (x, y, label, c = INK) => {
      g.fillStyle = c;
      g.beginPath(); g.arc(x, y, 50, 0, TAU); g.fill();
      g.font = "700 120px 'Barlow Semi Condensed', sans-serif";
      g.textAlign = "center";
      g.lineWidth = 24;
      g.strokeStyle = PAPER;
      g.strokeText(label, x, y - 80);
      g.fillStyle = INK;
      g.fillText(label, x, y - 80);
    };
    mark(1500, 1300, "La Source", "#e9b04a");
    mark(1500, 470, "La Canne À Pêche");
    mark(PILLAR.x, PILLAR.y, "Le Pilier");
    mark(TENEBROS.x, TENEBROS.y, "Tenebros", "#3e4a8a");
    mark(SOLUMBRIS.x, SOLUMBRIS.y, "Solumbris", "#e9b04a");
    mark(1360, 3600, "Le marché");
    mark(WELL.x, WELL.y, "Le puits", "#c98a5c");
    for (const reg of REGIONS) {
      g.font = "italic 400 260px Italianno, cursive";
      g.textAlign = "center";
      g.fillStyle = reg.id === "rive" || reg.id === "cendre" ? "rgba(239,229,208,.85)" : "rgba(29,26,32,.75)";
      g.fillText(reg.name, reg.x + reg.w / 2, reg.y + reg.h - 160);
    }
    for (const e of ents) {
      if (e.zone !== "village") continue;
      const p = players.get(e.id);
      g.fillStyle = p?.color || INK;
      g.beginPath(); g.arc(e.x, e.y, e.id === meId ? 70 : 45, 0, TAU); g.fill();
      if (e.id === meId) { g.strokeStyle = PAPER; g.lineWidth = 20; g.stroke(); }
    }
    g.restore();
  }

  return {
    W, H, REGIONS, regionAt, blocked, drawGround, items, overlay, lights, interactables, spotBobber, setNpcs, npcPos, drawMap,
    get npcs() { return npcs; },
  };
})();
