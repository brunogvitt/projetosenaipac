/* ==========================================================================
   render.js — TUDO O QUE É DESENHADO NO CANVAS
   --------------------------------------------------------------------------
   Nenhuma regra de jogo aqui: este arquivo só sabe PINTAR o que o motor
   (engine.js) diz que existe. As duas funções públicas são:

     createMazeLayer()  → desenha o labirinto UMA vez em um canvas escondido
                          (é o truque para o jogo rodar liso: nada de redesenhar
                          centenas de paredes a cada quadro)
     drawFrame()        → pinta um quadro completo do jogo

   Usa as constantes que vêm de mazes.js (MAZE_W, MAZE_H, TILE).
   ========================================================================== */

// Cores fixas do cenário
const BG = '#05060f'; // fundo escuro do tabuleiro
const PELLET = '#f6e7c1'; // pastilha comum (branco quente)
const POWER = '#ffd93b'; // pastilha de poder (amarelo)

/* alphaColor('#3b82f6', 0.35) → 'rgba(59, 130, 246, 0.35)'
   Serve para usar a cor do labirinto com transparência (brilho, sombra). */
function alphaColor(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ==========================================================================
   1) A CAMADA DO LABIRINTO (pintada uma única vez por nível)
   Para cada casa que é parede, olhamos os quatro lados: se o vizinho não é
   parede, desenhamos a linha DAQUELE lado. O resultado é o contorno do
   labirinto, exatamente como no arcade.
   wallOverride = '#ffffff' é usado para criar a versão que pisca quando o
   nível termina.
   ========================================================================== */
function createMazeLayer(maze, wallOverride) {
  const canvas = document.createElement('canvas'); // canvas fora da tela
  canvas.width = MAZE_W * TILE;
  canvas.height = MAZE_H * TILE;
  const ctx = canvas.getContext('2d');
  const wallColor = wallOverride || maze.wall;
  const glow = wallOverride || maze.glow || maze.wall;

  // 1º: um quadrado bem apagado em cada parede, para dar "massa" ao traço
  ctx.fillStyle = alphaColor(wallColor, 0.09);
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      if (isWall(maze, x, y)) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // 2º: juntamos todas as bordas em um único caminho (bem mais rápido)
  ctx.beginPath();
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      if (!isWall(maze, x, y)) continue;
      const px = x * TILE;
      const py = y * TILE;
      if (!isWall(maze, x, y - 1)) {
        ctx.moveTo(px, py); // borda de cima
        ctx.lineTo(px + TILE, py);
      }
      if (!isWall(maze, x, y + 1)) {
        ctx.moveTo(px, py + TILE); // borda de baixo
        ctx.lineTo(px + TILE, py + TILE);
      }
      if (!isWall(maze, x - 1, y)) {
        ctx.moveTo(px, py); // borda da esquerda
        ctx.lineTo(px, py + TILE);
      }
      if (!isWall(maze, x + 1, y)) {
        ctx.moveTo(px + TILE, py); // borda da direita
        ctx.lineTo(px + TILE, py + TILE);
      }
    }
  }

  // 3º: o brilho neon. Passamos o mesmo traço duas vezes:
  //     uma grossa e translúcida (o halo) e outra fina e sólida (a linha).
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = alphaColor(glow, 0.35);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.shadowColor = glow; // shadowBlur = brilho
  ctx.shadowBlur = 9;
  ctx.strokeStyle = wallColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 4º: a portinha rosa da casa dos fantasmas
  ctx.strokeStyle = '#ff9ad5';
  ctx.lineWidth = 3;
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      if (!isDoor(maze, x, y)) continue;
      ctx.beginPath();
      ctx.moveTo(x * TILE, y * TILE + TILE / 2);
      ctx.lineTo(x * TILE + TILE, y * TILE + TILE / 2);
      ctx.stroke();
    }
  }
  return canvas;
}

