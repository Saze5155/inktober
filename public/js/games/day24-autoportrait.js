// Jour 24 · Autoportrait : « Le miroir aveugle »
// On regarde son reflet quelques secondes, puis on le redessine les yeux bandés, en trois morceaux.
// Le portrait final (ta vraie tache d'encre, tremblante) est accroché au musée du 31 octobre.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, CX = 550, CY = 360, LOOK = 3.2, DRAW = 9;

  // les modèles : une liste de points à suivre (le contour du corps, les yeux, la goutte)
  function bodyPts() {
    const pts = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      let r = 150 + Math.sin(a * 3) * 6;
      const down = Math.sin(a);
      if (down > 0.2) r += Math.max(0, Math.sin(a * 6 + 1)) * 40 * down;
      pts.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r * 1.05]);
    }
    return [pts];
  }
  function eyesPts() {
    const out = [];
    for (const sx of [-1, 1]) {
      const e = [];
      for (let i = 0; i <= 30; i++) { const a = (i / 30) * Math.PI * 2; e.push([CX + sx * 55 + Math.cos(a) * 30, CY - 20 + Math.sin(a) * 36]); }
      out.push(e);
    }
    // la bouche, un petit sourire
    const m = [];
    for (let i = 0; i <= 16; i++) { const k = i / 16; m.push([CX - 40 + k * 80, CY + 50 + Math.sin(k * Math.PI) * 22]); }
    out.push(m);
    return out;
  }
  function dropPts() {
    const pts = [], x = CX, y = CY - 230;
    for (let i = 0; i <= 40; i++) {
      const k = i / 40, a = k * Math.PI * 2;
      // goutte : pointe en haut
      const r = 32 * (1 - 0.55 * Math.max(0, -Math.sin(a)));
      pts.push([x + Math.cos(a) * r * (1 - 0.6 * Math.max(0, -Math.sin(a))), y + Math.sin(a) * 40 + (Math.sin(a) < 0 ? Math.sin(a) * 18 : 0)]);
    }
    return [pts];
  }
  const ROUNDS = [
    { name: "Le contour de ton corps", make: bodyPts },
    { name: "Tes yeux et ton sourire", make: eyesPts },
    { name: "Ta goutte de couleur", make: dropPts },
  ];

  Games.register(24, {
    title: "Le miroir aveugle",
    music: "inside",
    story: "Dans la maison des humains, il reste un grand miroir. Les Enxors s'y regardent pour la première fois, et l'un d'eux a lancé un défi : se dessiner soi-même… les yeux bandés. Regarde bien ton reflet, puis trace-le de mémoire. Ton autoportrait sera exposé au musée de la Canne À Pêche le 31 octobre.",
    controls: "Regarde le modèle quelques secondes. Quand le bandeau tombe, dessine en maintenant le clic. Tu ne vois pas ce que tu traces ! Espace pour valider plus tôt.",

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
      const me = api.me || { pseudo: "toi", color: "#e9b04a", wear: {} };

      let ri = 0, phase = "look", phaseAt = secs(), strokes = [], cur = null, results = [], target = null;
      const allStrokes = [];
      function load(i) {
        ri = i; target = ROUNDS[i].make();
        strokes = []; cur = null;
        phase = "look"; phaseAt = secs();
      }

      // note : couverture (on a suivi le modèle) × précision (on n'a pas gribouillé ailleurs)
      function grade() {
        const drawn = strokes.flat();
        if (drawn.length < 3) return 0;
        const tp = target.flat();
        const near = (p, list, d) => list.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < d * d);
        const cover = tp.filter((p) => near(p, drawn, 22)).length / tp.length;
        const prec = drawn.filter((p) => near(p, tp, 28)).length / drawn.length;
        return Math.round(100 * Math.sqrt(cover * prec));
      }
      function reveal() {
        if (phase !== "draw") return;
        cur = null;
        const pct = grade();
        results.push({ name: ROUNDS[ri].name, pct });
        allStrokes.push(...strokes);
        phase = "reveal"; phaseAt = secs();
        Sound.play(pct >= 60 ? "win" : "reveal");
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (phase === "reveal" && secs() - phaseAt > 1) return next();
        if (phase === "final" && secs() - phaseAt > 1.5) return finish();
        if (phase !== "draw") return;
        cur = [[m.x, m.y]]; strokes.push(cur);
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!cur || phase !== "draw") return;
        const m = toArena(e), l = cur[cur.length - 1];
        if (Math.hypot(m.x - l[0], m.y - l[1]) > 4) cur.push([m.x, m.y]);
      });
      canvas.addEventListener("pointerup", () => { cur = null; });
      const onKey = (e) => {
        if (e.key !== " ") return;
        e.preventDefault();
        if (phase === "draw") reveal();
        else if (phase === "reveal" && secs() - phaseAt > 1) next();
        else if (phase === "final" && secs() - phaseAt > 1.5) finish();
      };
      window.addEventListener("keydown", onKey);

      function next() {
        if (ri + 1 < ROUNDS.length) load(ri + 1);
        else { phase = "final"; phaseAt = secs(); savePortrait(); }
      }

      // l'autoportrait final, sur fond de papier, envoyé au musée
      let saved = null;
      function portraitCanvas() {
        const c = document.createElement("canvas"), W = 480, H = 600;
        c.width = W; c.height = H;
        const g = c.getContext("2d");
        g.fillStyle = "#efe5d0"; g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(160,120,60,.08)"; for (let k = 0; k < 40; k++) g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
        // on recadre le dessin (qui occupe ~ 360 × 480 autour du centre)
        g.translate(W / 2 - CX * 0.82, H / 2 + 20 - CY * 0.82); g.scale(0.82, 0.82);
        g.strokeStyle = INK; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 9;
        for (const st of allStrokes) { g.beginPath(); st.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = INK; g.font = `700 20px "Barlow Semi Condensed", sans-serif`; g.textAlign = "center";
        g.fillText(`Autoportrait de ${me.pseudo}`, W / 2, H - 22);
        return c;
      }
      async function savePortrait() {
        try {
          if (!api.savePortrait) return;
          await api.savePortrait(portraitCanvas().toDataURL("image/png"));
          saved = true;
        } catch { saved = false; }
      }

      function finish() {
        stop();
        const avg = results.reduce((a, r) => a + r.pct, 0) / results.length;
        api.finish({
          score: Math.round(avg * 30),
          stars: avg >= 60 ? 3 : avg >= 40 ? 2 : 1,
          lines: [results.map((r) => `${r.name} : ${r.pct} %`).join(" · "), "Ton autoportrait est accroché au musée de la Canne À Pêche."],
        });
      }

      function update() {
        if (phase === "look" && secs() - phaseAt > LOOK) { phase = "draw"; phaseAt = secs(); Sound.play("drop"); }
        if (phase === "draw" && secs() - phaseAt > DRAW) reveal();
      }

      // ---------- dessin ----------
      function line(pts, color, w, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.setLineDash([]);
      }
      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le grand miroir dans son cadre doré
        ctx.fillStyle = "#3a2e2c"; ctx.fillRect(0, 0, AW, AH);
        ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.roundRect(CX - 300, 30, 600, 630, 40); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = phase === "look" ? "#5a6a78" : PAPER;
        ctx.beginPath(); ctx.roundRect(CX - 276, 54, 552, 582, 30); ctx.fill();

        if (phase === "look") {
          // le reflet : ton Enxor, avec le modèle à apprendre par-dessus
          ctx.save(); ctx.translate(CX, CY + 195); ctx.scale(9, 9);
          ctx.globalAlpha = 0.35;
          Ink.enxor(ctx, 0, 0, t, { seed: 24, color: me.color, face: 1, wear: me.wear });
          ctx.restore(); ctx.globalAlpha = 1;
          for (const p of target) line(p, "#fff1b0", 7);
          const k = 1 - (secs() - phaseAt) / LOOK;
          ctx.fillStyle = "rgba(255,241,176,.8)"; ctx.fillRect(CX - 250, 620, 500 * Math.max(0, k), 6);
          Ink.word(ctx, `Mémorise : ${ROUNDS[ri].name.toLowerCase()}`, CX, 90, 22, "#fff1b0", 800, "#1b1b1b");
        } else if (phase === "draw") {
          // le bandeau : on ne voit rien de ce qu'on trace, juste des traits déjà finis… et encore
          ctx.fillStyle = "#2b2731"; ctx.fillRect(CX - 276, 54, 552, 582);
          for (let k = 0; k < 6; k++) Ink.halo(ctx, "rgba(90,70,110,.25)", CX - 200 + k * 80, 340 + Math.sin(t + k) * 40, 120);
          Ink.word(ctx, "Yeux bandés ! Dessine de mémoire", CX, 90, 22, "#f2c1cf", 800, "#1b1b1b");
          const k = 1 - (secs() - phaseAt) / DRAW;
          ctx.fillStyle = "#d36b9c"; ctx.fillRect(CX - 250, 620, 500 * Math.max(0, k), 6);
          // seul un petit point suit la plume, pour savoir où on est
          if (cur) { const [x, y] = cur[cur.length - 1]; ctx.fillStyle = "rgba(242,193,207,.5)"; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
          Ink.word(ctx, "Espace pour valider", CX, 600, 14, "#8a8478", 600, "#1b1b1b");
        } else if (phase === "reveal") {
          for (const p of target) line(p, "rgba(62,124,177,.55)", 10, [2, 10]);
          for (const st of strokes) line(st, INK, 7);
          const r = results[results.length - 1];
          Ink.word(ctx, `${r.pct} %`, CX, 100, 54, r.pct >= 60 ? "#2f8a4a" : r.pct >= 40 ? "#c9874a" : "#b3261e", 800, PAPER);
          Ink.word(ctx, r.pct >= 75 ? "Saisissant de vérité." : r.pct >= 55 ? "On te reconnaît !" : r.pct >= 35 ? "Un style… audacieux." : "C'est très… moderne.", CX, 150, 20, INK, 700, PAPER);
          if (secs() - phaseAt > 1) Ink.word(ctx, "Clic pour continuer", CX, 610, 15, "#6b6170", 600, PAPER);
        } else if (phase === "final") {
          for (const st of allStrokes) line(st, INK, 8);
          ctx.fillStyle = "#c9a24a"; ctx.fillRect(CX - 150, 590, 300, 34);
          Ink.word(ctx, `Autoportrait de ${me.pseudo}`, CX, 607, 17, INK, 800, "#c9a24a");
          Ink.word(ctx, saved === null ? "Accrochage au musée…" : saved ? "Accroché au musée !" : "Le musée n'a pas pu le recevoir", CX, 92, 20, saved === false ? "#b3261e" : "#2f8a4a", 800, PAPER);
        }
        // les trois manches
        ROUNDS.forEach((rd, i) => {
          const done = results[i];
          ctx.fillStyle = done ? (done.pct >= 60 ? "#2f8a4a" : "#c9874a") : i === ri ? "#e9b04a" : "#5a5560";
          ctx.beginPath(); ctx.arc(80, 120 + i * 60, 16, 0, Math.PI * 2); ctx.fill();
          Ink.word(ctx, done ? `${done.pct}` : String(i + 1), 80, 120 + i * 60, 13, PAPER, 800, "#1b1b1b");
        });
      }

      let raf = 0, running = true;
      function frame(now) {
        if (!running) return;
        update();
        render(now / 1000);
        if (running) raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
      }
      load(0);
      if (location.hostname === "localhost") {
        window.__miroir = {
          state: () => ({ ri, phase, results }),
          // le modèle du tour en coordonnées écran, avec un tremblement (comme une vraie main)
          target() { const b = canvas.getBoundingClientRect(); return target.map((p) => p.map(([x, y]) => ({ x: b.left + ox + (x + (Math.random() - 0.5) * 16) * s, y: b.top + oy + (y + (Math.random() - 0.5) * 16) * s }))); },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
