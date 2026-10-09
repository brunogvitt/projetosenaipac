/* ==========================================================================
   mazes.js — OS LABIRINTOS E AS UTILIDADES DO MAPA
   --------------------------------------------------------------------------
   Cada labirinto é escrito como TEXTO, uma linha por linha da tela, para
   ficar fácil de enxergar o desenho no código:

     '#' parede            '.' pastilha        'o' pastilha de poder
     '-' porta da casa     ' ' corredor vazio (sem pastilha)

   São 28 colunas por 31 linhas (o mesmo tamanho do arcade original).
   ========================================================================== */

// Tamanho do tabuleiro e de cada casa (em pixels, dentro do canvas)
const MAZE_W = 28; // largura em casas
const MAZE_H = 31; // altura em casas
const TILE = 16; // cada casa tem 16x16 pixels  ->  canvas de 448x496

/* --------------------------------------------------------------------------
   1) LABIRINTO 1 — "Neon Clássico" (o desenho tradicional do Pac-Man)
   -------------------------------------------------------------------------- */
const M1 = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '######.##          ##.######',
  '######.##.###  ###.##.######',
  '######.##.###--###.##.######',
  '######.##.#      #.##.######',
  '######.##.#      #.##.######',
  '######.##.########.##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......##.......##..o#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....  ....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o........................o#',
  '############################',
];

/* --------------------------------------------------------------------------
   2) LABIRINTO 2 — "Cripta Roxa"
   A casa dos fantasmas fica UMA LINHA ACIMA (por isso o mapa tem paredes
   diferentes no meio), então ela usa a configuração HOUSE_B mais abaixo.
   -------------------------------------------------------------------------- */
const M2 = [
  '############################',
  '#o...........##...........o#',
  '#.#####.####.##.####.#####.#',
  '#.#####.####.##.####.#####.#',
  '#.......##........##.......#',
  '#.#####.##.######.##.#####.#',
  '#.#####.##.######.##.#####.#',
  '#......##....##....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '######.##          ##.######',
  '######.##.###  ###.##.######',
  '######.##.###--###.##.######',
  '######.##.#      #.##.######',
  '######.##.#      #.##.######',
  '######.##.########.##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......##.......##..o#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....  ....##......#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o........................o#',
  '#..........................#',
  '############################',
];

/* --------------------------------------------------------------------------
   3) LABIRINTO 3 — "Corredor Esmeralda"
   -------------------------------------------------------------------------- */
const M3 = [
  '############################',
  '#..........................#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#o.....##....##....##.....o#',
  '######.#####.##.#####.######',
  '######.#####.##.#####.######',
  '######.##          ##.######',
  '######.##.###  ###.##.######',
  '######.##.###--###.##.######',
  '######.##.#      #.##.######',
  '######.##.#      #.##.######',
  '######.##.########.##.######',
  '#............##............#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#......##          ##......#',
  '######.##.########.##.######',
  '######.##.########.##.######',
  '#......##....  ....##......#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#o........................o#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#............##............#',
  '############################',
];

/* --------------------------------------------------------------------------
   PONTOS IMPORTANTES DO MAPA (posições em casas: x = coluna, y = linha)

   door   = a portinha rosa da casa dos fantasmas
   exitY  = a linha logo acima da portinha (a casa "de fora")
   homes  = onde cada fantasma espera dentro da casa
   pac    = onde o Pac-Man nasce
   fruit  = onde a fruta aparece
   -------------------------------------------------------------------------- */

// Configuração usada pelos labirintos 1 e 3 (casa mais embaixo)
const HOUSE_A = {
  door: { x: 13, y: 13 }, //            linha 13: '######.##.###--###.##.######'
  exitY: 12,
  houseY: 14.5, //                       altura média da casa (para centralizar)
  outside: { x: 13, y: 12 }, //          Blinky já começa do lado de fora
  homes: [
    { x: 13, y: 14 },
    { x: 12, y: 14 },
    { x: 14, y: 14 },
    { x: 11, y: 15 },
    { x: 16, y: 15 },
    { x: 15, y: 15 },
  ],
  pac: { x: 13, y: 23 }, //              Pac-Man nasce no corredor de baixo
  fruit: { x: 13, y: 23 },
};

// Configuração usada pelo labirinto 2 (casa uma linha acima)
const HOUSE_B = {
  door: { x: 13, y: 12 },
  exitY: 11,
  houseY: 13.5,
  outside: { x: 13, y: 11 },
  homes: [
    { x: 13, y: 13 },
    { x: 12, y: 13 },
    { x: 14, y: 13 },
    { x: 11, y: 14 },
    { x: 16, y: 14 },
    { x: 15, y: 14 },
  ],
  pac: { x: 13, y: 22 },
  fruit: { x: 13, y: 22 },
};

