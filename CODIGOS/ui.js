/* ==========================================================================
   ui.js — LIGA A TELA (HTML) AO MOTOR DO JOGO (engine.js)
   --------------------------------------------------------------------------
   Este é o arquivo que "conversa" com os dois lados:
     - recebe os números do motor (onStats) e escreve no HTML;
     - escuta cliques, teclas e arrastos e manda para o motor.

   No app em React, esta mesma responsabilidade estava dividida em vários
   componentes: Pacman.jsx (a tela toda), GameCanvas.jsx (canvas + teclado),
   Hud.jsx, StartScreen.jsx, GameOverScreen.jsx, PauseScreen.jsx,
   TouchControls.jsx, SkinPicker.jsx, GhostLegend.jsx, Leaderboard.jsx e
   PacPreview.jsx.
   ========================================================================== */

/* ==========================================================================
   1) ATALHOS PARA OS ELEMENTOS DO HTML
   $('game') é o mesmo que document.getElementById('game').
   Guardamos tudo em um objeto `el` para não ficar repetindo o getElementById.
   ========================================================================== */
   const $ = (id) => document.getElementById(id);

   const canvasJogo = $('game');
   const boardCtx = canvasJogo.getContext('2d'); // o "pincel" do canvas do jogo
   
   // O canvas tem 448x496 pixels lógicos (28x31 casas de 16). Para ficar nítido
   // em telas de alta densidade, multiplicamos pelo devicePixelRatio (no máximo 2)
   const dpr = Math.min(2, window.devicePixelRatio || 1);
   canvasJogo.width = MAZE_W * TILE * dpr;
   canvasJogo.height = MAZE_H * TILE * dpr;
   
   const el = {
     // botões do topo
     sound: $('btn-sound'),
     pause: $('btn-pause'),
     restart: $('btn-restart'),
     // telas
     startScreen: $('screen-start'),
     pauseScreen: $('screen-pause'),
     overScreen: $('screen-over'),
     levelClear: $('level-clear'),
     // tela inicial
     start: $('btn-start'),
     startBest: $('start-best'),
     pacPreview: $('pac-preview'),
     // tela de fim de jogo
     overScore: $('over-score'),
     overLevel: $('over-level'),
     overRecord: $('over-record'),
     name: $('player-name'),
     save: $('btn-save'),
     again: $('btn-again'),
     // painel (HUD)
     score: $('hud-score'),
     best: $('hud-best'),
     levelLabel: $('hud-level'),
     maze: $('hud-maze'),
     lives: $('hud-lives'),
     fruit: $('hud-fruit'),
     collected: $('hud-collected'),
     pellets: $('hud-pellets'),
     fright: $('hud-fright'),
     // coluna lateral
     colors: $('color-list'),
     accessories: $('accessory-list'),
     skinPreview: $('skin-preview'),
     rank: $('rank-list'),
     rankEmpty: $('rank-empty'),
     refresh: $('btn-refresh'),
     ghosts: $('ghost-list'),
     // controles do celular
     dpad: $('dpad'),
   };
   
   /* ==========================================================================
      2) ESTADO DA TELA
      São os mesmos "useState" que existiam no React.
      ========================================================================== */
   let skin = loadSkin(); // aparência escolhida (lida do navegador)
   let best = loadBest(); // recorde
   let semSom = false; // som desligado? (nome diferente de `muted` do sound.js)
   let pausado = false;
   let resultado = null; // { score, level } da última partida
   let salvo = false; // já mandou a pontuação para o placar?
   let nivelDesenhado = 0; // para redesenhar a lista de fantasmas só quando muda
   // Últimos números que o motor mandou (usados nos cliques de pausa etc.)
   let snapshot = {
     started: false,
     phase: 'ready',
     score: 0,
     lives: 3,
     level: 1,
     mazeName: '',
     pelletsLeft: 0,
     fruits: [],
     fright: 0,
     combo: 0,
   };
   
   /* Emoji de cada fruta, para mostrar no painel */
   const FRUIT_EMOJI = {
     cherry: '🍒',
     strawberry: '🍓',
     orange: '🍊',
     apple: '🍎',
     melon: '🍈',
     galaxian: '👾',
     bell: '🔔',
     key: '🔑',
   };
   
   /* ==========================================================================
      3) UTILIDADES
      ========================================================================== */
   
   /* Mostra ou esconde um elemento usando a classe .overlay-hidden do CSS */
   function mostrar(elemento, visivel) {
     if (!elemento) return;
     elemento.classList.toggle('overlay-hidden', !visivel);
   }
   
   /* ==========================================================================
      4) PLACAR
      No app em React o placar fica no banco de dados (entidade PacScore) e é
      compartilhado entre todos. Aqui, rodando sozinho no navegador, ele é
      guardado no localStorage.
      ========================================================================== */
   const CHAVE_PLACAR = 'pacman.scores';
   
   function carregarPlacar() {
     try {
       const raw = localStorage.getItem(CHAVE_PLACAR);
       const lista = raw ? JSON.parse(raw) : [];
       return Array.isArray(lista) ? lista : [];
     } catch {
       return [];
     }
   }
   
   function salvarPlacar(lista) {
     try {
       localStorage.setItem(CHAVE_PLACAR, JSON.stringify(lista));
     } catch {
       /* sem armazenamento disponível */
     }
   }
   
   /* Desenha as 5 melhores pontuações na lista do HTML */
   function renderizarPlacar() {
     const lista = carregarPlacar().sort((a, b) => b.score - a.score).slice(0, 5);
     el.rank.innerHTML = ''; // limpa a lista atual
     mostrar(el.rankEmpty, lista.length === 0);
   
     lista.forEach((linha, i) => {
       const item = document.createElement('li');
       item.className = 'rank-row';
   
       // posição (1º, 2º...) + nome
       const esquerda = document.createElement('span');
       esquerda.style.display = 'flex';
       esquerda.style.alignItems = 'center';
       esquerda.style.gap = '8px';
       esquerda.style.minWidth = '0';
       const posicao = document.createElement('span');
       posicao.className = 'rank-pos';
       posicao.textContent = `${i + 1}º`;
       const nome = document.createElement('span');
       nome.className = 'rank-name';
       nome.textContent = linha.player_name; // textContent = seguro contra HTML no nome
       esquerda.append(posicao, nome);
   
       // nível + pontos
       const direita = document.createElement('span');
       direita.style.display = 'flex';
       direita.style.alignItems = 'center';
       direita.style.gap = '8px';
       const nivel = document.createElement('span');
       nivel.className = 'rank-level';
       nivel.textContent = `nv ${linha.level ?? 1}`;
       const pontos = document.createElement('span');
       pontos.className = 'rank-score';
       pontos.textContent = linha.score;
       direita.append(nivel, pontos);
   
       item.append(esquerda, direita);
       el.rank.appendChild(item);
     });
   }
   
   /* Chamado pelo botão "Salvar no placar" da tela de fim de jogo */
   function salvarPontuacao() {
     if (!resultado || salvo) return;
     const nome = (el.name.value || '').trim();
   
     const lista = carregarPlacar();
     lista.push({
       player_name: (nome || 'Anônimo').slice(0, 16), // no máximo 16 letras
       score: resultado.score,
       level: resultado.level,
       maze: snapshot.mazeName,
       skin: skin.accessory === 'none' ? 'clássico' : skin.accessory,
     });
     lista.sort((a, b) => b.score - a.score);
     salvarPlacar(lista.slice(0, 20)); // guarda só as 20 melhores
   
     storePlayerName(nome);
     salvo = true;
     el.save.disabled = true;
     el.save.textContent = 'Salvo no placar!';
     renderizarPlacar(); // aparece na hora na lista ao lado
   }
   
   /* ==========================================================================
      5) PERSONALIZAÇÃO DO PAC-MAN (cartão "SEU PAC-MAN")
      ========================================================================== */
   
   /* Desenha um Pac-Man em um canvas pequeno (a prévia) usando a MESMA função
      que desenha o Pac-Man do jogo: render.js → drawPac() */
   function pintarPac(canvas, tamanho) {
     const d = Math.min(2, window.devicePixelRatio || 1);
     canvas.width = tamanho * d;
     canvas.height = tamanho * d;
     canvas.style.width = `${tamanho}px`;
     canvas.style.height = `${tamanho}px`;
     const c = canvas.getContext('2d');
     c.setTransform(d, 0, 0, d, 0, 0); // trabalha em "pixels lógicos"
     c.clearRect(0, 0, tamanho, tamanho);
     // escala = tamanho/30 (mesma proporção usada no app)
     drawPac(c, tamanho / 2, tamanho / 2, 'right', 0.5, skin.color, skin.accessory, tamanho / 30);
   }
   
   function pintarPreviews() {
     pintarPac(el.pacPreview, 72); // prévia grande da tela inicial
     pintarPac(el.skinPreview, 54); // prévia pequena do cartão
   }
   
   /* Cria as bolinhas de cor (uma por cor de PAC_COLORS) */
   function renderizarCores() {
     el.colors.innerHTML = '';
     PAC_COLORS.forEach((cor) => {
       const botao = document.createElement('button');
       botao.type = 'button';
       const ativa = skin.color.toLowerCase() === cor.value.toLowerCase();
       botao.className = ativa ? 'swatch is-active' : 'swatch';
       botao.style.background = cor.value;
       botao.title = cor.label;
       botao.setAttribute('aria-label', cor.label);
       botao.addEventListener('click', () => trocarSkin({ color: cor.value }));
       el.colors.appendChild(botao);
     });
   }
   
   /* Cria os botões de acessório (um por item de PAC_ACCESSORIES) */
   function renderizarAcessorios() {
     el.accessories.innerHTML = '';
     PAC_ACCESSORIES.forEach((item) => {
       const botao = document.createElement('button');
       botao.type = 'button';
       botao.className = skin.accessory === item.id ? 'chip is-active' : 'chip';
       botao.textContent = item.label;
       botao.addEventListener('click', () => trocarSkin({ accessory: item.id }));
       el.accessories.appendChild(botao);
     });
   }
   
   /* Troca a aparência: salva no navegador, avisa o motor e atualiza as prévias */
   function trocarSkin(mudanca) {
     skin = { ...skin, ...mudanca };
     storeSkin(skin);
     jogo.setSkin(skin);
     pintarPreviews();
     renderizarCores();
     renderizarAcessorios();
   }
   
   /* ==========================================================================
      6) LEGENDA DOS FANTASMAS
      Montada a partir de GHOST_DEFS (engine.js): nome, cor, descrição e em que
      nível ele entra. Os que ainda não entraram aparecem apagados.
      ========================================================================== */
   function renderizarFantasmas(level) {
     el.ghosts.innerHTML = '';
     GHOST_DEFS.forEach((ghost) => {
       const travado = ghost.fromLevel > level;
   
       const item = document.createElement('li');
       item.className = travado ? 'ghost is-locked' : 'ghost';
   
       // bolinha colorida com o mesmo brilho do fantasma no jogo
       const ponto = document.createElement('span');
       ponto.className = 'ghost-dot';
       ponto.style.background = ghost.color;
       ponto.style.boxShadow = `0 0 10px ${ghost.color}`;
   
       const caixa = document.createElement('div');
       const nome = document.createElement('p');
       nome.className = 'ghost-name';
       nome.textContent = ghost.name;
   
       if (travado) {
         // ainda bloqueado: mostra em que nível ele aparece
         const aviso = document.createElement('span');
         aviso.className = 'ghost-lock';
         aviso.textContent = `nível ${ghost.fromLevel}`;
         nome.appendChild(aviso);
       } else if (ghost.fromLevel > 1) {
         // é um fantasma novo, já liberado
         const novo = document.createElement('span');
         novo.className = 'ghost-new';
         novo.textContent = 'NOVO';
         nome.appendChild(novo);
       }
   
       const descricao = document.createElement('p');
       descricao.className = 'ghost-desc';
       descricao.textContent = ghost.desc;
   
       caixa.append(nome, descricao);
       item.append(ponto, caixa);
       el.ghosts.appendChild(item);
     });
   }
   
   /* ==========================================================================
      7) O PAINEL (HUD) E AS TELAS
      atualizarHud é chamado pelo motor a cada mudança de estado.
      ========================================================================== */
   function atualizarHud(s) {
     snapshot = s; // guarda para os cliques usarem os dados mais recentes
   
     // --- números principais ---
     el.score.textContent = s.score;
     el.best.textContent = best;
     el.levelLabel.textContent = `Nível ${s.level}`;
     el.maze.textContent = s.mazeName || '—';
     el.lives.textContent = '●'.repeat(Math.max(0, s.lives));
     el.pellets.textContent = s.pelletsLeft;
   
     // --- fruta do nível + frutas já coletadas ---
     const fruta = fruitForLevel(s.level);
     el.fruit.textContent = `${FRUIT_EMOJI[fruta.id]} ${fruta.name} · ${fruta.points} pts`;
     if (s.fruits && s.fruits.length) {
       el.collected.textContent = `Coletadas: ${s.fruits.map((id) => FRUIT_EMOJI[id] || '🍒').join(' ')}`;
       mostrar(el.collected, true);
     } else {
       mostrar(el.collected, false);
     }
   
     // --- aviso de fantasmas assustados ---
     if (s.fright > 0) {
       el.fright.textContent = `Fantasmas assustados! Combo x${Math.max(1, s.combo)}`;
       mostrar(el.fright, true);
     } else {
       mostrar(el.fright, false);
     }
   
     // --- telas ---
     mostrar(el.startScreen, !s.started); // tela inicial some ao começar
     mostrar(el.levelClear, s.phase === 'cleared'); // aviso de nível completo
     if (s.phase === 'gameover') mostrar(el.pauseScreen, false);
   
     // --- lista de fantasmas: só redesenha quando o nível muda ---
     if (s.level !== nivelDesenhado) {
       nivelDesenhado = s.level;
       renderizarFantasmas(s.level);
     }
   
     atualizarBotoes();
   }
   
   /* Habilita/desabilita botões e troca os ícones de som e pausa */
   function atualizarBotoes() {
     const travado = !snapshot.started || snapshot.phase === 'gameover';
   
     el.pause.disabled = travado;
     el.pause.textContent = pausado ? '▶' : '⏸';
     el.pause.setAttribute('aria-label', pausado ? 'Continuar' : 'Pausar');
   
     el.sound.textContent = semSom ? '🔇' : '🔊';
     el.sound.setAttribute('aria-label', semSom ? 'Ligar som' : 'Desligar som');
   
     el.startBest.textContent = best; // recorde na tela inicial
   
     // o direcional do celular fica travado durante pausa, morte e fim de jogo
     const dpadTravado = pausado || travado || snapshot.phase === 'dying';
     el.dpad.querySelectorAll('button').forEach((botao) => {
       botao.disabled = dpadTravado;
     });
   }
   
   /* Chamado pelo motor quando a partida termina */
   function aoFimDeJogo(evento) {
     resultado = { score: evento.score, level: evento.level };
     salvo = false;
     pausado = false;
     mostrar(el.pauseScreen, false);
   
     // vira recorde? guarda no navegador
     if (evento.score > best) {
       best = evento.score;
       storeBest(best);
     }
   
     // preenche a tela de fim de jogo
     el.overScore.textContent = evento.score;
     el.overLevel.textContent = evento.level;
     el.overRecord.textContent =
       evento.score >= best && evento.score > 0 ? '🏆 Novo recorde!' : `🏆 Recorde atual: ${best}`;
     el.name.value = loadPlayerName(); // nome usado da última vez
     el.save.disabled = false;
     el.save.textContent = '💾 Salvar no placar';
   
     mostrar(el.overScreen, true);
     atualizarBotoes();
   }
   
   /* ==========================================================================
      8) AÇÕES DOS BOTÕES
      ========================================================================== */
   
   /* Começa (ou recomeça) uma partida. Os dois botões — JOGAR e JOGAR DE NOVO —
      fazem exatamente a mesma coisa, como no app. */
   function iniciarPartida() {
     resultado = null;
     salvo = false;
     pausado = false;
     mostrar(el.overScreen, false);
     mostrar(el.pauseScreen, false);
     // devolve o botão de salvar ao estado inicial (a tela de fim de jogo é
     // reaproveitada, diferente do React que recriava o componente)
     el.save.disabled = false;
     el.save.textContent = '💾 Salvar no placar';
     sfx.unlock(); // libera o áudio (precisa de um clique do usuário)
     sfx.setMuted(semSom);
     jogo.startNewGame();
     atualizarBotoes();
   }
   
   /* Pausa / continua */
   function alternarPausa() {
     if (!snapshot.started || snapshot.phase === 'gameover') return; // nada a pausar
     pausado = !pausado;
     mostrar(el.pauseScreen, pausado);
     atualizarBotoes();
   }
   
   /* Liga / desliga o som */
   function alternarSom() {
     sfx.unlock();
     semSom = !semSom;
     sfx.setMuted(semSom);
     atualizarBotoes();
   }
   
   /* ==========================================================================
      9) CONTROLES
      ========================================================================== */
   
   /* Teclado: setas e WASD movem, P/Esc pausa, M liga/desliga o som */
   const TECLAS = {
     arrowup: 'up',
     w: 'up',
     arrowdown: 'down',
     s: 'down',
     arrowleft: 'left',
     a: 'left',
     arrowright: 'right',
     d: 'right',
   };
   
   window.addEventListener('keydown', (evento) => {
     const tecla = evento.key.toLowerCase();
     if (TECLAS[tecla]) {
       evento.preventDefault(); // impede a página de rolar
       jogo.setDirection(TECLAS[tecla]);
       return;
     }
     if (tecla === 'p' || tecla === 'escape') {
       evento.preventDefault();
       alternarPausa();
     }
     if (tecla === 'm') alternarSom();
   });
   
   /* Arrastar o dedo (ou o mouse) sobre o tabuleiro também muda a direção:
      comparamos o quanto andou em x e em y e escolhemos o eixo maior. */
   let arrasto = null;
   
   canvasJogo.addEventListener('pointerdown', (evento) => {
     arrasto = { x: evento.clientX, y: evento.clientY };
   });
   
   canvasJogo.addEventListener('pointermove', (evento) => {
     if (!arrasto) return;
     const dx = evento.clientX - arrasto.x;
     const dy = evento.clientY - arrasto.y;
     if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // movimento pequeno: ignora
     jogo.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
     arrasto = { x: evento.clientX, y: evento.clientY }; // reinicia a referência
   });
   
   const soltarArrasto = () => {
     arrasto = null;
   };
   
   canvasJogo.addEventListener('pointerup', soltarArrasto);
   canvasJogo.addEventListener('pointerleave', soltarArrasto);
   
   /* Direcional do celular: cada botão tem data-dir="up|down|left|right" */
   el.dpad.querySelectorAll('button').forEach((botao) => {
     botao.addEventListener('click', () => jogo.setDirection(botao.dataset.dir));
   });
   
   /* Botões da tela */
   el.start.addEventListener('click', iniciarPartida);
   el.again.addEventListener('click', iniciarPartida);
   el.restart.addEventListener('click', iniciarPartida);
   el.pause.addEventListener('click', alternarPausa);
   el.sound.addEventListener('click', alternarSom);
   el.save.addEventListener('click', salvarPontuacao);
   el.refresh.addEventListener('click', renderizarPlacar);
   
   /* ==========================================================================
      10) O MOTOR E O LAÇO DE ANIMAÇÃO
      ========================================================================== */
   
   /* Criamos o jogo passando as duas "pontes" com a interface:
        onStats → recebe os números a cada mudança
        onEvent → avisa quando a partida acaba */
   const jogo = new PacmanGame({
     onStats: (numeros) => atualizarHud(numeros),
     onEvent: (evento) => {
       if (evento.type === 'gameOver') aoFimDeJogo(evento);
     },
   });
   jogo.setBest(best);
   jogo.setSkin(skin);
   
   /* O laço: roda ~60 vezes por segundo.
      dt = tempo real desde o quadro anterior (limitado a 0,05 para o jogo não
      dar um "salto" quando a aba fica em segundo plano). */
   let ultimo = performance.now();
   
   function quadro(agora) {
     const dt = Math.min(0.05, Math.max(0, (agora - ultimo) / 1000));
     ultimo = agora;
   
     if (!pausado) jogo.update(dt); // avança as regras (parado se estiver pausado)
   
     boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0); // escala do canvas
     jogo.render(boardCtx, agora / 1000); // desenha o quadro
   
     requestAnimationFrame(quadro); // e pede o próximo
   }
   
   /* ==========================================================================
      11) PRIMEIRA MONTAGEM DA TELA
      ========================================================================== */
   renderizarCores();
   renderizarAcessorios();
   pintarPreviews();
   renderizarFantasmas(1);
   renderizarPlacar();
   atualizarBotoes();
   requestAnimationFrame(quadro);