// Jour 29 · Fil : « Fil à retordre »
// Des bobines reliées par des fils de laine, tout emmêlés. Déplace les bobines jusqu'à ce qu'aucun fil n'en croise un autre.
// Chaque nœud est construit à partir de droites qui se croisent : il existe toujours une solution sans croisement.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, NODE_R = 15;
  const LEVELS = [4, 5, 6, 7]; // nombre de droites : 6, 10, 15 puis 21 bobines
  const WOOL = ["#d36b9c", "#e0662f", "#5bb3a0", "#3e7cb1", "#e9b04a", "#7d5ba6", "#5b8c5a", "#b3261e"];

  function makeGraph(nLines, r) {
    const lines = Array.from({ length: nLines }, () => { const a = r() * Math.PI, d = (r() - 0.5) * 300; return { nx: Math.cos(a), ny: Math.sin(a), d }; });
    const nodes = [], onLine = lines.map(() => []);
    for (let i = 0; i < nLines; i++) for (let j = i + 1; j < nLines; j++) {
      const A = lines[i], B = lines[j], det = A.nx * B.ny - A.ny * B.nx;
      const x = (A.d * B.ny - A.ny * B.d) / det, y = (A.nx * B.d - A.d * B.nx) / det;
      const id = nodes.length;
      nodes.push({ id, x: 0, y: 0, gx: x, gy: y });
      onLine[i].push({ id, t: -A.ny * x + A.nx * y });
      onLine[j].push({ id, t: -B.ny * x + B.nx * y });
    }
    const edges = [];
    onLine.forEach((list, li) => { list.sort((a, b) => a.t - b.t); for (let k = 1; k < list.length; k++) edges.push({ a: list[k - 1].id, b: list[k].id, c: WOOL[li % WOOL.length] }); });
    // la vraie position (sans croisement), ramenée dans le cadre : sert de solution aux tests
    const xs = nodes.map((n) => n.gx), ys = nodes.map((n) => n.gy), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const k = Math.min(900 / (Math.max(...xs) - x0 || 1), 520 / (Math.max(...ys) - y0 || 1));
    for (const n of nodes) { n.sx = 90 + (n.gx - x0) * k; n.sy = 115 + (n.gy - y0) * k; }
    // on mélange : les bobines sont posées en cercle, dans le désordre
    const order = nodes.map((n) => n.id).sort(() => r() - 0.5);
    order.forEach((id, k) => { const a = (k / nodes.length) * Math.PI * 2; nodes[id].x = 470 + Math.cos(a) * 250; nodes[id].y = 350 + Math.sin(a) * 250; });
    return { nodes, edges };
  }
  function cross(p1, p2, p3, p4) {
    const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && Math.abs(d1) > 1e-6 && Math.abs(d2) > 1e-6 && Math.abs(d3) > 1e-6 && Math.abs(d4) > 1e-6;
  }

  Games.register(29, {
    title: "Fil à retordre",
    music: "inside",
    story: "La grand-mère de Petit Bulot tricotait des écharpes pour tout le hameau. Son panier a été renversé et toutes les bobines sont emmêlées. Démêle-les : déplace les bobines jusqu'à ce qu'aucun fil n'en croise un autre. On dit qu'il y a toujours une façon de tout démêler.",
    controls: "Fais glisser les bobines. Les fils qui se croisent sont tendus et vibrent ; les fils libres sont détendus. Quand plus aucun fil ne se croise, la pelote est démêlée.",

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

      let li = 0, G, drag = null, startAt, moves = 0, solvedAt = 0, crossing = new Set(), results = [];
      function load(i) {
        li = i;
        do G = makeGraph(LEVELS[i], r); while (countCross() === 0);
        startAt = secs(); moves = 0; solvedAt = 0;
      }
      function countCross() {
        crossing = new Set();
        const E = G.edges;
        for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
          const a = E[i], b = E[j];
          if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
          if (cross(G.nodes[a.a], G.nodes[a.b], G.nodes[b.a], G.nodes[b.b])) { crossing.add(i); crossing.add(j); }
        }
        return crossing.size;
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (solvedAt) { if (secs() - solvedAt > 1) next(); return; }
        const n = [...G.nodes].reverse().find((q) => Math.hypot(q.x - m.x, q.y - m.y) < NODE_R + 8);
        if (!n) return;
        drag = { n, dx: n.x - m.x, dy: n.y - m.y };
        canvas.setPointerCapture(e.pointerId);
        Sound.play("tick", 0.4);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const m = toArena(e);
        drag.n.x = Math.max(40, Math.min(AW - 40, m.x + drag.dx));
        drag.n.y = Math.max(90, Math.min(AH - 30, m.y + drag.dy));
        countCross();
      });
      canvas.addEventListener("pointerup", () => {
        if (!drag) return;
        drag = null; moves++;
        if (countCross() === 0) {
          solvedAt = secs();
          results.push({ time: solvedAt - startAt, moves, nodes: G.nodes.length });
          Sound.play("win");
        } else Sound.play("chat", 0.3);
      });
      const onKey = (e) => { if ((e.key === " " || e.key === "Enter") && solvedAt && secs() - solvedAt > 1) next(); };
      window.addEventListener("keydown", onKey);

      function next() {
        if (li + 1 < LEVELS.length) load(li + 1);
        else finish();
      }
      function finish() {
        stop();
        const time = results.reduce((a, b) => a + b.time, 0);
        api.finish({
          score: Math.max(100, Math.round(2400 - time * 6)),
          stars: time <= 150 ? 3 : time <= 300 ? 2 : 1,
          lines: [`Quatre pelotes démêlées en ${Math.round(time)} s`, `${results.reduce((a, b) => a + b.moves, 0)} bobines déplacées`],
        });
      }

      // ---------- dessin ----------
      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // la nappe en tissu de la grand-mère
        ctx.fillStyle = "#e9dcc0"; ctx.fillRect(0, 0, AW, AH);
        ctx.fillStyle = "rgba(179,38,30,.07)";
        for (let x = 0; x < AW; x += 40) ctx.fillRect(x, 0, 20, AH);
        for (let y = 0; y < AH; y += 40) ctx.fillRect(0, y, AW, 20);
        // les fils : détendus (courbes molles) quand ils sont libres, tendus et frémissants quand ils se croisent
        G.edges.forEach((ed, i) => {
          const a = G.nodes[ed.a], b = G.nodes[ed.b], bad = crossing.has(i) && !solvedAt;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + (bad ? Math.sin(t * 30 + i) * 2 : Math.min(30, Math.hypot(a.x - b.x, a.y - b.y) * 0.08));
          ctx.strokeStyle = "rgba(29,26,32,.25)"; ctx.lineWidth = 7; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(a.x, a.y + 2); ctx.quadraticCurveTo(mx, my + 3, b.x, b.y + 2); ctx.stroke();
          ctx.strokeStyle = ed.c; ctx.lineWidth = bad ? 3.5 : 5;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
          if (!bad) { ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
        });
        // les bobines
        for (const n of G.nodes) {
          const lifted = drag?.n === n;
          ctx.save(); ctx.translate(n.x, n.y - (lifted ? 4 : 0));
          ctx.fillStyle = "#c9a24a"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, -9, NODE_R, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#8a6a48"; ctx.fillRect(-NODE_R + 4, -9, NODE_R * 2 - 8, 18); ctx.strokeRect(-NODE_R + 4, -9, NODE_R * 2 - 8, 18);
          ctx.strokeStyle = "rgba(239,229,208,.5)"; ctx.lineWidth = 1; for (let k = -6; k <= 6; k += 4) { ctx.beginPath(); ctx.moveTo(-NODE_R + 5, k); ctx.lineTo(NODE_R - 5, k + 1); ctx.stroke(); }
          ctx.fillStyle = "#c9a24a"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(0, 9, NODE_R, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        // interface
        const el = solvedAt ? solvedAt - startAt : secs() - startAt;
        Ink.word(ctx, `Pelote ${li + 1} / ${LEVELS.length}`, AW / 2, 30, 22, "#7a1426", 800, "#e9dcc0");
        Ink.word(ctx, solvedAt ? "Démêlée !" : `${crossing.size} fil${crossing.size > 1 ? "s" : ""} emmêlé${crossing.size > 1 ? "s" : ""} · ${Math.floor(el)} s`, AW / 2, 62, 16, INK, 700, "#e9dcc0");
        ctx.save(); ctx.translate(1010, 610); ctx.scale(2, 2);
        Ink.enxor(ctx, 0, 0, t, { seed: 29, color: "#d36b9c", face: -1, wear: { back: "pelote" }, emote: solvedAt ? "coeur" : null, et: solvedAt ? (secs() - solvedAt) % 2 : 0 });
        ctx.restore();
        if (solvedAt) {
          for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + t; Ink.heart(ctx, AW / 2 + Math.cos(a) * 200, 360 + Math.sin(a) * 120, 8, WOOL[k % WOOL.length]); }
          Ink.word(ctx, "Pelote démêlée !", AW / 2, 360, 44, "#7a1426", 800, "#e9dcc0");
          if (secs() - solvedAt > 1) Ink.word(ctx, "Clic pour la suivante", AW / 2, 404, 16, INK, 600, "#e9dcc0");
        }
      }

      let raf = 0, running = true;
      function frame(now) {
        if (!running) return;
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
        // tests : où est chaque bobine, et où la poser pour qu'aucun fil ne se croise
        window.__fil = {
          state: () => ({ li, crossings: crossing.size, solved: !!solvedAt }),
          moves() { const b = canvas.getBoundingClientRect(), P = (x, y) => ({ x: b.left + ox + x * s, y: b.top + oy + y * s }); return G.nodes.map((n) => ({ from: P(n.x, n.y), to: P(n.sx, n.sy) })); },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
