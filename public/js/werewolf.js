// Loup-garou d'encre, côté navigateur.
// Nuit : chacun rentre chez soi, les rôles de nuit se déplacent dans le noir et agissent devant les cabanes.
// Jour : traces de pas d'encre, débat, vote en se plaçant devant un pupitre, dernier mot sur l'estrade.
window.Werewolf = (() => {
  const V = Village;
  const { INK } = Ink;
  let api = null;
  let lgs = { phase: "lobby", lobby: [], players: [], votes: {}, log: [], traces: [], roles: [], options: {} };
  let you = null;
  let sentVote, movedForAccused = false, cupidPick = [];

  const PHASES = {
    lobby: "En attente de joueurs", night: "La nuit", witch: "La nuit · la sorcière", dawn: "Le lever du jour",
    hunter: "Le dernier tir du chasseur", debate: "Le débat", vote: "Le vote", lastword: "Le dernier mot", end: "Fin de la partie",
  };
  const ROLE_NAMES = {
    loup: "Loup-garou", voyante: "Voyante", salvateur: "Salvateur", petitefille: "Petite fille", corbeau: "Corbeau",
    sorciere: "Sorcière", chasseur: "Chasseur", cupidon: "Cupidon", villageois: "Villageois",
  };
  const OPTIONAL = ["voyante", "salvateur", "sorciere", "petitefille", "chasseur", "corbeau", "cupidon"];
  const VISION = 230;

  const myId = () => api.S.me?.id;
  const inGame = () => lgs.phase !== "lobby";
  const part = (id) => lgs.players.find((p) => p.id === id);
  const iPlay = () => inGame() && !!part(myId());
  const iAlive = () => !!part(myId())?.alive;
  const spots = () => V.arenaSpots(lgs.players.length);
  const night = () => lgs.phase === "night" || lgs.phase === "witch";
  const asleep = () => iPlay() && iAlive() && night() && !(lgs.phase === "night" && you?.mover);

  // porte de la cabane d'un joueur (même calcul que le serveur)
  function doorOf(id) {
    const p = api.S.players.get(id);
    if (!p) return null;
    if (p.owner) return { x: V.HOUSE.x, y: V.HOUSE.y + 26 };
    if (p.plot == null) return null;
    const pl = V.plots[p.plot];
    return { x: pl.x, y: pl.y + 24 };
  }

  function init(a) {
    api = a;
    setInterval(renderHud, 500);
  }

  // ---------- Réception ----------

  function onState(s) {
    if (!s) return;
    const prev = lgs.phase;
    lgs = s;
    if (s.phase !== prev) phaseChanged(s.phase);
    if (s.phase !== "vote") sentVote = undefined;
    if (s.phase !== "lastword") movedForAccused = false;
    if (s.phase === "lobby") you = null;
    renderHud();
    if (api.S.panel?.type === "stage") api.renderPanel();
  }

  function onYou(y) {
    const had = you;
    you = y;
    if (y?.role === "petitefille" && had?.spotted && y.spotted.length > had.spotted.length) {
      api.toast(`Tu as reconnu un loup : ${part(y.spotted[y.spotted.length - 1])?.pseudo} !`);
    }
    if (y?.role === "loup" && y.pfSpy && !had?.pfSpy) api.toast(`La petite fille vous espionne : c'est ${part(y.pfSpy)?.pseudo} !`);
    renderHud();
  }

  // le jour : tout le monde retourne à son pupitre
  function onGather(ids) {
    const i = ids.indexOf(myId());
    if (i < 0) return;
    api.forceVillage();
    const s = V.arenaSpots(ids.length)[i];
    api.teleport(s.stand.x, s.stand.y);
    api.closePanel();
  }

  // la nuit : tout le monde rentre devant sa cabane
  function onHome(ids) {
    if (!ids.includes(myId())) return;
    api.forceVillage();
    const d = doorOf(myId());
    if (d) api.teleport(d.x, d.y + 22);
    api.closePanel();
    if (lgs.round === 1) api.toast("La partie commence ! Ton rôle secret est à droite de l'écran.");
  }

  function onHear() {
    Sound.play("step", 1);
    setTimeout(() => Sound.play("step", 1), 300);
    api.toast("Tu entends des pas tout près de ta cabane…");
  }

  function onLove() {
    api.toast("Cupidon t'a lié·e à quelqu'un : regarde ta carte de rôle.");
  }

  function phaseChanged(phase) {
    const v = iPlay() ? 1 : api.hearing(V.ARENA.x, V.ARENA.y);
    if (phase === "night") Sound.play("howl", v);
    if (phase === "dawn") Sound.play("bell", v);
    if (phase === "vote") Sound.play("gavel", v * 0.6);
    if (phase === "lastword") Sound.play("gavel", v);
    if (phase === "end") Sound.play("reveal", v);
  }

  // ---------- Chaque image ----------

  function frozen() {
    return asleep();
  }

  function update() {
    if (!iPlay() || api.inCabin()) return;
    const m = api.me();
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
    if (lgs.phase === "lastword" && lgs.accused === myId() && !movedForAccused) {
      movedForAccused = true;
      api.teleport(V.ARENA.x, V.STAGE.y + 60);
    }
  }

  // action de nuit possible devant une cabane
  const ACTIONS = {
    loup: { ev: "attack", verb: "Attaquer", ok: (p) => !you.wolves.includes(p.id), done: () => false },
    voyante: { ev: "seer", verb: "Regarder par la fenêtre de", ok: (p) => p.id !== myId(), done: () => you.done },
    salvateur: { ev: "protect", verb: "Protéger la cabane de", ok: (p) => p.id !== you.lastProtected, done: () => you.done },
    corbeau: { ev: "raven", verb: "Poser le corbeau chez", ok: (p) => p.id !== myId(), done: () => you.done },
  };

  function nearAction(m) {
    if (!iPlay() || !iAlive() || lgs.phase !== "night" || !you) return null;
    const a = ACTIONS[you.role];
    if (!a || a.done()) return null;
    let best = null, bd = 100;
    for (const p of lgs.players) {
      if (!p.alive || !a.ok(p)) continue;
      const d = doorOf(p.id);
      if (!d) continue;
      const dd = Math.hypot(d.x - m.x, d.y - m.y);
      if (dd < bd) { bd = dd; best = p; }
    }
    if (!best) return null;
    const chosen = you.role === "loup" && you.wolfVotes?.[myId()] === best.id;
    return { kind: "lg-door", id: best.id, x: m.x, y: m.y, r: 1, label: chosen ? `${best.pseudo} : ta cible` : `${a.verb} ${best.pseudo}` };
  }

  function doAction(it) {
    const a = ACTIONS[you?.role];
    if (!a) return;
    api.socket.emit("lg:" + a.ev, it.id);
    Sound.play(you.role === "loup" ? "splash" : "click");
    if (you.role === "voyante") setTimeout(() => {
      const r = you.seen?.[it.id];
      if (r) api.toast(`Par la fenêtre, tu vois que ${part(it.id)?.pseudo} est ${ROLE_NAMES[r]}.`);
    }, 400);
    if (you.role === "salvateur") api.toast(`Tu veilles sur la cabane de ${part(it.id)?.pseudo} cette nuit.`);
    if (you.role === "corbeau") api.toast(`Ton corbeau se pose chez ${part(it.id)?.pseudo}.`);
  }

  // ---------- Dessin ----------

  // qui est visible la nuit, et avec quel nom
  function view(e) {
    if (!iPlay() || !night() || api.inCabin()) return { show: true, name: true };
    if (e.id === myId()) return { show: true, name: true };
    if (!iAlive()) return { show: true, name: true };
    if (asleep()) return { show: false };
    const m = api.me();
    if (Math.hypot(e.x - m.x, e.y - m.y) > VISION) return { show: false };
    const wolfMate = you?.role === "loup" && you.wolves?.includes(e.id);
    const spotted = you?.role === "petitefille" && you.spotted?.includes(e.id);
    return { show: true, name: wolfMate || spotted };
  }

  function entLook(id) {
    if (!inGame()) return null;
    const p = part(id);
    if (!p) return null;
    const look = {};
    if (!p.alive) look.alpha = 0.4;
    if (you?.role === "loup" && you.wolves?.includes(id)) look.eyes = "#b3261e";
    if (you?.role === "petitefille" && you.spotted?.includes(id)) look.eyes = "#b3261e";
    return look;
  }

  function items(ctx, t, vis) {
    const out = [];
    if (vis(V.ARENA.x, V.ARENA.y)) {
      out.push({ y: V.STAGE.y, draw: () => V.drawStage(ctx, t, api.S.sky.dark > 0.25) });
      if (inGame() && lgs.players.length) out.push({ y: V.ARENA.y + 1, draw: () => V.drawPodiums(ctx, t, lgs, spots(), api.S.players) });
    }
    return out;
  }

  // traces de pas d'encre laissées pendant la nuit, visibles le jour
  function drawGround(ctx, t) {
    if (!lgs.traces?.length) return;
    ctx.save();
    ctx.fillStyle = "#4a0f1a";
    lgs.traces.forEach((tr, k) => {
      let side = 1;
      for (let i = 1; i < tr.length; i++) {
        const [ax, ay] = tr[i - 1], [bx, by] = tr[i];
        const len = Math.hypot(bx - ax, by - ay);
        const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
        for (let d = 0; d < len; d += 16) {
          const x = ax + ((bx - ax) * d) / len + nx * 5 * side, y = ay + ((by - ay) * d) / len + ny * 5 * side;
          side = -side;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.ellipse(x, y, 3.2, 2.2, Math.atan2(by - ay, bx - ax), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // tache de départ et d'arrivée
      for (const [x, y] of [tr[0], tr[tr.length - 1]]) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 5, k, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // marque du corbeau au-dessus d'une cabane
  function drawRaven(ctx, t) {
    if (!lgs.raven) return;
    const d = doorOf(lgs.raven);
    if (!d) return;
    V.drawCrow(ctx, { x: d.x + 30, y: d.y - 130, z: 0, state: "ground", face: -1, peck: true, ph: 0 }, t);
  }

  // la nuit pour les joueurs : noir complet si on dort, petit halo de vision si on rôde
  function overlay(ctx, vw, vh, dpr, t, screen) {
    if (!iPlay() || !iAlive() || !night() || api.inCabin()) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (asleep()) {
      ctx.fillStyle = "rgba(4,4,18,.93)";
      ctx.fillRect(0, 0, vw, vh);
      const text = lgs.phase === "witch" && you?.role === "sorciere" ? "Les potions frémissent…" : "Tu dors dans ta cabane…";
      Ink.word(ctx, text, vw / 2, vh * 0.3 + Math.sin(t) * 3, 34, "#efe5d0", 700);
      Ink.word(ctx, "Z z z", vw / 2 + 60, vh * 0.3 - 40 - ((t * 10) % 20), 18, "#efe5d0", 600);
    } else {
      const g = ctx.createRadialGradient(screen.x, screen.y, VISION * 0.45, screen.x, screen.y, VISION);
      const wolf = you?.role === "loup";
      g.addColorStop(0, "rgba(4,4,18,0)");
      g.addColorStop(1, wolf ? "rgba(30,0,6,.94)" : "rgba(4,4,18,.94)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
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
      el("p", { class: "lore", text: "Certains Enxors ont trop traîné près de la Source à la pleine lune… La nuit, chacun rentre chez soi et les loups rôdent dans le village. Au matin, des traces d'encre trahissent ceux qui sont sortis." }),
      el("ul", { class: "roles" },
        el("li", {}, "La nuit, ", el("b", { text: "les rôles de nuit sortent vraiment" }), " : ils marchent dans le noir et agissent devant la porte d'une cabane."),
        el("li", {}, "Ceux qui dorment ", el("b", { text: "entendent les pas" }), " qui passent près de chez eux."),
        el("li", {}, "Au matin, ", el("b", { text: "les traces de pas d'encre" }), " restent au sol : d'où partent-elles, où vont-elles ?"),
        el("li", {}, "Pour voter, on se place dans le cercle devant le pupitre de son suspect.")),
    );
    if (inGame()) {
      body.append(el("p", { class: "lg-status", text: `Partie en cours · ${PHASES[lgs.phase]} · ${lgs.players.filter((p) => p.alive).length} Enxors en vie. Tu peux regarder depuis la place.` }));
      return;
    }
    body.append(el("h3", { text: "Rôles en jeu" }), el("div", { class: "role-opts" },
      el("span", { class: "role-chip on fixed", text: "Loups-garous" }),
      OPTIONAL.map((r) => el("button", {
        class: "role-chip" + (lgs.options?.[r] ? " on" : ""),
        text: ROLE_NAMES[r],
        title: host ? "Cliquer pour activer ou retirer ce rôle" : "Seul celui qui lance la partie choisit les rôles",
        disabled: host ? null : "",
        onclick: () => api.socket.emit("lg:options", { [r]: !lgs.options[r] }),
      })),
      el("span", { class: "role-chip on fixed", text: "Villageois" })),
      el("p", { class: "muted", text: "Les rôles cochés sont distribués dans cet ordre tant qu'il y a assez de joueurs, le reste est villageois." }),
      el("h3", { text: `Joueurs inscrits (${lgs.lobby.length}/16)` }),
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

  // ---------- Carte de rôle et actions ----------

  let hudKey = "";
  function renderHud() {
    if (!api) return;
    const box = document.getElementById("lg");
    const banner = document.getElementById("lg-banner");
    const { el } = api;
    const left = Math.max(0, Math.ceil((lgs.endsAt - Date.now()) / 1000));
    if (banner) {
      banner.hidden = !inGame() || iPlay();
      if (inGame()) banner.textContent = `🐺 Loup-garou en cours · ${PHASES[lgs.phase]} · ${left}s`;
    }
    if (!box) return;
    if (!iPlay() || !you) {
      box.hidden = true;
      hudKey = "";
      return;
    }
    box.hidden = false;
    const key = JSON.stringify([lgs, you, cupidPick]);
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
    const pick = (list, onPick, selected) => el("div", { class: "lg-pick" }, list.map((p) =>
      el("button", { class: "lg-btn" + ((Array.isArray(selected) ? selected.includes(p.id) : selected === p.id) ? " on" : ""), text: p.pseudo, onclick: () => { onPick(p.id); Sound.play("click"); } })));
    const say = (text, cls = "lg-ask") => kids.push(el("p", { class: cls, text }));

    if (you.lover) say(`💘 Tu es amoureux·se de ${part(you.lover)?.pseudo}. Si l'un meurt, l'autre aussi.`, "lg-love");

    if (you.alive && lgs.phase === "night") {
      if (you.role === "loup") {
        const target = you.wolfVotes?.[myId()];
        say(target ? `Ta cible : ${part(target)?.pseudo}. Tes compagnons doivent choisir la même.` : "Sors dans le noir et va devant la cabane de ta victime, puis appuie sur E.");
        const mates = lgs.players.filter((p) => you.wolves.includes(p.id) && p.id !== myId());
        if (mates.length) say(`Ta meute : ${mates.map((p) => `${p.pseudo}${you.wolfVotes?.[p.id] ? ` → ${part(you.wolfVotes[p.id])?.pseudo}` : ""}`).join(" · ")} (le chat est réservé aux loups)`, "muted");
        if (you.pfSpy) say(`⚠ La petite fille vous espionne : c'est ${part(you.pfSpy)?.pseudo} !`, "lg-alert");
      } else if (ACTIONS[you.role]) {
        say(you.done ? "C'est fait pour cette nuit. Rentre vite avant le jour !" : "Sors dans le noir, va devant la cabane de ton choix et appuie sur E.");
      } else if (you.role === "petitefille") {
        say("Tu peux sortir espionner. Approche-toi des silhouettes pour reconnaître les loups… sans te faire prendre.");
      } else if (you.needCupid) {
        say("Choisis deux amoureux :");
        kids.push(pick(lgs.players, (id) => {
          cupidPick = cupidPick.includes(id) ? cupidPick.filter((x) => x !== id) : [...cupidPick, id].slice(-2);
          if (cupidPick.length === 2) { api.socket.emit("lg:cupid", cupidPick); cupidPick = []; }
          renderHud();
        }, cupidPick));
      }
    }
    if (you.alive && lgs.phase === "witch" && you.role === "sorciere" && !you.witch.done) {
      const victim = part(you.witch.victim);
      say(victim ? `Les loups ont attaqué ${victim.pseudo}.` : "Les loups n'ont attaqué personne.");
      if (victim && you.witch.heal) kids.push(el("button", { class: "btn tiny", text: `Sauver ${victim.pseudo}`, onclick: () => api.socket.emit("lg:witch", { heal: true }) }));
      if (you.witch.poison) { say("Ou empoisonner :", "muted"); kids.push(pick(alivePlayers.filter((p) => p.id !== myId()), (id) => api.socket.emit("lg:witch", { poison: id }))); }
      kids.push(el("button", { class: "btn tiny ghost", text: "Ne rien faire", onclick: () => api.socket.emit("lg:witch", {}) }));
    }
    if (you.alive && (lgs.phase === "dawn" || lgs.phase === "debate")) {
      say(lgs.traces?.length ? "Des traces de pas d'encre traversent le village : d'où partent-elles ? Discutez (Entrée pour parler) !" : "Discutez ! Appuie sur Entrée pour parler. Qui vous semble louche ?");
    }
    if (you.alive && lgs.phase === "vote") {
      const mine = lgs.votes[myId()];
      say(mine ? `Tu accuses ${part(mine)?.pseudo}. Sors du cercle pour changer d'avis.` : "Va te placer dans le cercle devant le pupitre de ton suspect (ou clique sur un nom).");
      kids.push(pick(alivePlayers.filter((p) => p.id !== myId()), (id) => {
        const i = lgs.players.findIndex((p) => p.id === id);
        const c = spots()[i].vote;
        api.walkTo(c.x, c.y);
      }, mine));
      if (lgs.raven) say(`🐦 Le corbeau ajoute 2 voix contre ${part(lgs.raven)?.pseudo}.`, "muted");
    }
    if (lgs.phase === "hunter" && you.canShoot) {
      say("Tu tombes… mais tu as le temps de tirer une dernière fois :");
      kids.push(pick(alivePlayers, (id) => api.socket.emit("lg:shoot", id)));
    }
    if (lgs.phase === "lastword") {
      say(lgs.accused === myId() ? "Le village t'accuse ! Défends-toi vite (Entrée pour parler)." : `${part(lgs.accused)?.pseudo} est sur l'estrade pour son dernier mot.`);
    }
    if (you.role === "voyante" && you.seen && Object.keys(you.seen).length) {
      say("Tes visions : " + Object.entries(you.seen).map(([id, r]) => `${part(id)?.pseudo} est ${ROLE_NAMES[r]}`).join(" · "), "muted");
    }
    if (you.role === "petitefille" && you.spotted?.length) say("Loups reconnus : " + you.spotted.map((id) => part(id)?.pseudo).join(", "), "lg-alert");
    if (lgs.phase === "end") {
      say(lgs.winner === "village" ? "Le village a gagné !" : "Les loups ont gagné !", "lg-win");
      kids.push(el("ul", { class: "lg-reveal" }, lgs.players.map((p) =>
        el("li", {}, el("span", { text: p.pseudo + (lgs.lovers?.includes(p.id) ? " 💘" : "") }), el("b", { text: ROLE_NAMES[p.role] || "?", class: p.role === "loup" ? "wolf" : "" })))));
    }
    if (lgs.roles?.length) say("En jeu : " + lgs.roles.map((r) => (r.n > 1 ? `${r.n} ${r.name}s` : r.name)).join(", "), "muted");
    kids.push(el("ul", { class: "lg-log" }, lgs.log.slice(-4).map((l) => el("li", { text: l.text }))));
    box.replaceChildren(...kids);
  }

  return {
    init, onState, onYou, onGather, onHome, onHear, onLove, update, frozen, nearAction, doAction,
    view, entLook, items, drawGround, drawRaven, overlay, renderPanel,
    blocksCabins: () => iPlay() && lgs.phase !== "end",
    get state() { return lgs; },
  };
})();
