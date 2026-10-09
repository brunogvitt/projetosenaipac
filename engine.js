/* ==========================================================================
   engine.js — O MOTOR DO JOGO (as regras)
   --------------------------------------------------------------------------
   É aqui que tudo acontece: movimento, IA dos fantasmas, colisões, pontos,
   vidas e troca de nível. Este arquivo NÃO desenha nada — ele chama
   drawFrame (render.js) para pintar e avisa a tela quando algo muda.

   Como o movimento funciona (importante!):
   O Pac-Man e os fantasmas andam CASA POR CASA, nunca livres pelo mapa.
   Cada um guarda quatro informações:
     tx, ty   = a casa de onde saiu
     dtx, dty = a casa para onde está indo
     prog     = o quanto já andou (0 = saiu, 1 = chegou)
   A posição em pixels é calculada a partir disso (syncPos). Assim é IMPOSSÍVEL
   atravessar paredes: só se anda para uma casa vizinha que esteja livre.
   ========================================================================== */

// As quatro direções e o quanto elas mudam x e y
const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  
  // A direção contrária de cada uma (usada quando um fantasma dá meia-volta)
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  
  // Em caso de empate, o fantasma prefere esta ordem (igual ao arcade original)
  const PREFERENCE = ['up', 'left', 'down', 'right'];
  
  /* Tabela das frutas: uma por nível, cada vez mais valiosa */
  const FRUITS = [
    { id: 'cherry', name: 'Cereja', points: 100 },
    { id: 'strawberry', name: 'Morango', points: 300 },
    { id: 'orange', name: 'Laranja', points: 500 },
    { id: 'apple', name: 'Maçã', points: 700 },
    { id: 'melon', name: 'Melão', points: 1000 },
    { id: 'galaxian', name: 'Galaxian', points: 2000 },
    { id: 'bell', name: 'Sino', points: 3000 },
    { id: 'key', name: 'Chave', points: 5000 },
  ];
  
  /* Qual fruta aparece neste nível (nível 1 = cereja, 2 = morango...) */
  function fruitForLevel(level) {
    return FRUITS[Math.min(FRUITS.length - 1, Math.max(0, level - 1))];
  }
  
  /* ==========================================================================
     OS 7 FANTASMAS
     Cada um tem sua própria forma de caçar (o campo `behavior`). O campo
     fromLevel diz em que nível ele entra na partida:
       1 = Blinky, Pinky, Inky e Clyde (os quatro clássicos)
       2 = Trovão   3 = Eco   4 = Guardião
     ========================================================================== */
  const GHOST_DEFS = [
    {
      id: 'blinky',
      name: 'Blinky',
      color: '#ff2b2b',
      accent: '#ff8080',
      fromLevel: 1,
      behavior: 'direct', // vai direto atrás do Pac-Man
      scatter: { x: 25, y: 1 }, // canto para onde ele foge no "dispersar"
      desc: 'Persegue você direto e acelera quando restam poucas pastilhas.',
    },
    {
      id: 'pinky',
      name: 'Pinky',
      color: '#ff9ad5',
      accent: '#ffc9e8',
      fromLevel: 1,
      behavior: 'ambush', // mira 4 casas à frente do Pac-Man
      scatter: { x: 2, y: 1 },
      desc: 'Mira 4 casas na sua frente para te cortar o caminho.',
    },
    {
      id: 'inky',
      name: 'Inky',
      color: '#38e1ff',
      accent: '#a6f1ff',
      fromLevel: 1,
      behavior: 'flank', // usa o Blinky como referência para fechar o cerco
      scatter: { x: 25, y: 29 },
      desc: 'Usa o Blinky como base para fechar o cerco por trás.',
    },
    {
      id: 'clyde',
      name: 'Clyde',
      color: '#ffb03a',
      accent: '#ffd79a',
      fromLevel: 1,
      behavior: 'shy', // persegue longe, foge quando chega perto
      scatter: { x: 2, y: 29 },
      desc: 'Vem atrás quando você está longe; se chega perto, foge.',
    },
    {
      id: 'trovao',
      name: 'Trovão',
      color: '#39ff88',
      accent: '#c6ffdf',
      fromLevel: 2,
      behavior: 'hunter', // calcula o caminho mais curto de verdade
      scatter: { x: 25, y: 15 },
      desc: 'NOVO: calcula o caminho mais curto de verdade e ignora o dispersar.',
    },
    {
      id: 'eco',
      name: 'Eco',
      color: '#a855f7',
      accent: '#e2ccff',
      fromLevel: 3,
      behavior: 'mirror', // caça a posição espelhada do Pac-Man
      scatter: { x: 3, y: 15 },
      desc: 'NOVO: caça a sua posição espelhada, então surge sempre do outro lado.',
    },
    {
      id: 'guardiao',
      name: 'Guardião',
      color: '#f8fafc',
      accent: '#7dd3fc',
      fromLevel: 4,
      behavior: 'sentinel', // vigia as pastilhas de poder
      scatter: { x: 13, y: 4 },
      desc: 'NOVO: vigia as pastilhas de poder; se você se aproxima, vira caçador.',
    },
  ];
  
  /* ==========================================================================
     DIFICULDADE DO NÍVEL
     Conforme o nível sobe, o Pac-Man e os fantasmas ficam mais rápidos (mas o
     Pac-Man sempre um pouco mais rápido) e o tempo de susto diminui.
     `release` é o tempo, em segundos, para cada fantasma sair da casa.
     ========================================================================== */
  function levelConfig(level) {
    const l = Math.min(level, 21); // a partir do 21 não fica mais difícil
    return {
      pacSpeed: 7.2 + Math.min(1.9, (l - 1) * 0.1), // casas por segundo
      ghostSpeed: 6.2 + Math.min(2.9, (l - 1) * 0.15),
      frightTime: Math.max(2.5, 8.5 - (l - 1) * 0.3), // segundos de susto
      release: [0, 2, 6, 10, 14, 18, 22], // um tempo para cada fantasma
    };
  }
  
  /* ==========================================================================
     RITMO DA PARTIDA
     Os fantasmas alternam entre DISPERSAR (vão para os cantos, mais fácil de
     fugir) e PERSEGUIR (vão atrás de você). Esta é a agenda, em segundos.
     ========================================================================== */
  const SCHEDULE = [
    { mode: 'scatter', time: 7 },
    { mode: 'chase', time: 20 },
    { mode: 'scatter', time: 7 },
    { mode: 'chase', time: 20 },
    { mode: 'scatter', time: 5 },
    { mode: 'chase', time: Infinity }, // daqui em diante, perseguição sem fim
  ];
  
  /* ==========================================================================
     A CLASSE PacmanGame
     Os métodos públicos usados pela tela são: startNewGame, setDirection,
     setSkin, setBest, update e render.
     ========================================================================== */
  class PacmanGame {
    /* ---------------------------------------------------------------- montagem */
    constructor({ onStats, onEvent } = {}) {
      // onStats(tela) avisa a interface a cada mudança (pontos, vidas...)
      // onEvent({ tipo }) avisa em momentos-chave (início, nível completo, fim)
      this.onStats = onStats || (() => {});
      this.onEvent = onEvent || (() => {});
      this.skin = { color: '#ffe600', accessory: 'none' };
      this.phase = 'idle';
      this.time = 0; // relógio geral (usado nas animações)
      this.score = 0;
      this.lives = 3;
      this.best = 0;
      this.extraLife = false;
      this.fruitLog = []; // frutas já comidas nesta partida
      this.statsTimer = 0; // controla de quanto em quanto tempo avisa a tela
      this.popups = []; // textos que sobem pelo tabuleiro (+200...)
      this.mazeLayer = null; // labirinto pré-desenhado (veja render.js)
      this.started = false;
      this.level = 1;
      this.loadLevel(1); // já monta o nível 1, parado, esperando o JOGAR
    }
  
    /* Troca a aparência do Pac-Man (cor + acessório) */
    setSkin(skin) {
      this.skin = { ...this.skin, ...skin };
    }
  
    /* Guarda o recorde (só aumenta, nunca diminui) */
    setBest(value) {
      this.best = Math.max(this.best, value);
    }
  
    /* ------------------------------------------------------------------ níveis */
    /* Monta um nível do zero: labirinto, pastilhas, fantasmas e contadores */
    loadLevel(level) {
      this.level = level;
      const base = MAZES[(level - 1) % MAZES.length]; // um labirinto atrás do outro
      this.maze = parseMaze(base);
      this.cfg = levelConfig(level);
      this.pellets = new Set(this.maze.pellets);
      this.powers = new Set(this.maze.powers);
      this.totalPellets = this.pellets.size + this.powers.size;
      this.eatenPellets = 0;
      this.fruitSpawned = 0;
      this.fruit = null;
      this.fruitTimer = 0;
      this.popups = [];
      this.mode = 'scatter';
      this.modeIndex = 0;
      this.modeTimer = SCHEDULE[0].time;
      this.frightTimer = 0;
      this.ghostCombo = 0; // fantasmas engolidos em sequência
      this.levelTime = 0; // quanto tempo já se passou neste nível
      this.readyTimer = 2.2; // tempo do "PRONTO!"
      this.deathTimer = 0;
      this.clearTimer = 0;
      this.phase = 'ready';
      this.pacField = null; // tabela de distâncias usada pelo Trovão
      this.resetActors(); // posiciona Pac-Man e fantasmas
      this.emitStats(true);
    }
  
    /* Coloca todo mundo na posição inicial */
    resetActors() {
      const m = this.maze;
      // O Pac-Man nasce parado, olhando para a esquerda
      this.pac = {
        tx: m.pac.x,
        ty: m.pac.y,
        dtx: m.pac.x,
        dty: m.pac.y,
        prog: 0,
        dir: 'left',
        wanted: 'left', // a direção que o jogador pediu (pode ser diferente)
        x: 0,
        y: 0,
      };
      this.syncPos(this.pac);
  
      // Só entram os fantasmas que já foram liberados no nível atual
      const active = GHOST_DEFS.filter((d) => d.fromLevel <= this.level);
      this.ghosts = active.map((def, i) => {
        // O primeiro fantasma começa FORA da casa; os outros esperam dentro
        const home = i === 0 ? m.outside : m.homes[(i - 1) % m.homes.length];
        const inHouse = i !== 0;
        const ghost = {
          def,
          id: def.id,
          name: def.name,
          tx: home.x,
          ty: home.y,
          dtx: home.x,
          dty: home.y,
          prog: 0,
          dir: i === 0 ? 'left' : 'up',
          home: { ...home }, // lembra de onde saiu, para voltar depois de ser comido
          state: inHouse ? 'house' : 'hunt', // house | exiting | hunt | eyes | entering
          release: this.cfg.release[i] ?? 26, // segundo em que ele sai da casa
          bob: Math.random() * 6, // fase da "flutuação" dentro da casa
          x: 0,
          y: 0,
        };
        this.syncPos(ghost);
        return ghost;
      });
      // dentro da casa o fantasma fica centralizado e flutuando
      this.ghosts.forEach((g) => {
        if (g.state === 'house') {
          g.x = g.home.x * TILE + TILE / 2;
          g.y = g.home.y * TILE + TILE / 2;
        }
      });
      this.ghostCount = this.ghosts.length;
    }
  
    /* Calcula a posição em pixels a partir de tx/ty/dtx/dty/prog:
       é uma simples interpolação entre a casa de saída e a de chegada. */
    syncPos(e) {
      const ax = e.tx * TILE + TILE / 2; // centro da casa de saída
      const ay = e.ty * TILE + TILE / 2;
      const bx = e.dtx * TILE + TILE / 2; // centro da casa de chegada
      const by = e.dty * TILE + TILE / 2;
      e.x = ax + (bx - ax) * e.prog;
      e.y = ay + (by - ay) * e.prog;
    }
  
    /* --------------------------------------------------------------- partidas */
    /* Começa uma partida nova: zera pontos, devolve as 3 vidas e volta ao nível 1 */
    startNewGame() {
      this.score = 0;
      this.lives = 3;
      this.extraLife = false;
      this.fruitLog = [];
      this.started = true;
      this.loadLevel(1);
      sfx.start();
      this.onEvent({ type: 'start' });
    }
  
    /* -------------------------------------------------------- controle do jogador */
    /* Chamado quando o jogador aperta uma seta / WASD / seta da tela.
       A direção fica guardada em `wanted` e só é aplicada quando o Pac-Man
       chegar na próxima casa (assim ele nunca entra numa parede). */
    setDirection(name) {
      const p = this.pac;
      if (!p) return;
      sfx.unlock(); // o primeiro toque libera o áudio do navegador
      p.wanted = name;
      if (this.phase !== 'playing' && this.phase !== 'ready') return;
      // Se o jogador pediu para voltar (direção contrária) NO MEIO de uma casa,
      // trocamos as casas de lugar e invertemos o progresso: o Pac-Man dá
      // meia-volta na hora, sem esperar chegar na casa seguinte.
      if (name === OPPOSITE[p.dir] && (p.dtx !== p.tx || p.dty !== p.ty)) {
        const tx = p.tx;
        const ty = p.ty;
        p.tx = p.dtx;
        p.ty = p.dty;
        p.dtx = tx;
        p.dty = ty;
        p.prog = 1 - p.prog;
        p.dir = name;
        this.syncPos(p);
      }
    }
  
    /* O Pac-Man pode ir para a casa vizinha nessa direção? (porta = não) */
    canPacGo(tx, ty, name) {
      const d = DIRS[name];
      return isOpen(this.maze, tx + d.x, ty + d.y);
    }
  
    /* Começa a andar para a casa vizinha na direção indicada */
    steer(e, name) {
      const d = DIRS[name];
      e.dir = name;
      e.dtx = e.tx + d.x;
      e.dty = e.ty + d.y;
      e.prog = 0;
    }
  
    /* ==========================================================================
       moveEntity: faz o bicho andar `dist` pixels neste quadro.
       O laço existe porque, num único quadro, ele pode chegar em uma casa e
       já seguir para a próxima (é o onArrive que decide para onde ir). O
       `guard` evita um laço infinito em caso de dado estranho.
       ========================================================================== */
    moveEntity(e, dist, onArrive) {
      let remaining = dist;
      let guard = 0;
      while (remaining > 0.0001 && guard < 12) {
        guard++;
        if (e.dtx === e.tx && e.dty === e.ty) break; // está parado
        const need = (1 - e.prog) * TILE; // quanto falta para chegar na casa
        const step = Math.min(remaining, need);
        e.prog += step / TILE;
        remaining -= step;
        if (e.prog >= 0.99999) {
          // chegou: a casa de destino vira a casa atual...
          e.tx = e.dtx;
          e.ty = e.dty;
          e.prog = 0;
          onArrive(e); // ...e o motor decide o próximo passo
        }
      }
      this.syncPos(e);
    }
  
    /* Chegou numa casa: come o que tiver ali e escolhe para onde seguir.
       Prioridade: a direção que o jogador pediu; se não der, continua reto.
       Se nenhuma der certo, o Pac-Man para (encostado na parede). */
    pacArrive() {
      const p = this.pac;
      this.eatAt(p.tx, p.ty); // come a pastilha (ou a fruta) desta casa
      if (this.canPacGo(p.tx, p.ty, p.wanted)) {
        this.steer(p, p.wanted);
        return;
      }
      if (this.canPacGo(p.tx, p.ty, p.dir)) {
        this.steer(p, p.dir);
        return;
      }
      p.dtx = p.tx;
      p.dty = p.ty;
      p.prog = 0;
    }
  
    /* Atualiza o Pac-Man no quadro: anda na velocidade do nível atual */
    updatePac(dt) {
      const p = this.pac;
      if (p.dtx === p.tx && p.dty === p.ty) this.pacArrive(); // estava parado
      if (this.phase !== 'playing') return; // no "PRONTO!" ele só pode virar
      const speed = this.cfg.pacSpeed * TILE; // casas/s → pixels/s
      this.moveEntity(p, speed * dt, () => this.pacArrive());
    }
  
    /* ======================================================================
       VELOCIDADE DOS FANTASMAS
       Regras: assustado fica bem mais lento; Clyde (tímido) é um pouco mais
       lento; o Guardião acelera quando você está perto; e o Blinky acelera
       quando restam poucas pastilhas (o famoso "Cruise Elroy").
       Os olhos voltando para casa são bem rápidos.
       ====================================================================== */
    ghostSpeed(ghost) {
      if (ghost.state === 'eyes') return this.cfg.ghostSpeed * 2.4 * TILE;
      let s = this.cfg.ghostSpeed;
      if (this.frightTimer > 0) s *= 0.55;
      else {
        if (ghost.def.behavior === 'shy') s *= 0.94;
        if (ghost.def.behavior === 'sentinel' && this.sentinelNear(ghost)) s *= 1.14;
        if (ghost.id === 'blinky' && this.pellets.size + this.powers.size < 25) s *= 1.18;
      }
      return s * TILE;
    }
  
    /* O Guardião está a até 6 casas do Pac-Man? */
    sentinelNear(ghost) {
      const p = this.pac;
      return Math.abs(ghost.tx - p.tx) + Math.abs(ghost.ty - p.ty) <= 6;
    }
  
    /* Atualiza todos os fantasmas no quadro */
    updateGhosts(dt) {
      // O Trovão precisa de uma tabela de distâncias até o Pac-Man. Ela é
      // recalculada uma vez por quadro e só quando ele está solto.
      const hunterActive = this.ghosts.some((g) => g.def.behavior === 'hunter' && g.state === 'hunt');
      this.pacField = hunterActive ? distanceField(this.maze, { x: this.pac.tx, y: this.pac.ty }) : null;
  
      for (const ghost of this.ghosts) {
        if (ghost.state === 'house') {
          // esperando dentro da casa: sobe e desce flutuando
          ghost.bob += dt * 4;
          ghost.x = ghost.home.x * TILE + TILE / 2;
          ghost.y = ghost.home.y * TILE + TILE / 2 + Math.sin(ghost.bob) * 3.5;
          if (this.levelTime >= ghost.release) ghost.state = 'exiting'; // hora de sair
          continue;
        }
        if (ghost.state === 'exiting') {
          this.updateExiting(ghost, dt); // saindo da casa (animação própria)
          continue;
        }
        if (ghost.state === 'entering') {
          this.updateEntering(ghost, dt); // voltando para dentro (depois de comido)
          continue;
        }
        // caçando / assustado / olhos: anda normalmente pelo labirinto
        if (ghost.dtx === ghost.tx && ghost.dty === ghost.ty) this.ghostArrive(ghost);
        const speed = this.ghostSpeed(ghost);
        this.moveEntity(ghost, speed * dt, () => this.ghostArrive(ghost));
      }
    }
  
    /* SAINDO DA CASA: primeiro se alinha no meio da portinha (x), depois sobe
       até a casa de fora. Essa parte é feita na mão (sem o sistema de casas)
       porque dentro da casa o labirinto é fechado de propósito. */
    updateExiting(ghost, dt) {
      const m = this.maze;
      const cx = m.door.x * TILE + TILE / 2; // centro da portinha
      const exitY = m.exitY * TILE + TILE / 2;
      const speed = 5 * TILE * dt;
      if (Math.abs(ghost.x - cx) > 0.5) {
        ghost.x += Math.sign(cx - ghost.x) * Math.min(speed, Math.abs(cx - ghost.x));
      } else if (ghost.y > exitY + 0.5) {
        ghost.x = cx;
        ghost.y -= Math.min(speed, ghost.y - exitY);
      } else {
        // chegou lá fora: volta para o sistema normal de casas
        ghost.tx = m.door.x;
        ghost.ty = m.exitY;
        ghost.dtx = m.door.x;
        ghost.dty = m.exitY;
        ghost.prog = 0;
        ghost.x = cx;
        ghost.y = exitY;
        ghost.state = 'hunt';
        ghost.dir = Math.random() < 0.5 ? 'left' : 'right'; // sai para um lado qualquer
        this.ghostArrive(ghost);
      }
    }
  
    /* ENTRANDO NA CASA (depois de ser engolido): desce pela portinha e depois
       desliza para o lado até o seu lugar. Ao chegar, volta ao estado 'house'
       e já marca a hora de sair de novo. */
    updateEntering(ghost, dt) {
      const m = this.maze;
      const cx = m.door.x * TILE + TILE / 2;
      const homeX = ghost.home.x * TILE + TILE / 2;
      const homeY = ghost.home.y * TILE + TILE / 2;
      const speed = 7 * TILE * dt;
      if (Math.abs(ghost.y - homeY) > 0.5) {
        ghost.x = cx;
        ghost.y += Math.sign(homeY - ghost.y) * Math.min(speed, Math.abs(homeY - ghost.y));
      } else if (Math.abs(ghost.x - homeX) > 0.5) {
        ghost.y = homeY;
        ghost.x += Math.sign(homeX - ghost.x) * Math.min(speed, Math.abs(homeX - ghost.x));
      } else {
        ghost.tx = ghost.home.x;
        ghost.ty = ghost.home.y;
        ghost.dtx = ghost.tx;
        ghost.dty = ghost.ty;
        ghost.prog = 0;
        ghost.state = 'house';
        ghost.bob = 0;
        ghost.release = this.levelTime + 1.4; // sai de novo em 1,4s
        this.syncPos(ghost);
      }
    }
  
    /* ======================================================================
       ghostTarget(ghost) — "para onde este fantasma quer ir?"
       Este é o cérebro que diferencia cada um dos 7. O alvo é uma CASA, e o
       fantasma sempre escolhe o caminho que chega mais perto dela.
       ====================================================================== */
    ghostTarget(ghost) {
      const m = this.maze;
      const p = this.pac;
  
      // Olhos voltando para casa: o alvo é a portinha do labirinto
      if (ghost.state === 'eyes') return { x: m.door.x, y: m.exitY };
  
      // No modo dispersar todos fogem para seu canto (menos o Trovão, que ignora)
      if (this.mode === 'scatter' && ghost.def.behavior !== 'hunter') return ghost.def.scatter;
  
      switch (ghost.def.behavior) {
        case 'ambush': {
          // Pinky: 4 casas à frente do Pac-Man (na direção em que ele anda)
          const d = DIRS[p.dir];
          return { x: p.tx + d.x * 4, y: p.ty + d.y * 4 };
        }
        case 'flank': {
          // Inky: pega o ponto 2 casas à frente do Pac-Man, traça a reta desde
          // o Blinky e dobra a distância — o alvo é o outro lado do Pac-Man
          const blinky = this.ghosts.find((g) => g.id === 'blinky') || ghost;
          const d = DIRS[p.dir];
          const px = p.tx + d.x * 2;
          const py = p.ty + d.y * 2;
          return { x: px * 2 - blinky.tx, y: py * 2 - blinky.ty };
        }
        case 'shy': {
          // Clyde: longe (mais de 8 casas) persegue; perto, foge para o canto
          const near = Math.abs(ghost.tx - p.tx) + Math.abs(ghost.ty - p.ty);
          return near > 8 ? { x: p.tx, y: p.ty } : ghost.def.scatter;
        }
        case 'mirror':
          // Eco: mira a posição do Pac-Man espelhada na horizontal
          return { x: MAZE_W - 1 - p.tx, y: p.ty };
        case 'sentinel': {
          // Guardião: perto do Pac-Man vira caçador; longe, vigia a pastilha
          // de poder mais próxima (para defendê-la)
          if (this.sentinelNear(ghost)) return { x: p.tx, y: p.ty };
          let best = null;
          let bestDist = Infinity;
          for (const i of this.powers) {
            const px = i % MAZE_W;
            const py = (i / MAZE_W) | 0;
            const d = Math.abs(px - ghost.tx) + Math.abs(py - ghost.ty);
            if (d < bestDist) {
              bestDist = d;
              best = { x: px, y: py };
            }
          }
          return best || { x: p.tx, y: p.ty };
        }
        default:
          // Blinky e todos os outros: o alvo é o próprio Pac-Man
          return { x: p.tx, y: p.ty };
      }
    }
  
    /* ======================================================================
       ghostArrive(ghost) — chegou numa casa: escolhe a próxima direção.
       Só olha as casas vizinhas livres e NUNCA volta para trás (a não ser que
       não exista outra opção). Depois escolhe, entre as possíveis, aquela que
       chega mais perto do alvo.
       ====================================================================== */
    ghostArrive(ghost) {
      // Os olhos chegaram na portinha? Então agora descem para dentro da casa
      if (ghost.state === 'eyes' && ghost.tx === this.maze.door.x && ghost.ty === this.maze.exitY) {
        ghost.state = 'entering';
        return;
      }
  
      const target = this.ghostTarget(ghost);
      const frightened = this.frightTimer > 0 && ghost.state === 'hunt';
  
      // 1) lista as direções possíveis (sem paredes, porta ou meia-volta)
      const options = [];
      for (const name of PREFERENCE) {
        if (name === OPPOSITE[ghost.dir]) continue; // não volta para trás
        const d = DIRS[name];
        const nx = ghost.tx + d.x;
        const ny = ghost.ty + d.y;
        if (!isOpen(this.maze, nx, ny)) continue; // parede/porta: descartado
        options.push({ name, nx, ny });
      }
  
      // 2) sem saída (beco): só resta dar meia-volta
      if (!options.length) {
        this.steer(ghost, OPPOSITE[ghost.dir]);
        return;
      }
  
      // 3) escolhe a melhor opção
      let chosen = options[0];
      if (frightened) {
        // assustado: anda ao acaso (fica imprevisível)
        chosen = options[Math.floor(Math.random() * options.length)];
      } else if (ghost.def.behavior === 'hunter' && this.pacField) {
        // Trovão: usa a tabela de distâncias reais até o Pac-Man
        let best = Infinity;
        for (const o of options) {
          const value = this.pacField[o.ny * MAZE_W + o.nx];
          const score = value < 0 ? 1e6 : value; // inalcançável = nota péssima
          if (score < best) {
            best = score;
            chosen = o;
          }
        }
      } else {
        // Todos os outros: a opção cuja casa fica mais perto do alvo.
        // (Usamos distância ao quadrado para não precisar de raiz quadrada.)
        let best = Infinity;
        for (const o of options) {
          const dx = o.nx - target.x;
          const dy = o.ny - target.y;
          const score = dx * dx + dy * dy;
          if (score < best) {
            best = score;
            chosen = o;
          }
        }
      }
      this.steer(ghost, chosen.name);
    }
  
    /* ======================================================================
       PONTUAÇÃO
       ====================================================================== */
    /* Cria um texto que sobe pelo tabuleiro (+200, +100, VIDA EXTRA...) */
    addPopup(x, y, text, color = '#fde047') {
      this.popups.push({ x, y, text, color, life: 0.9 }); // vive 0,9 segundo
    }
  
    /* Soma pontos e dá uma vida extra ao passar de 10.000 (uma vez por partida) */
    addScore(points) {
      this.score += points;
      if (!this.extraLife && this.score >= 10000) {
        this.extraLife = true;
        this.lives += 1;
        sfx.extraLife();
        this.addPopup(this.pac.x, this.pac.y - 12, 'VIDA EXTRA', '#4ade80');
      }
    }
  
    /* Come o que existe nesta casa: pastilha (10), pastilha de poder (50) ou fruta */
    eatAt(x, y) {
      const i = y * MAZE_W + x; // a casa vira um número
      if (this.pellets.has(i)) {
        this.pellets.delete(i);
        this.addScore(10);
        this.onPelletEaten();
      } else if (this.powers.has(i)) {
        this.powers.delete(i);
        this.addScore(50);
        this.startFright(); // liga o susto nos fantasmas
        this.onPelletEaten();
      }
      if (this.fruit && this.fruit.x === x && this.fruit.y === y) this.eatFruit();
    }
  
    /* Depois de comer uma pastilha: confere se acabou o nível e se é hora da fruta */
    onPelletEaten() {
      this.eatenPellets += 1;
      if (this.pellets.size + this.powers.size === 0) {
        // não sobrou nenhuma pastilha: nível completo!
        this.phase = 'cleared';
        this.clearTimer = 2.6; // tempo da comemoração antes do próximo nível
        sfx.levelClear();
        this.onEvent({ type: 'levelClear', level: this.level });
        this.emitStats(true);
        return;
      }
      // a fruta aparece ao comer a 70ª e a 170ª pastilha do nível
      if (this.eatenPellets === 70 && this.fruitSpawned === 0) this.spawnFruit();
      if (this.eatenPellets === 170 && this.fruitSpawned === 1) this.spawnFruit();
      this.emitStats();
    }
  
    /* Coloca a fruta no tabuleiro, no lugar marcado no labirinto */
    spawnFruit() {
      this.fruitSpawned += 1;
      this.fruit = { ...this.maze.fruit, kind: fruitForLevel(this.level).id, points: fruitForLevel(this.level).points };
      this.fruitTimer = 9.5; // some depois de 9,5 segundos
    }
  
    /* Comeu a fruta: soma os pontos e mostra o texto flutuante */
    eatFruit() {
      const fruit = this.fruit;
      if (!fruit) return;
      this.fruit = null;
      this.addScore(fruit.points);
      this.fruitLog = [...this.fruitLog, fruit.kind];
      sfx.fruit();
      this.addPopup(fruit.x * TILE + TILE / 2, fruit.y * TILE, `+${fruit.points}`, '#fca5a5');
      this.emitStats(true);
    }
  
    /* ======================================================================
       SUSTO (pastilha de poder)
       Além de assustar, os fantasmas que estão soltos dão meia-volta na hora —
       é isso que dá a chance de escapar.
       ====================================================================== */
    startFright() {
      this.frightTimer = this.cfg.frightTime;
      this.ghostCombo = 0;
      for (const ghost of this.ghosts) {
        if (ghost.state === 'hunt') this.reverse(ghost);
      }
      // adianta a saída do próximo fantasma da casa (deixa o jogo mais agitado)
      const waiting = this.ghosts.find((g) => g.state === 'house');
      if (waiting) waiting.release = Math.min(waiting.release, this.levelTime + 0.8);
      sfx.power();
    }
  
    /* Meia-volta no meio do caminho: troca as casas e inverte o progresso */
    reverse(ghost) {
      if (ghost.dtx === ghost.tx && ghost.dty === ghost.ty) return; // está parado
      const tx = ghost.tx;
      const ty = ghost.ty;
      ghost.tx = ghost.dtx;
      ghost.ty = ghost.dty;
      ghost.dtx = tx;
      ghost.dty = ty;
      ghost.prog = 1 - ghost.prog;
      ghost.dir = OPPOSITE[ghost.dir];
      this.syncPos(ghost);
    }
  
    /* ======================================================================
       ENGOLIR UM FANTASMA
       A pontuação dobra a cada fantasma na mesma pastilha de poder:
       200 → 400 → 800 → 1600
       ====================================================================== */
    eatGhost(ghost) {
      this.ghostCombo = Math.min(this.ghostCombo + 1, 4);
      const points = 200 * 2 ** (this.ghostCombo - 1);
      this.addScore(points);
      this.addPopup(ghost.x, ghost.y - 10, `+${points}`, '#67e8f9');
      sfx.eatGhost();
      ghost.state = 'eyes'; // vira olhos e volta correndo para a casa
      this.reverse(ghost);
      this.emitStats(true);
    }
  
    /* ======================================================================
       COLISÕES
       Compara a posição do Pac-Man com a de cada fantasma. A conta usa
       distância ao quadrado (sem raiz) e considera "encostou" quando os dois
       estão a menos de 0,7 de uma casa de distância.
       ====================================================================== */
    checkCollisions() {
      const p = this.pac;
      for (const ghost of this.ghosts) {
        if (ghost.state !== 'hunt') continue; // olhos/saindo da casa não matam
        const dx = ghost.x - p.x;
        const dy = ghost.y - p.y;
        if (dx * dx + dy * dy > (TILE * 0.7) ** 2) continue;
        if (this.frightTimer > 0) this.eatGhost(ghost); // está assustado: morre
        else {
          this.killPac(); // te pegou!
          return;
        }
      }
    }
  
    /* O Pac-Man foi pego: começa a animação de morte */
    killPac() {
      this.phase = 'dying';
      this.deathTimer = 1.6;
      sfx.death();
      this.emitStats(true);
    }
  
    /* Acabou a animação de morte: perde uma vida ou termina o jogo */
    afterDeath() {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.lives = 0;
        this.phase = 'gameover';
        sfx.setMuted(false); // garante que o som não fique desligado no fim
        this.onEvent({ type: 'gameOver', score: this.score, level: this.level });
      } else {
        // volta ao "PRONTO!" com o nível intacto: as pastilhas comidas continuam
        this.resetActors();
        this.frightTimer = 0;
        this.ghostCombo = 0;
        this.mode = 'scatter';
        this.modeIndex = 0;
        this.modeTimer = SCHEDULE[0].time;
        this.levelTime = 0;
        this.fruit = null;
        this.phase = 'ready';
        this.readyTimer = 1.6;
      }
      this.emitStats(true);
    }
  
    /* ======================================================================
       update(dt) — o coração: roda a cada quadro e avança o jogo
       dt = tempo desde o último quadro (em segundos, ex.: 0,0166 a 60fps)
       ====================================================================== */
    update(dt) {
      this.time += dt;
  
      // os textos flutuantes envelhecem e desaparecem
      this.popups = this.popups.filter((pop) => {
        pop.life -= dt;
        return pop.life > 0;
      });
  
      if (!this.started) return; // ainda na tela inicial
  
      if (this.phase === 'ready') {
        // contagem do "PRONTO!" — o Pac-Man já pode virar, mas não anda
        this.readyTimer -= dt;
        this.updatePacAnim(dt);
        if (this.readyTimer <= 0) {
          this.phase = 'playing';
          this.emitStats(true);
        }
        return;
      }
      if (this.phase === 'dying') {
        // animação de morte: só espera acabar
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.afterDeath();
        return;
      }
      if (this.phase === 'cleared') {
        // comemoração e vai para o nível seguinte
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) this.loadLevel(this.level + 1);
        return;
      }
      if (this.phase !== 'playing') return;
  
      /* -------- daqui para baixo: jogo rolando -------- */
      this.levelTime += dt;
  
      if (this.frightTimer > 0) {
        // o susto está acabando (e o combo volta a zero quando termina)
        this.frightTimer = Math.max(0, this.frightTimer - dt);
        if (this.frightTimer === 0) this.ghostCombo = 0;
      } else {
        // relógio da agenda: dispersar ↔ perseguir
        this.modeTimer -= dt;
        if (this.modeTimer <= 0 && this.modeIndex < SCHEDULE.length - 1) {
          this.modeIndex += 1;
          this.mode = SCHEDULE[this.modeIndex].mode;
          this.modeTimer = SCHEDULE[this.modeIndex].time;
          // trocar de modo faz todos darem meia-volta (como no arcade)
          for (const ghost of this.ghosts) if (ghost.state === 'hunt') this.reverse(ghost);
        }
      }
  
      // a fruta tem prazo de validade
      if (this.fruit) {
        this.fruitTimer -= dt;
        if (this.fruitTimer <= 0) this.fruit = null;
      }
  
      this.updatePacAnim(dt); // boca abrindo e fechando
      this.updatePac(dt); // move o Pac-Man
      this.updateGhosts(dt); // move os fantasmas
      this.checkCollisions(); // alguém encostou em alguém?
  
      // avisa a interface (no máximo 10 vezes por segundo, para não pesar)
      this.statsTimer -= dt;
      if (this.statsTimer <= 0) this.emitStats();
    }
  
    /* A boca do Pac-Man: oscila entre quase fechada (0,28) e bem aberta (0,78) */
    updatePacAnim(dt) {
      this.pacMouth = 0.28 + 0.5 * Math.abs(Math.sin(this.time * 12));
    }
  
    /* ======================================================================
       emitStats(force) — manda os números para a interface
       force = true manda na hora (usado em momentos importantes: morte,
       nível novo...). Sem force, só manda se passou 0,1s da última vez.
       ====================================================================== */
    emitStats(force) {
      if (!force && this.statsTimer > 0) return;
      this.statsTimer = 0.1;
      this.onStats({
        started: this.started,
        phase: this.phase,
        score: this.score,
        lives: this.lives,
        level: this.level,
        mazeName: this.maze ? this.maze.name : '',
        pelletsLeft: this.pellets ? this.pellets.size + this.powers.size : 0,
        totalPellets: this.totalPellets || 0,
        fright: this.frightTimer,
        combo: this.ghostCombo,
        fruit: this.fruit ? this.fruit.kind : null,
        fruits: this.fruitLog,
        ghostCount: this.ghostCount || 0,
        mode: this.mode,
        ready: Math.max(0, this.readyTimer || 0),
        best: this.best,
      });
    }
  
    /* Entrega o desenho para o render.js */
    render(ctx, time) {
      drawFrame(ctx, this, time);
    }
  }