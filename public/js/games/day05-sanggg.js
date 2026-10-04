// Jour 5 · Sanggg : « Le dernier battement »
// Un souvenir gardé par Umbralis : le dernier humain, son cœur qui bat encore.
// Tu es un globule rouge : ramasse l'oxygène, évite les caillots, livre aux organes. Appuie en rythme avec le cœur.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TAU = Math.PI * 2;
  const LANES = [420, 550, 680];
  const DURATION = 75;
  const ORGANS = ["Poumon", "Cerveau", "Muscle", "Cœur", "Œil", "Main"];

  Games.register(5, {
    title: "Le dernier battement",
    music: "grotte",
    story: "Umbralis, le Tisseur d'Ombres, garde les souvenirs que personne d'autre ne veut garder. Dans l'un d'eux bat encore le cœur du dernier humain, pendant l'Éclipse. Deviens un globule rouge, porte l'oxygène jusqu'aux organes… et tiens le rythme du cœur.",
    controls: "← → (ou Q D) pour changer de voie. ESPACE au moment exact du battement : tu aspires l'oxygène autour de toi et ton multiplicateur monte. Évite les caillots d'encre, et passe par les organes pour livrer.",

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

      const cell = { lane: 1, x: LANES[1], y: 540, carry: 0, stun: 0 };
      let time = 0, objects = [], score = 0, mult = 1, nextBeat = 1.2, lastBeat = -9, pulse = 0, beatsHit = 0, beatsTotal = 0;
      let spawnT = 0, organT = 9, delivered = 0, clots = 0, pops = [], flash = 0, scroll = 0;

      const bpm = () => 68 + (time / DURATION) * 30;
      const speed = () => 230 + (time / DURATION) * 120;

      function pop(text, color, x = cell.x, y = cell.y - 50) { pops.push({ text, color, x, y, life: 1.1 }); }

      function onBeatPress() {
        const now = time;
        const d = Math.min(Math.abs(now - lastBeat), Math.abs(nextBeat - now));
        if (d < 0.14) {
          beatsHit++;
          mult = Math.min(5, mult + 1);
          score += 5 * mult;
          pop(d < 0.06 ? "Parfait !" : "En rythme", "#e9b04a");
          Sound.play("note", 0.6, 5);
          // aspire l'oxygène des voies voisines
          for (const o of objects) if (o.type === "o2" && Math.abs(o.y - cell.y) < 120 && Math.abs(o.lane - cell.lane) <= 1) o.magnet = true;
        } else {
          mult = 1;
          pop("Hors rythme", "#6b6170");
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "q" || k === "a") { e.preventDefault(); cell.lane = Math.max(0, cell.lane - 1); }
        else if (k === "arrowright" || k === "d") { e.preventDefault(); cell.lane = Math.min(2, cell.lane + 1); }
        else if (k === " ") { e.preventDefault(); if (!e.repeat) onBeatPress(); }
      };
      window.addEventListener("keydown", onKey);

      function spawn() {
        const lane = Math.floor(Math.random() * 3);
        const r = Math.random();
        if (r < 0.6) objects.push({ type: "o2", lane, y: -30 });
        else objects.push({ type: "clot", lane, y: -40, rot: Math.random() * TAU });
        if (r > 0.85) objects.push({ type: "o2", lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3, y: -90 });
      }

      function update(dt) {
        time += dt;
        cell.stun = Math.max(0, cell.stun - dt);
        cell.x += (LANES[cell.lane] - cell.x) * Math.min(1, dt * 14);
        // le cœur bat : le sang accélère à chaque battement
        if (time >= nextBeat) {
          lastBeat = nextBeat;
          nextBeat += 60 / bpm();
          pulse = 1;
          beatsTotal++;
          Sound.play("kick", 0.7);
          setTimeout(() => Sound.play("kick", 0.4), 140);
        }
        pulse = Math.max(0, pulse - dt * 3);
        const v = speed() * (1 + pulse * 0.8);
        scroll += v * dt;
        spawnT -= dt;
        if (spawnT <= 0) { spawn(); spawnT = 0.42 - (time / DURATION) * 0.15; }
        organT -= dt;
        if (organT <= 0) { objects.push({ type: "organ", y: -60, name: ORGANS[Math.floor(Math.random() * ORGANS.length)] }); organT = 10; }

        for (const o of objects) {
          o.y += v * dt;
          if (o.magnet) { o.x = (o.x ?? LANES[o.lane]) + (cell.x - (o.x ?? LANES[o.lane])) * Math.min(1, dt * 10); o.y += (cell.y - o.y) * Math.min(1, dt * 8); }
          const ox = o.x ?? LANES[o.lane];
          if (o.done) continue;
          if (o.type === "organ") {
            if (o.y > cell.y - 20) {
              o.done = true;
              if (cell.carry) {
                const pts = cell.carry * 10 * mult * (cell.carry >= 5 ? 2 : 1);
                score += pts;
                delivered += cell.carry;
                pop(`${o.name} : +${pts}`, "#8fd18a", AW / 2, cell.y - 70);
                Sound.play("catch");
                cell.carry = 0;
              } else pop(`${o.name} : rien à livrer…`, "#6b6170", AW / 2, cell.y - 70);
            }
          } else if (Math.abs(o.y - cell.y) < 32 && Math.abs(ox - cell.x) < 44) {
            o.done = true;
            if (o.type === "o2") {
              if (cell.carry < 5) { cell.carry++; Sound.play("drop"); } else pop("Plein !", "#e9b04a");
            } else if (!cell.stun) {
              clots++;
              cell.carry = 0;
              mult = 1;
              cell.stun = 0.8;
              flash = 0.4;
              pop("Caillot !", "#b3261e");
              Sound.play("splash");
            }
          }
        }
        objects = objects.filter((o) => o.y < AH + 80 && !(o.done && o.type !== "organ"));
        for (const p of pops) { p.life -= dt; p.y -= 30 * dt; }
        pops = pops.filter((p) => p.life > 0);
        flash = Math.max(0, flash - dt);
        if (time >= DURATION) finish();
      }

      function finish() {
        if (!running) return;
        stop();
        const rhythm = beatsTotal ? Math.round((beatsHit / beatsTotal) * 100) : 0;
        api.finish({
          score,
          stars: score >= 1600 ? 3 : score >= 800 ? 2 : 1,
          lines: [`${delivered} bulles d'oxygène livrées`, `${clots} caillot${clots > 1 ? "s" : ""}`, `${beatsHit} battements en rythme`],
        });
      }

      // ---------- Rendu ----------

      function drawCell(x, y, t) {
        const wob = Math.sin(t * 8) * 0.04;
        ctx.save();
        ctx.translate(x, y);
        if (cell.stun) ctx.globalAlpha = 0.5 + Math.sin(t * 40) * 0.3;
        ctx.fillStyle = "#b3261e";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 30 * (1 + wob), 24 * (1 - wob), 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#8e1b2b";
        ctx.beginPath(); ctx.ellipse(0, 2, 15, 11, 0, 0, TAU); ctx.fill();
        // yeux d'Enxor
        for (const sx of [-9, 9]) {
          ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(sx, -6, 5, 6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sx, -5, 2.4, 0, TAU); ctx.fill();
        }
        // bulles d'oxygène transportées
        for (let i = 0; i < cell.carry; i++) {
          const a = (i / 5) * TAU + t * 2;
          ctx.fillStyle = "#7fc1e8"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 40, Math.sin(a) * 30, 7, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // les tissus autour du vaisseau
        ctx.fillStyle = "#2a1418";
        ctx.fillRect(0, 0, AW, AH);
        ctx.strokeStyle = "rgba(239,229,208,.06)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const y = ((i * 70 + scroll * 0.3) % (AH + 70)) - 35;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(200, y - 30, 300, y + 30, 330, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(AW, y); ctx.bezierCurveTo(900, y - 30, 800, y + 30, 770, y); ctx.stroke();
        }
        // le vaisseau qui se dilate à chaque battement
        const w = 210 + pulse * 22;
        ctx.fillStyle = "#5a1622";
        ctx.beginPath();
        for (let y = -20; y <= AH + 20; y += 20) ctx.lineTo(AW / 2 - w + Math.sin((y + scroll) / 60) * 10, y);
        for (let y = AH + 20; y >= -20; y -= 20) ctx.lineTo(AW / 2 + w + Math.sin((y + scroll) / 60 + 1) * 10, y);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
        // stries du flux
        ctx.strokeStyle = "rgba(239,229,208,.08)";
        for (let i = 0; i < 18; i++) {
          const y = ((i * 46 + scroll) % (AH + 40)) - 20, x = AW / 2 + ((i * 97) % 300) - 150;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke();
        }

        for (const o of objects) {
          const x = o.x ?? LANES[o.lane];
          if (o.type === "o2") {
            ctx.fillStyle = "#7fc1e8"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, o.y, 13, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(x - 4, o.y - 4, 4, 0, TAU); ctx.fill();
          } else if (o.type === "clot") {
            ctx.save(); ctx.translate(x, o.y); ctx.rotate(o.rot + t);
            ctx.fillStyle = INK;
            ctx.beginPath();
            for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, rr = k % 2 ? 14 : 24; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.fill();
            ctx.restore();
          } else if (o.type === "organ" && !o.done) {
            ctx.fillStyle = "rgba(143,209,138,.18)";
            ctx.fillRect(AW / 2 - w, o.y - 24, w * 2, 48);
            ctx.strokeStyle = "#8fd18a"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
            ctx.strokeRect(AW / 2 - w, o.y - 24, w * 2, 48); ctx.setLineDash([]);
            Ink.word(ctx, `→ ${o.name} ←`, AW / 2, o.y, 22, "#8fd18a", 800);
          }
        }
        drawCell(cell.x, cell.y, t);
        for (const p of pops) { ctx.globalAlpha = Math.min(1, p.life * 2); Ink.word(ctx, p.text, p.x, p.y, 20, p.color, 800); ctx.globalAlpha = 1; }
        if (flash) { ctx.fillStyle = `rgba(179,38,30,${flash})`; ctx.fillRect(0, 0, AW, AH); }

        // le cœur qui bat (en haut à droite) et l'indicateur de rythme
        const hb = 1 + pulse * 0.25;
        ctx.save(); ctx.translate(960, 130); ctx.scale(hb, hb);
        Ink.heart(ctx, 0, 0, 34, "#b3261e");
        ctx.restore();
        const k = 1 - (nextBeat - time) / (60 / bpm());
        ctx.strokeStyle = "#efe5d0"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(960, 130, 64, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke();
        Ink.word(ctx, "ESPACE au battement", 960, 220, 15, PAPER, 600);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(16, 16, 260, 82, 12); ctx.fill();
        ctx.font = `700 22px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = "#e9b04a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(`${score} points  ×${mult}`, 30, 40);
        ctx.font = `600 15px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = PAPER;
        ctx.fillText(`Oxygène porté : ${cell.carry}/5   ·   ${Math.max(0, Math.ceil(DURATION - time))} s`, 30, 74);
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
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
