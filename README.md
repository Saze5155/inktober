# Village Enxor : Inktober 2026 · DreamTeam

Un village multijoueur dans l'univers **Enxor** : les humains ont disparu, et de leur encre sont nés les Enxors.
Chaque membre de la team a sa cabane, où il peut accrocher ses dessins d'Inktober. Au centre, la Source révèle
un vestige (thème) par nuit, à minuit heure de Paris. La grande maison **La Canne À Pêche** reste fermée
jusqu'au 31 octobre, puis elle deviendra le musée de tous les dessins.

Tout le visuel est dessiné par le code (`public/js/ink.js`), il n'y a aucune image à fournir.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:3000, code de team par défaut : dreamteam
```

Pour tester un autre jour : `FAKE_DATE=2026-10-15 npm run dev`.

## Variables d'environnement

| Variable       | Rôle                                                                 |
|----------------|----------------------------------------------------------------------|
| `TEAM_CODE`    | Le code à donner à la team pour entrer (**à changer**)               |
| `OWNER_PSEUDO` | Ton pseudo : tu obtiens La Canne À Pêche au lieu d'une cabane        |
| `DATA_DIR`     | Dossier des données (joueurs + dessins). Sur Railway : `/data`       |
| `FAKE_DATE`    | Optionnel, pour simuler une date (`2026-10-15`)                      |
| `LG_SPEED`     | Optionnel, accélère les minuteurs du loup-garou pour tester (`5`)    |

Vérifier que la sauvegarde marche : ouvrir `/api/status` sur le site. `persistent` doit valoir `true`,
et le nombre de joueurs doit rester le même après un redéploiement.

## Déployer sur Railway

1. Pousser le dépôt sur GitHub, puis sur Railway : **New Project → Deploy from GitHub repo**.
2. **Variables** : `TEAM_CODE`, `OWNER_PSEUDO` et `DATA_DIR=/data`.
3. **Ajouter un volume** monté sur `/data`. Sans volume, les cabanes et les dessins sont effacés à chaque déploiement.
4. **Settings → Networking → Generate Domain**, puis envoyer le lien et le code à la team.

Connecte-toi en premier avec ton `OWNER_PSEUDO`, pour que personne ne prenne ton pseudo avant toi.

## Bon à savoir

- Le pseudo est lié au navigateur (un jeton dans le cache). Si quelqu'un vide son cache ou change de PC,
  il ne peut plus reprendre son pseudo. Il faut alors supprimer son `token` dans `/data/db.json`… ou ajouter
  plus tard un système de code de récupération.
- 28 emplacements de cabane (25 joueurs + marge).

## Structure

```
server/index.js    serveur Express + Socket.io (connexion, positions, chat, cabanes, dessins)
server/clock.js    déblocage des jours à minuit, heure de Paris
server/store.js    sauvegarde JSON + dossier d'images
server/fish.js     les poissons de l'étang
server/werewolf.js le loup-garou (rôles, phases, votes)
public/js/audio.js musique et sons générés (Web Audio)
public/js/interior.js  l'intérieur des cabanes et les 31 décors
public/js/werewolf.js  le loup-garou côté navigateur (estrade, carte de rôle, vote)
public/js/games/   un fichier par jeu du jour
public/js/ink.js   outils de dessin « encre » + les Enxors
public/js/village.js  disposition, décor généré, cabanes, maison, Source
public/js/main.js  client : connexion, déplacements, multijoueur, panneaux
```
