
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const main = document.querySelector('main');
  const games = el('games');
  const online = el('online');
  const lobby = el('onlineLobby');
  const room = el('onlineRoom');
  const inventory = el('onlineInventory');
  const store = el('cloudStore');

  if (
    !main || !games || !online ||
    !lobby || !room || !inventory || !store
  ) return;

  if (el('lgLibrary')) return;

  // ESTILOS DE LA NUEVA ORGANIZACIÓN

  const style = document.createElement('style');

  style.textContent = `
    .lg-library {
      display:grid;
      gap:14px;
    }

    .lg-library-card {
      display:grid;
      grid-template-columns:76px minmax(0,1fr);
      gap:14px;
      align-items:center;
      padding:12px;
      background:#141a2c;
      border:1px solid #29334b;
      border-radius:18px;
      cursor:pointer;
      text-align:left;
      color:white;
      width:100%;
    }

    .lg-library-icon {
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:76px;
      border-radius:14px;
      font-size:34px;
      background:var(--cover);
    }

    .lg-library-card strong {
      display:block;
      font-size:16px;
    }

    .lg-library-card small {
      display:block;
      color:#a4aec3;
      margin:5px 0;
    }

    .lg-library-play {
      color:#b69aff;
      font-size:13px;
      font-weight:bold;
    }

    .lg-page-intro {
      text-align:center;
      padding:20px 8px;
      margin-bottom:16px;
      background:#141a2c;
      border:1px solid #29334b;
      border-radius:20px;
    }

    .lg-page-intro span {
      display:block;
      font-size:56px;
    }

    .lg-page-intro h2 {
      margin:10px 0;
    }

    .lg-page-intro p {
      color:#a4aec3;
      margin:8px 0;
    }

    #lgPokemonCloud .panel {
      margin:12px 0;
      padding:14px;
    }

    #lgPokemonCloud [hidden],
    #lgOnlineTools[hidden] {
      display:none!important;
    }

    .lg-cloud-tabs {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:6px;
      margin:12px 0;
    }

    .lg-cloud-tabs button {
      padding:12px 4px;
      font-size:12px;
      color:white;
      background:#29334b;
    }

    .lg-cloud-tabs button.active {
      background:#7544df;
    }

    #lgOnlineTools {
      margin:14px 0;
      display:grid;
      gap:8px;
    }

    #lgOnlineTools button {
      background:#29334b;
      color:white;
      font-size:14px;
    }

    #lgGuess .lg-number-buttons {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:12px;
      margin:20px 0;
    }

    #lgGuess .lg-number-buttons button {
      font-size:30px;
      min-height:85px;
      background:linear-gradient(
        135deg,#8957ff,#4338ca
      );
      color:white;
    }

    #lgTridents .arrow-board {
      width:100%;
      max-width:410px;
    }

    #lgTridents .mini-btn {
      width:100%;
      margin:8px 0;
    }

    #arenaChessPanel {
      margin-top:12px;
    }

    #onlineRoom #onlineMembers {
      font-size:13px;
    }
  `;

  document.head.appendChild(style);

  // CREAR PANTALLAS INDEPENDIENTES

  function section(id) {

    const page = document.createElement('section');

    page.id = id;
    page.className = 'panel hidden';

    main.appendChild(page);

    return page;
  }

  function intro(icon, title, description) {

    const box = document.createElement('div');

    box.className = 'lg-page-intro';

    box.innerHTML = `
      <span>${icon}</span>
      <h2>${title}</h2>
      <p>${description}</p>
    `;

    return box;
  }

  // TRIDENTES ACUÁTICOS

  const tridents = section('lgTridents');

  tridents.appendChild(
    intro(
      '🌊🔱',
      'Tridentes Acuáticos',
      'Despeja el tablero y supera cada nivel.'
    )
  );

  const tridentDescription =
    document.createElement('p');

  tridentDescription.textContent =
    'Toca un tridente cuando tenga libre ' +
    'el camino hacia donde apunta. ' +
    'Evita perder tus vidas.';

  tridents.appendChild(tridentDescription);

  // Mover los elementos originales.
  // No se reinicia el tablero.

  for (const id of [
    'newPuzzle',
    'arrow-status',
    'puzzleLives',
    'continuePuzzle',
    'arrow-board'
  ]) {

    const node = el(id);

    if (node) tridents.appendChild(node);

  }

  // ADIVINA EL NÚMERO

  const guessPage = section('lgGuess');

  guessPage.appendChild(
    intro(
      '🎲',
      'Adivina el número',
      'Acierta y gana 20 monedas locales.'
    )
  );

  const numbers = document.createElement('div');

  numbers.className = 'lg-number-buttons';

  for (let n = 1; n <= 3; n++) {

    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = n;

    button.onclick = () => window.guess(n);

    numbers.appendChild(button);

  }

  guessPage.appendChild(numbers);

  const guessMessage = el('gamemsg');

  if (guessMessage) {
    guessPage.appendChild(guessMessage);
  }

  // PANTALLA EXCLUSIVA POKÉMON ONLINE

  const cloudPage = section('lgPokemonCloud');

  cloudPage.appendChild(
    intro(
      '🎒',
      'Pokémon Online',
      'Tu inventario, sobres y colección en la nube.'
    )
  );

  const tabs = document.createElement('div');

  tabs.className = 'lg-cloud-tabs';

  tabs.innerHTML = `
    <button data-cloud-view="inventory">
      🎒 Inventario
    </button>

    <button data-cloud-view="packs">
      🎁 Sobres
    </button>

    <button data-cloud-view="dex">
      📖 Índice
    </button>
  `;

  cloudPage.appendChild(tabs);

  // Reubicar módulos existentes.
  // Se conservan sus eventos y funciones.

  cloudPage.appendChild(inventory);
  cloudPage.appendChild(store);

  // Los módulos conservan sus propios
  // controles de actualización.

  function cloudView(view) {

    inventory.hidden = view !== 'inventory';
    store.hidden = view === 'inventory';

    for (const button of tabs.children) {

      button.classList.toggle(
        'active',
        button.dataset.cloudView === view
      );

    }

    if (view === 'inventory') {

      el('cloudRefresh')?.click();

    } else {

      el(
        view === 'dex'
          ? 'cloudTabDex'
          : 'cloudTabPacks'
      )?.click();

      el('cloudStoreRefresh')?.click();

    }

  }

  tabs.addEventListener('click', event => {

    const button = event.target.closest(
      '[data-cloud-view]'
    );

    if (button) {
      cloudView(button.dataset.cloudView);
    }

  });

  function openCloud(view = 'inventory') {

    window.show('lgPokemonCloud');

    cloudView(view);

  }

  // ACCESO POKÉMON DESDE MULTIJUGADOR

  const onlineTools = document.createElement('div');

  onlineTools.id = 'lgOnlineTools';

  onlineTools.innerHTML = `
    <button data-cloud-open="inventory">
      🎒 Mi inventario Pokémon online
    </button>

    <button data-cloud-open="packs">
      🎁 Sobres Pokémon online
    </button>

    <button data-cloud-open="dex">
      📖 Índice Pokémon online
    </button>
  `;

  lobby.appendChild(onlineTools);

  onlineTools.addEventListener('click', event => {

    const button = event.target.closest(
      '[data-cloud-open]'
    );

    if (button) {
      openCloud(button.dataset.cloudOpen);
    }

  });

  // Mostrar accesos Pokémon solamente
  // cuando se selecciona Pokémon.

  function updateOnlineTools() {

    onlineTools.hidden =
      lobby.hidden ||
      el('onlineMode')?.value !== 'pokemon';

  }

  el('onlineMode')?.addEventListener(
    'change',
    updateOnlineTools
  );

  new MutationObserver(
    updateOnlineTools
  ).observe(lobby, {
    attributes:true,
    attributeFilter:['hidden']
  });

  // ACCESO DIRECTO A AJEDREZ

  function openChess() {

    window.show('online');

    if (!room.hidden) {

      const back = [...room.querySelectorAll(
        'button'
      )].find(button =>
        button.textContent.trim() ===
        'Ver mis salas'
      );

      back?.click();

    }

    const select = el('onlineMode');

    if (select) {

      select.value = 'chess';

      select.dispatchEvent(
        new Event('change', {
          bubbles:true
        })
      );

    }

    updateOnlineTools();

  }

  // NUEVA BIBLIOTECA DE MINIJUEGOS

  games.replaceChildren();

  games.appendChild(
    intro(
      '🎮',
      'Biblioteca de juegos',
      'Selecciona tu próxima aventura.'
    )
  );

  const library = document.createElement('div');

  library.id = 'lgLibrary';
  library.className = 'lg-library';

  const catalog = [
    {
      id:'chess',
      icon:'🧸♟️',
      title:'Ositos vs. Capibaras',
      description:'Ajedrez · Estrategia',
      color:'#80512d'
    },
    {
      id:'racing',
      icon:'🏎️',
      title:'Turbo Racing',
      description:'Carreras y campeonatos',
      color:'#593080'
    },
    {
      id:'tridents',
      icon:'🔱',
      title:'Tridentes Acuáticos',
      description:'Rompecabezas y niveles',
      color:'#125b80'
    },
    {
      id:'guess',
      icon:'🎲',
      title:'Adivina el número',
      description:'Suerte y recompensas',
      color:'#97580e'
    }
  ];

  function openGame(id) {

    switch (id) {

      case 'chess':
        openChess();
        break;

      case 'racing':
        window.show('racing');
        break;

      case 'tridents':
        window.show('lgTridents');
        break;

      case 'guess':
        window.show('lgGuess');
        break;

    }

  }

  for (const game of catalog) {

    const card = document.createElement('button');

    card.type = 'button';
    card.className = 'lg-library-card';

    card.style.setProperty(
      '--cover',
      game.color
    );

    card.innerHTML = `
      <span class="lg-library-icon">
        ${game.icon}
      </span>

      <span>
        <strong>${game.title}</strong>
        <small>${game.description}</small>
        <span class="lg-library-play">
          ▶ Jugar
        </span>
      </span>
    `;

    card.onclick = () => openGame(game.id);

    library.appendChild(card);

  }

  games.appendChild(library);

  // ACTUALIZAR ACCESOS DEL INICIO

  const home = el('home');

  home?.addEventListener(
    'click',
    event => {

      const button = event.target.closest(
        '[data-lg-game]'
      );

      if (!button) return;

      const id = button.dataset.lgGame;

      if (id === 'pokemon') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      openGame(id);

    },
    true
  );

  // ACCESO DIRECTO AL INVENTARIO ONLINE

  const shortcuts = home?.querySelector(
    '.lg-shortcuts'
  );

  if (shortcuts) {

    const button = document.createElement('button');

    button.type = 'button';

    button.textContent =
      '🎒 Pokémon online';

    button.onclick = () => openCloud();

    shortcuts.appendChild(button);

  }

  // TÍTULOS DE NAVEGACIÓN

  const titles = {
    lgTridents:'🔱 Tridentes Acuáticos',
    lgGuess:'🎲 Adivina el número',
    lgPokemonCloud:'🎒 Pokémon Online',
    games:'🎮 Biblioteca de juegos'
  };

  function updateNavigation() {

    const active = [...main.children].find(node =>
      node.tagName === 'SECTION' &&
      !node.classList.contains('hidden')
    );

    const title = el('arenaNavTitle');

    if (title && titles[active?.id]) {

      title.textContent = titles[active.id];

    }

    updateOnlineTools();

  }

  const previousShow = window.show;

  window.show = function(id) {

    previousShow(id);

    updateNavigation();

    requestAnimationFrame(
      updateNavigation
    );

  };

  document.addEventListener(
    'arena:section-change',
    () => requestAnimationFrame(
      updateNavigation
    )
  );

  updateOnlineTools();
  updateNavigation();

  console.info(
    'Liamcito Layout V1.0 cargado'
  );

})();
