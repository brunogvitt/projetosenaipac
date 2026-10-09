# projetosenaipac
# Pac-Man Neon — código completo separado por linguagem

Esta pasta é o jogo **inteiro, comentado e dividido por tipo de código**, do jeito que você pediu:

```
codigo/
├── html/   → a estrutura da tela (o que aparece)
├── css/    → o visual (cores, tamanhos, telas, responsivo)
└── js/     → a lógica (motor do jogo, desenho no canvas, som, regras)
```

## Como abrir

Dê dois cliques em `html/index.html`. Ele carrega o CSS de `../css/styles.css` e os scripts de `../js/`.
Não precisa instalar nada nem usar servidor: é HTML + CSS + JavaScript puro e roda direto no navegador.

## O que cada arquivo faz

| Arquivo | O que tem dentro |
| --- | --- |
| `html/index.html` | Toda a estrutura: cabeçalho, tabuleiro (canvas), telas de início / pausa / fim de jogo, painel de pontos, direcional do celular, personalização do Pac-Man, placar e legenda dos fantasmas. |
| `css/styles.css` | Todo o visual: cores neon, fontes, layout de duas colunas, botões, telas sobrepostas, cartões e responsivo. |
| `js/mazes.js` | Os 3 labirintos desenhados em texto (28 colunas × 31 linhas), os pontos de partida da casa dos fantasmas e o cálculo de caminho mais curto (BFS). |
| `js/sound.js` | Os efeitos sonoros criados na hora com a Web Audio API — sem nenhum arquivo de áudio. |
| `js/skins.js` | As cores e os acessórios do Pac-Man + guardar preferências, recorde e nome no navegador. |
| `js/render.js` | Todo o desenho no canvas: paredes com brilho, pastilhas, Pac-Man, os 7 fantasmas e as frutas. |
| `js/engine.js` | O motor do jogo: movimento casa por casa, IA dos 7 fantasmas, colisões, pontuação, vidas e níveis. |
| `js/ui.js` | Liga o HTML ao motor (era o papel do React): HUD, telas, botões, teclado, swipe, direcional e placar. |

## De onde veio cada parte (no app React)

No app eu uso React, e nele o HTML e o JavaScript ficam juntos dentro de cada arquivo `.jsx`.
Este pacote é **o mesmo jogo** com as três linguagens separadas:

| Aqui | No app |
| --- | --- |
| `js/mazes.js` | `src/game/mazes.js` |
| `js/sound.js` | `src/game/sound.js` |
| `js/skins.js` | `src/game/skins.js` |
| `js/render.js` | `src/game/render.js` |
| `js/engine.js` | `src/game/engine.js` |
| `html/` + `css/` + `js/ui.js` | `src/pages/Pacman.jsx` e `src/components/game/*` |

Duas diferenças propositais, por ser uma versão que roda sozinha no navegador:

1. **Placar:** aqui ele é salvo no próprio navegador (`localStorage`). No app ele usa o banco de dados
   da Base44 (entidade `PacScore`), por isso é compartilhado entre todos os jogadores.
2. **Ordem dos scripts:** abrindo o HTML direto do disco o navegador não aceita `import`/`export`,
   então os arquivos se conectam por variáveis globais (e o HTML os carrega na ordem certa).

As **regras do jogo são idênticas**: mesmo motor, mesmos labirintos, mesmas IAs, mesma pontuação.