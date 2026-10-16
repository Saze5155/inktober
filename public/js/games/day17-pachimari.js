// Jour 17 · Pachimari : « La pince à Pachimaris »
// Une machine à pince, des peluches en forme d'oignon-poulpe, dix jetons. La pince est capricieuse.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TOKENS = 10, G = 900;
  const BOX = { l: 150, r: 950, top: 90, floor: 560 }, CHUTE = { l: 160, r: 300 }, RAIL = 120;

  const KINDS = [
    { name: "Pachimari", color: "#f2c94c", pts: 100 },
    { name: "Pachi-rose", color: "#f2a0bd", pts: 100 },
    { name: "Pachi-bleu", color: "#8fc7e8", pts: 100 },
    { name: "Pachi-pêcheur", color: "#f2c94c", pts: 150, wear: "bob" },
    { name: "Pachi-vampire", color: "#d9d2e6", pts: 150, wear: "cape" },
    { name: "Pachi-dragon", color: "#e0662f", pts: 150, wear: "cornes" },
    { name: "Pachi-Enxor", color: "#2b2731", pts: 200, wear: "goutte" },
    { name: "Pachi-doré", color: "#ffd84a", pts: 500, gold: true },
  ];

  Games.register(17, {
    title: "La pince à Pachimaris",
    music: "game",
    story: "Dans les ruines d'une salle d'arcade humaine, les Enxors ont trouvé une machine à pince encore pleine de Pachimaris : de petites peluches en oignon à tentacules. Ils les adorent. Tu as dix jetons. On dit qu'un Pachi-doré se cache dans le tas…",
    controls: "Déplace la pince avec la souris ou ← →. Clic ou Espace pour la faire descendre. Vise bien le milieu de la peluche : plus tu es décentré, plus elle glisse.",

    start(root, api) {
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
      const secs = () => performance.now() / 1000;

      // le tas de peluches
      const r = Ink.rng(Math.floor(Math.random() * 1e9));
      const plush = [];
      const order = [0, 0, 1, 1, 2, 2, 0, 3, 4, 5, 6, 1, 2, 3, 7];
      order.sort(() => r() - 0.5);
      order.forEach((k, i) => plush.push({ k: KINDS[k], x: 420 + (i % 7) * 72 + r() * 10, y: 300 - Math.floor(i / 7) * 70, vx: 0, vy: 0, rad: KINDS[k].gold ? 27 : 31 + r() * 4, held: false, won: false, ph: r() * 6 }));

      const claw = { x: 600, y: RAIL, open: 1, phase: "move", t: 0, carry: null, target: 600 };
      let tokens = TOKENS, score = 0, ended = 0;
      const prizes = [], pops = [];
      const keys = {};

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => { claw.target = toArena(e).x; });
      canvas.addEventListener("pointerdown", (e) => { claw.target = toArena(e).x; drop(); });
      const onKey = (e) => {
        keys[e.key] = e.type === "keydown";
        if (e.type === "keydown" && e.key === " ") { e.preventDefault(); drop(); }
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function drop() {
        if (claw.phase !== "move" || !tokens || ended) return;
        tokens--;
        claw.phase = "down"; claw.t = secs();
        Sound.play("click");
      }

      // ---------- physique des peluches ----------
      function physics(dt) {
        for (const p of plush) {
          if (p.held || p.won) continue;
          p.vy += G * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          // murs
          if (p.x - p.rad < BOX.l) { p.x = BOX.l + p.rad; p.vx = Math.abs(p.vx) * 0.3; }
          if (p.x + p.rad > BOX.r) { p.x = BOX.r - p.rad; p.vx = -Math.abs(p.vx) * 0.3; }
          // la goulotte : un trou dans le sol, protégé par un petit rebord
          const overChute = p.x > CHUTE.l && p.x < CHUTE.r;
          if (!overChute && p.y + p.rad > BOX.floor) { p.y = BOX.floor - p.rad; p.vy = 0; p.vx *= 0.8; }
          if (!overChute && p.x - p.rad < CHUTE.r + 6 && p.x > CHUTE.r && p.y + p.rad > BOX.floor - 130) { p.x = CHUTE.r + 6 + p.rad; p.vx = Math.abs(p.vx) * 0.3; }
          if (overChute && p.y > BOX.floor + 60) win(p);
        }
        // les peluches se poussent entre elles
        for (let it = 0; it < 3; it++) for (let i = 0; i < plush.length; i++) for (let j = i + 1; j < plush.length; j++) {
          const a = plush[i], b = plush[j];
          if (a.won || b.won) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.rad + b.rad - 4;
          if (d < min && d > 0.01) {
            const push = (min - d) / 2, nx = dx / d, ny = dy / d;
            if (!a.held) { a.x -= nx * push; a.y -= ny * push; }
            if (!b.held) { b.x += nx * push; b.y += ny * push; }
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { if (!a.held) { a.vx += rv * nx * 0.5; a.vy += rv * ny * 0.5; } if (!b.held) { b.vx -= rv * nx * 0.5; b.vy -= rv * ny * 0.5; } }
          }
        }
        for (const p of plush) { p.vx *= 0.995; }
      }
      function win(p) {
        p.won = true;
        prizes.push(p);
        score += p.k.pts;
        pops.push({ x: 230, y: 600, t: secs(), text: `${p.k.name} ! +${p.k.pts}`, color: p.k.gold ? "#ffd84a" : "#f2ead8" });
        Sound.play(p.k.gold ? "reveal" : "win");
      }

      // ---------- la pince ----------
      function updateClaw(dt) {
        const t = secs();
        if (claw.phase === "move") {
          const kd = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
          if (kd) claw.target = claw.x + kd * 60;
          const goal = Math.max(BOX.l + 50, Math.min(BOX.r - 50, claw.target));
          claw.x += Math.max(-260 * dt, Math.min(260 * dt, goal - claw.x));
          claw.open = 1;
          if (!tokens && !claw.carry && t - (claw.t || 0) > 2.5 && plush.every((p) => p.held || p.won || Math.abs(p.vy) < 30)) end();
        } else if (claw.phase === "down") {
          claw.y += 260 * dt;
          const tip = claw.y + 46;
          const hit = plush.some((p) => !p.won && Math.abs(p.x - claw.x) < p.rad * 0.9 && tip > p.y - p.rad + 8);
          if (hit || tip > BOX.floor - 4) { claw.phase = "close"; claw.t = t; Sound.play("tick"); }
        } else if (claw.phase === "close") {
          claw.open = Math.max(0, 1 - (t - claw.t) / 0.5);
          if (claw.open <= 0) {
            // on attrape la peluche la plus proche sous la pince, si on est assez centré
            const tip = claw.y + 46;
            const cand = plush.filter((p) => !p.won && Math.abs(p.x - claw.x) < p.rad * 0.85 && Math.abs(tip - p.y) < p.rad + 20).sort((a, b) => Math.abs(a.x - claw.x) - Math.abs(b.x - claw.x))[0];
            if (cand) { cand.held = true; claw.carry = { p: cand, off: cand.x - claw.x, dy: cand.y - claw.y }; }
            claw.phase = "up"; claw.t = t;
          }
        } else if (claw.phase === "up" || claw.phase === "home") {
          if (claw.phase === "up") {
            claw.y -= 170 * dt;
            if (claw.y <= RAIL) { claw.y = RAIL; claw.phase = "home"; }
          } else {
            const goal = (CHUTE.l + CHUTE.r) / 2;
            claw.x += Math.max(-200 * dt, Math.min(200 * dt, goal - claw.x));
            if (Math.abs(claw.x - goal) < 1) { claw.phase = "release"; claw.t = t; }
          }
          // ça glisse… surtout si on est décentré, et le doré est très glissant
          if (claw.carry) {
            const c = claw.carry, off = Math.abs(c.off) / c.p.rad;
            const slip = (0.14 + off * 1.1 + (c.p.k.gold ? 0.25 : 0)) * dt;
            if (r() < slip) { letGo("Elle a glissé !"); Sound.play("miss", 0.6); }
          }
        } else if (claw.phase === "release") {
          claw.open = Math.min(1, (t - claw.t) / 0.4);
          if (claw.carry) letGo(null);
          if (t - claw.t > 0.8) { claw.phase = "move"; claw.t = t; claw.target = claw.x; }
        }
        if (claw.carry) {
          const p = claw.carry.p;
          p.x = claw.x + claw.carry.off * 0.6; p.y = claw.y + 46 + p.rad - 10; p.vx = 0; p.vy = 0;
        }
      }
      function letGo(text) {
        const p = claw.carry.p;
        p.held = false; p.vy = 40;
        claw.carry = null;
        if (text) pops.push({ x: p.x, y: p.y - 40, t: secs(), text, color: "#f2c1cf" });
      }
      function end() {
        if (ended) return;
        ended = secs();
      }

      function finish() {
        stop();
        const count = prizes.length;
        api.finish({
          score,
          stars: count >= 4 ? 3 : count >= 2 ? 2 : 1,
          lines: [`${count} Pachimari${count > 1 ? "s" : ""} gagné${count > 1 ? "s" : ""}`, prizes.map((p) => p.k.name).join(", ") || "La pince a gagné…"],
        });
      }

      // ---------- dessin ----------
      function drawPachi(p, t) {
        const { x, y, rad: R } = p, k = p.k;
        ctx.save();
        ctx.translate(x, y);
        if (k.gold) Ink.halo(ctx, "rgba(255,216,74,.6)", 0, 0, R * 1.8);
        if (k.wear === "cape") { ctx.fillStyle = "#7a1426"; ctx.beginPath(); ctx.moveTo(-R * 0.8, -R * 0.2); ctx.lineTo(-R * 1.1, R * 0.8); ctx.lineTo(R * 1.1, R * 0.8); ctx.lineTo(R * 0.8, -R * 0.2); ctx.fill(); }
        ctx.fillStyle = k.color; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        // tête en oignon + tentacules
        ctx.beginPath();
        ctx.moveTo(-R, R * 0.35);
        ctx.quadraticCurveTo(-R * 1.05, -R * 0.75, 0, -R * 0.95);
        ctx.quadraticCurveTo(R * 1.05, -R * 0.75, R, R * 0.35);
        for (let i = 0; i < 5; i++) {
          const x0 = R - (i / 5) * 2 * R, x1 = R - ((i + 1) / 5) * 2 * R;
          ctx.quadraticCurveTo((x0 + x1) / 2, R * 0.95 + Math.sin(t * 3 + i + p.ph) * 2, x1, R * 0.35);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // la pousse
        ctx.fillStyle = k.gold ? "#e9b04a" : "#5b8c5a";
        ctx.beginPath(); ctx.moveTo(0, -R * 0.92); ctx.quadraticCurveTo(R * 0.15, -R * 1.6, R * 0.55, -R * 1.45); ctx.quadraticCurveTo(R * 0.25, -R * 1.15, 0, -R * 0.92); ctx.fill(); ctx.stroke();
        // visage : grands yeux, bouche en w
        ctx.fillStyle = k.color === "#2b2731" ? PAPER : INK;
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * R * 0.33, -R * 0.05, R * 0.11, R * 0.15, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-R * 0.14, R * 0.15); ctx.quadraticCurveTo(-R * 0.07, R * 0.26, 0, R * 0.15); ctx.quadraticCurveTo(R * 0.07, R * 0.26, R * 0.14, R * 0.15); ctx.stroke();
        ctx.fillStyle = "rgba(242,160,189,.6)";
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * R * 0.55, R * 0.12, R * 0.12, R * 0.07, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        if (k.wear === "bob") { ctx.fillStyle = "#5b8c5a"; ctx.beginPath(); ctx.ellipse(0, -R * 0.75, R * 0.8, R * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -R * 0.9, R * 0.45, R * 0.3, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
        if (k.wear === "cornes") { ctx.fillStyle = "#3b3440"; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * R * 0.4, -R * 0.7); ctx.quadraticCurveTo(sx * R * 0.8, -R * 1.2, sx * R * 0.75, -R * 1.4); ctx.lineTo(sx * R * 0.25, -R * 0.8); ctx.fill(); ctx.stroke(); } }
        if (k.wear === "goutte") { ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 1.6); ctx.quadraticCurveTo(-R * 0.3, -R * 1.25, -R * 0.5, -R * 1.15); ctx.quadraticCurveTo(-R * 0.7, -R * 1.25, -R * 0.5, -R * 1.6); ctx.fill(); }
        ctx.restore();
      }
      function drawClaw(t) {
        // câble et chariot
        ctx.strokeStyle = "#8a8478"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(claw.x, RAIL - 20); ctx.lineTo(claw.x, claw.y); ctx.stroke();
        ctx.fillStyle = "#5a5560"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.fillRect(claw.x - 26, RAIL - 34, 52, 16); ctx.strokeRect(claw.x - 26, RAIL - 34, 52, 16);
        ctx.fillStyle = "#b9c2c9";
        ctx.beginPath(); ctx.roundRect(claw.x - 14, claw.y, 28, 18, 5); ctx.fill(); ctx.stroke();
        // trois doigts
        ctx.strokeStyle = "#b9c2c9"; ctx.lineWidth = 5; ctx.lineCap = "round";
        const spread = 10 + claw.open * 26;
        for (const sx of [-1, 0, 1]) {
          ctx.beginPath();
          ctx.moveTo(claw.x + sx * 8, claw.y + 16);
          ctx.quadraticCurveTo(claw.x + sx * (spread + 6), claw.y + 30, claw.x + sx * spread * 0.8, claw.y + 46);
          ctx.lineTo(claw.x + sx * spread * 0.45, claw.y + 52);
          ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        for (const sx of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(claw.x + sx * 8, claw.y + 16); ctx.quadraticCurveTo(claw.x + sx * (spread + 6), claw.y + 30, claw.x + sx * spread * 0.8, claw.y + 46); ctx.stroke(); }
        // le viseur
        if (claw.phase === "move") { ctx.strokeStyle = "rgba(255,216,74,.3)"; ctx.setLineDash([4, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(claw.x, claw.y + 56); ctx.lineTo(claw.x, BOX.floor); ctx.stroke(); ctx.setLineDash([]); }
        void t;
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // la salle d'arcade
        ctx.fillStyle = "#1c1430"; ctx.fillRect(0, 0, AW, AH);
        for (let k = 0; k < 6; k++) Ink.halo(ctx, ["rgba(211,107,156,.25)", "rgba(91,179,160,.22)", "rgba(62,124,177,.22)"][k % 3], 80 + k * 200, 60 + (k % 2) * 560, 160);
        // la machine
        ctx.fillStyle = "#d36b9c"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(BOX.l - 40, 30, BOX.r - BOX.l + 80, 640, 24); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#2a1f3a"; ctx.fillRect(BOX.l, BOX.top - 30, BOX.r - BOX.l, BOX.floor - BOX.top + 100);
        // ampoules du fronton
        for (let k = 0; k < 18; k++) { const on = Math.floor(t * 4 + k) % 3 === 0; ctx.fillStyle = on ? "#ffd84a" : "#7a5a20"; ctx.beginPath(); ctx.arc(BOX.l - 10 + k * 48, 46, 5, 0, Math.PI * 2); ctx.fill(); }
        Ink.word(ctx, "PACHI·PINCE", AW / 2, 46, 18, "#fff1b0", 800, "#7a1426");
        // rail
        ctx.fillStyle = "#5a5560"; ctx.fillRect(BOX.l, RAIL - 40, BOX.r - BOX.l, 8);
        // sol et goulotte
        ctx.fillStyle = "#3a2a4a"; ctx.fillRect(BOX.l, BOX.floor, BOX.r - BOX.l, 30);
        ctx.fillStyle = "#0d0a14"; ctx.fillRect(CHUTE.l, BOX.floor - 2, CHUTE.r - CHUTE.l, 120);
        ctx.fillStyle = "#b9c2c9"; ctx.fillRect(CHUTE.r, BOX.floor - 130, 8, 130);
        Ink.word(ctx, "SORTIE", (CHUTE.l + CHUTE.r) / 2, BOX.floor + 40, 14, "#ffd84a", 800, "#1b1b1b");

        for (const p of plush) if (!p.won) drawPachi(p, t);
        drawClaw(t);
        // vitre
        ctx.fillStyle = "rgba(200,220,255,.06)"; ctx.fillRect(BOX.l, BOX.top - 30, BOX.r - BOX.l, BOX.floor - BOX.top + 30);
        ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(BOX.l + 60, BOX.floor - 20); ctx.lineTo(BOX.l + 200, BOX.top); ctx.stroke();

        // jetons et prix
        Ink.word(ctx, "Jetons", 1025, 120, 16, PAPER, 700, "#1b1b1b");
        for (let k = 0; k < TOKENS; k++) { ctx.fillStyle = k < tokens ? "#e9b04a" : "rgba(233,176,74,.15)"; ctx.beginPath(); ctx.arc(1005 + (k % 2) * 40, 150 + Math.floor(k / 2) * 36, 14, 0, Math.PI * 2); ctx.fill(); }
        Ink.word(ctx, `${score} pts`, 1025, 360, 20, "#ffd84a", 800, "#1b1b1b");
        prizes.forEach((p, k) => { const q = { ...p, x: 1000 + (k % 2) * 46, y: 420 + Math.floor(k / 2) * 46, rad: 18 }; drawPachi(q, t); });
        Ink.word(ctx, "Gagnés", 1025, 395, 14, PAPER, 700, "#1b1b1b");

        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.6) continue;
          ctx.globalAlpha = Math.min(1, 1.6 - age);
          Ink.word(ctx, p.text, Math.max(200, p.x), p.y - age * 30, 20, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        if (ended) Ink.word(ctx, "Plus de jetons !", AW / 2, 300, 40, "#ffd84a", 800, "#1b1b1b");
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        for (let k = 0; k < 2; k++) { physics(dt / 2); }
        updateClaw(dt);
        if (ended && secs() - ended > 2.5) return finish();
        render(now / 1000);
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
      }
      if (location.hostname === "localhost") {
        window.__pince = {
          state: () => ({ tokens, prizes: prizes.length, phase: claw.phase, score }),
          // vise la peluche la plus haute (la plus facile à attraper)
          aim() { const p = plush.filter((q) => !q.won && !q.held).sort((a, b) => a.y - b.y)[0]; if (p) claw.target = p.x; return p ? Math.round(p.x) : null; },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
