// Guides des donjons de niveau 29 à 55. Même forme et mêmes règles que donjons-a.js: seulement ce que les sources disent,
// et tout ce qui manque ou se contredit est écrit dans « manque ».
// Ces guides viennent surtout d'Icy Veins (versions Classic): Forever peut avoir changé des détails, ce que l'écran rappelle
// grâce à `classique: true`.

export const DONJONS_B = [
  {
    id: 'gnomeregan',
    cible: 'Gnomeregan',
    nom: ['Gnomeregan', 'Gnomeregan'],
    niveaux: [29, 38],
    rdg: 25,
    classique: true,
    duree: `environ 2 h`,
    acces: `Dans Dun Morogh, à l'ouest d'Ironforge (au nord-ouest de Brenwall Village, selon le guide). Prends l'ascenseur, suis le tunnel jusqu'à une grande salle et reste le long du mur de gauche pour trouver l'entrée. La Workshop Key, laissée par [[Electrocutioner 6000]], ouvre une entrée latérale qui saute « les premiers boss ».`,
    boss: [
      {
        nom: 'Grubbis',
        special: true,
        notes: [
          `Facultatif. On l'invoque en aidant Blastmaster Emi Shortfuse et en tuant un groupe de troggs.`,
          `La source ne décrit aucune mécanique.`,
        ],
      },
      { nom: 'Viscous Fallout', notes: [`Nettoie les monstres autour de lui avant de l'attaquer. La source ne décrit aucune mécanique.`] },
      {
        nom: 'Electrocutioner 6000',
        notes: [
          `{{Chain Bolt}}, {{Megavolt}} et {{Shock}}: la source donne les noms mais aucun conseil.`,
          `Il laisse la Workshop Key (voir l'accès).`,
        ],
      },
      {
        nom: 'Crowd Pummeler 9-60',
        notes: [
          `{{Arcing Smash|grand coup en arc}}, {{Crowd Pummel}} et {{Trample|piétinement}}.`,
          `Combats-le le dos au mur, pour ne pas être repoussé dans le vide.`,
        ],
      },
      {
        nom: 'Dark Iron Ambassador',
        special: true,
        notes: [
          `Rare: il peut apparaître dans le tunnel entre Electrocutioner 6000 et Thermaplugg.`,
          `{{Fire Shield III|bouclier de feu}}, {{Fireball|boule de feu}}, {{Fireball Volley|volée de boules de feu}} et {{Summon Burning Servant|invocation d'un serviteur de feu}}. Aucun conseil dans la source.`,
        ],
      },
      {
        nom: 'Mekgineer Thermaplugg',
        notes: [
          `Boss final. {{Knock Away|Repoussement}}.`,
          `Tue les Walking Bombs avant qu'elles arrivent au groupe. Un groupe de haut niveau peut ignorer les mécaniques et le brûler à toute vitesse.`,
        ],
      },
    ],
    pieges: [
      `La navigation est difficile et le trajet oblige à revenir sur ses pas plusieurs fois.`,
      `Beaucoup de monstres sont des humanoïdes: un mage est recommandé pour le contrôle de foule et les dégâts de zone.`,
      `Un second tank (paladin ou druide) aide pour les gros groupes de monstres.`,
    ],
    manque: [
      `La source dit que les troggs de l'entrée sont irradiés, mais ne décrit aucun effet de radiation.`,
      `Pas de conseil précis pour Grubbis, Viscous Fallout, Electrocutioner 6000 et l'ambassadeur Dark Iron. On ne sait pas quels boss exactement la Workshop Key saute.`,
      `Les niveaux de Forever (29-38) viennent d'Icy Veins; son guide Classic annonce 29-34.`,
      `Kami-labs liste cinq boss pour la version à 5 joueurs (Grubbis, Viscous Fallout, Electrocutioner 6000, Crowd Pummeler 9-60, Mekgineer Thermaplugg) et une liste séparée « 10 joueurs » (avec Mechanical Menagerie) que ce guide ne couvre pas.`,
    ],
    src: ['iv-gnomer', 'kami-gnomer'],
  },
  {
    id: 'razorfen-kraul',
    cible: 'Razorfen Kraul',
    nom: ['Razorfen Kraul', 'Kraal de Tranchebauge'],
    niveaux: [29, 38],
    rdg: 24,
    classique: true,
    acces: `À la pointe sud des Barrens, au nord-ouest du Great Lift vers Thousand Needles. L'Alliance passera probablement par du territoire Horde: le guide suggère de former le groupe et de passer par Dustwallow Marsh depuis Theramore, loin de la grande route du sud. Prends toutes les quêtes du donjon avant d'entrer.`,
    boss: [
      {
        nom: 'Roogug',
        special: true,
        notes: [`Facultatif: nécessaire seulement pour la quête de guerrier. {{Lightning Bolt|Éclair}} et {{Summon Earth Rumbler|invocation d'un élémentaire de terre}}.`],
      },
      {
        nom: 'Aggem Thorncurse',
        notes: [`{{Chain Heal|Soin en chaîne}} et {{Summon Boar Spirit|invocation d'un esprit de sanglier}}. Aucune mécanique à retenir.`],
      },
      {
        nom: 'Death Speaker Jargba',
        notes: [
          `{{Dominate Mind|Contrôle mental}} et {{Shadow Bolt|éclair de l'ombre}}.`,
          `Attaquer un seul monstre aggro tout le groupe: contrôle-en le plus possible avant. Le mouton d'un mage neutralise le contrôle mental.`,
        ],
      },
      {
        nom: 'Overlord Ramtusk',
        notes: [
          `{{Battle Shout|Cri de guerre}} et {{Thunderclap|coup de tonnerre}}. Pas de mécanique majeure.`,
          `Contrôle ses renforts pour faciliter le combat. Les Razorfen Spearhides peuvent apparaître avec lui et ont une bonne chance de laisser l'Armor Piercer.`,
        ],
      },
      {
        nom: 'Earthcaller Halmgar',
        special: true,
        notes: [
          `Facultatif. Il apparaît avec une certaine chance sur les plateformes après Ramtusk.`,
          `{{Earthbind Totem|Totem de lien terrestre}}, {{Lightning Bolt|éclair}} et {{Summon Earth Rumbler|invocation d'un élémentaire de terre}}. Contrôle ses renforts si possible.`,
        ],
      },
      {
        nom: 'Agathelos the Raging',
        notes: [`La source dit qu'il n'a aucune mécanique à retenir, tout en listant {{Enrage|rage}}, {{Left for Dead}}, {{Rampage}} et {{Rushing Charge|charge}} sans explication.`],
      },
      {
        nom: 'Blind Hunter',
        special: true,
        notes: [
          `Facultatif. Il apparaît avec une certaine chance après Agathelos.`,
          `{{Sonic Burst}} et {{Ravage}}. La source parle d'un silence de zone: le soigneur reste à distance.`,
        ],
      },
      {
        nom: 'Charlga Razorflank',
        notes: [
          `Boss final. {{Chain Bolt|Éclair en chaîne}}, {{Mana Spike}}, {{Purity}} et {{Renew|rénovation}}.`,
          `Interromps ses sorts le plus souvent possible et brûle-la.`,
        ],
      },
    ],
    pieges: [
      `Le contrôle de foule compte beaucoup. Les Razorfen Dustweavers ont {{Enveloping Winds|des vents enveloppants}} qui peuvent bloquer le soigneur: le tank évite alors de tirer d'autres monstres.`,
      `Un DPS qui sait soigner devrait le faire pour garder le tank en vie.`,
      `Reste à l'étage du haut jusqu'à la mort de Charlga; après, tu peux descendre sur le côté pour la quête d'escorte.`,
      `Pour la quête de guerrier, tourne à gauche à la première intersection au lieu d'aller tout droit vers Aggem Thorncurse.`,
      `Des monstres rares dans tout le donjon peuvent laisser du bon butin.`,
    ],
    manque: [
      `La quête d'escorte après Charlga est mentionnée mais pas expliquée. Aucun détail sur le chemin dans l'instance.`,
      `Le guide ne dit pas explicitement que Sonic Burst est le silence de zone du Blind Hunter.`,
      `Les niveaux de Forever (29-38) viennent d'Icy Veins; son guide Classic annonce 26-31, et les boss y sont de niveau 28 à 33.`,
    ],
    src: ['iv-rfk', 'kami-rfk'],
  },
  {
    id: 'sm-graveyard',
    cible: 'Scarlet Monastery: Graveyard',
    nom: ['Scarlet Monastery: Graveyard', 'Monastère écarlate: Cimetière'],
    niveaux: [30, 38],
    rdg: 30,
    classique: true,
    duree: `moins de 30 min`,
    acces: `En Tirisfal Glades, au nord-est d'Undercity. À l'intérieur du monastère, prends le portail de gauche parmi les quatre portes. Aucune clé n'est requise (contrairement à l'Armory et à la Cathedral). Le trajet est linéaire: va jusqu'au cimetière ouvert, puis jusqu'à la tombe de Bloodmage Thalnos.`,
    boss: [
      { nom: 'Interrogator Vishas', notes: [`{{Immolate|Brûlure}}. La source ne donne aucun conseil.`] },
      {
        nom: 'Azshir the Sleepless',
        notes: [
          `{{Call of the Grave}}, {{Soul Siphon}} et {{Terrify|terreur}}.`,
          `Sa peur peut attirer des monstres proches et faire un wipe: surveille ce qui est autour.`,
        ],
      },
      { nom: 'Fallen Champion', notes: [`{{Cleave|Coup en arc}} et {{Execute|exécution}}. Combat très facile selon la source.`] },
      { nom: 'Ironspine', notes: [`{{Curse of Weakness|Malédiction d'affaiblissement}} et {{Poison Cloud|nuage de poison}}. Combat très facile selon la source.`] },
      {
        nom: 'Bloodmage Thalnos',
        notes: [
          `Boss final. {{Fire Nova|Nova de feu}}, {{Flame Spike|pointe de flammes}} et {{Shadow Bolt|éclair de l'ombre}}.`,
          `Les distances restent loin pour éviter la nova de feu, et ne se collent pas à la mêlée pendant la pointe de flammes.`,
        ],
      },
    ],
    pieges: [`Les monstres sont très faciles selon la source. Le seul avertissement: la peur d'Azshir peut attirer d'autres monstres.`],
    manque: [
      `Le guide recommande 29-33 mais Thalnos est niveau 34. Il ne donne ni composition de groupe ni conseil de tank ou de soigneur.`,
      `La page a été mise à jour en novembre 2024 (Classic Anniversary).`,
    ],
    src: ['iv-sm-g', 'kami-sm'],
  },
  {
    id: 'sm-library',
    cible: 'Scarlet Monastery: Library',
    nom: ['Scarlet Monastery: Library', 'Monastère écarlate: Bibliothèque'],
    niveaux: [33, 41],
    rdg: 30,
    classique: true,
    duree: `moins d'une heure`,
    acces: `En Tirisfal Glades, au nord-est d'Undercity. À l'intérieur du monastère, prends le portail de droite. Aucune clé n'est requise. La Scarlet Key, qui ouvre l'Armory et la Cathedral, sort d'un coffre après Arcanist Doan.`,
    boss: [
      {
        nom: 'Houndmaster Loksey',
        notes: [
          `Contrôle ses chiens avant d'engager. Sinon, tue les chiens d'abord, car Loksey les renforce avec {{Bloodlust|soif de sang}}.`,
          `Aucune autre mécanique.`,
        ],
      },
      {
        nom: 'Arcanist Doan',
        notes: [
          `Reste hors de la mêlée à cause de son {{Arcane Explosion|explosion arcanique}}, et garde les distances (surtout le soigneur) loin de son {{Silence|silence}}.`,
          `Quand il crie « Burn in righteous fire! », cours loin de lui, ou tanke-le près de l'entrée pour que les murs bloquent la ligne de vue.`,
          `Un prêtre ou un Felhunter peut dissiper sa {{Polymorph|métamorphose}}; un chaman Horde peut purger son bouclier.`,
        ],
      },
    ],
    pieges: [
      `Les monstres fuient à bas niveau de vie: tue-les ou ralentis-les avant qu'ils attirent d'autres groupes.`,
      `Les derniers groupes ont beaucoup de lanceurs de sorts: tire-les dans un couloir pour casser la ligne de vue au lieu d'entrer dans leur salle.`,
      `Pour le contrôle: voleurs ou mages; pour ralentir: chasseurs, guerriers ou démonistes.`,
    ],
    manque: [
      `Le guide recommande 31-35 mais Doan est niveau 37. Il liste Arcane Bubble et Detonation sans les décrire.`,
      `Le bouclier de Doan n'est mentionné que dans la note du chaman, sans détail.`,
    ],
    src: ['iv-sm-l', 'kami-sm'],
  },
  {
    id: 'sm-armory',
    cible: 'Scarlet Monastery: Armory',
    nom: ['Scarlet Monastery: Armory', 'Monastère écarlate: Armurerie'],
    niveaux: [36, 44],
    rdg: 30,
    classique: true,
    duree: `moins de 30 min`,
    acces: `En Tirisfal Glades, au nord-est d'Undercity. À l'intérieur du monastère, prends la porte verrouillée à droite. Il te faut la Scarlet Key, qui sort d'un coffre de la Library.`,
    boss: [
      {
        nom: 'Herod',
        notes: [
          `Le seul boss. {{Cleave|Coup en arc}}, {{Enrage|rage}}, {{Rushing Charge|charge}} et {{Whirlwind|tourbillon}}.`,
          `Laisse les distances sur la première plateforme pendant que le tank et les mêlées sautent. Tanke-le face à l'opposé des mêlées pour éviter le coup en arc.`,
          `Pendant son tourbillon, mêlées et tank sortent de la zone, car il est immunisé à la magie pendant le sort. Il entre en rage à 20 % de vie.`,
          `Avant sa mort, les distances sautent pour faire des dégâts de zone aux Scarlet Trainees qui entrent dans la salle, ce qui laisse le tank prendre la menace.`,
        ],
      },
    ],
    pieges: [
      `Beaucoup de patrouilles: tire avec soin.`,
      `La plupart des monstres fuient à bas niveau de vie: ralentis-les. Tue les lanceurs de sorts en premier, car ce sont eux qui font le plus de dégâts.`,
      `Les Scarlet Myrmidons entrent en rage et frappent plus fort à bas niveau de vie: méfie-toi d'eux en groupe sans lanceurs de sorts.`,
      `Les monstres réapparaissent: ne tire pas lentement.`,
    ],
    manque: [
      `Le guide recommande 36-38 mais Herod est niveau 40. Il ne détaille ni la charge ni la composition des groupes de monstres.`,
      `Il ne dit pas quel coffre de la Library contient la Scarlet Key.`,
    ],
    src: ['iv-sm-a', 'kami-sm'],
  },
  {
    id: 'sm-cathedral',
    cible: 'Scarlet Monastery: Cathedral',
    nom: ['Scarlet Monastery: Cathedral', 'Monastère écarlate: Cathédrale'],
    niveaux: [38, 46],
    rdg: 30,
    classique: true,
    duree: `moins d'une heure`,
    acces: `En Tirisfal Glades, au nord-est d'Undercity. À l'intérieur du monastère, prends la porte verrouillée à gauche. Il te faut la Scarlet Key, qui sort d'un coffre de la Library.`,
    boss: [
      {
        nom: ['Scarlet Commander Mograine', 'High Inquisitor Whitemane'],
        notes: [
          `Mograine frappe très fort et utilise {{Hammer of Justice|marteau de justice}} (étourdissement) et {{Divine Shield|bouclier divin}}. Attends la fin de sa bulle et fais dissiper l'étourdissement par un prêtre.`,
          `Quand il meurt, Whitemane entre par les portes derrière l'autel. Brûle-la jusqu'à sa {{Scarlet Resurrection|résurrection}}, qui ramène Mograine et lance la deuxième phase.`,
          `Tue Whitemane en premier, puis Mograine; le tank reprend vite la menace après la résurrection, et les soigneurs gardent de la mana pour cette phase.`,
        ],
      },
      {
        nom: 'High Inquisitor Fairbanks',
        special: true,
        notes: [
          `Facultatif, niveau 40, caché dans une salle du fond: clique sur la torche au mur à droite de l'autel pour y accéder.`,
          `Interromps son {{Heal|soin}}. Combat facile, mais mauvais butin.`,
        ],
      },
    ],
    pieges: [
      `Interromps les Scarlet Abbots pour arrêter leurs soins. Tue vite les Scarlet Wizards: leur sort de zone instantané frappe fort.`,
      `Sors les monstres de la cathédrale vers la cour et utilise les murs pour casser la ligne de vue, au lieu de foncer dedans.`,
      `Nettoie assez de monstres avant d'ouvrir les portes de la chapelle: ceux qui restent se joignent au combat contre le boss.`,
      `Les monstres réapparaissent: ne tire pas lentement.`,
    ],
    manque: [
      `Le guide dit que Mograine et Whitemane « se combattent en même temps », mais son texte décrit Mograine seul d'abord, puis Whitemane après sa mort.`,
      `Il parle de « bien meilleurs chemins » dans le donjon sans les décrire. Il ne dit pas quel coffre de la Library contient la Scarlet Key.`,
    ],
    src: ['iv-sm-c', 'kami-sm'],
  },
  {
    id: 'razorfen-downs',
    cible: 'Razorfen Downs',
    nom: ['Razorfen Downs', 'Souilles de Tranchebauge'],
    niveaux: [37, 46],
    rdg: 34,
    classique: true,
    duree: `environ 1 h`,
    acces: `À la pointe sud des Barrens, au nord-est du Great Lift vers Thousand Needles. L'Alliance passera probablement par du territoire Horde: le guide suggère de former le groupe et de passer par Dustwallow Marsh depuis Theramore. Le donjon est surtout linéaire; la quête d'escorte « Extinguishing the Idol » ramène les joueurs dans la zone du premier boss.`,
    boss: [
      {
        nom: "Tuten'kash",
        notes: [
          `On l'invoque en cliquant sur un gong et en battant des vagues de renforts.`,
          `Sa malédiction ralentit les sorts et les attaques en mêlée, mais le guide la juge peu gênante. {{Virulent Poison|Poison virulent}} et {{Web Spray|jet de toile}}: aucun conseil.`,
        ],
      },
      {
        nom: 'Mordresh Fire Eye',
        notes: [`Interromps sa {{Fireball|boule de feu}} quand tu peux. Il a aussi {{Fire Nova|une nova de feu}} (aucun conseil).`],
      },
      { nom: 'Glutton', notes: [`Aucune mécanique à retenir selon la source, qui liste {{Disease Cloud|nuage de maladie}} et {{Enrage|rage}} sans explication.`] },
      {
        nom: 'Ragglesnout',
        special: true,
        notes: [`Rare, le seul de l'instance. Son {{Dominate Mind|contrôle mental}} prend un joueur: repère-le et interromps son soin.`],
      },
      {
        nom: 'Amnennar the Coldbringer',
        notes: [
          `Boss final. Tanke près du centre de la plateforme, ou mieux avec la tente derrière le tank (le texte de la source est flou): il repousse et peut jeter le tank dans le vide.`,
          `Les Frost Spectres peuvent généralement être ignorés, même si le tank peut les prendre.`,
        ],
      },
      {
        nom: 'Plaguemaw the Rotting',
        notes: [
          `Il se combat durant une chaîne de quêtes qui commence en libérant Belnistrasz, juste avant Mordresh, et qui ramène les joueurs vers la zone de Tuten'kash.`,
          `{{Putrid Stench}} et {{Withered Touch}}: aucun conseil dans la source.`,
        ],
      },
    ],
    pieges: [
      `Beaucoup de monstres donnent des maladies: apporte un paladin, un prêtre ou un chaman pour les guérir.`,
      `Les prêtres peuvent utiliser {{Shackle Undead|entraves des morts-vivants}}, très utile contre tous ces morts-vivants.`,
    ],
    manque: [
      `Le guide recommande 36-40, mais Amnennar est niveau 41. On ne sait pas dans quel ordre se joue Plaguemaw (kami-labs la place deuxième).`,
      `La source dit que l'escorte est la seule chose qui brise le trajet linéaire, mais la chaîne de Plaguemaw demande aussi de revenir en arrière.`,
    ],
    src: ['iv-rfd', 'kami-rfd'],
  },
  {
    id: 'kroldok-stronghold',
    cible: "Krol'dok Stronghold",
    nom: ["Krol'dok Stronghold", null],
    niveaux: [40, 45],
    officiel: [40, 45],
    nouveau: true,
    fiche: true,
    acces: `Dans la zone des Riverglades (Wowhead).`,
    boss: [],
    pieges: [],
    manque: [
      `Ce donjon est annoncé mais n'était pas encore dans la bêta. Aucune source ne donne de boss, de mécaniques ou de quêtes.`,
      `Blizzard a corrigé son niveau à 40-45 (et non 40-55 comme annoncé au départ). Kami-labs écrit « Krol'dor » et propose « Bastion de Krol'dor » d'après l'adresse de sa page: ce n'est pas confirmé, donc le nom reste en anglais.`,
    ],
    src: ['iv-news-9', 'wh-overview'],
  },
  {
    id: 'uldaman',
    cible: 'Uldaman',
    nom: ['Uldaman', 'Uldaman'],
    niveaux: [41, 51],
    rdg: 35,
    classique: true,
    duree: `environ 2 h`,
    acces: `Tout au nord des Badlands, le long de la frontière de Loch Modan. Suis les tunnels jusqu'à la première zone ouverte, descends au centre et suis le tunnel en dessous jusqu'à « Dig One »: l'entrée est à ta droite. Prends toutes les quêtes du donjon d'abord.`,
    boss: [
      {
        nom: 'The Lost Dwarves',
        notes: [
          `Baelog, Eric « The Swift » et Olaf. Premier boss côté Horde. Olaf peut être tiré seul. Baelog a {{Strike|frappe}}, Eric {{Rushing Charge|charge}} et Olaf {{Shield Slam|coup de bouclier}}: rien de particulier.`,
          `Ouvre le coffre ensuite: il contient un objet nécessaire pour Ironaya.`,
        ],
      },
      {
        nom: 'Revelosh',
        notes: [
          `{{Chain Lightning|Éclair en chaîne}} et {{Lightning Bolt|éclair}}. Pas de mécanique: contrôle les renforts.`,
          `Il laisse The Shaft of Tsol.`,
        ],
      },
      {
        nom: 'Ironaya',
        notes: [
          `On l'invoque avec le Staff of Prehistoria. Tanke-la face à l'opposé du groupe pour limiter son coup en arc.`,
          `{{Arcing Smash|Grand coup en arc}}, {{Knock Away|repoussement}} (qui retire la menace: garde ta provocation pour ça) et {{War Stomp|piétinement}}.`,
        ],
      },
      {
        nom: 'Ancient Stone Keeper',
        notes: [`{{Sand Storms|Tempêtes de sable}}: sors-en et le combat est facile.`],
      },
      {
        nom: 'Galgann Firehammer',
        notes: [
          `{{Amplify Flames}}, {{Fire Nova|nova de feu}} et {{Flame Lash}}. Tue d'abord ses gardes du corps et garde les distances hors de la mêlée.`,
          `Il frappe fort: utilise de l'équipement ou des consommables de résistance au feu.`,
        ],
      },
      {
        nom: 'Grimlok',
        notes: [
          `{{Bloodlust|Soif de sang}}, {{Chain Bolt|éclair en chaîne}}, {{Lightning Bolt|éclair}} et {{Shrink|rétrécissement}}.`,
          `Contrôle ses renforts, tue-le vite et étalez-vous pour limiter l'éclair en chaîne.`,
        ],
      },
      {
        nom: 'Archaedas',
        notes: [
          `Boss final. Clique sur l'autel devant lui pour lancer le combat. Il invoque régulièrement des nains: {{Awaken Earthen Guardians}}, {{Awaken Vault Warder}}, {{Enrage|rage}} et {{Ground Tremor|secousse du sol}}.`,
          `Tue vite les renforts, puis concentre-toi sur lui quand les renforts élites arrivent. Le guide le juge très difficile pour un groupe de niveau trop bas.`,
        ],
      },
    ],
    pieges: [
      `Les monstres fuient à bas niveau de vie (comme à la Stockade): contrôle-en le plus possible, puis recule au lieu d'avancer.`,
      `Casse la ligne de vue contre les lanceurs de sorts avec les murs pour qu'ils ne lancent pas librement et n'attirent pas d'autres groupes.`,
      `Les monstres plus loin frappent très fort: si le tank est de niveau trop bas, pense à un second soigneur.`,
      `Le seul rare, Digmaster Shovelphlange, est à l'extérieur de l'instance et laisse du bon butin.`,
    ],
    manque: [
      `Le guide dit que le Staff of Prehistoria ouvre une porte derrière Revelosh, puis qu'il invoque Ironaya: on ne sait pas si c'est la même pierre ou la même suite d'étapes.`,
      `L'Alliance n'a pas à tuer les frères nains, mais le coffre avec le Gni'kiv Medallion (nécessaire pour Ironaya) est dans leur salle: le guide n'explique pas comment l'Alliance l'obtient.`,
      `Archaedas est niveau 47, au-dessus de la plage recommandée (42-46). Le guide mentionne une astuce possible contre lui sans savoir si elle marche encore.`,
      `Kami-labs liste aussi une « Sentinelle d'obsidienne » (Obsidian Sentinel) parmi les boss de Forever, que le guide d'Icy Veins ne mentionne pas.`,
    ],
    src: ['iv-uld', 'kami-uld'],
  },
  {
    id: 'zul-farrak',
    cible: "Zul'Farrak",
    nom: ["Zul'Farrak", "Zul'Farrak"],
    niveaux: [44, 54],
    rdg: 42,
    classique: true,
    duree: `environ 25 min (course aux zombies), environ 1 h (toutes les quêtes)`,
    acces: `À Tanaris (39, 18), à l'ouest de Gadgetzan, au nord-ouest de la zone. Prends les quêtes du donjon avant d'entrer. Le début est linéaire, puis le donjon s'ouvre sur un carrefour circulaire autour d'une place, qu'on peut nettoyer dans n'importe quel ordre.`,
    boss: [
      {
        nom: 'Hydromancer Velratha',
        notes: [`Kami-labs la liste comme premier boss de Forever. Le guide d'Icy Veins la nomme dans le plan du donjon, mais ne la décrit pas.`],
      },
      {
        nom: 'Zerillis',
        special: true,
        notes: [`Rare assez courant près du début. {{Frost Shot|Tir de givre}} et {{Net|filet}}. Aucun conseil dans la source.`],
      },
      {
        nom: "Antu'sul",
        notes: [
          `{{Healing Wave|Vague de soins}}, {{Earthgrab Totem|totem d'étreinte de la terre}}, {{Healing Ward|gardien de soins}} et renforts invoqués.`,
          `Il attaque dès que tu approches de sa caverne: garde le groupe prêt.`,
          `Il invoque sans cesse des basilics élites qui restent actifs après sa mort: contrôle-les ou c'est le wipe.`,
        ],
      },
      {
        nom: 'Theka the Martyr',
        notes: [
          `Les groupes de scarabées près de lui sont dangereux si tu les tires en masse: éloigne Theka avant d'utiliser des dégâts de zone.`,
          `Le guide d'Icy Veins ne lui donne pas de fiche de boss; kami-labs le liste parmi les boss de Forever.`,
        ],
      },
      {
        nom: "Witch Doctor Zum'rah",
        notes: [
          `{{Healing Wave|Vague de soins}}, {{Shadow Bolt|éclair de l'ombre}}, {{Shadow Bolt Volley|volée d'éclairs de l'ombre}} et {{Ward of Zum'rah|gardien de Zum'rah}}.`,
          `Facile si tu nettoies le cimetière à côté d'abord; sinon il invoque des zombies. Ses longs sorts sont faciles à interrompre.`,
        ],
      },
      {
        nom: ["Shadowpriest Sezz'ziz", 'Nekrum Gutchewer'],
        notes: [
          `{{Heal|Soin}}, {{Psychic Scream|cri psychique}}, {{Renew|rénovation}} et {{Shadow Bolt|éclair de l'ombre}}.`,
          `Nettoie d'abord les trolls de la pyramide: la source parle d'atteindre exactement 100 monstres tués avec Nekrum, sans détailler l'événement. Sezz'ziz est facile après ça.`,
        ],
      },
      {
        nom: 'Chief Ukorz Sandscalp',
        notes: [
          `{{Cleave|Coup en arc}}, {{Enrage|rage}} et {{Wide Slash|grande entaille}}: tanke-le face à l'opposé du groupe, car ses coups frappent tout ce qui est devant lui.`,
          `Ruuzlu se combat en même temps.`,
        ],
      },
      {
        nom: "Gahz'Rilla",
        notes: [
          `{{Freeze Solid|Gel total}}, {{Slam|coup puissant}} et {{Icicle|glaçon}}.`,
          `Il faut le Mallet of Zul'Farrak pour l'invoquer (un seul membre du groupe en a besoin). Place-toi contre un mur pour ne pas être repoussé dans des groupes non nettoyés.`,
        ],
      },
    ],
    pieges: [
      `Sandfury Blood Drinkers: beaucoup de vie, d'armure et de dégâts, et ils drainent la vie des joueurs proches. Tire-en trois ou moins à la fois, sauf si le groupe est fort.`,
      `Sandfury Witch Doctors: ils soignent leurs alliés et posent des totems de lave. Tue-les en premier.`,
      `Quatre lanceurs de sorts autour de la fontaine de la place: tire-les hors de leur vue pour qu'ils viennent à toi.`,
      `Sul'lithuz Abominations (basilics): ils étourdissent et ont beaucoup de vie et d'armure. Utilise le contrôle de foule au besoin.`,
      `Sandfury Shadowhunters: ils peuvent neutraliser le tank et lui faire perdre la menace. Un prêtre ou un paladin peut dissiper l'effet.`,
      `Les groupes de scarabées près de Theka the Martyr sont dangereux si tu les tires en masse: éloigne Theka avant d'utiliser des dégâts de zone.`,
      `Événement de la pyramide: ne descends pas trop loin, car plus de 50 monstres peuvent aggro et faire wipe le groupe.`,
      `Les monstres réapparaissent: garde un rythme de tirage régulier.`,
    ],
    manque: [
      `Il n'y a pas d'ordre fixe pour les boss: le carrefour peut se nettoyer dans n'importe quel ordre, donc l'ordre de la page n'est pas obligatoire.`,
      `Ruuzlu n'est cité que dans le combat de Sandscalp. Zerillis est un rare qui n'est pas dans la liste de kami-labs.`,
      `Les niveaux se contredisent: courses aux zombies dès 41, 44 recommandé pour les quêtes, expérience correcte jusqu'à 49, mais une autre section parle de « 43 à 48 ».`,
    ],
    src: ['iv-zf', 'kami-zf'],
  },
  {
    id: 'maraudon',
    cible: 'Maraudon',
    nom: ['Maraudon', 'Maraudon'],
    niveaux: [46, 55],
    rdg: 42,
    classique: true,
    acces: `À Desolace (30, 62). Après les portes extérieures du temple, un chemin de caverne linéaire mène à une zone où trois chemins se séparent. Trois ailes, nommées par leur couleur: Wicked Grotto (violette, tenue par des satyres), Foulspore Cavern (orange, plantes hostiles, dryades et forces de la nature) et Earth Song Falls (l'aile intérieure, élémentaires de terre et bêtes).`,
    extras: [{ titre: 'Raccourci', texte: `Terminer la chaîne de quêtes du Scepter of Celebras ouvre un portail vers Inner Maraudon depuis un autel, dans une alcôve derrière le chemin du milieu. Selon Icy Veins, Inner Maraudon a le meilleur butin.` }],
    boss: [
      {
        nom: 'Lord Vyletongue',
        notes: [`Wicked Grotto: chef du groupe de satyres. Des tréants corrompus apparaissent aussi.`],
      },
      { nom: 'Noxxion', notes: [`Foulspore Cavern.`] },
      {
        nom: 'Celebras the Cursed',
        notes: [`Kami-labs le liste parmi les huit boss de Maraudon dans Forever. Icy Veins le mentionne seulement via la chaîne de quêtes du Scepter of Celebras et ne le place dans aucune aile.`],
      },
      { nom: 'Razorlash', notes: [`Foulspore Cavern.`] },
      { nom: 'Tinkerer Gizlock', notes: [`Earth Song Falls: dans sa cachette. La source ne dit pas si c'est un boss ou un simple PNJ.`] },
      { nom: 'Landslide', notes: [`Earth Song Falls: dans la caverne. La source ne dit pas si c'est un boss ou un simple PNJ.`] },
      { nom: 'Rotgrip', notes: [`Earth Song Falls: dans le lac. La source ne dit pas si c'est un boss ou un simple PNJ.`] },
      { nom: 'Princess Theradras', notes: [`Boss final, dans Earth Song Falls.`] },
    ],
    pieges: [],
    manque: [
      `La page d'Icy Veins ne donne ni mécaniques ni stratégies pour aucun boss: seulement qui se trouve où.`,
      `Elle ne dit pas quel chemin du carrefour mène à quelle aile (seulement que le portail est derrière le chemin du milieu), ni la liste complète des boss de chaque aile.`,
      `Elle dit que le donjon est surtout fait pour les niveaux 47-49 mais qu'il se fait aussi à plus bas niveau. Les niveaux de Forever (46-55) viennent d'Icy Veins.`,
    ],
    src: ['iv-mara', 'kami-mara'],
  },
  {
    id: 'alcaz-island-prison',
    cible: 'Alcaz Island Prison',
    nom: ['Alcaz Island Prison', null],
    niveaux: [48, 53],
    officiel: [48, 53],
    nouveau: true,
    fiche: true,
    acces: `Sur Alcaz Island, tout au nord-est de Dustwallow Marsh (Wowhead).`,
    boss: [],
    pieges: [],
    manque: [
      `Ce donjon est annoncé mais n'était pas encore dans la bêta. Aucune source ne donne de boss, de mécaniques ou de quêtes.`,
      `Kami-labs liste une « Prison des Défias » (Defias Prison, niveaux 48-53, sans nom officiel) comme donjon à venir: elle pourrait être le même donjon, mais sa page ne parle pas d'Alcaz Island et aucune source ne le confirme.`,
    ],
    src: ['iv-news-9', 'wh-overview', 'kami-defias'],
  },
]
