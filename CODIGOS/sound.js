/* ==========================================================================
   sound.js — EFEITOS SONOROS CRIADOS NA HORA (Web Audio API)
   --------------------------------------------------------------------------
   Nenhum arquivo .mp3 aqui: cada som é uma onda (oscilador) gerada pelo
   navegador na hora do evento. Isso deixa o jogo leve e sem downloads.

   Como funciona: o navegador só libera áudio depois de um clique/toque do
   usuário — por isso existe o sfx.unlock(), chamado quando ele aperta JOGAR
   ou manda uma direção.
   ========================================================================== */

   let ctx = null; // o "estúdio" de áudio do navegador (AudioContext)
   let muted = false; // está sem som?
   let wakaHigh = false; // alterna entre dois tons a cada pastilha (o "waka-waka")
   
   /* audio(): cria (uma única vez) e devolve o AudioContext, retomando-o se o
      navegador o tiver pausado. Se o navegador não souber tocar áudio, devolve
      null e todos os sons simplesmente não acontecem. */
   function audio() {
     if (typeof window === 'undefined') return null;
     const Ctor = window.AudioContext || window.webkitAudioContext;
     if (!Ctor) return null;
     if (!ctx) ctx = new Ctor();
     if (ctx.state === 'suspended') ctx.resume();
     return ctx;
   }
   
   /* tone(): um único som.
      freq    = nota inicial em Hz
      dur     = duração em segundos
      type    = formato da onda (square = som de fliperama)
      gain    = volume
      glideTo = se informado, a nota desliza até esse Hz (usado na morte etc.) */
   function tone(freq, dur, type = 'square', gain = 0.045, glideTo = 0) {
     if (muted) return;
     const ac = audio();
     if (!ac) return;
     const t0 = ac.currentTime;
     const osc = ac.createOscillator(); // o "instrumento"
     const g = ac.createGain(); // o "volume"
     osc.type = type;
     osc.frequency.setValueAtTime(freq, t0);
     if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, glideTo), t0 + dur);
     // o volume sobe no início e cai até quase zero no fim (senão estala)
     g.gain.setValueAtTime(gain, t0);
     g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
     osc.connect(g);
     g.connect(ac.destination);
     osc.start(t0);
     osc.stop(t0 + dur + 0.02);
   }
   
   /* melody(): uma sequência de notas, uma atrás da outra.
      notes = lista de frequências (Hz). step = tempo entre as notas. */
   function melody(notes, step = 0.11) {
     if (muted) return;
     const ac = audio();
     if (!ac) return;
     const t0 = ac.currentTime;
     notes.forEach((freq, i) => {
       const osc = ac.createOscillator();
       const g = ac.createGain();
       osc.type = 'triangle'; // onda triangular = som mais suave
       osc.frequency.setValueAtTime(freq, t0 + i * step); // a nota certa começa no tempo certo
       g.gain.setValueAtTime(0.0001, t0 + i * step);
       g.gain.linearRampToValueAtTime(0.05, t0 + i * step + 0.02);
       g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * step + step * 1.4);
       osc.connect(g);
       g.connect(ac.destination);
       osc.start(t0 + i * step);
       osc.stop(t0 + i * step + step * 1.6);
     });
   }
   
   /* --------------------------------------------------------------------------
      sfx: a "caixa de sons" do jogo. O motor chama estas funções.
      -------------------------------------------------------------------------- */
   const sfx = {
     unlock() {
       audio(); // libera o áudio no primeiro clique/toque
     },
   
     setMuted(value) {
       muted = value;
     },
   
     isMuted() {
       return muted;
     },
   
     // Cada pastilha alterna entre dois tons: dá o efeito "waka-waka"
     pellet() {
       wakaHigh = !wakaHigh;
       tone(wakaHigh ? 340 : 210, 0.055, 'square', 0.028, wakaHigh ? 250 : 160);
     },
   
     // Pastilha de poder: som grave que sobe
     power() {
       tone(120, 0.28, 'sawtooth', 0.05, 240);
     },
   
     // Engolir um fantasma: quatro notas rápidas subindo
     eatGhost() {
       melody([420, 620, 880, 1180], 0.08);
     },
   
     // Comer uma fruta: duas notas curtas
     fruit() {
       melody([880, 1320], 0.12);
     },
   
     // Pegar um item qualquer
     pickup() {
       melody([900, 1200, 1500], 0.07);
     },
   
     // Vida extra aos 10.000 pontos: cinco notas subindo
     extraLife() {
       melody([660, 880, 1100, 1320, 1760], 0.1);
     },
   
     // Morte do Pac-Man: nota que despenca de 430 Hz até 60 Hz em 0,85s
     death() {
       tone(430, 0.85, 'sawtooth', 0.06, 60);
     },
   
     // Nível completo: quatro notas comemorando
     levelClear() {
       melody([660, 830, 990, 1320], 0.14);
     },
   
     // Início da partida
     start() {
       melody([520, 660, 780, 1040], 0.13);
     },
   };