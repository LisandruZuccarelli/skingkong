// Ambiances des 4 mondes : ciel, astres, décor, météo, éclairage, palette des tuiles, musique.
export const THEMES = {
  dawn: {
    label: 'AUBE', world: 1,
    sky: ['#0e1650', '#16206a', '#1f2e85', '#2f449e', '#4559b8', '#6273cc', '#8590dc', '#aaaee6', '#d1c8e6', '#f0d0cc', '#ffd6b0'],
    sun: { x: 0.72, y: 64, r: 16, color: '#fff1c9', glow: '255,214,160' },
    stars: 0.2, aurora: 0, layers: 'mountains',
    weather: 'snow', wind: -14, fog: 0,
    dark: 0, darkColor: '10,14,50',
    tiles: 'dawn', water: ['rgba(70,140,230,0.55)', '#9fd8ff'], music: 'w1',
  },
  storm: {
    label: 'TEMPETE', world: 2,
    sky: ['#161d2c', '#1c2436', '#232c40', '#2c364b', '#364156', '#424d62', '#4f5a6f', '#5c677c', '#6a7589', '#788396', '#8792a4'],
    sun: null, stars: 0, aurora: 0, layers: 'forest',
    weather: 'blizzard', wind: -120, fog: 0.6,
    dark: 0.12, darkColor: '16,22,36',
    tiles: 'storm', water: ['rgba(60,100,140,0.6)', '#a8c4dc'], music: 'w2',
  },
  glacier: {
    label: 'PLEIN JOUR', world: 3,
    sky: ['#1a6fd0', '#237cda', '#2f89e2', '#3e97e9', '#50a5ee', '#64b3f2', '#7bc1f5', '#93cef8', '#acdbfa', '#c6e8fc', '#e0f4fe'],
    sun: { x: 0.2, y: 42, r: 14, color: '#ffffff', glow: '255,255,240' },
    stars: 0, aurora: 0, layers: 'glacier',
    weather: 'sparkle', wind: -8, fog: 0,
    dark: 0, darkColor: '6,20,50',
    tiles: 'glacier', water: ['rgba(40,150,220,0.55)', '#c8f6ff'], music: 'w3',
  },
  night: {
    label: 'NUIT ETOILEE', world: 4,
    sky: ['#03040d', '#060818', '#0a0d24', '#0e1230', '#13173c', '#191c48', '#1f2154', '#272660', '#30296a', '#3a2c70', '#452e74'],
    moon: { x: 0.8, y: 46, r: 12 },
    sun: null, stars: 1, aurora: 1, layers: 'village',
    weather: 'snowLight', wind: -10, fog: 0,
    dark: 0.32, darkColor: '6,6,26',
    tiles: 'night', water: ['rgba(90,60,200,0.5)', '#ff9df0'], music: 'w4',
  },
};

export const THEME_ORDER = ['dawn', 'storm', 'glacier', 'night'];
export const getTheme = (name) => THEMES[name] || THEMES.dawn;
