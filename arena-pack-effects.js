
(() => {
  'use strict';

  if (window.LiamcitoPackEffects) return;

  let timers = [];
  let currentStage = null;

  const el = id => document.getElementById(id);

  const reducedMotion = () =>
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  function later(fn,ms) {
    const timer = setTimeout(fn,ms);
    timers.push(timer);
  }

  function cleanup() {
    timers.forEach(clearTimeout);
    timers = [];

    currentStage?.remove();
    currentStage = null;

    const dialog = el('cloudPackDialog');
    const cards = el('cloudPackRewards');

    dialog?.classList.remove('lg-pack-opening');

    if (cards) {
      cards.style.display = '';

      cards.querySelectorAll('.cloud-card')
        .forEach(card => {
          card.classList.remove('lg-pack-reveal');
          card.style.animationDelay = '';
        });
    }

    const summary = el('cloudPackSummary');

    if (summary) summary.style.display = '';
  }

  function play(detail={}) {
    cleanup();

    const dialog = el('cloudPackDialog');
    const rewards = el('cloudPackRewards');

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

    const stage = document.createElement('div');
    stage.className = 'lg-pack-stage';

    const envelope = document.createElement('div');
    envelope.className = 'lg-pack-envelope';
    envelope.textContent = '🎁';

    const title = document.createElement('strong');
    title.textContent =
      '¡Abriendo '+
      String(detail.packName || 'tu sobre')+
      '!';

    stage.append(envelope,title);

    rewards.before(stage);
    currentStage = stage;

    cards.forEach(card => {
      const rarityColor =
        card.style.getPropertyValue('--rarity')
          .trim().toLowerCase();

      if (rarityColor==='#38bdf8') {
        card.classList.add('lg-pack-rare');
      } else if (rarityColor==='#c084fc') {
        card.classList.add('lg-pack-epic');
      } else if (rarityColor==='#facc15') {
        card.classList.add('lg-pack-legendary');
      } else if (rarityColor==='#fb7185') {
        card.classList.add('lg-pack-secret');
      }
    });

    later(() => {
      stage.classList.add('burst');

      window.LiamcitoEffects?.particles(
        stage,
        '#facc15',
        35
      );
    },1100);

    later(() => {
      stage.remove();
      currentStage = null;

      dialog.classList.remove('lg-pack-opening');

      cards.forEach((card,index) => {
        card.classList.add('lg-pack-reveal');
        card.style.animationDelay =
          (index*350)+'ms';
      });

      const totalDuration =
        650+(cards.length-1)*350;

      later(() => {
        cards.forEach(card => {
          card.classList.remove('lg-pack-reveal');
          card.style.animationDelay = '';
        });
      },totalDuration+100);

    },1600);
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

  // Prueba visual gratuita: no compra sobres.
  function createTestButton() {
    if (document.getElementById(
      'lgTestPackAnimation'
    )) return;

    const store = document.getElementById(
      'cloudStore'
    );

    if (!store) return;

    const button = document.createElement(
      'button'
    );

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
      const dialog = document.getElementById(
        'cloudPackDialog'
      );

      const rewards = document.getElementById(
        'cloudPackRewards'
      );

      const summary = document.getElementById(
        'cloudPackSummary'
      );

      if (!dialog || !rewards) return;

      if (dialog.open) dialog.close();

      rewards.replaceChildren();

      const names = [
        'Pikachu',
        'Charmander',
        'Squirtle',
        'Bulbasaur',
        'Eevee'
      ];

      names.forEach((name,index) => {
        const card = document.createElement(
          'div'
        );

        card.className = 'cloud-card';
        card.style.setProperty(
          '--rarity',
          index===4?'#facc15':'#38bdf8'
        );

        const icon = document.createElement(
          'div'
        );

        icon.textContent = [
          '⚡','🔥','💧','🌱','✨'
        ][index];

        icon.style.fontSize = '55px';

        const title = document.createElement(
          'h4'
        );

        title.textContent = name;

        card.append(icon,title);
        rewards.append(card);
      });

      if (summary) {
        summary.textContent =
          'PRUEBA VISUAL · No se compraron cartas.';
      }

      dialog.showModal();

      play({
        packName:'Sobre de prueba'
      });
    };

    store.prepend(button);
  }

  createTestButton();

})();
