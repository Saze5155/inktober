const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const express = require("express");
const { Server } = require("socket.io");
const store = require("./store");
const clock = require("./clock");
const fish = require("./fish");
const createWerewolf = require("./werewolf");
const createTrophies = require("./trophies");
const NPCS = require("./npcs");
const { PAGES, LEGENDS } = require("./lore");
const createQuests = require("./quests");

const PORT = Number(process.env.PORT) || 3000;
const TEAM_CODE = (process.env.TEAM_CODE || "dreamteam").trim();
// Le pseudo qui possède « La Canne À Pêche » (la grande maison) au lieu d'une cabane
const OWNER = (process.env.OWNER_PSEUDO || "").trim().toLowerCase();

const WORLD = { w: 6400, h: 4600 }; // le monde ouvert (doit correspondre à public/js/world.js)
const VILLAGE = { w: 3000, h: 2400 }; // le hameau, où roule le ballon
const SPAWN = { x: 1500, y: 1420 };
const PLOT_COUNT = 28; // doit correspondre aux emplacements de public/js/village.js
const COLORS = ["#b3261e", "#e0662f", "#e9b04a", "#5b8c5a", "#3e7cb1", "#7d5ba6", "#d36b9c", "#4a4550"];
const ROOFS = ["pointu", "plat", "rond"];
const EMOTES = ["coeur", "rire", "surprise", "danse", "dodo", "splash"];
const INTERIOR = { w: 32 * 560, h: 400 }; // doit correspondre à public/js/interior.js
const ACTS = [null, "fish", "sit"];

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });
const { db } = store;

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/drawings", express.static(store.DRAW_DIR, { maxAge: "365d", immutable: true }));

// ---------- Joueurs ----------

function publicPlayer(p) {
  return {
    id: p.id, pseudo: p.pseudo, owner: p.owner, plot: p.plot, color: p.color, cabin: p.cabin, drawings: p.drawings,
    games: p.games || {}, wear: p.wear || {}, trophies: Object.keys(p.trophies || {}), stats: p.stats || {},
    quests: p.quests || {},
  };
}

const trophies = createTrophies({ io, save: () => store.save(), publicPlayer });
const quests = createQuests({
  trophies, io, publicPlayer, save: () => store.save(),
  inRegion: (pos, region) => region === "rive" && pos.x < 3000 && pos.y > 2400,
});

// Actions du jour : seulement le jour du vestige correspondant (mordre le jour du vampire…)
const DAY_ACTIONS = {
  1: { stat: "bites", fx: "bite" }, 2: { stat: "flames", fx: "flame" }, 3: { stat: "paints", fx: "paint" },
  4: { stat: "shoes", fx: "shoe" }, 5: { stat: "bloods", fx: "blood" }, 6: { stat: "potions", fx: "potion" },
  7: { stat: "feeds", fx: "food" }, 8: { stat: "kisses", fx: "kiss" }, 9: { stat: "flowers", fx: "flower" }, 10: { stat: "wishes", fx: "star" },
};
// trophée « 3 étoiles » de chaque jeu du jour
const STAR_TROPHIES = {
  1: "enfantnuit", 2: "souffle", 3: "chromatique", 4: "glisse", 5: "rythme", 6: "alchimiste",
  7: "festin", 8: "charmeur", 9: "jardinier", 10: "astronome",
};

function findByPseudo(pseudo) {
  const key = pseudo.toLowerCase();
  return Object.values(db.players).find((p) => p.pseudo.toLowerCase() === key);
}

function freePlot() {
  const used = new Set(Object.values(db.players).map((p) => p.plot));
  for (let i = 0; i < PLOT_COUNT; i++) if (!used.has(i)) return i;
  return -1;
}

function cleanText(s, max) {
  return String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().replace(/\s+/g, " ").slice(0, max);
}

// knownToken : jeton présenté par un navigateur dont le joueur a disparu de la base
// (données perdues) : on le réutilise pour que la personne retrouve son pseudo sans erreur.
function createPlayer(pseudo, knownToken) {
  const owner = !!OWNER && pseudo.toLowerCase() === OWNER;
  const plot = owner ? null : freePlot();
  if (plot === -1) return null;
  const color = COLORS[Object.keys(db.players).length % COLORS.length];
  const p = {
    id: crypto.randomBytes(6).toString("hex"),
    pseudo,
    token: /^[0-9a-f]{36}$/.test(knownToken || "") ? knownToken : crypto.randomBytes(18).toString("hex"),
    owner,
    plot,
    color,
    cabin: { color, roof: ROOFS[crypto.randomInt(ROOFS.length)], showcase: null },
    drawings: {},
    createdAt: Date.now(),
  };
  db.players[p.id] = p;
  store.save();
  return p;
}

