(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const home = el('home');
  const header = document.querySelector('header');

  if (!home || !header) return;
  if (el('liamcitoHome')) return;

  document.title = 'Liamcito GameStore';

  const brand = header.querySelector('strong');
  if (brand) {
    brand.classList.add('lg-brand');
    brand.innerHTML = '🎮 LIAMCITO <span>GAMESTORE</span>';
  }

  const games = [
    { id: 'chess', name: 'Ositos vs. Capibaras', description: 'Ajedrez · Estrategia', art: '🧸♟️🦫', theme: 'lg-chess' },
    { id: 'racing', name: 'Turbo Racing', description: 'Carreras · Velocidad', art: '🏎️💨', theme: 'lg-racing' },
    { id: 'tridents', name: 'Tridentes Acuáticos', description: 'Lógica · Rompecabezas', art: '🌊🔱', theme: 'lg-tridents' },
    { id: 'guess', name: 'Adivina el número', description: 'Suerte · Recompensas', art: '🎲❓', theme: 'lg-guess' }
  ];

  function gameCards() {
    return games.map(game => `
      <article class="lg-game ${game.theme}">
        <div class="lg-game-art">${game.art}</div>
        <div class="lg-game-info">
          <h3>${game.name}</h3>
          <p>${game.description}</p>
        </div>
        <button type="button" class="lg-game-action" data-lg-game="${game.id}">▶ Jugar</button>
      </article>
    `).join('');
  }

  // Página principal. No se eliminan secciones ni datos del juego.
  home.innerHTML = `
    <div id="liamcitoHome" class="lg-home">
      <div class="lg-welcome">
        <h2>¡Bienvenido, campeón!</h2>
        <p>Tu próxima aventura comienza aquí.</p>
      </div>
      <div class="lg-featured">
        <div class="lg-featured-art">🐉🔥</div>
        <div class="lg-tag">★ JUEGO PRINCIPAL</div>
        <h2>Arena Pokémon<br>de Campeones</h2>
        <p>Colecciona Pokémon, forma tu equipo, desafía a tus amigos y conviértete en una leyenda.</p>
        <button type="button" class="lg-play" data-lg-game="pokemon">▶ JUGAR AHORA</button>
      </div>
      <div>
        <h2 class="lg-section-title">🎮 Explora nuestros juegos</h2>
        <div class="lg-games-grid">${gameCards()}</div>
      </div>
      <div>
        <h2 class="lg-section-title">⚡ Accesos rápidos</h2>
        <div class="lg-shortcuts">
          <button type="button" data-lg-cloud="packs">🎁 Tienda Pokémon online</button>
          <button type="button" data-lg-cloud="dex">📖 Pokémon online</button>
          <button type="button" data-lg-section="shop">🛍️ Tienda local</button>
          <button type="button" data-lg-section="index">📚 Pokémon locales</button>
          <button type="button" data-lg-section="online">🌐 Multijugador</button>
          <button type="button" data-lg-section="cpu">🤖 Contra CPU</button>
          <button type="button" data-lg-section="packs">🎁 Sobres locales</button>
          <button type="button" data-lg-section="trade">🔁 Intercambios</button>
          <button type="button" data-lg-section="games">🎯 Minijuegos</button>
        </div>
      </div>
      <footer class="lg-footer">🎮 Liamcito GameStore<br>Un universo de aventuras.</footer>
    </div>
  `;
document.body.classList.add('liamcito-store');
  const pokemonMenu = document.createElement('dialog');
  pokemonMenu.id = 'lgPokemonMenu';
  pokemonMenu.style.cssText = `
    width:min(90vw,420px);
    max-height:85vh;
    overflow:auto;
    background:#141a2c;
    color:white;
    border:1px solid #8957ff;
    border-radius:24px;
    padding:24px;
  `;
  pokemonMenu.innerHTML = `
    <h2>⚔️ Arena Pokémon</h2>
    <p>Elige cómo quieres jugar o administrar tus Pokémon.</p>
    <div style="display:grid;gap:12px">
      <button type="button" data-lg-mode="local">⚔️ Batalla local</button>
      <button type="button" data-lg-mode="cpu">🤖 Contra CPU</button>
      <button type="button" data-lg-mode="online">🌐 Multijugador online</button>
      <button type="button" data-lg-mode="cloud-packs">🎁 Tienda Pokémon online · Bono diario</button>
      <button type="button" data-lg-mode="cloud-dex">📖 Mi colección online</button>
      <button type="button" data-lg-mode="shop">🛍️ Tienda local</button>
      <button type="button" data-lg-mode="packs">🎁 Sobres locales</button>
      <button type="button" data-lg-mode="index">📚 Mis Pokémon locales</button>
      <button type="button" data-lg-mode="close" style="background:#29334b;color:white">Cerrar</button>
    </div>
  `;
  document.body.appendChild(pokemonMenu);

  // Se reutilizan las pestañas y la tienda online existentes.
  // No se crean monedas ni se realizan operaciones en Supabase.
  function openCloud(view = 'packs') {
    const page = el('lgPokemonCloud');
    const tab = el(view === 'dex' ? 'cloudTabDex' : 'cloudTabPacks');
    if (page && typeof window.show === 'function') {
      window.show('lgPokemonCloud');
      const tabs = page.querySelectorAll('[data-cloud-view]');
      const choice = [...tabs].find(button => button.dataset.cloudView === view);
      if (choice) {
        choice.click();
      } else {
        const inventory = el('onlineInventory');
        const store = el('cloudStore');
        if (inventory) inventory.hidden = true;
        if (store) store.hidden = false;
        tab?.click();
        el('cloudStoreRefresh')?.click();
      }
      return;
    }
    // Si el módulo de layout aún no cargó, abrir el multijugador
    // sin fingir que se abrió una tienda que no existe.
    if (typeof window.show === 'function') window.show('online');
    window.alert('La tienda online todavía no está disponible. Comprueba que liamcito-layout.js esté cargando correctamente.');
  }

  function openOnlineMode(mode) {
    window.show('online');
    const room = el('onlineRoom');
    if (room && !room.hidden) {
      const back = [...room.querySelectorAll('button')]
        .find(button => button.textContent.trim() === 'Ver mis salas');
      back?.click();
    }
    function selectMode() {
      const selector = el('onlineMode');
      if (!selector) return;
      const exists = [...selector.options].some(option => option.value === mode);
      if (exists) {
        selector.value = mode;
        selector.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    selectMode();
    setTimeout(selectMode, 400);
  }

  function openGame(id) {
    switch (id) {
      case 'pokemon':
        if (!pokemonMenu.open) pokemonMenu.showModal();
        break;
      case 'chess':
        openOnlineMode('chess');
        break;
      case 'racing':
        window.show('racing');
        break;
      case 'tridents':
        // El layout crea una pantalla dedicada para Tridentes.
        if (el('lgTridents')) {
          window.show('lgTridents');
        } else {
          window.show('games');
          setTimeout(() => el('arrow-board')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
        break;
      case 'guess':
        window.show(el('lgGuess') ? 'lgGuess' : 'games');
        break;
    }
  }

  home.addEventListener('click', event => {
    const gameButton = event.target.closest('[data-lg-game]');
    if (gameButton) {
      // liamcito-layout.js gestiona los juegos secundarios en captura.
      // Pokémon principal se atiende aquí.
      openGame(gameButton.dataset.lgGame);
      return;
    }
    const cloudButton = event.target.closest('[data-lg-cloud]');
    if (cloudButton) {
      openCloud(cloudButton.dataset.lgCloud);
      return;
    }
    const sectionButton = event.target.closest('[data-lg-section]');
    if (sectionButton) window.show(sectionButton.dataset.lgSection);
  });

  pokemonMenu.addEventListener('click', event => {
    const button = event.target.closest('[data-lg-mode]');
    if (!button) return;
    const mode = button.dataset.lgMode;
    pokemonMenu.close();
    if (mode === 'close') return;
    if (mode === 'local') {
      window.show('setup');
    } else if (mode === 'online') {
      openOnlineMode('pokemon');
    } else if (mode === 'cloud-packs') {
      openCloud('packs');
    } else if (mode === 'cloud-dex') {
      openCloud('dex');
    } else {
      window.show(mode);
    }
  });

  // Acceso de ajedrez original: lo conserva el layout si reorganiza juegos.
  const miniGames = el('games');
  if (miniGames && !el('lgChessShortcut')) {
    const chessButton = document.createElement('button');
    chessButton.id = 'lgChessShortcut';
    chessButton.type = 'button';
    chessButton.textContent = '🧸♟️ Ositos vs. Capibaras';
    chessButton.style.cssText = 'width:100%;margin:10px 0;background:linear-gradient(135deg,#b77940,#80512d);color:white';
    chessButton.onclick = () => openGame('chess');
    miniGames.prepend(chessButton);
  }

  console.info('Liamcito GameStore V1.1: accesos online y locales separados');
})();
