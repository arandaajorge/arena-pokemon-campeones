
(() => {
  'use strict';

  if (window.LiamcitoLocalPackEffects) return;

  const el = id => document.getElementById(id);

  const dialog = el('rewardDialog');
  const name = el('rewardName');
  const title = el('rewardTitle');

  if (!dialog || !name || !title) return;

  let stage = null;
  let timer = null;
  let showing = false;

  function cleanup() {
    clearTimeout(timer);
    stage?.remove();
    stage = null;
    showing = false;

    name.hidden = false;

    const detail = el('rewardDetail');
    if (detail) detail.hidden = false;

    const button = dialog.querySelector('button');
    if (button) button.hidden = false;
  }

  dialog.addEventListener('close', cleanup);

  function animateLocalPack() {
    if (!dialog.open || showing) return;

    showing = true;

    const detail = el('rewardDetail');
    const button = dialog.querySelector('button');

    name.hidden = true;
    if (detail) detail.hidden = true;
    if (button) button.hidden = true;

    stage = document.createElement('div');
    stage.className = 'lg-pack-stage';
    stage.tabIndex = 0;
    stage.setAttribute('role', 'button');
    stage.setAttribute(
      'aria-label',
      'Toca el regalo para abrirlo'
    );

    stage.innerHTML = `
      <div class="lg-pack-envelope">🎁</div>
      <div class="lg-pack-hint">
        <span class="lg-pack-hand">👆</span>
        <strong>¡TOCA EL REGALO PARA ABRIRLO!</strong>
      </div>
    `;

    title.after(stage);

    let opened = false;

    function openGift() {
      if (opened) return;
      opened = true;

      stage.classList.add('burst');

      window.LiamcitoEffects?.particles(
        stage, '#facc15', 30
      );

      timer = setTimeout(() => {
        stage?.remove();
        stage = null;

        name.hidden = false;
        if (detail) detail.hidden = false;

        name.style.animation =
          'reveal .6s ease-out';

        timer = setTimeout(() => {
          if (button) button.hidden = false;
          showing = false;
        }, 1000);
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

  // Solo se activa cuando la recompensa
  // corresponde a un sobre local.
  const originalPack = window.pack;

  if (typeof originalPack !== 'function') return;

    window.pack = function(index) {
    const previousReward = title.textContent;

    originalPack(index);

    // Animar únicamente si la compra generó
    // una recompensa nueva.
    if (
      dialog.open &&
      title.textContent.includes('¡Nueva carta!') &&
      title.textContent !== previousReward
    ) {
      animateLocalPack();
    }
  };
  window.LiamcitoLocalPackEffects = {
    animateLocalPack,
    cleanup
  };
})();
