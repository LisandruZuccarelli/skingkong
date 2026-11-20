"""Outil de conception des niveaux SkingKong.

Les niveaux sont décrits en Python avec des segments (sol, trou, pente, glace...) puis
exportés en fichiers de données JS lisibles (src/levels/wX-Y.js), éditables à la main.
Lancer : python3 tools/levels/build.py
"""
import json
import os

SOLID = set('#=xHO')


class Level:
    def __init__(self, id, name, theme, par, height=140, ground=70, **extra):
        self.id = id
        self.world = int(id.split('-')[0])
        self.name = name
        self.theme = theme
        self.par = par
        self.H = height
        self.g = ground
        self.cols = []
        self.signs = []
        self.extra = extra
        self.comment = extra.pop('comment', '')
        self.pending = []
        self.wall(2)

    # ---------- primitives ----------
    @property
    def x(self):
        return len(self.cols)

    def _col(self, top, surface=None, fill='#'):
        c = ['.'] * self.H
        if top is not None:
            for r in range(max(0, top), self.H):
                c[r] = fill
            if surface and top >= 0:
                c[top] = surface
        self.cols.append(c)
        return len(self.cols) - 1

    def set(self, x, y, ch):
        if x >= len(self.cols):
            self.pending.append((x, y, ch))
        elif 0 <= x and 0 <= y < self.H:
            self.cols[x][y] = ch

    def get(self, x, y):
        if 0 <= x < len(self.cols) and 0 <= y < self.H:
            return self.cols[x][y]
        return '#'

    def top(self, x, girders=True):
        """Première rangée solide (ou pente / passerelle) de la colonne x."""
        if x >= len(self.cols):
            return self.g
        for r in range(self.H):
            if self.cols[x][r] in ('#=x/\\-O' if girders else '#=x/\\O'):
                return r
        return self.H

    def ground(self, x):
        """Surface du sol de la colonne x, cherchée depuis le bas (ignore plafonds, poutrelles et blocs en l'air)."""
        if x >= len(self.cols):
            return self.g
        c = self.cols[x]
        r = self.H - 1
        while r >= 0 and c[r] in '#=x/\\Ow':
            r -= 1
        return r + 1

    # ---------- segments (avancent le curseur) ----------
    def wall(self, n=2):
        for _ in range(n):
            self._col(0)

    def run(self, n, surface=None):
        x0 = self.x
        for _ in range(n):
            self._col(self.g, surface)
        return x0

    def ice(self, n):
        return self.run(n, '=')

    def pit(self, n, water=False, depth=None):
        """Trou : eau glacée mortelle en surface (water=True) ou au fond (depth rangées sous le sol, 4 par défaut)."""
        x0 = self.x
        d = 1 if water else (depth or 4)
        for _ in range(n):
            c = self._col(self.g + d + 3)
            for r in range(self.g + d, self.g + d + 3):
                self.cols[c][r] = 'w'
        return x0

    def up(self, k=1):
        self.g -= k

    def down(self, k=1):
        self.g += k

    def slope_up(self, k):
        x0 = self.x
        for i in range(1, k + 1):
            c = self._col(self.g - i + 1)
            self.cols[c][self.g - i] = '/'
        self.g -= k
        return x0

    def slope_down(self, k):
        x0 = self.x
        for i in range(k):
            c = self._col(self.g + i, '\\')
        self.g += k
        return x0

    def crumble(self, n, water=False):
        """Pont de glace friable au niveau du sol, au-dessus d'un trou."""
        x0 = self.pit(n, water)
        for i in range(n):
            self.set(x0 + i, self.g, 'x')
        return x0

    # ---------- décor / entités (ne bougent pas le curseur) ----------
    def on(self, x, ch, dy=1):
        """Pose une entité juste au-dessus du sol de la colonne x (dy rangées plus haut)."""
        self.set(x, self.ground(x) - dy, ch)

    def put(self, x, y, s):
        """Écrit un motif multi-lignes ('\\n') dont le coin haut-gauche est (x, y)."""
        for j, line in enumerate(s.split('\n')):
            for i, ch in enumerate(line):
                if ch != ' ':
                    self.set(x + i, y + j, ch)

    def block(self, x, y, w, h, ch='#'):
        for i in range(w):
            for j in range(h):
                self.set(x + i, y + j, ch)

    def girder(self, x, y, n):
        for i in range(n):
            self.set(x + i, y, '-')

    def coins(self, x, y, n, dx=1):
        for i in range(n):
            self.set(x + i * dx, y, '$')

    def arc(self, x, n=5, h=3):
        """Arc de forfaits au-dessus du sol (suggère un saut)."""
        for i in range(n):
            k = 1 - ((i - (n - 1) / 2) / ((n - 1) / 2 + 1e-9)) ** 2
            self.set(x + i, self.top(x + i) - 2 - round(k * h), '$')

    def ceiling(self, x, n, rows):
        for i in range(n):
            for r in range(rows):
                self.set(x + i, r, '#')

    def wind(self, x0, x1, force):
        """Zone de vent entre les colonnes x0 et x1 (force en px/s², négatif = vers la gauche)."""
        self.extra.setdefault('wind', []).append([x0, x1, force])

    def door(self, x, h=3):
        """Porte verrouillée de h tuiles posée sur le sol de la colonne x."""
        t = self.ground(x)
        for r in range(h):
            self.set(x, t - 1 - r, 'O')
        self.block(x, 0, 1, t - h, '#')  # pilier jusqu'au ciel : on ne peut pas sauter par-dessus

    def roof(self, x, n, clearance, thick=3):
        """Plafond rocheux à `clearance` tuiles au-dessus du sol (relief suivi colonne par colonne)."""
        for i in range(n):
            t = self.ground(x + i)
            for r in range(thick):
                self.set(x + i, t - clearance - 1 - r, '#')

    def icicle(self, x):
        """Stalactite accrochée sous le plafond de la colonne x."""
        c = self.cols[x]
        t = self.ground(x)
        r = t - 1
        while r > 0 and c[r] == '.':
            r -= 1
        assert r > 0, f'{self.id}: stalactite sans plafond en colonne {x}'
        self.set(x, r + 1, 'I')

    def sign(self, x, text, dy=1):
        self.signs.append(text)
        self.on(x, '?', dy)

    # ---------- export ----------
    def finish(self, tail=10):
        self.run(tail)
        self.wall(2)

    def validate(self):
        for x, y, ch in self.pending:
            assert x < len(self.cols), f'{self.id}: élément hors carte ({x},{y},{ch})'
            self.cols[x][y] = ch
        self.pending = []
        flat = [ch for c in self.cols for ch in c]
        assert flat.count('P') == 1, f'{self.id}: un seul départ P'
        assert flat.count('G') == 1, f'{self.id}: une seule arrivée G'
        assert flat.count('*') == 3, f'{self.id}: 3 étoiles ({flat.count("*")})'
        assert flat.count('?') == len(self.signs), f'{self.id}: panneaux {flat.count("?")} vs {len(self.signs)} textes'
        assert flat.count('z') % 2 == 0, f'{self.id}: tyroliennes par paires'
        assert flat.count('t') % 2 == 0, f'{self.id}: télésièges par paires'
        # chaque porte doit avoir sa clé avant elle (de gauche à droite), sinon blocage
        keys = doors = 0
        prev_door = False
        for i, c in enumerate(self.cols):
            keys += c.count('K')
            has = 'O' in c
            if has and not prev_door:
                doors += 1
                assert keys >= doors, f'{self.id}: porte en colonne {i} sans clé avant'
            prev_door = has

    def auto_coins(self, target=24):
        """Complète les forfaits jusqu'à `target` : arcs au-dessus des trous (ils guident le saut),
        puis petites lignes sur les longs replats."""
        flat = lambda: sum(c.count('$') for c in self.cols)
        if flat() >= target:
            return
        W = len(self.cols)
        is_pit = lambda x: 'w' in self.cols[x] and not any(ch in '#=x/\\' for ch in self.cols[x][:self.cols[x].index('w')])
        x = 3
        while x < W - 3 and flat() < target:
            if is_pit(x) and not is_pit(x - 1):
                x1 = x
                while x1 < W and is_pit(x1):
                    x1 += 1
                n = x1 - x
                if 2 <= n <= 9 and not any(ch in 'MVzt' for c in self.cols[x - 2:x1 + 2] for ch in c):
                    base = min(self.ground(x - 1), self.ground(x1))
                    for i in range(n):
                        k = 1 - ((i - (n - 1) / 2) / ((n + 1) / 2)) ** 2
                        y = base - 2 - round(k * 2)
                        if self.cols[x + i][y] == '.':
                            self.cols[x + i][y] = '$'
                x = x1
            x += 1
        x = 6
        while x < W - 8 and flat() < target:
            g = self.ground(x)
            run = all(self.ground(x + i) == g and self.cols[x + i][g - 1] == '.' and self.cols[x + i][g - 2] == '.'
                      and self.cols[x + i][g - 3] == '.' for i in range(7))
            if run and not any('$' in self.cols[x + i] for i in range(-3, 10) if 0 <= x + i < W):
                for i in range(2, 5):
                    self.cols[x + i][g - 2] = '$'
                x += 14
            else:
                x += 1

    def settle_coins(self):
        """Kong mesure moins d'une tuile : un forfait posé 2 cases au-dessus d'une surface passe au-dessus
        de sa tête. On l'abaisse d'une case pour qu'il se ramasse en marchant (ligne droite = pas de saut)."""
        surf = set('#=x-/\\')
        for c in self.cols:
            for y in range(len(c) - 2):
                if c[y] == '$' and c[y + 1] == '.' and c[y + 2] in surf:
                    c[y], c[y + 1] = '.', '$'

    def settle_decor(self):
        """Les cristaux (décor lumineux) reposent toujours sur un sol : jamais en l'air."""
        for c in self.cols:
            for y in range(len(c) - 2, -1, -1):
                if c[y] == 'k':
                    yy = y
                    while yy + 1 < len(c) and c[yy + 1] == '.':
                        yy += 1
                    if c[yy + 1] == '$' and yy + 2 < len(c) and c[yy + 2] in '#=x-/\\':
                        yy += 1  # un forfait posé au sol sous le cristal : le cristal prend sa place
                    if c[yy + 1] in '#=x-/\\' and yy != y:
                        c[y], c[yy] = '.', 'k'

    def crop(self):
        """Recadre la grille virtuelle (140 rangées) sur la zone utile : 10 rangées de ciel au-dessus
        du point le plus haut, 3 rangées sous le sol le plus bas. Hauteur minimale 18."""
        inner = [c for c in self.cols if c[0] == '.']
        first = min(next((r for r, ch in enumerate(c) if ch != '.'), self.H) for c in inner)
        grounds = [next((r for r, ch in enumerate(c) if ch in '#=x/\\O'), None) for c in inner]
        bottom = max(g for g in grounds if g is not None) + 3
        top = max(0, first - 10)
        bottom = min(self.H, bottom + 1)
        if bottom - top < 18:
            top = max(0, bottom - 18)
        self.cols = [c[top:bottom] for c in self.cols]
        self.H = bottom - top
        for c in self.cols:
            if 'w' in c:
                c[-1] = '#'

    def rows(self):
        return [''.join(c[r] for c in self.cols) for r in range(self.H)]

    def to_js(self):
        self.validate()
        self.auto_coins()
        self.settle_coins()
        self.settle_decor()
        if self.H == 140:
            self.crop()
        rows = self.rows()
        W = len(self.cols)
        step = 48
        chunks = []
        for a in range(0, W, step):
            chunks.append('String.raw`\n' + '\n'.join(r[a:a + step] for r in rows) + '\n`')
        head = {'id': self.id, 'world': self.world, 'name': self.name, 'theme': self.theme,
                'height': self.H, 'parTime': self.par}
        head.update(self.extra)
        body = ',\n'.join(f'  {k}: {json.dumps(v, ensure_ascii=False)}' for k, v in head.items())
        signs = ',\n'.join('    ' + json.dumps(s, ensure_ascii=False) for s in self.signs)
        return (f'// Monde {self.world} - Niveau {self.id} : "{self.name}". {self.comment}\n'
                f'// Généré par tools/levels/build.py puis éditable à la main.\n'
                f'export default {{\n{body},\n  signs: [\n{signs}\n  ],\n  chunks: [\n'
                + ',\n'.join(chunks) + ',\n  ],\n};\n')

    def write(self, outdir):
        name = 'w' + self.id + '.js'
        with open(os.path.join(outdir, name), 'w', encoding='utf-8') as f:
            f.write(self.to_js())
        return name
