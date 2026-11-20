"""Monde 2 — La forêt dans la tempête : vent, hiboux, clés et portes, stalactites."""
from builder import Level


def l2_1():
    L = Level('2-1', 'Lisière dans le blizzard', 'storm', 60, comment='Le vent pousse Kong : dos au vent on vole, face au vent on lutte.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    a = L.x
    L.run(4); L.pit(6); L.run(4); L.pit(7); L.coins(L.x - 6, L.g - 4, 5); L.run(5)
    L.wind(a, L.x, 300)
    L.on(L.x - 2, 'e'); L.run(4)
    s = L.run(5)
    a = L.x
    L.run(3); L.pit(4); L.run(3); L.up(2); L.run(4); L.pit(4); L.run(5); L.on(L.x - 3, 'e')
    L.wind(a, L.x, -260)
    s = L.run(5); L.on(s + 2, 'C')
    # étoile 1 : rafale ascendante dans le dos, très loin au-dessus d'un trou
    a = L.x
    L.run(3); p = L.pit(12); L.girder(p + 4, L.g - 3, 3); L.set(p + 9, L.g - 7, '*'); L.girder(p + 8, L.g - 6, 3)
    L.coins(p + 4, L.g - 4, 3)
    L.run(5)
    L.wind(a, L.x, 340)
    L.slope_down(4); L.run(3); L.on(L.x - 2, 'e'); L.run(3)
    s = L.run(10); L.girder(s + 2, L.g - 4, 4); L.girder(s + 6, L.g - 8, 3); L.set(s + 7, L.g - 9, '*'); L.on(s + 7, 'e')
    a = L.x
    L.pit(5); L.run(3); L.pit(5); L.run(3); L.pit(5); L.run(4)
    L.wind(a, L.x, -220)
    L.coins(a, L.g - 5, 5)
    s = L.run(5); L.on(s + 2, 'C')
    L.up(3); L.run(5); L.up(3); L.run(4); L.on(L.x - 2, 'e')
    a = L.x
    L.pit(9); L.down(3); L.run(4); L.pit(5); L.run(3)
    L.wind(a, L.x, 380)
    L.coins(a + 2, L.g - 7, 5)
    # étoile 3 : derrière un faux mur, sous l'arrivée
    s = L.run(8); L.block(s + 2, L.g, 4, 2, '.'); L.block(s + 2, L.g, 1, 2, 'H'); L.set(s + 4, L.g + 1, '*'); L.set(s + 3, L.g + 1, '$'); L.set(s + 5, L.g + 1, '$')
    L.block(s + 2, L.g + 2, 4, 1, '#')
    L.on(s + 6, 'e')
    s = L.run(5); L.on(s + 3, 'G')
    L.finish()
    return L


def l2_2():
    L = Level('2-2', 'Le bois des hiboux', 'storm', 70, comment='Hiboux en vol : ne saute pas dedans, ou écrase-les par le dessus.')
    L.run(3); L.on(3, 'P')
    s = L.run(10)
    L.set(s + 7, L.g - 4, 'o')
    L.run(4); L.pit(4); L.run(6); L.set(L.x - 3, L.g - 5, 'o')
    L.run(3); L.up(2); L.run(5); L.on(L.x - 2, 'e')
    p = L.pit(6); L.set(p + 2, L.g - 7, 'o'); L.coins(p + 1, L.g - 3, 4)
    L.run(5)
    s = L.run(12); L.girder(s + 2, L.g - 3, 3); L.girder(s + 6, L.g - 6, 3); L.set(s + 10, L.g - 9, 'o')
    L.girder(s + 9, L.g - 10, 3); L.set(s + 10, L.g - 11, '*'); L.coins(s + 6, L.g - 7, 3)
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(5); L.run(3); p = L.pit(5); L.set(p + 2, L.g - 6, 'o'); L.run(4)
    L.on(L.x - 2, 'e')
    s = L.run(10); L.set(s + 3, L.g - 4, 'o'); L.set(s + 8, L.g - 4, 'o'); L.coins(s + 1, L.g - 1, 9)
    L.up(4); s = L.run(6); L.on(s + 3, 'e')
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.set(p + 5, L.g - 6, 'o')
    L.run(5)
    s = L.run(5); L.on(s + 2, 'C')
    # étoile 2 : hiboux en escalier, il faut rebondir de l'un à l'autre
    L.run(3); L.up(5); L.run(1); L.down(5)
    L.set(L.x - 6, L.g - 3, 'o'); L.set(L.x - 4, L.g - 6, 'o')
    s = L.run(5); L.girder(s, L.g - 11, 3); L.set(s + 1, L.g - 12, '*')
    L.run(3); p = L.pit(5); L.set(p + 2, L.g - 4, 'o'); L.run(3)
    L.slope_down(4); L.run(2); p = L.pit(6); L.set(p + 2, L.g - 6, 'o'); L.run(3)
    s = L.run(12); L.set(s + 4, L.g - 4, 'o'); L.on(s + 7, 'e'); L.on(s + 9, '^')
    # étoile 3 : en haut d'un arbre mort (saut mural entre deux troncs)
    L.block(s + 2, L.g - 12, 1, 9, '#'); L.block(s + 5, L.g - 13, 1, 9, '#'); L.set(s + 3, L.g - 13, '*')
    L.coins(s + 3, L.g - 5, 2); L.coins(s + 3, L.g - 9, 2)
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l2_3():
    L = Level('2-3', 'Le chalet verrouillé', 'storm', 80, comment='Clés et portes : chaque clé ouvre une porte.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    L.on(s + 5, 'K')
    s = L.run(6); L.door(s + 3)
    L.run(4)
    # clé en hauteur : monter par les poutrelles
    s = L.run(14); L.girder(s + 2, L.g - 3, 3); L.girder(s + 6, L.g - 6, 3); L.girder(s + 10, L.g - 9, 3); L.set(s + 11, L.g - 10, '$')
    L.coins(s + 2, L.g - 4, 3); L.coins(s + 6, L.g - 7, 3); L.on(s + 12, 'e')
    s = L.run(4); L.on(s + 2, 'K')
    s = L.run(5); L.door(s + 2)
    s = L.run(5); L.on(s + 2, 'C')
    L.pit(4); L.run(3); L.up(3); L.run(4); L.pit(5); L.run(3); L.on(L.x - 1, 'e')
    # étoile 1 : chambre secrète derrière un faux mur
    p = L.pit(7); L.coins(p + 2, L.g - 5, 3); L.run(3); L.on(L.x - 2, 'K')
    s = L.run(10); L.block(s + 4, L.g - 3, 5, 1, '#'); L.block(s + 4, L.g - 2, 1, 2, 'H'); L.block(s + 8, L.g - 2, 1, 2, 'H')
    L.set(s + 6, L.g - 1, '*'); L.set(s + 5, L.g - 1, '$'); L.set(s + 7, L.g - 1, '$')
    L.run(5); L.on(L.x - 2, '^')
    L.up(4); L.run(1); L.down(4); s = L.run(5); L.door(s + 2)
    L.run(4); L.slope_down(4); L.run(2)
    s = L.run(5); L.on(s + 2, 'C')
    p = L.pit(10); L.set(p + 3, L.g - 1, 'M')
    L.run(4); L.on(L.x - 2, 'K'); s = L.run(5); L.door(s + 2)
    L.run(3); L.on(L.x - 1, 'e')
    # étoile 2 : poutrelles au-dessus de la dernière porte
    s = L.run(12); L.girder(s + 1, L.g - 3, 3); L.girder(s + 5, L.g - 6, 3); L.girder(s + 9, L.g - 9, 3); L.set(s + 10, L.g - 10, '*')
    L.on(s + 6, 'e')
    L.on(L.x - 3, 'K')
    s = L.run(6); L.door(s + 3)
    # étoile 3 : derrière le chalet, faux mur
    s = L.run(10); L.on(s + 4, 'G')
    L.run(3); L.block(L.x, L.g - 14, 2, 14, '#'); L.block(L.x, L.g - 3, 2, 3, 'H')
    L.run(4); L.on(L.x - 2, '*'); L.run(1); L.wall(2)
    return L


def l2_4():
    L = Level('2-4', 'La grotte aux stalactites', 'storm', 70, dark=0.45, comment='Grotte sombre : les stalactites tombent quand tu passes dessous.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    L.on(s + 1, 'L')
    a = L.x
    L.run(30); L.roof(a - 4, 34, 6)
    for x in (a + 4, a + 9, a + 13, a + 18, a + 22, a + 27):
        L.icicle(x)
    L.on(a + 15, 'L'); L.on(a + 11, 'e'); L.coins(a + 3, L.g - 2, 6); L.coins(a + 20, L.g - 2, 6)
    s = L.run(4); L.on(s + 2, 'L')
    L.pit(4); L.run(4); L.up(2); L.run(3); L.pit(5); L.run(4)
    a = L.x
    L.run(26); L.roof(a - 2, 28, 6)
    for x in (a + 3, a + 6, a + 9, a + 14, a + 17, a + 20, a + 23):
        L.icicle(x)
    L.on(a + 10, '^'); L.on(a + 11, '^'); L.on(a + 1, 'L'); L.on(a + 24, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    # étoile 1 : niche dans le plafond, entre deux stalactites
    a = L.x
    L.run(20); L.roof(a, 20, 6); L.block(a + 9, L.g - 8, 2, 2, '.'); L.set(a + 9, L.g - 7, '*')
    L.girder(a + 8, L.g - 4, 4)
    for x in (a + 3, a + 6, a + 13, a + 16):
        L.icicle(x)
    L.on(a + 18, 'e'); L.on(a + 1, 'L')
    L.slope_down(4); L.run(2); L.pit(4); L.run(3)
    a = L.x
    L.crumble(5); L.run(3); L.crumble(5); L.run(3)
    L.roof(a, L.x - a, 6)
    for x in (a + 2, a + 6, a + 10, a + 14):
        L.icicle(x)
    s = L.run(6); L.on(s + 2, 'C'); L.on(s + 4, 'L')
    # puits sombre avec plateforme verticale
    s = L.run(3); p = L.pit(4); L.set(p, L.g, 'V')
    L.up(9); L.run(4); L.coins(L.x - 4, L.g - 2, 4)
    L.on(L.x - 2, 'L')
    a = L.x
    L.run(24); L.roof(a, 24, 6)
    for x in range(a + 2, a + 23, 3):
        L.icicle(x)
    L.on(a + 8, 'e'); L.on(a + 16, 'e')
    # étoile 2 : sous le sol, par un pont friable
    L.block(a + 11, L.g, 3, 1, 'x'); L.block(a + 10, L.g + 1, 5, 2, '.'); L.set(a + 12, L.g + 2, '*'); L.set(a + 11, L.g + 2, '$'); L.set(a + 13, L.g + 2, '$')
    L.block(a + 10, L.g + 3, 5, 1, '#')
    L.block(a + 14, L.g + 1, 1, 2, '#')
    L.block(a + 14, L.g + 1, 1, 1, '.')
    L.down(9); L.run(2)
    s = L.run(10); L.on(s + 2, 'L'); L.on(s + 8, 'L')
    # étoile 3 : en haut du puits final (saut mural)
    L.block(s + 4, L.g - 13, 1, 10, '#'); L.block(s + 7, L.g - 14, 1, 11, '#'); L.set(s + 5, L.g - 14, '*')
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l2_5():
    L = Level('2-5', 'Avalanche dans la tempête', 'storm', 55, avalanche={'speed': 122, 'lag': 270},
              comment='Poursuite avec vent de dos et de face.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    L.slope_down(4); L.run(3); L.pit(4); L.run(4)
    a = L.x
    L.run(4); L.pit(5); L.run(5); L.pit(5); L.run(4)
    L.wind(a, L.x, 300)
    L.on(L.x - 2, 'e')
    L.slope_down(6); L.run(3); L.crumble(5); L.run(3)
    a = L.x
    L.run(4); L.up(2); L.run(4); L.pit(4); L.run(4)
    L.wind(a, L.x, -200)
    L.set(L.x - 8, L.g - 4, 'o')
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(6); L.run(2); L.pit(5); L.run(4); L.on(L.x - 2, 'e')
    # étoile 1 : poutrelle portée par le vent
    a = L.x
    p = L.pit(10); L.girder(p + 6, L.g - 6, 3); L.set(p + 7, L.g - 7, '*')
    L.run(4)
    L.wind(a - 3, L.x, 360)
    L.slope_down(4); L.run(3)
    a = L.x
    L.run(16); L.roof(a, 16, 6)
    for x in range(a + 2, a + 15, 3):
        L.icicle(x)
    s = L.run(5); L.on(s + 2, 'C')
    L.crumble(4); L.run(2); L.crumble(4); L.run(3); L.slope_down(5); L.pit(5); L.run(3)
    # étoile 2 : petit détour par le haut
    L.up(3); s = L.run(5); L.set(s + 2, L.g - 6, '*'); L.girder(s + 1, L.g - 5, 3); L.down(3)
    L.run(3); L.pit(4); L.run(3); L.set(L.x - 6, L.g - 8, 'o')
    a = L.x
    L.slope_down(6); L.pit(6); L.run(4); L.pit(6); L.run(4)
    L.wind(a, L.x, 320)
    # étoile 3 : sur le chemin, entre deux pics
    s = L.run(8); L.on(s + 2, '^'); L.on(s + 3, '*', 3); L.on(s + 4, '^')
    s = L.run(6); L.on(s + 3, 'G')
    L.finish()
    return L


def l2_6():
    L = Level('2-6', 'Le col du blizzard', 'storm', 95, comment='Tout le monde 2 réuni : vent, hiboux, stalactites, clés.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    a = L.x
    L.run(4); L.pit(5); L.run(3); L.up(2); L.run(3); L.pit(5); L.run(4)
    L.wind(a, L.x, -240)
    L.set(L.x - 5, L.g - 4, 'o')
    s = L.run(6); L.on(s + 3, 'K')
    a = L.x
    L.run(18); L.roof(a, 18, 6)
    for x in range(a + 2, a + 17, 3):
        L.icicle(x)
    L.on(a + 9, 'e')
    s = L.run(4); L.door(s + 2)
    s = L.run(5); L.on(s + 2, 'C')
    a = L.x
    L.run(3); p = L.pit(8); L.set(p + 3, L.g - 7, 'o'); L.run(3); p = L.pit(8); L.set(p + 4, L.g - 8, 'o'); L.run(4)
    L.wind(a, L.x, 300)
    # étoile 1 : en l'air, à attraper en se laissant porter par le vent
    L.set(a + 13, L.g - 8, '*')
    s = L.run(10); L.girder(s + 2, L.g - 3, 3); L.girder(s + 6, L.g - 6, 3); L.set(s + 7, L.g - 7, '$')
    L.on(s + 4, 'e')
    s = L.run(4); L.on(s + 1, 'K')
    s = L.run(4); L.door(s + 2)
    L.slope_down(5); L.run(2); L.pit(4); L.run(3)
    s = L.run(5); L.on(s + 2, 'C')
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.set(p + 5, L.g - 5, 'o')
    L.run(3); L.up(3); L.run(3)
    a = L.x
    L.run(20); L.roof(a, 20, 6)
    for x in range(a + 1, a + 19, 3):
        L.icicle(x)
    # étoile 2 : sous les stalactites, dans une niche du sol
    L.block(a + 9, L.g, 2, 1, 'x'); L.block(a + 8, L.g + 1, 4, 2, '.'); L.set(a + 9, L.g + 2, '*'); L.block(a + 8, L.g + 3, 4, 1, '#')
    L.block(a + 11, L.g + 1, 1, 1, '#')
    L.down(3); L.run(3)
    a = L.x
    L.run(3); L.pit(4); L.run(3); L.pit(4); L.run(3); L.pit(4); L.run(4)
    L.wind(a, L.x, -260)
    L.set(a + 6, L.g - 7, 'o'); L.set(a + 15, L.g - 7, 'o')
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'K')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(8); L.run(4); L.door(L.x - 1)
    L.run(3); L.down(8); L.run(4)
    # étoile 3 : tout en haut du mur, au-dessus du ressort
    L.set(L.x - 9, L.g - 21, '*'); L.girder(L.x - 10, L.g - 20, 3)
    s = L.run(8); L.on(s + 4, 'G')
    L.finish()
    return L


LEVELS = [l2_1, l2_2, l2_3, l2_4, l2_5, l2_6]
