"""Monde 1 — L'Aube sur la station (chantier de la nouvelle remontée). 1-1 est écrit à la main (src/levels/w1-1.js)."""
from builder import Level


def l1_2():
    L = Level('1-2', 'Piste noire du chantier', 'dawn', 60, comment='Pentes, glissades et ponts de glace friable.')
    L.run(3); L.on(3, 'P')
    s = L.run(8); L.sign(s + 2, 'DANS UNE DESCENTE, TU GLISSES TOUT SEUL : GARDE L\'ELAN POUR SAUTER LOIN')
    L.slope_up(4); L.run(3); L.coins(L.x - 3, L.g - 2, 3)
    s = L.slope_down(6); L.arc(L.x, 6, 3)
    L.run(4); L.pit(5); L.run(6); L.on(L.x - 3, 'e')
    # première grande descente + saut long
    L.up(0); L.slope_up(3); s = L.run(2)
    L.slope_down(8); L.run(2); L.pit(6)
    for i in range(6): L.set(L.x - 6 + i, L.g - 4 - (1 if 1 < i < 4 else 0), '$')
    s = L.run(8); L.sign(s + 1, 'LES PONTS DE GLACE CEDENT SOUS TON POIDS : NE T\'ARRETE PAS !')
    L.crumble(6); L.run(3); L.crumble(7); L.coins(L.x - 7, L.g - 2, 7)
    s = L.run(6); L.on(s + 3, 'C')
    # étoile 1 : au-dessus d'un mur, il faut le double saut
    s = L.run(4); L.sign(s, 'TU AS GARDE LE DOUBLE SAUT : APPUIE UNE 2E FOIS SUR SAUT EN L\'AIR'); L.up(5); s = L.run(3); L.on(s + 1, '*'); L.down(5); L.run(3)
    L.on(L.x - 2, 'e')
    L.slope_up(2); L.run(1); L.slope_down(10); L.run(1)
    L.pit(7, water=False); L.coins(L.x - 6, L.g - 5, 5)
    L.run(5); L.crumble(4); L.run(2); L.crumble(4); L.run(4)
    # poutrelles : chaque marche se prend avec un saut simple (3 cases max)
    s = L.run(4); L.sign(s - 2, 'POUTRELLES ROUGES : SAUTE A TRAVERS PAR DESSOUS POUR TE POSER DESSUS. ↓ POUR REDESCENDRE')
    L.girder(s, L.g - 3, 4); L.girder(s + 5, L.g - 6, 4); L.coins(s + 5, L.g - 7, 4)
    L.on(s + 3, 'e')
    # étoile 2 : passerelle cachée au-dessus
    L.girder(s + 10, L.g - 9, 3); L.set(s + 11, L.g - 10, '*')
    L.run(8)
    L.slope_down(4); L.run(3); L.pit(4); L.run(3); L.slope_up(2); L.run(2)
    L.slope_down(6); L.pit(8); L.coins(L.x - 7, L.g - 5, 6)
    s = L.run(6); L.on(s + 3, 'C')
    # étoile 3 : passage secret dans le mur de fin
    L.up(4); s = L.run(10)
    # tunnel visible sous le plateau, faux murs aux deux bouts au ras du sol bas : il suffit d'avancer dedans
    L.block(s, L.g + 2, 10, 2, '.'); L.block(s, L.g + 2, 1, 2, 'H'); L.block(s + 9, L.g + 2, 1, 2, 'H')
    L.set(s + 4, L.g + 3, '*'); L.set(s + 3, L.g + 3, '$'); L.set(s + 5, L.g + 3, '$')
    L.set(s + 7, L.g - 1, 'e')
    L.down(4); L.run(3)
    s = L.run(4); L.on(s + 2, 'G')
    L.finish()
    return L


