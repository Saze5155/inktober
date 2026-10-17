// Jour 22 · Mignon : « La crèche »
// Quatre bébés Enxors, quatre besoins : biberon, câlin, berceuse, hochet. Prendre le bon objet et le donner au bon bébé.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, SESSION = 90, CRY_AFTER = 6;
  const TOOLS = [
    { id: "biberon", name: "Biberon", key: "1" },
    { id: "doudou", name: "Câlin", key: "2" },
    { id: "berceuse", name: "Berceuse", key: "3" },
    { id: "hochet", name: "Hochet", key: "4" },
  ];
  const BABIES = [
    { name: "Grumeau", color: "#e9b04a", x: 200, y: 360 },
    { name: "Bulle", color: "#8fc7e8", x: 430, y: 330, bow: true },
    { name: "Plic", color: "#7cd15a", x: 670, y: 330 },
    { name: "Mini-Gourdin", color: "#e0662f", x: 900, y: 360 },
  ];
  const THANKS = ["Gouzi gouzi !", "Héhéhé !", "Areuh !", "Bloup !", "*bave de joie*", "Encore !"];

  Games.register(22, {
    title: "La crèche",
    music: "day",
    story: "Les Enxors naissent dans l'encre, tout petits, tout ronds, et ils réclament beaucoup d'attention. Aujourd'hui, c'est toi qui gardes la crèche du hameau. Quatre bébés, un biberon, un doudou, une boîte à musique et un hochet. Courage.",
    controls: "Clique un objet en bas (ou 1 2 3 4), puis clique le bébé qui le réclame. La bulle au-dessus de sa tête dit ce qu'il veut. Si on le fait trop attendre, il pleure… et toute la crèche en souffre.",

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

      const babies = BABIES.map((b, i) => ({ ...b, need: null, needAt: 0, next: 1.5 + i * 1.6, sleepUntil: 0, happyAt: -9, oops: -9, say: "" }));
      let held = null, mouse = { x: AW / 2, y: AH / 2 }, joy = 80, joySum = 0, joyN = 0, served = 0, wrong = 0, ended = 0;
      const startAt = secs();
      const hearts = [];

      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      const SLOT = (i) => ({ x: 290 + i * 140, y: AH - 112, w: 120, h: 96 });
      const inR = (m, q) => m.x > q.x && m.x < q.x + q.w && m.y > q.y && m.y < q.y + q.h;
      canvas.addEventListener("pointermove", (e) => { mouse = toArena(e); });
      canvas.addEventListener("pointerdown", (e) => {
        mouse = toArena(e);
        if (ended) return;
        const si = TOOLS.findIndex((_, i) => inR(mouse, SLOT(i)));
        if (si >= 0) { held = held === si ? null : si; Sound.play("click"); return; }
        const b = babies.find((q) => Math.hypot(q.x - mouse.x, q.y - 40 - mouse.y) < 70);
        if (b) give(b);
      });
      const onKey = (e) => { if (["1", "2", "3", "4"].includes(e.key)) { held = Number(e.key) - 1; Sound.play("click"); } };
      window.addEventListener("keydown", onKey);

      function give(b) {
        if (held === null) return;
        const tool = TOOLS[held].id;
        if (b.need === tool) {
          served++;
          joy = Math.min(100, joy + 7);
          b.need = null; b.happyAt = secs(); b.say = THANKS[Math.floor(r() * THANKS.length)];
          // la berceuse l'endort un moment : plus de demandes pendant ce temps
          if (tool === "berceuse") { b.sleepUntil = secs() + 7; b.say = "zzz…"; }
          b.next = secs() - startAt + (tool === "berceuse" ? 7 : 0) + 0.8 + r() * Math.max(0.8, 3.2 - (secs() - startAt) / 30);
          for (let k = 0; k < 4; k++) hearts.push({ x: b.x + (r() - 0.5) * 40, y: b.y - 60, t: secs() + k * 0.08 });
          Sound.play(tool === "berceuse" ? "dodo" : tool === "hochet" ? "danse" : "coeur");
        } else {
          wrong++;
          joy = Math.max(0, joy - 4);
          b.oops = secs(); b.say = b.need ? "Nan !" : "?";
          Sound.play("miss", 0.5);
        }
      }

      function update(dt) {
        const el = secs() - startAt;
        if (ended) { if (secs() - ended > 2.5) finish(); return; }
        if (el >= SESSION) { ended = secs(); Sound.play("win"); return; }
        let crying = 0;
        for (const b of babies) {
          if (!b.need && secs() > b.sleepUntil && el > b.next) {
            b.need = TOOLS[Math.floor(r() * TOOLS.length)].id;
            b.needAt = secs();
            Sound.play("chat", 0.3);
          }
          if (b.need && secs() - b.needAt > CRY_AFTER) crying++;
        }
        if (crying) joy = Math.max(0, joy - crying * 3.2 * dt);
        else joy = Math.min(100, joy + 0.6 * dt);
        if (crying && Math.random() < dt * 0.8) Sound.play("howl", 0.12);
        joySum += joy * dt; joyN += dt;
      }

      function finish() {
        stop();
        const avg = joySum / Math.max(1, joyN);
        const score = served * 50 + Math.round(avg) * 12 - wrong * 10;
        api.finish({
          score,
          stars: score >= 3000 ? 3 : score >= 2000 ? 2 : 1,
          lines: [`${served} besoins comblés · bonne humeur moyenne ${Math.round(avg)} %`, wrong ? `${wrong} erreur${wrong > 1 ? "s" : ""} d'objet` : "Aucune erreur : nounou parfaite !"],
        });
      }

      // ---------- dessin ----------
      function drawTool(id, x, y, sc) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        if (id === "biberon") {
          ctx.fillStyle = "rgba(240,248,255,.95)"; ctx.beginPath(); ctx.roundRect(-11, -14, 22, 34, 6); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#f2ead8"; ctx.fillRect(-9, 0, 18, 18);
          ctx.fillStyle = "#f2a0bd"; ctx.fillRect(-12, -20, 24, 7); ctx.strokeRect(-12, -20, 24, 7);
          ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.ellipse(0, -26, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (id === "doudou") {
          ctx.fillStyle = "#c9874a";
          for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * 10, -18, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(0, -8, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(0, 14, 12, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-4, -10, 1.8, 0, Math.PI * 2); ctx.arc(4, -10, 1.8, 0, Math.PI * 2); ctx.fill();
          Ink.heart(ctx, 0, 14, 4, "#d36b9c");
        } else if (id === "berceuse") {
          ctx.fillStyle = "#b48be0"; ctx.beginPath(); ctx.roundRect(-16, -4, 32, 22, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#e9b04a"; ctx.fillRect(16, 4, 7, 3);
          ctx.fillStyle = INK; ctx.font = `800 22px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♪", 0, -16);
        } else if (id === "hochet") {
          ctx.strokeStyle = "#e9b04a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 24); ctx.stroke();
          ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.fillStyle = "#5bb3a0"; ctx.beginPath(); ctx.arc(0, -10, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#f2ead8"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.6) * 6, -10 + Math.sin(k * 1.6) * 6, 2.2, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.restore();
      }
      function drawBaby(b, t) {
        const crying = b.need && secs() - b.needAt > CRY_AFTER, asleep = secs() < b.sleepUntil, happy = secs() - b.happyAt < 1.2;
        // le berceau
        ctx.fillStyle = "#f2ead8"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x - 85, b.y - 10); ctx.quadraticCurveTo(b.x, b.y + 70, b.x + 85, b.y - 10); ctx.lineTo(b.x + 85, b.y + 10); ctx.quadraticCurveTo(b.x, b.y + 90, b.x - 85, b.y + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = 2;
        for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(b.x + k * 22, b.y + 10 + (9 - k * k) * 2); ctx.lineTo(b.x + k * 22, b.y - 40); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x - 85, b.y - 40); ctx.lineTo(b.x + 85, b.y - 40); ctx.stroke();
        // le bébé
        const wob = crying ? Math.sin(t * 30) * 2 : happy ? Math.sin(t * 14) * 3 : 0;
        ctx.save(); ctx.translate(b.x + wob, b.y + 20); ctx.scale(2.2, 2.2);
        Ink.enxor(ctx, 0, 0, t, { seed: b.name.length * 3, color: b.color, face: 1, wear: b.bow ? { head: "noeud", face: "rougir" } : { face: "rougir" }, emote: asleep ? "dodo" : happy ? "coeur" : crying ? "surprise" : null, et: asleep ? t % 2 : 0.5 });
        ctx.restore();
        // tétine
        if (!crying) { ctx.fillStyle = "#f2a0bd"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(b.x + 8, b.y - 4, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        // larmes
        if (crying) {
          ctx.fillStyle = "#8fc7e8";
          for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const p = ((t * 2 + k * 0.5) % 1); ctx.beginPath(); ctx.arc(b.x + sx * 22 + sx * p * 20, b.y - 10 + p * 40, 4, 0, Math.PI * 2); ctx.fill(); }
          Ink.word(ctx, "OUIIIN !", b.x, b.y - 130, 20, "#3e7cb1", 800, PAPER);
        }
        Ink.word(ctx, b.name, b.x, b.y + 104, 15, INK, 800, PAPER);
        // la bulle de besoin
        if (b.need) {
          const bx = b.x + 50, by = b.y - 110, waited = (secs() - b.needAt) / CRY_AFTER;
          ctx.fillStyle = PAPER; ctx.strokeStyle = waited > 1 ? "#b3261e" : INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(bx, by, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(bx - 26, by + 30, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(bx - 36, by + 42, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          drawTool(b.need, bx, by + 2, 0.9);
          // la patience qui s'épuise
          ctx.strokeStyle = waited > 1 ? "#b3261e" : waited > 0.6 ? "#e0662f" : "#5b8c5a"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(bx, by, 37, -Math.PI / 2, -Math.PI / 2 + Math.min(1, waited) * Math.PI * 2); ctx.stroke();
        }
        if ((secs() - b.happyAt < 1.2 || secs() - b.oops < 1) && b.say) Ink.word(ctx, b.say, b.x - 40, b.y - 90, 17, secs() - b.oops < 1 ? "#b3261e" : "#d36b9c", 800, PAPER);
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, AW, AH); ctx.clip();
        // la chambre : mur pastel à nuages, parquet
        ctx.fillStyle = "#cfe3ef"; ctx.fillRect(0, 0, AW, 470);
        ctx.fillStyle = "rgba(255,255,255,.7)";
        for (let k = 0; k < 6; k++) { const x = ((k * 230 + t * 8) % (AW + 200)) - 100, y = 60 + (k % 3) * 50; for (const [dx, rr] of [[0, 26], [24, 32], [52, 24]]) { ctx.beginPath(); ctx.arc(x + dx, y, rr, 0, Math.PI * 2); ctx.fill(); } }
        // guirlande de fanions
        ctx.strokeStyle = "rgba(29,26,32,.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(AW / 2, 90, AW, 30); ctx.stroke();
        for (let k = 0; k < 16; k++) { const x = 30 + k * 68, y = 30 + Math.sin((x / AW) * Math.PI) * 30; ctx.fillStyle = ["#f2a0bd", "#8fc7e8", "#f2c94c", "#7cd15a"][k % 4]; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 22); ctx.fill(); }
        ctx.fillStyle = "#d9b48a"; ctx.fillRect(0, 470, AW, AH - 470);
        ctx.strokeStyle = "rgba(29,26,32,.15)"; for (let y = 490; y < AH; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(AW, y); ctx.stroke(); }

        for (const b of babies) drawBaby(b, t);
        for (const h of hearts) { const age = secs() - h.t; if (age < 0 || age > 1.2) continue; ctx.globalAlpha = 1 - age / 1.2; Ink.heart(ctx, h.x + Math.sin(age * 6) * 8, h.y - age * 70, 9, "#d36b9c"); ctx.globalAlpha = 1; }

        // l'étagère aux objets
        ctx.fillStyle = "#8a6a48"; ctx.fillRect(270, AH - 122, 580, 112);
        TOOLS.forEach((tl, i) => {
          const q = SLOT(i);
          ctx.fillStyle = held === i ? "#fff3c8" : "#f2ead8"; ctx.strokeStyle = held === i ? "#e9b04a" : INK; ctx.lineWidth = held === i ? 4 : 2;
          ctx.beginPath(); ctx.roundRect(q.x, q.y, q.w, q.h, 12); ctx.fill(); ctx.stroke();
          if (held !== i) drawTool(tl.id, q.x + q.w / 2, q.y + 42, 1.1);
          Ink.word(ctx, `${tl.key} · ${tl.name}`, q.x + q.w / 2, q.y + q.h - 12, 13, INK, 800, PAPER);
        });
        // l'objet en main suit la souris
        if (held !== null) drawTool(TOOLS[held].id, mouse.x + 10, mouse.y + 10, 1.2);

        // bonne humeur de la crèche
        ctx.fillStyle = "rgba(29,26,32,.15)"; ctx.fillRect(40, AH - 80, 200, 18);
        ctx.fillStyle = joy > 60 ? "#7cd15a" : joy > 30 ? "#e9b04a" : "#b3261e"; ctx.fillRect(40, AH - 80, 2 * joy, 18);
        Ink.word(ctx, `Bonne humeur ${Math.round(joy)} %`, 140, AH - 98, 15, INK, 800, PAPER);
        const left = Math.max(0, Math.ceil(SESSION - (secs() - startAt)));
        Ink.word(ctx, `${left} s`, 990, AH - 70, 26, INK, 800, PAPER);
        Ink.word(ctx, `${served} besoins comblés`, 990, AH - 38, 14, INK, 700, PAPER);
        if (secs() - startAt < 4) Ink.word(ctx, "Prends un objet en bas, puis donne-le au bon bébé !", AW / 2, 130, 22, "#3e7cb1", 800, PAPER);
        if (ended) Ink.word(ctx, "Les parents arrivent ! Ouf.", AW / 2, 200, 40, "#d36b9c", 800, PAPER);
        ctx.restore();
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
        window.__creche = {
          // le bébé qui attend depuis le plus longtemps, et où cliquer
          todo() {
            const b = babies.filter((q) => q.need).sort((a, c) => a.needAt - c.needAt)[0];
            const bb = canvas.getBoundingClientRect();
            const P = (x, y) => ({ x: bb.left + ox + x * s, y: bb.top + oy + y * s });
            return { ended: !!ended, need: b ? TOOLS.findIndex((x) => x.id === b.need) : -1, at: b ? P(b.x, b.y - 40) : null, served, joy: Math.round(joy) };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
