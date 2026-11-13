/* ============================================================
   PROJETO ÍRIS — MAPAS DOS SETORES
   Legenda:
     #  parede            .  chão
     P  início do jogador F  fragmento de memória
     T  terminal (log)    H  kit de reparo (vida)
     D  sentinela         R  caçador (inimigo mais forte)
     X  porta de saída (abre com todos os fragmentos)
     L  porta com código  E  plataforma de saída
     B  chefe (ÍRIS)      1-9 gatilhos de diálogo
   Easter eggs:
     S  parede falsa (parece parede, mas dá para atravessar)
     Q  terminal secreto  C  caneca de café da Helena
   ============================================================ */

const LEVELS = [
  {
    map: [
      "#################",
      "#P....#.....T...#",
      "#.....#.........#",
      "#.....1...D.....#",
      "#.....#.....F...#",
      "###.#####.#######",
      "#.....#.....#...#",
      "#.F...#..D..#.H.#",
      "#.T...2.........#",
      "#.....#..D..#.F.#",
      "###.#####.###.###",
      "#...........#.T.#",
      "#...D.......#...#",
      "#S#####X#########",
      "#.Q####E#########"
    ],
    startYaw: -Math.PI / 2,       // olhando para o leste
    song: "explore", transpose: 0,
    diff: { fire: 1.45, dmg: 0.7 }, // inimigos mais lentos no tutorial
    palette: { a1: "#3ee6d8", a2: "#ff2b3d", fog: 0x05080b, lights: [0x3ee6d8, 0xff2b3d] },
    code: null
  },
  {
    map: [
      "#####################",
      "#P..#.......#.....F.#",
      "#...#..D....#...R...#",
      "#...1.......L.......#",
      "#...#..T....#..H....#",
      "##.######.###########",
      "#.......#.......#...#",
      "#..R....#...D...#.H.#",
      "#.......2...........#",
      "#.F.....#...T...#...#",
      "#####.#####.#####.###",
      "#...#.....#.....#...#",
      "#.T.#..R..#..F..#.F.#",
      "#...................#",
      "#C..#.....D.....#...#",
      "##########X##########",
      "##########E##########"
    ],
    startYaw: Math.PI,            // olhando para o sul
    song: "archive", transpose: 0,
    diff: { fire: 1.0, dmg: 1.0 },
    palette: { a1: "#ffb347", a2: "#ff2b3d", fog: 0x0a0605, lights: [0xffa040, 0xff2b3d, 0x3ee6d8] },
    code: "1407"
  },
  {
    map: [
      "###############",
      "######...######",
      "######.P.######",
      "######...######",
      "######.T.######",
      "######...######",
      "######.1.######",
      "#.............#",
      "#.............#",
      "#..#.......#..#",
      "#.............#",
      "#......B......#",
      "#.............#",
      "#..#.......#..#",
      "#.............#",
      "#.H.........H.#",
      "###############"
    ],
    startYaw: Math.PI,
    song: "core", transpose: 0,
    diff: { fire: 0.9, dmg: 1.1 },
    palette: { a1: "#ff2b3d", a2: "#e9ecef", fog: 0x0b0406, lights: [0xff2b3d, 0xff2b3d, 0x3ee6d8] },
    code: null
  }
];

// contagens derivadas dos mapas
LEVELS.forEach(L => {
  const s = L.map.join("");  // (Q = terminal secreto, não conta)
  L.fragCount = (s.match(/F/g) || []).length;
  L.termCount = (s.match(/T/g) || []).length;
});
const TOTAL_FRAGMENTS = LEVELS.reduce((a, L) => a + L.fragCount, 0);
const TOTAL_LOGS = LEVELS.reduce((a, L) => a + L.termCount, 0);
function fragmentsBefore(i) { let n = 0; for (let j = 0; j < i; j++) n += LEVELS[j].fragCount; return n; }
function logsBefore(i) { let n = 0; for (let j = 0; j < i; j++) n += LEVELS[j].termCount; return n; }
