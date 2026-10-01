// Loup-garou d'encre : une partie multijoueur jouée dans tout le village.
// La nuit, chacun rentre chez soi ; les rôles de nuit se déplacent vraiment et agissent devant les cabanes.
// Le jour, le conseil se réunit sur l'estrade. Le serveur garde tout l'état pour que personne ne puisse tricher.

const ROLES = {
  loup: { name: "Loup-garou", night: true, desc: "La nuit, sors de ta cabane et va devant celle de ta victime pour l'attaquer (mettez-vous d'accord entre loups). Le jour, fais l'innocent." },
  voyante: { name: "Voyante", night: true, desc: "La nuit, va devant une cabane et regarde par la fenêtre : tu découvres le rôle de son habitant. Une fois par nuit." },
  salvateur: { name: "Salvateur", night: true, desc: "La nuit, va devant une cabane pour la protéger : si les loups l'attaquent, ils échouent. Jamais deux nuits de suite la même." },
  petitefille: { name: "Petite fille", night: true, desc: "La nuit, tu peux sortir espionner : si un loup passe près de toi, tu le reconnais. Mais s'il s'approche trop, les loups sauront qui tu es…" },
  corbeau: { name: "Corbeau", night: true, desc: "La nuit, va poser ta marque devant une cabane : son habitant commencera le vote du lendemain avec 2 voix contre lui." },
  sorciere: { name: "Sorcière", desc: "Tu restes chez toi. Tu as deux potions pour toute la partie : une pour sauver la victime des loups, une pour emporter quelqu'un." },
  chasseur: { name: "Chasseur", desc: "Tu dors la nuit. Si tu es éliminé, tu emportes avec toi le joueur de ton choix." },
  cupidon: { name: "Cupidon", desc: "La première nuit, tu lies deux joueurs par l'amour : si l'un meurt, l'autre meurt de chagrin." },
  villageois: { name: "Villageois", desc: "Tu dors la nuit, mais tu entends les pas près de ta cabane. Le matin, étudie les traces d'encre et trouve les loups." },
};
const OPTIONAL = ["voyante", "salvateur", "sorciere", "petitefille", "chasseur", "corbeau", "cupidon"];

const SECONDS = { night: 60, witch: 20, dawn: 9, hunter: 20, debate: 90, vote: 45, lastword: 12, end: 25 };
const SPEED = Number(process.env.LG_SPEED) || 1; // pour tester : LG_SPEED=5 accélère tous les minuteurs
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 16;
const DOOR_RANGE = 110;

