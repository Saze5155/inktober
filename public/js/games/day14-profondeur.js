// Jour 14 · Profondeur : « La plongée d'Abyssara »
// Descendre une faille sous-marine dans le noir complet. Notre petite lumière ne porte pas loin :
// le sonar (clic / espace) révèle un instant les parois. Garder de l'air, cueillir des perles, atteindre le fond.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, DEPTH = 3600, STEP = 30, LIGHT = 95, PING_CD = 1.2;

  function buildCave() {
    const r = Ink.rng(1414);
    const rows = [];
    let cx = AW / 2, drift = 0;
    for (let h = -400; h <= DEPTH + 400; h += STEP) {
      drift = drift * 0.85 + (r() - 0.5) * 22;
      cx = Math.max(260, Math.min(AW - 260, cx + drift));
      let w = 230 + Math.sin(h * 0.004) * 80 + (r() - 0.5) * 40;
      if (h < 120) w = 520;                       // l'entrée, large
      if (h > DEPTH - 200) w = 640;               // la chambre d'Abyssara
      rows.push({ h, l: cx - w / 2, r: cx + w / 2 });
    }
    const at = (h) => {
      const i = Math.max(0, Math.min(rows.length - 2, Math.floor((h + 400) / STEP)));
      const a = rows[i], b = rows[i + 1], f = Math.max(0, Math.min(1, (h - a.h) / STEP));
      return { l: a.l + (b.l - a.l) * f, r: a.r + (b.r - a.r) * f };
    };
    const inside = (h, k) => { const w = at(h); return w.l + 30 + (w.r - w.l - 60) * k; };
    const pearls = [], air = [], jellies = [];
    for (let h = 250; h < DEPTH - 250; h += 120 + r() * 60) pearls.push({ h, x: inside(h, r() < 0.5 ? r() * 0.2 : 0.8 + r() * 0.2) });
    for (let h = 420; h < DEPTH - 200; h += 380 + r() * 120) air.push({ h, x: inside(h, 0.25 + r() * 0.5) });
    for (let h = 600; h < DEPTH - 300; h += 200 + r() * 120) jellies.push({ h0: h, x0: inside(h, 0.5), ph: r() * 6, amp: 50 + r() * 40 });
    return { rows, at, pearls, air, jellies };
  }

  Games.register(14, {
    title: "La plongée d'Abyssara",
    music: "grotte",
    story: "Sous la mer noire de Rive-Basse s'ouvre une faille sans fond. Tout en bas dort Abyssara, la déesse des profondeurs, qui garde les perles que les humains ont perdues. Ta lumière ne porte pas loin, mais ton sonar fait chanter les parois. Descends jusqu'à elle sans manquer d'air.",
    controls: "Ton Enxor nage vers la souris. Clic ou Espace : coup de sonar, qui montre les parois un court instant. Les bulles redonnent de l'air, les méduses et les parois en font perdre.",

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

      const C = buildCave();
      const dark = document.createElement("canvas");
      dark.width = AW; dark.height = AH;
      const dctx = dark.getContext("2d");

      const me = { x: AW / 2, y: 0, vx: 0, vy: 0 };
      let air = 100, pearls = 0, pings = [], lastPing = -9, hurtUntil = 0, ended = 0, reached = false, mouse = { x: AW / 2, y: 400 }, cam = -260;
      const pops = [], bubbles = [];
      const startAt = secs();

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointermove", (e) => { mouse = toArena(e); });
      canvas.addEventListener("pointerdown", (e) => { mouse = toArena(e); ping(); });
      const onKey = (e) => { if (e.key === " ") { e.preventDefault(); ping(); } };
      window.addEventListener("keydown", onKey);

      function ping() {
        if (ended || secs() - lastPing < PING_CD) return;
        lastPing = secs();
        pings.push({ x: me.x, y: me.y, t: secs() });
        Sound.play("note", 0.5, 0);
        Sound.play("note", 0.3, 4);
      }

      function update(dt) {
        if (ended) { if (secs() - ended > 4) finish(); return; }
        // nager vers la souris (coordonnées du monde)
        const tx = mouse.x, ty = mouse.y + cam;
        const dx = tx - me.x, dy = ty - me.y, d = Math.hypot(dx, dy);
        const slow = secs() < hurtUntil ? 0.4 : 1;
        if (d > 8) { me.vx += (dx / d) * 520 * dt * slow; me.vy += (dy / d) * 520 * dt * slow; }
        me.vy += 20 * dt; // on coule doucement
        const sp = Math.hypot(me.vx, me.vy), max = 200;
        if (sp > max) { me.vx *= max / sp; me.vy *= max / sp; }
        me.vx *= 1 - Math.min(1, dt * 2.2); me.vy *= 1 - Math.min(1, dt * 2.2);
        me.x += me.vx * dt; me.y += me.vy * dt;
        me.y = Math.max(-200, me.y);
        // les parois
        const w = C.at(me.y), R = 16;
        let bump = false;
        if (me.x < w.l + R) { me.x = w.l + R; me.vx = Math.abs(me.vx) * 0.6; bump = true; }
        if (me.x > w.r - R) { me.x = w.r - R; me.vx = -Math.abs(me.vx) * 0.6; bump = true; }
        if (bump && secs() > hurtUntil) { air -= 6; hurtUntil = secs() + 0.6; pops.push({ x: me.x, y: me.y - 30, t: secs(), text: "Bonk !", color: "#cdd6ff" }); Sound.play("junk", 0.6); }

        cam += (me.y - 260 - cam) * Math.min(1, dt * 3);
        air -= dt * (me.y > 0 ? 1.45 : 0);
        if (me.y > 0 && Math.random() < dt * 3) bubbles.push({ x: me.x + 6, y: me.y - 14, t: secs() });

        for (const p of C.pearls) if (!p.got && Math.hypot(p.x - me.x, p.h - me.y) < 26) {
          p.got = true; pearls++;
          pops.push({ x: p.x, y: p.h - 24, t: secs(), text: "Perle !", color: "#f2ead8" });
          Sound.play("note", 0.8, pearls + 2);
        }
        for (const a of C.air) if (!a.got && Math.hypot(a.x - me.x, a.h - me.y) < 34) {
          a.got = true; air = Math.min(100, air + 30);
          pops.push({ x: a.x, y: a.h - 30, t: secs(), text: "+ air", color: "#8fc7e8" });
          Sound.play("plouf", 0.8);
        }
        const t = secs();
        for (const j of C.jellies) {
          const p = jellyPos(j, t);
          if (Math.hypot(p.x - me.x, p.y - me.y) < 30 && secs() > hurtUntil) {
            air -= 10; hurtUntil = secs() + 1;
            me.vx += (me.x - p.x) * 4; me.vy += (me.y - p.y) * 4;
            pops.push({ x: me.x, y: me.y - 30, t: secs(), text: "Ça pique !", color: "#f2c1cf" });
            Sound.play("surprise", 0.6);
          }
        }
        if (me.y >= DEPTH) { reached = true; ended = secs(); Sound.play("reveal"); Sound.play("win"); }
        else if (air <= 0) { air = 0; ended = secs(); Sound.play("miss"); }
      }
      function jellyPos(j, t) {
        const w = C.at(j.h0);
        return { x: Math.max(w.l + 30, Math.min(w.r - 30, j.x0 + Math.sin(t * 0.5 + j.ph) * j.amp)), y: j.h0 + Math.sin(t * 0.8 + j.ph) * 40 };
      }

      function finish() {
        stop();
        const depth = Math.max(0, Math.min(DEPTH, me.y));
        const score = Math.round((depth / DEPTH) * 1000) + pearls * 80 + (reached ? 300 + Math.round(air) * 5 : 0);
        api.finish({
          score,
          stars: reached && pearls >= C.pearls.length * 0.5 ? 3 : reached ? 2 : 1,
          lines: [reached ? "Tu as vu l'œil d'Abyssara" : `Remonté à court d'air à ${Math.round(depth / 3.6)} m`, `${pearls} perles sur ${C.pearls.length}`],
        });
      }

      // ---------- dessin ----------
      const sy = (h) => h - cam;
      function waterColor(h) {
        const k = Math.max(0, Math.min(1, h / DEPTH));
        return `rgb(${Math.round(20 - k * 14)},${Math.round(60 - k * 50)},${Math.round(80 - k * 58)})`;
      }
      function wallPath(side) {
        ctx.beginPath();
        const x0 = side === "l" ? 0 : AW;
        let first = true;
        for (const row of C.rows) {
          const y = sy(row.h);
          if (y < -60 || y > AH + 60) continue;
          if (first) { ctx.moveTo(x0, y); first = false; }
          ctx.lineTo(row[side], y);
        }
        ctx.lineTo(x0, AH + 60);
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // l'eau : de plus en plus noire
        for (let y = 0; y < AH; y += 34) { ctx.fillStyle = waterColor(cam + y); ctx.fillRect(0, y, AW, 35); }
        // la surface, au début
        if (cam < 0) {
          ctx.fillStyle = "#8fb8c8"; ctx.fillRect(0, 0, AW, sy(-160));
          ctx.fillStyle = "rgba(239,229,208,.3)";
          for (let x = 0; x < AW; x += 40) { ctx.beginPath(); ctx.arc(x + Math.sin(t + x) * 5, sy(-160), 22, 0, Math.PI); ctx.fill(); }
        }
        // parois
        for (const side of ["l", "r"]) {
          wallPath(side);
          ctx.fillStyle = "#151a22"; ctx.fill();
        }
        // la chambre d'Abyssara, tout au fond
        const ey = sy(DEPTH + 150);
        if (ey < AH + 200) {
          const open = reached ? Math.min(1, (secs() - ended) / 1.5) : 0.08;
          Ink.halo(ctx, "rgba(120,240,210,.35)", AW / 2, ey, 300);
          ctx.fillStyle = "#0b1a1a"; ctx.strokeStyle = "#7cd1c0"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(AW / 2, ey, 200, 90 * open + 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          if (open > 0.2) {
            ctx.fillStyle = "#c8fff0"; ctx.beginPath(); ctx.ellipse(AW / 2, ey, 70 * open, 70 * open, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(AW / 2, ey, 14, 60 * open, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        // bulles d'air, perles, méduses
        for (const a of C.air) {
          if (a.got) continue;
          const y = sy(a.h) + Math.sin(t * 2 + a.x) * 5;
          if (y < -40 || y > AH + 40) continue;
          ctx.strokeStyle = "rgba(170,220,240,.9)"; ctx.lineWidth = 2.5;
          for (const [dx, dy, rr] of [[0, 0, 16], [-14, 10, 8], [12, 12, 6]]) { ctx.beginPath(); ctx.arc(a.x + dx, y + dy, rr, 0, Math.PI * 2); ctx.stroke(); }
        }
        for (const p of C.pearls) {
          if (p.got) continue;
          const y = sy(p.h);
          if (y < -30 || y > AH + 30) continue;
          ctx.fillStyle = "#3b3440"; ctx.beginPath(); ctx.ellipse(p.x, y + 6, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#f2ead8"; ctx.beginPath(); ctx.arc(p.x, y, 7, 0, Math.PI * 2); ctx.fill();
        }
        const jellies = C.jellies.map((j) => ({ j, p: jellyPos(j, t) })).filter(({ p }) => sy(p.y) > -60 && sy(p.y) < AH + 60);
        for (const { p } of jellies) {
          const y = sy(p.y);
          ctx.fillStyle = "rgba(211,107,156,.55)"; ctx.strokeStyle = "rgba(242,193,207,.9)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p.x, y, 20, Math.PI, 0); ctx.quadraticCurveTo(p.x, y + 8, p.x - 20, y); ctx.fill(); ctx.stroke();
          for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(p.x - 12 + k * 8, y + 3); ctx.quadraticCurveTo(p.x - 12 + k * 8 + Math.sin(t * 3 + k) * 6, y + 20, p.x - 12 + k * 8, y + 34); ctx.stroke(); }
        }

        // le plongeur
        const my = sy(me.y);
        ctx.save();
        ctx.translate(me.x, my + 20);
        ctx.scale(1.3, 1.3);
        Ink.enxor(ctx, 0, 0, t, { seed: 14, color: "#7cd1c0", face: me.vx >= 0 ? 1 : -1, moving: true, wear: { face: "lunettes", head: "leurre" } });
        ctx.restore();
        for (const b of bubbles) {
          const age = secs() - b.t;
          if (age > 2) continue;
          ctx.strokeStyle = `rgba(200,230,245,${1 - age / 2})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(b.x + Math.sin(age * 6) * 3, sy(b.y) - age * 50, 2 + age, 0, Math.PI * 2); ctx.stroke();
        }

        // le noir des profondeurs, avec la lumière du plongeur
        const deep = Math.max(0, Math.min(0.97, (cam + 200) / 600)) * (reached ? 1 - 0.75 * Math.min(1, (secs() - ended) / 1.5) : 1);
        dctx.globalCompositeOperation = "source-over";
        dctx.clearRect(0, 0, AW, AH);
        dctx.fillStyle = `rgba(2,4,8,${deep})`;
        dctx.fillRect(0, 0, AW, AH);
        dctx.globalCompositeOperation = "destination-out";
        Ink.halo(dctx, "rgba(0,0,0,1)", me.x, my, LIGHT * 1.8);
        for (const a of C.air) if (!a.got) Ink.halo(dctx, "rgba(0,0,0,.35)", a.x, sy(a.h), 40);
        ctx.drawImage(dark, 0, 0);
        // ce qui brille dans le noir : perles, méduses
        for (const p of C.pearls) if (!p.got && Math.abs(sy(p.h) - AH / 2) < AH) Ink.halo(ctx, "rgba(242,234,216,.25)", p.x, sy(p.h), 16 + Math.sin(t * 3 + p.h) * 3);
        for (const { p } of jellies) Ink.halo(ctx, "rgba(211,107,156,.35)", p.x, sy(p.y), 36);

        // les échos du sonar : les parois s'allument au passage de l'onde
        pings = pings.filter((p) => secs() - p.t < 2.6);
        for (const p of pings) {
          const age = secs() - p.t, rad = age * 520, fade = Math.max(0, 1 - age / 2.6);
          ctx.strokeStyle = `rgba(120,240,210,${0.5 * (1 - age / 1.2)})`; ctx.lineWidth = 2;
          if (age < 1.2) { ctx.beginPath(); ctx.arc(p.x, sy(p.y), rad, 0, Math.PI * 2); ctx.stroke(); }
          ctx.strokeStyle = `rgba(120,240,210,${fade})`; ctx.lineWidth = 3;
          for (const side of ["l", "r"]) {
            ctx.beginPath();
            let pen = false;
            for (const row of C.rows) {
              const y = sy(row.h);
              if (y < -40 || y > AH + 40) { pen = false; continue; }
              const lit = Math.hypot(row[side] - p.x, row.h - p.y) < rad;
              if (lit) { pen ? ctx.lineTo(row[side], y) : ctx.moveTo(row[side], y); pen = true; } else pen = false;
            }
            ctx.stroke();
          }
          // les méduses répondent aussi au sonar
          for (const { p: jp } of jellies) if (Math.hypot(jp.x - p.x, jp.y - p.y) < rad) { ctx.fillStyle = `rgba(242,193,207,${fade})`; ctx.beginPath(); ctx.arc(jp.x, sy(jp.y), 5, 0, Math.PI * 2); ctx.fill(); }
        }

        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.2) continue;
          ctx.globalAlpha = Math.min(1, 1.2 - age);
          Ink.word(ctx, p.text, p.x, sy(p.y) - age * 30, 17, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }

        // interface
        ctx.fillStyle = "rgba(10,20,26,.75)";
        ctx.beginPath(); ctx.roundRect(22, 20, 260, 70, 12); ctx.fill();
        Ink.word(ctx, "Air", 52, 40, 15, "#cfe8f5", 700, "#1b1b1b");
        ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(80, 33, 186, 14);
        ctx.fillStyle = air < 25 ? (Math.sin(t * 10) > 0 ? "#d36b9c" : "#8e1b2b") : "#8fc7e8"; ctx.fillRect(80, 33, 186 * Math.max(0, air) / 100, 14);
        Ink.word(ctx, `${Math.max(0, Math.round(me.y / 3.6))} m / ${DEPTH / 3.6} m  ·  ${pearls} perles`, 150, 70, 15, PAPER, 700, "#1b1b1b");
        const cd = Math.min(1, (secs() - lastPing) / PING_CD);
        ctx.strokeStyle = cd >= 1 ? "#7cd1c0" : "rgba(124,209,192,.35)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(AW - 50, 50, 22, -Math.PI / 2, -Math.PI / 2 + cd * Math.PI * 2); ctx.stroke();
        Ink.word(ctx, "sonar", AW - 50, 50, 13, cd >= 1 ? "#c8fff0" : "#6b8a88", 700, "#1b1b1b");
        if (secs() - startAt < 5) Ink.word(ctx, "Clic ou Espace : sonar", AW / 2, AH - 40, 22, "#c8fff0", 800, "#1b1b1b");
        if (ended) {
          ctx.globalAlpha = Math.min(1, (secs() - ended) / 0.8);
          Ink.word(ctx, reached ? "L'œil d'Abyssara s'ouvre…" : "Plus d'air ! On remonte…", AW / 2, 140, 36, reached ? "#c8fff0" : "#f2c1cf", 800, "#1b1b1b");
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
      }
      if (location.hostname === "localhost") {
        // tests : pilote qui vise le centre du tunnel un peu plus bas, ou une perle / une bulle proche
        window.__plongee = {
          state: () => ({ y: Math.round(me.y), air: Math.round(air), pearls, ended: !!ended }),
          steer() {
            const near = [...C.pearls, ...(air < 60 ? C.air : [])].filter((o) => !o.got && o.h > me.y - 20 && o.h < me.y + 180).sort((a, b) => a.h - b.h)[0];
            let tx, ty;
            if (near) { tx = near.x; ty = near.h + 20; }
            else { const w = C.at(me.y + 140); tx = (w.l + w.r) / 2; ty = me.y + 160; }
            mouse = { x: tx, y: ty - cam };
            if (secs() - lastPing > PING_CD) ping();
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
