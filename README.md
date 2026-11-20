# SkingKong — ESTP Cachan · Liste ski 2027


Jeu de plateforme 2D en pixel art, jouable dans le navigateur (PC, mobile, manette).
Mascotte : **Kong**, gorille skieur 100 % original. Tout est généré par code : pixel art, police, sons (Web Audio).

## Lancer le jeu

```bash
npm install
npm run dev        # http://localhost:5173 (accessible sur le réseau local pour tester sur mobile)
npm run build      # build de production dans dist/
npm run preview    # sert le build
npm test           # tests headless de la physique et des niveaux
```

## Contrôles

| Action | Clavier | Manette | Tactile |
|---|---|---|---|
| Avancer | ← → / Q D (AZERTY) / A D (QWERTY) | Croix / stick | ◀ ▶ |
| Sauter (maintenir = plus haut) | Espace / ↑ / Z (AZERTY) | A ou B | A |
| Glisser sur le plat (en pente : automatique) / descendre d'une poutre | ↓ / S | Bas | ▼ |
| Pause | Échap / P | Start | ‖ |
| Recommencer | R | Y | menu pause |
| Plein écran | F | — | menu pause |
| Debug (hitboxes, FPS, clic = téléportation, T = changer d'ambiance) | F3 / ² | Select | — |

## État d'avancement

- [x] **Étape 1 — Moteur, contrôles, game feel, un niveau jouable (1-1)**
- [x] **Étape 2 — Direction artistique et audio**
- [x] **Étape 3 — 4 mondes × 6 niveaux**
- [x] **Étape 4 — 4 boss à 3 phases**
- [x] **Étape 5 — Menus, boutique, skins, succès**
- [x] **Étape 6 — Comptes, cloud, classements (Supabase) + repli localStorage
- [x] **Étape 7 — Speedrun/fantômes, Infini, Défi, Niveau du jour, éditeur**
- [x] **Étape 8 — Polish, optimisation, tests, docs**

### Contenu de l'étape 1

- **Physique** : sous-pas variables ≤ 1/240 s (hauteur de saut identique de 30 à 240 fps, sans pas de temps fixe), collisions par sous-pas de 4 px (pas de tunneling).
- **Contrôles** : coyote time (0,1 s), jump buffer (0,13 s), saut variable, gravité de chute renforcée + flottement à l'apex, accélération/friction réglables (`PHYS` dans `src/game/player.js`), demi-tour nerveux, saut mural + glissade murale, double saut débloquable, pentes à 45° avec glissade qui accumule de l'élan, glace, poutres traversables, plateformes mobiles, blocs friables, ressorts.
- **Juice** : squash & stretch, hit-stop, screen shake dosé (trauma²), flashs, particules (pool de 1000), traînées de vitesse, zoom dynamique, caméra avec anticipation, verrouillage vertical et lissage exponentiel, combo de forfaits avec pitch croissant, respawn instantané (0,55 s).
- **Niveau 1-1 « Premier tire-fesses »** : tutoriel progressif via 11 panneaux, 37 forfaits, 3 étoiles cachées (passage secret, ressort boosté, sommet du puits), 2 drapeaux, notation 3 étoiles (terminer / tout collecter / battre le temps cible), record sauvegardé.
- **Rendu** : décor 6 couches en parallaxe (ciel, montagnes, nuages, grues et pelleteuse de chantier, sapins), neige, tuiles pré-rendues en un seul canvas, police bitmap maison, résolution logique 270 px de haut mise à l'échelle sans flou.
- **PWA** : manifest + service worker (cache-first, jouable hors ligne après une première visite).

### Contenu de l'étape 2

- **4 ambiances** (`src/game/themes.js`) : *Aube* (Monde 1), *Tempête* en forêt gelée (Monde 2), *Plein jour* sur les glaciers (Monde 3), *Nuit étoilée* d'afterski avec aurores boréales (Monde 4) — ciel, astres, décor en parallaxe 5 à 6 couches, palette de tuiles et musique propres.
- **Météo** : neige, neige légère, blizzard avec rafales et voile blanc, poussière de diamant ; brouillard en couches et au premier plan.
- **Lumière** : obscurité réglable par niveau percée par Kong et les sources lumineuses, halos additifs (bloom léger). Décors lumineux : lampadaires `L`, néons `N`, cristaux `k`. Eau glacée animée `w` (mortelle).
- **Animations** : course sur 4 temps, dérapage avec gerbe de neige, accroche murale, reflet des lunettes, bonhomme de neige animé.
- **Écran titre** : intro avec le logo officiel de la liste (`public/logo-skingkong.png`, seule image externe) et « présente », logo pré-rendu (glace en dégradé, neige qui coule, étoile dans le O, reflet animé), Kong qui arrive en skiant, cycle des 4 ambiances (aube → jour → tempête → nuit).
- **Musique synthétisée adaptative** (`src/engine/music.js`) : séquenceur Web Audio, 6 morceaux originaux en données (titre, 4 mondes, boss) ; couches batterie / basse / nappes / arpèges / mélodie / charleston qui s'ajoutent selon l'intensité (vitesse, glissade, combos) ; jingles victoire, mort, game over, déblocage ; musique assourdie en pause, atténuée à la mort.
- **Mixage** : volumes musique et effets séparés, réglables dans le menu pause et sauvegardés.

### Contenu de l'étape 3

- **24 niveaux** (les 4 boss arrivent à l'étape 4) :

| Monde | Ambiance | Niveaux | Nouveautés |
|---|---|---|---|
| 1 — L'aube sur la station | aube, chantier | 1-1 Premier tire-fesses · 1-2 Piste noire du chantier · 1-3 Chantier de la remontée · 1-4 La tyrolienne du chef de chantier · 1-5 Avalanche sur la piste bleue · 1-6 Le télésiège du sommet | pentes, glace friable, plateformes mobiles, ressorts, tyroliennes, avalanche, télésièges |
| 2 — La forêt dans la tempête | blizzard | 2-1 Lisière dans le blizzard · 2-2 Le bois des hiboux · 2-3 Le chalet verrouillé · 2-4 La grotte aux stalactites · 2-5 Avalanche dans la tempête · 2-6 Le col du blizzard | vent, hiboux, clés et portes, stalactites, grotte sombre, plateforme verticale |
| 3 — Les glaciers éternels | plein jour | 3-1 La banquise glissante · 3-2 Le lac gelé · 3-3 La crevasse bleue · 3-4 Tyroliennes sur la mer de glace · 3-5 Effondrement du glacier · 3-6 Le cœur de cristal | glace, eau glacée, pingouins, plateformes verticales, cristaux |
| 4 — L'afterski sous les étoiles | nuit, aurores | 4-1 La station by night · 4-2 Le club laser · 4-3 Le télésiège de minuit · 4-4 La forêt aux lanternes · 4-5 Avalanche de minuit · 4-6 L'after ultime | fêtards, lasers, néons, nuit noire, grand final |

- **Mécaniques** (`src/game/mechanics.js`, `src/game/entities.js`) : tyroliennes (saut pour s'accrocher, saut = lâcher avec élan, ↓ = lâcher), télésièges, avalanche qui poursuit Kong (alerte sur le bord de l'écran, grondement), zones de vent avec rafales, clés et portes, stalactites qui tremblent puis tombent, lasers à cycle avec préavis clignotant, plateformes verticales.
- **Règles de jeu** :
  - glissade automatique dès qu'on s'engage dans une pente (il suffit d'aller vers le haut pour remonter) ;
  - en sautant d'un objet en mouvement (plateforme, télésiège), Kong garde sa vitesse ;
  - en l'air, l'élan est conservé quand on relâche la flèche (comme chez Mario) : seul un contre-braquage freine. La vitesse de glissade est plafonnée à 320 px/s ;
  - les ennemis qui marchent (bonhomme de neige, pingouin, fêtard) ne se mettent en route qu'en arrivant près de l'écran. Les pingouins font demi-tour avant le bord, et glissent avec beaucoup d'inertie sur la glace ;
  - à partir du monde 2, plus de panneaux explicatifs : le joueur découvre les mécaniques par lui-même ;
  - ↓ fait descendre d'une poutrelle ;
  - la glace friable brisée ne revient pas d'elle-même ;
  - à chaque chute, une phrase « brainrot » s'affiche (« SKIBIDI MORT », « SKILL ISSUE »…, le SKI en couleurs) pendant la courte transition de 0,9 s (SAUT l'abrège) ;
  - à la mort : tous les ennemis réapparaissent (leur ronde est décalée au hasard). Les forfaits, étoiles, clés, portes et glace friable situés après la dernière sauvegarde reviennent, ceux d'avant restent acquis.
- **Ennemis** : hibou (vol en ronde), pingouin (glisse sur le ventre, accélère sur la glace), fêtard (danse et sautille), en plus du bonhomme de neige.
- **Progression** : carte des mondes en navigation horizontale (←/→ de niveau en niveau ; après le dernier niveau, le chemin glisse vers le monde suivant ; ENTRÉE ou clic pour lancer ; la carte s'ouvre sur le dernier niveau joué), un niveau s'ouvre quand le précédent est terminé ; après l'arrivée, SAUT = niveau suivant, R = rejouer, ÉCHAP = carte. Le double saut obtenu au 1-1 reste acquis. Chaque niveau a 3 étoiles cachées, des forfaits et un temps cible.
- **Conception des niveaux** : `tools/levels/` (Python, sans dépendance). Les niveaux sont décrits par segments (`run`, `pit`, `slope_down`, `crumble`, `door`, `roof`...) puis exportés en fichiers JS lisibles et éditables (`src/levels/wX-Y.js`) avec `python3 tools/levels/build.py`. Le script vérifie chaque niveau (un départ, une arrivée, 3 étoiles, une clé avant chaque porte, tyroliennes par paires), complète les forfaits et applique les temps cibles de `tools/levels/pars.json`.
- **Validation** : le bot de test termine les 24 niveaux de bout en bout ; les temps cibles sont calibrés sur ses chronos (+25 % et 10 s de marge).

### Contenu de l'étape 4

Un boss clôt chaque monde (`1-B` … `4-B`, après le niveau 6). Le battre ouvre le monde suivant ; une sauvegarde faite avant l'ajout des boss garde ses mondes ouverts. Code : `src/game/bosses.js`, arènes : `src/levels/bN.js`.

- **Règles communes** :
  - arène fixe d'un écran ; barre de vie du boss en bas, découpée par phase ; thème musical de boss dont l'intensité monte à chaque phase ;
  - 3 phases, de plus en plus rapides. Un bandeau « PHASE 2/3 » s'affiche quand le boss s'énerve ;
  - on ne blesse le boss qu'en lui sautant sur la tête quand il est **sonné** (étoiles et flèche ↓ au-dessus de lui, cadre de la barre en jaune). Sauter sur sa tête le reste du temps fait rebondir sans dégâts ; toucher son corps est mortel ;
  - chaque attaque est annoncée : posture et « ! », ombre ou marque au sol à l'endroit de la chute, ligne pointillée ou clignotante avant un rayon ou un laser ;
  - une chute remet le combat à zéro, après un écran « brainrot » qui attend SAUT / ENTRÉE pour relancer le combat ;
  - notation : vaincre le boss, sans aucune chute, sous le temps cible.
- **Yéti géant** (monde 1, 6 PV) : charge et s'assomme contre le mur (point faible), lance des boules de neige en cloche. En phase 2, il bondit sur Kong, et l'atterrissage envoie des ondes au sol ; le choc contre le mur fait tomber de la neige (jamais devant lui). En phase 3, s'y ajoutent une boule géante qui roule et des stalactites.
- **Dameuse folle** (monde 2, 6 PV) : traverse l'arène. On passe par-dessus en rebondissant sur le toit ou le capot, la lame est mortelle. Elle cale contre le mur, le pilote sort la tête et c'est le point faible. En phase 2, la fraise arrière projette des mottes et des blocs de neige tombent sur des marques. En phase 3, double traversée avant de caler.
- **Dragon de glace** (monde 3, 6 PV) : vole, souffle des rayons de glace visés sur Kong (annoncés par une ligne pointillée), pique vers le sol à l'endroit marqué en rouge et s'y écrase, tête à portée. En phase 2, éventail d'éclats et ondes au sol à l'impact. En phase 3, pluie de stalactites.
- **DJ Yéti** (monde 4, 9 PV) : mixe sur sa scène, hors d'atteinte. Ses attaques :
  - ondes sonores venues des enceintes : cyan au sol (il faut sauter), magenta en hauteur (il faut rester au sol) ;
  - colonnes laser avec un trou pour se glisser, puis un laser au ras du sol en phase 3 ;
  - fêtards en renfort, jamais plus de 3 à la fois.

  Entre deux attaques, il saute danser sur la piste : c'est le point faible.
- **Validation** : un bot dédié (`script=boss`) esquive ce qui est annoncé et saute sur la tête du boss quand il est sonné. Il bat les 4 boss en mode d'essai `god=1`, où les coups reçus sont comptés au lieu de tuer Kong.

### Contenu de l'étape 5

- **Menu principal** (écran titre) : CONTINUER (ou JOUER), CARTE DES MONDES, BOUTIQUE, SUCCÈS (compteur), DÉFIS (défis du jour restants), OPTIONS. En bas : avancée (niveaux, étoiles) et porte-monnaie. Kong porte la tenue équipée.
- **Forfaits (monnaie)** : ceux ramassés dans un niveau sont versés au porte-monnaie à l'arrivée, ce qu'affiche l'écran de résultats. Les succès, les défis et la série de connexion en rapportent aussi. Une ancienne sauvegarde reçoit les forfaits déjà gagnés.
- **Boutique** (`src/game/catalog.js`) : chaque objet se prévisualise sur un Kong animé avant l'achat, qui demande une confirmation et équipe l'objet aussitôt.
  - 14 skins (palettes) : classique, ESTP, pilote de chantier, moniteur, pingouin, DJ, pirate, ninja, Père Noël, astronaute, yéti, néon, cristal, or ;
  - 9 accessoires posés sur la tête : bonnet, casque de chantier, casque audio, chapeau de pirate, bonnet de Noël, cornes de viking, antenne, couronne, lunettes ;
  - 7 traînées de vitesse : givre, aucune, feu, néon rose, or, arc-en-ciel, ombre ;
  - 6 effets de saut : neige, étoiles, confettis, flammes, cristaux, pluie de forfaits.
- **Succès** (`src/game/progress.js`) : 52 succès en 5 catégories (aventure, collection, maîtrise, activité, style), avec barre de progression et récompense. Une notification animée apparaît en haut de l'écran. Les succès déjà mérités par une ancienne sauvegarde sont accordés sans notification.
- **Défis** : 3 défis du jour et 3 de la semaine, tirés avec une graine commune (les mêmes pour tous les joueurs ce jour-là). Ils se valident tout seuls en jouant et paient une seule fois.
- **Série de connexion** : récompense quotidienne de 20 forfaits le 1er jour, +10 par jour d'affilée, plafonnée à 100. La série retombe à 1 après un jour sans jouer.
- **Options** : volumes, effets visuels réduits, plein écran et **commandes remappables**. Il suffit d'appuyer sur la nouvelle touche ; ÉCHAP annule, et une touche réattribuée quitte l'action qui l'utilisait. Le bouton « par défaut » rétablit les commandes d'origine.
- Captures de test : `?menu=shop|succes|defis|options&coins=500&tab=1&item=3`, et `look=skin,accessoire,trainee,effet` pour la sonde de niveau.

### Contenu de l'étape 6

- **Comptes** (menu COMPTE) : pseudo, e-mail, mot de passe. Supabase Auth hache les mots de passe (bcrypt) ; en mode local, c'est PBKDF2 avec un sel. Le mode invité reste disponible, et une partie invitée rejoint le compte à la connexion.
- **Sauvegarde cloud** : fusion sans perte (`src/online/merge.js`). Les records gardent le meilleur, les objets, succès et étoiles sont réunis, et le porte-monnaie compte par appareil. Synchronisation toutes les 60 s et à la fermeture de l'onglet.
- **Classements** (`src/game/online-menus.js`) : général, par niveau, du jour, de la semaine, avec les filtres TOUS, AMIS et LISTE ESTP CACHAN. Le rang s'affiche sur l'écran de résultats. Les résultats envoyés hors ligne attendent dans une file.
- **Profil** : statistiques et amis (ajout par pseudo).
- **Anti-triche** (`src/online/rules.js` + `supabase/schema.sql`) :
  - temps minimal plausible par niveau, forfaits plafonnés ;
  - temps réellement écoulé, 2 s entre deux envois, 300 envois par jour ;
  - RLS sur toutes les tables.
- **Activer le serveur** :
  1. créer un projet Supabase ;
  2. exécuter `supabase/schema.sql` puis `supabase/levels.sql` (régénéré par `npm run sql`) ;
  3. copier `.env.example` en `.env` et y renseigner l'URL et la clé anon ;
  4. lancer `npm run build`.

  Sans `.env`, tout fonctionne en mode local.
- Captures : `?menu=compte|classements|profil&demo=2`, `&form=signup`.

### Contenu de l'étape 7

Menu **MODES BONUS** (écran titre) :

- **Fantômes** : la meilleure descente de chaque niveau est enregistrée (15 images/s, 60 niveaux au plus dans le navigateur) et rejouée en transparence. Option *FANTOME DU MEILLEUR TEMPS* pour la masquer.
- **Speedrun** : les 6 niveaux d'un monde d'affilée (débloqué quand le monde est fini). Chrono cumulé, écart en vert ou en rouge par rapport au record, temps intermédiaires.
- **Infini** : piste générée sans fin et sans point de contrôle. L'avalanche accélère jusqu'à 215 px/s, et on a une seule vie. Score en mètres, avec un record.
- **Défi** : un niveau déjà terminé, avec des contraintes à combiner : une seule vie, sans double saut, nuit noire, turbo ×1,3. Plus il y a de contraintes, plus la récompense est grosse.
- **Niveau du jour** : une piste générée à partir du jour UTC, la même pour tout le monde. Bonus de 40 forfaits la première fois et classement du jour en ligne (niveau `DAY` dans `level_limits`).
- **Éditeur** :
  - grille de 18 lignes, de 30 à 400 colonnes, avec 21 tuiles et objets ;
  - commandes : flèches et SAUT, souris (clic maintenu, molette), ou tactile ;
  - test immédiat, 3 emplacements de sauvegarde ;
  - partage par code `SK1:…` (le code est vérifié à l'import).
- 8 succès BONUS (60 au total).
- Générateur (`src/modes/generator.js`) : déterministe, segments franchissables, difficulté progressive. Il a été validé par le bot (6 Niveaux du jour et 2 pistes de 1000 tuiles terminés).

### Contenu de l'étape 8

- **Mode assisté** (OPTIONS), pour que tout le monde puisse finir le jeu :
  - *VITESSE DU JEU* 100 / 85 / 70 / 60 % ;
  - *BOUCLIER* : ennemis, pics, stalactites et projectiles repoussent Kong au lieu de le faire tomber (les trous, l'eau et l'avalanche restent mortels).

  Une partie assistée valide le niveau et rapporte les forfaits, mais elle n'entre pas au classement, ne donne pas l'étoile du temps et n'enregistre ni record ni fantôme. Le HUD affiche ASSISTE.
- **Appareils lents** : après 5 s sous 40 images/s en jeu, les effets visuels sont réduits une fois, avec une notification (réversible dans les options). Mesuré en build sur PC, une image coûte de 0,5 ms (mondes 1 à 3) à 2,3 ms (monde 4, éclairage) sur les 16,7 ms disponibles (`?probe=1&level=4-4&script=bot&god=1&dur=5&bench=1`, sans temps virtuel).
- **Robustesse** :
  - une erreur imprévue sauvegarde, revient au menu et l'annonce, au lieu de figer l'écran ;
  - en cas d'erreurs en boucle, un écran explique de recharger la page.
- **Hors ligne / mises à jour** : le service worker charge la page depuis le réseau d'abord, le cache ne servant que hors ligne. Les fichiers du build (noms hachés) sont servis depuis le cache. Une mise en ligne est donc visible dès le rechargement suivant.
- **Options** réorganisées : réglages généraux, puis commandes. Une aide s'affiche sur les lignes du mode assisté.
- **Non-régression** : `tools/bot/botall.sh` fait jouer le bot sur les 24 niveaux, les 4 boss et 3 Niveaux du jour générés.

## Mettre en ligne

Le build (`npm run build`) est un site statique dans `dist/`, avec des chemins relatifs (`base: './'`). Il fonctionne donc à la racine d'un domaine comme dans un sous-dossier.

- **Netlify / Vercel / Cloudflare Pages** :
  - commande `npm run build`, dossier publié `dist` ;
  - définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement du service pour activer les comptes.
- **GitHub Pages** ou tout hébergeur statique : copier le contenu de `dist/`.
- **HTTPS obligatoire** pour le service worker (jeu hors ligne, installation sur l'écran d'accueil), le plein écran mobile et la copie des codes de l'éditeur.
- **Supabase** :
  - ajouter l'URL du site dans *Authentication → URL Configuration* (Site URL et Redirect URLs), pour que le lien de confirmation par e-mail renvoie vers le jeu ;
  - après un changement de niveaux, lancer `npm run sql` puis exécuter `supabase/levels.sql`.
- La clé publique (`anon` / `publishable`) peut être dans le build : toutes les écritures passent par la RLS et les fonctions `security definer` de `schema.sql`. Ne jamais mettre la clé `service_role` dans `.env`.

## Tests

- `npm test` : chute/atterrissage, hauteur de saut, saut variable, indépendance au framerate, coyote time, jump buffer, pentes, glissade, saut mural, plateforme mobile, ressort ; pour chacun des 24 niveaux, cohérence des données (départ, arrivée, 3 étoiles accessibles, clé avant chaque porte, tyroliennes en descente, temps cible) ; mécaniques de l'étape 3 (portes, murs prolongés, tyrolienne, avalanche, vent) ; boss (place dans la campagne, déblocage, 3 phases, une ouverture en moins de 12 s dans chaque phase, chutes/rayons/lasers annoncés au moins 0,6 s à l'avance, K.O. puis victoire, rebond sans dégâts hors des ouvertures) ; boutique et progression (14 skins, 60 succès, textes affichables, achat et équipement, succès à seuil, défis déterministes payés une seule fois, série de connexion, reprise d'une ancienne sauvegarde) ; comptes et cloud (fusion des sauvegardes, porte-monnaie par appareil, file hors ligne, anti-triche) ; modes bonus (générateur déterministe, 60 Niveaux du jour franchissables et compatibles avec l'anti-triche, codes de l'éditeur, fantômes).
- `node tools/levels/reach.mjs` (aussi lancé par `npm test`) : analyse d'accessibilité de chaque niveau sur la grille. Il calcule tout ce que Kong peut atteindre (saut simple, double saut, ressorts, plateformes, télésièges, tyroliennes, vent, glace friable, sauts muraux) et signale les forfaits, étoiles, clés et l'arrivée hors d'atteinte. Avec `NATURAL=1`, il liste aussi ce qui demande une escalade murale et les poutrelles trop hautes pour un saut simple. Les forfaits à hauteur de tête sont interdits (ils passent au-dessus de Kong sans qu'il les touche).
- `?probe=1&level=2-3&script=bot&dur=240&stopwin=1` : un bot réactif joue le niveau en entier et écrit un rapport JSON (`<pre id="probe">`) : état final, temps, morts et causes. Il gère plateformes mobiles, télésièges, tyroliennes, lasers, hiboux, clés oubliées (demi-tour) et termine les 24 niveaux. Le hasard est fixé en mode test (`seed=`), deux exécutions donnent le même résultat.
- `?probe=1&level=1-B&script=boss&god=1&dur=180&stopwin=1` : bot de boss. Le rapport indique les PV restants, la phase et les coups reçus (`bt=1&samples=1` : déroulé du combat).
- Autres scripts : `walk`, `idle`, `slide`, `spring`, `left`, `star2`, `pause` ; `trace=x0-x1` (trajectoire image par image), `scene=map&upto=2-4` (carte des mondes) ; paramètres `tx`/`ty`, `dbl=1`, `samples=1`, `theme=dawn|storm|glacier|night`, `level=demo` (vitrine eau/lumières).
- `tools/bot/botall.sh [ids]` (build servi sur le port 4173) : rapport OK/ECHEC niveau par niveau ; `GEN:<graine>` pour un niveau généré. Paramètres de sonde ajoutés : `level=GEN&gseed=`, `assist=speed,shield`, `bench=1`.
- `?probe=1&audio=1` : exécute tous les morceaux, couches, instruments, jingles et effets sonores et rapporte les erreurs.
- `?warm=<s>` : pré-simule l'écran titre (captures automatisées).

## Structure

```
src/
  engine/   util, font (police bitmap), input (clavier/manette/tactile), audio (synthé), particles, camera, sprites
  game/     game (boucle, scènes, sauvegarde), title, worldmap (carte des mondes), level (scène de jeu), player (physique),
            tilemap, entities, bosses, catalog (boutique), progress (succès, défis, série), menus, mechanics (tyrolienne, télésiège, avalanche, vent), tilerender, background, hud, probe (tests automatisés)
            online-menus (compte, classements, profil), bonus-menus (modes bonus, défi), labels
  levels/   données des niveaux (chunks texte, légende dans tilemap.js)
  online/   service (comptes, sync, envois), supabase (client REST), local (repli navigateur), merge, rules (anti-triche), form, sha256
  modes/    generator (Infini, Niveau du jour), modes (speedrun, infini, défi, jour, test éditeur), editor + editor-format, replays (fantômes)
public/     manifest, service worker, icône
supabase/   schema.sql (tables, RLS, fonctions), harden.sql (droits), levels.sql (limites anti-triche, généré)
tests/      tests headless Node
tools/levels/  conception des niveaux (Python) : builder, world1..4, build.py, pars.json
tools/online/  gen_sql.mjs (supabase/levels.sql)
tools/bot/     botall.sh (non-régression par le bot)
```
