// Jour 15 · Enxor : « La première goutte »
// L'origine du monde : l'encre d'un encrier humain renversé coule, et là où elle se rassemble naît un Enxor.
// On dessine des rampes (avec une quantité de crayon limitée), puis on verse : il faut remplir le moule.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, DROPS = 40, NEED = 22, DR = 7, G = 520;

  // walls : planches fixes, blots : buvards qui boivent l'encre, sol : solution pour les tests
  const LEVELS = [
    { src: [200, 100], cup: 850, budget: 900, walls: [], blots: [], sol: [[[140, 190], [800, 460]]] },
    { src: [900, 90], cup: 200, budget: 1000, walls: [], blots: [[430, 330, 160, 50]], sol: [[[960, 170], [400, 280]], [[400, 280], [230, 470]]] },
    { src: [550, 80], cup: 550, budget: 600, walls: [[[420, 250], [550, 222]], [[550, 222], [680, 250]]], blots: [[300, 440, 130, 40], [670, 440, 130, 40]], sol: [[[380, 300], [500, 470]], [[720, 300], [600, 470]]] },
    { src: [150, 100], cup: 150, budget: 520, walls: [[[60, 260], [420, 330]]], blots: [[600, 560, 200, 40]], sol: [[[540, 370], [200, 470]]] },
    { src: [950, 80], cup: 950, budget: 650, walls: [[[620, 120], [620, 330]]], blots: [[860, 250, 180, 40], [540, 520, 200, 40]], sol: [[[1000, 150], [780, 220]], [[720, 300], [900, 470]]] },
  ];
  const CUP_TOP = 520, CUP_BOT = 612, CUP_HALF = 70;

  Games.register(15, {
    title: "La première goutte",
    music: "seuil",
    story: "Quand le dernier humain s'est endormi, son encrier s'est renversé sur la table. L'encre a coulé, goutte après goutte, et là où elle s'est rassemblée… quelque chose a ouvert les yeux. C'était le premier Enxor. Revis sa naissance : guide l'encre jusqu'au moule.",
    controls: "Dessine des rampes à la souris (le crayon s'use). Clic droit : effacer le dernier trait. R : tout effacer. Espace ou bouton « Verser » : renverser l'encrier. Les buvards roses boivent l'encre !",

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

      // la feuille de papier, une fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      {
        const b = bg.getContext("2d"), r = Ink.rng(1515);
        b.fillStyle = "#e9dcc0"; b.fillRect(0, 0, AW, AH);
        b.strokeStyle = "rgba(62,124,177,.15)"; b.lineWidth = 1;
        for (let y = 40; y < AH; y += 32) { b.beginPath(); b.moveTo(0, y); b.lineTo(AW, y); b.stroke(); }
        b.strokeStyle = "rgba(179,38,30,.2)"; b.beginPath(); b.moveTo(70, 0); b.lineTo(70, AH); b.stroke();
        // des mots humains effacés, illisibles
        b.fillStyle = "rgba(29,26,32,.08)";
        for (let y = 60; y < AH; y += 32) for (let x = 90; x < AW - 60; x += 30 + r() * 50) if (r() < 0.6) b.fillRect(x, y - 10, 15 + r() * 40, 4);
        for (let k = 0; k < 12; k++) Ink.halo(b, "rgba(160,120,60,.08)", r() * AW, r() * AH, 60 + r() * 80);
      }

      let simT = 0, li = 0, L, strokes, used, drops, phase, phaseAt, attempts, emitted, results = [], cur = null, inCup = 0, quietSince = 0;
      function load(i) {
        li = i; L = LEVELS[i];
        strokes = []; used = 0; drops = []; phase = "draw"; phaseAt = secs(); attempts = 0; cur = null; inCup = 0;
      }
      const cupSegs = () => {
        const x = L.cup;
        return [[[x - CUP_HALF, CUP_TOP], [x - CUP_HALF, CUP_BOT]], [[x - CUP_HALF, CUP_BOT], [x + CUP_HALF, CUP_BOT]], [[x + CUP_HALF, CUP_BOT], [x + CUP_HALF, CUP_TOP]]];
      };
      function allSegs() {
        const out = [];
        for (const st of strokes) for (let k = 1; k < st.length; k++) out.push([st[k - 1], st[k]]);
        for (const w of L.walls) out.push(w);
        for (const c of cupSegs()) out.push(c);
        return out;
      }
      const strokeLen = (st) => { let n = 0; for (let k = 1; k < st.length; k++) n += Math.hypot(st[k][0] - st[k - 1][0], st[k][1] - st[k - 1][1]); return n; };

      function pour() {
        if (phase !== "draw") return;
        phase = "pour"; phaseAt = secs(); simT = 0; attempts++; emitted = 0; drops = []; inCup = 0; quietSince = 0;
        Sound.play("splash");
      }
      function eraseLast() { if (phase === "draw" && strokes.length) { used -= strokeLen(strokes.pop()); Sound.play("tick"); } }
      function eraseAll() { if (phase === "draw" && strokes.length) { strokes = []; used = 0; Sound.play("tick"); } }

      const BTN = { x: AW - 170, y: 20, w: 150, h: 46 };
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (e.button === 2) return eraseLast();
        if (phase === "won") { if (secs() - phaseAt > 1) next(); return; }
        if (m.x > BTN.x && m.x < BTN.x + BTN.w && m.y > BTN.y && m.y < BTN.y + BTN.h) return pour();
        if (phase !== "draw" || used >= L.budget) return;
        cur = [[m.x, m.y]];
        strokes.push(cur);
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!cur) return;
        const m = toArena(e), lp = cur[cur.length - 1];
        let d = Math.hypot(m.x - lp[0], m.y - lp[1]);
        if (d < 10) return;
        const leftInk = L.budget - used;
        if (leftInk <= 0) return;
        let x = m.x, y = m.y;
        if (d > leftInk) { x = lp[0] + (m.x - lp[0]) * leftInk / d; y = lp[1] + (m.y - lp[1]) * leftInk / d; d = leftInk; }
        cur.push([x, y]); used += d;
        if (Math.random() < 0.3) Sound.play("step", 0.15);
      });
      canvas.addEventListener("pointerup", () => {
        if (cur && cur.length < 2) strokes.pop();
        cur = null;
      });
      const onKey = (e) => {
        if (e.key === " ") { e.preventDefault(); if (phase === "won") next(); else pour(); }
        else if (e.key.toLowerCase() === "r") eraseAll();
        else if (e.key === "Backspace") eraseLast();
        else if (e.key.toLowerCase() === "s" && phase === "draw" && attempts >= 4) { results.push({ score: 0 }); next(); }
      };
      window.addEventListener("keydown", onKey);

      function step(dt) {
        if (phase !== "pour") return;
        simT += dt;
        const el = simT;
        // l'encrier se vide, une goutte après l'autre
        // l'encre part du côté du goulot, tourné vers le moule
        const side = L.cup >= L.src[0] ? 1 : -1;
        while (emitted < DROPS && el > emitted * 0.09) {
          drops.push({ x: L.src[0] + side * 22 + (Math.random() - 0.5) * 6, y: L.src[1] + 12, vx: side * (40 + Math.random() * 20), vy: 0 });
          emitted++;
        }
        const segs = allSegs();
        for (const d of drops) {
          d.vy += G * dt;
          d.x += d.vx * dt; d.y += d.vy * dt;
          for (const [a, b] of segs) {
            const ex = b[0] - a[0], ey = b[1] - a[1], ll = ex * ex + ey * ey || 1;
            const k = Math.max(0, Math.min(1, ((d.x - a[0]) * ex + (d.y - a[1]) * ey) / ll));
            const qx = a[0] + ex * k, qy = a[1] + ey * k, dx = d.x - qx, dy = d.y - qy, dist = Math.hypot(dx, dy);
            const lim = DR + 3;
            if (dist < lim && dist > 0.0001) {
              const nx = dx / dist, ny = dy / dist;
              d.x = qx + nx * lim; d.y = qy + ny * lim;
              const vn = d.vx * nx + d.vy * ny;
              if (vn < 0) { d.vx -= 1.2 * vn * nx; d.vy -= 1.2 * vn * ny; }
              d.vx *= 0.995; d.vy *= 0.995;
              // au fond du moule, l'encre se calme
              if (Math.abs(d.x - L.cup) < CUP_HALF && d.y > CUP_TOP) { d.vx *= 0.85; d.vy *= 0.85; }
            }
          }
        }
        // les gouttes se repoussent un peu : l'encre coule comme un liquide
        for (let i = 0; i < drops.length; i++) for (let j = i + 1; j < drops.length; j++) {
          const a = drops[i], b = drops[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 < (DR * 2) ** 2 && d2 > 0.01) {
            const d = Math.sqrt(d2), push = (DR * 2 - d) / 2, nx = dx / d, ny = dy / d;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          }
        }
        // les buvards boivent, le bord de la feuille aussi
        drops = drops.filter((d) => {
          if (d.y > AH + 30 || d.x < -30 || d.x > AW + 30) return false;
          for (const [x, y, w, h] of L.blots) if (d.x > x && d.x < x + w && d.y > y && d.y < y + h) { (L.stains ||= []).push([d.x, d.y]); return false; }
          return true;
        });
        inCup = drops.filter((d) => Math.abs(d.x - L.cup) < CUP_HALF && d.y > CUP_TOP - 4).length;
      }
      function settle() {
        if (phase !== "pour") return;
        const el = simT;
        if (inCup >= NEED && emitted >= DROPS) {
          phase = "won"; phaseAt = secs();
          const score = Math.max(100, 300 - (attempts - 1) * 70) + Math.round(100 * Math.max(0, L.budget - used) / L.budget);
          results.push({ score, attempts });
          Sound.play("reveal"); Sound.play("win");
          return;
        }
        const moving = drops.some((d) => Math.hypot(d.vx, d.vy) > 25 && !(Math.abs(d.x - L.cup) < CUP_HALF && d.y > CUP_TOP));
        if (emitted >= DROPS && !moving) { if (!quietSince) quietSince = secs(); } else quietSince = 0;
        if ((quietSince && secs() - quietSince > 1) || el > 14) {
          phase = "fail"; phaseAt = secs();
          Sound.play("miss");
        }
      }
      function next() {
        L.stains = [];
        if (li + 1 < LEVELS.length) load(li + 1);
        else finish();
      }
      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0), born = results.filter((r) => r.score).length;
        api.finish({
          score,
          stars: score >= 1700 ? 3 : score >= 1100 ? 2 : 1,
          lines: [`${born} Enxors sont nés`, results.map((r, i) => `${i + 1} : ${r.score ? (r.attempts === 1 ? "du premier coup" : `${r.attempts} essais`) : "passé"}`).join(" · ")],
        });
      }
      function update(dt) {
        for (let k = 0; k < 3; k++) step(dt / 3);
        settle();
        if (phase === "fail" && secs() - phaseAt > 1.6) { drops = []; phase = "draw"; }
        if (phase === "won" && secs() - phaseAt > 4) next();
      }

      // ---------- dessin ----------
      function line(pts, color, w) {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);

        // buvards et leurs taches
        for (const [x, y, w, h] of L.blots) {
          ctx.fillStyle = "#f2c1cf"; ctx.strokeStyle = "#b07a8a"; ctx.lineWidth = 2;
          ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "rgba(179,38,30,.15)"; for (let k = 0; k < w; k += 12) ctx.fillRect(x + k, y, 1.5, h);
        }
        ctx.fillStyle = "rgba(29,26,32,.45)";
        for (const [x, y] of L.stains || []) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
        // planches
        for (const w of L.walls) { line(w, "#4a3426", 12); line(w, "#8a6a48", 7); }
        // le moule en forme de bol
        const cx = L.cup;
        ctx.fillStyle = "rgba(239,229,208,.7)";
        ctx.fillRect(cx - CUP_HALF, CUP_TOP, CUP_HALF * 2, CUP_BOT - CUP_TOP);
        ctx.strokeStyle = "rgba(29,26,32,.2)"; ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
        const fillY = CUP_BOT - (CUP_BOT - CUP_TOP) * (NEED / DROPS) * 0.95;
        ctx.beginPath(); ctx.moveTo(cx - CUP_HALF, fillY); ctx.lineTo(cx + CUP_HALF, fillY); ctx.stroke(); ctx.setLineDash([]);
        line([[cx - CUP_HALF - 4, CUP_TOP - 6], [cx - CUP_HALF, CUP_BOT], [cx + CUP_HALF, CUP_BOT], [cx + CUP_HALF + 4, CUP_TOP - 6]], "#3b3440", 8);
        Ink.word(ctx, `${Math.min(inCup, DROPS)} / ${NEED}`, cx, CUP_BOT + 28, 16, inCup >= NEED ? "#2f6b3a" : "#3b3440", 800);

        // traits de crayon
        for (const st of strokes) { line(st, "#5a5560", 6); line(st, "#8a8590", 2); }

        // l'encrier humain, renversé
        const [sx, sy] = L.src;
        ctx.save();
        ctx.translate(sx, sy); ctx.scale(L.cup >= sx ? 1 : -1, 1); ctx.rotate(phase === "draw" ? 0.2 : 1.1);
        ctx.fillStyle = "rgba(170,200,220,.8)"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(-26, -30, 52, 46, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#3b3440"; ctx.fillRect(-14, -42, 28, 12); ctx.strokeRect(-14, -42, 28, 12);
        ctx.fillStyle = INK; ctx.fillRect(-23, -6, 46, 19);
        ctx.restore();
        if (phase === "draw") Ink.word(ctx, "encrier", sx, sy - 58, 14, "#6b6170", 700);

        // l'encre
        ctx.fillStyle = INK;
        for (const d of drops) { ctx.beginPath(); ctx.arc(d.x, d.y, DR + 1.5, 0, Math.PI * 2); ctx.fill(); }

        // naissance
        if (phase === "won") {
          const k = Math.min(1, (secs() - phaseAt) / 1.2);
          ctx.save();
          ctx.translate(cx, CUP_TOP + 40 - k * 60);
          ctx.scale(1.4 + k * 1.2, 1.4 + k * 1.2);
          Ink.enxor(ctx, 0, 0, t, { seed: 15 + li, color: ["#e9b04a", "#5bb3a0", "#d36b9c", "#3e7cb1", "#e0662f"][li], face: 1, emote: k >= 1 ? "coeur" : "surprise", et: (secs() - phaseAt) % 2.4 });
          ctx.restore();
          Ink.word(ctx, "Un Enxor est né !", AW / 2, 250, 40, "#3b3440", 800);
        }
        if (phase === "fail") Ink.word(ctx, "Pas assez d'encre dans le moule… redessine et reverse !", AW / 2, 250, 24, "#7a1426", 800);

        // interface
        const canPour = phase === "draw";
        ctx.fillStyle = canPour ? "#3b3440" : "#8a8478";
        ctx.beginPath(); ctx.roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 10); ctx.fill();
        Ink.word(ctx, "Verser", BTN.x + BTN.w / 2, BTN.y + BTN.h / 2, 21, PAPER, 800, "#3b3440");
        Ink.word(ctx, `Goutte ${li + 1} / ${LEVELS.length}`, 160, 34, 20, "#3b3440", 800);
        ctx.fillStyle = "rgba(29,26,32,.15)"; ctx.fillRect(90, 54, 200, 10);
        const left = Math.max(0, 1 - used / L.budget);
        ctx.fillStyle = left < 0.2 ? "#b3261e" : "#5a5560"; ctx.fillRect(90, 54, 200 * left, 10);
        Ink.word(ctx, "crayon", 330, 59, 13, "#6b6170", 700);
        if (attempts >= 4 && phase === "draw") Ink.word(ctx, "S : passer cette goutte", AW / 2, AH - 24, 15, "#6b6170", 700);
        if (li === 0 && !strokes.length && phase === "draw") Ink.word(ctx, "Dessine une rampe de l'encrier jusqu'au moule, puis « Verser »", AW / 2, 160, 20, "#3b3440", 700);
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.033, (now - last) / 1000);
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
        window.__goutte = {
          state: () => ({ li, phase, inCup, attempts, used: Math.round(used) }),
          sol() {
            const b = canvas.getBoundingClientRect();
            return LEVELS[li].sol.map((seg) => seg.map(([x, y]) => ({ x: b.left + ox + x * s, y: b.top + oy + y * s })));
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
