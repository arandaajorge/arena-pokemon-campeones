
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const header = document.querySelector('body > header');
  const main = document.querySelector('main');

  if (!header || !main) return;
  if (el('arenaNavigation')) return;

  const titles = {
    home: 'Menú principal',
    online: 'Multijugador',
    cpu: 'Contra CPU',
    setup: 'Preparar batalla',
    battle: 'Combate',
    shop: 'Tienda local',
    packs: 'Sobres locales',
    games: 'Minijuegos',
    racing: 'Turbo Racing',
    index: 'Mis Pokémon locales',
    trade: 'Intercambio',
    lgPokemonCloud: 'Pokémon Online',
    lgTridents: 'Tridentes Acuáticos',
    lgGuess: 'Adivina el número'
  };

  const icons = {
    home: '🏠',
    online: '🌐',
    cpu: '🤖',
    setup: '⚔️',
    battle: '🏟️',
    shop: '🛍️',
    packs: '🎁',
    games: '🎯',
    racing: '🏎️',
    index: '📖',
    trade: '🔁',
    lgPokemonCloud: '🎒',
    lgTridents: '🔱',
    lgGuess: '🎲'
  };

  const parents = {
    battle: 'setup',
    racing: 'games',
    lgTridents: 'games',
    lgGuess: 'games'
  };

  let history = [];
  let navigating = false;

  function activeSection() {

    const section = Array.from(
      main.querySelectorAll(':scope > section')
    ).find(section =>
      !section.hidden &&
      !section.classList.contains('hidden')
    );

    return section?.id || 'home';

  }

  let current = activeSection();

  const style = document.createElement('style');

  style.textContent = `
    body > header.arena-nav-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      padding-top: max(
        10px,
        env(safe-area-inset-top)
      );
      background: #211a53;
      border-bottom: 1px solid #6554a0;
      box-shadow: 0 5px 20px #0005;
    }

    body > header.arena-nav-header > strong {
      font-size: clamp(11px, 3.5vw, 16px);
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    body > header.arena-nav-header > span {
      white-space: nowrap;
      font-size: 15px;
    }

    #arenaNavigation {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns:
        auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid #6554a0;
    }

    #arenaNavigation button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 42px;
      margin: 0;
      padding: 9px 12px;
      border: 1px solid #8c72d7;
      border-radius: 12px;
      background: #473580;
      color: white;
      font-size: 13px;
      font-weight: 700;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    #arenaNavigation button:active {
      background: #6554a0;
    }

    #arenaNavigation button:disabled {
      opacity: .35;
      cursor: default;
    }

    #arenaNavTitle {
      text-align: center;
      font-size: clamp(11px, 3.4vw, 15px);
      font-weight: 800;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    #arenaNavigation[hidden] {
      display: none !important;
    }

    .arena-nav-replaced {
      display: none !important;
    }

    @media (max-width: 350px) {

      #arenaNavigation {
        gap: 4px;
      }

      #arenaNavigation button {
        padding: 8px;
        font-size: 12px;
      }

    }
  `;

  document.head.append(style);

  header.classList.add('arena-nav-header');

  const nav = document.createElement('nav');

  nav.id = 'arenaNavigation';

  nav.setAttribute(
    'aria-label',
    'Navegación del juego'
  );

  nav.innerHTML = `
    <button id="arenaNavBack"
            type="button"
            aria-label="Regresar">
      ⬅ Atrás
    </button>

    <div id="arenaNavTitle"></div>

    <button id="arenaNavHome"
            type="button"
            aria-label="Menú principal">
      🏠 Inicio
    </button>
  `;

  header.append(nav);

  const backButton = el('arenaNavBack');
  const homeButton = el('arenaNavHome');

  function insideOnlineRoom() {

    const room = el('onlineRoom');

    return current === 'online' &&
      room &&
      !room.hidden;

  }

  function onlineTitle() {

    if (!insideOnlineRoom()) {
      return '🌐 Multijugador';
    }

    const mode =
      el('onlineRoomMode')?.textContent || '';

    if (mode.includes('Capibaras')) {
      return '♟️ Ajedrez';
    }

    if (mode.includes('Pokémon')) {
      return '⚔️ Pokémon online';
    }

    if (mode.includes('Racing')) {
      return '🏎️ Racing online';
    }

    if (mode.includes('Tridentes')) {
      return '🔱 Tridentes online';
    }

    return '🌐 Sala privada';

  }

  function renderNavigation() {

    nav.hidden = current === 'home';

    el('arenaNavTitle').textContent =
      current === 'online'
        ? onlineTitle()
        : (icons[current] || '🎮') +
          ' ' +
          (titles[current] || current);

    backButton.disabled =
      current === 'home';

    homeButton.disabled =
      current === 'home';

  }

  function scrollTop() {

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

  }

  function confirmNavigation(target) {

    if (
      current === 'racing' &&
      target !== 'racing'
    ) {

      const finishButton = el('raceFinish');

      if (finishButton && !finishButton.disabled) {

        return window.confirm(
          '¿Salir de la carrera?\n\n' +
          'Se guardarán tus monedas, experiencia ' +
          'y distancia, pero terminará el recorrido.'
        );

      }

    }

    return true;

  }

  const previousShow = window.show;

  if (typeof previousShow !== 'function') {

    nav.remove();

    return;

  }

  window.show = function(id, ...args) {

    const section = el(id);

    if (
      !section ||
      section.parentElement !== main ||
      section.tagName !== 'SECTION'
    ) return;

    const oldSection = activeSection();

    if (
      !navigating &&
      oldSection !== id &&
      !confirmNavigation(id)
    ) return;

    const result = previousShow.apply(
      this,
      [id, ...args]
    );

    const nextSection = activeSection();

    if (nextSection !== oldSection) {

      if (!navigating) {

        if (nextSection === 'home') {

          history = [];

        } else {

          history.push(oldSection);

          if (history.length > 50) {
            history.shift();
          }

        }

      }

      current = nextSection;

      scrollTop();

    }

    renderNavigation();

    return result;

  };

  function returnToRooms() {

    const room = el('onlineRoom');

    if (!room) return false;

    const button = Array.from(
      room.querySelectorAll('button')
    ).find(button =>
      button.textContent.trim() ===
      'Ver mis salas'
    );

    if (!button) return false;

    if (!button.disabled) {

      button.click();

      scrollTop();

    }

    return true;

  }

  function goBack() {

    if (insideOnlineRoom()) {

      if (returnToRooms()) return;

    }

    if (current === 'home') return;

    const target =
      history[history.length - 1] ||
      parents[current] ||
      'home';

    if (!confirmNavigation(target)) return;

    navigating = true;

    try {

      window.show(target);

      if (activeSection() === target) {

        history.pop();

        if (target === 'home') {
          history = [];
        }

      }

    } finally {

      navigating = false;

      current = activeSection();

      renderNavigation();

    }

  }

  function goHome() {

    if (current === 'home') return;

    if (!confirmNavigation('home')) return;

    navigating = true;

    try {

      window.show('home');

      if (activeSection() === 'home') {
        history = [];
      }

    } finally {

      navigating = false;

      current = activeSection();

      renderNavigation();

    }

  }

  backButton.onclick = goBack;
  homeButton.onclick = goHome;

  // Ocultar el botón antiguo situado
  // al final de la página.

  for (const button of main.children) {

    if (
      button.tagName === 'BUTTON' &&
      button.getAttribute('onclick')?.trim()
        === "show('home')"
    ) {

      button.classList.add(
        'arena-nav-replaced'
      );

    }

  }

  // Sustituir el botón inferior de Racing.

  const racing = el('racing');

  if (racing) {

    for (const button of racing.querySelectorAll('button')) {

      if (
        button.getAttribute('onclick')?.trim()
          === "show('games')"
      ) {

        button.classList.add(
          'arena-nav-replaced'
        );

      }

    }

  }

  // Ocultar el botón inferior de salas.
  // Su función sigue disponible desde Atrás.

  const room = el('onlineRoom');

  if (room) {

    for (const button of room.querySelectorAll('button')) {

      if (
        button.textContent.trim() ===
        'Ver mis salas'
      ) {

        button.classList.add(
          'arena-nav-replaced'
        );

      }

    }

  }

  // Actualizar el título cuando cambia
  // la sala o el modo multijugador.

  const observer = new MutationObserver(() => {

    current = activeSection();

    renderNavigation();

  });

  if (room) {

    observer.observe(room, {
      attributes: true,
      attributeFilter: ['hidden']
    });

  }

  const mode = el('onlineRoomMode');

  if (mode) {

    observer.observe(mode, {
      childList: true,
      characterData: true,
      subtree: true
    });

  }

  document.addEventListener(
    'arena:section-change',
    () => {

      current = activeSection();

      renderNavigation();

    }
  );

  renderNavigation();

})();
