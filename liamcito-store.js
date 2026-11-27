
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const home = el('home');
  const header = document.querySelector('header');

  if (!home || !header) return;
  if (el('liamcitoHome')) return;

  // IDENTIDAD DE LA PLATAFORMA

  document.title = 'Liamcito GameStore';

  document.body.classList.add('liamcito-store');

  const brand = header.querySelector('strong');

  if (brand) {
    brand.classList.add('lg-brand');
    brand.innerHTML =
      '🎮 LIAMCITO <span>GAMESTORE</span>';
  }

  // CATÁLOGO DE VIDEOJUEGOS

  const games = [
    {
      id: 'chess',
      name: 'Ositos vs. Capibaras',
      description: 'Ajedrez · Estrategia',
      art: '🧸♟️🦫',
      theme: 'lg-chess'
    },
    {
      id: 'racing',
      name: 'Turbo Racing',
      description: 'Carreras · Velocidad',
      art: '🏎️💨',
      theme: 'lg-racing'
    },
    {
      id: 'tridents',
      name: 'Tridentes Acuáticos',
      description: 'Lógica · Rompecabezas',
      art: '🌊🔱',
      theme: 'lg-tridents'
    },
    {
      id: 'guess',
      name: 'Adivina el número',
      description: 'Suerte · Recompensas',
      art: '🎲❓',
      theme: 'lg-guess'
    }
  ];

  function gameCards() {
    return games.map(game => `
      <article class="lg-game ${game.theme}">
        <div class="lg-game-art">
          ${game.art}
        </div>

        <div class="lg-game-info">
          <h3>${game.name}</h3>
          <p>${game.description}</p>
        </div>

        <button
          type="button"
          class="lg-game-action"
          data-lg-game="${game.id}">
          ▶ Jugar
        </button>
      </article>
    `).join('');
  }

  // NUEVA PÁGINA PRINCIPAL

  home.innerHTML = `
    <div id="liamcitoHome" class="lg-home">

      <div class="lg-welcome">
        <h2>¡Bienvenido, campeón!</h2>
        <p>
          Tu próxima aventura comienza aquí.
        </p>
      </div>

      <div class="lg-featured">

        <div class="lg-featured-art">
          🐉🔥
        </div>

        <div class="lg-tag">
          ★ JUEGO PRINCIPAL
        </div>

        <h2>
          Arena Pokémon<br>
          de Campeones
        </h2>

        <p>
          Colecciona Pokémon, forma tu equipo,
          desafía a tus amigos y conviértete
          en una leyenda.
        </p>

        <button
          type="button"
          class="lg-play"
          data-lg-game="pokemon">
          ▶ JUGAR AHORA
        </button>

      </div>

      <div>
        <h2 class="lg-section-title">
          🎮 Explora nuestros juegos
        </h2>

        <div class="lg-games-grid">
          ${gameCards()}
        </div>
      </div>

      <div>
        <h2 class="lg-section-title">
          ⚡ Accesos rápidos
        </h2>

        <div class="lg-shortcuts">

          <button data-lg-section="online">
            🌐 Multijugador
          </button>

          <button data-lg-section="cpu">
            🤖 Contra CPU
          </button>

          <button data-lg-section="shop">
            🛍️ Tienda
          </button>

          <button data-lg-section="packs">
            🎁 Sobres Pokémon
          </button>

          <button data-lg-section="index">
            📖 Colección
          </button>

          <button data-lg-section="trade">
            🔁 Intercambios
          </button>

          <button data-lg-section="games">
            🎯 Minijuegos
          </button>

        </div>
      </div>

      <footer class="lg-footer">
        🎮 Liamcito GameStore<br>
        Un universo de aventuras.
      </footer>

    </div>
  `;

  // SELECTOR DE MODALIDADES POKÉMON

  const pokemonMenu =
    document.createElement('dialog');

  pokemonMenu.id = 'lgPokemonMenu';

  pokemonMenu.style.cssText = `
    width: min(90vw, 420px);
    max-height: 85vh;
    overflow: auto;
    background: #141a2c;
    color: white;
    border: 1px solid #8957ff;
    border-radius: 24px;
    padding: 24px;
  `;

  pokemonMenu.innerHTML = `
    <h2>⚔️ Arena Pokémon</h2>

    <p>Selecciona una modalidad de juego.</p>

    <div style="display:grid;gap:12px">

      <button data-lg-mode="local">
        ⚔️ Batalla local
      </button>

      <button data-lg-mode="cpu">
        🤖 Contra CPU
      </button>

      <button data-lg-mode="online">
        🌐 Multijugador online
      </button>

      <button data-lg-mode="packs">
        🎁 Abrir sobres
      </button>

      <button data-lg-mode="index">
        📖 Mi colección
      </button>

      <button
        data-lg-mode="close"
        style="background:#29334b;color:white">
        Cerrar
      </button>

    </div>
  `;

  document.body.appendChild(pokemonMenu);

  // ABRIR MODALIDAD MULTIJUGADOR

  function openOnlineMode(mode) {

    window.show('online');

    const room = el('onlineRoom');

    // Regresar al lobby sin abandonar
    // una partida guardada.

    if (room && !room.hidden) {

      const back = [...room.querySelectorAll(
        'button'
      )].find(button =>
        button.textContent.trim() ===
        'Ver mis salas'
      );

      if (back) back.click();

    }

    function selectMode() {

      const selector = el('onlineMode');

      if (!selector) return;

      const exists = [...selector.options]
        .some(option => option.value === mode);

      if (exists) {
        selector.value = mode;

        selector.dispatchEvent(
          new Event('change', {
            bubbles: true
          })
        );
      }

    }

    selectMode();

    setTimeout(selectMode, 400);

  }

  // ABRIR VIDEOJUEGOS

  function openGame(id) {

    switch (id) {

      case 'pokemon':

        if (!pokemonMenu.open) {
          pokemonMenu.showModal();
        }

        break;

      case 'chess':

        openOnlineMode('chess');

        break;

      case 'racing':

        window.show('racing');

        break;

      case 'tridents':

        window.show('games');

        setTimeout(() => {

          const board = el('arrow-board');

          if (board) {
            board.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }

        }, 100);

        break;

      case 'guess':

        window.show('games');

        break;

    }

  }

  // EVENTOS DEL NUEVO MENÚ

  home.addEventListener('click', event => {

    const gameButton = event.target.closest(
      '[data-lg-game]'
    );

    if (gameButton) {
      openGame(gameButton.dataset.lgGame);
      return;
    }

    const sectionButton = event.target.closest(
      '[data-lg-section]'
    );

    if (sectionButton) {
      window.show(
        sectionButton.dataset.lgSection
      );
    }

  });

  pokemonMenu.addEventListener(
    'click',
    event => {

      const button = event.target.closest(
        '[data-lg-mode]'
      );

      if (!button) return;

      const mode = button.dataset.lgMode;

      pokemonMenu.close();

      if (mode === 'close') return;

      if (mode === 'local') {

        window.show('setup');

      } else if (mode === 'online') {

        openOnlineMode('pokemon');

      } else {

        window.show(mode);

      }

    }
  );

  // AJEDREZ DENTRO DE MINIJUEGOS

  const miniGames = el('games');

  if (miniGames && !el('lgChessShortcut')) {

    const chessButton =
      document.createElement('button');

    chessButton.id = 'lgChessShortcut';
    chessButton.type = 'button';

    chessButton.textContent =
      '🧸♟️ Ositos vs. Capibaras';

    chessButton.style.cssText = `
      width:100%;
      margin:10px 0;
      background:linear-gradient(
        135deg,#b77940,#80512d
      );
      color:white;
    `;

    chessButton.onclick = () => {
      openGame('chess');
    };

    miniGames.prepend(chessButton);

  }

  console.info(
    'Liamcito GameStore V1.0 cargado'
  );

})();
