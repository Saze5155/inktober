// Jour 16 · Horreur : « Le couloir »
// Le couloir d'une maison humaine abandonnée, qui se répète. S'il y a quelque chose d'anormal, on fait demi-tour ;
// sinon, on continue. Il faut atteindre le couloir n° 8. Une erreur, et on recommence au n° 0.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, FLOOR = 560, GOAL = 8, SPEED = 230;

  const ANOMALIES = {
    yeux: "les yeux du portrait te suivaient",
    portrait: "le portrait, c'était toi",
    horloge: "l'horloge tournait à l'envers",
    miroir: "tu n'avais pas de reflet",
    reflet: "ton reflet ne faisait pas comme toi",
    porte: "il y avait une porte en trop",
    flaque: "une flaque rouge s'étendait sur le tapis",
    lune: "la lune était un œil",
    ombre: "une ombre marchait seule sur le mur",
    vase: "le vase flottait",
    lampe: "la lampe s'éteignait sur ton passage",
    traces: "des traces de pas apparaissaient à côté des tiennes",
    respire: "le manteau respirait",
    papier: "le papier peint avait des visages",
  };
  const IDS = Object.keys(ANOMALIES);

  Games.register(16, {
    title: "Le couloir",
    music: "vampire",
    story: "Au fond du Seuil se dresse la dernière maison humaine encore debout. Ceux qui y entrent racontent tous la même chose : un couloir qui se répète, encore et encore. Pour en sortir, il faut ouvrir l'œil. Si quelque chose a changé, fais demi-tour. Sinon, avance. Arrive au couloir n° 8.",
    controls: "← → (ou Q / D) pour marcher. Sors par la porte de droite pour avancer, par celle de gauche pour faire demi-tour. Observe tout : le premier couloir est normal, retiens-le bien.",

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

      // le décor fixe du couloir
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      function paintRoom(b, faces) {
        b.fillStyle = "#3a2e2c"; b.fillRect(0, 0, AW, AH);
        // papier peint à rayures et motifs
        for (let x = 0; x < AW; x += 40) { b.fillStyle = x % 80 ? "#4a3a36" : "#43342f"; b.fillRect(x, 0, 40, FLOOR - 80); }
        b.fillStyle = "rgba(239,229,208,.06)";
        for (let x = 20; x < AW; x += 80) for (let y = 40; y < FLOOR - 100; y += 70) {
          if (faces) {
            b.beginPath(); b.arc(x, y, 9, 0, Math.PI * 2); b.fill();
            b.fillStyle = "rgba(10,8,10,.35)";
            b.beginPath(); b.arc(x - 3, y - 2, 1.6, 0, Math.PI * 2); b.arc(x + 3, y - 2, 1.6, 0, Math.PI * 2); b.fill();
            b.beginPath(); b.ellipse(x, y + 4, 2.5, 1.5, 0, 0, Math.PI * 2); b.fill();
            b.fillStyle = "rgba(239,229,208,.06)";
          } else { b.beginPath(); b.moveTo(x, y - 9); b.lineTo(x + 7, y); b.lineTo(x, y + 9); b.lineTo(x - 7, y); b.fill(); }
        }
        // lambris et plancher
        b.fillStyle = "#2b211e"; b.fillRect(0, FLOOR - 80, AW, 80);
        b.strokeStyle = "rgba(0,0,0,.35)"; b.lineWidth = 2;
        for (let x = 0; x < AW; x += 110) b.strokeRect(x + 8, FLOOR - 72, 94, 64);
        b.fillStyle = "#2a1e18"; b.fillRect(0, FLOOR, AW, AH - FLOOR);
        for (let y = FLOOR + 14; y < AH; y += 22) { b.strokeStyle = "rgba(0,0,0,.4)"; b.beginPath(); b.moveTo(0, y); b.lineTo(AW, y); b.stroke(); }
        b.fillStyle = "#1c1412"; b.fillRect(0, 0, AW, 26);
      }
      paintRoom(bg.getContext("2d"), false);
      const bgFaces = document.createElement("canvas");
      bgFaces.width = AW; bgFaces.height = AH;
      paintRoom(bgFaces.getContext("2d"), true);

      let count = 0, loop = 0, mistakes = 0, A = null, me, phase = "walk", phaseAt = secs(), verdict = null, bag = [], wakeLamp = 0;
      const steps = [];
      const keys = {};
      function enter() {
        loop++;
        // le premier couloir est toujours normal ; ensuite, une chance sur deux
        if (loop === 1) A = null;
        else if (Math.random() < 0.55) {
          if (!bag.length) bag = [...IDS].sort(() => Math.random() - 0.5);
          A = bag.pop();
        } else A = null;
        me = { x: 90, face: 1, moving: false, dist: 0 };
        steps.length = 0; wakeLamp = 0;
        phase = "walk"; phaseAt = secs();
        Sound.play("door");
      }
      function choose(back) {
        const right = back === !!A;
        if (right) count++; else { mistakes++; count = 0; }
        verdict = { right, back, A };
        phase = "fade"; phaseAt = secs();
        Sound.play(right ? "bell" : "howl", right ? 0.4 : 0.7);
      }

      const onKey = (e) => {
        keys[e.key.toLowerCase()] = e.type === "keydown";
        if (e.type === "keydown" && phase === "fade" && secs() - phaseAt > 1.4 && (e.key === " " || e.key === "Enter")) next();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);
      canvas.addEventListener("pointerdown", () => { if (phase === "fade" && secs() - phaseAt > 1.4) next(); });
      function next() {
        if (count >= GOAL || loop >= 30) return finish();
        enter();
      }

      function update(dt) {
        if (phase === "fade") { if (secs() - phaseAt > 4.5) next(); return; }
        const dir = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.q || keys.a ? 1 : 0);
        me.moving = dir !== 0;
        if (dir) {
          me.face = dir;
          me.x += dir * SPEED * dt; me.dist += SPEED * dt;
          if (Math.floor(me.dist / 60) !== Math.floor((me.dist - SPEED * dt) / 60)) {
            Sound.play("step", 0.4);
            if (A === "traces") steps.push({ x: me.x + 40, t: secs() });
          }
        }
        if (A === "lampe" && Math.abs(me.x - 880) < 120) wakeLamp = Math.min(1, wakeLamp + dt * 1.5);
        if (me.x > AW - 40) choose(false);
        else if (me.x < 30 && me.dist > 100) choose(true);
        me.x = Math.max(20, me.x);
      }

      function finish() {
        stop();
        const score = count >= GOAL ? Math.max(300, 1600 - mistakes * 200) : 200 + count * 50;
        api.finish({
          score,
          stars: count >= GOAL ? (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1) : 1,
          lines: [count >= GOAL ? "Tu es sorti du couloir !" : "Le couloir t'a gardé…", `${mistakes} erreur${mistakes > 1 ? "s" : ""} · ${loop} couloirs traversés`],
        });
      }

      // ---------- dessin ----------
      const VIGNETTE = ctx.createRadialGradient(AW / 2, AH / 2, 300, AW / 2, AH / 2, 700);
      VIGNETTE.addColorStop(0, "rgba(0,0,0,0)"); VIGNETTE.addColorStop(1, "rgba(0,0,0,.7)");
      function door(x, w, ajar) {
        ctx.fillStyle = "#1a1210"; ctx.fillRect(x - w / 2 - 8, 250, w + 16, FLOOR - 250);
        ctx.fillStyle = "#5a3e2c"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        if (ajar) {
          ctx.fillStyle = "#050404"; ctx.fillRect(x - w / 2, 258, w, FLOOR - 258);
          ctx.fillStyle = "#5a3e2c";
          ctx.beginPath(); ctx.moveTo(x - w / 2, 258); ctx.lineTo(x + w / 2 - 22, 250); ctx.lineTo(x + w / 2 - 22, FLOOR + 6); ctx.lineTo(x - w / 2, FLOOR); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#ffd84a";
          for (const ex of [-16, -7]) { ctx.beginPath(); ctx.ellipse(x + w / 2 + ex, 380, 2.5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.fillRect(x - w / 2, 258, w, FLOOR - 258); ctx.strokeRect(x - w / 2, 258, w, FLOOR - 258);
          ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.strokeRect(x - w / 2 + 12, 272, w - 24, 110); ctx.strokeRect(x - w / 2 + 12, 400, w - 24, 140);
          ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.arc(x + w / 2 - 14, 420, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      function drawEnx(x, y, t, face, moving, sc = 2.4) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        Ink.enxor(ctx, 0, 0, t, { seed: 16, color: "#cdd6ff", face, moving });
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(A === "papier" ? bgFaces : bg, 0, 0);

        // plaque du numéro
        ctx.fillStyle = "#c9a24a"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(AW / 2 - 60, 40, 120, 44, 6); ctx.fill(); ctx.stroke();
        Ink.word(ctx, `n° ${count}`, AW / 2, 62, 24, "#2b211e", 800, "#c9a24a");

        // portes
        door(40, 70, false);
        door(AW - 40, 70, false);
        if (A === "porte") door(520, 70, true);

        // portrait (x 250)
        ctx.fillStyle = "#c9a24a"; ctx.fillRect(190, 140, 120, 150); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(190, 140, 120, 150);
        ctx.fillStyle = "#3a4a3a"; ctx.fillRect(202, 152, 96, 126);
        if (A === "portrait") {
          ctx.save(); ctx.beginPath(); ctx.rect(202, 152, 96, 126); ctx.clip();
          drawEnx(250, 300, t, 1, false, 2.4);
          ctx.restore();
        } else {
          // un humain, vieux portrait
          ctx.fillStyle = "#d9b48a"; ctx.beginPath(); ctx.ellipse(250, 205, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#2b211e"; ctx.beginPath(); ctx.ellipse(250, 182, 26, 14, 0, Math.PI, 0); ctx.fill();
          ctx.fillStyle = "#5a1622"; ctx.fillRect(220, 236, 60, 42);
          const look = A === "yeux" ? Math.max(-3, Math.min(3, (me.x - 250) / 60)) : 0;
          for (const ex of [-9, 9]) {
            ctx.fillStyle = "#f2ead8"; ctx.beginPath(); ctx.ellipse(250 + ex, 203, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(250 + ex + look, 203, 2.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.strokeStyle = "#7a4a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(242, 220); ctx.lineTo(258, 220); ctx.stroke();
        }

        // horloge (x 410)
        ctx.fillStyle = "#4a3426"; ctx.fillRect(385, 200, 50, FLOOR - 200); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(385, 200, 50, FLOOR - 200);
        ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(410, 240, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const ang = (A === "horloge" ? -1 : 1) * t * 1.5;
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(410, 240); ctx.lineTo(410 + Math.cos(ang - Math.PI / 2) * 15, 240 + Math.sin(ang - Math.PI / 2) * 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(410, 240); ctx.lineTo(410 + Math.cos(ang / 12 - Math.PI / 2) * 9, 240 + Math.sin(ang / 12 - Math.PI / 2) * 9); ctx.stroke();
        const pend = Math.sin(t * 3) * 0.3;
        ctx.strokeStyle = "#c9a24a"; ctx.beginPath(); ctx.moveTo(410, 290); ctx.lineTo(410 + Math.sin(pend) * 60, 290 + Math.cos(pend) * 60); ctx.stroke();
        ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.arc(410 + Math.sin(pend) * 60, 290 + Math.cos(pend) * 60, 8, 0, Math.PI * 2); ctx.fill();

        // miroir (x 650)
        ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.ellipse(650, 300, 62, 92, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#5a6a78"; ctx.beginPath(); ctx.ellipse(650, 300, 50, 80, 0, 0, Math.PI * 2); ctx.fill();
        if (A !== "miroir" && Math.abs(me.x - 650) < 230) {
          ctx.save(); ctx.beginPath(); ctx.ellipse(650, 300, 50, 80, 0, 0, Math.PI * 2); ctx.clip();
          ctx.globalAlpha = 0.75;
          // le reflet : même position, mais vu en face ; l'anomalie le fait bouger à contre-sens
          const rx = 650 + (A === "reflet" ? -1 : 1) * (me.x - 650) * 0.25;
          drawEnx(rx, 352, t, A === "reflet" ? -me.face : me.face, me.moving, 2);
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(239,229,208,.25)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(620, 250); ctx.lineTo(640, 230); ctx.stroke();

        // fenêtre (x 800)
        ctx.fillStyle = "#0c1020"; ctx.fillRect(750, 150, 100, 130); ctx.strokeStyle = "#2b211e"; ctx.lineWidth = 8; ctx.strokeRect(750, 150, 100, 130);
        if (A === "lune") {
          ctx.fillStyle = "#f2ead8"; ctx.beginPath(); ctx.ellipse(815, 190, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#7a1426"; ctx.beginPath(); ctx.arc(815 + Math.max(-6, Math.min(6, (me.x - 815) / 80)), 190, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(815 + Math.max(-6, Math.min(6, (me.x - 815) / 80)), 190, 2.5, 0, Math.PI * 2); ctx.fill();
        } else { ctx.fillStyle = "#f2ead8"; ctx.beginPath(); ctx.arc(815, 190, 14, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = "#2b211e"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(800, 150); ctx.lineTo(800, 280); ctx.moveTo(750, 215); ctx.lineTo(850, 215); ctx.stroke();

        // commode et vase (x 800, sous la fenêtre)
        ctx.fillStyle = "#4a3426"; ctx.fillRect(745, 420, 110, 140); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(745, 420, 110, 140);
        ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.strokeRect(755, 435, 90, 50); ctx.strokeRect(755, 495, 90, 50);
        const vy = A === "vase" ? 360 + Math.sin(t * 1.5) * 8 : 420;
        ctx.fillStyle = "#3e5a6e"; ctx.strokeStyle = INK;
        ctx.beginPath(); ctx.moveTo(788, vy); ctx.quadraticCurveTo(775, vy - 30, 792, vy - 50); ctx.lineTo(808, vy - 50); ctx.quadraticCurveTo(825, vy - 30, 812, vy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#5b8c5a"; ctx.lineWidth = 2;
        for (const dx of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(800, vy - 50); ctx.lineTo(800 + dx * 2, vy - 75); ctx.stroke(); }

        // lampe au plafond (x 900)
        const lampOn = 1 - wakeLamp;
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(920, 26); ctx.lineTo(920, 110); ctx.stroke();
        ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.moveTo(900, 110); ctx.lineTo(940, 110); ctx.lineTo(930, 90); ctx.lineTo(910, 90); ctx.fill();
        if (lampOn > 0.05 && !(A === "lampe" && wakeLamp > 0 && Math.random() < 0.3)) Ink.halo(ctx, `rgba(255,200,120,${0.35 * lampOn})`, 920, 140, 220);

        // portemanteau (x 990)
        ctx.strokeStyle = "#4a3426"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(990, FLOOR); ctx.lineTo(990, 300); ctx.stroke();
        const br = A === "respire" ? 1 + Math.sin(t * 2.2) * 0.08 : 1;
        ctx.save(); ctx.translate(990, 310); ctx.scale(br, br);
        ctx.fillStyle = "#2b2731"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-30, 160); ctx.lineTo(30, 160); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();

        // tapis, flaque
        ctx.fillStyle = "#5a1622"; ctx.beginPath(); ctx.ellipse(560, FLOOR + 50, 220, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(560, FLOOR + 50, 200, 20, 0, 0, Math.PI * 2); ctx.stroke();
        if (A === "flaque") { const k = Math.min(1, (secs() - phaseAt) / 12); ctx.fillStyle = "#a01818"; ctx.beginPath(); ctx.ellipse(600, FLOOR + 52, 30 + k * 90, 6 + k * 12, 0, 0, Math.PI * 2); ctx.fill(); }

        // ombre qui marche toute seule
        if (A === "ombre") {
          const sx = 100 + ((t * 40) % 900);
          ctx.fillStyle = "rgba(5,4,6,.45)";
          ctx.beginPath(); ctx.ellipse(sx, 330, 22, 60, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(sx, 255, 18, 0, Math.PI * 2); ctx.fill();
        }
        // traces de pas qui ne sont pas les tiennes
        for (const st of steps) { ctx.fillStyle = `rgba(10,8,10,${Math.max(0, 0.7 - (secs() - st.t) * 0.05)})`; ctx.beginPath(); ctx.ellipse(st.x, FLOOR + 30, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); }

        // toi
        if (phase === "walk") drawEnx(me.x, FLOOR + 38, t, me.face, me.moving);

        // pénombre et vignette
        ctx.fillStyle = `rgba(5,4,8,${0.25 + wakeLamp * 0.35})`; ctx.fillRect(0, 0, AW, AH);
        Ink.halo(ctx, "rgba(255,200,140,.10)", me?.x || 0, FLOOR - 40, 260);
        ctx.fillStyle = VIGNETTE; ctx.fillRect(0, 0, AW, AH);


        Ink.word(ctx, "← demi-tour", 70, 220, 15, "#b9a98a", 700, "#1b1b1b");
        Ink.word(ctx, "avancer →", AW - 70, 220, 15, "#b9a98a", 700, "#1b1b1b");
        Ink.word(ctx, `Erreurs : ${mistakes}`, 90, 46, 15, "#b9a98a", 700, "#1b1b1b");
        if (loop === 1 && phase === "walk") Ink.word(ctx, "Ce couloir est normal. Retiens bien chaque détail…", AW / 2, 120, 20, "#f2ead8", 700, "#1b1b1b");

        if (phase === "fade") {
          const k = Math.min(1, (secs() - phaseAt) / 0.6);
          ctx.fillStyle = `rgba(0,0,0,${k * 0.92})`; ctx.fillRect(0, 0, AW, AH);
          if (k >= 1) {
            const v = verdict;
            Ink.word(ctx, v.right ? "Bien vu." : "Mauvais choix…", AW / 2, 250, 40, v.right ? "#cdd6ff" : "#b3261e", 800, "#1b1b1b");
            Ink.word(ctx, v.A ? `Il y avait une anomalie : ${ANOMALIES[v.A]}.` : "Ce couloir était tout à fait normal.", AW / 2, 310, 20, PAPER, 600, "#1b1b1b");
            Ink.word(ctx, count >= GOAL ? "Une porte s'ouvre sur la lumière du jour…" : `Couloir n° ${count}`, AW / 2, 370, 24, "#c9a24a", 800, "#1b1b1b");
            if (secs() - phaseAt > 1.4) Ink.word(ctx, "Clique pour continuer", AW / 2, 430, 15, "#8a8478", 600, "#1b1b1b");
          }
        }
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
      }
      enter();
      if (location.hostname === "localhost") window.__couloir = { state: () => ({ A, count, loop, mistakes, phase, x: Math.round(me.x) }), force: (id) => { A = id; }, place: (x) => { me.x = x; } };
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
