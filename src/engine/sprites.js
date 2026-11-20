// Pixel art généré par code : chaque sprite est une grille de caractères + palette.
import { makeCanvas } from './util.js';

export function makeSprite(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const [c, g] = makeCanvas(w, h);
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

export const KONG_PALETTES = {
  classic: { K: '#0a0d24', F: '#2b3c94', f: '#4d6ad6', S: '#dbe8ff', s: '#9fb2ea', G: '#1767ff', L: '#7ee8ff', W: '#ffffff', ski: '#ffc83d', skiD: '#b07a10' },
};

const HEAD = [
  '.....KKKKKK.....',
  '....KFFFFFFK....',
  '...KFFfFFFFFK...',
  '..KGGGGGGGGGGK..',
  '..KGLLWGGLLWGK..',
  '..KGLLLGGLLLGK..',
  '..KFGGGFFGGGFK..',
  '..KFSSSSSSSSFK..',
  '..KFSKSSSSKSFK..',
  '...KSSKKKKSSK...',
];
const HEAD_DEAD = HEAD.slice();
HEAD_DEAD[4] = '..KGKLKGGKLKGK..';
HEAD_DEAD[5] = '..KGLKLGGLKLGK..';
HEAD_DEAD[9] = '...KSKSSSSKSK...';
const HEAD_HAPPY = HEAD.slice();
HEAD_HAPPY[8] = '..KFSSSSSSSSFK..';
HEAD_HAPPY[9] = '...KSKWWWWKSK...';

const BODY = {
  idle: [
    '..KFFFFFFFFFFK..',
    '.KFFfSSSSSSfFFK.',
    '.KFFfSSSSSSfFFK.',
    '.KSKFFFFFFFFKSK.',
    '..K.KFFFFFFK.K..',
    '....KFFKKFFK....',
    '....KKK..KKK....',
  ],
  run1: [
    '..KFFFFFFFFFFK..',
    '.KFFfSSSSSSfFFK.',
    'KSKFfSSSSSSfFFK.',
    'KKKFFFFFFFFFKSK.',
    '...KFFFFFFFK.KK.',
    '...KFFK.KFFK....',
    '...KKK...KKKK...',
  ],
  run2: [
    '..KFFFFFFFFFFK..',
    '.KFFfSSSSSSfFFK.',
    '.KFFfSSSSSSfFKSK',
    '.KSKFFFFFFFFFKKK',
    '.KK.KFFFFFFFK...',
    '....KFFK.KFFK...',
    '...KKKK...KKK...',
  ],
  jump: [
    'KSKKFFFFFFFFKKSK',
    'KFFFfSSSSSSfFFFK',
    '.KKFfSSSSSSfFKK.',
    '...KFFFFFFFFK...',
    '...KFFKKKKFFK...',
    '...KKK....KKK...',
  ],
  fall: [
    '..KFFFFFFFFFFK..',
    'KKFFfSSSSSSfFFKK',
    'SKFFfSSSSSSfFFKS',
    '...KFFFFFFFFK...',
    '...KFFK..KFFK...',
    '...KFFK..KFFK...',
    '...KKKK..KKKK...',
  ],
  wall: [
    '..KFFFFFFFFFFK..',
    '.KFFfSSSSSSfFKSK',
    '.KFFfSSSSSSfFKSK',
    '.KFFFFFFFFFFFK..',
    '..KFFFFFFFFK....',
    '..KFFK.KFFK.....',
    '..KKKK.KKKK.....',
  ],
  skid: [
    '...KFFFFFFFFFFK.',
    '..KFFfSSSSSSfFFK',
    '.KSKfSSSSSSfFFK.',
    'KSK.KFFFFFFFFK..',
    '....KFFFFFFFK...',
    '...KFFK..KFFK...',
    '..KKKK...KKKK...',
  ],
  crouch: [
    '.KFFfSSSSSSfFFK.',
    'KSKFFFFFFFFFFKSK',
    '.KKKKKKKKKKKKKK.',
  ],
};

export function buildKong(pal) {
  const mk = (head, body) => makeSprite(head.concat(body), pal);
  return {
    idle: mk(HEAD, BODY.idle),
    run1: mk(HEAD, BODY.run1),
    run2: mk(HEAD, BODY.run2),
    jump: mk(HEAD, BODY.jump),
    fall: mk(HEAD, BODY.fall),
    crouch: mk(HEAD, BODY.crouch),
    wall: mk(HEAD, BODY.wall),
    skid: mk(HEAD, BODY.skid),
    dead: mk(HEAD_DEAD, BODY.jump),
    win: mk(HEAD_HAPPY, BODY.jump),
    ski: pal.ski,
    skiD: pal.skiD,
  };
}

export function ghostPalette(color) {
  return { K: color, F: color, f: color, S: color, s: color, G: color, L: color, W: color, ski: color, skiD: color };
}

const SNOWMAN = [
  '....KKKK....',
  '...KHHHHK...',
  '..KHHHHHHK..',
  '..KWWWWWWK..',
  '.KWKWWWKWWK.',
  '.KWWWOOOWWK.',
  '..KWWWWWWK..',
  '.KYYYYYYYYK.',
  'KWWWWKWWWWWK',
  'KWWWWWWWWWWK',
  'KWWWWKWWWWWK',
  'KwWWWWWWWWwK',
  '.KwwWWWWwwK.',
  '..KKKKKKKK..',
];
const SNOWMAN_SQUASH = [
  '..KKKKKKKK..',
  '.KHHHHHHHHK.',
  'KWKKWWWKKWWK',
  'KYYYYYYYYYYK',
  'KwWWWWWWWWwK',
  '.KKKKKKKKKK.',
];
const PASS = [
  'KKKKKKKKKK',
  'KBBBBBBBBK',
  'KBWWBBBBBK',
  'KWWWWWWWWK',
  'KWYYWKKWWK',
  'KWYYWWWWWK',
  'KWWWWKKKWK',
  'KKKKKKKKKK',
];
const STAR = [
  '.....K.....',
  '....KYK....',
  '....KYK....',
  'KKKKYYYKKKK',
  'KYYYYWYYYYK',
  '.KYYYYYYYK.',
  '..KYYYYYK..',
  '..KYYKYYK..',
  '.KYYK.KYYK.',
  '.KYK...KYK.',
  'KKK.....KKK',
];
const SPRING = [
  'KKKKKKKKKKKKKKKK',
  'KRRRRRRRRRRRRRRK',
  'KKKKKKKKKKKKKKKK',
  '...KGK....KGK...',
  '....KGK..KGK....',
  '...KGK....KGK...',
  'KKKKKKKKKKKKKKKK',
  'KDDDDDDDDDDDDDDK',
];
const SPRING_UP = [
  'KKKKKKKKKKKKKKKK',
  'KRRRRRRRRRRRRRRK',
  'KKKKKKKKKKKKKKKK',
  '...KGK....KGK...',
  '....KGK..KGK....',
  '...KGK....KGK...',
  '....KGK..KGK....',
  '...KGK....KGK...',
  '....KGK..KGK....',
  '...KGK....KGK...',
  'KKKKKKKKKKKKKKKK',
  'KDDDDDDDDDDDDDDK',
];
const SIGN = [
  'KKKKKKKKKKKKKK',
  'KYYYYYKKYYYYYK',
  'KYYYYKYYKYYYYK',
  'KYYYYYYYKYYYYK',
  'KYYYYYYKYYYYYK',
  'KYYYYYKYYYYYYK',
  'KYYYYYYYYYYYYK',
  'KYYYYYKYYYYYYK',
  'KKKKKKKKKKKKKK',
  '......KK......',
  '......KK......',
  '......KK......',
  '......KK......',
  '....KKKKKK....',
];
const SPIKES = [
  '...K.......K....',
  '..KWK.....KWK...',
  '..KWK..K..KWK..K',
  '.KWsK.KWK.KWsK.K',
  '.KWsKKWWsKKWsKKW',
  'KWWssKWssKWWssKW',
  'KKKKKKKKKKKKKKKK',
];

function snowmanFrame(up) {
  const rows = SNOWMAN.map((r) => '.' + r + '.');
  const set = (y, x, c) => { const a = [...rows[y]]; a[x] = c; rows[y] = a.join(''); };
  if (up) { set(6, 0, 'T'); set(7, 1, 'T'); set(6, 13, 'T'); set(7, 12, 'T'); set(5, 0, 'T'); set(5, 13, 'T'); }
  else { set(9, 1, 'T'); set(10, 0, 'T'); set(9, 12, 'T'); set(10, 13, 'T'); set(11, 0, 'T'); set(11, 13, 'T'); }
  return rows;
}

const OWL = [
  '.KK......KK.',
  '.KBK....KBK.',
  '.KBBKKKKBBK.',
  'KBBWWBBWWBBK',
  'KBWKYBBYKWBK',
  'KBBWWOOWWBBK',
  'KBBBBOOBBBBK',
  '.KBbbbbbbbK.',
  '.KBbBbbBbBK.',
  '..KBBBBBBK..',
  '...KO..OK...',
];
const PENGUIN = [
  '....KKKK....',
  '...KBBBBK...',
  '..KBWBBWBK..',
  '..KBKBBKBK..',
  '..KBBOOBBK..',
  '.KBBWOOWBBK.',
  '.KBWWWWWWBK.',
  'KBBWWWWWWBBK',
  'KBBWWWWWWBBK',
  '.KBWWWWWWBK.',
  '..KWWWWWWK..',
  '..KKKKKKKK..',
  '..KOO..OOK..',
];
const FETARD = [
  '....KKKK....',
  '...KRRRRK...',
  '..KRRRRRRK..',
  '..KWWWWWWK..',
  '..KSSSSSSK..',
  '..KSKSSKSK..',
  '..KSSSSSSK..',
  '...KSKKSK...',
  '..KPPPPPPK..',
  '.KPPPPPPPPK.',
  'KSKPPPPPPKSK',
  '.KKPPPPPPKK.',
  '...KDDDDK...',
  '...KD..DK...',
  '...KD..DK...',
  '..KKK..KKK..',
];
const FETARD2 = FETARD.slice();
FETARD2[9] = 'KSKPPPPPPKSK';
FETARD2[10] = '.KKPPPPPPKK.';
FETARD2[11] = '..KPPPPPPK..';
FETARD2[13] = '..KD....DK..';
FETARD2[14] = '.KD......DK.';
FETARD2[15] = 'KKK......KKK';
const KEY = [
  '.KKK........',
  'KYYYK.......',
  'KYKYKKKKKKK.',
  'KYYYYYYYYYYK',
  'KYKYKKKYKYK.',
  'KYYYK..K.K..',
  '.KKK........',
];

export function buildSprites() {
  const pal = { K: '#0a0d24', W: '#eef6ff', w: '#b9cdf5', H: '#e8455a', O: '#ff8a2a', Y: '#ffc83d', B: '#2f6bff', R: '#ff4f5e', G: '#b8c4e0', D: '#3a4270', s: '#9fb2ea' };
  return {
    kong: buildKong(KONG_PALETTES.classic),
    kongGhost: buildKong(ghostPalette('#8fe6ff')),
    snowman: makeSprite(snowmanFrame(false), { ...pal, T: '#6b4a2a' }),
    snowman2: makeSprite(snowmanFrame(true), { ...pal, T: '#6b4a2a' }),
    snowmanSquash: makeSprite(SNOWMAN_SQUASH, pal),
    pass: makeSprite(PASS, pal),
    star: makeSprite(STAR, { ...pal, Y: '#ffe066' }),
    starGrey: makeSprite(STAR, { K: '#0a0d24', Y: '#3a4270', W: '#545e94' }),
    spring: makeSprite(SPRING, pal),
    springUp: makeSprite(SPRING_UP, pal),
    sign: makeSprite(SIGN, { K: '#0a0d24', Y: '#ffc83d' }),
    spikes: makeSprite(SPIKES, { K: '#0a0d24', W: '#e6f0ff', s: '#8fa3e0' }),
    owl: makeSprite(OWL, { K: '#0a0d24', B: '#7a6a58', b: '#e2d6c0', W: '#ffffff', Y: '#ffd23f', O: '#ff9a2a' }),
    penguin: makeSprite(PENGUIN, { K: '#0a0d24', B: '#1b2240', W: '#f4f8ff', O: '#ff9a2a' }),
    fetard: makeSprite(FETARD, { K: '#0a0d24', R: '#4ff0ff', W: '#ffffff', S: '#ffd9b8', P: '#ff4fd8', D: '#2a2f66' }),
    fetard2: makeSprite(FETARD2, { K: '#0a0d24', R: '#4ff0ff', W: '#ffffff', S: '#ffd9b8', P: '#ff4fd8', D: '#2a2f66' }),
    key: makeSprite(KEY, { K: '#0a0d24', Y: '#ffd23f' }),
  };
}
