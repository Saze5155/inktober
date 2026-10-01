const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const express = require("express");
const { Server } = require("socket.io");
const store = require("./store");
const clock = require("./clock");

const PORT = Number(process.env.PORT) || 3000;
const TEAM_CODE = (process.env.TEAM_CODE || "dreamteam").trim();
// Le pseudo qui possède « La Canne À Pêche » (la grande maison) au lieu d'une cabane
const OWNER = (process.env.OWNER_PSEUDO || "").trim().toLowerCase();

const WORLD = { w: 3000, h: 2400 };
const SPAWN = { x: 1500, y: 1420 };
const PLOT_COUNT = 28; // doit correspondre aux emplacements de public/js/village.js
const COLORS = ["#b3261e", "#e0662f", "#e9b04a", "#5b8c5a", "#3e7cb1", "#7d5ba6", "#d36b9c", "#4a4550"];
const ROOFS = ["pointu", "plat", "rond"];
const EMOTES = ["coeur", "rire", "surprise", "danse", "dodo", "splash"];
const INTERIOR = { w: 32 * 560, h: 400 }; // doit correspondre à public/js/interior.js

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });
const { db } = store;

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/drawings", express.static(store.DRAW_DIR, { maxAge: "365d", immutable: true }));

// ---------- Joueurs ----------

function publicPlayer(p) {
  return { id: p.id, pseudo: p.pseudo, owner: p.owner, plot: p.plot, color: p.color, cabin: p.cabin, drawings: p.drawings, games: p.games || {} };
}

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

function createPlayer(pseudo) {
  const owner = !!OWNER && pseudo.toLowerCase() === OWNER;
  const plot = owner ? null : freePlot();
  if (plot === -1) return null;
  const color = COLORS[Object.keys(db.players).length % COLORS.length];
  const p = {
    id: crypto.randomBytes(6).toString("hex"),
    pseudo,
    token: crypto.randomBytes(18).toString("hex"),
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
    p = createPlayer(pseudo);
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
const solids = [{ x: 1405, y: 1262, w: 190, h: 72 }, { x: 1342, y: 420, w: 316, h: 50 }];
for (const [radius, count] of [[430, 10], [780, 18]]) {
  for (let i = 0; i < count; i++) {
    const a = ((-55 + ((i + 0.5) * 290) / count) * Math.PI) / 180;
    const x = Math.round(CENTER.x + Math.cos(a) * radius * 1.35), y = Math.round(CENTER.y + Math.sin(a) * radius);
    solids.push({ x: x - 50, y: y - 34, w: 100, h: 34 });
  }
}
const ball = { x: 1500, y: 1580, z: 0, vx: 0, vy: 0, vz: 0, lastKicker: null, lastKickAt: 0, combo: 0, moving: true };
const ballHits = (x, y) =>
  x < BALL_R || y < BALL_R + 30 || x > WORLD.w - BALL_R || y > WORLD.h - BALL_R ||
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

const onlineList = () => [...online].map(([id, v]) => [id, Math.round(v.x), Math.round(v.y), v.zone]);

io.on("connection", (socket) => {
  const p = db.players[socket.data.id];
  let o = online.get(p.id);
  if (!o) {
    o = { x: SPAWN.x + (Math.random() - 0.5) * 120, y: SPAWN.y + Math.random() * 60, zone: "village", sockets: 0 };
    online.set(p.id, o);
    socket.broadcast.emit("player:online", { id: p.id, x: o.x, y: o.y, zone: o.zone });
  }
  o.sockets++;

  socket.emit("init", {
    me: { ...publicPlayer(p), token: p.token },
    players: Object.values(db.players).map(publicPlayer),
    online: onlineList(),
    day: clock.dayInfo(),
    ball: [Math.round(ball.x), Math.round(ball.y), Math.round(ball.z)],
  });

  socket.on("move", (pos) => {
    const x = Number(pos?.x), y = Number(pos?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (validZone(pos.zone, p)) o.zone = pos.zone;
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
  });

  socket.on("game:done", (r) => {
    const day = Number(r?.day);
    if (!Number.isInteger(day) || day < 1 || day > clock.unlockedDays()) return;
    const score = Math.max(0, Math.min(1e6, Math.round(Number(r.score) || 0)));
    const stars = Math.max(0, Math.min(3, Math.round(Number(r.stars) || 0)));
    p.games ||= {};
    const g = p.games[day] || { best: 0, stars: 0, plays: 0 };
    g.best = Math.max(g.best, score);
    g.stars = Math.max(g.stars, stars);
    g.plays++;
    p.games[day] = g;
    store.save();
    io.emit("player:update", publicPlayer(p));
  });

  let lastChat = 0;
  socket.on("chat", (text) => {
    const now = Date.now();
    if (now - lastChat < 700) return;
    lastChat = now;
    const t = cleanText(text, 140);
    if (t) io.emit("chat", { id: p.id, text: t });
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

server.listen(PORT, () => {
  console.log(`Village Enxor sur http://localhost:${PORT} (jour débloqué : ${clock.unlockedDays()})`);
});
