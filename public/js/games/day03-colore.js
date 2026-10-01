// Jour 3 · Coloré : « Les couleurs volées »
// Prismaelyx, le dieu farceur né quand l'Encre a découvert les pigments humains, a volé la couleur de cinq objets.
// Il faut la retrouver en mélangeant des pigments, comme de la vraie peinture (le bleu et le jaune font du vert).
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TAU = Math.PI * 2;

  const PIGMENTS = [
    { id: "blanc", name: "Blanc", rgb: [0.97, 0.96, 0.94] },
    { id: "jaune", name: "Jaune", rgb: [0.96, 0.8, 0.15] },
    { id: "rouge", name: "Rouge", rgb: [0.8, 0.12, 0.12] },
    { id: "bleu", name: "Bleu", rgb: [0.1, 0.3, 0.7] },
    { id: "noir", name: "Noir", rgb: [0.08, 0.07, 0.09] },
  ];

  // Mélange façon peinture (Kubelka-Munk) : on moyenne l'absorption de chaque pigment
  const ks = (r) => { r = Math.max(0.001, Math.min(0.999, r)); return ((1 - r) * (1 - r)) / (2 * r); };
  const fromKs = (k) => 1 + k - Math.sqrt(k * k + 2 * k);
  function mix(counts) {
    const total = PIGMENTS.reduce((s, p) => s + (counts[p.id] || 0), 0);
    if (!total) return null;
    return [0, 1, 2].map((c) => fromKs(PIGMENTS.reduce((s, p) => s + (counts[p.id] || 0) * ks(p.rgb[c]), 0) / total));
  }
  const css = (c) => (c ? `rgb(${c.map((v) => Math.round(v * 255)).join(",")})` : "#d9d2c4");

  // écart de couleur perçu (Lab, ΔE 1976)
  function lab([r, g, b]) {
    const lin = (v) => (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }
  const deltaE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const grey = (c) => { const l = c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15; return [l, l, l]; };

  // ---------- Les cinq objets ----------

  const ROUNDS = [
    { name: "La fleur du Hameau", lore: "Prismaelyx a volé le rouge corail de cette fleur, « parce qu'elle se prenait trop au sérieux ».", recipe: { rouge: 1, blanc: 2 }, draw: flower },
    { name: "Le poisson de Rive-Basse", lore: "Mère Varech jure que ce poisson était bleu-vert. Prismaelyx jure que non.", recipe: { bleu: 2, jaune: 1, blanc: 1 }, draw: fish },
    { name: "Le soleil couchant", lore: "Solumbris est furieuse : son coucher de soleil est devenu gris.", recipe: { rouge: 1, jaune: 2 }, draw: sunset },
    { name: "La plume d'Auroryx", lore: "Le phénix de l'aube a perdu l'orange de ses flammes. Indice : il en faut plus d'un pigment.", recipe: { jaune: 1, rouge: 1, blanc: 3 }, draw: feather },
    { name: "L'écaille de Prismarix", lore: "Même le dragon caméléon s'est fait voler une teinte. Prismaelyx trouve ça hilarant.", recipe: { bleu: 2, rouge: 2, noir: 1 }, draw: scale },
  ];

  function flower(g, x, y, c, t) {
    g.strokeStyle = "#5b6b55"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x, y + 150); g.quadraticCurveTo(x - 20, y + 60, x, y); g.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.sin(t) * 0.05;
      g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 34, 24, a, 0, TAU); g.fill(); g.stroke();
    }
    g.fillStyle = "#e9b04a"; g.beginPath(); g.arc(x, y, 24, 0, TAU); g.fill(); g.stroke();
  }
  function fish(g, x, y, c, t) {
    const w = Math.sin(t * 3) * 6;
    g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 90, y); g.lineTo(x + 150, y - 50 + w); g.lineTo(x + 150, y + 50 + w); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(x, y, 110, 60, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = PAPER; g.beginPath(); g.arc(x - 60, y - 14, 12, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(x - 62, y - 14, 5, 0, TAU); g.fill();
    g.strokeStyle = "rgba(29,26,32,.4)"; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + i * 22 - 10, y, 30, -0.8, 0.8); g.stroke(); }
  }
  function sunset(g, x, y, c, t) {
    g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      g.beginPath(); g.moveTo(x + Math.cos(a) * 110, y + Math.sin(a) * 110); g.lineTo(x + Math.cos(a) * (140 + Math.sin(t * 2 + i) * 8), y + Math.sin(a) * (140 + Math.sin(t * 2 + i) * 8)); g.stroke();
    }
    g.beginPath(); g.arc(x, y, 100, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - 200, y); g.lineTo(x + 200, y); g.stroke();
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x - 140 + i * 20, y + i * 18); g.lineTo(x + 140 - i * 20, y + i * 18); g.stroke(); }
  }
  function feather(g, x, y, c, t) {
    g.save(); g.translate(x, y); g.rotate(-0.4 + Math.sin(t) * 0.05);
    g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 140); g.quadraticCurveTo(-90, 20, 0, -150); g.quadraticCurveTo(90, 20, 0, 140); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 170); g.lineTo(0, -140); g.stroke();
    g.lineWidth = 1.5;
    for (let k = -110; k < 120; k += 22) { g.beginPath(); g.moveTo(0, k); g.lineTo(-50, k - 30); g.moveTo(0, k); g.lineTo(50, k - 30); g.stroke(); }
    g.restore();
  }
  function scale(g, x, y, c) {
    g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(x, y - 140); g.quadraticCurveTo(x + 130, y - 20, x, y + 140); g.quadraticCurveTo(x - 130, y - 20, x, y - 140); g.fill(); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 6;
    g.beginPath(); g.arc(x - 20, y - 20, 60, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
  }

  const TAUNTS = {
    perfect: ["Impossible ! Tu m'as eu…", "Hmpf. Bon. Tu as un œil, je l'admets.", "Même moi, je n'aurais pas fait mieux. (Si.)"],
    good: ["Pas mal… pour un Enxor.", "Presque ! Ça m'agace un peu.", "Joli. Mais pas parfait. Jamais parfait."],
    bad: ["Hihi ! C'est ça, ta couleur ?", "On dirait de la boue. J'adore.", "Je garde la vraie couleur, alors ?"],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- Le jeu ----------

  Games.register(3, {
    title: "Les couleurs volées",
    music: "game",
    story: "Quand l'Encre a découvert les pigments des humains, elle a explosé de joie : c'est ainsi qu'est né Prismaelyx, le dieu farceur aux mille couleurs. Aujourd'hui, il a volé la couleur de cinq objets et parie que tu ne sauras pas la retrouver.",
    controls: "Clique sur les pots (ou touches 1 à 5) pour ajouter une goutte de pigment dans le bol. R pour vider le bol, Entrée pour comparer avec la couleur volée.",

    start(root, api) {
      const canvas = document.createElement("canvas");
      canvas.className = "game-canvas";
      root.append(canvas);
      const ctx = canvas.getContext("2d", { alpha: false }); // opaque : plus rapide à afficher
      let vw = 0, vh = 0, dpr = 1, s = 1, ox = 0, oy = 0;
      function resize() {
        dpr = Ink.quality.dpr();
        vw = root.clientWidth; vh = root.clientHeight;
        canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
        s = Math.min(vw / AW, vh / AH); ox = (vw - AW * s) / 2; oy = (vh - AH * s) / 2;
      }
      resize();
      window.addEventListener("resize", resize);

      const POTS = PIGMENTS.map((p, i) => ({ ...p, x: 470 + i * 112, y: 600, r: 42 }));
      const BTN = { vider: { x: 1010, y: 470, w: 130, h: 46, label: "Vider (R)" }, valider: { x: 1010, y: 530, w: 130, h: 46, label: "Comparer ↵" } };
      let round = 0, counts = {}, state = "play", results = [], say = "", sayAt = 0, revealAt = 0, splashes = [];
      const secs = () => performance.now() / 1000;
      const sinceReveal = () => secs() - revealAt;

      const target = () => mix(ROUNDS[round].recipe);
      const current = () => mix(counts);
      const drops = () => Object.values(counts).reduce((a, b) => a + b, 0);

      function talk(text) { say = text; sayAt = secs(); }
      talk("Hihi ! Retrouve la couleur que j'ai volée… si tu peux.");

      function addDrop(i) {
        if (state !== "play" || drops() >= 14) return;
        const p = PIGMENTS[i];
        counts[p.id] = (counts[p.id] || 0) + 1;
        Sound.play("plouf", 0.5);
        splashes.push({ t: 0, color: css(p.rgb) });
      }
      function empty() {
        if (state !== "play") return;
        counts = {};
        Sound.play("splash", 0.4);
      }
      function validate() {
        if (state !== "play" || !drops()) return;
        const d = deltaE(current(), target());
        const acc = Math.max(0, Math.min(100, Math.round(100 - d * 2.2)));
        results.push({ acc, d });
        state = "reveal";
        revealAt = secs();
        talk(pick(acc >= 92 ? TAUNTS.perfect : acc >= 75 ? TAUNTS.good : TAUNTS.bad));
        Sound.play(acc >= 75 ? "catch" : "rire");
      }
      function next() {
        round++;
        counts = {};
        if (round >= ROUNDS.length) return finish();
        state = "play";
        talk(pick(["Suivant ! Celle-là est plus dure.", "Encore une ? Hihi.", "Tu ne m'auras pas deux fois."]));
      }

      const onKey = (e) => {
        if (/^[1-5]$/.test(e.key)) addDrop(Number(e.key) - 1);
        else if (e.key.toLowerCase() === "r" || e.key === "Backspace") empty();
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state === "reveal" ? (sinceReveal() > 0.8 && next()) : validate(); }
      };
      window.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", (e) => {
        const b = canvas.getBoundingClientRect();
        const x = (e.clientX - b.left - ox) / s, y = (e.clientY - b.top - oy) / s;
        if (state === "reveal") return sinceReveal() > 0.8 && next();
        POTS.forEach((p, i) => { if (Math.hypot(x - p.x, y - p.y) < p.r + 8) addDrop(i); });
        for (const [k, bt] of Object.entries(BTN)) {
          if (Math.abs(x - bt.x) < bt.w / 2 && Math.abs(y - bt.y) < bt.h / 2) (k === "vider" ? empty : validate)();
        }
      });

      function finish() {
        stop();
        const avg = results.reduce((a, r) => a + r.acc, 0) / results.length;
        const score = Math.round(results.reduce((a, r) => a + r.acc * 6, 0));
        api.finish({
          score,
          stars: avg >= 88 ? 3 : avg >= 70 ? 2 : 1,
          lines: [`Précision moyenne : ${Math.round(avg)} %`, results.map((r, i) => `${["Fleur", "Poisson", "Soleil", "Plume", "Écaille"][i]} ${r.acc} %`).join(" · ")],
        });
      }

      // ---------- Rendu ----------

      function drawPrismaelyx(t) {
        const x = 1000, y = 150;
        const hue = (t * 70) % 360;
        Ink.enxor(ctx, x, y, t, { seed: 9, color: `hsl(${(hue + 180) % 360},70%,60%)`, face: -1, emote: state === "reveal" ? "rire" : null, et: sinceReveal() });
        // le corps change sans cesse de couleur
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = `hsl(${hue},75%,55%)`;
        ctx.beginPath(); ctx.arc(x, y - 22, 17, 0, TAU); ctx.fill();
        ctx.restore();
        // couronne prismatique
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `hsl(${(hue + i * 72) % 360},80%,60%)`;
          ctx.beginPath(); ctx.moveTo(x - 14 + i * 7, y - 38); ctx.lineTo(x - 11 + i * 7, y - 52); ctx.lineTo(x - 8 + i * 7, y - 38); ctx.fill();
        }
        Ink.label(ctx, "Prismaelyx", x, y - 66, { size: 14, color: "#7d5ba6" });
        if (say && secs() - sayAt < 6) Ink.bubble(ctx, say, x - 110, y - 80);
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.fillStyle = "#f1e8d6";
        ctx.fillRect(0, 0, AW, AH);
        // éclaboussures de peinture décoratives
        const r = Ink.rng(303);
        for (let i = 0; i < 26; i++) Ink.splat(ctx, r() * AW, r() * AH, 6 + r() * 12, r, ["#e0662f", "#3e7cb1", "#5b8c5a", "#d36b9c", "#e9b04a"][i % 5], 0.18);

        const R = ROUNDS[Math.min(round, ROUNDS.length - 1)];
        const tgt = target();
        // l'objet : gris tant que la couleur n'est pas retrouvée
        const objColor = state === "reveal" ? css(current()) : css(grey(tgt));
        R.draw(ctx, 230, 300, objColor, t);
        Ink.word(ctx, R.name, 230, 70, 30, INK, 800);
        wrap(R.lore, 230, 112, 380);

        // le souvenir de la couleur volée
        ctx.save();
        ctx.translate(470, 160);
        ctx.rotate(-0.05);
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.fillRect(-70, -70, 140, 170); ctx.strokeRect(-70, -70, 140, 170);
        ctx.fillStyle = css(tgt); ctx.fillRect(-56, -56, 112, 112); ctx.strokeRect(-56, -56, 112, 112);
        ctx.fillStyle = INK; ctx.font = `600 13px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "center";
        ctx.fillText("la couleur volée", 0, 80);
        ctx.restore();

        // le bol de mélange
        const bx = 700, by = 330;
        Ink.shadow(ctx, bx, by + 60, 130, 20, 0.2);
        ctx.fillStyle = "#cfc6b6"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx - 130, by); ctx.quadraticCurveTo(bx, by + 150, bx + 130, by); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = css(current());
        ctx.beginPath(); ctx.ellipse(bx, by, 116, 38, 0, 0, TAU); ctx.fill(); ctx.stroke();
        for (const sp of splashes) {
          sp.t += 1 / 60;
          ctx.globalAlpha = Math.max(0, 1 - sp.t * 2);
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(bx, by, 30 + sp.t * 160, 10 + sp.t * 50, 0, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        splashes = splashes.filter((sp) => sp.t < 0.5);
        Ink.word(ctx, drops() ? `${drops()} goutte${drops() > 1 ? "s" : ""}` : "Le bol est vide", bx, by + 115, 18, INK, 700);
        const detail = PIGMENTS.filter((p) => counts[p.id]).map((p) => `${counts[p.id]} ${p.name.toLowerCase()}`).join(" · ");
        if (detail) Ink.word(ctx, detail, bx, by + 140, 14, "#6b6170", 600);

        // les pots de pigment
        POTS.forEach((p, i) => {
          Ink.shadow(ctx, p.x, p.y + 30, 40, 9, 0.2);
          ctx.fillStyle = "#cfcfcf"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(p.x - 38, p.y - 30); ctx.lineTo(p.x + 38, p.y - 30); ctx.lineTo(p.x + 32, p.y + 30); ctx.lineTo(p.x - 32, p.y + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = css(p.rgb); ctx.beginPath(); ctx.ellipse(p.x, p.y - 30, 38, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
          Ink.word(ctx, `${i + 1} · ${p.name}`, p.x, p.y + 50, 15, INK, 700);
        });

        // boutons
        for (const bt of Object.values(BTN)) {
          ctx.fillStyle = "#1b1b1b";
          ctx.beginPath(); ctx.roundRect(bt.x - bt.w / 2, bt.y - bt.h / 2, bt.w, bt.h, 23); ctx.fill();
          ctx.fillStyle = "#e9b04a"; ctx.font = `700 16px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(bt.label, bt.x, bt.y);
        }

        drawPrismaelyx(t);
        Ink.word(ctx, `Objet ${Math.min(round + 1, ROUNDS.length)} / ${ROUNDS.length}`, 700, 40, 18, "#6b6170", 700);

        if (state === "reveal") {
          const res = results[results.length - 1];
          ctx.fillStyle = "rgba(27,27,27,.82)";
          ctx.beginPath(); ctx.roundRect(30, 480, 380, 110, 16); ctx.fill();
          Ink.word(ctx, `${res.acc} %`, 220, 515, 44, res.acc >= 75 ? "#e9b04a" : "#e4574b", 800);
          if (sinceReveal() > 0.8) {
            ctx.font = `600 15px "Barlow Semi Condensed", sans-serif`;
            ctx.fillStyle = PAPER; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("clic ou Entrée pour continuer", 220, 562);
          }
        }
      }

      function wrap(text, x, y, max) {
        ctx.font = `500 16px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#4a4550"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let line = "", yy = y;
        for (const w of text.split(" ")) {
          const test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > max && line) { ctx.fillText(line, x, yy); line = w; yy += 20; } else line = test;
        }
        ctx.fillText(line, x, yy);
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        last = now;
        render(now / 1000);
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
