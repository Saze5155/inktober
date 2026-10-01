// Les quêtes des habitants. Chaque quête : un donneur, des étapes, et un trophée (avec sa décoration) à la fin.
// Étapes possibles :
//   collect : ramasser / toucher des points dans le monde (items : positions, verb : le verbe affiché)
//   fish    : pêcher N prises dans une région
//   return  : revenir parler à un habitant

const QUESTS = [
  {
    id: "flamme", giver: "clairene", name: "La flamme éternelle",
    offer: "Les flammes rituelles faiblissent… Trois braises de Solumbris se sont envolées avec le vent : une près du feu du Hameau, une sur la crête dorée, une près du puits de Cendre-Gravée. Tu me les rapporterais ?",
    remind: "Trois braises : près du feu du Hameau, sur la crête dorée et près du puits de Cendre-Gravée.",
    done: ["Elles brûlent encore ! Tant qu'une seule flamme tient bon, la nuit ne reviendra pas.", "Prends ceci. Solumbris veille sur ceux qui portent sa lumière."],
    steps: [
      { type: "collect", text: "Ramasser les 3 braises de Solumbris", verb: "Ramasser la braise", look: "ember",
        items: [{ id: "b1", x: 1330, y: 1440 }, { id: "b2", x: 4950, y: 760 }, { id: "b3", x: 4200, y: 3420 }] },
      { type: "return", npc: "clairene", text: "Rapporter les braises à Clairène, au sanctuaire de Solumbris" },
    ],
    reward: "q_flamme",
  },
  {
    id: "murmures", giver: "ombrin", name: "Les murmures",
    offer: "Tenebros murmure dans les recoins les plus sombres du monde. Va écouter : derrière la grande maison du Hameau, au pied des montagnes de l'ombre, et au fond de la grotte, derrière les montagnes du Seuil.",
    remind: "Écoute les murmures : derrière La Canne À Pêche, au pied des montagnes de l'ombre, et au fond de la Grotte de Mythras.",
    done: ["Tu les as entendus, toi aussi ? « Reviens… je te protégerai. »", "Il cherche son frère depuis mille ans. Garde ce manteau : il t'aidera à te fondre dans l'ombre."],
    steps: [
      { type: "collect", text: "Écouter les 3 murmures de Tenebros", verb: "Écouter le murmure", look: "whisper",
        items: [
          { id: "m1", x: 1250, y: 290, line: "« …Mythras… tu m'entends ? »" },
          { id: "m2", x: 3200, y: 700, line: "« Ils ont tous voté. Moi seul me suis levé. »" },
          { id: "m3", x: 5650, y: 1870, line: "« Reviens… je te protégerai. »" },
        ] },
      { type: "return", npc: "ombrin", text: "Raconter à Ombrin ce que tu as entendu" },
    ],
    reward: "q_murmures",
  },
  {
    id: "peche", giver: "varech", name: "La pêche du jour",
    offer: "Le marché est vide aujourd'hui. Va au bout des pontons et rapporte-moi trois prises. N'importe quoi, même une botte, on la vendra comme antiquité.",
    remind: "Trois prises depuis les pontons de Rive-Basse.",
    done: ["Ha ! Pas mal pour une petite tache d'encre.", "Tiens, des bulles de la mer noire. Elles te suivront partout."],
    steps: [
      { type: "fish", region: "rive", count: 3, text: "Pêcher 3 prises depuis les pontons de Rive-Basse" },
      { type: "return", npc: "varech", text: "Rapporter la pêche à Mère Varech, au marché" },
    ],
    reward: "q_peche",
  },
  {
    id: "tresors", giver: "sel", name: "Les trésors engloutis",
    offer: "La marée a remonté des objets humains sur les pontons. Il y en a quatre, je les ai vus briller. Ramène-les-moi avant que Petit Bulot ne les mange.",
    remind: "Quatre objets humains brillent sur les pontons de Rive-Basse.",
    done: ["Une montre arrêtée, des lunettes, un petit dinosaure, une photo… Les humains gardaient de drôles de choses.", "Prends mes vieilles lunettes de plongée. Moi, j'ai les yeux d'un Profond maintenant."],
    steps: [
      { type: "collect", text: "Trouver les 4 objets humains sur les pontons", verb: "Ramasser", look: "relic",
        items: [
          { id: "t1", x: 900, y: 3215, name: "une montre arrêtée" },
          { id: "t2", x: 2150, y: 3225, name: "des lunettes rayées" },
          { id: "t3", x: 1050, y: 3940, name: "un petit dinosaure en plastique" },
          { id: "t4", x: 1505, y: 3050, name: "une photo délavée" },
        ] },
      { type: "return", npc: "sel", text: "Rapporter les trésors à Sel, au bout du grand ponton" },
    ],
    reward: "q_tresors",
  },
  {
    id: "vent", giver: "ocre", name: "Le vent qui ne vient jamais",
    offer: "Ça fait si longtemps qu'on n'a pas eu de vent… On raconte qu'au Hameau, près de l'étang, un enfant a perdu un petit moulin à vent. S'il tournait ici, peut-être que le vent reviendrait ?",
    remind: "Le petit moulin à vent est près de l'étang du Hameau.",
    done: ["Un moulin à vent ? Pour moi ? C'est… c'est la première fois qu'on m'apporte quelque chose.", "Tiens, un nouveau visage ! Bienvenue à Cendre-Gravée. Personne ne passe jamais par ici.", "(Elle porte déjà une girouette sur la tête. Elle t'en tend une autre, exactement pareille.)"],
    steps: [
      { type: "collect", text: "Trouver le petit moulin à vent près de l'étang du Hameau", verb: "Ramasser le moulin à vent", look: "relic",
        items: [{ id: "v1", x: 640, y: 540, name: "un petit moulin à vent" }] },
      { type: "return", npc: "ocre", text: "Apporter le moulin à vent à Ocre, au puits de Cendre-Gravée" },
    ],
    reward: "q_vent",
  },
  {
    id: "balai", giver: "gris", name: "Le balai de la frontière",
    offer: "Les jumeaux se sont encore disputés cette nuit : il y a des taches d'encre tout le long de la frontière. Tu m'aides à balayer ? Il y en a cinq, de la montagne jusqu'au désert.",
    remind: "Cinq taches d'encre sur la ligne entre l'ombre et la lumière.",
    done: ["Propre comme au premier jour. Enfin… comme au premier jour après l'Éclipse.", "Garde le balai. Il a balayé plus de disputes divines que tu ne l'imagines."],
    steps: [
      { type: "collect", text: "Balayer les 5 taches d'encre sur la frontière", verb: "Balayer la tache", look: "stain",
        items: [{ id: "g1", x: 4005, y: 420 }, { id: "g2", x: 4053, y: 780 }, { id: "g3", x: 4130, y: 1440 }, { id: "g4", x: 4175, y: 1820 }, { id: "g5", x: 4222, y: 2220 }] },
      { type: "return", npc: "gris", text: "Retourner voir le Vieux Gris au pilier" },
    ],
    reward: "q_balai",
  },
  {
    id: "toctoc", giver: "bulot", name: "Toc toc toc",
    offer: "J'ai un plan secret : si on tape trois fois sur trois piliers marqués des pontons, les poissons viendront nous dire bonjour. Tu le fais avec moi ? Les piliers ont une croix blanche.",
    remind: "Taper sur les trois piliers marqués d'une croix blanche.",
    done: ["T'as entendu ?! Un poisson a fait « bloup » ! Ça marche !", "Tiens, c'est mon étoile de mer porte-bonheur. Enfin, maintenant c'est la tienne."],
    steps: [
      { type: "collect", text: "Taper sur les 3 piliers marqués", verb: "Taper trois fois", look: "mark",
        items: [{ id: "c1", x: 1200, y: 3220, line: "Toc, toc, toc." }, { id: "c2", x: 1800, y: 3220, line: "Toc, toc, toc. (Un bloup lointain ?)" }, { id: "c3", x: 1505, y: 3830, line: "Toc, toc… TOC." }] },
      { type: "return", npc: "bulot", text: "Revenir voir Petit Bulot" },
    ],
    reward: "q_toctoc",
  },
  {
    id: "epreuve", giver: "liane", name: "L'épreuve de Verdanya",
    offer: "Tu veux connaître la jungle ? Alors touche les trois totems de Verdanya, au plus profond des arbres. Beaucoup sont partis. Peu sont revenus. (Bon, d'accord, tous sont revenus, mais en retard.)",
    remind: "Les trois totems de Verdanya sont cachés au nord, à l'est et au sud de la jungle.",
    done: ["Tu es revenu. La jungle t'a laissé passer, c'est qu'elle t'aime bien.", "Porte ce masque de chasse. Verdanya ne juge personne, mais elle reconnaît les siens."],
    steps: [
      { type: "collect", text: "Toucher les 3 totems de Verdanya", verb: "Toucher le totem", look: "totem",
        items: [{ id: "e1", x: 5550, y: 2700 }, { id: "e2", x: 6220, y: 3250 }, { id: "e3", x: 5700, y: 4330 }] },
      { type: "return", npc: "liane", text: "Retourner voir Liane dans la clairière" },
    ],
    reward: "q_epreuve",
  },
];

