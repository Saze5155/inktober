// Jour 1 · Vampire : « L'ombre du vampire »
// Le soleil se lève, les ombres des ruines tournent et raccourcissent en temps réel.
// Au soleil, l'encre du vampire s'évapore : il faut rejoindre le cercueil d'ombre en ombre.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, SPEED = 175, PR = 13;
  const KEYMAP = { arrowup: "u", z: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", q: "l", a: "l", arrowright: "r", d: "r" };

  // blocks: [x, y, largeur, profondeur, hauteur] · round: [x, y, rayon, hauteur, "pillar" | "tree"]
  // sun: azimut (0 = soleil à droite, 90 = en bas) et élévation en degrés, du début à la fin du niveau
  const LEVELS = [
    {
      name: "La rue des cercueils", time: 70,
      sun: { az0: 0, az1: -70, el0: 9, el1: 28 },
      start: { x: 95, y: 235 }, goal: { x: 1040, y: 262 },
      blocks: [[150, 180, 120, 110, 60], [330, 330, 110, 140, 70], [520, 150, 130, 120, 80], [700, 360, 120, 120, 60], [880, 200, 110, 120, 70]],
      round: [[470, 540, 18, 90, "pillar"], [640, 90, 18, 90, "pillar"], [240, 520, 36, 70, "tree"]],
      drops: [[300, 300], [470, 260], [610, 330], [820, 300], [960, 420]],
    },
    {
      name: "Le carrefour", time: 75,
      sun: { az0: 180, az1: 250, el0: 9, el1: 30 },
      start: { x: 1040, y: 190 }, goal: { x: 70, y: 610 },
      blocks: [[200, 120, 160, 150, 55], [470, 120, 160, 150, 85], [740, 120, 160, 150, 60], [200, 400, 160, 150, 75], [470, 400, 160, 150, 50], [740, 400, 160, 150, 90]],
      round: [[1000, 560, 34, 80, "tree"], [80, 80, 30, 70, "tree"]],
      drops: [[420, 330], [700, 330], [960, 330], [420, 60], [120, 330]],
    },
    {
      name: "La place des statues", time: 80,
      sun: { az0: 90, az1: 30, el0: 10, el1: 32 },
      start: { x: 150, y: 125 }, goal: { x: 1010, y: 610 },
      blocks: [[880, 140, 140, 120, 70]],
      round: [[150, 230, 20, 110, "pillar"], [300, 330, 20, 120, "pillar"], [450, 240, 24, 130, "pillar"], [560, 420, 22, 110, "pillar"], [720, 330, 26, 140, "pillar"], [820, 520, 22, 120, "pillar"], [960, 430, 24, 130, "pillar"], [380, 560, 40, 70, "tree"], [650, 150, 44, 80, "tree"]],
      drops: [[230, 170], [380, 420], [640, 300], [760, 450], [900, 600]],
    },
  ];

  // ---------- Géométrie ----------

  const rad = (d) => (d * Math.PI) / 180;
  const lerp = (a, b, k) => a + (b - a) * k;

  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(px - ax - dx * k, py - ay - dy * k);
  }

  function capsule(ax, ay, bx, by, r) {
    const a = Math.atan2(by - ay, bx - ax), pts = [];
    for (let i = 0; i <= 8; i++) { const t = a + Math.PI / 2 + (i / 8) * Math.PI; pts.push([ax + Math.cos(t) * r, ay + Math.sin(t) * r]); }
    for (let i = 0; i <= 8; i++) { const t = a - Math.PI / 2 + (i / 8) * Math.PI; pts.push([bx + Math.cos(t) * r, by + Math.sin(t) * r]); }
    return pts;
  }

  // ---------- Décor pré-dessiné ----------

  function layer(scale, draw) {
    const c = document.createElement("canvas");
    c.width = AW * scale;
    c.height = AH * scale;
    const g = c.getContext("2d");
    g.scale(scale, scale);
    draw(g);
    return c;
  }

  function buildGround(L, r) {
    return layer(2, (g) => {
      g.fillStyle = "#efe2c6";
      g.fillRect(0, 0, AW, AH);
      g.fillStyle = Ink.grain(g);
      g.fillRect(0, 0, AW, AH);
      // vieux pavés
      g.save();
      g.strokeStyle = INK;
      g.globalAlpha = 0.07;
      for (let y = 0; y < AH; y += 34) for (let x = (y / 34) % 2 ? 0 : 26; x < AW; x += 52) g.strokeRect(x + r() * 3, y + r() * 3, 48, 30);
      g.restore();
      const free = (x, y) => !L.blocks.some(([bx, by, w, h]) => x > bx - 20 && x < bx + w + 20 && y > by - 20 && y < by + h + 20);
      for (let i = 0; i < 40; i++) { const x = r() * AW, y = r() * AH; if (free(x, y)) Ink.crack(g, x, y, r); }
      for (let i = 0; i < 90; i++) { const x = r() * AW, y = r() * AH; if (free(x, y)) Ink.grass(g, x, y, r); }
      for (let i = 0; i < 40; i++) { const x = r() * AW, y = r() * AH; if (free(x, y)) Ink.stone(g, x, y, r); }
      for (let i = 0; i < 6; i++) { const x = r() * AW, y = r() * AH; if (free(x, y)) Ink.splat(g, x, y, 8 + r() * 14, r, INK, 0.7); }
    });
  }

  function buildTop(L, r) {
    return layer(2, (g) => {
      for (const [x, y, w, h] of L.blocks) {
        const pts = Ink.rect(x, y, w, h);
        Ink.fill(g, pts, r, "#d7c6a6");
        Ink.hatch(g, pts, r, { gap: 6, alpha: 0.3 });
        // toit cassé : un coin effondré
        const cx = r() < 0.5 ? x : x + w - 40, cy = r() < 0.5 ? y : y + h - 34;
        Ink.fill(g, Ink.rect(cx + 4, cy + 4, 32, 26), r, "#3b3440");
        for (let k = 0; k < 3; k++) Ink.stone(g, cx + 8 + r() * 24, cy + 8 + r() * 18, r);
        Ink.stroke(g, Ink.rect(x + 10, y + 10, w - 20, h - 20), r, { w: 1, closed: true, alpha: 0.4, passes: 1 });
        Ink.stroke(g, pts, r, { w: 2.6, closed: true });
        const ch = Ink.rect(x + w * 0.6, y + h * 0.3, 18, 18);
        Ink.fill(g, ch, r, "#a99a82");
        Ink.stroke(g, ch, r, { w: 1.6, closed: true, step: 6 });
      }
      for (const [x, y, rr, , kind] of L.round) {
        if (kind === "pillar") {
          const c = Ink.ellipse(x, y, rr, rr, 18);
          Ink.fill(g, c, r, "#e2d6bd");
          Ink.stroke(g, c, r, { w: 2.2, closed: true, step: 6 });
          Ink.stroke(g, Ink.ellipse(x, y, rr * 0.6, rr * 0.6, 14), r, { w: 1, closed: true, passes: 1, step: 5 });
        } else {
          g.save();
          g.strokeStyle = INK;
          g.lineCap = "round";
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + r();
            const len = rr * (0.8 + r() * 0.5);
            g.lineWidth = 3;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
            g.lineWidth = 1.2;
            for (const s of [-1, 1]) {
              const bx = x + Math.cos(a) * len * 0.6, by = y + Math.sin(a) * len * 0.6;
              g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + s * 0.7) * rr * 0.35, by + Math.sin(a + s * 0.7) * rr * 0.35); g.stroke();
            }
          }
          g.fillStyle = INK;
          g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
          g.restore();
        }
      }
    });
  }

  function buildHatch(seed) {
    return layer(1, (g) => {
      const r = Ink.rng(seed);
      g.strokeStyle = INK;
      g.lineWidth = 1.1;
      g.lineCap = "round";
      for (let d = -AH; d < AW; d += 7) {
        const j = (r() - 0.5) * 2;
        g.beginPath();
        g.moveTo(d + j, AH);
        g.lineTo(d + AH + j + (r() - 0.5) * 3, 0);
        g.stroke();
      }
    });
  }

  // ---------- Le jeu ----------

  Games.register(1, {
    title: "L'ombre du vampire",
    music: "vampire",
    story: "Dans les ruines, les Enxors ont trouvé un vieux livre de vampires. Depuis, l'un d'eux porte une cape… et ne supporte plus le soleil : à la lumière, son encre s'évapore. Le jour se lève. Rentre au cercueil en passant d'ombre en ombre.",
    controls: "ZQSD / flèches, ou maintiens le clic. Les ombres tournent et raccourcissent : ne traîne pas. Bonus : ramasse les gouttes d'encre.",

    start(root, api) {
      const canvas = document.createElement("canvas");
      canvas.className = "game-canvas";
      root.append(canvas);
      const ctx = canvas.getContext("2d", { alpha: false }); // opaque : plus rapide à afficher
      const shadowC = layer(1, () => {});
      const sg = shadowC.getContext("2d");
      const hatchC = layer(1, () => {});
      const hg = hatchC.getContext("2d");
      const hatches = [1, 2, 3].map(buildHatch);

      let vw = 0, vh = 0, dpr = 1, s = 1, ox = 0, oy = 0;
      function resize() {
        dpr = Ink.quality.dpr();
        vw = root.clientWidth;
        vh = root.clientHeight;
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        s = Math.min(vw / AW, (vh - 10) / AH);
        ox = (vw - AW * s) / 2;
        oy = (vh - AH * s) / 2;
      }
      resize();
      window.addEventListener("resize", resize);

      const keys = new Set();
      let pointer = null;
      const onKey = (e) => {
        const k = KEYMAP[e.key.toLowerCase()];
        if (!k) return;
        e.preventDefault();
        if (e.type === "keydown") keys.add(k); else keys.delete(k);
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => { pointer = toArena(e); canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", (e) => { if (pointer) pointer = toArena(e); });
      canvas.addEventListener("pointerup", () => (pointer = null));

      let lv = 0, L, ground, top, player, ink, levelTime, t, state, stateT, drops, sh;
      let deaths = 0, dropsTotal = 0, totalTime = 0, score = 0;
      const particles = [];

      function loadLevel(i) {
        lv = i;
        L = LEVELS[i];
        const r = Ink.rng(777 + i * 31);
        ground = buildGround(L, r);
        top = buildTop(L, r);
        resetLevel();
      }

      function resetLevel() {
        player = { x: L.start.x, y: L.start.y, face: 1, moving: false, shade: true };
        ink = 100;
        levelTime = 0;
        t = 0;
        state = "play";
        stateT = 0;
        drops = L.drops.map(([x, y]) => ({ x, y, taken: false }));
        keys.clear();
        pointer = null;
      }

      function sunAt(k) {
        const az = rad(lerp(L.sun.az0, L.sun.az1, k)), el = rad(lerp(L.sun.el0, L.sun.el1, k));
        return { dx: -Math.cos(az), dy: -Math.sin(az), len: 1 / Math.tan(el), az };
      }

      function computeShadows(sun) {
        const polys = L.blocks.map(([x, y, w, h, z]) => {
          const lx = sun.dx * z * sun.len, ly = sun.dy * z * sun.len;
          const c = Ink.rect(x, y, w, h);
          return hull([...c, ...c.map(([a, b]) => [a + lx, b + ly])]);
        });
        const caps = L.round.map(([x, y, rr, z]) => [x, y, x + sun.dx * z * sun.len, y + sun.dy * z * sun.len, rr]);
        return { polys, caps };
      }

      const inShadow = (x, y) =>
        sh.polys.some((p) => inPoly(x, y, p)) || sh.caps.some(([ax, ay, bx, by, rr]) => distSeg(x, y, ax, ay, bx, by) < rr);

      function blocked(x, y) {
        if (x < PR || y < PR || x > AW - PR || y > AH - PR) return true;
        if (L.blocks.some(([bx, by, w, h]) => x > bx - PR && x < bx + w + PR && y > by - PR && y < by + h + PR)) return true;
        return L.round.some(([cx, cy, rr]) => Math.hypot(x - cx, y - cy) < rr * 0.8 + PR);
      }

      function burst(x, y, n, color, speed = 120) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
          particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, size: 2 + Math.random() * 3, color });
        }
      }

      function update(dt) {
        stateT += dt;
        if (state === "play") {
          levelTime += dt;
          totalTime += dt;
          t = Math.min(1, levelTime / L.time);
          let dx = 0, dy = 0;
          if (keys.has("l")) dx--;
          if (keys.has("r")) dx++;
          if (keys.has("u")) dy--;
          if (keys.has("d")) dy++;
          if (!dx && !dy && pointer) {
            const ddx = pointer.x - player.x, ddy = pointer.y - player.y, d = Math.hypot(ddx, ddy);
            if (d > 6) { dx = ddx / d; dy = ddy / d; }
          }
          const len = Math.hypot(dx, dy);
          player.moving = len > 0;
          if (len) {
            const nx = player.x + (dx / len) * SPEED * dt, ny = player.y + (dy / len) * SPEED * dt;
            if (!blocked(nx, player.y)) player.x = nx;
            if (!blocked(player.x, ny)) player.y = ny;
            if (Math.abs(dx) > 0.2) player.face = Math.sign(dx);
          }
          sh = computeShadows(sunAt(t));
          player.shade = inShadow(player.x, player.y);
          Sound.loop("sizzle", player.shade ? 0 : 0.18, 5200);
          if (player.shade) ink = Math.min(100, ink + 40 * dt);
          else {
            ink -= 32 * dt;
            if (Math.random() < dt * 18) particles.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y - 20, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 1, max: 1, size: 4 + Math.random() * 4, color: "smoke" });
          }
          for (const d of drops) {
            if (!d.taken && Math.hypot(d.x - player.x, d.y - player.y) < 24) {
              d.taken = true;
              dropsTotal++;
              Sound.play("drop");
              burst(d.x, d.y, 10, INK);
            }
          }
          if (ink <= 0) {
            ink = 0;
            state = "dead";
            stateT = 0;
            deaths++;
            dropsTotal -= drops.filter((d) => d.taken).length;
            burst(player.x, player.y - 18, 30, INK, 160);
            Sound.loop("sizzle", 0);
            Sound.play("die");
          } else if (Math.hypot(player.x - L.goal.x, player.y - L.goal.y) < 32) {
            state = "won";
            stateT = 0;
            score += 300 + Math.max(0, Math.round(600 - levelTime * 6)) + drops.filter((d) => d.taken).length * 100;
            burst(L.goal.x, L.goal.y, 24, "#e9b04a", 140);
            Sound.loop("sizzle", 0);
            Sound.play("win");
          }
        } else if (state === "dead" && stateT > 1.6) {
          resetLevel();
        } else if (state === "won" && stateT > 1.8) {
          if (lv + 1 < LEVELS.length) loadLevel(lv + 1);
          else return finish();
        }
        for (const p of particles) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
        }
        for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
      }

      function finish() {
        stop();
        const final = Math.max(0, score - deaths * 120);
        const stars = 1 + (deaths === 0 ? 1 : 0) + (dropsTotal >= 12 ? 1 : 0);
        const m = Math.floor(totalTime / 60), sec = Math.round(totalTime % 60);
        api.finish({
          score: final,
          stars,
          lines: [`${dropsTotal}/15 gouttes d'encre`, `${deaths} évaporation${deaths > 1 ? "s" : ""}`, `${m} min ${String(sec).padStart(2, "0")} s`],
        });
      }

      // ---------- Rendu ----------

      function drawVampire(x, y, time) {
        const fl = Math.sin(time * 8) * 2;
        Ink.fill(ctx, [[x - 15, y - 30], [x + 15, y - 30], [x + 22 + fl, y + 2], [x, y - 3], [x - 22 - fl, y + 2]], Ink.rng(1), "#7a1426", 1);
        Ink.stroke(ctx, [[x - 15, y - 30], [x - 22 - fl, y + 2], [x, y - 3], [x + 22 + fl, y + 2], [x + 15, y - 30]], Ink.rng(2), { w: 1.6, passes: 1, amp: 1 });
        Ink.enxor(ctx, x, y, time, { seed: 3, color: "#b3261e", moving: player.moving, face: player.face, fangs: true });
      }

      function drawCoffin(x, y, time) {
        ctx.globalAlpha = 0.8 + Math.sin(time * 3) * 0.2;
        Ink.halo(ctx, "rgba(233,176,74,0.4)", x, y, 60);
        ctx.globalAlpha = 1;
        const pts = [[x, y - 32], [x + 14, y - 20], [x + 11, y + 30], [x - 11, y + 30], [x - 14, y - 20]];
        Ink.fill(ctx, pts, Ink.rng(5), "#3a2228", 0.6);
        Ink.stroke(ctx, pts, Ink.rng(6), { w: 2, closed: true, passes: 1, amp: 0.8 });
        ctx.strokeStyle = "#e9b04a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 14);
        ctx.moveTo(x - 7, y - 8); ctx.lineTo(x + 7, y - 8);
        ctx.stroke();
      }

      function drawHud(time) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pad = 16;
        // encre
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(pad, pad, 236, 52, 12); ctx.fill();
        ctx.font = `700 13px "Barlow Semi Condensed", sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#a39686";
        ctx.fillText(player.shade ? "ENCRE · à l'ombre" : "ENCRE · AU SOLEIL !", pad + 14, pad + 16);
        ctx.fillStyle = "#3a3330";
        ctx.fillRect(pad + 14, pad + 30, 208, 10);
        const low = ink < 30 && Math.sin(time * 14) > 0;
        ctx.fillStyle = low ? "#e0662f" : player.shade ? "#efe5d0" : "#e9b04a";
        ctx.fillRect(pad + 14, pad + 30, (208 * ink) / 100, 10);
        // niveau
        const title = `Niveau ${lv + 1}/${LEVELS.length} · ${L.name}`;
        ctx.font = `700 16px "Barlow Semi Condensed", sans-serif`;
        const tw = ctx.measureText(title).width + 32;
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(vw / 2 - tw / 2, pad, tw, 36, 12); ctx.fill();
        ctx.fillStyle = "#e9b04a";
        ctx.textAlign = "center";
        ctx.fillText(title, vw / 2, pad + 18);
        // soleil et gouttes
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(vw - pad - 190, pad, 190, 52, 12); ctx.fill();
        const ax = vw - pad - 150, ay = pad + 42;
        ctx.strokeStyle = "#5a4f48";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ax, ay, 26, Math.PI, 0); ctx.stroke();
        const sa = Math.PI + t * Math.PI * 0.6;
        ctx.fillStyle = "#e9b04a";
        ctx.beginPath(); ctx.arc(ax + Math.cos(sa) * 26, ay + Math.sin(sa) * 26, 6, 0, 7); ctx.fill();
        ctx.textAlign = "left";
        ctx.fillStyle = "#f3e9dc";
        ctx.font = `700 15px "Barlow Semi Condensed", sans-serif`;
        ctx.fillText(`Gouttes ${drops.filter((d) => d.taken).length}/${drops.length}`, vw - pad - 104, pad + 26);
      }

      function banner(text, sub, alpha) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        ctx.globalAlpha = alpha;
        Ink.word(ctx, text, vw / 2, vh / 2 - 12, 44, INK, 800);
        if (sub) Ink.word(ctx, sub, vw / 2, vh / 2 + 26, 18, INK, 600);
        ctx.restore();
      }

      function render(time) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(ground, 0, 0, AW, AH);

        // lumière du jour qui monte
        ctx.fillStyle = `rgba(255,190,110,${0.06 + t * 0.2})`;
        ctx.fillRect(0, 0, AW, AH);

        // ombres : un calque plein + des hachures découpées à sa forme
        if (!sh) sh = computeShadows(sunAt(t));
        sg.clearRect(0, 0, AW, AH);
        sg.fillStyle = "#000";
        for (const p of sh.polys) { sg.beginPath(); p.forEach(([x, y], i) => (i ? sg.lineTo(x, y) : sg.moveTo(x, y))); sg.closePath(); sg.fill(); }
        for (const [ax, ay, bx, by, rr] of sh.caps) { sg.beginPath(); capsule(ax, ay, bx, by, rr).forEach(([x, y], i) => (i ? sg.lineTo(x, y) : sg.moveTo(x, y))); sg.closePath(); sg.fill(); }
        hg.globalCompositeOperation = "source-over";
        hg.clearRect(0, 0, AW, AH);
        hg.drawImage(hatches[Math.floor(time * 4) % 3], 0, 0);
        hg.globalCompositeOperation = "destination-in";
        hg.drawImage(shadowC, 0, 0);
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.drawImage(shadowC, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.drawImage(hatchC, 0, 0);
        ctx.restore();

        drawCoffin(L.goal.x, L.goal.y, time);
        for (const d of drops) {
          if (d.taken) continue;
          const by = d.y + Math.sin(time * 3 + d.x) * 3;
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.moveTo(d.x, by - 12);
          ctx.quadraticCurveTo(d.x + 8, by + 2, d.x, by + 5);
          ctx.quadraticCurveTo(d.x - 8, by + 2, d.x, by - 12);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.4)";
          ctx.beginPath(); ctx.arc(d.x - 2, by - 1, 2, 0, 7); ctx.fill();
        }

        if (state !== "dead") {
          ctx.save();
          if (!player.shade) ctx.globalAlpha = 0.55 + (ink / 100) * 0.45;
          drawVampire(player.x, player.y, time);
          ctx.restore();
        }

        for (const p of particles) {
          const a = p.life / p.max;
          if (p.color === "smoke") {
            ctx.strokeStyle = `rgba(29,26,32,${a * 0.45})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, 7); ctx.stroke();
          } else {
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
          }
        }

        ctx.drawImage(top, 0, 0, AW, AH);
        drawHud(time);

        if (state === "play" && levelTime < 2.4) banner(L.name, `Niveau ${lv + 1}`, Math.min(1, (2.4 - levelTime) * 1.5));
        if (state === "dead") banner("Ton encre s'est évaporée…", "on recommence ce niveau", Math.min(1, stateT * 3));
        if (state === "won") banner("Cercueil atteint !", lv + 1 < LEVELS.length ? "niveau suivant…" : "", Math.min(1, stateT * 3));
      }

      // ---------- Boucle ----------

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        if (!running) return;
        render(now / 1000);
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        Sound.loop("sizzle", 0);
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
      }

      loadLevel(0);
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
