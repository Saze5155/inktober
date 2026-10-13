// Jour 13 · Viking : « Les haches de Brumefer »
// Lancer de hache sur les boucliers des drakkars, avec le vent du fjord.
// La hache tourne en vol : plantée côté lame, elle rapporte plus que si le manche rebondit.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, AXES = 12, G = 620, SEA = 540, SPIN = 9.5;
  const ORIGIN = { x: 150, y: 452 };

  Games.register(13, {
    title: "Les haches de Brumefer",
    music: "game",
    story: "Au nord du monde, dans les brumes du fjord de Brumefer, des Enxors ont retrouvé des casques à cornes et de vieux drakkars humains. Depuis, ils se prennent pour des vikings. L'épreuve du jour : planter des haches dans les boucliers des bateaux qui passent. Attention au vent… et au sens de la lame.",
    controls: "Clique, tire la souris vers l'arrière comme un lance-pierre, puis relâche. Plus tu tires loin, plus la hache va vite. Le drapeau indique le vent. Une hache plantée côté lame vaut le double.",

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

      // le fjord, dessiné une fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      {
        const b = bg.getContext("2d"), r = Ink.rng(1313);
        const g = b.createLinearGradient(0, 0, 0, SEA);
        g.addColorStop(0, "#3a4a66"); g.addColorStop(0.6, "#8a98a8"); g.addColorStop(1, "#c9c4b4");
        b.fillStyle = g; b.fillRect(0, 0, AW, SEA);
        // aurore boréale
        for (let k = 0; k < 40; k++) Ink.halo(b, k % 2 ? "rgba(120,230,170,.08)" : "rgba(140,200,240,.07)", 300 + k * 18, 70 + Math.sin(k * 0.4) * 30, 60);
        // montagnes en trois plans
        for (const [col, base, amp, seed] of [["#6a7486", 300, 140, 1], ["#4f5868", 380, 110, 2], ["#353c48", 450, 70, 3]]) {
          b.fillStyle = col;
          b.beginPath(); b.moveTo(0, SEA);
          for (let x = 0; x <= AW; x += 25) b.lineTo(x, base - Math.abs(Math.sin(x * 0.006 + seed) * amp) - Math.sin(x * 0.03 + seed * 2) * 12);
          b.lineTo(AW, SEA); b.fill();

        }
        // la mer
        const sg = b.createLinearGradient(0, SEA, 0, AH);
        sg.addColorStop(0, "#3e5a6e"); sg.addColorStop(1, "#1c2a38");
        b.fillStyle = sg; b.fillRect(0, SEA, AW, AH - SEA);
        // le rocher du lanceur et la falaise de droite
        b.fillStyle = "#2b2731";
        b.beginPath(); b.moveTo(0, 480); b.lineTo(210, 478); b.lineTo(250, 530); b.lineTo(270, AH); b.lineTo(0, AH); b.fill();
        b.beginPath(); b.moveTo(AW, 210); b.lineTo(1000, 222); b.lineTo(985, 300); b.lineTo(1010, 420); b.lineTo(1000, SEA + 10); b.lineTo(AW, SEA + 10); b.fill();
        b.fillStyle = "rgba(239,229,208,.5)"; b.fillRect(0, 476, 210, 5); b.fillRect(1000, 207, 100, 5);
        void r;
      }

      // les cibles : trois boucliers sur chaque drakkar, deux sur la falaise
      const boats = [
        { x: 520, base: 520, amp: 70, sp: 0.35, y: SEA - 8, scale: 1, color: "#7a1426", ph: 0 },
        { x: 800, base: 790, amp: 90, sp: 0.5, y: SEA - 2, scale: 0.8, color: "#3e4a8a", ph: 2 },
      ];
      const shields = [];
      boats.forEach((bt, bi) => { for (let k = 0; k < 3; k++) shields.push({ boat: bi, dx: (k - 1) * 46 * bt.scale, dy: -34 * bt.scale, r: 22 * bt.scale, col: ["#e9b04a", "#b3261e", "#5b8c5a"][k] }); });
      shields.push({ fixed: true, x: 1030, y: 160, r: 20, col: "#e0662f" }, { fixed: true, x: 1062, y: 170, r: 20, col: "#5bb3a0" });

      let left = AXES, wind = 0, axe = null, drag = null, hits = 0, planted = 0, bulls = 0, score = 0, ended = 0;
      const stuck = [], pops = [], splashes = [];
      const r = Ink.rng(Math.floor(Math.random() * 1e9));
      const newWind = () => { wind = Math.round((r() * 2 - 1) * 10) / 10; };
      newWind();

      function shieldPos(sh, t) {
        if (sh.fixed) return { x: sh.x, y: sh.y };
        const bt = boats[sh.boat];
        return { x: bt.x + sh.dx, y: bt.y + sh.dy + Math.sin(t * 1.6 + bt.ph) * 4 };
      }
      function updateBoats(t) {
        for (const bt of boats) bt.x = bt.base + Math.sin(t * bt.sp + bt.ph) * bt.amp;
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      const launchVel = (d) => {
        const dx = d.x0 - d.x1, dy = d.y0 - d.y1, len = Math.hypot(dx, dy);
        const power = Math.min(1, len / 240);
        if (len < 8) return null;
        const sp = 320 + power * 640;
        return { vx: (dx / len) * sp, vy: (dy / len) * sp, power };
      };
      canvas.addEventListener("pointerdown", (e) => {
        if (axe || ended || !left) return;
        const m = toArena(e);
        drag = { x0: m.x, y0: m.y, x1: m.x, y1: m.y };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => { if (drag) { const m = toArena(e); drag.x1 = m.x; drag.y1 = m.y; } });
      canvas.addEventListener("pointerup", () => {
        if (!drag) return;
        const v = launchVel(drag);
        drag = null;
        if (!v) return;
        throwAxe(v);
      });
      function throwAxe(v) {
        axe = { x: ORIGIN.x, y: ORIGIN.y, vx: v.vx, vy: v.vy, a: -Math.PI / 2, t: 0 };
        left--;
        Sound.play("flap", 0.8);
      }

      function land(text, color) {
        pops.push({ x: axe.x, y: axe.y - 30, t: secs(), text, color });
        axe = null;
        newWind();
        if (!left || shields.every((sh) => sh.hit)) { ended = secs(); }
      }

      function update(dt, t) {
        updateBoats(t);
        if (ended) { if (secs() - ended > 2.2) finish(); return; }
        if (!axe) return;
        axe.vx += wind * 130 * dt;
        axe.vy += G * dt;
        axe.x += axe.vx * dt; axe.y += axe.vy * dt;
        axe.a += SPIN * dt;
        axe.t += dt;
        for (const sh of shields) {
          if (sh.hit) continue;
          const p = shieldPos(sh, t), d = Math.hypot(p.x - axe.x, p.y - axe.y);
          if (d < sh.r + 8) {
            // la lame pointe-t-elle dans le sens du vol ?
            const sp = Math.hypot(axe.vx, axe.vy), blade = Math.cos(axe.a) * axe.vx / sp + Math.sin(axe.a) * axe.vy / sp;
            const isBlade = blade > 0.2, bull = d < sh.r * 0.4;
            hits++;
            let gain = 150;
            if (isBlade) { planted++; gain += 150; }
            if (bull) { bulls++; gain += 75; }
            score += gain;
            sh.hit = true;
            if (isBlade) stuck.push({ sh, ox: axe.x - p.x, oy: axe.y - p.y, a: axe.a });
            Sound.play(isBlade ? "kick" : "junk");
            if (bull && isBlade) Sound.play("bell", 0.5);
            land(isBlade ? (bull ? `En plein centre ! +${gain}` : `Plantée ! +${gain}`) : `Bonk ! Le manche… +${gain}`, isBlade ? "#e9b04a" : "#cdd6ff");
            return;
          }
        }
        if (axe.y > SEA + 6) {
          splashes.push({ x: axe.x, t: secs() });
          Sound.play("plouf");
          land("Plouf !", "#8fc7e8");
        } else if (axe.x > AW + 40 || axe.x < -40 || axe.y > AH) land("Perdue…", "#cdd6ff");
        else if (axe.x > 1000 && axe.y > 212 && axe.y < SEA) { Sound.play("junk"); land("Dans la falaise !", "#cdd6ff"); }
      }

      function finish() {
        stop();
        score += left * 100;
        api.finish({
          score,
          stars: score >= 1900 ? 3 : score >= 1200 ? 2 : 1,
          lines: [`${hits} boucliers touchés sur ${shields.length}`, `${planted} haches plantées · ${bulls} en plein centre${left ? ` · ${left} haches en rab` : ""}`],
        });
      }

      // ---------- dessin ----------
      function drawAxe(x, y, a, sc = 1) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a); ctx.scale(sc, sc);
        ctx.strokeStyle = "#6b4426"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(14, 0); ctx.stroke();
        ctx.fillStyle = "#b9c2c9"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(26, -16, 24, 0); ctx.quadraticCurveTo(26, 16, 8, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#f2ead8"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(23, -8); ctx.quadraticCurveTo(26, 0, 23, 8); ctx.stroke();
        ctx.restore();
      }
      function drawBoat(bt, t) {
        const bob = Math.sin(t * 1.6 + bt.ph) * 4, roll = Math.sin(t * 1.1 + bt.ph) * 0.03;
        ctx.save();
        ctx.translate(bt.x, bt.y + bob); ctx.rotate(roll); ctx.scale(bt.scale, bt.scale);
        // voile
        ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -190); ctx.stroke();
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        const bulge = 10 + wind * 12;
        ctx.beginPath(); ctx.moveTo(-70, -180); ctx.lineTo(70, -180); ctx.quadraticCurveTo(70 + bulge, -120, 66, -60); ctx.lineTo(-66, -60); ctx.quadraticCurveTo(-70 + bulge, -120, -70, -180); ctx.fill(); ctx.stroke();
        ctx.fillStyle = bt.color;
        for (let k = -2; k <= 2; k += 2) { ctx.beginPath(); ctx.moveTo(k * 22 - 11, -180); ctx.lineTo(k * 22 + 11, -180); ctx.lineTo(k * 22 + 11 + bulge * 0.6, -120); ctx.lineTo(k * 21 + 11, -60); ctx.lineTo(k * 21 - 11, -60); ctx.lineTo(k * 22 - 11 + bulge * 0.6, -120); ctx.fill(); }
        // coque
        ctx.fillStyle = "#6b4426"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-130, -40); ctx.quadraticCurveTo(-120, 10, -60, 14); ctx.lineTo(60, 14); ctx.quadraticCurveTo(120, 10, 130, -40);
        ctx.lineTo(-130, -40); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(29,26,32,.35)"; ctx.lineWidth = 1.5;
        for (const y of [-26, -12, 2]) { ctx.beginPath(); ctx.moveTo(-122, y); ctx.lineTo(122, y); ctx.stroke(); }
        // proue en tête de dragon, poupe en spirale
        ctx.fillStyle = "#6b4426"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(122, -40); ctx.quadraticCurveTo(150, -70, 140, -100); ctx.quadraticCurveTo(162, -104, 166, -90); ctx.lineTo(152, -84); ctx.quadraticCurveTo(156, -60, 132, -36); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.arc(150, -96, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-122, -40); ctx.quadraticCurveTo(-150, -80, -130, -96); ctx.quadraticCurveTo(-112, -100, -118, -82); ctx.stroke();
        // rames
        ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 3;
        for (let k = -3; k <= 3; k++) { const sw = Math.sin(t * 2 + k * 0.4) * 8; ctx.beginPath(); ctx.moveTo(k * 30, -6); ctx.lineTo(k * 30 - 16 + sw, 34); ctx.stroke(); }
        ctx.restore();
      }
      function drawShield(sh, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = sh.hit ? "#8a8478" : sh.col; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, sh.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(239,229,208,.6)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, sh.r * 0.65, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#b9c2c9"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, sh.r * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);
        // brume qui passe
        for (let k = 0; k < 4; k++) Ink.halo(ctx, "rgba(220,225,230,.18)", ((t * 12 + k * 300) % (AW + 400)) - 200, 470 + k * 8, 180);

        for (const bt of [...boats].reverse()) drawBoat(bt, t);
        for (const sh of shields) drawShield(sh, shieldPos(sh, t));
        for (const st of stuck) { const p = shieldPos(st.sh, t); drawAxe(p.x + st.ox, p.y + st.oy, st.a); }
        // vagues
        ctx.strokeStyle = "rgba(239,229,208,.25)"; ctx.lineWidth = 2;
        for (let row = 0; row < 4; row++) {
          ctx.beginPath();
          for (let x = 0; x <= AW; x += 20) { const y = SEA + 10 + row * 34 + Math.sin(x * 0.03 + t * (1.5 + row * 0.3) + row) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
          ctx.stroke();
        }
        for (const sp of splashes) {
          const age = secs() - sp.t;
          if (age > 0.8) continue;
          ctx.fillStyle = `rgba(200,230,245,${1 - age / 0.8})`;
          for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(sp.x + (k - 3) * 6 * (1 + age * 3), SEA - Math.sin((k / 6) * Math.PI) * 40 * age * 2 + age * age * 120, 3, 0, Math.PI * 2); ctx.fill(); }
        }

        // le lanceur viking
        ctx.save();
        ctx.translate(ORIGIN.x - 40, 478);
        ctx.scale(2.2, 2.2);
        Ink.enxor(ctx, 0, 0, t, { seed: 13, color: "#e9b04a", face: 1, wear: { head: "casque", back: "bouclier" } });
        ctx.restore();
        if (!axe && left && !ended) drawAxe(ORIGIN.x, ORIGIN.y, drag ? Math.atan2(drag.y0 - drag.y1, drag.x0 - drag.x1) - Math.PI : -1.2);

        // visée : un bout de trajectoire seulement
        if (drag) {
          const v = launchVel(drag);
          ctx.strokeStyle = "rgba(239,229,208,.5)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
          ctx.beginPath(); ctx.moveTo(drag.x0, drag.y0); ctx.lineTo(drag.x1, drag.y1); ctx.stroke(); ctx.setLineDash([]);
          if (v) {
            ctx.fillStyle = "rgba(255,240,200,.85)";
            for (let k = 1; k <= 9; k++) { const tt = k * 0.045; ctx.beginPath(); ctx.arc(ORIGIN.x + v.vx * tt, ORIGIN.y + v.vy * tt + 0.5 * G * tt * tt, 3.5 - k * 0.25, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = "rgba(27,27,27,.6)"; ctx.fillRect(ORIGIN.x - 50, ORIGIN.y + 60, 100, 10);
            ctx.fillStyle = v.power > 0.85 ? "#e0662f" : "#e9b04a"; ctx.fillRect(ORIGIN.x - 50, ORIGIN.y + 60, 100 * v.power, 10);
          }
        }
        if (axe) drawAxe(axe.x, axe.y, axe.a);

        // le vent : drapeau sur le rocher
        const fx = 230, fy = 380;
        ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx, 480); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = "#b3261e"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        const fl = 18 + Math.abs(wind) * 32, dir = wind >= 0 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        for (let k = 0; k <= 6; k++) ctx.lineTo(fx + dir * fl * (k / 6), fy + Math.sin(t * 8 + k) * (2 + Math.abs(wind) * 2) + (1 - Math.abs(wind)) * k * 2.2);
        ctx.lineTo(fx + dir * fl, fy + 18); ctx.lineTo(fx, fy + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        Ink.word(ctx, wind === 0 ? "Pas de vent" : `Vent ${wind > 0 ? "→" : "←"} ${Math.round(Math.abs(wind) * 10)}`, fx, fy - 18, 15, PAPER, 700, "#1b1b1b");

        // compteurs
        for (let k = 0; k < AXES; k++) { ctx.globalAlpha = k < left ? 1 : 0.2; drawAxe(40 + k * 30, 40, -Math.PI / 2, 0.55); }
        ctx.globalAlpha = 1;
        Ink.word(ctx, `${score} points`, AW / 2, 32, 22, PAPER, 800, "#1b1b1b");
        Ink.word(ctx, `Boucliers : ${hits} / ${shields.length}`, AW / 2, 62, 15, "#e9b04a", 700, "#1b1b1b");
        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.3) continue;
          ctx.globalAlpha = Math.min(1, 1.3 - age);
          Ink.word(ctx, p.text, Math.min(AW - 120, p.x), p.y - age * 30, 19, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        if (ended) Ink.word(ctx, shields.every((sh) => sh.hit) ? "Tous les boucliers ! SKÅL !" : "Plus de haches !", AW / 2, 260, 40, "#e9b04a", 800, "#1b1b1b");
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        // petits pas pour que la hache ne traverse pas les boucliers
        for (let k = 0; k < 3; k++) update(dt / 3, now / 1000);
        if (!running) return;
        render(now / 1000);
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      }
      if (location.hostname === "localhost") {
        // tests : cherche par simulation un lancer qui touche le bouclier visé
        window.__viking = {
          state: () => ({ left, hits, planted, score, flying: !!axe, ended: !!ended }),
          aim() {
            const t0 = performance.now() / 1000;
            const targets = shields.filter((sh) => !sh.hit);
            if (!targets.length) return null;
            let best = null;
            for (let p = 0.2; p <= 1; p += 0.02) for (let ang = -1.45; ang <= 0.1; ang += 0.02) {
              const sp = 320 + p * 640, v = { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
              let x = ORIGIN.x, y = ORIGIN.y, vx = v.vx, vy = v.vy, a = -Math.PI / 2, tt = 0;
              for (let k = 0; k < 400 && y < SEA; k++) {
                const dt = 1 / 180;
                vx += wind * 130 * dt; vy += G * dt; x += vx * dt; y += vy * dt; a += SPIN * dt; tt += dt;
                const bs = boats.map((bt) => bt.base + Math.sin((t0 + tt + 0.05) * bt.sp + bt.ph) * bt.amp);
                const sh = targets.find((q) => {
                  const pp = q.fixed ? q : { x: bs[q.boat] + q.dx, y: boats[q.boat].y + q.dy };
                  return Math.hypot(pp.x - x, pp.y - y) < q.r * 0.5;
                });
                if (sh) { const blade = (Math.cos(a) * vx + Math.sin(a) * vy) / Math.hypot(vx, vy) > 0.4; if (!best || blade > best.blade) best = { vx: v.vx, vy: v.vy, blade }; break; }
              }
              if (best?.blade) break;
            }
            return best;
          },
          throw(v) { throwAxe(v); },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
