// Sauvegarde simple dans un fichier JSON + dossier d'images.
// Sur Railway, monter un volume et définir DATA_DIR=/data, sinon tout est perdu à chaque déploiement.
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DRAW_DIR = path.join(DATA_DIR, "drawings");
const DB_FILE = path.join(DATA_DIR, "db.json");

fs.mkdirSync(DRAW_DIR, { recursive: true });

let db = { players: {} };
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  // première fois : base vide
}

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
}

module.exports = { db, save, DATA_DIR, DRAW_DIR };
