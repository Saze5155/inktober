// Loup-garou d'encre : une partie multijoueur jouée sur l'estrade du village.
// Le serveur garde tout l'état (rôles secrets, votes, minuteurs) pour que personne ne puisse tricher.

const ROLES = {
  loup: { name: "Loup-garou", desc: "Chaque nuit, mets-toi d'accord avec les autres loups pour emporter un Enxor. Le jour, fais semblant d'être innocent." },
  voyante: { name: "Voyante", desc: "Chaque nuit, tu peux découvrir le vrai rôle d'un joueur. Aide le village sans te faire repérer par les loups." },
  sorciere: { name: "Sorcière", desc: "Tu as deux potions pour toute la partie : une pour sauver la victime des loups, une pour emporter quelqu'un." },
  chasseur: { name: "Chasseur", desc: "Si tu es éliminé, tu emportes avec toi le joueur de ton choix." },
  villageois: { name: "Villageois", desc: "Tu n'as pas de pouvoir, mais ta voix compte : trouve les loups et vote contre eux le jour venu." },
};

const SECONDS = { night: 40, witch: 20, dawn: 7, hunter: 20, debate: 75, vote: 45, lastword: 12, end: 20 };
const SPEED = Number(process.env.LG_SPEED) || 1; // pour tester : LG_SPEED=5 accélère tous les minuteurs
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 12;

