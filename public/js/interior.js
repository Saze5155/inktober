// L'intérieur des cabanes, vu en coupe comme une maison de poupée :
// une entrée (pièce 0) puis une pièce par jour, décorée selon le thème.
window.Interior = (() => {
  const { INK, PAPER } = Ink;
  const RW = 560, RH = 380, FY = 318; // largeur d'une pièce, hauteur, niveau du sol
  const FR = { x: RW / 2 - 80, y: 72, w: 160, h: 190 }; // cadre du dessin
  const DIV = 14; // demi-épaisseur des murs entre les pièces

  // ---------- Petits outils de dessin ----------

  const rect = Ink.rect;
  function shape(g, r, pts, color, o = {}) {
    Ink.fill(g, pts, r, color, o.amp ?? 1.2);
    if (o.hatch) Ink.hatch(g, pts, r, { gap: o.hatch, alpha: o.hatchAlpha ?? 0.3, color: o.hatchColor ?? INK });
    if (o.w !== 0) Ink.stroke(g, pts, r, { w: o.w ?? 1.8, closed: true, step: 9, amp: o.amp ?? 1.5 });
  }
  const box = (g, r, x, y, w, h, color, o) => shape(g, r, rect(x, y, w, h), color, o);
  const oval = (g, r, cx, cy, rx, ry, color, o) => shape(g, r, Ink.ellipse(cx, cy, rx, ry, 22), color, o);
  const line = (g, r, pts, w = 1.6, color = INK) => Ink.stroke(g, pts, r, { w, color, step: 9, amp: 1.3 });
  function text(g, str, x, y, size, color = INK, weight = 700) {
    g.save();
    g.font = `${weight} ${size}px "Barlow Semi Condensed", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.fillText(str, x, y);
    g.restore();
  }
  function tile(g, step, fn, alpha = 0.22, from = 26, to = FY - 12) {
    g.save();
    g.globalAlpha = alpha;
    let row = 0;
    for (let y = from + step / 2; y < to; y += step, row++) {
      for (let x = step / 2 + (row % 2) * (step / 2); x < RW; x += step) fn(x, y);
    }
    g.restore();
  }

  // meubles réutilisables
  function table(g, r, x, w, h, color = "#8a5a3a") {
    box(g, r, x + 6, FY - h + 8, 6, h - 8, color);
    box(g, r, x + w - 12, FY - h + 8, 6, h - 8, color);
    box(g, r, x, FY - h, w, 9, color, { hatch: 4 });
    return FY - h;
  }
  function shelf(g, r, x, y, w, color = "#8a5a3a") {
    box(g, r, x, y, w, 7, color);
    line(g, r, [[x + 8, y + 7], [x + 8, y + 18], [x + 18, y + 7]], 1.4);
    line(g, r, [[x + w - 8, y + 7], [x + w - 8, y + 18], [x + w - 18, y + 7]], 1.4);
  }
  function rug(g, r, cx, w, color) {
    oval(g, r, cx, FY + 26, w / 2, 11, color, { hatch: 5 });
  }
  function bottle(g, r, x, y, h, color) {
    box(g, r, x - 7, y - h, 14, h, color, { hatch: 4 });
    box(g, r, x - 3, y - h - 8, 6, 8, color);
  }
  function candle(g, r, x, y, h = 18) {
    box(g, r, x - 3, y - h, 6, h, "#f2ead8", { w: 1.2 });
    shape(g, r, [[x, y - h - 12], [x + 4, y - h - 3], [x, y - h], [x - 4, y - h - 3]], "#e9b04a", { w: 1 });
  }
  function pot(g, r, x, color = "#b4643c", h = 34) {
    shape(g, r, [[x - 20, FY - h], [x + 20, FY - h], [x + 14, FY], [x - 14, FY]], color, { hatch: 5 });
  }
  function leafFan(g, r, x, y, n, len, color = "#5b8c5a") {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2;
      const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
      const nx = -Math.sin(a) * 9, ny = Math.cos(a) * 9;
      shape(g, r, [[x, y], [(x + tx) / 2 + nx, (y + ty) / 2 + ny], [tx, ty], [(x + tx) / 2 - nx, (y + ty) / 2 - ny]], color, { w: 1.3 });
    }
  }
  function star(g, r, x, y, s, color) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.45 : s;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    shape(g, r, pts, color, { w: 1.2, amp: 0.6 });
  }
  function blob(g, r, x, y, s = 1) {
    // bébé Enxor
    oval(g, r, x, y - 12 * s, 13 * s, 12 * s, INK, { w: 0 });
    g.fillStyle = PAPER;
    for (const k of [-1, 1]) { g.beginPath(); g.arc(x + k * 4.5 * s, y - 14 * s, 2.6 * s, 0, 7); g.fill(); }
  }

  // ---------- Les 31 thèmes ----------
  // wall: couleur du mur, frame: couleur du cadre, motif: papier peint, props: meubles et objets

  const T = [
    { // 1 Vampire
      wall: "#4a2a33", frame: "#2a1418", light: true,
      motif: (g, r) => tile(g, 64, (x, y) => shape(g, r, [[x - 9, y], [x - 4, y - 4], [x - 2, y - 1], [x, y - 5], [x + 2, y - 1], [x + 4, y - 4], [x + 9, y], [x + 3, y + 2], [x, y + 4], [x - 3, y + 2]], INK, { w: 0 }), 0.35),
      props(g, r) {
        for (const s of [1, -1]) {
          const x0 = s > 0 ? 0 : RW;
          shape(g, r, [[x0, 20], [x0 + s * 110, 20], [x0 + s * 70, 90], [x0 + s * 40, 220], [x0, 240]], "#8e1b2b", { hatch: 6 });
        }
        shape(g, r, [[70, FY], [48, FY - 110], [70, FY - 175], [118, FY - 175], [140, FY - 110], [118, FY]], "#3a2228", { hatch: 7 });
        line(g, r, [[94, FY - 150], [94, FY - 70]], 3, "#e9b04a");
        line(g, r, [[74, FY - 125], [114, FY - 125]], 3, "#e9b04a");
        const top = table(g, r, 410, 100, 80, "#3a2228");
        line(g, r, [[460, top], [460, top - 40]], 3);
        line(g, r, [[436, top - 40], [484, top - 40]], 3);
        for (const x of [436, 460, 484]) candle(g, r, x, top - 40);
        line(g, r, [[400, 30], [430, 60], [470, 70], [510, 60]], 1.2);
        for (const [x, y] of [[418, 50], [445, 66], [480, 68], [505, 62]]) oval(g, r, x, y + 8, 7, 8, "#f2ead8", { w: 1.2 });
      },
    },
    { // 2 Draconique
      wall: "#55604f", frame: "#9a7b2c",
      motif: (g, r) => tile(g, 30, (x, y) => line(g, r, Ink.ellipse(x, y, 12, 10, 8, 0, Math.PI), 1.2), 0.3),
      props(g, r) {
        shape(g, r, [[30, FY], [60, FY - 50], [110, FY - 70], [160, FY - 40], [185, FY]], "#e9b04a", { hatch: 5 });
        for (let i = 0; i < 14; i++) oval(g, r, 50 + r() * 120, FY - 10 - r() * 45, 9, 4, "#f4c95d", { w: 1 });
        oval(g, r, 450, FY - 14, 50, 16, "#a83232", { hatch: 5 });
        oval(g, r, 450, FY - 62, 30, 40, "#7fa36b", { hatch: 6 });
        for (const [x, y] of [[440, FY - 80], [462, FY - 60], [446, FY - 45]]) oval(g, r, x, y, 5, 4, "#4c6b3e", { w: 1 });
        for (let i = 0; i < 3; i++) line(g, r, [[400 + i * 16, 60], [380 + i * 16, 140]], 3);
      },
    },
    { // 3 Coloré
      wall: "#f4ecdc", frame: "#e0662f",
      motif: (g, r) => tile(g, 70, (x, y) => Ink.splat(g, x, y, 7, r, ["#e0662f", "#3e7cb1", "#5b8c5a", "#d36b9c", "#e9b04a"][Math.floor(r() * 5)], 1), 0.45),
      props(g, r) {
        line(g, r, [[60, FY], [100, FY - 190]], 3);
        line(g, r, [[150, FY], [110, FY - 190]], 3);
        line(g, r, [[105, FY - 190], [105, FY]], 3);
        box(g, r, 60, FY - 170, 90, 70, "#fbf7ee");
        for (const [c, x, y] of [["#e0662f", 80, -150], ["#3e7cb1", 110, -130], ["#5b8c5a", 130, -155]]) Ink.splat(g, x, FY + y, 9, r, c);
        oval(g, r, 140, FY - 60, 28, 16, "#d9b98a");
        ["#b3261e", "#e9b04a", "#3e7cb1", "#5b8c5a"].forEach((c, i) => {
          const x = 400 + i * 36;
          box(g, r, x, FY - 34, 28, 34, "#cfcfcf");
          box(g, r, x, FY - 34, 28, 9, c, { w: 1 });
          line(g, r, [[x + 6, FY - 25], [x + 6, FY - 14]], 3, c);
        });
      },
    },
    { // 4 Crocs
      wall: "#cfe3ea", frame: "#3e7cb1",
      motif: (g, r) => tile(g, 26, (x, y) => line(g, r, Ink.ellipse(x, y, 4, 4, 8), 1.2), 0.3),
      props(g, r) {
        const croc = (x, y, s, c) => {
          shape(g, r, [[x, y], [x + 60 * s, y], [x + 66 * s, y - 12 * s], [x + 52 * s, y - 26 * s], [x + 22 * s, y - 30 * s], [x + 4 * s, y - 20 * s]], c, { w: 1.6 });
          for (let i = 0; i < 4; i++) { g.fillStyle = INK; g.beginPath(); g.arc(x + (40 + i * 6) * s, y - 15 * s, 1.6 * s, 0, 7); g.fill(); }
          line(g, r, Ink.ellipse(x + 14 * s, y - 14 * s, 12 * s, 10 * s, 8, Math.PI, Math.PI * 2), 2);
        };
        croc(40, FY, 2, "#7fbf5a");
        for (let i = 0; i < 3; i++) {
          shelf(g, r, 390, FY - 50 - i * 70, 140);
          croc(398, FY - 50 - i * 70, 0.9, ["#e0662f", "#d36b9c", "#e9b04a"][i]);
          croc(462, FY - 50 - i * 70, 0.9, ["#3e7cb1", "#7d5ba6", "#b3261e"][i]);
        }
      },
    },
    { // 5 Sanggg
      wall: "#f1d9d6", frame: "#b3261e",
      motif: (g, r) => tile(g, 44, (x, y) => shape(g, r, [[x, y - 8], [x + 5, y + 2], [x, y + 5], [x - 5, y + 2]], "#b3261e", { w: 0 }), 0.35),
      props(g, r) {
        line(g, r, [[90, FY], [90, FY - 200]], 3);
        line(g, r, [[60, FY], [120, FY]], 3);
        line(g, r, [[90, FY - 200], [120, FY - 200]], 2);
        box(g, r, 104, FY - 196, 30, 44, "#b3261e", { hatch: 4 });
        line(g, r, [[119, FY - 152], [125, FY - 100], [140, FY - 60], [150, FY - 40]], 1.4, "#b3261e");
        box(g, r, 400, 90, 120, 80, "#1f2b26");
        line(g, r, [[410, 135], [440, 135], [450, 110], [462, 160], [474, 128], [482, 135], [510, 135]], 2, "#5fd38a");
        Ink.splat(g, 460, FY + 12, 22, r, "#b3261e", 0.9);
      },
    },
    { // 6 Potion
      wall: "#3d2f4a", frame: "#7d5ba6", light: true,
      motif: (g, r) => tile(g, 48, (x, y) => { line(g, r, [[x - 6, y], [x + 6, y]], 1.2, PAPER); line(g, r, [[x, y - 6], [x, y + 6]], 1.2, PAPER); }, 0.25),
      props(g, r) {
        for (let i = 0; i < 2; i++) {
          shelf(g, r, 30, FY - 90 - i * 80, 150);
          ["#5b8c5a", "#d36b9c", "#3e7cb1", "#e9b04a"].forEach((c, k) => bottle(g, r, 50 + k * 34, FY - 90 - i * 80, 20 + ((k + i) % 3) * 8, c));
        }
        line(g, r, [[420, FY], [430, FY - 30]], 3);
        line(g, r, [[500, FY], [490, FY - 30]], 3);
        shape(g, r, [...Ink.ellipse(460, FY - 60, 62, 46, 18, 0, Math.PI)], INK, { w: 2 });
        oval(g, r, 460, FY - 60, 62, 12, "#7cd15a", { w: 2 });
        for (const [x, y, s] of [[445, FY - 82, 7], [470, FY - 96, 5], [482, FY - 78, 4]]) line(g, r, Ink.ellipse(x, y, s, s, 10), 1.4, "#7cd15a");
        shape(g, r, [[440, FY], [452, FY - 18], [460, FY - 6], [470, FY - 22], [482, FY]], "#e0662f", { w: 1 });
      },
    },
    { // 7 Gourmand
      wall: "#f6e3b4", frame: "#e0662f",
      motif: (g, r) => tile(g, 28, (x, y) => box(g, r, x - 7, y - 7, 14, 14, "#e0662f", { w: 0 }), 0.12),
      props(g, r) {
        line(g, r, [[30, 60], [190, 60]], 3);
        for (const [x, s] of [[60, 22], [110, 28], [160, 18]]) {
          line(g, r, [[x, 60], [x, 80]], 1.4);
          oval(g, r, x, 80 + s, s, s, "#4a4550", { hatch: 4 });
        }
        const top = table(g, r, 380, 150, 90);
        box(g, r, 405, top - 30, 100, 30, "#f6c1cf", { hatch: 5 });
        box(g, r, 420, top - 55, 70, 25, "#fbf2e4");
        box(g, r, 433, top - 75, 44, 20, "#f6c1cf");
        oval(g, r, 455, top - 82, 7, 7, "#b3261e");
        for (let i = 0; i < 4; i++) oval(g, r, 120, FY - 6 - i * 7, 34, 5, "#fbf7ee", { w: 1.3 });
      },
    },
    { // 8 Sexy
      wall: "#6e2338", frame: "#e9b04a", light: true,
      motif: (g, r) => tile(g, 50, (x, y) => Ink.heart(g, x, y, 6, "rgba(239,229,208,.9)"), 0.18),
      props(g, r) {
        oval(g, r, 100, 150, 50, 70, "#d9c6a3", { w: 3 });
        oval(g, r, 100, 150, 40, 60, "#c9d6dd", { hatch: 6, hatchAlpha: 0.15 });
        shape(g, r, [[90, 160], [100, 154], [110, 160], [100, 170]], "#c0392b", { w: 0 });
        shape(g, r, [[380, FY - 20], [380, FY - 90], [400, FY - 110], [420, FY - 80], [500, FY - 80], [520, FY - 110], [540, FY - 90], [540, FY - 20]], "#9e1d3b", { hatch: 6 });
        box(g, r, 380, FY - 22, 160, 22, "#7a142b");
        bottle(g, r, 160, FY - 2, 22, "#d36b9c");
      },
    },
    { // 9 Botanique
      wall: "#dfe8d2", frame: "#5b8c5a",
      motif: (g, r) => tile(g, 46, (x, y) => { oval(g, r, x, y, 9, 4, "#5b8c5a", { w: 0 }); }, 0.3),
      props(g, r) {
        for (const x of [70, 470]) { pot(g, r, x, "#b4643c", 40); leafFan(g, r, x, FY - 40, 7, 90); }
        pot(g, r, 140, "#c98a5c", 26);
        leafFan(g, r, 140, FY - 26, 5, 46, "#7fa36b");
        for (const x0 of [30, 230, 340, 520]) {
          const pts = [];
          for (let y = 18; y < 140 + (x0 % 7) * 10; y += 14) pts.push([x0 + Math.sin(y / 18) * 10, y]);
          line(g, r, pts, 1.6, "#3f6b3a");
          pts.filter((_, i) => i % 2).forEach(([x, y]) => oval(g, r, x + 7, y, 7, 4, "#7fa36b", { w: 1 }));
        }
      },
    },
    { // 10 Étoilé
      wall: "#1f2547", frame: "#e9b04a", light: true,
      motif: (g, r) => tile(g, 40, (x, y) => star(g, r, x + (r() - 0.5) * 16, y + (r() - 0.5) * 16, 3 + r() * 3, "#e9b04a"), 0.55),
      props(g, r) {
        line(g, r, [[60, FY], [90, FY - 90]], 2.4);
        line(g, r, [[120, FY], [90, FY - 90]], 2.4);
        line(g, r, [[90, FY], [90, FY - 90]], 2.4);
        shape(g, r, [[60, FY - 120], [150, FY - 160], [158, FY - 140], [68, FY - 100]], "#c9a227", { hatch: 4 });
        line(g, r, [[460, FY], [460, FY - 70]], 3);
        oval(g, r, 460, FY - 100, 30, 30, "#f6efd5", { hatch: 7, hatchAlpha: 0.15 });
        const c = [[400, 40], [430, 70], [470, 55], [500, 90], [530, 60]];
        line(g, r, c, 1, "#e9b04a");
        c.forEach(([x, y]) => star(g, r, x, y, 5, "#f6efd5"));
      },
    },
    { // 11 Monstre
      wall: "#4f5a3c", frame: "#2b2731", light: true,
      motif: (g, r) => tile(g, 70, (x, y) => { for (let i = 0; i < 3; i++) line(g, r, [[x - 8 + i * 7, y - 10], [x - 14 + i * 7, y + 10]], 2); }, 0.3),
      props(g, r) {
        box(g, r, 380, FY - 50, 170, 36, "#d9ccb3", { hatch: 6 });
        box(g, r, 380, FY - 80, 20, 80, "#6b4426");
        box(g, r, 380, FY - 14, 170, 14, INK, { w: 0 });
        for (const x of [450, 466]) { g.fillStyle = "#f2d14a"; g.beginPath(); g.ellipse(x, FY - 7, 5, 3, 0, 0, 7); g.fill(); }
        box(g, r, 40, FY - 200, 110, 200, "#5a4030", { hatch: 7 });
        shape(g, r, [[150, FY - 190], [175, FY - 180], [175, FY - 10], [150, FY]], "#3b2a1c");
        Ink.stroke(g, [[150, FY - 120], [180, FY - 130], [200, FY - 110], [205, FY - 80], [195, FY - 70]], r, { w: 9, color: "#7d5ba6", passes: 1, amp: 1 });
      },
    },
    { // 12 Personnage
      wall: "#efe0c8", frame: "#8a5a3a",
      motif: (g, r) => tile(g, 56, (x, y) => line(g, r, Ink.ellipse(x, y, 8, 11, 10), 1.3), 0.25),
      props(g, r) {
        line(g, r, [[95, FY], [95, FY - 100]], 3);
        line(g, r, [[70, FY], [120, FY]], 3);
        shape(g, r, [[65, FY - 100], [125, FY - 100], [135, FY - 160], [110, FY - 180], [80, FY - 180], [55, FY - 160]], "#d9c6a3", { hatch: 6 });
        line(g, r, [[380, FY], [380, FY - 190], [540, FY - 190], [540, FY]], 3);
        ["#b3261e", "#3e7cb1", "#e9b04a", "#5b8c5a"].forEach((c, i) => {
          const x = 400 + i * 36;
          line(g, r, [[x + 12, FY - 190], [x + 12, FY - 180]], 1.2);
          shape(g, r, [[x, FY - 175], [x + 24, FY - 175], [x + 30, FY - 80], [x - 6, FY - 80]], c, { hatch: 5 });
        });
      },
    },
    { // 13 Viking
      wall: "#7a5a3c", frame: "#3b2a1c", light: true,
      motif: (g, r) => tile(g, 50, (x, y) => line(g, r, [[x, y - 9], [x, y + 9], [x + 6, y + 2], [x - 6, y - 4]], 1.4, PAPER), 0.25),
      props(g, r) {
        for (const [x, y, c] of [[60, 120, "#b3261e"], [140, 160, "#3e7cb1"]]) {
          oval(g, r, x, y, 34, 34, c, { hatch: 6 });
          line(g, r, [[x - 34, y], [x + 34, y]], 2);
          line(g, r, [[x, y - 34], [x, y + 34]], 2);
          oval(g, r, x, y, 8, 8, "#c9a227");
        }
        line(g, r, [[460, FY], [460, FY - 90]], 3);
        shape(g, r, [...Ink.ellipse(460, FY - 90, 30, 26, 14, Math.PI, Math.PI * 2)], "#9aa0a6", { hatch: 5 });
        for (const s of [-1, 1]) shape(g, r, [[460 + s * 26, FY - 104], [460 + s * 48, FY - 140], [460 + s * 36, FY - 106]], "#f2ead8");
        for (const s of [-1, 1]) {
          line(g, r, [[440 + s * 60 + 20, 50], [440 - s * 30 + 20, 150]], 3, "#6b4426");
        }
      },
    },
    { // 14 Profondeur
      wall: "#1f4d5a", frame: "#c9a227", light: true,
      motif: (g, r) => tile(g, 38, (x, y) => line(g, r, Ink.ellipse(x + (r() - 0.5) * 14, y, 3 + r() * 4, 3 + r() * 4, 8), 1, PAPER), 0.3),
      props(g, r) {
        oval(g, r, 100, 140, 56, 56, "#c9a227", { w: 3 });
        oval(g, r, 100, 140, 44, 44, "#0f2f3a");
        shape(g, r, [[80, 140], [100, 128], [116, 140], [100, 150]], "#e0662f", { w: 1 });
        shape(g, r, [[116, 140], [126, 132], [126, 148]], "#e0662f", { w: 1 });
        line(g, r, [[460, FY - 150], [460, FY - 20]], 5);
        line(g, r, [[440, FY - 130], [480, FY - 130]], 5);
        line(g, r, Ink.ellipse(460, FY - 40, 40, 24, 12, 0.2, Math.PI - 0.2), 5);
        oval(g, r, 460, FY - 158, 9, 9, "#1f4d5a", { w: 3 });
        for (const x of [380, 400, 530]) line(g, r, [[x, FY], [x + 8, FY - 30], [x - 6, FY - 60], [x + 6, FY - 90]], 3, "#4f9a6a");
      },
    },
    { // 15 Enxor
      wall: "#efe5d0", frame: INK,
      motif: (g, r) => tile(g, 60, (x, y) => shape(g, r, [[x, y - 9], [x + 6, y + 3], [x, y + 6], [x - 6, y + 3]], INK, { w: 0 }), 0.25),
      props(g, r) {
        shape(g, r, [[50, FY], [60, FY - 80], [140, FY - 80], [150, FY]], "#2b2731", { hatch: 6, hatchColor: PAPER, hatchAlpha: 0.2 });
        box(g, r, 78, FY - 100, 44, 20, "#2b2731");
        shape(g, r, [[110, FY - 100], [160, FY - 230], [172, FY - 222], [118, FY - 98]], "#f2ead8", { hatch: 4 });
        Ink.splat(g, 140, FY - 60, 12, r, INK);
        Ink.splat(g, 450, FY + 14, 46, r, INK);
        blob(g, r, 420, FY + 4, 1);
        blob(g, r, 455, FY + 8, 0.8);
        blob(g, r, 488, FY + 2, 1.1);
      },
    },
    { // 16 Horreur
      wall: "#3a3836", frame: "#5a1a1a", light: true,
      motif: (g, r) => tile(g, 90, (x, y) => Ink.crack(g, x, y, r), 0.6),
      props(g, r) {
        for (const [x0, s] of [[0, 1], [RW, -1]]) {
          for (let i = 0; i < 5; i++) line(g, r, [[x0, 20], [x0 + s * Math.cos(i * 0.35) * 110, 20 + Math.sin(i * 0.35) * 110]], 0.8, PAPER);
          for (let k = 1; k < 4; k++) line(g, r, Array.from({ length: 5 }, (_, i) => [x0 + s * Math.cos(i * 0.35) * 30 * k, 20 + Math.sin(i * 0.35) * 30 * k]), 0.8, PAPER);
        }
        text(g, "AIDE", 470, 150, 34, "#8e1b2b", 800);
        line(g, r, [[60, FY], [80, FY - 60], [140, FY - 60], [160, FY]], 3);
        line(g, r, [[80, FY - 60], [76, FY - 140], [140, FY - 140], [140, FY - 60]], 3);
        line(g, r, Ink.ellipse(110, FY + 2, 60, 10, 12, 0.1, Math.PI - 0.1), 3);
        candle(g, r, 420, FY, 24);
      },
    },
    { // 17 Pachimari
      wall: "#d6efe6", frame: "#5bb3a0",
      motif: (g, r) => tile(g, 50, (x, y) => { oval(g, r, x, y, 8, 7, "#5bb3a0", { w: 0 }); for (const k of [-4, 0, 4]) line(g, r, [[x + k, y + 5], [x + k, y + 11]], 1.6, "#5bb3a0"); }, 0.35),
      props(g, r) {
        const pachi = (x, y, s) => {
          shape(g, r, [[x - 16 * s, y], [x - 18 * s, y - 20 * s], [x, y - 40 * s], [x + 18 * s, y - 20 * s], [x + 16 * s, y]], "#6fc3ad");
          for (const k of [-10, 0, 10]) line(g, r, [[x + k * s, y], [x + k * s, y + 8 * s]], 2.5, "#6fc3ad");
          for (const k of [-1, 1]) { g.fillStyle = INK; g.beginPath(); g.arc(x + k * 6 * s, y - 16 * s, 2 * s, 0, 7); g.fill(); }
        };
        [[50, FY - 4], [90, FY - 4], [130, FY - 4], [70, FY - 40], [110, FY - 40], [92, FY - 76]].forEach(([x, y]) => pachi(x, y, 1));
        box(g, r, 400, FY - 240, 130, 240, "#e0662f", { hatch: 7 });
        box(g, r, 412, FY - 228, 106, 130, "#cfe7f1");
        line(g, r, [[465, FY - 228], [465, FY - 170]], 1.5);
        line(g, r, [[455, FY - 160], [465, FY - 170], [475, FY - 160]], 2);
        pachi(445, FY - 102, 0.8);
        pachi(490, FY - 102, 0.8);
      },
    },
    { // 18 Yu-Gi-Oh
      wall: "#3a2b52", frame: "#e9b04a", light: true,
      motif: (g, r) => tile(g, 60, (x, y) => { line(g, r, [[x - 10, y + 8], [x, y - 10], [x + 10, y + 8], [x - 10, y + 8]], 1.2, "#e9b04a"); line(g, r, Ink.ellipse(x, y + 2, 4, 2.5, 8), 1, "#e9b04a"); }, 0.4),
      props(g, r) {
        box(g, r, 70, FY - 80, 60, 80, "#2b2731", { hatch: 6, hatchColor: PAPER, hatchAlpha: 0.15 });
        shape(g, r, [[100, FY - 150], [130, FY - 90], [70, FY - 90]], "#e9b04a", { hatch: 5 });
        line(g, r, Ink.ellipse(100, FY - 110, 8, 5, 10), 1.6);
        const top = table(g, r, 380, 160, 70, "#5a3d78");
        for (let i = 0; i < 5; i++) {
          const x = 392 + i * 30;
          box(g, r, x, top - 38, 24, 34, i % 2 ? "#c9874a" : "#7d5ba6");
          box(g, r, x + 4, top - 34, 16, 14, "#e8dcc4", { w: 0.8 });
        }
      },
    },
    { // 19 Cartes
      wall: "#2f5a3e", frame: "#8a5a3a", light: true,
      motif: (g, r) => { const s = ["♠", "♥", "♦", "♣"]; let i = 0; tile(g, 48, (x, y) => text(g, s[i++ % 4], x, y, 16, PAPER), 0.25); },
      props(g, r) {
        const top = table(g, r, 370, 170, 80);
        for (let lvl = 0; lvl < 3; lvl++) {
          for (let i = 0; i < 3 - lvl; i++) {
            const x = 400 + lvl * 18 + i * 36, y = top - lvl * 36;
            line(g, r, [[x, y], [x + 16, y - 34], [x + 32, y]], 1.8);
            if (i < 2 - lvl) line(g, r, [[x + 16, y - 34], [x + 52, y - 34]], 1.8);
          }
        }
        for (const [x, a, s] of [[50, -0.12, "♥"], [100, 0.08, "♠"]]) {
          g.save(); g.translate(x + 30, FY - 60); g.rotate(a);
          box(g, r, -30, -60, 60, 120, "#fbf7ee");
          text(g, s, 0, 0, 34, s === "♥" ? "#b3261e" : INK);
          g.restore();
        }
      },
    },
    { // 20 BDSM
      wall: "#2a2226", frame: "#b3261e", light: true,
      motif: (g, r) => tile(g, 44, (x, y) => { line(g, r, Ink.ellipse(x - 5, y, 7, 4, 10), 1.2, "#c9a27a"); line(g, r, Ink.ellipse(x + 5, y, 7, 4, 10), 1.2, "#c9a27a"); }, 0.3),
      props(g, r) {
        for (const x of [60, 130]) {
          line(g, r, [[x, 70], [x, 84]], 3);
          for (let k = 0; k < 4; k++) line(g, r, Ink.ellipse(x, 120 + k * 3, 22 - k * 3, 34 - k * 4, 14), 2.6, "#c9a27a");
        }
        shape(g, r, [[390, FY], [390, FY - 130], [410, FY - 150], [510, FY - 150], [530, FY - 130], [530, FY]], "#5a1622", { hatch: 6 });
        box(g, r, 380, FY - 60, 30, 60, "#3d0f18");
        box(g, r, 510, FY - 60, 30, 60, "#3d0f18");
        for (let i = 0; i < 7; i++) line(g, r, Ink.ellipse(470 + i * 10, 40 + i * 6, 6, 4, 8), 1.5, "#9aa0a6");
        box(g, r, 532, 90, 18, 16, "#e9b04a");
        line(g, r, Ink.ellipse(541, 90, 6, 7, 8, Math.PI, Math.PI * 2), 2);
      },
    },
    { // 21 Cosmique
      wall: "#26163a", frame: "#b48be0", light: true,
      motif: (g, r) => tile(g, 64, (x, y) => { oval(g, r, x, y, 5, 5, ["#e0662f", "#3e7cb1", "#d36b9c"][Math.floor(r() * 3)], { w: 0 }); line(g, r, Ink.ellipse(x, y, 10, 3, 10), 0.8, PAPER); }, 0.45),
      props(g, r) {
        const top = table(g, r, 380, 150, 70, "#3b2a1c");
        line(g, r, [[455, top], [455, top - 60]], 2.5);
        oval(g, r, 455, top - 70, 16, 16, "#e9b04a", { hatch: 4 });
        for (const [a, d, c] of [[0.3, 50, "#3e7cb1"], [2.4, 64, "#e0662f"], [4.1, 40, "#d36b9c"]]) {
          const x = 455 + Math.cos(a) * d, y = top - 70 + Math.sin(a) * d * 0.4;
          line(g, r, [[455, top - 70], [x, y]], 1.2);
          oval(g, r, x, y, 8, 8, c);
        }
        shape(g, r, [[50, FY], [60, FY - 40], [100, FY - 56], [140, FY - 34], [150, FY]], "#3d3a44", { hatch: 5 });
        for (const [x, y] of [[80, FY - 30], [118, FY - 20]]) oval(g, r, x, y, 7, 4, "#b48be0", { w: 0 });
      },
    },
    { // 22 Mignon
      wall: "#f7dce4", frame: "#d36b9c",
      motif: (g, r) => tile(g, 50, (x, y) => { shape(g, r, [[x, y], [x - 9, y - 6], [x - 9, y + 6]], "#d36b9c", { w: 0 }); shape(g, r, [[x, y], [x + 9, y - 6], [x + 9, y + 6]], "#d36b9c", { w: 0 }); }, 0.35),
      props(g, r) {
        oval(g, r, 100, FY - 12, 66, 18, "#d36b9c", { hatch: 5 });
        oval(g, r, 100, FY - 30, 40, 22, "#f2ead8");
        for (const s of [-1, 1]) shape(g, r, [[100 + s * 20, FY - 46], [100 + s * 28, FY - 62], [100 + s * 32, FY - 42]], "#f2ead8");
        line(g, r, [[86, FY - 32], [92, FY - 30]], 1.4);
        line(g, r, [[108, FY - 30], [114, FY - 32]], 1.4);
        text(g, "z z", 150, FY - 76, 16, "#7d5ba6");
        oval(g, r, 460, FY - 30, 28, 30, "#fbf7ee");
        oval(g, r, 460, FY - 76, 20, 18, "#fbf7ee");
        for (const s of [-1, 1]) oval(g, r, 460 + s * 9, FY - 110, 6, 18, "#fbf7ee");
        for (const s of [-1, 1]) { g.fillStyle = INK; g.beginPath(); g.arc(460 + s * 7, FY - 78, 2, 0, 7); g.fill(); }
        oval(g, r, 520, FY - 14, 22, 14, "#f6c1cf", { hatch: 5 });
      },
    },
    { // 23 Inhumain
      wall: "#c9d3dc", frame: "#4a5560",
      motif: (g, r) => tile(g, 60, (x, y) => { line(g, r, [[x - 20, y], [x, y], [x, y + 18], [x + 18, y + 18]], 1.2); g.fillStyle = INK; g.beginPath(); g.arc(x + 18, y + 18, 2.5, 0, 7); g.fill(); }, 0.25),
      props(g, r) {
        box(g, r, 60, FY - 150, 90, 110, "#9aa4ad", { hatch: 6 });
        box(g, r, 75, FY - 135, 60, 40, "#1f2b26");
        for (const x of [92, 118]) { g.fillStyle = "#5fd38a"; g.fillRect(x - 4, FY - 120, 8, 8); }
        line(g, r, [[105, FY - 40], [105, FY]], 6);
        line(g, r, [[70, FY], [140, FY]], 4);
        const top = table(g, r, 380, 160, 70, "#4a5560");
        box(g, r, 400, top - 90, 120, 80, "#2b2731");
        box(g, r, 410, top - 80, 100, 60, "#f2f2f2");
        box(g, r, 420, top - 64, 14, 14, "#fff", { w: 1.4 });
        line(g, r, [[422, top - 58], [427, top - 53], [434, top - 66]], 2, "#5b8c5a");
        text(g, "pas un robot", 474, top - 57, 12);
        line(g, r, [[200, FY + 20], [260, FY + 10], [320, FY + 24], [380, FY + 14]], 2.5);
      },
    },
    { // 24 Autoportrait
      wall: "#ead9bf", frame: "#c08a3e",
      motif: (g, r) => tile(g, 80, (x, y) => line(g, r, [[x - 16, y + 6], [x, y - 4], [x + 16, y + 4]], 3, "#c08a3e"), 0.18),
      props(g, r) {
        line(g, r, [[100, FY], [100, FY - 40]], 3);
        line(g, r, [[70, FY], [130, FY]], 3);
        oval(g, r, 100, FY - 130, 50, 90, "#8a5a3a", { w: 2.5 });
        oval(g, r, 100, FY - 130, 42, 82, "#d8e2e6", { hatch: 7, hatchAlpha: 0.15 });
        blob(g, r, 100, FY - 100, 1.6);
        line(g, r, [[420, FY], [450, FY - 180]], 3);
        line(g, r, [[500, FY], [470, FY - 180]], 3);
        box(g, r, 415, FY - 160, 90, 100, "#fbf7ee");
        box(g, r, 510, FY - 40, 26, 40, "#9aa0a6");
        for (const [dx, c] of [[0, "#b3261e"], [8, "#3e7cb1"], [16, "#e9b04a"]]) line(g, r, [[514 + dx, FY - 40], [512 + dx, FY - 76]], 2, c);
      },
    },
    { // 25 Sticker
      wall: "#fbfaf6", frame: "#e0662f",
      motif: (g, r) => tile(g, 64, (x, y) => {
        g.save(); g.translate(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20); g.rotate((r() - 0.5) * 0.8);
        const c = ["#e0662f", "#3e7cb1", "#5b8c5a", "#d36b9c", "#e9b04a"][Math.floor(r() * 5)];
        const k = r();
        if (k < 0.33) star(g, r, 0, 0, 12, c); else if (k < 0.66) Ink.heart(g, 0, 0, 9, c); else oval(g, r, 0, 0, 11, 11, c);
        g.restore();
      }, 0.6),
      props(g, r) {
        const top = table(g, r, 380, 160, 70);
        box(g, r, 400, top - 12, 110, 12, "#3e7cb1", { hatch: 4 });
        box(g, r, 410, top - 22, 90, 10, "#e0662f");
        const t2 = table(g, r, 40, 140, 70);
        box(g, r, 60, t2 - 70, 100, 66, "#9aa4ad");
        box(g, r, 50, t2 - 6, 120, 6, "#6f7880");
        star(g, r, 85, t2 - 40, 10, "#e9b04a");
        Ink.heart(g, 125, t2 - 34, 8, "#d36b9c");
      },
    },
    { // 26 Écran
      wall: "#24232a", frame: "#3e7cb1", light: true,
      motif: (g) => { g.save(); g.globalAlpha = 0.12; g.fillStyle = PAPER; for (let y = 26; y < FY; y += 6) g.fillRect(0, y, RW, 1.5); g.restore(); },
      props(g, r) {
        box(g, r, 40, FY - 60, 140, 60, "#5a4030", { hatch: 6 });
        box(g, r, 50, FY - 170, 120, 110, "#8a8580", { hatch: 6 });
        box(g, r, 62, FY - 158, 80, 84, "#cfd6d9");
        g.save();
        for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? INK : "#fff"; g.fillRect(62 + r() * 80, FY - 158 + r() * 84, 2, 2); }
        g.restore();
        for (const y of [-140, -112]) oval(g, r, 156, FY + y, 6, 6, "#4a4550");
        const top = table(g, r, 370, 170, 76, "#4a4550");
        box(g, r, 400, top - 90, 110, 80, "#d9ccb3");
        box(g, r, 412, top - 80, 86, 56, "#123b2a");
        text(g, "C:\\>_", 440, top - 64, 13, "#5fd38a");
        box(g, r, 395, top - 8, 120, 8, "#d9ccb3", { w: 1.2 });
      },
    },
    { // 27 Artifice
      wall: "#1c2340", frame: "#e9b04a", light: true,
      motif: (g, r) => tile(g, 90, (x, y) => {
        const c = ["#e0662f", "#e9b04a", "#d36b9c", "#5bb3a0"][Math.floor(r() * 4)];
        for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; line(g, r, [[x + Math.cos(a) * 6, y + Math.sin(a) * 6], [x + Math.cos(a) * 18, y + Math.sin(a) * 18]], 1.4, c); }
      }, 0.6),
      props(g, r) {
        box(g, r, 40, FY - 60, 130, 60, "#8a5a3a", { hatch: 6 });
        ["#b3261e", "#3e7cb1", "#e9b04a", "#5b8c5a"].forEach((c, i) => {
          const x = 58 + i * 30;
          box(g, r, x, FY - 110 + (i % 2) * 14, 14, 56, c, { hatch: 4 });
          shape(g, r, [[x - 2, FY - 110 + (i % 2) * 14], [x + 7, FY - 128 + (i % 2) * 14], [x + 16, FY - 110 + (i % 2) * 14]], "#f2ead8");
        });
        box(g, r, 440, FY - 50, 40, 50, "#cfe7f1");
        line(g, r, [[460, FY - 50], [470, FY - 120]], 2);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; line(g, r, [[470, FY - 120], [470 + Math.cos(a) * 16, FY - 120 + Math.sin(a) * 16]], 1.6, "#e9b04a"); }
      },
    },
    { // 28 Pêche
      wall: "#cfe6ef", frame: "#6b4426",
      motif: (g, r) => tile(g, 40, (x, y) => line(g, r, [[x - 10, y], [x - 5, y - 4], [x, y], [x + 5, y + 4], [x + 10, y]], 1.4, "#3e7cb1"), 0.35),
      props(g, r) {
        box(g, r, 40, 100, 140, 70, "#8a5a3a", { hatch: 6 });
        shape(g, r, [[60, 135], [100, 112], [140, 130], [160, 116], [160, 154], [140, 140], [100, 158]], "#5b8c5a", { hatch: 5 });
        g.fillStyle = INK; g.beginPath(); g.arc(78, 132, 3, 0, 7); g.fill();
        for (let i = 0; i < 3; i++) {
          const x = 420 + i * 30;
          line(g, r, [[x, FY], [x + 6, FY - 120], [x + 30, FY - 230]], 2.4, "#6b4426");
          line(g, r, [[x + 30, FY - 230], [x + 32, FY - 150]], 0.8);
        }
        shape(g, r, [[390, FY], [384, FY - 50], [436, FY - 50], [430, FY]], "#9aa0a6", { hatch: 5 });
        line(g, r, Ink.ellipse(410, FY - 50, 26, 18, 10, Math.PI, Math.PI * 2), 1.6);
        Ink.hatch(g, Ink.ellipse(220, FY + 18, 40, 10, 14), r, { gap: 5, alpha: 0.5 });
      },
    },
    { // 29 Fil
      wall: "#f2e6d8", frame: "#7d5ba6",
      motif: (g) => { g.save(); g.globalAlpha = 0.3; g.setLineDash([6, 6]); g.strokeStyle = "#7d5ba6"; g.lineWidth = 1.4; for (let y = 50; y < FY; y += 60) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= RW; x += 40) g.lineTo(x, y + (x % 80 ? 14 : -14)); g.stroke(); } g.restore(); },
      props(g, r) {
        for (const [x, y, s, c] of [[70, FY - 22, 22, "#b3261e"], [120, FY - 18, 18, "#3e7cb1"], [96, FY - 52, 18, "#e9b04a"]]) {
          oval(g, r, x, y, s, s, c);
          for (let k = -2; k <= 2; k++) line(g, r, Ink.ellipse(x, y, s * 0.9, s * 0.4 + k * 2, 10, 0.3 * k, Math.PI + 0.3 * k), 1, INK);
        }
        line(g, r, [[140, FY - 18], [200, FY + 10], [260, FY + 4]], 1.4, "#3e7cb1");
        const top = table(g, r, 380, 160, 76);
        shape(g, r, [[400, top], [400, top - 50], [500, top - 50], [500, top - 30], [470, top - 30], [470, top]], "#e8dcc4", { hatch: 5 });
        line(g, r, [[440, top - 30], [440, top - 6]], 2);
        shelf(g, r, 390, 120, 140);
        ["#d36b9c", "#5b8c5a", "#e0662f", "#7d5ba6"].forEach((c, i) => box(g, r, 402 + i * 32, 98, 18, 22, c, { hatch: 3 }));
      },
    },
    { // 30 Arme
      wall: "#8a8580", frame: "#3b3440",
      motif: (g, r) => tile(g, 60, (x, y) => { line(g, r, [[x - 9, y + 9], [x + 9, y - 9]], 1.4); line(g, r, [[x - 9, y - 9], [x + 9, y + 9]], 1.4); }, 0.3),
      props(g, r) {
        box(g, r, 40, FY - 200, 150, 14, "#6b4426");
        box(g, r, 40, FY - 20, 150, 14, "#6b4426");
        for (let i = 0; i < 4; i++) {
          const x = 60 + i * 36;
          shape(g, r, [[x - 4, FY - 186], [x + 4, FY - 186], [x + 4, FY - 60], [x, FY - 48], [x - 4, FY - 60]], "#c9ced2", { w: 1.4 });
          box(g, r, x - 12, FY - 60, 24, 6, "#6b4426");
          box(g, r, x - 3, FY - 54, 6, 30, "#3b2a1c");
        }
        shape(g, r, [[400, FY - 60], [520, FY - 60], [540, FY - 80], [500, FY - 84], [420, FY - 84], [380, FY - 76]], "#4a4550", { hatch: 5 });
        box(g, r, 430, FY - 60, 60, 60, "#4a4550");
        line(g, r, [[470, FY - 84], [500, FY - 140]], 4, "#6b4426");
        box(g, r, 486, FY - 154, 30, 16, "#4a4550");
      },
    },
    { // 31 Sororité
      wall: "#f3d9a4", frame: "#b3261e",
      motif: (g, r) => tile(g, 56, (x, y) => Ink.heart(g, x, y, 5, "#d36b9c"), 0.25),
      props(g, r) {
        line(g, r, [[0, 30], [140, 60], [280, 40], [420, 60], [RW, 30]], 1.4);
        ["#b3261e", "#e9b04a", "#3e7cb1", "#5b8c5a", "#d36b9c", "#7d5ba6", "#e0662f", "#b3261e", "#e9b04a", "#3e7cb1", "#5b8c5a", "#d36b9c"].forEach((c, i) => {
          const x = 20 + i * 45, y = 36 + Math.sin(i * 1.3) * 10;
          shape(g, r, [[x - 12, y], [x + 12, y], [x, y + 24]], c, { w: 1 });
        });
        const top = table(g, r, 30, 170, 70);
        for (let i = 0; i < 4; i++) box(g, r, 46 + i * 38, top - 26, 20, 26, ["#f2ead8", "#e9b04a", "#d36b9c", "#5bb3a0"][i]);
        box(g, r, 410, 110, 110, 80, "#8a5a3a");
        box(g, r, 418, 118, 94, 64, "#efe5d0");
        for (let i = 0; i < 4; i++) blob(g, r, 432 + i * 22, 176, 0.75);
      },
    },
  ];

  // ---------- Construction des pièces ----------

  const SCALE = 2;
  const cache = new Map();
  function cached(key, w, h, ax, draw) {
    let c = cache.get(key);
    if (c) { cache.delete(key); cache.set(key, c); return c; }
    c = document.createElement("canvas");
    c.width = w * SCALE;
    c.height = h * SCALE;
    const g = c.getContext("2d");
    g.scale(SCALE, SCALE);
    g.translate(ax, 0);
    draw(g);
    c.ax = ax; c.w = w; c.h = h;
    cache.set(key, c);
    if (cache.size > 12) cache.delete(cache.keys().next().value);
    return c;
  }

  function shell(g, r, wall, light) {
    Ink.fill(g, rect(0, 0, RW, FY), r, wall, 0);
    // sol
    Ink.fill(g, rect(0, FY, RW, RH - FY), r, "#b8986e", 0);
    g.save();
    g.strokeStyle = INK;
    g.globalAlpha = 0.35;
    g.lineWidth = 1;
    for (let x = -40; x < RW + 40; x += 40) { g.beginPath(); g.moveTo(x, FY); g.lineTo(x - 18, RH); g.stroke(); }
    g.restore();
    Ink.hatch(g, rect(0, FY + 30, RW, RH - FY - 30), r, { gap: 6, alpha: 0.2 });
    line(g, r, [[0, FY], [RW, FY]], 2.4);
    line(g, r, [[0, FY - 8], [RW, FY - 8]], 1.2, light ? PAPER : INK);
    // poutre du plafond
    box(g, r, -DIV, 0, RW + DIV * 2, 20, "#5a4030", { hatch: 5, w: 2 });
  }

  function divider(g, r, closed) {
    // mur de gauche, avec un passage voûté vers la pièce précédente
    shape(g, r, [[-DIV, 20], [DIV, 20], [DIV, FY - 150], [-DIV, FY - 150]], "#5a4030", { hatch: 5 });
    if (closed) {
      box(g, r, -DIV, FY - 150, DIV * 2, 150, "#2b2731");
      for (let y = FY - 140; y < FY; y += 26) {
        Ink.stroke(g, [[-DIV - 6, y], [DIV + 6, y + 12]], r, { w: 7, color: INK, passes: 1, amp: 1 });
        Ink.stroke(g, [[-DIV - 6, y], [DIV + 6, y + 12]], r, { w: 4.5, color: "#a88a5f", passes: 1, amp: 1 });
      }
    }
  }

  function frame(g, r, color) {
    line(g, r, [[FR.x + 30, FR.y], [RW / 2, FR.y - 22], [FR.x + FR.w - 30, FR.y]], 1.2);
    g.fillStyle = INK;
    g.beginPath(); g.arc(RW / 2, FR.y - 22, 3, 0, 7); g.fill();
    Ink.shadow(g, RW / 2 + 6, FR.y + FR.h / 2 + 8, FR.w / 2 + 4, FR.h / 2 + 4, 0.18);
    box(g, r, FR.x, FR.y, FR.w, FR.h, color, { hatch: 4, hatchColor: PAPER, hatchAlpha: 0.15, w: 2.4 });
    box(g, r, FR.x + 12, FR.y + 12, FR.w - 24, FR.h - 24, "#f6efe0", { w: 1.4 });
  }

  function roomSprite(owner, d, unlocked) {
    const state = d > unlocked ? "locked" : "open";
    const key = d === 0 ? `0|${owner.id}|${owner.pseudo}|${owner.cabin.color}|${owner.owner}` : `${d}|${state}|${owner.id}`;
    return cached(key, RW + DIV, RH, DIV, (g) => {
      const r = Ink.rng(Ink.hash(owner.id) + d * 101);
      if (d === 0) return hall(g, r, owner);
      if (state === "locked") {
        Ink.fill(g, rect(0, 0, RW, RH), r, "#211e24", 0);
        Ink.hatch(g, rect(0, 0, RW, RH), r, { gap: 7, color: PAPER, alpha: 0.06 });
        divider(g, r, true);
        text(g, `Jour ${d}`, RW / 2, RH / 2 - 20, 40, "#6b6170", 700);
        text(g, d === unlocked + 1 ? "s'ouvre à minuit" : "pas encore", RW / 2, RH / 2 + 18, 18, "#6b6170", 500);
        return;
      }
      const th = T[d - 1];
      shell(g, r, th.wall, th.light);
      th.motif(g, r);
      th.props(g, r);
      divider(g, r, false);
      frame(g, r, th.frame);
      text(g, `Jour ${d} · ${THEMES[d - 1]}`, RW / 2, 40, 17, th.light ? PAPER : INK, 700);
    });
  }

  function hall(g, r, owner) {
    shell(g, r, "#e8dcc4", false);
    for (let y = 40; y < FY - 10; y += 22) line(g, r, [[0, y], [RW, y]], 0.8, "rgba(29,26,32,.35)");
    // porte de sortie
    box(g, r, 34, FY - 120, 70, 120, "#6b4426", { hatch: 6 });
    oval(g, r, 92, FY - 60, 4, 4, "#e9b04a");
    box(g, r, 40, FY - 150, 58, 20, "#d8c39a");
    text(g, "Sortie", 69, FY - 140, 13);
    // panneau du propriétaire
    box(g, r, RW / 2 - 110, 60, 220, 70, "#d8c39a", { w: 2.2 });
    text(g, owner.owner ? "Bienvenue à" : "Cabane de", RW / 2, 82, 14, "#6b4426", 500);
    text(g, owner.owner ? "La Canne À Pêche" : owner.pseudo, RW / 2, 108, 24);
    text(g, owner.owner ? "Toutes les pièces sont ouvertes pour toi  →" : "Une pièce s'ouvre chaque nuit  →", RW / 2, 170, 15, "#6b4426", 500);
    rug(g, r, RW / 2, 220, owner.cabin.color);
    if (owner.owner) {
      // pas d'établi : la grande maison ne se décore pas depuis le village
      for (let i = 0; i < 3; i++) line(g, r, [[430 + i * 30, FY], [440 + i * 30, FY - 140], [470 + i * 30, FY - 230]], 2.4, "#6b4426");
      return;
    }
    // établi
    const top = table(g, r, 400, 140, 76, "#8a5a3a");
    box(g, r, 412, top - 26, 22, 26, owner.cabin.color);
    box(g, r, 440, top - 18, 22, 18, "#3e7cb1");
    line(g, r, [[470, top - 4], [520, top - 30]], 3, "#6b4426");
    box(g, r, 508, top - 40, 24, 14, "#4a4550");
    box(g, r, 420, top - 120, 100, 26, "#d8c39a");
    text(g, "Établi", 470, top - 107, 14);
    // portemanteau
    line(g, r, [[200, FY], [200, FY - 130]], 3, "#6b4426");
    line(g, r, [[184, FY - 120], [216, FY - 120]], 3, "#6b4426");
  }

  // ---------- Dessin en direct ----------

  function drawRoom(ctx, owner, d, unlocked, img, mine) {
    const s = roomSprite(owner, d, unlocked);
    const x0 = d * RW;
    ctx.drawImage(s, x0 - s.ax, 0, s.w, s.h);
    if (d === 0 || d > unlocked) return;

    const ix = x0 + FR.x + 18, iy = FR.y + 18, iw = FR.w - 36, ih = FR.h - 36;
    if (img && img.complete && img.naturalWidth) {
      const k = Math.min(iw / img.naturalWidth, ih / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      ctx.drawImage(img, ix + (iw - w) / 2, iy + (ih - h) / 2, w, h);
    } else if (!img) {
      ctx.save();
      ctx.font = `500 13px "Barlow Semi Condensed", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#8a7f72";
      const lines = mine ? ["Accroche ton", "dessin ici"] : ["Pas encore", "de dessin"];
      lines.forEach((l, i) => ctx.fillText(l, x0 + RW / 2, iy + ih / 2 + i * 16));
      ctx.restore();
    }

    const res = owner.games?.[d];
    if (res) {
      // trophée du jeu du jour
      const tx = x0 + RW / 2 + 128, ty = FY;
      ctx.save();
      ctx.fillStyle = "#6b4426";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.fillRect(tx - 16, ty - 26, 32, 26);
      ctx.strokeRect(tx - 16, ty - 26, 32, 26);
      ctx.fillStyle = "#e9b04a";
      ctx.beginPath();
      ctx.moveTo(tx - 13, ty - 58);
      ctx.lineTo(tx + 13, ty - 58);
      ctx.quadraticCurveTo(tx + 12, ty - 36, tx, ty - 34);
      ctx.quadraticCurveTo(tx - 12, ty - 36, tx - 13, ty - 58);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(tx - 3, ty - 34, 6, 8);
      ctx.restore();
      Ink.label(ctx, "★".repeat(res.stars) + "☆".repeat(3 - res.stars), tx, ty - 70, { size: 13, color: "#c9871a" });
    }
  }

  return { RW, RH, FY, FR, ROOMS: 32, drawRoom };
})();
