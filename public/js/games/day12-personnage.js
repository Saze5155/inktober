// Jour 12 · Personnage : « Le portrait-robot »
// Un témoin décrit un suspect, parfois de travers : on reconstitue son portrait avec les décorations d'Enxor.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TRIES = 3;

  const ROWS = [
    { key: "color", label: "Goutte", opts: [["#b3261e", "rouge"], ["#e0662f", "orange"], ["#e9b04a", "jaune"], ["#5b8c5a", "vert"], ["#3e7cb1", "bleu"], ["#7d5ba6", "violet"]] },
    { key: "head", label: "Tête", opts: [[null, "rien"], ["bob", "bob"], ["cornes", "cornes"], ["chapeau", "chapeau"], ["beret", "béret"], ["girouette", "girouette"]] },
    { key: "face", label: "Visage", opts: [[null, "rien"], ["lunettes", "lunettes"], ["masque", "masque"], ["monocle", "monocle"], ["rougir", "joues"]] },
    { key: "back", label: "Dos", opts: [[null, "rien"], ["cape", "cape"], ["ailes", "ailes"], ["lierre", "lierre"], ["lanterne", "lanterne"]] },
    { key: "aura", label: "Autour", opts: [[null, "rien"], ["braises", "braises"], ["bulles", "bulles"], ["notes", "notes"], ["coeurs", "cœurs"]] },
  ];

  const CASES = [
    {
      title: "Qui a mangé le gâteau de Mère Varech ?", witness: "Mère Varech", wcolor: "#5bb3a0",
      answer: { color: "#e9b04a", head: "bob", face: null, back: null, aura: "bulles" },
      clues: [
        "Sa goutte était de la couleur du soleil.",
        "Il portait un chapeau mou de pêcheur, comme ceux des pontons.",
        "Rien sur la figure, je l'ai bien vu.",
        "Rien sur le dos non plus.",
        "Il laissait des bulles derrière lui, comme s'il sortait de l'eau.",
      ],
      culprit: "C'était Gloup, un pêcheur affamé. Il a promis de rapporter un poisson.",
    },
    {
      title: "Qui a volé la cloche du Seuil ?", witness: "Vieux Gris", wcolor: "#8a8478",
      answer: { color: "#7d5ba6", head: "girouette", face: "lunettes", back: "cape", aura: null },
      clues: [
        "Une goutte de la couleur du ciel juste avant la nuit.",
        "Sur sa tête, un truc qui tournait avec le vent.",
        "Des lunettes de plongée ! En pleine terre ferme !",
        "Un grand tissu rouge flottait dans son dos, comme un vampire.",
        "Autour de lui ? Rien. Pas une étincelle.",
      ],
      culprit: "C'était Dring, qui voulait juste un réveil plus joli.",
    },
    {
      title: "Qui a peint des moustaches sur la statue ?", witness: "Ocre", wcolor: "#c9874a",
      answer: { color: "#b3261e", head: "beret", face: "rougir", back: null, aura: "notes" },
      clues: [
        "Sa goutte était orange… Non. Plus foncée. Rouge comme le sang.",
        "Il avait des cornes. Non, attends : un béret ! Un béret de peintre.",
        "Il avait les joues toutes roses, il était gêné.",
        "Dans son dos, des ailes… ah non, ça c'était un oiseau. Rien dans le dos.",
        "Il fredonnait : des notes de musique flottaient autour de lui.",
      ],
      culprit: "C'était Pinceau. Il trouvait que la statue avait l'air triste sans moustache.",
    },
    {
      title: "Qui a éteint la flamme éternelle ?", witness: "Clairène", wcolor: "#e9b04a",
      answer: { color: "#3e7cb1", head: "cornes", face: "masque", back: "ailes", aura: null },
      clues: [
        "Sa goutte avait la couleur de l'eau qu'il a jetée sur ma flamme.",
        "Deux pointes sur la tête, comme les cinq frères dragons.",
        "Une bande verte sur les yeux, comme un chasseur de la jungle.",
        "Dans son dos, ce qu'il faut pour voler… mais pas des plumes.",
        "Et autour de lui, rien : il avait éteint toutes les braises.",
      ],
      culprit: "C'était Flic-Floc, un petit dragon d'eau qui avait peur du feu.",
    },
    {
      title: "Qui rôde dans la jungle la nuit ?", witness: "Liane", wcolor: "#7cd15a",
      answer: { color: "#5b8c5a", head: "chapeau", face: "monocle", back: "lanterne", aura: "coeurs" },
      clues: [
        "Sa goutte avait la couleur des feuilles.",
        "Un chapeau pointu et bleu, comme ceux des alchimistes.",
        "Un seul verre rond sur un œil. Très chic.",
        "Une petite lumière se balançait au-dessus de son épaule.",
        "Il semait des petits cœurs partout. Je crois qu'il est amoureux.",
      ],
      culprit: "C'était Lumignon. Il cherchait une fleur pour sa bien-aimée.",
    },
  ];

  function wrap(ctx, text, maxW) {
    const words = text.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  Games.register(12, {
    title: "Le portrait-robot",
    music: "inside",
    story: "Il se passe de drôles de choses à Enxor : un gâteau dévoré, une cloche envolée, des moustaches sur une statue… Les témoins ont tout vu, mais ils racontent comme ils peuvent. Écoute-les et dessine le portrait-robot de chaque suspect. Tu as trois essais par enquête.",
    controls: "Clique sur les vignettes pour choisir la couleur de la goutte, ce qu'il porte sur la tête, le visage, le dos et autour de lui. Puis « Montrer au témoin ».",

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

      let ci = 0, pick, tries, phase, phaseAt, wrongRows, results = [], hover = null;
      function load(i) {
        ci = i;
        pick = { color: "#e9b04a", head: null, face: null, back: null, aura: null };
        tries = 0; phase = "build"; phaseAt = secs(); wrongRows = new Set();
      }

      // ---------- mise en page ----------
      const NOTE = { x: 430, y: 20, w: 650, h: 290 };
      const CELL_W = 92, CELL_H = 62, ROW_X = 520, ROW_Y = 326;
      const cellRect = (r, k) => ({ x: ROW_X + k * (CELL_W + 4), y: ROW_Y + r * (CELL_H + 6), w: CELL_W, h: CELL_H });
      const BTN = { x: 70, y: 470, w: 290, h: 54 };

      function check() {
        const a = CASES[ci].answer;
        tries++;
        const wrong = ROWS.filter((row) => pick[row.key] !== a[row.key]).map((row) => row.key);
        if (!wrong.length) {
          const score = [400, 250, 120][tries - 1];
          results.push({ tries, score });
          phase = "solved"; phaseAt = secs();
          Sound.play("win");
        } else if (tries >= TRIES) {
          results.push({ tries: 0, score: 0 });
          phase = "failed"; phaseAt = secs();
          wrongRows = new Set(wrong);
          Sound.play("miss");
        } else {
          phase = "wrong"; phaseAt = secs();
          // après le premier essai raté, le témoin montre du doigt ce qui cloche
          wrongRows = tries >= 1 ? new Set(wrong) : new Set();
          Sound.play("gavel", 0.6);
        }
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      const inside = (m, r) => m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h;
      function hit(m) {
        if (inside(m, BTN)) return { btn: true };
        for (let r = 0; r < ROWS.length; r++) for (let k = 0; k < ROWS[r].opts.length; k++) if (inside(m, cellRect(r, k))) return { r, k };
        return null;
      }
      canvas.addEventListener("pointermove", (e) => {
        hover = phase === "build" || phase === "wrong" ? hit(toArena(e)) : null;
        canvas.style.cursor = hover ? "pointer" : "";
      });
      canvas.addEventListener("pointerdown", (e) => {
        const h = hit(toArena(e));
        if (phase === "solved" || phase === "failed") {
          if (secs() - phaseAt > 1) next();
          return;
        }
        if (!h) return;
        if (phase === "wrong") phase = "build";
        if (h.btn) return check();
        const row = ROWS[h.r];
        pick[row.key] = row.opts[h.k][0];
        wrongRows.delete(row.key);
        Sound.play("click");
      });

      function next() {
        if (ci + 1 < CASES.length) { load(ci + 1); Sound.play("door"); }
        else finish();
      }
      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0), first = results.filter((r) => r.tries === 1).length;
        const solved = results.filter((r) => r.tries).length;
        api.finish({
          score,
          stars: score >= 1700 ? 3 : score >= 1100 ? 2 : 1,
          lines: [`${solved} suspects sur ${CASES.length} identifiés`, `${first} du premier coup`],
        });
      }

      function update() {
        if ((phase === "solved" || phase === "failed") && secs() - phaseAt > 6) next();
      }

      // ---------- dessin ----------
      function drawEnxor(x, y, sc, look, t, extra = {}) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc, sc);
        Ink.enxor(ctx, 0, 0, t, { seed: 12, color: look.color, face: 1, wear: { head: look.head, face: look.face, back: look.back, aura: look.aura }, ...extra });
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le bureau de l'enquêteur
        ctx.fillStyle = "#5a4232"; ctx.fillRect(0, 0, AW, AH);
        ctx.strokeStyle = "rgba(29,26,32,.25)"; ctx.lineWidth = 2;
        for (let y = 20; y < AH; y += 38) { ctx.beginPath(); ctx.moveTo(0, y + Math.sin(y) * 4); ctx.lineTo(AW, y); ctx.stroke(); }
        Ink.halo(ctx, "rgba(255,210,140,.18)", 300, 200, 420);

        const c = CASES[ci];
        // le cadre du portrait
        ctx.fillStyle = "#8a6a48"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.fillRect(40, 30, 350, 420); ctx.strokeRect(40, 30, 350, 420);
        ctx.fillStyle = PAPER; ctx.fillRect(62, 52, 306, 376); ctx.strokeRect(62, 52, 306, 376);
        Ink.word(ctx, "PORTRAIT-ROBOT", 215, 78, 18, "#8a6a48", 800);
        const show = phase === "failed" ? c.answer : pick;
        drawEnxor(215, 370, 4.6, show, t, phase === "solved" ? { emote: "rire", et: (secs() - phaseAt) % 2 } : {});
        if (phase === "failed") Ink.word(ctx, "Le vrai suspect", 215, 410, 16, "#b3261e", 800);

        // bouton
        const canAct = phase === "build" || phase === "wrong";
        const hb = hover?.btn && canAct;
        ctx.fillStyle = canAct ? (hb ? "#f2c94c" : "#e9b04a") : "#6b5a48";
        ctx.beginPath(); ctx.roundRect(BTN.x, BTN.y, BTN.w, BTN.h, 12); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        Ink.word(ctx, "Montrer au témoin", BTN.x + BTN.w / 2, BTN.y + BTN.h / 2, 21, INK, 800, "#e9b04a");
        Ink.word(ctx, `Essais : ${"●".repeat(TRIES - tries)}${"○".repeat(tries)}`, 215, 556, 18, PAPER, 700, "#1b1b1b");
        Ink.word(ctx, `Enquête ${ci + 1} / ${CASES.length}`, 215, 596, 18, "#e9b04a", 800, "#1b1b1b");
        Ink.word(ctx, `${results.reduce((a, r) => a + r.score, 0)} points`, 215, 630, 15, PAPER, 600, "#1b1b1b");

        // le carnet du témoin
        ctx.fillStyle = "#f2ead8"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(NOTE.x, NOTE.y, NOTE.w, NOTE.h, 8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(62,124,177,.25)"; ctx.lineWidth = 1;
        for (let y = NOTE.y + 76; y < NOTE.y + NOTE.h - 6; y += 24) { ctx.beginPath(); ctx.moveTo(NOTE.x + 14, y); ctx.lineTo(NOTE.x + NOTE.w - 14, y); ctx.stroke(); }
        ctx.strokeStyle = "rgba(179,38,30,.35)"; ctx.beginPath(); ctx.moveTo(NOTE.x + 44, NOTE.y + 8); ctx.lineTo(NOTE.x + 44, NOTE.y + NOTE.h - 8); ctx.stroke();
        ctx.font = `800 22px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#7a1426"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(c.title, NOTE.x + 56, NOTE.y + 28);
        ctx.font = `600 15px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#6b6170";
        ctx.fillText(`Témoignage ${/^[AEIOUÉ]/.test(c.witness) ? "d'" : "de "}${c.witness} :`, NOTE.x + 56, NOTE.y + 54);
        ctx.font = `600 17px "Barlow Semi Condensed", sans-serif`;
        let ly = NOTE.y + 84;
        c.clues.forEach((cl, k) => {
          const wrongHere = wrongRows.has(ROWS[k].key) && phase !== "solved";
          ctx.fillStyle = wrongHere ? "#b3261e" : INK;
          for (const [j, line] of wrap(ctx, "– " + cl, NOTE.w - 150).entries()) {
            ctx.fillText(j ? "   " + line : line, NOTE.x + 56, ly);
            ly += 24;
          }
        });
        // le témoin, dans un coin du carnet
        drawEnxor(NOTE.x + NOTE.w - 52, NOTE.y + NOTE.h - 22, 1.8, { color: c.wcolor }, t, phase === "solved" ? { emote: "coeur", et: 0.5 } : phase === "wrong" ? { emote: "surprise", et: Math.min(2, secs() - phaseAt) } : {});

        // les vignettes
        ROWS.forEach((row, r) => {
          const y0 = ROW_Y + r * (CELL_H + 6);
          const bad = wrongRows.has(row.key) && phase !== "solved";
          Ink.word(ctx, row.label, ROW_X - 46, y0 + CELL_H / 2, 17, bad ? "#f2c1cf" : PAPER, 800, "#1b1b1b");
          if (bad) Ink.word(ctx, "✗", ROW_X - 92, y0 + CELL_H / 2, 20, "#f2c1cf", 800, "#1b1b1b");
          row.opts.forEach(([v, name], k) => {
            const b = cellRect(r, k);
            const sel = pick[row.key] === v, hov = hover && hover.r === r && hover.k === k;
            ctx.fillStyle = sel ? "#f2ead8" : hov ? "#d8ccb4" : "rgba(242,234,216,.55)";
            ctx.strokeStyle = sel ? "#e9b04a" : INK; ctx.lineWidth = sel ? 4 : 1.5;
            ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke();
            const cx = b.x + b.w / 2;
            if (row.key === "color") {
              ctx.fillStyle = v; ctx.strokeStyle = INK; ctx.lineWidth = 2;
              const y = b.y + 26;
              ctx.beginPath(); ctx.moveTo(cx, y - 16); ctx.quadraticCurveTo(cx + 13, y + 2, cx, y + 10); ctx.quadraticCurveTo(cx - 13, y + 2, cx, y - 16); ctx.fill(); ctx.stroke();
            } else if (v === null) {
              ctx.strokeStyle = "#8a8478"; ctx.lineWidth = 2.5;
              ctx.beginPath(); ctx.arc(cx, b.y + 26, 12, 0, Math.PI * 2); ctx.moveTo(cx - 8, b.y + 34); ctx.lineTo(cx + 8, b.y + 18); ctx.stroke();
            } else {
              // l'objet porté par un Enxor miniature, cadré sur la bonne partie
              ctx.save();
              ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 18); ctx.clip();
              const yOff = { head: 70, face: 52, back: 58, aura: 56 }[row.key];
              drawEnxor(cx, b.y + yOff, 1.35, { color: "#8a8478", [row.key]: v }, t);
              ctx.restore();
            }
            ctx.font = `700 12px "Barlow Semi Condensed", sans-serif`;
            ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(name, cx, b.y + b.h - 8);
          });
        });

        // réactions
        if (phase === "wrong") {
          const n = wrongRows.size;
          bubbleBox(`Hmm… non, ce n'est pas tout à fait ça. ${n} détail${n > 1 ? "s ne vont" : " ne va"} pas.`, "#7a1426");
        } else if (phase === "solved") {
          bubbleBox(`C'est lui ! ${c.culprit}`, "#2f6b3a");
        } else if (phase === "failed") {
          bubbleBox(`Ce n'était pas lui… Voilà le vrai suspect. ${c.culprit}`, "#7a1426");
        }
      }
      function bubbleBox(text, color) {
        ctx.font = `700 19px "Barlow Semi Condensed", sans-serif`;
        const lines = wrap(ctx, text, 480);
        const h = lines.length * 26 + 30, y = NOTE.y + NOTE.h - h + 6;
        ctx.fillStyle = "rgba(242,234,216,.97)"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(450, y, 520, h, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        lines.forEach((l, k) => ctx.fillText(l, 710, y + 28 + k * 26));
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
      }
      load(0);
      if (location.hostname === "localhost") {
        // tests : où cliquer pour composer la bonne réponse (et une erreur au premier essai)
        window.__robot = {
          clicks(wrongFirst) {
            const a = CASES[ci].answer, b = canvas.getBoundingClientRect();
            const P = (x, y) => ({ x: b.left + ox + x * s, y: b.top + oy + y * s });
            const list = ROWS.map((row, r) => {
              let k = row.opts.findIndex((o) => o[0] === a[row.key]);
              if (wrongFirst && r === 1) k = (k + 1) % row.opts.length;
              const c = cellRect(r, k);
              return P(c.x + c.w / 2, c.y + c.h / 2);
            });
            return { list, btn: P(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2), phase };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