/* ==========================================================================
   2) PASTILHAS
   A comum é um pontinho. A de poder pulsa (o tamanho varia com o tempo) e
   tem brilho amarelo.
   ========================================================================== */
function drawPellet(ctx, x, y, power, time) {
  if (power) {
    const pulse = 4.4 + Math.sin(time * 6) * 1.1; // oscila entre 3.3 e 5.5 px
    ctx.save();
    ctx.shadowColor = POWER;
    ctx.shadowBlur = 12;
    ctx.fillStyle = POWER;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.fillStyle = PELLET;
  ctx.beginPath();
  ctx.arc(x, y, 2.1, 0, Math.PI * 2); // raio fixo de 2,1 px
  ctx.fill();
}

/* ==========================================================================
   3) ACESSÓRIOS DO PAC-MAN (o que o jogador escolhe na personalização)
   Cada um é desenhado com formas simples em cima da cabeça do Pac-Man.
   r = raio do Pac-Man, usado como unidade de medida.
   ========================================================================== */
function drawAccessory(ctx, x, y, r, accessory, color) {
  if (!accessory || accessory === 'none') return;
  ctx.save();
  if (accessory === 'cap') {
    // Boné: meia-lua vermelha + aba
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.55, r * 0.72, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r * 0.1, y - r * 1.15, r * 1.5, r * 0.28);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(x - r * 0.1, y - r * 1.02, r * 1.5, r * 0.16);
  } else if (accessory === 'crown') {
    // Coroa: zigue-zague fechado
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.75, y - r * 0.55);
    ctx.lineTo(x - r * 0.5, y - r * 1.35);
    ctx.lineTo(x - r * 0.2, y - r * 0.7);
    ctx.lineTo(x, y - r * 1.5);
    ctx.lineTo(x + r * 0.2, y - r * 0.7);
    ctx.lineTo(x + r * 0.5, y - r * 1.35);
    ctx.lineTo(x + r * 0.75, y - r * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (accessory === 'glasses') {
    // Óculos: duas lentes claras + haste + pupilas escuras
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.fillStyle = 'rgba(219, 234, 254, 0.92)';
    ctx.beginPath();
    ctx.arc(x - r * 0.36, y - r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.36, y - r * 0.28, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.1, y - r * 0.28);
    ctx.lineTo(x + r * 0.1, y - r * 0.28);
    ctx.stroke();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(x - r * 0.36, y - r * 0.26, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.36, y - r * 0.26, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (accessory === 'antenna') {
    // Antena: haste inclinada + bolinha rosa na ponta
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.95);
    ctx.lineTo(x + r * 0.35, y - r * 1.7);
    ctx.stroke();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y - r * 1.78, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (accessory === 'band') {
    // Faixa de herói: tira azul + ponta voando para a direita
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - r * 0.92, y - r * 0.72, r * 1.84, r * 0.26);
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.85, y - r * 0.62);
    ctx.lineTo(x + r * 1.6, y - r * 0.35);
    ctx.lineTo(x + r * 1.5, y - r * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ==========================================================================
   4) O PAC-MAN
   Desenhamos uma "fatia de pizza": um arco que vai de `mouth` até 360-mouth.
   Quanto MAIOR o valor de mouth, mais aberta está a boca; quando ele come,
   esse valor muda a cada quadro (o motor manda game.pacMouth).

   Truque: girar o desenho (ctx.rotate) faz uma única forma apontar para os
   quatro lados, sem precisar de quatro desenhos diferentes.
   ========================================================================== */
function drawPac(ctx, x, y, dir, mouth, color, accessory, scale = 1, alpha = 1) {
  const r = TILE * 0.46 * scale; // raio padrão: 7,36 px (quase uma casa)
  // converte a direção em um ângulo de rotação
  const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir] ?? 0;
  ctx.save();
  ctx.globalAlpha = alpha; // usado para a animação de morte (vai sumindo)
  ctx.translate(x, y); // move o "zero" para o centro do Pac-Man
  ctx.rotate(angle); // gira
  ctx.shadowColor = color;
  ctx.shadowBlur = 10; // brilho neon da cor escolhida
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0); // do centro...
  ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth); // ...até o arco
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (alpha > 0.5) {
    // o acessório só aparece quando o Pac-Man está bem visível
    ctx.save();
    ctx.globalAlpha = alpha;
    drawAccessory(ctx, x, y, r, accessory, color);
    ctx.restore();
  }
}