/* --------------------------------------------------------------------------
   LISTA DOS LABIRINTOS
   Cada item junta: nome, cor da parede, cor do brilho, o desenho (rows)
   e os pontos importantes (espalhados pela configuração da casa).
   O jogo usa um atrás do outro: nível 1 = item 1, nível 4 = item 1 de novo.
   -------------------------------------------------------------------------- */
const MAZES = [
  {
    name: 'Neon Clássico',
    wall: '#3b82f6', // azul
    glow: '#93c5fd',
    rows: M1,
    ...HOUSE_A, // copia door/exitY/homes/pac/fruit para cá
  },
  {
    name: 'Cripta Roxa',
    wall: '#a855f7', // roxo
    glow: '#e9d5ff',
    rows: M2,
    ...HOUSE_B,
  },
  {
    name: 'Corredor Esmeralda',
    wall: '#10b981', // verde
    glow: '#a7f3d0',
    rows: M3,
    ...HOUSE_A,
  },
];

/* --------------------------------------------------------------------------
   parseMaze(maze)
   Converte o desenho em texto para dados rápidos de consultar durante o jogo:
     tiles   = array com o tipo de cada casa (0 = livre, 2 = porta)
     walls   = array com 1 onde é parede
     pellets = Set (conjunto) com o número de cada pastilha que ainda existe
     powers  = Set com as pastilhas de poder
   Usar Set aqui é o que deixa "comer" a pastilha instantâneo.
   -------------------------------------------------------------------------- */
function parseMaze(maze) {
  const tiles = new Uint8Array(MAZE_W * MAZE_H);
  const walls = new Uint8Array(MAZE_W * MAZE_H);
  const pellets = new Set();
  const powers = new Set();
  for (let y = 0; y < MAZE_H; y++) {
    const row = maze.rows[y] || '';
    for (let x = 0; x < MAZE_W; x++) {
      const ch = row[x];
      const i = y * MAZE_W + x; // transforma (x, y) em um único número
      if (ch === '#') walls[i] = 1;
      else if (ch === '-') tiles[i] = 2;
      else {
        if (ch === '.') pellets.add(i);
        else if (ch === 'o') powers.add(i);
      }
    }
  }
  return { ...maze, tiles, walls, pellets, powers };
}

/* isWall: é parede? (fora do tabuleiro conta como parede, para ninguém sair) */
function isWall(maze, x, y) {
  if (x < 0 || y < 0 || x >= MAZE_W || y >= MAZE_H) return true;
  return maze.walls[y * MAZE_W + x] === 1;
}

/* isDoor: é a portinha da casa dos fantasmas? */
function isDoor(maze, x, y) {
  if (x < 0 || y < 0 || x >= MAZE_W || y >= MAZE_H) return false;
  return maze.tiles[y * MAZE_W + x] === 2;
}

/* isOpen: dá para andar nessa casa? (nem parede, nem porta)
   É isso que garante que os fantasmas NUNCA atravessem o labirinto. */
function isOpen(maze, x, y) {
  return !isWall(maze, x, y) && !isDoor(maze, x, y);
}

/* --------------------------------------------------------------------------
   distanceField(maze, source)
   Busca em largura (BFS): monta uma tabela com a DISTÂNCIA REAL de cada casa
   até a casa de partida (normalmente onde o Pac-Man está). O fantasma Trovão
   usa essa tabela para escolher o caminho mais curto de verdade, e não só
   "andar na direção certa" como os outros.

   O retorno é um array de números: -1 = inalcançável, 0 = a própria casa,
   1 = vizinha, 2 = duas casas depois...
   -------------------------------------------------------------------------- */
function distanceField(maze, source) {
  const dist = new Int16Array(MAZE_W * MAZE_H).fill(-1);
  const qi = []; // fila de casas a visitar
  if (!isOpen(maze, source.x, source.y)) return dist;
  const start = source.y * MAZE_W + source.x;
  dist[start] = 0;
  qi.push(start);

  // "head" é a posição que estamos lendo da fila; o comprimento da fila cresce
  for (let head = 0; head < qi.length; head++) {
    const i = qi[head];
    const x = i % MAZE_W;
    const y = (i / MAZE_W) | 0;
    const d = dist[i] + 1;
    // as quatro casas vizinhas: cima, esquerda, baixo, direita
    const nb = [
      [x, y - 1],
      [x - 1, y],
      [x, y + 1],
      [x + 1, y],
    ];
    for (let k = 0; k < 4; k++) {
      const nx = nb[k][0];
      const ny = nb[k][1];
      if (!isOpen(maze, nx, ny)) continue; // parede/porta: nem entra na fila
      const ni = ny * MAZE_W + nx;
      if (dist[ni] !== -1) continue; // já visitada
      dist[ni] = d;
      qi.push(ni);
    }
  }
  return dist;
}