// Jour 27 · Artifice : « La réaction en chaîne »
// Des fusées endormies flottent au-dessus du hameau. Un seul clic par essai : la première gerbe en allume d'autres,
// qui en allument d'autres… Il faut en faire exploser assez pour passer au tableau suivant.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, SKY_H = 560, BOOM_R = 100;
  // réglés par simulation : ~70-80 % de réussite par essai en visant la zone la plus dense
  const LEVELS = [[12, 3], [18, 5], [24, 8], [30, 11], [38, 16], [48, 27]];
  const COLORS = ["#ff6a5a", "#ffd84a", "#8ff0c8", "#8fc7ff", "#e0a0ff", "#ffb070", "#f2f2f2"];

  Games.register(27, {
    title: "La réaction en chaîne",
    music: "night",
    story: "Pour la fin du mois, Ocre a trouvé une caisse entière de fusées humaines. Elles flottent déjà au-dessus du hameau, endormies, en attendant une étincelle. Tu n'as droit qu'à une seule allumette par tableau : vise bien, et laisse la chaîne faire le reste.",
    controls: "Un seul clic par essai : il crée une première gerbe. Toute fusée qui la touche explose à son tour. Atteins l'objectif pour passer au tableau suivant (sinon, on recommence).",

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

      // ciel et silhouettes du hameau, une fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      {
        const b = bg.getContext("2d"), r = Ink.rng(2727);
        const g = b.createLinearGradient(0, 0, 0, AH);
        g.addColorStop(0, "#05061a"); g.addColorStop(0.75, "#1a1438"); g.addColorStop(1, "#2a1a3a");
        b.fillStyle = g; b.fillRect(0, 0, AW, AH);
        for (let k = 0; k < 200; k++) { b.globalAlpha = 0.2 + r() * 0.6; b.fillStyle = "#f6efd5"; b.beginPath(); b.arc(r() * AW, r() * SKY_H, r() * 1.2 + 0.2, 0, Math.PI * 2); b.fill(); }
        b.globalAlpha = 1;
        // cabanes du hameau en ombre chinoise, fenêtres allumées
        b.fillStyle = "#0b0a12";
        b.beginPath(); b.moveTo(0, AH);
        for (let x = 0; x <= AW; x += 20) b.lineTo(x, 600 + Math.sin(x * 0.01) * 10);
        b.lineTo(AW, AH); b.fill();
        for (let k = 0; k < 9; k++) {
          const x = 40 + k * 125 + r() * 30, w = 60 + r() * 30, h = 40 + r() * 25, y = 600 - h;
          b.fillStyle = "#0b0a12"; b.fillRect(x, y, w, h + 10);
          b.beginPath(); b.moveTo(x - 8, y); b.lineTo(x + w / 2, y - 30); b.lineTo(x + w + 8, y); b.fill();
          b.fillStyle = "rgba(255,200,110,.8)"; b.fillRect(x + w * 0.3, y + 14, 10, 10);
        }
      }

      let li = 0, tries = 0, sparks, booms, phase, phaseAt, clicked, results = [], popped = 0, lastSound = 0;
      const particles = [];
      function load(i, retry) {
        li = i;
        if (!retry) tries = 0;
        tries++;
        const [n] = LEVELS[i];
        sparks = Array.from({ length: n }, () => {
          const a = Math.random() * Math.PI * 2, sp = 25 + Math.random() * 30;
          return { x: 60 + Math.random() * (AW - 120), y: 60 + Math.random() * (SKY_H - 160), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: COLORS[Math.floor(Math.random() * COLORS.length)], gone: false };
        });
        booms = []; clicked = false; popped = 0;
        phase = "aim"; phaseAt = secs();
      }
      function boom(x, y, color, first) {
        booms.push({ x, y, c: color, t: secs(), first });
        // les étincelles de la gerbe
        const n = first ? 30 : 46;
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + Math.random() * 0.1, sp = 90 + Math.random() * 120; particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: color, t: secs(), life: 1 + Math.random() * 0.6 }); }
        if (secs() - lastSound > 0.06) { Sound.play("firework", first ? 0.5 : 0.35); lastSound = secs(); }
      }
      // rayon d'une gerbe : elle gonfle, reste un moment, puis s'éteint
      const radius = (b) => { const a = secs() - b.t; return a < 0.3 ? BOOM_R * (a / 0.3) : a < 1.9 ? BOOM_R : a < 2.3 ? BOOM_R * (1 - (a - 1.9) / 0.4) : 0; };

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (phase === "aim" && !clicked && m.y < SKY_H) { clicked = true; phase = "chain"; boom(m.x, m.y, "#ffffff", true); }
        else if (phase === "result" && secs() - phaseAt > 0.8) advance();
      });
      const onKey = (e) => { if ((e.key === " " || e.key === "Enter") && phase === "result" && secs() - phaseAt > 0.8) advance(); };
      window.addEventListener("keydown", onKey);

      let passed = false;
      function advance() {
        if (passed) {
          results.push({ tries, popped, n: LEVELS[li][0] });
          if (li + 1 < LEVELS.length) load(li + 1); else finish();
        } else load(li, true);
      }

      function update(dt) {
        for (const sp of sparks) {
          if (sp.gone) continue;
          sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          if (sp.x < 20 || sp.x > AW - 20) sp.vx *= -1;
          if (sp.y < 20 || sp.y > SKY_H - 60) sp.vy *= -1;
          for (const b of booms) {
            const r = radius(b);
            if (r > 0 && Math.hypot(sp.x - b.x, sp.y - b.y) < r + 6) { sp.gone = true; popped++; boom(sp.x, sp.y, sp.c, false); break; }
          }
        }
        for (const p of particles) { p.vy += 90 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; }
        for (let k = particles.length - 1; k >= 0; k--) if (secs() - particles[k].t > particles[k].life) particles.splice(k, 1);
        if (phase === "chain" && booms.every((b) => secs() - b.t > 2.3)) {
          passed = popped >= LEVELS[li][1];
          phase = "result"; phaseAt = secs();
          Sound.play(passed ? "win" : "miss", 0.7);
        }
      }

      function finish() {
        stop();
        const score = results.reduce((a, r) => a + 150 + (r.popped - LEVELS[results.indexOf(r)][1]) * 20 - (r.tries - 1) * 40, 0);
        const retries = results.reduce((a, r) => a + r.tries - 1, 0);
        api.finish({
          score: Math.max(0, score),
          stars: retries <= 3 ? 3 : retries <= 8 ? 2 : 1,
          lines: [`${LEVELS.length} tableaux allumés`, retries ? `${retries} allumette${retries > 1 ? "s" : ""} gâchée${retries > 1 ? "s" : ""}` : "Aucune allumette gâchée !"],
        });
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);
        // fusées endormies : un petit corps et une mèche qui grésille
        for (const sp of sparks) {
          if (sp.gone) continue;
          ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(Math.atan2(sp.vy, sp.vx) + Math.PI / 2);
          ctx.fillStyle = sp.c; ctx.fillRect(-3, -8, 6, 14);
          ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(0, -13); ctx.lineTo(3, -8); ctx.fill();
          ctx.restore();
          Ink.halo(ctx, sp.c === "#f2f2f2" ? "rgba(255,255,255,.4)" : "rgba(255,220,150,.3)", sp.x, sp.y, 12 + Math.sin(t * 10 + sp.x) * 2);
        }
        // gerbes
        ctx.globalCompositeOperation = "lighter";
        for (const b of booms) {
          const r = radius(b);
          if (r <= 0) continue;
          const age = secs() - b.t;
          if (age < 0.7) { ctx.globalAlpha = 1 - age / 0.7; Ink.halo(ctx, b.c === "#ffffff" ? "rgba(255,255,255,.9)" : "rgba(255,220,160,.9)", b.x, b.y, 40 + age * 120); }
          ctx.strokeStyle = b.c; ctx.globalAlpha = 0.25; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        for (const p of particles) {
          const age = (secs() - p.t) / p.life;
          ctx.globalAlpha = Math.max(0, 1 - age);
          ctx.strokeStyle = p.c; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        // interface
        const [n, need] = LEVELS[li];
        Ink.word(ctx, `Tableau ${li + 1} / ${LEVELS.length}`, AW / 2, 30, 20, "#cdd6ff", 800, "#05061a");
        Ink.word(ctx, `${popped} / ${need} fusées (sur ${n})`, AW / 2, 60, 18, popped >= need ? "#8ff0c8" : PAPER, 800, "#05061a");
        Ink.word(ctx, `Essai n° ${tries}`, 90, 30, 14, "#8a8aa0", 600, "#05061a");
        if (phase === "aim") Ink.word(ctx, li === 0 && tries === 1 ? "Un seul clic : allume la première gerbe au bon endroit !" : "Choisis ton moment… un seul clic.", AW / 2, SKY_H + 50, 18, "#ffd84a", 700, "#05061a");
        if (phase === "result") {
          Ink.word(ctx, passed ? "Magnifique !" : "Pas assez…", AW / 2, 280, 46, passed ? "#ffd84a" : "#f2c1cf", 800, "#05061a");
          Ink.word(ctx, passed ? "Clic pour le tableau suivant" : "Clic pour réessayer", AW / 2, 330, 16, PAPER, 600, "#05061a");
        }
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
        window.__artifice = {
          state: () => ({ li, phase, popped, tries, passed }),
          // vise le point le plus dense en fusées
          best() {
            let best = null;
            for (const a of sparks) { const n = sparks.filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < 90).length; if (!best || n > best.n) best = { n, x: a.x, y: a.y }; }
            const b = canvas.getBoundingClientRect();
            return { x: b.left + ox + best.x * s, y: b.top + oy + best.y * s };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
