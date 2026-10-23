// Jour 26 · Écran : « Le Pong d'encre »
// La dernière télé humaine qui marche encore ne capte qu'une chose : un vieux Pong. Premier à 5 points.
// L'écran grésille : de temps en temps, des parasites cachent la balle.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, GOAL = 5;
  const SCR = { x: 150, y: 90, w: 800, h: 480 }; // l'écran, dans le meuble télé
  const PH = 86, PW = 14, BR = 9;

  Games.register(26, {
    title: "Le Pong d'encre",
    music: "game",
    story: "Au fond d'une maison humaine, une télé à tube s'allume encore quand on tape dessus. Elle ne capte qu'une seule chaîne : un vieux Pong, et derrière l'écran, quelqu'un joue… Le Grand Écran, un Enxor qui vit dans la télé depuis toujours. Premier à cinq points.",
    controls: "Bouge ta raquette (à gauche) avec la souris, ou ↑ ↓ (Z / S). Frappe la balle avec le bord de la raquette pour l'envoyer en biais. Attention aux parasites !",

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

      // les lignes de balayage, dessinées une fois
      const scan = document.createElement("canvas");
      scan.width = SCR.w; scan.height = SCR.h;
      { const g = scan.getContext("2d"); g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < SCR.h; y += 3) g.fillRect(0, y, SCR.w, 1); }

      const me = { y: SCR.h / 2 }, cpu = { y: SCR.h / 2 };
      let cpuErr = 0, ball, pts = [0, 0], serveAt = secs() + 1.2, ended = 0, rally = 0, bestRally = 0, noiseUntil = 0, nextNoise = secs() + 6, mouseY = null, flash = 0;
      const keys = {};
      function serve(dir) {
        ball = { x: SCR.w / 2, y: SCR.h / 2, vx: 0, vy: 0, dir, live: false };
        serveAt = secs() + 1;
        rally = 0;
      }
      serve(1);

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => { mouseY = toArena(e).y - SCR.y; });
      const onKey = (e) => { keys[e.key.toLowerCase()] = e.type === "keydown"; if (e.type === "keydown" && ["arrowup", "arrowdown"].includes(e.key.toLowerCase())) { e.preventDefault(); mouseY = null; } };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function hit(paddle, side) {
        // l'angle dépend de l'endroit où la balle touche la raquette
        const off = Math.max(-1, Math.min(1, (ball.y - paddle.y) / (PH / 2)));
        const sp = Math.min(980, Math.hypot(ball.vx, ball.vy) * 1.06 + 12);
        const ang = off * 1.05;
        ball.vx = Math.cos(ang) * sp * side; ball.vy = Math.sin(ang) * sp;
        rally++; bestRally = Math.max(bestRally, rally);
        if (side > 0) cpuErr = (Math.random() - 0.5) * PH * (1.05 + Math.min(0.5, rally * 0.04));
        flash = secs();
        Sound.play("note", 0.6, side > 0 ? 2 : 5);
      }
      function point(who) {
        pts[who]++;
        Sound.play(who === 0 ? "bell" : "miss", 0.6);
        if (pts[who] >= GOAL) { ended = secs(); Sound.play(who === 0 ? "win" : "gavel"); return; }
        serve(who === 0 ? -1 : 1);
      }

      function update(dt) {
        if (ended) { if (secs() - ended > 2.5) finish(); return; }
        // ta raquette
        const kd = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.z || keys.w ? 1 : 0);
        if (kd) me.y += kd * 560 * dt;
        else if (mouseY !== null) me.y += Math.max(-900 * dt, Math.min(900 * dt, mouseY - me.y));
        me.y = Math.max(PH / 2, Math.min(SCR.h - PH / 2, me.y));
        // le Grand Écran suit la balle, avec un temps de retard et une vitesse limitée
        // il ne réagit qu'une fois la balle dans sa moitié, et vise avec une petite erreur (tirée à chaque échange)
        const target = ball.vx > 0 && ball.x > SCR.w * 0.42 ? ball.y + cpuErr : SCR.h / 2 + (ball.vx > 0 ? cpuErr : 0);
        const cpuSpeed = 300 + (pts[0] - pts[1]) * 25 + rally * 6;
        cpu.y += Math.max(-cpuSpeed * dt, Math.min(cpuSpeed * dt, target - cpu.y));
        cpu.y = Math.max(PH / 2, Math.min(SCR.h - PH / 2, cpu.y));

        // parasites : l'écran grésille un instant
        if (secs() > nextNoise) { noiseUntil = secs() + 0.6 + Math.random() * 0.5; nextNoise = secs() + 5 + Math.random() * 5; Sound.play("junk", 0.25); }

        if (!ball.live) {
          if (secs() > serveAt) { ball.live = true; const a = (Math.random() - 0.5) * 0.8; ball.vx = Math.cos(a) * 360 * ball.dir; ball.vy = Math.sin(a) * 360; }
          return;
        }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy); Sound.play("tick", 0.3); }
        if (ball.y > SCR.h - BR) { ball.y = SCR.h - BR; ball.vy = -Math.abs(ball.vy); Sound.play("tick", 0.3); }
        // raquettes
        if (ball.vx < 0 && ball.x - BR < 40 + PW && ball.x > 30 && Math.abs(ball.y - me.y) < PH / 2 + BR) { ball.x = 40 + PW + BR; hit(me, 1); }
        if (ball.vx > 0 && ball.x + BR > SCR.w - 40 - PW && ball.x < SCR.w - 30 && Math.abs(ball.y - cpu.y) < PH / 2 + BR) { ball.x = SCR.w - 40 - PW - BR; hit(cpu, -1); }
        if (ball.x < -20) point(1);
        else if (ball.x > SCR.w + 20) point(0);
      }

      function finish() {
        stop();
        const win = pts[0] >= GOAL;
        api.finish({
          score: pts[0] * 200 + (win ? 500 : 0) - pts[1] * 50 + bestRally * 10,
          stars: win ? (pts[1] <= 1 ? 3 : 2) : 1,
          lines: [win ? `Victoire ${pts[0]} – ${pts[1]} contre le Grand Écran !` : `Défaite ${pts[0]} – ${pts[1]}… le Grand Écran ricane.`, `Plus long échange : ${bestRally}`],
        });
      }

      // ---------- dessin ----------
      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // la pièce sombre et le meuble télé
        ctx.fillStyle = "#1c1620"; ctx.fillRect(0, 0, AW, AH);
        Ink.halo(ctx, "rgba(140,220,200,.18)", AW / 2, 330, 520);
        ctx.fillStyle = "#6b4a32"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(SCR.x - 70, SCR.y - 60, SCR.w + 200, SCR.h + 120, 30); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#3b2a20"; ctx.fillRect(SCR.x + SCR.w + 40, SCR.y + 20, 70, SCR.h - 40);
        for (let k = 0; k < 2; k++) { ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.arc(SCR.x + SCR.w + 75, SCR.y + 70 + k * 80, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.save(); ctx.translate(SCR.x + SCR.w + 75, SCR.y + 70 + k * 80); ctx.rotate(t * 0.2 + k); ctx.fillStyle = INK; ctx.fillRect(-2, -16, 4, 10); ctx.restore(); }
        ctx.fillStyle = "#1a1a1a"; for (let k = 0; k < 8; k++) ctx.fillRect(SCR.x + SCR.w + 52, SCR.y + 260 + k * 18, 46, 6);
        // antenne
        ctx.strokeStyle = "#8a8478"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(AW / 2 - 20, SCR.y - 60); ctx.lineTo(AW / 2 - 120, 10); ctx.moveTo(AW / 2 + 20, SCR.y - 60); ctx.lineTo(AW / 2 + 140, 0); ctx.stroke();

        // l'écran lui-même
        ctx.save();
        ctx.beginPath(); ctx.roundRect(SCR.x, SCR.y, SCR.w, SCR.h, 36); ctx.clip();
        ctx.translate(SCR.x, SCR.y);
        ctx.fillStyle = "#0c1a16"; ctx.fillRect(0, 0, SCR.w, SCR.h);
        const glow = "#8ff0c8";
        ctx.fillStyle = "rgba(143,240,200,.25)";
        for (let y = 10; y < SCR.h; y += 28) ctx.fillRect(SCR.w / 2 - 3, y, 6, 16);
        ctx.font = `800 64px "Barlow Semi Condensed", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = "rgba(143,240,200,.55)";
        ctx.fillText(String(pts[0]), SCR.w / 2 - 90, 24); ctx.fillText(String(pts[1]), SCR.w / 2 + 90, 24);
        // raquettes et balle, qui « bavent » un peu comme de l'encre phosphorescente
        Ink.halo(ctx, "rgba(143,240,200,.35)", 40 + PW / 2, me.y, 70);
        Ink.halo(ctx, "rgba(143,240,200,.35)", SCR.w - 40 - PW / 2, cpu.y, 70);
        ctx.fillStyle = glow;
        ctx.fillRect(40, me.y - PH / 2, PW, PH);
        ctx.fillRect(SCR.w - 40 - PW, cpu.y - PH / 2, PW, PH);
        if (ball.live || Math.sin(t * 12) > 0) {
          Ink.halo(ctx, "rgba(143,240,200,.6)", ball.x, ball.y, 26);
          ctx.fillStyle = "#e8fff6"; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fill();
        }
        // parasites
        if (secs() < noiseUntil) {
          for (let k = 0; k < 900; k++) { const v = Math.random() * 255 | 0; ctx.fillStyle = `rgba(${v},${v},${v},.7)`; ctx.fillRect(Math.random() * SCR.w, Math.random() * SCR.h, 3, 2); }
          ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, (t * 300) % SCR.h, SCR.w, 30);
        }
        if (secs() - flash < 0.08) { ctx.fillStyle = "rgba(143,240,200,.06)"; ctx.fillRect(0, 0, SCR.w, SCR.h); }
        ctx.drawImage(scan, 0, 0);
        // le Grand Écran, en reflet dans le verre
        ctx.globalAlpha = 0.1;
        ctx.save(); ctx.translate(SCR.w / 2, SCR.h - 10); ctx.scale(4, 4); Ink.enxor(ctx, 0, 0, t, { seed: 26, color: "#8ff0c8", face: -1, wear: { head: "antenne", face: "lunettes3d" } }); ctx.restore();
        ctx.globalAlpha = 1;
        // bord du tube
        const vg = ctx.createRadialGradient(SCR.w / 2, SCR.h / 2, SCR.h * 0.35, SCR.w / 2, SCR.h / 2, SCR.w * 0.62);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)");
        ctx.fillStyle = vg; ctx.fillRect(0, 0, SCR.w, SCR.h);
        ctx.restore();
        ctx.strokeStyle = "#2b1d14"; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(SCR.x, SCR.y, SCR.w, SCR.h, 36); ctx.stroke();

        Ink.word(ctx, "Toi", SCR.x + 60, SCR.y + SCR.h + 32, 16, PAPER, 800, "#6b4a32");
        Ink.word(ctx, "Le Grand Écran", SCR.x + SCR.w - 80, SCR.y + SCR.h + 32, 16, PAPER, 800, "#6b4a32");
        if (rally >= 4) Ink.word(ctx, `Échange : ${rally}`, AW / 2, SCR.y + SCR.h + 32, 16, "#8ff0c8", 800, "#6b4a32");
        if (ended) Ink.word(ctx, pts[0] >= GOAL ? "VICTOIRE !" : "GAME OVER", AW / 2, AH / 2, 60, pts[0] >= GOAL ? "#8ff0c8" : "#f2c1cf", 800, "#0c1a16");
      }

      let raf = 0, last = performance.now(), running = true;
      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        // petits pas : la balle rapide ne traverse pas les raquettes
        for (let k = 0; k < 3; k++) update(dt / 3);
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
      if (location.hostname === "localhost") window.__pong = { state: () => ({ pts, ended: !!ended }), autopilot: () => { mouseY = ball.y + (Math.random() - 0.5) * 60; } };
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
