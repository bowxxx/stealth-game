// Night Vault — configuration: level layout, tuning numbers and guard patrols.
// The museum floor is a grid of tiles; one tile is TILE pixels on the canvas.
export const TILE = 44;
export const VIEW_W = 26 * TILE; // 1144
export const VIEW_H = 17 * TILE; // 748

// Map legend:
//   #  wall (blocks movement and sight)
//   C  crate — cover (blocks movement and sight)
//   B  bush — a hiding spot (blocks sight only when you crouch inside it)
//   P  player start   *  the Star Sapphire   E  exit door
//   .  open floor
export const MAP = [
  '##########################',
  '#P....C.......#......*...#',
  '#.............#..........#',
  '#..CC....B...#....CC.....#',
  '#.............#..........#',
  '#......C......#.....C....#',
  '###.#####.#####.#####.####',
  '#.............#..........#',
  '#..C....B....#....C......#',
  '#........................#',
  '#.....C.......#.....B....#',
  '#.............#..........#',
  '###.#####.#####.#####.####',
  '#........................#',
  '#..B....C....#....C......#',
  '#.............#.........E#',
  '##########################',
];

// Dark floor patches where guards spot you more slowly (shown as shadow).
export const SHADOW_RECTS = [
  { x: 1, y: 7, w: 3, h: 2 },
  { x: 21, y: 7, w: 3, h: 2 },
  { x: 10, y: 13, w: 4, h: 2 },
  { x: 1, y: 13, w: 2, h: 2 },
];

// Guard patrol routes, in tile coordinates. Each guard walks its waypoints
// in order, pauses at each end, then walks back.
export const GUARD_PATROLS = [
  { waypoints: [[16, 2], [23, 2]], pause: 1.2 }, // top gallery, sweeps past the gem
  { waypoints: [[12, 4], [12, 1]], pause: 1.6 }, // top gallery, vertical beat
  { waypoints: [[5, 9], [22, 9]], pause: 1.0 }, // middle gallery, long beat
  { waypoints: [[22, 13], [22, 15]], pause: 1.4 }, // lower gallery, guards the exit
];

export const TUNING = {
  playerWalk: 3.4, // tiles per second
  playerSneak: 1.7,
  guardPatrol: 1.9,
  guardChase: 3.5,
  guardInvestigate: 2.6,
  visionRange: 5.2, // tiles
  visionHalfAngle: 0.66, // radians (~38 degrees)
  suspicionGain: 1.15, // per second at point blank, scaled by distance
  suspicionDecay: 0.55, // per second while unseen
  crouchFactor: 0.45, // suspicion builds this much slower while sneaking
  shadowFactor: 0.5, // ...and this much slower while standing in shadow
  bushHideRange: 1.6, // tiles: closer than this, a guard sees you even in a bush
  catchRange: 0.55, // tiles: an alerted guard this close catches you
  noiseRadius: 3.6, // tiles: running is heard this far
  coinRange: 6.5, // tiles: guards this far hear a tossed coin
  alarmMemory: 4.0, // seconds a guard keeps hunting after losing sight
  coins: 3,
};

export const COLORS = {
  floorA: '#232a3a',
  floorB: '#202636',
  wall: '#3d4a63',
  wallTop: '#5a6b8c',
  crate: '#8a6a3f',
  crateTop: '#a8874f',
  bush: '#2e5d33',
  bushTop: '#3f7a44',
  shadow: 'rgba(6, 8, 18, 0.45)',
  gem: '#5ff2ff',
  exit: '#39d353',
  player: '#2fd6c8',
  guard: '#e5484d',
  guardCalm: '#c94f5e',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 166, 40, 0.34)',
  coneAlert: 'rgba(255, 60, 60, 0.38)',
};
