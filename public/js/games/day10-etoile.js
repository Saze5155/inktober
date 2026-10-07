// Jour 10 · Étoilé : « Le ciel de Noctifer »
// Retracer chaque constellation d'un seul trait : passer par chaque lien une seule fois, sans lever la plume.
// (Chaque figure a un chemin eulérien : 0 ou 2 étoiles d'où partent un nombre impair de liens.)
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680;

  // positions sur une grille 10 × 10, liens entre indices
  const SKIES = [
    { name: "Le Croc", pts: [[3, 2], [7, 2], [5, 8], [5, 4.2]], edges: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 1]] },
    { name: "La Cabane", pts: [[2.5, 8.5], [7.5, 8.5], [7.5, 4.5], [2.5, 4.5], [5, 1.2]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [3, 4], [4, 2]] },
    { name: "Le Poisson de Rive-Basse", pts: [[1, 5], [4, 2.5], [4, 7.5], [7, 5], [9.2, 2.8], [9.2, 7.2]], edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [1, 2]] },
    {
      name: "L'Étoile de Noctifer",
      pts: [0, 1, 2, 3, 4].map((k) => [5 + Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 5) * 4.2, 5.2 + Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 5) * 4.2]),
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2], [2, 4], [4, 1], [1, 3], [3, 0]],
    },
    {
      name: "L'Œil de Mythras",
      pts: [[2, 2], [5, 2], [8, 2], [2, 5], [5, 5], [8, 5], [2, 8], [5, 8], [8, 8]],
      edges: [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8], [1, 3], [7, 5]],
    },
    {
      name: "Vermillax, le dragon",
      pts: [[0.6, 3], [1.8, 5.2], [3.2, 3.2], [5, 0.4], [6.2, 3.2], [5, 5.4], [7.2, 6.2], [9.4, 5], [9.2, 8.4], [3.8, 7.8]],
      edges: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [2, 4], [2, 5], [4, 5], [5, 6], [4, 6], [6, 7], [7, 8], [8, 6], [5, 9], [9, 1]],
    },
  ];
  const keyOf = (a, b) => (a < b ? a + "-" + b : b + "-" + a);

  Games.register(10, {
    title: "Le ciel de Noctifer",
    music: "night",
    story: "Avant de disparaître, les humains donnaient des noms aux étoiles. Noctifer, l'Enfant de Mythras qui veille sur la nuit, a rangé les étoiles en nouvelles figures, mais l'encre des liens s'est effacée. Retrace chaque constellation d'un seul trait : chaque lien une seule fois, sans lever la plume.",
    controls: "Clique sur une étoile pour commencer, puis sur les étoiles voisines (ou garde le clic enfoncé et glisse). Clic droit ou Retour arrière : annuler le dernier trait. R : tout recommencer.",

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

      // le ciel de fond, dessiné une fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      const TWINKLE = [];
      {
        const b = bg.getContext("2d"), r = Ink.rng(1010);
        const g = b.createLinearGradient(0, 0, 0, AH);
        g.addColorStop(0, "#070a1c"); g.addColorStop(0.6, "#141a3c"); g.addColorStop(1, "#2a2448");
        b.fillStyle = g; b.fillRect(0, 0, AW, AH);
        // la Voie lactée : une bande de brume en diagonale
        for (let k = 0; k < 60; k++) {
          const f = r();
          Ink.halo(b, "rgba(150,140,220,.10)", f * AW, AH * 0.85 - f * AH * 0.75 + (r() - 0.5) * 120, 60 + r() * 80);
        }
        for (let k = 0; k < 260; k++) {
          b.globalAlpha = 0.2 + r() * 0.6;
          b.fillStyle = r() < 0.15 ? "#ffd9a8" : "#f6efd5";
          b.beginPath(); b.arc(r() * AW, r() * AH * 0.9, r() * 1.3 + 0.3, 0, Math.PI * 2); b.fill();
        }
        b.globalAlpha = 1;
        for (let k = 0; k < 30; k++) TWINKLE.push({ x: r() * AW, y: r() * AH * 0.8, ph: r() * 6, sp: 1 + r() * 2 });
        // collines d'encre
        b.fillStyle = "#0b0a12";
        b.beginPath(); b.moveTo(0, AH);
        for (let x = 0; x <= AW; x += 20) b.lineTo(x, AH - 70 - Math.sin(x * 0.006) * 30 - Math.sin(x * 0.017 + 1) * 12);
        b.lineTo(AW, AH); b.fill();
      }

      let li = 0, sky, P, cur = null, used, trail, undos = 0, wonAt = 0, stuckAt = 0, showHint = false, mouse = { x: 0, y: 0 }, down = false, flash = null;
      const results = [];
      const area = { x: 210, y: 70, w: 680, h: 500 };

      function load(i) {
        li = i;
        sky = SKIES[i];
        P = sky.pts.map(([x, y]) => ({ x: area.x + (x / 10) * area.w, y: area.y + (y / 10) * area.h }));
        cur = null; used = new Set(); trail = []; undos = 0; wonAt = 0; stuckAt = 0; showHint = false;
      }
      const deg = (i) => sky.edges.filter((e) => e[0] === i || e[1] === i).length;
      const linked = (a, b) => sky.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
      const freeFrom = (i) => sky.edges.filter((e) => (e[0] === i || e[1] === i) && !used.has(keyOf(e[0], e[1]))).length;

      function starAt(m, r = 26) {
        let best = -1, bd = r;
        P.forEach((p, i) => { const d = Math.hypot(p.x - m.x, p.y - m.y); if (d < bd) { bd = d; best = i; } });
        return best;
      }

      function visit(i) {
        if (wonAt || i < 0) return;
        if (cur === null) { cur = i; trail = [i]; Sound.play("note", 0.6, i); return; }
        if (i === cur) return;
        const k = keyOf(cur, i);
        if (!linked(cur, i)) { flash = { text: "Pas de lien entre ces étoiles", t: secs() }; return; }
        if (used.has(k)) { flash = { text: "Ce lien est déjà tracé", t: secs() }; Sound.play("miss", 0.5); return; }
        used.add(k); trail.push(i); cur = i;
        Sound.play("note", 0.7, used.size + 2);
        if (used.size === sky.edges.length) {
          wonAt = secs();
          results.push({ undos, score: Math.max(100, 300 - undos * 40) });
          Sound.play("firework");
        } else if (!freeFrom(cur)) {
          stuckAt = secs();
          showHint = true;
          Sound.play("miss", 0.6);
        }
      }
      function undo() {
        if (wonAt || !trail.length) return;
        undos++;
        if (trail.length === 1) { trail = []; cur = null; return; }
        const b = trail.pop(), a = trail[trail.length - 1];
        used.delete(keyOf(a, b));
        cur = a;
        stuckAt = 0;
        Sound.play("tick");
      }
      function reset() {
        if (wonAt || !trail.length) return;
        undos++;
        cur = null; used = new Set(); trail = []; stuckAt = 0;
        Sound.play("tick");
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("pointerdown", (e) => {
        mouse = toArena(e);
        if (e.button === 2) return undo();
        down = true;
        canvas.setPointerCapture(e.pointerId);
        visit(starAt(mouse));
      });
      canvas.addEventListener("pointermove", (e) => {
        mouse = toArena(e);
        // en glissant, on attrape les étoiles voisines au passage
        if (down && cur !== null) {
          const i = starAt(mouse, 20);
          if (i >= 0 && i !== cur && linked(cur, i) && !used.has(keyOf(cur, i))) visit(i);
        }
      });
      canvas.addEventListener("pointerup", () => { down = false; });
      const onKey = (e) => {
        if (e.key === "Backspace" || e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
        else if (e.key.toLowerCase() === "r") reset();
      };
      window.addEventListener("keydown", onKey);

      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0), totalUndos = results.reduce((a, r) => a + r.undos, 0);
        api.finish({
          score,
          stars: score >= 1600 ? 3 : score >= 1200 ? 2 : 1,
          lines: [`${SKIES.length} constellations retracées`, totalUndos ? `${totalUndos} retour${totalUndos > 1 ? "s" : ""} en arrière` : "Sans jamais lever la plume !"],
        });
      }

      function star(x, y, r, color, t, ph) {
        const tw = 1 + Math.sin(t * 3 + ph) * 0.12;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + t * 0.2, rr = (k % 2 ? r * 0.38 : r) * tw; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);
        for (const tw of TWINKLE) {
          ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * tw.sp + tw.ph));
          star(tw.x, tw.y, 3, "#f6efd5", t, tw.ph);
        }
        ctx.globalAlpha = 1;
        // une étoile filante de temps en temps
        const sh = (t * 0.25) % 1;
        if (sh < 0.12) {
          const k = sh / 0.12, x = 900 - k * 500, y = 60 + k * 180;
          ctx.strokeStyle = `rgba(255,246,208,${1 - k})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y - 22); ctx.stroke();
        }

        // l'astronome sur sa colline
        ctx.save();
        ctx.translate(130, AH - 66);
        ctx.scale(2, 2);
        ctx.strokeStyle = "#8a6a48"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(20, -18); ctx.moveTo(26, 0); ctx.lineTo(20, -18); ctx.stroke();
        ctx.fillStyle = "#3e4a8a"; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
        ctx.save(); ctx.translate(20, -20); ctx.rotate(-0.6); ctx.fillRect(-4, -4, 26, 8); ctx.strokeRect(-4, -4, 26, 8); ctx.restore();
        Ink.enxor(ctx, 0, 0, t, { seed: 10, color: "#8fb8ff", face: 1, wear: { head: "lune" } });
        ctx.restore();

        // liens : en pointillés tant qu'ils ne sont pas tracés
        const glow = wonAt ? Math.min(1, (secs() - wonAt) / 0.6) : 0;
        ctx.lineCap = "round";
        for (const [a, b] of sky.edges) {
          const done = used.has(keyOf(a, b));
          if (done) {
            ctx.strokeStyle = wonAt ? `rgba(255,230,150,${0.7 + glow * 0.3})` : "rgba(255,214,120,.95)";
            ctx.lineWidth = wonAt ? 4 + glow * 2 : 4;
            ctx.setLineDash([]);
          } else {
            ctx.strokeStyle = "rgba(190,200,255,.28)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 8]);
          }
          ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
        }
        ctx.setLineDash([]);
        // le fil qui suit la souris
        if (cur !== null && !wonAt) {
          ctx.strokeStyle = "rgba(255,214,120,.45)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(P[cur].x, P[cur].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        // les étoiles
        P.forEach((p, i) => {
          const odd = deg(i) % 2 === 1;
          const isCur = i === cur;
          if (showHint && odd && !wonAt) Ink.halo(ctx, "rgba(211,107,156,.55)", p.x, p.y, 34 + Math.sin(t * 4) * 4);
          Ink.halo(ctx, isCur ? "rgba(255,214,120,.8)" : "rgba(200,210,255,.45)", p.x, p.y, isCur ? 40 : 26 + glow * 14);
          star(p.x, p.y, isCur ? 13 : 10 + glow * 3, isCur ? "#ffd678" : "#f6efd5", t, i);
          // combien de liens restent à tracer depuis cette étoile
          const free = freeFrom(i);
          if (!wonAt && free) {
            ctx.fillStyle = "rgba(190,200,255,.75)";
            for (let k = 0; k < free; k++) { ctx.beginPath(); ctx.arc(p.x - (free - 1) * 4 + k * 8, p.y + 22, 2.2, 0, Math.PI * 2); ctx.fill(); }
          }
        });

        Ink.word(ctx, `Constellation ${li + 1} / ${SKIES.length}`, AW / 2, 30, 20, "#cdd6ff", 800, "#0b0a12");
        Ink.word(ctx, `${used.size} / ${sky.edges.length} liens`, AW - 110, 30, 16, "#cdd6ff", 700, "#0b0a12");
        if (!trail.length && !wonAt) Ink.word(ctx, "Choisis une étoile de départ", AW / 2, AH - 30, 18, "#cdd6ff", 700, "#0b0a12");
        if (stuckAt && !wonAt) {
          Ink.word(ctx, "Coincé ! Clic droit pour revenir, ou R pour recommencer.", AW / 2, AH - 50, 19, "#f2c1cf", 700, "#0b0a12");
          Ink.word(ctx, "Astuce : pars d'une étoile rose (elle a un nombre impair de liens).", AW / 2, AH - 22, 16, "#cdd6ff", 600, "#0b0a12");
        }
        if (flash && secs() - flash.t < 1.2) {
          ctx.globalAlpha = 1 - (secs() - flash.t) / 1.2;
          Ink.word(ctx, flash.text, mouse.x, mouse.y - 30, 15, "#f2c1cf", 700, "#0b0a12");
          ctx.globalAlpha = 1;
        }
        if (wonAt) {
          ctx.globalAlpha = glow;
          Ink.word(ctx, sky.name, AW / 2, AH - 56, 36, "#ffe39a", 800, "#0b0a12");
          Ink.word(ctx, undos ? `${undos} retour${undos > 1 ? "s" : ""} en arrière` : "D'un seul trait, du premier coup !", AW / 2, AH - 22, 17, "#cdd6ff", 600, "#0b0a12");
          ctx.globalAlpha = 1;
          if (secs() - wonAt > 2.6) { if (li + 1 < SKIES.length) load(li + 1); else finish(); }
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
        // tests : un chemin eulérien (Hierholzer) et la position des étoiles à l'écran
        window.__ciel = {
          solve() {
            const odd = P.map((_, i) => i).filter((i) => deg(i) % 2);
            const adj = P.map(() => []);
            sky.edges.forEach(([a, b], k) => { adj[a].push([b, k]); adj[b].push([a, k]); });
            const seen = new Set(), stack = [odd.length ? odd[0] : 0], out = [];
            while (stack.length) {
              const v = stack[stack.length - 1];
              while (adj[v].length && seen.has(adj[v][adj[v].length - 1][1])) adj[v].pop();
              if (!adj[v].length) out.push(stack.pop());
              else { const [w, k] = adj[v].pop(); seen.add(k); stack.push(w); }
            }
            return { odd: odd.length, path: out.reverse(), edges: sky.edges.length, view: { s, ox, oy }, pts: P };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
