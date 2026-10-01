// Les habitants du monde d'Enxor : position, apparence et dialogues.
// Envoyé tel quel aux navigateurs ; le serveur s'en sert aussi pour vérifier qu'on parle bien à côté d'eux.

module.exports = [
  // ---------- Le Seuil ----------
  {
    id: "gris", region: "seuil", x: 4030, y: 1190, name: "Le Vieux Gris", title: "Gardien du Pilier",
    color: "#9aa0a6", wear: { back: "echarpe" },
    lines: [
      "Tu vois cette colonne ? Moitié noire, moitié blanche. Elle a été plantée pile là où l'ombre de la vallée touche la lumière de la crête.",
      "On appelle cet endroit le Seuil. D'un côté, le sanctuaire de Tenebros. De l'autre, celui de Solumbris. Les jumeaux ne se sont jamais pardonné.",
      "Lui est né du désespoir, elle de l'espoir. Mille ans de nuit, et ils ne sont toujours pas d'accord sur ce qu'elle voulait dire.",
      "Moi, je reste au milieu. Il faut bien que quelqu'un balaie la frontière.",
    ],
  },
  {
    id: "ombrin", region: "seuil", x: 3480, y: 1700, name: "Ombrin", title: "Fidèle de Tenebros",
    color: "#3e4a8a", wear: { head: "capuche" },
    lines: [
      "Chut. Ici, on n'allume rien. L'obscurité n'est pas une absence. C'est une présence.",
      "Les autres racontent que notre dieu a fait durer l'Éclipse plus que nécessaire. Il ne dément jamais. Il observe.",
      "Je vais te confier un secret. Quand tous les fragments de Nyctalis ont voté le bannissement de leur frère, Tenebros seul s'est levé pour le défendre.",
      "Ce frère s'appelait Mythras. Le Rêveur. Celui qui a dessiné les dragons sur les murs d'une grotte… et ils se sont mis à respirer. Plus personne ne se souvient de lui.",
      "Parfois, la nuit, on entend Tenebros murmurer dans les recoins : « Reviens… je te protégerai. » Personne ne répond jamais.",
    ],
  },
  {
    id: "clairene", region: "seuil", x: 4720, y: 1700, name: "Clairène", title: "Prêtresse de Solumbris",
    color: "#e9b04a", wear: { aura: "paillettes" },
    lines: [
      "Bienvenue dans la lumière ! Ici, les flammes ne s'éteignent jamais. Chacune est le souvenir d'une nuit vaincue.",
      "Pendant mille ans, des humains ont allumé des feux dans le noir en promettant à leurs enfants que le soleil reviendrait. Solumbris est née de ces murmures.",
      "En 4852, la lumière est revenue. Elle avait raison depuis le début : l'espoir avait tenu bon.",
      "Notre déesse a juré d'empêcher toute nouvelle Éclipse, quel qu'en soit le prix. Et elle ne pardonnera jamais à son jumeau.",
      "Si tu croises un fidèle de l'ombre, de l'autre côté du pilier… ne le laisse pas éteindre ta flamme.",
    ],
  },
  // ---------- Rive-Basse ----------
  {
    id: "varech", region: "rive", x: 1360, y: 3640, name: "Mère Varech", title: "Poissonnière de Rive-Basse",
    color: "#5bb3a0", wear: { head: "bob" },
    lines: [
      "Attention où tu mets les pieds, petit. Les planches tiennent depuis trois générations, mais l'eau, elle, a tout son temps.",
      "Sous nos pilotis, il y a une ville entière. Les humains l'ont bâtie, la mer noire l'a avalée. Quand l'eau est calme, on voit encore les toits.",
      "Tu veux pêcher ? Va au bout d'un ponton et appuie sur E. Ce qui mord ici n'a pas toujours de nom.",
      "Et si tu remontes une botte, garde-la. Les humains avaient de drôles de pieds.",
    ],
  },
  {
    id: "sel", region: "rive", x: 1505, y: 4230, name: "Sel", title: "Plongeur des Profonds",
    color: "#3e7cb1", wear: {},
    lines: [
      "Je suis un Profond : je fouille les ruines englouties. Les maisons humaines sont pleines d'objets qui ne servent plus à rien. J'adore ça.",
      "Là-dessous, il y a des tentacules dans le noir. Thalassyx, le Kraken. Tous les plongeurs finissent par le croiser au moins une fois.",
      "On dit qu'il y a pire, encore plus profond. Quelque chose de si grand qu'on ne le voit jamais en entier… Abyssarque, le Léviathan.",
      "Abyssara a ordonné le silence à son sujet, et son Champion garde le secret à contrecœur. Moi je te dis juste : ne plonge jamais dans les fosses.",
    ],
  },
  {
    id: "bulot", region: "rive", x: 640, y: 3220, name: "Petit Bulot", title: "Enfant des pilotis",
    color: "#e0662f", wear: {}, small: true,
    lines: [
      "T'as vu ? Si tu tapes trois fois sur le ponton, les poissons viennent voir ! …Bon, ça marche jamais.",
      "Ma grand-mère dit que le Léviathan dort juste en dessous de nous. Moi je crois que c'est elle qui ronfle.",
      "Quand je serai grand, je serai Champion d'Abyssara. Ou pêcheur. Ou les deux !",
    ],
  },
  // ---------- Cendre-Gravée ----------
  {
    id: "ocre", region: "cendre", x: 4100, y: 3610, name: "Ocre", title: "Puisatière de Cendre-Gravée",
    color: "#c98a5c", wear: {},
    lines: [
      "Tiens, un nouveau visage ! Bienvenue à Cendre-Gravée. Personne ne passe jamais par ici.",
      "C'est le puits qui nous fait vivre. L'eau reste fraîche, même quand le sable noir brûle.",
      "Repasse demain, on aura peut-être du vent. Ça fait longtemps qu'on n'a pas eu de vent.",
    ],
  },
  {
    id: "sablefin", region: "cendre", x: 4240, y: 3470, name: "Sable-Fin", title: "Marchand",
    color: "#b48be0", wear: { back: "echarpe" },
    lines: [
      "Bienvenue, bienvenue ! Aujourd'hui, c'est le troisième jour du vent : jour de marché !",
      "Je n'ai rien à vendre pour l'instant, la caravane arrive demain. Elle arrive toujours demain.",
      "Bizarre… j'ai l'impression d'avoir déjà dit ça.",
    ],
  },
  {
    id: "ermite", region: "cendre", x: 4780, y: 2950, name: "L'Ermite", title: "Moine de Silentis",
    color: "#4a4550", wear: { head: "capuche", aura: "sablier" },
    lines: [
      "…",
      "(Il ne dit rien. Du sable noir s'écoule en continu de ses manches, comme d'un sablier.)",
      "(Il trace lentement dans le sable : « Vous êtes déjà venus. Hier. Et le jour d'avant. Et le jour d'avant encore. »)",
      "(Puis le vent efface tout. Le vent qui, d'après Ocre, ne souffle jamais ici.)",
    ],
  },
];
