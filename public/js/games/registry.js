// Chaque jeu s'enregistre avec Games.register(jour, { title, story, controls, start(root, api) }).
// start() reçoit un conteneur plein écran et doit appeler api.finish({ score, stars, lines }) à la fin,
// puis renvoyer une fonction qui arrête tout (boucle, écouteurs).
window.Games = {
  list: {},
  register(day, game) {
    this.list[day] = game;
  },
  get(day) {
    return this.list[day];
  },
};
