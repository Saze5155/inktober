// Jour 25 · Sticker : « L'album d'autocollants »
// Décoller chaque sticker de sa planche et le coller pile dans sa silhouette : bonne place, bon angle.
// Une fois collé, c'est collé. Trois pages d'album.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, SZ = 34;

  // les formes, dessinées autour de (0, 0), rayon ~ SZ
  const SHAPES = {
    etoile: { color: "#f2c94c", path(c) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? SZ * 0.45 : SZ; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); } },
    coeur: { color: "#d36b9c", path(c) { c.beginPath(); c.moveTo(0, SZ * 0.85); c.bezierCurveTo(-SZ * 1.3, -SZ * 0.1, -SZ * 0.6, -SZ * 1.05, 0, -SZ * 0.4); c.bezierCurveTo(SZ * 0.6, -SZ * 1.05, SZ * 1.3, -SZ * 0.1, 0, SZ * 0.85); c.closePath(); } },
    lune: { color: "#fff1b0", path(c) { c.beginPath(); c.arc(0, 0, SZ, Math.PI * 0.3, Math.PI * 1.7, false); c.arc(SZ * 0.45, 0, SZ * 0.8, Math.PI * 1.6, Math.PI * 0.4, true); c.closePath(); } },
    goutte: { color: "#3e7cb1", path(c) { c.beginPath(); c.moveTo(0, -SZ); c.quadraticCurveTo(SZ * 0.9, SZ * 0.1, 0, SZ * 0.8); c.quadraticCurveTo(-SZ * 0.9, SZ * 0.1, 0, -SZ); c.closePath(); } },
    poisson: { color: "#e0662f", path(c) { c.beginPath(); c.ellipse(SZ * 0.15, 0, SZ * 0.75, SZ * 0.45, 0, 0, Math.PI * 2); c.moveTo(-SZ * 0.5, 0); c.lineTo(-SZ, -SZ * 0.45); c.lineTo(-SZ, SZ * 0.45); c.closePath(); } },
    champi: { color: "#b3261e", path(c) { c.beginPath(); c.moveTo(-SZ, 0); c.quadraticCurveTo(0, -SZ * 1.4, SZ, 0); c.lineTo(SZ * 0.3, 0); c.lineTo(SZ * 0.35, SZ * 0.85); c.lineTo(-SZ * 0.35, SZ * 0.85); c.lineTo(-SZ * 0.3, 0); c.closePath(); } },
    eclair: { color: "#e9b04a", path(c) { c.beginPath(); c.moveTo(SZ * 0.2, -SZ); c.lineTo(-SZ * 0.55, SZ * 0.1); c.lineTo(-SZ * 0.05, SZ * 0.1); c.lineTo(-SZ * 0.25, SZ); c.lineTo(SZ * 0.6, -SZ * 0.15); c.lineTo(SZ * 0.05, -SZ * 0.15); c.closePath(); } },
    enxor: { color: "#2b2731", path(c) { c.beginPath(); c.arc(0, -SZ * 0.1, SZ * 0.8, Math.PI, 0); for (let k = 0; k <= 4; k++) c.lineTo(SZ * 0.8 - k * SZ * 0.4, SZ * (k % 2 ? 0.55 : 0.85)); c.closePath(); } },
    trefle: { color: "#5b8c5a", path(c) { c.beginPath(); for (const [dx, dy] of [[0, -0.45], [-0.45, 0.05], [0.45, 0.05]]) { c.moveTo(dx * SZ + SZ * 0.42, dy * SZ); c.arc(dx * SZ, dy * SZ, SZ * 0.42, 0, Math.PI * 2); } c.rect(-SZ * 0.07, 0, SZ * 0.14, SZ); } },
    crocs: { color: "#5bb3a0", path(c) { c.beginPath(); c.moveTo(-SZ, SZ * 0.4); c.lineTo(SZ * 0.8, SZ * 0.4); c.quadraticCurveTo(SZ * 1.1, SZ * 0.2, SZ * 0.9, -SZ * 0.2); c.quadraticCurveTo(SZ * 0.5, -SZ * 0.7, -SZ * 0.2, -SZ * 0.6); c.quadraticCurveTo(-SZ * 1.05, -SZ * 0.5, -SZ, SZ * 0.4); c.closePath(); } },
  };
  // décors par-dessus le sticker (yeux, trous…)
  function details(c, id) {
    c.fillStyle = INK;
    if (id === "enxor") { c.fillStyle = PAPER; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * SZ * 0.28, -SZ * 0.15, SZ * 0.16, 0, Math.PI * 2); c.fill(); } c.fillStyle = INK; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * SZ * 0.28, -SZ * 0.12, SZ * 0.08, 0, Math.PI * 2); c.fill(); } }
    else if (id === "poisson") { c.beginPath(); c.arc(SZ * 0.55, -SZ * 0.08, SZ * 0.08, 0, Math.PI * 2); c.fill(); }
    else if (id === "champi") { c.fillStyle = PAPER; for (const [dx, dy] of [[-0.45, -0.3], [0.1, -0.55], [0.5, -0.2]]) { c.beginPath(); c.arc(dx * SZ, dy * SZ, SZ * 0.13, 0, Math.PI * 2); c.fill(); } }
    else if (id === "crocs") { c.fillStyle = "#3f8a7a"; for (const [dx, dy] of [[0.1, -0.3], [0.4, -0.15], [0.6, 0.05], [0.25, 0.05]]) { c.beginPath(); c.arc(dx * SZ, dy * SZ, SZ * 0.08, 0, Math.PI * 2); c.fill(); } }
    else if (id === "etoile" || id === "coeur") { c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(-SZ * 0.25, -SZ * 0.25, SZ * 0.14, SZ * 0.08, -0.6, 0, Math.PI * 2); c.fill(); }
  }
  const PAGES = [
    { title: "Page 1 · Le ciel", ids: ["etoile", "lune", "coeur", "eclair", "goutte"] },
    { title: "Page 2 · La mer et la forêt", ids: ["poisson", "champi", "trefle", "goutte", "etoile"] },
    { title: "Page 3 · Les amis", ids: ["enxor", "crocs", "coeur", "poisson", "lune"] },
  ];

  Games.register(25, {
    title: "L'album d'autocollants",
    music: "day",
    story: "Petit Bulot a retrouvé un album d'autocollants humain, à moitié rempli. Les silhouettes sont dessinées en pointillés, et les planches de stickers sont intactes. Aide-le à finir l'album : chaque sticker doit tomber pile dans sa forme… et attention, une fois collé, impossible de le décoller.",
    controls: "Glisse un sticker de la planche jusqu'à sa silhouette. Molette ou Q / E pour le faire tourner pendant que tu le tiens. Relâche pour coller.",

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
      const r = Ink.rng(Math.floor(Math.random() * 1e9));

      let pi = 0, slots, stickers, held = null, mouse = { x: 0, y: 0 }, pageAt = secs(), results = [], pops = [], turnedAt = 0;
      function load(i) {
        pi = i;
        const P = PAGES[i];
        // silhouettes réparties sur la page de gauche, sans se chevaucher
        slots = [];
        for (const id of P.ids) {
          let x, y, tries = 0;
          do { x = 120 + r() * 500; y = 150 + r() * 420; tries++; } while (tries < 200 && slots.some((q) => Math.hypot(q.x - x, q.y - y) < 120));
          slots.push({ id, x, y, a: Math.round((r() * 2 - 1) * 9) * 10 * (Math.PI / 180), filled: null });
        }
        // planche à droite, dans le désordre, chacun avec un angle de départ
        stickers = [...P.ids].sort(() => r() - 0.5).map((id, k) => ({ id, hx: 820 + (k % 2) * 140, hy: 170 + Math.floor(k / 2) * 140, x: 0, y: 0, a: 0, placed: false }));
        for (const st of stickers) { st.x = st.hx; st.y = st.hy; }
        pageAt = secs();
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => {
        mouse = toArena(e);
        if (turnedAt) return;
        const st = [...stickers].reverse().find((q) => !q.placed && Math.hypot(q.x - mouse.x, q.y - mouse.y) < SZ);
        if (!st) return;
        held = { st, dx: st.x - mouse.x, dy: st.y - mouse.y };
        stickers.splice(stickers.indexOf(st), 1); stickers.push(st);
        canvas.setPointerCapture(e.pointerId);
        Sound.play("chat", 0.5);
      });
      canvas.addEventListener("pointermove", (e) => {
        mouse = toArena(e);
        if (held) { held.st.x = mouse.x + held.dx; held.st.y = mouse.y + held.dy; }
      });
      canvas.addEventListener("wheel", (e) => { if (held) { e.preventDefault(); held.st.a += Math.sign(e.deltaY) * (5 * Math.PI / 180); } }, { passive: false });
      const onKey = (e) => {
        if (!held) return;
        if (e.key.toLowerCase() === "q") held.st.a -= 15 * Math.PI / 180;
        if (e.key.toLowerCase() === "e") held.st.a += 15 * Math.PI / 180;
      };
      window.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerup", () => {
        if (!held) return;
        const st = held.st;
        held = null;
        // la silhouette la plus proche de la même forme, encore libre
        const slot = slots.filter((q) => !q.filled && q.id === st.id).sort((a, b) => Math.hypot(a.x - st.x, a.y - st.y) - Math.hypot(b.x - st.x, b.y - st.y))[0];
        if (slot && Math.hypot(slot.x - st.x, slot.y - st.y) < 60) {
          // collé ! on note la précision : distance et angle
          let da = Math.abs(((st.a - slot.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 180 / Math.PI;
          if (st.id === "etoile") da = Math.min(da, Math.abs(da - 72), Math.abs(da - 144)); // une étoile est pareille tous les 72°
          const dist = Math.hypot(slot.x - st.x, slot.y - st.y);
          const pct = Math.max(5, Math.round(100 - dist * 2.2 - da * 1.4));
          st.placed = true; slot.filled = st; st.pct = pct;
          results.push(pct);
          pops.push({ x: slot.x, y: slot.y - 50, t: secs(), text: pct >= 90 ? "Parfait !" : pct >= 70 ? "Bien collé" : "Un peu de travers…", color: pct >= 90 ? "#2f8a4a" : pct >= 70 ? "#3e7cb1" : "#c9874a" });
          Sound.play(pct >= 90 ? "bell" : "drop", 0.6);
          if (slots.every((q) => q.filled)) { turnedAt = secs(); Sound.play("win"); }
        } else {
          // pas à sa place : il retourne sur la planche
          st.x = st.hx; st.y = st.hy;
          if (slot && Math.hypot(slot.x - st.x, slot.y - st.y) >= 60 && st.x < 720) pops.push({ x: mouse.x, y: mouse.y - 30, t: secs(), text: "Pas sa place !", color: "#b3261e" });
        }
      });

      function update() {
        if (turnedAt && secs() - turnedAt > 1.8) {
          turnedAt = 0;
          if (pi + 1 < PAGES.length) load(pi + 1);
          else finish();
        }
      }
      function finish() {
        stop();
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        api.finish({
          score: Math.round(avg * 15),
          stars: avg >= 85 ? 3 : avg >= 65 ? 2 : 1,
          lines: [`Précision moyenne : ${Math.round(avg)} %`, `${results.filter((p) => p >= 90).length} stickers parfaits sur ${results.length}`],
        });
      }

      // ---------- dessin ----------
      function drawSticker(id, x, y, a, o = {}) {
        const S = SHAPES[id];
        ctx.save();
        ctx.translate(x, y); ctx.rotate(a);
        if (o.lift) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10; ctx.scale(1.06, 1.06); }
        // la bordure blanche du sticker
        S.path(ctx); ctx.lineJoin = "round"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 10; ctx.stroke();
        ctx.shadowColor = "transparent";
        S.path(ctx); ctx.fillStyle = S.color; ctx.fill();
        details(ctx, id);
        S.path(ctx); ctx.strokeStyle = "rgba(29,26,32,.5)"; ctx.lineWidth = 1.5; ctx.stroke();
        // reflet brillant
        if (!o.flat) { ctx.save(); S.path(ctx); ctx.clip(); ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(-SZ, -SZ, SZ * 2, SZ * 0.6); ctx.restore(); }
        ctx.restore();
      }
      function drawSlot(q) {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
        SHAPES[q.id].path(ctx);
        ctx.fillStyle = "rgba(29,26,32,.06)"; ctx.fill();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(29,26,32,.45)"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le bureau et l'album ouvert
        ctx.fillStyle = "#6b4a32"; ctx.fillRect(0, 0, AW, AH);
        ctx.fillStyle = "#3e4a8a"; ctx.beginPath(); ctx.roundRect(30, 40, 680, 610, 14); ctx.fill();
        ctx.fillStyle = "#f6efdc"; ctx.beginPath(); ctx.roundRect(46, 56, 648, 578, 8); ctx.fill();
        ctx.strokeStyle = "rgba(62,124,177,.12)"; ctx.lineWidth = 1;
        for (let x = 70; x < 690; x += 24) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 630); ctx.stroke(); }
        for (let y = 80; y < 630; y += 24) { ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(690, y); ctx.stroke(); }
        Ink.word(ctx, PAGES[pi].title, 370, 95, 24, "#3e4a8a", 800, "#f6efdc");
        // la planche de stickers
        ctx.fillStyle = "#e9e3d4"; ctx.beginPath(); ctx.roundRect(740, 90, 330, 470, 12); ctx.fill();
        ctx.strokeStyle = "rgba(29,26,32,.25)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        Ink.word(ctx, "Planche", 905, 115, 15, "#6b6170", 700, "#e9e3d4");
        for (const st of stickers) if (!st.placed && st !== held?.st) { ctx.fillStyle = "rgba(29,26,32,.08)"; ctx.beginPath(); ctx.arc(st.hx, st.hy, SZ + 10, 0, Math.PI * 2); ctx.fill(); }

        for (const q of slots) if (!q.filled) drawSlot(q);
        for (const st of stickers) if (st.placed) drawSticker(st.id, st.x, st.y, st.a, { flat: true });
        for (const st of stickers) if (!st.placed && st !== held?.st) drawSticker(st.id, st.x, st.y, st.a);
        if (held) {
          const st = held.st;
          // aide : la silhouette visée s'illumine quand on est assez près
          const slot = slots.filter((q) => !q.filled && q.id === st.id).sort((a, b) => Math.hypot(a.x - st.x, a.y - st.y) - Math.hypot(b.x - st.x, b.y - st.y))[0];
          if (slot && Math.hypot(slot.x - st.x, slot.y - st.y) < 60) Ink.halo(ctx, "rgba(255,216,74,.45)", slot.x, slot.y, 60);
          drawSticker(st.id, st.x, st.y, st.a, { lift: true });
        }
        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.2) continue;
          ctx.globalAlpha = 1 - age / 1.2;
          Ink.word(ctx, p.text, p.x, p.y - age * 30, 18, p.color, 800, PAPER);
          ctx.globalAlpha = 1;
        }
        // interface
        const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
        Ink.word(ctx, `Précision ${avg} %`, 905, 600, 20, PAPER, 800, "#1b1b1b");
        Ink.word(ctx, `Page ${pi + 1} / ${PAGES.length}`, 905, 632, 14, "#e9e3d4", 700, "#1b1b1b");
        if (pi === 0 && results.length === 0 && !held) Ink.word(ctx, "Glisse un sticker dans sa silhouette (molette pour tourner)", 370, 615, 16, "#3e4a8a", 700, "#f6efdc");
        if (turnedAt) Ink.word(ctx, "Page terminée !", 370, 340, 40, "#d36b9c", 800, "#f6efdc");
      }

      let raf = 0, running = true;
      function frame(now) {
        if (!running) return;
        update();
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
        window.__album = {
          state: () => ({ pi, results }),
          // pour chaque sticker encore sur la planche : d'où le prendre, où le poser, combien de crans de molette
          plan() {
            const b = canvas.getBoundingClientRect(), P = (x, y) => ({ x: b.left + ox + x * s, y: b.top + oy + y * s });
            const used = new Set();
            return stickers.filter((st) => !st.placed).map((st) => {
              const slot = slots.find((q) => !q.filled && q.id === st.id && !used.has(q));
              used.add(slot);
              return { from: P(st.x, st.y), to: P(slot.x + 3, slot.y - 2), clicks: Math.round(((slot.a - st.a) * 180 / Math.PI) / 5) };
            });
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
