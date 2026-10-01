// Loup-garou d'encre, côté navigateur : estrade, pupitres, vote en se plaçant, rôle secret, nuit.
window.Werewolf = (() => {
  const V = Village;
  let api = null;
  let lgs = { phase: "lobby", lobby: [], players: [], votes: {}, log: [] };
  let you = null;
  let lastPhase = "lobby", sentVote = undefined, movedForAccused = false;

  const PHASES = {
    lobby: "En attente de joueurs",
    night: "La nuit",
    witch: "La nuit · la sorcière",
    dawn: "Le lever du jour",
    hunter: "Le dernier tir du chasseur",
    debate: "Le débat",
    vote: "Le vote",
    lastword: "Le dernier mot",
    end: "Fin de la partie",
  };
  const ROLE_NAMES = { loup: "Loup-garou", voyante: "Voyante", sorciere: "Sorcière", chasseur: "Chasseur", villageois: "Villageois" };

  const myId = () => api.S.me?.id;
  const inGame = () => lgs.phase !== "lobby";
  const part = (id) => lgs.players.find((p) => p.id === id);
  const iPlay = () => inGame() && !!part(myId());
  const iAlive = () => !!part(myId())?.alive;
  const spots = () => V.arenaSpots(lgs.players.length);
  const night = () => lgs.phase === "night" || lgs.phase === "witch";

  function init(a) {
    api = a;
    setInterval(renderHud, 500);
  }

  // ---------- Réception ----------

  function onState(s) {
    if (!s) return;
    const prev = lgs.phase;
    lgs = s;
    if (s.phase !== prev) phaseChanged(prev, s.phase);
    if (s.phase !== "vote") sentVote = undefined;
    if (s.phase !== "lastword") movedForAccused = false;
    if (s.phase === "lobby") you = null;
    lastPhase = s.phase;
    renderHud();
    if (api.S.panel?.type === "stage") api.renderPanel();
  }

  function onYou(y) {
    you = y;
    renderHud();
  }

  function onGather(ids) {
    const i = ids.indexOf(myId());
    if (i < 0) return;
    const s = V.arenaSpots(ids.length)[i];
    api.teleport(s.stand.x, s.stand.y);
    api.closePanel();
    api.toast("La partie de loup-garou commence ! Regarde ta carte de rôle à droite.");
  }

  function phaseChanged(prev, phase) {
    const v = api.hearing(V.ARENA.x, V.ARENA.y) || (iPlay() ? 1 : 0);
    if (phase === "night") Sound.play("howl", v);
    if (phase === "dawn") Sound.play("bell", v);
    if (phase === "vote") Sound.play("gavel", v * 0.6);
    if (phase === "lastword") Sound.play("gavel", v);
    if (phase === "end") Sound.play("reveal", v);
  }

  // ---------- Chaque image ----------

  function update() {
    if (!iPlay() || api.inCabin()) return;
    const m = api.me();
    // vote : on se place dans le cercle devant le pupitre de son suspect
    if (lgs.phase === "vote" && iAlive()) {
      const sp = spots();
      let target = null;
      lgs.players.forEach((p, i) => {
        const c = sp[i].vote;
        if (p.alive && p.id !== myId() && Math.hypot((m.x - c.x) / 30, (m.y - c.y) / 18) < 1) target = p.id;
      });
      if (target !== sentVote) {
        sentVote = target;
        api.socket.emit("lg:vote", target);
        if (target) Sound.play("tick");
      }
    }
    // l'accusé monte sur l'estrade
    if (lgs.phase === "lastword" && lgs.accused === myId() && !movedForAccused) {
      movedForAccused = true;
      api.teleport(V.ARENA.x, V.STAGE.y + 60);
    }
  }

  // éléments à dessiner dans le village (triés par profondeur avec le reste)
  function items(ctx, t, vis) {
    const out = [];
    if (vis(V.ARENA.x, V.ARENA.y)) {
      out.push({ y: V.STAGE.y, draw: () => V.drawStage(ctx, t, api.S.sky.dark > 0.25) });
      if (inGame() && lgs.players.length) out.push({ y: V.ARENA.y + 1, draw: () => V.drawPodiums(ctx, t, lgs, spots(), api.S.players) });
    }
    return out;
  }

  // apparence des Enxors pendant une partie
  function entLook(id) {
    if (!inGame()) return null;
    const p = part(id);
    if (!p) return null;
    const look = {};
    if (!p.alive) look.alpha = 0.4;
    if (you?.wolves?.includes(id) && you.role === "loup") look.eyes = "#b3261e";
    return look;
  }

  // la nuit tombe pour les joueurs encore en vie
  function overlay(ctx, vw, vh, dpr, t) {
    if (!iPlay() || !iAlive() || !night() || api.inCabin()) return;
    const wolf = you?.role === "loup";
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = wolf ? "rgba(40,0,8,.55)" : "rgba(4,4,18,.86)";
    ctx.fillRect(0, 0, vw, vh);
    const text = wolf ? "Les loups chassent…" : lgs.phase === "witch" ? "La sorcière prépare ses potions…" : "Le village dort…";
    Ink.word(ctx, text, vw / 2, vh * 0.32 + Math.sin(t) * 3, 34, wolf ? "#b3261e" : "#efe5d0", 700);
    ctx.restore();
  }

  // ---------- Panneau de l'estrade ----------

  function renderPanel(body) {
    const { el } = api;
    const me = myId();
    const inLobby = lgs.lobby.some((p) => p.id === me);
    const host = lgs.lobby[0]?.id === me;
    body.append(
      el("p", { class: "eyebrow", text: "L'estrade" }),
      el("h2", { class: "script", text: "Loup-garou d'encre" }),
      el("p", { class: "lore", text: "Certains Enxors ont trop traîné près de la Source à la pleine lune… La nuit, des loups d'encre emportent un villageois. Le jour, le conseil se réunit sur l'estrade pour démasquer les coupables." }),
      el("ul", { class: "roles" },
        el("li", {}, el("b", { text: "Loups-garous" }), " · chaque nuit, ils choisissent une victime ensemble."),
        el("li", {}, el("b", { text: "Voyante" }), " · découvre un rôle chaque nuit."),
        el("li", {}, el("b", { text: "Sorcière" }), " · une potion pour sauver, une pour emporter (à partir de 6 joueurs)."),
        el("li", {}, el("b", { text: "Chasseur" }), " · emporte quelqu'un en mourant (à partir de 7 joueurs)."),
        el("li", {}, el("b", { text: "Villageois" }), " · trouvez les loups et votez !")),
      el("p", { class: "muted", text: "Pour voter, on se place physiquement dans le cercle devant le pupitre de son suspect. Le plus accusé monte sur l'estrade pour un dernier mot." }),
    );
    if (inGame()) {
      body.append(el("p", { class: "lg-status", text: `Partie en cours · ${PHASES[lgs.phase]} · ${lgs.players.filter((p) => p.alive).length} Enxors en vie. Tu peux regarder depuis la place.` }));
      return;
    }
    body.append(
      el("h3", { text: `Joueurs inscrits (${lgs.lobby.length}/12)` }),
      lgs.lobby.length
        ? el("ul", { class: "lobby" }, lgs.lobby.map((p, i) => el("li", {}, el("span", { text: p.pseudo }), i === 0 ? el("em", { text: "lance la partie" }) : null)))
        : el("p", { class: "muted", text: "Personne pour l'instant. Il faut au moins 4 joueurs." }),
      el("div", { class: "actions" },
        inLobby
          ? el("button", { class: "btn ghost", text: "Quitter", onclick: () => api.socket.emit("lg:leave") })
          : el("button", { class: "btn", text: "Rejoindre la partie", onclick: () => api.socket.emit("lg:join") }),
        host && el("button", { class: "btn", text: lgs.lobby.length >= 4 ? "Lancer la partie !" : "Il faut 4 joueurs", disabled: lgs.lobby.length < 4 ? "" : null, onclick: () => api.socket.emit("lg:start") })),
    );
  }

  // ---------- Carte de rôle et actions (à gauche de l'écran) ----------

  let hudKey = "";
  function renderHud() {
    if (!api) return;
    const box = document.getElementById("lg");
    const banner = document.getElementById("lg-banner");
    const { el } = api;
    const left = Math.max(0, Math.ceil((lgs.endsAt - Date.now()) / 1000));
    if (banner) {
      banner.hidden = !inGame() || iPlay();
      if (inGame()) banner.textContent = `🐺 Loup-garou en cours sur l'estrade · ${PHASES[lgs.phase]} · ${left}s`;
    }
    if (!box) return;
    if (!iPlay() || !you) {
      box.hidden = true;
      hudKey = "";
      return;
    }
    box.hidden = false;
    // on ne reconstruit la carte que si quelque chose a changé (sinon seul le minuteur bouge)
    const key = JSON.stringify([lgs, you]);
    if (key === hudKey) {
      const timer = box.querySelector(".lg-phase b");
      if (timer) timer.textContent = `${left}s`;
      return;
    }
    hudKey = key;
    const kids = [
      el("div", { class: "lg-phase" }, el("span", { text: `${PHASES[lgs.phase]}${lgs.round ? ` · tour ${lgs.round}` : ""}` }), el("b", { text: `${left}s` })),
      el("div", { class: "lg-role " + you.role }, el("small", { text: you.alive ? "Ton rôle secret" : "Tu es mort·e · tu étais" }), el("strong", { text: you.roleName }), el("p", { text: you.desc })),
    ];
    const alivePlayers = lgs.players.filter((p) => p.alive);
    const pick = (list, onPick, selected, extra) => el("div", { class: "lg-pick" }, list.map((p) =>
      el("button", { class: "lg-btn" + (selected === p.id ? " on" : ""), text: p.pseudo + (extra ? extra(p) : ""), onclick: () => { onPick(p.id); Sound.play("click"); } })));

    if (you.alive) {
      if (lgs.phase === "night" && you.role === "loup") {
        const others = alivePlayers.filter((p) => !you.wolves.includes(p.id));
        const tags = (p) => {
          const n = Object.values(you.wolfVotes || {}).filter((v) => v === p.id).length;
          return n ? ` · ${"🐺".repeat(n)}` : "";
        };
        kids.push(el("p", { class: "lg-ask", text: "Choisissez votre victime (mettez-vous d'accord, le chat est réservé aux loups) :" }),
          pick(others, (id) => api.socket.emit("lg:wolf", id), you.wolfVotes?.[myId()], tags));
        const mates = lgs.players.filter((p) => you.wolves.includes(p.id) && p.id !== myId()).map((p) => p.pseudo);
        if (mates.length) kids.push(el("p", { class: "muted", text: `Ta meute : ${mates.join(", ")}` }));
      }
      if (lgs.phase === "night" && you.role === "voyante") {
        if (!you.seerUsed) kids.push(el("p", { class: "lg-ask", text: "Qui veux-tu sonder cette nuit ?" }), pick(alivePlayers.filter((p) => p.id !== myId()), (id) => api.socket.emit("lg:seer", id)));
        else kids.push(el("p", { class: "muted", text: "Ta boule de cristal se repose jusqu'à la prochaine nuit." }));
      }
      if (lgs.phase === "witch" && you.role === "sorciere" && !you.witch.done) {
        const victim = part(you.witch.victim);
        kids.push(el("p", { class: "lg-ask", text: victim ? `Les loups ont attaqué ${victim.pseudo}.` : "Les loups n'ont attaqué personne." }));
        if (victim && you.witch.heal) kids.push(el("button", { class: "btn tiny", text: `Sauver ${victim.pseudo}`, onclick: () => api.socket.emit("lg:witch", { heal: true }) }));
        if (you.witch.poison) kids.push(el("p", { class: "muted", text: "Ou empoisonner :" }), pick(alivePlayers.filter((p) => p.id !== myId()), (id) => api.socket.emit("lg:witch", { poison: id })));
        kids.push(el("button", { class: "btn tiny ghost", text: "Ne rien faire", onclick: () => api.socket.emit("lg:witch", {}) }));
      }
      if (lgs.phase === "debate") kids.push(el("p", { class: "lg-ask", text: "Discutez ! Appuie sur Entrée pour parler. Qui vous semble louche ?" }));
      if (lgs.phase === "vote") {
        const mine = lgs.votes[myId()];
        kids.push(el("p", { class: "lg-ask", text: mine ? `Tu accuses ${part(mine)?.pseudo}. Sors du cercle pour changer d'avis.` : "Va te placer dans le cercle devant le pupitre de ton suspect (ou clique sur un nom pour y aller)." }),
          pick(alivePlayers.filter((p) => p.id !== myId()), (id) => {
            const i = lgs.players.findIndex((p) => p.id === id);
            const c = spots()[i].vote;
            api.walkTo(c.x, c.y);
          }, mine));
      }
    }
    if (lgs.phase === "hunter" && you.canShoot) {
      kids.push(el("p", { class: "lg-ask", text: "Tu tombes… mais tu as le temps de tirer une dernière fois :" }), pick(alivePlayers, (id) => api.socket.emit("lg:shoot", id)));
    }
    if (lgs.phase === "lastword") {
      const acc = part(lgs.accused);
      kids.push(el("p", { class: "lg-ask", text: lgs.accused === myId() ? "Le village t'accuse ! Tu as quelques secondes pour te défendre (Entrée pour parler)." : `${acc?.pseudo} est sur l'estrade pour son dernier mot.` }));
    }
    if (you.role === "voyante" && you.seen && Object.keys(you.seen).length) {
      kids.push(el("p", { class: "muted", text: "Tes visions : " + Object.entries(you.seen).map(([id, r]) => `${part(id)?.pseudo} est ${ROLE_NAMES[r]}`).join(" · ") }));
    }
    if (lgs.phase === "end") {
      kids.push(el("p", { class: "lg-win", text: lgs.winner === "village" ? "Le village a gagné !" : "Les loups ont gagné !" }),
        el("ul", { class: "lg-reveal" }, lgs.players.map((p) => el("li", {}, el("span", { text: p.pseudo }), el("b", { text: ROLE_NAMES[p.role] || "?", class: p.role === "loup" ? "wolf" : "" })))));
    }
    kids.push(el("ul", { class: "lg-log" }, lgs.log.slice(-4).map((l) => el("li", { text: l.text }))));
    box.replaceChildren(...kids);
  }

  return { init, onState, onYou, onGather, update, items, entLook, overlay, renderPanel, get state() { return lgs; } };
})();
