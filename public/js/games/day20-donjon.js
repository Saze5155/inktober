// Jour 20 · BDSM : « Le donjon de Maîtresse Ficelle »
// Monsieur Gourdin réclame un instrument et une intensité : choisir le bon, doser la force.
// Quand il crie le mot de sûreté, on arrête tout et on fait un câlin. Quand il est comblé : rideau.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, SESSION = 80;
  const TOOLS = [
    { id: "plume", name: "Plume", key: "1", color: "#f2a0bd" },
    { id: "martinet", name: "Martinet", key: "2", color: "#2b2731" },
    { id: "paddle", name: "Paddle", key: "3", color: "#8a5a2c" },
    { id: "cire", name: "Cire chaude", key: "4", color: "#b3261e" },
  ];
  const ZONES = { doux: [10, 34], moyen: [42, 64], fort: [72, 96] };

  const REQUESTS = [
    ["plume", "doux", "La plume… partout… surtout là où ça chatouille."],
    ["plume", "moyen", "Plume ! Plus vite ! Je veux glousser comme un Pachimari."],
    ["martinet", "moyen", "Le martinet, Maîtresse. J'ai été un très vilain Enxor."],
    ["martinet", "fort", "Martinet. Fort. Et dites-moi que je suis une sale petite tache d'encre."],
    ["martinet", "doux", "Le martinet, mais tout doux… je suis sensible des tentacules."],
    ["paddle", "fort", "Le paddle ! FORT ! Je veux en garder la marque jusqu'à Halloween !"],
    ["paddle", "moyen", "Une fessée au paddle, à point, comme un bon steak."],
    ["paddle", "doux", "Le paddle, en caresse… juste pour me rappeler qui commande."],
    ["cire", "moyen", "Un peu de cire chaude… je fonds rien que d'y penser."],
    ["cire", "fort", "Toute la bougie ! Je veux être scellé comme une vieille lettre d'amour."],
    ["cire", "doux", "Une goutte de cire… une seule… là… oh."],
  ];
  const GOOD = [
    "Ohhh oui, Maîtresse !", "Encore… encore…", "Mes tentacules frémissent !", "Je vais devoir changer d'encre…",
    "C'est meilleur qu'un onigiri.", "Vous avez des doigts de fée… sadique.", "Je ne sens plus ma goutte !", "Merci Maîtresse, j'en redemande !",
  ];
  const TOO_HARD = ["AÏE ! Trop, trop ! … enfin… presque bien.", "Ouille ! Doucement, je suis en encre, pas en béton !", "Là, j'ai vu Mythras en personne."];
  const TOO_SOFT = ["C'est tout ? Une méduse me fait plus d'effet.", "Plus fort, je ne suis pas en porcelaine !", "J'ai cru que c'était un courant d'air."];
  const WRONG = (asked, given) => `J'ai dit ${asked.toUpperCase()}, pas ${given.toUpperCase()} ! … garde-le pour plus tard.`;
  const FAKES = ["Cornet de glace…", "Corniche… j'adore la vue d'ici.", "Cornemuse ! … non, rien, ça m'est venu comme ça."];

  Games.register(20, {
    title: "Le donjon de Maîtresse Ficelle",
    music: "vampire",
    story: "Sous la vieille tannerie du Seuil, Maîtresse Ficelle tient un donjon très discret. Ce soir, elle te confie son client le plus exigeant : Monsieur Gourdin, attaché, ravi, et plein de demandes. Donne-lui exactement ce qu'il réclame… et si tu entends « CORNICHON », tu arrêtes tout et tu lui fais un câlin. Le consentement, c'est sacré.",
    controls: "1 2 3 4 (ou clic sur le râtelier) : choisir l'instrument. Maintenir le clic ou Espace pour doser la force, relâcher pour frapper. C ou bouton « Câlin » : réagir au mot de sûreté.",

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
      const pick = (a) => a[Math.floor(r() * a.length)];

      let tool = 0, charging = null, power = 0, req = null, reqAt = 0, extase = 0, score = 0, hits = 0, perfect = 0;
      let safeFails = 0, hugs = 0, phase = "play", phaseAt = secs(), say = "", sayAt = 0, sayColor = "#f2ead8", strike = null, shake = 0;
      const startAt = secs();
      let reqCount = 0, safeAt = [];
      // trois vrais « cornichon » et deux faux, répartis dans la séance
      const plan = [4, 8, 12, 15, 18].map((k) => k + Math.floor(r() * 2));
      const kinds = ["safe", "safe", "safe", "fake", "fake"].sort(() => r() - 0.5);
      void safeAt;

      function nextRequest() {
        reqCount++;
        const special = plan.indexOf(reqCount);
        if (special >= 0) {
          if (kinds[special] === "safe") req = { kind: "safe", text: "CORNICHON !!!" };
          else {
            // un faux mot de sûreté, suivi d'une vraie demande : il ne faut PAS s'arrêter
            const [t, z, text] = pick(REQUESTS);
            req = { kind: "fake", tool: t, zone: z, decoy: pick(FAKES), text: "" };
            req.text = req.decoy + " … Bref. " + text;
          }
        } else {
          const [t, z, text] = pick(REQUESTS);
          req = { kind: "ask", tool: t, zone: z, text };
        }
        reqAt = secs();
        if (req.kind === "safe") Sound.play("surprise");
      }
      function talk(text, color = PAPER) { say = text; sayAt = secs(); sayColor = color; }

      function release() {
        if (!charging || phase !== "play") return;
        const p = power;
        charging = null;
        if (!req) return;
        const t = TOOLS[tool];
        strike = { t: secs(), tool: t.id, p };
        Sound.play(t.id === "plume" ? "chat" : t.id === "cire" ? "drop" : "kick", 0.4 + p / 150);
        shake = t.id === "plume" ? 0.05 : 0.15 + p / 400;
        if (req.kind === "safe") {
          // on ne frappe JAMAIS après le mot de sûreté
          safeFails++; extase = Math.max(0, extase - 40); score -= 400;
          talk("ON A DIT CORNICHON ! … Maîtresse Ficelle te regarde très, très mal.", "#ff6a5a");
          Sound.play("gavel");
          req = null; setTimeout(nextIfPlaying, 1600);
          return;
        }
        const ask = req;
        if (t.id !== ask.tool) {
          extase = Math.max(0, extase - 6);
          talk(WRONG(TOOLS.find((x) => x.id === ask.tool).name, t.name), "#f2c1cf");
        } else {
          const [lo, hi] = ZONES[ask.zone], mid = (lo + hi) / 2;
          if (p < lo - 4) { extase = Math.max(0, extase - 3); talk(pick(TOO_SOFT), "#cdd6ff"); }
          else if (p > hi + 4) { extase = Math.max(0, extase - 5); talk(pick(TOO_HARD), "#f2c1cf"); }
          else {
            const exact = Math.abs(p - mid) <= 4;
            hits++; if (exact) perfect++;
            const gain = exact ? 16 : 11;
            extase = Math.min(100, extase + gain);
            score += exact ? 200 : 130;
            talk(exact ? "PILE COMME IL FAUT ! " + pick(GOOD) : pick(GOOD), "#ffd84a");
            Sound.play("coeur", 0.6);
          }
        }
        req = null;
        if (extase >= 100) return curtain();
        setTimeout(nextIfPlaying, 900);
      }
      function hug() {
        if (phase !== "play" || !req) return;
        if (req.kind === "safe") {
          hugs++; score += 250; extase = Math.min(100, extase + 4);
          talk("Câlin. Couverture. « Ça va ? » « … Oui. Merci. On reprend ? »", "#8fd18a");
          Sound.play("coeur");
        } else if (req.kind === "fake") {
          score -= 50;
          talk("Mais non, j'ai juste dit « " + req.decoy.replace(/[….!].*$/, "") + " »… on continue !", "#cdd6ff");
          return;
        } else { talk("Un câlin ? Maintenant ? … bon, d'accord, mais après tu me fouettes.", "#cdd6ff"); score -= 20; return; }
        req = null;
        setTimeout(nextIfPlaying, 1200);
      }
      function nextIfPlaying() { if (phase === "play" && !req) nextRequest(); }
      function curtain() {
        phase = "curtain"; phaseAt = secs();
        Sound.play("reveal");
      }

      const RACK = TOOLS.map((t, i) => ({ x: 40 + i * 88, y: 26, w: 78, h: 78 }));
      const HUG = { x: AW - 200, y: AH - 92, w: 170, h: 62 };
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      const inR = (m, q) => m.x > q.x && m.x < q.x + q.w && m.y > q.y && m.y < q.y + q.h;
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (phase === "after") { if (secs() - phaseAt > 2) finish(); return; }
        const ri = RACK.findIndex((q) => inR(m, q));
        if (ri >= 0) { tool = ri; Sound.play("click"); return; }
        if (inR(m, HUG)) return hug();
        if (phase === "play" && !charging) { charging = { t: secs() }; canvas.setPointerCapture(e.pointerId); }
      });
      canvas.addEventListener("pointerup", release);
      const onKey = (e) => {
        if (e.type === "keydown") {
          if (["1", "2", "3", "4"].includes(e.key)) { tool = Number(e.key) - 1; Sound.play("click"); }
          else if (e.key.toLowerCase() === "c") hug();
          else if (e.key === " ") { e.preventDefault(); if (phase === "after" && secs() - phaseAt > 2) finish(); else if (!charging && phase === "play") charging = { t: secs() }; }
        } else if (e.key === " ") release();
      };
      window.addEventListener("keydown", onKey);
      window.addEventListener("keyup", onKey);

      function update(dt) {
        const el = secs() - startAt;
        if (phase === "play") {
          if (!req && reqCount === 0) nextRequest();
          // la jauge monte et descend : il faut relâcher au bon moment
          if (charging) { const k = (secs() - charging.t) * (1.1 + Math.min(0.8, el / 100)); power = (1 - Math.abs(((k % 2) + 2) % 2 - 1)) * 100; } else power = 0;
          // trop lent : il s'impatiente (sauf pour le mot de sûreté, qu'on ne doit pas rater)
          if (req && req.kind !== "safe" && secs() - reqAt > 7) { extase = Math.max(0, extase - 5); talk("Allô ? Maîtresse ? Je refroidis, là.", "#cdd6ff"); req = null; setTimeout(nextIfPlaying, 600); }
          if (req && req.kind === "safe" && secs() - reqAt > 4) { safeFails++; score -= 200; talk("Il a dit CORNICHON… et personne n'a réagi. On arrête un instant.", "#ff6a5a"); req = null; setTimeout(nextIfPlaying, 1500); }
          if (el > SESSION) { phase = "after"; phaseAt = secs(); }
        } else if (phase === "curtain" && secs() - phaseAt > 5.5) { phase = "after"; phaseAt = secs(); }
        shake = Math.max(0, shake - dt);
      }

      function finish() {
        stop();
        const total = Math.max(0, score + Math.round(extase) * 5 + (extase >= 100 ? 500 : 0));
        // ne pas respecter le mot de sûreté, c'est une étoile maximum
        const stars = safeFails ? 1 : total >= 2400 ? 3 : total >= 1500 ? 2 : 1;
        api.finish({
          score: total,
          stars,
          lines: [extase >= 100 ? "Monsieur Gourdin est comblé." : `Extase : ${Math.round(extase)} %`, safeFails ? "Mot de sûreté ignoré : ça ne se fait pas." : `Mot de sûreté respecté (${hugs} câlin${hugs > 1 ? "s" : ""})`],
        });
      }

      // ---------- dessin ----------
      function drawTool(id, x, y, sc, rot) {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        if (id === "plume") {
          ctx.fillStyle = "#f2a0bd";
          ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(-16, -6, 0, -34); ctx.quadraticCurveTo(16, -6, 0, 20); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, -30); ctx.stroke();
        } else if (id === "martinet") {
          ctx.fillStyle = "#2b2731"; ctx.fillRect(-4, 6, 8, 22); ctx.strokeRect(-4, 6, 8, 22);
          ctx.strokeStyle = "#2b2731"; ctx.lineWidth = 2.5;
          for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(k * 4, -12, k * 7, -34); ctx.stroke(); }
        } else if (id === "paddle") {
          ctx.fillStyle = "#8a5a2c";
          ctx.fillRect(-3.5, 6, 7, 24); ctx.strokeRect(-3.5, 6, 7, 24);
          ctx.beginPath(); ctx.roundRect(-14, -34, 28, 42, 10); ctx.fill(); ctx.stroke();
          Ink.heart(ctx, 0, -14, 5, "#1c1430");
        } else if (id === "cire") {
          ctx.fillStyle = "#b3261e"; ctx.fillRect(-7, -14, 14, 40); ctx.strokeRect(-7, -14, 14, 40);
          ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -20); ctx.stroke();
          Ink.halo(ctx, "rgba(255,200,110,.6)", 0, -28, 18);
          ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(0, -27, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(4, -10, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        const sh = shake ? (Math.random() - 0.5) * shake * 30 : 0;
        ctx.save(); ctx.translate(sh, 0);
        // le donjon : pierres et lumières rouges
        ctx.fillStyle = "#24141f"; ctx.fillRect(0, 0, AW, AH);
        ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
        for (let y = 0; y < 520; y += 46) for (let x = (y / 46) % 2 ? -40 : 0; x < AW; x += 90) ctx.strokeRect(x, y, 90, 46);
        ctx.fillStyle = "#1a0f16"; ctx.fillRect(0, 520, AW, AH - 520);
        for (const [x, c] of [[220, "rgba(179,38,30,.35)"], [880, "rgba(125,91,166,.35)"], [560, "rgba(211,107,156,.25)"]]) Ink.halo(ctx, c, x, 200 + Math.sin(t + x) * 10, 300);
        // tapis en fausse fourrure léopard (le bon goût avant tout)
        ctx.fillStyle = "#c9874a"; ctx.beginPath(); ctx.ellipse(700, 600, 300, 50, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4a2a1a";
        for (let k = 0; k < 26; k++) { ctx.beginPath(); ctx.arc(440 + (k * 97) % 520, 575 + (k * 37) % 50, 6, 0, Math.PI * 2); ctx.fill(); }

        // la croix de Saint-André
        ctx.strokeStyle = "#4a2a1a"; ctx.lineWidth = 26; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(620, 170); ctx.lineTo(860, 560); ctx.moveTo(860, 170); ctx.lineTo(620, 560); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(620, 170); ctx.lineTo(860, 560); ctx.moveTo(860, 170); ctx.lineTo(620, 560); ctx.stroke();
        // Monsieur Gourdin, attaché et ravi
        const wig = strike && secs() - strike.t < 0.6 ? Math.sin((secs() - strike.t) * 40) * 6 * (1 - (secs() - strike.t) / 0.6) : Math.sin(t * 2) * 2;
        const mood = phase === "curtain" ? "coeur" : req?.kind === "safe" ? "surprise" : extase > 60 ? "coeur" : null;
        ctx.save(); ctx.translate(740 + wig, 470); ctx.scale(3.4, 3.4);
        Ink.enxor(ctx, 0, 0, t, { seed: 20, color: "#e0662f", face: -1, wear: { back: "harnais", face: extase > 30 ? "rougir" : null }, emote: mood, et: (t % 1.5) });
        ctx.restore();
        // cordes et menottes
        ctx.strokeStyle = "#c9a24a"; ctx.lineWidth = 4;
        for (const [x1, y1, x2, y2] of [[670, 250, 710, 380], [810, 250, 770, 380], [690, 540, 720, 470], [790, 540, 760, 470]]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 + wig, y2); ctx.stroke(); }
        ctx.strokeStyle = "#b9c2c9"; ctx.lineWidth = 3;
        for (const [x, y] of [[670, 250], [810, 250]]) { ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
        Ink.word(ctx, "Monsieur Gourdin", 740, 290, 16, "#f2c1cf", 800, "#1b1b1b");

        // Maîtresse Ficelle (toi)
        ctx.save(); ctx.translate(360, 500); ctx.scale(3.4, 3.4);
        Ink.enxor(ctx, 0, 0, t, { seed: 21, color: "#d36b9c", face: 1, wear: { face: "masquecuir", back: "cape" } });
        ctx.restore();
        Ink.word(ctx, "Maîtresse Ficelle (toi)", 360, 330, 16, "#d36b9c", 800, "#1b1b1b");
        // l'instrument en main, qui frappe
        let rot = -0.5, tx = 450, ty = 380;
        if (charging) rot = -1.2 - power / 120;
        if (strike && secs() - strike.t < 0.25) { const k = (secs() - strike.t) / 0.25; rot = -1.6 + k * 2.4; tx = 450 + k * 160; ty = 380 + k * 10; }
        drawTool(TOOLS[tool].id, tx, ty, 2.2, rot);
        // l'impact
        if (strike && secs() - strike.t < 0.6) {
          const age = secs() - strike.t;
          ctx.globalAlpha = 1 - age / 0.6;
          const word = { plume: "frrrr…", martinet: "CLAC !", paddle: "PAF !", cire: "tsss…" }[strike.tool];
          Ink.word(ctx, word, 650, 330 - age * 60, 30 + strike.p / 6, strike.tool === "plume" ? "#f2a0bd" : "#ffd84a", 800, "#1b1b1b");
          if (strike.tool === "cire") { ctx.fillStyle = "#b3261e"; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(690 + k * 14, 360 + age * 80 + k * 6, 4, 0, Math.PI * 2); ctx.fill(); } }
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        // le râtelier
        TOOLS.forEach((tl, i) => {
          const q = RACK[i];
          ctx.fillStyle = i === tool ? "#5a2a3a" : "rgba(20,10,16,.8)"; ctx.strokeStyle = i === tool ? "#ffd84a" : "#5a5560"; ctx.lineWidth = i === tool ? 3 : 1.5;
          ctx.beginPath(); ctx.roundRect(q.x, q.y, q.w, q.h, 10); ctx.fill(); ctx.stroke();
          drawTool(tl.id, q.x + q.w / 2, q.y + 44, 0.95, 0);
          Ink.word(ctx, `${tl.key} · ${tl.name}`, q.x + q.w / 2, q.y + q.h + 12, 12, PAPER, 700, "#1b1b1b");
        });

        // sa demande
        if (req && phase === "play") {
          const isSafe = req.kind === "safe";
          ctx.font = `800 ${isSafe ? 30 : 19}px "Barlow Semi Condensed", sans-serif`;
          const lines = []; let line = "";
          for (const w of req.text.split(" ")) { if (ctx.measureText(line + w).width > 360 && line) { lines.push(line); line = ""; } line += w + " "; }
          lines.push(line);
          const h = lines.length * (isSafe ? 34 : 24) + 26, bx = 690, by = 150 - h;
          ctx.fillStyle = isSafe ? "#1f7a3a" : PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.roundRect(bx - 200, by, 400, h, 14); ctx.fill(); ctx.stroke();
          ctx.fillStyle = isSafe ? "#f2ead8" : INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          lines.forEach((l, k) => ctx.fillText(l.trim(), bx, by + 20 + k * (isSafe ? 34 : 24)));
          if (req.tool) {
            const tl = TOOLS.find((x) => x.id === req.tool);
            Ink.word(ctx, `→ ${tl.name} · ${req.zone}`, bx, 172, 16, "#ffd84a", 800, "#1b1b1b");
          }
          // délai
          const lim = isSafe ? 4 : 7, k = Math.max(0, 1 - (secs() - reqAt) / lim);
          ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(bx - 200, 186, 400, 5);
          ctx.fillStyle = isSafe ? "#8fd18a" : "#d36b9c"; ctx.fillRect(bx - 200, 186, 400 * k, 5);
        }
        // la réplique
        if (say && secs() - sayAt < 2.4 && phase === "play") Ink.word(ctx, say, AW / 2, 236, 19, sayColor, 800, "#1b1b1b");

        // la jauge de force
        const MX = 140, MY = AH - 70, MW = 600;
        ctx.fillStyle = "rgba(20,10,16,.85)"; ctx.fillRect(MX - 10, MY - 30, MW + 20, 64);
        const z = req?.zone ? ZONES[req.zone] : null;
        for (const [name, [lo, hi]] of Object.entries(ZONES)) {
          ctx.fillStyle = z && z[0] === lo ? "rgba(255,216,74,.45)" : "rgba(239,229,208,.12)";
          ctx.fillRect(MX + (MW * lo) / 100, MY - 10, (MW * (hi - lo)) / 100, 24);
          Ink.word(ctx, name, MX + (MW * (lo + hi)) / 200, MY - 20, 12, PAPER, 700, "#1b1b1b");
        }
        ctx.fillStyle = "#ff6a5a"; ctx.fillRect(MX + (MW * power) / 100 - 3, MY - 14, 6, 32);
        Ink.word(ctx, "Force", MX - 50, MY + 2, 14, PAPER, 700, "#1b1b1b");
        // bouton câlin
        const urgent = req?.kind === "safe";
        ctx.fillStyle = urgent ? (Math.sin(t * 12) > 0 ? "#8fd18a" : "#3f8a4a") : "#3b3440";
        ctx.beginPath(); ctx.roundRect(HUG.x, HUG.y, HUG.w, HUG.h, 14); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        Ink.word(ctx, "C · Câlin 🤗", HUG.x + HUG.w / 2, HUG.y + HUG.h / 2, 18, PAPER, 800, "#1b1b1b");
        // extase-o-mètre
        ctx.fillStyle = "rgba(20,10,16,.85)"; ctx.fillRect(AW - 70, 30, 40, 320);
        const eh = 300 * extase / 100;
        ctx.fillStyle = extase > 80 ? "#ff6a9a" : "#d36b9c"; ctx.fillRect(AW - 62, 340 - eh, 24, eh);
        Ink.heart(ctx, AW - 50, 370, 10, "#d36b9c");
        Ink.word(ctx, "Extase", AW - 50, 395, 13, PAPER, 700, "#1b1b1b");
        const left = Math.max(0, Math.ceil(SESSION - (secs() - startAt)));
        Ink.word(ctx, `${left} s`, AW - 50, 420, 15, "#cdd6ff", 700, "#1b1b1b");

        // rideau !
        if (phase === "curtain" || phase === "after") {
          const k = Math.min(1, (secs() - (phase === "curtain" ? phaseAt : 0)) / 0.8);
          const cw = (AW / 2) * (phase === "after" ? 1 : k);
          ctx.fillStyle = "#7a1426";
          ctx.fillRect(0, 0, cw, AH); ctx.fillRect(AW - cw, 0, cw, AH);
          ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 4;
          for (let x = 20; x < cw; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, AH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(AW - x, 0); ctx.lineTo(AW - x, AH); ctx.stroke(); }
          if (phase === "curtain" && k >= 1) {
            // ombres chinoises et onomatopées derrière le rideau
            const e = secs() - phaseAt;
            Ink.halo(ctx, "rgba(255,200,140,.5)", AW / 2, 360, 300);
            ctx.fillStyle = "rgba(10,4,8,.75)";
            const bounce = Math.abs(Math.sin(e * 6)) * 10;
            ctx.beginPath(); ctx.ellipse(AW / 2 - 70, 380 - bounce, 50, 70, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(AW / 2 + 70, 390, 55, 65, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(AW / 2 - 20, 320); ctx.rotate(Math.sin(e * 8) * 1.2);
            ctx.fillRect(-4, -60, 8, 60); ctx.restore();
            const words = ["CLAC !", "Ohhh…", "MAÎTRESSE !", "frrrr…", "PAF !", "Encore !", "Mes tentacules !!!", "…cornet de glace…"];
            for (let i = 0; i < Math.min(words.length, Math.floor(e * 1.8)); i++) Ink.word(ctx, words[i], 230 + ((i * 263) % 640), 140 + ((i * 97) % 320), 24 + (i % 3) * 6, ["#ffd84a", "#f2c1cf", "#ff6a9a"][i % 3], 800, "#1b1b1b");
            Ink.word(ctx, "(le rideau reste fermé, par pudeur)", AW / 2, 620, 16, "#f2c1cf", 600, "#1b1b1b");
          }
          if (phase === "after") {
            ctx.fillStyle = "rgba(20,10,16,.6)"; ctx.fillRect(140, 150, AW - 280, 380);
            ctx.save(); ctx.translate(AW / 2 - 60, 400); ctx.scale(2.6, 2.6);
            Ink.enxor(ctx, 0, 0, t, { seed: 20, color: "#e0662f", face: 1, emote: "coeur", et: t % 2, wear: { face: "rougir" } });
            ctx.restore();
            ctx.save(); ctx.translate(AW / 2 + 60, 400); ctx.scale(2.6, 2.6);
            Ink.enxor(ctx, 0, 0, t, { seed: 21, color: "#d36b9c", face: -1, wear: { face: "masquecuir" } });
            ctx.restore();
            // la couverture et les chocolats chauds
            ctx.fillStyle = "#5bb3a0"; ctx.beginPath(); ctx.ellipse(AW / 2, 420, 170, 40, 0, Math.PI, 0); ctx.fill();
            for (const x of [AW / 2 - 100, AW / 2 + 100]) { ctx.fillStyle = PAPER; ctx.fillRect(x - 12, 410, 24, 26); ctx.fillStyle = "#6b4426"; ctx.fillRect(x - 10, 412, 20, 6); }
            Ink.word(ctx, extase >= 100 ? "Monsieur Gourdin est comblé." : "Fin de la séance.", AW / 2, 200, 34, "#ffd84a", 800, "#1b1b1b");
            Ink.word(ctx, "Câlin, couverture et chocolat chaud : l'après, c'est sacré aussi.", AW / 2, 244, 18, PAPER, 600, "#1b1b1b");
            if (secs() - phaseAt > 2) Ink.word(ctx, "Clique pour terminer", AW / 2, 500, 15, "#cdd6ff", 600, "#1b1b1b");
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
      if (location.hostname === "localhost") {
        window.__donjon = {
          state: () => ({ req: req && { kind: req.kind, tool: req.tool, zone: req.zone }, power: Math.round(power), charging: !!charging, extase: Math.round(extase), phase, score, safeFails }),
          tools: TOOLS.map((x) => x.id), zones: ZONES,
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
