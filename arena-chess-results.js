
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const room = el('onlineRoom');

  if (!room || el('chessResultsPanel')) return;

  const db = window.supabase.createClient(
    'https://bwupxxeeaewdstjzmwob.supabase.co',
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
  );

  let uid = null;
  let session = null;
  let reading = false;
  let busy = false;

  const check = response => {
    if (response.error) throw response.error;
    return response.data;
  };

  // ESTILOS

  const style = document.createElement('style');

  style.textContent = `
    #chessResultsPanel[hidden],
    #chessResultsPanel [hidden] {
      display:none!important;
    }

    #chessResultsPanel {
      margin:16px 0;
      padding:22px;
      border:1px solid #8957ff;
      border-radius:22px;
      background:linear-gradient(
        145deg,#24204a,#141a2c
      );
      text-align:center;
    }

    #crIcon {
      font-size:65px;
      margin:8px 0;
    }

    #crTitle {
      font-size:28px;
      margin:12px 0;
    }

    #crReward {
      font-size:25px;
      color:#facc15;
      font-weight:900;
    }

    #crBalance {
      color:#cbd5e1;
      font-size:14px;
    }

    #crRematch {
      width:100%;
      background:linear-gradient(
        135deg,#8957ff,#4338ca
      );
      color:white;
      margin:8px 0;
    }

    #crCancel,#crHome {
      width:100%;
      background:#29334b;
      color:white;
      margin:8px 0;
    }

    #crPlayers {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin:16px 0;
    }

    .cr-player {
      padding:12px 5px;
      background:#141a2c;
      border-radius:12px;
      overflow-wrap:anywhere;
    }

    .cr-player small {
      display:block;
      margin-top:8px;
    }
  `;

  document.head.appendChild(style);

  // PANEL DE RESULTADOS

  const panel = document.createElement('div');

  panel.id = 'chessResultsPanel';
  panel.hidden = true;

  panel.innerHTML = `
    <div id="crIcon">🏆</div>

    <h2 id="crTitle"></h2>

    <p id="crReason"></p>

    <div id="crReward"></div>

    <p id="crRewardInfo"></p>

    <p id="crBalance"></p>

    <hr style="opacity:.2">

    <h3>🔄 Revancha</h3>

    <div id="crPlayers"></div>

    <button id="crRematch" type="button">
      Solicitar revancha
    </button>

    <button id="crCancel"
      type="button" hidden>
      Cancelar solicitud
    </button>

    <button id="crHome" type="button">
      🏠 Volver al inicio
    </button>

    <p id="crStatus"
      role="status"
      aria-live="polite">
    </p>
  `;

  const chessPanel = el('arenaChessPanel');

  if (chessPanel) {
    chessPanel.after(panel);
  } else {
    room.appendChild(panel);
  }

  function status(message) {
    el('crStatus').textContent = message;
  }

  function visible() {

    return !el('online')
      .classList.contains('hidden')
      && !room.hidden
      && /capibaras|ajedrez/i.test(
        el('onlineRoomMode').textContent
      );

  }

  function roomCode() {

    return el('onlineRoomCode')
      .textContent.match(/\d{6}/)?.[0] || '';

  }

  // RECUPERAR PARTIDA

  async function recover() {

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
      item.game_type === 'chess'
      && String(item.code) === code
    ) || null;

  }

  // CONSULTAR RECOMPENSA REAL

  async function getReward(matchId) {

    const data = check(
      await db.from('player_transactions')
        .select('amount')
        .eq('player_id', uid)
        .eq('reason', 'chess_victory')
        .eq('reference_id', matchId)
        .maybeSingle()
    );

    return Number(data?.amount || 0);

  }

  async function getBalance() {

    const data = check(
      await db.from('player_wallets')
        .select('coins')
        .eq('player_id', uid)
        .maybeSingle()
    );

    return data
      ? Number(data.coins)
      : null;

  }

  // MOSTRAR JUGADORES Y REVANCHA

  function drawPlayers(state, rematches) {

    const box = el('crPlayers');

    box.replaceChildren();

    const players = [
      {
        ...state.white,
        icon:'🧸'
      },
      {
        ...state.black,
        icon:'🦫'
      }
    ];

    for (const player of players) {

      const accepted = rematches.some(item =>
        String(item.player_id) ===
          String(player.player_id)
        && item.accepted === true
      );

      const card = document.createElement('div');

      card.className = 'cr-player';

      const icon = document.createElement('div');

      icon.textContent = player.icon;
      icon.style.fontSize = '34px';

      const name = document.createElement('strong');

      name.textContent =
        player.nickname || 'Jugador';

      const ready = document.createElement('small');

      ready.textContent = accepted
        ? '✓ Revancha aceptada'
        : '⏳ Sin confirmar';

      ready.style.color = accepted
        ? '#86efac'
        : '#a4aec3';

      card.append(icon, name, ready);

      box.appendChild(card);

    }

  }

  // RESULTADO DE PARTIDA

  async function render(current) {

    if (
      !visible()
      || !current?.match_id
      || current.match_status !== 'finished'
    ) {

      panel.hidden = true;

      return;

    }

    const state = current.game_state || {};

    const draw = state.draw === true;

    const won =
      !draw
      && String(current.winner_id) ===
        String(uid);

    el('crIcon').textContent =
      draw ? '🤝' : won ? '🏆' : '♟️';

    el('crTitle').textContent =
      draw
        ? '¡TABLAS!'
        : won
          ? '¡VICTORIA!'
          : 'DERROTA';

    const reasons = {
      checkmate:'Jaque mate',
      resignation:'Rendición',
      draw_agreement:'Tablas por acuerdo',
      stalemate:'Rey ahogado',
      insufficient_material:'Material insuficiente',
      threefold_repetition:'Triple repetición',
      fifty_move_rule:'Regla de los 50 movimientos'
    };

    el('crReason').textContent =
      reasons[state.result_reason]
      || 'Partida finalizada';

    const rematches = Array.isArray(
      current.rematches
    ) ? current.rematches : [];

    drawPlayers(state, rematches);

    const accepted = rematches.some(item =>
      String(item.player_id) === String(uid)
      && item.accepted === true
    );

    el('crRematch').disabled =
      busy || accepted;

    el('crRematch').textContent = accepted
      ? '⏳ Esperando al adversario'
      : '🔄 Solicitar revancha';

    el('crCancel').hidden = !accepted;
    el('crCancel').disabled = busy;

    el('crReward').textContent =
      'Consultando recompensa...';

    el('crRewardInfo').textContent = '';
    el('crBalance').textContent = '';

    panel.hidden = false;

    const [reward, balance] =
      await Promise.all([
        getReward(current.match_id),
        getBalance()
      ]);

    if (
      !visible()
      || session?.match_id !== current.match_id
    ) return;

    el('crReward').textContent =
      '🪙 +' + reward + ' monedas';

    if (reward > 0) {

      el('crRewardInfo').textContent =
        'Recompensa acreditada correctamente.';

    } else if (draw) {

      el('crRewardInfo').textContent =
        'Las tablas no generan recompensas.';

    } else if (!won) {

      el('crRewardInfo').textContent =
        'Sigue practicando para tu próxima victoria.';

    } else if (
      state.result_reason === 'resignation'
    ) {

      el('crRewardInfo').textContent =
        'La victoria por rendición no genera monedas.';

    } else {

      el('crRewardInfo').textContent =
        'Esta victoria no generó una recompensa.';

    }

    el('crBalance').textContent =
      balance === null
        ? 'Saldo online no disponible'
        : 'Saldo online: 🪙 ' + balance;

  }

  // SINCRONIZACIÓN

  async function refresh() {

    if (reading || busy) return;

    if (!visible()) {

      panel.hidden = true;
      session = null;

      return;

    }

    reading = true;

    try {

      const previousId = session?.match_id;

      const current = await recover();

      session = current;

      if (
        previousId
        && current?.match_id !== previousId
        && current?.match_status === 'playing'
      ) {

        panel.hidden = true;

        el('acRefresh')?.click();

        status('');

      } else {

        await render(current);

      }

    } catch (error) {

      status(
        error.message ||
        'Error al recuperar resultados.'
      );

    } finally {

      reading = false;

    }

  }

  // SOLICITAR O CANCELAR REVANCHA

  async function rematch(accept) {

    if (busy || reading || !visible()) return;

    if (
      !session?.match_id
      || session.match_status !== 'finished'
    ) return;

    const matchId = session.match_id;

    busy = true;

    el('crRematch').disabled = true;
    el('crCancel').disabled = true;

    status('Procesando solicitud...');

    try {

      const current = await recover();

      if (
        !visible()
        || current?.match_id !== matchId
        || current.match_status !== 'finished'
      ) {

        throw Error(
          'La partida cambió. Actualizando...'
        );

      }

      const result = check(
        await db.rpc(
          'chess_rematch_action',
          {
            p_match_id: matchId,
            p_accept: accept
          }
        )
      );

      if (result?.success === false) {

        throw Error(
          result.message ||
          result.error ||
          'No se pudo registrar la revancha.'
        );

      }

      status(
        accept
          ? 'Solicitud registrada.'
          : 'Solicitud cancelada.'
      );

    } catch (error) {

      status(
        error.message ||
        'Error al solicitar revancha.'
      );

    } finally {

      busy = false;

      await refresh();

      el('acRefresh')?.click();

    }

  }

  el('crRematch').onclick =
    () => rematch(true);

  el('crCancel').onclick =
    () => rematch(false);

  el('crHome').onclick =
    () => window.show('home');

  document.addEventListener(
    'arena:section-change',
    refresh
  );

  setInterval(refresh, 3000);

  refresh();

  console.info(
    'Arena Chess Results V1.0 cargado'
  );

})();
