"""Monde 4 — L'afterski sous les étoiles : fêtards, lasers, néons, télésièges et obscurité."""
from builder import Level


def lasers_v(L, x, h=6):
    """Projecteur laser vertical suspendu à un câble (faisceau vers le bas jusqu'au sol)."""
    L.set(x, L.ground(x) - h, 'j')


def laser_h(L, x0, x1, row):
    """Laser horizontal entre un projecteur (x0) et un pilier suspendu (x1), à la rangée `row`."""
    L.set(x0, row, 'l')
    L.block(x0, row - 3, 1, 3, '#')
    L.block(x1, row - 3, 1, 4, '#')


def l4_1():
    L = Level('4-1', 'La station by night', 'night', 60, comment='Première nuit d\'afterski : fêtards, néons et lampadaires.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    L.on(s + 1, 'L'); L.set(s + 5, L.g - 6, 'N')
    s = L.run(10); L.on(s + 5, 'f'); L.on(s + 9, 'L')
    L.pit(4); L.run(5); L.on(L.x - 2, 'f')
    s = L.run(12); L.girder(s + 2, L.g - 3, 4); L.girder(s + 7, L.g - 6, 4); L.set(s + 9, L.g - 10, 'N')
    L.coins(s + 7, L.g - 7, 4); L.on(s + 4, 'f'); L.on(s + 10, 'f'); L.on(s + 1, 'L')
    L.up(3); L.run(4); L.pit(5); L.run(4); L.on(L.x - 1, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    # étoile 1 : sur l'enseigne néon (poutrelles hautes)
    s = L.run(12); L.girder(s + 1, L.g - 3, 3); L.girder(s + 5, L.g - 6, 3); L.girder(s + 9, L.g - 9, 3); L.set(s + 10, L.g - 10, '*')
    L.set(s + 6, L.g - 12, 'N'); L.on(s + 7, 'f')
    L.slope_down(4); L.run(3); L.pit(5); L.run(3); L.on(L.x - 1, 'L')
    s = L.run(10); L.on(s + 3, 'f'); L.on(s + 6, 'f'); L.coins(s + 2, L.g - 4, 6)
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.set(p + 5, L.g - 6, 'N')
    L.run(4); L.on(L.x - 2, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    s = L.run(3); L.on(s + 1, 'S')
    L.up(8); s = L.run(8); L.coins(s, L.g - 2, 8); L.on(s + 4, 'f')
    # étoile 2 : au-dessus du toit du bar
    L.set(s + 6, L.g - 6, '*'); L.girder(s + 5, L.g - 5, 3)
    L.down(4); L.run(3); L.down(4); L.run(3); L.on(L.x - 1, 'L')
    L.pit(4); L.run(3); L.pit(5); L.run(4)
    s = L.run(10); L.on(s + 4, 'f'); L.on(s + 7, 'f'); L.on(s + 1, 'L'); L.set(s + 5, L.g - 7, 'N')
    # étoile 3 : faux mur sous la piste de danse
    L.block(s + 2, L.g, 4, 2, '.'); L.block(s + 2, L.g, 1, 2, 'H'); L.set(s + 4, L.g + 1, '*'); L.set(s + 3, L.g + 1, '$'); L.set(s + 5, L.g + 1, '$')
    L.block(s + 2, L.g + 2, 4, 1, '#')
    s = L.run(6); L.on(s + 3, 'G'); L.on(s + 1, 'L')
    L.finish()
    return L


def l4_2():
    L = Level('4-2', 'Le club laser', 'night', 75, dark=0.4, comment='Lasers qui s\'allument en rythme : regarde-les clignoter avant de passer.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    L.on(s + 1, 'L')
    s = L.run(16); lasers_v(L, s + 4); lasers_v(L, s + 10); L.set(s + 7, L.g - 8, 'N'); L.on(s + 14, 'L')
    s = L.run(8); L.on(s + 4, 'f')
    s = L.run(10); laser_h(L, s + 1, s + 8, L.g - 3); L.coins(s + 2, L.g - 1, 5)
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'L')
    p = L.pit(5); laser_h(L, p - 1, p + 6, L.g - 3)
    L.run(5); L.on(L.x - 2, 'f')
    s = L.run(14); lasers_v(L, s + 3); lasers_v(L, s + 7); lasers_v(L, s + 11); L.set(s + 5, L.g - 9, 'N')
    # étoile 1 : au-dessus des projecteurs
    L.girder(s + 4, L.g - 11, 6); L.set(s + 7, L.g - 12, '*'); L.girder(s + 1, L.g - 4, 2); L.girder(s + 1, L.g - 8, 2)
    L.up(3); L.run(4); L.pit(4); L.run(4); L.on(L.x - 1, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    s = L.run(12); laser_h(L, s + 1, s + 10, L.g - 3); L.on(s + 6, 'f')
    L.down(3); L.run(3)
    s = L.run(16); lasers_v(L, s + 3, 7); lasers_v(L, s + 6, 7); lasers_v(L, s + 9, 7); lasers_v(L, s + 12, 7)
    L.coins(s + 2, L.g - 1, 12); L.on(s + 15, 'L')
    # étoile 2 : au fond d'une fosse gardée par un laser
    p = L.pit(6); L.block(p, L.g + 4, 6, 1, '#'); L.block(p, L.g + 1, 6, 3, '.')
    for i in range(6):
        for r in range(L.g + 5, L.g + 9):
            L.set(p + i, r, '#')
    L.set(p + 3, L.g + 3, '*')
    L.run(5); L.on(L.x - 2, 'f')
    s = L.run(5); L.on(s + 2, 'C')
    p = L.pit(10); L.set(p + 3, L.g, 'M'); lasers_v(L, p + 5, 7)
    L.run(4)
    s = L.run(10); laser_h(L, s + 1, s + 8, L.g - 3); L.on(s + 4, 'f'); L.set(s + 5, L.g - 9, 'N')
    # étoile 3 : derrière la cabine du DJ (faux mur)
    s = L.run(10); L.block(s + 5, L.g - 4, 3, 4, '#'); L.block(s + 5, L.g - 3, 1, 3, 'H'); L.block(s + 6, L.g - 3, 1, 3, '.'); L.set(s + 6, L.g - 1, '*')
    L.block(s + 7, L.g - 3, 1, 3, 'H')
    s = L.run(6); L.on(s + 3, 'G'); L.on(s + 1, 'L')
    L.finish()
    return L


def l4_3():
    L = Level('4-3', 'Le télésiège de minuit', 'night', 80, comment='Télésièges et tyroliennes sous les aurores boréales.')
    L.run(3); L.on(3, 'P')
    s = L.run(7)
    L.on(s + 5, 't'); L.on(s + 3, 'L')
    L.pit(16); L.coins(L.x - 12, L.g - 8, 3)
    L.up(8); s = L.run(5); L.on(s + 1, 't')
    s = L.run(5); L.on(s + 3, 'f'); L.on(s + 4, 'L')
    s = L.run(5); L.on(s + 3, 'z')
    L.pit(24, depth=9); L.down(4); L.coins(L.x - 18, L.g - 2, 4)
    s = L.run(5); L.on(s + 1, 'z')
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'L')
    s = L.run(10); L.on(s + 4, 'f'); L.on(s + 7, 'f'); L.set(s + 5, L.g - 7, 'N')
    s = L.run(4); L.on(s + 2, 't')
    L.pit(18); L.up(9); s = L.run(5); L.on(s + 1, 't')
    # étoile 1 : à mi-parcours du télésiège, il faut sauter du siège
    L.girder(s - 10, L.g - 4, 3); L.set(s - 9, L.g - 5, '*')
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(22, depth=9); L.down(5)
    s = L.run(5); L.on(s + 1, 'z')
    L.run(3); L.pit(4); L.run(3); L.on(L.x - 1, 'f')
    s = L.run(5); L.on(s + 2, 'C')
    s = L.run(4); L.on(s + 2, 't')
    L.pit(16); L.up(8); s = L.run(5); L.on(s + 1, 't')
    L.run(3); L.on(L.x - 1, 'L')
    s = L.run(10); L.girder(s + 2, L.g - 4, 3); L.girder(s + 6, L.g - 8, 3); L.set(s + 7, L.g - 9, '*'); L.on(s + 5, 'f')
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(26, depth=10); L.down(6); L.coins(L.x - 20, L.g + 2, 5)
    s = L.run(5); L.on(s + 1, 'z')
    # étoile 3 : puits de saut mural sous les aurores
    s = L.run(10); L.block(s + 3, L.g - 13, 1, 10, '#'); L.block(s + 6, L.g - 14, 1, 11, '#'); L.set(s + 4, L.g - 14, '*')
    s = L.run(6); L.on(s + 3, 'G'); L.on(s + 1, 'L')
    L.finish()
    return L


def l4_4():
    L = Level('4-4', 'La forêt aux lanternes', 'night', 80, dark=0.7, comment='Nuit noire : seules les lanternes et Kong éclairent la forêt.')
    L.run(3); L.on(3, 'P')
    s = L.run(8)
    L.on(s + 1, 'L'); L.on(s + 7, 'L')
    L.pit(4); L.run(4); L.on(L.x - 2, 'L'); L.pit(5); L.run(4); L.on(L.x - 2, 'L')
    s = L.run(10); L.set(s + 5, L.g - 4, 'o'); L.on(s + 2, 'L'); L.on(s + 8, 'L')
    p = L.pit(6); L.set(p + 2, L.g - 7, 'o')
    L.run(4); L.on(L.x - 2, 'L'); L.on(L.x - 3, 'K')
    s = L.run(4); L.door(s + 2)
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'L')
    a = L.x
    L.run(18); L.roof(a, 18, 6)
    for x in range(a + 2, a + 17, 3):
        L.icicle(x)
    L.on(a + 1, 'L'); L.on(a + 9, 'L'); L.on(a + 16, 'L')
    L.slope_down(4); L.run(2); L.on(L.x - 1, 'L')
    # étoile 1 : dans l'obscurité, sur une poutrelle sans lanterne
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.girder(p + 6, L.g - 7, 3); L.set(p + 7, L.g - 8, '*')
    L.run(4); L.on(L.x - 2, 'L')
    s = L.run(10); L.set(s + 3, L.g - 4, 'o'); L.set(s + 7, L.g - 4, 'o'); L.on(s + 5, 'L'); L.on(s + 8, 'K')
    s = L.run(4); L.door(s + 2)
    s = L.run(5); L.on(s + 2, 'C'); L.on(s + 4, 'L')
    s = L.run(3); p = L.pit(4); L.set(p, L.g, 'V')
    L.up(9); L.run(4); L.on(L.x - 2, 'L')
    L.pit(4); L.run(3); L.pit(5); L.run(4); L.on(L.x - 2, 'L')
    # étoile 2 : sous une corniche, il faut se laisser tomber
    s = L.run(10); L.block(s + 3, L.g, 4, 2, '.'); L.block(s + 3, L.g, 1, 2, 'H'); L.set(s + 5, L.g + 1, '*'); L.block(s + 3, L.g + 2, 4, 1, '#')
    L.on(s + 1, 'L'); L.on(s + 8, 'L')
    L.down(5); L.run(3); L.down(4); L.run(3); L.on(L.x - 1, 'L')
    s = L.run(10); L.set(s + 4, L.g - 4, 'o'); L.on(s + 7, 'K'); L.on(s + 2, 'L')
    s = L.run(4); L.door(s + 2)
    s = L.run(10); L.on(s + 1, 'L'); L.on(s + 8, 'L')
    # étoile 3 : en haut d'un vieux sapin creux (saut mural)
    L.block(s + 3, L.g - 13, 1, 10, '#'); L.block(s + 6, L.g - 14, 1, 11, '#'); L.set(s + 4, L.g - 14, '*')
    s = L.run(6); L.on(s + 3, 'G'); L.on(s + 1, 'L')
    L.finish()
    return L


def l4_5():
    L = Level('4-5', 'Avalanche de minuit', 'night', 55, avalanche={'speed': 130, 'lag': 280},
              comment='La dernière avalanche, en pleine nuit, à travers la station.')
    L.run(3); L.on(3, 'P')
    s = L.run(5)
    L.on(s + 1, 'L')
    L.slope_down(4); L.run(3); L.pit(4); L.run(4); L.on(L.x - 2, 'L')
    L.slope_down(6); L.run(3); L.on(L.x - 1, 'f'); L.pit(5); L.run(4)
    L.crumble(5); L.run(3); L.slope_up(2); L.run(2); L.slope_down(6); L.run(3)
    s = L.run(8); lasers_v(L, s + 4); L.on(s + 1, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(6); L.run(2); L.pit(5); L.run(4); L.on(L.x - 2, 'f')
    # étoile 1 : poutrelle haute au-dessus d'un trou
    p = L.pit(5); L.girder(p + 1, L.g - 6, 3); L.set(p + 2, L.g - 7, '*')
    L.run(3); L.crumble(4); L.run(2); L.crumble(4); L.run(3)
    s = L.run(3); L.on(s + 1, 'S')
    L.up(7); L.run(6); L.coins(L.x - 6, L.g - 2, 6); L.on(L.x - 3, 'L')
    L.slope_down(7); L.pit(5); L.run(4)
    s = L.run(5); L.on(s + 2, 'C')
    L.slope_down(4); L.run(3); L.pit(4); L.run(2); L.on(L.x - 1, 'f'); L.run(3)
    # étoile 2 : petit détour au-dessus
    L.up(3); s = L.run(5); L.set(s + 2, L.g - 6, '*'); L.girder(s + 1, L.g - 5, 3); L.down(3)
    L.run(3); L.pit(5); L.run(3); L.slope_down(6); L.pit(6); L.run(4)
    s = L.run(8); L.on(s + 3, 'f'); L.set(s + 5, L.g - 6, 'N')
    # étoile 3 : entre deux pics, sur la route
    s = L.run(8); L.on(s + 2, '^'); L.on(s + 3, '*', 3); L.on(s + 4, '^')
    s = L.run(6); L.on(s + 3, 'G'); L.on(s + 1, 'L')
    L.finish()
    return L


def l4_6():
    L = Level('4-6', 'L\'after ultime', 'night', 110, dark=0.35,
              comment='Le grand final : tout ce que Kong a appris, jusqu\'au sommet de la station.')
    L.run(3); L.on(3, 'P')
    s = L.run(6)
    L.on(s + 1, 'L')
    s = L.run(12); lasers_v(L, s + 3); lasers_v(L, s + 8); L.on(s + 6, 'f'); L.set(s + 5, L.g - 8, 'N')
    L.on(L.x - 2, 'K')
    s = L.run(4); L.door(s + 2)
    p = L.pit(10); L.set(p + 3, L.g, 'M'); L.set(p + 5, L.g - 6, 'o')
    L.run(4); L.on(L.x - 2, 'L')
    s = L.run(5); L.on(s + 2, 'C')
    a = L.x
    L.ice(8); L.on(a + 5, 'p'); L.pit(4, water=True); L.ice(6)
    L.wind(a, L.x, 260)
    s = L.run(4); L.on(s + 2, 'z')
    L.pit(22, depth=9); L.down(4)
    s = L.run(5); L.on(s + 1, 'z')
    a = L.x
    L.run(16); L.roof(a, 16, 6)
    for x in range(a + 2, a + 15, 3):
        L.icicle(x)
    L.on(a + 8, 'f'); L.on(a + 1, 'L'); L.on(a + 14, 'L')
    # étoile 1 : niche au plafond de la grotte
    L.block(a + 7, L.g - 9, 2, 2, '.'); L.set(a + 7, L.g - 8, '*'); L.girder(a + 6, L.g - 4, 4)
    s = L.run(5); L.on(s + 2, 'C')
    s = L.run(4); L.on(s + 2, 't')
    L.pit(16); L.up(8); s = L.run(5); L.on(s + 1, 't')
    s = L.run(10); laser_h(L, s + 1, s + 8, L.g - 3); L.on(s + 5, 'f'); L.on(s + 9, 'K')
    s = L.run(4); L.door(s + 2)
    L.run(3); p = L.pit(4); L.set(p, L.g, 'V'); L.up(9); L.run(4)
    a = L.x
    L.run(3); L.pit(4); L.run(3); L.pit(5); L.run(4)
    L.wind(a, L.x, -240)
    L.set(a + 6, L.g - 8, 'o')
    s = L.run(5); L.on(s + 2, 'C')
    L.crumble(5); L.run(2); L.crumble(5); L.run(3)
    s = L.run(12); lasers_v(L, s + 3, 7); lasers_v(L, s + 6, 7); lasers_v(L, s + 9, 7); L.on(s + 11, 'f')
    # étoile 2 : sur les projecteurs
    L.girder(s + 2, L.g - 11, 9); L.set(s + 6, L.g - 12, '*'); L.girder(s + 1, L.g - 4, 1); L.girder(s, L.g - 8, 2)
    s = L.run(3); L.on(s + 1, 'S')
    L.up(9); L.run(6); L.on(L.x - 2, 'L')
    s = L.run(10); L.on(s + 3, 'f'); L.on(s + 6, 'f'); L.set(s + 5, L.g - 7, 'N'); L.coins(s + 1, L.g - 4, 8)
    # étoile 3 : en haut d'un dernier puits de saut mural, au-dessus de l'arrivée
    s = L.run(14); L.on(s + 11, 'G'); L.block(s + 3, L.g - 13, 1, 10, '#'); L.block(s + 6, L.g - 14, 1, 11, '#'); L.set(s + 4, L.g - 14, '*')
    L.on(s + 1, 'L'); L.on(s + 9, 'L'); L.set(s + 11, L.g - 8, 'N')
    L.finish(6)
    return L


LEVELS = [l4_1, l4_2, l4_3, l4_4, l4_5, l4_6]
