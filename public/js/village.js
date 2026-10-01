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
      const glow = ctx.createRadialGradient(x + 29, y - 49, 2, x + 29, y - 49, 40);
      glow.addColorStop(0, "rgba(255,200,100,.45)");
      glow.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 11, y - 89, 80, 80);
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
    const glow = ctx.createRadialGradient(CENTER.x, CENTER.y - 2, 0, CENTER.x, CENTER.y - 2, 70);
    glow.addColorStop(0, `rgba(233,176,74,${0.22 + Math.sin(t * 1.5) * 0.08})`);
    glow.addColorStop(1, "rgba(233,176,74,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(CENTER.x - 80, CENTER.y - 40, 160, 80);
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

    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, "rgba(29,26,32,0)");
    v.addColorStop(1, "rgba(29,26,32,.45)");
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    return c;
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
    for (const l of lights) {
      const g = ng.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(0,0,0,${l.k ?? 0.95})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ng.fillStyle = g;
      ng.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(nightC, 0, 0);
    // halo chaud des lumières
    ctx.globalCompositeOperation = "lighter";
    ctx.setTransform(dpr, 0, 0, dpr, -cam.x * dpr, -cam.y * dpr);
    for (const l of lights) {
      const r = l.r * 0.55;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, l.color || `rgba(255,170,80,${0.22 * (s.dark / 0.62)})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  return { W, H, CENTER, HOUSE, COLORS, ROOFS, plots, lamps, buildBackground, drawCabin, drawHouse, drawSource, sky, drawNight };
})();
