// Jour 21 · Cosmique : « La comète perdue »
// On pose des puits de gravité, puis on lâche la comète : elle doit cueillir les étoiles et rentrer dans le portail.
// Chaque niveau a été construit à partir d'une solution réelle (même physique qu'ici).
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, WELL_GM = 1.6e6, WELL_R = 16, DT = 1 / 240, TMAX = 14, STAR_R = 40, PORTAL_R = 48;

  // niveaux générés à partir d'une solution, puis gardés seulement s'ils restent faisables quand on décale les puits de ±30 px
  const LEVELS = [
    { start: [80, 380], v: [240, 0], wells: 1, planets: [], stars: [[433, 382], [755, 409]], portal: [1033, 500], sol: [[700, 530]] },
    { start: [80, 560], v: [230, -40], wells: 1, planets: [[560, 330, 60, 1.3e6]], stars: [[442, 488], [757, 350]], portal: [991, 177], sol: [[520, 130]] },
    { start: [80, 140], v: [230, 30], wells: 2, planets: [[600, 360, 50, 1.8e6]], stars: [[411, 143], [636, 100], [835, 86]], portal: [1011, 87], sol: [[260, 100], [160, 280]] },
    { start: [80, 340], v: [240, 0], wells: 2, planets: [[560, 340, 40, -1.6e6]], stars: [[362, 363], [566, 430], [782, 534]], portal: [988, 618], sol: [[190, 550], [620, 360]] },
    { start: [80, 600], v: [200, -90], wells: 2, planets: [[420, 300, 45, 1.2e6], [760, 380, 45, 1.2e6]], stars: [[357, 441], [618, 268], [837, 141]], portal: [1032, 51], sol: [[160, 370], [480, 490]] },
  ];

  Games.register(21, {
    title: "La comète perdue",
    music: "night",
    story: "Une petite comète s'est perdue loin du ciel de Noctifer. Elle ne sait pas tourner toute seule : elle suit la gravité, c'est tout. Pose des puits de gravité sur sa route pour la faire passer par les étoiles qu'elle doit rallumer, puis jusqu'au portail qui la ramène chez elle.",
    controls: "Clique pour poser un puits de gravité, fais-le glisser pour l'ajuster, clique dessus pour le retirer. Les pointillés montrent où ira la comète. Les étoiles et le portail l'attirent un peu quand elle passe près. Espace ou « Lancer » : c'est parti.",

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

      // le ciel profond, une fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      {
        const b = bg.getContext("2d"), r = Ink.rng(2121);
        b.fillStyle = "#06061a"; b.fillRect(0, 0, AW, AH);
        for (let k = 0; k < 18; k++) Ink.halo(b, ["rgba(125,91,166,.12)", "rgba(62,124,177,.12)", "rgba(211,107,156,.08)"][k % 3], r() * AW, r() * AH, 120 + r() * 160);
        for (let k = 0; k < 300; k++) { b.globalAlpha = 0.2 + r() * 0.7; b.fillStyle = "#f6efd5"; b.beginPath(); b.arc(r() * AW, r() * AH, r() * 1.3 + 0.2, 0, Math.PI * 2); b.fill(); }
        b.globalAlpha = 1;
      }

      let li = 0, L, wells, comet, got, phase, phaseAt, tries, results = [], trail = [];
      const pops = [];
      function load(i) {
        li = i; L = LEVELS[i];
        wells = []; tries = 0;
        resetComet();
      }
      function resetComet() {
        comet = { x: L.start[0], y: L.start[1], vx: L.v[0], vy: L.v[1], t: 0 };
        got = new Set(); trail = [];
        phase = "edit"; phaseAt = secs();
      }
      const bodies = () => [...L.planets.map((p) => ({ x: p[0], y: p[1], r: p[2], gm: p[3] })), ...wells.map(([x, y]) => ({ x, y, r: WELL_R, gm: WELL_GM }))];

      // un pas de physique ; renvoie "crash", "out", "portal" ou null
      function step(c, B, gotSet, quiet) {
        let ax = 0, ay = 0;
        for (const b of B) {
          const dx = b.x - c.x, dy = b.y - c.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
          if (d < b.r + 6) return "crash";
          const f = b.gm / Math.max(d2, 400) / d;
          ax += dx * f; ay += dy * f;
        }
        // les étoiles (puis le portail) attirent un peu la comète quand elle passe près : ça pardonne les tirs presque bons
        const mag = (tx, ty, R, A) => { const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy); if (d < R && d > 1) { ax += (dx / d) * A; ay += (dy / d) * A; } };
        L.stars.forEach((st, i) => { if (!gotSet.has(i)) mag(st[0], st[1], 90, 700); });
        if (gotSet.size === L.stars.length) mag(L.portal[0], L.portal[1], 130, 900);
        c.vx += ax * DT; c.vy += ay * DT; c.x += c.vx * DT; c.y += c.vy * DT; c.t += DT;
        if (c.x < -60 || c.x > AW + 60 || c.y < -60 || c.y > AH + 60) return "out";
        L.stars.forEach((st, i) => { if (!gotSet.has(i) && (st[0] - c.x) ** 2 + (st[1] - c.y) ** 2 < STAR_R * STAR_R) { gotSet.add(i); if (!quiet) { pops.push({ text: "✦", x: st[0], y: st[1], t: secs() }); Sound.play("note", 0.8, gotSet.size + 3); } } });
        if ((L.portal[0] - c.x) ** 2 + (L.portal[1] - c.y) ** 2 < PORTAL_R * PORTAL_R) return "portal";
        if (c.t > TMAX) return "out";
        return null;
      }
      function preview() {
        const c = { x: L.start[0], y: L.start[1], vx: L.v[0], vy: L.v[1], t: 0 }, B = bodies(), pts = [], g = new Set();
        for (let k = 0; k < 240 * 2.5; k++) { const res = step(c, B, g, true); if (k % 6 === 0) pts.push([c.x, c.y]); if (res) break; }
        return pts;
      }

      function launch() {
        if (phase !== "edit") return;
        tries++;
        phase = "fly"; phaseAt = secs();
        Sound.play("firework", 0.5);
      }
      function fail(why) {
        phase = "fail"; phaseAt = secs();
        pops.push({ text: why === "crash" ? "Boum !" : "Perdue dans le vide…", x: Math.max(80, Math.min(AW - 80, comet.x)), y: Math.max(60, Math.min(AH - 60, comet.y)), t: secs(), big: true });
        Sound.play(why === "crash" ? "junk" : "miss");
      }

      const BTN = { x: AW - 160, y: AH - 64, w: 140, h: 46 };
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (phase === "won") { if (secs() - phaseAt > 1) next(); return; }
        if (m.x > BTN.x && m.x < BTN.x + BTN.w && m.y > BTN.y && m.y < BTN.y + BTN.h) return launch();
        if (phase !== "edit") return;
        const hit = wells.findIndex(([x, y]) => Math.hypot(x - m.x, y - m.y) < 26);
        if (hit >= 0) { drag = { i: hit, x0: m.x, y0: m.y, moved: false }; canvas.setPointerCapture(e.pointerId); return; }
        if (e.button === 2) return;
        if (wells.length >= L.wells) { pops.push({ text: "Plus de puits ! Retires-en un.", x: m.x, y: m.y - 20, t: secs() }); return; }
        if (L.planets.some((p) => Math.hypot(p[0] - m.x, p[1] - m.y) < p[2] + WELL_R + 4)) return;
        wells.push([Math.round(m.x), Math.round(m.y)]);
        Sound.play("drop", 0.6);
      });
      let drag = null;
      canvas.addEventListener("pointermove", (e) => {
        if (!drag || phase !== "edit") return;
        const m = toArena(e);
        if (Math.hypot(m.x - drag.x0, m.y - drag.y0) > 5) drag.moved = true;
        if (drag.moved) wells[drag.i] = [Math.round(Math.max(20, Math.min(AW - 20, m.x))), Math.round(Math.max(20, Math.min(AH - 20, m.y)))];
      });
      canvas.addEventListener("pointerup", () => {
        if (drag && !drag.moved) { wells.splice(drag.i, 1); Sound.play("tick"); }
        drag = null;
      });
      const onKey = (e) => {
        if (e.key === " ") { e.preventDefault(); if (phase === "won") next(); else launch(); }
        else if (e.key.toLowerCase() === "r" && phase === "edit") wells = [];
      };
      window.addEventListener("keydown", onKey);

      let acc = 0;
      function update(dt) {
        if (phase === "fly") {
          acc += dt;
          const B = bodies();
          while (acc >= DT) {
            acc -= DT;
            const res = step(comet, B, got);
            if (trail.length === 0 || Math.hypot(trail[trail.length - 1][0] - comet.x, trail[trail.length - 1][1] - comet.y) > 6) trail.push([comet.x, comet.y]);
            if (res === "portal") {
              if (got.size === L.stars.length) { phase = "won"; phaseAt = secs(); results.push({ tries, score: Math.max(100, 300 - (tries - 1) * 50) }); Sound.play("win"); }
              else fail("out");
              break;
            }
            if (res) { fail(res); break; }
          }
        } else acc = 0;
        if (phase === "fail" && secs() - phaseAt > 1.4) resetComet();
        if (phase === "won" && secs() - phaseAt > 3) next();
      }
      function next() {
        if (li + 1 < LEVELS.length) load(li + 1);
        else finish();
      }
      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0);
        api.finish({
          score,
          stars: score >= 1300 ? 3 : score >= 900 ? 2 : 1,
          lines: [`${results.length} comètes ramenées`, results.map((r, i) => `${i + 1} : ${r.tries === 1 ? "du premier coup" : `${r.tries} essais`}`).join(" · ")],
        });
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);

        // portail
        const [px, py] = L.portal, open = got.size === L.stars.length;
        Ink.halo(ctx, open ? "rgba(180,139,224,.7)" : "rgba(120,120,140,.35)", px, py, 60);
        ctx.strokeStyle = open ? "#e0c8ff" : "#6b6170"; ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(px, py, 28 - k * 8, 28 - k * 8, t * (k + 1), 0.3, Math.PI * 1.7); ctx.stroke(); }
        // planètes fixes
        for (const [x, y, rr, gm] of L.planets) {
          if (gm < 0) {
            // étoile blanche : elle repousse
            Ink.halo(ctx, "rgba(255,255,240,.6)", x, y, rr * 2.6 + Math.sin(t * 4) * 6);
            ctx.strokeStyle = "rgba(255,255,240,.4)"; ctx.lineWidth = 2;
            for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + t * 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); ctx.lineTo(x + Math.cos(a) * (rr + 30), y + Math.sin(a) * (rr + 30)); ctx.stroke(); }
            ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
            Ink.word(ctx, "repousse", x, y + rr + 44, 12, "#fffbe8", 700, "#06061a");
          } else {
            Ink.halo(ctx, "rgba(62,124,177,.35)", x, y, rr * 2.2);
            ctx.fillStyle = "#3e5a8a"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.save(); ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = "rgba(233,176,74,.35)"; for (let k = -2; k <= 2; k++) ctx.fillRect(x - rr, y + k * rr * 0.35 - 4, rr * 2, 8);
            ctx.restore();
            ctx.strokeStyle = "rgba(233,176,74,.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.6, rr * 0.35, -0.3, 0, Math.PI * 2); ctx.stroke();
          }
        }
        // étoiles à rallumer
        L.stars.forEach(([x, y], i) => {
          const on = got.has(i);
          Ink.halo(ctx, on ? "rgba(255,230,140,.8)" : "rgba(200,200,220,.25)", x, y, on ? 34 : 20);
          ctx.fillStyle = on ? "#fff1b0" : "#8a8a9a";
          ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5 + (on ? t : 0), rr = k % 2 ? 5 : 13; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill();
        });
        // zone d'attraction des étoiles à rallumer
        ctx.strokeStyle = "rgba(255,230,140,.18)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
        L.stars.forEach(([x, y], i) => { if (!got.has(i)) { ctx.beginPath(); ctx.arc(x, y, STAR_R, 0, Math.PI * 2); ctx.stroke(); } });
        ctx.setLineDash([]);
        // astuce après trois échecs : l'emplacement d'un puits qui marche
        if (phase === "edit" && tries >= 3) {
          const [hx, hy] = L.sol[0];
          ctx.strokeStyle = "rgba(224,200,255," + (0.4 + Math.sin(t * 4) * 0.2) + ")"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(hx, hy, 26, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          Ink.word(ctx, "astuce", hx, hy - 38, 13, "#e0c8ff", 700, "#06061a");
        }
        // puits posés
        for (const [x, y] of wells) {
          ctx.strokeStyle = "rgba(180,139,224,.35)"; ctx.lineWidth = 1.5;
          for (let k = 1; k <= 3; k++) { const rr = ((t * 30 + k * 30) % 90) + 16; ctx.globalAlpha = 1 - rr / 106; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); }
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#7d5ba6"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, WELL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#1c1430"; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        }
        // trajectoire prévue
        if (phase === "edit") {
          const pts = preview();
          pts.forEach(([x, y], k) => { ctx.globalAlpha = 1 - k / pts.length; ctx.fillStyle = "#cdd6ff"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); });
          ctx.globalAlpha = 1;
        }
        // la comète
        ctx.strokeStyle = "rgba(160,220,255,.5)"; ctx.lineWidth = 3; ctx.lineCap = "round";
        if (trail.length > 1) { ctx.beginPath(); trail.slice(-60).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
        const sp = Math.hypot(comet.vx, comet.vy) || 1;
        for (let k = 0; k < 8; k++) Ink.halo(ctx, "rgba(160,220,255,.35)", comet.x - (comet.vx / sp) * k * 7, comet.y - (comet.vy / sp) * k * 7, 16 - k * 1.5);
        ctx.fillStyle = "#f6fbff"; ctx.beginPath(); ctx.arc(comet.x, comet.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(comet.x + 2, comet.y - 1, 1.4, 0, Math.PI * 2); ctx.arc(comet.x - 2, comet.y - 1, 1.4, 0, Math.PI * 2); ctx.fill();
        // lanceur
        ctx.strokeStyle = "rgba(205,214,255,.4)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(L.start[0], L.start[1], 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);

        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.2) continue;
          ctx.globalAlpha = 1 - age / 1.2;
          Ink.word(ctx, p.text, p.x, p.y - 20 - age * 30, p.big ? 28 : 20, "#fff1b0", 800, "#06061a");
          ctx.globalAlpha = 1;
        }
        // interface
        Ink.word(ctx, `Comète ${li + 1} / ${LEVELS.length}`, AW / 2, 28, 20, "#cdd6ff", 800, "#06061a");
        Ink.word(ctx, `Puits : ${L.wells - wells.length} à poser · étoiles ${got.size} / ${L.stars.length}`, AW / 2, 56, 15, PAPER, 700, "#06061a");
        ctx.fillStyle = phase === "edit" ? "#7d5ba6" : "#3b3440";
        ctx.beginPath(); ctx.roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 10); ctx.fill();
        Ink.word(ctx, "Lancer ✦", BTN.x + BTN.w / 2, BTN.y + BTN.h / 2, 19, PAPER, 800, "#3b3440");
        Ink.word(ctx, `Essai n° ${Math.max(1, tries + (phase === "edit" ? 1 : 0))}`, 90, AH - 30, 14, "#8a8aa0", 600, "#06061a");
        if (li === 0 && phase === "edit" && !wells.length) Ink.word(ctx, "Clique pour poser un puits de gravité, puis « Lancer »", AW / 2, AH - 40, 19, "#e0c8ff", 700, "#06061a");
        if (phase === "won") Ink.word(ctx, "La comète est rentrée !", AW / 2, AH / 2, 40, "#fff1b0", 800, "#06061a");
      }

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
      load(0);
      if (location.hostname === "localhost") {
        window.__comete = {
          state: () => ({ li, phase, tries, got: got.size, wells: wells.length }),
          sol() { const b = canvas.getBoundingClientRect(); return LEVELS[li].sol.map(([x, y]) => ({ x: b.left + ox + x * s, y: b.top + oy + y * s })); },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
