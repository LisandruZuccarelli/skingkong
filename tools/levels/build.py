"""Génère src/levels/wX-Y.js et src/levels/index.js. Usage : python3 tools/levels/build.py [--show 1-2]"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import world1  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'levels')
MODULES = [world1]
for name in ('world2', 'world3', 'world4'):
    try:
        MODULES.append(__import__(name))
    except ImportError:
        pass

levels = [fn() for m in MODULES for fn in m.LEVELS]
# Temps cibles calibrés sur le bot de test (tools/levels/pars.json), voir README.
PARS = json.load(open(os.path.join(os.path.dirname(__file__), 'pars.json'), encoding='utf-8'))
for L in levels:
    L.par = PARS.get(L.id, L.par)
show = sys.argv[sys.argv.index('--show') + 1] if '--show' in sys.argv else None
for L in levels:
    if show and L.id != show:
        continue
    if show:
        print('\n'.join(L.rows()))
    print(L.write(OUT), len(L.cols), 'x', L.H)

# ---------- index.js ----------
WORLDS = [
    (1, "L'aube sur la station", 'dawn'),
    (2, 'La forêt dans la tempête', 'storm'),
    (3, 'Les glaciers éternels', 'glacier'),
    (4, "L'afterski sous les étoiles", 'night'),
]
if not show:
    ids = ['1-1'] + [L.id for L in levels]
    ids.sort(key=lambda i: tuple(int(p) for p in i.split('-')))
    var = lambda i: 'w' + i.replace('-', '_')
    lines = ['// Généré par tools/levels/build.py : liste des niveaux, des mondes et règles de déblocage.']
    # un boss (src/levels/bN.js, écrit à la main) clôt chaque monde
    order = []
    for n, _, _ in WORLDS:
        order += [i for i in ids if i.startswith(f'{n}-')] + [f'{n}-B']
    var = lambda i: f'b{i[0]}' if i.endswith('-B') else 'w' + i.replace('-', '_')
    path = lambda i: f'./b{i[0]}.js' if i.endswith('-B') else f'./w{i}.js'
    lines += [f"import {var(i)} from '{path(i)}';" for i in order]
    lines.append('')
    lines.append(f"export const LEVELS = [{', '.join(var(i) for i in order)}];")
    ids = order
    lines.append('export const WORLDS = [')
    for n, name, theme in WORLDS:
        lv = [i for i in ids if i.startswith(f'{n}-')]
        if lv:
            lv_js = ', '.join(f"'{i}'" for i in lv)
            lines.append(f"  {{ n: {n}, name: {json.dumps(name, ensure_ascii=False)}, theme: '{theme}', levels: [{lv_js}] }},")
    lines.append('];')
    lines.append('''export const getLevel = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
/** Niveau suivant dans l'ordre de la campagne (null après le dernier). */
export function nextLevelId(id) {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < LEVELS.length ? LEVELS[i + 1].id : null;
}
/**
 * Un niveau est ouvert si c'est le premier, si le précédent de la campagne est terminé,
 * ou si un niveau plus loin a déjà été terminé (sauvegardes d'avant l'ajout des boss).
 */
export function isUnlocked(id, save) {
  if (save.unlockAll) return true;
  const i = LEVELS.findIndex((l) => l.id === id);
  const best = save.best || {};
  return i <= 0 || !!best[LEVELS[i - 1].id] || LEVELS.slice(i).some((l) => best[l.id]);
}
/** Un monde est ouvert dès que son premier niveau l'est. */
export function worldUnlocked(n, save) {
  const w = WORLDS[n - 1];
  return !!w && isUnlocked(w.levels[0], save);
}
export { default as DEMO_FX } from './demo-fx.js';
''')
    with open(os.path.join(OUT, 'index.js'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('index.js', len(ids), 'niveaux')
