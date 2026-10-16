// Jour 18 · Yu-Gi-Oh : « C'est l'heure du duel ! »
// Cinq puzzles de duel : gagner en un seul tour avec les cartes données.
// Règles simplifiées : une invocation normale par tour (niveau 5-6 : 1 sacrifice, 7+ : 2), magies à volonté,
// chaque monstre attaque une fois ; ATK contre DEF ne blesse pas, sauf « perçant ».
(() => {
  const { INK, PAPER } = Ink;
  const AW = 1100, AH = 680, CW = 96, CH = 136;

  const CARDS = {
    gobelin: { name: "Gobelin d'encre", type: "monster", lv: 4, atk: 1600, def: 1000, color: "#5b8c5a", text: "Un gobelin qui sent l'encre fraîche." },
    herisson: { name: "Hérisson-plume", type: "monster", lv: 3, atk: 1000, def: 800, color: "#c9874a", text: "Il pique, mais pas fort." },
    golem: { name: "Golem de Cendre", type: "monster", lv: 4, atk: 800, def: 2500, color: "#8a8478", text: "Lent, lourd, inébranlable." },
    chauvesouris: { name: "Chauve-souris du Seuil", type: "monster", lv: 3, atk: 1200, def: 600, color: "#5a3a6a", text: "Elle n'aime pas la lumière." },
    chevalier: { name: "Chevalier d'Ocre", type: "monster", lv: 4, atk: 1900, def: 1200, color: "#c9874a", text: "Il a oublié pourquoi il se bat, mais il se bat bien." },
    bulot: { name: "Petit Bulot", type: "monster", lv: 1, atk: 500, def: 300, color: "#e0662f", text: "Toc toc toc." },
    lanterne: { name: "Lanterne vivante", type: "monster", lv: 3, atk: 1000, def: 1000, color: "#e9b04a", text: "Elle éclaire les monstres sous les lits." },
    dragoncendre: { name: "Dragon de cendre", type: "monster", lv: 7, atk: 2800, def: 2000, color: "#3b3440", text: "Il dort dans les braises de Cendre-Gravée." },
    vermillax: { name: "Vermillax, le dragon", type: "monster", lv: 7, atk: 3000, def: 2500, color: "#b3261e", text: "L'aîné des cinq frères de Mythras." },
    sentinelle: { name: "Sentinelle du pilier", type: "monster", lv: 4, atk: 600, def: 2000, color: "#6b6170", text: "Elle garde la frontière du Seuil." },
    chatnoir: { name: "Chat noir", type: "monster", lv: 4, atk: 1500, def: 900, color: "#2b2731", text: "Il porte malheur aux autres." },
    ecaillerouge: { name: "Écaille rouge", type: "monster", lv: 4, atk: 1200, def: 1000, color: "#b3261e", text: "Matériel de fusion." },
    ecaillebleue: { name: "Écaille bleue", type: "monster", lv: 4, atk: 1300, def: 900, color: "#3e7cb1", text: "Matériel de fusion." },
    bicolore: { name: "Dragon bicolore", type: "fusion", lv: 8, atk: 2800, def: 2400, color: "#7d5ba6", twice: true, pierce: true, text: "« Écaille rouge » + « Écaille bleue ». Attaque deux fois par tour. Dégâts perçants." },
    ronces: { name: "Mur de ronces", type: "monster", lv: 4, atk: 0, def: 3000, color: "#3f6b3a", text: "Rien ne passe." },
    corne: { name: "Corne de Vermillax", type: "spell", target: "mine", text: "Un de tes monstres gagne 700 ATK." },
    double: { name: "Double encre", type: "spell", target: "mine", text: "Double l'ATK d'un de tes monstres." },
    vent: { name: "Coup de vent", type: "spell", target: "theirs", text: "Renvoie un monstre adverse dans la main de son propriétaire." },
    trou: { name: "Trou noir d'encre", type: "spell", text: "Détruit tous les monstres sur le terrain." },
    renaissance: { name: "Renaissance d'Enxor", type: "spell", target: "grave", text: "Invoque un monstre depuis n'importe quel cimetière, en attaque." },
    pot: { name: "Pot de gourmandise", type: "spell", text: "Pioche 2 cartes." },
    fusion: { name: "Fusion de Mythras", type: "spell", text: "Fusionne « Écaille rouge » et « Écaille bleue » (main ou terrain) en « Dragon bicolore »." },
  };

  const PUZZLES = [
    { title: "Premier duel", lp: 1800, opp: [], mine: [], hand: ["gobelin", "herisson", "corne"], deck: [], hint: "Une seule invocation normale par tour. Choisis bien." },
    { title: "Le mur et l'oiseau", lp: 2000, opp: [["golem", "def"], ["chauvesouris", "atk"]], mine: ["chevalier"], hand: ["vent", "double"], deck: [], hint: "Les dégâts, c'est la différence d'ATK." },
    { title: "Le réveil du dragon", lp: 3000, opp: [["dragoncendre", "atk"]], mine: ["bulot", "lanterne"], hand: ["vermillax", "trou", "renaissance"], deck: [], hint: "L'ordre des cartes compte." },
    { title: "Deux écailles", lp: 3500, opp: [["sentinelle", "def"], ["chatnoir", "atk"]], mine: ["ecaillerouge"], hand: ["ecaillebleue", "fusion", "corne"], deck: [], hint: "Un monstre fusion peut cacher des talents." },
    { title: "La gourmandise", lp: 3200, opp: [["ronces", "def"]], mine: ["gobelin"], hand: ["pot", "herisson"], deck: ["vent", "corne"], hint: "Ta pioche est connue : regarde ce qu'il y a dessus." },
  ];

  Games.register(18, {
    title: "C'est l'heure du duel !",
    music: "dragon",
    story: "Dans une boutique humaine en ruine, les Enxors ont trouvé des boîtes entières de cartes à collectionner. Ils ont redessiné les monstres à leur image, et depuis, le Duelliste masqué défie tout le monde. Cinq duels, cinq situations désespérées : à chaque fois, il faut gagner en un seul tour.",
    controls: "Clique une carte de ta main pour la jouer (puis sa cible si besoin). Pour attaquer : clique ton monstre, puis un monstre adverse, ou le Duelliste s'il n'a plus de monstres. Clic droit : annuler. Survole une carte pour lire son effet.",

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

      let pi = 0, S, tries = 0, mode = null, hover = null, msg = "", msgAt = 0, solvedAt = 0, results = [], uid = 0;
      const pops = [];
      const mk = (id, pos = "atk") => ({ uid: uid++, id, c: CARDS[id], atk: CARDS[id].atk, pos, attacks: 0 });
      function load(i, keepTries) {
        pi = i;
        const P = PUZZLES[i];
        S = {
          lp: P.lp, myLp: 4000, normal: false,
          opp: P.opp.map(([id, pos]) => mk(id, pos)), mine: P.mine.map((id) => mk(id)),
          hand: P.hand.map((id) => mk(id)), deck: [...P.deck], graveMine: [], graveOpp: [],
        };
        if (!keepTries) tries = 0;
        tries++;
        mode = null; solvedAt = 0;
        say(P.hint);
      }
      const say = (t) => { msg = t; msgAt = secs(); };
      const maxAtk = (m) => (m.c.twice ? 2 : 1);

      // ---------- règles ----------
      function playHand(card) {
        const c = card.c;
        if (c.type === "monster") {
          if (S.normal) return say("Tu as déjà fait ton invocation normale ce tour-ci.");
          const need = c.lv >= 7 ? 2 : c.lv >= 5 ? 1 : 0;
          if (need > S.mine.length) return say(`Il faut ${need} sacrifice${need > 1 ? "s" : ""} pour invoquer ce monstre.`);
          if (!need) { if (S.mine.length >= 3) return say("Ton terrain est plein."); summon(card); S.normal = true; return; }
          mode = { kind: "tribute", card, need, picked: [] };
          return say(`Choisis ${need} monstre${need > 1 ? "s" : ""} à sacrifier.`);
        }
        if (c.type === "spell") {
          if (CARDS[card.id].target === "mine") { if (!S.mine.length) return say("Il te faut un monstre sur le terrain."); mode = { kind: "target-mine", card }; return say("Choisis un de tes monstres."); }
          if (CARDS[card.id].target === "theirs") { if (!S.opp.length) return say("Il n'y a aucun monstre adverse."); mode = { kind: "target-opp", card }; return say("Choisis un monstre adverse."); }
          if (CARDS[card.id].target === "grave") { if (!S.graveMine.length && !S.graveOpp.length) return say("Les cimetières sont vides."); if (S.mine.length >= 3) return say("Ton terrain est plein."); mode = { kind: "grave", card }; return say("Choisis un monstre dans un cimetière."); }
          if (card.id === "trou") {
            if (!S.mine.length && !S.opp.length) return say("Il n'y a rien à détruire.");
            S.graveMine.push(...S.mine.map(reset)); S.graveOpp.push(...S.opp.map(reset)); S.mine = []; S.opp = [];
            Sound.play("drop"); fx("Trou noir !", AW / 2, 300, "#b48be0");
          } else if (card.id === "pot") {
            if (S.deck.length < 2) return say("Ta pioche est vide.");
            S.hand.push(...S.deck.splice(0, 2).map((id) => mk(id)));
            Sound.play("tick");
          } else if (card.id === "fusion") {
            const where = (id) => S.mine.find((m) => m.id === id) || S.hand.find((m) => m.id === id);
            const a = where("ecaillerouge"), b = where("ecaillebleue");
            if (!a || !b) return say("Il manque des matériels de fusion.");
            for (const m of [a, b]) { S.mine = S.mine.filter((x) => x !== m); S.hand = S.hand.filter((x) => x !== m); S.graveMine.push(reset(m)); }
            if (S.mine.length >= 3) return say("Ton terrain est plein.");
            S.mine.push(mk("bicolore"));
            Sound.play("reveal"); fx("Fusion !", AW / 2, 410, "#b48be0");
          }
          discard(card);
        }
      }
      function reset(m) { m.atk = m.c.atk; m.pos = "atk"; m.attacks = 0; return m; }
      function discard(card) { S.hand = S.hand.filter((x) => x !== card); S.graveMine.push(card); mode = null; }
      function summon(card) {
        S.hand = S.hand.filter((x) => x !== card);
        card.pos = "atk"; card.attacks = 0;
        S.mine.push(card);
        Sound.play("door");
        fx("Invocation !", AW / 2, 410, "#e9b04a");
        mode = null;
      }
      function clickMine(m) {
        if (mode?.kind === "tribute") {
          if (!mode.picked.includes(m)) mode.picked.push(m);
          if (mode.picked.length >= mode.need) {
            for (const t of mode.picked) { S.mine = S.mine.filter((x) => x !== t); S.graveMine.push(reset(t)); }
            S.normal = true;
            summon(mode.card);
          }
          return;
        }
        if (mode?.kind === "target-mine") {
          const card = mode.card;
          if (card.id === "corne") { m.atk += 700; fx("+700", ...posOf(m, "mine"), "#e9b04a"); }
          if (card.id === "double") { m.atk *= 2; fx("× 2", ...posOf(m, "mine"), "#e9b04a"); }
          Sound.play("bell", 0.4);
          return discard(card);
        }
        if (m.pos !== "atk" || m.attacks >= maxAtk(m)) return say("Ce monstre ne peut plus attaquer.");
        mode = { kind: "attack", m };
        say("Choisis la cible de l'attaque (ou le Duelliste s'il n'a plus de monstres).");
      }
      function clickOpp(o) {
        if (mode?.kind === "target-opp") {
          S.opp = S.opp.filter((x) => x !== o);
          fx("Envolé !", ...posOf(o, "opp"), "#8fc7e8");
          Sound.play("flap");
          return discard(mode.card);
        }
        if (mode?.kind !== "attack") return;
        const a = mode.m;
        a.attacks++;
        mode = null;
        Sound.play("kick");
        const [ex, ey] = posOf(o, "opp");
        if (o.pos === "atk") {
          if (a.atk > o.atk) { S.opp = S.opp.filter((x) => x !== o); S.graveOpp.push(reset(o)); hurt(a.atk - o.atk); }
          else if (a.atk < o.atk) { S.mine = S.mine.filter((x) => x !== a); S.graveMine.push(reset(a)); S.myLp -= o.atk - a.atk; fx(`-${o.atk - a.atk} pour toi`, AW / 2, 560, "#f2c1cf"); }
          else { S.opp = S.opp.filter((x) => x !== o); S.mine = S.mine.filter((x) => x !== a); S.graveOpp.push(reset(o)); S.graveMine.push(reset(a)); fx("Égalité", ex, ey, PAPER); }
        } else {
          const def = o.c.def;
          if (a.atk > def) { S.opp = S.opp.filter((x) => x !== o); S.graveOpp.push(reset(o)); if (a.c.pierce) hurt(a.atk - def); else fx("Détruit", ex, ey, PAPER); }
          else if (a.atk < def) { S.myLp -= def - a.atk; fx(`Trop dur ! -${def - a.atk} pour toi`, ex, ey, "#f2c1cf"); }
          else fx("Rien ne se passe", ex, ey, PAPER);
        }
        check();
      }
      function direct() {
        if (mode?.kind !== "attack") return;
        if (S.opp.length) return say("Il reste des monstres devant le Duelliste !");
        const a = mode.m;
        a.attacks++; mode = null;
        Sound.play("kick");
        hurt(a.atk);
        check();
      }
      function hurt(n) { S.lp -= n; fx(`-${n}`, 900, 110, "#ff6a5a"); Sound.play("junk", 0.6); }
      function pickGrave(m, side) {
        if (mode?.kind !== "grave") return;
        (side === "mine" ? S.graveMine : S.graveOpp).splice((side === "mine" ? S.graveMine : S.graveOpp).indexOf(m), 1);
        const card = mode.card;
        S.mine.push(reset(m));
        Sound.play("reveal"); fx("Renaissance !", AW / 2, 410, "#e9b04a");
        discard(card);
      }
      function check() {
        if (S.lp <= 0 && !solvedAt) {
          S.lp = 0; solvedAt = secs();
          results.push({ tries, score: Math.max(100, 300 - (tries - 1) * 60) });
          Sound.play("win");
        }
      }
      function fx(text, x, y, color) { pops.push({ text, x, y, color, t: secs() }); }

      // ---------- mise en page ----------
      const ZX = [330, 460, 590];
      const posOf = (m, side) => {
        const list = side === "mine" ? S.mine : S.opp, i = list.indexOf(m);
        return [ZX[Math.max(0, i)] + CW / 2, side === "mine" ? 410 : 210];
      };
      const BTN_RESET = { x: 870, y: 590, w: 100, h: 40 }, BTN_SKIP = { x: 980, y: 590, w: 100, h: 40 };
      function layout() {
        const items = [];
        S.opp.forEach((m, i) => items.push({ m, side: "opp", x: ZX[i], y: 140 }));
        S.mine.forEach((m, i) => items.push({ m, side: "mine", x: ZX[i], y: 340 }));
        const n = S.hand.length, hx = 470 - (n * (CW + 10)) / 2;
        S.hand.forEach((m, i) => items.push({ m, side: "hand", x: hx + i * (CW + 10), y: 520 }));
        if (mode?.kind === "grave") {
          const all = [...S.graveMine.map((m) => ["mine", m]), ...S.graveOpp.map((m) => ["opp", m])].filter(([, m]) => m.c.type !== "spell");
          all.forEach(([side, m], i) => items.push({ m, side: "grave-" + side, x: 150 + i * (CW + 8), y: 300, overlay: true }));
        }
        return items;
      }
      const toArena = (e) => {
        const b = canvas.getBoundingClientRect();
        return { x: (e.clientX - b.left - ox) / s, y: (e.clientY - b.top - oy) / s };
      };
      const inR = (m, r) => m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h;
      function hit(m) {
        const items = layout();
        const over = items.filter((it) => it.overlay);
        for (const it of (over.length ? over : items).reverse()) if (inR(m, { x: it.x, y: it.y, w: CW, h: CH })) return it;
        return null;
      }
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("pointermove", (e) => { hover = hit(toArena(e)); });
      canvas.addEventListener("pointerdown", (e) => {
        const m = toArena(e);
        if (e.button === 2) { mode = null; return say("Annulé."); }
        if (solvedAt) { if (secs() - solvedAt > 1) next(); return; }
        if (inR(m, BTN_RESET)) { Sound.play("tick"); return load(pi, true); }
        if (inR(m, BTN_SKIP)) { results.push({ tries: 0, score: 0 }); return next(); }
        const it = hit(m);
        if (!it) {
          if (m.x > 780 && m.x < 1080 && m.y < 130) return direct();
          if (mode?.kind === "attack" && !S.opp.length && m.y < 300) return direct();
          return;
        }
        if (it.side === "hand") { if (mode?.kind === "tribute" || mode?.kind?.startsWith("target")) mode = null; return playHand(it.m); }
        if (it.side === "mine") return clickMine(it.m);
        if (it.side === "opp") return clickOpp(it.m);
        if (it.side.startsWith("grave-")) return pickGrave(it.m, it.side.slice(6));
      });
      const onKey = (e) => { if (e.key === "Escape") mode = null; if ((e.key === " " || e.key === "Enter") && solvedAt) next(); };
      window.addEventListener("keydown", onKey);

      function next() {
        if (pi + 1 < PUZZLES.length) load(pi + 1);
        else finish();
      }
      function finish() {
        stop();
        const score = results.reduce((a, r) => a + r.score, 0), solved = results.filter((r) => r.tries).length;
        api.finish({
          score,
          stars: score >= 1300 ? 3 : score >= 900 ? 2 : 1,
          lines: [`${solved} duels gagnés sur ${PUZZLES.length}`, results.map((r, i) => `${i + 1} : ${r.tries ? (r.tries === 1 ? "du premier coup" : `${r.tries} essais`) : "passé"}`).join(" · ")],
        });
      }

      // ---------- dessin ----------
      function drawCard(m, x, y, t, o = {}) {
        const c = m.c, def = m.pos === "def";
        ctx.save();
        ctx.translate(x + CW / 2, y + CH / 2);
        if (def) ctx.rotate(Math.PI / 2);
        if (o.lift) ctx.translate(0, -8);
        const frame = c.type === "spell" ? "#2f8a7a" : c.type === "fusion" ? "#7d5ba6" : "#b9853f";
        ctx.fillStyle = frame; ctx.strokeStyle = o.sel ? "#ffd84a" : INK; ctx.lineWidth = o.sel ? 5 : 2.5;
        ctx.beginPath(); ctx.roundRect(-CW / 2, -CH / 2, CW, CH, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = PAPER; ctx.fillRect(-CW / 2 + 6, -CH / 2 + 6, CW - 12, 16);
        ctx.font = `800 ${c.name.length > 15 ? 8.5 : 10}px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(c.name, -CW / 2 + 9, -CH / 2 + 14);
        // illustration
        ctx.fillStyle = "#1c1a22"; ctx.fillRect(-CW / 2 + 8, -CH / 2 + 26, CW - 16, 60);
        ctx.save(); ctx.beginPath(); ctx.rect(-CW / 2 + 8, -CH / 2 + 26, CW - 16, 60); ctx.clip();
        if (c.type === "spell") {
          Ink.halo(ctx, "rgba(124,209,192,.6)", 0, -CH / 2 + 56, 34);
          ctx.fillStyle = "#c8fff0"; ctx.beginPath();
          for (let k = 0; k < 10; k++) { const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? 6 : 16; ctx.lineTo(Math.cos(a) * rr, -CH / 2 + 56 + Math.sin(a) * rr); }
          ctx.fill();
        } else {
          ctx.save(); ctx.translate(0, -CH / 2 + 82); ctx.scale(1.3, 1.3);
          Ink.enxor(ctx, 0, 0, t, { seed: c.name.length, color: c.color, face: 1, fangs: c.lv >= 7, wear: c.lv >= 7 ? { back: "ailes" } : {} });
          ctx.restore();
        }
        ctx.restore();
        // niveau
        if (c.lv) { ctx.fillStyle = "#e9b04a"; for (let k = 0; k < Math.min(8, c.lv); k++) { ctx.beginPath(); ctx.arc(CW / 2 - 12 - k * 9, -CH / 2 + 94, 3.2, 0, Math.PI * 2); ctx.fill(); } }
        ctx.fillStyle = PAPER; ctx.fillRect(-CW / 2 + 6, CH / 2 - 34, CW - 12, 28);
        ctx.fillStyle = INK;
        if (c.type === "spell") { ctx.font = `700 9px "Barlow Semi Condensed", sans-serif`; ctx.fillText("CARTE MAGIE", -CW / 2 + 10, CH / 2 - 20); }
        else {
          ctx.font = `800 11px "Barlow Semi Condensed", sans-serif`;
          ctx.fillStyle = m.atk > c.atk ? "#b3261e" : INK;
          ctx.fillText(`ATK ${m.atk}`, -CW / 2 + 9, CH / 2 - 25);
          ctx.fillStyle = INK; ctx.fillText(`DEF ${c.def}`, -CW / 2 + 9, CH / 2 - 13);
          if (m.attacks >= maxAtk(m) && o.side === "mine") { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(-CW / 2, -CH / 2, CW, CH); }
        }
        ctx.restore();
      }

      function render(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, vw, vh);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
        // le tapis de jeu
        ctx.fillStyle = "#142430"; ctx.fillRect(0, 0, AW, AH);
        Ink.halo(ctx, "rgba(62,124,177,.25)", 460, 320, 420);
        ctx.strokeStyle = "rgba(124,209,192,.25)"; ctx.lineWidth = 2;
        for (const y of [140, 340]) for (const x of ZX) { ctx.beginPath(); ctx.roundRect(x - 4, y - 4, CW + 8, CH + 8, 8); ctx.stroke(); }
        ctx.strokeStyle = "rgba(124,209,192,.15)"; ctx.beginPath(); ctx.moveTo(240, 310); ctx.lineTo(780, 310); ctx.stroke();

        // le Duelliste masqué
        ctx.save(); ctx.translate(990, 128); ctx.scale(2, 2);
        Ink.enxor(ctx, 0, 0, t, { seed: 18, color: "#7d5ba6", face: -1, wear: { face: "masquecuir", back: "cape", head: "meche" }, emote: solvedAt ? "surprise" : null, et: (secs() - solvedAt) % 2 });
        ctx.restore();
        const canDirect = mode?.kind === "attack" && !S.opp.length;
        if (canDirect) { ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(990, 80, 56, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        Ink.word(ctx, "Le Duelliste masqué", 900, 24, 15, "#cdd6ff", 700, "#1b1b1b");
        Ink.word(ctx, `LP ${Math.max(0, S.lp)}`, 860, 60, 30, S.lp <= 0 ? "#ffd84a" : "#ff6a5a", 800, "#1b1b1b");
        Ink.word(ctx, `Toi : LP ${S.myLp}`, 120, 600, 18, "#8fd18a", 800, "#1b1b1b");
        Ink.word(ctx, `Duel ${pi + 1} / ${PUZZLES.length} — ${PUZZLES[pi].title}`, 130, 24, 17, "#e9b04a", 800, "#1b1b1b");
        Ink.word(ctx, `Gagne en un seul tour !`, 120, 50, 14, PAPER, 600, "#1b1b1b");
        Ink.word(ctx, `Invocation normale : ${S.normal ? "utilisée" : "disponible"}`, 120, 76, 13, S.normal ? "#8a8478" : "#8fd18a", 700, "#1b1b1b");
        Ink.word(ctx, `Pioche : ${S.deck.length}${S.deck.length ? " (dessus : " + CARDS[S.deck[0]].name + ")" : ""}`, 120, 640, 13, "#cdd6ff", 600, "#1b1b1b");
        Ink.word(ctx, `Cimetières : ${S.graveMine.length} / ${S.graveOpp.length}`, 120, 660, 13, "#cdd6ff", 600, "#1b1b1b");

        const items = layout();
        for (const it of items) {
          if (it.overlay) continue;
          const sel = (mode?.kind === "attack" && mode.m === it.m) || (mode?.kind === "tribute" && mode.picked.includes(it.m)) || (mode?.card === it.m);
          drawCard(it.m, it.x, it.y, t, { sel, side: it.side, lift: hover?.m === it.m && it.side === "hand" });
        }
        // ligne d'attaque
        if (mode?.kind === "attack") {
          const [ax, ay] = posOf(mode.m, "mine");
          ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.moveTo(ax, ay - 60); ctx.lineTo(hover && hover.side === "opp" ? posOf(hover.m, "opp")[0] : ax, hover && hover.side === "opp" ? 280 : 300); ctx.stroke(); ctx.setLineDash([]);
        }
        // choix dans les cimetières
        if (mode?.kind === "grave") {
          ctx.fillStyle = "rgba(10,14,20,.85)"; ctx.fillRect(120, 260, 760, 220);
          Ink.word(ctx, "Cimetières : choisis le monstre à ramener", 500, 282, 17, "#e9b04a", 800, "#1b1b1b");
          for (const it of items) if (it.overlay) { drawCard(it.m, it.x, it.y + 20, t, {}); Ink.word(ctx, it.side === "grave-mine" ? "à toi" : "adverse", it.x + CW / 2, it.y + CH + 32, 12, PAPER, 700, "#1b1b1b"); }
        }

        // détail de la carte survolée
        const hc = hover?.m;
        ctx.fillStyle = "rgba(10,14,20,.7)"; ctx.beginPath(); ctx.roundRect(860, 200, 225, 370, 12); ctx.fill();
        if (hc) {
          Ink.word(ctx, hc.c.name, 972, 226, 16, "#e9b04a", 800, "#1b1b1b");
          ctx.font = `600 14px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = PAPER; ctx.textAlign = "left"; ctx.textBaseline = "top";
          const words = hc.c.text.split(" "); let line = "", y = 250;
          for (const w of words) { if (ctx.measureText(line + w).width > 200) { ctx.fillText(line, 872, y); y += 18; line = ""; } line += w + " "; }
          ctx.fillText(line, 872, y);
          if (hc.c.type !== "spell") { ctx.fillText(`Niveau ${hc.c.lv} · ATK ${hc.atk} · DEF ${hc.c.def}`, 872, y + 28); ctx.fillText(hc.pos === "def" ? "En position de défense" : "En position d'attaque", 872, y + 46); }
        } else Ink.word(ctx, "Survole une carte", 972, 226, 14, "#8a8478", 600, "#1b1b1b");
        // message
        ctx.font = `700 15px "Barlow Semi Condensed", sans-serif`; ctx.fillStyle = "#ffd84a"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        const mw = msg.split(" "); let ml = "", my = 440;
        for (const w of mw) { if (ctx.measureText(ml + w).width > 200) { ctx.fillText(ml, 872, my); my += 19; ml = ""; } ml += w + " "; }
        ctx.fillText(ml, 872, my);
        // boutons
        for (const [b, label] of [[BTN_RESET, "Recommencer"], [BTN_SKIP, "Passer"]]) {
          ctx.fillStyle = "#3b3440"; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
          Ink.word(ctx, label, b.x + b.w / 2, b.y + b.h / 2, 14, PAPER, 700, "#3b3440");
        }
        Ink.word(ctx, `Essai n° ${tries}`, 975, 650, 13, "#8a8478", 600, "#1b1b1b");

        for (const p of pops) {
          const age = secs() - p.t;
          if (age > 1.3) continue;
          ctx.globalAlpha = Math.min(1, 1.3 - age);
          Ink.word(ctx, p.text, p.x, p.y - age * 30, 22, p.color, 800, "#1b1b1b");
          ctx.globalAlpha = 1;
        }
        if (solvedAt) {
          ctx.fillStyle = "rgba(10,14,20,.6)"; ctx.fillRect(0, 250, AW, 120);
          Ink.word(ctx, "Victoire ! LP 0", AW / 2, 295, 40, "#ffd84a", 800, "#1b1b1b");
          if (secs() - solvedAt > 1) Ink.word(ctx, "Clique pour le duel suivant", AW / 2, 340, 16, PAPER, 600, "#1b1b1b");
        }
      }

      let raf = 0, running = true;
      function frame(now) {
        if (!running) return;
        render(now / 1000);
        if (running) raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("keydown", onKey);
      }
      load(0);
      if (location.hostname === "localhost") {
        // tests : joue une solution décrite par des actions [type, id]
        window.__duel = {
          state: () => ({ pi, lp: S.lp, solved: !!solvedAt, mine: S.mine.map((m) => m.id + ":" + m.atk), hand: S.hand.map((m) => m.id) }),
          where(kind, id) {
            const items = layout(), b = canvas.getBoundingClientRect();
            const it = kind === "direct" ? { x: 940, y: 40 } : items.find((q) => q.side === kind && q.m.id === id);
            if (!it) return null;
            return { x: b.left + ox + (it.x + CW / 2) * s, y: b.top + oy + (it.y + (it.overlay ? 20 : 0) + CH / 2) * s };
          },
        };
      }
      raf = requestAnimationFrame(frame);
      return stop;
    },
  });
})();
