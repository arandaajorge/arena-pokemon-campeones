
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const root = el('racing');

  if (!root || el('trMenu')) return;

  const canvas = el('raceCanvas');
  const modeSelect = el('raceMode');
  const finish = el('raceFinish');

  const driving = root.querySelector(
    '.race-driving'
  );

  const startActions = root.querySelector(
    '.race-actions'
  );

  const finishActions = root.querySelector(
    '.race-top-actions'
  );

  if (
    !canvas ||
    !modeSelect ||
    !finish ||
    !driving ||
    !startActions ||
    !finishActions
  ) return;

  function node(tag,text,cls) {
    const n = document.createElement(tag);

    if (text != null) n.textContent = text;

    if (cls) n.className = cls;

    return n;
  }

  const title = root.querySelector('h2');

  const stats = el('raceStats');

  const garageItems = el('garageItems');

  const garageTitle = root.querySelector('h3');

  const modeLabel = modeSelect.closest('label');

  const champ = el('champControls');

  const armorText = el('armorText');

  const armorBar = el('armorBar').parentElement;

  const message = el('raceMsg');

  const oldTop = el('raceTop');

  const oldHud = el('raceHud');

  const keyboard = Array.from(
    root.querySelectorAll('p')
  ).find(p =>
    p.textContent.startsWith('Teclado:')
  );

  const back = Array.from(
    root.querySelectorAll('button')
  ).find(b =>
    b.textContent.includes('Volver a minijuegos')
  );

  let tab = 'race';

  const menu = node('div',null,'tr-menu');

  menu.id = 'trMenu';

  const raceTab = node(
    'button','🏁 Carreras'
  );

  const garageTab = node(
    'button','🔧 Garaje'
  );

  raceTab.type = 'button';
  garageTab.type = 'button';

  menu.append(raceTab,garageTab);

  const configuration = node(
    'div',null,'tr-configuration'
  );

  configuration.append(
    modeLabel,
    champ
  );

  const garage = node(
    'div',null,'tr-garage'
  );

  if (garageTitle) garage.append(garageTitle);

  garage.append(garageItems);

  const customizations = node(
    'div',null,'tr-customizations'
  );

  for (const id of [
    'paint',
    'wing',
    'neon',
    'neonColor'
  ]) {
    const input = el(id);

    const label = input?.closest('label');

    if (label) customizations.append(label);
  }

  garage.append(customizations);

  const hud = node(
    'div',null,'tr-hud'
  );

  function stat(label,value) {

    const box = node(
      'div',null,'tr-stat'
    );

    box.append(node('small',label));

    const number = node(
      'strong',value
    );

    box.append(number);

    hud.append(box);

    return number;
  }

  const speedValue = stat(
    'VELOCIDAD','0 km/h'
  );

  const distanceValue = stat(
    'DISTANCIA','0.00 km'
  );

  const livesValue = stat(
    'VIDAS','❤️ 3/3'
  );

  const scenario = node(
    'div',
    'Preparando pista',
    'tr-scenario'
  );

  const armor = node(
    'div',null,'tr-armor'
  );

  armor.append(armorText,armorBar);

  const playArea = node(
    'div',null,'tr-play-area'
  );

  const controlArea = node(
    'div',null,'tr-control-area'
  );

  controlArea.append(
    driving,
    finishActions
  );

  playArea.append(
    canvas,
    controlArea
  );

  const raceView = node(
    'div',null,'tr-race-view'
  );

  raceView.append(
    configuration,
    hud,
    scenario,
    armor,
    playArea,
    startActions
  );

  if (keyboard) {
    keyboard.classList.add('tr-keyboard');
    raceView.append(keyboard);
  }

  /*
    Reutilizamos los nodos originales.
    Conservamos sus eventos, identificadores
    y referencias al motor de carreras.
  */

  root.replaceChildren(
    title,
    stats,
    menu,
    raceView,
    garage,
    message,
    oldTop,
    oldHud
  );

  if (back) {
    back.hidden = true;
    root.append(back);
  }

  function isRunning() {
    return !finish.disabled;
  }

  function renderLayout() {

    const active = isRunning();

    root.classList.toggle(
      'tr-running',active
    );

    if (active) tab = 'race';

    raceView.hidden = tab !== 'race';

    garage.hidden =
      active || tab !== 'garage';

    driving.hidden = !active;

    finishActions.hidden = !active;

    raceTab.classList.toggle(
      'selected',tab === 'race'
    );

    garageTab.classList.toggle(
      'selected',tab === 'garage'
    );

    raceTab.setAttribute(
      'aria-pressed',
      String(tab === 'race')
    );

    garageTab.setAttribute(
      'aria-pressed',
      String(tab === 'garage')
    );
  }

  raceTab.onclick = () => {
    tab = 'race';
    renderLayout();
  };

  garageTab.onclick = () => {
    if (isRunning()) return;

    tab = 'garage';

    renderLayout();
  };

  function updateHud() {

    if (root.classList.contains('hidden')) {
      return;
    }

    const top = oldTop.textContent || '';

    const current = oldHud.textContent || '';

    const distance = top.match(
      /([\d.]+)\s*km/
    );

    const lives = top.match(
      /(\d+)\s*\/\s*3/
    );

    const speed = current.match(
      /(\d+)\s*km\/h/
    );

    const bonus = top.match(
      /🪙\s*(\d+)/
    );

    distanceValue.textContent =
      (distance?.[1] || '0.00')+' km';

    livesValue.textContent =
      '❤️ '+(lives?.[1] || '3')+'/3';

    speedValue.textContent =
      (speed?.[1] || '0')+' km/h';

    const nitroActive =
      current.includes('Nitro activo');

    const nitroButton =
      driving.children[1];

    nitroButton.classList.toggle(
      'tr-nitro-active',
      nitroActive
    );

    const nitroLabel =
      nitroButton.querySelector('small');

    if (nitroLabel) {
      nitroLabel.textContent =
        nitroActive
          ?'Nitro activo'
          :'Nitro listo';
    }

    const location =
      modeSelect.value === 'championship'
        ? (
          el('raceStage').selectedOptions[0]
            ?.textContent || 'Campeonato'
        )
        : (
          current.split(' · ')[0]
          || 'Infinito'
        );

    scenario.textContent =
      location+
      ' · 🪙 '+(bonus?.[1] || '0');
  }

  /*
    Observamos el estado de carrera sin
    modificar las funciones originales.
  */

  const observer = new MutationObserver(
    () => {
      renderLayout();
      updateHud();
    }
  );

  observer.observe(finish,{
    attributes:true,
    attributeFilter:['disabled']
  });

  document.addEventListener(
    'arena:section-change',
    event => {

      if (event.detail?.section !== 'racing') {
        return;
      }

      tab = 'race';

      renderLayout();
      updateHud();
    }
  );

  modeSelect.addEventListener(
    'change',updateHud
  );

  el('raceStage').addEventListener(
    'change',updateHud
  );

  /*
    Actualizamos el HUD a 10 Hz.
    El motor conserva su frecuencia original.
  */

  setInterval(updateHud,100);

  renderLayout();
  updateHud();

  console.info(
    'Turbo Racing V5 · Interfaz móvil cargada'
  );

})();
