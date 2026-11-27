
(() => {
  'use strict';

  if (window.LiamcitoPackEffects) return;

  const el = id => document.getElementById(id);

  let timers = [];
  let currentStage = null;

  const reducedMotion = () =>
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  function later(fn, ms) {
    const timer = setTimeout(fn, ms);
    timers.push(timer);
  }

  function cleanup() {
    timers.forEach(clearTimeout);
    timers = [];

    currentStage?.remove();
    currentStage = null;

    const dialog = el('cloudPackDialog');
    const rewards = el('cloudPackRewards');
    const summary = el('cloudPackSummary');
    const accept = el('cloudPackClose');

    dialog?.classList.remove('lg-pack-opening');

    if (rewards) {
      rewards.style.display = '';

      rewards.querySelectorAll('.cloud-card')
        .forEach(card => {
          card.classList.remove('lg-pack-reveal');
          card.style.animationDelay = '';
        });
    }

    if (summary) summary.style.display = '';

    if (accept) {
      accept.hidden = false;
      accept.style.display = '';
    }
  }

  function play(detail = {}) {
    cleanup();

    const dialog = el('cloudPackDialog');
    const rewards = el('cloudPackRewards');
    const accept = el('cloudPackClose');

    if (!dialog || !rewards || !dialog.open) {
      return;
    }

    const cards = Array.from(
      rewards.querySelectorAll('.cloud-card')
    );

    if (!cards.length || reducedMotion()) {
      return;
    }

    dialog.classList.add('lg-pack-opening');

    if (accept) {
      accept.hidden = true;
      accept.style.display = 'none';
    }

    const stage = document.createElement('div');
    stage.className = 'lg-pack-stage';
    stage.setAttribute('role', 'button');
    stage.setAttribute('tabindex', '0');
    stage.setAttribute(
      'aria-label',
      'Toca el regalo para abrirlo'
    );

    const envelope = document.createElement('div');
    envelope.className = 'lg-pack-envelope';
    envelope.textContent = '🎁';

    const title = document.createElement('strong');
    title.textContent =
      '¡' + String(
        detail.packName || 'Tu sobre sorpresa'
      ) + '!';

    const hint = document.createElement('div');
    hint.className = 'lg-pack-hint';

    const hand = document.createElement('span');
    hand.className = 'lg-pack-hand';
    hand.textContent = '👆';

    const instruction = document.createElement('strong');
    instruction.textContent =
      '¡TOCA EL REGALO PARA ABRIRLO!';

    hint.append(hand, instruction);
    stage.append(envelope, title, hint);

    rewards.before(stage);
    currentStage = stage;

    cards.forEach(card => {
      const color = card.style
        .getPropertyValue('--rarity')
        .trim()
        .toLowerCase();

      const rarities = {
        '#38bdf8': 'lg-pack-rare',
        '#c084fc': 'lg-pack-epic',
        '#facc15': 'lg-pack-legendary',
        '#fb7185': 'lg-pack-secret'
      };

      if (rarities[color]) {
        card.classList.add(rarities[color]);
      }
    });

    let opened = false;

    function openGift() {
      if (opened) return;
      opened = true;

      hint.remove();
      stage.classList.add('burst');

      window.LiamcitoEffects?.particles(
        stage,
        '#facc15',
        35
      );

      later(() => {
        stage.remove();
        currentStage = null;

        dialog.classList.remove('lg-pack-opening');

        // Ocultar todas las cartas antes de revelarlas.
cards.forEach(card => {
  card.style.display = 'none';
  card.style.animationDelay = '';
});

// Revelar una carta cada 900 milisegundos.
cards.forEach((card, index) => {
  later(() => {
    card.style.display = '';
    card.classList.add('lg-pack-reveal');
    card.style.animationDelay = '0ms';

    window.LiamcitoEffects?.particles(
      card,
      '#facc15',
      12
    );
  }, index * 900);
});

        const duration =
  900 * cards.length + 500;

        later(() => {
          cards.forEach(card => {
            card.classList.remove('lg-pack-reveal');
            card.style.animationDelay = '';
          });

          if (accept) {
            accept.hidden = false;
            accept.style.display = '';
          }
        }, duration + 100);

      }, 500);
    }

    stage.addEventListener('click', openGift);

    stage.addEventListener('keydown', event => {
      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openGift();
      }
    });
  }

  document.addEventListener(
    'liamcito:pack-opened',
    event => {
      try {
        play(event.detail);
      } catch (error) {
        cleanup();
        console.warn(
          'Animación de sobre:',
          error
        );
      }
    }
  );

  el('cloudPackDialog')?.addEventListener(
    'close',
    cleanup
  );

  window.LiamcitoPackEffects = {
    play,
    cleanup
  };

  // Prueba gratuita: no modifica monedas ni cartas.
  function createTestButton() {
    if (el('lgTestPackAnimation')) return;

    const store = el('cloudStore');
    if (!store) return;

    const button = document.createElement('button');

    button.id = 'lgTestPackAnimation';
    button.type = 'button';
    button.textContent =
      '🎁 Probar apertura animada GRATIS';

    button.style.cssText = `
      width:100%;
      margin:12px 0;
      padding:14px;
      background:#7c3aed;
      color:white;
      border:2px solid #facc15;
      border-radius:14px;
      font-weight:bold;
    `;

    button.onclick = () => {
      const dialog = el('cloudPackDialog');
      const rewards = el('cloudPackRewards');
      const summary = el('cloudPackSummary');

      if (!dialog || !rewards) return;

      if (dialog.open) dialog.close();

      cleanup();
      rewards.replaceChildren();

      const names = [
        'Pikachu',
        'Charmander',
        'Squirtle',
        'Bulbasaur',
        'Eevee'
      ];

      const icons = [
        '⚡', '🔥', '💧', '🌱', '✨'
      ];

      names.forEach((name, index) => {
        const card = document.createElement('div');
        card.className = 'cloud-card';

        card.style.setProperty(
          '--rarity',
          index === 4 ? '#facc15' : '#38bdf8'
        );

        const icon = document.createElement('div');
        icon.textContent = icons[index];
        icon.style.fontSize = '55px';

        const title = document.createElement('h4');
        title.textContent = name;

        card.append(icon, title);
        rewards.append(card);
      });

      if (summary) {
        summary.textContent =
          'PRUEBA VISUAL · No se compraron cartas.';
      }

      dialog.showModal();

      play({
        packName: 'Sobre de prueba'
      });
    };

    store.prepend(button);
  }

    // Esperar a que la tienda online esté disponible.
  function initTestButton() {
    createTestButton();

    if (el('lgTestPackAnimation')) return;

    let attempts = 0;

    const interval = setInterval(() => {
      createTestButton();
      attempts++;

      if (
        el('lgTestPackAnimation') ||
        attempts >= 30
      ) {
        clearInterval(interval);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initTestButton,
      { once: true }
    );
  } else {
    initTestButton();
  }

})();