def l1_3():
    L = Level('1-3', 'Chantier de la remontée', 'dawn', 70, comment='Plateformes mobiles, ressorts et poutrelles.')
    L.run(3); L.on(3, 'P')
    s = L.run(6); L.sign(s + 2, 'LES PLATEFORMES ROUGES T\'EMMENENT : SAUTE DESSUS ET LAISSE-TOI PORTER')
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.coins(p + 2, L.g - 3, 6)
    L.run(5); L.on(L.x - 2, 'e')
    p = L.pit(10); L.set(p + 3, L.g - 2, 'M')
    L.up(2); L.run(4)
    s = L.run(3); L.on(s + 1, 'S'); L.sign(s, 'RESSORT : MAINTIENS SAUT EN ATTERRISSANT POUR MONTER ENCORE PLUS HAUT')
    L.up(8); L.run(1); s = L.run(6); L.coins(s, L.g - 2, 6)
    L.down(4); L.run(3); L.pit(4); L.run(4)
    # poutrelles (passerelles traversables par le dessous)
    L.down(4); s = L.run(14); L.girder(s + 2, L.g - 3, 4); L.girder(s + 7, L.g - 6, 4); L.girder(s + 2, L.g - 9, 4)
    L.coins(s + 2, L.g - 10, 4); L.set(s + 3, L.g - 11, '*')
    L.on(s + 6, '^'); L.on(s + 7, '^'); L.on(s + 11, 'e')
    L.sign(s + 1, 'POUTRELLES : SAUTE A TRAVERS PAR DESSOUS, ↓ POUR REDESCENDRE')
    s = L.run(4); L.on(s + 2, 'C')
    p = L.pit(10); L.set(p + 3, L.g - 1, 'M'); L.set(p + 4, L.g - 5, '$'); L.set(p + 6, L.g - 5, '$')
    L.run(4); p = L.pit(10); L.set(p + 3, L.g + 1, 'M')
    L.run(4)
    s = L.run(12); L.on(s + 3, '^'); L.on(s + 4, '^'); L.arc(s + 2, 4, 3); L.on(s + 10, 'e')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(9); L.run(3); L.coins(L.x - 3, L.g - 2, 3)
    # étoile 2 : au bout d'une plateforme qui file vers la droite au-dessus du vide
    p = L.pit(10); L.set(p + 3, L.g - 1, 'M'); L.girder(p + 8, L.g - 6, 2); L.set(p + 8, L.g - 7, '*')
    L.run(5); L.down(6); L.run(3)
    s = L.run(10); L.on(s + 2, 'e'); L.on(s + 6, 'e'); L.coins(s + 1, L.g - 4, 8)
    s = L.run(4); L.on(s + 2, 'C')
    p = L.pit(10); L.set(p + 3, L.g, 'M')
    L.run(2); L.up(3); L.run(2); p = L.pit(10); L.set(p + 3, L.g - 2, 'M')
    L.run(4); L.down(3); s = L.run(8)
    # étoile 3 : ressort caché derrière un faux mur à droite de l'arrivée
    L.on(s + 5, '^'); L.on(s + 6, '^')
    s = L.run(5); L.on(s + 2, 'G')
    L.run(3); L.block(L.x, L.g - 14, 2, 14, '#'); L.block(L.x, L.g - 3, 2, 3, 'H')
    L.run(4); L.on(L.x - 2, 'S'); L.block(L.x - 6, L.g - 12, 6, 2); L.set(L.x - 2, L.g - 9, '*')
    L.run(2); L.wall(2)
    return L


