// Boîte à outils « encre » : tout est dessiné par le code, avec des traits tremblés façon plume.
window.Ink = (() => {
  const INK = "#1d1a20";
  const PAPER = "#efe5d0";
  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // ---------- Tracés de base ----------

  function jitter(pts, r, amp, closed, step = 14) {
    const out = [];
    const n = pts.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % n];
      const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
      for (let s = 0; s < steps; s++) {
        const k = s / steps;
        out.push([ax + (bx - ax) * k + (r() - 0.5) * amp, ay + (by - ay) * k + (r() - 0.5) * amp]);
      }
    }
    if (!closed) {
      const [lx, ly] = pts[n - 1];
      out.push([lx + (r() - 0.5) * amp, ly + (r() - 0.5) * amp]);
    }
    return out;
  }

  function trace(ctx, pts, closed) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.beginPath();
    if (closed) {
      const m = mid(pts[n - 1], pts[0]);
      ctx.moveTo(m[0], m[1]);
      for (let i = 0; i < n; i++) {
        const q = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const q = mid(pts[i], pts[i + 1]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }

  function stroke(ctx, pts, r, o = {}) {
    const { w = 2, amp = 2.2, closed = false, color = INK, passes = 2, alpha = 1, step } = o;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < passes; i++) {
      ctx.globalAlpha *= i === 0 ? alpha : 0.45;
      ctx.lineWidth = i === 0 ? w : w * 0.6;
      trace(ctx, jitter(pts, r, amp * (i ? 1.6 : 1), closed, step), closed);
      ctx.stroke();
    }
    ctx.restore();
  }

  function fill(ctx, pts, r, color, amp = 1.5) {
    ctx.save();
    ctx.fillStyle = color;
    trace(ctx, jitter(pts, r, amp, true), true);
    ctx.fill();
    ctx.restore();
  }

  function hatch(ctx, pts, r, o = {}) {
    const { gap = 6, angle = -0.9, color = INK, w = 1, alpha = 0.5 } = o;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.globalAlpha *= alpha;
    ctx.lineCap = "round";
    for (let d = -R; d <= R; d += gap) {
      const off = d + (r() - 0.5) * gap * 0.4;
      const ox = cx - sin * off, oy = cy + cos * off;
      ctx.beginPath();
      ctx.moveTo(ox - cos * R, oy - sin * R);
      ctx.lineTo(ox + cos * R + (r() - 0.5) * 4, oy + sin * R + (r() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function ellipse(cx, cy, rx, ry, n = 28, a0 = 0, a1 = TAU) {
    const full = a1 - a0 >= TAU - 1e-6;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / (full ? n : n - 1);
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return pts;
  }

  function rect(x, y, w, h) {
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }

  function shadow(ctx, x, y, rx, ry, alpha = 0.16) {
    ctx.save();
    ctx.fillStyle = `rgba(29,26,32,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Texture & décor ----------

  function grain(ctx) {
    const c = document.createElement("canvas");
    c.width = c.height = 220;
    const g = c.getContext("2d");
    const img = g.createImageData(220, 220);
    const r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r();
      img.data[i] = 70; img.data[i + 1] = 52; img.data[i + 2] = 36;
      img.data[i + 3] = v < 0.55 ? 0 : (v - 0.55) * 40;
    }
    g.putImageData(img, 0, 0);
    return ctx.createPattern(c, "repeat");
  }

  function splat(ctx, x, y, size, r, color = INK, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const pts = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      const s = size * (0.7 + r() * 0.5) * (r() < 0.15 ? 1.4 : 1);
      pts.push([x + Math.cos(a) * s, y + Math.sin(a) * s * 0.6]);
    }
    trace(ctx, pts, true);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = r() * TAU, d = size * (1.2 + r() * 1.2);
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, size * 0.12 * (0.5 + r()), size * 0.08 * (0.5 + r()), 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function crack(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    let a = r() * TAU;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const n = 4 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 1.2;
      x += Math.cos(a) * (8 + r() * 12);
      y += Math.sin(a) * (8 + r() * 12) * 0.6;
      ctx.lineTo(x, y);
      if (r() < 0.3) {
        const b = a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6);
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(b) * 10, y + Math.sin(b) * 6);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function grass(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.5 + r() * 0.3;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.1 + (r() - 0.5) * 0.2;
      const l = 6 + r() * 8;
      const bx = x + (i - n / 2) * 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx + Math.cos(a) * l * 0.4, y + Math.sin(a) * l * 0.6, bx + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    ctx.restore();
  }

  function stone(ctx, x, y, r) {
    const rx = 4 + r() * 8;
    const pts = ellipse(x, y, rx, rx * 0.6, 10);
    fill(ctx, pts, r, "#ddd0b6", 1.2);
    stroke(ctx, pts, r, { w: 1.2, closed: true, amp: 1.2, passes: 1, step: 6 });
  }

  function ruin(ctx, x, y, r) {
    const w = 60 + r() * 110, h = 35 + r() * 45;
    const n = 5 + Math.floor(r() * 5);
    const top = [];
    for (let i = 0; i <= n; i++) top.push([x - w / 2 + (w * i) / n, y - h * (0.35 + r() * 0.65)]);
    const pts = [[x - w / 2, y], ...top, [x + w / 2, y]];
    shadow(ctx, x, y + 2, w * 0.55, 8);
    fill(ctx, pts, r, "#e3d7bf");
    hatch(ctx, pts, r, { gap: 7, alpha: 0.28 });
    ctx.save();
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) ctx.strokeRect(x - w / 2 + r() * w * 0.85, y - 8 - r() * h * 0.8, 14, 7);
    ctx.restore();
    stroke(ctx, pts, r, { w: 2 });
    for (let k = 0; k < 5; k++) stone(ctx, x - w / 2 - 10 + r() * (w + 20), y + 4 + r() * 8, r);
  }

  function lamp(ctx, x, y, r) {
    const lean = (r() - 0.5) * 0.5, h = 90 + r() * 30;
    const tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean) * h;
    const dir = r() < 0.5 ? -1 : 1;
    shadow(ctx, x, y, 12, 4);
    stroke(ctx, [[x, y], [tx, ty]], r, { w: 3 });
    stroke(ctx, [[tx, ty], [tx + dir * 14, ty - 6], [tx + dir * 24, ty + 4]], r, { w: 2.4, step: 6 });
    const hx = tx + dir * 24, hy = ty + 4;
    fill(ctx, [[hx - 7, hy], [hx + 7, hy], [hx + 4, hy + 10], [hx - 4, hy + 10]], r, INK, 0.8);
    return { x: hx, y: hy + 10 };
  }

  function branch(ctx, x, y, r, len, angle, depth, w) {
    if (depth === 0 || len < 4) return;
    const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.3, (y + y2) / 2 + (r() - 0.5) * len * 0.3, x2, y2);
    ctx.stroke();
    const n = r() < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) branch(ctx, x2, y2, r, len * (0.6 + r() * 0.2), angle + (r() - 0.5) * 1.3, depth - 1, w * 0.68);
  }

  function deadTree(ctx, x, y, r, size) {
    shadow(ctx, x, y, size * 0.32, size * 0.08);
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    branch(ctx, x, y, r, size * 0.42, -Math.PI / 2 + (r() - 0.5) * 0.2, 6, size * 0.09);
    ctx.restore();
  }

  // ---------- Les Enxors ----------

  function enxor(ctx, x, y, t, o = {}) {
    const { seed = 0, color = "#e9b04a", moving = false, face = 1, rod = false, fangs = false } = o;
    const emote = o.emote && o.et < 2.5 ? o.emote : null;
    const ph = seed * 1.7;
    let bob = moving ? Math.abs(Math.sin(t * 11 + ph)) * 5 : Math.sin(t * 2 + ph) * 1.5;
    const sq = moving ? Math.sin(t * 22 + ph) * 0.06 : Math.sin(t * 2.4 + ph) * 0.03;
    let cx = x;
    if (emote === "surprise") bob += Math.max(0, Math.sin(Math.min(o.et, 0.5) * 2 * Math.PI)) * 14;
    if (emote === "danse") { cx += Math.sin(t * 9) * 6; bob += Math.abs(Math.sin(t * 9)) * 5; }
    if (emote === "rire") cx += Math.sin(t * 45) * 1.5;
    if (emote === "coeur") bob += Math.abs(Math.sin(t * 6)) * 3;
    const R = 17, cy = y - 20 - bob;
    const wear = o.wear || {};

    shadow(ctx, x, y, 15 - bob * 0.8, 5, 0.2);
    wearBack(ctx, wear.back, cx, cy, t, face);

    // corps d'encre qui ondule et coule par le bas
    const pts = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU;
      let rr = R + Math.sin(a * 3 + t * 3 + ph) * 1.3 + Math.sin(a * 5 - t * 2.2) * 0.9;
      const down = Math.sin(a);
      if (down > 0.2) rr += Math.max(0, Math.sin(a * 6 + ph + t * 1.5)) * 5 * down;
      pts.push([cx + Math.cos(a) * rr * (1 + sq), cy + Math.sin(a) * rr * (1 - sq) * 1.05]);
    }
    ctx.save();
    ctx.fillStyle = INK;
    trace(ctx, pts, true);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 2, R * 0.65, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();

    // goutte de couleur qui flotte au-dessus de la tête (plus haut si on porte un chapeau)
    const gy = cy - R - 6 - (wear.head ? 16 : 0) + Math.sin(t * 3 + ph) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, gy - 8);
    ctx.quadraticCurveTo(cx + 6, gy + 1, cx, gy + 3);
    ctx.quadraticCurveTo(cx - 6, gy + 1, cx, gy - 8);
    ctx.fill();

    // yeux
    const blink = (t + seed * 0.37) % 4.2 < 0.13 || emote === "dodo";
    const happy = emote === "rire" || emote === "coeur" || emote === "danse";
    for (const s of [-1, 1]) {
      const ex = cx + s * 6 + face * 2.5, ey = cy - 3;
      if (happy) {
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(ex, ey + 2, 3.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (blink) {
        ctx.strokeStyle = PAPER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - 3.5, ey);
        ctx.lineTo(ex + 3.5, ey);
        ctx.stroke();
      } else {
        ctx.fillStyle = PAPER;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 4, 5.2, 0, 0, TAU);
        ctx.fill();
        const pupil = o.eyes || (wear.face === "yeuxrouges" ? "#b3261e" : null);
        ctx.fillStyle = pupil || INK;
        ctx.beginPath();
        ctx.arc(ex + face * 1.5, ey + 0.5, pupil ? 2.8 : 2.2, 0, TAU);
        ctx.fill();
      }
    }

    if (fangs || wear.face === "crocs") {
      ctx.fillStyle = PAPER;
      for (const s of [-1, 1]) {
        const fx = cx + face * 2.5 + s * 3;
        ctx.beginPath();
        ctx.moveTo(fx - 1.8, cy + 5);
        ctx.lineTo(fx + 1.8, cy + 5);
        ctx.lineTo(fx, cy + 10);
        ctx.fill();
      }
    }

    if (rod) {
      const hx = cx + face * 14, hy = cy + 4;
      ctx.strokeStyle = "#6b4426";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(hx + face * 10, hy - 26, hx + face * 24, hy - 30);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx + face * 24, hy - 30);
      ctx.lineTo(hx + face * 24, hy - 6 + Math.sin(t * 3) * 2);
      ctx.stroke();
    }
    if (wear.back === "echarpe") wearScarf(ctx, cx, cy, t, face);
    wearHead(ctx, wear.head, cx, cy - R, t, face);
    wearAura(ctx, wear.aura, cx, cy, t, ph);
    ctx.restore();
  }

  // ---------- Décorations (débloquées par les trophées) ----------

  function wearBack(ctx, item, cx, cy, t, face) {
    if (item === "cape") {
      const fl = Math.sin(t * 4) * 2;
      ctx.save();
      ctx.fillStyle = "#7a1426";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 8);
      ctx.quadraticCurveTo(cx - 30 - fl, cy + 10, cx - 22, cy + 26);
      ctx.lineTo(cx + 22, cy + 26);
      ctx.quadraticCurveTo(cx + 30 + fl, cy + 10, cx + 14, cy - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // grand col
      ctx.fillStyle = INK;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 8, cy - 4);
        ctx.lineTo(cx + s * 24, cy - 22);
        ctx.lineTo(cx + s * 16, cy - 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (item === "ailes") {
      const flap = Math.sin(t * 6) * 0.25;
      ctx.save();
      ctx.fillStyle = "#5a1622";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + s * 12, cy - 4);
        ctx.rotate(s * (0.3 + flap));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 30, -22);
        ctx.lineTo(s * 26, -4);
        ctx.lineTo(s * 34, 2);
        ctx.lineTo(s * 22, 8);
        ctx.lineTo(s * 26, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function wearScarf(ctx, cx, cy, t, face) {
    ctx.save();
    ctx.fillStyle = "#e9b04a";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 9, 15, 5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const w = Math.sin(t * 5) * 3;
    ctx.beginPath();
    ctx.moveTo(cx - face * 8, cy + 10);
    ctx.lineTo(cx - face * 22, cy + 22 + w);
    ctx.lineTo(cx - face * 14, cy + 25 + w);
    ctx.lineTo(cx - face * 3, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function wearHead(ctx, item, cx, top, t, face) {
    if (!item) return;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    if (item === "cornes") {
      ctx.fillStyle = "#3b3440";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 5, top + 4);
        ctx.quadraticCurveTo(cx + s * 16, top - 6, cx + s * 20, top - 18);
        ctx.quadraticCurveTo(cx + s * 10, top - 8, cx + s * 11, top + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (item === "bob") {
      ctx.fillStyle = "#5b8c5a";
      ctx.beginPath();
      ctx.ellipse(cx, top + 2, 19, 5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 12, top + 1);
      ctx.quadraticCurveTo(cx - 11, top - 13, cx, top - 13);
      ctx.quadraticCurveTo(cx + 11, top - 13, cx + 12, top + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0662f";
      ctx.beginPath();
      ctx.moveTo(cx + 6, top - 6); ctx.lineTo(cx + 14, top - 10); ctx.lineTo(cx + 10, top - 3);
      ctx.fill();
    } else if (item === "oreilles") {
      ctx.fillStyle = "#6b6170";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 4, top + 6);
        ctx.lineTo(cx + s * 13, top - 14 + Math.sin(t * 3 + s) * 1.5);
        ctx.lineTo(cx + s * 17, top + 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (item === "botte") {
      ctx.fillStyle = "#6b4426";
      ctx.beginPath();
      ctx.moveTo(cx - 8, top + 3);
      ctx.lineTo(cx - 8, top - 18);
      ctx.lineTo(cx + 4, top - 18);
      ctx.lineTo(cx + 4, top - 6);
      ctx.lineTo(cx + 15, top - 4);
      ctx.lineTo(cx + 15, top + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item === "plume") {
      ctx.fillStyle = "#efe5d0";
      ctx.save();
      ctx.translate(cx + face * 8, top + 2);
      ctx.rotate(face * 0.5 + Math.sin(t * 2) * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-7, -14, 0, -28);
      ctx.quadraticCurveTo(7, -14, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function wearAura(ctx, item, cx, cy, t, ph) {
    if (!item) return;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.5 + i / 5 + ph) % 1;
      const x = cx + Math.sin(i * 2.4 + t * 1.3) * 18, y = cy + 14 - p * 46;
      ctx.globalAlpha = Math.sin(p * Math.PI);
      if (item === "braises") {
        ctx.fillStyle = i % 2 ? "#e0662f" : "#e9b04a";
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
      } else if (item === "notes") {
        word(ctx, "♪", x, y, 12, INK, 700);
      } else if (item === "paillettes") {
        ctx.fillStyle = ["#e0662f", "#e9b04a", "#5bb3a0", "#3e7cb1", "#d36b9c"][i];
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4, rr = k % 2 ? 1.2 : 3.6;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- Emotes ----------

  function heart(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.7, y - s * 0.2, x - s * 0.6, y - s * 1.5, x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.5, x + s * 1.7, y - s * 0.2, x, y + s * 0.9);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  function word(ctx, text, x, y, size, color, weight = 800) {
    ctx.font = `${weight} ${size}px "Barlow Semi Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAPER;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // et = secondes depuis le début de l'emote (dure 2,5 s)
  function emote(ctx, x, y, type, et, t) {
    const a = Math.min(1, et * 6, (2.5 - et) * 3);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const by = y - 84 - Math.min(1, et * 4) * 6;
    if (type === "coeur") {
      heart(ctx, x, by, 10 * (1 + Math.sin(et * 10) * 0.12), "#c0392b");
    } else if (type === "rire") {
      word(ctx, "HA HA", x + Math.sin(t * 40) * 2, by, 16, INK);
    } else if (type === "surprise") {
      word(ctx, "!", x, by - 4, 34, "#e0662f", 900);
    } else if (type === "danse") {
      for (let i = 0; i < 2; i++) {
        const p = (et * 0.8 + i * 0.5) % 1;
        word(ctx, "♪", x - 14 + i * 28 + Math.sin(t * 6 + i) * 4, by + 8 - p * 24, 20, INK);
      }
    } else if (type === "dodo") {
      ["z", "Z", "z"].forEach((z, i) => {
        const p = (et * 0.6 + i / 3) % 1;
        ctx.globalAlpha = a * (1 - p);
        word(ctx, z, x + 10 + p * 16 + i * 4, by + 10 - p * 30, 13 + i * 3, INK);
      });
    } else if (type === "splash") {
      ctx.fillStyle = INK;
      const k = Math.min(1, et * 2.5);
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU + i;
        const d = 18 + k * (30 + (i % 3) * 12);
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * d, y - 20 + Math.sin(ang) * d * 0.7, (1 - k) * 4 + 1.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- Textes ----------

  function label(ctx, text, x, y, o = {}) {
    const { color = INK, size = 14, weight = 700, dot } = o;
    ctx.save();
    ctx.font = `${weight} ${size}px "Barlow Semi Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAPER;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    if (dot) {
      const w = ctx.measureText(text).width;
      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(x - w / 2 - 8, y, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function bubble(ctx, text, x, y) {
    ctx.save();
    ctx.font = `500 14px "Barlow Semi Condensed", sans-serif`;
    const lines = [];
    let line = "";
    for (const w of text.split(" ")) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > 180 && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
    const lh = 17;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const bh = lines.length * lh + 12;
    const bx = x - bw / 2, by = y - bh - 10;
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, by + bh);
    ctx.lineTo(x, by + bh + 8);
    ctx.lineTo(x + 6, by + bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAPER;
    ctx.fillRect(x - 5, by + bh - 2, 10, 3);
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, x, by + 6 + i * lh));
    ctx.restore();
  }

  return {
    INK, PAPER, rng, hash, jitter, trace, stroke, fill, hatch, ellipse, rect, shadow,
    grain, splat, crack, grass, stone, ruin, lamp, deadTree, enxor, emote, heart, word, label, bubble,
  };
})();
