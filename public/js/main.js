(() => {
  const $ = (id) => document.getElementById(id);
  const V = Village;
  const I = Interior;
  const canvas = $("world");
  const ctx = canvas.getContext("2d");
  const AUTH_KEY = "enxor.auth";
  const SPEED = 230;
  const KEYMAP = { arrowup: "u", z: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", q: "l", a: "l", arrowright: "r", d: "r" };
  const EMOTES = [["coeur", "♥", "Cœur"], ["rire", "HA", "Rire"], ["surprise", "!", "Surprise"], ["danse", "♪", "Danse"], ["dodo", "Zz", "Dodo"], ["splash", "✸", "Splash d'encre"]];
  const INSIDE_SCALE = 1.35;

  const S = {
    socket: null, me: null, players: new Map(), ents: new Map(), day: null, dayAt: 0,
    zone: "village", villagePos: null,
    keys: new Set(), target: null, pending: null, near: null, panel: null, game: null,
    solids: [], inter: [], footprints: [], images: new Map(), bg: null, started: false,
    lastSent: 0, sentX: 0, sentY: 0, sentZone: "",
    ball: { x: 1500, y: 1580, z: 0, tx: 1500, ty: 1580, tz: 0 },
    pops: [], sparks: [], fireflies: [], sky: { dark: 0, dusk: 0 }, skyAt: -1, lastBurst: 0,
  };

  if (location.hostname === "localhost") window.__enxor = S; // debug en local uniquement

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const me = () => S.me && S.ents.get(S.me.id);
  const unlocked = () => S.day?.unlocked || 0;
  const inCabin = () => S.zone !== "village";
  const cabinOwner = () => (inCabin() ? S.players.get(S.zone.slice(6)) : null);
  // chez le propriétaire de La Canne À Pêche, les 31 pièces sont ouvertes
  const roomsOpen = (owner) => (owner?.owner ? 31 : unlocked());

  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch { return {}; }
  }
  function saveAuth(a) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch { /* navigation privée */ }
  }

  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 3000);
  }

  // ---------- Connexion ----------

  function showLogin(error) {
    const a = loadAuth();
    $("login").hidden = false;
    $("hud").hidden = true;
    $("login-code").value = a.teamCode || "";
    $("login-pseudo").value = a.pseudo || "";
    $("login-error").textContent = error || "";
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const teamCode = $("login-code").value.trim();
    const pseudo = $("login-pseudo").value.trim();
    const a = loadAuth();
    const token = a.pseudo && a.pseudo.toLowerCase() === pseudo.toLowerCase() ? a.token : undefined;
    $("login-error").textContent = "Connexion…";
    connect({ teamCode, pseudo, token });
  });

  function makeEnt(id, x, y, zone = "village") {
    return { id, x, y, zone, tx: x, ty: y, moving: false, face: 1, chat: null, chatUntil: 0, stepT: 0, emote: null, emoteAt: 0, seed: Ink.hash(id) % 1000 };
  }

  function connect(auth) {
    if (S.socket) { S.socket.removeAllListeners(); S.socket.disconnect(); }
    const socket = io({ auth });
    S.socket = socket;

    socket.on("connect_error", (err) => {
      if (!socket.active) showLogin(err.message);
      else if (!$("login").hidden) $("login-error").textContent = "Serveur injoignable, nouvelle tentative…";
    });
    socket.on("init", (data) => onInit(data, auth.teamCode));
    socket.on("state", (list) => {
      for (const [id, x, y, zone] of list) {
        if (id === S.me?.id) continue;
        let e = S.ents.get(id);
        if (!e) S.ents.set(id, (e = makeEnt(id, x, y, zone)));
        if (e.zone !== zone) Object.assign(e, { x, y, zone }); // changement de lieu : pas de glissade
        e.tx = x;
        e.ty = y;
      }
    });
    socket.on("player:online", ({ id, x, y, zone }) => {
      if (id !== S.me?.id) S.ents.set(id, makeEnt(id, x, y, zone));
      updateOnline();
    });
    socket.on("player:offline", (id) => {
      S.ents.delete(id);
      updateOnline();
    });
    socket.on("player:update", (p) => {
      S.players.set(p.id, p);
      if (S.me && p.id === S.me.id) Object.assign(S.me, p);
      rebuildWorld();
      if (S.panel && S.panel.type !== "source") renderPanel();
    });
    socket.on("chat", ({ id, text }) => {
      const e = S.ents.get(id);
      if (e) { e.chat = text; e.chatUntil = performance.now() + 6000; }
    });
    socket.on("emote", ({ id, type }) => {
      const e = S.ents.get(id);
      if (e) { e.emote = type; e.emoteAt = performance.now() / 1000; }
    });
    socket.on("ball", ([x, y, z]) => Object.assign(S.ball, { tx: x, ty: y, tz: z }));
    socket.on("kick", ({ id, combo }) => {
      const b = S.ball;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        S.sparks.push({ x: b.x, y: b.y - b.z, vx: Math.cos(a) * 90, vy: Math.sin(a) * 60, life: 0.5, max: 0.5, color: Ink.INK });
      }
      if (combo > 0) S.pops.push({ x: b.x, y: b.y - 40, text: `Passe ×${combo + 1}`, t: performance.now() / 1000 });
      if (id === S.me?.id && combo >= 4) toast(`${combo + 1} passes d'affilée, belle équipe !`);
    });
    socket.on("day", setDay);
    socket.on("disconnect", () => { $("hud-online").textContent = "Connexion perdue, reconnexion…"; });
  }

  function onInit(data, teamCode) {
    const prev = me();
    S.me = data.me;
    const auth = { teamCode, pseudo: data.me.pseudo, token: data.me.token };
    saveAuth(auth);
    S.socket.auth = auth; // les reconnexions utiliseront le jeton
    S.players = new Map(data.players.map((p) => [p.id, p]));
    S.ents = new Map(data.online.map(([id, x, y, zone]) => [id, makeEnt(id, x, y, zone)]));
    const m = me();
    if (prev) Object.assign(m, { x: prev.x, y: prev.y });
    m.zone = S.zone;
    if (data.ball) Object.assign(S.ball, { x: data.ball[0], y: data.ball[1], z: data.ball[2], tx: data.ball[0], ty: data.ball[1], tz: data.ball[2] });
    sendMove(true);
    setDay(data.day);
    rebuildWorld();
    updateOnline();
    $("login").hidden = true;
    $("hud").hidden = false;
    if (!S.started) {
      S.started = true;
      S.bg = V.buildBackground();
      requestAnimationFrame(loop);
    }
  }

  function setDay(d) {
    S.day = d;
    S.dayAt = performance.now();
    updateDayHud();
    rebuildWorld();
    if (S.panel) renderPanel();
  }

  function updateOnline() {
    const names = [...S.ents.keys()].map((id) => S.players.get(id)?.pseudo).filter(Boolean);
    const box = $("hud-online");
    box.textContent = `● ${names.length} en ligne`;
    box.title = names.join(", ");
  }

  const pad = (n) => String(n).padStart(2, "0");
  function updateDayHud() {
    if (!S.day) return;
    const n = unlocked();
    const remain = Math.max(0, Math.round(S.day.secondsToMidnight - (performance.now() - S.dayAt) / 1000));
    const title = n ? `Jour ${n} · ${THEMES[n - 1]}` : "Avant l'Inktober";
    let sub = `Prochain vestige dans ${pad(Math.floor(remain / 3600))}:${pad(Math.floor((remain % 3600) / 60))}:${pad(remain % 60)}`;
    if (n === 0) sub = "La Source s'éveille le 1er octobre";
    if (n >= 31) sub = "Les 31 vestiges sont remontés";
    $("hud-day").replaceChildren(el("strong", { text: title }), el("span", { text: sub }));
  }
  setInterval(updateDayHud, 1000);

  // ---------- Lieux : village et cabanes ----------

  const museumOpen = () => unlocked() >= 31;

  function sendMove(force) {
    const m = me();
    if (!m || !S.socket) return;
    S.socket.emit("move", { x: m.x, y: m.y, zone: S.zone });
    S.sentX = m.x;
    S.sentY = m.y;
    S.sentZone = S.zone;
    if (force) S.lastSent = performance.now() / 1000;
  }

  function enterCabin(id) {
    const m = me();
    S.villagePos = { x: m.x, y: m.y };
    S.zone = "cabin:" + id;
    Object.assign(m, { zone: S.zone, x: 150, y: I.FY, face: 1 });
    S.target = S.pending = null;
    S.footprints = [];
    sendMove(true);
    rebuildWorld();
    updateHelp();
  }

  function exitCabin() {
    const owner = cabinOwner();
    const m = me();
    const pl = owner?.plot != null ? V.plots[owner.plot] : null;
    const door = owner?.owner ? { x: V.HOUSE.x, y: V.HOUSE.y + 50 } : pl ? { x: pl.x, y: pl.y + 44 } : null;
    S.zone = "village";
    Object.assign(m, { zone: "village" }, door || S.villagePos || { x: V.CENTER.x, y: V.CENTER.y + 100 });
    S.target = S.pending = null;
    sendMove(true);
    rebuildWorld();
    updateHelp();
  }

  function updateHelp() {
    $("hud-help").innerHTML = inCabin()
      ? "Q / D ou flèches · clic pour marcher · <b>E</b> interagir · <b>Entrée</b> parler · <b>1-6</b> emotes"
      : "ZQSD / flèches ou clic pour bouger · <b>E</b> interagir · <b>Entrée</b> parler · <b>1-6</b> emotes";
  }

  function rebuildWorld() {
    if (!S.me) return;
    if (inCabin()) return rebuildInterior();
    const { CENTER: c, HOUSE: h } = V;
    S.solids = [
      { x: c.x - 95, y: c.y - 38, w: 190, h: 72 },
      { x: h.x - 158, y: h.y - 50, w: 316, h: 50 },
    ];
    S.inter = [
      { kind: "source", x: c.x, y: c.y, r: 150, goX: c.x, goY: c.y + 70, label: "Regarder la Source", hit: { x: c.x - 105, y: c.y - 50, w: 210, h: 100 } },
      { kind: "house", x: h.x, y: h.y + 26, r: 70, label: S.me.owner ? "Rentrer chez toi" : "La Canne À Pêche", hit: { x: h.x - 190, y: h.y - 310, w: 380, h: 320 } },
    ];
    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      S.solids.push({ x: pl.x - 50, y: pl.y - 34, w: 100, h: 34 });
      S.inter.push({
        kind: "cabin", id: p.id, x: pl.x, y: pl.y + 24, r: 55,
        label: p.id === S.me.id ? "Entrer dans ta cabane" : `Entrer chez ${p.pseudo}`,
        hit: { x: pl.x - 60, y: pl.y - 135, w: 120, h: 140 },
      });
    }
  }

  function rebuildInterior() {
    const owner = cabinOwner();
    if (!owner) return;
    const mine = owner.id === S.me.id;
    S.solids = [];
    S.inter = [{ kind: "exit", x: 70, y: I.FY, r: 60, label: "Sortir" }];
    if (mine) S.inter.push({ kind: "bench", x: 470, y: I.FY, r: 75, label: "Décorer ma cabane", hit: { x: 400, y: I.FY - 130, w: 140, h: 130 } });
    for (let d = 1; d <= roomsOpen(owner); d++) {
      const file = owner.drawings[d];
      if (!mine && !file) continue;
      const x = d * I.RW + I.RW / 2;
      S.inter.push({
        kind: "frame", day: d, x, y: I.FY, r: 90,
        label: mine ? (file ? "Changer ton dessin" : "Accrocher ton dessin") : "Regarder le dessin",
        hit: { x: x - I.FR.w / 2, y: I.FR.y, w: I.FR.w, h: I.FR.h },
      });
    }
  }

  function blocked(x, y) {
    if (inCabin()) return x < 30 || x > (roomsOpen(cabinOwner()) + 1) * I.RW - 30;
    if (x < 20 || y < 40 || x > V.W - 20 || y > V.H - 20) return true;
    return S.solids.some((b) => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 6 && y < b.y + b.h + 6);
  }

  const sameInter = (a, b) => a && b && a.kind === b.kind && a.id === b.id && a.day === b.day;

  function image(url) {
    let img = S.images.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      S.images.set(url, img);
    }
    return img;
  }
  const drawingImg = (p, d) => (p.drawings[d] ? image("/drawings/" + p.drawings[d]) : null);
  const showcase = (p) => (p.cabin.showcase != null ? drawingImg(p, p.cabin.showcase) : null);

  // ---------- Boucle ----------

  let lastT = 0;
  function loop(now) {
    const t = now / 1000;
    const dt = Math.min(0.05, t - lastT || 0);
    lastT = t;
    if (!S.game) {
      update(dt, t);
      render(t);
    }
    requestAnimationFrame(loop);
  }

  function update(dt, t) {
    const m = me();
    if (!m) return;
    const inside = inCabin();
    let dx = 0, dy = 0;
    if (!S.panel && !chatOpen()) {
      if (S.keys.has("l")) dx--;
      if (S.keys.has("r")) dx++;
      if (!inside && S.keys.has("u")) dy--;
      if (!inside && S.keys.has("d")) dy++;
    }
    if (dx || dy) {
      S.target = null;
      S.pending = null;
    } else if (S.target) {
      const ddx = S.target.x - m.x, ddy = inside ? 0 : S.target.y - m.y, d = Math.hypot(ddx, ddy);
      if (d < 4) S.target = null;
      else { dx = ddx / d; dy = ddy / d; }
    }
    const len = Math.hypot(dx, dy);
    m.moving = len > 0;
    if (len) {
      const left = S.target ? Math.hypot(S.target.x - m.x, inside ? 0 : S.target.y - m.y) : Infinity;
      const step = Math.min(SPEED * dt, left);
      const nx = m.x + (dx / len) * step, ny = m.y + (dy / len) * step;
      let moved = false;
      if (!blocked(nx, m.y)) { m.x = nx; moved = true; }
      if (dy && !blocked(m.x, ny)) { m.y = ny; moved = true; }
      if (!moved) { S.target = null; m.moving = false; }
      if (Math.abs(dx) > 0.2) m.face = Math.sign(dx);
    }
    if ((m.x !== S.sentX || m.y !== S.sentY || S.zone !== S.sentZone) && t - S.lastSent > 0.066) {
      sendMove();
      S.lastSent = t;
    }

    S.near = null;
    let best = Infinity;
    for (const it of S.inter) {
      const d = inside ? Math.abs(it.x - m.x) : Math.hypot(it.x - m.x, it.y - m.y);
      if (d < it.r && d < best) { best = d; S.near = it; }
    }
    if (S.pending && sameInter(S.pending, S.near)) interact(S.near);
    const prompt = $("prompt");
    prompt.hidden = !S.near || !!S.panel;
    if (S.near) prompt.textContent = `E · ${S.near.label}`;

    for (const e of S.ents.values()) {
      if (e === m) continue;
      const ddx = e.tx - e.x, ddy = e.ty - e.y;
      e.moving = Math.hypot(ddx, ddy) > 1.5;
      if (Math.abs(ddx) > 0.5) e.face = Math.sign(ddx);
      const k = Math.min(1, dt * 10);
      e.x += ddx * k;
      e.y += ddy * k;
    }

    if (!inside) {
      for (const e of S.ents.values()) {
        if (e.zone === "village" && e.moving && t - e.stepT > 0.2) {
          e.stepT = t;
          S.footprints.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y + 2, t, s: 2 + Math.random() * 2 });
        }
      }
    }
    while (S.footprints.length && t - S.footprints[0].t > 4) S.footprints.shift();

    // ballon d'encre
    const b = S.ball, kb = Math.min(1, dt * 14);
    b.x += (b.tx - b.x) * kb;
    b.y += (b.ty - b.y) * kb;
    b.z += (b.tz - b.z) * kb;

    // ciel (recalculé une fois par seconde)
    if (t - S.skyAt > 1) { S.sky = V.sky(); S.skyAt = t; }

    // danse collective : à partir de 2 Enxors qui dansent autour de la Source, elle lance un feu d'artifice
    const dancers = [...S.ents.values()].filter((e) => e.zone === "village" && e.emote === "danse" && t - e.emoteAt < 2.5 &&
      Math.hypot(e.x - V.CENTER.x, e.y - V.CENTER.y) < 260).length;
    if (!inside && dancers >= 2 && t - S.lastBurst > 0.45 - Math.min(0.25, dancers * 0.05)) {
      S.lastBurst = t;
      const colors = ["#e9b04a", "#e0662f", "#d36b9c", "#5bb3a0", "#b48be0", "#efe5d0"];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const x = V.CENTER.x + (Math.random() - 0.5) * 300, y = V.CENTER.y - 160 - Math.random() * 160;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2, v = 120 + Math.random() * 60;
        S.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, max: 1.2, color: c, glow: true });
      }
    }
    for (const p of S.sparks) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + (p.glow ? 40 * dt : 0);
    }
    S.sparks = S.sparks.filter((p) => p.life > 0);
    S.pops = S.pops.filter((p) => t - p.t < 1.4);

    // lucioles la nuit, autour du joueur
    if (!inside && S.sky.dark > 0.3) {
      while (S.fireflies.length < 18) S.fireflies.push({ x: m.x + (Math.random() - 0.5) * 900, y: m.y + (Math.random() - 0.5) * 600, ph: Math.random() * 10 });
      for (const f of S.fireflies) {
        f.x += Math.sin(t * 0.7 + f.ph) * 12 * dt;
        f.y += Math.cos(t * 0.9 + f.ph * 1.3) * 10 * dt;
        if (Math.abs(f.x - m.x) > 700 || Math.abs(f.y - m.y) > 500) { f.x = m.x + (Math.random() - 0.5) * 900; f.y = m.y + (Math.random() - 0.5) * 600; }
      }
    } else S.fireflies.length = 0;
  }

  function drawBall(t) {
    const b = S.ball;
    Ink.shadow(ctx, b.x, b.y, 13 - Math.min(6, b.z / 10), 4.5, 0.22);
    const y = b.y - 14 - b.z;
    ctx.save();
    ctx.fillStyle = Ink.INK;
    ctx.beginPath();
    ctx.arc(b.x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    // motif qui tourne avec la position (le ballon roule)
    const rot = (b.x + b.y) / 14;
    ctx.fillStyle = Ink.PAPER;
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * 7, y + Math.sin(a) * 7, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function villageLights(cam) {
    const vis = (x, y) => x > cam.x - 300 && x < cam.x + vw + 300 && y > cam.y - 300 && y < cam.y + vh + 300;
    const L = [];
    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      if (vis(pl.x, pl.y)) L.push({ x: pl.x + 20, y: pl.y - 30, r: 150 });
    }
    for (const l of V.lamps) if (vis(l.x, l.y)) L.push({ x: l.x, y: l.y + 30, r: 190, k: 1 });
    L.push({ x: V.CENTER.x, y: V.CENTER.y, r: 280, k: 1, color: "rgba(233,176,74,.25)" });
    L.push({ x: V.HOUSE.x, y: V.HOUSE.y - 60, r: 260 });
    for (const e of S.ents.values()) if (e.zone === "village" && vis(e.x, e.y)) L.push({ x: e.x, y: e.y - 20, r: 90, k: 0.7 });
    if (vis(S.ball.x, S.ball.y)) L.push({ x: S.ball.x, y: S.ball.y, r: 60, k: 0.4 });
    return L;
  }

  // ---------- Rendu ----------

  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
  }
  window.addEventListener("resize", resize);
  resize();

  function villageCamera() {
    const m = me();
    return {
      x: Math.round(vw > V.W ? (V.W - vw) / 2 : clamp(m.x - vw / 2, 0, V.W - vw)),
      y: Math.round(vh > V.H ? (V.H - vh) / 2 : clamp(m.y - vh / 2 - 40, 0, V.H - vh)),
    };
  }

  function interiorView() {
    const s = vh / (I.RH + 60);
    const viewW = vw / s;
    const maxX = (Math.min(31, roomsOpen(cabinOwner()) + 1) + 1) * I.RW;
    const cx = clamp(me().x - viewW / 2, -40, Math.max(-40, maxX - viewW + 40));
    return { s, cx, top: 30 };
  }

  const toWorld = (sx, sy) => {
    if (inCabin()) {
      const { s, cx, top } = interiorView();
      return { x: sx / s + cx, y: sy / s - top };
    }
    const cam = villageCamera();
    return { x: sx + cam.x, y: sy + cam.y };
  };

  function drawEnt(e, t, scale = 1) {
    const p = S.players.get(e.id);
    const et = t - e.emoteAt;
    const opts = { seed: e.seed, color: p?.color, moving: e.moving, face: e.face, rod: p?.owner, emote: e.emote, et };
    if (scale === 1) return Ink.enxor(ctx, e.x, e.y, t, opts);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(scale, scale);
    Ink.enxor(ctx, 0, 0, t, opts);
    ctx.restore();
  }

  function drawOverheads(e, t, scale = 1) {
    const p = S.players.get(e.id);
    if (!p) return;
    const k = scale;
    Ink.label(ctx, p.pseudo, e.x, e.y - 58 * k, { size: 14, dot: p.color });
    if (e.emote && t - e.emoteAt < 2.5) Ink.emote(ctx, e.x, e.y - (k - 1) * 50, e.emote, t - e.emoteAt, t);
    if (e.chat && performance.now() < e.chatUntil) Ink.bubble(ctx, e.chat, e.x, e.y - 68 * k);
  }

  function render(t) {
    if (!me()) return;
    if (inCabin()) renderInterior(t);
    else renderVillage(t);
  }

  function renderVillage(t) {
    const cam = villageCamera();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(0, 0, vw, vh);
    ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(S.bg, 0, 0);

    ctx.fillStyle = Ink.INK;
    for (const f of S.footprints) {
      ctx.globalAlpha = 0.35 * (1 - (t - f.t) / 4);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.s * 1.3, f.s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const vis = (x, y) => x > cam.x - 260 && x < cam.x + vw + 260 && y > cam.y - 60 && y < cam.y + vh + 480;
    const here = [...S.ents.values()].filter((e) => e.zone === "village" && vis(e.x, e.y));
    const items = [];
    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      const home = S.ents.get(p.id);
      if (vis(pl.x, pl.y)) items.push({ y: pl.y, draw: () => V.drawCabin(ctx, pl.x, pl.y, p, !!home, t, showcase(p), S.sky.dark > 0.25) });
    }
    if (vis(S.ball.x, S.ball.y)) items.push({ y: S.ball.y, draw: () => drawBall(t) });
    if (vis(V.HOUSE.x, V.HOUSE.y)) items.push({ y: V.HOUSE.y, draw: () => V.drawHouse(ctx, t, museumOpen()) });
    if (vis(V.CENTER.x, V.CENTER.y)) {
      const n = unlocked();
      items.push({ y: V.CENTER.y, draw: () => V.drawSource(ctx, t, n ? `Jour ${n} · ${THEMES[n - 1]}` : "La Source dort") });
    }
    for (const e of here) items.push({ y: e.y, draw: () => drawEnt(e, t) });
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

    // nuit : tout s'assombrit sauf autour des lumières
    V.drawNight(ctx, cam, vw, vh, dpr, S.sky, villageLights(cam));
    ctx.setTransform(dpr, 0, 0, dpr, -cam.x * dpr, -cam.y * dpr);

    ctx.save();
    ctx.globalCompositeOperation = S.sky.dark > 0.2 ? "lighter" : "source-over";
    for (const f of S.fireflies) {
      const a = 0.5 + Math.sin(t * 3 + f.ph) * 0.5;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
      g.addColorStop(0, `rgba(255,220,120,${a})`);
      g.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 10, f.y - 10, 20, 20);
    }
    for (const p of S.sparks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glow ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    for (const p of S.pops) {
      const k = (t - p.t) / 1.4;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      Ink.word(ctx, p.text, p.x, p.y - k * 30, 18, "#e0662f");
      ctx.restore();
    }

    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      if (vis(pl.x, pl.y)) Ink.label(ctx, p.pseudo, pl.x, pl.y - 150, { size: 13, dot: p.cabin.color });
    }
    for (const e of here) drawOverheads(e, t);
  }

  function renderInterior(t) {
    const owner = cabinOwner();
    if (!owner) return exitCabin();
    const { s, cx, top } = interiorView();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#141215";
    ctx.fillRect(0, 0, vw, vh);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, -cx * dpr * s, top * dpr * s);

    const n = roomsOpen(owner);
    const first = Math.max(0, Math.floor(cx / I.RW));
    const last = Math.min(n + 1, 31, Math.floor((cx + vw / s) / I.RW));
    const mine = owner.id === S.me.id;
    for (let d = first; d <= last; d++) I.drawRoom(ctx, owner, d, n, drawingImg(owner, d), mine);

    const here = [...S.ents.values()].filter((e) => e.zone === S.zone);
    for (const e of here) drawEnt(e, t, INSIDE_SCALE);
    for (const e of here) drawOverheads(e, t, INSIDE_SCALE);
  }

  // ---------- Contrôles ----------

  window.addEventListener("keydown", (e) => {
    if (!S.me || !$("login").hidden) return;
    if (S.game) {
      if (e.key === "Escape") closeGame();
      return;
    }
    if (e.key === "Escape") {
      if (!$("lightbox").hidden) $("lightbox").hidden = true;
      else if (S.panel) closePanel();
      else if (chatOpen()) closeChat();
      return;
    }
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
    if (typing || S.panel) return;
    const k = KEYMAP[e.key.toLowerCase()];
    if (k) {
      S.keys.add(k);
      e.preventDefault();
    } else if (e.key.toLowerCase() === "e" && S.near) {
      interact(S.near);
    } else if (e.key === "Enter") {
      e.preventDefault();
      openChat();
    } else if (/^[1-6]$/.test(e.key)) {
      sendEmote(EMOTES[Number(e.key) - 1][0]);
    }
  });
  window.addEventListener("keyup", (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k) S.keys.delete(k);
  });
  window.addEventListener("blur", () => S.keys.clear());

  canvas.addEventListener("pointerdown", (e) => {
    if (!me() || S.panel) return;
    if (chatOpen()) closeChat();
    const { x, y } = toWorld(e.clientX, e.clientY);
    const hit = S.inter.find((it) => it.hit && x > it.hit.x && x < it.hit.x + it.hit.w && y > it.hit.y && y < it.hit.y + it.hit.h);
    if (hit && sameInter(hit, S.near)) return interact(hit);
    S.pending = hit || null;
    S.target = hit ? { x: hit.goX ?? hit.x, y: hit.goY ?? hit.y } : { x, y };
  });

  const chatOpen = () => !$("chat-form").hidden;
  function openChat() {
    S.keys.clear();
    $("chat-form").hidden = false;
    $("chat-input").value = "";
    $("chat-input").focus();
  }
  function closeChat() {
    $("chat-form").hidden = true;
    $("chat-input").blur();
  }
  $("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("chat-input").value.trim();
    if (text) S.socket.emit("chat", text);
    closeChat();
  });

  function sendEmote(type) {
    S.socket?.emit("emote", type);
  }
  $("emotes").append(...EMOTES.map(([type, glyph, name], i) =>
    el("button", { class: "emote-btn", title: `${name} (${i + 1})`, onclick: (e) => { sendEmote(type); e.currentTarget.blur(); } },
      el("span", { class: "emote-glyph", text: glyph }), el("kbd", { text: i + 1 }))));

  // ---------- Panneaux ----------

  function interact(it) {
    S.target = null;
    S.pending = null;
    S.keys.clear();
    if (it.kind === "cabin") enterCabin(it.id);
    else if (it.kind === "house" && S.me.owner) enterCabin(S.me.id);
    else if (it.kind === "exit") exitCabin();
    else if (it.kind === "frame" && cabinOwner()?.id !== S.me.id) openLightbox("/drawings/" + cabinOwner().drawings[it.day]);
    else openPanel(it.kind === "frame" ? { type: "frame", day: it.day } : { type: it.kind });
  }

  function openPanel(p) {
    S.panel = p;
    $("panel").hidden = false;
    renderPanel();
  }
  function closePanel() {
    S.panel = null;
    $("panel").hidden = true;
    $("panel-body").replaceChildren();
  }
  $("panel-close").addEventListener("click", closePanel);
  $("panel").addEventListener("pointerdown", (e) => { if (e.target === $("panel")) closePanel(); });
  $("lightbox").addEventListener("click", () => ($("lightbox").hidden = true));

  function renderPanel() {
    if (!S.panel) return;
    const body = $("panel-body");
    body.replaceChildren();
    const type = S.panel.type;
    if (type === "source") renderSource(body);
    else if (type === "house") renderHouse(body);
    else if (type === "bench") renderBench(body);
    else if (type === "frame") renderFrame(body, S.panel.day);
  }

  const row = (label, control) => el("div", { class: "row" }, el("span", { class: "row-label", text: label }), control);
  const emitCabin = (c) => S.socket.emit("cabin:update", c);

  function renderBench(body) {
    const p = S.me;
    const days = Object.keys(p.drawings).map(Number).sort((a, b) => a - b);
    const select = el("select", { onchange: (e) => emitCabin({ showcase: e.target.value ? Number(e.target.value) : null }) },
      el("option", { value: "", text: days.length ? "Aucun dessin" : "Accroche d'abord un dessin" }),
      days.map((d) => {
        const o = el("option", { value: d, text: `Jour ${d} · ${THEMES[d - 1]}` });
        o.selected = p.cabin.showcase === d;
        return o;
      }));
    body.append(
      el("p", { class: "eyebrow", text: "L'établi" }),
      el("h2", { class: "script", text: "Ta cabane" }),
      el("p", { class: "muted", text: "La couleur et le toit se voient depuis le village. Le dessin en vitrine est accroché à côté de ta porte." }),
      el("section", { class: "deco" },
        row("Couleur", el("div", { class: "swatches" }, V.COLORS.map((c) =>
          el("button", { class: "swatch" + (p.cabin.color === c ? " on" : ""), style: `--c:${c}`, "aria-label": c, onclick: () => emitCabin({ color: c }) })))),
        row("Toit", el("div", { class: "seg" }, V.ROOFS.map(([v, l]) =>
          el("button", { class: p.cabin.roof === v ? "on" : "", text: l, onclick: () => emitCabin({ roof: v }) })))),
        row("Vitrine", select)),
    );
  }

  function renderFrame(body, d) {
    const p = S.me;
    const file = p.drawings[d];
    const src = file && "/drawings/" + file;
    body.append(
      el("p", { class: "eyebrow", text: `Jour ${d}` }),
      el("h2", { class: "script", text: THEMES[d - 1] }),
      file
        ? el("img", { class: "frame-preview", src, alt: `Ton dessin du jour ${d}`, onclick: () => openLightbox(src) })
        : el("p", { class: "muted", text: "Ce cadre est vide. Accroche ton dessin du jour : il sera visible par toute la team quand elle passera chez toi." }),
      el("div", { class: "actions" },
        el("button", { class: "btn", text: file ? "Remplacer le dessin" : "Accrocher un dessin", onclick: () => pickDrawing(d) }),
        file && p.cabin.showcase !== d && el("button", { class: "btn ghost", text: "Mettre en vitrine", onclick: () => emitCabin({ showcase: d }) }),
        file && el("button", { class: "btn ghost", text: "Retirer", onclick: () => deleteDrawing(d) })),
    );
  }

  function renderSource(body) {
    const n = unlocked();
    const games = [];
    for (let d = n; d >= 1; d--) {
      const g = Games.get(d);
      if (!g) continue;
      const res = S.me.games?.[d];
      games.push(el("div", { class: "game-row" + (d === n ? " today" : "") },
        el("div", {},
          el("strong", { text: `Jour ${d} · ${g.title}` }),
          el("span", { class: "muted", text: res ? `Ton record : ${res.best} · ${"★".repeat(res.stars)}${"☆".repeat(3 - res.stars)}` : d === n ? "Le vestige du jour" : "Pas encore joué" })),
        el("button", { class: "btn", text: "Jouer", onclick: () => openGame(d) })));
    }
    body.append(
      el("p", { class: "eyebrow", text: "La Source" }),
      el("h2", { class: "script", text: n ? THEMES[n - 1] : "Elle dort encore" }),
      el("p", { class: "lore", text: "Quand les humains ont disparu, leur encre a continué de couler. C'est d'ici que sont nés les Enxors. Chaque nuit à minuit, la Source fait remonter un vestige du monde d'avant." }),
      el("p", { class: "muted", text: "Astuce : dansez à plusieurs autour de la Source (touche 4)… et un ballon d'encre traîne sur la place, faites-vous des passes." }),
      games.length ? el("div", { class: "games" }, games) : el("p", { class: "muted", text: "Le jeu de ce vestige arrive bientôt." }),
      n && !Games.get(n) && games.length ? el("p", { class: "muted", text: "Le jeu du vestige d'aujourd'hui arrive bientôt." }) : null,
      el("ol", { class: "days" }, THEMES.map((th, i) =>
        el("li", { class: i < n ? "done" : "" }, el("b", { text: i + 1 }), el("span", { text: i < n ? th : "???" })))),
    );
  }

  function renderHouse(body) {
    const text = museumOpen()
      ? "Les portes sont ouvertes. Le musée de tous vos dessins arrive très bientôt ici."
      : S.me.owner
        ? "C'est chez toi. Personne d'autre ne peut entrer avant le 31 octobre : c'est ici qu'ouvrira le musée de tous les dessins."
        : "La porte est condamnée. Une vieille pancarte dit : « Ouverture le 31 octobre ». On entend des pages qu'on tourne à l'intérieur…";
    body.append(el("p", { class: "eyebrow", text: "Grande maison" }), el("h2", { class: "script", text: "La Canne À Pêche" }), el("p", { class: "lore", text }));
  }

  function openLightbox(src) {
    $("lightbox-img").src = src;
    $("lightbox").hidden = false;
  }

  // ---------- Jeux ----------

  function openGame(day) {
    const game = Games.get(day);
    if (!game || day > unlocked()) return;
    closePanel();
    S.keys.clear();
    S.game = { day, game, stop: null };
    $("game").hidden = false;
    $("hud").hidden = true;
    $("game-title").textContent = `Jour ${day} · ${THEMES[day - 1]}`;
    gameIntro();
  }

  function stopGame() {
    if (S.game?.stop) S.game.stop();
    if (S.game) S.game.stop = null;
  }

  function closeGame() {
    stopGame();
    S.game = null;
    $("game").hidden = true;
    $("hud").hidden = false;
    $("game-stage").replaceChildren();
  }
  $("game-quit").addEventListener("click", closeGame);

  function card(...kids) {
    return el("div", { class: "game-card-wrap" }, el("div", { class: "game-card" }, ...kids));
  }

  function gameIntro() {
    const { day, game } = S.game;
    const res = S.me.games?.[day];
    $("game-stage").replaceChildren(card(
      el("p", { class: "eyebrow", text: `Vestige du jour ${day} · ${THEMES[day - 1]}` }),
      el("h2", { class: "script", text: game.title }),
      el("p", { class: "lore", text: game.story }),
      el("p", { class: "muted", text: game.controls }),
      res && el("p", { class: "muted", text: `Ton record : ${res.best}` }),
      el("button", { class: "btn", text: "Jouer", onclick: startGame }),
    ));
  }

  function startGame() {
    const { day, game } = S.game;
    const stage = el("div", { class: "game-root" });
    $("game-stage").replaceChildren(stage);
    let done = false;
    S.game.stop = game.start(stage, {
      finish(result) {
        if (done) return;
        done = true;
        S.socket.emit("game:done", { day, score: result.score, stars: result.stars });
        // mise à jour immédiate en attendant la réponse du serveur
        const prev = S.me.games?.[day];
        S.me.games = { ...S.me.games, [day]: { best: Math.max(prev?.best || 0, result.score), stars: Math.max(prev?.stars || 0, result.stars) } };
        S.players.set(S.me.id, { ...S.players.get(S.me.id), games: S.me.games });
        gameEnd(result, !prev || result.score > prev.best);
      },
    });
  }

  function gameEnd(result, record) {
    const { day } = S.game;
    stopGame();
    const ranking = [...S.players.values()]
      .filter((p) => p.games?.[day])
      .sort((a, b) => b.games[day].best - a.games[day].best)
      .slice(0, 10);
    $("game-stage").append(card(
      el("p", { class: "eyebrow", text: record ? "Nouveau record !" : "Partie terminée" }),
      el("h2", { class: "script", text: `${result.score} points` }),
      el("p", { class: "stars", text: "★".repeat(result.stars) + "☆".repeat(3 - result.stars) }),
      el("p", { class: "muted", text: (result.lines || []).join(" · ") }),
      el("p", { class: "muted", text: "Un trophée t'attend dans la pièce du jour de ta cabane." }),
      ranking.length > 0 && el("ol", { class: "ranking" }, ranking.map((p) =>
        el("li", { class: p.id === S.me.id ? "me" : "" }, el("span", { text: p.pseudo }), el("b", { text: p.games[day].best })))),
      el("div", { class: "actions" },
        el("button", { class: "btn", text: "Rejouer", onclick: startGame }),
        el("button", { class: "btn ghost", text: "Retour au village", onclick: closeGame })),
    ));
  }

  // ---------- Dessins ----------

  async function compress(file) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const webp = c.toDataURL("image/webp", 0.88);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", 0.88);
  }

  async function api(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: S.me.id, token: S.me.token, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur du serveur.");
    return data;
  }

  function pickDrawing(day) {
    const input = el("input", { type: "file", accept: "image/*" });
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      toast("Envoi du dessin…");
      try {
        await api("/api/drawing", { day, image: await compress(file) });
        toast("Dessin accroché !");
      } catch (err) {
        toast(err.message || "L'envoi a échoué.");
      }
    });
    input.click();
  }

  async function deleteDrawing(day) {
    if (!confirm(`Retirer ton dessin du jour ${day} ?`)) return;
    try { await api("/api/drawing/delete", { day }); } catch (err) { toast(err.message); }
  }

  // ---------- Démarrage ----------

  updateHelp();
  const saved = loadAuth();
  if (saved.teamCode && saved.pseudo && saved.token) {
    $("login-error").textContent = "Connexion…";
    connect(saved);
  } else {
    showLogin();
  }
})();
