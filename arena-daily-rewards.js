
(() => {
  'use strict';

  if (window.LiamcitoDailyRewards) return;

  const el = id => document.getElementById(id);

  const SUPABASE_URL =
    'https://bwupxxeeaewdstjzmwob.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU';

  let db = null;
  let busy = false;
  let checking = false;
  let nextClaimAt = null;
  let refreshTimer = null;

  function getClient() {
    if (!window.supabase) {
      throw new Error('Supabase no disponible');
    }

    if (!db) {
      db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }

    return db;
  }

  function createPanel() {
    const store = el('cloudStore');

    if (!store || el('dailyRewardsPanel')) {
      return;
    }

    const panel = document.createElement('section');

    panel.id = 'dailyRewardsPanel';

    panel.style.cssText = `
      margin: 16px 0;
      padding: 18px;
      border: 2px solid #facc15;
      border-radius: 18px;
      background: linear-gradient(
        145deg, #34296a, #211a53
      );
      text-align: center;
      color: white;
    `;

    panel.innerHTML = `
      <h3>🎁 Recompensa diaria</h3>

      <p>
        ¡Recibe 300 monedas online gratis
        cada 24 horas!
      </p>

      <button
        id="dailyRewardsButton"
        type="button"
        disabled
        style="width:100%;padding:14px"
      >
        🪙 Consultando bono...
      </button>

      <p
        id="dailyRewardsMessage"
        role="status"
        style="margin-top:10px"
      ></p>
    `;

    const tabs = store.querySelector('.cloud-tabs');

    if (tabs) {
      tabs.before(panel);
    } else {
      store.append(panel);
    }

    el('dailyRewardsButton').onclick = () => {
      if (
        el('dailyRewardsButton')
          .dataset.action === 'retry'
      ) {
        checkAvailability();
      } else {
        claim();
      }
    };
  }

  function setMessage(message) {
    const target = el('dailyRewardsMessage');

    if (target) {
      target.textContent = message;
    }
  }

  function setButton(text, disabled, action = '') {
    const button = el('dailyRewardsButton');

    if (!button) return;

    button.textContent = text;
    button.disabled = disabled;
    button.dataset.action = action;
  }

  function updateAvailability() {
    if (busy || checking) return;

    if (!nextClaimAt) {
      setButton(
        '🎁 Reclamar 300 monedas',
        false
      );
      return;
    }

    const remaining =
      new Date(nextClaimAt).getTime() -
      Date.now();

    if (remaining <= 0) {
      nextClaimAt = null;

      setButton(
        '🎁 Reclamar 300 monedas',
        false
      );

      setMessage(
        '¡Tu recompensa está disponible!'
      );

      return;
    }

    const hours = Math.floor(
      remaining / 3600000
    );

    const minutes = Math.ceil(
      (remaining % 3600000) / 60000
    );

    setButton(
      `⏳ Próximo bono: ${hours}h ${minutes}m`,
      true
    );
  }

  async function getUser() {
    const client = getClient();

    const { data, error } =
      await client.auth.getUser();

    if (error) throw error;

    return data.user;
  }

  async function checkAvailability() {
    if (busy || checking) return;

    createPanel();

    checking = true;

    setButton(
      '🪙 Consultando bono...',
      true
    );

    try {
      const user = await getUser();

      if (!user) {
        nextClaimAt = null;

        setButton(
          '🔒 Inicia sesión online',
          true
        );

        setMessage(
          'Inicia sesión para recibir monedas.'
        );

        return;
      }

      const { data: player, error: playerError } =
        await db
          .from('players')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

      if (playerError) throw playerError;

      if (!player) {
        nextClaimAt = null;

        setButton(
          '🔒 Registra tu perfil online',
          true
        );

        setMessage(
          'Primero registra tu jugador online.'
        );

        return;
      }

      const { data, error } = await db
        .from('player_daily_rewards')
        .select('last_claimed_at')
        .eq('player_id', user.id)
        .maybeSingle();

      if (error) throw error;

      nextClaimAt = data?.last_claimed_at
        ? new Date(
            new Date(
              data.last_claimed_at
            ).getTime() +
            24 * 60 * 60 * 1000
          ).toISOString()
        : null;

      setMessage(
        nextClaimAt
          ? 'Ya reclamaste tu recompensa.'
          : '¡Tienes 300 monedas listas para reclamar!'
      );

    } catch (error) {
      nextClaimAt = null;

      setButton(
        '🔄 Reintentar consulta',
        false,
        'retry'
      );

      setMessage(
        'No se pudo consultar el bono: ' +
        (error.message || 'Error desconocido')
      );

      return;

    } finally {
      checking = false;
    }

    updateAvailability();
  }

  async function claim() {
    if (busy || checking) return;

    busy = true;

    setButton(
      '⏳ Reclamando monedas...',
      true
    );

    setMessage(
      'Verificando recompensa en Supabase...'
    );

    try {
      const user = await getUser();

      if (!user) {
        throw new Error(
          'Debes iniciar sesión'
        );
      }

      const { data, error } =
        await db.rpc('claim_daily_coins');

      if (error) throw error;

      if (data?.success === true) {
        nextClaimAt = data.next_claim_at;

        setMessage(
          '🎉 ¡Ganaste 300 monedas online! ' +
          'Nuevo saldo: ' +
          data.total_coins
        );

        const coins = el('cloudStoreCoins');

        if (coins) {
          coins.textContent =
            data.total_coins;
        }

        // Refrescar la tienda y los precios.
        el('cloudStoreRefresh')?.click();

      } else if (
        data?.reason === 'already_claimed'
      ) {
        nextClaimAt = data.next_claim_at;

        setMessage(
          'Ya reclamaste tus monedas. ' +
          'Vuelve cuando termine el contador.'
        );

      } else {
        throw new Error(
          'No se pudo confirmar la recompensa'
        );
      }

    } catch (error) {
      nextClaimAt = null;

      setMessage(
        'No se pudo reclamar: ' +
        (error.message || 'Error de conexión')
      );

      setButton(
        '🔄 Consultar nuevamente',
        false,
        'retry'
      );

      return;

    } finally {
      busy = false;
    }

    updateAvailability();
  }

  function init() {
    createPanel();

    const refresh = el('cloudStoreRefresh');

    if (!refresh) return;

    refresh.addEventListener(
      'click',
      checkAvailability
    );

    const previousShow = window.show;

    if (typeof previousShow === 'function') {
      window.show = function(id) {
        previousShow.apply(this, arguments);

        if (id === 'online') {
          checkAvailability();
        }
      };
    }

    if (!refreshTimer) {
      refreshTimer = setInterval(
        updateAvailability,
        60000
      );
    }

    checkAvailability();
  }

  window.LiamcitoDailyRewards = {
    checkAvailability
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