function deal(n) {
  const wolves = n <= 5 ? 1 : n <= 9 ? 2 : 3;
  const roles = Array(wolves).fill("loup");
  roles.push("voyante");
  if (n >= 6) roles.push("sorciere");
  if (n >= 7) roles.push("chasseur");
  while (roles.length < n) roles.push("villageois");
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

module.exports = function createWerewolf(io, getPlayer) {
  let g = fresh([]);

  function fresh(lobby) {
    return {
      phase: "lobby", lobby, players: [], round: 0, endsAt: 0,
      wolfVotes: {}, votes: {}, victim: null, seerUsed: false,
      witch: { heal: true, poison: true, healed: false, poisoned: null, done: false },
      accused: null, hunter: null, afterHunter: null, log: [], winner: null, lastDeaths: [],
    };
  }

  const P = (id) => g.players.find((p) => p.id === id);
  const alive = () => g.players.filter((p) => p.alive);
  const aliveWolves = () => alive().filter((p) => p.role === "loup");
  const inGame = () => g.phase !== "lobby";
  const now = () => Date.now();

  function log(text) {
    g.log.push({ text, at: now() });
    if (g.log.length > 30) g.log.shift();
  }

  function setPhase(phase) {
    g.phase = phase;
    g.endsAt = now() + (SECONDS[phase] * 1000) / SPEED;
  }

  // ---------- Diffusion ----------

  function publicState() {
    const showVotes = g.phase === "vote" || g.phase === "lastword";
    return {
      phase: g.phase,
      round: g.round,
      endsAt: g.endsAt,
      lobby: g.lobby.map((id) => ({ id, pseudo: getPlayer(id)?.pseudo || "?" })),
      players: g.players.map((p) => ({ id: p.id, pseudo: p.pseudo, alive: p.alive, role: !p.alive || g.phase === "end" ? p.role : null })),
      votes: showVotes ? g.votes : {},
      accused: g.accused,
      lastDeaths: g.lastDeaths,
      log: g.log.slice(-8),
      winner: g.winner,
    };
  }

  function privateState(p) {
    const s = { role: p.role, roleName: ROLES[p.role].name, desc: ROLES[p.role].desc, alive: p.alive };
    if (p.role === "loup") {
      s.wolves = g.players.filter((x) => x.role === "loup").map((x) => x.id);
      s.wolfVotes = g.wolfVotes;
    }
    if (p.role === "voyante") { s.seen = p.seen; s.seerUsed = g.seerUsed; }
    if (p.role === "sorciere") s.witch = { heal: g.witch.heal, poison: g.witch.poison, victim: g.phase === "witch" ? g.victim : null, done: g.witch.done };
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
    const roles = deal(g.lobby.length);
    const lobby = g.lobby;
    g = fresh(lobby);
    g.players = lobby.map((id, i) => {
      const pl = getPlayer(id);
      return { id, pseudo: pl?.pseudo || "?", role: roles[i], alive: true, seen: {} };
    });
    io.emit("lg:gather", g.players.map((p) => p.id));
    log(`La partie commence avec ${g.players.length} Enxors. Parmi eux se cachent ${roles.filter((r) => r === "loup").length} loup(s)…`);
    startNight();
  }

  function startNight() {
    g.round++;
    g.wolfVotes = {};
    g.votes = {};
    g.victim = null;
    g.seerUsed = !alive().some((p) => p.role === "voyante");
    g.witch.healed = false;
    g.witch.poisoned = null;
    g.witch.done = false;
    g.accused = null;
    g.lastDeaths = [];
    setPhase("night");
    log(`Nuit ${g.round} : le village s'endort. Les loups se réveillent…`);
    broadcast();
  }

  function kill(id, cause) {
    const p = P(id);
    if (!p || !p.alive) return;
    p.alive = false;
    g.lastDeaths.push(id);
    log(`${p.pseudo} ${cause}. C'était : ${ROLES[p.role].name}.`);
    if (p.role === "chasseur") g.hunter = id;
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

  // après une mort : le chasseur tire, puis on vérifie la victoire, puis on continue
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
    const max = Math.max(0, ...Object.values(count));
    const top = Object.keys(count).filter((k) => count[k] === max);
    return { top, max };
  }

  function advance() {
    switch (g.phase) {
      case "night": {
        const { top } = tally(g.wolfVotes);
        g.victim = top.length ? top[Math.floor(Math.random() * top.length)] : null;
        if (alive().some((p) => p.role === "sorciere") && (g.witch.heal || g.witch.poison)) {
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
        afterDeaths(() => { setPhase("debate"); log("Le village débat : qui sont les loups ?"); broadcast(); });
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
        log("Place au vote ! Va te placer devant le pupitre de la personne que tu accuses.");
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
    if (g.victim && !g.witch.healed) kill(g.victim, "a été emporté·e par les loups cette nuit");
    else if (g.victim) log("Les loups ont attaqué, mais la sorcière a sauvé leur victime !");
    else log("Personne n'a été attaqué cette nuit.");
    if (g.witch.poisoned) kill(g.witch.poisoned, "a bu une potion étrange");
    setPhase("dawn");
    broadcast();
  }

  setInterval(() => {
    if (inGame() && now() >= g.endsAt) advance();
  }, 500);

  // accélère quand tout le monde a fini sa part
  function hurry() {
    g.endsAt = Math.min(g.endsAt, now() + 2500);
  }

  // ---------- Actions des joueurs ----------

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
    start,
    wolf(id, target) {
      const p = P(id), t = P(target);
      if (g.phase !== "night" || !p?.alive || p.role !== "loup" || !t?.alive || t.role === "loup") return;
      g.wolfVotes[id] = target;
      const wolves = aliveWolves();
      if (wolves.every((w) => g.wolfVotes[w.id]) && new Set(wolves.map((w) => g.wolfVotes[w.id])).size === 1 && g.seerUsed) hurry();
      broadcast();
    },
    seer(id, target) {
      const p = P(id), t = P(target);
      if (g.phase !== "night" || !p?.alive || p.role !== "voyante" || g.seerUsed || !t || t.id === id) return;
      p.seen[target] = t.role;
      g.seerUsed = true;
      broadcast();
    },
    witch(id, { heal, poison } = {}) {
      const p = P(id);
      if (g.phase !== "witch" || !p?.alive || p.role !== "sorciere" || g.witch.done) return;
      if (heal && g.witch.heal && g.victim) { g.witch.heal = false; g.witch.healed = true; }
      const t = P(poison);
      if (t?.alive && g.witch.poison && t.id !== id) { g.witch.poison = false; g.witch.poisoned = t.id; }
      g.witch.done = true;
      hurry();
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
      hurry();
      broadcast();
    },
  };

  // Qui reçoit un message de chat pendant une partie ?
  // null = tout le monde ; { exclude: [ids] } ; { blocked: "raison" }
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
  };
};
