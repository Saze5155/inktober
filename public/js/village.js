// Le village : disposition, décor généré, cabanes, grande maison et Source d'encre.
window.Village = (() => {
  const { INK, PAPER } = Ink;
  const W = 3000, H = 2400;
  const CENTER = { x: 1500, y: 1300 };
  const HOUSE = { x: 1500, y: 470 };
  const SIGN = { x: CENTER.x + 160, y: CENTER.y + 20 };
  const COLORS = ["#b3261e", "#e0662f", "#e9b04a", "#5b8c5a", "#3e7cb1", "#7d5ba6", "#d36b9c", "#4a4550"];
  const ROOFS = [["pointu", "Pointu"], ["plat", "Plat"], ["rond", "Rond"]];

  // 28 emplacements sur deux anneaux, en laissant le haut libre pour la grande maison
  const plots = [];
  function ring(radius, count) {
    for (let i = 0; i < count; i++) {
      const a = ((-55 + ((i + 0.5) * 290) / count) * Math.PI) / 180;
      plots.push({ x: Math.round(CENTER.x + Math.cos(a) * radius * 1.35), y: Math.round(CENTER.y + Math.sin(a) * radius) });
    }
  }
  ring(430, 10);
  ring(780, 18);
  const lamps = []; // têtes des lampadaires, remplies par buildBackground()

  // Les activités (mêmes positions que dans server/index.js pour le ballon)
  const POND = { x: 930, y: 430, rx: 170, ry: 80 };
  const RECORDS = { x: 1150, y: 540 };
  const STONES = Array.from({ length: 8 }, (_, i) => ({ x: 1890 + i * 52, y: Math.round(450 - Math.sin((i / 7) * Math.PI) * 40), r: 21 }));
  const FIRE = { x: 1250, y: 1510 };
  const SEATS = [{ x: 1170, y: 1520 }, { x: 1330, y: 1520 }, { x: 1250, y: 1585 }, { x: 1250, y: 1440 }];
  const BOARD = { x: 1770, y: 1470 };
  // l'estrade du loup-garou et ses pupitres en arc de cercle
  const ARENA = { x: 420, y: 330 };
  const STAGE = { x: 290, y: 230, w: 260, h: 90 };
  function arenaSpots(n) {
    return Array.from({ length: n }, (_, i) => {
      const a = ((15 + ((i + 0.5) * 150) / n) * Math.PI) / 180;
      const p = { x: ARENA.x + Math.cos(a) * 300, y: ARENA.y + Math.sin(a) * 210 };
      const d = Math.hypot(p.x - ARENA.x, p.y - ARENA.y);
      const ox = (p.x - ARENA.x) / d, oy = (p.y - ARENA.y) / d;
      return { x: p.x, y: p.y, stand: { x: p.x + ox * 34, y: p.y + oy * 30 + 8 }, vote: { x: p.x - ox * 62, y: p.y - oy * 50 } };
    });
  }
  const NOTE_COLORS =["#b3261e", "#e0662f", "#e9b04a", "#5b8c5a", "#5bb3a0", "#3e7cb1", "#7d5ba6", "#d36b9c"];

  // ---------- Sprites (dessinés une fois, 3 variantes pour l'effet « trait qui bouillonne ») ----------

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

  function blit(ctx, s, x, y) {
    ctx.drawImage(s, x - s.ax, y - s.ay, s.w, s.h);
  }

  const boil = (t) => Math.floor(t * 4) % 3;

  function roofPoints(type) {
    if (type === "plat") return [[-56, -68], [-48, -98], [48, -98], [56, -68]];
    if (type === "rond") return Ink.ellipse(0, -68, 56, 50, 20, Math.PI, Math.PI * 2);
    return [[-60, -66], [0, -130], [60, -66]];
  }

  function cabinSprite(cabin, seed, frame) {
    return sprite(`c|${cabin.color}|${cabin.roof}|${seed}|${frame}`, 160, 190, 80, 170, (g) => {
      const r = Ink.rng(seed + frame * 7919);
      const acc = cabin.color;
      Ink.shadow(g, 0, 2, 64, 12);

      const chim = Ink.rect(22, -122, 13, 30);
      Ink.fill(g, chim, r, "#d9ccb3");
      Ink.stroke(g, chim, r, { w: 1.8, closed: true, step: 8 });

      const body = Ink.rect(-46, -72, 92, 72);
      Ink.fill(g, body, r, "#f5ecd9");
      g.globalAlpha = 0.2;
      Ink.fill(g, body, r, acc);
      g.globalAlpha = 1;
      for (let y = -61; y < 0; y += 11) Ink.stroke(g, [[-44, y], [44, y]], r, { w: 0.9, amp: 1.4, passes: 1, alpha: 0.4 });
      Ink.stroke(g, body, r, { w: 2.2, closed: true });

      const roof = roofPoints(cabin.roof);
      Ink.fill(g, roof, r, acc);
      Ink.hatch(g, roof, r, { gap: 5, alpha: 0.35 });
      Ink.stroke(g, roof, r, { w: 2.4, closed: true });

      const door = Ink.rect(-13, -38, 26, 38);
      Ink.fill(g, door, r, INK, 1);
      g.fillStyle = acc;
      g.beginPath();
      g.arc(7, -19, 2, 0, Math.PI * 2);
      g.fill();

      const win = Ink.rect(20, -58, 18, 18);
      Ink.fill(g, win, r, "#2b2731", 1);
      Ink.stroke(g, win, r, { w: 1.6, closed: true, step: 8 });

      Ink.stroke(g, Ink.rect(-41, -63, 24, 28), r, { w: 1.6, closed: true, step: 8 });
    });
  }

  function houseSprite(open, frame) {
    return sprite(`h|${open}|${frame}`, 480, 500, 240, 470, (g) => {
      const r = Ink.rng(4242 + frame * 7919);
      Ink.shadow(g, 0, 4, 210, 28, 0.18);

      // la canne à pêche géante, plantée derrière la maison
      const P0 = [196, -4], P1 = [176, -430], P2 = [-150, -440];
      const bez = (k) => [
        (1 - k) * (1 - k) * P0[0] + 2 * (1 - k) * k * P1[0] + k * k * P2[0],
        (1 - k) * (1 - k) * P0[1] + 2 * (1 - k) * k * P1[1] + k * k * P2[1],
      ];
      g.save();
      g.lineCap = "round";
      for (let i = 0; i < 32; i++) {
        const a = bez(i / 32), b = bez((i + 1) / 32);
        g.strokeStyle = INK;
        g.lineWidth = 12 - i * 0.3;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.strokeStyle = "#6b4426";
        g.lineWidth = 8 - i * 0.2;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      const reel = bez(0.1);
      g.fillStyle = INK;
      g.beginPath(); g.arc(reel[0] - 10, reel[1], 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#b08d57";
      g.beginPath(); g.arc(reel[0] - 10, reel[1], 5, 0, Math.PI * 2); g.fill();
      g.restore();

      // murs
      const body = Ink.rect(-155, -175, 310, 175);
      Ink.fill(g, body, r, "#e8dcc4");
      for (let y = -162; y < 0; y += 13) Ink.stroke(g, [[-152, y], [152, y]], r, { w: 1, passes: 1, alpha: 0.4 });
      Ink.stroke(g, body, r, { w: 2.8, closed: true });

      // toit
      const roof = [[-190, -165], [0, -305], [190, -165]];
      Ink.fill(g, roof, r, "#3b3440");
      Ink.hatch(g, roof, r, { gap: 5, color: PAPER, alpha: 0.18, angle: 0.7 });
      Ink.stroke(g, roof, r, { w: 3, closed: true });

      // lucarne ronde
      const lu = Ink.ellipse(0, -215, 22, 22, 18);
      Ink.fill(g, lu, r, open ? "#ffcf7a" : "#2b2731", 1);
      Ink.stroke(g, lu, r, { w: 2, closed: true, step: 8 });

      // fenêtres
      for (const x of [-142, 98]) {
        const win = Ink.rect(x, -142, 44, 44);
        Ink.fill(g, win, r, open ? "#ffcf7a" : "#2b2731", 1);
        Ink.stroke(g, win, r, { w: 2, closed: true, step: 8 });
        if (!open) {
          for (const [a, b] of [[[x - 4, -136], [x + 48, -104]], [[x - 4, -104], [x + 48, -136]]]) {
            Ink.stroke(g, [a, b], r, { w: 7, color: INK, passes: 1, amp: 1 });
            Ink.stroke(g, [a, b], r, { w: 4.5, color: "#a88a5f", passes: 1, amp: 1 });
          }
        }
      }

      // panneau (le texte est écrit en direct)
      const sign = Ink.rect(-92, -130, 184, 32);
      Ink.fill(g, sign, r, "#d8c39a");
      Ink.stroke(g, sign, r, { w: 2, closed: true, step: 10 });

      // porte
      const door = Ink.rect(-30, -80, 60, 80);
      Ink.fill(g, door, r, open ? "#ffcf7a" : INK, 1);
      Ink.stroke(g, door, r, { w: 2.2, closed: true, step: 10 });
      if (!open) {
        for (const [a, b] of [[[-34, -72], [34, -14]], [[-34, -14], [34, -72]]]) {
          Ink.stroke(g, [a, b], r, { w: 8, color: INK, passes: 1, amp: 1 });
          Ink.stroke(g, [a, b], r, { w: 5, color: "#a88a5f", passes: 1, amp: 1 });
        }
        g.fillStyle = "#e9b04a";
        g.strokeStyle = INK;
        g.lineWidth = 1.5;
        g.beginPath(); g.arc(0, -46, 6, Math.PI, 0); g.stroke();
        g.fillRect(-8, -46, 16, 13);
        g.strokeRect(-8, -46, 16, 13);
      }
      Ink.stroke(g, [[-44, 6], [44, 6]], r, { w: 2 });

      // fil, hameçon et petit poisson devant le toit
      const tip = [P2[0] + 2, P2[1]];
      Ink.stroke(g, [tip, [tip[0], -236]], r, { w: 1, passes: 1, amp: 1.2 });
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(tip[0], -236);
      g.lineTo(tip[0], -226);
      g.arc(tip[0] - 5, -226, 5, 0, Math.PI);
      g.stroke();
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(tip[0] - 10, -206, 6, 13, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(tip[0] - 10, -194); g.lineTo(tip[0] - 17, -184); g.lineTo(tip[0] - 3, -184);
      g.fill();
      g.fillStyle = PAPER;
      g.beginPath(); g.arc(tip[0] - 12, -212, 1.8, 0, Math.PI * 2); g.fill();
    });
  }

  function sourceSprite(frame) {
    return sprite(`s|${frame}`, 240, 140, 120, 70, (g) => {
      const r = Ink.rng(99 + frame * 7919);
      Ink.shadow(g, 0, 8, 108, 40, 0.15);
      const outer = Ink.ellipse(0, 0, 100, 48, 36);
      Ink.fill(g, outer, r, "#d9ccb3");
      Ink.hatch(g, outer, r, { gap: 7, alpha: 0.22 });
      Ink.stroke(g, outer, r, { w: 2.6, closed: true });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        Ink.stroke(g, Ink.ellipse(Math.cos(a) * 89, Math.sin(a) * 41, 8, 5, 8), r, { w: 1.2, closed: true, passes: 1, amp: 1, step: 5 });
      }
      Ink.fill(g, Ink.ellipse(0, -2, 78, 34, 32), r, INK, 1.5);
    });
  }

  function signSprite(frame) {
    return sprite(`p|${frame}`, 60, 110, 30, 100, (g) => {
      const r = Ink.rng(555 + frame * 7919);
      Ink.shadow(g, 0, 2, 10, 4);
      Ink.stroke(g, [[0, 0], [0, -86]], r, { w: 3.5 });
    });
  }

  // ---------- Dessin en direct ----------

  function drawCabin(ctx, x, y, player, ownerOnline, t, img, night) {
    blit(ctx, cabinSprite(player.cabin, Ink.hash(player.id), boil(t)), x, y);

    if (ownerOnline || night) {
      // fenêtre allumée la nuit, et fumée quand le propriétaire est connecté
      ctx.save();
      Ink.halo(ctx, "rgba(255,200,100,0.45)", x + 29, y - 49, 40);
      ctx.fillStyle = "#ffcf7a";
      ctx.fillRect(x + 21, y - 57, 16, 16);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 29, y - 57); ctx.lineTo(x + 29, y - 41);
      ctx.moveTo(x + 21, y - 49); ctx.lineTo(x + 37, y - 49);
      ctx.stroke();
      for (let k = 0; ownerOnline && k < 3; k++) {
        const p = (t * 0.35 + k / 3) % 1;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.beginPath();
        ctx.arc(x + 28 + Math.sin(p * 6 + k) * 6, y - 128 - p * 48, 4 + p * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (img && img.complete && img.naturalWidth) {
      const fw = 22, fh = 26, s = Math.min(fw / img.naturalWidth, fh / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, x - 40 + (fw - w) / 2, y - 62 + (fh - h) / 2, w, h);
    }
  }

  function drawHouse(ctx, t, open) {
    blit(ctx, houseSprite(open, boil(t)), HOUSE.x, HOUSE.y);
    ctx.save();
    ctx.font = `700 17px "Barlow Semi Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    ctx.fillText("LA CANNE À PÊCHE", HOUSE.x, HOUSE.y - 113);
    ctx.restore();
  }

  function drawSource(ctx, t, text) {
    blit(ctx, sourceSprite(boil(t)), CENTER.x, CENTER.y);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(CENTER.x, CENTER.y - 2, 76, 32, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.75 + Math.sin(t * 1.5) * 0.25;
    Ink.halo(ctx, "rgba(233,176,74,0.3)", CENTER.x, CENTER.y - 2, 70);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.3 + k / 3) % 1;
      ctx.strokeStyle = `rgba(239,229,208,${(1 - p) * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(CENTER.x, CENTER.y - 2, 76 * p, 32 * p, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    drawSign(ctx, t, text);
  }

  function drawSign(ctx, t, text) {
    blit(ctx, signSprite(boil(t)), SIGN.x, SIGN.y);
    ctx.save();
    ctx.font = `700 14px "Barlow Semi Condensed", sans-serif`;
    const w = ctx.measureText(text).width + 22;
    const x = SIGN.x - w / 2, y = SIGN.y - 92;
    ctx.fillStyle = "#d8c39a";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 26, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, SIGN.x, y + 13);
    ctx.restore();
  }

  // ---------- Décor de fond (généré une seule fois) ----------

  function distSeg(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (a.x + dx * k), py - (a.y + dy * k));
  }

  // Routes : deux anneaux qui passent devant les cabanes + quelques allées vers la Source
  function roads() {
    const ringPts = (radius) => {
      const pts = [];
      for (let deg = -62; deg <= 242; deg += 6) {
        const a = (deg * Math.PI) / 180;
        pts.push({ x: CENTER.x + Math.cos(a) * radius * 1.35, y: CENTER.y + Math.sin(a) * radius + 22 });
      }
      return pts;
    };
    const spoke = (deg, r0, r1) => {
      const a = (deg * Math.PI) / 180;
      return [r0, r1].map((rr) => ({ x: CENTER.x + Math.cos(a) * rr * 1.35, y: CENTER.y + Math.sin(a) * rr + 22 }));
    };
    return [
      ringPts(430),
      ringPts(780),
      [{ x: CENTER.x, y: CENTER.y - 60 }, { x: HOUSE.x, y: HOUSE.y + 30 }],
      spoke(0, 110, 780),
      spoke(180, 110, 780),
      spoke(90, 70, 780),
      // vers le Seuil (est) et vers Rive-Basse (sud)
      [{ x: CENTER.x + 780 * 1.35, y: CENTER.y + 22 }, { x: W, y: CENTER.y }],
      [{ x: CENTER.x, y: CENTER.y + 802 }, { x: CENTER.x, y: H }],
    ];
  }

  function drawRoad(g, pts, r) {
    Ink.stroke(g, pts.map((p) => [p.x, p.y]), r, { w: 38, color: "rgba(120,95,70,.11)", passes: 1, amp: 8, step: 50 });
    g.save();
    g.strokeStyle = INK;
    g.globalAlpha = 0.3;
    g.lineWidth = 1.4;
    g.lineCap = "round";
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 0; d < len; d += 24) {
        const k = d / len;
        const x = a.x + (b.x - a.x) * k + (r() - 0.5) * 10, y = a.y + (b.y - a.y) * k + (r() - 0.5) * 6;
        g.beginPath();
        g.moveTo(x - 4, y);
        g.lineTo(x + 4, y + (r() - 0.5) * 2);
        g.stroke();
      }
    }
    g.restore();
  }

  function nearRoad(x, y, list, m) {
    return list.some((pts) => pts.some((a, i) => i < pts.length - 1 && distSeg(x, y, a, pts[i + 1]) < m));
  }

  function buildBackground() {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const r = Ink.rng(2026);

    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = r() * H, s = 150 + r() * 400;
      const grad = g.createRadialGradient(x, y, 0, x, y, s);
      grad.addColorStop(0, `rgba(${r() < 0.5 ? "120,95,70" : "60,55,70"},${0.03 + r() * 0.05})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    g.fillStyle = Ink.grain(g);
    g.fillRect(0, 0, W, H);

    const paths = roads();
    for (const pts of paths) drawRoad(g, pts, r);

    const avoid = [
      ...plots.map((p) => ({ x: p.x, y: p.y - 40, r: 120 })),
      { x: CENTER.x, y: CENTER.y, r: 240 },
      { x: SIGN.x, y: SIGN.y, r: 60 },
      { x: HOUSE.x, y: HOUSE.y - 120, r: 310 },
      { x: POND.x, y: POND.y, r: 230 },
      { x: RECORDS.x, y: RECORDS.y, r: 50 },
      ...STONES.map((s) => ({ x: s.x, y: s.y, r: 50 })),
      { x: FIRE.x, y: FIRE.y, r: 130 },
      { x: BOARD.x, y: BOARD.y, r: 80 },
      { x: ARENA.x, y: ARENA.y + 60, r: 360 },
    ];
    const free = (x, y, m) =>
      x > m && y > m && x < W - m && y < H - m &&
      avoid.every((a) => Math.hypot(a.x - x, a.y - y) > a.r + m) &&
      !nearRoad(x, y, paths, 36 + m);

    const flat = [], tall = [];
    function scatter(list, n, margin, fn) {
      for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
        const x = r() * W, y = r() * H;
        if (free(x, y, margin)) { list.push({ x, y, fn }); i++; }
      }
    }
    scatter(flat, 80, 10, (x, y) => Ink.crack(g, x, y, r));
    scatter(flat, 24, 20, (x, y) => Ink.splat(g, x, y, 10 + r() * 26, r, INK, 0.85));
    scatter(flat, 300, 4, (x, y) => Ink.grass(g, x, y, r));
    scatter(flat, 100, 4, (x, y) => Ink.stone(g, x, y, r));
    scatter(tall, 16, 60, (x, y) => Ink.ruin(g, x, y, r));
    lamps.length = 0;
    scatter(tall, 9, 30, (x, y) => lamps.push(Ink.lamp(g, x, y, r)));
    scatter(tall, 36, 50, (x, y) => Ink.deadTree(g, x, y, r, 90 + r() * 90));
    for (const d of flat) d.fn(d.x, d.y);
    tall.sort((a, b) => a.y - b.y).forEach((d) => d.fn(d.x, d.y));

    return c;
  }

  // ---------- Activités ----------

  function pondSprite(frame) {
    return sprite(`pond|${frame}`, 440, 260, 220, 130, (g) => {
      const r = Ink.rng(31 + frame * 7919);
      const shore = Ink.ellipse(0, 0, POND.rx + 20, POND.ry + 16, 40);
      Ink.fill(g, shore, r, "#d9ccb3");
      Ink.hatch(g, shore, r, { gap: 7, alpha: 0.2 });
      Ink.stroke(g, shore, r, { w: 1.6, closed: true, alpha: 0.6 });
      const water = Ink.ellipse(0, 0, POND.rx, POND.ry, 40);
      Ink.fill(g, water, r, "#41606f");
      Ink.hatch(g, water, r, { gap: 8, color: PAPER, alpha: 0.12, angle: 0 });
      Ink.stroke(g, water, r, { w: 2.4, closed: true });
      for (const [x, y, s] of [[-90, -20, 16], [60, 30, 12], [110, -30, 10], [-30, 40, 9]]) {
        Ink.fill(g, Ink.ellipse(x, y, s, s * 0.55, 12), r, "#5b8c5a", 0.8);
        Ink.stroke(g, Ink.ellipse(x, y, s, s * 0.55, 12), r, { w: 1, closed: true, passes: 1, amp: 0.8, step: 6 });
      }
      // roseaux
      for (let i = 0; i < 18; i++) {
        const a = Math.PI * (0.65 + r() * 0.5) + (i % 2 ? Math.PI : 0);
        const x = Math.cos(a) * (POND.rx + 6), y = Math.sin(a) * (POND.ry + 6);
        const h = 22 + r() * 22;
        Ink.stroke(g, [[x, y], [x + (r() - 0.5) * 8, y - h]], r, { w: 1.4, passes: 1, amp: 1 });
        if (r() < 0.5) Ink.fill(g, Ink.ellipse(x, y - h + 4, 3, 7, 8), r, "#6b4426", 0.5);
      }
    });
  }

  function drawPond(ctx, t, dark) {
    blit(ctx, pondSprite(boil(t)), POND.x, POND.y);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(POND.x, POND.y, POND.rx - 2, POND.ry - 2, 0, 0, Math.PI * 2);
    ctx.clip();
    if (dark > 0.25) {
      // reflet de la lune
      ctx.fillStyle = `rgba(239,229,208,${0.5 * (dark / 0.62)})`;
      ctx.beginPath();
      ctx.ellipse(POND.x + 70, POND.y - 20, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(239,229,208,.35)";
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.25 + k / 4) % 1;
      const cx = POND.x + Math.sin(k * 7.3) * 100, cy = POND.y + Math.cos(k * 3.1) * 40;
      ctx.globalAlpha = 1 - p;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6 + p * 30, 3 + p * 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function postSign(key, w, text, x, y, t) {
    return sprite(`sign|${key}|${boil(t)}`, w + 20, 110, (w + 20) / 2, 100, (g) => {
      const r = Ink.rng(Ink.hash(key) + boil(t) * 7919);
      Ink.shadow(g, 0, 2, 12, 4);
      Ink.stroke(g, [[0, 0], [0, -70]], r, { w: 3.5 });
      Ink.fill(g, Ink.rect(-w / 2, -92, w, 28), r, "#d8c39a");
      Ink.stroke(g, Ink.rect(-w / 2, -92, w, 28), r, { w: 2, closed: true, step: 10 });
    });
  }

  function drawRecordsSign(ctx, t) {
    blit(ctx, postSign("records", 150, "", RECORDS.x, RECORDS.y, t), RECORDS.x, RECORDS.y);
    Ink.word(ctx, "Records de pêche", RECORDS.x, RECORDS.y - 78, 14, INK, 700);
  }

  function drawStones(ctx, t, glow) {
    STONES.forEach((s, i) => {
      const lit = Math.max(0, 1 - (t - (glow[i] || -9)) / 0.6);
      Ink.shadow(ctx, s.x, s.y + 4, s.r + 2, 8, 0.18);
      ctx.save();
      ctx.fillStyle = "#d9ccb3";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - lit * 3, s.r, s.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = NOTE_COLORS[i];
      ctx.globalAlpha = 0.35 + lit * 0.65;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - lit * 3, s.r * 0.45, s.r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lit > 0) {
        ctx.globalAlpha = lit;
        Ink.word(ctx, "♪", s.x + Math.sin(i) * 8, s.y - 30 - (1 - lit) * 24, 18, NOTE_COLORS[i]);
      }
      ctx.restore();
    });
  }

  function fireSprite(frame) {
    return sprite(`fire|${frame}`, 300, 240, 150, 120, (g) => {
      const r = Ink.rng(77 + frame * 7919);
      // bûches pour s'asseoir
      for (const s of SEATS) {
        const x = s.x - FIRE.x, y = s.y - FIRE.y + 14;
        Ink.shadow(g, x, y + 4, 34, 7);
        const log = [[x - 30, y - 8], [x + 30, y - 8], [x + 30, y + 6], [x - 30, y + 6]];
        Ink.fill(g, log, r, "#8a5a3a");
        Ink.hatch(g, log, r, { gap: 4, alpha: 0.3, angle: 0 });
        Ink.stroke(g, log, r, { w: 1.8, closed: true, step: 8 });
        Ink.stroke(g, Ink.ellipse(x + 30, y - 1, 4, 7, 10), r, { w: 1.2, closed: true, passes: 1, step: 4 });
      }
      // cercle de pierres
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const st = Ink.ellipse(Math.cos(a) * 30, Math.sin(a) * 14 + 4, 8, 5, 10);
        Ink.fill(g, st, r, "#bdb2a0", 0.6);
        Ink.stroke(g, st, r, { w: 1.2, closed: true, passes: 1, step: 4, amp: 0.8 });
      }
      Ink.stroke(g, [[-18, 6], [18, -4]], r, { w: 6, color: "#5a3a22", passes: 1 });
      Ink.stroke(g, [[-18, -4], [18, 6]], r, { w: 6, color: "#5a3a22", passes: 1 });
    });
  }

  function drawFire(ctx, t) {
    blit(ctx, fireSprite(boil(t)), FIRE.x, FIRE.y);
    const flames = [["#b3261e", 26, 1], ["#e0662f", 20, 0.85], ["#e9b04a", 12, 0.65]];
    for (const [c, w, hk] of flames) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(FIRE.x - w, FIRE.y);
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        const x = FIRE.x - w + k * w * 2;
        const h = (i % 2 ? 0.6 : 1) * 46 * hk * (0.8 + Math.sin(t * 9 + i * 1.7) * 0.2) * Math.sin(Math.PI * (0.15 + k * 0.7));
        ctx.lineTo(x, FIRE.y - 4 - h);
      }
      ctx.lineTo(FIRE.x + w, FIRE.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawBoard(ctx, t, count) {
    const key = Math.min(8, count);
    const s = sprite(`board|${key}|${boil(t)}`, 180, 150, 90, 140, (g) => {
      const r = Ink.rng(919 + boil(t) * 7919);
      Ink.shadow(g, 0, 2, 70, 8);
      for (const x of [-60, 60]) Ink.stroke(g, [[x, 0], [x, -120]], r, { w: 4 });
      const plank = Ink.rect(-80, -124, 160, 84);
      Ink.fill(g, plank, r, "#a88a5f");
      Ink.hatch(g, plank, r, { gap: 6, alpha: 0.25, angle: 0 });
      Ink.stroke(g, plank, r, { w: 2.4, closed: true });
      for (let i = 0; i < key; i++) {
        const x = -66 + (i % 4) * 34 + (r() - 0.5) * 6, y = -114 + Math.floor(i / 4) * 36 + (r() - 0.5) * 4;
        const note = Ink.rect(x, y, 26, 26);
        Ink.fill(g, note, r, "#f6efe0", 0.8);
        Ink.stroke(g, note, r, { w: 1, closed: true, passes: 1, step: 6, amp: 0.8 });
        for (let l = 0; l < 3; l++) Ink.stroke(g, [[x + 4, y + 7 + l * 6], [x + 22, y + 7 + l * 6]], r, { w: 0.8, passes: 1, amp: 0.6, alpha: 0.6 });
        g.fillStyle = NOTE_COLORS[i % 8];
        g.beginPath(); g.arc(x + 13, y + 2, 2.5, 0, 7); g.fill();
      }
    });
    blit(ctx, s, BOARD.x, BOARD.y);
    Ink.word(ctx, "Le mur des mots", BOARD.x, BOARD.y - 136, 14, INK, 700);
  }

  // ---------- L'estrade du loup-garou ----------

  function stageSprite(frame) {
    return sprite(`stage|${frame}`, 340, 280, 170, 170, (g) => {
      const r = Ink.rng(404 + frame * 7919);
      const { w, h } = STAGE;
      // rideau du fond
      const back = [[-w / 2 - 10, -40], [-w / 2 - 10, -150], [w / 2 + 10, -150], [w / 2 + 10, -40]];
      Ink.fill(g, back, r, "#6e1f2c");
      for (let x = -w / 2; x < w / 2; x += 22) Ink.stroke(g, [[x, -146], [x + 4, -42]], r, { w: 1, passes: 1, alpha: 0.4 });
      Ink.stroke(g, back, r, { w: 2.2, closed: true });
      Ink.fill(g, Ink.rect(-w / 2 - 20, -160, w + 40, 18), r, "#3b2a1c");
      Ink.stroke(g, Ink.rect(-w / 2 - 20, -160, w + 40, 18), r, { w: 2, closed: true });
      // plancher
      const floor = [[-w / 2, -h + 50], [w / 2, -h + 50], [w / 2 + 14, 50], [-w / 2 - 14, 50]];
      Ink.fill(g, floor, r, "#b08a5c");
      for (let y = -h + 62; y < 50; y += 12) Ink.stroke(g, [[-w / 2 - 6, y], [w / 2 + 6, y]], r, { w: 0.9, passes: 1, alpha: 0.45 });
      Ink.stroke(g, floor, r, { w: 2.4, closed: true });
      // devant de la scène
      const front = Ink.rect(-w / 2 - 14, 50, w + 28, 16);
      Ink.fill(g, front, r, "#7a5636");
      Ink.hatch(g, front, r, { gap: 5, alpha: 0.35 });
      Ink.stroke(g, front, r, { w: 2, closed: true });
      // marches
      for (let i = 0; i < 2; i++) {
        const st = Ink.rect(-30 + i * 6, 66 + i * 8, 60 - i * 12, 8);
        Ink.fill(g, st, r, "#9a7650");
        Ink.stroke(g, st, r, { w: 1.4, closed: true, step: 8 });
      }
    });
  }

  function drawStage(ctx, t, lit) {
    blit(ctx, stageSprite(boil(t)), ARENA.x, STAGE.y + 40);
    ctx.save();
    ctx.font = `700 13px "Barlow Semi Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e9b04a";
    ctx.fillText("CONSEIL DU VILLAGE", ARENA.x, STAGE.y - 111);
    ctx.restore();
    // torches
    for (const s of [-1, 1]) {
      const x = ARENA.x + s * (STAGE.w / 2 + 34), y = STAGE.y + 100;
      Ink.shadow(ctx, x, y, 8, 3);
      ctx.save();
      ctx.strokeStyle = "#5a3a22";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      const f = Math.sin(t * 11 + s) * 2;
      ctx.fillStyle = lit ? "#e0662f" : "#b3261e";
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 46); ctx.quadraticCurveTo(x - 6, y - 62, x + f, y - 70); ctx.quadraticCurveTo(x + 7, y - 60, x + 7, y - 46);
      ctx.fill();
      ctx.fillStyle = "#e9b04a";
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 46); ctx.quadraticCurveTo(x - 2, y - 56, x + f * 0.5, y - 61); ctx.quadraticCurveTo(x + 3, y - 54, x + 3, y - 46);
      ctx.fill();
      ctx.restore();
    }
  }

  // pupitres des joueurs : nom, état (mort / accusé), et cercles de vote pendant le vote
  function drawPodiums(ctx, t, lgs, spots, players) {
    lgs.players.forEach((p, i) => {
      const s = spots[i];
      const accused = lgs.accused === p.id;
      Ink.shadow(ctx, s.x, s.y + 2, 16, 5);
      ctx.save();
      ctx.fillStyle = p.alive ? "#8a5a3a" : "#5a5560";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - 14, s.y); ctx.lineTo(s.x - 10, s.y - 26); ctx.lineTo(s.x + 10, s.y - 26); ctx.lineTo(s.x + 14, s.y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = accused ? "#b3261e" : "#d8c39a";
      ctx.fillRect(s.x - 18, s.y - 34, 36, 9);
      ctx.strokeRect(s.x - 18, s.y - 34, 36, 9);
      ctx.restore();
      const color = players.get(p.id)?.color || INK;
      Ink.label(ctx, p.pseudo, s.x, s.y - 44, { size: 12, dot: color, color: p.alive ? INK : "#6b6170" });
      if (!p.alive) {
        Ink.word(ctx, "✝", s.x, s.y - 15, 14, PAPER);
        if (p.role) Ink.label(ctx, p.role === "loup" ? "Loup-garou" : p.role[0].toUpperCase() + p.role.slice(1), s.x, s.y + 14, { size: 11, color: p.role === "loup" ? "#b3261e" : "#6b6170" });
      }
      if (lgs.phase === "vote" && p.alive) {
        const count = Object.values(lgs.votes).filter((v) => v === p.id).length;
        ctx.save();
        ctx.strokeStyle = count ? "#b3261e" : "rgba(29,26,32,.45)";
        ctx.lineWidth = count ? 2.6 : 1.6;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath();
        ctx.ellipse(s.vote.x, s.vote.y, 28, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (count) Ink.word(ctx, String(count), s.vote.x, s.vote.y + 1, 16, "#b3261e", 800);
      }
    });
  }

  // corbeaux d'encre (décor vivant, simulé sur chaque PC)
  function drawCrow(ctx, c, t) {
    const fly = c.state === "fly";
    const y = c.y - c.z;
    if (!fly) Ink.shadow(ctx, c.x, c.y + 2, 9, 3, 0.2);
    else Ink.shadow(ctx, c.x, c.y + 2, 7, 2, 0.1);
    ctx.save();
    ctx.translate(c.x, y);
    ctx.scale(c.face, 1);
    ctx.fillStyle = INK;
    const hop = !fly && c.peck ? Math.abs(Math.sin(t * 14)) * 3 : 0;
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -13 + hop, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -14 + hop); ctx.lineTo(17, -12 + hop + hop); ctx.lineTo(10, -11 + hop);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, -9); ctx.lineTo(-16, -12); ctx.lineTo(-14, -6);
    ctx.fill();
    if (fly) {
      const w = Math.sin(t * 22 + c.ph) * 10;
      ctx.beginPath();
      ctx.moveTo(-4, -10); ctx.lineTo(-2, -22 - w); ctx.lineTo(6, -11);
      ctx.fill();
    } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, -3); ctx.lineTo(-2, 1);
      ctx.moveTo(3, -3); ctx.lineTo(3, 1);
      ctx.stroke();
    }
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(8, -14 + hop, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Jour et nuit (heure de Paris) ----------

  const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  function parisHour() {
    const forced = location.hostname === "localhost" && new URLSearchParams(location.search).get("heure");
    if (forced) return Number(forced);
    const p = Object.fromEntries(hourFmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
    return Number(p.hour) + Number(p.minute) / 60;
  }

  // dark : 0 (plein jour) → 0.62 (nuit) ; dusk : teinte orangée du crépuscule et de l'aube
  function sky() {
    const h = parisHour();
    const ramp = (a, b) => Math.max(0, Math.min(1, (h - a) / (b - a)));
    const dark = 0.62 * (h >= 12 ? ramp(18.5, 21) : 1 - ramp(6, 8));
    const dusk = Math.max(0, 1 - Math.abs(h - 19.5) / 1.5) + Math.max(0, 1 - Math.abs(h - 7) / 1.2);
    return { dark, dusk: Math.min(1, dusk), h };
  }

  let nightC = null, ng = null;
  function drawNight(ctx, cam, vw, vh, dpr, s, lights) {
    if (s.dusk > 0.01) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgba(235,120,60,${s.dusk * 0.13})`;
      ctx.fillRect(0, 0, vw, vh);
      ctx.restore();
    }
    if (s.dark < 0.01) return;
    const w = Math.round(vw * dpr), h = Math.round(vh * dpr);
    if (!nightC || nightC.width !== w || nightC.height !== h) {
      nightC = document.createElement("canvas");
      nightC.width = w;
      nightC.height = h;
      ng = nightC.getContext("2d");
    }
    ng.setTransform(1, 0, 0, 1, 0, 0);
    ng.globalCompositeOperation = "source-over";
    ng.clearRect(0, 0, w, h);
    ng.fillStyle = `rgba(8,12,46,${s.dark * 1.15})`;
    ng.fillRect(0, 0, w, h);
    ng.globalCompositeOperation = "destination-out";
    ng.setTransform(dpr, 0, 0, dpr, -cam.x * dpr, -cam.y * dpr);
    for (const l of lights) Ink.halo(ng, `rgba(0,0,0,${l.k ?? 0.95})`, l.x, l.y, l.r);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(nightC, 0, 0);
    // halo chaud des lumières (coupé en mode léger)
    if (!Ink.quality.low) {
      ctx.globalCompositeOperation = "lighter";
      ctx.setTransform(dpr, 0, 0, dpr, -cam.x * dpr, -cam.y * dpr);
      for (const l of lights) {
        ctx.globalAlpha = l.color ? 1 : s.dark / 0.62;
        Ink.halo(ctx, l.color || "rgba(255,170,80,0.22)", l.x, l.y, l.r * 0.55);
      }
    }
    ctx.restore();
  }

  return {
    W, H, CENTER, HOUSE, COLORS, ROOFS, plots, lamps, POND, RECORDS, STONES, FIRE, SEATS, BOARD, ARENA, STAGE, arenaSpots,
    buildBackground, drawCabin, drawHouse, drawSource, drawPond, drawRecordsSign, drawStones, drawFire, drawBoard, drawCrow,
    drawStage, drawPodiums,
    sky, drawNight,
  };
})();