def l1_4():
    L = Level('1-4', 'La tyrolienne du chef de chantier', 'dawn', 65, comment='Tyroliennes au-dessus des ravins.')
    L.run(3); L.on(3, 'P')
    s = L.run(7); L.sign(s + 1, 'TYROLIENNE : SAUTE POUR T\'ACCROCHER AU CABLE. SAUT = LACHER AVEC ELAN, ↓ = LACHER')
    L.on(s + 5, 'z')
    L.pit(22)
    L.coins(L.x - 18, L.g - 6, 3); L.coins(L.x - 10, L.g - 4, 3)
    L.down(2); s = L.run(5); L.on(s + 1, 'z')
    L.run(4); L.on(L.x - 2, 'e')
    L.up(5); L.run(1); L.up(0); s = L.run(5); L.on(s + 3, 'z')
    L.pit(16); L.down(3)
    # étoile 1 : lâcher la tyrolienne au bon moment pour la poutrelle
    L.girder(L.x - 9, L.g - 5, 3); L.set(L.x - 8, L.g - 6, '*')
    s = L.run(5); L.on(s + 1, 'z')
    L.run(3); s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(4); L.run(2); L.pit(5); L.run(3); L.on(L.x - 2, 'e')
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(24); L.coins(L.x - 20, L.g - 3, 3); L.coins(L.x - 12, L.g - 1, 3)
    L.down(1); s = L.run(5); L.on(s + 2, 'z')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(7); s = L.run(4); L.on(s + 3, 'z'); L.coins(s, L.g - 2, 3)
    L.pit(20); L.down(4)
    s = L.run(5); L.on(s + 2, 'z')
    s = L.run(6); L.on(s + 3, 'C')
    L.run(2); L.crumble(5); L.run(2)
    # étoile 2 : sous un pont de glace, dans une grotte
    s = L.run(6); L.block(s + 1, L.g, 4, 2, '.'); L.block(s + 1, L.g, 4, 1, 'x'); L.set(s + 2, L.g + 1, '*'); L.set(s + 3, L.g + 1, '$')
    L.set(s + 1, L.g + 1, '$'); L.set(s + 4, L.g + 1, '$')
    s = L.run(4); L.on(s + 3, 'z')
    L.pit(18); L.down(2)
    s = L.run(5); L.on(s + 1, 'z')
    L.run(3); L.on(L.x - 1, 'e')
    # étoile 3 : en haut d'un puits (saut mural)
    s = L.run(8); L.block(s + 2, L.g - 14, 1, 11, '#'); L.block(s + 5, L.g - 12, 1, 9, '#'); L.set(s + 3, L.g - 13, '*'); L.coins(s + 3, L.g - 10, 2); L.coins(s + 3, L.g - 7, 2)
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l1_5():
    L = Level('1-5', 'Avalanche sur la piste bleue', 'dawn', 50, avalanche={'speed': 118, 'lag': 260},
              comment='Poursuite : l\'avalanche part dès que tu bouges.')
    L.run(3); L.on(3, 'P')
    s = L.run(5); L.sign(s + 2, 'AVALANCHE ! ELLE PART DES QUE TU BOUGES. FONCE ET NE REGARDE PAS DERRIERE !')
    L.run(6); L.slope_down(4); L.run(3); L.pit(3); L.run(4); L.arc(L.x - 4, 4, 2)
    L.slope_down(5); L.run(2); L.pit(4); L.run(5); L.on(L.x - 2, 'e')
    L.crumble(5); L.run(3); L.slope_up(2); L.run(2); L.slope_down(6); L.run(3)
    L.pit(5); L.coins(L.x - 4, L.g - 4, 3)
    s = L.run(4); L.on(s + 1, '^')
    L.run(4); L.up(2); L.run(4); L.up(2); L.run(4)
    L.set(L.x - 3, L.g - 6, '*'); L.girder(L.x - 4, L.g - 5, 3)
    s = L.run(5); L.on(s + 3, 'C')
    L.slope_down(8); L.run(2); L.pit(6); L.run(3); L.on(L.x - 1, 'e')
    L.crumble(4); L.run(2); L.crumble(4); L.run(3)
    s = L.run(3); L.on(s + 1, 'S')
    L.up(6); L.run(6); L.coins(L.x - 6, L.g - 2, 6)
    L.slope_down(6); L.pit(5); L.run(4)
    L.on(L.x - 2, '^'); L.run(3); L.pit(3); L.run(2); L.pit(3); L.run(4)
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(3); L.run(2); L.pit(4); L.run(2); L.on(L.x - 1, 'e'); L.run(4)
    # étoile 2 : poutrelle haute au-dessus d'un trou (double saut)
    p = L.pit(5); L.girder(p + 1, L.g - 6, 3); L.set(p + 2, L.g - 7, '*')
    L.run(3); L.crumble(6); L.run(3)
    L.slope_up(2); L.run(2); L.slope_down(8); L.run(3); L.pit(6); L.coins(L.x - 5, L.g - 5, 4)
    L.run(4); L.ice(8); L.on(L.x - 5, 'e'); L.run(2)
    # étoile 3 : sur la route, mais entre deux pics (prise de risque)
    s = L.run(6); L.on(s + 1, '^'); L.on(s + 2, '*', 3); L.on(s + 3, '^')
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l1_6():
    L = Level('1-6', 'Le télésiège du sommet', 'dawn', 85,
              comment='Ascension : télésièges, saut mural, poutrelles et ressorts jusqu\'au sommet.')
    L.run(3); L.on(3, 'P')
    s = L.run(7); L.sign(s + 1, 'TELESIEGE : SAUTE SUR UN SIEGE, IL T\'EMMENE EN HAUT ET TE DEPOSE EN GARE')
    L.on(s + 5, 't')
    L.pit(16); L.coins(L.x - 12, L.g - 8, 3)
    L.up(8); s = L.run(5); L.on(s + 1, 't')
    s = L.run(5); L.on(s + 2, 'C')
    L.run(3); L.on(L.x - 1, 'e'); L.run(3)
    # puits à sauts muraux : on entre sous le pilier de gauche puis on rebondit entre les deux murs
    s = L.run(5); L.sign(s, 'SAUT MURAL : CONTRE UN MUR, SAUTE POUR REBONDIR. ENCHAINE POUR GRIMPER')
    L.block(s + 1, L.g - 12, 1, 9, '#')
    # étoile 1 : au sommet du pilier de gauche
    L.set(s + 1, L.g - 13, '*')
    L.coins(s + 3, L.g - 4, 1); L.coins(s + 3, L.g - 7, 1); L.coins(s + 3, L.g - 10, 1)
    L.up(11); L.run(6); L.on(L.x - 2, 'e')
    L.run(3); L.pit(4); L.run(4)
    s = L.run(12); L.girder(s + 2, L.g - 3, 3); L.girder(s + 6, L.g - 6, 3); L.girder(s + 2, L.g - 9, 3)
    L.set(s + 3, L.g - 10, '*'); L.coins(s + 6, L.g - 7, 3); L.on(s + 9, 'e')
    L.sign(s, 'ETOILE EN HAUT DES POUTRELLES : SAUTE DE L\'UNE A L\'AUTRE')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(9); s = L.run(6); L.coins(s, L.g - 2, 6)
    s = L.run(4); L.on(s + 2, 'C')
    s = L.run(4); L.on(s + 2, 't')
    L.pit(14)
    L.up(7); s = L.run(5); L.on(s + 1, 't')
    L.run(3); L.pit(3); L.run(5); L.on(L.x - 2, '^'); L.run(3)
    p = L.pit(10); L.set(p + 3, L.g - 1, 'M')
    L.up(2); L.run(3); L.on(L.x - 2, 'e')
    s = L.run(4); L.on(s + 2, 't')
    L.pit(12)
    L.up(6); s = L.run(5); L.on(s + 1, 't')
    # sommet : étoile 3 au-dessus de l'arrivée
    s = L.run(12); L.on(s + 8, 'G'); L.girder(s + 1, L.g - 4, 3); L.girder(s + 4, L.g - 7, 2); L.set(s + 4, L.g - 8, '*')
    L.coins(s + 1, L.g - 5, 3)
    L.finish(6)
    return L


LEVELS = [l1_2, l1_3, l1_4, l1_5, l1_6]
