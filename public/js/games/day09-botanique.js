// Jour 9 · Botanique : « La liane de Verdanya »
// On guide la pointe d'une liane qui pousse vers la canopée : boire les gouttes, cueillir la lumière, éviter les épines.
// À la fin, la caméra recule et montre toute la plante qu'on a fait pousser.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, TOP = 4200, SPEED = 150, TIP_Y = 520;

  function buildLevel() {
    const r = Ink.rng(9009);
    const thorns = [], drops = [], suns = [], bushes = [];
    let side = r() < 0.5 ? 0 : 1;
    for (let h = 450; h < TOP - 250; h += 190 + r() * 90) {
      const kind = r();
      if (kind < 0.62) {
        // une branche épineuse qui part d'un côté ; on laisse toujours un passage de 380 px au moins
        const len = 260 + r() * 360;
        thorns.push(side ? { x0: AW - len, x1: AW, h } : { x0: 0, x1: len, h });
        const gap = side ? (AW - len) / 2 : len + (AW - len) / 2;
        (r() < 0.5 ? suns : drops).push({ x: gap + (r() - 0.5) * 140, h: h + 30 + r() * 60 });
        side = 1 - side;
      } else if (kind < 0.85) {
        bushes.push({ x: 250 + r() * 600, h, r: 34 + r() * 18 });
        suns.push({ x: 150 + r() * 800, h: h + 90 });
      } else {
        // une clairière : plein de lumière
        for (let k = 0; k < 3; k++) suns.push({ x: 300 + k * 250 + (r() - 0.5) * 80, h: h + k * 40 });
      }
      if (r() < 0.55) drops.push({ x: 150 + r() * 800, h: h + 110 + r() * 40 });
    }
    return { thorns, drops, suns, bushes };
  }

  Games.register(9, {
    title: "La liane de Verdanya",
    music: "jungle",
    story: "Au fond de la jungle, Verdanya, la déesse des plantes, dort sous la canopée. On raconte qu'une liane qui monte jusqu'à elle la réveille. Guide une jeune pousse vers le ciel : bois les gouttes pour garder ta sève, cueille la lumière pour fleurir, et évite les épines.",
    controls: "La pointe de la liane suit ta souris. Tu peux aussi utiliser ← → ou Q / D. Les gouttes bleues redonnent de la sève, les lumières font pousser des fleurs.",

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

      const L = buildLevel();
      const tip = { x: AW / 2, h: 0, a: 0 };
      const path = [{ x: tip.x, h: 0 }], leaves = [], flowers = [];
      let sap = 100, suns = 0, drops = 0, hurtUntil = 0, mouseX = null, keyDir = 0, phase = "grow", endAt = 0, reached = false, shake = 0;
      const pops = [];
      const startAt = secs();

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => { mouseX = toArena(e).x; });
      const keys = {};
      const onKey = (e) => {
        keys[e.key.toLowerCase()] = e.type === "keydown";
        if (e.type === "keydown" && ["arrowleft", "arrowright", "q", "d", "a"].includes(e.key.toLowerCase())) mouseX = null;
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function update(dt) {
        if (phase !== "grow") {
          if (secs() - endAt > 5.5) finish();
          return;
        }
        // direction voulue : vers la souris, ou avec les flèches
        keyDir = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.q || keys.a ? 1 : 0);
        let want;
        if (keyDir) want = keyDir * 1.0;
        else if (mouseX !== null) want = Math.max(-1.05, Math.min(1.05, (mouseX - tip.x) / 160));
        else want = 0;
        tip.a += (want - tip.a) * Math.min(1, dt * 5);
        const sp = SPEED * (secs() < hurtUntil ? 0.55 : 1);
        tip.x = Math.max(40, Math.min(AW - 40, tip.x + Math.sin(tip.a) * sp * 1.4 * dt));
        tip.h += Math.cos(tip.a) * sp * dt;
        const lastP = path[path.length - 1];
        if (Math.hypot(tip.x - lastP.x, tip.h - lastP.h) > 7) {
          path.push({ x: tip.x, h: tip.h });
          // une feuille de temps en temps, d'un côté puis de l'autre
          if (path.length % 9 === 0) leaves.push({ i: path.length - 1, side: (path.length / 9) % 2 ? 1 : -1, born: secs(), size: 0.8 + Math.random() * 0.5 });
        }

        sap -= dt * 3.2;
        // ramasser
        for (const d of L.drops) if (!d.got && Math.hypot(d.x - tip.x, d.h - tip.h) < 30) {
          d.got = true; drops++; sap = Math.min(100, sap + 22);
          pops.push({ x: d.x, h: d.h, t: secs(), text: "+ sève", color: "#8fc7e8" });
          Sound.play("plouf", 0.7);
        }
        for (const u of L.suns) if (!u.got && Math.hypot(u.x - tip.x, u.h - tip.h) < 32) {
          u.got = true; suns++;
          flowers.push({ i: path.length - 1, born: secs(), hue: ["#f2c1cf", "#e9b04a", "#d36b9c", "#f2ead8", "#b48be0"][suns % 5] });
          pops.push({ x: u.x, h: u.h, t: secs(), text: "fleur !", color: "#e9b04a" });
          Sound.play("note", 0.8, suns);
        }
        // épines
        if (secs() > hurtUntil) {
          let hit = L.thorns.some((th) => tip.x >= th.x0 - 6 && tip.x <= th.x1 + 6 && Math.abs(tip.h - th.h) < 14);
          hit ||= L.bushes.some((b) => Math.hypot(b.x - tip.x, b.h - tip.h) < b.r + 4);
          if (hit) {
            sap -= 22; hurtUntil = secs() + 1.1; shake = 0.4;
            pops.push({ x: tip.x, h: tip.h, t: secs(), text: "aïe !", color: "#d36b9c" });
            Sound.play("junk");
          }
        }
        shake = Math.max(0, shake - dt);
        if (tip.h >= TOP) { reached = true; end(); Sound.play("win"); }
        else if (sap <= 0) { sap = 0; end(); Sound.play("miss"); }
      }
      function end() { phase = "end"; endAt = secs(); }

      function finish() {
        stop();
        const height = Math.min(TOP, Math.round(tip.h));
        const score = Math.round((height / TOP) * 1000) + suns * 60 + drops * 15 + (reached ? 300 + Math.round(sap) * 4 : 0);
        api.finish({
          score,
          // 3 étoiles : réveiller Verdanya avec au moins la moitié des lumières cueillies
          stars: reached && suns >= L.suns.length * 0.5 ? 3 : reached || suns >= L.suns.length * 0.35 ? 2 : 1,
          lines: [reached ? "Verdanya s'est éveillée !" : `La liane a séché à ${Math.round(height / 10)} m`, `${suns} fleurs sur ${L.suns.length} · ${drops} gouttes bues`],
        });
      }

      // ---------- dessin ----------
      const SKY = [[0, [24, 40, 28]], [0.45, [40, 78, 50]], [0.8, [92, 140, 84]], [1, [190, 214, 150]]];
      function skyAt(k) {
        for (let i = 1; i < SKY.length; i++) if (k <= SKY[i][0]) {
          const [k0, c0] = SKY[i - 1], [k1, c1] = SKY[i], f = (k - k0) / (k1 - k0);
          return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * f)).join(",")})`;
        }
        return "rgb(190,214,150)";
      }
      // troncs et feuilles de fond, posés une fois pour toutes
      const DECO = (() => {
        const r = Ink.rng(919), list = [];
        for (let h = 0; h < TOP + 800; h += 120) list.push({ x: r() * AW, h, k: r(), side: r() < 0.5 });
        return list;
      })();

      function leafShape(x, y, ang, len, color) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(ang);
        ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = Math.min(1.5, len / 20);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
        ctx.restore();
      }
      function flowerShape(x, y, size, color, t) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(t * 0.3);
        ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
        for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * size * 0.6, Math.sin(a) * size * 0.6, size * 0.55, size * 0.36, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = "#e9b04a";
        ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, AW, AH); ctx.clip();

        // caméra : suit la pointe, puis recule pour montrer toute la plante
        let zoom = 1, camH = tip.h - (AH - TIP_Y);
        if (phase === "end") {
          const k = Math.min(1, Math.max(0, (secs() - endAt - 1.2) / 2));
          const e = k * k * (3 - 2 * k);
          const fullZoom = (AH - 110) / ((reached ? TOP + 420 : tip.h + 200) + 60);
          zoom = 1 + (fullZoom - 1) * e;
          camH = camH * (1 - e) + (-110 / fullZoom - 40) * e;
        }
        const sx = (x) => AW / 2 + (x - AW / 2) * zoom + (shake ? (Math.random() - 0.5) * 8 : 0);
        const sy = (h) => AH - (h - camH) * zoom;

        // ciel qui s'éclaircit en montant (bandes)
        for (let y = 0; y < AH; y += 20) {
          const h = camH + (AH - y) / zoom;
          ctx.fillStyle = skyAt(Math.max(0, Math.min(1, h / TOP)));
          ctx.fillRect(0, y, AW, 21);
        }
        // décor de fond : troncs et grandes feuilles
        for (const d of DECO) {
          const y = sy(d.h);
          if (y < -200 || y > AH + 200) continue;
          ctx.globalAlpha = 0.22;
          if (d.k < 0.3) {
            ctx.fillStyle = "#0f1f14";
            ctx.fillRect(sx(d.x) - 16 * zoom, y - 140 * zoom, 32 * zoom, 160 * zoom);
          } else leafShape(sx(d.x), y, d.side ? -0.6 : Math.PI + 0.6, 90 * zoom, "#1f3a26");
          ctx.globalAlpha = 1;
        }
        // rayons de lumière vers le haut
        if (camH > TOP * 0.6 || phase === "end") {
          ctx.globalAlpha = 0.12;
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = "#fff1b0";
            ctx.beginPath(); const x = 200 + k * 230 + Math.sin(t * 0.3 + k) * 30;
            ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x - 40, AH); ctx.lineTo(x - 120, AH); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // la canopée et Verdanya, tout en haut
        {
          const y = sy(TOP + 60);
          if (y > -400) {
            ctx.fillStyle = "#2f5a34";
            for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(sx(k * 85), y - 40 * zoom, 90 * zoom, 0, Math.PI * 2); ctx.fill(); }
            const vy = y - 120 * zoom;
            Ink.halo(ctx, "rgba(180,240,140,.5)", sx(AW / 2), vy, 160 * zoom);
            ctx.save();
            ctx.translate(sx(AW / 2), vy);
            ctx.scale(zoom * 3, zoom * 3);
            Ink.enxor(ctx, 0, 0, t, { seed: 99, color: "#7cd15a", face: 1, wear: { head: "fleur", back: "lierre" }, emote: reached ? "danse" : "dodo", et: 1 });
            ctx.restore();
            Ink.word(ctx, "Verdanya", sx(AW / 2), vy - 110 * zoom, Math.max(12, 20 * zoom), "#e8f5c8", 800, "#1b1b1b");
          }
        }

        // obstacles et bonus
        for (const th of L.thorns) {
          const y = sy(th.h);
          if (y < -40 || y > AH + 40) continue;
          ctx.strokeStyle = "#4a2f1e"; ctx.lineWidth = 12 * zoom; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(sx(th.x0), y); ctx.lineTo(sx(th.x1), y); ctx.stroke();
          ctx.fillStyle = "#d9cfb8";
          for (let x = th.x0 + 14; x < th.x1 - 6; x += 24) {
            ctx.beginPath(); ctx.moveTo(sx(x - 5), y - 4 * zoom); ctx.lineTo(sx(x), y - 18 * zoom); ctx.lineTo(sx(x + 5), y - 4 * zoom); ctx.fill();
            ctx.beginPath(); ctx.moveTo(sx(x + 7), y + 4 * zoom); ctx.lineTo(sx(x + 12), y + 18 * zoom); ctx.lineTo(sx(x + 17), y + 4 * zoom); ctx.fill();
          }
        }
        for (const b of L.bushes) {
          const y = sy(b.h);
          if (y < -80 || y > AH + 80) continue;
          ctx.fillStyle = "#3a2a20";
          ctx.beginPath(); ctx.arc(sx(b.x), y, b.r * zoom, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#d9cfb8";
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(sx(b.x) + Math.cos(a - 0.15) * b.r * zoom, y + Math.sin(a - 0.15) * b.r * zoom);
            ctx.lineTo(sx(b.x) + Math.cos(a) * (b.r + 14) * zoom, y + Math.sin(a) * (b.r + 14) * zoom);
            ctx.lineTo(sx(b.x) + Math.cos(a + 0.15) * b.r * zoom, y + Math.sin(a + 0.15) * b.r * zoom);
            ctx.fill();
          }
        }
        for (const d of L.drops) {
          if (d.got) continue;
          const y = sy(d.h) + Math.sin(t * 3 + d.x) * 4;
          if (y < -30 || y > AH + 30) continue;
          const x = sx(d.x);
          Ink.halo(ctx, "rgba(143,199,232,.45)", x, y, 26 * zoom);
          ctx.fillStyle = "#8fc7e8"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y - 14 * zoom); ctx.quadraticCurveTo(x + 10 * zoom, y + 2 * zoom, x, y + 8 * zoom); ctx.quadraticCurveTo(x - 10 * zoom, y + 2 * zoom, x, y - 14 * zoom); ctx.fill(); ctx.stroke();
        }
        for (const u of L.suns) {
          if (u.got) continue;
          const y = sy(u.h);
          if (y < -30 || y > AH + 30) continue;
          const x = sx(u.x);
          Ink.halo(ctx, "rgba(255,230,140,.6)", x, y, 30 * zoom);
          ctx.fillStyle = "#fff1b0";
          ctx.beginPath(); ctx.arc(x, y, (6 + Math.sin(t * 5 + u.x) * 1.5) * zoom, 0, Math.PI * 2); ctx.fill();
        }

        // la liane
        const first = phase === "end" ? 0 : Math.max(0, path.length - Math.ceil((AH + 40) / 7 / zoom) - 4);
        for (const [w, c] of [[11, INK], [7, "#4f8f45"]]) {
          ctx.strokeStyle = c; ctx.lineWidth = w * zoom; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath();
          for (let i = first; i < path.length; i++) {
            const p = path[i], sway = Math.sin(t * 1.5 + i * 0.05) * Math.min(6, (path.length - i) * 0.02);
            (i === first ? ctx.moveTo : ctx.lineTo).call(ctx, sx(p.x + sway), sy(p.h));
          }
          ctx.lineTo(sx(tip.x), sy(tip.h));
          ctx.stroke();
        }
        // feuilles qui se déplient, puis fleurs
        for (const lf of leaves) {
          if (lf.i < first) continue;
          const p = path[lf.i], y = sy(p.h);
          if (y < -40 || y > AH + 40) continue;
          const grow = Math.min(1, (secs() - lf.born) / 0.6);
          leafShape(sx(p.x), y, lf.side > 0 ? -0.5 + Math.sin(t * 2 + lf.i) * 0.08 : Math.PI + 0.5 + Math.sin(t * 2 + lf.i) * 0.08, 30 * lf.size * grow * zoom, "#6fae5c");
        }
        for (const f of flowers) {
          if (f.i < first) continue;
          const p = path[f.i], y = sy(p.h);
          if (y < -40 || y > AH + 40) continue;
          const grow = Math.min(1, (secs() - f.born) / 0.5);
          flowerShape(sx(p.x), y, 13 * grow * Math.max(zoom, 0.5), f.hue, t);
        }
        // la pointe
        if (phase === "grow") {
          const x = sx(tip.x), y = sy(tip.h);
          ctx.save();
          ctx.translate(x, y); ctx.rotate(tip.a);
          ctx.fillStyle = secs() < hurtUntil && Math.sin(t * 30) > 0 ? "#d36b9c" : "#8fd18a";
          ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(10, -4, 4, 4); ctx.lineTo(-4, 4); ctx.quadraticCurveTo(-10, -4, 0, -18); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1) continue;
          ctx.globalAlpha = 1 - age;
          Ink.word(ctx, p.text, sx(p.x), sy(p.h) - 20 - age * 40, 18, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        // interface : jauge de sève et hauteur
        if (phase === "grow") {
          ctx.fillStyle = "rgba(20,30,22,.75)";
          ctx.beginPath(); ctx.roundRect(24, 22, 280, 64, 12); ctx.fill();
          Ink.word(ctx, "Sève", 60, 42, 15, "#cfe8c0", 700, "#1b1b1b");
          ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(90, 34, 196, 14);
          ctx.fillStyle = sap < 25 ? "#d36b9c" : "#7cd15a"; ctx.fillRect(90, 34, 196 * sap / 100, 14);
          Ink.word(ctx, `${Math.round(tip.h / 10)} m / ${TOP / 10} m   ·   ${suns} fleurs`, 160, 68, 15, PAPER, 700, "#1b1b1b");
          // barre de progression verticale à droite
          ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(AW - 30, 40, 8, AH - 80);
          ctx.fillStyle = "#7cd15a"; const ph = (AH - 80) * Math.min(1, tip.h / TOP); ctx.fillRect(AW - 30, AH - 40 - ph, 8, ph);
          if (secs() - startAt < 4) Ink.word(ctx, "Monte vers la lumière !", AW / 2, 120, 26, "#e8f5c8", 800, "#1b1b1b");
        } else {
          const k = Math.min(1, (secs() - endAt) / 0.8);
          ctx.globalAlpha = k;
          ctx.fillStyle = "rgba(20,30,22,.7)"; ctx.fillRect(0, AH - 110, AW, 110);
          Ink.word(ctx, reached ? "Verdanya s'éveille !" : "La liane a séché…", AW / 2, AH - 70, 36, reached ? "#e8f5c8" : "#e9b04a", 800, "#1b1b1b");
          Ink.word(ctx, `${Math.round(tip.h / 10)} m · ${suns} fleurs`, AW / 2, AH - 30, 18, PAPER, 700, "#1b1b1b");
          ctx.globalAlpha = 1;
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
      if (location.hostname === "localhost") {
        // tests : un pilote automatique qui vise la prochaine lumière ou goutte en évitant les épines
        window.__liane = {
          state: () => ({ h: tip.h, sap, suns, phase }),
          autopilot() {
            const ahead = (o) => o.h > tip.h + 20 && o.h < tip.h + 320 && !o.got;
            const blocked = (x, h) => L.thorns.some((th) => x >= th.x0 - 30 && x <= th.x1 + 30 && th.h > h && th.h < h + 200) || L.bushes.some((b) => Math.abs(b.x - x) < b.r + 40 && b.h > h && b.h < h + 200);
            const goal = [...L.suns, ...(sap < 60 ? L.drops : [])].filter(ahead).filter((o) => !blocked(o.x, tip.h)).sort((a, b) => a.h - b.h)[0];
            if (goal) { mouseX = goal.x; return; }
            // sinon, chercher la colonne libre la plus proche
            let best = tip.x, bd = 1e9;
            for (let x = 60; x < AW - 60; x += 20) if (!blocked(x, tip.h) && Math.abs(x - tip.x) < bd) { bd = Math.abs(x - tip.x); best = x; }
            mouseX = best;
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