function deal(n, options) {
  const wolves = n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  const roles = Array(wolves).fill("loup");
  for (const r of OPTIONAL) if (options[r] && roles.length < n) roles.push(r);
  while (roles.length < n) roles.push("villageois");
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

module.exports = function createWerewolf(io, { getPlayer, getPos, doorOf }) {
  let options = Object.fromEntries(OPTIONAL.map((r) => [r, true]));
  let g = fresh([]);

  function fresh(lobby) {
    return {
      phase: "lobby", lobby, players: [], round: 0, endsAt: 0, nightStart: 0,
      wolfVotes: {}, votes: {}, victim: null, seerUsed: false,
      protected: null, lastProtected: null, raven: null, lovers: null,
      witch: { heal: true, poison: true, healed: false, poisoned: null, done: false },
      pf: { spotted: [], exposed: false },
      traces: {}, lastPos: {}, heardAt: {},
      accused: null, hunter: null, afterHunter: null, log: [], winner: null, lastDeaths: [],
    };
  }

  const P = (id) => g.players.find((p) => p.id === id);
  const alive = () => g.players.filter((p) => p.alive);
  const aliveWolves = () => alive().filter((p) => p.role === "loup");
  const hasAlive = (role) => alive().some((p) => p.role === role);
  const inGame = () => g.phase !== "lobby";
  const now = () => Date.now();
  const nearDoor = (actorId, targetId) => {
    const pos = getPos(actorId), door = doorOf(targetId);
    return !!(pos && door && pos.zone === "village" && dist(pos, door) < DOOR_RANGE);
  };

  function log(text) {
    g.log.push({ text, at: now() });
    if (g.log.length > 40) g.log.shift();
  }

  function setPhase(phase) {
    g.phase = phase;
    g.endsAt = now() + (SECONDS[phase] * 1000) / SPEED;
  }

  // ---------- Diffusion ----------

  function publicState() {
    const day = ["dawn", "debate", "vote", "lastword", "hunter"].includes(g.phase);
    const counts = {};
    for (const p of g.players) counts[p.role] = (counts[p.role] || 0) + 1;
    return {
      phase: g.phase,
      round: g.round,
      endsAt: g.endsAt,
      options,
      lobby: g.lobby.map((id) => ({ id, pseudo: getPlayer(id)?.pseudo || "?" })),
      players: g.players.map((p) => ({ id: p.id, pseudo: p.pseudo, alive: p.alive, role: !p.alive || g.phase === "end" ? p.role : null })),
      roles: inGame() ? Object.entries(counts).map(([r, n]) => ({ role: r, name: ROLES[r].name, n })) : [],
      votes: g.phase === "vote" || g.phase === "lastword" ? g.votes : {},
      raven: day ? g.raven : null,
      traces: day ? Object.values(g.traces).filter((t) => t.length > 1) : [],
      accused: g.accused,
      lastDeaths: g.lastDeaths,
      lovers: g.phase === "end" ? g.lovers : null,
      log: g.log.slice(-8),
      winner: g.winner,
    };
  }

  function privateState(p) {
    const r = ROLES[p.role];
    const s = { role: p.role, roleName: r.name, desc: r.desc, alive: p.alive, mover: !!r.night && p.alive };
    if (p.role === "loup") {
      s.wolves = g.players.filter((x) => x.role === "loup").map((x) => x.id);
      s.wolfVotes = g.wolfVotes;
      if (g.pf.exposed) s.pfSpy = g.players.find((x) => x.role === "petitefille")?.id;
    }
    if (p.role === "voyante") { s.seen = p.seen; s.done = g.seerUsed; }
    if (p.role === "salvateur") { s.done = !!g.protected; s.lastProtected = g.lastProtected; s.protected = g.protected; }
    if (p.role === "corbeau") s.done = !!g.raven;
    if (p.role === "petitefille") { s.spotted = g.pf.spotted; s.exposed = g.pf.exposed; }
    if (p.role === "sorciere") s.witch = { heal: g.witch.heal, poison: g.witch.poison, victim: g.phase === "witch" ? g.victim : null, done: g.witch.done };
    if (p.role === "cupidon") s.needCupid = g.round === 1 && g.phase === "night" && !g.lovers;
    if (g.lovers?.includes(p.id)) s.lover = g.lovers.find((x) => x !== p.id);
    if (g.phase === "hunter" && g.hunter === p.id) s.canShoot = true;
    return s;
  }

  function broadcast() {
    io.emit("lg:state", publicState());
    for (const p of g.players) io.to("p:" + p.id).emit("lg:you", privateState(p));
  }

  // ---------- Déroulement ----------

  function start(byId) {
    if (inGame() || g.lobby[0] !== byId || g.lobby.length < MIN_PLAYERS) return;
    const roles = deal(g.lobby.length, options);
    const lobby = g.lobby;
    g = fresh(lobby);
    g.players = lobby.map((id, i) => ({ id, pseudo: getPlayer(id)?.pseudo || "?", role: roles[i], alive: true, seen: {} }));
    const summary = Object.entries(roles.reduce((c, r) => ({ ...c, [r]: (c[r] || 0) + 1 }), {}))
      .map(([r, n]) => (n > 1 ? `${n} ${ROLES[r].name}s` : ROLES[r].name)).join(", ");
    log(`La partie commence avec ${g.players.length} Enxors. En jeu : ${summary}.`);
    startNight();
  }

  function startNight() {
    g.round++;
    g.wolfVotes = {};
    g.votes = {};
    g.victim = null;
    g.seerUsed = false;
    g.lastProtected = g.protected;
    g.protected = null;
    g.raven = null;
    g.witch.healed = false;
    g.witch.poisoned = null;
    g.witch.done = false;
    g.accused = null;
    g.lastDeaths = [];
    g.traces = {};
    g.lastPos = {};
    g.heardAt = {};
    g.nightStart = now();
    setPhase("night");
    log(`Nuit ${g.round} : tout le monde rentre dans sa cabane. Ceux qui ont quelque chose à faire sortent dans le noir…`);
    io.emit("lg:home", alive().map((p) => p.id));
    broadcast();
  }

  function kill(id, cause) {
    const p = P(id);
    if (!p || !p.alive) return;
    p.alive = false;
    g.lastDeaths.push(id);
    log(`${p.pseudo} ${cause}. C'était : ${ROLES[p.role].name}.`);
    if (p.role === "chasseur") g.hunter = id;
    if (g.lovers?.includes(id)) {
      const other = g.lovers.find((x) => x !== id);
      if (P(other)?.alive) kill(other, `meurt de chagrin en perdant ${p.pseudo}`);
    }
  }

  function checkWin() {
    const w = aliveWolves().length, others = alive().length - w;
    if (w === 0) g.winner = "village";
    else if (w >= others) g.winner = "loups";
    if (!g.winner) return false;
    setPhase("end");
    log(g.winner === "village" ? "Tous les loups ont été démasqués : le village gagne !" : "Les loups sont aussi nombreux que les villageois : les loups gagnent !");
    broadcast();
    return true;
  }

  function afterDeaths(next) {
    if (g.hunter && !P(g.hunter).alive && !P(g.hunter).shot) {
      g.afterHunter = next;
      setPhase("hunter");
      broadcast();
      return;
    }
    if (checkWin()) return;
    next();
  }

  function tally(votes) {
    const count = {};
    for (const t of Object.values(votes)) if (t) count[t] = (count[t] || 0) + 1;
    if (g.raven && P(g.raven)?.alive) count[g.raven] = (count[g.raven] || 0) + 2;
    const max = Math.max(0, ...Object.values(count));
    return { top: Object.keys(count).filter((k) => count[k] === max), max };
  }

  function gather() {
    io.emit("lg:gather", g.players.map((p) => p.id));
  }

  function advance() {
    switch (g.phase) {
      case "night": {
        const wolfVotes = Object.fromEntries(Object.entries(g.wolfVotes).filter(([id]) => P(id)?.alive));
        const { top } = tally(wolfVotes);
        g.victim = top.length ? top[Math.floor(Math.random() * top.length)] : null;
        if (hasAlive("sorciere") && (g.witch.heal || g.witch.poison)) {
          setPhase("witch");
          log("La sorcière se réveille et prépare ses potions…");
          broadcast();
        } else dawn();
        break;
      }
      case "witch":
        dawn();
        break;
      case "dawn":
        afterDeaths(() => { setPhase("debate"); log("Le village débat. Regardez les traces d'encre laissées cette nuit !"); broadcast(); });
        break;
      case "hunter": {
        const h = P(g.hunter);
        h.shot = true;
        if (!g.hunterTarget) log(`${h.pseudo} n'a tiré sur personne.`);
        g.hunterTarget = null;
        const next = g.afterHunter;
        g.afterHunter = null;
        if (!checkWin()) next();
        break;
      }
      case "debate":
        g.votes = {};
        setPhase("vote");
        log("Place au vote ! Va te placer dans le cercle devant le pupitre de ton suspect.");
        broadcast();
        break;
      case "vote": {
        const { top, max } = tally(g.votes);
        if (top.length !== 1 || max === 0) {
          log(max === 0 ? "Personne n'a voté : la nuit retombe." : "Égalité : le village n'arrive pas à se décider.");
          startNight();
        } else {
          g.accused = top[0];
          setPhase("lastword");
          log(`${P(g.accused).pseudo} monte sur l'estrade pour un dernier mot…`);
          broadcast();
        }
        break;
      }
      case "lastword":
        g.lastDeaths = [];
        kill(g.accused, "est banni·e par le village");
        g.accused = null;
        afterDeaths(startNight);
        broadcast();
        break;
      case "end":
        g = fresh(g.lobby.filter((id) => getPlayer(id)));
        broadcast();
        break;
    }
  }

  function dawn() {
    g.lastDeaths = [];
    const victim = P(g.victim);
    if (victim && g.witch.healed) log("Les loups ont attaqué, mais la sorcière a sauvé leur victime !");
    else if (victim && g.protected === victim.id) log("Les loups ont attaqué une cabane… mais quelqu'un veillait dessus. Personne n'est mort.");
    else if (victim) kill(victim.id, "a été emporté·e par les loups cette nuit");
    else log("Personne n'a été attaqué cette nuit.");
    if (g.witch.poisoned) kill(g.witch.poisoned, "a bu une potion étrange");
    if (g.raven && P(g.raven)?.alive) log(`Un corbeau s'est posé sur la cabane de ${P(g.raven).pseudo} : 2 voix contre lui au prochain vote.`);
    const n = Object.values(g.traces).filter((t) => t.length > 1).length;
    if (n) log(`${n} traînée${n > 1 ? "s" : ""} de pas d'encre traverse${n > 1 ? "nt" : ""} le village ce matin…`);
    setPhase("dawn");
    gather();
    broadcast();
  }

  // ---------- Ce qui se passe pendant la nuit (traces, bruits, petite fille) ----------

  function nightTick() {
    if (g.phase !== "night" || now() - g.nightStart < 2500) return;
    let changed = false;
    const movedNow = [];
    for (const p of alive()) {
      const pos = getPos(p.id);
      if (!pos || pos.zone !== "village") continue;
      const last = g.lastPos[p.id];
      if (last && dist(pos, last) > 10) {
        const tr = (g.traces[p.id] ||= [[Math.round(last.x), Math.round(last.y)]]);
        tr.push([Math.round(pos.x), Math.round(pos.y)]);
        movedNow.push(pos);
      }
      g.lastPos[p.id] = { x: pos.x, y: pos.y };
    }
    // ceux qui dorment entendent les pas près de leur cabane
    for (const s of alive()) {
      if (ROLES[s.role].night) continue;
      const door = doorOf(s.id);
      if (door && movedNow.some((m) => dist(m, door) < 170) && now() - (g.heardAt[s.id] || 0) > 12000) {
        g.heardAt[s.id] = now();
        io.to("p:" + s.id).emit("lg:hear");
      }
    }
    // la petite fille espionne
    const pf = alive().find((p) => p.role === "petitefille");
    const pfPos = pf && getPos(pf.id);
    if (pfPos && pfPos.zone === "village") {
      for (const w of aliveWolves()) {
        const wp = getPos(w.id);
        if (!wp || wp.zone !== "village") continue;
        const d = dist(pfPos, wp);
        if (d < 150 && !g.pf.spotted.includes(w.id)) { g.pf.spotted.push(w.id); changed = true; }
        if (d < 60 && !g.pf.exposed) { g.pf.exposed = true; changed = true; }
      }
    }
    if (changed) broadcast();
  }

  setInterval(() => {
    if (!inGame()) return;
    nightTick();
    if (now() >= g.endsAt) advance();
  }, 500);

  function hurry(ms = 3000) {
    g.endsAt = Math.min(g.endsAt, now() + ms);
  }

  // la nuit se termine plus tôt quand tous les rôles de nuit ont agi
  function nightDone() {
    const wolves = aliveWolves();
    const agreed = wolves.every((w) => g.wolfVotes[w.id]) && new Set(wolves.map((w) => g.wolfVotes[w.id])).size === 1;
    return agreed &&
      (!hasAlive("voyante") || g.seerUsed) &&
      (!hasAlive("salvateur") || g.protected) &&
      (!hasAlive("corbeau") || g.raven) &&
      (!hasAlive("cupidon") || g.round > 1 || g.lovers);
  }
  function acted() {
    if (nightDone()) hurry(4000);
    broadcast();
  }

  // ---------- Actions des joueurs ----------

  const nightActor = (id, role) => {
    const p = P(id);
    return g.phase === "night" && p?.alive && p.role === role ? p : null;
  };

  const actions = {
    join(id) {
      if (inGame() || g.lobby.includes(id) || g.lobby.length >= MAX_PLAYERS) return;
      g.lobby.push(id);
      broadcast();
    },
    leave(id) {
      if (inGame()) return;
      g.lobby = g.lobby.filter((x) => x !== id);
      broadcast();
    },
    options(id, opts) {
      if (inGame() || g.lobby[0] !== id || !opts) return;
      for (const r of OPTIONAL) if (typeof opts[r] === "boolean") options[r] = opts[r];
      broadcast();
    },
    start,
    attack(id, target) {
      const t = P(target);
      if (!nightActor(id, "loup") || !t?.alive || t.role === "loup" || !nearDoor(id, target)) return;
      g.wolfVotes[id] = target;
      acted();
    },
    seer(id, target) {
      const p = nightActor(id, "voyante"), t = P(target);
      if (!p || g.seerUsed || !t || t.id === id || !nearDoor(id, target)) return;
      p.seen[target] = t.role;
      g.seerUsed = true;
      acted();
    },
    protect(id, target) {
      if (!nightActor(id, "salvateur") || g.protected || !P(target)?.alive || target === g.lastProtected || !nearDoor(id, target)) return;
      g.protected = target;
      acted();
    },
    raven(id, target) {
      if (!nightActor(id, "corbeau") || g.raven || !P(target)?.alive || target === id || !nearDoor(id, target)) return;
      g.raven = target;
      acted();
    },
    cupid(id, pair) {
      if (!nightActor(id, "cupidon") || g.round !== 1 || g.lovers || !Array.isArray(pair)) return;
      const [a, b] = pair;
      if (a === b || !P(a) || !P(b)) return;
      g.lovers = [a, b];
      for (const x of g.lovers) io.to("p:" + x).emit("lg:love");
      acted();
    },
    witch(id, { heal, poison } = {}) {
      const p = P(id);
      if (g.phase !== "witch" || !p?.alive || p.role !== "sorciere" || g.witch.done) return;
      if (heal && g.witch.heal && g.victim) { g.witch.heal = false; g.witch.healed = true; }
      const t = P(poison);
      if (t?.alive && g.witch.poison && t.id !== id) { g.witch.poison = false; g.witch.poisoned = t.id; }
      g.witch.done = true;
      hurry(2500);
      broadcast();
    },
    vote(id, target) {
      const p = P(id);
      if (g.phase !== "vote" || !p?.alive) return;
      if (target === null) delete g.votes[id];
      else if (P(target)?.alive && target !== id) g.votes[id] = target;
      else return;
      broadcast();
    },
    shoot(id, target) {
      const t = P(target);
      if (g.phase !== "hunter" || g.hunter !== id || !t?.alive) return;
      g.hunterTarget = target;
      kill(target, `est abattu·e par ${P(id).pseudo}, le chasseur`);
      hurry(2500);
      broadcast();
    },
  };

  // Qui reçoit un message de chat pendant une partie ?
  function chatRoute(id) {
    if (!inGame() || g.phase === "end") return null;
    const p = P(id);
    const aliveIds = alive().map((x) => x.id);
    if (!p || !p.alive) return { exclude: aliveIds }; // morts et spectateurs parlent entre eux
    if (g.phase === "night" || g.phase === "witch") {
      if (p.role === "loup") return { exclude: aliveIds.filter((x) => P(x).role !== "loup") };
      return { blocked: "Chut… c'est la nuit, le village dort." };
    }
    return null;
  }

  return {
    actions,
    chatRoute,
    publicState,
    privateFor: (id) => (P(id) ? privateState(P(id)) : null),
    blocksCabins: (id) => inGame() && !!P(id),
  };
};
