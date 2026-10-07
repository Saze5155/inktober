(() => {
  const $ = (id) => document.getElementById(id);
  const V = Village;
  const I = Interior;
  const canvas = $("world");
  const ctx = canvas.getContext("2d", { alpha: false }); // opaque : plus rapide à afficher
  const AUTH_KEY = "enxor.auth";
  const SPEED = 230;
  const KEYMAP = { arrowup: "u", z: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", q: "l", a: "l", arrowright: "r", d: "r", shift: "run" };
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
    act: null, fish: null, wall: [], fishing: { records: {}, log: [] }, stoneGlow: [], lastStone: -1, crows: [], stepT: 0,
    catalog: { cosmetics: {}, slots: [], trophies: [] }, fx: [], dayTarget: null, lastDayAct: 0,
    region: null, questDefs: [], pages: [], seenLegends: new Set(), legendsNow: [],
  };

  // action spéciale du jour sur un autre Enxor (touche F), seulement le jour du vestige
  const DAY_ACTIONS = {
    1: { verb: "Mordre" }, 2: { verb: "Cracher du feu sur" }, 3: { verb: "Peindre" },
    4: { verb: "Chausser de Crocs" }, 5: { verb: "Faire une transfusion à" }, 6: { verb: "Lancer une potion sur" },
    7: { verb: "Offrir un onigiri à" }, 8: { verb: "Envoyer un bisou à" }, 9: { verb: "Faire pousser une fleur sur" }, 10: { verb: "Lancer une étoile filante sur" },
  };

  if (location.hostname === "localhost") window.__enxor = S; // debug en local uniquement

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const me = () => S.me && S.ents.get(S.me.id);
  const unlocked = () => S.day?.unlocked || 0;
  const inCabin = () => S.zone !== "village";
  const cabinOwner = () => (inCabin() ? S.players.get(S.zone.slice(6)) : null);
  // chez le propriétaire de La Canne À Pêche, les 31 pièces sont ouvertes
  const roomsOpen = (owner) => (owner?.owner ? 31 : unlocked());

  // volume d'un son selon la distance (0 si on n'est pas au même endroit)
  function hearing(x, y, zone = "village") {
    const m = me();
    if (!m || zone !== S.zone) return 0;
    const d = zone === "village" ? Math.hypot(x - m.x, y - m.y) : Math.abs(x - m.x);
    return clamp(1 - d / 900, 0, 1);
  }
  const hearEnt = (id) => { const e = S.ents.get(id); return e ? hearing(e.x, e.y, e.zone) : 0; };

  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
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

  function toast(text, ms = 3000) {
    const t = $("toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), ms);
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
      for (const [id, x, y, zone, act] of list) {
        if (id === S.me?.id) continue;
        let e = S.ents.get(id);
        if (!e) S.ents.set(id, (e = makeEnt(id, x, y, zone)));
        if (e.zone !== zone) Object.assign(e, { x, y, zone }); // changement de lieu : pas de glissade
        e.tx = x;
        e.ty = y;
        e.act = act || null;
      }
    });
    socket.on("trophy", ({ id }) => {
      const t = S.catalog.trophies.find((x) => x.id === id);
      if (!t) return;
      Sound.play("win");
      const rewards = t.reward.map((c) => S.catalog.cosmetics[c]?.name).join(" + ");
      toast(`🏆 Trophée « ${t.name} » ! Débloqué : ${rewards}. Appuie sur T pour l'équiper.`, 6000);
    });
    socket.on("trophy:announce", ({ pseudo, name }) => {
      if (pseudo !== S.me?.pseudo) toast(`🏆 ${pseudo} a obtenu le trophée « ${name} »`);
    });
    socket.on("fx", ({ type, from, to }) => {
      S.fx.push({ type, from, to, t: performance.now() / 1000 });
      Sound.play({ bite: "bite", flame: "flame", paint: "splash", shoe: "plouf", blood: "drop", potion: "splash", food: "bite", kiss: "coeur", flower: "chat", star: "firework" }[type], from === S.me?.id || to === S.me?.id ? 1 : hearEnt(to));
      const who = S.players.get(from)?.pseudo;
      if (to === S.me?.id) toast({
        bite: `${who} t'a mordu·e ! 🩸`, flame: `${who} t'a roussi·e ! 🔥`, paint: `${who} t'a repeint·e ! 🎨`,
        shoe: `${who} t'a mis des Crocs aux pieds ! 👟`, blood: `${who} t'a fait une transfusion ! 💉`, potion: `${who} t'a lancé une potion ! 🧪`,
        food: `${who} t'a offert un onigiri ! 🍙`, kiss: `${who} t'a envoyé un bisou ! 💋`, flower: `${who} t'a fait pousser une fleur sur la tête ! 🌸`, star: `${who} t'a lancé une étoile filante ! Fais un vœu ✨`,
      }[type]);
    });
    socket.on("lg:state", (s) => Werewolf.onState(s));
    socket.on("lg:you", (y) => Werewolf.onYou(y));
    socket.on("lg:gather", (ids) => Werewolf.onGather(ids));
    socket.on("lg:msg", (text) => toast(text));
    socket.on("lg:home", (ids) => Werewolf.onHome(ids));
    socket.on("lg:hear", () => Werewolf.onHear());
    socket.on("lg:love", () => Werewolf.onLove());
    socket.on("wall", (w) => {
      S.wall = w;
      if (S.panel?.type === "board") renderPanel();
    });
    socket.on("note", ({ id, i }) => {
      if (id === S.me?.id) return;
      S.stoneGlow[i] = performance.now() / 1000;
      Sound.play("note", hearing(V.STONES[i].x, V.STONES[i].y), i);
    });
    socket.on("fish", ({ id, catch: c, fishing }) => {
      S.fishing = fishing;
      const e = S.ents.get(id);
      const text = c.junk ? `${c.name}…` : `${c.name} · ${c.size} cm${c.record ? " · record !" : ""}`;
      if (e) S.pops.push({ x: e.x, y: e.y - 70, text, t: performance.now() / 1000, color: c.rare ? "#c9871a" : c.junk ? "#6b6170" : "#3e7cb1", dur: 3 });
      Sound.play(c.junk ? "junk" : "catch", id === S.me?.id ? 1 : hearEnt(id));
      if (id === S.me?.id) {
        toast(c.junk ? `Tu as remonté : ${c.name}. Un vestige des humains…` : `Tu as pêché : ${c.name} (${c.size} cm)${c.record ? ", nouveau record !" : ""}`);
        if (S.fish) S.fish = { state: "wait", biteAt: performance.now() / 1000 + 3 + Math.random() * 6 };
      }
      if (S.panel?.type === "records") renderPanel();
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
      Sound.play("chat", id === S.me?.id ? 0.6 : hearEnt(id));
    });
    socket.on("emote", ({ id, type }) => {
      const e = S.ents.get(id);
      if (e) { e.emote = type; e.emoteAt = performance.now() / 1000; }
      Sound.play(type, hearEnt(id));
    });
    socket.on("ball", ([x, y, z]) => Object.assign(S.ball, { tx: x, ty: y, tz: z }));
    socket.on("kick", ({ id, combo }) => {
      const b = S.ball;
      Sound.play("kick", hearing(b.x, b.y));
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
    S.wall = data.wall || [];
    if (data.catalog) S.catalog = data.catalog;
    World.setNpcs(data.npcs);
    S.questDefs = data.quests || [];
    S.pages = data.pages || [];
    S.seenLegends = new Set(data.me.stats?.legends || []);
    Werewolf.onState(data.lg);
    Werewolf.onYou(data.lgYou);
    S.fishing = data.fishing || S.fishing;
    for (const [id, , , , act] of data.online) if (S.ents.get(id)) S.ents.get(id).act = act || null;
    if (!S.crows.length) spawnCrows();
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
    if (S.day && d.unlocked > S.day.unlocked) {
      Sound.play("day");
      toast(`Minuit : la Source fait remonter un nouveau vestige, « ${THEMES[d.unlocked - 1]} » !`);
    }
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
    stopActivity();
    Sound.play("door");
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
    Sound.play("door");
    sendMove(true);
    rebuildWorld();
    updateHelp();
  }

  function updateHelp() {
    $("hud-help").innerHTML = inCabin()
      ? "Q / D ou flèches · clic pour marcher · <b>E</b> interagir · <b>Entrée</b> parler · <b>1-6</b> emotes"
      : "ZQSD / clic pour bouger · <b>Maj</b> courir · <b>E</b> interagir · <b>Entrée</b> parler · <b>1-6</b> emotes · <b>M</b> carte · <b>J</b> quêtes · <b>B</b> bestiaire";
  }

  function rebuildWorld() {
    if (!S.me) return;
    if (inCabin()) return rebuildInterior();
    const { CENTER: c, HOUSE: h } = V;
    const { RECORDS: rs, BOARD: bd, FIRE: fi } = V;
    S.solids = [
      { x: c.x - 95, y: c.y - 38, w: 190, h: 72 },
      { x: h.x - 158, y: h.y - 50, w: 316, h: 50 },
      { x: rs.x - 6, y: rs.y - 8, w: 12, h: 10 },
      { x: bd.x - 70, y: bd.y - 14, w: 140, h: 18 },
      { x: fi.x - 32, y: fi.y - 16, w: 64, h: 30 },
    ];
    S.inter = [
      { kind: "source", x: c.x, y: c.y, r: 150, goX: c.x, goY: c.y + 70, label: "Regarder la Source", hit: { x: c.x - 105, y: c.y - 50, w: 210, h: 100 } },
      { kind: "house", x: h.x, y: h.y + 26, r: 70, label: S.me.owner ? "Rentrer chez toi" : "La Canne À Pêche", hit: { x: h.x - 190, y: h.y - 310, w: 380, h: 320 } },
      { kind: "records", x: rs.x, y: rs.y + 20, r: 60, label: "Lire les records de pêche", hit: { x: rs.x - 80, y: rs.y - 100, w: 160, h: 100 } },
      { kind: "board", x: bd.x, y: bd.y + 24, r: 75, label: "Lire le mur des mots", hit: { x: bd.x - 85, y: bd.y - 130, w: 170, h: 130 } },
      ...V.SEATS.map((s, i) => ({ kind: "seat", id: "seat" + i, x: s.x, y: s.y + 26, r: 40, label: "S'asseoir près du feu", seat: s })),
      ...World.interactables(),
      { kind: "stage", x: V.ARENA.x, y: V.STAGE.y + 130, r: 110, goX: V.ARENA.x, goY: V.STAGE.y + 120, label: "Loup-garou d'encre", hit: { x: V.STAGE.x - 20, y: V.STAGE.y - 150, w: V.STAGE.w + 40, h: 260 } },
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
    if (World.blocked(x, y)) return true; // bords du monde, mer, montagnes, bâtiments des régions
    if (pondDist(x, y) < 1.08) return true; // on ne marche pas sur l'eau
    return S.solids.some((b) => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 6 && y < b.y + b.h + 6);
  }

  // distance « normalisée » au centre de l'étang : 1 = le bord de l'eau
  const pondDist = (x, y) => Math.hypot((x - V.POND.x) / V.POND.rx, (y - V.POND.y) / V.POND.ry);
  const bobberOf = (e) => {
    if (pondDist(e.x, e.y) > 1.7) {
      const b = World.spotBobber(e);
      if (b) return b;
    }
    const k = 0.5 / Math.max(1, pondDist(e.x, e.y));
    return { x: V.POND.x + (e.x - V.POND.x) * k, y: V.POND.y + (e.y - V.POND.y) * k };
  };

  function setAct(act) {
    if (S.act === act) return;
    S.act = act;
    S.socket.emit("act", act);
  }
  function stopActivity() {
    S.fish = null;
    if (S.act) setAct(null);
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

  // si le jeu rame (moins de ~35 images/s) et que la personne n'a rien choisi, on passe en mode léger tout seul
  const perf = { frames: [], decided: false, since: performance.now() };
  function watchPerf(dtMs) {
    if (perf.decided || Ink.quality.explicit || Ink.quality.low) return;
    if (performance.now() - perf.since < 3000) return; // on laisse le temps au jeu de se charger
    perf.frames.push(dtMs);
    if (perf.frames.length < 150) return;
    perf.decided = true;
    const sorted = perf.frames.slice().sort((a, b) => a - b);
    if (sorted[Math.floor(sorted.length / 2)] > 28) {
      Ink.quality.auto();
      resize();
      soundButtons();
      toast("Le jeu ramait un peu : mode léger activé (bouton ⚡ en haut à droite pour changer).", 6000);
    }
  }

  let lastT = 0;
  function loop(now) {
    const t = now / 1000;
    if (lastT) watchPerf((t - lastT) * 1000);
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
    if (Werewolf.frozen()) S.target = S.pending = null; // on dort dans sa cabane
    else if (!S.panel && !chatOpen()) {
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
      const speed = !inside && S.keys.has("run") ? SPEED * 1.7 : SPEED;
      const step = Math.min(speed * dt, left);
      const nx = m.x + (dx / len) * step, ny = m.y + (dy / len) * step;
      let moved = false;
      if (!blocked(nx, m.y)) { m.x = nx; moved = true; }
      if (dy && !blocked(m.x, ny)) { m.y = ny; moved = true; }
      if (!moved) { S.target = null; m.moving = false; }
      if (Math.abs(dx) > 0.2) m.face = Math.sign(dx);
    }
    if (m.moving) {
      stopActivity();
      if (t - S.stepT > 0.3) { S.stepT = t; Sound.play("step", 1, inside); }
    }
    if ((m.x !== S.sentX || m.y !== S.sentY || S.zone !== S.sentZone) && t - S.lastSent > 0.066) {
      sendMove();
      S.lastSent = t;
    }
    m.act = S.act;

    // pêche : attendre que ça morde, puis ferrer à temps
    if (S.fish?.state === "wait" && t >= S.fish.biteAt) {
      S.fish = { state: "bite", until: t + 1 };
      Sound.play("plouf");
    } else if (S.fish?.state === "bite" && t > S.fish.until) {
      S.fish = { state: "wait", biteAt: t + 3 + Math.random() * 6 };
      Sound.play("miss");
      toast("Raté, il s'est échappé…");
    } else if (S.fish?.state === "reel" && t > S.fish.until) {
      S.fish = { state: "wait", biteAt: t + 3 + Math.random() * 6 };
    }

    Werewolf.update();

    // pierres musicales
    if (!inside) {
      const i = V.STONES.findIndex((s) => Math.hypot(s.x - m.x, s.y - m.y) < s.r + 4);
      if (i >= 0 && i !== S.lastStone) {
        S.stoneGlow[i] = t;
        Sound.play("note", 1, i);
        S.socket.emit("note", i);
      }
      S.lastStone = i;
    }

    S.near = null;
    let best = Infinity;
    for (const it of S.inter) {
      const d = inside ? Math.abs(it.x - m.x) : Math.hypot(it.x - m.x, it.y - m.y);
      if (d < it.r && d < best) { best = d; S.near = it; }
    }
    if (!inside && !S.near) {
      const pd = pondDist(m.x, m.y);
      if (pd < 1.5) S.near = { kind: "pond", x: m.x, y: m.y, r: 1, label: "" };
    }
    if (S.near?.kind === "pond" || S.near?.kind === "spot") S.near.label = !S.fish ? "Pêcher" : S.fish.state === "bite" ? "FERRER !" : "Ranger la canne";
    if (S.near?.kind === "seat" && S.act === "sit") S.near.label = "Se lever";
    // objets de quête et pages du Bestiaire à proximité
    if (!inside) {
      for (const qi of activeQuestItems()) {
        if (Math.hypot(qi.item.x - m.x, qi.item.y - m.y) < 55) {
          S.near = { kind: "qitem", id: qi.item.id, quest: qi.quest.id, x: qi.item.x, y: qi.item.y, r: 55, label: qi.step.verb + (qi.item.name ? ` : ${qi.item.name}` : "") };
        }
      }
      for (const pg of pagesLeft()) {
        if (Math.hypot(pg.x - m.x, pg.y - m.y) < 55) S.near = { kind: "page", id: pg.id, x: pg.x, y: pg.y, r: 55, label: "Ramasser la page du Bestiaire" };
      }
      // apparitions légendaires
      S.legendsNow = World.legends(t, S.sky, m);
      for (const L of S.legendsNow) {
        if (L.visible === false || S.seenLegends.has(L.id) || Math.hypot(L.x - m.x, L.y - m.y) > L.r) continue;
        S.seenLegends.add(L.id);
        S.socket.emit("legend:seen", L.id);
        Sound.play("reveal");
        toast(`✨ Tu as aperçu ${L.name} ! (B pour le Bestiaire)`, 5000);
      }
    } else S.legendsNow = [];
    if (Werewolf.blocksCabins() && (S.near?.kind === "cabin" || (S.near?.kind === "house" && S.me.owner))) S.near = null;
    const lgAction = !inside && Werewolf.nearAction(m);
    if (lgAction) S.near = lgAction;
    else if (Werewolf.frozen()) S.near = null;
    if (S.pending && sameInter(S.pending, S.near)) interact(S.near);
    // action du jour : l'Enxor le plus proche
    S.dayTarget = null;
    const dayAct = DAY_ACTIONS[unlocked()];
    if (dayAct && !Werewolf.frozen()) {
      let bd = inside ? 70 : 60;
      for (const e of S.ents.values()) {
        if (e === m || e.zone !== S.zone || !Werewolf.view(e).show) continue;
        const d = inside ? Math.abs(e.x - m.x) : Math.hypot(e.x - m.x, e.y - m.y);
        if (d < bd) { bd = d; S.dayTarget = e; }
      }
    }
    const prompt = $("prompt");
    const parts = [];
    if (S.near) parts.push(`E · ${S.near.label}`);
    if (S.dayTarget) parts.push(`F · ${dayAct.verb} ${S.players.get(S.dayTarget.id)?.pseudo || ""}`);
    prompt.hidden = !parts.length || !!S.panel;
    prompt.classList.toggle("urgent", S.fish?.state === "bite");
    prompt.textContent = parts.join("   ·   ");

    // ambiance sonore et musique
    const fireV = inside ? 0 : clamp(1 - Math.hypot(m.x - V.FIRE.x, m.y - V.FIRE.y) / 520, 0, 1);
    const waterV = inside ? 0 : clamp(1.6 - pondDist(m.x, m.y) / 2.2, 0, 1);
    Sound.ambience({ fire: fireV, water: waterV, crickets: !inside && S.sky.dark > 0.3 ? 0.7 : 0 });
    // région traversée : bandeau d'arrivée et musique de la région
    const reg = inside ? null : World.regionAt(m.x, m.y);
    if (reg && reg.id !== S.region) {
      if (S.region) showRegion(reg);
      S.region = reg.id;
    }
    Sound.setMood(inside ? "inside" : reg.mood || (S.sky.dark > 0.3 ? "night" : "day"));

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
        if (e.zone === "village" && e.moving && t - e.stepT > 0.2 && Werewolf.view(e).show) {
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
      Sound.play("firework", hearing(x, y + 200) * 0.8);
    }
    // braises du feu de camp
    if (!inside && Math.random() < dt * 6) {
      S.sparks.push({ x: V.FIRE.x + (Math.random() - 0.5) * 20, y: V.FIRE.y - 30, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 40, life: 1.4, max: 1.4, color: "#e9b04a" });
    }
    for (const p of S.sparks) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + (p.glow ? 40 * dt : 0);
    }
    S.sparks = S.sparks.filter((p) => p.life > 0);
    S.pops = S.pops.filter((p) => t - p.t < (p.dur || 1.4));
    if (!inside) updateCrows(dt, t);

    // lucioles la nuit, autour du joueur
    if (!inside && S.sky.dark > 0.3 && !Ink.quality.low) {
      while (S.fireflies.length < 18) S.fireflies.push({ x: m.x + (Math.random() - 0.5) * 900, y: m.y + (Math.random() - 0.5) * 600, ph: Math.random() * 10 });
      for (const f of S.fireflies) {
        f.x += Math.sin(t * 0.7 + f.ph) * 12 * dt;
        f.y += Math.cos(t * 0.9 + f.ph * 1.3) * 10 * dt;
        if (Math.abs(f.x - m.x) > 700 || Math.abs(f.y - m.y) > 500) { f.x = m.x + (Math.random() - 0.5) * 900; f.y = m.y + (Math.random() - 0.5) * 600; }
      }
    } else S.fireflies.length = 0;
  }

  // ---------- Corbeaux ----------

  function crowSpot() {
    for (let i = 0; i < 40; i++) {
      const x = 200 + Math.random() * (V.W - 400), y = 200 + Math.random() * (V.H - 400);
      if (!blocked(x, y) && pondDist(x, y) > 1.3) return { x, y };
    }
    return { x: V.CENTER.x + 300, y: V.CENTER.y + 300 };
  }

  function spawnCrows() {
    S.crows = Array.from({ length: 10 }, () => ({ ...crowSpot(), z: 0, state: "ground", face: 1, peck: false, timer: Math.random() * 3, ph: Math.random() * 9, vx: 0, vy: 0 }));
  }

  function updateCrows(dt, t) {
    const people = [...S.ents.values()].filter((e) => e.zone === "village");
    for (const c of S.crows) {
      c.timer -= dt;
      if (c.state === "ground") {
        if (c.timer <= 0) { c.peck = !c.peck; c.timer = 0.6 + Math.random() * 2; if (Math.random() < 0.3) c.face *= -1; }
        const scare = people.find((e) => Math.hypot(e.x - c.x, e.y - c.y) < 110);
        if (scare) {
          const a = Math.atan2(c.y - scare.y, c.x - scare.x) + (Math.random() - 0.5);
          Object.assign(c, { state: "fly", vx: Math.cos(a) * 260, vy: Math.sin(a) * 200, timer: 1.6 + Math.random() * 1.4 });
          c.face = Math.sign(c.vx) || 1;
          const v = hearing(c.x, c.y);
          Sound.play("flap", v);
          if (Math.random() < 0.6) Sound.play("caw", v);
        }
      } else if (c.state === "fly") {
        c.x = clamp(c.x + c.vx * dt, 60, V.W - 60);
        c.y = clamp(c.y + c.vy * dt, 80, V.H - 60);
        c.z += (110 - c.z) * Math.min(1, dt * 3);
        if (c.timer <= 0) {
          const spot = crowSpot();
          const a = Math.atan2(spot.y - c.y, spot.x - c.x);
          Object.assign(c, { state: "land", tx: spot.x, ty: spot.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 });
          c.face = Math.sign(c.vx) || 1;
        }
      } else {
        const d = Math.hypot(c.tx - c.x, c.ty - c.y);
        if (d < 10) Object.assign(c, { state: "ground", z: 0, timer: 1 });
        else {
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.z = Math.min(c.z, Math.max(0, d * 0.4));
        }
      }
    }
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
    L.push({ x: V.FIRE.x, y: V.FIRE.y - 20, r: 300 + Math.sin(performance.now() / 90) * 10, k: 1, color: "rgba(255,140,50,.35)" });
    L.push({ x: V.BOARD.x, y: V.BOARD.y - 60, r: 120, k: 0.6 });
    L.push({ x: (V.STONES[0].x + V.STONES[7].x) / 2, y: V.STONES[3].y, r: 220, k: 0.6, color: "rgba(150,120,230,.18)" });
    for (const e of S.ents.values()) if (e.zone === "village" && vis(e.x, e.y)) L.push({ x: e.x, y: e.y - 20, r: 90, k: 0.7 });
    if (vis(S.ball.x, S.ball.y)) L.push({ x: S.ball.x, y: S.ball.y, r: 60, k: 0.4 });
    L.push(...World.lights(vis));
    return L;
  }

  // ---------- Rendu ----------

  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Ink.quality.dpr();
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
  }
  window.addEventListener("resize", resize);
  resize();

  function villageCamera() {
    const m = me();
    const WW = World.W, WH = World.H;
    return {
      x: Math.round(vw > WW ? (WW - vw) / 2 : clamp(m.x - vw / 2, 0, WW - vw)),
      y: Math.round(vh > WH ? (WH - vh) / 2 : clamp(m.y - vh / 2 - 40, 0, WH - vh)),
    };
  }

  function showRegion(reg) {
    const b = $("region-banner");
    b.replaceChildren(el("strong", { text: reg.name }), el("span", { text: reg.sub }));
    b.hidden = false;
    b.classList.remove("show");
    void b.offsetWidth;
    b.classList.add("show");
    clearTimeout(showRegion.timer);
    showRegion.timer = setTimeout(() => (b.hidden = true), 4200);
    Sound.play("bell", 0.5);
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
    const fishing = e.act === "fish" && e.zone === "village";
    const face = fishing ? Math.sign(bobberOf(e).x - e.x) || 1 : e.face;
    const look = e.zone === "village" ? Werewolf.entLook(e.id) : null;
    const opts = { seed: e.seed, color: p?.color, moving: e.moving, face, rod: p?.owner || fishing, emote: e.emote, et, eyes: look?.eyes, wear: p?.wear };
    if (fishing) drawLine(e, face, t);
    const sy = e.act === "sit" ? 0.82 : 1;
    ctx.save();
    if (look?.alpha) ctx.globalAlpha = look.alpha;
    ctx.translate(e.x, e.y);
    ctx.scale(scale, scale * sy);
    Ink.enxor(ctx, 0, 0, t, opts);
    ctx.restore();
  }

  // fil de pêche du bout de la canne jusqu'au bouchon
  function drawLine(e, face, t) {
    const b = bobberOf(e);
    const mine = e.id === S.me?.id;
    const bite = mine && S.fish?.state === "bite";
    const by = b.y + (bite ? 4 + Math.sin(t * 30) * 3 : Math.sin(t * 2 + e.seed) * 1.5);
    const tipX = e.x + face * 38, tipY = e.y - 50;
    ctx.save();
    ctx.strokeStyle = Ink.INK;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo((tipX + b.x) / 2, Math.max(tipY, by) + 20, b.x, by - 4);
    ctx.stroke();
    ctx.fillStyle = "#b3261e";
    ctx.beginPath();
    ctx.arc(b.x, by - 4, 4, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = Ink.PAPER;
    ctx.beginPath();
    ctx.arc(b.x, by - 4, 4, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    if (bite) {
      ctx.strokeStyle = "rgba(239,229,208,.8)";
      ctx.beginPath();
      ctx.ellipse(b.x, by, 10 + Math.sin(t * 20) * 3, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // effets des actions du jour : morsure (gouttes de sang) et souffle de feu
  function drawFx(t, scale = 1) {
    S.fx = S.fx.filter((f) => t - f.t < 1.3);
    for (const f of S.fx) {
      const a = S.ents.get(f.from), b = S.ents.get(f.to);
      if (!a || !b || a.zone !== S.zone || b.zone !== S.zone) continue;
      const age = t - f.t;
      ctx.save();
      if (f.type === "bite") {
        ctx.fillStyle = "#b3261e";
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 2;
          const d = 8 + age * 40;
          ctx.globalAlpha = Math.max(0, 1 - age);
          ctx.beginPath();
          ctx.ellipse(b.x + Math.cos(ang) * d, b.y - 22 * scale + Math.sin(ang) * d * 0.6 + age * age * 30, 2.6, 3.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = Math.max(0, 1 - age);
        Ink.word(ctx, "CROC !", b.x, b.y - 70 * scale - age * 20, 18, "#b3261e", 800);
      } else if (["shoe", "blood", "potion", "food", "kiss", "flower", "star"].includes(f.type)) {
        // une petite icône qui vole de l'un à l'autre, puis éclate
        const k = Math.min(1, age * 2);
        const x = a.x + (b.x - a.x) * k, y = a.y - 30 * scale + (b.y - a.y) * k - Math.sin(k * Math.PI) * 60;
        ctx.globalAlpha = Math.max(0, 1.3 - age);
        if (f.type === "shoe") {
          ctx.fillStyle = "#e0662f"; ctx.strokeStyle = Ink.INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (f.type === "blood") {
          ctx.fillStyle = "#b3261e";
          ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.quadraticCurveTo(x + 9, y + 2, x, y + 6); ctx.quadraticCurveTo(x - 9, y + 2, x, y - 12); ctx.fill();
        } else if (f.type === "food") {
          // onigiri : triangle de riz avec sa feuille d'algue
          ctx.fillStyle = "#f2ead8"; ctx.strokeStyle = Ink.INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x + 11, y + 8); ctx.lineTo(x - 11, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#2f4a3a"; ctx.fillRect(x - 5, y + 1, 10, 7);
        } else if (f.type === "kiss") {
          Ink.heart(ctx, x, y, 9, "#d36b9c");
        } else if (f.type === "flower") {
          for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2 + age * 4; ctx.fillStyle = "#f2c1cf"; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#e9b04a"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        } else if (f.type === "star") {
          Ink.halo(ctx, "rgba(255,241,176,1)", x, y, 18);
          ctx.fillStyle = "#fff6d0";
          ctx.beginPath();
          for (let p = 0; p < 10; p++) { const a = -Math.PI / 2 + (p * Math.PI) / 5, rr = p % 2 ? 4 : 10; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          ctx.fill();
        } else {
          ctx.fillStyle = "#7cd15a"; ctx.strokeStyle = Ink.INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillRect(x - 3, y - 16, 6, 7);
        }
        if (k >= 1) {
          const colors = {
            shoe: ["#e0662f", "#5bb3a0", "#d36b9c"], blood: ["#b3261e", "#8e1b2b"], potion: ["#7cd15a", "#b48be0", "#5bb3a0"],
            food: ["#f2ead8", "#2f4a3a"], kiss: ["#d36b9c", "#f2c1cf", "#b3261e"], flower: ["#f2c1cf", "#7cd15a", "#e9b04a"], star: ["#fff6d0", "#e9b04a", "#8fb8ff"],
          }[f.type];
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath(); ctx.arc(b.x + Math.cos(ang) * (age * 40), b.y - 22 * scale + Math.sin(ang) * age * 28, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (f.type === "paint") {
        const colors = ["#e0662f", "#3e7cb1", "#5b8c5a", "#d36b9c", "#e9b04a", "#7d5ba6"];
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 + f.t;
          const d = 10 + Math.min(1, age * 3) * 30;
          ctx.globalAlpha = Math.max(0, 1 - age * 0.8);
          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.ellipse(b.x + Math.cos(ang) * d, b.y - 22 * scale + Math.sin(ang) * d * 0.7, 5, 3.5, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = Math.max(0, 1 - age);
        Ink.word(ctx, "SPLAF !", b.x, b.y - 70 * scale - age * 20, 18, "#7d5ba6", 800);
      } else {
        for (let k = 0; k < 14; k++) {
          const p = Math.min(1, age * 1.6 + k * 0.03);
          const x = a.x + (b.x - a.x) * p + Math.sin(k * 3 + t * 20) * 6, y = a.y - 22 * scale + (b.y - a.y) * p + Math.cos(k * 2 + t * 18) * 6;
          ctx.globalAlpha = Math.max(0, 1 - age) * (1 - k / 16);
          Ink.halo(ctx, "rgba(224,102,47,1)", x, y, 13);
          Ink.halo(ctx, "rgba(255,241,176,1)", x, y, 6);
        }
      }
      ctx.restore();
    }
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
    World.drawGround(ctx, cam, vw, vh, S.bg);

    ctx.fillStyle = Ink.INK;
    for (const f of S.footprints) {
      ctx.globalAlpha = 0.35 * (1 - (t - f.t) / 4);
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.s * 1.3, f.s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    Werewolf.drawGround(ctx, t);

    const vis = (x, y) => x > cam.x - 260 && x < cam.x + vw + 260 && y > cam.y - 60 && y < cam.y + vh + 480;
    const here = [...S.ents.values()].filter((e) => e.zone === "village" && vis(e.x, e.y) && Werewolf.view(e).show);
    if (vis(V.POND.x, V.POND.y)) V.drawPond(ctx, t, S.sky.dark);
    if (vis(V.STONES[3].x, V.STONES[3].y)) V.drawStones(ctx, t, S.stoneGlow);
    const items = [];
    if (vis(V.RECORDS.x, V.RECORDS.y)) items.push({ y: V.RECORDS.y, draw: () => V.drawRecordsSign(ctx, t) });
    if (vis(V.FIRE.x, V.FIRE.y)) items.push({ y: V.FIRE.y, draw: () => V.drawFire(ctx, t) });
    if (vis(V.BOARD.x, V.BOARD.y)) items.push({ y: V.BOARD.y, draw: () => V.drawBoard(ctx, t, S.wall.length) });
    for (const c of S.crows) if (vis(c.x, c.y)) items.push({ y: c.y, draw: () => V.drawCrow(ctx, c, t) });
    items.push(...Werewolf.items(ctx, t, vis));
    items.push({ y: 99999, draw: () => Werewolf.drawRaven(ctx, t) });
    const talked = new Set(S.players.get(S.me.id)?.stats?.npcs || []);
    const worldItems = World.items(ctx, t, vis, talked, me());
    items.push(...worldItems);
    for (const qi of activeQuestItems()) if (vis(qi.item.x, qi.item.y)) items.push({ y: qi.item.y, draw: () => drawQuestItem(qi, t) });
    for (const pg of pagesLeft()) if (vis(pg.x, pg.y)) items.push({ y: pg.y, draw: () => drawPage(pg, t) });
    const air = [];
    for (const L of S.legendsNow) {
      if (!vis(L.x, L.y - 300)) continue;
      if (L.air) air.push(L); else items.push({ y: L.y, draw: () => L.draw(ctx) });
    }
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
    for (const L of air) L.draw(ctx);
    drawFx(t);
    World.overlay(ctx, cam, vw, vh, t, me());

    // nuit : tout s'assombrit sauf autour des lumières
    V.drawNight(ctx, cam, vw, vh, dpr, S.sky, villageLights(cam));
    Werewolf.overlay(ctx, vw, vh, dpr, t, { x: me().x - cam.x, y: me().y - 20 - cam.y });
    ctx.setTransform(dpr, 0, 0, dpr, -cam.x * dpr, -cam.y * dpr);

    ctx.save();
    ctx.globalCompositeOperation = S.sky.dark > 0.2 ? "lighter" : "source-over";
    for (const f of S.fireflies) {
      ctx.globalAlpha = 0.5 + Math.sin(t * 3 + f.ph) * 0.5;
      Ink.halo(ctx, "rgba(255,220,120,1)", f.x, f.y, 10);
    }
    ctx.globalAlpha = 1;
    for (const p of S.sparks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.glow ? 3 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    for (const p of S.pops) {
      const k = (t - p.t) / (p.dur || 1.4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      Ink.word(ctx, p.text, p.x, p.y - k * 30, 18, p.color || "#e0662f");
      ctx.restore();
    }

    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      if (vis(pl.x, pl.y)) Ink.label(ctx, p.pseudo, pl.x, pl.y - 150, { size: 13, dot: p.cabin.color });
    }
    for (const it of worldItems) it.label?.();
    for (const e of here) {
      if (Werewolf.view(e).name) drawOverheads(e, t);
      else if (e.chat && performance.now() < e.chatUntil) Ink.bubble(ctx, e.chat, e.x, e.y - 68);
    }
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
    drawFx(t, INSIDE_SCALE);
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
    } else if (e.key.toLowerCase() === "f" && S.dayTarget && performance.now() - S.lastDayAct > 1200) {
      S.lastDayAct = performance.now();
      S.socket.emit("dayact", S.dayTarget.id);
    } else if (e.key.toLowerCase() === "t") {
      openPanel({ type: "trophies" });
    } else if (e.key.toLowerCase() === "m") {
      openPanel({ type: "map" });
    } else if (e.key.toLowerCase() === "j") {
      openPanel({ type: "quests" });
    } else if (e.key.toLowerCase() === "b") {
      openPanel({ type: "bestiary" });
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
    if (it.kind === "lg-door") return Werewolf.doAction(it);
    if ((it.kind === "cabin" || it.kind === "house") && Werewolf.blocksCabins()) {
      if (it.kind === "cabin" || S.me.owner) return toast("Pas pendant une partie de loup-garou : on reste dans le village !");
    }
    if (it.kind === "pond" || it.kind === "spot") return fishAction();
    if (it.kind === "npc") return openNpc(it.id);
    if (it.kind === "qitem") {
      S.socket.emit("quest:collect", { quest: it.quest, item: it.id }, (res) => {
        if (!res?.ok) return toast("Rien ici…");
        Sound.play("drop");
        toast(res.line || (res.name ? `Tu as trouvé ${res.name}.` : "C'est fait !"), 4000);
      });
      return;
    }
    if (it.kind === "page") {
      S.socket.emit("page:take", it.id);
      const pg = S.pages.find((p) => p.id === it.id);
      Sound.play("reveal");
      toast(`📜 Page du Bestiaire : ${pg?.name}. Appuie sur B pour la lire.`, 5000);
      return;
    }
    if (it.kind === "seat") return toggleSeat(it.seat);
    if (it.kind !== "frame") Sound.play("click");
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
    else if (type === "records") renderRecords(body);
    else if (type === "stage") Werewolf.renderPanel(body);
    else if (type === "trophies") renderTrophies(body);
    else if (type === "npc") renderNpc(body);
    else if (type === "quests") renderQuests(body);
    else if (type === "bestiary") renderBestiary(body);
    else if (type === "map") renderMap(body);
    else if (type === "board") renderBoard(body);
  }

  // ---------- Trophées et garde-robe ----------

  const SLOT_NAMES = { head: "Tête", face: "Visage", back: "Dos", aura: "Aura" };

  function renderTrophies(body) {
    const me = S.players.get(S.me.id) || S.me;
    const owned = new Set(me.trophies || []);
    const { trophies, cosmetics, slots } = S.catalog;
    const n = unlocked();
    const unlockedItems = new Set(trophies.filter((t) => owned.has(t.id)).flatMap((t) => t.reward));

    const preview = el("canvas", { class: "wear-preview", width: "180", height: "180" });
    const pg = preview.getContext("2d");
    pg.scale(2, 2);
    pg.fillStyle = Ink.PAPER;
    pg.fillRect(0, 0, 90, 90);
    Ink.enxor(pg, 45, 72, performance.now() / 1000, { seed: 1, color: me.color, wear: me.wear, face: 1 });

    body.append(
      el("p", { class: "eyebrow", text: `${owned.size} / ${trophies.length} trophées` }),
      el("h2", { class: "script", text: "Trophées" }),
      el("section", { class: "wardrobe" },
        preview,
        el("div", { class: "wear-slots" }, slots.map((slot) => {
          const items = Object.entries(cosmetics).filter(([id, c]) => c.slot === slot && unlockedItems.has(id));
          return el("div", { class: "row" },
            el("span", { class: "row-label", text: SLOT_NAMES[slot] }),
            el("div", { class: "seg" },
              el("button", { class: !me.wear?.[slot] ? "on" : "", text: "Rien", onclick: () => S.socket.emit("wear", { slot, item: null }) }),
              items.map(([id, c]) => el("button", { class: me.wear?.[slot] === id ? "on" : "", text: c.name, onclick: () => S.socket.emit("wear", { slot, item: id }) }))),
            !items.length && el("span", { class: "muted", text: "rien de débloqué" }));
        }))),
      el("div", { class: "trophy-grid" }, trophies.map((t) => {
        const has = owned.has(t.id);
        const hidden = t.secret && !has;
        const stat = me.stats?.[t.stat];
        const count = Array.isArray(stat) ? stat.length : stat || 0;
        let status = has ? "Obtenu !" : t.goal ? `${Math.min(count, t.goal)} / ${t.goal}` : "";
        if (!has && t.day) status = t.day === n ? ["Aujourd'hui seulement", status].filter(Boolean).join(" · ") : t.day < n ? "Effacé par l'encre" : `Le jour ${t.day} (${THEMES[t.day - 1]})`;
        return el("div", { class: "trophy" + (has ? " has" : "") + (hidden ? " secret" : "") },
          el("strong", { text: hidden ? "Trophée secret" : t.name }),
          el("p", { text: hidden ? "???" : t.desc }),
          el("small", { text: hidden ? "" : "Débloque : " + t.reward.map((c) => cosmetics[c]?.name).join(" + ") }),
          status && el("em", { text: status }));
      })),
    );
  }

  // ---------- Habitants et carte ----------

  // ---------- Quêtes et Bestiaire ----------

  const myPlayer = () => S.players.get(S.me.id) || S.me;
  const myQuests = () => myPlayer().quests || {};
  const myStats = () => myPlayer().stats || {};

  function activeQuestItems() {
    const out = [], st = myQuests();
    for (const q of S.questDefs) {
      const s = st[q.id];
      const step = s && !s.done && q.steps[s.step];
      if (step?.type !== "collect") continue;
      for (const item of step.items) if (!s.got.includes(item.id)) out.push({ quest: q, step, item });
    }
    return out;
  }
  const pagesLeft = () => { const got = new Set(myStats().pages || []); return S.pages.filter((p) => !got.has(p.id)); };

  function drawQuestItem({ step, item }, t) {
    const { x, y } = item;
    const bob = Math.sin(t * 3 + x) * 3;
    ctx.save();
    Ink.halo(ctx, "rgba(233,176,74,0.45)", x, y - 14, 46);
    if (step.look === "ember") {
      for (const [c, w, h] of [["#e0662f", 10, 26], ["#e9b04a", 6, 16]]) {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w, y - h * 0.7, x + Math.sin(t * 9) * 2, y - h + bob); ctx.quadraticCurveTo(x + w, y - h * 0.6, x + w, y); ctx.fill();
      }
    } else if (step.look === "whisper") {
      ctx.strokeStyle = "rgba(110,170,255,.8)";
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x, y - 20, 8 + k * 7 + Math.sin(t * 2 + k) * 2, t + k, t + k + 4); ctx.stroke(); }
      Ink.word(ctx, "…", x, y - 46 + bob, 18, "#6e9ade", 800);
    } else if (step.look === "stain") {
      Ink.splat(ctx, x, y - 4, 16, Ink.rng(Ink.hash(item.id)), Ink.INK, 0.9);
    } else if (step.look === "mark") {
      ctx.fillStyle = "#6b4426"; ctx.fillRect(x - 6, y - 40, 12, 40);
      ctx.strokeStyle = Ink.PAPER; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 34); ctx.lineTo(x + 5, y - 22); ctx.moveTo(x + 5, y - 34); ctx.lineTo(x - 5, y - 22); ctx.stroke();
    } else if (step.look === "totem") {
      ctx.strokeStyle = `rgba(124,209,90,${0.5 + Math.sin(t * 3) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, 34, 12, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      // objet humain qui brille
      ctx.fillStyle = "#cfc3ad"; ctx.strokeStyle = Ink.INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x, y - 6, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      const s = 5 + Math.sin(t * 6 + x) * 3;
      ctx.beginPath(); ctx.moveTo(x + 8, y - 20 - s); ctx.lineTo(x + 10, y - 20); ctx.lineTo(x + 8, y - 20 + s); ctx.lineTo(x + 6, y - 20); ctx.fill();
    }
    ctx.restore();
  }

  function drawPage(pg, t) {
    const { x, y } = pg;
    const bob = Math.sin(t * 2 + x) * 4;
    ctx.save();
    Ink.halo(ctx, "rgba(246,239,213,0.5)", x, y - 24, 54);
    Ink.shadow(ctx, x, y + 2, 12, 4, 0.25);
    ctx.translate(x, y - 26 + bob);
    ctx.rotate(Math.sin(t * 1.5 + x) * 0.15);
    ctx.fillStyle = "#f2ead8"; ctx.strokeStyle = Ink.INK; ctx.lineWidth = 1.6;
    ctx.fillRect(-11, -14, 22, 28); ctx.strokeRect(-11, -14, 22, 28);
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-7, -8 + k * 6); ctx.lineTo(7, -8 + k * 6); ctx.stroke(); }
    ctx.restore();
  }

  function openNpc(id) {
    const n = World.npcs.find((x) => x.id === id);
    if (!n) return;
    const st = myQuests();
    const given = S.questDefs.find((q) => q.giver === id);
    const finishing = S.questDefs.filter((q) => {
      const s = st[q.id];
      const step = s && !s.done && q.steps[s.step];
      return step?.type === "return" && step.npc === id;
    });
    let lines = [...n.lines], offer = null, done = null;
    if (finishing.length) { lines = finishing.flatMap((q) => q.done); done = finishing.map((q) => q.name); }
    else if (given && !st[given.id]) { lines.push(given.offer); offer = given.id; }
    else if (given && !st[given.id].done) lines = [n.lines[0], given.remind];
    S.socket.emit("npc:talk", id);
    Sound.play("chat");
    openPanel({ type: "npc", id, lines, line: 0, offer, done });
  }

  function renderQuests(body) {
    const st = myQuests();
    body.append(el("p", { class: "eyebrow", text: "Journal" }), el("h2", { class: "script", text: "Les quêtes" }));
    const list = el("div", { class: "quest-list" });
    for (const q of S.questDefs) {
      const s = st[q.id];
      const giver = World.npcs.find((n) => n.id === q.giver);
      const reg = World.REGIONS.find((r) => r.id === giver?.region);
      let status, cls = "";
      if (!s) { status = `Parle à ${giver?.name} (${reg?.name}) pour la commencer.`; cls = "todo"; }
      else if (s.done) { status = "Terminée !"; cls = "done"; }
      else {
        const step = q.steps[s.step];
        const prog = step.type === "collect" ? ` (${s.got.length}/${step.items.length})` : step.type === "fish" ? ` (${s.count}/${step.count})` : "";
        status = step.text + prog;
        cls = "active";
      }
      list.append(el("div", { class: "quest " + cls }, el("strong", { text: (s?.done ? "✓ " : "") + q.name }), el("span", { text: status })));
    }
    body.append(list);
  }

  function renderBestiary(body) {
    const got = new Set(myStats().pages || []);
    const seen = S.seenLegends;
    body.append(
      el("p", { class: "eyebrow", text: `${got.size} / ${S.pages.length} pages retrouvées · ${seen.size} apparitions` }),
      el("h2", { class: "script", text: "Le Bestiaire de Mythras" }),
      el("p", { class: "muted", text: "Les quatorze Enfants de Mythras. Le livre a été déchiré : ses pages sont éparpillées dans tout le monde, elles brillent faiblement. Certaines créatures se montrent aussi, si on est au bon endroit au bon moment…" }),
      el("div", { class: "bestiary" }, S.pages.map((pg) => {
        const has = got.has(pg.id);
        return el("details", { class: "beast" + (has ? " has" : "") },
          el("summary", {}, el("strong", { text: has ? pg.name : "???" }), el("em", { text: pg.kind }), seen.has(pg.id) && el("span", { class: "seen", text: "✨ aperçu" })),
          has ? el("p", { text: pg.short }) : el("p", { class: "muted", text: "Page introuvable pour l'instant." }),
          has && el("p", { class: "long", text: pg.long }));
      })),
    );
  }

  function renderNpc(body) {
    const n = World.npcs.find((x) => x.id === S.panel.id);
    if (!n) return closePanel();
    const i = S.panel.line;
    const lines = S.panel.lines || n.lines;
    const portrait = el("canvas", { class: "npc-portrait", width: "160", height: "160" });
    const pg = portrait.getContext("2d");
    pg.scale(2, 2);
    pg.fillStyle = "#e8dcc4";
    pg.fillRect(0, 0, 80, 80);
    pg.translate(40, 66);
    if (n.small) pg.scale(0.8, 0.8);
    Ink.enxor(pg, 0, 0, performance.now() / 1000, { seed: n.x % 97, color: n.color, wear: n.wear, face: 1 });
    const last = i >= lines.length - 1;
    const offer = S.panel.offer && S.questDefs.find((q) => q.id === S.panel.offer);
    let actions;
    if (!last) actions = [el("button", { class: "btn", text: "Suite", onclick: () => { S.panel.line++; Sound.play("click"); renderPanel(); } })];
    else if (offer) {
      actions = [
        el("button", { class: "btn", text: "Accepter la quête", onclick: () => {
          S.socket.emit("quest:accept", offer.id);
          Sound.play("win");
          toast(`📜 Nouvelle quête : « ${offer.name} ». Appuie sur J pour le journal.`, 5000);
          closePanel();
        } }),
        el("button", { class: "btn ghost", text: "Plus tard", onclick: closePanel }),
      ];
    } else actions = [el("button", { class: "btn", text: "Au revoir", onclick: closePanel })];
    body.append(
      el("div", { class: "npc" },
        portrait,
        el("div", {},
          el("p", { class: "eyebrow", text: n.title }),
          el("h2", { class: "script", text: n.name }),
          S.panel.done && i === 0 && el("p", { class: "quest-done", text: `✓ Quête terminée : ${S.panel.done.join(", ")}` }),
          el("p", { class: "npc-line", text: lines[i] }),
          el("div", { class: "actions" }, ...actions, el("span", { class: "muted", text: `${i + 1} / ${lines.length}` })))),
    );
  }

  function renderMap(body) {
    const c = el("canvas", { class: "world-map", width: "1040", height: "920" });
    const g = c.getContext("2d");
    World.drawMap(g, 1040, 920, S.players, S.me.id, [...S.ents.values()]);
    body.append(el("p", { class: "eyebrow", text: "Le monde d'Enxor" }), el("h2", { class: "script", text: "La carte" }), c);
  }

  // ---------- Activités du village ----------

  function fishAction() {
    const t = performance.now() / 1000;
    if (!S.fish) {
      S.fish = { state: "wait", biteAt: t + 3 + Math.random() * 6 };
      setAct("fish");
      Sound.play("plouf", 0.5);
    } else if (S.fish.state === "bite") {
      S.fish = { state: "reel", until: t + 3 };
      S.socket.emit("fish:catch");
    } else if (S.fish.state === "wait") {
      stopActivity();
    }
  }

  function toggleSeat(seat) {
    if (S.act === "sit") return stopActivity();
    const m = me();
    m.x = seat.x;
    m.y = seat.y + 6;
    m.face = Math.sign(V.FIRE.x - seat.x) || 1;
    sendMove(true);
    setTimeout(() => setAct("sit"), 80);
    Sound.play("sit");
  }

  const ago = (at) => {
    const m = Math.round((Date.now() - at) / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    const h = Math.round(m / 60);
    return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
  };

  function renderRecords(body) {
    const recs = Object.entries(S.fishing.records).sort((a, b) => b[1].size - a[1].size);
    body.append(
      el("p", { class: "eyebrow", text: "L'étang" }),
      el("h2", { class: "script", text: "Records de pêche" }),
      el("p", { class: "muted", text: "Approche-toi de l'eau et appuie sur E pour lancer ta ligne. Quand le bouchon plonge, appuie vite sur E pour ferrer. Chaque vestige débloqué ajoute son poisson dans l'étang, et celui du jour est plus rare." }),
      recs.length
        ? el("table", { class: "records" },
          el("tr", {}, el("th", { text: "Prise" }), el("th", { text: "Taille" }), el("th", { text: "Par" })),
          recs.map(([name, r]) => el("tr", {}, el("td", { text: name }), el("td", { text: `${r.size} cm` }), el("td", { text: r.pseudo }))))
        : el("p", { class: "muted", text: "Aucun record pour l'instant. À toi de jouer !" }),
      S.fishing.log.length > 0 && el("h3", { text: "Dernières prises" }),
      el("ul", { class: "feed" }, S.fishing.log.slice(0, 10).map((c) =>
        el("li", {}, el("b", { text: c.pseudo, style: `color:${c.color}` }), ` · ${c.name}${c.junk ? "" : ` (${c.size} cm)`} · `, el("span", { class: "muted", text: ago(c.at) })))),
    );
  }

  function renderBoard(body) {
    const input = el("input", { maxlength: "120", placeholder: "Un mot pour la team…", autocomplete: "off" });
    const form = el("form", { class: "post-form", onsubmit: (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      S.socket.emit("wall:post", text);
      Sound.play("post");
      input.value = "";
    } }, input, el("button", { class: "btn", type: "submit", text: "Épingler" }));
    body.append(
      el("p", { class: "eyebrow", text: "Sur la place" }),
      el("h2", { class: "script", text: "Le mur des mots" }),
      el("p", { class: "muted", text: "Laisse un petit mot pour la team : un encouragement, une blague, un avis sur un dessin… (un message toutes les 20 secondes)" }),
      form,
      el("ul", { class: "wall" }, S.wall.map((m) =>
        el("li", {}, el("p", { text: m.text }), el("span", {}, el("b", { text: m.pseudo, style: `color:${m.color}` }), ` · ${ago(m.at)}`)))),
    );
    setTimeout(() => input.focus(), 50);
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
          el("span", { class: "muted", text: res ? `Ton record : ${res.best} · ${"★".repeat(res.stars)}${"☆".repeat(3 - res.stars)}` : d === n ? "Le vestige du jour, jouable jusqu'à minuit" : "Tu ne l'as pas joué" })),
        d === n
          ? el("button", { class: "btn", text: "Jouer", onclick: () => openGame(d) })
          : el("span", { class: "faded", text: "Effacé par l'encre" })));
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
    if (!game || day !== unlocked()) return; // jeux éphémères : seulement le jeu du jour
    closePanel();
    stopActivity();
    S.keys.clear();
    Sound.ambience({ fire: 0, water: 0, crickets: 0 });
    Sound.setMood(game.music || "game");
    S.game = { day, game, stop: null };
    $("game").hidden = false;
    $("hud").hidden = true;
    $("game-title").textContent = `Jour ${day} · ${THEMES[day - 1]}`;
    gameIntro();
  }

  function stopGame() {
    if (S.game?.stop) S.game.stop();
    if (S.game) S.game.stop = null;
    Sound.stopLoops();
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
    Sound.play("start");
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
        day === unlocked()
          ? el("button", { class: "btn", text: "Rejouer", onclick: startGame })
          : el("p", { class: "muted", text: "Minuit est passé : ce vestige s'est effacé." }),
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

  Werewolf.init({
    S, el, toast, me, hearing, inCabin, closePanel, renderPanel,
    get socket() { return S.socket; },
    teleport(x, y) {
      const m = me();
      if (!m || inCabin()) return;
      stopActivity();
      Object.assign(m, { x, y });
      S.target = S.pending = null;
      sendMove(true);
    },
    walkTo(x, y) {
      S.pending = null;
      S.target = { x, y };
    },
    forceVillage() {
      if (inCabin()) exitCabin();
    },
  });

  // mini-carte permanente (en haut à gauche)
  setInterval(() => {
    const c = $("minimap");
    if (!S.me || !me() || S.game) return;
    c.hidden = inCabin();
    if (c.hidden) return;
    const g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    World.drawMap(g, c.width, c.height, S.players, S.me.id, [...S.ents.values()], false);
  }, 400);
  $("minimap").addEventListener("click", () => S.me && openPanel({ type: "map" }));

  $("trophy-btn").addEventListener("click", (e) => {
    e.currentTarget.blur();
    if (S.me) openPanel({ type: "trophies" });
  });

  // boutons musique / sons (dans le village et pendant les jeux)
  function soundButtons() {
    const p = Sound.prefs;
    for (const box of document.querySelectorAll(".sound-toggles")) {
      box.replaceChildren(...[["music", "♪ Musique"], ["sfx", "🔈 Sons"]].map(([k, label]) =>
        el("button", { class: "sound-btn" + (p[k] ? "" : " off"), text: label, title: p[k] ? "Couper" : "Activer", onclick: (e) => {
          Sound.ensure();
          Sound.toggle(k);
          soundButtons();
          e.currentTarget?.blur();
        } })),
        // mode léger : moins de résolution et moins d'effets, pour les PC qui rament
        el("button", { class: "sound-btn" + (Ink.quality.low ? "" : " off"), text: "⚡ Léger", title: "Mode léger : plus fluide sur les petits PC", onclick: (e) => {
          Ink.quality.low = !Ink.quality.low;
          resize();
          soundButtons();
          toast(Ink.quality.low ? "Mode léger activé : moins d'effets, plus de fluidité." : "Mode léger désactivé.");
          e.currentTarget?.blur();
        } }));
    }
  }
  soundButtons();

  updateHelp();
  const saved = loadAuth();
  if (saved.teamCode && saved.pseudo && saved.token) {
    $("login-error").textContent = "Connexion…";
    connect(saved);
  } else {
    showLogin();
  }
})();
