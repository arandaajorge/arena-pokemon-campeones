
(() => {
  'use strict';

  if (document.getElementById('lgEffectsTest')) {
    return;
  }

  const panel = document.createElement('section');

  panel.id = 'lgEffectsTest';
  panel.className = 'panel hidden';

  panel.innerHTML = `
    <h2>✨ Laboratorio de efectos</h2>
    <p>
      Prueba las animaciones Pokémon
      directamente desde tu celular.
    </p>

    <div class="lg-test-arena">
      <div id="lgTestEnemy">
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png"
          alt="Charmander"
        >
        <strong>🔥 Charmander</strong>
      </div>

      <div id="lgTestPlayer">
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
          alt="Pikachu"
        >
        <strong>⚡ Pikachu</strong>
      </div>
    </div>

    <div class="lg-test-buttons">
      <button data-effect="normal">
        👊 Ataque normal
      </button>

      <button data-effect="strong">
        💥 Ataque fuerte
      </button>

      <button data-effect="elemental">
        ⚡ Ataque elemental
      </button>

      <button data-effect="ultimate">
        🌟 Ataque definitivo
      </button>

      <button data-effect="critical">
        🎯 Golpe crítico
      </button>

      <button data-effect="miss">
        💨 Ataque fallido
      </button>

      <button data-effect="heal">
        💚 Curación
      </button>

      <button data-effect="shield">
        🛡️ Escudo
      </button>

      <button data-effect="victory">
        🏆 Victoria
      </button>
    </div>

    <p id="lgEffectsTestStatus">
      Selecciona un efecto para probarlo.
    </p>

    <button id="lgEffectsTestBack">
      ⬅ Volver al inicio
    </button>
  `;

  const style = document.createElement('style');

  style.textContent = `
    #lgEffectsTest {
      width:100%;
      max-width:650px;
      margin:auto;
      padding:10px;
      box-sizing:border-box;
    }

    .lg-test-arena {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin:18px 0;
    }

    .lg-test-arena > div {
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      padding:12px;
      background:#1e293b;
      border:2px solid #475569;
      border-radius:15px;
      min-width:0;
    }

    .lg-test-arena img {
      width:100%;
      max-width:180px;
      aspect-ratio:1;
      object-fit:contain;
    }

    .lg-test-arena strong {
      font-size:14px;
      text-align:center;
    }

    .lg-test-buttons {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
    }

    .lg-test-buttons button {
      min-height:54px;
      padding:9px 5px;
      font-size:13px;
      color:white;
      background:#433878;
      border:1px solid #8b5cf6;
      border-radius:10px;
    }

    #lgEffectsTestStatus {
      text-align:center;
      color:#facc15;
      min-height:35px;
      font-size:13px;
    }

    #lgEffectsTestBack {
      width:100%;
      margin-top:12px;
    }
  `;

  document.head.append(style);

  const main = document.querySelector('main');

  if (!main) return;

  main.append(panel);

  const enemy =
    document.getElementById('lgTestEnemy');

  const player =
    document.getElementById('lgTestPlayer');

  const status =
    document.getElementById('lgEffectsTestStatus');

  panel.querySelectorAll('[data-effect]')
    .forEach(button => {

      button.addEventListener('click',() => {

        const fx = window.LiamcitoEffects;

        if (!fx) {
          status.textContent =
            'No se cargó arena-effects.js';
          return;
        }

        const effect = button.dataset.effect;

        switch(effect) {

          case 'normal':
            fx.attack(player,enemy,{
              action:'normal',
              element:'electric',
              damage:60
            });
            break;

          case 'strong':
            fx.attack(player,enemy,{
              action:'strong',
              element:'electric',
              damage:95
            });
            break;

          case 'elemental':
            fx.attack(player,enemy,{
              action:'elemental',
              element:'electric',
              damage:120
            });
            break;

          case 'ultimate':
            fx.attack(player,enemy,{
              action:'ultimate',
              element:'electric',
              damage:250
            });
            break;

          case 'critical':
            fx.attack(player,enemy,{
              action:'strong',
              element:'electric',
              damage:150,
              critical:true
            });
            break;

          case 'miss':
            fx.attack(player,enemy,{
              action:'normal',
              element:'electric',
              missed:true
            });
            break;

          case 'heal':
            fx.heal(player,80);
            break;

          case 'shield':
            fx.shield(player);
            break;

          case 'victory':
            fx.victory(player);
            break;
        }

        status.textContent =
          'Efecto ejecutado: '+button.textContent.trim();

      });
    });

  document.getElementById('lgEffectsTestBack')
    .onclick = () => window.show('home');

  function openTest() {

    if (typeof window.show === 'function') {
      window.show('lgEffectsTest');
    }
  }

  const launch = document.createElement('button');

  launch.type = 'button';
  launch.textContent = '✨ Probar animaciones';
  launch.style.cssText = `
    display:block;
    width:100%;
    margin:12px 0;
    padding:14px;
    background:#433878;
    color:white;
    border:1px solid #8b5cf6;
    border-radius:12px;
  `;

  launch.onclick = openTest;

  const home =
    document.getElementById('liamcitoHome') ||
    document.getElementById('home');

  if (home) home.append(launch);

  console.info(
    'Liamcito GameStore · Laboratorio de efectos'
  );

})();
