// Jour 23 · Inhumain : « Prouve que tu n'es pas humain »
// La vieille machine des humains est restée bloquée à l'envers : pour entrer, il faut prouver qu'on N'EST PAS humain.
// Une rafale de micro-épreuves de quelques secondes, de plus en plus rapides.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, ROUNDS = 15, LIVES = 3;
  const BOX = { x: 300, y: 150, w: 500, h: 400 };

  // une silhouette humaine, telle que les Enxors se les rappellent
  function human(ctx, x, y, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.fillStyle = "#d9b48a"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3e7cb1"; ctx.beginPath(); ctx.roundRect(-10, -12, 20, 24, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(-6, 26); ctx.moveTo(5, 12); ctx.lineTo(6, 26); ctx.stroke();
    ctx.restore();
  }
  const THINGS = [
    (ctx, x, y, t) => { ctx.save(); ctx.translate(x, y + 18); ctx.scale(1.3, 1.3); Ink.enxor(ctx, 0, 0, t, { seed: 3, color: "#e9b04a" }); ctx.restore(); },
    (ctx, x, y) => { ctx.fillStyle = "#5b8c5a"; ctx.beginPath(); ctx.arc(x, y - 6, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#6b4426"; ctx.fillRect(x - 3, y + 8, 6, 16); },
    (ctx, x, y) => { ctx.fillStyle = "#f2c94c"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#f2c94c"; ctx.lineWidth = 3; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); ctx.lineTo(x + Math.cos(a) * 25, y + Math.sin(a) * 25); ctx.stroke(); } },
    (ctx, x, y) => { ctx.fillStyle = "#3e5a6e"; ctx.beginPath(); ctx.moveTo(x - 24, y + 10); ctx.quadraticCurveTo(x, y - 20, x + 24, y + 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x + 10, y - 2, 2.5, 0, Math.PI * 2); ctx.fill(); },
    (ctx, x, y) => { ctx.fillStyle = "#f2a0bd"; ctx.beginPath(); ctx.arc(x, y + 4, 14, Math.PI, 0); ctx.lineTo(x + 14, y + 12); ctx.lineTo(x - 14, y + 12); ctx.fill(); ctx.fillStyle = "#5b8c5a"; ctx.fillRect(x - 1, y - 18, 3, 10); },
  ];

  function wrapText(ctx, text, x, y, maxW, lh) {
    let line = "";
    for (const w of text.split(" ")) { if (ctx.measureText(line + w).width > maxW && line) { ctx.fillText(line.trim(), x, y); y += lh; line = ""; } line += w + " "; }
    ctx.fillText(line.trim(), x, y);
  }

  // ---------- les micro-épreuves ----------
  // chacune : texte, durée, état, rendu, entrées, et si le temps écoulé vaut victoire (« ne rien faire »)
  const GAMES = [
    () => {
      const st = { x: BOX.x + 250, y: BOX.y + 220, done: false };
      return {
        text: "Cochez « Je ne suis PAS un humain »", dur: 4,
        move(m) { // la case fuit la souris, mais pas trop vite
          const dx = st.x - m.x, dy = st.y - m.y, d = Math.hypot(dx, dy);
          if (d < 90 && d > 1) { st.x += (dx / d) * 9; st.y += (dy / d) * 9; }
          st.x = Math.max(BOX.x + 30, Math.min(BOX.x + BOX.w - 200, st.x)); st.y = Math.max(BOX.y + 80, Math.min(BOX.y + BOX.h - 40, st.y));
        },
        click(m) { if (Math.abs(m.x - st.x) < 22 && Math.abs(m.y - st.y) < 22) st.done = true; },
        result() { return st.done ? "win" : null; },
        solve() { st.done = true; },
        draw(ctx) {
          ctx.fillStyle = "#fafafa"; ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = 2;
          ctx.fillRect(st.x - 16, st.y - 16, 32, 32); ctx.strokeRect(st.x - 16, st.y - 16, 32, 32);
          if (st.done) { ctx.strokeStyle = "#2f8a4a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(st.x - 10, st.y); ctx.lineTo(st.x - 2, st.y + 9); ctx.lineTo(st.x + 12, st.y - 10); ctx.stroke(); }
          ctx.fillStyle = INK; ctx.font = `600 18px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText("Je ne suis pas un humain", st.x + 26, st.y);
        },
      };
    },
    () => {
      const cells = Array.from({ length: 9 }, (_, i) => ({ i, human: false, thing: Math.floor(Math.random() * THINGS.length), on: false }));
      const hum = new Set(); while (hum.size < 3 + Math.floor(Math.random() * 2)) hum.add(Math.floor(Math.random() * 9));
      for (const k of hum) cells[k].human = true;
      let validated = null;
      const rect = (c) => ({ x: BOX.x + 60 + (c.i % 3) * 112, y: BOX.y + 70 + Math.floor(c.i / 3) * 96, w: 104, h: 88 });
      const VAL = { x: BOX.x + 400, y: BOX.y + 380, w: 110, h: 44 };
      return {
        text: "Sélectionnez toutes les cases SANS humain, puis Valider", dur: 7,
        click(m) {
          if (m.x > VAL.x && m.x < VAL.x + VAL.w && m.y > VAL.y && m.y < VAL.y + VAL.h) { validated = cells.every((c) => c.on === !c.human); return; }
          for (const c of cells) { const q = rect(c); if (m.x > q.x && m.x < q.x + q.w && m.y > q.y && m.y < q.y + q.h) c.on = !c.on; }
        },
        result() { return validated === null ? null : validated ? "win" : "lose"; },
        solve() { cells.forEach((c) => (c.on = !c.human)); validated = true; },
        draw(ctx, t) {
          for (const c of cells) {
            const q = rect(c);
            ctx.fillStyle = c.on ? "#cfe3ef" : "#eeeeee"; ctx.fillRect(q.x, q.y, q.w, q.h);
            ctx.strokeStyle = c.on ? "#3e7cb1" : "#bbbbbb"; ctx.lineWidth = c.on ? 4 : 1; ctx.strokeRect(q.x, q.y, q.w, q.h);
            if (c.human) human(ctx, q.x + q.w / 2, q.y + q.h / 2, 1.3); else THINGS[c.thing](ctx, q.x + q.w / 2, q.y + q.h / 2, t);
          }
          ctx.fillStyle = "#3e7cb1"; ctx.fillRect(VAL.x, VAL.y, VAL.w, VAL.h);
          Ink.word(ctx, "VALIDER", VAL.x + VAL.w / 2, VAL.y + VAL.h / 2, 16, "#ffffff", 800, "#3e7cb1");
        },
      };
    },
    () => {
      const words = ["ENCRE", "MYTHRAS", "PLUME", "GOUTTE", "CROCS", "OIGNON"];
      const w = words[Math.floor(Math.random() * words.length)], goal = [...w].reverse().join("");
      let typed = "";
      return {
        text: `Tapez « ${w} » à l'ENVERS (au clavier)`, dur: 6,
        key(e) { if (/^[a-zA-Z]$/.test(e.key)) typed = (typed + e.key.toUpperCase()).slice(-goal.length); else if (e.key === "Backspace") typed = typed.slice(0, -1); },
        result() { return typed === goal ? "win" : null; },
        goal: () => goal,
        draw(ctx) {
          ctx.fillStyle = "#fafafa"; ctx.fillRect(BOX.x + 100, BOX.y + 200, 300, 60); ctx.strokeStyle = "#8a8a8a"; ctx.strokeRect(BOX.x + 100, BOX.y + 200, 300, 60);
          Ink.word(ctx, typed + (Math.floor(performance.now() / 400) % 2 ? "|" : ""), BOX.x + 250, BOX.y + 230, 30, INK, 800, "#fafafa");
          ctx.save(); ctx.translate(BOX.x + 250, BOX.y + 130); ctx.rotate(-0.06);
          Ink.word(ctx, w.split("").join(" "), 0, 0, 40, "#7a1426", 800, "#eeeeee");
          ctx.restore();
        },
      };
    },
    () => {
      let n = 0;
      return {
        text: "Cliquez 14 fois. Vite. Les humains fatiguent.", dur: 3.6,
        click() { n++; Sound.play("tick", 0.3); },
        result() { return n >= 14 ? "win" : null; },
        solve() { n = 14; },
        draw(ctx) {
          ctx.fillStyle = "#e9e9e9"; ctx.fillRect(BOX.x + 60, BOX.y + 230, 380, 30);
          ctx.fillStyle = "#2f8a4a"; ctx.fillRect(BOX.x + 60, BOX.y + 230, 380 * Math.min(1, n / 14), 30);
          Ink.word(ctx, `${n} / 14`, BOX.x + 250, BOX.y + 170, 44, INK, 800, "#f4f4f4");
        },
      };
    },
    () => {
      let moved = false, armed = false;
      setTimeout(() => (armed = true), 250);
      return {
        text: "NE BOUGEZ PLUS LA SOURIS. Les humains tremblent.", dur: 3, timeoutWins: true,
        move() { if (armed) moved = true; },
        result() { return moved ? "lose" : null; },
        draw(ctx) {
          Ink.word(ctx, moved ? "MOUVEMENT DÉTECTÉ" : "… immobile …", BOX.x + 250, BOX.y + 220, 30, moved ? "#b3261e" : "#5a5560", 800, "#f4f4f4");
        },
      };
    },
    () => {
      const q = [["Combien font 7 849 × 0 + 3 ?", "3", ["0", "3", "7 852"]], ["Racine carrée de 144, plus 30 ?", "42", ["42", "174", "44"]], ["Combien de pattes a un Enxor ?", "0", ["2", "4", "0"]], ["1 + 1 en binaire ?", "10", ["2", "11", "10"]]][Math.floor(Math.random() * 4)];
      const opts = [...q[2]].sort(() => Math.random() - 0.5);
      let answer = null;
      const rect = (i) => ({ x: BOX.x + 40 + i * 145, y: BOX.y + 220, w: 130, h: 70 });
      return {
        text: q[0], dur: 5,
        click(m) { opts.forEach((o, i) => { const r = rect(i); if (m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h) answer = o; }); },
        result() { return answer === null ? null : answer === q[1] ? "win" : "lose"; },
        solve() { answer = q[1]; },
        draw(ctx) { opts.forEach((o, i) => { const r = rect(i); ctx.fillStyle = "#eeeeee"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#8a8a8a"; ctx.strokeRect(r.x, r.y, r.w, r.h); Ink.word(ctx, o, r.x + r.w / 2, r.y + r.h / 2, 28, INK, 800, "#eeeeee"); }); },
      };
    },
    () => {
      const target = 20 + Math.floor(Math.random() * 60);
      let v = 0, dragging = false, released = null;
      const TR = { x: BOX.x + 50, y: BOX.y + 240, w: 400 };
      return {
        text: `Placez le curseur EXACTEMENT sur ${target} %`, dur: 5.5,
        down(m) { if (Math.abs(m.y - TR.y) < 30) { dragging = true; v = Math.max(0, Math.min(100, ((m.x - TR.x) / TR.w) * 100)); } },
        move(m) { if (dragging) v = Math.max(0, Math.min(100, ((m.x - TR.x) / TR.w) * 100)); },
        up() { if (dragging) { dragging = false; released = Math.abs(v - target) <= 2; } },
        result() { return released === null ? null : released ? "win" : "lose"; },
        solve() { released = true; },
        draw(ctx) {
          ctx.fillStyle = "#dddddd"; ctx.fillRect(TR.x, TR.y - 4, TR.w, 8);
          ctx.fillStyle = "#3e7cb1"; ctx.beginPath(); ctx.arc(TR.x + (TR.w * v) / 100, TR.y, 14, 0, Math.PI * 2); ctx.fill();
          Ink.word(ctx, `${Math.round(v)} %`, BOX.x + 250, BOX.y + 170, 40, INK, 800, "#f4f4f4");
        },
      };
    },
    () => {
      const opts = [["J'ai un peu faim.", false], ["Je suis fatigué, je vais faire une sieste.", false], ["01001110 01001111 01001110", true], ["J'aime les chatons.", false]].sort(() => Math.random() - 0.5);
      let answer = null;
      const rect = (i) => ({ x: BOX.x + 40, y: BOX.y + 90 + i * 72, w: 420, h: 60 });
      return {
        text: "Choisissez la phrase la MOINS humaine", dur: 5,
        click(m) { opts.forEach((o, i) => { const r = rect(i); if (m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h) answer = o[1]; }); },
        result() { return answer === null ? null : answer ? "win" : "lose"; },
        solve() { answer = true; },
        draw(ctx) { opts.forEach((o, i) => { const r = rect(i); ctx.fillStyle = "#eeeeee"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#8a8a8a"; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.fillStyle = INK; ctx.font = `600 18px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(o[0], r.x + 16, r.y + r.h / 2); }); },
      };
    },
    () => {
      const dot = { x: BOX.x + 250, y: BOX.y + 220 };
      let inside = 0, out = false, armed = false;
      setTimeout(() => (armed = true), 700);
      return {
        text: "Gardez la souris sur le point. Sans cligner.", dur: 3.5, timeoutWins: true,
        tick(dt, t, m) {
          dot.x = BOX.x + 250 + Math.sin(t * 1.7) * 150; dot.y = BOX.y + 220 + Math.sin(t * 2.3) * 90;
          if (armed && !this.cheat && Math.hypot(m.x - dot.x, m.y - dot.y) > 46) out = true; else inside += dt;
        },
        result() { return out ? "lose" : null; },
        draw(ctx) { Ink.halo(ctx, "rgba(179,38,30,.5)", dot.x, dot.y, 44); ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(dot.x, dot.y, 12, 0, Math.PI * 2); ctx.fill(); },
        solve() { this.cheat = true; },
      };
    },
  ];

  Games.register(23, {
    title: "Prouve que tu n'es pas humain",
    music: "game",
    story: "Dans les ruines du Seuil, une porte humaine fonctionne encore. Son écran pose des questions pour vérifier qui veut entrer… mais il est resté bloqué à l'envers : il ne laisse entrer que ceux qui prouvent qu'ils ne sont PAS humains. Bonne nouvelle : tu es une tache d'encre. Mauvaise nouvelle : il faut le prouver quinze fois, de plus en plus vite.",
    controls: "Lis la consigne en haut et obéis vite. Souris et clavier. Trois erreurs, et la machine te prend pour un humain.",

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

      let round = 0, lives = LIVES, wins = 0, G = null, phase = "intro", phaseAt = secs(), verdict = null, mouse = { x: AW / 2, y: AH / 2 }, bag = [];
      const speed = () => Math.max(0.6, 1 - round * 0.03);
      function nextRound() {
        if (round >= ROUNDS || lives <= 0) return finish();
        round++;
        if (!bag.length) bag = GAMES.map((_, i) => i).sort(() => Math.random() - 0.5);
        G = GAMES[bag.pop()]();
        phase = "intro"; phaseAt = secs();
        Sound.play("tick");
      }
      function judge(win) {
        phase = "verdict"; phaseAt = secs(); verdict = win;
        if (win) { wins++; Sound.play("bell", 0.5); } else { lives--; Sound.play("gavel", 0.7); }
      }

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => { mouse = toArena(e); if (phase === "play") G.move?.(mouse); });
      canvas.addEventListener("pointerdown", (e) => { mouse = toArena(e); if (phase === "play") { G.down?.(mouse); G.click?.(mouse); } });
      canvas.addEventListener("pointerup", (e) => { mouse = toArena(e); if (phase === "play") G.up?.(mouse); });
      const onKey = (e) => { if (phase === "play" && G.key) { if (e.key === "Backspace" || e.key === " ") e.preventDefault(); G.key(e); } };
      window.addEventListener("keydown", onKey);

      function update(dt, t) {
        if (phase === "intro" && secs() - phaseAt > 1.1) { phase = "play"; phaseAt = secs(); }
        else if (phase === "play") {
          G.tick?.(dt, t, mouse);
          const res = G.result();
          if (res) judge(res === "win");
          else if (secs() - phaseAt > G.dur * speed()) judge(!!G.timeoutWins);
        } else if (phase === "verdict" && secs() - phaseAt > 1) nextRound();
      }

      function finish() {
        stop();
        const score = wins * 100 + lives * 150;
        api.finish({
          score,
          stars: lives > 0 && wins >= 13 ? 3 : wins >= 9 ? 2 : 1,
          lines: [lives > 0 ? "ACCÈS AUTORISÉ : vous n'êtes pas humain." : "HUMAIN DÉTECTÉ. Accès refusé.", `${wins} épreuves réussies sur ${round}`],
        });
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le vieux terminal humain
        ctx.fillStyle = "#2b2731"; ctx.fillRect(0, 0, AW, AH);
        ctx.fillStyle = "#3b3440"; ctx.beginPath(); ctx.roundRect(200, 40, 700, 600, 24); ctx.fill();
        ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.roundRect(230, 70, 640, 540, 10); ctx.fill();
        // bandeau du formulaire
        ctx.fillStyle = "#3e7cb1"; ctx.fillRect(230, 70, 640, 70);
        ctx.fillStyle = "#ffffff"; ctx.font = `800 20px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "top";
        if (G && phase !== "intro") wrapText(ctx, G.text, 250, 82, 520, 24);
        // la mascotte : un robot-Enxor
        ctx.save(); ctx.translate(820, 136); ctx.scale(1.3, 1.3);
        Ink.enxor(ctx, 0, 0, t, { seed: 23, color: "#4affd9", face: -1, wear: { face: "visiere", aura: "glitch" } });
        ctx.restore();
        Ink.word(ctx, "inCAPTCHA", 790, 592, 13, "#8a8a8a", 700, "#f4f4f4");

        if (G && phase === "play") {
          ctx.save(); ctx.beginPath(); ctx.rect(230, 140, 640, 470); ctx.clip();
          G.draw(ctx, t);
          ctx.restore();
          const left = 1 - (secs() - phaseAt) / (G.dur * speed());
          ctx.fillStyle = left < 0.3 ? "#b3261e" : "#3e7cb1"; ctx.fillRect(230, 140, 640 * Math.max(0, left), 6);
        }
        if (phase === "intro" && G) {
          ctx.fillStyle = "#f4f4f4"; ctx.fillRect(230, 140, 640, 470);
          ctx.fillStyle = INK; ctx.font = `800 34px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
          wrapText(ctx, G.text.toUpperCase(), 550, 280, 560, 40);
          Ink.word(ctx, `Épreuve ${round} / ${ROUNDS}`, 550, 200, 18, "#8a8a8a", 700, "#f4f4f4");
        }
        if (phase === "verdict") {
          ctx.fillStyle = verdict ? "rgba(47,138,74,.9)" : "rgba(179,38,30,.9)"; ctx.fillRect(230, 300, 640, 110);
          Ink.word(ctx, verdict ? "VALIDÉ : non-humain ✓" : "HUMAIN DÉTECTÉ ✗", 550, 340, 34, "#ffffff", 800, verdict ? "#2f8a4a" : "#b3261e");
          Ink.word(ctx, verdict ? ["Très inhumain.", "Parfaitement mécanique.", "Aucune émotion détectée. Bravo.", "Bip boup."][round % 4] : ["Trop lent : typiquement humain.", "Hésitation détectée.", "Vous avez transpiré ?"][round % 3], 550, 382, 17, "#ffffff", 600, verdict ? "#2f8a4a" : "#b3261e");
        }
        // vies
        Ink.word(ctx, "Crédibilité", 100, 60, 16, PAPER, 700, "#1b1b1b");
        for (let k = 0; k < LIVES; k++) { ctx.fillStyle = k < lives ? "#4affd9" : "#5a5560"; ctx.fillRect(60 + k * 30, 80, 22, 22); }
        Ink.word(ctx, `${wins} réussies`, 100, 130, 15, PAPER, 700, "#1b1b1b");
        Ink.word(ctx, `Vitesse ×${(1 / speed()).toFixed(2)}`, 100, 156, 13, "#8a8a8a", 600, "#1b1b1b");
        // glitch d'ambiance
        if (Math.random() < 0.04) { ctx.fillStyle = ["rgba(255,74,74,.25)", "rgba(74,255,217,.25)"][Math.floor(Math.random() * 2)]; ctx.fillRect(0, Math.random() * AH, AW, 3 + Math.random() * 8); }
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt, now / 1000);
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
      nextRound();
      if (location.hostname === "localhost") window.__captcha = { state: () => ({ round, lives, wins, phase, text: G?.text }), G: () => G, view: () => ({ s, ox, oy }) };
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
