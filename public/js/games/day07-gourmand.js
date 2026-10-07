// Jour 7 · Gourmand : « Le bento de Mère Varech »
// Puzzle de rangement : remplir chaque boîte à bento avec tous les aliments, sans trou ni débordement.
// Chaque boîte est découpée au hasard (graine fixe) : elle a donc toujours une solution.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, CELL = 70;
  const SIZES = [[3, 3], [4, 3], [4, 4], [5, 4], [5, 5]];
  const PAR = [15, 20, 30, 40, 55];
  const FOODS = [
    { name: "onigiri", base: "#f2ead8", dot: "#1d1a20" },
    { name: "tamago", base: "#f2c94c", dot: "#d9a42b" },
    { name: "saumon", base: "#f08a5d", dot: "#f8d6c4" },
    { name: "brocoli", base: "#5b8c5a", dot: "#3f6b3a" },
    { name: "saucisse", base: "#c94f3d", dot: "#f2ead8" },
    { name: "carotte", base: "#e0662f", dot: "#f2b88a" },
    { name: "riz rose", base: "#f2c1cf", dot: "#d36b9c" },
    { name: "algue", base: "#2f4a3a", dot: "#7cd15a" },
  ];

  // découpe une boîte en morceaux de 2 à `maxSize` cases
  function partition(w, h, maxSize, r) {
    const owner = Array.from({ length: h }, () => Array(w).fill(-1));
    const pieces = [];
    const nbrs = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < w && b < h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (owner[y][x] !== -1) continue;
        const id = pieces.length, cells = [[x, y]];
        owner[y][x] = id;
        const target = 2 + Math.floor(r() * (maxSize - 1));
        while (cells.length < target) {
          const options = cells.flatMap(([cx, cy]) => nbrs(cx, cy)).filter(([a, b]) => owner[b][a] === -1);
          if (!options.length) break;
          const [nx, ny] = options[Math.floor(r() * options.length)];
          owner[ny][nx] = id;
          cells.push([nx, ny]);
        }
        pieces.push(cells);
      }
    }
    // un morceau d'une seule case est collé à un voisin
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].length !== 1) continue;
      const [[x, y]] = pieces[i];
      const n = nbrs(x, y).map(([a, b]) => owner[b][a]).find((o) => o !== i && pieces[o].length);
      if (n === undefined) continue;
      pieces[n].push([x, y]);
      owner[y][x] = n;
      pieces[i] = [];
    }
    return pieces.filter((p) => p.length);
  }

  const normalize = (cells) => {
    const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my]);
  };
  const rotate = (cells) => normalize(cells.map(([x, y]) => [-y, x]));

  function drawFoodCell(ctx, x, y, food, seed) {
    const s = CELL - 6;
    ctx.fillStyle = food.base;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = food.dot;
    const r = Ink.rng(seed);
    if (food.name === "onigiri") ctx.fillRect(x + 3, y + s * 0.6, s, s * 0.35);
    else if (food.name === "brocoli") for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + 12 + r() * (s - 18), y + 12 + r() * (s - 18), 7, 0, Math.PI * 2); ctx.fill(); }
    else if (food.name === "saumon") for (let k = 0; k < 3; k++) { ctx.fillRect(x + 8, y + 14 + k * 16, s - 10, 4); }
    else for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + 12 + r() * (s - 18), y + 12 + r() * (s - 18), 3.5, 0, Math.PI * 2); ctx.fill(); }
  }

  Games.register(7, {
    title: "Le bento de Mère Varech",
    music: "rive",
    story: "Les humains mangeaient dans des boîtes à compartiments, bien rangées, bien serrées. Au marché de Rive-Basse, Mère Varech a retrouvé cinq vieilles boîtes à bento et beaucoup trop de nourriture. Aide-la à tout faire rentrer, sans rien laisser dépasser ni aucun trou.",
    controls: "Glisse les aliments avec la souris. Clic droit, molette ou R pour les faire tourner pendant que tu les tiens. Un aliment posé peut être repris.",

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

      let li = 0, W, H, BX, BY, pieces, grab = null, mouse = { x: 0, y: 0 }, startAt, won = 0, results = [];
      const secs = () => performance.now() / 1000;

      function load(i) {
        li = i;
        [W, H] = SIZES[i];
        BX = 90 + (5 - W) * CELL / 2;
        BY = 170 + (5 - H) * CELL / 2;
        const r = Ink.rng(7001 + i * 37);
        const parts = partition(W, H, i < 2 ? 3 : 4, r);
        // les morceaux sont mélangés et tournés au hasard, puis posés sur le plateau de droite
        pieces = parts.map((cells, k) => {
          let c = normalize(cells);
          const sol = { cells: c, x: Math.min(...cells.map((q) => q[0])), y: Math.min(...cells.map((q) => q[1])) };
          for (let t = Math.floor(r() * 4); t > 0; t--) c = rotate(c);
          return { cells: c, food: FOODS[k % FOODS.length], placed: null, x: 0, y: 0, seed: k * 13 + i, sol };
        });
        layoutTray();
        startAt = secs();
        won = 0;
      }

      // range les aliments non posés sur le plateau
      function layoutTray() {
        let x = 560, y = 120, rowH = 0;
        for (const p of pieces) {
          if (p.placed) continue;
          const pw = (Math.max(...p.cells.map((c) => c[0])) + 1) * CELL * 0.8, ph = (Math.max(...p.cells.map((c) => c[1])) + 1) * CELL * 0.8;
          if (x + pw > 1060) { x = 560; y += rowH + 20; rowH = 0; }
          p.x = x; p.y = y;
          x += pw + 20;
          rowH = Math.max(rowH, ph);
        }
      }

      const occupied = (except) => {
        const g = Array.from({ length: H }, () => Array(W).fill(false));
        for (const p of pieces) if (p !== except && p.placed) for (const [cx, cy] of p.cells) g[p.placed.y + cy][p.placed.x + cx] = true;
        return g;
      };

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };

      function pieceAt(m) {
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i];
          const sc = p.placed ? 1 : 0.8;
          const px = p.placed ? BX + p.placed.x * CELL : p.x, py = p.placed ? BY + p.placed.y * CELL : p.y;
          for (const [cx, cy] of p.cells) {
            if (m.x >= px + cx * CELL * sc && m.x < px + (cx + 1) * CELL * sc && m.y >= py + cy * CELL * sc && m.y < py + (cy + 1) * CELL * sc) {
              return { p, cell: [cx, cy] };
            }
          }
        }
        return null;
      }

      function turn() {
        if (!grab) return;
        const p = grab.p;
        const before = p.cells.findIndex(([x, y]) => x === grab.cell[0] && y === grab.cell[1]);
        // on fait tourner autour de la case tenue
        const raw = p.cells.map(([x, y]) => [-y, x]);
        const mx = Math.min(...raw.map((c) => c[0])), my = Math.min(...raw.map((c) => c[1]));
        p.cells = raw.map(([x, y]) => [x - mx, y - my]);
        grab.cell = p.cells[before];
        Sound.play("tick");
      }

      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("pointerdown", (e) => {
        if (won) return;
        const m = toArena(e);
        if (e.button === 2) return turn();
        const hit = pieceAt(m);
        if (!hit) return;
        hit.p.placed = null;
        grab = hit;
        pieces.splice(pieces.indexOf(hit.p), 1);
        pieces.push(hit.p);
        mouse = m;
        canvas.setPointerCapture(e.pointerId);
        Sound.play("click");
      });
      canvas.addEventListener("pointermove", (e) => { mouse = toArena(e); });
      canvas.addEventListener("wheel", (e) => { if (grab) { e.preventDefault(); turn(); } }, { passive: false });
      canvas.addEventListener("pointerup", () => {
        if (!grab) return;
        const p = grab.p;
        // case de la boîte sous la souris = case tenue
        const gx = Math.floor((mouse.x - BX) / CELL) - grab.cell[0], gy = Math.floor((mouse.y - BY) / CELL) - grab.cell[1];
        const occ = occupied(p);
        const fits = p.cells.every(([cx, cy]) => {
          const x = gx + cx, y = gy + cy;
          return x >= 0 && y >= 0 && x < W && y < H && !occ[y][x];
        });
        if (fits) {
          p.placed = { x: gx, y: gy };
          Sound.play("drop");
        } else {
          p.x = mouse.x - grab.cell[0] * CELL * 0.8 - CELL * 0.4;
          p.y = mouse.y - grab.cell[1] * CELL * 0.8 - CELL * 0.4;
          if (p.x < 520 || p.x > AW - 60 || p.y < 0 || p.y > AH - 60) layoutTray();
        }
        grab = null;
        checkWin();
      });
      function checkWin() {
        if (won || !occupied(null).every((row) => row.every(Boolean))) return;
        const t = secs() - startAt;
        // 200 pour le bento, + jusqu'à 200 si on reste sous le temps de Mère Varech
        results.push({ t, score: 200 + Math.max(0, Math.round(200 - Math.max(0, t - PAR[li]) * 5)) });
        won = secs();
        Sound.play("win");
      }
      const onKey = (e) => { if (e.key.toLowerCase() === "r") turn(); };
      window.addEventListener("keydown", onKey);

      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0);
        api.finish({
          score,
          stars: score >= 1600 ? 3 : score >= 1250 ? 2 : 1,
          lines: [`5 bentos remplis`, results.map((r, i) => `B${i + 1} : ${Math.round(r.t)} s`).join(" · ")],
        });
      }

      function drawPiece(p, px, py, sc, lifted) {
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(sc, sc);
        if (lifted) { ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8; }
        for (const [cx, cy] of p.cells) drawFoodCell(ctx, cx * CELL, cy * CELL, p.food, p.seed + cx * 7 + cy);
        ctx.restore();
        // contour du morceau
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(sc, sc);
        const has = (x, y) => p.cells.some((c) => c[0] === x && c[1] === y);
        ctx.beginPath();
        for (const [cx, cy] of p.cells) {
          const x = cx * CELL, y = cy * CELL;
          if (!has(cx, cy - 1)) { ctx.moveTo(x, y + 2); ctx.lineTo(x + CELL, y + 2); }
          if (!has(cx, cy + 1)) { ctx.moveTo(x, y + CELL - 2); ctx.lineTo(x + CELL, y + CELL - 2); }
          if (!has(cx - 1, cy)) { ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y + CELL); }
          if (!has(cx + 1, cy)) { ctx.moveTo(x + CELL - 2, y); ctx.lineTo(x + CELL - 2, y + CELL); }
        }
        ctx.lineCap = "round";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // l'étal du marché
        ctx.fillStyle = "#8a6a48";
        ctx.fillRect(0, 0, AW, AH);
        ctx.strokeStyle = "rgba(29,26,32,.25)";
        for (let y = 0; y < AH; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(AW, y); ctx.stroke(); }
        // la boîte à bento
        ctx.fillStyle = "#7a1426";
        ctx.beginPath(); ctx.roundRect(BX - 22, BY - 22, W * CELL + 44, H * CELL + 44, 20); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#2b1d1a";
        ctx.fillRect(BX, BY, W * CELL, H * CELL);
        ctx.strokeStyle = "rgba(239,229,208,.08)"; ctx.lineWidth = 1;
        for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(BX + x * CELL, BY); ctx.lineTo(BX + x * CELL, BY + H * CELL); ctx.stroke(); }
        for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(BX, BY + y * CELL); ctx.lineTo(BX + W * CELL, BY + y * CELL); ctx.stroke(); }
        // le plateau
        ctx.fillStyle = "rgba(242,234,216,.15)";
        ctx.beginPath(); ctx.roundRect(540, 100, 540, 540, 18); ctx.fill();

        for (const p of pieces) {
          if (grab && grab.p === p) continue;
          if (p.placed) drawPiece(p, BX + p.placed.x * CELL, BY + p.placed.y * CELL, 1, false);
          else drawPiece(p, p.x, p.y, 0.8, false);
        }
        if (grab) {
          const gx = Math.floor((mouse.x - BX) / CELL) - grab.cell[0], gy = Math.floor((mouse.y - BY) / CELL) - grab.cell[1];
          const occ = occupied(grab.p);
          const fits = grab.p.cells.every(([cx, cy]) => { const x = gx + cx, y = gy + cy; return x >= 0 && y >= 0 && x < W && y < H && !occ[y][x]; });
          if (fits) {
            ctx.fillStyle = "rgba(143,209,138,.35)";
            for (const [cx, cy] of grab.p.cells) ctx.fillRect(BX + (gx + cx) * CELL, BY + (gy + cy) * CELL, CELL, CELL);
          }
          drawPiece(grab.p, mouse.x - grab.cell[0] * CELL - CELL / 2, mouse.y - grab.cell[1] * CELL - CELL / 2, 1, true);
        }

        Ink.word(ctx, `Bento ${li + 1} / ${SIZES.length}`, 265, 50, 30, "#f2ead8", 800, "#1b1b1b");
        Ink.word(ctx, `${Math.round(secs() - startAt)} s  ·  objectif ${PAR[li]} s`, 265, 88, 17, "#e9b04a", 700, "#1b1b1b");
        ctx.save();
        ctx.translate(480, 660);
        ctx.scale(1.8, 1.8);
        Ink.enxor(ctx, 0, 0, t, { seed: 7, color: "#5bb3a0", wear: { head: "baguettes" }, face: -1 });
        ctx.restore();
        Ink.label(ctx, "Mère Varech", 480, 548, { size: 14, color: "#1d4a40" });
        if (won) {
          ctx.fillStyle = "rgba(27,27,27,.75)";
          ctx.fillRect(0, AH / 2 - 50, AW, 100);
          Ink.word(ctx, "Bento rempli !", AW / 2, AH / 2 - 10, 40, "#e9b04a", 800, "#1b1b1b");
          Ink.word(ctx, `en ${Math.round(results[results.length - 1].t)} secondes`, AW / 2, AH / 2 + 26, 18, PAPER, 600, "#1b1b1b");
          if (secs() - won > 1.6) { if (li + 1 < SIZES.length) load(li + 1); else finish(); }
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
        // tests : tout ranger sauf le dernier aliment, remis dans le bon sens ; renvoie où le glisser (coordonnées de l'arène)
        window.__bento = {
          almost() {
            const last = pieces[pieces.length - 1];
            for (const p of pieces) { p.cells = p.sol.cells; if (p !== last) p.placed = { x: p.sol.x, y: p.sol.y }; }
            layoutTray();
            const [cx, cy] = last.cells[0];
            return {
              from: { x: last.x + (cx + 0.5) * CELL * 0.8, y: last.y + (cy + 0.5) * CELL * 0.8 },
              to: { x: BX + (last.sol.x + cx + 0.5) * CELL, y: BY + (last.sol.y + cy + 0.5) * CELL },
              view: { s, ox, oy },
            };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
