// Jour 4 · Crocs : « Les sabots sacrés »
// Puzzle de glisse sur les pontons mouillés de Rive-Basse : avec des Crocs, on ne s'arrête qu'en heurtant un obstacle.
// Les niveaux sont générés avec une graine fixe (les mêmes pour tout le monde) et vérifiés par un solveur.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, COLS = 11, ROWS = 7, CELL = 76;
  const GX = (AW - COLS * CELL) / 2, GY = 120;
  const KEYMAP = { arrowup: [0, -1], z: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], q: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
  const CROC_COLORS = ["#e0662f", "#5bb3a0", "#d36b9c", "#e9b04a", "#7d5ba6"];

  // ---------- Glisse et solveur ----------

  // glisse depuis (x, y) dans une direction : renvoie la case d'arrêt et les Crocs ramassées en chemin
  function slide(L, x, y, dx, dy, mask) {
    const full = (1 << L.items.length) - 1;
    for (;;) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || L.grid[ny][nx]) break;
      x = nx; y = ny;
      const i = L.items.findIndex((it) => it.x === x && it.y === y);
      if (i >= 0) mask |= 1 << i;
      if (x === L.exit.x && y === L.exit.y && mask === full) break; // l'échelle arrête une fois tout ramassé
    }
    return { x, y, mask };
  }

  // plus petit nombre de coups pour tout ramasser puis atteindre l'échelle (recherche en largeur)
  function solve(L) {
    const full = (1 << L.items.length) - 1;
    const key = (x, y, m) => (y * COLS + x) * 16 + m;
    const seen = new Set([key(L.start.x, L.start.y, 0)]);
    let frontier = [{ x: L.start.x, y: L.start.y, m: 0 }];
    for (let depth = 1; depth <= 30 && frontier.length; depth++) {
      const next = [];
      for (const s of frontier) {
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const e = slide(L, s.x, s.y, dx, dy, s.m);
          if (e.x === L.exit.x && e.y === L.exit.y && e.mask === full) return depth;
          const k = key(e.x, e.y, e.mask);
          if (!seen.has(k)) { seen.add(k); next.push({ x: e.x, y: e.y, m: e.mask }); }
        }
      }
      frontier = next;
    }
    return 0;
  }

  function generate(seed, rocks, items, minOpt, maxOpt) {
    const r = Ink.rng(seed);
    const cell = () => ({ x: Math.floor(r() * COLS), y: Math.floor(r() * ROWS) });
    for (let tries = 0; tries < 4000; tries++) {
      const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      for (let k = 0; k < rocks; k++) { const c = cell(); grid[c.y][c.x] = 1 + Math.floor(r() * 2); }
      const free = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!grid[y][x]) free.push({ x, y });
      const pick = () => free.splice(Math.floor(r() * free.length), 1)[0];
      const L = { grid, start: pick(), exit: pick(), items: Array.from({ length: items }, pick) };
      const opt = solve(L);
      if (opt >= minOpt && opt <= maxOpt) return { ...L, opt };
    }
    return null;
  }

  const LEVEL_SPECS = [[4101, 10, 1, 3, 6], [4102, 13, 2, 5, 9], [4103, 15, 2, 6, 11], [4104, 15, 3, 7, 12], [4105, 18, 3, 8, 14]];
  let LEVELS = null; // générés au premier lancement

  // ---------- Dessin ----------

  function drawCroc(ctx, x, y, s, color, t, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (glow) Ink.halo(ctx, "rgba(233,176,74,0.5)", 0, 0, 30);
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, 8); ctx.lineTo(18, 8); ctx.quadraticCurveTo(26, 2, 22, -6);
    ctx.quadraticCurveTo(10, -14, -6, -14); ctx.quadraticCurveTo(-20, -12, -22, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    for (const [hx, hy] of [[4, -6], [10, -4], [16, -1], [7, 1], [13, 3]]) { ctx.beginPath(); ctx.arc(hx, hy, 1.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(-12, -4, 9, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function buildFloor(L) {
    const c = document.createElement("canvas");
    c.width = AW * 2; c.height = AH * 2;
    const g = c.getContext("2d");
    g.scale(2, 2);
    const r = Ink.rng(77);
    // la mer noire autour du ponton
    g.fillStyle = "#1d2833"; g.fillRect(0, 0, AW, AH);
    g.strokeStyle = "rgba(239,229,208,.1)";
    for (let i = 0; i < 80; i++) { g.beginPath(); g.arc(r() * AW, r() * AH, 6 + r() * 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    // le ponton mouillé
    Ink.fill(g, Ink.rect(GX - 14, GY - 14, COLS * CELL + 28, ROWS * CELL + 28), r, "#5a4030");
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = GX + x * CELL, py = GY + y * CELL;
        g.fillStyle = (x + y) % 2 ? "#8a6a48" : "#836344";
        g.fillRect(px, py, CELL, CELL);
        g.strokeStyle = "rgba(29,26,32,.35)"; g.lineWidth = 1;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(px, py + (k * CELL) / 4); g.lineTo(px + CELL, py + (k * CELL) / 4); g.stroke(); }
        if (r() < 0.3) { g.fillStyle = "rgba(160,200,220,.18)"; g.beginPath(); g.ellipse(px + CELL / 2, py + CELL / 2, 20 + r() * 12, 8 + r() * 5, r(), 0, Math.PI * 2); g.fill(); }
      }
    }
    Ink.stroke(g, Ink.rect(GX - 14, GY - 14, COLS * CELL + 28, ROWS * CELL + 28), r, { w: 3, closed: true });
    // obstacles : tonneaux et caisses
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const v = L.grid[y][x];
      if (!v) continue;
      const cx = GX + x * CELL + CELL / 2, cy = GY + y * CELL + CELL / 2;
      Ink.shadow(g, cx + 4, cy + 18, 26, 8, 0.3);
      if (v === 1) {
        const b = Ink.ellipse(cx, cy, 26, 26, 18);
        Ink.fill(g, b, r, "#6b4426");
        Ink.stroke(g, b, r, { w: 2.2, closed: true, step: 8 });
        Ink.stroke(g, Ink.ellipse(cx, cy, 17, 17, 14), r, { w: 1.4, closed: true, passes: 1, step: 6 });
      } else {
        const b = Ink.rect(cx - 27, cy - 27, 54, 54);
        Ink.fill(g, b, r, "#a88a5f");
        Ink.hatch(g, b, r, { gap: 6, alpha: 0.3 });
        Ink.stroke(g, b, r, { w: 2.2, closed: true, step: 10 });
        Ink.stroke(g, [[cx - 27, cy - 27], [cx + 27, cy + 27]], r, { w: 1.6, passes: 1 });
      }
    }
    return c;
  }

  const cellPos = (x, y) => ({ x: GX + x * CELL + CELL / 2, y: GY + y * CELL + CELL / 2 });

  // ---------- Le jeu ----------

  Games.register(4, {
    title: "Les sabots sacrés",
    music: "rive",
    story: "Dans les ruines de Rive-Basse, les Enxors ont découvert des reliques humaines : des sabots à trous, colorés, sûrement sacrés. Les Crocs. Problème : sur les pontons mouillés, avec ça aux pieds, impossible de s'arrêter… Récupère les Crocs perdues, puis rejoins l'échelle.",
    controls: "Flèches / ZQSD : tu glisses jusqu'à heurter un obstacle. Retour arrière (ou U) pour annuler un coup, R pour recommencer le niveau. Objectif : le moins de coups possible.",

    start(root, api) {
      if (!LEVELS) LEVELS = LEVEL_SPECS.map((s) => generate(...s)).filter(Boolean);
      const canvas = document.createElement("canvas");
      canvas.className = "game-canvas";
      root.append(canvas);
      const ctx = canvas.getContext("2d", { alpha: false });
      let vw = 0, vh = 0, dpr = 1, s = 1, ox = 0, oy = 0;
      function resize() {
        dpr = Ink.quality.dpr();
        vw = root.clientWidth; vh = root.clientHeight;
        canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
        s = Math.min(vw / AW, vh / AH); ox = (vw - AW * s) / 2; oy = (vh - AH * s) / 2;
      }
      resize();
      window.addEventListener("resize", resize);

      let li = 0, L, floor, pos, mask, history, moves, anim = null, won = 0, results = [], splashes = [];
      const full = () => (1 << L.items.length) - 1;

      function load(i) {
        li = i;
        L = LEVELS[i];
        floor = buildFloor(L);
        pos = { ...L.start };
        mask = 0;
        history = [];
        moves = 0;
        won = 0;
        anim = null;
      }

      function move(dx, dy) {
        if (anim || won) return;
        const e = slide(L, pos.x, pos.y, dx, dy, mask);
        if (e.x === pos.x && e.y === pos.y) { Sound.play("tick"); return; }
        history.push({ pos: { ...pos }, mask });
        moves++;
        const dist = Math.abs(e.x - pos.x) + Math.abs(e.y - pos.y);
        anim = { from: { ...pos }, to: { x: e.x, y: e.y }, t: 0, dur: 0.06 * dist + 0.08, mask: e.mask, dx };
        Sound.play("plouf", 0.4);
      }

      function undo() {
        if (anim || won || !history.length) return;
        const h = history.pop();
        pos = h.pos; mask = h.mask; moves++;
        Sound.play("click");
      }

      function restart() {
        if (anim || won) return;
        pos = { ...L.start }; mask = 0; history = [];
        Sound.play("click");
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (KEYMAP[k]) { e.preventDefault(); move(...KEYMAP[k]); }
        else if (k === "backspace" || k === "u") { e.preventDefault(); undo(); }
        else if (k === "r") restart();
      };
      window.addEventListener("keydown", onKey);

      function finishLevel() {
        const extra = Math.max(0, moves - L.opt);
        results.push({ moves, opt: L.opt, score: 200 + Math.max(0, 300 - extra * 50) });
        Sound.play("win");
        won = performance.now();
      }

      function update(dt) {
        if (anim) {
          anim.t += dt;
          const k = Math.min(1, anim.t / anim.dur);
          // ramasser en passant
          const cur = { x: anim.from.x + (anim.to.x - anim.from.x) * k, y: anim.from.y + (anim.to.y - anim.from.y) * k };
          if (Math.random() < 0.5) {
            const p = cellPos(cur.x, cur.y);
            splashes.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y + 18, life: 0.5 });
          }
          if (k >= 1) {
            if (anim.mask !== mask) Sound.play("drop");
            pos = anim.to;
            mask = anim.mask;
            anim = null;
            if (pos.x === L.exit.x && pos.y === L.exit.y && mask === full()) finishLevel();
          }
        }
        if (won && performance.now() - won > 1600) {
          if (li + 1 < LEVELS.length) load(li + 1);
          else return finish();
        }
        for (const sp of splashes) sp.life -= dt;
        splashes = splashes.filter((sp) => sp.life > 0);
      }

      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0);
        const perfect = results.filter((r) => r.moves <= r.opt).length;
        api.finish({
          score,
          stars: perfect >= 4 ? 3 : perfect >= 2 ? 2 : 1,
          lines: [`${perfect}/${results.length} niveaux au nombre de coups parfait`, results.map((r, i) => `N${i + 1} : ${r.moves}/${r.opt}`).join(" · ")],
        });
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(floor, 0, 0, AW, AH);

        // l'échelle de sortie (dorée quand on a tout ramassé)
        const ex = cellPos(L.exit.x, L.exit.y), open = mask === full();
        if (open) Ink.halo(ctx, "rgba(233,176,74,0.55)", ex.x, ex.y, 46);
        ctx.strokeStyle = open ? "#e9b04a" : "#4a4550";
        ctx.lineWidth = 5;
        for (const sx of [-14, 14]) { ctx.beginPath(); ctx.moveTo(ex.x + sx, ex.y - 28); ctx.lineTo(ex.x + sx, ex.y + 28); ctx.stroke(); }
        ctx.lineWidth = 3;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(ex.x - 14, ex.y + k * 11); ctx.lineTo(ex.x + 14, ex.y + k * 11); ctx.stroke(); }

        L.items.forEach((it, i) => {
          if (mask & (1 << i)) return;
          const p = cellPos(it.x, it.y);
          drawCroc(ctx, p.x, p.y + Math.sin(t * 3 + i) * 3, 1.1, CROC_COLORS[(i + li) % CROC_COLORS.length], t, true);
        });

        for (const sp of splashes) {
          ctx.fillStyle = `rgba(190,220,235,${sp.life * 1.4})`;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 3 + (0.5 - sp.life) * 6, 0, Math.PI * 2); ctx.fill();
        }

        // l'Enxor en Crocs
        let px = pos.x, py = pos.y;
        if (anim) {
          const k = Math.min(1, anim.t / anim.dur), e = 1 - Math.pow(1 - k, 2);
          px = anim.from.x + (anim.to.x - anim.from.x) * e;
          py = anim.from.y + (anim.to.y - anim.from.y) * e;
        }
        const p = cellPos(px, py);
        const face = anim ? Math.sign(anim.to.x - anim.from.x) || 1 : 1;
        drawCroc(ctx, p.x - 10, p.y + 22, 0.5, "#b3261e", t);
        drawCroc(ctx, p.x + 10, p.y + 22, 0.5, "#b3261e", t);
        Ink.enxor(ctx, p.x, p.y + 18, t, { seed: 4, color: "#e0662f", face, moving: !!anim });

        // interface
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(16, 16, 330, 58, 12); ctx.fill();
        ctx.font = `700 18px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#e9b04a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`Ponton ${li + 1} / ${LEVELS.length}`, 30, 36);
        ctx.font = `600 15px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = moves <= L.opt ? "#8fd18a" : "#efe5d0";
        ctx.fillText(`${moves} coup${moves > 1 ? "s" : ""} · parfait en ${L.opt}   ·   Crocs ${countBits(mask)}/${L.items.length}`, 30, 58);
        if (won) {
          ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
          ctx.fillStyle = "rgba(27,27,27,.7)";
          ctx.fillRect(0, AH / 2 - 60, AW, 120);
          const r = results[results.length - 1];
          Ink.word(ctx, r.moves <= r.opt ? "Glisse parfaite !" : "Échelle atteinte !", AW / 2, AH / 2 - 14, 40, "#e9b04a", 800);
          ctx.font = `600 17px "Barlow Semi Condensed", sans-serif`;
          ctx.fillStyle = PAPER; ctx.textAlign = "center";
          ctx.fillText(`${r.moves} coups (parfait : ${r.opt})`, AW / 2, AH / 2 + 26);
        }
      }

      const countBits = (m) => m.toString(2).split("1").length - 1;

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
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
      }
      if (location.hostname === "localhost") window.__crocs = { levels: LEVELS, solveNow: () => LEVELS[li].opt };
      load(0);
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });

  // pour les tests : expose le solveur
  if (location.hostname === "localhost") window.__crocsSolve = { slide, solve, generate };
})();
