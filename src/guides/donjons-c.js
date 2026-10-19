// Guides des donjons de niveau 50 à 60. Même forme et mêmes règles que donjons-a.js et donjons-b.js: seulement ce que les
// sources disent, et tout ce qui manque ou se contredit est écrit dans « manque ».
// Presque tout vient d'Icy Veins (versions Classic): Forever peut avoir changé des détails.

export const DONJONS_C = [
  {
    id: 'sunken-temple',
    cible: "Temple of Atal'Hakkar",
    nom: ["Temple of Atal'Hakkar", 'Le temple englouti'],
    alias: ['Sunken Temple'],
    niveaux: [50, 60],
    rdg: 45,
    classique: true,
    acces: `Le temple est au milieu d'un lac, dans Swamp of Sorrows. Alliance: vole jusqu'à Nethergarde Keep (Blasted Lands) et va à cheval dans le marais. Horde: vole directement à Stonard. Nage vers le bas par l'entrée inondée, remonte à l'intérieur et monte quelques marches jusqu'à l'entrée du donjon. Prends d'abord les quêtes du donjon.`,
    boss: [
      {
        nom: 'Atal\'ai Defenders',
        notes: [
          `Six mini-boss (Gasher, Hukku, Loro, Mijan, Zolo et Zul'Lor) sur leurs plateformes, aux étages du bas. Il faut les battre tous les six pour débloquer le reste du donjon.`,
          `Ils ont peu ou pas de capacités.`,
        ],
      },
      {
        nom: "Atal'alarion",
        notes: [
          `Clique sur les statues de serpent dans cet ordre: sud, nord, sud-ouest, sud-est, nord-ouest, nord-est. Si tu te trompes, il faut recommencer.`,
          `Garde les distances et le soigneur au maximum de portée pour limiter les étourdissements, et prépare le tank à de gros coups.`,
        ],
      },
      {
        nom: ['Ogom the Wretched', "Jammal'an the Prophet"],
        notes: [
          `Tue Ogom en premier: il a moins de vie.`,
          `Interromps le {{Healing Wave|vague de soins}} de Jammal'an et étalez-vous à cause de {{Flamestrike|colonne de flammes}}.`,
          `Un joueur touché par {{Hex of Jammal'an|le maléfice de Jammal'an}} frappe plus fort mais bouge lentement: fais-le courir en rond (kite).`,
        ],
      },
      {
        nom: ['Dreamscythe', 'Weaver'],
        notes: [
          `Les deux ont {{Acid Breath|souffle acide}} et {{Wing Flap|battement d'ailes}}. Tanke-les le dos à un mur; tire-les un à la fois s'ils sont séparés.`,
        ],
      },
      {
        nom: ['Hazzas', 'Morphaz'],
        notes: [`Mêmes capacités que Dreamscythe et Weaver, mais ils attaquent toujours ensemble. Même placement contre un mur, avec plus de soins et des protections défensives.`],
      },
      {
        nom: 'Avatar of Hakkar',
        notes: [
          `Pour l'invoquer, il faut la quête « The God Hakkar »; un Yeh'kinya's Scroll permet de l'invoquer à nouveau plus tard.`,
          `Tue les renforts jusqu'à ce qu'un Hakkari Bloodkeeper laisse du Hakkari Blood, utilise-le pour éteindre les quatre brasiers, puis combats-le.`,
          `{{Cause Insanity|Folie}} prend le contrôle d'un joueur au hasard pendant 6 secondes: utilise un contrôle de foule court sur lui.`,
        ],
      },
      {
        nom: 'Shade of Eranikus',
        notes: [
          `Il frappe fort en mêlée, étourdit avec {{War Stomp|piétinement}}, frappe plusieurs fois avec {{Thrash|enchaînement}} et endort profondément ({{Deep Slumber}}) un non-tank qui a beaucoup de menace.`,
          `Prévois beaucoup de soins: le tank utilise ses protections et les DPS aident à soigner.`,
        ],
      },
    ],
    pieges: [`La page d'Icy Veins ne parle pas des monstres ordinaires.`],
    manque: [
      `Elle ne donne pas l'emplacement exact ni l'ordre pour nettoyer les six Atal'ai Defenders, ni la durée de la nage, ni les prérequis des quêtes (elle renvoie à d'autres guides).`,
      `Le guide Classic recommande 50-55; Forever annonce 50-60.`,
    ],
    src: ['iv-st', 'kami-st'],
  },
  {
    id: 'blackrock-depths',
    cible: 'Blackrock Depths',
    nom: ['Blackrock Depths', 'Profondeurs de Blackrock'],
    niveaux: [52, 60],
    rdg: 48,
    classique: true,
    acces: `Blackrock Mountain se rejoint depuis Searing Gorge ou Burning Steppes. Suis les deux chaînes jusqu'à la mine de la carrière, puis va au fond pour trouver le portail du donjon. Aucune attunement ni clé n'est requise. Prends d'abord les quêtes du donjon.`,
    extras: [{ titre: 'Upper City', texte: `À l'intérieur, passe les deux Shadowforge Gates et la porte de l'Eastern Garrison, puis active le Shadowforge Lock pour traverser le pont jusqu'à l'Upper City.` }],
    boss: [
      {
        nom: 'High Interrogator Gerstahn',
        notes: [
          `{{Mana Burn|Brûlure de mana}}, {{Psychic Scream|cri psychique}}, {{Shadow Shield|bouclier d'ombre}} et {{Shadow Word: Pain|mot de l'ombre: douleur}}.`,
          `Nettoie les groupes autour pour que le cri psychique ne te fasse pas fuir vers d'autres monstres, et interromps la brûlure de mana.`,
        ],
      },
      {
        nom: 'Lord Roccor',
        notes: [
          `{{Earth Shock|Horion de terre}}, {{Flame Shock|horion de flammes}} et {{Ground Tremor|secousse du sol}}.`,
          `Garde les distances et les soigneurs au maximum de portée pour éviter l'interruption et l'étourdissement.`,
        ],
      },
      {
        nom: 'Houndmaster Grebmar',
        notes: [
          `{{Bloodlust|Soif de sang}}, {{Demoralizing Shout|cri démoralisant}} et {{Pummel|torgnole}}.`,
          `Nettoie les groupes de chiens quand il n'est pas près d'eux; après, le combat est simple.`,
        ],
      },
      {
        nom: 'Ring of Law',
        notes: [
          `Des vagues de monstres au hasard apparaissent, puis un des six boss de l'arène, au hasard.`,
          `Anub'shiah: {{Curse of Tongues}}, {{Curse of Weakness}}, {{Demon Armor}}, {{Enveloping Web}}, {{Shadow Bolt}}. Dissipe la malédiction de langues si tu peux; Blessing of Freedom enlève la toile.`,
          `Eviscerator: {{Anti-Magic Shield}}, {{Shadow Bolt Volley}}, {{Vicious Rend}}. La volée d'éclairs de l'ombre est la menace principale: le soigneur garde le groupe en santé.`,
          `Gorosh the Dervish: {{Bloodlust}}, {{Mortal Strike}}, {{Whirlwind}}. La mort du tank est le plus grand risque: garde-le en vie.`,
          `Grizzle: {{Cleave}}, {{Enrage}}, {{Ground Tremor}}. Distances et soigneurs au maximum de portée pour éviter l'étourdissement; les mêlées évitent le coup en arc.`,
          `Hedrum the Creeper: {{Baneful Poison}}, {{Paralyzing Poison}}, {{Web Explosion}}. Enlève le poison paralysant quand tu peux.`,
          `Ok'thor the Breaker: {{Arcane Bolt}}, {{Arcane Explosion}}, {{Polymorph}}, {{Slow}}. Dissipe vite les ralentissements et les métamorphoses, surtout sur le soigneur; distances et soigneurs au maximum de portée pour l'explosion arcanique.`,
        ],
      },
      {
        nom: 'Fineous Darkvire',
        notes: [
          `{{Devotion Aura}}, {{Holy Light|lumière sacrée}}, {{Holy Strike}}, {{Kick}} et {{Seal of Reckoning}}.`,
          `Interromps sa lumière sacrée pour l'empêcher de se soigner, et prépare-toi à de gros coups en mêlée.`,
        ],
      },
      {
        nom: 'Pyromancer Loregrain',
        notes: [
          `{{Fire Ward}}, {{Flame Shock|horion de flammes}}, {{Molten Blast}} et {{Scorching Totem|totem incendiaire}}.`,
          `Tue vite le totem incendiaire et dissipe le horion de flammes pour finir le combat rapidement.`,
        ],
      },
      {
        nom: "Bael'Gar",
        notes: [
          `{{Magma Splash}} et {{Summon Spawn of Bael'Gar|invocation d'un rejeton}}: il invoque un rejeton quand sa vie baisse (le texte de la source est confus).`,
          `Le tank l'oriente à l'écart du groupe pour limiter les éclaboussures de magma.`,
        ],
      },
      {
        nom: 'Lord Incendius',
        notes: [
          `{{Curse of the Elemental Lord}}, {{Fiery Burst}}, {{Fire Storm}} et {{Mighty Blow}}.`,
          `Le tank se place contre un mur pour ne pas être projeté du pont. Dissipe la malédiction si possible.`,
        ],
      },
      {
        nom: ['Warder Stilgiss', 'Verek'],
        notes: [`{{Frostbolt|Éclair de givre}}, {{Frost Armor|armure de givre}}, {{Frost Nova|nova de givre}} et {{Frost Ward}}. Pas très difficile: interromps un maximum de sorts de Stilgiss.`],
      },
      {
        nom: 'General Angerforge',
        notes: [
          `Le principal danger, ce sont les renforts qu'il a au départ et qu'il invoque régulièrement: ils ont peu de vie, tue-les vite.`,
          `Il a {{Enrage|rage}}, {{Flurry|furie}} et {{Sunder Armor|brèche dans l'armure}}.`,
        ],
      },
      {
        nom: 'Golem Lord Argelmach',
        notes: [`{{Chain Lightning|Éclair en chaîne}} peut toucher tout le groupe: étalez-vous. Tue vite les golems qui l'accompagnent.`],
      },
      {
        nom: 'Hurley Blackbreath',
        special: true,
        notes: [
          `Dans le Grim Guzzler (le bar). Casse les trois cibles de la salle de stockage à gauche en entrant pour l'invoquer.`,
          `Tue d'abord ses renforts.`,
        ],
      },
      {
        nom: 'Phalanx',
        notes: [`Soigne le groupe pendant sa {{Fireball Volley|volée de boules de feu}}. Le tank se place contre un mur pour éviter les repoussements de {{Mighty Blow}}.`],
      },
      {
        nom: 'Ribbly Screwspigot',
        special: true,
        notes: [`Défi mineur selon le guide. Tue vite ses défenseurs et il tombe peu après.`],
      },
      {
        nom: 'Ambassador Flamelash',
        notes: [`Il invoque des élémentaires à peu de vie qui fusionnent avec lui (effet Burning Spirit: plus de dégâts par cumul). Tue-les avant qu'ils l'atteignent.`],
      },
      {
        nom: 'Chest of the Seven',
        special: true,
        notes: [`Dans la Summoners' Tomb: bats sept esprits de nains, un à la fois, avant que le suivant apparaisse. Les sept morts débloquent le coffre.`],
      },
      {
        nom: 'Magmus',
        notes: [`Place-toi entre les souffles de feu qui chauffent des zones de la salle. {{War Stomp|Piétinement}} étourdit ceux qui sont proches.`],
      },
      {
        nom: ['Emperor Dagran Thaurissan', 'Princess Moira Bronzebeard'],
        notes: [
          `Le guide en fait le combat le plus difficile, avec un wipe probable. Nettoie les monstres de la salle d'abord, car Dagran les appelle.`,
          `Tu peux tuer Moira en premier, ou la garder en vie pour les quêtes de faction.`,
          `Dagran: {{Avatar of Flame}} ajoute des dégâts de feu à sa mêlée, {{Hand of Thaurissan}} étourdit le tank et {{Ironfoe}} donne des coups critiques et des attaques en plus: gros dégâts d'un coup sur le tank.`,
          `Moira se soigne elle-même et soigne Dagran: interromps son soin chaque fois que possible. Si tu ne la tues pas, contrôle-la.`,
        ],
      },
      {
        nom: 'Watchman Doomgrip',
        special: true,
        notes: [
          `Le coffre secret (Secret Safe): ouvre les 12 Relic Coffers avec les clés trouvées dans le donjon pour atteindre Watchman Doomgrip, qui garde la Secret Vault Room. Bats-le pour piller le coffre.`,
        ],
      },
    ],
    pieges: [
      `Les groupes autour de Gerstahn peuvent t'enchaîner des peurs vers d'autres monstres.`,
      `Le pont près de Lord Incendius est un risque de repoussement.`,
      `Grim Guzzler: les clients neutres se défendent entre eux quand on en attaque un, et plusieurs mini-boss peuvent être sautés.`,
      `Lyceum Gauntlet: ce n'est pas un boss. Pille les Shadowforge Flame Keepers pour deux Shadowforge Torches, puis éteins les braseros avec pour débloquer la porte de la salle finale.`,
    ],
    manque: [
      `Le guide dit que les six boss possibles du Ring of Law sont décrits plus bas sans les nommer clairement; on suppose qu'il s'agit des six boss qui suivent (Anub'shiah, Eviscerator, Gorosh, Grizzle, Hedrum, Ok'thor).`,
      `L'entrée de Lord Incendius dans le guide attribue Mighty Blow à Lord Roccor (probablement une erreur); celle de Bael'Gar est mal écrite. Les sources ne donnent pas non plus l'ordre exact du trajet, ni où sont les clés des Relic Coffers.`,
      `Les niveaux conseillés sont 47-55 pour la Detention Block et 54-61 pour l'Upper City (Forever annonce 52-60). L'ordre ci-dessus suit les sections de la page, pas un trajet confirmé.`,
    ],
    src: ['iv-brd-d', 'iv-brd-u', 'kami-brd'],
  },
  {
    id: 'lower-blackrock-spire',
    cible: 'Lower Blackrock Spire',
    nom: ['Lower Blackrock Spire', 'Pic Blackrock, partie inférieure'],
    niveaux: [55, 60],
    rdg: 53,
    classique: true,
    acces: `Depuis Blackrock Mountain, par le sud de Searing Gorge ou le nord-ouest de Burning Steppes. Monte les chaînes depuis la plateforme du milieu, saute au bout sur le rebord du deuxième étage, longe le mur et saute sur l'unique balcon: le portail y est. Prends d'abord les quêtes du donjon.`,
    boss: [
      {
        nom: 'Highlord Omokk',
        notes: [
          `{{Cleave|Coup en arc}}, {{Enrage|rage}} et {{Knock Away|repoussement}}. Deux gardes ogres s'ajoutent: contrôle-en un ou les deux, ou brûle-en un dès le début.`,
          `Oriente le tank à l'opposé du groupe pour éviter le coup en arc et le repoussement.`,
        ],
      },
      {
        nom: "Shadow Hunter Vosh'gajin",
        notes: [
          `{{Curse of Blood}} et {{Hex|maléfice}}, qui transforme un joueur en grenouille pendant 8 secondes.`,
          `Deux Smolderthorn Shadow Priests doivent être tués ou contrôlés jusqu'à sa mort. Un mage ou un druide peut enlever la malédiction.`,
        ],
      },
      {
        nom: 'War Master Voone',
        notes: [
          `{{Cleave|Coup en arc}}, {{Snap Kick}}, {{Thrash}}, {{Throw Axe}} et {{Uppercut}}, sans renforts.`,
          `Il frappe plus fort que la normale: laisse le tank prendre la menace et oriente-le à l'opposé du groupe.`,
        ],
      },
      {
        nom: 'Mother Smolderweb',
        notes: [
          `Un étourdissement en cône devant elle, le poison {{Mother's Milk}} qui peut neutraliser des joueurs, et des araignées invoquées.`,
          `Garde-la face à l'opposé du groupe et surveille le poison.`,
        ],
      },
      {
        nom: 'Urok Doomhowl',
        special: true,
        notes: [
          `Invoqué: il faut la Omokk's Head et la Roughshod Pike sur un tas d'offrandes, puis plusieurs vagues d'ogres avant qu'il apparaisse. La pique sur le tas tue un ogre toutes les 30 secondes.`,
          `Tanke-le à l'écart du groupe pour éviter sa peur.`,
        ],
      },
      {
        nom: 'Quartermaster Zigris',
        notes: [
          `{{Hooked Net}}, {{Stun Bomb}} et {{Drink Healing Potion}}.`,
          `Tire avec soin les groupes de monstres de sa salle avant de le tirer lui.`,
        ],
      },
      {
        nom: 'Halycon',
        notes: [`{{Rend|Déchirure}} et {{Thrash}}. Tue d'abord les worgs qui l'accompagnent, puis finis-la.`],
      },
      {
        nom: 'Gizrul the Slavener',
        notes: [`{{Enrage|Rage}}, {{Fatal Bite|morsure fatale}} et {{Infected Bite|morsure infectée}}, sans mécanique particulière. Tanke-le et brûle-le vite, avec tes protections si tu en as.`],
      },
      {
        nom: 'Overlord Wyrmthalak',
        notes: [
          `{{Cleave|Coup en arc}}, {{Demoralizing Shout|cri démoralisant}} et {{Sweeping Slam}}. Tanke-le contre un mur pour éviter le repoussement.`,
          `À 50 % de vie, il invoque des élites: contrôle-les (mouton, nova de givre, racines) jusqu'à sa mort.`,
        ],
      },
    ],
    pieges: [
      `Les premiers groupes sont les plus durs, car beaucoup de groupes sont proches: tire-en un à la fois et concentre-toi sur les lanceurs de sorts.`,
      `Utilise Sap (ou un contrôle équivalent) pour limiter les combats à 1 ou 2 ennemis quand les tirages sont trop difficiles.`,
      `Le guide recommande un joueur d'expérience pour guider le groupe, car le plan est confus. Voleurs et mages sont conseillés pour un groupe de niveau trop bas.`,
      `Rares facultatifs (butin plus faible selon le guide): Spirestone Butcher (sur le pont avant Omokk), Spirestone Battle Lord (sur le monticule de gauche dans la salle d'Omokk), Bannok Grimaxe (dans le camp des Firebrand quand les orcs commencent à apparaître) et Crystal Fang (dans un des groupes après Mother Smolderweb).`,
    ],
    manque: [
      `Aucun niveau recommandé: le guide dit seulement que c'est bon pour l'expérience à partir de 55, avec un butin qui demande les niveaux 53 à 57.`,
      `Il dit que le donjon peut accueillir jusqu'à 10 joueurs, mais que dépasser 5 est inefficace avant le niveau 60. Il ne dit rien sur une clé, une quête ou une attunement pour entrer.`,
      `Les conditions d'apparition des rares ne sont pas données. Zigris est décrit sans « capacité notable » tout en listant trois capacités.`,
    ],
    src: ['iv-lbrs', 'kami-brs'],
  },
  {
    id: 'upper-blackrock-spire',
    cible: 'Upper Blackrock Spire',
    nom: ['Upper Blackrock Spire', 'Pic Blackrock, partie supérieure'],
    niveaux: [59, 60],
    rdg: 53,
    classique: true,
    acces: `À l'intérieur de Lower Blackrock Spire, la première porte à gauche, verrouillée. Au moins un membre du groupe doit avoir le Seal of Ascension.`,
    extras: [{ titre: 'Le Seal of Ascension', texte: `Selon le guide: récupère un Unadorned Seal sur les monstres de LBRS; prends la quête de Vaelan dans LBRS; ramasse trois gemmes (sur Highlord Omokk, War Master Voone et Overlord Wyrmthalak) puis rends-les à Vaelan pour un coffre. Dernière étape: à Dustwallow Marsh, combats Emberstrife en groupe. À 25 % de vie, utilise l'Unforged Seal. À 10 %, arrête d'attaquer et utilise l'Orb of Draconic Energy pour le contrôler mentalement, puis utilise ses Flames of the Black Flight pour forger le sceau.` }],
    boss: [
      {
        nom: 'Pyroguard Emberseer',
        notes: [
          `Plusieurs joueurs canalisent l'autel pour lancer le combat; des renforts apparaissent et doivent recevoir des dégâts de zone avant qu'il arrive.`,
          `Tanke-le à l'opposé du groupe; les mêlées frappent par derrière, et les distances et les soigneurs restent hors de la plateforme.`,
          `{{Fire Nova|Nova de feu}} et {{Flame Buffet|bourrasque de flammes}}.`,
        ],
      },
      {
        nom: 'Solakar Flamewreath',
        notes: [
          `Nettoie les dragons de l'écloserie, puis clique sur Father Flame pour lancer plusieurs vagues de renforts. Tue les Rookery Hatchers et évite de casser des œufs.`,
          `Tanke-le à l'écart du groupe pour éviter son {{War Stomp|piétinement}}.`,
        ],
      },
      {
        nom: 'Goraluk Anvilcrack',
        notes: [
          `À l'extrémité ouest de la salle après l'écloserie. Nettoie les monstres d'abord, puis tanke-le face à l'opposé et brûle-le.`,
          `{{Backhand}}, {{Head Crack}} et {{Strike}}.`,
        ],
      },
      {
        nom: 'Jed Runewatcher',
        special: true,
        notes: [
          `Rare: à l'extrémité est de la salle de Goraluk, il n'apparaît pas toujours. Nettoie les monstres autour; combat facile selon le guide.`,
          `{{Charge}}, {{Heroic Strike}} et {{Shield Bash}}.`,
        ],
      },
      {
        nom: ['Warchief Rend Blackhand', 'Gyth'],
        notes: [
          `Saute dans la fosse pour commencer, puis bats plusieurs vagues.`,
          `Oriente Gyth à l'opposé du raid et tue-le en premier. Rend descend à 20 % de vie et combat seul: tue vite les Rage Talon Fire Tongues (ils lancent une grosse nova de feu). Les mêlées surveillent le tourbillon de Rend.`,
          `Rend: {{Cleave}}, {{Mortal Strike}}, {{Thunderclap}}, {{Whirlwind}}. Gyth: {{Corrosive Acid Breath}}, {{Flame Breath}}, {{Freeze}}, {{Knock Away}}.`,
        ],
      },
      {
        nom: 'The Beast',
        notes: [
          `Surveille ses charges au hasard et ses peurs. Les distances et les soigneurs s'espacent au maximum de portée, et le tank se place le dos à un mur pour résister au repoussement de la nova de feu.`,
          `{{Berserker Charge}}, {{Fireball}}, {{Flamebreak}}, {{Immolate}} et {{Terrifying Roar}}.`,
        ],
      },
      {
        nom: 'General Drakkisath',
        notes: [
          `Le combat le plus dur, avec deux Chromatic Elite Guards.`,
          `Deux approches d'après le guide: le kiter avec un chasseur (Aspect of the Cheetah, Arcane Shot, Feign Death) pendant que le groupe tue les gardes; ou tout tanker ensemble avec les protections et une peur de démoniste sur un garde, en tuant les renforts d'abord. Tanke-le à l'opposé du groupe quand il revient.`,
          `{{Cleave}}, {{Conflagration}}, {{Flame Breath}}, {{Flamestrike}}, {{Pierce Armor}}, {{Rage}} et {{Thunderclap}}.`,
        ],
      },
    ],
    pieges: [
      `La plupart des monstres sont des orcs: Sap et la métamorphose sont efficaces. Plus de contrôle pour les groupes moins équipés.`,
      `Interromps les Blackhand Summoners de la première salle pour éviter des renforts. Dans la première salle, il faut tout nettoyer avant que la porte suivante s'ouvre.`,
      `Après l'écloserie, les orcs de mêlée chargent et repoussent: place les distances pour qu'elles ne soient pas projetées dans l'écloserie, car des œufs cassés attirent d'autres monstres et peuvent causer un wipe.`,
      `Les groupes sont proches dans les salles: tire avec soin et recule au besoin.`,
    ],
    manque: [
      `Aucun niveau minimum: le guide dit que c'est surtout fait pour le niveau 60 mais que 58 est possible, avec un butin demandant les niveaux 51 à 60.`,
      `Le guide dit qu'il y a 7 boss principaux, mais sa liste en compte six plus le rare Jed Runewatcher. Il ne dit pas ce qui déclenche l'apparition d'Emberseer au-delà des renforts.`,
      `C'est un guide Classic: on ne sait pas si Forever garde la porte verrouillée et le Seal of Ascension.`,
    ],
    src: ['iv-ubrs', 'kami-brs'],
  },
  {
    id: 'scholomance',
    cible: 'Scholomance',
    nom: ['Scholomance', 'Scholomance'],
    niveaux: [58, 60],
    rdg: 57,
    classique: true,
    acces: `Sur une petite île au sud-est de Western Plaguelands, derrière une grille verrouillée. N'importe laquelle de ces solutions l'ouvre: la Skeleton Key (chaîne de quêtes « Key to Scholomance », qui commence par « A Call to Arms: The Plaguelands! » dans une capitale), un voleur avec beaucoup de crochetage, une Powerful Seaforium Charge (ouverture temporaire), ou un membre du groupe qui meurt et ressuscite de l'autre côté de la grille. La plupart des chaînes de quêtes commencent hors de l'instance.`,
    boss: [
      {
        nom: 'Kirtonos the Herald',
        special: true,
        notes: [
          `Facultatif. On l'invoque sur un balcon avec le Blood of Innocents.`,
          `Son repoussement peut jeter le tank par la fenêtre: garde le dos au mur.`,
        ],
      },
      {
        nom: 'Jandice Barov',
        special: true,
        notes: [
          `Facultative, souvent sautée. Elle se divise en copies illusoires: frappe les copies jusqu'à trouver la vraie, puis tue-la, ou nettoie d'abord les copies si les dégâts reçus sont trop élevés.`,
          `Elle laisse le Blood of Innocents.`,
        ],
      },
      {
        nom: 'Rattlegore',
        notes: [
          `Gros dégâts sur une cible, avec des étourdissements qui font perdre la menace. Les DPS attendent que le tank ait la menace.`,
          `Il laisse la Viewing Room Key, nécessaire pour la dernière section.`,
        ],
      },
      {
        nom: 'Ras Frostwhisper',
        special: true,
        notes: [
          `Facultatif, mais souvent tué. Lanceur de givre avec {{Fear|peur}}, {{Freeze|gel}} et {{Chill Nova|nova glaciale}}.`,
          `Interromps la plupart de ses sorts et tanke-le face à l'opposé pour que le gel n'étourdisse pas le groupe.`,
        ],
      },
      {
        nom: ['Marduk Blackpool', 'Vectus'],
        special: true,
        notes: [
          `Facultatifs, dans la Viewing Room. Ils ne sont hostiles qu'après l'utilisation d'un Dawn's Gambit.`,
          `Le {{Shadow Shield|bouclier d'ombre}} de Marduk renvoie des dégâts à la mêlée; esquive le {{Flamestrike|colonne de flammes}} au sol de Vectus.`,
        ],
      },
      {
        nom: 'Instructor Malicia',
        notes: [`Les six gardiens se nettoient avant que Gandling apparaisse. Malicia (en haut, au sud): interromps ou dissipe {{Heal|soin}} et {{Renew|rénovation}}.`],
      },
      {
        nom: 'Doctor Theolen Krastinov',
        notes: [`En haut, à l'est: repoussement. Il entre en rage à 50 %, garde tes protections pour cette phase.`],
      },
      {
        nom: 'Lorekeeper Polkelt',
        notes: [`En haut, au nord: dégâts surtout faibles. Dissipe {{Volatile Infection}} si les DPS sont faibles.`],
      },
      {
        nom: 'The Ravenian',
        notes: [`En bas, au sud: son repoussement fait perdre la menace, donc le tank doit la reprendre par une provocation.`],
      },
      {
        nom: 'Lord Alexei Barov',
        notes: [
          `En bas, au sud: deux gardes du corps à contrôler ou à tuer vite.`,
          `Les distances et les soigneurs restent au maximum de portée à cause de {{Unholy Aura|l'aura impie}}; dissipe ou soigne les joueurs touchés par {{Veil of Shadow|voile d'ombre}}.`,
        ],
      },
      {
        nom: 'Lady Illucia Barov',
        notes: [`En bas, au sud: sa peur peut attirer des groupes. Dissipe ou contrôle les joueurs touchés par {{Dominate Mind|contrôle mental}} et évite de les frapper avec des coups en arc.`],
      },
      {
        nom: 'Darkmaster Gandling',
        notes: [
          `Boss final. Il téléporte parfois des membres du groupe dans les salles verrouillées des gardiens, qu'il faut nettoyer pour revenir. Interromps ses {{Arcane Missiles|projectiles arcaniques}} quand tu peux.`,
          `La source dit que le tank et le soigneur peuvent aussi être téléportés. La page est coupée en plein milieu de phrase: les autres mécaniques ne sont pas couvertes.`,
        ],
      },
    ],
    pieges: [
      `Première salle: tire les groupes un par un vers l'entrée, car les lanceurs de sorts peuvent enchaîner d'autres groupes et faire wipe.`,
      `Salle de Rattlegore: des monstres frappent fort et étourdissent le tank. Ne tire pas plusieurs groupes ni avec le boss.`,
      `Viewing Room: évite les élites sauf si la bonne chaîne de quêtes est faite. Nettoie les trois salles du bas avant celles du haut pour ne pas attirer Gandling trop tôt.`,
    ],
    manque: [
      `Les sources se contredisent sur la Viewing Room: l'une dit que les élites deviennent normaux avec la chaîne Broodling Essence, l'autre qu'il ne faut pas les attaquer sans avoir fini celle du Dawn's Gambit.`,
      `La section de The Ravenian cite par erreur Lorekeeper Polkelt (copier-coller probable). Aucune taille de groupe, niveau d'objets ni exigence de tank ou de soigneur n'est donnée.`,
      `Le texte parle de 13 boss principaux « y compris » les 6 mini-boss; les boss listés font bien 13 avec Gandling, mais la phrase est floue.`,
    ],
    src: ['iv-scholo', 'kami-scholo'],
  },
  {
    id: 'stratholme-live',
    cible: 'Stratholme: Living',
    nom: ['Stratholme: Living', 'Stratholme (vivants)'],
    niveaux: [58, 60],
    rdg: 55,
    classique: true,
    acces: `Entre par l'entrée principale, au nord-ouest d'Eastern Plaguelands. La zone Scarlet Bastion demande la Scarlet Key (voir la Library du Monastère écarlate pour l'obtenir).`,
    boss: [
      {
        nom: 'Fras Siabi',
        special: true,
        notes: [
          `Facultatif (niveau 61). On l'invoque en cliquant sur une boîte de tabac dans une alcôve. Étalez-vous et nettoie la zone d'abord. Il ne laisse qu'un objet de quête.`,
        ],
      },
      {
        nom: 'The Unforgiven',
        special: true,
        notes: [`Facultatif (niveau 57). Il apparaît à la porte nord de la ville principale. Tue les petits renforts, puis lui; aucune mécanique notable.`],
      },
      {
        nom: 'Timmy the Cruel',
        notes: [`Niveau 58, toujours présent. Il arrive derrière toi après que tu as nettoyé la cour, sans ouvrir la porte du bâtiment écarlate. Aucune capacité notable.`],
      },
      {
        nom: 'Malor the Zealous',
        special: true,
        notes: [`Facultatif (niveau 60), seulement pour la quête du Medallion of Faith. Surveille son autosoin, que la source juge inoffensif.`],
      },
      {
        nom: 'Cannon Master Willey',
        notes: [`Niveau 60. Il invoque des renforts: fais des dégâts de zone sur eux ou utilise les canons. {{Knock Away|Repoussement}} est listé sans explication.`],
      },
      {
        nom: 'Crimson Hammersmith',
        special: true,
        notes: [`Facultatif (niveau 60). On l'invoque avec des plans de forge sur le sol près de Willey. Aucune mécanique.`],
      },
      {
        nom: 'Archivist Galford',
        notes: [`Niveau 60. {{Burning Winds|Vents brûlants}} fait de gros dégâts et étourdit la cible: le soigneur doit être prêt à soigner à travers.`],
      },
      {
        nom: 'Postmaster Malown',
        special: true,
        notes: [
          `Facultatif (niveau 60). La source ne dit pas où il se trouve dans le trajet.`,
          `On l'invoque en tuant des Stratholme Couriers pour leurs clés de boîtes aux lettres, puis en ouvrant 3 boîtes aux lettres. Ses capacités ({{Backhand}}, {{Curse of Tongues}}, {{Curse of Weakness}}, {{Fear|peur}}) sont mineures selon la source.`,
        ],
      },
      {
        nom: 'Grand Crusader Dathrohan',
        notes: [
          `Boss final (niveau 62). Il utilise des capacités de paladin et se transforme en Balnazzar à 50 % de vie.`,
          `Garde les distances et le soigneur loin du {{Psychic Scream|cri psychique}} et contrôle les joueurs touchés par {{Domination}}. Les mages peuvent utiliser le mouton.`,
        ],
      },
      {
        nom: ['Jarien', 'Sothos'],
        special: true,
        notes: [
          `Facultatifs, dans la salle de Balnazzar. Il faut un Brazier of Beckoning, obtenu avec la chaîne de quêtes « Dungeon Tier 0.5 » ou après l'avoir terminée. Le guide dit que ce combat est « extrêmement facile ».`,
        ],
      },
    ],
    pieges: [
      `Skul (rare, niveau 58): Arcane Bolt, Frost Shock, Frostbolt; aucune mécanique mentionnée.`,
      `Hearthsinger Forresten (rare, niveau 57): Enchanting Lullaby endort un joueur 10 secondes: surveille un soigneur endormi. Il a aussi Multi-Shot.`,
      `Les Stratholme Couriers sont nécessaires pour invoquer Malown.`,
      `Il y a des morts-vivants et des humanoïdes: prévois du contrôle pour les deux (prêtres avec Shackle Undead; voleurs ou mages pour les humanoïdes).`,
    ],
    manque: [
      `Aucun événement chronométré n'est décrit.`,
      `Le rôle de la Scarlet Key n'est expliqué qu'en partie (elle ouvre la zone Scarlet Bastion). La source du Brazier of Beckoning est vague.`,
      `Timmy est « toujours présent » mais on peut aussi l'éviter en allant vers l'ouest: le guide ne précise pas.`,
      `Le butin cité est de la Phase 4 de Season of Discovery, alors que le reste est du Classic.`,
    ],
    src: ['iv-strat-l', 'kami-strat'],
  },
  {
    id: 'stratholme-undead',
    cible: 'Stratholme: Undead',
    nom: ['Stratholme: Undead', 'Stratholme (morts-vivants)'],
    niveaux: [58, 60],
    rdg: 55,
    classique: true,
    acces: `Prends la Key to the City de Magistrate Barthilas, et utilise-la à la porte de service, au sud-est de l'entrée principale, pour sauter la section des vivants. Sans la clé, tu peux traverser la section des vivants, mais le guide dit que c'est bien plus lent pour des courses répétées.`,
    boss: [
      {
        nom: 'Magistrate Barthilas',
        notes: [
          `Niveau 58. Aucune mécanique notable. Si tu es entré par la porte de service, il fuit le groupe au départ, et tu le combats après l'événement de la ziggurat.`,
        ],
      },
      {
        nom: "Nerub'enkan",
        notes: [
          `Une des trois ziggurats (ordre non précisé). Niveau 60. Il invoque de petits renforts ({{Raise Undead Scarab}}) et utilise {{Crypt Scarabs}}, {{Encasing Webs}} et {{Pierce Armor}}.`,
          `Tank and spank: tue les renforts au fur et à mesure.`,
        ],
      },
      {
        nom: 'Baroness Anastari',
        notes: [
          `Niveau 59. {{Banshee Curse}} réduit brièvement les chances de toucher et {{Silence|silence}} dure 10 secondes. {{Possess}} donne à un joueur un énorme bonus de vie maximale: les DPS changent vite de cible pour la cible possédée.`,
          `Le silence sur le soigneur est un problème: un hybride peut soigner au besoin.`,
        ],
      },
      {
        nom: 'Maleki the Pallid',
        notes: [
          `Niveau 61. {{Ice Tomb}} étourdit la cible actuelle 10 secondes, pendant lesquelles le tank ne peut pas garder la menace: les gros DPS font attention à la menace.`,
        ],
      },
      {
        nom: 'Ramstein the Gorger',
        notes: [
          `Niveau 61. Il n'apparaît qu'après avoir tué les abominations devant la crypte finale.`,
          `{{Knockout}} remet la menace du tank à zéro: le tank doit la reprendre vite. Il a aussi {{Flurry|furie}} et {{Trample|piétinement}}.`,
        ],
      },
      {
        nom: 'Baron Rivendare',
        notes: [
          `Boss final (niveau 62). {{Cleave|Coup en arc}}, {{Mortal Strike|frappe mortelle}}, {{Shadow Bolt|éclair de l'ombre}} et {{Unholy Aura|aura impie}}.`,
          `Tanke-le d'un côté, face à l'opposé du groupe. Les soigneurs gardent les mêlées en vie; les distances et les soigneurs restent de l'autre côté de la salle pour éviter les dégâts de l'aura.`,
          `Tue vite les renforts, avec l'aide des mêlées.`,
        ],
      },
    ],
    pieges: [
      `Chacun des trois boss de la ziggurat demande de nettoyer les acolytes de sa ziggurat pour débloquer les boss finaux.`,
      `Stonespine (rare, niveau 60): il rôde près du couloir des ziggurats et peut attirer des monstres proches ou se joindre à un combat en cours. Tire avec soin.`,
      `Black Guard Swordsmith: il apparaît quand on interagit avec les Blacksmithing Plans près de la ziggurat d'Anastari. Il ne laisse un objet qu'aux forgerons.`,
      `Beaucoup de morts-vivants: risque de tirages en chaîne. Le Turn Undead d'un paladin peut causer des wipes; Shackle Undead d'un prêtre est recommandé.`,
    ],
    manque: [
      `Le guide ne dit pas comment avoir la clé sans avoir d'abord tué Barthilas dans la section des vivants.`,
      `L'ordre des trois boss de la ziggurat n'est pas précisé, et la position de Barthilas est décrite de deux façons (premier boss ou après la ziggurat), ce qui dépend de l'entrée utilisée.`,
      `Les renforts de Rivendare: la section du tank dit que les DPS peuvent les tanker, celle des mêlées dit que les mêlées aident à les tanker.`,
      `Aucune course chronométrée contre le Baron n'est décrite.`,
    ],
    src: ['iv-strat-u', 'kami-strat'],
  },
  {
    id: 'dire-maul-east',
    cible: 'Dire Maul: East',
    nom: ['Dire Maul: East', 'Hache-tripes Est'],
    niveaux: [54, 60],
    rdg: 54,
    classique: true,
    acces: `Par l'entrée principale de Dire Maul, en Feralas vers 59, 45. La Crescent Key, laissée par Pusillin, ouvre les ailes Ouest et Nord.`,
    boss: [
      {
        nom: 'Pusillin',
        special: true,
        notes: [
          `Facultatif, mais il laisse la clé. Quatre Wildspawn Imps l'accompagnent.`,
          `{{Blast Wave|Onde de choc}}, {{Fire Blast|explosion de feu}}, {{Fireball|boule de feu}} et {{Spirit of Runn Tum}}. Interromps-le et fais des dégâts de zone sur les diablotins.`,
        ],
      },
      {
        nom: 'Lethtendris',
        notes: [
          `{{Curse of Thorns}}, {{Curse of Tongues}}, {{Enlarge}}, {{Immolate|brûlure}}, {{Shadow Bolt Volley|volée d'éclairs de l'ombre}} et {{Void Bolt}}. Elle a un diablotin, Pimgib.`,
          `Contrôle ou tue Pimgib d'abord, interromps Lethtendris et dissipe la malédiction de langues si possible.`,
        ],
      },
      {
        nom: 'Hydrospawn',
        notes: [
          `{{Hydrojet}}, {{Massive Geyser}}, {{Riptide}}, {{Submersion}} et {{Summon Hydroling|invocation d'un hydroling}}.`,
          `Tue vite les Hydrolings, ou brûle directement Hydrospawn.`,
        ],
      },
      {
        nom: 'Zevrim Thornhoof',
        notes: [
          `{{Intense Pain}} et {{Sacrifice}}: le sacrifice sort un membre du groupe du combat et lui inflige de gros dégâts sur la durée.`,
          `Reste à portée maximale pour esquiver les dégâts: avec Intense Pain, ils peuvent devenir impossibles à soigner.`,
        ],
      },
      {
        nom: 'Alzzin the Wildshaper',
        notes: [
          `Boss final, décrit comme le plus difficile. Satyre: {{Enervate}}, {{Thorns}}, {{Wither}}. Ours: {{Disarm}}, {{Knock Away}}, {{Wild Regeneration}}. Loup sinistre: {{Mangle}}, {{Vicious Bite}}.`,
          `Il se soigne sous forme d'arbre et fait de gros dégâts au tank par saignements et dégâts sur la durée: prépare des soins.`,
          `À peu de vie, des diablotins arrivent: fais des dégâts de zone. Le tunnel d'où ils viennent est un raccourci pour sortir.`,
        ],
      },
      {
        nom: 'Isalien',
        special: true,
        notes: [
          `Facultative (chaîne de quêtes Tier 0.5, qui améliore des objets bleus de set de donjon). Elle a {{Call Pet}}, {{Multi-Shot}}, {{Net}}, {{Regrowth}} et {{Vengeance}}.`,
          `Tue le familier qu'elle invoque, interromps un maximum de sorts et surtout ses soins, sinon elle revient à pleine vie. Épuiser sa mana est une solution plus lente.`,
        ],
      },
    ],
    pieges: [
      `Les Wildspawn Satyrs furtifs peuvent surprendre un groupe: tire avec soin.`,
      `Les Whip Lashers sont faciles, donc utiles pour jouer seul, faire de l'or ou de l'expérience.`,
      `Les arbres se soignent et soignent leurs alliés: les interruptions et le contrôle comptent.`,
      `Les monstres réapparaissent et le donjon est grand: garde un rythme de tirage régulier.`,
    ],
    manque: [
      `Le guide recommande « plus de 55 » sans maximum ni minimum exact, et ne dit pas si le donjon est fait pour cinq joueurs.`,
      `Il ne dit pas comment obtenir le Brazier of Beckoning requis pour Isalien, ni pourquoi certaines capacités (comme Vengeance) comptent.`,
      `Le conseil sur la malédiction de langues de Lethtendris est mal écrit dans la source.`,
    ],
    src: ['iv-dme', 'kami-dm-hub'],
  },
  {
    id: 'dire-maul-west',
    cible: 'Dire Maul: West',
    nom: ['Dire Maul: West', 'Hache-tripes Ouest'],
    niveaux: [56, 60],
    rdg: 54,
    classique: true,
    duree: `environ 1 h`,
    acces: `Dire Maul est au centre de Feralas, entre Feathermoon Stronghold et Camp Mojache. Prends la route entre les deux jusqu'à son centre, puis suis la route du nord. La dernière section demande la Crescent Key (de Dire Maul East) ou un voleur qui crochète la serrure.`,
    boss: [
      {
        nom: 'Tendris Warpwood',
        notes: [
          `Élémentaire élite de niveau 60. {{Entangle|Racines}}, {{Grasping Vines|lianes}}, {{Trample|piétinement}} et {{Uppercut}}.`,
          `Nettoie d'abord les tréants autour, sinon ils s'ajoutent au combat.`,
        ],
      },
      {
        nom: 'Magister Kalendris',
        notes: [
          `Mort-vivant élite de niveau 59. {{Dominate Mind|Contrôle mental}}, {{Mind Blast}}, {{Mind Flay}}, {{Shadow Word: Pain|mot de l'ombre: douleur}} et {{Shadowform|forme d'ombre}}.`,
          `Dissipe la douleur quand tu peux et garde une interruption pour le contrôle mental, ou brûle-le.`,
        ],
      },
      {
        nom: "Tsu'zee",
        special: true,
        notes: [
          `Rare (niveau 59), près de Kalendris avec deux renforts. {{Backstab}}, {{Blind|cécité}}, {{Gouge}} et {{Sinister Strike}}.`,
          `Attention à la cécité sur le soigneur.`,
        ],
      },
      {
        nom: 'Illyanna Ravenoak',
        notes: [
          `Niveau 60, avec son familier Ferra. {{Aimed Shot}}, {{Concussive Shot}}, {{Immolation Trap}} et {{Volley}}. Aucune vraie mécanique.`,
          `Tue Illyanna d'abord, puis Ferra.`,
        ],
      },
      {
        nom: "Immol'thar",
        notes: [
          `Démon élite de niveau 61. {{Enrage}}, {{Eye of Immol'thar}}, {{Infected Bite}}, {{Portal of Immol'thar}} (non décrit) et {{Trample|piétinement}}.`,
          `Tue les Yeux avant que leur affaiblissement cumulé devienne trop fort. Contre la téléportation suivie d'une chute, utilise Slow Fall, Blink ou des soins.`,
          `Il ne peut pas être tué avant que les cinq pylônes soient nettoyés: trois avant sa zone et deux dans sa salle.`,
        ],
      },
      {
        nom: "Lord Hel'nurath",
        special: true,
        notes: [
          `Démon élite de niveau 62, invoqué seulement par un démoniste qui a les trois objets épiques de la quête de monture. Nettoie les vagues de démons (surtout des diablotins), puis concentre le boss quand le cheval invoqué le fait apparaître à 50 %. Le bannissement aide contre les élites.`,
          `{{Cripple}}, {{Knock Away}}, {{Shadow Bolt Volley}}, {{Shadow Word: Pain}}, {{Sleep}} et {{Veil of Shadow}}.`,
        ],
      },
      {
        nom: 'Prince Tortheldrin',
        notes: [
          `Boss final (humanoïde élite, niveau 61). {{Arcane Blast}}, {{Counterspell}}, {{Summon}}, {{Thrash}} et {{Whirlwind}}.`,
          `Quand il lance Arcane Blast, les DPS arrêtent d'attaquer jusqu'à ce que le tank reprenne la menace, car ce sort remet les menaces à zéro. Tanker près d'un mur facilite la reprise de menace.`,
        ],
      },
    ],
    pieges: [
      `Les patrouilles furtives peuvent submerger un groupe: tire lentement, dégage de l'espace pour combattre et utilise le contrôle de foule si possible.`,
      `La fusée éclairante (Flare) d'un chasseur révèle les patrouilles.`,
    ],
    manque: [
      `Le guide dit que l'aile Ouest est « l'une des plus faciles » sans base de comparaison, et il écrit « nettoyer » les pylônes à un endroit, « désactiver » à un autre: on ne sait pas s'il faut tuer les renforts ou interagir.`,
      `La section de Tendris dit que la zone compte « 3 boss », mais seulement Kalendris, Tsu'zee et Illyanna sont listés dans cette partie.`,
      `La quête de la monture épique de Lord Hel'nurath n'est pas expliquée (seuls les objets sont nommés).`,
    ],
    src: ['iv-dmw', 'kami-dm-hub'],
  },
  {
    id: 'dire-maul-north',
    cible: 'Dire Maul: North',
    nom: ['Dire Maul: North', 'Hache-tripes Nord'],
    niveaux: [56, 60],
    rdg: 54,
    classique: true,
    acces: `En Feralas, vers 43,4 / 66,5, à l'ouest de Camp Mojache et au nord de The High Wilderness. Entre dans le complexe de Dire Maul par le sud (vers 59, 45). Il te faut la Crescent Key, laissée dans Dire Maul East.`,
    boss: [
      {
        nom: "Guard Mol'dar",
        notes: [`Il patrouille dans la première cour. Ramène-le vers l'entrée, loin des chiens de garde, car il les appelle à 40 % de vie.`],
      },
      {
        nom: 'Stomper Kreeg',
        notes: [`Ogre ivre de la deuxième cour: il crache de l'alcool et frappe fort. Garde le tank en santé et surveille les étourdissements et les repoussements.`],
      },
      {
        nom: 'Guard Fengus',
        notes: [`Il patrouille au milieu de la deuxième cour. Petit repoussement et charge au hasard. Éloigne-le des autres groupes.`],
      },
      {
        nom: "Guard Slip'kik",
        notes: [`Dans le couloir après les cours. Mêmes capacités que Fengus.`],
      },
      {
        nom: 'Captain Kromcrush',
        notes: [
          `Il bloque la porte de la salle du roi, décrit comme l'un des boss à 5 joueurs les plus difficiles. {{Mortal Strike|Frappe mortelle}}, peur du groupe et {{Retaliation|représailles}}.`,
          `À 75 % de vie, il appelle deux Gordok Reavers: il faut deux contrôles de foule, ou tuer les Reavers d'abord.`,
        ],
      },
      {
        nom: ['King Gordok', "Cho'Rush the Observer"],
        notes: [
          `Combat final, dans la dernière salle. Tanke King Gordok et brûle-le.`,
          `Normalement, tue Cho'Rush en premier: il soigne le roi et lance {{Chain Lightning|éclair en chaîne}}. Pour une course de tribut, ne le tue pas.`,
        ],
      },
    ],
    pieges: [
      `Gordok Reavers: ils frappent très fort. Gordok Warlocks: ils viennent en groupes avec des démons invoqués.`,
      `Wandering Eyes of Kilrogg (environ 260 de vie): ils invoquent d'autres ogres s'ils restent en vie. Tue-les vite, idéalement à distance.`,
      `Les monstres réapparaissent: garde un rythme de tirage régulier. Tire avec soin dans les grandes salles du début pour ne pas enchaîner les groupes.`,
    ],
    extras: [{ titre: 'Course de tribut', texte: `On saute tous les boss sauf King Gordok, qu'on tue pour recevoir un coffre de tribut. Pour passer: pille la Gordok Courtyard Key dans le coffre central, répare le Broken Ice Trap avec du Frost Oil pendant que Slip'kik est parti, et prends le Gordok Ogre Suit auprès de Knot Thimblejack. Celui qui porte le costume parle à Kromcrush pour qu'il bouge. À la fin, Mol'dar, Fengus et Slip'kik donnent des bonus de 2 heures.` }],
    manque: [
      `Aucun niveau maximum, aucune taille de groupe (5 joueurs implicites) ni verrou de temps. Les tableaux de butin ont des titres erronés (celui de Slip'kik et celui de Kromcrush s'appellent « Guard Fengus »).`,
      `Le conseil sur Cho'Rush se contredit: « ne le tue surtout pas » en course de tribut, mais plus loin « tu peux le tuer si combattre les deux est trop dur ».`,
    ],
    src: ['iv-dmn', 'kami-dm-hub'],
  },
  {
    id: 'blackmaw-hold',
    cible: 'Blackmaw Hold',
    nom: ['Blackmaw Hold', null],
    niveaux: [55, 60],
    officiel: [55, 60],
    nouveau: true,
    fiche: true,
    acces: `À Azshara: une grande porte de pierre jamais utilisée dans Vanilla (on y lisait « Timbermaw Hold » en s'approchant). Wowhead la place derrière les Furbolg Gates, au nord d'Azshara.`,
    boss: [],
    pieges: [],
    manque: [
      `Ce donjon est annoncé mais n'était pas encore dans la bêta. Aucune source ne donne de boss, de mécaniques, de butin ni de condition d'entrée.`,
      `Ce que Blizzard a dit (podcast, d'après Icy Veins): c'est un bastion de furbolgs corrompus qui font face à des démons, séparé du Timbermaw Hold de Felwood. On y sera « à l'aise au 60 », mais on peut y entrer un peu plus tôt. Il est probablement un peu plus grand que Blackrock Depths, doit se faire en une longue séance d'un bout à l'autre, avec des quêtes et des parties répétées, et « beaucoup de secrets ».`,
      `Kami-labs propose « Repaire des Noiregueules » d'après l'adresse de sa page, mais ce n'est pas confirmé: le nom reste en anglais.`,
    ],
    src: ['iv-blackmaw', 'kami-blackmaw', 'wh-overview'],
  },
  {
    id: 'shapers-terrace',
    cible: "Shaper's Terrace",
    nom: ["Shaper's Terrace", null],
    niveaux: [58, 60],
    officiel: [58, 60],
    nouveau: true,
    fiche: true,
    acces: `À Un'Goro (Wowhead).`,
    boss: [],
    pieges: [],
    manque: [
      `Ce donjon est annoncé mais n'était pas encore dans la bêta. Aucune source ne donne de boss, de mécaniques ou de quêtes.`,
      `Kami-labs propose « Terrasse du Façonneur » d'après l'adresse de sa page, mais ce n'est pas confirmé: le nom reste en anglais.`,
    ],
    src: ['iv-news-9', 'wh-overview'],
  },
]
