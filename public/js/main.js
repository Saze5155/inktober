(() => {
  const $ = (id) => document.getElementById(id);
  const V = Village;
  const canvas = $("world");
  const ctx = canvas.getContext("2d");
  const AUTH_KEY = "enxor.auth";
  const SPEED = 230;
  const KEYMAP = { arrowup: "u", z: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", q: "l", a: "l", arrowright: "r", d: "r" };

  const S = {
    socket: null, me: null, players: new Map(), ents: new Map(), day: null, dayAt: 0,
    keys: new Set(), target: null, pending: null, near: null, panel: null,
    solids: [], inter: [], footprints: [], images: new Map(), bg: null, started: false,
    lastSent: 0, sentX: 0, sentY: 0,
  };

  if (location.hostname === "localhost") window.__enxor = S; // debug en local uniquement

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const me = () => S.me && S.ents.get(S.me.id);

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

  function makeEnt(id, x, y) {
    return { id, x, y, tx: x, ty: y, moving: false, face: 1, chat: null, chatUntil: 0, stepT: 0, seed: Ink.hash(id) % 1000 };
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
      for (const [id, x, y] of list) {
        if (id === S.me?.id) continue;
        let e = S.ents.get(id);
        if (!e) S.ents.set(id, (e = makeEnt(id, x, y)));
        e.tx = x;
        e.ty = y;
      }
    });
    socket.on("player:online", ({ id, x, y }) => {
      if (id !== S.me?.id) S.ents.set(id, makeEnt(id, x, y));
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
      if (S.panel?.type === "cabin" && S.panel.id === p.id) renderPanel();
    });
    socket.on("chat", ({ id, text }) => {
      const e = S.ents.get(id);
      if (e) { e.chat = text; e.chatUntil = performance.now() + 6000; }
    });
    socket.on("day", setDay);
    socket.on("disconnect", () => { $("hud-online").textContent = "Connexion perdue, reconnexion…"; });
  }

  function onInit(data, teamCode) {
    const prev = me();
    S.me = data.me;
    const auth = { teamCode, pseudo: data.me.pseudo, token: data.me.token };
    saveAuth(auth);
    S.socket.auth = auth; // pour que les reconnexions utilisent le jeton
    S.players = new Map(data.players.map((p) => [p.id, p]));
    S.ents = new Map(data.online.map(([id, x, y]) => [id, makeEnt(id, x, y)]));
    if (prev) Object.assign(me(), { x: prev.x, y: prev.y });
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
    if (S.panel && S.panel.type !== "lightbox") renderPanel();
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
    const n = S.day.unlocked;
    const remain = Math.max(0, Math.round(S.day.secondsToMidnight - (performance.now() - S.dayAt) / 1000));
    const title = n ? `Jour ${n} · ${THEMES[n - 1]}` : "Avant l'Inktober";
    let sub = `Prochain vestige dans ${pad(Math.floor(remain / 3600))}:${pad(Math.floor((remain % 3600) / 60))}:${pad(remain % 60)}`;
    if (n === 0) sub = "La Source s'éveille le 1er octobre";
    if (n >= 31) sub = "Les 31 vestiges sont remontés";
    $("hud-day").replaceChildren(el("strong", { text: title }), el("span", { text: sub }));
  }
  setInterval(updateDayHud, 1000);

  // ---------- Monde ----------

  const museumOpen = () => (S.day?.unlocked || 0) >= 31;

  function rebuildWorld() {
    if (!S.me) return;
    const { CENTER: c, HOUSE: h } = V;
    S.solids = [
      { x: c.x - 95, y: c.y - 38, w: 190, h: 72 },
      { x: h.x - 158, y: h.y - 50, w: 316, h: 50 },
    ];
    S.inter = [
      { kind: "source", x: c.x, y: c.y, r: 150, goX: c.x, goY: c.y + 70, label: "Regarder la Source", hit: { x: c.x - 105, y: c.y - 50, w: 210, h: 100 } },
      { kind: "house", x: h.x, y: h.y + 26, r: 70, label: "La Canne À Pêche", hit: { x: h.x - 190, y: h.y - 310, w: 380, h: 320 } },
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

  function blocked(x, y) {
    if (x < 20 || y < 40 || x > V.W - 20 || y > V.H - 20) return true;
    return S.solids.some((b) => x > b.x - 12 && x < b.x + b.w + 12 && y > b.y - 6 && y < b.y + b.h + 6);
  }

  const sameInter = (a, b) => a && b && a.kind === b.kind && a.id === b.id;

  function image(url) {
    let img = S.images.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      S.images.set(url, img);
    }
    return img;
  }

  function showcase(p) {
    const file = p.cabin.showcase != null && p.drawings[p.cabin.showcase];
    return file ? image("/drawings/" + file) : null;
  }

  // ---------- Boucle ----------

  let lastT = 0;
  function loop(now) {
    const t = now / 1000;
    const dt = Math.min(0.05, t - lastT || 0);
    lastT = t;
    update(dt, t);
    render(t);
    requestAnimationFrame(loop);
  }

  function update(dt, t) {
    const m = me();
    if (m) {
      let dx = 0, dy = 0;
      if (!S.panel && !chatOpen()) {
        if (S.keys.has("l")) dx--;
        if (S.keys.has("r")) dx++;
        if (S.keys.has("u")) dy--;
        if (S.keys.has("d")) dy++;
      }
      if (dx || dy) {
        S.target = null;
        S.pending = null;
      } else if (S.target) {
        const ddx = S.target.x - m.x, ddy = S.target.y - m.y, d = Math.hypot(ddx, ddy);
        if (d < 4) S.target = null;
        else { dx = ddx / d; dy = ddy / d; }
      }
      const len = Math.hypot(dx, dy);
      m.moving = len > 0;
      if (len) {
        const step = Math.min(SPEED * dt, S.target ? Math.hypot(S.target.x - m.x, S.target.y - m.y) : Infinity);
        const nx = m.x + (dx / len) * step, ny = m.y + (dy / len) * step;
        let moved = false;
        if (!blocked(nx, m.y)) { m.x = nx; moved = true; }
        if (!blocked(m.x, ny)) { m.y = ny; moved = true; }
        if (!moved) { S.target = null; m.moving = false; }
        if (Math.abs(dx) > 0.2) m.face = Math.sign(dx);
      }
      if ((m.x !== S.sentX || m.y !== S.sentY) && t - S.lastSent > 0.066) {
        S.socket.emit("move", { x: m.x, y: m.y });
        S.sentX = m.x;
        S.sentY = m.y;
        S.lastSent = t;
      }

      S.near = null;
      let best = Infinity;
      for (const it of S.inter) {
        const d = Math.hypot(it.x - m.x, it.y - m.y);
        if (d < it.r && d < best) { best = d; S.near = it; }
      }
      if (S.pending && sameInter(S.pending, S.near)) interact(S.near);
      const prompt = $("prompt");
      prompt.hidden = !S.near || !!S.panel;
      if (S.near) prompt.textContent = `E · ${S.near.label}`;
    }

    for (const e of S.ents.values()) {
      if (e === m) continue;
      const ddx = e.tx - e.x, ddy = e.ty - e.y;
      e.moving = Math.hypot(ddx, ddy) > 1.5;
      if (Math.abs(ddx) > 0.5) e.face = Math.sign(ddx);
      const k = Math.min(1, dt * 10);
      e.x += ddx * k;
      e.y += ddy * k;
    }

    for (const e of S.ents.values()) {
      if (e.moving && t - e.stepT > 0.2) {
        e.stepT = t;
        S.footprints.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y + 2, t, s: 2 + Math.random() * 2 });
      }
    }
    while (S.footprints.length && t - S.footprints[0].t > 4) S.footprints.shift();
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

  function camera() {
    const m = me();
    return {
      x: Math.round(vw > V.W ? (V.W - vw) / 2 : clamp(m.x - vw / 2, 0, V.W - vw)),
      y: Math.round(vh > V.H ? (V.H - vh) / 2 : clamp(m.y - vh / 2 - 40, 0, V.H - vh)),
    };
  }

  function render(t) {
    if (!me()) return;
    const cam = camera();
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
    const items = [];
    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      if (vis(pl.x, pl.y)) items.push({ y: pl.y, draw: () => V.drawCabin(ctx, pl.x, pl.y, p, S.ents.has(p.id), t, showcase(p)) });
    }
    if (vis(V.HOUSE.x, V.HOUSE.y)) items.push({ y: V.HOUSE.y, draw: () => V.drawHouse(ctx, t, museumOpen()) });
    if (vis(V.CENTER.x, V.CENTER.y)) {
      const n = S.day?.unlocked || 0;
      items.push({ y: V.CENTER.y, draw: () => V.drawSource(ctx, t, n ? `Jour ${n} · ${THEMES[n - 1]}` : "La Source dort") });
    }
    for (const e of S.ents.values()) {
      if (!vis(e.x, e.y)) continue;
      const p = S.players.get(e.id);
      items.push({ y: e.y, draw: () => Ink.enxor(ctx, e.x, e.y, t, { seed: e.seed, color: p?.color, moving: e.moving, face: e.face, rod: p?.owner }) });
    }
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());

    for (const p of S.players.values()) {
      if (p.plot == null) continue;
      const pl = V.plots[p.plot];
      if (vis(pl.x, pl.y)) Ink.label(ctx, p.pseudo, pl.x, pl.y - 150, { size: 13, dot: p.cabin.color });
    }
    const now = performance.now();
    for (const e of S.ents.values()) {
      const p = S.players.get(e.id);
      if (!p || !vis(e.x, e.y)) continue;
      Ink.label(ctx, p.pseudo, e.x, e.y - 58, { size: 14, dot: p.color });
      if (e.chat && now < e.chatUntil) Ink.bubble(ctx, e.chat, e.x, e.y - 68);
    }
  }

  // ---------- Contrôles ----------

  window.addEventListener("keydown", (e) => {
    if (!S.me || !$("login").hidden) return;
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
    const cam = camera();
    const x = e.clientX + cam.x, y = e.clientY + cam.y;
    const hit = S.inter.find((it) => x > it.hit.x && x < it.hit.x + it.hit.w && y > it.hit.y && y < it.hit.y + it.hit.h);
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

  // ---------- Panneaux ----------

  function interact(it) {
    S.target = null;
    S.pending = null;
    S.keys.clear();
    openPanel(it.kind === "cabin" ? { type: "cabin", id: it.id } : { type: it.kind });
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
    if (S.panel.type === "cabin") renderCabin(body, S.players.get(S.panel.id));
    else if (S.panel.type === "source") renderSource(body);
    else renderHouse(body);
  }

  const row = (label, control) => el("div", { class: "row" }, el("span", { class: "row-label", text: label }), control);

  function renderCabin(body, p) {
    const mine = p.id === S.me.id;
    const unlocked = S.day?.unlocked || 0;
    body.append(el("p", { class: "eyebrow", text: mine ? "Ta cabane" : "Cabane de" }), el("h2", { class: "script", text: p.pseudo }));

    if (mine) {
      const emit = (c) => S.socket.emit("cabin:update", c);
      const days = Object.keys(p.drawings).map(Number).sort((a, b) => a - b);
      const select = el("select", { onchange: (e) => emit({ showcase: e.target.value ? Number(e.target.value) : null }) },
        el("option", { value: "", text: days.length ? "Aucun dessin" : "Dépose d'abord un dessin" }),
        days.map((d) => {
          const o = el("option", { value: d, text: `Jour ${d} · ${THEMES[d - 1]}` });
          o.selected = p.cabin.showcase === d;
          return o;
        }));
      body.append(el("section", { class: "deco" },
        row("Couleur", el("div", { class: "swatches" }, V.COLORS.map((c) =>
          el("button", { class: "swatch" + (p.cabin.color === c ? " on" : ""), style: `--c:${c}`, "aria-label": c, onclick: () => emit({ color: c }) })))),
        row("Toit", el("div", { class: "seg" }, V.ROOFS.map(([v, l]) =>
          el("button", { class: p.cabin.roof === v ? "on" : "", text: l, onclick: () => emit({ roof: v }) })))),
        row("Vitrine", select)));
    }

    body.append(el("h3", { text: "Dessins d'Inktober" }));
    const gallery = el("div", { class: "gallery" });
    for (let d = 1; d <= 31; d++) {
      const file = p.drawings[d];
      const open = d <= unlocked;
      const slot = el("div", { class: "slot " + (file ? "filled" : open ? "empty" : "locked") },
        el("span", { class: "slot-day", text: d }),
        el("span", { class: "slot-theme", text: open ? THEMES[d - 1] : "???" }));
      if (file) {
        const src = "/drawings/" + file;
        slot.append(el("img", { src, alt: `Jour ${d} · ${THEMES[d - 1]}`, loading: "lazy", onclick: () => openLightbox(src) }));
      }
      if (mine && open) {
        slot.append(el("div", { class: "slot-actions" },
          el("button", { class: "btn tiny", text: file ? "Remplacer" : "Ajouter", onclick: () => pickDrawing(d) }),
          file && el("button", { class: "btn tiny ghost", text: "Retirer", onclick: () => deleteDrawing(d) })));
      }
      gallery.append(slot);
    }
    body.append(gallery);
  }

  function renderSource(body) {
    const n = S.day?.unlocked || 0;
    body.append(
      el("p", { class: "eyebrow", text: "La Source" }),
      el("h2", { class: "script", text: n ? THEMES[n - 1] : "Elle dort encore" }),
      el("p", { class: "lore", text: "Quand les humains ont disparu, leur encre a continué de couler. C'est d'ici que sont nés les Enxors. Chaque nuit à minuit, la Source fait remonter un vestige du monde d'avant." }),
      el("p", { class: "muted", text: "Le jeu de ce vestige arrive bientôt. En attendant, dépose ton dessin du jour dans ta cabane." }),
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
        toast("Dessin accroché dans ta cabane !");
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

  const saved = loadAuth();
  if (saved.teamCode && saved.pseudo && saved.token) {
    $("login-error").textContent = "Connexion…";
    connect(saved);
  } else {
    showLogin();
  }
})();