/* ==========================================================================
   5) OS FANTASMAS

   drawGhostBody: o corpo clássico = cúpula em cima + três ondas embaixo.
   A "fase" alterna a cada 1/6 de segundo, fazendo as ondas trocarem de lado
   (é isso que dá a impressão de que o fantasma está flutuando).
   ========================================================================== */
function drawGhostBody(ctx, x, y, r, time) {
  const bottom = y + r * 0.55; // altura da barra de ondas
  const seg = (r * 2) / 3; // largura de cada onda
  const phase = Math.floor(time * 6) % 2;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.12, r, Math.PI, 0); // cúpula (meia volta)
  ctx.lineTo(x + r, bottom);
  for (let i = 0; i < 3; i++) {
    const cx = x + r - seg * (i + 0.5);
    // o último parâmetro (true/false) decide se a onda é para cima ou para baixo
    ctx.arc(cx, bottom, seg / 2, 0, Math.PI, (i + phase) % 2 === 0);
  }
  ctx.closePath();
}

/* Olhos: dois ovalados brancos + pupilas que olham para onde o fantasma vai */
function drawEyes(ctx, x, y, r, dir, pupilColor = '#1e3a8a') {
  const d = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[dir] ||
    { x: 0, y: 0 };
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.32, y - r * 0.22, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.32, y - r * 0.22, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pupilColor;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * r * 0.32 + d.x * r * 0.11, y - r * 0.22 + d.y * r * 0.13, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Marcas que diferenciam cada fantasma (um "detalhe de personalidade") */
function drawGhostMarks(ctx, ghost, x, y, r) {
  const id = ghost.id;
  if (id === 'pinky') {
    // cílios
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.1;
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + side * r * 0.32 + i * r * 0.09, y - r * 0.55);
        ctx.lineTo(x + side * r * 0.32 + i * r * 0.13, y - r * 0.78);
        ctx.stroke();
      }
    }
  } else if (id === 'inky') {
    // argolas em volta dos olhos
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x - r * 0.32, y - r * 0.22, r * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.32, y - r * 0.22, r * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'clyde') {
    // sobrancelha
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.72, r * 0.5, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r * 0.5, y - r * 0.78, r, r * 0.2);
  } else if (id === 'trovao') {
    // raio
    ctx.strokeStyle = '#0b3b1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.1, y - r * 0.1);
    ctx.lineTo(x - r * 0.2, y + r * 0.28);
    ctx.lineTo(x + r * 0.02, y + r * 0.28);
    ctx.lineTo(x - r * 0.14, y + r * 0.66);
    ctx.stroke();
  } else if (id === 'guardiao') {
    // coroa dourada
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.62);
    ctx.lineTo(x - r * 0.34, y - r * 1.15);
    ctx.lineTo(x - r * 0.12, y - r * 0.78);
    ctx.lineTo(x, y - r * 1.22);
    ctx.lineTo(x + r * 0.12, y - r * 0.78);
    ctx.lineTo(x + r * 0.34, y - r * 1.15);
    ctx.lineTo(x + r * 0.5, y - r * 0.62);
    ctx.closePath();
    ctx.fill();
  }
}

/* ==========================================================================
   drawGhost: junta tudo e trata os estados especiais
     - 'eyes'   → já foi engolido: só os olhos voltando para casa
     - assustado (frightTimer > 0) → azul, e piscando de branco no fim
     - Eco tem 78% de opacidade (dá a impressão de fantasma "fantasma")
   ========================================================================== */
