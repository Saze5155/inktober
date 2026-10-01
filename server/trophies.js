// Trophées et décorations : chaque trophée débloque une décoration pour son Enxor.

const COSMETICS = {
  cape: { slot: "back", name: "Cape de vampire" },
  ailes: { slot: "back", name: "Ailes de dragon" },
  echarpe: { slot: "back", name: "Écharpe du conseil" },
  crocs: { slot: "face", name: "Crocs" },
  yeuxrouges: { slot: "face", name: "Yeux rouges" },
  cornes: { slot: "head", name: "Cornes des cinq frères" },
  bob: { slot: "head", name: "Bob de pêcheur" },
  oreilles: { slot: "head", name: "Oreilles de loup" },
  botte: { slot: "head", name: "Botte d'humain" },
  plume: { slot: "head", name: "Plume d'écrivain" },
  braises: { slot: "aura", name: "Braises" },
  notes: { slot: "aura", name: "Notes de musique" },
  paillettes: { slot: "aura", name: "Paillettes de Prismaelyx" },
  capuche: { slot: "head", name: "Capuche du pèlerin" },
  beret: { slot: "head", name: "Béret de peintre" },
  taches: { slot: "aura", name: "Taches de peinture" },
  sablier: { slot: "aura", name: "Sable de Silentis" },
  flamme: { slot: "aura", name: "Flamme de Solumbris" },
  manteau: { slot: "back", name: "Manteau d'ombre" },
  bulles: { slot: "aura", name: "Bulles de la mer noire" },
  lunettes: { slot: "face", name: "Lunettes de plongée" },
  girouette: { slot: "head", name: "Girouette" },
  balai: { slot: "back", name: "Balai de la frontière" },
  etoilemer: { slot: "head", name: "Étoile de mer" },
  masque: { slot: "face", name: "Masque de chasse" },
  livre: { slot: "aura", name: "Pages du Bestiaire" },
  etoiles: { slot: "aura", name: "Poussière d'étoiles" },
};
const SLOTS = ["head", "face", "back", "aura"];

// day : trophée lié à un vestige (seulement obtenable ce jour-là), secret : caché tant qu'on ne l'a pas
const TROPHIES = [
  { id: "assoiffe", day: 1, name: "Assoiffé", desc: "Mordre 5 Enxors différents le jour du vampire.", goal: 5, stat: "bites", reward: ["cape", "crocs"] },
  { id: "enfantnuit", day: 1, name: "Enfant de la nuit", desc: "3 étoiles à « L'ombre du vampire ».", reward: ["yeuxrouges"] },
  { id: "cinqfreres", day: 2, name: "Les cinq frères", desc: "Rapporter les cinq écailles des dragons de Mythras.", reward: ["cornes"] },
  { id: "souffle", day: 2, name: "Souffle de Vermillax", desc: "3 étoiles à « Les cinq frères ».", reward: ["ailes"] },
  { id: "cracheur", day: 2, name: "Cracheur de feu", desc: "Souffler du feu sur 5 Enxors différents le jour du dragon.", goal: 5, stat: "flames", reward: ["braises"] },
  { id: "chromatique", day: 3, name: "Œil chromatique", desc: "3 étoiles aux « Couleurs volées » : battre Prismaelyx à son propre jeu.", reward: ["beret"] },
  { id: "barbouilleur", day: 3, name: "Barbouilleur", desc: "Peindre 5 Enxors différents le jour des couleurs.", goal: 5, stat: "paints", reward: ["taches"] },
  { id: "pecheur", name: "Pêcheur de Rive-Basse", desc: "Pêcher 10 prises dans l'étang.", goal: 10, stat: "catches", reward: ["bob"] },
  { id: "botte", secret: true, name: "Vestige humain", desc: "Pêcher une vieille botte d'humain.", reward: ["botte"] },
  { id: "melomane", name: "Mélomane", desc: "Jouer 40 notes sur les pierres musicales.", goal: 40, stat: "notes", reward: ["notes"] },
  { id: "plume", name: "Plume du mur", desc: "Épingler 3 mots sur le mur des mots.", goal: 3, stat: "posts", reward: ["plume"] },
  { id: "danseur", name: "Prismaelyx applaudit", desc: "Danser 20 fois.", goal: 20, stat: "dances", reward: ["paillettes"] },
  { id: "loupalpha", secret: true, name: "Loup alpha", desc: "Gagner une partie de loup-garou en tant que loup.", reward: ["oreilles"] },
  { id: "sage", name: "Sage du conseil", desc: "Gagner une partie de loup-garou avec le village.", reward: ["echarpe"] },
  { id: "pelerin", name: "Pèlerin d'Enxor", desc: "Parler à tous les habitants du monde (12).", goal: 12, stat: "npcs", reward: ["capuche"] },
  { id: "bibliothecaire", name: "Bibliothécaire de Mythras", desc: "Retrouver les 14 pages du Bestiaire.", goal: 14, stat: "pages", reward: ["livre"] },
  { id: "temoin", name: "Témoin des légendes", desc: "Apercevoir 5 Enfants de Mythras dans le monde.", goal: 5, stat: "legends", reward: ["etoiles"] },
  { id: "q_flamme", name: "La flamme éternelle", desc: "Quête de Clairène, au sanctuaire de Solumbris.", reward: ["flamme"] },
  { id: "q_murmures", name: "Les murmures", desc: "Quête d'Ombrin, au sanctuaire de Tenebros.", reward: ["manteau"] },
  { id: "q_peche", name: "La pêche du jour", desc: "Quête de Mère Varech, au marché de Rive-Basse.", reward: ["bulles"] },
  { id: "q_tresors", name: "Les trésors engloutis", desc: "Quête de Sel, au bout du grand ponton.", reward: ["lunettes"] },
  { id: "q_vent", name: "Le vent qui ne vient jamais", desc: "Quête d'Ocre, au puits de Cendre-Gravée.", reward: ["girouette"] },
  { id: "q_balai", name: "Le balai de la frontière", desc: "Quête du Vieux Gris, au pilier du Seuil.", reward: ["balai"] },
  { id: "q_toctoc", name: "Toc toc toc", desc: "Quête de Petit Bulot, sur les pontons.", reward: ["etoilemer"] },
  { id: "q_epreuve", name: "L'épreuve de Verdanya", desc: "Quête de Liane, dans la jungle.", reward: ["masque"] },
  { id: "dejavu", secret: true, name: "Déjà-vu", desc: "Remarquer que les journées se répètent à Cendre-Gravée (parler 3 fois à Ocre).", goal: 3, stat: "ocre", reward: ["sablier"] },
];
const byId = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));

