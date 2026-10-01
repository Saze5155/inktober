// L'étang du village : ce qu'on peut y pêcher.
// Chaque vestige débloqué ajoute son poisson ; celui du jour est rare et plus fréquent.

const COMMON = [
  ["Goujon d'encre", 8, 18], ["Carpe tachée", 25, 60], ["Ablette de papier", 6, 14],
  ["Poisson-plume", 10, 24], ["Brochet-pinceau", 40, 90],
];
const JUNK = [["Vieille botte d'humain", 28, 32], ["Canette rouillée", 11, 13], ["Clé qui n'ouvre plus rien", 6, 9], ["Télécommande muette", 15, 20]];
const THEMED = [
  ["Poisson-vampire", 20, 45], ["Dragon des vases", 60, 140], ["Poisson arc-en-ciel", 12, 30], ["Crocs à nageoires", 24, 30],
  ["Sangsue géante", 15, 40], ["Poisson-fiole", 9, 16], ["Poisson pané", 10, 18], ["Poisson-bisou", 12, 26],
  ["Algue qui nage", 20, 70], ["Poisson-lune", 30, 80], ["Kraken de flaque", 35, 120], ["Poisson qui te ressemble", 17, 17],
  ["Hareng viking", 18, 32], ["Baudroie des abysses", 30, 70], ["Enxor aquatique", 14, 28], ["Poisson zombie", 20, 40],
  ["Pachimari mouillé", 22, 26], ["Poisson aux Yeux Bleus", 25, 50], ["Poisson-joker", 13, 21], ["Poisson ficelé", 15, 35],
  ["Poisson-comète", 30, 90], ["Poisson-chaton", 10, 20], ["Poisson-robot", 20, 45], ["Ton propre reflet", 1, 200],
  ["Poisson autocollant", 5, 9], ["Poisson pixelisé", 8, 32], ["Poisson-pétard", 15, 30], ["La Canne Perdue", 150, 150],
  ["Poisson-pelote", 12, 24], ["Espadon", 80, 250], ["Banc de copines", 31, 31],
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function roll(unlocked) {
  const r = Math.random();
  let entry, rare = false, junk = false, day = null;
  if (r < 0.14) { entry = pick(JUNK); junk = true; }
  else if (unlocked > 0 && r < 0.27) { day = unlocked; entry = THEMED[day - 1]; rare = true; }
  else if (unlocked > 0 && r < 0.5) { day = 1 + Math.floor(Math.random() * unlocked); entry = THEMED[day - 1]; }
  else entry = pick(COMMON);
  const [name, min, max] = entry;
  const size = Math.round(min + Math.pow(Math.random(), 2.2) * (max - min));
  return { name, size, rare, junk, day };
}

module.exports = { roll };
