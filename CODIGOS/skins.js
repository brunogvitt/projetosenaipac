/* ==========================================================================
   skins.js — PERSONALIZAÇÃO DO PAC-MAN + DADOS SALVOS NO NAVEGADOR
   --------------------------------------------------------------------------
   Aqui ficam as opções de cor e acessório e as funções que guardam tudo no
   localStorage (memória do próprio navegador), assim as escolhas, o recorde
   e o nome do jogador continuam lá quando ele volta ao jogo.
   ========================================================================== */

/* Cores disponíveis para o Pac-Man */
const PAC_COLORS = [
    { label: 'Amarelo', value: '#ffe600' },
    { label: 'Laranja', value: '#ff9f1c' },
    { label: 'Vermelho', value: '#ff3b3b' },
    { label: 'Rosa', value: '#ff4fa3' },
    { label: 'Verde', value: '#4ade80' },
    { label: 'Ciano', value: '#22d3ee' },
    { label: 'Azul', value: '#3b82f6' },
    { label: 'Roxo', value: '#a855f7' },
    { label: 'Branco', value: '#f8fafc' },
  ];
  
  /* Acessórios desenhados em cima do Pac-Man (veja drawAccessory em render.js) */
  const PAC_ACCESSORIES = [
    { id: 'none', label: 'Nenhum' },
    { id: 'cap', label: 'Boné' },
    { id: 'crown', label: 'Coroa' },
    { id: 'glasses', label: 'Óculos' },
    { id: 'antenna', label: 'Antena' },
    { id: 'band', label: 'Faixa' },
  ];
  
  /* Aparência padrão (o amarelo clássico, sem acessório) */
  const DEFAULT_SKIN = { color: '#ffe600', accessory: 'none' };
  
  /* loadSkin(): lê a aparência salva. Se não existir nada (ou o texto estiver
     corrompido) devolve a padrão. O try/catch protege contra navegadores que
     bloqueiam o localStorage. */
  function loadSkin() {
    try {
      const raw = localStorage.getItem('pacman.skin');
      if (!raw) return DEFAULT_SKIN;
      const parsed = JSON.parse(raw);
      return {
        color: typeof parsed.color === 'string' ? parsed.color : DEFAULT_SKIN.color,
        accessory: typeof parsed.accessory === 'string' ? parsed.accessory : DEFAULT_SKIN.accessory,
      };
    } catch {
      return DEFAULT_SKIN;
    }
  }
  
  /* storeSkin(): salva a aparência escolhida */
  function storeSkin(skin) {
    try {
      localStorage.setItem('pacman.skin', JSON.stringify(skin));
    } catch {
      /* sem armazenamento disponível — o jogo segue normalmente */
    }
  }
  
  /* loadBest() / storeBest(): recorde do jogador */
  function loadBest() {
    try {
      return Number(localStorage.getItem('pacman.best')) || 0;
    } catch {
      return 0;
    }
  }
  
  function storeBest(value) {
    try {
      localStorage.setItem('pacman.best', String(value));
    } catch {
      /* sem armazenamento disponível */
    }
  }
  
  /* loadPlayerName() / storePlayerName(): nome usado no placar */
  function loadPlayerName() {
    try {
      return localStorage.getItem('pacman.name') || '';
    } catch {
      return '';
    }
  }
  
  function storePlayerName(name) {
    try {
      localStorage.setItem('pacman.name', name);
    } catch {
      /* sem armazenamento disponível */
    }
  }