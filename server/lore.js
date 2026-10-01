// Le Bestiaire de Mythras : 14 pages perdues dans le monde, une par Enfant de Mythras.
// Et les apparitions légendaires qu'on peut croiser (la logique d'apparition est dans public/js/world.js).

const PAGES = [
  {
    id: "atramentus", x: 5960, y: 1400, name: "Atramentus", kind: "Dragon",
    short: "Le premier né des enfants de Mythras, un dragon fait d'encre noire pure, si ancien qu'on le dit présent depuis l'instant même où son créateur a commencé à rêver.",
    long: "Atramentus fut la toute première créature à surgir des rêves du Rêveur Banni, jaillissant d'un mur de grotte comme s'il avait toujours existé avant même d'être imaginé. Il porte encore en lui quelque chose de cette naissance brutale, une présence lourde, presque minérale, dénuée de toute légèreté. Contrairement à ses frères, il ne cherche ni compagnie ni reconnaissance, il erre seul depuis des siècles, indifférent à ce que les Enxors racontent sur lui.",
  },
  {
    id: "solaris", x: 4900, y: 420, name: "Solaris", kind: "Dragon",
    short: "Un dragon à la lumière grise et froide, deuxième né des cinq frères, dont le regard croisé trop longtemps aveugle sans jamais réchauffer.",
    long: "Solaris porte sur ses écailles un éclat qui ne ressemble à aucune autre lumière connue, ni chaleureux comme celui de Solumbris, ni tranchant comme le Blanc. C'est une clarté sans chaleur, presque triste, qui semble éclairer sans jamais vraiment illuminer quoi que ce soit. Il est le plus solitaire des cinq frères dragons, rarement aperçu, et ceux qui prétendent l'avoir croisé décrivent tous la même sensation d'un froid inexplicable malgré la lumière qu'il dégage.",
  },
  {
    id: "noctifer", x: 3300, y: 2000, name: "Noctifer", kind: "Dragon",
    short: "Un dragon nocturne dont les écailles sombres sont parsemées de points clairs, comme un fragment de ciel étoilé capturé dans l'encre.",
    long: "Noctifer ne se montre jamais de jour, comme si la lumière directe lui était physiquement insupportable. Certains prétendent qu'il connaît le tracé exact de chaque étoile qui existait avant l'Éclipse, gravé dans sa propre peau, une affirmation impossible à vérifier mais qui a nourri plus d'une légende chez les peuples nomades. Il est calme, presque contemplatif, et n'attaque que rarement sans provocation directe.",
  },
  {
    id: "vermillax", x: 4900, y: 4150, name: "Vermillax", kind: "Dragon",
    short: "Un dragon aux écailles rouge sang, le plus violent et le plus impulsif des cinq frères, connu pour attaquer sans provocation apparente.",
    long: "Là où ses frères observent une certaine retenue, Vermillax n'en a jamais montré la moindre trace. Son tempérament est décrit comme instable, presque enragé en permanence, et personne n'a jamais réussi à établir ce qui, exactement, déclenche ses accès de fureur. Les rares témoins qui lui ont survécu s'accordent tous sur un point : il ne prévient jamais avant de frapper.",
  },
  {
    id: "prismarix", x: 2400, y: 560, name: "Prismarix", kind: "Dragon",
    short: "Le dernier né des cinq frères dragons, dont les écailles changent sans cesse de teinte, aussi imprévisible dans son apparence que dans son comportement.",
    long: "Prismarix ne reste jamais identique d'une rencontre à l'autre, un écho troublant de Prismaelyx bien qu'aucun lien n'ait jamais été confirmé entre les deux. Joueur, capricieux, parfois dangereux par simple caprice plutôt que par réelle malice, il traite le monde qui l'entoure comme un vaste terrain de jeu dont il ignore superbement les conséquences. Ses frères eux-mêmes semblent le tenir à distance, comme s'ils se méfiaient de son inconstance.",
  },
  {
    id: "abyssarque", x: 2100, y: 3945, name: "Abyssarque", kind: "Titan marin",
    short: "Le Léviathan, titan marin si vaste que peu de créatures vivantes l'ont jamais vu en entier, endormi au plus profond des eaux englouties.",
    long: "Abyssarque dort depuis des siècles au fond des fosses les plus profondes de l'ancienne Russie engloutie, une masse si colossale que certains doutent même de son existence réelle, la reléguant au rang de légende exagérée. Abyssara elle-même connaît son existence et a ordonné le silence absolu à son sujet, un secret que son Champion garde à contrecœur, conscient que révéler son emplacement pourrait avoir des conséquences qu'il préfère ne pas imaginer.",
  },
  {
    id: "thalassyx", x: 640, y: 3225, name: "Thalassyx", kind: "Titan marin",
    short: "Le Kraken, titan marin plus accessible que son cousin le Léviathan, dont les tentacules ont été aperçues par plus d'un plongeur des Profonds.",
    long: "Thalassyx habite des zones bien moins profondes qu'Abyssarque, ce qui en fait la seule des deux titans marins dont l'existence soit largement documentée. Les Profonds qui explorent les ruines sous-marines les moins engouffrées croisent parfois ses tentacules dans l'obscurité, une rencontre que peu recherchent volontairement mais que beaucoup finissent par vivre au moins une fois dans leur carrière de fouilleur.",
  },
  {
    id: "auroryx", x: 4950, y: 1760, name: "Auroryx", kind: "Phénix",
    short: "Un phénix aux flammes pâles, incarnation de l'aube et de la naissance, qui apparaît au moment précis où le jour se lève sur un lieu qui n'en avait plus connu depuis longtemps.",
    long: "Auroryx est le premier des trois phénix du cycle, associé au commencement plutôt qu'à la fin. Son apparition est presque toujours interprétée comme un signe favorable, un renouveau possible pour l'endroit qu'il visite brièvement avant de disparaître. Contrairement à la plupart des enfants de Mythras, il n'inspire ni peur ni méfiance particulière, seulement une forme d'espoir prudent chez ceux qui le croisent.",
  },
  {
    id: "zenithral", x: 4230, y: 1060, name: "Zénithral", kind: "Phénix",
    short: "Le phénix du zénith, incarnation du sommet de la vie et de la plénitude, réputé pour le plumage le plus éclatant des trois phénix du cycle.",
    long: "Zénithral représente l'instant précis avant tout déclin, la plénitude absolue d'une existence à son apogée. Aucune description de lui ne s'accorde jamais tout à fait avec la précédente, comme si sa splendeur variait selon celui qui la contemple, ou peut-être selon l'état de plénitude de l'observateur lui-même. C'est le plus rarement aperçu des trois phénix, sans doute parce que les instants de véritable plénitude sont eux-mêmes rares.",
  },
  {
    id: "crepuscar", x: 3230, y: 1660, name: "Crépuscar", kind: "Phénix",
    short: "Le phénix du crépuscule, dernier des trois du cycle, dont l'apparition est presque toujours interprétée comme un présage funeste.",
    long: "Crépuscar ferme ce que ses deux frères ont ouvert, incarnation du déclin et de la mort plutôt que de leur opposé. Voir Crépuscar n'annonce pas forcément un danger immédiat, mais presque tous ceux qui l'ont croisé rapportent qu'un événement marquant, souvent une perte, a suivi son apparition de peu. Personne n'a jamais déterminé s'il provoque réellement ce qu'on lui attribue ou s'il ne fait que le pressentir.",
  },
  {
    id: "grifix", x: 4620, y: 320, name: "Grifix", kind: "Gardien",
    short: "Le griffon, gardien des lieux élevés et inaccessibles, considéré par plusieurs peuples comme un protecteur silencieux plutôt qu'une menace.",
    long: "Grifix veille sur des sommets et des à-pics que peu d'Enxors tentent seulement d'atteindre, une présence discrète qui n'intervient que lorsque son territoire est réellement menacé. Contrairement à la plupart des autres enfants de Mythras, sa réputation penche nettement du côté positif, certaines communautés d'altitude allant jusqu'à lui laisser des offrandes en signe de respect mutuel plutôt que de crainte.",
  },
  {
    id: "hydriox", x: 5520, y: 4230, name: "Hydriox", kind: "Gardien",
    short: "L'hydre à têtes multiples, une des créatures les plus redoutées du bestiaire mythologique pour sa capacité de régénération quasi infinie.",
    long: "Hydriox est rarement affrontée directement par ceux qui connaissent sa réputation, tant sa capacité à récupérer d'une blessure, voire à multiplier ses têtes en réponse à une attaque mal maîtrisée, rend tout combat frontal risqué. Les rares récits de victoires contre elle impliquent presque toujours une stratégie évitant délibérément l'affrontement prolongé, plutôt qu'une confrontation de force pure.",
  },
  {
    id: "fenryx", x: 6150, y: 2760, name: "Fenryx", kind: "Gardien",
    short: "Le loup primordial, chasseur solitaire plus grand que n'importe quel prédateur naturel, dont la présence suffit à vider une contrée de tout autre gibier.",
    long: "Fenryx ne chasse jamais en meute, contrairement à ce que son nom pourrait suggérer, il préfère une traque méthodique et solitaire à travers les régions les plus sauvages du monde. Sa seule présence dans une zone suffit à faire fuir la faune locale sur plusieurs jours de marche, ce qui en fait un indicateur redouté par les chasseurs Ombreux : là où le gibier disparaît sans raison apparente, on soupçonne toujours Fenryx en premier.",
  },
  {
    id: "terrathos", x: 4720, y: 3960, name: "Terrathos", kind: "Gardien",
    short: "Le géant de pierre et d'encre, si immobile qu'on le confond souvent avec une simple formation rocheuse jusqu'à son réveil.",
    long: "Terrathos passe l'essentiel de son existence parfaitement immobile, au point que des générations entières d'Enxors peuvent vivre à proximité de lui sans jamais soupçonner qu'il s'agit d'autre chose qu'un rocher ou une colline. Ce qui déclenche son réveil reste un mystère complet, personne n'ayant jamais identifié de schéma clair, ce qui rend sa simple existence une source d'inquiétude latente pour quiconque s'installe près d'une formation géologique un peu trop régulière.",
  },
];

// apparitions qu'on peut croiser (leur comportement est décrit côté navigateur)
const LEGENDS = ["grifix", "noctifer", "thalassyx", "terrathos", "fenryx", "atramentus", "auroryx", "zenithral", "crepuscar"];

module.exports = { PAGES, LEGENDS };
