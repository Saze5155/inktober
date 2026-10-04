// Jour 2 · Draconique : « Les cinq frères »
// Ton Enxor part à la rencontre des cinq dragons nés des rêves de Mythras et récupère une écaille de chacun.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, PR = 13, SPEED = 210;
  const KEYMAP = { arrowup: "u", z: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", q: "l", a: "l", arrowright: "r", d: "r" };
  const TAU = Math.PI * 2;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- Dessin d'un dragon d'encre ----------
  // pts : du museau à la queue. Le corps s'affine vers la queue, avec des piques sur le dos.
  function drawDragon(ctx, pts, o) {
    const { color, t = 0, eye = "open", glow, stars } = o;
    const n = pts.length;
    const rad = (i) => 26 - (i / (n - 1)) * 21;
    if (glow) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const gc = glow.startsWith("#")
        ? `rgba(${parseInt(glow.slice(1, 3), 16)},${parseInt(glow.slice(3, 5), 16)},${parseInt(glow.slice(5, 7), 16)},0.33)`
        : glow;
      for (let i = 0; i < n; i += 3) Ink.halo(ctx, gc, pts[i][0], pts[i][1], rad(i) * 3);
      ctx.restore();
    }
    // ombre
    ctx.fillStyle = "rgba(29,26,32,.18)";
    for (let i = n - 1; i >= 0; i -= 2) { ctx.beginPath(); ctx.ellipse(pts[i][0] + 6, pts[i][1] + 12, rad(i), rad(i) * 0.5, 0, 0, TAU); ctx.fill(); }
    // piques
    ctx.fillStyle = INK;
    for (let i = 2; i < n - 2; i += Math.max(2, Math.round(n / 14))) {
      const [x, y] = pts[i], [px, py] = pts[i + 1];
      const a = Math.atan2(y - py, x - px) - Math.PI / 2;
      const r = rad(i);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a + 0.5) * r * 0.7, y + Math.sin(a + 0.5) * r * 0.7);
      ctx.lineTo(x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12));
      ctx.lineTo(x + Math.cos(a - 0.5) * r * 0.7, y + Math.sin(a - 0.5) * r * 0.7);
      ctx.fill();
    }
    // contour puis couleur
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass ? (typeof color === "function" ? color() : color) : INK;
      for (let i = n - 1; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(pts[i][0], pts[i][1], rad(i) + (pass ? 0 : 3), 0, TAU);
        ctx.fill();
      }
    }
    // écailles
    ctx.strokeStyle = "rgba(29,26,32,.35)";
    ctx.lineWidth = 1.2;
    for (let i = 1; i < n; i += 2) { ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], rad(i) * 0.55, 0.3, Math.PI - 0.3); ctx.stroke(); }
    if (stars) {
      ctx.fillStyle = "#f6efd5";
      for (let i = 0; i < n; i += 2) {
        const tw = 0.5 + Math.sin(t * 3 + i) * 0.5;
        ctx.globalAlpha = tw;
        ctx.beginPath(); ctx.arc(pts[i][0] + Math.sin(i * 7) * rad(i) * 0.5, pts[i][1] + Math.cos(i * 5) * rad(i) * 0.4, 1.8, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // tête
    const [hx, hy] = pts[0], [nx, ny] = pts[1];
    const a = Math.atan2(hy - ny, hx - nx);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(12, 0, 34, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = typeof color === "function" ? color() : color;
    ctx.beginPath(); ctx.ellipse(12, 0, 31, 19, 0, 0, TAU); ctx.fill();
    // cornes
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-4, s * 14); ctx.quadraticCurveTo(-24, s * 30, -40, s * 24); ctx.stroke(); }
    // narines et yeux
    ctx.fillStyle = INK;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(38, s * 6, 2.2, 0, TAU); ctx.fill(); }
    for (const s of [-1, 1]) {
      if (eye === "closed") {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(8, s * 10 - 4); ctx.lineTo(20, s * 10 - 2); ctx.stroke();
      } else {
        const open = eye === "half" ? 0.35 : 1;
        ctx.fillStyle = eye === "open" && o.eyeColor ? o.eyeColor : "#f2e6c2";
        ctx.beginPath(); ctx.ellipse(14, s * 9, 7, 6 * open, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.ellipse(15, s * 9, 1.6, 5 * open, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // trajectoire paramétrique → points du corps (la queue suit le même chemin avec du retard)
  const bodyFrom = (path, t, n = 26, lag = 0.045) => Array.from({ length: n }, (_, i) => path(t - i * lag));

  function scaleItem(ctx, x, y, color, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 3) * 4);
    ctx.rotate(Math.sin(t * 2) * 0.2);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    g.addColorStop(0, "rgba(255,230,160,.6)");
    g.addColorStop(1, "rgba(255,230,160,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-34, -34, 68, 68);
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.quadraticCurveTo(13, -4, 0, 15); ctx.quadraticCurveTo(-13, -4, 0, -14);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function layer(draw) {
    const c = document.createElement("canvas");
    c.width = AW * 2;
    c.height = AH * 2;
    const g = c.getContext("2d");
    g.scale(2, 2);
    draw(g, Ink.rng(77));
    return c;
  }

  // ---------- Les cinq rencontres ----------

  const PHASES = [
    {
      key: "atramentus", name: "Atramentus", color: "#1d1a20", scale: "#3b3440",
      title: "Atramentus, le premier-né",
      lore: "Né du mur de la grotte où Mythras dessinait. Approche quand il dort… et fige-toi dès qu'il ouvre l'œil.",
      bg: (g, r) => {
        g.fillStyle = "#d9cdb4"; g.fillRect(0, 0, AW, AH);
        g.fillStyle = Ink.grain(g); g.fillRect(0, 0, AW, AH);
        // les dessins de Mythras sur les murs de la grotte
        g.save(); g.globalAlpha = 0.18;
        for (let i = 0; i < 9; i++) {
          const x = 80 + (i % 5) * 230, y = 70 + Math.floor(i / 5) * 470;
          Ink.stroke(g, Ink.ellipse(x, y, 40, 22, 14), r, { w: 2, closed: true });
          Ink.stroke(g, [[x + 40, y], [x + 70, y - 20], [x + 90, y + 5]], r, { w: 2 });
          Ink.stroke(g, [[x - 20, y - 15], [x - 5, y - 45], [x + 15, y - 15]], r, { w: 2 });
        }
        g.restore();
        const v = g.createRadialGradient(AW / 2, AH / 2, 200, AW / 2, AH / 2, 700);
        v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(20,16,24,.55)");
        g.fillStyle = v; g.fillRect(0, 0, AW, AH);
      },
      init(st) {
        st.player = { x: 550, y: 630, face: 1, moving: false, color: null };
        st.start = { x: 550, y: 630 };
        st.body = Array.from({ length: 80 }, (_, i) => {
          const k = 79 - i, a = k * 0.13, rr = 30 + k * 2.2;
          return [550 + Math.cos(a) * rr * 1.5, 260 + Math.sin(a) * rr * 0.75];
        });
        st.eye = "closed"; st.eyeT = rand(2.5, 4);
      },
      update(st, dt, game) {
        st.eyeT -= dt;
        if (st.eyeT <= 0) {
          if (st.eye === "closed") { st.eye = "half"; st.eyeT = 0.8; Sound.play("tick"); }
          else if (st.eye === "half") { st.eye = "open"; st.eyeT = rand(1.5, 2.3); st.moveOpen = 0; Sound.play("dodo", 0.6); }
          else { st.eye = "closed"; st.eyeT = rand(1.8, 3.5); }
        }
        if (st.eye === "open" && st.moved > 0.5) {
          st.moveOpen = (st.moveOpen || 0) + st.moved;
          if (st.moveOpen > 6) {
            st.hits++;
            game.flash("Atramentus t'a vu ! Il souffle et tu recules…");
            Object.assign(st.player, st.start);
            st.moveOpen = 0;
            Sound.play("splash");
          }
        }
        if (dist(st.player, { x: st.body[0][0], y: st.body[0][1] }) < 70) game.collect();
      },
      solid: (st, x, y) => st.body.slice(2).some(([bx, by]) => Math.hypot(x - bx, y - by) < 30),
      draw(ctx, st, t) {
        drawDragon(ctx, st.body, { color: "#2b2731", t, eye: st.eye, eyeColor: "#e9b04a" });
        if (st.eye === "open") Ink.word(ctx, "NE BOUGE PLUS !", AW / 2, 520, 26, "#b3261e", 800);
      },
      score: (st) => 600 - st.time * 5 - st.hits * 80,
    },
    {
      key: "solaris", name: "Solaris", color: "#9aa3ad", scale: "#c9d3dc",
      title: "Solaris, la lumière froide",
      lore: "Son regard éclaire sans réchauffer, et aveugle ceux qui le croisent. Glisse-toi entre ses faisceaux pour prendre une écaille au bout de sa queue.",
      bg: (g) => {
        g.fillStyle = "#c9ccce"; g.fillRect(0, 0, AW, AH);
        g.fillStyle = Ink.grain(g); g.fillRect(0, 0, AW, AH);
      },
      init(st) {
        st.player = { x: 90, y: 620, face: 1, moving: false };
        st.start = { x: 90, y: 620 };
        st.body = Array.from({ length: 30 }, (_, i) => [420 + i * 17, 320 + Math.sin(i * 0.35) * 40]);
        st.tail = { x: 420 + 29 * 17 + 40, y: 320 + Math.sin(29 * 0.35) * 40 };
        st.inv = 0;
      },
      beams(st) {
        const a = st.time * 0.75;
        return [a, a + Math.PI].map((ang) => ({ ang, x: st.body[0][0], y: st.body[0][1] }));
      },
      update(st, dt, game) {
        st.inv -= dt;
        const p = st.player;
        if (st.inv <= 0) {
          for (const b of this.beams(st)) {
            const da = Math.atan2(p.y - b.y, p.x - b.x) - b.ang;
            const diff = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
            if (diff < 0.2 && Math.hypot(p.x - b.x, p.y - b.y) < 760) {
              st.hits++;
              st.inv = 1.4;
              game.flash("Aveuglé·e par Solaris !", "#ffffff");
              const back = Math.atan2(p.y - b.y, p.x - b.x);
              p.x = Math.max(PR, Math.min(AW - PR, p.x + Math.cos(back) * 120));
              p.y = Math.max(PR, Math.min(AH - PR, p.y + Math.sin(back) * 120));
              Sound.play("surprise");
              break;
            }
          }
        }
        if (dist(p, st.tail) < 40) game.collect();
      },
      solid: (st, x, y) => st.body.some(([bx, by], i) => Math.hypot(x - bx, y - by) < 30 - i * 0.5),
      draw(ctx, st, t) {
        for (const b of this.beams(st)) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ang);
          const g = ctx.createLinearGradient(0, 0, 760, 0);
          g.addColorStop(0, "rgba(240,246,255,.75)");
          g.addColorStop(1, "rgba(240,246,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(0.2) * 760, Math.sin(0.2) * 760);
          ctx.lineTo(Math.cos(-0.2) * 760, Math.sin(-0.2) * 760);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        drawDragon(ctx, st.body, { color: "#9aa3ad", t, glow: "rgba(220,230,245,.25)", eyeColor: "#ffffff" });
        scaleItem(ctx, st.tail.x, st.tail.y, "#c9d3dc", t);
      },
      score: (st) => 600 - st.time * 5 - st.hits * 80,
    },
    {
      key: "noctifer", name: "Noctifer", color: "#1f2547", scale: "#3e4a8a",
      title: "Noctifer, le ciel gravé",
      lore: "Il porte sur sa peau les étoiles d'avant l'Éclipse. Retiens l'ordre dans lequel elles s'allument, puis marche sur chacune dans le même ordre.",
      bg: (g, r) => {
        g.fillStyle = "#151a35"; g.fillRect(0, 0, AW, AH);
        g.fillStyle = "#f6efd5";
        for (let i = 0; i < 160; i++) { g.globalAlpha = r() * 0.6; g.beginPath(); g.arc(r() * AW, r() * AH, r() * 1.6, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      },
      init(st) {
        st.player = { x: 550, y: 640, face: 1, moving: false };
        st.stars = [[200, 300], [340, 470], [480, 330], [620, 520], [760, 360], [900, 500], [560, 600 - 180], [330, 610 - 30]].map(([x, y]) => ({ x, y, lit: 0 }));
        st.round = 0;
        st.newRound = () => {
          const len = 3 + st.round;
          st.seq = [];
          while (st.seq.length < len) {
            const k = Math.floor(Math.random() * st.stars.length);
            if (st.seq[st.seq.length - 1] !== k) st.seq.push(k);
          }
          st.show = 0; st.showT = 1.2; st.idx = 0; st.mode = "show";
        };
        st.newRound();
        st.on = -1;
      },
      update(st, dt, game) {
        for (const s of st.stars) s.lit = Math.max(0, s.lit - dt * 1.5);
        if (st.mode === "show") {
          st.showT -= dt;
          if (st.showT <= 0) {
            if (st.show < st.seq.length) {
              const s = st.stars[st.seq[st.show]];
              s.lit = 1;
              Sound.play("note", 0.8, st.seq[st.show]);
              st.show++;
              st.showT = 0.75;
            } else { st.mode = "play"; st.idx = 0; }
          }
          return;
        }
        const k = st.stars.findIndex((s) => dist(s, st.player) < 30);
        if (k !== st.on && k >= 0) {
          if (k === st.seq[st.idx]) {
            st.stars[k].lit = 1;
            Sound.play("note", 1, k);
            st.idx++;
            if (st.idx === st.seq.length) {
              st.round++;
              if (st.round === 3) game.collect();
              else { game.flash(`Constellation ${st.round}/3 retrouvée !`, null, "#e9b04a"); st.newRound(); }
            }
          } else {
            st.hits++;
            game.flash("Noctifer secoue la tête… regarde encore.");
            Sound.play("miss");
            st.newRound();
          }
        }
        st.on = k;
      },
      solid: () => false,
      draw(ctx, st, t) {
        const body = Array.from({ length: 32 }, (_, i) => [880 - i * 24, 120 + Math.sin(t * 0.8 + i * 0.3) * 22]);
        drawDragon(ctx, body, { color: "#2a3060", t, stars: true, eyeColor: "#f6efd5" });
        // lignes de la constellation déjà retrouvée
        ctx.strokeStyle = "rgba(246,239,213,.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < (st.mode === "play" ? st.idx : 0); i++) {
          const s = st.stars[st.seq[i]];
          if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y);
        }
        ctx.stroke();
        for (const s of st.stars) {
          ctx.globalAlpha = 0.2 + s.lit * 0.8;
          Ink.halo(ctx, "rgba(246,239,213,1)", s.x, s.y, 40);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#f6efd5";
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 6 : 14;
            ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
          }
          ctx.fill();
        }
        Ink.word(ctx, st.mode === "show" ? "Regarde…" : `À toi : étoile ${st.idx + 1}/${st.seq.length}`, AW / 2, 250, 22, "#efe5d0", 700, "#151a35");
      },
      score: (st) => 600 - st.time * 3 - st.hits * 70,
    },
    {
      key: "vermillax", name: "Vermillax", color: "#b3261e", scale: "#e4574b",
      title: "Vermillax, la colère rouge",
      lore: "Il attaque sans jamais prévenir. Esquive ses boules de feu jusqu'à ce qu'il s'épuise.",
      bg: (g, r) => {
        g.fillStyle = "#e3c3a6"; g.fillRect(0, 0, AW, AH);
        g.fillStyle = Ink.grain(g); g.fillRect(0, 0, AW, AH);
        for (let i = 0; i < 30; i++) Ink.crack(g, r() * AW, r() * AH, r);
        for (let i = 0; i < 12; i++) Ink.splat(g, r() * AW, r() * AH, 10 + r() * 20, r, "#5a1622", 0.4);
      },
      init(st) {
        st.player = { x: 550, y: 340, face: 1, moving: false };
        st.fire = [];
        st.spitT = 1.2;
        st.inv = 0;
        st.path = (k) => [550 + Math.cos(k * 0.8) * 440, 340 + Math.sin(k * 0.8) * 260];
        st.survive = 25;
        st.tired = false;
      },
      update(st, dt, game) {
        st.inv -= dt;
        const p = st.player;
        if (!st.tired) {
          st.spitT -= dt;
          if (st.spitT <= 0) {
            const [hx, hy] = st.path(st.time);
            const a = Math.atan2(p.y - hy, p.x - hx);
            const spread = st.time > 12 && Math.random() < 0.5 ? [-0.25, 0, 0.25] : [0];
            for (const s of spread) st.fire.push({ x: hx, y: hy, vx: Math.cos(a + s) * 290, vy: Math.sin(a + s) * 290 });
            st.spitT = rand(0.5, 1.2);
            Sound.play("firework", 0.4);
          }
          if (st.time > st.survive) {
            st.tired = true;
            st.drop = { x: 550, y: 340 };
            game.flash("Vermillax s'épuise et laisse tomber une écaille…", null, "#e9b04a");
          }
        } else if (dist(p, st.drop) < 36) game.collect();
        for (const f of st.fire) {
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          if (st.inv <= 0 && Math.hypot(f.x - p.x, f.y - (p.y - 18)) < 22) {
            f.dead = true;
            st.hits++;
            st.inv = 1;
            game.flash("Brûlé·e !");
            Sound.play("splash");
          }
        }
        st.fire = st.fire.filter((f) => !f.dead && f.x > -50 && f.x < AW + 50 && f.y > -50 && f.y < AH + 50);
      },
      solid: () => false,
      draw(ctx, st, t) {
        const pathT = st.tired ? st.time * 0.15 + 100 : st.time;
        const body = bodyFrom(st.tired ? () => [900, 140] : st.path, pathT, 28, 0.05);
        if (st.tired) for (let i = 0; i < body.length; i++) body[i] = [940 - i * 18, 130 + Math.sin(i * 0.4) * 14];
        drawDragon(ctx, body, { color: "#b3261e", t, eye: st.tired ? "half" : "open", eyeColor: "#e9b04a" });
        for (const f of st.fire) {
          Ink.halo(ctx, "rgba(224,102,47,1)", f.x, f.y, 20);
          Ink.halo(ctx, "rgba(255,241,176,1)", f.x, f.y, 9);
        }
        if (st.tired) scaleItem(ctx, st.drop.x, st.drop.y, "#e4574b", t);
        else Ink.word(ctx, `Tiens bon : ${Math.ceil(st.survive - st.time)} s`, AW / 2, 40 + 48, 20, INK, 700);
      },
      score: (st) => 600 - st.hits * 90,
    },
    {
      key: "prismarix", name: "Prismarix", color: "#d36b9c", scale: "#b48be0",
      title: "Prismarix, le caprice",
      lore: "Il change de couleur sans arrêt. Trempe-toi dans un pot de peinture, puis touche-le quand il a la même couleur que toi. Trois fois !",
      bg: (g, r) => {
        g.fillStyle = "#efe5d0"; g.fillRect(0, 0, AW, AH);
        g.fillStyle = Ink.grain(g); g.fillRect(0, 0, AW, AH);
        for (let i = 0; i < 40; i++) Ink.splat(g, r() * AW, r() * AH, 6 + r() * 14, r, ["#e0662f", "#3e7cb1", "#5b8c5a", "#d36b9c", "#e9b04a"][i % 5], 0.35);
      },
      init(st) {
        st.colors = ["#b3261e", "#e9b04a", "#5b8c5a", "#3e7cb1", "#7d5ba6"];
        st.pots = st.colors.map((c, i) => ({ x: 170 + i * 190, y: 610, c }));
        st.player = { x: 550, y: 520, face: 1, moving: false, color: null };
        st.cur = 0; st.colorT = 1.6; st.points = 0; st.seed = Math.random() * 10;
        st.path = (k) => [550 + Math.sin(k * 0.9 + st.seed) * 400, 280 + Math.sin(k * 1.4 + st.seed * 2) * 170];
        st.cool = 0;
      },
      update(st, dt, game) {
        st.colorT -= dt;
        st.cool -= dt;
        if (st.colorT <= 0) { st.cur = (st.cur + 1 + Math.floor(Math.random() * 4)) % 5; st.colorT = rand(1.2, 2.2); }
        const p = st.player;
        const pot = st.pots.find((q) => dist(q, p) < 34);
        if (pot && p.color !== pot.c) { p.color = pot.c; Sound.play("plouf", 0.6); }
        const [hx, hy] = st.path(st.time);
        if (st.cool <= 0 && Math.hypot(p.x - hx, p.y - 18 - hy) < 55) {
          st.cool = 1.2;
          if (p.color === st.colors[st.cur]) {
            st.points++;
            Sound.play("catch");
            game.flash(`Touché ! ${st.points}/3`, null, "#e9b04a");
            st.seed += 2.3;
            if (st.points >= 3) game.collect();
          } else {
            st.hits++;
            p.color = null;
            Sound.play("rire");
            game.flash("Prismarix rit et te vole ta couleur !");
          }
        }
      },
      solid: (st, x, y) => false,
      draw(ctx, st, t) {
        for (const q of st.pots) {
          Ink.shadow(ctx, q.x, q.y + 4, 30, 8);
          ctx.fillStyle = "#cfcfcf"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(q.x - 24, q.y - 30); ctx.lineTo(q.x + 24, q.y - 30); ctx.lineTo(q.x + 20, q.y); ctx.lineTo(q.x - 20, q.y); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = q.c; ctx.beginPath(); ctx.ellipse(q.x, q.y - 30, 24, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
        const body = bodyFrom(st.path, st.time, 26, 0.035);
        const c = st.colors[st.cur];
        drawDragon(ctx, body, { color: c, t, glow: c + "55", eyeColor: "#ffffff" });
      },
      score: (st) => 600 - st.time * 3 - st.hits * 60,
    },
  ];

  // ---------- Le jeu ----------

  Games.register(2, {
    title: "Les cinq frères",
    music: "dragon",
    story: "Mythras a rêvé cinq dragons frères avant d'être banni : Atramentus le premier-né, Solaris la lumière froide, Noctifer le ciel gravé, Vermillax la colère rouge et Prismarix le caprice. Va à la rencontre de chacun et rapporte une de leurs écailles.",
    controls: "ZQSD / flèches pour bouger. Chaque frère a sa règle, lis-la au début de la rencontre. Pas de game over : prends ton temps.",

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
      const keys = new Set();
      const onKey = (e) => {
        const k = KEYMAP[e.key.toLowerCase()];
        if (!k) return;
        e.preventDefault();
        if (e.type === "keydown") keys.add(k); else keys.delete(k);
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      let pi = 0, phase, st, bg, state = "intro", stateT = 0, banner = null, total = 0, totalHits = 0;
      const results = [];
      const game = {
        flash(text, color, textColor) {
          banner = { text, t: 0, color: textColor || "#b3261e" };
          if (color) st.whiteout = 0.8;
        },
        collect() {
          if (state !== "play") return;
          state = "got";
          stateT = 0;
          const sc = Math.max(100, Math.round(phase.score(st)));
          total += sc;
          totalHits += st.hits;
          results.push({ name: phase.name, score: sc });
          Sound.play("win");
        },
      };

      function load(i) {
        pi = i;
        phase = PHASES[i];
        st = { time: 0, hits: 0, moved: 0, whiteout: 0 };
        phase.init(st);
        bg = layer((g, r) => phase.bg(g, r));
        state = "intro";
        stateT = 0;
        banner = null;
      }

      function update(dt) {
        stateT += dt;
        if (banner) banner.t += dt;
        st.whiteout = Math.max(0, st.whiteout - dt);
        const p = st.player;
        p.moving = false;
        st.moved = 0;
        if (state === "intro" && stateT > 3.2) state = "play";
        if (state === "play") {
          st.time += dt;
          let dx = 0, dy = 0;
          if (keys.has("l")) dx--;
          if (keys.has("r")) dx++;
          if (keys.has("u")) dy--;
          if (keys.has("d")) dy++;
          const len = Math.hypot(dx, dy);
          if (len) {
            const nx = p.x + (dx / len) * SPEED * dt, ny = p.y + (dy / len) * SPEED * dt;
            const ok = (x, y) => x > PR && y > PR + 20 && x < AW - PR && y < AH - PR && !phase.solid(st, x, y);
            const bx = p.x, by = p.y;
            if (ok(nx, p.y)) p.x = nx;
            if (ok(p.x, ny)) p.y = ny;
            st.moved = Math.hypot(p.x - bx, p.y - by);
            p.moving = st.moved > 0;
            if (Math.abs(dx) > 0.2) p.face = Math.sign(dx);
          }
          phase.update.call(phase, st, dt, game);
        } else if (state === "got" && stateT > 2.2) {
          if (pi + 1 < PHASES.length) load(pi + 1);
          else return finish();
        }
      }

      function finish() {
        stop();
        const stars = total >= 2500 ? 3 : total >= 1800 ? 2 : 1;
        api.finish({ score: total, stars, lines: ["5/5 écailles", `${totalHits} faux pas`, results.map((r) => `${r.name} ${r.score}`).join(" · ")] });
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b";
        ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0, AW, AH);
        phase.draw.call(phase, ctx, st, t);
        const p = st.player;
        Ink.enxor(ctx, p.x, p.y, t, { seed: 5, color: p.color || "#e9b04a", moving: p.moving, face: p.face });
        if (state === "got") {
          ctx.fillStyle = `rgba(27,27,27,${Math.min(0.5, stateT)})`;
          ctx.fillRect(0, 0, AW, AH);
          scaleItem(ctx, AW / 2, AH / 2 - 40, phase.scale, t);
          Ink.word(ctx, `Écaille de ${phase.name} !`, AW / 2, AH / 2 + 20, 36, "#e9b04a", 800);
        }
        if (st.whiteout > 0) { ctx.fillStyle = `rgba(255,255,255,${st.whiteout})`; ctx.fillRect(0, 0, AW, AH); }
        // titre de la rencontre
        if (state === "intro") {
          const a = Math.min(1, stateT * 2, (3.2 - stateT) * 2);
          ctx.save();
          ctx.globalAlpha = Math.max(0, a);
          ctx.fillStyle = "rgba(27,27,27,.75)";
          ctx.fillRect(0, AH / 2 - 80, AW, 160);
          Ink.word(ctx, phase.title, AW / 2, AH / 2 - 30, 40, "#e9b04a", 800);
          wrap(phase.lore, AW / 2, AH / 2 + 18, 760);
          ctx.restore();
        }
        if (banner && banner.t < 1.8) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, (1.8 - banner.t) * 2);
          Ink.word(ctx, banner.text, AW / 2, 140, 24, banner.color, 800);
          ctx.restore();
        }
        // écailles récoltées
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "rgba(27,27,27,.85)";
        ctx.beginPath(); ctx.roundRect(16, 16, 230, 46, 12); ctx.fill();
        ctx.font = `700 14px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#a39686";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText("ÉCAILLES", 30, 39);
        PHASES.forEach((ph, i) => {
          ctx.globalAlpha = i < pi || (i === pi && state === "got") ? 1 : 0.25;
          ctx.fillStyle = ph.scale;
          ctx.beginPath(); ctx.arc(110 + i * 26, 39, 9, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#efe5d0"; ctx.lineWidth = 1.5; ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      function wrap(text, x, y, max) {
        ctx.font = `500 17px "Barlow Semi Condensed", sans-serif`;
        ctx.fillStyle = "#efe5d0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const words = text.split(" ");
        let line = "", yy = y;
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > max && line) { ctx.fillText(line, x, yy); line = w; yy += 22; } else line = test;
        }
        ctx.fillText(line, x, yy);
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
      load(0);
      if (location.hostname === "localhost") window.__d2skip = () => game.collect(); // debug en local
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
