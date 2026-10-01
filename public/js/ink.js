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
    const { seed = 0, color = "#e9b04a", moving = false, face = 1, rod = false } = o;
    const ph = seed * 1.7;
    const bob = moving ? Math.abs(Math.sin(t * 11 + ph)) * 5 : Math.sin(t * 2 + ph) * 1.5;
    const sq = moving ? Math.sin(t * 22 + ph) * 0.06 : Math.sin(t * 2.4 + ph) * 0.03;
    const R = 17, cx = x, cy = y - 20 - bob;

    shadow(ctx, x, y, 15 - bob * 0.8, 5, 0.2);

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

    // goutte de couleur qui flotte au-dessus de la tête
    const gy = cy - R - 6 + Math.sin(t * 3 + ph) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, gy - 8);
    ctx.quadraticCurveTo(cx + 6, gy + 1, cx, gy + 3);
    ctx.quadraticCurveTo(cx - 6, gy + 1, cx, gy - 8);
    ctx.fill();

    // yeux
    const blink = (t + seed * 0.37) % 4.2 < 0.13;
    for (const s of [-1, 1]) {
      const ex = cx + s * 6 + face * 2.5, ey = cy - 3;
      if (blink) {
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
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(ex + face * 1.5, ey + 0.5, 2.2, 0, TAU);
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
    grain, splat, crack, grass, stone, ruin, lamp, deadTree, enxor, label, bubble,
  };
})();
