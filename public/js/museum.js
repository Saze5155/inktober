// Le musée de la Canne À Pêche : une galerie en 3D (Three.js) de tous les dessins du mois.
// Tout est dessiné par le code : marbre, plâtre, cadres dorés, bannières, statues d'Enxors.
// Les images ne sont chargées que pour les travées proches du visiteur, et réduites en 512 px.
window.Museum = (() => {
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  let THREE = null;

  // ---------- textures dessinées au canvas ----------
  function canvasTex(w, h, paint, repeat) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    paint(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4;
    return t;
  }
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function marble(g, w, h) {
    const r = rnd(31);
    g.fillStyle = "#ece6d8"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(120,110,100,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 3, 3); }
    // veines grises qui serpentent
    for (let v = 0; v < 14; v++) {
      g.strokeStyle = `rgba(90,85,95,${0.08 + r() * 0.18})`; g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      let x = r() * w, y = 0;
      g.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 40; y += 10 + r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    // joints des dalles
    g.strokeStyle = "rgba(60,55,60,.25)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  }
  function plaster(g, w, h) {
    const r = rnd(77);
    g.fillStyle = "#e6dcc6"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(${140 + r() * 50},${120 + r() * 40},${90 + r() * 40},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 4 + r() * 18, 2 + r() * 8); }
    // quelques éclaboussures d'encre, très discrètes
    for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(29,26,32,.08)"; const x = r() * w, y = r() * h; for (let d = 0; d < 6; d++) { g.beginPath(); g.arc(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18, 1 + r() * 3, 0, Math.PI * 2); g.fill(); } }
  }
  function wood(g, w, h) {
    const r = rnd(5);
    g.fillStyle = "#5a3a24"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${30 + r() * 30},${15 + r() * 15},${5},${0.15 + r() * 0.2})`; g.fillRect(0, y, w, 1 + r() * 2); }
  }
  function banner(text, sub, color) {
    return canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,.18)"; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, h);
      g.fillStyle = "#efe5d0"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "800 92px 'Barlow Semi Condensed', sans-serif"; g.fillText(text, w / 2, h * 0.42);
      g.font = "600 36px 'Barlow Semi Condensed', sans-serif"; g.fillText(sub, w / 2, h * 0.8);
    });
  }
  function cartel(lines) {
    return canvasTex(256, 96, (g, w, h) => {
      g.fillStyle = "#f6efdc"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#c9a24a"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.fillStyle = "#1d1a20"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "800 30px 'Barlow Semi Condensed', sans-serif"; g.fillText(lines[0], w / 2, 34);
      g.font = "600 20px 'Barlow Semi Condensed', sans-serif"; g.fillText(lines[1] || "", w / 2, 70);
    });
  }

  // ---------- un Enxor en 3D (corps d'encre, yeux, goutte de couleur) ----------
  function enxorStatue(color, opts = {}) {
    const grp = new THREE.Group();
    const ink = new THREE.MeshStandardMaterial({ color: 0x1d1a20, roughness: 0.25, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), ink);
    body.scale.set(1, 1.05, 0.9); body.position.y = 1.2; grp.add(body);
    // les coulures d'encre en bas
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 10), ink);
      drip.position.set(Math.cos(a) * 0.7, 0.35, Math.sin(a) * 0.6); grp.add(drip);
    }
    const white = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), white);
      eye.position.set(sx * 0.35, 1.35, 0.78); eye.scale.set(1, 1.2, 0.6); grp.add(eye);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), black);
      pu.position.set(sx * 0.35, 1.32, 0.9); grp.add(pu);
    }
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.15 }));
    drop.position.y = 2.65; grp.add(drop);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 16), drop.material);
    tip.position.y = 2.9; grp.add(tip);
    if (opts.crown) {
      const gold = new THREE.MeshStandardMaterial({ color: 0xe9b04a, metalness: 0.8, roughness: 0.25, emissive: 0x3a2a00 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 24, 1, true), gold);
      ring.position.y = 2.25; grp.add(ring);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), gold); sp.position.set(Math.cos(a) * 0.5, 2.5, Math.sin(a) * 0.5); grp.add(sp); }
    }
    return grp;
  }

  // ---------- la visite ----------
  async function open({ players, themes, ownerName, onClose }) {
    if (!THREE) THREE = await import(THREE_URL);
    const root = document.createElement("div");
    root.className = "museum";
    root.innerHTML = `
      <div class="museum-hud">
        <button class="btn ghost museum-quit">← Sortir du musée</button>
        <div class="museum-where"></div>
        <select class="museum-go"></select>
      </div>
      <p class="museum-help">ZQSD / flèches pour marcher · glisser la souris pour regarder · Maj pour courir · clic sur un tableau pour l'admirer</p>
      <div class="museum-view" hidden><img alt=""><p></p><button class="btn">Fermer</button></div>`;
    document.body.append(root);
    const W = () => root.clientWidth, H = () => root.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(W(), H());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    root.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1410);
    scene.fog = new THREE.Fog(0x1a1410, 18, 60);
    const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 120);

    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a4030, 1.35));
    const sun = new THREE.DirectionalLight(0xffe2b0, 0.8); sun.position.set(4, 10, 2); scene.add(sun);

    const marbleTex = canvasTex(512, 512, marble, [1, 1]);
    const plasterTex = canvasTex(512, 512, plaster, [1, 1]);
    const woodTex = canvasTex(256, 256, wood, [1, 1]);
    const matFloor = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.35, metalness: 0.05 });
    const matWall = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 });
    const matWood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.75, roughness: 0.3 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.8 });
    const matPlaceholder = new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 0.9 });
    const disposables = [marbleTex, plasterTex, woodTex];

    // une boîte avec texture répétée selon sa taille
    function box(w, h, d, mat, x, y, z, rep) {
      const m = mat.clone();
      if (m.map && rep) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(rep[0], rep[1]); disposables.push(m.map); }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z); scene.add(mesh);
      return mesh;
    }
    const HALL_W = 22, HALL_D = 18, NAVE_W = 10, WALL_H = 6;
    // lambris : une bande de bois sombre en bas du mur, surmontée d'une baguette dorée
    function wainscot(x, zc, len) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, len), matDark); w.position.set(x, 0.5, zc); scene.add(w);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, len), matGold); rail.position.set(x, 1.03, zc); scene.add(rail);
    }

    // ---------- le hall d'entrée ----------
    box(HALL_W, 0.2, HALL_D, matFloor, 0, -0.1, HALL_D / 2, [HALL_W / 3, HALL_D / 3]);
    box(HALL_W, 0.3, HALL_D, matWood, 0, WALL_H + 2, HALL_D / 2, [HALL_W / 2, HALL_D / 2]);
    const skyHall = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); skyHall.rotation.x = Math.PI / 2; skyHall.position.set(0, WALL_H + 1.84, 8); scene.add(skyHall);
    wainscot(-HALL_W / 2 + 0.2, HALL_D / 2, HALL_D, true); wainscot(HALL_W / 2 - 0.2, HALL_D / 2, HALL_D, true);
    box(0.3, WALL_H + 2, HALL_D, matWall, -HALL_W / 2, (WALL_H + 2) / 2, HALL_D / 2, [HALL_D / 4, 2]);
    box(0.3, WALL_H + 2, HALL_D, matWall, HALL_W / 2, (WALL_H + 2) / 2, HALL_D / 2, [HALL_D / 4, 2]);
    box(HALL_W, WALL_H + 2, 0.3, matWall, 0, (WALL_H + 2) / 2, 0, [HALL_W / 4, 2]);
    // mur du fond du hall, avec l'ouverture vers la nef
    const side = (HALL_W - NAVE_W) / 2;
    box(side, WALL_H + 2, 0.3, matWall, -(NAVE_W / 2 + side / 2), (WALL_H + 2) / 2, HALL_D, [side / 4, 2]);
    box(side, WALL_H + 2, 0.3, matWall, NAVE_W / 2 + side / 2, (WALL_H + 2) / 2, HALL_D, [side / 4, 2]);
    box(NAVE_W, 2, 0.3, matWall, 0, WALL_H + 1, HALL_D);
    // la Source : une grande goutte d'encre sur un socle, au centre du hall
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 1, 32), matWood); pedestal.position.set(0, 0.5, 8); scene.add(pedestal);
    // profil d'une goutte : un bulbe rond en bas, une pointe effilée en haut
    const pts = []; for (let k = 0; k <= 40; k++) { const t = k / 40; const r = t < 0.45 ? 1.15 * Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / 0.45, 2))) : 1.15 * Math.pow(1 - (t - 0.45) / 0.55, 1.4); pts.push(new THREE.Vector2(Math.max(0.001, r), t * 3.4)); }
    const source = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0x0d0b10, metalness: 0.3, roughness: 0.08 }));
    source.position.set(0, 1.05, 8); scene.add(source);
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 12, 48), matGold); ringMesh.position.set(0, 1.4, 8); ringMesh.rotation.x = Math.PI / 2; scene.add(ringMesh);
    const glow = new THREE.PointLight(0xffd9a0, 1.2, 14); glow.position.set(0, 5, 8); scene.add(glow);
    const welcome = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: banner("Musée de l'encre", `Inktober 2026 · la DreamTeam${ownerName ? " · chez " + ownerName : ""}`, "#7a1426"), transparent: true }));
    welcome.position.set(0, 6.6, 0.2); scene.add(welcome);

    // les autoportraits (jour 24), sur le mur gauche du hall
    const clickables = [];
    const lazy = []; // { mesh, src, loaded, z }
    function frame(x, y, z, rotY, w, h, opts) {
      const grp = new THREE.Group();
      grp.position.set(x, y, z); grp.rotation.y = rotY;
      const border = 0.12;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(w + border * 2, h + border * 2, 0.1), opts.gold ? matGold : matWood);
      grp.add(fr);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matPlaceholder);
      pic.position.z = 0.06; grp.add(pic);
      if (opts.label) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: cartel(opts.label) })); c.position.set(0, -h / 2 - 0.45, 0.04); grp.add(c); disposables.push(c.material.map); }
      scene.add(grp);
      const item = { mesh: pic, src: opts.src, loaded: false, z, info: opts.info, w, h, grp };
      pic.userData.item = item;
      lazy.push(item); clickables.push(pic);
      return item;
    }
    const portraits = players.filter((p) => p.portrait);
    portraits.forEach((p, k) => {
      const z = 2.5 + (k % 6) * 2.4, y = k < 6 ? 2.3 : 4.6;
      frame(-HALL_W / 2 + 0.2, y, z, Math.PI / 2, 1.2, 1.5, { src: "/drawings/" + p.portrait, label: [p.pseudo, "Autoportrait"], info: `Autoportrait de ${p.pseudo} (jour 24, les yeux bandés)` });
    });
    const portraitTitle = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: banner("Autoportraits", portraits.length ? "dessinés les yeux bandés" : "aucun encore…", "#3e4a8a") }));
    portraitTitle.position.set(-HALL_W / 2 + 0.2, 6.6, 9); portraitTitle.rotation.y = Math.PI / 2; scene.add(portraitTitle);
    // le champion du tournoi, sur le mur droit du hall
    const champ = players.find((p) => (p.trophies || []).includes("champion"));
    const statue = enxorStatue(champ?.color ? new THREE.Color(champ.color) : new THREE.Color(0xe9b04a), { crown: true });
    statue.position.set(HALL_W / 2 - 3, 1, 9); statue.rotation.y = -Math.PI / 2; statue.scale.setScalar(1.3); scene.add(statue);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), matWood); plinth.position.set(HALL_W / 2 - 3, 0.5, 9); scene.add(plinth);
    const champBanner = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: banner(champ ? champ.pseudo : "Champion", champ ? "champion du grand tournoi" : "le tournoi n'est pas encore joué", "#c9874a") }));
    champBanner.position.set(HALL_W / 2 - 0.2, 6.6, 9); champBanner.rotation.y = -Math.PI / 2; scene.add(champBanner);

    // ---------- la nef : une travée par jour ----------
    const COLORS = ["#7a1426", "#3e4a8a", "#2f6b3a", "#7d5ba6", "#8a5a2c", "#1d4a5a"];
    const bays = [];
    let z = HALL_D;
    for (let d = 1; d <= 31; d++) {
      const list = players.filter((p) => p.drawings?.[d]).sort((a, b) => (b.owner ? 1 : 0) - (a.owner ? 1 : 0) || a.pseudo.localeCompare(b.pseudo));
      const perWall = Math.max(1, Math.ceil(list.length / 2));
      const depth = Math.max(8, perWall * 2.6 + 2);
      const z0 = z, z1 = z + depth;
      box(NAVE_W, 0.2, depth, matFloor, 0, -0.1, (z0 + z1) / 2, [NAVE_W / 3, depth / 3]);
      box(NAVE_W, 0.3, depth, matWood, 0, WALL_H, (z0 + z1) / 2, [NAVE_W / 2, depth / 2]);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.4, depth * 0.6), new THREE.MeshBasicMaterial({ color: 0xfff1d0 })); sky.rotation.x = Math.PI / 2; sky.position.set(0, WALL_H - 0.16, (z0 + z1) / 2); scene.add(sky);
      wainscot(-NAVE_W / 2 + 0.2, (z0 + z1) / 2, depth, true); wainscot(NAVE_W / 2 - 0.2, (z0 + z1) / 2, depth, true);
      box(0.3, WALL_H, depth, matWall, -NAVE_W / 2, WALL_H / 2, (z0 + z1) / 2, [depth / 4, 1.5]);
      box(0.3, WALL_H, depth, matWall, NAVE_W / 2, WALL_H / 2, (z0 + z1) / 2, [depth / 4, 1.5]);
      // colonnes et poutre à l'entrée de la travée
      for (const sx of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, WALL_H, 16), matWall); col.position.set(sx * (NAVE_W / 2 - 0.4), WALL_H / 2, z0 + 0.3); scene.add(col); }
      box(NAVE_W, 0.4, 0.5, matWood, 0, WALL_H - 0.3, z0 + 0.3);
      // la bannière du jour
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: banner(`Jour ${d}`, themes[d - 1], COLORS[d % COLORS.length]), side: THREE.DoubleSide }));
      ban.position.set(0, WALL_H - 1.5, z0 + 0.6); ban.rotation.y = Math.PI; scene.add(ban); disposables.push(ban.material.map);
      // une lampe par travée
      const lamp = new THREE.PointLight(0xffe0b0, 1.6, 14); lamp.position.set(0, WALL_H - 0.6, (z0 + z1) / 2); scene.add(lamp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9b8 })); bulb.position.copy(lamp.position); scene.add(bulb);
      // les dessins, à gauche puis à droite
      list.forEach((p, k) => {
        const left = k % 2 === 0, idx = Math.floor(k / 2);
        const zz = z0 + 2 + idx * 2.6 + 0.6;
        frame(left ? -NAVE_W / 2 + 0.2 : NAVE_W / 2 - 0.2, 2.2, zz, left ? Math.PI / 2 : -Math.PI / 2, 1.6, 1.6, { gold: p.owner, src: "/drawings/" + p.drawings[d], label: [p.pseudo, `Jour ${d} · ${themes[d - 1]}`], info: `« ${themes[d - 1] } », jour ${d}, par ${p.pseudo}${p.owner ? " (le conservateur)" : ""}` });
      });
      if (!list.length) {
        const empty = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ map: cartel(["Mur vide", "l'encre a séché ce jour-là"]) }));
        empty.position.set(-NAVE_W / 2 + 0.2, 2, (z0 + z1) / 2); empty.rotation.y = Math.PI / 2; scene.add(empty);
      }
      bays.push({ d, z0, z1, n: list.length });
      z = z1;
    }
    // le mur de fin
    box(NAVE_W, WALL_H, 0.3, matWall, 0, WALL_H / 2, z);
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: banner("Merci !", "31 jours d'encre · la DreamTeam", "#1d1a20") }));
    fin.position.set(0, 3, z - 0.2); fin.rotation.y = Math.PI; scene.add(fin);
    const END = z;
    // de petits Enxors de pierre veillent le long de la nef, un tous les cinq jours
    bays.filter((b) => b.d % 5 === 0).forEach((b, k) => {
      const st = enxorStatue(new THREE.Color(COLORS[k % COLORS.length]));
      st.scale.setScalar(0.45); st.position.set(k % 2 ? 3.6 : -3.6, 0, b.z0 + 1.2); st.rotation.y = k % 2 ? -0.6 : 0.6; scene.add(st);
    });

    // ---------- menu « aller au jour » ----------
    const go = root.querySelector(".museum-go");
    go.append(new Option("Aller à…", ""), new Option("Le hall", "hall"));
    for (const b of bays) go.append(new Option(`Jour ${b.d} · ${themes[b.d - 1]} (${b.n})`, String(b.d)));
    go.addEventListener("change", () => {
      const v = go.value; go.value = "";
      if (v === "hall") { cam.x = 0; cam.z = 4; cam.yaw = 0; }
      else { const b = bays.find((q) => q.d === Number(v)); cam.x = 0; cam.z = b.z0 + 1.5; cam.yaw = 0; }
      go.blur();
    });

    // ---------- chargement paresseux des tableaux ----------
    const loader = new Map();
    function loadItem(it) {
      if (it.loaded || loader.has(it)) return;
      const img = new Image();
      loader.set(it, img);
      img.onload = () => {
        loader.delete(it);
        if (closed) return;
        // réduction à 512 px max, puis texture
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        it.mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
        // on garde la bonne proportion dans le cadre
        const ar = img.width / img.height, s = Math.max(it.w, it.h);
        const w = ar >= 1 ? s : s * ar, h = ar >= 1 ? s / ar : s;
        it.mesh.scale.set(w / it.w, h / it.h, 1);
        it.grp.children[0].scale.set((w + 0.24) / (it.w + 0.24), (h + 0.24) / (it.h + 0.24), 1);
        it.loaded = true;
      };
      img.onerror = () => loader.delete(it);
      img.src = it.src;
    }
    function unloadItem(it) {
      if (!it.loaded) return;
      it.mesh.material.map?.dispose(); it.mesh.material.dispose();
      it.mesh.material = matPlaceholder;
      it.loaded = false;
    }

    // ---------- déplacements ----------
    const cam = { x: 0, z: 3, yaw: 0, pitch: 0 };
    const keys = {};
    const onKey = (e) => {
      if (e.target.tagName === "SELECT") return;
      keys[e.key.toLowerCase()] = e.type === "keydown";
      if (e.type === "keydown" && e.key === "Escape") viewer.hidden ? close() : (viewer.hidden = true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    let drag = null, moved = 0;
    renderer.domElement.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; });
    window.addEventListener("pointermove", onMove);
    function onMove(e) {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw -= dx * 0.004; cam.pitch = Math.max(-0.7, Math.min(0.7, cam.pitch - dy * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("pointerup", onUp);
    const ray = new THREE.Raycaster();
    const viewer = root.querySelector(".museum-view");
    function onUp(e) {
      if (!drag) return;
      drag = null;
      if (moved > 6 || e.target !== renderer.domElement) return;
      // un simple clic : on regarde le tableau visé
      const b = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(clickables)[0];
      if (hit && hit.distance < 9) {
        const it = hit.object.userData.item;
        viewer.querySelector("img").src = it.src;
        viewer.querySelector("p").textContent = it.info;
        viewer.hidden = false;
        window.Sound?.play("reveal", 0.4);
      }
    }
    viewer.querySelector("button").addEventListener("click", () => (viewer.hidden = true));
    root.querySelector(".museum-quit").addEventListener("click", () => close());
    const onResize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);

    const where = root.querySelector(".museum-where");
    let last = performance.now(), raf = 0, closed = false, lastLazy = 0, stepAcc = 0;
    function loop(now) {
      if (closed) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const fwd = (keys.z || keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
      const strafe = (keys.d || keys.arrowright ? 1 : 0) - (keys.q || keys.a || keys.arrowleft ? 1 : 0);
      const sp = (keys.shift ? 7 : 3.5) * dt;
      if (fwd || strafe) {
        // la caméra regarde vers (sin yaw, cos yaw) ; la droite est (-cos yaw, sin yaw)
        let nx = cam.x + Math.sin(cam.yaw) * fwd * sp - Math.cos(cam.yaw) * strafe * sp;
        let nz = cam.z + Math.cos(cam.yaw) * fwd * sp + Math.sin(cam.yaw) * strafe * sp;
        // le mur entre le hall et la nef : on ne le traverse que par l'ouverture
        const crossing = (cam.z < HALL_D) !== (nz < HALL_D);
        if (crossing && Math.abs(nx) > NAVE_W / 2 - 0.7) nz = cam.z;
        const halfW = nz < HALL_D ? HALL_W / 2 - 0.7 : NAVE_W / 2 - 0.7;
        cam.x = Math.max(-halfW, Math.min(halfW, nx));
        cam.z = Math.max(0.8, Math.min(END - 0.8, nz));
        // on contourne la Source et la statue du champion
        for (const [px, pz, rr] of [[0, 8, 2.2], [HALL_W / 2 - 3, 9, 1.8]]) {
          const dx = cam.x - px, dz = cam.z - pz, d = Math.hypot(dx, dz);
          if (d < rr) { cam.x = px + (dx / (d || 1)) * rr; cam.z = pz + (dz / (d || 1)) * rr; }
        }
        stepAcc += sp;
        if (stepAcc > 1.4) { stepAcc = 0; window.Sound?.play("step", 0.15); }
      }
      camera.position.set(cam.x, 1.65 + Math.sin(now / 300) * (fwd || strafe ? 0.03 : 0), cam.z);
      camera.rotation.set(cam.pitch, Math.PI + cam.yaw, 0, "YXZ");
      source.rotation.y += dt * 0.2;
      ringMesh.position.y = 1.4 + Math.sin(now / 900) * 0.1;
      statue.rotation.y = -Math.PI / 2 + Math.sin(now / 1500) * 0.25;
      // charger les tableaux proches, libérer les lointains (tous les 300 ms)
      if (now - lastLazy > 300) {
        lastLazy = now;
        for (const it of lazy) { const dz = Math.abs(it.z - cam.z); if (dz < 22) loadItem(it); else if (dz > 40) unloadItem(it); }
        const b = bays.find((q) => cam.z >= q.z0 && cam.z < q.z1);
        where.textContent = b ? `Jour ${b.d} · ${themes[b.d - 1]} — ${b.n} dessin${b.n > 1 ? "s" : ""}` : "Le hall · la Source, les autoportraits et le champion";
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      for (const it of lazy) unloadItem(it);
      scene.traverse((o) => { o.geometry?.dispose(); if (o.material && o.material !== matPlaceholder) o.material.dispose?.(); });
      for (const t of disposables) t.dispose();
      renderer.dispose();
      root.remove();
      onClose?.();
    }
    // tests : où est la caméra, combien de tableaux sont affichés
    if (location.hostname === "localhost") window.__museum = { cam, stats: () => ({ frames: lazy.length, loaded: lazy.filter((i) => i.loaded).length, bays: bays.length, end: END }), close };
    return { close };
  }

  return { open };
})();
