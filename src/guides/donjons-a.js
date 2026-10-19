// Guides des donjons de bas niveau (13 à 35). Voir index.js pour la forme des données et la syntaxe des noms.
// Tout vient des sources citées pour chaque donjon: rien n'est inventé. Quand une source ne dit rien, on l'écrit dans
// « manque ».

export const DONJONS_A = [
  {
    id: 'ragefire-chasm',
    cible: 'Ragefire Chasm',
    nom: ['Ragefire Chasm', 'Gouffre de Ragefeu'],
    niveaux: [13, 18],
    rdg: 13,
    acces: `À Orgrimmar, au niveau le plus bas de la Cleft of Shadow. Les 5 quêtes du donjon sont réservées à la Horde et Icy Veins déconseille d'y aller du côté Alliance.`,
    boss: [
      {
        nom: 'Oggleflint',
        notes: [
          `Seulement un {{Cleave|coup en arc de cercle}}: les mêlées restent derrière lui.`,
          `Le vrai danger, ce sont les autres troggs qui s'ajoutent au combat.`,
        ],
      },
      {
        nom: 'Taragaman the Hungerer',
        notes: [
          `Un {{knockback|repoussement}} peut jeter le tank dans la lave: ne tanke pas près d'un bord.`,
          `Sa {{Fire Nova|nova de feu}} touche tout le monde autour de lui: reste hors de la mêlée quand tu peux.`,
        ],
      },
      {
        nom: 'Jergosh the Invoker',
        notes: [
          `Deux patrouilles viennent toujours avec lui: un contrôle de foule (mouton du mage, par exemple) aide.`,
          `Il lance {{Immolate|une brûlure}} et {{Curse of Weakness|une malédiction d'affaiblissement}}, qui se dissipent toutes les deux.`,
          `Selon Icy Veins, l'ordre entre lui et ses renforts n'a pas d'importance.`,
        ],
      },
      {
        nom: 'Bazzalan',
        notes: [
          `Dans la même salle que Jergosh, en haut d'une rampe; deux renforts l'accompagnent.`,
          `{{Deadly Poison|Un poison}} et {{Sinister Strike|des coups spéciaux}} menacent le tank: contrôle les renforts si possible et tue Bazzalan en premier.`,
        ],
      },
    ],
    pieges: [`Pas de section sur les monstres ordinaires: seuls des troggs en trop viennent avec Oggleflint, et des renforts avec Jergosh et Bazzalan.`],
    manque: [
      `Icy Veins ne dit pas comment entrer dans le donjon, ni si l'Alliance peut y entrer.`,
      `Kami-labs liste « Élémentaire de lave » (Molten Elemental) comme premier boss, puis Taragaman, Jergosh et Bazzalan, sans Oggleflint: les listes de boss ne s'accordent pas encore.`,
    ],
    src: ['iv-rfc', 'kami-rfc'],
  },
  {
    id: 'hall-of-thanes',
    cible: 'Hall of Thanes',
    nom: ['Hall of Thanes', 'La Salle des thanes'],
    niveaux: [13, 20],
    officiel: [13, 18],
    rdg: 13,
    nouveau: true,
    acces: `Sous le trône d'Ironforge (le « Old Ironforge », dans Dun Morogh). Dans la salle du trône, prends le couloir de gauche jusqu'en bas du vieil Ironforge. Facile pour l'Alliance; la Horde doit faire un long trajet depuis Undercity par voie terrestre. Method note une rumeur de quête de téléporteur pour la Horde, mais personne ne l'a trouvée. Le donjon est linéaire.`,
    quetes: `5 quêtes (niveau 14). Trois sont réservées à l'Alliance et deux sont aussi offertes à la Horde (Method).`,
    boss: [
      {
        nom: 'Faldrim Anvilmar',
        notes: [
          `Il patrouille dans Anvilmar's Rest, entouré de nains morts-vivants: dégage une zone sûre avant de le tirer. Icy Veins conseille d'éliminer quelques apparitions furieuses avant.`,
          `{{Mind Blast|Un sort mental}} (interruptible) et {{Anvilmar's Curse|une malédiction qui ralentit la vitesse d'attaque du tank}}.`,
        ],
      },
      {
        nom: 'Magmatus',
        notes: [
          `Il vient avec un invocateur Sombrefer: tue l'invocateur d'abord, pendant que le tank tient Magmatus à l'écart du groupe.`,
          `{{Fire Nova|Une nova de feu}} instantanée qui touche toute la mêlée, et {{Combustion|une combustion sur un joueur au hasard}} (dégâts de feu pendant quelques secondes): les soigneurs doivent s'y attendre.`,
        ],
      },
      {
        nom: 'Plunder',
        notes: [
          `Il patrouille dans la salle avant le boss final. Sa seule capacité est un {{Knock Away|repoussement}}.`,
          `Le tank le tire dans un coin ou dans la salle précédente, pour que les repoussements n'envoient personne dans d'autres monstres.`,
        ],
      },
      {
        nom: 'Durgen Dirgehammer',
        notes: [
          `Boss final, responsable de l'incursion des Dark Iron. Deux petits golems de pierre l'accompagnent et la salle est pleine de pillards: élimine-les tous avant de tirer.`,
          `{{Fear|Une peur}} de zone (8 s) et {{Rend|un saignement sur le tank}} (44 dégâts toutes les 3 s, selon Method).`,
          `Les sources se contredisent sur l'ordre: Icy Veins dit de tuer les golems avant de toucher Durgen, Method dit de tuer le boss le plus vite possible puis les golems.`,
        ],
      },
    ],
    pieges: [
      `Ingénieurs Dark Iron: ils lancent des bombes sur la cible de plus haute menace; sors de la zone marquée avant l'impact.`,
      `Pillards Dark Iron: lames empoisonnées qui frappent fort; ils viennent souvent avec des nains ou des chiens.`,
      `Invocateurs Dark Iron: grosses boules de feu, et ils invoquent un élémentaire de feu. Interruptibles et étourdissables; tire-les en brisant la ligne de vue.`,
      `Petit golem de pierre: frappe fort et vite, et court plus vite que toi. Le dernier groupe avant Durgen en a un avec un pillard et un invocateur: mouton sur l'invocateur, puis le pillard et le golem.`,
    ],
    manque: [
      `Le niveau recommandé n'est pas donné par Method; Icy Veins annonce 13-18.`,
      `Kami-labs nomme le deuxième boss « Infurnus » sans nom anglais; on ne sait pas si c'est Magmatus, donc il reste en anglais ici.`,
    ],
    src: ['iv-hot', 'mg-hot', 'kami-hot'],
  },
  {
    id: 'ruins-of-lordaeron',
    cible: 'Ruins of Lordaeron',
    nom: ['Ruins of Lordaeron', 'Ruines de Lordaeron'],
    niveaux: [15, 22],
    officiel: [15, 20],
    rdg: 15,
    nouveau: true,
    acces: `Près d'Undercity, du côté de Tirisfal Glades; les sources donnent des emplacements un peu différents. Surtout pour la Horde, mais l'Alliance peut entrer (Warcraft Tavern) et a plusieurs quêtes à elle. Côté Alliance, c'est un long trajet; si tu meurs à l'intérieur, ton fantôme apparaît dans la cour.`,
    quetes: `10 quêtes: 6 pour la Horde, 4 pour l'Alliance.`,
    boss: [
      {
        nom: 'Witherfang',
        notes: [
          `Elle patrouille dans la ruelle près de l'entrée avec des Broodlings. Seul effet: {{Poison|un poison}} sur le tank, qui se dissipe (sans gravité si tu ne peux pas).`,
          `Elle ne déclenche pas sa patrouille: tu peux la tirer seule à distance. Si la patrouille vient, tue les Broodlings d'abord.`,
        ],
      },
      {
        nom: 'The Baron',
        notes: [
          `Il garde un trou dans le mur. {{Knockback|Un fort repoussement}} qui étourdit la cible quelques secondes (et fait perdre de la menace au tank: reprends-la tout de suite), {{Cleave|un coup frontal en cône}} et une attaque de zone sur la mêlée.`,
          `Tank le dos à un mur. Pendant l'étourdissement, il change souvent de cible: un autre joueur peut lâcher la menace, fuir ou encaisser. Les mêlées restent derrière lui; les distances s'espacent pour que l'attaque de zone ne touche qu'une personne.`,
          `Horde: la tête de The Baron (Abominable Head) sert à une quête; Alliance: Head of the Baron. Derrière lui, un muret avec un pilier brisé: saute dessus (chasseurs et démonistes, rangez vos familiers d'abord).`,
        ],
      },
      {
        nom: 'Viktor the Vile',
        special: true,
        notes: [
          `Boss secret. On l'appelle en interagissant avec la cheminée d'une maison incendiée (un Grim Campfire). Cinq vagues d'ennemis avant son arrivée.`,
          `Un gros goule sans capacité spéciale (même poison que Witherfang). Le défi, c'est les ressources: arrive avec toute ta mana et prends des potions.`,
        ],
      },
      {
        nom: 'The Abandoned',
        special: true,
        notes: [
          `Boss secret. On interagit avec la statue aux yeux rouges lumineux dans la cour, après le cimetière: des vagues de morts-vivants arrivent par les couloirs des deux côtés, puis le boss sort de la statue. Les sources disent trois vagues ou « plusieurs ».`,
          `{{Frost Armor|Une armure de givre}} qu'on ne peut pas dissiper, {{Frost Nova|une nova de givre}} occasionnelle qui immobilise ceux qui sont proches, et {{Drain Life|un drain de vie}} sur le tank: garde un interrupteur (ou un étourdissement) pour lui.`,
          `Des morts-vivants peuvent rester coincés dans les couloirs et bloquer le combat: va les chercher.`,
        ],
      },
      {
        nom: 'Bjork',
        notes: [
          `Dans le nord-ouest: passe un escalier étroit, sors de l'autre côté, tourne à droite et saute par une grande fenêtre. Beaucoup de morts-vivants autour: élimine-les avant.`,
          `{{Anti-Magic Shield|Un bouclier anti-magie}} (bulle verte): tant qu'il est actif, les sorts ne font rien. Passe aux attaques physiques ou attends. Attention au repoussement.`,
        ],
      },
      {
        nom: 'Rath\'mael',
        notes: [
          `Boss final, au centre du donjon (visible durant presque toute la visite). Élimine les monstres autour de lui pour l'engager.`,
          `{{Flamestrike|Un Flamestrike}}: interromps-le ou étourdis-le; écarte les gens de la cible pendant l'incantation. Les sources se contredisent: il tombe soit sous lui (dégâts lourds en mêlée), soit sur le tank.`,
          `Après le combat, cherche le corps d'Edward dans le cimetière (quêtes des deux factions).`,
        ],
      },
      {
        nom: 'Lordaeron Captain',
        special: true,
        notes: [
          `Rare, à l'ouest. Il peut apparaître après la mort de tous les autres boss. Les sources disent que seule la Horde peut le tuer.`,
          `Aucune capacité notable; le danger, c'est sa longue patrouille et les monstres autour de lui.`,
        ],
      },
    ],
    pieges: [
      `Araignées au début: leur poison est la menace principale, surtout en gros groupes.`,
      `Fléau (le reste du donjon): squelettes, goules, banshees, golems de chair… Une petite chance d'attraper la Ghoul Plague (30 min, réduit la vitesse de déplacement et les dégâts): guéris-la tout de suite.`,
      `Squelettes mages: dissiper leur armure de givre les fait mourir plus vite. Banshees: une malédiction réduit les chances de toucher.`,
      `Stone Watchers (gargouilles aux étages): elles ressemblent à des statues jusqu'à ce que tu approches, puis elles se mettent en Stone Slumber (immunisées aux dégâts physiques, elles régénèrent): utilise des dégâts magiques.`,
      `Trajet conseillé: reste près du mur de gauche vers le sud pour limiter les tirs; saute par la fenêtre de droite pour éviter la porte couverte de toiles.`,
    ],
    manque: [
      `Icy Veins et Warcraft Tavern ne disent pas si Viktor et The Abandoned sont obligatoires pour finir le donjon.`,
      `La chance d'apparition du Lordaeron Captain n'est pas donnée.`,
      `Kami-labs nomme le premier boss « Rejeton » sans équivalent anglais: on ne sait pas si c'est Witherfang, donc elle reste en anglais.`,
    ],
    src: ['iv-rol', 'wt-rol', 'kami-rol'],
  },
  {
    id: 'wailing-caverns',
    cible: 'Wailing Caverns',
    nom: ['Wailing Caverns', 'Cavernes des Lamentations'],
    niveaux: [15, 24],
    rdg: 17,
    acces: `Dans les Barrens, près de Lushwater Oasis, au sud-ouest de Crossroads. Facile pour la Horde; plus long pour l'Alliance (bateau depuis Booty Bay, ou par le nord depuis Ashenvale).`,
    quetes: `7 quêtes, dont 2 réservées à la Horde.`,
    boss: [
      {
        nom: 'Lady Anacondra',
        notes: [
          `D'habitude le premier boss. Tous les boss druides partagent {{Lightning Bolt|un éclair}} et {{Sleep|un sommeil}}; elle a aussi {{Healing Touch|un soin}}.`,
          `Le risque, c'est de tirer des patrouilles proches: contrôle-les et tue-la en premier.`,
        ],
      },
      {
        nom: 'Kresh',
        notes: [`Il patrouille dans l'eau, au niveau inférieur. Aucune capacité, mais une armure très élevée: les effets qui réduisent l'armure (Sunder Armor) fonctionnent bien.`],
      },
      {
        nom: 'Lord Cobrahn',
        notes: [
          `Au bout d'un long couloir à l'ouest; trois pythons déviants viennent toujours avec lui (non élites, ils meurent vite à un coup en arc).`,
          `{{Lightning Bolt|Un éclair}} et {{Druid's Slumber|un sommeil}}. Il peut se transformer en serpent: ses dégâts et sa vitesse d'attaque augmentent, les soigneurs surveillent le tank.`,
        ],
      },
      {
        nom: 'Lord Pythas',
        notes: [
          `À une intersection patrouillée par des druides et des Deviate Shamblers: un ou deux monstres de plus sont courants.`,
          `Contrôle les extras, interromps son sommeil, et les non-mêlées restent loin pour éviter {{Thunderclap|le coup de tonnerre}}.`,
        ],
      },
      {
        nom: 'Skum',
        notes: [`Un combat simple. {{Chained Bolt|Un éclair en chaîne}} relie les joueurs trop proches: étalez-vous, surtout s'il y a plusieurs mêlées.`],
      },
      {
        nom: 'Deviate Faerie Dragon',
        special: true,
        notes: [`Rare, dans une zone fréquentée: attends-toi à des monstres en plus. Aucune capacité notable; concentre-toi sur les druides et interromps leur sommeil.`],
      },
      {
        nom: 'Lord Serpentis',
        notes: [`Chef des druides du Croc (Druids of the Fang). {{Sleep|Sommeil}}, {{Lightning Bolt|éclair}} et {{Healing Touch|soin}}: garde-le interrompu.`],
      },
      {
        nom: 'Verdan the Everliving',
        notes: [`{{Grasping Vines|Des lianes}} enracinent et repoussent tout le monde à moins de 10 mètres. Les distances l'évitent complètement; la mêlée et les soigneurs gèrent leurs points de vie.`],
      },
      {
        nom: 'Mutanus the Devourer',
        notes: [
          `Événement de fin. Il se déclenche après la mort des quatre chefs druides. Reviens à l'entrée, parle au Disciple of Naralex pour lancer une escorte; dégage les ennemis sur le chemin et protège le Disciple.`,
          `À la fin, le Disciple commence un rituel qui appelle deux vagues d'ennemis (qu'on peut tuer en zone); Mutanus arrive à la troisième.`,
          `{{Terrify|Une peur}} de zone, {{Naralex's Nightmare|un sommeil}} et {{Thundercrack|un coup de zone}} autour de lui: reste hors de sa mêlée si possible.`,
        ],
      },
    ],
    pieges: [`La source ne détaille pas les monstres ordinaires.`],
    manque: [
      `Icy Veins ne donne pas de composition de groupe, de raccourcis ou de trajet complet (la carte est une image).`,
      `La condition d'apparition du Deviate Faerie Dragon n'est pas donnée. L'ordre de la page n'est pas forcément celui du donjon.`,
    ],
    src: ['iv-wc', 'kami-wc'],
  },
  {
    id: 'deadmines',
    cible: 'The Deadmines',
    nom: ['The Deadmines', 'Les Mortemines'],
    niveaux: [17, 26],
    rdg: 16,
    acces: `Dans une maison de Moonbrook, au sud de Westfall. Facile pour l'Alliance; la Horde doit prendre un bateau depuis Ratchet (Barrens). Icy Veins déconseille de le faire du côté Horde.`,
    quetes: `7 quêtes, toutes pour l'Alliance.`,
    boss: [
      {
        nom: "Rhahk'Zor",
        notes: [`Tire les deux sentinelles Defias séparément, à distance. Il étourdit sa cible principale: le soigneur doit être prêt à augmenter ses soins.`],
      },
      {
        nom: 'Miner Johnson',
        special: true,
        notes: [`Rare: il n'apparaît pas à chaque fois. C'est essentiellement un mineur avec plus de points de vie, entouré de mineurs Defias.`],
      },
      {
        nom: 'Sneed',
        notes: [
          `Accompagné de son Déchiqueteur (Sneed's Shredder): élimine d'abord les gobelins, car le Shredder a une {{Fear|peur}} de zone.`,
          `Le tank surveille le {{Disarm|désarmement}} de Sneed quand il descend de sa machine.`,
        ],
      },
      {
        nom: 'Gilnid',
        notes: [`Il vient avec un ingénieur gobelin: contrôle-le pour éviter les robots, ou tue-le d'abord (les robots meurent avec lui). Son effet de feu rend la menace plus difficile pour le tank.`],
      },
      {
        nom: 'Mr. Smite',
        notes: [
          `Deux Blackguards Defias l'accompagnent: tue-les d'abord, car [[Mr. Smite]] étourdit le groupe à 66 % et à 33 % de vie.`,
          `{{Smite Slam}}, qu'il gagne à 33 %, peut retirer une grosse part de la vie du tank.`,
        ],
      },
      {
        nom: 'Captain Greenskin',
        notes: [`Il vient avec un pirate et un Squallshaper Defias: tue le Squallshaper d'abord à cause de sa nova de givre. Les mêlées restent derrière le capitaine à cause de son {{Cleave|coup en arc de cercle}}.`],
      },
      {
        nom: 'Edwin VanCleef',
        notes: [`Le tirer de sa cabine attire aussi deux Blackguards cachés: tue-les d'abord, puis les deux nouveaux Blackguards qu'il invoque à 50 % de vie.`],
      },
      {
        nom: 'Cookie',
        notes: [`D'habitude le dernier, à l'arrière du bateau. Éloigne-le du navire et interromps {{Cookie's Cooking|sa cuisine}}, qui le soigne.`],
      },
    ],
    pieges: [`Monstres notables liés aux boss: sentinelles Defias (Rhahk'Zor), mineurs (Miner Johnson), gobelins (salle de Sneed), Blackguards (Smite, VanCleef), pirate et Squallshaper (Greenskin), ingénieur gobelin (Gilnid).`],
    manque: [
      `Icy Veins ne dit pas si la Horde peut faire les quêtes, ni si le bateau est le seul accès.`,
      `Kami-labs liste sept boss un peu différents: Sentinelle défias, Sneed, Mineur Johnson, Sorcier défias, Capitaine Vertepeau, M. Smite et Pirate défias (sans Rhahk'Zor, Gilnid, VanCleef ni Cookie). Les listes ne s'accordent pas encore.`,
    ],
    src: ['iv-dm', 'kami-dm'],
  },
  {
    id: 'shadowfang-keep',
    cible: 'Shadowfang Keep',
    nom: ['Shadowfang Keep', "Donjon d'Ombrecroc"],
    niveaux: [20, 30],
    rdg: 18,
    acces: `En Silverpine Forest, en haut d'une rampe près du mur de Greymane (au sud). Assez facile pour la Horde; l'Alliance prend le bateau de Menethil Harbor à Southshore, puis une longue marche jusqu'en territoire Horde.`,
    quetes: `6 quêtes: 3 de classe, 3 réservées à la Horde.`,
    boss: [
      {
        nom: 'Rethilgore',
        notes: [`Facile, dans la zone des cellules. {{Soul Drain|Son drain d'âme}} vide la vie du tank et peut être interrompu. Tue d'abord les worgens à l'étage au-dessus pour éviter de les attirer.`],
      },
      {
        nom: 'Fel Steed',
        notes: [`Avec le Shadow Charger: trois chevaux dans les écuries, neutres tant qu'on n'en attaque pas un (puis les trois attaquent). Ils frappent fort ensemble sur le tank: un second tank ou un contrôle sur l'un d'eux aide.`],
      },
      {
        nom: 'Razorclaw the Butcher',
        notes: [`Pièce étroite: ne le tire pas avec d'autres patrouilles. {{Butcher Drain|Son drain}} demande de bons soins.`],
      },
      {
        nom: 'Baron Silverlaine',
        notes: [`Un simple combat de tank. {{Veil of Shadow|Veil of Shadow}} réduit les soins reçus de 75 % sur la cible: dissipe la malédiction si possible, sinon soigne plus.`],
      },
      {
        nom: 'Commander Springvale',
        notes: [
          `Le plus dur, c'est le tirage: il est dans une pièce d'angle pleine de monstres, à gauche. Un Haunted Servitor et un Wailing Guardsman viennent toujours avec lui.`,
          `Tue le Guardsman d'abord: son silence de zone peut faire un wipe si le soigneur est touché. Un second tank peut le tenir à l'écart. Interromps le {{Holy Light|soin sacré}} de Springvale.`,
        ],
      },
      {
        nom: 'Odo the Blindwatcher',
        notes: [`Dans une petite pièce, avec deux Vile Bats qui {{Disarm|désarment}} et frappent en arc. Garde-les loin du groupe (la menace du groupe est réduite). Le contrôle de foule marche sur les chauves-souris.`],
      },
      {
        nom: 'Deathsworn Captain',
        special: true,
        notes: [`Rare, parfois dans le couloir après Odo. Aucune capacité notable, mais il vient avec deux paladins: garde la menace sur tout et tue les renforts vite.`],
      },
      {
        nom: 'Fenrus the Devourer',
        notes: [`{{Toxic Saliva|Une salive toxique}} ajoute des dégâts sur le tank. À 50 % de vie, il invoque quatre Voidwalkers qui restent après sa mort: le tank reprend vite la menace sur tous.`],
      },
      {
        nom: 'Wolf Master Nandos',
        notes: [`Dans une salle avec plusieurs worgs: tire-les séparément. Il invoque des worgs non élites à peu de vie pendant le combat: les dégâts les tuent vite et le tank doit être prêt à les saisir.`],
      },
      {
        nom: 'Archmage Arugal',
        notes: [
          `Boss final. {{Void Bolt|Un sort du Vide}} vise le tank: brise la ligne de vue avec les murs et les coins pour l'obliger à se déplacer vers le tank.`,
          `{{Shadow Port|Une téléportation}} le déplace dans la salle: difficile pour la mêlée et réduit la menace du tank. Évite de prendre la menace pendant ces téléportations.`,
        ],
      },
    ],
    pieges: [`La page ne décrit que les renforts liés aux boss: worgens au-dessus de Rethilgore, la pièce de Springvale, les chauves-souris d'Odo, les paladins du Deathsworn Captain, les worgs de Nandos.`],
    manque: [
      `Pas de guide général des monstres ordinaires, de trajet, ni de raccourcis.`,
      `La chance d'apparition du Deathsworn Captain n'est pas donnée.`,
    ],
    src: ['iv-sfk', 'kami-sfk'],
  },
  {
    id: 'blackfathom-deeps',
    cible: 'Blackfathom Deeps',
    nom: ['Blackfathom Deeps', 'Profondeurs de Brassenoire'],
    niveaux: [24, 32],
    rdg: 22,
    classique: true,
    acces: `En Ashenvale, au nord-ouest de Maestra's Post. Plonge dans l'eau à l'entrée du temple, nage vers l'ouest sous l'eau et suis le tunnel jusqu'à l'entrée de l'instance. Ramasse les quêtes du donjon avant d'entrer.`,
    boss: [
      { nom: 'Ghamoo-ra', notes: [`Il utilise {{Trample|un piétinement}}. Aucune mécanique particulière.`] },
      {
        nom: 'Lady Sarevess',
        notes: [`{{Forked Lightning|Un éclair fourchu}}, {{Frost Nova|une nova de givre}} et {{Slow|un ralentissement}}. Contrôle ses renforts si possible.`],
      },
      { nom: 'Gelihast', notes: [`Optionnel. Il utilise {{Net|un filet}}. Dégage les monstres autour avant de le tirer.`] },
      {
        nom: 'Lorgus Jett',
        notes: [`Optionnel. {{Lightning Bolt|Éclair}} et {{Lightning Shield|bouclier de foudre}}. L'Alliance peut le sauter; la Horde en a besoin pour une quête.`],
      },
      {
        nom: 'Baron Aquanis',
        notes: [`Optionnel. {{Frostbolt|Un sort de givre}}. La Horde l'invoque avec la Fathom Stone sous l'eau; l'Alliance ne doit pas le tuer.`],
      },
      { nom: "Old Serra'kis", notes: [`Optionnel. Aucune mécanique notée.`] },
      {
        nom: 'Twilight Lord Kelris',
        notes: [`{{Mind Blast|Un sort mental}} et {{Sleep|un sommeil}}. Un Tremor Totem empêche le sommeil.`],
      },
      {
        nom: "Aku'mai",
        notes: [`Boss final. {{Frenzied Rage|Une rage frénétique}} et {{Poison Cloud|un nuage de poison}}. Ses attaques de base frappent extrêmement fort: le soigneur doit garder le tank en vie.`],
      },
    ],
    pieges: [
      `Beaucoup de monstres désarment souvent le tank: les DPS surveillent leur menace.`,
      `Les élémentaires d'eau avant Aku'mai font de gros dégâts de zone: tue-en un le plus vite possible.`,
    ],
    manque: [
      `Ce guide d'Icy Veins vient de Classic (niveau 20-27 recommandé là-bas); Forever annonce 24-32. Quelques détails (ordre, optionnel ou non) sont ambigus dans la source.`,
      `Kami-labs liste 7 boss pour la version à 5 joueurs (sans Baron Aquanis) et une section « 10 joueurs » qui commence par Baron Aquanis, tout en disant que Forever limite l'entrée à 5. Ce guide décrit la version à 5.`,
    ],
    src: ['iv-bfd', 'kami-bfd'],
  },
  {
    id: 'the-stockade',
    cible: 'The Stockade',
    nom: ['The Stockade', 'La Prison de Hurlevent'],
    niveaux: [24, 32],
    rdg: 23,
    acces: `Dans un bâtiment au nord du Mage Quarter, à Stormwind. Icy Veins la décrit comme « effectivement un donjon d'Alliance » et déconseille à la Horde d'y aller.`,
    quetes: `6 quêtes.`,
    boss: [
      {
        nom: 'Targorr the Dread',
        notes: [
          `Tue les renforts avant le boss. Il frappe vite à deux mains, et {{Thrash|des attaques supplémentaires}} peuvent se déclencher; il se met en {{Enrage|rage}} à 30 % de vie. Les soigneurs se concentrent sur le tank.`,
        ],
      },
      {
        nom: 'Kam Deepfury',
        notes: [`Utilise la posture défensive et {{Shield Slam|un coup de bouclier}}. Contrôle ou tue les renforts Defias d'abord, et surveille l'étourdissement du coup de bouclier.`],
      },
      {
        nom: 'Hamhock',
        notes: [`Deux Defias l'accompagnent. Restez étalés pour éviter de plus gros dégâts de {{Chain Lightning|l'éclair en chaîne}}.`],
      },
      {
        nom: 'Bazil Thredd',
        notes: [`Pas de renforts dans sa salle, mais il est un peu plus haut niveau que les autres. {{Smoke Bomb|Une bombe fumigène}} étourdit les joueurs proches 4 s: garde le tank en haut de vie.`],
      },
      {
        nom: 'Dextren Ward',
        notes: [`Dégage les salles autour avant de le tirer. Sa {{Intimidating Shout|peur de zone}} rend dangereux les monstres en trop.`],
      },
      {
        nom: 'Bruegal Ironknuckle',
        special: true,
        notes: [`Rare: il n'apparaît pas à chaque fois. Aucune capacité notable; le danger, ce sont les renforts autour de lui.`],
      },
    ],
    pieges: [`Des Defias entourent la plupart des boss: contrôle-les ou concentre-les tôt. Dégage les dernières pièces de l'aile gauche avant de tirer Dextren Ward.`],
    manque: [`Seul le seuil d'enrage de Targorr est chiffré. Pas d'adresse précise ni de description de la carte.`],
    src: ['iv-stock', 'kami-stock'],
  },
  {
    id: 'excavation-site-wetlands',
    cible: 'Excavation Site: Wetlands',
    nom: ['Excavation Site: Wetlands', null],
    niveaux: [26, 33],
    officiel: [24, 29],
    rdg: 26,
    nouveau: true,
    acces: `Dans les Wetlands, près de l'entrée de Dun Algaz, à la base de la montagne que tu escalades (une pierre de rencontre le marque). Selon Icy Veins, le chemin part juste au sud de la caverne de Thelgen Rock. Alliance: par Thelsamar ou Menethil Harbor. Horde: depuis Hammerfall (Arathi Highlands), un peu plus long.`,
    quetes: `8 quêtes selon Icy Veins (5 pour l'Alliance, 3 pour la Horde).`,
    boss: [
      {
        nom: 'Saltspine',
        notes: [
          `Il vit dans un lac autour du donjon, au bord de l'eau des crocolisques: tire avec soin, car des renforts peuvent submerger le tank et le soigneur.`,
          `{{Dust Storm|Une tempête de poussière}} qui frappe la zone de mêlée autour de lui (moins de chances de toucher d'après Icy Veins, moins de menace d'après Method): reste hors de la mêlée si possible. {{Tendon Rip|Une déchirure}} ralentit le tank, et il a aussi {{Fatal Bite|une morsure fatale}}.`,
        ],
      },
      {
        nom: 'Shadetooth',
        notes: [
          `Le plus difficile du donjon selon Icy Veins. Dégage d'abord le repaire des crocodiles, le meilleur endroit pour le combattre, et les raptors furtifs cachés dans les buissons.`,
          `Deux Thicket Hunters viennent avec lui et appliquent {{Infected Wound|une blessure infectée}} sur le tank: tue-les d'abord (sans contrôle fiable) et dissipe le tank.`,
          `Une {{Fear|peur}} de zone (le rugissement terrifiant): dangereuse s'il y a d'autres monstres; Tremor Totem ou Fear Ward sur le tank aident. {{Rend|Un fort saignement}} sur le tank. Il se met en rage à 30 % de vie (Icy Veins) ou 20 % (Method): garde tes étourdissements pour ce moment.`,
        ],
      },
      {
        nom: 'Highland Horror',
        special: true,
        notes: [
          `Boss de quête de l'Alliance, sans butin (Method). {{Entangling Roots|Des racines}} et {{Wild Regeneration|une régénération sauvage}}. Évite de tirer les limons autour.`,
        ],
      },
      {
        nom: 'Relic Guardian',
        notes: [
          `Boss final (niveau 31). Il est inactif au départ: active le panneau (Archival Panel, à sa droite selon Icy Veins; Titan Control Panel à proximité selon Method).`,
          `{{Thunderclap|Un coup de tonnerre}} ralentit ceux qu'il touche, une attaque frontale (tank dos au groupe), {{Knockaway|un repoussement}} qui fait perdre de la menace, et {{War Stomp|un piétinement}} de zone qui repousse et étourdit: les distances restent loin.`,
          `Il est mécanique mais sensible à la plupart des contrôles de foule, ce qui protège le tank. On peut le ralentir ou l'étourdir pour le kiter.`,
        ],
      },
    ],
    pieges: [
      `Young Riptooth (groupes de 3): morsure fatale. Concentre un à la fois plutôt que d'utiliser toute la zone.`,
      `Crocolisques des marais et Elder Crocolisk: ils réduisent l'esprit et l'endurance; Tendon Rip ralentit de 71 %.`,
      `Thicket Hunter: blessure infectée (dissipe-la). Thicket Matriarch: gros saignement physique. Lurkers et Stalkers (par 3): cachés dans les hautes herbes jusqu'à ce qu'on les attaque.`,
      `Dragonmaw Saboteur: lance des bombes sur une zone qu'on peut éviter. Warder: Mortal Strike (soins réduits de moitié) et un filet qui immobilise 10 s. Thaumaturgist: tue l'élémentaire de feu d'abord.`,
      `Highland Lurkers et Spiders (par 3): poison; guéris vite.`,
    ],
    manque: [
      `Les sources se contredisent sur les niveaux (24-29 selon Blizzard et kami-labs, 26-33 selon Icy Veins et Method) et sur quelques détails d'Icy Veins et de Method (rage, panneau).`,
      `Aucune source ne donne de nom français pour les boss de ce donjon.`,
    ],
    src: ['iv-exc', 'mg-exc', 'kami-exc'],
  },
  {
    id: 'city-of-dalaran',
    cible: 'City of Dalaran',
    nom: ['City of Dalaran', 'Cité de Dalaran'],
    niveaux: [28, 35],
    officiel: [28, 33],
    rdg: 28,
    nouveau: true,
    acces: `L'entrée est à l'extérieur de la ville, du côté nord-ouest, dans les Alterac Mountains. Les deux factions ont besoin de la Dalaran Sewers Key. Alliance: la quête « An Alarming Request », auprès d'Emissary Jacques à l'hôtel de ville de Southshore. Horde: une chaîne qui commence avec Magus Wordeen Voidglare à Tarren Mill (Key to the City, Dalaran Patrols, Blood in the Streets, Heart of Disruption).`,
    boss: [
      {
        nom: 'Atrexis the Grave Knight',
        notes: [
          `Il patrouille avec trois Kirin Tor Necromancers: élimine-en deux avant de t'occuper de lui. Il désarme le tank, relève sans cesse les morts et améliore ses alliés avec {{Unholy Frenzy|une frénésie impie}}.`,
          `Tue les premiers renforts, puis concentre le boss.`,
        ],
      },
      {
        nom: 'Lyn the Ignored',
        special: true,
        notes: [
          `Boss secret: il faut le Tome of Dalaran. Selon gamewave.fr, après Arugal à Shadowfang Keep, prends le « Tome noir » sur une table; va à l'hôtel de ville d'Ambermill, place-toi devant le cristal bleu et clique sur le livre, qui devient le Tome de Dalaran. Dans les égouts de Dalaran, passe Atrexis; juste avant le chemin vers l'Arcane Anomaly, va tout droit dans la petite pièce du fond: Lyn y est invoquée. Method précise que la quête se fait avec un Shadowfang Keep complet ou une instance déjà nettoyée.`,
          `{{Raise Dead|Elle relève des morts}}, {{Shadow Bolt Volley|lance une volée de traits d'ombre}} sur tout le monde et {{Curse of Thorns|une malédiction d'épines}} sur le tank (qui le blesse quand il fait des dégâts): dissipe-la si possible.`,
        ],
      },
      {
        nom: 'Arcane Anomaly',
        notes: [
          `{{Arcane Bolt|Un trait arcanique}} frappe le tank pour environ 500 dégâts. {{Focal Blast|Un rayon focalisé}} (3 s) tourne dans le sens horaire ou antihoraire: survis-y.`,
        ],
      },
      {
        nom: 'Arcanic Enigma',
        notes: [
          `Deux Mana Phantoms doivent mourir vite et leur {{Mana Burn|brûlure de mana}} doit être interrompue et étourdie.`,
          `{{Manamorph|Une métamorphose}} (dissipable) touche des cibles au hasard; un silence de zone peut être évité par les distances. Elle invoque des Manalings: équilibre les dégâts entre renforts et boss.`,
        ],
      },
      {
        nom: 'Unstable Sentinel',
        notes: [
          `{{Arcing Smash|Un grand coup frontal en arc}}: oriente-le loin du groupe. {{Malfunction|Un dysfonctionnement}} frappe tout le monde à 25 mètres: les distances l'évitent complètement; étourdis-le avant l'incantation. Il frappe fort sur le tank.`,
        ],
      },
      {
        nom: 'Fel Ancient',
        notes: [
          `Parle d'abord à Grindle Firespark pour retirer les barrières. {{Entangle|Un enracinement}} de 10 s qui fait aussi des dégâts, {{Fel Timbers|des mares dégâts}}: sors des mares vite et utilise Blessing of Freedom pour te libérer.`,
        ],
      },
      {
        nom: 'Mana Devourer',
        notes: [
          `Nettoie toute la salle d'abord, sinon les monstres restants se joignent au combat.`,
          `{{Drain Vitality|Un drain de vitalité}} (dégâts sur la durée) sur la cible principale; {{Debilitate|un affaiblissement}} frappe tout le monde en arcane et retire 200 de mana à chacun.`,
        ],
      },
      {
        nom: 'Shade of the Archmage',
        notes: [
          `Parle à l'archimage (Modela, ou Modera, selon la page de Method) près du donjon de Dalaran pour ouvrir le portail vers le Purple Parlor.`,
          `{{Arcane Bolt|Un trait arcanique}} sur le tank; {{Bounding Mana|une sphère de mana}} qui repousse (déplace l'Ombre hors de la zone); {{Arcane Explosion|une explosion arcanique}} à 20 mètres. À 0 de mana, elle lance une métamorphose de masse puis {{Evocation|une évocation}}, et le combat recommence après la fin de la métamorphose.`,
        ],
      },
    ],
    pieges: [
      `La plupart des dégâts, même en mêlée, sont arcaniques: les paladins et guerriers protection bloquent peu. Apporte de l'eau si tu n'as pas assez d'interruptions (certains monstres brûlent la mana).`,
      `Fallen Mage: trait de givre sur la cible principale (tire-le avec la ligne de vue). Fallen Warrior: Hamstring. Kirin Tor Necromancer: relève des squelettes et se donne, à eux et à lui, +75 % de vitesse d'attaque 20 s.`,
      `Seeking Remnant: détecte les joueurs furtifs. Saturated Remnant: attaques arcaniques qu'on ne peut pas bloquer. Phantasm: Reflection Field renvoie la magie. Fragmented Sentry: un grand coup devant lui. Mana Phantom: Mana Burn à interrompre.`,
    ],
    manque: [
      `Les niveaux se contredisent (26-33 dans l'intro de Method, 28-35 dans son tableau, 28-33 pour Blizzard et kami-labs); le niveau recommandé n'est pas donné.`,
      `Kami-labs liste neuf boss (dont un Mana Elemental et un Mana Wraith) alors que Method en décrit huit: les listes ne s'accordent pas encore.`,
      `Les noms de Lyn et d'Atrexis varient en français (Lyn l'Ignorée ou l'Ignoré; Atrexis, chevalier des tombes ou le Chevalier de la tombe): ils restent en anglais ici. Le Sunreaver's Sanctuary n'était pas accessible dans la bêta.`,
    ],
    src: ['mg-dal', 'kami-dal', 'gw-dal'],
  },
  {
    id: 'the-drowned-city',
    cible: 'The Drowned City',
    nom: ['The Drowned City', null],
    niveaux: [35, 40],
    officiel: [35, 40],
    nouveau: true,
    fiche: true,
    acces: `Une ancienne ruine troll au large de Stranglethorn Vale (Wowhead).`,
    boss: [],
    pieges: [],
    manque: [
      `Ce donjon est annoncé mais n'était pas encore dans la bêta. Aucune source ne donne de boss, de mécaniques ou de quêtes.`,
      `Kami-labs le nomme « La Cité engloutie », mais c'est tiré de l'adresse de la page et non confirmé: le nom reste en anglais ici.`,
    ],
    src: ['iv-news-9', 'wh-overview'],
  },
]
