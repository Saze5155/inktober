// Jour 28 · Pêche : « Le grand concours de pêche »
// Lancer, attendre la touche, puis ferrer : garder le poisson dans la zone verte du moulinet jusqu'à le sortir de l'eau.
// Cinq poissons de plus en plus coriaces, jusqu'à la légende d'Abyssara.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680;
  const BAR = { x: 820, y: 110, w: 70, h: 460 };
  // réglés par simulation d'un joueur humain (réaction 0,2 s) : ~100, 98, 88, 78 et 54 % de prises par essai
  const FISH = [
    { name: "Gardon d'encre", color: "#8fa8b8", zone: 120, calm: 1.0, dart: 0.0, speed: 0.6, size: 0.8, lore: "Le premier poisson de tout pêcheur." },
    { name: "Perche du Seuil", color: "#5b8c5a", zone: 112, calm: 0.7, dart: 0.25, speed: 0.9, size: 0.9, lore: "Elle aime les eaux grises de la frontière." },
    { name: "Anguille de Rive-Basse", color: "#3b3440", zone: 106, calm: 0.5, dart: 0.45, speed: 1.15, size: 1.2, lore: "Glissante, nerveuse, imprévisible." },
    { name: "Brochet de Cendre", color: "#8a6a48", zone: 100, calm: 0.4, dart: 0.45, speed: 1.35, size: 1.3, lore: "Il a des dents comme des braises." },
    { name: "Le Léviathan d'Abyssara", color: "#1d4a5a", zone: 96, calm: 0.3, dart: 0.55, speed: 1.5, size: 1.8, lore: "On dit qu'il a avalé un phare humain." },
  ];

  Games.register(28, {
    title: "Le grand concours de pêche",
    music: "rive",
    story: "C'est le grand concours annuel de Rive-Basse, organisé depuis le ponton de la Canne À Pêche. Cinq prises à faire, de la plus banale à la plus légendaire. Mère Varech tient le registre, et tout le hameau regarde.",
    controls: "Clic (ou Espace) pour lancer. Quand « ! » apparaît, clique vite pour ferrer. Puis maintiens le clic pour faire monter la zone verte, relâche pour la laisser descendre : garde le poisson dedans jusqu'à remplir la jauge.",

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

      let fi = 0, phase = "ready", phaseAt = secs(), biteAt = 0, holding = false, fails = 0, caught = [], msg = "", msgAt = 0;
      // le moulinet : zone verte (position, vitesse), poisson (position, cible), jauge
      let zone, zv, fish, ftarget, fnext, progress, reelStart;
      const say = (t) => { msg = t; msgAt = secs(); };

      function press() {
        if (phase === "ready") { phase = "wait"; phaseAt = secs(); biteAt = secs() + 1.2 + Math.random() * 2.2; Sound.play("plouf", 0.6); return; }
        if (phase === "wait") { say("Trop tôt ! Le poisson a eu peur."); phase = "ready"; return; }
        if (phase === "bite") { startReel(); return; }
        if (phase === "caught" && secs() - phaseAt > 1.2) { if (fi + 1 < FISH.length) { fi++; phase = "ready"; } else finish(); return; }
        if (phase === "lost" && secs() - phaseAt > 1) { phase = "ready"; return; }
      }
      function startReel() {
        phase = "reel"; phaseAt = secs(); reelStart = secs();
        zone = BAR.h * 0.65; zv = 0; fish = BAR.h * 0.6; ftarget = fish; fnext = 0; progress = 0.3;
        Sound.play("catch", 0.6);
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => { void toArena(e); holding = true; press(); });
      window.addEventListener("pointerup", onUp);
      function onUp() { holding = false; }
      const onKey = (e) => {
        if (e.key !== " ") return;
        e.preventDefault();
        if (e.type === "keydown") { if (!holding) { holding = true; press(); } }
        else holding = false;
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function update(dt) {
        const F = FISH[fi];
        if (phase === "wait" && secs() > biteAt) { phase = "bite"; phaseAt = secs(); Sound.play("surprise", 0.7); }
        if (phase === "bite" && secs() - phaseAt > 0.75) { say("Raté ! Il a recraché l'hameçon."); phase = "ready"; }
        if (phase !== "reel") return;
        // la zone verte : on la fait monter en tenant, elle retombe sinon (avec un peu d'élan)
        zv += (holding ? -1300 : 1000) * dt;
        zv = Math.max(-520, Math.min(520, zv));
        zone += zv * dt;
        if (zone < F.zone / 2) { zone = F.zone / 2; zv = Math.max(0, zv) * 0.3; }
        if (zone > BAR.h - F.zone / 2) { zone = BAR.h - F.zone / 2; zv = Math.min(0, zv) * -0.25; }
        // le poisson choisit une cible : petits mouvements calmes, ou grands sauts brusques
        fnext -= dt;
        if (fnext <= 0) {
          const dart = Math.random() < F.dart;
          ftarget = Math.max(20, Math.min(BAR.h - 20, dart ? Math.random() * BAR.h : fish + (Math.random() - 0.5) * 160 * F.calm + (Math.random() - 0.5) * 80));
          fnext = (dart ? 0.5 : 0.9 + Math.random()) / F.speed;
        }
        fish += (ftarget - fish) * Math.min(1, dt * 2.6 * F.speed);
        const inside = Math.abs(fish - zone) < F.zone / 2;
        progress += (inside ? 0.24 : -0.17) * dt;
        if (progress >= 1) {
          caught.push({ F, time: secs() - reelStart });
          phase = "caught"; phaseAt = secs();
          Sound.play("win");
        } else if (progress <= 0) {
          fails++;
          phase = "lost"; phaseAt = secs();
          say("La ligne a cassé… on recommence !");
          Sound.play("miss");
        }
      }

      function finish() {
        stop();
        const time = caught.reduce((a, c) => a + c.time, 0);
        api.finish({
          score: Math.max(100, 2500 - Math.round(time * 15) - fails * 200),
          stars: fails <= 1 ? 3 : fails <= 3 ? 2 : 1,
          lines: [`${caught.length} prises, dont le Léviathan d'Abyssara !`, fails ? `${fails} ligne${fails > 1 ? "s" : ""} cassée${fails > 1 ? "s" : ""}` : "Pas une seule ligne cassée !"],
        });
      }

      // ---------- dessin ----------
      function drawFish(F, x, y, sc, t, flip = 1) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc * flip, sc);
        const w = Math.sin(t * 8) * 0.15;
        ctx.fillStyle = F.color; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        if (F.name.startsWith("Anguille")) {
          ctx.beginPath(); for (let k = 0; k <= 20; k++) { const xx = -40 + k * 4; ctx.lineTo(xx, Math.sin(k * 0.5 + t * 6) * 4 - 5); } for (let k = 20; k >= 0; k--) { const xx = -40 + k * 4; ctx.lineTo(xx, Math.sin(k * 0.5 + t * 6) * 4 + 5); } ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(-26, 0); ctx.rotate(w);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-16, -12); ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
          ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(4, -22); ctx.lineTo(10, -12); ctx.fill(); ctx.stroke();
          if (F.name.startsWith("Brochet")) { ctx.fillStyle = PAPER; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(20 + k * 3, 3); ctx.lineTo(21.5 + k * 3, 8); ctx.lineTo(23 + k * 3, 3); ctx.fill(); } }
          if (F.name.startsWith("Le Léviathan")) { ctx.fillStyle = "#8ff0c8"; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-14 + k * 7, 6, 2, 0, Math.PI * 2); ctx.fill(); } Ink.halo(ctx, "rgba(143,240,200,.5)", 36, -20, 12); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(22, -8); ctx.quadraticCurveTo(30, -26, 36, -20); ctx.stroke(); }
        }
        ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(18, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(19, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le lac au crépuscule
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, "#e0a070"); g.addColorStop(1, "#f2d2a0");
        ctx.fillStyle = g; ctx.fillRect(0, 0, AW, 300);
        Ink.halo(ctx, "rgba(255,230,160,.8)", 560, 290, 90);
        ctx.fillStyle = "#4f6a6a"; ctx.beginPath(); ctx.moveTo(0, 300); for (let x = 0; x <= AW; x += 40) ctx.lineTo(x, 240 + Math.sin(x * 0.01) * 20); ctx.lineTo(AW, 300); ctx.fill();
        ctx.fillStyle = "#2f5a6a"; ctx.fillRect(0, 300, AW, AH - 300);
        ctx.strokeStyle = "rgba(255,230,180,.25)"; ctx.lineWidth = 2;
        for (let k = 0; k < 14; k++) { const y = 320 + k * 26, x = (k * 173 + t * 20) % AW; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y); ctx.stroke(); }
        // le ponton et le pêcheur
        ctx.fillStyle = "#6b4426"; ctx.fillRect(0, 380, 250, 26);
        for (let k = 0; k < 4; k++) ctx.fillRect(20 + k * 60, 406, 12, 120);
        ctx.save(); ctx.translate(150, 384); ctx.scale(2.4, 2.4);
        Ink.enxor(ctx, 0, 0, t, { seed: 28, color: "#e9b04a", face: 1, wear: { head: "bob" }, emote: phase === "caught" ? "danse" : null, et: (secs() - phaseAt) % 2 });
        ctx.restore();
        // canne et ligne
        const bend = phase === "reel" ? 30 + Math.sin(t * 20) * 6 : phase === "bite" ? 20 : 0;
        const tipX = 300, tipY = 220 + bend;
        ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(180, 330); ctx.quadraticCurveTo(250, 250, tipX, tipY); ctx.stroke();
        if (phase !== "ready") {
          const fx = 560, fy = 360 + (phase === "bite" ? Math.sin(t * 30) * 6 : Math.sin(t * 2) * 3);
          ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(450, 280 + bend, fx, fy); ctx.stroke();
          ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(fx, fy, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI); ctx.fill();
          if (phase === "bite") Ink.word(ctx, "!", fx, fy - 40, 50, "#ffd84a", 800, "#1b1b1b");
          if (phase === "reel") { ctx.globalAlpha = 0.35; drawFish(FISH[fi], fx + Math.sin(t * 3) * 30, fy + 50, FISH[fi].size, t, Math.sin(t * 3) > 0 ? 1 : -1); ctx.globalAlpha = 1; }
        }

        // le moulinet
        if (phase === "reel") {
          const F = FISH[fi];
          ctx.fillStyle = "#6b4426"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.roundRect(BAR.x - 16, BAR.y - 16, BAR.w + 32, BAR.h + 32, 14); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#1d4a5a"; ctx.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
          const inside = Math.abs(fish - zone) < F.zone / 2;
          ctx.fillStyle = inside ? "rgba(124,209,90,.85)" : "rgba(124,209,90,.5)";
          ctx.fillRect(BAR.x + 4, BAR.y + zone - F.zone / 2, BAR.w - 8, F.zone);
          ctx.strokeStyle = "#3f6b3a"; ctx.lineWidth = 2; ctx.strokeRect(BAR.x + 4, BAR.y + zone - F.zone / 2, BAR.w - 8, F.zone);
          drawFish(F, BAR.x + BAR.w / 2, BAR.y + fish, 0.75, t);
          // jauge de prise
          ctx.fillStyle = "#1b1b1b"; ctx.fillRect(BAR.x + BAR.w + 30, BAR.y, 22, BAR.h);
          ctx.fillStyle = progress > 0.3 ? "#e9b04a" : "#b3261e"; ctx.fillRect(BAR.x + BAR.w + 30, BAR.y + BAR.h * (1 - progress), 22, BAR.h * progress);
          Ink.word(ctx, F.name, BAR.x + 40, BAR.y - 40, 18, PAPER, 800, "#1b1b1b");
        }
        // le registre de Mère Varech
        ctx.fillStyle = "rgba(239,229,208,.92)"; ctx.beginPath(); ctx.roundRect(20, 20, 330, 150, 10); ctx.fill();
        Ink.word(ctx, "Registre du concours", 185, 40, 16, "#7a1426", 800, PAPER);
        FISH.forEach((F, i) => {
          const got = caught[i];
          ctx.fillStyle = got ? "#2f6b3a" : i === fi ? "#c9874a" : "#8a8478";
          ctx.font = `700 14px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(`${got ? "✓" : i === fi ? "→" : "·"} ${F.name}${got ? ` (${got.time.toFixed(1)} s)` : ""}`, 36, 64 + i * 21);
        });
        Ink.word(ctx, `Lignes cassées : ${fails}`, 185, 182, 14, PAPER, 700, "#1b1b1b");

        const center = 480;
        if (phase === "ready") Ink.word(ctx, `Prise ${fi + 1} / ${FISH.length} : clique pour lancer`, center, 610, 22, PAPER, 800, "#1b1b1b");
        if (phase === "wait") Ink.word(ctx, "… patience …", center, 610, 22, "#cfe3ef", 700, "#1b1b1b");
        if (phase === "bite") Ink.word(ctx, "ÇA MORD ! Clique !", center, 610, 30, "#ffd84a", 800, "#1b1b1b");
        if (phase === "reel") Ink.word(ctx, "Maintiens pour monter, relâche pour descendre", center, 640, 16, PAPER, 700, "#1b1b1b");
        if (phase === "caught") {
          const F = FISH[fi];
          ctx.fillStyle = "rgba(239,229,208,.95)"; ctx.beginPath(); ctx.roundRect(300, 160, 500, 280, 18); ctx.fill();
          drawFish(F, 550, 280, 2.2 * Math.min(1.2, F.size), t);
          Ink.word(ctx, `${F.name} !`, 550, 195, 28, "#2f6b3a", 800, PAPER);
          Ink.word(ctx, F.lore, 550, 380, 16, INK, 600, PAPER);
          if (secs() - phaseAt > 1.2) Ink.word(ctx, "Clic pour continuer", 550, 415, 14, "#6b6170", 600, PAPER);
        }
        if (msg && secs() - msgAt < 2) Ink.word(ctx, msg, center, 560, 20, "#f2c1cf", 800, "#1b1b1b");
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
      if (location.hostname === "localhost") {
        window.__peche = {
          state: () => ({ fi, phase, fails, caught: caught.length, progress }),
          // pilote : tient le clic si le poisson est au-dessus de la zone (en tenant compte de l'élan)
          wantHold: () => fish < zone + zv * 0.18,
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
