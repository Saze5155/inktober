// Jour 30 · Arme : « La forge de Brumefer »
// Forger trois armes, chacune en trois gestes : chauffer au soufflet (rester dans l'orange),
// marteler en rythme (frapper quand l'anneau touche la marque), tremper au bon moment (couleur cerise).
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680;
  const WEAPONS = [
    { name: "L'épée", ring: 1.05, heat: [0.6, 0.8] },
    { name: "La hache", ring: 0.9, heat: [0.64, 0.8] },
    { name: "La lance", ring: 0.78, heat: [0.68, 0.8] },
  ];
  const BLADE = { x: 560, y: 380 }; // sur l'enclume
  const HITS = 6;

  Games.register(30, {
    title: "La forge de Brumefer",
    music: "dragon",
    story: "Les vikings de Brumefer ont rouvert la vieille forge humaine. Ils ne veulent pas des armes pour se battre, plutôt pour les accrocher au mur et faire « oooh ». Forge trois pièces dignes du musée : chauffe juste ce qu'il faut, frappe en rythme, trempe au bon moment.",
    controls: "Chauffe : maintiens le clic pour souffler, garde l'aiguille dans l'orange. Martelage : clique sur la marque quand l'anneau la touche. Trempe : clique quand la lame devient couleur cerise.",

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

      let wi = 0, step, stepAt, holding = false, temp, inZone, burn, marks, mi, markAt, hitScores, quenchAt, quenchScore, results = [], pops = [], sparks = [], hammerAt = -9;
      function load(i) {
        wi = i; step = "heat"; stepAt = secs();
        temp = 0.15; inZone = 0; burn = 0;
        // les marques de martelage, le long de la lame
        marks = Array.from({ length: HITS }, (_, k) => ({ x: BLADE.x - 170 + k * 62 + (Math.random() - 0.5) * 20, y: BLADE.y - 4 + (Math.random() - 0.5) * 16 }));
        mi = 0; hitScores = [];
        quenchScore = null;
      }
      const say = (text, x, y, color) => pops.push({ text, x, y, color, t: secs() });

      function ringR() { const k = (secs() - markAt) / WEAPONS[wi].ring; return 80 - k * 80; } // 80 → 0 ; la marque fait 20
      function nextMark() { markAt = secs() + 0.35; }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => { const m = toArena(e); holding = true; action(m); });
      window.addEventListener("pointerup", onUp);
      function onUp() { holding = false; }
      const onKey = (e) => {
        if (e.key !== " ") return;
        e.preventDefault();
        if (e.type === "keydown") { if (!holding) { holding = true; action(null); } }
        else holding = false;
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function action(m) {
        if (step === "hammer") {
          const mk = marks[mi], r = ringR();
          if (secs() < markAt) return;
          if (m && Math.hypot(m.x - mk.x, m.y - mk.y) > 45) return;
          const err = Math.abs(r - 20);
          const sc = Math.max(0, 1 - err / 28);
          hitScores.push(sc);
          hammerAt = secs();
          for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 200; sparks.push({ x: mk.x, y: mk.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: secs() }); }
          say(sc > 0.85 ? "Parfait !" : sc > 0.55 ? "Bien" : sc > 0.2 ? "Bof" : "Raté", mk.x, mk.y - 40, sc > 0.85 ? "#ffd84a" : sc > 0.55 ? "#8fd18a" : "#f2c1cf");
          Sound.play("kick", 0.5 + sc * 0.4);
          if (sc > 0.85) Sound.play("bell", 0.25);
          mi++;
          if (mi >= HITS) { step = "quench"; stepAt = secs(); quenchAt = secs(); }
          else nextMark();
        } else if (step === "quench") {
          // la lame refroidit en 3,2 s : cerise entre 45 % et 60 %
          const k = (secs() - quenchAt) / 3.2;
          const err = Math.abs(k - 0.525);
          quenchScore = Math.max(0, 1 - err / 0.25);
          step = "done"; stepAt = secs();
          Sound.play("splash"); Sound.play("flame", 0.4);
          say(quenchScore > 0.8 ? "Pchhhh… parfait !" : quenchScore > 0.4 ? "Pchhhh !" : k < 0.525 ? "Trop chaud : la lame casse un peu…" : "Trop froid : elle reste molle…", 900, 300, quenchScore > 0.4 ? "#8fc7e8" : "#f2c1cf");
          const heatQ = Math.max(0, 1 - burn / 2);
          const hammerQ = hitScores.reduce((a, b) => a + b, 0) / HITS;
          results.push({ name: WEAPONS[wi].name, q: Math.round(100 * (0.3 * heatQ + 0.5 * hammerQ + 0.2 * quenchScore)) });
        } else if (step === "done" && secs() - stepAt > 1.6) {
          if (wi + 1 < WEAPONS.length) load(wi + 1); else finish();
        }
      }

      function update(dt) {
        if (step === "heat") {
          // le soufflet : on tient pour souffler, la chaleur retombe sinon
          temp += (holding ? 0.42 : -0.22) * dt;
          temp = Math.max(0, Math.min(1, temp));
          const [lo, hi] = WEAPONS[wi].heat;
          if (temp >= lo && temp <= hi) inZone += dt;
          if (temp > 0.9) { burn += dt; if (Math.random() < dt * 6) say("Ça brûle !", 230, 300, "#ff6a5a"); }
          if (holding && Math.random() < dt * 8) Sound.play("flame", 0.15);
          if (inZone >= 2.2) { step = "hammer"; stepAt = secs(); nextMark(); Sound.play("bell", 0.4); }
        } else if (step === "hammer") {
          if (secs() >= markAt && ringR() < 4) {
            hitScores.push(0); say("Trop tard", marks[mi].x, marks[mi].y - 40, "#f2c1cf");
            mi++;
            if (mi >= HITS) { step = "quench"; stepAt = secs(); quenchAt = secs(); } else nextMark();
          }
        } else if (step === "quench") {
          if (secs() - quenchAt > 3.4) action(null);
        }
        for (const sp of sparks) { sp.vy += 600 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; }
        for (let k = sparks.length - 1; k >= 0; k--) if (secs() - sparks[k].t > 0.8) sparks.splice(k, 1);
      }

      function finish() {
        stop();
        const avg = results.reduce((a, r) => a + r.q, 0) / results.length;
        api.finish({
          score: Math.round(avg * 25),
          stars: avg >= 80 ? 3 : avg >= 60 ? 2 : 1,
          lines: [results.map((r) => `${r.name} : ${r.q} %`).join(" · "), avg >= 80 ? "Des pièces dignes du musée !" : "Les vikings font quand même « oooh »."],
        });
      }

      // ---------- dessin ----------
      // couleur du métal selon la chaleur : gris → rouge sombre → cerise → orange → jaune → blanc
      function metal(k) {
        const stops = [[0, [120, 125, 135]], [0.35, [110, 30, 25]], [0.55, [200, 40, 40]], [0.72, [240, 120, 40]], [0.86, [255, 210, 90]], [1, [255, 250, 230]]];
        for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) {
          const [k0, c0] = stops[i - 1], [k1, c1] = stops[i], f = (k - k0) / (k1 - k0);
          return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * f)).join(",")})`;
        }
        return "rgb(255,250,230)";
      }
      function drawBlade(x, y, heat, w) {
        ctx.save(); ctx.translate(x, y);
        const col = metal(heat);
        if (heat > 0.5) Ink.halo(ctx, `rgba(255,${Math.round(120 + heat * 100)},60,${(heat - 0.5) * 1.2})`, 0, 0, 160);
        ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (w === 0) { ctx.moveTo(-200, -12); ctx.lineTo(150, -12); ctx.lineTo(200, 0); ctx.lineTo(150, 12); ctx.lineTo(-200, 12); }
        else if (w === 1) { ctx.moveTo(-200, -8); ctx.lineTo(90, -8); ctx.lineTo(90, -45); ctx.quadraticCurveTo(170, -40, 180, 0); ctx.quadraticCurveTo(170, 40, 90, 45); ctx.lineTo(90, 8); ctx.lineTo(-200, 8); }
        else { ctx.moveTo(-210, -6); ctx.lineTo(120, -6); ctx.lineTo(130, -20); ctx.lineTo(200, 0); ctx.lineTo(130, 20); ctx.lineTo(120, 6); ctx.lineTo(-210, 6); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // la poignée (à froid)
        ctx.fillStyle = "#6b4426"; ctx.fillRect(-250, -7, 50, 14); ctx.strokeRect(-250, -7, 50, 14);
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // la forge : murs de pierre sombres, braises
        ctx.fillStyle = "#2a1f1c"; ctx.fillRect(0, 0, AW, AH);
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
        for (let y = 0; y < 470; y += 50) for (let x = (y / 50) % 2 ? -45 : 0; x < AW; x += 90) ctx.strokeRect(x, y, 90, 50);
        ctx.fillStyle = "#1a1210"; ctx.fillRect(0, 470, AW, AH - 470);
        // le foyer à gauche
        const fire = step === "heat" ? temp : 0.3;
        Ink.halo(ctx, `rgba(255,140,50,${0.3 + fire * 0.5})`, 200, 420, 200 + fire * 80);
        ctx.fillStyle = "#3b3532"; ctx.fillRect(110, 400, 180, 90); ctx.strokeStyle = INK; ctx.strokeRect(110, 400, 180, 90);
        for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 2 ? "#ff8a3a" : "#ffd84a"; ctx.beginPath(); ctx.ellipse(130 + k * 18, 400 - Math.abs(Math.sin(t * 8 + k)) * (10 + fire * 30), 7, 14 + fire * 20, 0, 0, Math.PI * 2); ctx.fill(); }
        // le soufflet
        const puff = holding && step === "heat" ? Math.abs(Math.sin(t * 10)) : 0;
        ctx.fillStyle = "#6b4426"; ctx.beginPath(); ctx.moveTo(20, 470 - puff * 10); ctx.lineTo(110, 445); ctx.lineTo(110, 470); ctx.lineTo(20, 500 + puff * 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        // l'enclume
        ctx.fillStyle = "#3b3f48"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(380, 400); ctx.lineTo(760, 400); ctx.quadraticCurveTo(820, 405, 840, 430); ctx.lineTo(700, 430); ctx.lineTo(660, 500); ctx.lineTo(480, 500); ctx.lineTo(440, 430); ctx.lineTo(380, 430); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillRect(470, 500, 200, 40); ctx.strokeRect(470, 500, 200, 40);
        // le tonneau d'eau à droite
        ctx.fillStyle = "#6b4426"; ctx.fillRect(900, 410, 130, 130); ctx.strokeRect(900, 410, 130, 130);
        ctx.fillStyle = "#3e5a8a"; ctx.fillRect(908, 418, 114, 18);
        ctx.strokeStyle = "#3b3532"; ctx.lineWidth = 5; for (const y of [440, 500]) { ctx.beginPath(); ctx.moveTo(900, y); ctx.lineTo(1030, y); ctx.stroke(); }
        // le forgeron
        ctx.save(); ctx.translate(860, 300); ctx.scale(2.1, 2.1);
        Ink.enxor(ctx, 0, 0, t, { seed: 30, color: "#e0662f", face: -1, wear: { head: "casque", back: "bouclier" } });
        ctx.restore();
        // la lame selon l'étape
        let heat = 0.2, bx = BLADE.x, by = BLADE.y;
        if (step === "heat") { heat = temp; bx = 300; by = 380; }
        else if (step === "hammer") heat = 0.72 - (mi / HITS) * 0.1;
        else if (step === "quench") heat = Math.max(0, 0.95 - ((secs() - quenchAt) / 3.2) * 0.9);
        else if (step === "done") { heat = 0.05; bx = 965; by = 360; }
        drawBlade(bx, by, heat, wi);
        // le marteau, qui s'abat à chaque frappe
        if (step === "hammer") {
          const k = Math.min(1, (secs() - hammerAt) / 0.18), mk = marks[Math.min(mi, HITS - 1)];
          ctx.save(); ctx.translate(mk.x + 40, mk.y - 30); ctx.rotate(-1.1 + (k < 1 ? 1.1 * (1 - k) : 0));
          ctx.fillStyle = "#6b4426"; ctx.fillRect(-4, -10, 8, 90); ctx.strokeRect(-4, -10, 8, 90);
          ctx.fillStyle = "#5a5560"; ctx.fillRect(-22, -26, 44, 20); ctx.strokeRect(-22, -26, 44, 20);
          ctx.restore();
          // la marque et l'anneau qui se resserre
          if (mi < HITS && secs() >= markAt) {
            const r = ringR();
            ctx.strokeStyle = "rgba(255,216,74,.9)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(mk.x, mk.y, Math.max(1, r), 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(mk.x, mk.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          for (let k2 = mi + 1; k2 < HITS; k2++) { ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(marks[k2].x, marks[k2].y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        }
        ctx.globalCompositeOperation = "lighter";
        for (const sp of sparks) { ctx.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},80,${1 - (secs() - sp.t) / 0.8})`; ctx.fillRect(sp.x, sp.y, 3, 3); }
        ctx.globalCompositeOperation = "source-over";

        // la jauge de chaleur
        if (step === "heat") {
          const [lo, hi] = WEAPONS[wi].heat, GX = 80, GY = 110, GW = 400;
          const g = ctx.createLinearGradient(GX, 0, GX + GW, 0);
          for (let k = 0; k <= 10; k++) g.addColorStop(k / 10, metal(k / 10));
          ctx.fillStyle = g; ctx.fillRect(GX, GY, GW, 22); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(GX, GY, GW, 22);
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.strokeRect(GX + GW * lo, GY - 4, GW * (hi - lo), 30);
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(GX + GW * temp, GY + 26); ctx.lineTo(GX + GW * temp - 8, GY + 40); ctx.lineTo(GX + GW * temp + 8, GY + 40); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(GX, GY + 48, GW, 8);
          ctx.fillStyle = "#ffd84a"; ctx.fillRect(GX, GY + 48, GW * Math.min(1, inZone / 2.2), 8);
          Ink.word(ctx, "Chauffe : maintiens pour souffler, reste dans le cadre blanc", GX + GW / 2, GY - 24, 15, PAPER, 700, "#1b1b1b");
        } else if (step === "hammer") Ink.word(ctx, "Martelage : frappe quand l'anneau touche la marque", AW / 2, 120, 18, PAPER, 700, "#1b1b1b");
        else if (step === "quench") {
          // repère de couleur pour la trempe
          const k = (secs() - quenchAt) / 3.2;
          Ink.word(ctx, "Trempe : clique quand la lame est couleur cerise !", AW / 2, 120, 18, PAPER, 700, "#1b1b1b");
          ctx.fillStyle = metal(0.55); ctx.beginPath(); ctx.arc(AW / 2 - 140, 160, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
          Ink.word(ctx, "← cerise", AW / 2 - 90, 160, 15, PAPER, 700, "#1b1b1b");
          void k;
        }
        // tableau des pièces forgées
        Ink.word(ctx, `${WEAPONS[wi].name} (${wi + 1} / ${WEAPONS.length})`, AW / 2, 40, 24, "#ffd84a", 800, "#1b1b1b");
        results.forEach((r, i) => Ink.word(ctx, `${r.name} : ${r.q} %`, 980, 60 + i * 26, 15, PAPER, 700, "#1b1b1b"));
        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.1) continue;
          ctx.globalAlpha = 1 - age / 1.1;
          Ink.word(ctx, p.text, p.x, p.y - age * 30, 19, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        if (step === "done") {
          const r = results[results.length - 1];
          Ink.word(ctx, `${r.name} : qualité ${r.q} %`, AW / 2, 240, 34, r.q >= 80 ? "#ffd84a" : PAPER, 800, "#1b1b1b");
          if (secs() - stepAt > 1.6) Ink.word(ctx, "Clic pour la pièce suivante", AW / 2, 280, 15, PAPER, 600, "#1b1b1b");
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
        window.removeEventListener("keyup", onKey);
        window.removeEventListener("pointerup", onUp);
      }
      load(0);
      if (location.hostname === "localhost") {
        window.__forge = {
          state: () => ({ wi, step, temp, mi, ring: step === "hammer" && secs() >= markAt ? ringR() : null, quench: step === "quench" ? (secs() - quenchAt) / 3.2 : null, results, done: step === "done" ? secs() - stepAt : 0 }),
          heatZone: () => WEAPONS[wi].heat,
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
