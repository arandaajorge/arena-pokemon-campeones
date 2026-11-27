
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const room = el('onlineRoom');

  if (!room || el('chessActionsPanel')) return;

  const db = window.supabase.createClient(
    'https://bwupxxeeaewdstjzmwob.supabase.co',
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
  );

  let session = null;
  let uid = null;
  let busy = false;
  let reading = false;

  const panel = document.createElement('div');

  panel.id = 'chessActionsPanel';
  panel.hidden = true;

  panel.style.cssText = `
    margin:16px 0;
    padding:15px;
    background:#141a2c;
    border:1px solid #29334b;
    border-radius:16px;
  `;

  panel.innerHTML = `
    <h3 style="margin-top:0">
      ♟️ Opciones de partida
    </h3>

    <div id="caOfferBox" hidden
      style="padding:12px;margin-bottom:12px;
      background:#29334b;border-radius:12px">

      <p id="caOfferText"></p>

      <div style="display:flex;flex-wrap:wrap;gap:8px">

        <button id="caAccept" hidden
          style="background:#22c55e;color:white">
          ✓ Aceptar tablas
        </button>

        <button id="caReject" hidden
          style="background:#475569;color:white">
          ✕ Rechazar
        </button>

        <button id="caCancel" hidden>
          Cancelar propuesta
        </button>

      </div>

    </div>

    <div id="caActions"
      style="display:grid;gap:10px">

      <button id="caDraw"
        style="background:#4338ca;color:white">
        🤝 Solicitar tablas
      </button>

      <button id="caResign"
        style="background:#9f294b;color:white">
        🏳️ Rendirse
      </button>

    </div>

    <p id="caResult" hidden
      style="font-weight:bold;text-align:center">
    </p>

    <p id="caStatus"
      role="status"
      aria-live="polite"
      style="font-size:13px;color:#cbd5e1">
    </p>
  `;

  room.appendChild(panel);

  const css = document.createElement('style');

  css.textContent = `
    #chessActionsPanel[hidden],
    #chessActionsPanel [hidden] {
      display:none!important;
    }

    #chessActionsPanel button {
      min-height:44px;
      font-size:14px;
    }
  `;

  document.head.appendChild(css);

  function status(message) {
    el('caStatus').textContent = message;
  }

  function visible() {

    return !el('online').classList.contains('hidden')
      && !room.hidden
      && /capibaras|ajedrez/i.test(
        el('onlineRoomMode').textContent
      );

  }

  function roomCode() {

    return el('onlineRoomCode')
      .textContent.match(/\d{6}/)?.[0] || '';

  }

  function check(response) {

    if (response.error) {
      throw response.error;
    }

    return response.data;

  }

  async function getSession() {

    const auth = check(
      await db.auth.getSession()
    );

    uid = auth.session?.user?.id || null;

    if (!uid) return null;

    const code = roomCode();

    const data = check(
      await db.rpc('recover_game_session')
    );

    return (data.sessions || []).find(item =>
      String(item.code) === code
      && item.game_type === 'chess'
    ) || null;

  }

  function render() {

    panel.hidden = !visible()
      || !session?.match_id;

    if (panel.hidden) return;

    const state = session.game_state || {};

    const playing =
      session.match_status === 'playing';

    const ended =
      session.match_status === 'finished';

    const offer = state.draw_offer;

    const pending =
      playing && offer?.status === 'pending';

    const ownOffer =
      String(offer?.offered_by) === String(uid);

    el('caActions').hidden = !playing;

    el('caOfferBox').hidden = !pending;

    el('caDraw').disabled = busy || pending;

    el('caResign').disabled = busy;

    el('caAccept').hidden =
      !pending || ownOffer;

    el('caReject').hidden =
      !pending || ownOffer;

    el('caCancel').hidden =
      !pending || !ownOffer;

    for (const id of [
      'caAccept',
      'caReject',
      'caCancel'
    ]) {
      el(id).disabled = busy;
    }

    if (pending) {

      el('caOfferText').textContent =
        ownOffer
          ? '⏳ Esperando respuesta del adversario.'
          : '🤝 Tu adversario propone tablas.';

    }

    el('caResult').hidden = !ended;

    if (ended) {

      if (state.draw) {

        el('caResult').textContent =
          '🤝 Partida terminada en tablas.';

      } else if (
        String(session.winner_id) === String(uid)
      ) {

        el('caResult').textContent =
          '🏆 ¡Ganaste la partida!';

      } else {

        el('caResult').textContent =
          'Partida terminada. Ganó tu adversario.';

      }

      if (state.result_reason === 'resignation') {

        el('caResult').textContent +=
          ' · Por rendición.';

      }

    }

  }

  async function refresh(force = false) {

    if (reading || (busy && !force)) return;

    if (!visible()) {

      panel.hidden = true;
      session = null;
      return;

    }

    reading = true;

    try {

      const current = await getSession();

      session = current;

      render();

    } catch (error) {

      status(
        error.message ||
        'No se pudo consultar la partida.'
      );

    } finally {

      reading = false;

    }

  }

  async function action(type) {

    if (busy || reading || !visible()) return;

    if (!session?.match_id) return;

    if (session.match_status !== 'playing') return;

    const matchId = session.match_id;
    const version = session.version;

    if (type === 'resign') {

      const confirmed = window.confirm(
        '¿Seguro que deseas rendirte? ' +
        'Tu adversario ganará la partida.'
      );

      if (!confirmed) return;

    }

    if (type === 'accept') {

      const confirmed = window.confirm(
        '¿Aceptar las tablas y finalizar la partida?'
      );

      if (!confirmed) return;

    }

    busy = true;
    render();

    status('Procesando solicitud...');

    try {

      const latest = await getSession();

      if (
        !visible()
        || !latest
        || latest.match_id !== matchId
        || latest.match_status !== 'playing'
        || String(latest.version) !== String(version)
      ) {

        session = latest;

        throw new Error(
          'La partida cambió. Revisa su estado ' +
          'antes de volver a intentarlo.'
        );

      }

      let result;

      if (type === 'resign') {

        result = check(
          await db.rpc('resign_chess_match', {
            p_match_id: matchId,
            p_expected_version: version
          })
        );

      } else {

        result = check(
          await db.rpc('chess_draw_action', {
            p_match_id: matchId,
            p_action: type,
            p_expected_version: version
          })
        );

      }

      if (result?.success === false) {

        throw new Error(
          result.message ||
          'No se pudo completar la acción.'
        );

      }

      const messages = {
        offer: 'Propuesta de tablas enviada.',
        accept: 'Tablas aceptadas.',
        reject: 'Propuesta rechazada.',
        cancel: 'Propuesta cancelada.',
        resign: 'Rendición registrada.'
      };

      status(messages[type]);

    } catch (error) {

      status(
        error.message ||
        'No se pudo completar la acción.'
      );

    } finally {

      busy = false;

      await refresh(true);

      el('acRefresh')?.click();

      render();

    }

  }

  el('caDraw').onclick =
    () => action('offer');

  el('caAccept').onclick =
    () => action('accept');

  el('caReject').onclick =
    () => action('reject');

  el('caCancel').onclick =
    () => action('cancel');

  el('caResign').onclick =
    () => action('resign');

  document.addEventListener(
    'arena:section-change',
    () => refresh()
  );

  setInterval(() => refresh(), 2000);

  refresh();

  console.info(
    'Controles de ajedrez V1.0 cargados'
  );

})();