function drawGhost(ctx, ghost, time, frightTimer) {
  const r = TILE * 0.44;
  const { x, y, dir } = ghost;
  const fright = frightTimer > 0 && ghost.state === 'hunt';
  ctx.save();
  if (ghost.state === 'eyes') {
    // engolido: nada de corpo, só os olhos voltando para a casa
    drawEyes(ctx, x, y, r, dir, '#1d4ed8');
    ctx.restore();
    return;
  }
  if (ghost.id === 'eco') ctx.globalAlpha = 0.78;
  let body = ghost.def.color;
  let pupil = '#1e3a8a';
  if (fright) {
    // nos últimos 2 segundos pisca entre branco e azul 8 vezes por segundo
    const flashing = frightTimer < 2 && Math.floor(time * 8) % 2 === 0;
    body = flashing ? '#f8fafc' : '#2563eb';
    pupil = flashing ? '#b91c1c' : '#f8fafc';
  }
  ctx.shadowColor = fright ? '#60a5fa' : body;
  ctx.shadowBlur = 9;
  ctx.fillStyle = body;
  drawGhostBody(ctx, x, y, r, time);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (ghost.id === 'eco') {
    // contorno claro para diferenciar o Eco
    ctx.strokeStyle = '#e2ccff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (fright) {
    // assustado: olhos + uma boca em zigue-zague
    drawEyes(ctx, x, y, r, dir, pupil);
    ctx.strokeStyle = pupil;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      if (i === -1) ctx.moveTo(x + i * r * 0.22, y + r * 0.3);
      else ctx.lineTo(x + i * r * 0.22, y + r * 0.3);
      ctx.lineTo(x + i * r * 0.22 + r * 0.11, y + r * 0.42);
    }
    ctx.stroke();
  } else {
    drawEyes(ctx, x, y, r, dir);
    drawGhostMarks(ctx, ghost, x, y, r);
  }
  ctx.restore();
}

/* ==========================================================================
   6) AS FRUTAS
   Cada fruta é desenhada com formas geométricas simples. O tipo vem do
   nível (veja FRUITS em engine.js): cereja, morango, laranja, maçã, melão,
   galaxian, sino e, por último, a chave.
   ========================================================================== */