module.exports = function createQuests({ trophies, save, io, publicPlayer, inRegion }) {
  const byId = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
  const state = (p) => (p.quests ||= {});
  const update = (p) => { save(); io.emit("player:update", publicPlayer(p)); };

  function accept(p, id) {
    const q = byId[id];
    if (!q || state(p)[id]) return;
    state(p)[id] = { step: 0, got: [], count: 0, done: false };
    update(p);
  }

  // ramasser / toucher un point de quête (il faut être à côté)
  function collect(p, id, itemId, pos) {
    const q = byId[id], st = state(p)[id];
    if (!q || !st || st.done) return null;
    const step = q.steps[st.step];
    if (step.type !== "collect") return null;
    const item = step.items.find((i) => i.id === itemId);
    if (!item || st.got.includes(itemId) || Math.hypot(pos.x - item.x, pos.y - item.y) > 140) return null;
    st.got.push(itemId);
    if (st.got.length >= step.items.length) { st.step++; st.got = []; }
    update(p);
    return item;
  }

  function fished(p, pos) {
    for (const q of QUESTS) {
      const st = state(p)[q.id];
      const step = st && !st.done && q.steps[st.step];
      if (step?.type === "fish" && inRegion(pos, step.region)) {
        st.count++;
        if (st.count >= step.count) { st.step++; st.count = 0; }
        update(p);
      }
    }
  }

  // parler à un habitant : termine les quêtes dont c'est l'étape de retour
  function talked(p, npcId) {
    const finished = [];
    for (const q of QUESTS) {
      const st = state(p)[q.id];
      const step = st && !st.done && q.steps[st.step];
      if (step?.type === "return" && step.npc === npcId) {
        st.done = true;
        finished.push(q.id);
        trophies.award(p, q.reward);
      }
    }
    if (finished.length) update(p);
    return finished;
  }

  return { QUESTS, accept, collect, fished, talked };
};
