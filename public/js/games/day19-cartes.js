// Jour 19 · Cartes : « Le château de cartes »
// Un étage de cartes se balance au-dessus du château : on le lâche au bon moment.
// Ce qui dépasse tombe, et l'étage suivant est plus étroit. Jusqu'où montera le château ?
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, LEVEL_H = 74, START_W = 300, MAX_LEVELS = 20, BASE_Y = 610, CARD_L = 84;
  const SUITS = [["♥", "#b3261e"], ["♦", "#b3261e"], ["♠", INK], ["♣", INK]];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"];

  Games.register(19, {
    title: "Le château de cartes",
    music: "inside",
    story: "Le Grand Battu, magicien de Rive-Basse, a retrouvé un jeu de cartes humain complet : cinquante-deux cartes, et même les jokers. Son rêve, c'est un château de cartes plus haut que lui. Toi, tu as les mains les plus sûres du village. Lâche chaque étage pile au-dessus du précédent.",
    controls: "Clic ou Espace pour lâcher l'étage qui se balance. Ce qui dépasse tombe. Un lâcher parfait garde toute la largeur.",

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
      const r = Ink.rng(Math.floor(Math.random() * 1e9));
      const randCard = () => ({ suit: SUITS[Math.floor(r() * 4)], rank: RANKS[Math.floor(r() * 13)] });

      // les étages posés : x gauche, largeur, cartes
      const levels = [{ x: AW / 2 - START_W / 2, w: START_W, cards: [] }];
      levels[0].cards = Array.from({ length: 8 }, randCard);
      let moving = null, falling = [], perfects = 0, ended = 0, cam = 0, dropAt = 0, combo = 0;
      const pops = [];

      function spawn() {
        const top = levels[levels.length - 1], n = levels.length;
        const speed = 260 + n * 22;
        moving = { w: top.w, x: r() < 0.5 ? 0 : AW - top.w, dir: 1, speed, cards: Array.from({ length: 8 }, randCard), drop: null };
        moving.dir = moving.x === 0 ? 1 : -1;
      }
      spawn();

      function release() {
        if (!moving || moving.drop || ended) return;
        moving.drop = { t: secs() };
        Sound.play("flap", 0.5);
      }
      function land() {
        const top = levels[levels.length - 1], m = moving;
        let l = Math.max(m.x, top.x), rr = Math.min(m.x + m.w, top.x + top.w);
        if (rr - l <= 6) {
          // complètement à côté : tout s'écroule
          falling.push({ x: m.x, w: m.w, y: levelY(levels.length), vy: 0, rot: 0, vr: (r() - 0.5) * 4, cards: m.cards, t: secs() });
          moving = null;
          collapse();
          return;
        }
        if (Math.abs(m.x - top.x) <= 6) {
          // parfait : on recale et on garde la largeur
          l = top.x; rr = top.x + top.w; perfects++; combo++;
          pops.push({ text: combo > 1 ? `Parfait ! ×${combo}` : "Parfait !", x: top.x + top.w / 2, y: levelY(levels.length) - 40, t: secs(), color: "#ffd84a" });
          Sound.play("bell", 0.5);
          // une série de parfaits redonne un peu de largeur
          if (combo >= 3) { l = Math.max(60, l - 10); rr = Math.min(AW - 60, rr + 10); }
        } else {
          combo = 0;
          const cutX = m.x < top.x ? m.x : rr, cutW = m.w - (rr - l);
          if (cutW > 1) falling.push({ x: cutX, w: cutW, y: levelY(levels.length), vy: 0, rot: 0, vr: (m.x < top.x ? -1 : 1) * (1 + r() * 2), cards: m.cards.slice(0, 2), t: secs() });
          Sound.play("tick");
        }
        levels.push({ x: l, w: rr - l, cards: m.cards });
        moving = null;
        if (levels.length - 1 >= MAX_LEVELS) { ended = secs(); Sound.play("win"); return; }
        spawn();
      }
      function collapse() {
        ended = secs();
        Sound.play("junk");
        // les étages du haut dégringolent un peu pour le spectacle
        for (let k = Math.max(1, levels.length - 3); k < levels.length; k++) {
          const lv = levels[k];
          falling.push({ x: lv.x, w: lv.w, y: levelY(k), vy: -50, rot: 0, vr: (r() - 0.5) * 3, cards: lv.cards, t: secs() });
        }
        levels.length = Math.max(1, levels.length - 3);
      }

      const levelY = (k) => BASE_Y - k * LEVEL_H; // base de l'étage k
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      canvas.addEventListener("pointerdown", (e) => { void toArena(e); release(); });
      const onKey = (e) => { if (e.key === " ") { e.preventDefault(); release(); } };
      window.addEventListener("keydown", onKey);

      function update(dt) {
        const built = levels.length - 1;
        if (moving && !moving.drop) {
          moving.x += moving.dir * moving.speed * dt;
          if (moving.x < 20) { moving.x = 20; moving.dir = 1; }
          if (moving.x + moving.w > AW - 20) { moving.x = AW - 20 - moving.w; moving.dir = -1; }
        } else if (moving?.drop && secs() - moving.drop.t > 0.22) land();
        for (const f of falling) { f.vy += 900 * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
        falling = falling.filter((f) => f.y - cam < AH + 300);
        // la caméra monte avec le château
        const want = Math.min(0, -(built - 4) * LEVEL_H);
        cam += (want - cam) * Math.min(1, dt * 3);
        if (ended && secs() - ended > 3) finish();
      }

      function finish() {
        stop();
        const built = levels.length - 1;
        const score = built * 100 + perfects * 50 + (built >= MAX_LEVELS ? 500 : 0);
        api.finish({
          score,
          stars: built >= 12 ? 3 : built >= 8 ? 2 : 1,
          lines: [built >= MAX_LEVELS ? "Le château est terminé !" : `${built} étages avant l'effondrement`, `${perfects} lâchers parfaits`],
        });
      }

      // ---------- dessin ----------
      function drawCard(x, y, w, h, rot, card) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = card.suit[1];
        ctx.font = `800 ${Math.max(9, w * 0.5)}px "Barlow Semi Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(card.suit[0], 0, 4);
        ctx.font = `800 ${Math.max(7, w * 0.3)}px "Barlow Semi Condensed", sans-serif`;
        ctx.fillText(card.rank, -w / 2 + w * 0.22, -h / 2 + 9);
        ctx.restore();
      }
      // un étage : des paires de cartes en Λ, posées sur une carte à plat
      function drawLevel(x, w, baseY, cards, rot = 0) {
        ctx.save();
        if (rot) { ctx.translate(x + w / 2, baseY - LEVEL_H / 2); ctx.rotate(rot); ctx.translate(-(x + w / 2), -(baseY - LEVEL_H / 2)); }
        const pairs = Math.max(1, Math.round(w / 90)), pw = w / pairs, rise = LEVEL_H - 10;
        for (let p = 0; p < pairs; p++) {
          const bx = x + p * pw;
          const half = pw / 2, len = Math.hypot(half * 0.85, rise), ang = Math.atan2(half * 0.85, rise);
          const c1 = cards[(p * 2) % cards.length], c2 = cards[(p * 2 + 1) % cards.length];
          drawCard(bx + pw * 0.3, baseY - rise / 2, 22, len, ang, c1);
          drawCard(bx + pw * 0.7, baseY - rise / 2, 22, len, -ang, c2);
        }
        // la carte à plat au-dessus
        ctx.fillStyle = "#7a1426"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x - 2, baseY - LEVEL_H, w + 4, 10, 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(233,176,74,.6)"; ctx.lineWidth = 1;
        for (let k = x + 6; k < x + w - 4; k += 8) { ctx.beginPath(); ctx.moveTo(k, baseY - LEVEL_H + 2); ctx.lineTo(k + 4, baseY - LEVEL_H + 8); ctx.stroke(); }
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // fond : papier peint du salon, qui défile avec la hauteur
        ctx.fillStyle = "#2a3a2c"; ctx.fillRect(0, 0, AW, AH);
        ctx.fillStyle = "rgba(239,229,208,.05)";
        for (let x = 30; x < AW; x += 70) for (let y = ((-cam * 0.5) % 70) - 70; y < AH; y += 70) { ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.fill(); }
        Ink.halo(ctx, "rgba(255,200,120,.18)", AW / 2, 300, 480);
        ctx.save();
        ctx.translate(0, -cam);
        // la table
        ctx.fillStyle = "#1f5a3a"; ctx.fillRect(0, BASE_Y, AW, 300);
        ctx.fillStyle = "#4a3426"; ctx.fillRect(0, BASE_Y, AW, 10);
        // le magicien
        ctx.save(); ctx.translate(110, BASE_Y); ctx.scale(2.4, 2.4);
        Ink.enxor(ctx, 0, 0, t, { seed: 19, color: "#b48be0", face: 1, wear: { head: "hautdeforme", aura: "cartes" }, emote: ended ? (levels.length - 1 >= 8 ? "danse" : "surprise") : null, et: ended ? (secs() - ended) % 2 : 0 });
        ctx.restore();
        // le château
        for (let k = 1; k < levels.length; k++) drawLevel(levels[k].x, levels[k].w, levelY(k), levels[k].cards);
        // le socle
        ctx.fillStyle = "#3b3440"; ctx.fillRect(levels[0].x, BASE_Y - 8, levels[0].w, 8);
        // l'étage qui se balance
        if (moving) {
          const k = levels.length;
          const hoverY = levelY(k) - 90;
          const y = moving.drop ? hoverY + Math.min(1, (secs() - moving.drop.t) / 0.22) * 90 : hoverY;
          ctx.globalAlpha = 0.3; ctx.fillStyle = "#ffd84a";
          ctx.fillRect(moving.x, levelY(k) - 2, moving.w, 4);
          ctx.globalAlpha = 1;
          drawLevel(moving.x, moving.w, y, moving.cards, moving.drop ? 0 : Math.sin(t * 6) * 0.02);
        }
        for (const f of falling) drawLevel(f.x, f.w, f.y, f.cards, f.rot);
        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1) continue;
          ctx.globalAlpha = 1 - age;
          Ink.word(ctx, p.text, p.x, p.y - age * 40, 20, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        const built = levels.length - 1;
        Ink.word(ctx, `${built} étage${built > 1 ? "s" : ""}`, AW - 110, 40, 28, "#ffd84a", 800, "#1b1b1b");
        Ink.word(ctx, `${perfects} parfaits`, AW - 110, 74, 15, PAPER, 700, "#1b1b1b");
        // jauge de hauteur
        ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(AW - 30, 110, 8, 440);
        ctx.fillStyle = "#e9b04a"; ctx.fillRect(AW - 30, 550 - 440 * built / MAX_LEVELS, 8, 440 * built / MAX_LEVELS);
        for (const [n, label] of [[8, "★★"], [12, "★★★"]]) Ink.word(ctx, label, AW - 60, 550 - 440 * n / MAX_LEVELS, 12, "#e9b04a", 800, "#1b1b1b");
        if (built === 0 && !ended) Ink.word(ctx, "Clique pour lâcher l'étage pile au-dessus du socle", AW / 2, 60, 20, PAPER, 700, "#1b1b1b");
        if (ended) Ink.word(ctx, built >= MAX_LEVELS ? "Le château est terminé !" : "Patatras !", AW / 2, 200, 44, built >= MAX_LEVELS ? "#ffd84a" : "#f2c1cf", 800, "#1b1b1b");
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
        window.__chateau = {
          // lâche dès que l'étage est presque aligné (à `err` pixels près)
          aligned: (err) => !!moving && !moving.drop && Math.abs(moving.x - levels[levels.length - 1].x) <= err,
          state: () => ({ built: levels.length - 1, perfects, ended: !!ended, w: Math.round(levels[levels.length - 1].w) }),
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
