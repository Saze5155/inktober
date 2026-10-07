// Jour 8 · Sexy : « Le bal masqué de Prismaelyx »
// Speed-dating : quatre rendez-vous, trois répliques chacun. Il faut lire ce que l'autre aime.
// Silence (laisser filer le temps) = on ne dit rien… ce qui ne plaît qu'à un seul d'entre eux.
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, ASK_TIME = 12;

  // [réplique, cœurs (0-2), réaction]
  const DATES = [
    {
      name: "Sabot", kind: "crocs", color: "#5bb3a0",
      bio: "Une Crocs gauche, orpheline de sa droite.",
      likes: "le confort, les trous, les choses pratiques",
      silence: [0, "… Tu regardes mes trous, c'est ça ?"],
      qs: [
        ["Salut… Tu viens souvent à ce bal ? Moi je viens surtout à pied. Enfin, sur un pied.", [
          ["J'adore tes trous. On voit ton âme à travers.", 2, "Personne ne m'avait jamais regardé comme ça…"],
          ["Tu serais pas un peu… moche ?", 0, "Je préfère le mot « orthopédique »."],
          ["Moi aussi je suis venu à pied. Deux, même.", 1, "Deux pieds ? Quel luxe…"],
        ]],
        ["Qu'est-ce que tu cherches, chez quelqu'un ?", [
          ["Quelqu'un qui me soutienne. Surtout la voûte plantaire.", 2, "Mon cœur… mon talon… tout s'emballe."],
          ["Des talons aiguilles et de l'élégance.", 0, "Je… je vais aller chercher un verre."],
          ["Quelqu'un qui reste quand il pleut.", 1, "Je suis imperméable, tu sais."],
        ]],
        ["Si on partait ensemble, on irait où ?", [
          ["À la piscine. Tu ne glisserais jamais.", 2, "Antidérapant ET amoureux. Ce soir, tout est possible."],
          ["Faire 40 km de randonnée en montagne.", 0, "Mes ampoules se souviennent de la dernière fois."],
          ["Au marché, chercher ta chaussure droite.", 1, "Tu ferais ça pour moi ?"],
        ]],
      ],
    },
    {
      name: "Terrathos", kind: "rock", color: "#8a8478",
      bio: "Un rocher. Il parle très, très lentement.",
      likes: "la patience, le silence, l'éternité",
      silence: [2, "………… Enfin… quelqu'un… qui écoute."],
      qs: [
        ["…………… Bonjour.", [
          ["BONJOUR ! ÇA VA ? TU FAIS QUOI DANS LA VIE ?", 0, "…………… Trop… de… mots."],
          ["Tu es très… stable.", 1, "… Merci. Depuis… quatre mille ans."],
          ["Tu as de beaux lichens.", 1, "…… Ils… sont… à moi."],
        ]],
        ["……… Qu'aimes-tu ?", [
          ["Regarder la mousse pousser.", 2, "… La mousse… est… notre amie."],
          ["La vitesse, les courses, les sensations fortes !", 0, "…… Une érosion… me… fait… cet effet."],
          ["Les galets. Ce sont un peu tes enfants ?", 1, "… Mes… petits… cailloux."],
        ]],
        ["…………… Restes-tu ?", [
          ["Jusqu'à ce que la pluie nous use tous les deux.", 2, "…… Je… sédimente… d'émotion."],
          ["Non, j'ai un autre rendez-vous dans cinq minutes.", 0, "…… Cinq… minutes… ce… n'est… rien."],
          ["Je reviendrai te voir à chaque saison.", 1, "… Les saisons… passent… si vite."],
        ]],
      ],
    },
    {
      name: "Comte Nyctin", kind: "vampire", color: "#7a1426",
      bio: "Un vampire très, très théâtral.",
      likes: "le drame, la nuit, les compliments sur sa cape",
      silence: [1, "Ce silence… si lourd… si sombre… j'adore."],
      qs: [
        ["Ahh… Un nouveau visage dans les ténèbres. Que fais-tu si tard, petite tache ?", [
          ["Je te cherchais. Toute ma vie. Dans le noir.", 2, "Quelle intensité… Ma cape frissonne."],
          ["Je suis allé bronzer cet après-midi, ça se voit ?", 0, "AAAH ! Ne prononce pas ce mot !"],
          ["Je m'ennuyais, alors je suis venu.", 1, "L'ennui… le plus beau des tourments."],
        ]],
        ["Que penses-tu… de ma cape ?", [
          ["Elle a été cousue dans la nuit elle-même.", 2, "Enfin quelqu'un qui comprend la couture !"],
          ["C'est un rideau ?", 0, "… C'est une cape. De cérémonie."],
          ["Elle a du volume.", 1, "Elle en a. Merci de l'avoir remarqué."],
        ]],
        ["Puis-je… goûter à ton encre ?", [
          ["Seulement si tu me promets l'éternité.", 2, "L'éternité ? Je te la promets. Deux fois."],
          ["J'ai mangé de l'ail à midi.", 0, "Tu… tu es un monstre."],
          ["On commence par un jus de tomate ?", 1, "Le romantisme végétarien… soit."],
        ]],
      ],
    },
    {
      name: "Ocre", kind: "ocre", color: "#c9874a",
      bio: "Il vient de Cendre-Gravée, où la journée recommence sans cesse.",
      likes: "qu'on se souvienne à sa place",
      silence: [0, "Oh ! Bonjour ! On s'est déjà vus ?"],
      qs: [
        ["Oh, bonjour ! On s'est déjà vus ?", [
          ["Oui. Hier. Et avant-hier. Et je reviens quand même.", 2, "C'est… la plus belle chose qu'on m'ait dite. Je crois."],
          ["Non, jamais. Tu es sûr que ça va ?", 0, "… Sûrement. Je… je ne sais plus."],
          ["Peut-être, mais je suis content de te rencontrer encore.", 1, "Encore ? C'est gentil."],
        ]],
        ["Oh, bonjour ! On s'est déjà vus ?", [
          ["Tu viens de me poser la même question.", 0, "Ah bon ? Ça m'arrive. Pardon."],
          ["Il y a dix secondes. Je m'appelle toujours pareil.", 1, "Ah ! Alors je t'aime toujours pareil."],
          ["Non. Enchanté, je suis ton rendez-vous préféré.", 2, "Mon préféré ? Ça, je le sens. Même sans souvenir."],
        ]],
        ["Tu reviendras demain ? Moi, je serai là. Je suis toujours là.", [
          ["Je t'écris un mot sur la main pour que tu t'en souviennes.", 2, "Un mot sur la main… Je le lirai chaque matin."],
          ["Demain ? Tu ne t'en souviendras même pas.", 0, "… C'est vrai. C'est triste, dit comme ça."],
          ["Oui, et j'amènerai du vent. Tu attends le vent, non ?", 1, "Le vent ! Tu t'en souviens pour moi !"],
        ]],
      ],
    },
  ];

  // découpe un texte en lignes qui tiennent dans maxW
  function wrap(ctx, text, maxW) {
    const words = text.split(" "), lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  Games.register(8, {
    title: "Le bal masqué de Prismaelyx",
    music: "game",
    story: "Chaque année, Prismaelyx, le dieu des couleurs, organise un bal masqué où les Enxors cherchent l'âme sœur. Ce soir, c'est ton tour : quatre rendez-vous de trois répliques chacun. Écoute bien ce que chacun aime… et parfois, le mieux est de ne rien dire.",
    controls: "Clique sur une réplique, ou appuie sur 1, 2 ou 3. Si tu ne réponds pas avant la fin du sablier, tu restes silencieux.",

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

      // la salle de bal, dessinée une seule fois
      const bg = document.createElement("canvas");
      bg.width = AW; bg.height = AH;
      {
        const b = bg.getContext("2d");
        const g = b.createLinearGradient(0, 0, 0, AH);
        g.addColorStop(0, "#1c1230"); g.addColorStop(0.55, "#3a1d3f"); g.addColorStop(1, "#24142c");
        b.fillStyle = g; b.fillRect(0, 0, AW, AH);
        // le sol en damier, en perspective
        for (let row = 0; row < 8; row++) {
          const y0 = 330 + row * row * 5 + row * 10, y1 = 330 + (row + 1) * (row + 1) * 5 + (row + 1) * 10;
          for (let col = -12; col < 12; col++) {
            if ((row + col) % 2 === 0) continue;
            const sp0 = 40 + row * 14, sp1 = 40 + (row + 1) * 14;
            b.fillStyle = "rgba(239,229,208,.06)";
            b.beginPath();
            b.moveTo(AW / 2 + col * sp0, y0); b.lineTo(AW / 2 + (col + 1) * sp0, y0);
            b.lineTo(AW / 2 + (col + 1) * sp1, y1); b.lineTo(AW / 2 + col * sp1, y1);
            b.fill();
          }
        }
        // rideaux
        for (const sx of [0, AW]) {
          b.fillStyle = "#5a1622";
          b.beginPath(); b.moveTo(sx, 0); b.lineTo(sx + (sx ? -150 : 150), 0);
          b.quadraticCurveTo(sx + (sx ? -60 : 60), 200, sx + (sx ? -90 : 90), 420); b.lineTo(sx, 420); b.fill();
          b.strokeStyle = "rgba(0,0,0,.3)"; b.lineWidth = 3;
          for (let k = 1; k < 5; k++) { b.beginPath(); b.moveTo(sx + (sx ? -k * 28 : k * 28), 0); b.quadraticCurveTo(sx + (sx ? -k * 14 : k * 14), 220, sx + (sx ? -k * 18 : k * 18), 420); b.stroke(); }
        }
        // guirlande
        b.strokeStyle = "rgba(239,229,208,.3)"; b.lineWidth = 1.5;
        b.beginPath(); b.moveTo(120, 40); b.quadraticCurveTo(AW / 2, 120, AW - 120, 40); b.stroke();
      }
      const LIGHTS = ["rgba(224,102,47,.35)", "rgba(91,179,160,.35)", "rgba(211,107,156,.35)", "rgba(62,124,177,.35)", "rgba(233,176,74,.35)"];
      const DANCERS = Array.from({ length: 7 }, (_, i) => ({ x: 140 + i * 140, seed: i + 30, color: ["#e0662f", "#5bb3a0", "#d36b9c", "#3e7cb1", "#e9b04a", "#7d5ba6", "#5b8c5a"][i] }));

      // état : intro (présentation du rendez-vous), ask (question), react (réaction), done
      let di = 0, qi = 0, phase = "intro", phaseAt = secs(), hearts = DATES.map(() => 0), score = 0;
      let choices = [], reaction = null, chosen = -1, bonus = 0;
      const r = Ink.rng(Math.floor(Math.random() * 1e9));

      function ask() {
        phase = "ask"; phaseAt = secs(); chosen = -1;
        // les répliques sont mélangées à chaque partie
        choices = DATES[di].qs[qi][1].map((c) => c).sort(() => r() - 0.5);
      }
      function answer(i) {
        if (phase !== "ask") return;
        const d = DATES[di];
        const left = Math.max(0, ASK_TIME - (secs() - phaseAt));
        let h, say;
        if (i < 0) [h, say] = d.silence;
        else [, h, say] = choices[i];
        chosen = i;
        hearts[di] += h;
        bonus = h ? Math.round(left * 5) : 0;
        score += h * 100 + bonus;
        reaction = { h, say };
        phase = "react"; phaseAt = secs();
        Sound.play(h === 2 ? "coeur" : h === 1 ? "chat" : "surprise");
      }
      function next() {
        if (++qi < 3) return ask();
        qi = 0;
        if (++di < DATES.length) { phase = "intro"; phaseAt = secs(); Sound.play("bell"); return; }
        finish();
      }

      function finish() {
        stop();
        const total = hearts.reduce((a, b) => a + b, 0);
        const best = hearts.indexOf(Math.max(...hearts));
        api.finish({
          score,
          stars: total >= 20 ? 3 : total >= 14 ? 2 : 1,
          lines: [`${total} cœurs sur 24`, `Coup de foudre de la soirée : ${DATES[best].name} (${hearts[best]}/6)`],
        });
      }

      // zones des trois répliques
      const BOX = (i) => ({ x: 60, y: 482 + i * 64, w: AW - 120, h: 54 });
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      let hover = -1;
      canvas.addEventListener("pointermove", (e) => {
        const m = toArena(e);
        hover = -1;
        if (phase === "ask") for (let i = 0; i < 3; i++) { const b = BOX(i); if (m.x > b.x && m.x < b.x + b.w && m.y > b.y && m.y < b.y + b.h) hover = i; }
        canvas.style.cursor = hover >= 0 ? "pointer" : "";
      });
      canvas.addEventListener("pointerdown", () => {
        if (phase === "intro" && secs() - phaseAt > 0.6) { Sound.play("click"); ask(); }
        else if (phase === "ask" && hover >= 0) answer(hover);
        else if (phase === "react" && secs() - phaseAt > 0.8) next();
      });
      const onKey = (e) => {
        if (phase === "ask" && ["1", "2", "3"].includes(e.key)) answer(Number(e.key) - 1);
        else if ((e.key === " " || e.key === "Enter") && phase === "intro" && secs() - phaseAt > 0.6) ask();
        else if ((e.key === " " || e.key === "Enter") && phase === "react" && secs() - phaseAt > 0.8) next();
      };
      window.addEventListener("keydown", onKey);

      function update() {
        if (phase === "ask" && secs() - phaseAt > ASK_TIME) answer(-1);
        if (phase === "react" && secs() - phaseAt > 3.2) next();
      }

      // ---------- dessins des prétendants ----------
      function drawDate(d, x, y, t, mood) {
        const bob = Math.sin(t * 2) * 3 + (mood === 2 ? Math.abs(Math.sin(t * 8)) * 6 : 0);
        ctx.save();
        ctx.translate(x, y - bob);
        if (d.kind === "crocs") {
          Ink.shadow(ctx, 0, bob + 4, 90, 14, 0.3);
          ctx.fillStyle = d.color; ctx.strokeStyle = INK; ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-95, 0); ctx.lineTo(80, 0); ctx.quadraticCurveTo(115, -10, 100, -50);
          ctx.quadraticCurveTo(70, -95, 10, -95); ctx.lineTo(-60, -110); ctx.quadraticCurveTo(-100, -100, -95, 0);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#3f8a7a";
          for (const [hx, hy] of [[20, -70], [45, -60], [65, -45], [30, -45], [55, -28], [80, -25]]) { ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill(); }
          // bride
          ctx.strokeStyle = "#3f8a7a"; ctx.lineWidth = 10;
          ctx.beginPath(); ctx.arc(-60, -55, 34, Math.PI * 0.6, Math.PI * 1.5); ctx.stroke();
          eyes(-30, -70, 8, t);
          mouth(-30, -45, mood);
        } else if (d.kind === "rock") {
          Ink.shadow(ctx, 0, bob + 4, 110, 16, 0.35);
          ctx.fillStyle = d.color; ctx.strokeStyle = INK; ctx.lineWidth = 4;
          ctx.beginPath();
          const pts = [[-110, 0], [-118, -60], [-80, -130], [-10, -150], [70, -128], [112, -70], [108, 0]];
          pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.closePath(); ctx.fill(); ctx.stroke();
          Ink.hatch(ctx, pts, Ink.rng(5), { gap: 14, alpha: 0.15 });
          ctx.fillStyle = "#5b8c5a";
          for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(-70 + k * 12, -132 + Math.abs(k - 4) * 4, 9, 0, Math.PI * 2); ctx.fill(); }
          // il cligne très lentement
          const blink = Math.sin(t * 0.4) > 0.96;
          ctx.fillStyle = INK;
          for (const ex of [-30, 30]) { ctx.beginPath(); ctx.ellipse(ex, -80, 7, blink ? 1 : 5, 0, 0, Math.PI * 2); ctx.fill(); }
          mouth(0, -50, mood);
        } else {
          ctx.scale(3.6, 3.6);
          const wear = d.kind === "vampire" ? { back: "cape", head: null } : { head: "girouette" };
          Ink.enxor(ctx, 0, 0, t, { seed: d.kind === "vampire" ? 3 : 9, color: d.color, face: -1, fangs: d.kind === "vampire", wear, emote: mood === 2 ? "coeur" : null, et: 0.5 });
          if (mood === 2) Ink.heart(ctx, 14, -48, 5, "#d36b9c");
        }
        ctx.restore();
      }
      function eyes(x, y, rr, t) {
        const blink = (t % 3.4) < 0.12;
        for (const ex of [-rr * 2, rr * 2]) {
          ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(x + ex, y, rr, blink ? 1 : rr * 1.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
          if (!blink) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + ex - 2, y + 1, rr * 0.5, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function mouth(x, y, mood) {
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath();
        if (mood === 0) { ctx.moveTo(x - 12, y + 6); ctx.quadraticCurveTo(x, y - 4, x + 12, y + 6); }
        else if (mood === 2) { ctx.moveTo(x - 14, y - 3); ctx.quadraticCurveTo(x, y + 14, x + 14, y - 3); }
        else { ctx.moveTo(x - 10, y + 2); ctx.lineTo(x + 10, y + 2); }
        ctx.stroke();
      }

      function bubble(text, x, y, w, color) {
        ctx.font = `600 19px "Barlow Semi Condensed", sans-serif`;
        const lines = wrap(ctx, text, w - 36);
        const h = lines.length * 24 + 24;
        ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 16); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 10, y - 1); ctx.lineTo(x + 20, y + 22); ctx.lineTo(x + 18, y - 1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 20, y + 22); ctx.lineTo(x + 18, y); ctx.stroke();
        ctx.fillStyle = color || INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        lines.forEach((l, k) => ctx.fillText(l, x, y - h + 24 + k * 24));
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        ctx.drawImage(bg, 0, 0);
        // projecteurs de Prismaelyx qui balayent la salle
        for (let k = 0; k < 5; k++) Ink.halo(ctx, LIGHTS[k], AW / 2 + Math.sin(t * 0.5 + k * 1.3) * 420, 300 + Math.cos(t * 0.4 + k) * 60, 160);
        // couples qui dansent au fond
        ctx.globalAlpha = 0.45;
        for (const dd of DANCERS) Ink.enxor(ctx, dd.x + Math.sin(t + dd.seed) * 20, 300, t, { seed: dd.seed, color: dd.color, emote: "danse", et: 1, moving: false });
        ctx.globalAlpha = 1;

        const d = DATES[di];
        const mood = phase === "react" ? reaction.h : 1;
        // la table et la bougie
        Ink.shadow(ctx, AW / 2, 470, 150, 18, 0.35);
        ctx.fillStyle = "#f2ead8"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(AW / 2, 430, 150, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#e9e0c8"; ctx.fillRect(AW / 2 - 150, 430, 300, 32); ctx.strokeRect(AW / 2 - 150, 430, 300, 32);
        ctx.fillStyle = "#efe5d0"; ctx.fillRect(AW / 2 - 5, 384, 10, 40); ctx.strokeRect(AW / 2 - 5, 384, 10, 40);
        Ink.halo(ctx, "rgba(255,200,110,.55)", AW / 2, 374, 46);
        ctx.fillStyle = "#e9b04a";
        ctx.beginPath(); ctx.ellipse(AW / 2 + Math.sin(t * 9) * 1.2, 374, 4, 9, 0, 0, Math.PI * 2); ctx.fill();

        // toi, masqué
        ctx.save();
        ctx.translate(280, 450);
        ctx.scale(3.4, 3.4);
        Ink.enxor(ctx, 0, 0, t, { seed: 1, color: "#e9b04a", face: 1, emote: phase === "react" && reaction.h === 2 ? "coeur" : null, et: 0.5 });
        ctx.fillStyle = "#7d5ba6"; ctx.strokeStyle = "#e9b04a"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(2.5, -22, 16, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK;
        for (const ex of [-3, 8]) { ctx.beginPath(); ctx.ellipse(ex, -22, 3.2, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();

        drawDate(d, 820, 450, t, mood);
        Ink.word(ctx, d.name, 820, 470 - (d.kind === "rock" ? 180 : d.kind === "crocs" ? 140 : 150) - 10, 22, d.color === "#7a1426" ? "#d36b9c" : d.color, 800, "#1b1b1b");

        // jauge de cœurs
        for (let k = 0; k < 6; k++) {
          const filled = k < hearts[di];
          ctx.globalAlpha = filled ? 1 : 0.25;
          Ink.heart(ctx, AW / 2 - 75 + k * 30, 30, 10, filled ? "#d36b9c" : PAPER);
        }
        ctx.globalAlpha = 1;
        Ink.word(ctx, `Rendez-vous ${di + 1} / ${DATES.length}`, AW / 2, 66, 15, PAPER, 700, "#1b1b1b");

        if (phase === "intro") {
          ctx.fillStyle = "rgba(20,12,30,.82)";
          ctx.beginPath(); ctx.roundRect(200, 480, 700, 180, 18); ctx.fill();
          Ink.word(ctx, d.name, AW / 2, 515, 30, "#e9b04a", 800, "#1b1b1b");
          Ink.word(ctx, d.bio, AW / 2, 556, 19, PAPER, 600, "#1b1b1b");
          Ink.word(ctx, `Aime : ${d.likes}`, AW / 2, 592, 19, "#f2c1cf", 700, "#1b1b1b");
          if (secs() - phaseAt > 0.6) Ink.word(ctx, "Clique pour t'asseoir", AW / 2, 636, 16, "#b9a98a", 600, "#1b1b1b");
        } else {
          const q = d.qs[qi][0];
          if (phase === "ask") {
            bubble(q, 780, 200, 440);
            // sablier
            const k = Math.max(0, 1 - (secs() - phaseAt) / ASK_TIME);
            ctx.fillStyle = "rgba(239,229,208,.15)"; ctx.fillRect(60, 466, AW - 120, 6);
            ctx.fillStyle = k < 0.25 ? "#d36b9c" : "#e9b04a"; ctx.fillRect(60, 466, (AW - 120) * k, 6);
            ctx.font = `600 20px "Barlow Semi Condensed", sans-serif`;
            for (let i = 0; i < 3; i++) {
              const b = BOX(i);
              ctx.fillStyle = hover === i ? "rgba(233,176,74,.95)" : "rgba(20,12,30,.85)";
              ctx.strokeStyle = hover === i ? INK : "rgba(239,229,208,.35)"; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke();
              ctx.fillStyle = hover === i ? INK : PAPER; ctx.textAlign = "left"; ctx.textBaseline = "middle";
              ctx.fillText(`${i + 1}.  ${choices[i][0]}`, b.x + 22, b.y + b.h / 2);
            }
          } else if (phase === "react") {
            // ta réplique, puis sa réponse
            const mine = chosen < 0 ? "……" : choices[chosen][0];
            bubble(mine, 330, 210, 380, "#3a1d3f");
            bubble(reaction.say, 800, 190, 420, reaction.h === 2 ? "#a3346e" : reaction.h === 0 ? "#6b6170" : INK);
            const verdict = ["Raté…", "Pas mal.", "Coup de cœur !"][reaction.h];
            Ink.word(ctx, verdict, AW / 2, 530, 34, ["#b9a98a", "#e9b04a", "#d36b9c"][reaction.h], 800, "#1b1b1b");
            if (reaction.h) for (let k = 0; k < reaction.h; k++) Ink.heart(ctx, AW / 2 - 15 * (reaction.h - 1) + k * 30, 580 - Math.min(1, secs() - phaseAt) * 20, 11, "#d36b9c");
            if (bonus) Ink.word(ctx, `+${bonus} pour la vivacité`, AW / 2, 624, 15, PAPER, 600, "#1b1b1b");
          }
        }
      }

      let raf = 0, running = true;
      function frame(now) {
        if (!running) return;
        update();
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
      if (location.hostname === "localhost") window.__bal = { best: () => choices.findIndex((c) => c[1] === 2), phase: () => phase, kind: () => DATES[di].kind };
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