function drawFruit(ctx, kind, x, y, time) {
  const r = TILE * 0.42;
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#f87171';
  if (kind === 'cherry') {
    // duas bolinhas vermelhas + cabinho curvo
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y + r * 0.4, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.42, y + r * 0.5, r * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.1);
    ctx.quadraticCurveTo(x, y - r * 1.2, x + r * 0.5, y - r * 0.2);
    ctx.stroke();
  } else if (kind === 'strawberry') {
    // corpo arredondado + folhas em triângulo
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.2);
    ctx.quadraticCurveTo(x, y + r * 1.1, x + r * 0.7, y - r * 0.2);
    ctx.quadraticCurveTo(x, y - r * 0.9, x - r * 0.7, y - r * 0.2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.3);
    ctx.lineTo(x, y - r * 0.95);
    ctx.lineTo(x + r * 0.7, y - r * 0.3);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'orange') {
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.4, y - r * 0.55, r * 0.35, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'apple') {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.15, r * 0.66, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.15, y - r * 1);
    ctx.stroke();
  } else if (kind === 'melon') {
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.3, y - r * 0.5);
      ctx.lineTo(x + i * r * 0.3, y + r * 0.7);
      ctx.stroke();
    }
  } else if (kind === 'galaxian') {
    // navezinha: triângulo amarelo + base azul
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.8);
    ctx.lineTo(x + r * 0.35, y + r * 0.4);
    ctx.lineTo(x - r * 0.35, y + r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - r * 0.7, y + r * 0.2, r * 1.4, r * 0.35);
  } else if (kind === 'bell') {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.65, y + r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.85, x, y - r * 0.85);
    ctx.quadraticCurveTo(x + r * 0.6, y - r * 0.85, x + r * 0.65, y + r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - r * 0.15, y - r * 1.05, r * 0.3, r * 0.25);
  } else {
    // chave (a última fruta, a mais valiosa)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.45, r * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.05, y - r * 0.2);
    ctx.lineTo(x + r * 0.5, y + r * 0.7);
    ctx.moveTo(x + r * 0.35, y + r * 0.45);
    ctx.lineTo(x + r * 0.6, y + r * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ==========================================================================
   7) O QUADRO COMPLETO
   A ORDEM dos desenhos é o que define o que fica por cima:
     fundo → labirinto → pastilhas → fruta → fantasmas → Pac-Man → textos
   ========================================================================== */
function drawFrame(ctx, game, time) {
  // fundo
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, MAZE_W * TILE, MAZE_H * TILE);

  // o labirinto só é redesenhado quando muda de fase/nível (guardamos a
  // referência em game.mazeLayerMaze para saber se ainda vale)
  if (!game.mazeLayer || game.mazeLayerMaze !== game.maze) {
    game.mazeLayer = createMazeLayer(game.maze);
    game.mazeFlashLayer = createMazeLayer(game.maze, '#ffffff'); // versão que pisca
    game.mazeLayerMaze = game.maze;
  }
  // quando o nível termina, o labirinto pisca entre colorido e branco
  const flashing = game.phase === 'cleared' && Math.floor(time * 6) % 2 === 0;
  ctx.drawImage(flashing ? game.mazeFlashLayer : game.mazeLayer, 0, 0);

  // pastilhas: o índice guardado é convertido de volta para x,y
  if (game.pellets) {
    ctx.save();
    for (const i of game.pellets) {
      drawPellet(ctx, (i % MAZE_W) * TILE + TILE / 2, ((i / MAZE_W) | 0) * TILE + TILE / 2, false, time);
    }
    for (const i of game.powers) {
      drawPellet(ctx, (i % MAZE_W) * TILE + TILE / 2, ((i / MAZE_W) | 0) * TILE + TILE / 2, true, time);
    }
    ctx.restore();
  }

  // fruta (só enquanto o tempo dela não acabou)
  if (game.fruit && game.fruitTimer > 0) {
    drawFruit(ctx, game.fruit.kind, game.fruit.x * TILE + TILE / 2, game.fruit.y * TILE + TILE / 2, time);
  }

  // fantasmas
  if (game.ghosts) {
    for (const ghost of game.ghosts) {
      if (!ghost.def) continue;
      drawGhost(ctx, ghost, time, game.frightTimer || 0);
    }
  }

  // Pac-Man (na morte, a boca abre até virar um círculo inteiro e ele some)
  if (game.pac) {
    if (game.phase === 'dying') {
      const progress = 1 - Math.max(0, game.deathTimer) / 1.6;
      if (progress < 0.9) {
        drawPac(
          ctx,
          game.pac.x,
          game.pac.y,
          game.pac.dir,
          Math.PI * progress,
          game.skin.color,
          game.skin.accessory,
          1,
          1,
        );
      }
    } else {
      drawPac(ctx, game.pac.x, game.pac.y, game.pac.dir, game.pacMouth || 0.3, game.skin.color, game.skin.accessory);
    }
  }

  // textos flutuantes (+200, VIDA EXTRA...) e o aviso "PRONTO!"
  ctx.save();
  ctx.textAlign = 'center';
  for (const pop of game.popups || []) {
    ctx.globalAlpha = Math.min(1, pop.life * 1.6); // vai desaparecendo
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y - (0.9 - pop.life) * 18); // vai subindo
  }
  ctx.globalAlpha = 1;
  if (game.started && game.phase === 'ready' && game.readyTimer > 0.2) {
    ctx.font = 'bold 15px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.fillText('PRONTO!', MAZE_W * TILE * 0.5, 17.4 * TILE);
  }
  ctx.restore();
}