// ---------- Dessins ----------

function authPlayer(body) {
  const p = db.players[body?.id];
  return p && typeof body.token === "string" && body.token === p.token ? p : null;
}

function removeDrawing(p, day) {
  const old = p.drawings[day];
  if (!old) return;
  fs.rm(path.join(store.DRAW_DIR, old), { force: true }, () => {});
  delete p.drawings[day];
  if (p.cabin.showcase === day) p.cabin.showcase = null;
}

// Le propriétaire de La Canne À Pêche peut préparer ses dessins pour tous les jours
function validDay(day, p) {
  return Number.isInteger(day) && day >= 1 && day <= (p.owner ? 31 : clock.unlockedDays());
}

app.post("/api/drawing", (req, res) => {
  const p = authPlayer(req.body);
  if (!p) return res.status(401).json({ error: "Non autorisé." });
  const day = Number(req.body.day);
  if (!validDay(day, p)) return res.status(400).json({ error: "Ce jour n'est pas encore débloqué." });
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(req.body.image || "");
  if (!m) return res.status(400).json({ error: "Image invalide." });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: "Image trop lourde." });

  const file = `${p.id}-${day}-${crypto.randomBytes(4).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
  fs.writeFileSync(path.join(store.DRAW_DIR, file), buf);
  removeDrawing(p, day);
  p.drawings[day] = file;
  p.cabin.showcase = day; // le dernier dessin part en vitrine
  store.save();
  io.emit("player:update", publicPlayer(p));
  res.json({ ok: true });
});

app.post("/api/drawing/delete", (req, res) => {
  const p = authPlayer(req.body);
  if (!p) return res.status(401).json({ error: "Non autorisé." });
  removeDrawing(p, Number(req.body.day));
  store.save();
  io.emit("player:update", publicPlayer(p));
  res.json({ ok: true });
});

// ---------- Temps réel ----------

const online = new Map(); // id -> { x, y, sockets }
let dirty = false;

io.use((socket, next) => {
  const auth = socket.handshake.auth || {};
  if (String(auth.teamCode || "").trim() !== TEAM_CODE) return next(new Error("Code de la team incorrect."));
  const pseudo = cleanText(auth.pseudo, 20);
  if (pseudo.length < 2) return next(new Error("Ton pseudo doit faire entre 2 et 20 caractères."));

  let p = findByPseudo(pseudo);
  if (p) {
    if (p.token !== auth.token) return next(new Error("Ce pseudo est déjà pris."));
    if (OWNER && pseudo.toLowerCase() === OWNER && !p.owner) {
      // OWNER_PSEUDO défini après coup : on libère sa cabane, il prend la grande maison
      p.owner = true;
      p.plot = null;
      store.save();
      io.emit("player:update", publicPlayer(p));
    }
  } else {
    p = createPlayer(pseudo, auth.token);
    if (!p) return next(new Error("Le village est complet."));
    io.emit("player:update", publicPlayer(p));
  }
  socket.data.id = p.id;
  next();
});

// « village » ou « cabin:<id du propriétaire> ». La Canne À Pêche n'est ouverte qu'à son propriétaire avant le 31.
function validZone(z, visitor) {
  if (z === "village") return true;
  if (typeof z !== "string" || !z.startsWith("cabin:")) return false;
  const host = db.players[z.slice(6)];
  if (!host) return false;
  if (host.owner) return host.id === visitor.id || clock.unlockedDays() >= 31;
  return host.plot != null;
}

// ---------- Le ballon d'encre (simulé par le serveur pour que tout le monde voie la même chose) ----------

const BALL_R = 14;
const CENTER = { x: 1500, y: 1300 };
// Source, grande maison, étang, mur des mots, feu de camp (mêmes positions que public/js/village.js)
const solids = [
  { x: 1405, y: 1262, w: 190, h: 72 }, { x: 1342, y: 420, w: 316, h: 50 },
  { x: 770, y: 355, w: 320, h: 150 }, { x: 1728, y: 1452, w: 84, h: 26 }, { x: 1222, y: 1494, w: 56, h: 32 },
  { x: 290, y: 230, w: 260, h: 90 }, // l'estrade
];
for (const [radius, count] of [[430, 10], [780, 18]]) {
  for (let i = 0; i < count; i++) {
    const a = ((-55 + ((i + 0.5) * 290) / count) * Math.PI) / 180;
    const x = Math.round(CENTER.x + Math.cos(a) * radius * 1.35), y = Math.round(CENTER.y + Math.sin(a) * radius);
    solids.push({ x: x - 50, y: y - 34, w: 100, h: 34 });
  }
}
const ball = { x: 1500, y: 1580, z: 0, vx: 0, vy: 0, vz: 0, lastKicker: null, lastKickAt: 0, combo: 0, moving: true };
const ballHits = (x, y) =>
  x < BALL_R || y < BALL_R + 30 || x > VILLAGE.w - BALL_R || y > VILLAGE.h - BALL_R ||
  solids.some((b) => x > b.x - BALL_R && x < b.x + b.w + BALL_R && y > b.y - BALL_R && y < b.y + b.h + BALL_R);

function kickBall(id, px, py) {
  const now = Date.now();
  const dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy);
  if (d > BALL_R + 18 || ball.z > 20 || now - ball.lastKickAt < 250) return;
  const speed = 420 + Math.random() * 80;
  ball.vx = (dx / (d || 1)) * speed;
  ball.vy = (dy / (d || 1)) * speed;
  ball.vz = 220;
  ball.combo = ball.lastKicker && ball.lastKicker !== id && now - ball.lastKickAt < 5000 ? ball.combo + 1 : 0;
  ball.lastKicker = id;
  ball.lastKickAt = now;
  ball.moving = true;
  io.emit("kick", { id, combo: ball.combo });
}

setInterval(() => {
  if (!ball.moving) return;
  const dt = 1 / 30;
  const nx = ball.x + ball.vx * dt, ny = ball.y + ball.vy * dt;
  if (ballHits(nx, ball.y)) ball.vx *= -0.7; else ball.x = nx;
  if (ballHits(ball.x, ny)) ball.vy *= -0.7; else ball.y = ny;
  const f = ball.z > 0 ? 0.995 : 0.965;
  ball.vx *= f;
  ball.vy *= f;
  ball.vz -= 700 * dt;
  ball.z += ball.vz * dt;
  if (ball.z < 0) { ball.z = 0; ball.vz = Math.abs(ball.vz) > 60 ? -ball.vz * 0.45 : 0; }
  if (Math.hypot(ball.vx, ball.vy) < 4 && ball.z === 0) { ball.vx = ball.vy = 0; ball.moving = false; }
  io.emit("ball", [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z)]);
}, 1000 / 30);

const onlineList = () => [...online].map(([id, v]) => [id, Math.round(v.x), Math.round(v.y), v.zone, v.act]);

// porte de la cabane de chaque joueur (mêmes positions que public/js/village.js)
const DOORS = [];
for (const [radius, count] of [[430, 10], [780, 18]]) {
  for (let i = 0; i < count; i++) {
    const a = ((-55 + ((i + 0.5) * 290) / count) * Math.PI) / 180;
    DOORS.push({ x: Math.round(1500 + Math.cos(a) * radius * 1.35), y: Math.round(1300 + Math.sin(a) * radius) + 24 });
  }
}
const lg = createWerewolf(io, {
  getPlayer: (id) => db.players[id],
  getPos: (id) => online.get(id) || null,
  onEnd: (players, winner) => {
    for (const lp of players) {
      const pl = db.players[lp.id];
      if (!pl) continue;
      if (winner === "loups" && lp.role === "loup") trophies.award(pl, "loupalpha");
      if (winner === "village" && lp.role !== "loup") trophies.award(pl, "sage");
    }
  },
  doorOf: (id) => {
    const pl = db.players[id];
    if (!pl) return null;
    if (pl.owner) return { x: 1500, y: 496 };
    return pl.plot != null ? DOORS[pl.plot] : null;
  },
});

db.wall ||= [];
db.fishing ||= { records: {}, log: [] };

io.on("connection", (socket) => {
  const p = db.players[socket.data.id];
  let o = online.get(p.id);
  if (!o) {
    o = { x: SPAWN.x + (Math.random() - 0.5) * 120, y: SPAWN.y + Math.random() * 60, zone: "village", act: null, actAt: 0, sockets: 0 };
    online.set(p.id, o);
    socket.broadcast.emit("player:online", { id: p.id, x: o.x, y: o.y, zone: o.zone });
  }
  o.sockets++;
  socket.join("p:" + p.id); // salon privé du joueur (rôle secret du loup-garou…)

  socket.emit("init", {
    me: { ...publicPlayer(p), token: p.token },
    players: Object.values(db.players).map(publicPlayer),
    online: onlineList(),
    day: clock.dayInfo(),
    ball: [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z)],
    wall: db.wall,
    fishing: db.fishing,
    lg: lg.publicState(),
    lgYou: lg.privateFor(p.id),
    catalog: trophies.catalog(),
    npcs: NPCS,
    pages: PAGES,
    quests: quests.QUESTS,
  });

  const near = (x, y, d) => o.zone === "village" && Math.hypot(o.x - x, o.y - y) <= d;

  // parler à un habitant (il faut être à côté de lui) : peut terminer une quête
  socket.on("npc:talk", (id) => {
    const npc = NPCS.find((n) => n.id === id);
    if (!npc || !near(npc.x, npc.y, 200)) return;
    trophies.bump(p, "npcs", id);
    if (id === "ocre") trophies.bump(p, "ocre");
    quests.talked(p, id);
  });

  socket.on("quest:accept", (id) => quests.accept(p, String(id)));
  socket.on("quest:collect", (d, ack) => {
    const item = d && quests.collect(p, String(d.quest), String(d.item), o);
    if (typeof ack === "function") ack(item ? { ok: true, line: item.line, name: item.name } : { ok: false });
  });

  // pages du Bestiaire de Mythras
  socket.on("page:take", (id) => {
    const page = PAGES.find((pg) => pg.id === id);
    if (page && near(page.x, page.y, 160)) trophies.bump(p, "pages", id);
  });

  // apparition légendaire aperçue
  socket.on("legend:seen", (id) => {
    if (LEGENDS.includes(id)) trophies.bump(p, "legends", id);
  });

  // garde-robe
  socket.on("wear", (w) => {
    if (w && trophies.wear(p, w.slot, w.item ?? null)) io.emit("player:update", publicPlayer(p));
  });

  // action du jour sur un autre Enxor (mordre, cracher du feu…)
  let lastDayAct = 0;
  socket.on("dayact", (targetId) => {
    const action = DAY_ACTIONS[clock.unlockedDays()];
    const target = online.get(targetId);
    const now = Date.now();
    if (!action || !target || targetId === p.id || now - lastDayAct < 1200) return;
    if (target.zone !== o.zone || Math.hypot(target.x - o.x, target.y - o.y) > 90) return;
    lastDayAct = now;
    io.emit("fx", { type: action.fx, from: p.id, to: targetId });
    trophies.bump(p, action.stat, targetId);
  });

  // loup-garou
  for (const name of ["join", "leave", "start"]) socket.on("lg:" + name, () => lg.actions[name](p.id));
  for (const name of ["attack", "seer", "protect", "raven", "vote", "shoot"]) socket.on("lg:" + name, (target) => lg.actions[name](p.id, target ?? null));
  socket.on("lg:cupid", (pair) => lg.actions.cupid(p.id, pair));
  socket.on("lg:options", (opts) => lg.actions.options(p.id, opts));
  socket.on("lg:witch", (choice) => lg.actions.witch(p.id, choice || {}));

  socket.on("act", (act) => {
    if (!ACTS.includes(act)) return;
    o.act = act;
    o.actAt = Date.now();
    dirty = true;
  });

  // la pêche : le client annonce qu'il a ferré, le serveur tire le poisson
  socket.on("fish:catch", () => {
    if (o.act !== "fish" || Date.now() - o.actAt < 2000) return;
    o.actAt = Date.now();
    const c = { ...fish.roll(clock.unlockedDays()), pseudo: p.pseudo, color: p.color, at: Date.now() };
    const rec = db.fishing.records[c.name];
    c.record = !c.junk && (!rec || c.size > rec.size);
    if (c.record) db.fishing.records[c.name] = { size: c.size, pseudo: p.pseudo, at: c.at };
    db.fishing.log.unshift(c);
    db.fishing.log.length = Math.min(db.fishing.log.length, 25);
    trophies.bump(p, "catches");
    quests.fished(p, o);
    if (c.name.startsWith("Vieille botte")) trophies.award(p, "botte");
    store.save();
    io.emit("fish", { id: p.id, catch: c, fishing: db.fishing });
  });

  // pierres musicales
  let lastNote = 0;
  socket.on("note", (i) => {
    const now = Date.now();
    if (now - lastNote < 80 || !Number.isInteger(i) || i < 0 || i > 7) return;
    lastNote = now;
    io.emit("note", { id: p.id, i });
    trophies.bump(p, "notes");
  });

  // le mur des mots
  let lastPost = 0;
  socket.on("wall:post", (text) => {
    const now = Date.now();
    const t = cleanText(text, 120);
    if (!t || now - lastPost < 20000) return;
    lastPost = now;
    db.wall.unshift({ pseudo: p.pseudo, color: p.color, text: t, at: now });
    db.wall.length = Math.min(db.wall.length, 60);
    store.save();
    io.emit("wall", db.wall);
    trophies.bump(p, "posts");
  });

  socket.on("move", (pos) => {
    const x = Number(pos?.x), y = Number(pos?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    // pendant une partie de loup-garou, les joueurs restent dans le village (pas de cachette dans les cabanes)
    if (validZone(pos.zone, p) && (pos.zone === "village" || !lg.blocksCabins(p.id))) o.zone = pos.zone;
    if (o.act && (Math.abs(x - o.x) > 3 || Math.abs(y - o.y) > 3)) o.act = null; // bouger arrête de pêcher / de s'asseoir
    const max = o.zone === "village" ? WORLD : INTERIOR;
    o.x = Math.max(0, Math.min(max.w, x));
    o.y = Math.max(0, Math.min(max.h, y));
    if (o.zone === "village") kickBall(p.id, o.x, o.y);
    dirty = true;
  });

  let lastEmote = 0;
  socket.on("emote", (type) => {
    const now = Date.now();
    if (now - lastEmote < 400 || !EMOTES.includes(type)) return;
    lastEmote = now;
    io.emit("emote", { id: p.id, type });
    if (type === "danse") trophies.bump(p, "dances");
  });

  socket.on("game:done", (r) => {
    const day = Number(r?.day);
    if (!Number.isInteger(day) || !clock.gamePlayable(day)) return;
    const score = Math.max(0, Math.min(1e6, Math.round(Number(r.score) || 0)));
    const stars = Math.max(0, Math.min(3, Math.round(Number(r.stars) || 0)));
    p.games ||= {};
    const g = p.games[day] || { best: 0, stars: 0, plays: 0 };
    g.best = Math.max(g.best, score);
    g.stars = Math.max(g.stars, stars);
    g.plays++;
    p.games[day] = g;
    if (day === 2) trophies.award(p, "cinqfreres");
    if (stars === 3 && STAR_TROPHIES[day]) trophies.award(p, STAR_TROPHIES[day]);
    store.save();
    io.emit("player:update", publicPlayer(p));
  });

  let lastChat = 0;
  socket.on("chat", (text) => {
    const now = Date.now();
    if (now - lastChat < 700) return;
    lastChat = now;
    const t = cleanText(text, 140);
    if (!t) return;
    const route = lg.chatRoute(p.id);
    if (!route) return io.emit("chat", { id: p.id, text: t });
    if (route.blocked) return socket.emit("lg:msg", route.blocked);
    io.except(route.exclude.map((id) => "p:" + id)).emit("chat", { id: p.id, text: t });
  });

  socket.on("cabin:update", (c) => {
    if (!c || p.owner) return;
    if (COLORS.includes(c.color)) p.cabin.color = c.color;
    if (ROOFS.includes(c.roof)) p.cabin.roof = c.roof;
    if (c.showcase === null) p.cabin.showcase = null;
    else if (p.drawings[c.showcase]) p.cabin.showcase = Number(c.showcase);
    store.save();
    io.emit("player:update", publicPlayer(p));
  });

  socket.on("disconnect", () => {
    o.sockets--;
    if (o.sockets <= 0) {
      online.delete(p.id);
      io.emit("player:offline", p.id);
    }
  });
});

setInterval(() => {
  if (!dirty) return;
  dirty = false;
  io.emit("state", onlineList());
}, 66);

let lastUnlocked = clock.unlockedDays();
setInterval(() => {
  const n = clock.unlockedDays();
  if (n !== lastUnlocked) {
    lastUnlocked = n;
    io.emit("day", clock.dayInfo());
  }
}, 10000);

app.get("/api/status", (req, res) => {
  res.json({ players: Object.keys(db.players).length, dataDir: store.DATA_DIR, persistent: !!process.env.DATA_DIR, unlocked: clock.unlockedDays() });
});

server.listen(PORT, () => {
  console.log(`Village Enxor sur http://localhost:${PORT} (jour débloqué : ${clock.unlockedDays()})`);
  console.log(`Données : ${store.DATA_DIR} · ${Object.keys(db.players).length} joueur(s) enregistré(s)`);
  if (process.env.RAILWAY_ENVIRONMENT && !process.env.DATA_DIR) {
    console.warn("⚠️  DATA_DIR n'est pas défini : les cabanes et les dessins seront EFFACÉS au prochain déploiement.");
    console.warn("⚠️  Ajoute un volume Railway monté sur /data et la variable DATA_DIR=/data.");
  }
});
