// Musique et sons entièrement générés (Web Audio) : aucun fichier audio à fournir.
window.Sound = (() => {
  const PREF_KEY = "enxor.sound";
  let prefs = { music: true, sfx: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch { /* rien */ }

  let ac = null, musicBus, sfxBus, musicFilter, noiseBuf, mood = "day", nextNote = 0, step = 0, bar = 0;
  const loops = {};
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------- Mise en route (le navigateur exige un geste de l'utilisateur) ----------

  function ensure() {
    if (ac) {
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.connect(ac.destination);

    const reverb = ac.createConvolver();
    reverb.buffer = impulse(3, 2.4);
    const wet = ac.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet);
    wet.connect(comp);

    musicBus = ac.createGain();
    musicBus.gain.value = prefs.music ? 0.42 : 0;
    musicFilter = ac.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 5000;
    musicFilter.connect(musicBus);
    musicBus.connect(comp);
    const mSend = ac.createGain();
    mSend.gain.value = 0.7;
    musicBus.connect(mSend);
    mSend.connect(reverb);

    sfxBus = ac.createGain();
    sfxBus.gain.value = prefs.sfx ? 0.75 : 0;
    sfxBus.connect(comp);
    const sSend = ac.createGain();
    sSend.gain.value = 0.25;
    sfxBus.connect(sSend);
    sSend.connect(reverb);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    nextNote = ac.currentTime + 0.2;
    setInterval(schedule, 100);
    return ac;
  }
  for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, ensure, { capture: true });

  function impulse(seconds, decay) {
    const len = ac.sampleRate * seconds;
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ---------- Briques de son ----------

  function tone({ freq, type = "sine", t = ac.currentTime, dur = 0.3, vol = 0.2, attack = 0.005, glide, filter, bus = sfxBus, detune = 0 }) {
    const o = ac.createOscillator();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise({ t = ac.currentTime, dur = 0.2, vol = 0.2, freq = 2000, type = "lowpass", q = 0.8, sweep, attack = 0.005, bus = sfxBus }) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // marimba / boîte à musique
  function pluck(freq, t, vol = 0.12, bus = sfxBus, dur = 0.9) {
    tone({ freq, t, vol, dur, bus, attack: 0.003 });
    tone({ freq: freq * 4.01, t, vol: vol * 0.25, dur: dur * 0.25, bus, attack: 0.002 });
  }

  // ---------- Musique générative ----------

  const MOODS = {
    day: { bpm: 74, chords: [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]], scale: [57, 60, 62, 64, 67, 69, 72, 74, 76], density: 0.5, cutoff: 5000, pad: 0.05 },
    night: { bpm: 58, chords: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [50, 53, 57]], scale: [57, 60, 64, 67, 69, 72, 76], density: 0.28, cutoff: 2600, pad: 0.06 },
    inside: { bpm: 68, chords: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], scale: [60, 62, 64, 67, 69, 72, 74, 76, 79], density: 0.42, cutoff: 1800, pad: 0.05 },
    vampire: { bpm: 96, chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], scale: [62, 65, 67, 69, 70, 72, 74, 77], density: 0.85, cutoff: 3400, pad: 0.04, saw: true },
    game: { bpm: 100, chords: [[48, 52, 55], [45, 48, 52], [53, 57, 60], [55, 59, 62]], scale: [60, 62, 64, 67, 69, 72, 74, 76], density: 0.7, cutoff: 4000, pad: 0.04 },
  };

  function schedule() {
    if (!ac || ac.state !== "running") return;
    const m = MOODS[mood] || MOODS.day;
    const eighth = 60 / m.bpm / 2;
    while (nextNote < ac.currentTime + 0.35) {
      const t = nextNote;
      const chord = m.chords[bar % m.chords.length];
      if (step === 0) {
        // nappe douce + basse au début de chaque mesure
        for (const n of chord) {
          for (const det of [-6, 6]) tone({ freq: midi(n), type: "triangle", t, dur: eighth * 8.5, vol: m.pad, attack: 0.9, bus: musicFilter, detune: det });
        }
        tone({ freq: midi(chord[0] - 12), t, dur: eighth * 6, vol: 0.12, attack: 0.05, bus: musicFilter });
      }
      if (Math.random() < m.density * (step % 2 ? 0.7 : 1)) {
        const pool = m.scale.filter((n) => chord.some((c) => (n - c) % 12 === 0) || Math.random() < 0.35);
        const n = pool[Math.floor(Math.random() * pool.length)] || m.scale[0];
        if (m.saw) tone({ freq: midi(n), type: "sawtooth", t, dur: 0.35, vol: 0.05, filter: 1800, bus: musicFilter });
        else pluck(midi(n + (mood === "inside" ? 12 : 0)), t, 0.06, musicFilter, 1.4);
      }
      if (Math.random() < 0.025) pluck(midi(m.scale[m.scale.length - 1] + 12), t, 0.03, musicFilter, 2.5); // goutte d'encre
      updateAmbience(t);
      nextNote += eighth;
      step = (step + 1) % 8;
      if (step === 0) bar++;
    }
  }

  function setMood(m) {
    if (m === mood || !MOODS[m]) return;
    mood = m;
    if (ac) musicFilter.frequency.setTargetAtTime(MOODS[m].cutoff, ac.currentTime, 0.8);
  }

  // ---------- Ambiances (feu, eau, grillons) ----------

  const amb = { fire: 0, water: 0, crickets: 0 };
  function ambience(levels) { Object.assign(amb, levels); }
  function updateAmbience(t) {
    if (amb.fire > 0.02) {
      if (Math.random() < 0.6) noise({ t: t + Math.random() * 0.2, dur: 0.03 + Math.random() * 0.05, vol: 0.18 * amb.fire, freq: 2500 + Math.random() * 3000, type: "highpass" });
      noise({ t, dur: 0.5, vol: 0.05 * amb.fire, freq: 400, attack: 0.2 });
    }
    if (amb.water > 0.02 && Math.random() < 0.35) noise({ t, dur: 0.6, vol: 0.06 * amb.water, freq: 700, sweep: 300, attack: 0.25 });
    if (amb.crickets > 0.02 && Math.random() < 0.25) {
      for (let i = 0; i < 3; i++) tone({ freq: 4200 + Math.random() * 300, t: t + i * 0.05, dur: 0.03, vol: 0.02 * amb.crickets });
    }
  }

  // son continu (ex. grésillement au soleil dans le jeu du vampire)
  function loop(name, vol, freq = 3000) {
    if (!ac) return;
    let l = loops[name];
    if (!l && vol <= 0) return;
    if (!l) {
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = 0;
      src.connect(f);
      f.connect(g);
      g.connect(sfxBus);
      src.start();
      l = loops[name] = { src, g };
    }
    l.g.gain.setTargetAtTime(vol, ac.currentTime, 0.05);
  }
  function stopLoops() {
    for (const k of Object.keys(loops)) { loops[k].src.stop(); delete loops[k]; }
  }

  // ---------- Effets ----------

  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76];
  const FX = {
    step: (v, inside) => noise({ dur: 0.07, vol: 0.05 * v, freq: inside ? 900 : 1600, type: inside ? "lowpass" : "bandpass", q: 1.2 }),
    kick: (v) => { tone({ freq: 160, glide: 60, dur: 0.18, vol: 0.4 * v }); noise({ dur: 0.08, vol: 0.15 * v, freq: 1200 }); },
    door: () => { for (let i = 0; i < 2; i++) tone({ freq: 140, glide: 90, t: ac.currentTime + i * 0.12, dur: 0.12, vol: 0.3, type: "triangle" }); noise({ dur: 0.5, vol: 0.05, freq: 900, sweep: 2400, type: "bandpass", q: 6, attack: 0.1 }); },
    click: () => tone({ freq: 880, dur: 0.06, vol: 0.08, type: "triangle" }),
    chat: () => { tone({ freq: 660, dur: 0.08, vol: 0.08 }); tone({ freq: 990, t: ac.currentTime + 0.06, dur: 0.1, vol: 0.07 }); },
    coeur: (v) => [72, 76, 79].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.07, 0.12 * v)),
    rire: (v) => [0, 1, 2, 3].forEach((i) => tone({ freq: midi(67 + (i % 2) * 5), t: ac.currentTime + i * 0.09, dur: 0.08, vol: 0.1 * v, type: "square", filter: 2000 })),
    surprise: (v) => tone({ freq: 300, glide: 1200, dur: 0.25, vol: 0.14 * v, type: "triangle" }),
    danse: (v) => [60, 64, 67, 72].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.1, 0.1 * v)),
    dodo: (v) => tone({ freq: 400, glide: 180, dur: 0.8, vol: 0.1 * v, attack: 0.1 }),
    splash: (v) => { noise({ dur: 0.35, vol: 0.25 * v, freq: 3000, sweep: 400 }); tone({ freq: 220, glide: 80, dur: 0.2, vol: 0.15 * v }); },
    plouf: (v = 1) => { tone({ freq: 600, glide: 180, dur: 0.15, vol: 0.2 * v }); noise({ dur: 0.3, vol: 0.12 * v, freq: 1500, sweep: 300 }); },
    catch: (v = 1) => [67, 72, 76, 79, 84].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.08, 0.13 * v)),
    junk: (v = 1) => [64, 60, 55].forEach((n, i) => tone({ freq: midi(n), t: ac.currentTime + i * 0.12, dur: 0.15, vol: 0.1 * v, type: "triangle" })),
    miss: () => tone({ freq: 330, glide: 200, dur: 0.3, vol: 0.1, type: "triangle" }),
    note: (v, i) => pluck(midi(PENTA[i % PENTA.length]), ac.currentTime, 0.22 * v, sfxBus, 1.4),
    firework: (v) => { tone({ freq: 90, glide: 40, dur: 0.5, vol: 0.3 * v }); for (let i = 0; i < 10; i++) noise({ t: ac.currentTime + 0.15 + Math.random() * 0.5, dur: 0.03, vol: 0.1 * v, freq: 5000, type: "highpass" }); },
    caw: (v) => { for (let i = 0; i < 2; i++) { const t = ac.currentTime + i * 0.22; tone({ freq: 520, glide: 380, t, dur: 0.16, vol: 0.06 * v, type: "sawtooth", filter: 1400 }); } },
    flap: (v) => { for (let i = 0; i < 4; i++) noise({ t: ac.currentTime + i * 0.07, dur: 0.05, vol: 0.06 * v, freq: 800 }); },
    sit: () => tone({ freq: 220, glide: 160, dur: 0.15, vol: 0.12, type: "triangle" }),
    post: () => { noise({ dur: 0.08, vol: 0.12, freq: 2500 }); tone({ freq: 523, t: ac.currentTime + 0.05, dur: 0.2, vol: 0.08 }); },
    day: () => [69, 72, 76, 81].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.18, 0.12, sfxBus, 2)),
    drop: () => { pluck(midi(84), ac.currentTime, 0.12); pluck(midi(88), ac.currentTime + 0.06, 0.1); },
    die: () => { noise({ dur: 0.9, vol: 0.2, freq: 4000, sweep: 300, attack: 0.05 }); tone({ freq: 330, glide: 110, dur: 0.9, vol: 0.12, type: "triangle" }); },
    win: () => [62, 65, 69, 74, 77].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.1, 0.14, sfxBus, 1.5)),
    start: () => [57, 64, 69].forEach((n, i) => pluck(midi(n), ac.currentTime + i * 0.12, 0.12)),
  };

  // v : volume relatif (pour les sons à distance), extra : paramètre propre à l'effet
  function play(name, v = 1, extra) {
    if (!ac || ac.state !== "running" || !prefs.sfx || v <= 0.01 || !FX[name]) return;
    FX[name](v, extra);
  }

  // ---------- Réglages ----------

  function save() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* rien */ }
  }
  function toggle(kind) {
    prefs[kind] = !prefs[kind];
    save();
    if (ac) {
      if (kind === "music") musicBus.gain.setTargetAtTime(prefs.music ? 0.42 : 0, ac.currentTime, 0.2);
      else sfxBus.gain.setTargetAtTime(prefs.sfx ? 0.75 : 0, ac.currentTime, 0.05);
    }
    return prefs[kind];
  }

  return { ensure, play, setMood, ambience, loop, stopLoops, toggle, get prefs() { return { ...prefs }; } };
})();
