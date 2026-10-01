// Le monde ouvert d'Enxor : le Hameau (le village de la team) entouré de trois régions de l'univers.
//   Le Hameau des Encrés (nord-ouest) · Le Seuil (nord-est) · Rive-Basse (sud-ouest) · Cendre-Gravée (sud-est)
// Le sol des régions est dessiné par morceaux (tuiles) à la demande, pour rester léger.
window.World = (() => {
  const { INK, PAPER } = Ink;
  const TAU = Math.PI * 2;
  const W = 6400, H = 4600;

  const REGIONS = [
    { id: "hameau", name: "Le Hameau des Encrés", sub: "Là où vit la DreamTeam", x: 0, y: 0, w: 3000, h: 2400, color: "#efe5d0" },
    { id: "seuil", name: "Le Seuil", sub: "Là où l'ombre de la vallée touche la lumière de la crête", x: 3000, y: 0, w: 2200, h: 2400, color: "#8d8a7c", mood: "seuil" },
    { id: "rive", name: "Rive-Basse", sub: "Le village des pilotis, au-dessus de la cité engloutie", x: 0, y: 2400, w: 3000, h: 2200, color: "#2a3640", mood: "rive" },
    { id: "cendre", name: "Cendre-Gravée", sub: "Un avant-poste perdu dans le désert de sable noir", x: 3000, y: 2400, w: 2200, h: 2200, color: "#3a3431", mood: "cendre" },
    { id: "grotte", name: "La Grotte de Mythras", sub: "Là où le Rêveur a lu, puis dessiné", x: 5200, y: 0, w: 1200, h: 2400, color: "#16141a", mood: "grotte" },
    { id: "jungle", name: "La Jungle de Verdanya", sub: "Là où les arbres ont appris à pousser sans soleil", x: 5200, y: 2400, w: 1200, h: 2200, color: "#1c2a20", mood: "jungle" },
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

  // La Grotte de Mythras : des salles reliées par des tunnels, tout le reste est de la roche
  const CHAMBERS = [
    { id: "entree", x: 5480, y: 1100, rx: 230, ry: 170 },
    { id: "bibli", x: 5820, y: 720, rx: 300, ry: 210 },
    { id: "galerie", x: 5960, y: 1450, rx: 320, ry: 230 },
    { id: "antre", x: 6180, y: 1000, rx: 190, ry: 280 },
    { id: "alcove", x: 5660, y: 1920, rx: 210, ry: 170 },
  ];
  const ch = Object.fromEntries(CHAMBERS.map((c) => [c.id, c]));
  const TUNNELS = [
    [{ x: 5150, y: 1100 }, ch.entree], [ch.entree, ch.bibli], [ch.entree, ch.galerie], [ch.bibli, ch.antre],
    [ch.galerie, ch.antre], [ch.entree, ch.alcove], [ch.galerie, ch.alcove],
  ];
  const TUNNEL_W = 62;
  const ATRAMENTUS = { x: 6200, y: 1020 };
  const POOLS = [{ x: 5420, y: 1180, r: 46 }, { x: 6030, y: 1560, r: 60 }, { x: 5620, y: 1990, r: 40 }, { x: 5700, y: 800, r: 34 }];
  const SHELVES = Array.from({ length: 6 }, (_, i) => ({ x: 5600 + i * 90, y: 600 + Math.abs(i - 2.5) * 22 }));
  function segDist(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l));
    return Math.hypot(px - a.x - dx * k, py - a.y - dy * k);
  }
  const inCave = (x, y) =>
    CHAMBERS.some((c) => Math.hypot((x - c.x) / c.rx, (y - c.y) / c.ry) < 1) || TUNNELS.some(([a, b]) => segDist(x, y, a, b) < TUNNEL_W);

  // La Jungle de Verdanya : une clairière, des sentiers, et des arbres partout ailleurs
  const CLEARING = { x: 5800, y: 3560, r: 250 };
  const STATUE = { x: 5800, y: 3470 };
  const TOTEMS = [{ x: 5550, y: 2700 }, { x: 6220, y: 3250 }, { x: 5700, y: 4330 }];
  const SWAMP = { x: 5480, y: 4200, rx: 150, ry: 80 };
  const TERRATHOS = { x: 4860, y: 3880 };
  const JUNGLE_PATHS = [
    [[5150, 3500], [5500, 3520], [5800, 3560]],
    [[5800, 3560], [5620, 3100], [5550, 2700]],
    [[5800, 3560], [6100, 3350], [6220, 3250]],
    [[5800, 3560], [5760, 4000], [5700, 4330]],
    [[5620, 3100], [5950, 2880], [6150, 2760]],
    [[5760, 4000], [5550, 4180]],
  ];
  const TREES = [];
  {
    const tr = Ink.rng(808);
    const avoid = [CLEARING, ...TOTEMS.map((t) => ({ ...t, r: 110 })), { x: SWAMP.x, y: SWAMP.y, r: 190 }, { x: 6150, y: 2760, r: 110 }, { x: 5520, y: 4230, r: 110 }];
    for (let y = 2470; y < 4560; y += 120) {
      for (let x = 5240; x < 6380; x += 120) {
        const px = x + (tr() - 0.5) * 80, py = y + (tr() - 0.5) * 80, r = 26 + tr() * 22;
        if (avoid.some((a) => Math.hypot(px - a.x, py - a.y) < a.r + r)) continue;
        if (JUNGLE_PATHS.some((p) => p.some((pt, i) => i && segDist(px, py, { x: p[i - 1][0], y: p[i - 1][1] }, { x: pt[0], y: pt[1] }) < 80 + r))) continue;
        TREES.push({ x: px, y: py, r, seed: TREES.length });
      }
    }
  }

  const PATHS = [
    [[4300, 1100], [4800, 1110], [5150, 1100]],
    [[4460, 3540], [4900, 3520], [5150, 3500]],
    ...JUNGLE_PATHS,
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
    ...SHELVES.map((s) => ({ x: s.x - 40, y: s.y - 20, w: 80, h: 24 })),
    { x: STATUE.x - 50, y: STATUE.y - 30, w: 100, h: 40 },
    ...TOTEMS.map((t) => ({ x: t.x - 16, y: t.y - 14, w: 32, h: 18 })),
  ];

  function blocked(x, y) {
    if (x < 20 || y < 40 || x > W - 20 || y > H - 20) return true;
    if (x >= 5200 && y < 2400) return !inCave(x, y) || Math.hypot(x - ATRAMENTUS.x, (y - ATRAMENTUS.y) * 1.4) < 120;
    if (x >= 5200 && TREES.some((t) => Math.hypot(x - t.x, (y - t.y) * 1.6) < t.r * 0.7)) return true;
    if (Math.hypot(x - TERRATHOS.x, (y - TERRATHOS.y) * 1.5) < 110) return true;
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

  GROUND.grotte = (g, x0, y0, r) => {
    g.fillStyle = "#121015";
    g.fillRect(5200, 0, 1200, 2400);
    g.strokeStyle = "rgba(239,229,208,.05)";
    g.lineWidth = 1;
    for (let d = -2400; d < 1400; d += 9) { g.beginPath(); g.moveTo(5200 + d, 0); g.lineTo(5200 + d + 2400, 2400); g.stroke(); }
    // le sol des salles et des tunnels
    g.fillStyle = "#2a2630";
    for (const c of CHAMBERS) { g.beginPath(); g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); g.fill(); }
    g.lineCap = "round";
    g.strokeStyle = "#2a2630";
    g.lineWidth = TUNNEL_W * 2;
    for (const [a, b] of TUNNELS) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.fillStyle = grain;
    g.fillRect(x0, y0, TILE, TILE);
    // bord des parois
    g.strokeStyle = "rgba(0,0,0,.55)";
    g.lineWidth = 6;
    for (const c of CHAMBERS) { g.beginPath(); g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); g.stroke(); }
    scatter(g, x0, y0, r, 30, (x, y) => { if (inCave(x, y)) Ink.stone(g, x, y, r); });
    // flaques d'encre lumineuses
    for (const p of POOLS) {
      g.fillStyle = "#0d0b1c";
      g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 0.55, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(140,120,255,.6)";
      g.lineWidth = 2;
      g.stroke();
    }
    // les dessins de Mythras sur les murs de la galerie : les 14 créatures, à la craie
    const c = ch.galerie;
    g.strokeStyle = "rgba(239,229,208,.35)";
    g.lineWidth = 2.5;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (1.05 + (i / 13) * 0.9);
      const x = c.x + Math.cos(a) * (c.rx - 40), y = c.y + Math.sin(a) * (c.ry - 34);
      g.beginPath(); g.ellipse(x, y, 16, 10, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x + 14, y); g.quadraticCurveTo(x + 26, y - 14, x + 34, y - 2); g.stroke();
      g.beginPath(); g.moveTo(x - 6, y - 8); g.lineTo(x - 2, y - 22); g.lineTo(x + 4, y - 8); g.stroke();
    }
  };

  GROUND.jungle = (g, x0, y0, r) => {
    g.fillStyle = "#1c2a20";
    g.fillRect(5200, 2400, 1200, 2200);
    g.fillStyle = grain;
    g.fillRect(x0, y0, TILE, TILE);
    band(g, 5200, 2400, 200, 2200, false, "58,52,49");
    scatter(g, x0, y0, r, 90, (x, y) => {
      g.fillStyle = `rgba(${r() < 0.5 ? "60,110,70" : "20,40,26"},.5)`;
      g.beginPath(); g.ellipse(x, y, 6 + r() * 8, 3 + r() * 3, r() * 3, 0, TAU); g.fill();
    });
    // clairière de Verdanya
    const cl = g.createRadialGradient(CLEARING.x, CLEARING.y, 0, CLEARING.x, CLEARING.y, CLEARING.r);
    cl.addColorStop(0, "rgba(90,120,80,.6)");
    cl.addColorStop(1, "rgba(90,120,80,0)");
    g.fillStyle = cl;
    g.fillRect(CLEARING.x - CLEARING.r, CLEARING.y - CLEARING.r, CLEARING.r * 2, CLEARING.r * 2);
    // marais d'Hydriox
    g.fillStyle = "#13201a";
    g.beginPath(); g.ellipse(SWAMP.x, SWAMP.y, SWAMP.rx, SWAMP.ry, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(120,200,140,.25)";
    g.lineWidth = 2;
    g.stroke();
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

  function shelfSprite(i, f) {
    return sprite(`shelf|${i}|${f}`, 100, 150, 50, 130, (g) => {
      const r = Ink.rng(i * 41 + f * 7919);
      box(g, r, -42, -120, 84, 124, "#3b2a1c", { hatch: 6, hc: PAPER, ha: 0.06 });
      for (let k = 0; k < 4; k++) {
        const y = -112 + k * 30;
        Ink.stroke(g, [[-40, y + 26], [40, y + 26]], r, { w: 2, color: "#6b4426", passes: 1 });
        for (let b = 0; b < 7; b++) {
          const bx = -36 + b * 10 + r() * 2, h = 16 + r() * 8;
          g.fillStyle = ["#7a1426", "#3e4a8a", "#5b6b55", "#8a6a48", "#4a4550"][(b + k + i) % 5];
          g.fillRect(bx, y + 26 - h, 8, h);
        }
      }
    });
  }

  function statueSprite(f) {
    return sprite(`statue|${f}`, 200, 280, 100, 250, (g) => {
      const r = Ink.rng(66 + f * 7919);
      Ink.shadow(g, 0, 4, 80, 16, 0.3);
      box(g, r, -50, -30, 100, 34, "#3a4a3a", { hatch: 5 });
      // Verdanya : silhouette couverte de lianes et de mousse noire
      shape(g, r, [[-34, -30], [-40, -120], [-26, -190], [0, -215], [26, -190], [40, -120], [34, -30]], "#1f2b22", { hatch: 6, hc: "#6ea06e", ha: 0.25 });
      for (let k = 0; k < 6; k++) Ink.stroke(g, [[-36 + k * 14, -40], [-30 + k * 12 + Math.sin(k) * 10, -120], [-20 + k * 8, -200]], r, { w: 2, color: "#3f6b3a", passes: 1 });
      for (const s of [-1, 1]) { g.fillStyle = "#7cd15a"; g.beginPath(); g.ellipse(s * 9, -178, 4, 2.5, 0, 0, TAU); g.fill(); }
    });
  }

  function totemSprite(i, f) {
    return sprite(`totem|${i}|${f}`, 80, 170, 40, 150, (g) => {
      const r = Ink.rng(i * 97 + f * 7919);
      Ink.shadow(g, 0, 3, 26, 7, 0.3);
      box(g, r, -16, -130, 32, 132, "#5a3a22", { hatch: 4 });
      for (let k = 0; k < 3; k++) {
        const y = -118 + k * 40;
        g.fillStyle = "#7cd15a";
        for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 6, y, 3, 0, TAU); g.fill(); }
        Ink.stroke(g, [[-10, y + 12], [0, y + 18], [10, y + 12]], r, { w: 1.8, color: INK, passes: 1 });
      }
    });
  }

  function treeSprite(tr, f) {
    return sprite(`tree|${tr.seed}|${f}`, tr.r * 6, tr.r * 6, tr.r * 3, tr.r * 4.4, (g) => {
      const r = Ink.rng(tr.seed * 13 + f * 7919);
      Ink.shadow(g, 0, 2, tr.r, tr.r * 0.35, 0.35);
      box(g, r, -tr.r * 0.3, -tr.r * 1.4, tr.r * 0.6, tr.r * 1.4, "#2b1f17", { w: 1.6 });
      // feuillage noir et vert, en plusieurs touffes
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU, d = tr.r * 0.7;
        const leaf = Ink.ellipse(Math.cos(a) * d, -tr.r * 2.2 + Math.sin(a) * d * 0.6, tr.r * 0.95, tr.r * 0.75, 12);
        Ink.fill(g, leaf, r, k % 2 ? "#1d3324" : "#25402c", 2);
      }
      const top = Ink.ellipse(0, -tr.r * 2.3, tr.r * 1.1, tr.r * 0.85, 14);
      Ink.fill(g, top, r, "#2e5236", 2);
      Ink.hatch(g, top, r, { gap: 5, alpha: 0.25 });
    });
  }

  function terrathosSprite(f) {
    return sprite(`terra|${f}`, 300, 200, 150, 150, (g) => {
      const r = Ink.rng(919 + f * 7919);
      Ink.shadow(g, 0, 6, 140, 26, 0.35);
      shape(g, r, [[-130, 0], [-110, -70], [-60, -120], [10, -135], [70, -110], [120, -60], [135, 0]], "#4a433e", { hatch: 6, ha: 0.3 });
      for (let k = 0; k < 4; k++) Ink.stroke(g, [[-90 + k * 50, -20], [-70 + k * 50, -90 + (k % 2) * 20]], r, { w: 1.6, alpha: 0.5, passes: 1 });
    });
  }

  // Atramentus endormi, enroulé au fond de sa salle
  const COIL = Array.from({ length: 60 }, (_, i) => {
    const k = 59 - i, a = k * 0.17, rr = 22 + k * 1.9;
    return [ATRAMENTUS.x + Math.cos(a) * rr * 1.2, ATRAMENTUS.y + Math.sin(a) * rr * 0.8];
  });
  function drawAtramentus(ctx, t, awake) {
    const n = COIL.length;
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass ? "#24202a" : INK;
      for (let i = n - 1; i >= 0; i--) {
        const rr = 24 - (i / n) * 18 + Math.sin(t * 1.5 + i * 0.2) * 0.8;
        ctx.beginPath(); ctx.arc(COIL[i][0], COIL[i][1], rr + (pass ? 0 : 3), 0, TAU); ctx.fill();
      }
    }
    const [hx, hy] = COIL[0];
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(hx, hy, 34, 22, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = awake ? "#e9b04a" : PAPER;
    if (awake) { ctx.beginPath(); ctx.ellipse(hx + 8, hy - 6, 7, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.fillRect(hx + 7, hy - 10, 2, 8); }
    else { ctx.fillRect(hx + 2, hy - 6, 12, 2); }
    // souffle de fumée d'encre
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.3 + k / 3) % 1;
      ctx.globalAlpha = (1 - p) * 0.4;
      ctx.beginPath(); ctx.arc(hx + 30 + p * 30, hy - p * 40, 5 + p * 10, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Les apparitions légendaires ----------

  function phoenix(ctx, x, y, t, colors) {
    const flap = Math.sin(t * 5) * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 120);
    glow.addColorStop(0, colors[0] + "aa");
    glow.addColorStop(1, colors[0] + "00");
    ctx.fillStyle = glow;
    ctx.fillRect(-120, -120, 240, 240);
    ctx.globalCompositeOperation = "source-over";
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * flap);
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 50, -50, s * 95, -20);
      ctx.quadraticCurveTo(s * 60, -10, s * 70, 10);
      ctx.quadraticCurveTo(s * 40, 0, 0, 8);
      ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = colors[k % 2 ? 1 : 0];
      ctx.lineWidth = 4 - k;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(Math.sin(t * 2 + k) * 20, 50, (k - 1) * 20 + Math.sin(t * 3 + k) * 10, 90);
      ctx.stroke();
    }
    ctx.fillStyle = colors[2];
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 16, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -16, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function griffon(ctx, x, y, t) {
    const flap = Math.sin(t * 6) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#6b4426";
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * flap);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 80, -30); ctx.lineTo(s * 70, 0); ctx.lineTo(s * 60, 14); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#c9a76a";
    ctx.beginPath(); ctx.ellipse(0, 6, 16, 30, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f2ead8";
    ctx.beginPath(); ctx.arc(0, -24, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e9b04a";
    ctx.beginPath(); ctx.moveTo(-4, -32); ctx.lineTo(0, -40); ctx.lineTo(4, -32); ctx.fill();
    ctx.restore();
  }

  function serpent(ctx, pts, color, stars, t) {
    for (let i = pts.length - 1; i >= 0; i--) {
      const rr = 18 - (i / pts.length) * 13;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], rr + 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], rr, 0, TAU); ctx.fill();
      if (stars && i % 2 === 0) {
        ctx.fillStyle = `rgba(246,239,213,${0.5 + Math.sin(t * 3 + i) * 0.5})`;
        ctx.beginPath(); ctx.arc(pts[i][0] + 3, pts[i][1] - 2, 1.8, 0, TAU); ctx.fill();
      }
    }
  }

  // id, position au sol (pour savoir si on l'a « vu »), rayon de vue, et dessin
  function legends(t, sky, me) {
    const out = [];
    const h = sky.h ?? 12, dark = sky.dark ?? 0;
    if (dark < 0.3) {
      const a = t * 0.22;
      const x = 4600 + Math.cos(a) * 320, y = 360 + Math.sin(a) * 110;
      out.push({ id: "grifix", name: "Grifix, le griffon", x, y: y + 140, r: 480, air: true, draw: (ctx) => { Ink.shadow(ctx, x, y + 140, 50, 14, 0.2); griffon(ctx, x, y, t); } });
    } else {
      const x = 3050 + ((t * 70) % 1300), y = 1250 + Math.sin(t * 0.5) * 220;
      const pts = Array.from({ length: 22 }, (_, i) => [x - i * 18, y + Math.sin(t * 2 - i * 0.4) * 14]);
      out.push({ id: "noctifer", name: "Noctifer, le ciel gravé", x, y: y + 160, r: 480, air: true, draw: (ctx) => serpent(ctx, pts, "#232a52", true, t) });
    }
    const cyc = t % 45;
    if (cyc < 12) {
      const hgt = Math.sin((cyc / 12) * Math.PI) * 130;
      out.push({
        id: "thalassyx", name: "Thalassyx, le Kraken", x: 1300, y: 4420, r: 560, air: true, visible: hgt > 50,
        draw: (ctx) => {
          ctx.strokeStyle = "#3b2a4a";
          ctx.lineCap = "round";
          [[-70, 0.0], [0, 0.6], [70, 1.2]].forEach(([dx, ph]) => {
            for (const [w, c] of [[22, INK], [16, "#4a3560"]]) {
              ctx.strokeStyle = c; ctx.lineWidth = w;
              ctx.beginPath();
              ctx.moveTo(1300 + dx, 4440);
              ctx.quadraticCurveTo(1300 + dx + Math.sin(t * 2 + ph) * 40, 4440 - hgt * 0.6, 1300 + dx + Math.sin(t * 1.5 + ph) * 30, 4440 - hgt);
              ctx.stroke();
            }
          });
        },
      });
    }
    const terraAwake = me && Math.hypot(me.x - TERRATHOS.x, me.y - TERRATHOS.y) < 230;
    out.push({
      id: "terrathos", name: "Terrathos, le géant de pierre", x: TERRATHOS.x, y: TERRATHOS.y, r: 230, visible: terraAwake,
      draw: (ctx) => {
        blit(ctx, terrathosSprite(boil(t)), TERRATHOS.x, TERRATHOS.y);
        if (terraAwake) for (const s of [-1, 1]) { ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.ellipse(TERRATHOS.x + s * 30, TERRATHOS.y - 80, 9, 4 + Math.sin(t * 3) * 2, 0, 0, TAU); ctx.fill(); }
      },
    });
    const fc = t % 35;
    if (fc < 8) {
      const k = fc / 8, x = 5950 + k * 380, y = 2880 - k * 180 + Math.sin(k * 20) * 6;
      out.push({
        id: "fenryx", name: "Fenryx, le loup primordial", x, y, r: 430, air: true,
        draw: (ctx) => {
          ctx.fillStyle = "rgba(20,20,26,.85)";
          ctx.beginPath(); ctx.ellipse(x, y - 40, 70, 34, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + 64, y - 66, 26, 20, 0.3, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 70, y - 84); ctx.lineTo(x + 78, y - 108); ctx.lineTo(x + 86, y - 82); ctx.fill();
          for (let l = 0; l < 4; l++) ctx.fillRect(x - 50 + l * 30 + Math.sin(t * 12 + l) * 6, y - 14, 9, 30);
          ctx.fillStyle = "#7cd15a";
          ctx.beginPath(); ctx.arc(x + 76, y - 70, 3.5, 0, TAU); ctx.fill();
        },
      });
    }
    const atraAwake = me && Math.hypot(me.x - ATRAMENTUS.x, me.y - ATRAMENTUS.y) < 300;
    out.push({ id: "atramentus", name: "Atramentus, le premier-né", x: ATRAMENTUS.x, y: ATRAMENTUS.y, r: 300, visible: atraAwake, draw: (ctx) => drawAtramentus(ctx, t, atraAwake) });
    if (h >= 6 && h < 9) out.push({ id: "auroryx", name: "Auroryx, le phénix de l'aube", x: SOLUMBRIS.x, y: SOLUMBRIS.y, r: 600, air: true, draw: (ctx) => phoenix(ctx, SOLUMBRIS.x, SOLUMBRIS.y - 330 + Math.sin(t) * 12, t, ["#f6d9a8", "#f2b88a", "#fff1d8"]) });
    if (h >= 11.5 && h < 13.5) out.push({ id: "zenithral", name: "Zénithral, le phénix du zénith", x: PILLAR.x, y: PILLAR.y, r: 600, air: true, draw: (ctx) => phoenix(ctx, PILLAR.x, PILLAR.y - 420 + Math.sin(t) * 12, t, ["#ffe27a", "#ffb84a", "#fffbe8"]) });
    if (h >= 18 && h < 21) out.push({ id: "crepuscar", name: "Crépuscar, le phénix du crépuscule", x: TENEBROS.x, y: TENEBROS.y, r: 600, air: true, draw: (ctx) => phoenix(ctx, TENEBROS.x, TENEBROS.y - 330 + Math.sin(t) * 12, t, ["#c0466a", "#7a2a5a", "#f0b0a0"]) });
    return out;
  }

  // ---------- Habitants ----------

  let npcs = [];
  function setNpcs(list) { npcs = list || []; }
  const npcPos = (n, t) => ({ x: n.x + Math.sin(t * 0.3 + n.x) * 14, y: n.y + Math.sin(t * 0.21 + n.y) * 6 });

  function items(ctx, t, vis, talked, me) {
    const out = [];
    const f = boil(t);
    for (const [i, s] of SHELVES.entries()) if (vis(s.x, s.y)) out.push({ y: s.y, draw: () => blit(ctx, shelfSprite(i, f), s.x, s.y) });
    if (vis(STATUE.x, STATUE.y)) out.push({ y: STATUE.y, draw: () => blit(ctx, statueSprite(f), STATUE.x, STATUE.y) });
    for (const [i, tt] of TOTEMS.entries()) if (vis(tt.x, tt.y)) out.push({ y: tt.y, draw: () => blit(ctx, totemSprite(i, f), tt.x, tt.y) });
    for (const tr of TREES) {
      if (!vis(tr.x, tr.y)) continue;
      // le feuillage devient transparent quand on passe dessous
      const under = me && Math.abs(me.x - tr.x) < tr.r * 1.8 && me.y < tr.y && me.y > tr.y - tr.r * 3.4;
      out.push({ y: tr.y, draw: () => { ctx.save(); if (under) ctx.globalAlpha = 0.35; blit(ctx, treeSprite(tr, f), tr.x, tr.y); ctx.restore(); } });
    }
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
          if (n.ghost) ctx.globalAlpha = 0.4 + Math.sin(t * 1.3) * 0.15;
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

  function overlay(ctx, cam, vw, vh, t, me) {
    const reg = me ? regionAt(me.x, me.y) : regionAt(cam.x + vw / 2, cam.y + vh / 2);
    // grotte et jungle : on ne voit qu'autour de soi
    if ((reg.id === "grotte" || reg.id === "jungle") && me) {
      const cave = reg.id === "grotte";
      ctx.save();
      const rad = cave ? 300 : 460;
      const g = ctx.createRadialGradient(me.x, me.y - 20, rad * 0.35, me.x, me.y - 20, rad);
      g.addColorStop(0, "rgba(6,5,10,0)");
      g.addColorStop(1, cave ? "rgba(6,5,10,.93)" : "rgba(6,14,8,.7)");
      ctx.fillStyle = g;
      ctx.fillRect(cam.x, cam.y, vw, vh);
      ctx.globalCompositeOperation = "lighter";
      if (cave) {
        for (const p of POOLS) {
          const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
          pg.addColorStop(0, `rgba(120,100,255,${0.35 + Math.sin(t * 2 + p.x) * 0.1})`);
          pg.addColorStop(1, "rgba(120,100,255,0)");
          ctx.fillStyle = pg;
          ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
        }
      } else {
        // des yeux verts qui clignent entre les arbres
        for (let i = 0; i < 14; i++) {
          const tr = TREES[(i * 37) % TREES.length];
          if (!tr || Math.sin(t * 0.7 + i * 2.1) < 0.6) continue;
          ctx.fillStyle = "rgba(124,209,90,.85)";
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(tr.x + 30 + s * 6, tr.y - 20, 2.4, 0, TAU); ctx.fill(); }
        }
      }
      ctx.restore();
    }
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

  function drawMap(g, w, h, players, meId, ents, labels = true) {
    const s = Math.min(w / W, h / H);
    g.save();
    g.scale(s, s);
    for (const reg of REGIONS) {
      g.fillStyle = reg.color;
      g.fillRect(reg.x, reg.y, reg.w, reg.h);
    }
    g.fillStyle = "#4a4452";
    for (const c of CHAMBERS) { g.beginPath(); g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); g.fill(); }
    g.strokeStyle = "#4a4452"; g.lineWidth = TUNNEL_W * 2; g.lineCap = "round";
    for (const [a, b] of TUNNELS) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.fillStyle = "#2e5236";
    for (const tr of TREES) { g.beginPath(); g.arc(tr.x, tr.y, tr.r * 1.4, 0, TAU); g.fill(); }
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
    if (!labels) {
      for (const e of ents) {
        if (e.zone !== "village") continue;
        g.fillStyle = players.get(e.id)?.color || INK;
        g.beginPath(); g.arc(e.x, e.y, e.id === meId ? 150 : 100, 0, TAU); g.fill();
        if (e.id === meId) { g.strokeStyle = PAPER; g.lineWidth = 50; g.stroke(); }
      }
      g.restore();
      return;
    }
    mark(ch.bibli.x, ch.bibli.y, "La bibliothèque", "#7d5ba6");
    mark(ATRAMENTUS.x, ATRAMENTUS.y, "L'antre");
    mark(CLEARING.x, CLEARING.y, "La clairière", "#5b8c5a");
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
    W, H, REGIONS, regionAt, blocked, drawGround, items, overlay, lights, interactables, spotBobber, setNpcs, npcPos, drawMap, legends,
    get npcs() { return npcs; },
  };
})();
