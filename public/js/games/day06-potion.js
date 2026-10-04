// Jour 6 · Potion : « Les fioles d'Encrine »
// Encrine, l'archiviste d'Umbralis, a perdu ses recettes de potions d'encre. Il faut les retrouver par déduction :
// le chaudron BOUILLONNE pour chaque ingrédient à la bonne place, et FUME pour un ingrédient présent mais mal placé.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TAU = Math.PI * 2;
  const SLOTS = 4, MAX_TRIES = 8, RECIPES = 3;
  const INGREDIENTS = [
    { id: "oeil", name: "Œil de corbeau", color: "#e9b04a" },
    { id: "racine", name: "Racine noire", color: "#6b4426" },
    { id: "plume", name: "Plume de Grifix", color: "#efe5d0" },
    { id: "sel", name: "Sel de Cendre", color: "#9aa0a6" },
    { id: "encre", name: "Goutte d'encre", color: "#3e4a8a" },
    { id: "champi", name: "Champignon de Verdanya", color: "#d36b9c" },
  ];
  const POTIONS = ["Potion de mémoire", "Élixir d'ombre", "Philtre de Tisseur"];

  function drawIngredient(ctx, id, x, y, sc = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    if (id === "oeil") {
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, 2, 6, 0, 0, TAU); ctx.fill();
    } else if (id === "racine") {
      ctx.strokeStyle = "#3b2a1c"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(-4, 0, 2, 14); ctx.moveTo(0, -2); ctx.lineTo(-10, 8); ctx.moveTo(1, 4); ctx.lineTo(10, 12); ctx.stroke();
    } else if (id === "plume") {
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(0, 16); ctx.quadraticCurveTo(-12, 0, 0, -16); ctx.quadraticCurveTo(12, 0, 0, 16); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, -14); ctx.stroke();
    } else if (id === "sel") {
      ctx.fillStyle = "#cfd3d6";
      for (const [cx, cy] of [[-7, 4], [6, 6], [0, -6], [-4, -1], [8, -4]]) { ctx.beginPath(); ctx.rect(cx - 4, cy - 4, 8, 8); ctx.fill(); ctx.stroke(); }
    } else if (id === "encre") {
      ctx.fillStyle = "#1d1a20"; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(14, 4, 0, 14); ctx.quadraticCurveTo(-14, 4, 0, -16); ctx.fill();
      ctx.fillStyle = "rgba(140,120,255,.7)"; ctx.beginPath(); ctx.arc(-3, 3, 3, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = "#d36b9c"; ctx.beginPath(); ctx.ellipse(0, -4, 15, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAPER; ctx.fillRect(-4, -4, 8, 16); ctx.strokeRect(-4, -4, 8, 16);
      ctx.fillStyle = PAPER; for (const dx of [-7, 0, 7]) { ctx.beginPath(); ctx.arc(dx, -8, 2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  // bien placés (bouillonne) et mal placés (fume)
  function grade(guess, code) {
    let bubble = 0, smoke = 0;
    guess.forEach((g, i) => {
      if (g === code[i]) bubble++;
      else if (code.includes(g)) smoke++;
    });
    return { bubble, smoke };
  }

  Games.register(6, {
    title: "Les fioles d'Encrine",
    music: "grotte",
    story: "Au fond de la Grotte de Mythras, Encrine prépare des potions d'encre pour Umbralis. Mais les pages de ses recettes se sont envolées avec le reste de la bibliothèque. Elle se souvient seulement des ingrédients possibles… À toi de retrouver l'ordre exact, en écoutant le chaudron.",
    controls: "Clique sur les bocaux (ou touches 1 à 6) pour remplir les 4 places, Retour arrière pour retirer le dernier, Entrée pour verser. Le chaudron BOUILLONNE pour chaque ingrédient bien placé et FUME pour un ingrédient présent mais mal placé. Chaque ingrédient n'apparaît qu'une fois par recette.",

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

      const JARS = INGREDIENTS.map((ing, i) => ({ ...ing, x: 110 + (i % 2) * 120, y: 200 + Math.floor(i / 2) * 140 }));
      const BREW = { x: 540, y: 600, w: 180, h: 50 };
      let round = 0, code, guess, history, results = [], state = "play", stateAt = 0, say = "", bubbles = [], brewColor = "#2b2731";
      const secs = () => performance.now() / 1000;

      function newRecipe() {
        const pool = INGREDIENTS.map((i) => i.id);
        code = [];
        while (code.length < SLOTS) code.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        guess = [];
        history = [];
        state = "play";
        say = `Recette ${round + 1} : la ${POTIONS[round]}. Quatre ingrédients, dans le bon ordre…`;
      }

      function add(i) {
        if (state !== "play" || guess.length >= SLOTS) return;
        const id = INGREDIENTS[i].id;
        if (guess.includes(id)) { say = "Chaque ingrédient n'est utilisé qu'une fois par recette."; Sound.play("tick"); return; }
        guess.push(id);
        Sound.play("drop");
      }
      function back() { if (state === "play" && guess.pop()) Sound.play("click"); }

      function brew() {
        if (state !== "play" || guess.length < SLOTS) return;
        const g = grade(guess, code);
        history.push({ guess: guess.slice(), ...g });
        // couleur du chaudron = mélange des ingrédients
        brewColor = INGREDIENTS.find((i) => i.id === guess[0]).color;
        for (let k = 0; k < g.bubble * 6 + 3; k++) bubbles.push({ x: 540 + (Math.random() - 0.5) * 140, y: 470, vy: -40 - Math.random() * 60, life: 1.4, smoke: false });
        for (let k = 0; k < g.smoke * 6; k++) bubbles.push({ x: 540 + (Math.random() - 0.5) * 140, y: 450, vy: -30 - Math.random() * 30, life: 2, smoke: true });
        Sound.play(g.bubble ? "plouf" : "tick");
        guess = [];
        if (g.bubble === SLOTS) {
          const tries = history.length;
          results.push({ tries, score: (MAX_TRIES + 1 - tries) * 100 });
          say = tries <= 3 ? "Incroyable ! Umbralis lui-même n'aurait pas fait mieux." : "C'est elle ! La potion brille comme au premier jour.";
          state = "won"; stateAt = secs();
          Sound.play("win");
        } else if (history.length >= MAX_TRIES) {
          results.push({ tries: MAX_TRIES + 1, score: 0 });
          say = "Le chaudron déborde… Voici la vraie recette, pour la prochaine fois.";
          state = "lost"; stateAt = secs();
          Sound.play("miss");
        } else {
          say = g.bubble || g.smoke
            ? `Ça bouillonne ×${g.bubble}… et ça fume ×${g.smoke}.`
            : "Rien. Pas un seul de ces ingrédients n'est dans la recette.";
        }
      }

      function next() {
        round++;
        if (round >= RECIPES) return finish();
        newRecipe();
      }

      const onKey = (e) => {
        if (/^[1-6]$/.test(e.key)) add(Number(e.key) - 1);
        else if (e.key === "Backspace") { e.preventDefault(); back(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state === "play" ? brew() : secs() - stateAt > 0.8 && next(); }
      };
      window.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", (e) => {
        const b = canvas.getBoundingClientRect();
        const x = (e.clientX - b.left - ox) / s, y = (e.clientY - b.top - oy) / s;
        if (state !== "play") return secs() - stateAt > 0.8 && next();
        JARS.forEach((j, i) => { if (Math.hypot(x - j.x, y - j.y) < 50) add(i); });
        if (Math.abs(x - BREW.x) < BREW.w / 2 && Math.abs(y - BREW.y) < BREW.h / 2) brew();
        // cliquer sur une place remplie la vide
        for (let i = 0; i < SLOTS; i++) if (Math.hypot(x - (420 + i * 80), y - 520) < 32 && guess[i]) { guess.splice(i, 1); Sound.play("click"); }
      });

      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0);
        api.finish({
          score,
          stars: score >= 1800 ? 3 : score >= 1100 ? 2 : 1,
          lines: results.map((r, i) => `${POTIONS[i]} : ${r.tries > MAX_TRIES ? "ratée" : `${r.tries} essai${r.tries > 1 ? "s" : ""}`}`),
        });
      }

      // ---------- Rendu ----------

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // la grotte
        ctx.fillStyle = "#1a171f";
        ctx.fillRect(0, 0, AW, AH);
        Ink.halo(ctx, "rgba(120,100,255,0.25)", 540, 430, 360);

        // étagère de bocaux
        ctx.fillStyle = "#3b2a1c";
        for (let r = 0; r < 3; r++) ctx.fillRect(40, 240 + r * 140, 260, 10);
        JARS.forEach((j, i) => {
          ctx.fillStyle = "rgba(220,230,240,.12)"; ctx.strokeStyle = PAPER; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(j.x - 36, j.y - 38, 72, 78, 12); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#6b4426"; ctx.fillRect(j.x - 26, j.y - 48, 52, 12);
          drawIngredient(ctx, j.id, j.x, j.y, 1.3);
          ctx.globalAlpha = guess.includes(j.id) ? 0.35 : 1;
          ctx.font = `700 13px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = PAPER; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`${i + 1} · ${j.name}`, j.x, j.y + 52);
          ctx.globalAlpha = 1;
        });

        // le chaudron
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.ellipse(540, 430, 120, 30, 0, 0, Math.PI); ctx.lineTo(660, 430); ctx.quadraticCurveTo(650, 520, 540, 520); ctx.quadraticCurveTo(430, 520, 420, 430); ctx.fill();
        ctx.fillStyle = brewColor;
        ctx.beginPath(); ctx.ellipse(540, 430, 112, 24, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.stroke();
        for (const fl of [-50, 0, 50]) {
          ctx.fillStyle = "#e0662f";
          ctx.beginPath(); ctx.moveTo(540 + fl - 12, 560); ctx.quadraticCurveTo(540 + fl, 525 + Math.sin(t * 9 + fl) * 6, 540 + fl + 12, 560); ctx.fill();
        }
        for (const b of bubbles) {
          b.life -= 1 / 60; b.y += b.vy / 60;
          ctx.globalAlpha = Math.max(0, b.life / 1.4);
          if (b.smoke) { ctx.strokeStyle = "rgba(200,200,210,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 10 + (2 - b.life) * 10, 0, TAU); ctx.stroke(); }
          else { ctx.strokeStyle = "#e9b04a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, TAU); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        bubbles = bubbles.filter((b) => b.life > 0);

        // les 4 places de la recette en cours
        for (let i = 0; i < SLOTS; i++) {
          const x = 420 + i * 80, y = 520;
          ctx.fillStyle = "rgba(239,229,208,.08)"; ctx.strokeStyle = "rgba(239,229,208,.5)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y + 36, 28, 0, TAU); ctx.fill(); ctx.stroke();
          if (guess[i]) drawIngredient(ctx, guess[i], x, y + 36, 1);
        }
        // bouton verser
        ctx.fillStyle = guess.length === SLOTS && state === "play" ? "#e9b04a" : "#4a4550";
        ctx.beginPath(); ctx.roundRect(BREW.x - BREW.w / 2, BREW.y + 30 - BREW.h / 2, BREW.w, BREW.h, 25); ctx.fill();
        ctx.fillStyle = "#1b1b1b"; ctx.font = `800 18px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("Verser ↵", BREW.x, BREW.y + 30);

        // historique des essais
        ctx.fillStyle = "rgba(27,27,27,.7)";
        ctx.beginPath(); ctx.roundRect(760, 110, 320, 540, 14); ctx.fill();
        Ink.word(ctx, `Essais ${history.length} / ${MAX_TRIES}`, 920, 135, 18, "#e9b04a", 700);
        history.forEach((h, k) => {
          const y = 180 + k * 58;
          h.guess.forEach((id, i) => drawIngredient(ctx, id, 800 + i * 44, y, 0.8));
          for (let b = 0; b < h.bubble; b++) { ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.arc(990 + b * 18, y - 8, 7, 0, TAU); ctx.fill(); }
          for (let m = 0; m < h.smoke; m++) { ctx.strokeStyle = "#cfd3d6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(990 + m * 18, y + 10, 6, 0, TAU); ctx.stroke(); }
        });
        ctx.font = `500 13px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = "#a39686"; ctx.textAlign = "left";
        ctx.fillText("● doré = bouillonne (bonne place)   ○ gris = fume (mauvaise place)", 772, 640);

        // Encrine qui commente
        Ink.enxor(ctx, 620, 250, t, { seed: 6, color: "#7d5ba6", wear: { head: "plume" }, face: -1 });
        Ink.label(ctx, "Encrine", 620, 190, { size: 14, color: "#7d5ba6" });
        if (say) Ink.bubble(ctx, say, 560, 175);
        Ink.word(ctx, `${POTIONS[Math.min(round, RECIPES - 1)]} · recette ${Math.min(round + 1, RECIPES)} / ${RECIPES}`, 380, 60, 26, "#e9b04a", 800);

        if (state !== "play") {
          ctx.fillStyle = "rgba(27,27,27,.75)";
          ctx.beginPath(); ctx.roundRect(340, 60 + 30, 400, 100, 14); ctx.fill();
          Ink.word(ctx, state === "won" ? "Potion réussie !" : "La vraie recette :", 540, 115, 26, state === "won" ? "#e9b04a" : "#e4574b", 800);
          code.forEach((id, i) => drawIngredient(ctx, id, 480 + i * 40, 155, 0.8));
          if (secs() - stateAt > 0.8) Ink.word(ctx, "clic ou Entrée", 540, 182, 13, PAPER, 600);
        }
      }

      let raf = 0, running = true;
      function frame(now) {
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
      newRecipe();
      if (location.hostname === "localhost") window.__potion = { code: () => code };
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