// liste envoyée aux navigateurs (les secrets non obtenus sont masqués côté client)
const catalog = () => ({ cosmetics: COSMETICS, slots: SLOTS, trophies: TROPHIES });

module.exports = function createTrophies({ io, save, publicPlayer }) {
  function ensure(p) {
    p.trophies ||= {};
    p.stats ||= {};
    p.wear ||= {};
    return p;
  }

  function award(p, id) {
    ensure(p);
    const t = byId[id];
    if (!t || p.trophies[id]) return;
    p.trophies[id] = Date.now();
    save();
    io.to("p:" + p.id).emit("trophy", { id });
    io.emit("trophy:announce", { pseudo: p.pseudo, name: t.name });
    io.emit("player:update", publicPlayer(p));
  }

  // compteur simple (ou ensemble de cibles différentes si `unique` est donné)
  function bump(p, stat, unique) {
    ensure(p);
    if (unique !== undefined) {
      const list = (p.stats[stat] ||= []);
      if (!Array.isArray(list) || list.includes(unique)) return;
      list.push(unique);
    } else p.stats[stat] = (p.stats[stat] || 0) + 1;
    const count = Array.isArray(p.stats[stat]) ? p.stats[stat].length : p.stats[stat];
    for (const t of TROPHIES) if (t.stat === stat && count >= t.goal) award(p, t.id);
    // la progression s'affiche dans le panneau des trophées
    if (unique !== undefined || count % 5 === 0) io.emit("player:update", publicPlayer(p));
    save();
  }

  function unlocked(p) {
    ensure(p);
    const set = new Set();
    for (const id of Object.keys(p.trophies)) for (const c of byId[id]?.reward || []) set.add(c);
    return set;
  }

  function wear(p, slot, item) {
    ensure(p);
    if (!SLOTS.includes(slot)) return false;
    if (item === null) delete p.wear[slot];
    else if (COSMETICS[item]?.slot === slot && unlocked(p).has(item)) p.wear[slot] = item;
    else return false;
    save();
    return true;
  }

  return { award, bump, wear, ensure, catalog };
};
