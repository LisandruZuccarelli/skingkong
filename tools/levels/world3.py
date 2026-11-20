"""Monde 3 — Les glaciers éternels : glace, eau glacée, pingouins, plateformes verticales, cristaux."""
from builder import Level


def l3_1():
    L = Level('3-1', 'La banquise glissante', 'glacier', 60, comment='Sols de glace et pingouins qui glissent sur le ventre.')
    L.run(3); L.on(3, 'P')
    s = L.run(5)
    L.ice(12); L.pit(4, water=True); L.ice(8); L.on(L.x - 2, 'k', 3)
    s = L.run(4)
    L.ice(14); L.on(L.x - 3, 'p'); L.coins(L.x - 12, L.g - 2, 8)
    L.up(2); L.ice(6); L.pit(5, water=True); L.ice(6); L.on(L.x - 2, 'p')
    s = L.run(4); L.on(s + 2, 'C')
    L.slope_down(4); L.ice(10); L.pit(5, water=True); L.ice(4)
    # étoile 1 : bloc de glace au-dessus de l'eau, saut précis
    p = L.pit(9, water=True); L.block(p + 4, L.g - 3, 1, 1, '='); L.set(p + 4, L.g - 4, '*')
    L.ice(6); L.on(L.x - 3, 'p'); L.on(L.x - 1, 'k', 3)
    L.up(3); L.run(3); L.ice(10); L.on(L.x - 4, 'p')
    L.pit(4, water=True); L.ice(4); L.pit(4, water=True); L.ice(6)
    s = L.run(4); L.on(s + 2, 'C')
    s = L.ice(14); L.girder(s + 3, L.g - 4, 4); L.girder(s + 8, L.g - 7, 4); L.coins(s + 8, L.g - 8, 4)
    L.set(s + 12, L.g - 11, '*'); L.girder(s + 11, L.g - 10, 3)
    L.on(s + 6, 'p'); L.on(s + 12, 'p')
    L.slope_down(3); L.ice(4); L.pit(6, water=True); L.ice(5)
    L.down(0); s = L.ice(8); L.on(s + 6, 'p')
    # étoile 3 : sous la banquise, faux mur
    s = L.run(10); L.block(s + 2, L.g, 5, 2, '.'); L.block(s + 2, L.g, 1, 2, 'H'); L.set(s + 4, L.g + 1, '*'); L.set(s + 3, L.g + 1, '$'); L.set(s + 5, L.g + 1, '$')
    L.on(s + 8, 'k', 3)
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l3_2():
    L = Level('3-2', 'Le lac gelé', 'glacier', 70, comment='Eau glacée, plateformes verticales et mobiles.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    L.pit(4, water=True); L.run(3); L.pit(5, water=True); L.run(4); L.on(L.x - 2, 'p')
    s = L.run(4)
    p = L.pit(4, water=True); L.set(p, L.g, 'V')
    L.up(8); L.run(5); L.coins(L.x - 5, L.g - 2, 5); L.on(L.x - 1, 'k', 3)
    L.down(4); L.run(3); p = L.pit(10, water=True); L.set(p + 3, L.g, 'M'); L.run(4)
    L.down(4); L.run(3)
    s = L.run(4); L.on(s + 2, 'C')
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(8); L.run(3)
    # étoile 1 : au-dessus de la plateforme verticale, à attraper en double saut
    L.set(p + 1, L.g - 6, '*')
    p = L.pit(10, water=True); L.set(p + 3, L.g, 'M'); L.run(3); L.on(L.x - 1, 'p')
    p = L.pit(10, water=True); L.set(p + 3, L.g - 1, 'M'); L.coins(p + 2, L.g - 4, 6)
    L.run(4); L.down(8); L.run(1)
    s = L.ice(10); L.on(s + 5, 'p'); L.on(s + 8, 'k', 3)
    L.pit(5, water=True); L.ice(3); L.pit(5, water=True); L.run(4)
    s = L.run(4); L.on(s + 2, 'C')
    # étoile 2 : îlot dans le lac, plateforme verticale cachée sous un pont
    p = L.pit(12, water=True); L.girder(p + 4, L.g, 4); L.set(p + 5, L.g - 6, '*'); L.girder(p + 4, L.g - 5, 4)
    L.run(4); L.on(L.x - 2, 'p')
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(8); L.run(4)
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(4); L.run(5)
    L.coins(L.x - 5, L.g - 2, 5)
    L.down(6); L.run(3); L.down(6); s = L.run(10); L.on(s + 3, 'p'); L.on(s + 7, 'k', 3)
    # étoile 3 : derrière la cascade gelée (faux mur)
    L.block(s + 8, L.g - 4, 2, 4, 'H'); L.set(s + 9, L.g - 1, '*')
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l3_3():
    L = Level('3-3', 'La crevasse bleue', 'glacier', 75, comment='Descente puis remontée d\'une crevasse en sauts muraux.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    # descente : une série de paliers entre deux parois
    for i in range(4):
        L.run(3); L.down(4); L.run(3); L.on(L.x - 2, 'k', 3)
    L.coins(L.x - 3, L.g - 1, 3)
    s = L.run(6); L.on(s + 3, 'p'); L.on(s + 5, 'C')
    # fond de crevasse : eau et blocs
    L.pit(4, water=True); L.run(3); L.pit(4, water=True); L.run(3); L.on(L.x - 2, 'p')
    # remontée : puits de saut mural
    s = L.run(5)
    L.block(s + 1, L.g - 13, 1, 10, '#')
    L.coins(s + 3, L.g - 4, 1); L.coins(s + 3, L.g - 8, 1); L.coins(s + 3, L.g - 11, 1)
    L.set(s + 1, L.g - 14, '*')
    L.up(12); L.run(5); L.on(L.x - 2, 'p')
    L.pit(4, water=True); L.ice(6); L.on(L.x - 1, 'k', 3)
    s = L.run(5); L.on(s + 2, 'C')
    # deuxième crevasse plus profonde
    for i in range(3):
        L.run(3); L.down(5); L.run(2)
    s = L.ice(8); L.on(s + 4, 'p')
    L.pit(5, water=True); L.ice(4)
    s = L.run(5)
    L.block(s + 1, L.g - 14, 1, 11, '#')
    L.coins(s + 3, L.g - 5, 1); L.coins(s + 3, L.g - 9, 1)
    L.up(14); L.run(4)
    # étoile 2 : corniche au sommet, à gauche du puits
    L.girder(s - 3, L.g - 2, 3); L.set(s - 2, L.g - 3, '*')
    L.run(3); L.pit(4, water=True); L.run(3); L.on(L.x - 1, 'p')
    s = L.run(10); L.girder(s + 2, L.g - 4, 3); L.girder(s + 6, L.g - 8, 3); L.set(s + 7, L.g - 9, '*'); L.on(s + 8, 'k', 3)
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l3_4():
    L = Level('3-4', 'Tyroliennes sur la mer de glace', 'glacier', 65, comment='Longues tyroliennes au-dessus de l\'eau, icebergs et pingouins.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    L.on(s + 5, 'z')
    L.pit(26, depth=6); L.coins(L.x - 20, L.g - 4, 3); L.coins(L.x - 10, L.g - 1, 3)
    L.down(3); s = L.run(5); L.on(s + 2, 'z')
    L.ice(6); L.on(L.x - 2, 'p')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(8); s = L.run(4); L.on(s + 2, 'z')
    L.pit(28, depth=6)
    # étoile 1 : iceberg au milieu de la mer, lâcher au bon moment
    L.block(L.x - 15, L.g + 2, 3, 2, '='); L.set(L.x - 14, L.g + 1, '*')
    L.down(6); s = L.run(5); L.on(s + 2, 'z')
    s = L.run(5); L.on(s + 2, 'C')
    L.ice(6); L.pit(5, water=True); L.ice(5); L.on(L.x - 2, 'p')
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(22, depth=6); L.down(2); L.coins(L.x - 16, L.g - 3, 6)
    s = L.run(5); L.on(s + 1, 'z')
    p = L.pit(10, depth=6); L.set(p + 3, L.g, 'M')
    L.run(3); s = L.run(3); L.on(s + 1, 'S')
    L.up(9); s = L.run(4); L.on(s + 2, 'z')
    # étoile 2 : très haut, au départ de la tyrolienne (double saut depuis le poteau)
    L.set(s + 2, L.g - 6, '*')
    L.pit(30, depth=8); L.down(7)
    s = L.run(5); L.on(s + 2, 'z')
    s = L.run(5); L.on(s + 2, 'C')
    L.ice(8); L.on(L.x - 3, 'p'); L.pit(4, water=True); L.ice(4)
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(20, depth=6); L.down(2)
    s = L.run(5); L.on(s + 1, 'z')
    # étoile 3 : derrière l'arrivée, puits de saut mural
    s = L.run(10); L.on(s + 3, 'G')
    L.block(s + 6, L.g - 13, 1, 10, '#'); L.block(s + 9, L.g - 14, 1, 11, '#'); L.set(s + 7, L.g - 14, '*')
    L.finish(6)
    return L


def l3_5():
    L = Level('3-5', 'Effondrement du glacier', 'glacier', 55, avalanche={'speed': 126, 'lag': 280},
              comment='Le glacier s\'effondre derrière toi : course sur la glace friable.')
    L.run(3); L.on(3, 'P')
    s = L.run(5)
    L.ice(8); L.crumble(5, water=True); L.ice(4); L.crumble(5, water=True); L.ice(4)
    L.slope_down(4); L.ice(4); L.pit(4, water=True); L.ice(6); L.on(L.x - 2, 'p')
    L.crumble(6, water=True); L.run(3); L.up(2); L.ice(6)
    # étoile 1 : au-dessus d'un pont friable
    L.set(L.x - 3, L.g - 6, '*'); L.girder(L.x - 4, L.g - 5, 3)
    L.crumble(5, water=True); L.ice(4)
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(6); L.ice(3); L.pit(5, water=True); L.ice(4); L.on(L.x - 2, 'p')
    L.crumble(4, water=True); L.ice(2); L.crumble(4, water=True); L.ice(2); L.crumble(4, water=True); L.ice(4)
    s = L.run(3); L.on(s + 1, 'S')
    L.up(7); L.ice(8); L.coins(L.x - 8, L.g - 2, 8)
    L.slope_down(5); L.pit(5, water=True); L.ice(4)
    s = L.run(5); L.on(s + 2, 'C')
    p = L.pit(10, water=True); L.set(p + 3, L.g, 'M')
    L.ice(4); L.crumble(6, water=True); L.ice(4); L.on(L.x - 1, 'p')
    # étoile 2 : petit détour en hauteur
    L.up(3); s = L.ice(6); L.girder(s + 2, L.g - 5, 3); L.set(s + 3, L.g - 6, '*'); L.down(3)
    L.ice(3); L.slope_down(4); L.crumble(5, water=True); L.ice(3); L.pit(5, water=True); L.ice(4)
    L.crumble(3, water=True); L.ice(2); L.crumble(3, water=True); L.ice(4)
    # étoile 3 : entre deux pics, sur la route
    s = L.run(8); L.on(s + 2, '^'); L.on(s + 3, '*', 3); L.on(s + 4, '^')
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l3_6():
    L = Level('3-6', 'Le cœur de cristal', 'glacier', 90, dark=0.5, comment='Grotte de cristal sombre : clés, portes, pingouins, plateformes verticales.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    L.on(s + 1, 'k', 3); L.on(s + 5, 'k', 3)
    a = L.x
    L.ice(10); L.on(L.x - 4, 'p'); L.on(L.x - 2, 'K'); L.pit(4, water=True); L.ice(6)
    L.roof(a, L.x - a, 6)
    s = L.run(4); L.door(s + 2); L.on(s + 1, 'k', 3)
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(8); L.run(4); L.on(L.x - 2, 'k', 3)
    a = L.x
    L.ice(12); L.on(a + 5, 'p'); L.on(a + 9, 'K')
    for x in (a + 2, a + 6, a + 10):
        pass
    L.roof(a, 12, 6)
    for x in (a + 3, a + 7):
        L.icicle(x)
    s = L.run(4); L.door(s + 2)
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'k', 3)
    # étoile 1 : niche de cristal au-dessus de l'eau
    p = L.pit(10, water=True); L.set(p + 3, L.g, 'M'); L.girder(p + 7, L.g - 6, 2); L.set(p + 7, L.g - 7, '*')
    L.run(3); L.down(4); L.ice(8); L.on(L.x - 3, 'p'); L.on(L.x - 1, 'k', 3)
    L.pit(4, water=True); L.ice(4); L.on(L.x - 2, 'K')
    s = L.run(4); L.door(s + 2)
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(8); L.run(3)
    p = L.pit(4, water=True); L.set(p, L.g, 'V'); L.up(4); L.run(4); L.on(L.x - 2, 'k', 3)
    s = L.run(5); L.on(s + 2, 'C')
    # étoile 2 : salle des cristaux, sous le sol (pont friable)
    s = L.run(10); L.block(s + 3, L.g, 3, 1, 'x'); L.block(s + 2, L.g + 1, 5, 2, '.'); L.block(s + 2, L.g + 3, 5, 1, '#')
    L.set(s + 4, L.g + 2, '*'); L.set(s + 3, L.g + 2, '$'); L.set(s + 5, L.g + 2, '$'); L.block(s + 6, L.g + 1, 1, 1, '#')
    L.on(s + 8, 'p'); L.on(s + 1, 'k', 3)
    L.down(6); L.run(2); L.ice(10); L.on(L.x - 5, 'p'); L.on(L.x - 2, 'K')
    a = L.x
    L.pit(4, water=True); L.ice(3); L.pit(4, water=True); L.ice(4)
    L.roof(a - 6, L.x - a + 6, 7)
    s = L.run(4); L.door(s + 2); L.on(s + 1, 'k', 3)
    L.up(3); L.run(3); L.up(3); L.run(4); L.on(L.x - 2, 'p')
    # étoile 3 : en haut de deux colonnes de cristal (saut mural)
    s = L.run(10); L.block(s + 3, L.g - 13, 1, 10, '#'); L.block(s + 6, L.g - 14, 1, 11, '#'); L.set(s + 4, L.g - 14, '*')
    L.on(s + 1, 'k', 3); L.on(s + 9, 'k', 3)
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


LEVELS = [l3_1, l3_2, l3_3, l3_4, l3_5, l3_6]
