// Jour 11 · Monstre : « Les monstres sous le lit »
// Des monstres d'ombre approchent du lit, mais seulement dans le noir. La lanterne (la souris) les fige :
// éclairés, ils prennent peur et reculent jusqu'à disparaître. Tenir jusqu'à l'aube.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, NIGHT = 70, LIGHT_R = 120;
  const BED = { x: 550, y: 455 };
  // d'où sortent les monstres : fenêtre, armoire, porte, coffre, sous le lit, cheminée
  const DENS = [
    { x: 150, y: 170, name: "la fenêtre" },
    { x: 960, y: 230, name: "l'armoire" },
    { x: 1040, y: 470, name: "la porte" },
    { x: 110, y: 560, name: "le coffre" },
    { x: 550, y: 640, name: "sous le lit" },
    { x: 560, y: 90, name: "la cheminée" },
  ];
  const KINDS = [
    { color: "#2a1f3a", horns: true, w: 1 },
    { color: "#1f2a3a", tentacles: true, w: 1.15 },
    { color: "#3a1f2a", ears: true, w: 0.9 },
  ];

  Games.register(11, {
    title: "Les monstres sous le lit",
    music: "night",
    story: "Dans les cabanes d'Enxor, les petits ont peur du noir. Avec raison : des monstres d'ombre en sortent la nuit pour venir les chatouiller. Mais ces monstres-là sont très timides, et un coup de lumière suffit à les faire fuir. Veille sur le sommeil de Pichenette jusqu'à l'aube.",
    controls: "La lanterne suit ta souris. Un monstre éclairé se fige et recule ; assez de lumière et il s'enfuit. S'il atteint le lit, ou si tu éclaires Pichenette en plein visage, elle se réveille. Tiens jusqu'à 6 h du matin.",

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

      // la chambre, dessinée une fois
      const room = document.createElement("canvas");
      room.width = AW; room.height = AH;
      {
        const b = room.getContext("2d");
        b.fillStyle = "#6b5a48"; b.fillRect(0, 0, AW, AH);
        // plancher
        b.fillStyle = "#7a6248"; b.fillRect(0, 300, AW, AH - 300);
        b.strokeStyle = "rgba(29,26,32,.3)"; b.lineWidth = 2;
        for (let y = 330; y < AH; y += 42) { b.beginPath(); b.moveTo(0, y); b.lineTo(AW, y); b.stroke(); }
        // mur : papier peint à motifs
        b.fillStyle = "rgba(239,229,208,.08)";
        for (let x = 20; x < AW; x += 60) for (let y = 20; y < 290; y += 60) { b.beginPath(); b.arc(x + (y % 120 ? 30 : 0), y, 6, 0, Math.PI * 2); b.fill(); }
        b.fillStyle = "#4a3a2c"; b.fillRect(0, 290, AW, 14);
        // fenêtre avec la lune
        b.fillStyle = "#1a2040"; b.fillRect(80, 70, 140, 160);
        b.fillStyle = "#f6efd5"; b.beginPath(); b.arc(180, 110, 18, 0, Math.PI * 2); b.fill();
        b.strokeStyle = "#4a3a2c"; b.lineWidth = 8; b.strokeRect(80, 70, 140, 160);
        b.beginPath(); b.moveTo(150, 70); b.lineTo(150, 230); b.moveTo(80, 150); b.lineTo(220, 150); b.stroke();
        // armoire
        b.fillStyle = "#4a3426"; b.fillRect(880, 60, 160, 250); b.strokeStyle = INK; b.lineWidth = 3; b.strokeRect(880, 60, 160, 250);
        b.beginPath(); b.moveTo(960, 70); b.lineTo(960, 300); b.stroke();
        b.fillStyle = "#c9a24a"; b.beginPath(); b.arc(950, 190, 4, 0, Math.PI * 2); b.arc(970, 190, 4, 0, Math.PI * 2); b.fill();
        // porte entrouverte
        b.fillStyle = "#1b1622"; b.fillRect(1010, 330, 90, 220);
        b.fillStyle = "#5a4232"; b.beginPath(); b.moveTo(1010, 330); b.lineTo(1050, 345); b.lineTo(1050, 540); b.lineTo(1010, 550); b.fill();
        // cheminée
        b.fillStyle = "#5a5050"; b.fillRect(480, 40, 160, 120); b.fillStyle = "#151218"; b.fillRect(505, 70, 110, 90);
        // coffre à jouets
        b.fillStyle = "#7a1426"; b.fillRect(50, 520, 130, 80); b.strokeStyle = INK; b.strokeRect(50, 520, 130, 80);
        b.fillStyle = "#e9b04a"; b.fillRect(105, 540, 20, 12);
        // tapis
        b.fillStyle = "#3e4a8a"; b.beginPath(); b.ellipse(550, 560, 260, 70, 0, 0, Math.PI * 2); b.fill();
        b.strokeStyle = "#e9b04a"; b.lineWidth = 3; b.beginPath(); b.ellipse(550, 560, 240, 60, 0, 0, Math.PI * 2); b.stroke();
        // lit
        b.fillStyle = "#6b4426"; b.fillRect(400, 360, 300, 150); b.strokeStyle = INK; b.lineWidth = 3; b.strokeRect(400, 360, 300, 150);
        b.fillRect(392, 320, 22, 200); b.strokeRect(392, 320, 22, 200); b.fillRect(686, 340, 22, 180); b.strokeRect(686, 340, 22, 180);
        b.fillStyle = "#f2ead8"; b.fillRect(414, 372, 80, 46);
        b.fillStyle = "#5bb3a0"; b.fillRect(470, 400, 216, 104); b.strokeRect(470, 400, 216, 104);
        b.strokeStyle = "rgba(29,26,32,.25)"; for (let x = 490; x < 686; x += 26) { b.beginPath(); b.moveTo(x, 400); b.lineTo(x, 504); b.stroke(); }
        // table de chevet et sa bougie éteinte
        b.fillStyle = "#4a3426"; b.fillRect(720, 420, 70, 90); b.strokeStyle = INK; b.strokeRect(720, 420, 70, 90);
      }
      // calque de nuit, sur lequel on « troue » la lumière
      const dark = document.createElement("canvas");
      dark.width = AW; dark.height = AH;
      const dctx = dark.getContext("2d");

      const mouse = { x: AW / 2, y: 250 }, startAt = secs();
      const monsters = [];
      const FACE = { x: 455, y: 385 };
      let sleep = 100, nextSpawn = 2.5, wakes = 0, scared = 0, wakeAt = -9, ended = 0, seq = 0;
      const pops = [];
      const r = Ink.rng(Math.floor(Math.random() * 1e9));

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => Object.assign(mouse, toArena(e)));
      canvas.style.cursor = "none";

      function spawn(el) {
        const free = DENS.filter((d) => !monsters.some((m) => m.den === d));
        if (!free.length) return;
        const den = free[Math.floor(r() * free.length)];
        const k = KINDS[seq++ % KINDS.length];
        monsters.push({ den, x: den.x, y: den.y, kind: k, speed: 26 + el * 0.45 + r() * 10, lit: 0, dose: 0, flee: false, fear: 0, seed: r() * 10, born: secs() });
        Sound.play("howl", 0.25);
      }

      function update(dt) {
        const el = secs() - startAt;
        if (ended) { if (secs() - ended > 3.5) finish(); return; }
        if (el >= NIGHT) { ended = secs(); Sound.play("caw"); Sound.play("win"); return; }
        if (el > nextSpawn) {
          spawn(el);
          // la deuxième moitié de la nuit, ils sortent parfois à deux
          if (el > 35 && r() < 0.5) spawn(el);
          nextSpawn = el + Math.max(1.6, 4.6 - el * 0.045);
        }
        // la lanterne trop près du visage la dérange
        if (Math.hypot(mouse.x - FACE.x, mouse.y - FACE.y) < 150) sleep -= dt * 34;
        else sleep = Math.min(100, sleep + dt * 10);
        if (sleep <= 0) {
          sleep = 100; wakes++; wakeAt = secs();
          pops.push({ x: BED.x, y: BED.y - 110, t: secs(), text: "Aïe, mes yeux ! Éteins ça !", color: "#e9b04a" });
          Sound.play("surprise");
        }
        for (let i = monsters.length - 1; i >= 0; i--) {
          const m = monsters[i];
          const inLight = Math.hypot(m.x - mouse.x, m.y - 30 - mouse.y) < LIGHT_R * 0.8;
          const dx = BED.x - m.x, dy = BED.y - m.y, d = Math.hypot(dx, dy);
          const bx = m.den.x - m.x, by = m.den.y - m.y, bd = Math.hypot(bx, by);
          if (m.flee) {
            // il a eu trop peur : il file dans sa cachette et n'en ressort plus
            m.fear = 1;
            if (bd < 14) { monsters.splice(i, 1); continue; }
            m.x += (bx / bd) * 320 * dt; m.y += (by / bd) * 320 * dt;
          } else if (inLight) {
            // figé, puis il recule ; assez de lumière en tout, et il s'enfuit pour de bon
            if (!m.lit) Sound.play("surprise", 0.5);
            m.lit += dt;
            m.dose += dt;
            m.fear = Math.min(1, m.fear + dt * 3);
            if (m.dose > 1.3) {
              m.flee = true; scared++;
              pops.push({ x: m.x, y: m.y - 70, t: secs(), text: ["Pardon !", "Aaah !", "Trop clair !", "Maman !"][scared % 4], color: "#f2c1cf" });
              Sound.play("plouf", 0.6);
            } else if (m.lit > 0.25 && bd > 4) {
              m.x += (bx / bd) * 90 * dt; m.y += (by / bd) * 90 * dt;
            }
          } else {
            m.lit = 0;
            m.fear = Math.max(0, m.fear - dt * 1.5);
            m.x += (dx / d) * m.speed * dt; m.y += (dy / d) * m.speed * dt;
            if (d < 40) {
              // chatouilles : Pichenette se réveille, le monstre file en riant
              monsters.splice(i, 1); wakes++; wakeAt = secs();
              pops.push({ x: BED.x, y: BED.y - 110, t: secs(), text: "Hiii ! Des chatouilles !", color: "#e9b04a" });
              Sound.play("rire");
            }
          }
        }
      }

      function finish() {
        stop();
        const score = scared * 60 + Math.max(0, 4 - wakes) * 250;
        api.finish({
          score,
          stars: wakes === 0 ? 3 : wakes <= 2 ? 2 : 1,
          lines: [`${scared} monstres chassés`, wakes ? `Pichenette s'est réveillée ${wakes} fois` : "Pichenette a dormi d'une traite !"],
        });
      }

      function drawMonster(m, t) {
        const k = m.kind, f = m.fear, wob = Math.sin(t * 6 + m.seed) * (1 - f) * 3;
        const sc = (0.9 + Math.min(1, (secs() - m.born) * 2) * 0.3) * k.w * (1 - f * 0.25);
        ctx.save();
        ctx.translate(m.x + (f ? Math.sin(t * 40) * f * 2 : 0), m.y);
        ctx.scale(sc, sc);
        Ink.shadow(ctx, 0, 4, 34, 9, 0.35);
        ctx.fillStyle = k.color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath();
        // corps en goutte qui ondule par le bas
        ctx.moveTo(-34, 0);
        for (let i = 0; i <= 6; i++) ctx.lineTo(-34 + i * 11.3, (i % 2 ? -6 : 2) + Math.sin(t * 5 + i + m.seed) * 3);
        ctx.quadraticCurveTo(40, -60, 0, -78 + wob);
        ctx.quadraticCurveTo(-40, -60, -34, 0);
        ctx.fill(); ctx.stroke();
        if (k.horns) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 12, -68); ctx.quadraticCurveTo(sx * 26, -86, sx * 20, -98); ctx.lineTo(sx * 6, -72); ctx.fill(); ctx.stroke(); }
        if (k.ears) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 8, -74); ctx.lineTo(sx * 26, -96); ctx.lineTo(sx * 24, -62); ctx.fill(); ctx.stroke(); }
        if (k.tentacles) for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 28, -30); ctx.quadraticCurveTo(sx * 52, -40 + Math.sin(t * 4 + sx) * 10, sx * 48, -64); ctx.lineWidth = 7; ctx.strokeStyle = k.color; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = INK; }
        // éclairé : il a l'air terrifié (et très mignon)
        if (f > 0.2) {
          for (const sx of [-1, 1]) {
            ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(sx * 12, -44, 9, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx * 12, -42, 3.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.beginPath(); ctx.ellipse(0, -22, 6, 7 * f, 0, 0, Math.PI * 2); ctx.fillStyle = "#5a1622"; ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#8fc7e8"; ctx.beginPath(); ctx.ellipse(28, -60, 4, 6, 0.3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      // dans le noir, on ne voit que les yeux
      function drawEyes(m, t) {
        if (m.fear > 0.2) return;
        const sc = k(m), blink = Math.sin(t * 1.7 + m.seed * 3) > 0.97;
        Ink.halo(ctx, "rgba(255,216,74,.35)", m.x, m.y - 44 * sc, 26);
        ctx.fillStyle = "#ffd84a";
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(m.x + sx * 12 * sc, m.y - 44 * sc, 6 * sc, blink ? 0.8 : 4 * sc, sx * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const k = (m) => (0.9 + Math.min(1, (secs() - m.born) * 2) * 0.3) * m.kind.w;

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(room, 0, 0);
        const el = Math.min(NIGHT, secs() - startAt);
        const dawn = ended ? Math.min(1, (secs() - ended) / 1.5) : 0;

        // Pichenette dans son lit
        const awake = secs() - wakeAt < 2;
        ctx.save();
        ctx.translate(455, 412);
        ctx.scale(1.5, 1.5);
        Ink.enxor(ctx, 0, 0, t, { seed: 4, color: "#f2c1cf", face: 1, emote: awake ? "rire" : "dodo", et: awake ? 0.3 : (t % 2) });
        ctx.restore();
        if (sleep < 70 && !ended) Ink.word(ctx, "Pichenette remue… pas la lumière dans les yeux !", BED.x, 300, 17, "#ffd678", 700, "#1b1b1b");
        if (!awake && !ended) Ink.word(ctx, "z", 480 + Math.sin(t) * 6, 340 - (t * 20) % 40, 16 + ((t * 20) % 40) / 4, "#cdd6ff", 800, "#1b1b1b");

        const sorted = [...monsters].sort((a, b) => a.y - b.y);
        for (const m of sorted) drawMonster(m, t);

        // la nuit : tout est sombre sauf la lanterne et un peu de lune
        if (dawn < 1) {
          dctx.globalCompositeOperation = "source-over";
          dctx.clearRect(0, 0, AW, AH);
          dctx.fillStyle = `rgba(6,6,18,${0.93 * (1 - dawn)})`;
          dctx.fillRect(0, 0, AW, AH);
          dctx.globalCompositeOperation = "destination-out";
          Ink.halo(dctx, "rgba(0,0,0,.35)", 150, 150, 120);
          if (!ended) {
            const fl = 1 + Math.sin(t * 13) * 0.02 + Math.sin(t * 7.3) * 0.02;
            Ink.halo(dctx, "rgba(0,0,0,1)", mouse.x, mouse.y, LIGHT_R * 1.5 * fl);
          }
          ctx.drawImage(dark, 0, 0);
          if (!ended) {
            ctx.globalCompositeOperation = "lighter";
            Ink.halo(ctx, "rgba(255,190,90,.18)", mouse.x, mouse.y, LIGHT_R * 1.4);
            ctx.globalCompositeOperation = "source-over";
          }
          for (const m of monsters) if (Math.hypot(m.x - mouse.x, m.y - 30 - mouse.y) > LIGHT_R * 0.9) drawEyes(m, t);
        }
        if (ended) {
          ctx.globalAlpha = dawn * 0.35;
          ctx.fillStyle = "#ffcf8a"; ctx.fillRect(0, 0, AW, AH);
          ctx.globalAlpha = 1;
        }

        // la lanterne
        if (!ended) {
          ctx.save();
          ctx.translate(mouse.x, mouse.y);
          ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -32); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -35, 4, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = "#ffd678";
          ctx.beginPath(); ctx.roundRect(-9, -22, 18, 26, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#3b3440"; ctx.fillRect(-11, -24, 22, 4); ctx.fillRect(-11, 3, 22, 4);
          ctx.fillStyle = "#e0662f"; ctx.beginPath(); ctx.ellipse(0, -9, 3, 6 + Math.sin(t * 15), 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.4) continue;
          ctx.globalAlpha = Math.min(1, 1.4 - age);
          Ink.word(ctx, p.text, p.x, p.y - age * 30, 18, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }

        // l'horloge : de minuit à 6 h
        const hour = Math.floor((el / NIGHT) * 6), mins = Math.floor(((el / NIGHT) * 360) % 60);
        Ink.word(ctx, `${hour} h ${String(mins).padStart(2, "0")}`, AW / 2, 28, 22, "#cdd6ff", 800, "#1b1b1b");
        ctx.fillStyle = "rgba(205,214,255,.15)"; ctx.fillRect(AW / 2 - 100, 46, 200, 5);
        ctx.fillStyle = "#e9b04a"; ctx.fillRect(AW / 2 - 100, 46, 200 * (el / NIGHT), 5);
        Ink.word(ctx, `Réveils : ${wakes}`, 90, 28, 16, wakes ? "#f2c1cf" : "#cdd6ff", 700, "#1b1b1b");
        Ink.word(ctx, `Chassés : ${scared}`, AW - 90, 28, 16, "#cdd6ff", 700, "#1b1b1b");
        if (secs() - startAt < 4) Ink.word(ctx, "Éclaire les yeux qui brillent dans le noir !", AW / 2, 90, 22, "#ffd678", 800, "#1b1b1b");
        if (ended) Ink.word(ctx, "6 h : le soleil se lève !", AW / 2, 240, 40, "#7a1426", 800, PAPER);
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
      }
      if (location.hostname === "localhost") {
        // tests : vise le monstre le plus proche du lit
        window.__nuit = {
          target() {
            const m = monsters.filter((q) => !q.flee).sort((a, b) => Math.hypot(a.x - BED.x, a.y - BED.y) - Math.hypot(b.x - BED.x, b.y - BED.y))[0];
            const b = canvas.getBoundingClientRect();
            const p = m ? { x: m.x, y: m.y - 30 } : { x: AW / 2, y: 250 };
            return { x: b.left + ox + p.x * s, y: b.top + oy + p.y * s, n: monsters.length, wakes, scared, ended: !!ended };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
