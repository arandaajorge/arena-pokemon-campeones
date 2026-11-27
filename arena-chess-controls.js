
(async () => {
  'use strict';

  const el = id => document.getElementById(id);

  const URL =
    'https://bwupxxeeaewdstjzmwob.supabase.co';

  const KEY =
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU';

  const panel = el('arenaChessPanel');
  const board = el('acBoard');

  if (!panel || !board) return;
  if (el('accMessage')) return;

  const db = window.supabase.createClient(URL, KEY);

  let Chess;
  let session = null;
  let uid = null;
  let selected = null;
  let legalMoves = [];
  let engine = null;
  let busy = false;
  let reading = false;
  let signature = '';
  let promotionContext = null;

  const style = document.createElement('style');

  style.textContent = `
    #acBoard .ac-square {
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    #acBoard .acc-selected {
      box-shadow: inset 0 0 0 4px #22c55e;
      background: #79b987;
    }

    #acBoard .acc-legal::after {
      content: '';
      position: absolute;
      width: 27%;
      height: 27%;
      border-radius: 50%;
      background: rgba(20, 83, 45, .65);
      pointer-events: none;
      z-index: 3;
    }

    #acBoard .acc-capture::after {
      content: '';
      position: absolute;
      inset: 3px;
      border: 4px solid #22c55e;
      border-radius: 50%;
      pointer-events: none;
      z-index: 3;
    }

    #acBoard.acc-locked .ac-square {
      cursor: default;
    }

    #accMessage {
      padding: 10px;
      margin: 10px 0;
      background: #1e293b;
      border-radius: 10px;
      color: #cbd5e1;
      font-size: 13px;
      text-align: center;
    }

    #accPromotion[hidden] {
      display: none !important;
    }

    #accPromotion {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, .8);
    }

    #accPromotionBox {
      width: 100%;
      max-width: 360px;
      padding: 20px;
      border: 1px solid #64748b;
      border-radius: 20px;
      background: #111827;
      color: white;
      text-align: center;
    }

    #accPromotionOptions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 15px 0;
    }

    #accPromotionOptions button {
      padding: 15px 5px;
      font-size: 18px;
    }
  `;

  document.head.append(style);

  const message = document.createElement('div');

  message.id = 'accMessage';

  message.textContent =
    'Cargando controles de ajedrez...';

  board.after(message);

  const promotion = document.createElement('div');

  promotion.id = 'accPromotion';
  promotion.hidden = true;

  promotion.innerHTML = `
    <div id="accPromotionBox">
      <h3>👑 Promoción de peón</h3>
      <p>Elige tu nueva pieza</p>

      <div id="accPromotionOptions">
        <button type="button" data-piece="q">
          ♛ Reina
        </button>

        <button type="button" data-piece="r">
          ♜ Torre
        </button>

        <button type="button" data-piece="b">
          ♝ Alfil
        </button>

        <button type="button" data-piece="n">
          ♞ Caballo
        </button>
      </div>

      <button id="accCancel" type="button">
        Cancelar
      </button>
    </div>
  `;

  document.body.append(promotion);

  function say(text) {
    message.textContent = text;
  }

  function check(response) {

    if (response.error) {
      throw response.error;
    }

    return response.data;

  }

  function visible() {

    return !panel.hidden &&
      !el('onlineRoom').hidden &&
      !el('online').hidden &&
      !el('online').classList.contains('hidden') &&
      !el('acGame').hidden;

  }

  function roomCode() {

    return el('onlineRoomCode')
      ?.textContent.match(/\b\d{6}\b/)?.[0];

  }

  function myColor() {

    const state = session?.game_state;

    if (state?.white?.player_id === uid) {
      return 'w';
    }

    if (state?.black?.player_id === uid) {
      return 'b';
    }

    return null;

  }

  function canPlay() {

    return visible() &&
      !busy &&
      !!engine &&
      !!session &&
      session.match_status === 'playing' &&
      session.room_status === 'playing' &&
      String(session.code) === roomCode() &&
      !!myColor() &&
      engine.turn() === myColor();

  }

  function closePromotion() {

    promotion.hidden = true;
    promotionContext = null;

  }

  function clearSelection() {

    selected = null;
    legalMoves = [];

    paintSelection();

  }

  function paintSelection() {

    const allowed = canPlay();

    board.classList.toggle(
      'acc-locked',
      !allowed
    );

    for (const cell of board.children) {

      cell.classList.remove(
        'acc-selected',
        'acc-legal',
        'acc-capture'
      );

      if (!allowed || !selected) continue;

      const square = cell.dataset.square;

      if (square === selected) {

        cell.classList.add('acc-selected');

      }

      const move = legalMoves.find(
        m => m.to === square
      );

      if (move) {

        cell.classList.add(
          move.captured
            ? 'acc-capture'
            : 'acc-legal'
        );

      }

    }

  }

  function updateMessage() {

    if (!session || !engine) return;

    if (busy) {

      say('Enviando movimiento al servidor...');
      return;

    }

    if (session.match_status === 'finished') {

      say('La partida ha terminado.');
      return;

    }

    if (!canPlay()) {

      say('⏳ Esperando el turno de tu rival.');
      return;

    }

    if (selected) {

      say(
        'Pieza seleccionada: ' +
        selected +
        ' · Elige una casilla resaltada.'
      );

    } else {

      say(
        engine.isCheck()
          ? '⚠️ Estás en jaque. Protege a tu rey.'
          : '🟢 Toca una de tus piezas para jugar.'
      );

    }

  }

  async function refresh() {

    if (reading || busy || !Chess) return;

    if (!visible()) {

      session = null;
      engine = null;
      signature = '';

      closePromotion();
      clearSelection();

      return;

    }

    reading = true;

    try {

      const code = roomCode();

      const auth = check(
        await db.auth.getSession()
      );

      if (!auth.session) {

        throw Error('No existe sesión activa');

      }

      uid = auth.session.user.id;

      const result = check(
        await db.rpc('recover_game_session')
      );

      if (
        !visible() ||
        roomCode() !== code
      ) return;

      const next = (result.sessions || []).find(
        s =>
          String(s.code) === code &&
          s.game_type === 'chess'
      );

      if (!next?.game_state?.fen) {

        session = null;
        engine = null;
        signature = '';

        closePromotion();
        clearSelection();

        return;

      }

      const nextSignature = [
        next.match_id,
        next.version,
        next.match_status,
        next.game_state.fen
      ].join('|');

      if (nextSignature !== signature) {

        const newEngine =
          new Chess(next.game_state.fen);

        session = next;
        engine = newEngine;
        signature = nextSignature;

        closePromotion();
        clearSelection();

      } else {

        session = next;

      }

      paintSelection();
      updateMessage();

    } catch (error) {

      session = null;
      engine = null;
      signature = '';

      closePromotion();
      clearSelection();

      say(
        'Error de sincronización: ' +
        error.message
      );

    } finally {

      reading = false;

    }

  }

  function selectPiece(square) {

    if (!canPlay()) return;

    const piece = engine.get(square);

    if (!piece || piece.color !== myColor()) {

      clearSelection();
      updateMessage();

      return;

    }

    selected = square;

    legalMoves = engine.moves({
      square,
      verbose: true
    });

    paintSelection();
    updateMessage();

    if (!legalMoves.length) {

      say('Esta pieza no tiene movimientos legales.');

    }

  }

  async function sendMove(
    from,
    to,
    promotionPiece = null
  ) {

    if (!canPlay()) return;

    const valid = engine.moves({
      square: from,
      verbose: true
    }).some(m =>
      m.to === to &&
      (m.promotion || null) === promotionPiece
    );

    if (!valid) {

      say('Movimiento no permitido.');

      clearSelection();

      return;

    }

    const matchId = session.match_id;
    const version = Number(session.version);
    const code = roomCode();

    busy = true;

    closePromotion();
    clearSelection();

    say('Enviando movimiento al servidor...');

    let failure = null;

    try {

      const auth = check(
        await db.auth.getSession()
      );

      if (!auth.session) {

        throw Error('Sesión no disponible');

      }

      if (!visible() || roomCode() !== code) {

        throw Error('La sala cambió');

      }

      const request = {
        action: 'move',
        match_id: matchId,
        expected_version: version,
        from,
        to
      };

      if (promotionPiece) {

        request.promotion = promotionPiece;

      }

      const response = await fetch(
        URL + '/functions/v1/chess-engine',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'Authorization':
              'Bearer ' + auth.session.access_token,
            'apikey': KEY
          },

          body: JSON.stringify(request)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {

        throw Error(
          result.error ||
          'El servidor rechazó el movimiento'
        );

      }

      if (
        visible() &&
        roomCode() === code &&
        session?.match_id === matchId
      ) {

        session = {
          ...session,
          version: result.version,
          game_state: result.game_state,
          match_status: result.status,
          room_status: result.finished
            ? 'finished'
            : 'playing',
          winner_id: result.winner_id,
          current_turn: result.current_turn
        };

        engine = new Chess(
          result.game_state.fen
        );

        signature = [
          session.match_id,
          session.version,
          session.match_status,
          session.game_state.fen
        ].join('|');

        say('Movimiento confirmado.');

      }

    } catch (error) {

      failure = error.message;

    } finally {

      busy = false;

      await refresh();

      if (visible() && roomCode() === code) {

        el('acRefresh').click();

        if (failure) {

          say('Aviso: ' + failure);

        }

      }

    }

  }

  board.addEventListener('click', event => {

    if (!canPlay()) return;

    const cell = event.target.closest(
      '[data-square]'
    );

    if (!cell || !board.contains(cell)) return;

    const square = cell.dataset.square;

    if (selected === square) {

      clearSelection();
      updateMessage();

      return;

    }

    const piece = engine.get(square);

    if (piece?.color === myColor()) {

      selectPiece(square);

      return;

    }

    if (!selected) return;

    const candidates = legalMoves.filter(
      m => m.to === square
    );

    if (!candidates.length) {

      clearSelection();
      updateMessage();

      return;

    }

    if (candidates.some(m => m.promotion)) {

      promotionContext = {
        from: selected,
        to: square,
        matchId: session.match_id,
        version: session.version
      };

      promotion.hidden = false;

      return;

    }

    sendMove(selected, square);

  });

  el('accPromotionOptions')
    .addEventListener('click', event => {

      const button = event.target.closest(
        '[data-piece]'
      );

      if (!button || !promotionContext) return;

      const context = promotionContext;

      const piece = button.dataset.piece;

      closePromotion();

      if (
        !canPlay() ||
        session.match_id !== context.matchId ||
        session.version !== context.version
      ) {

        clearSelection();

        say('La partida cambió. Selecciona otra vez.');

        return;

      }

      sendMove(
        context.from,
        context.to,
        piece
      );

    });

  el('accCancel').onclick = () => {

    closePromotion();
    clearSelection();
    updateMessage();

  };

  const observer = new MutationObserver(() => {

    paintSelection();

  });

  observer.observe(board, {
    childList: true
  });

  try {

    const module = await import(
      'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm'
    );

    Chess = module.Chess;

    if (typeof Chess !== 'function') {

      throw Error('Motor local no disponible');

    }

    say('Controles de ajedrez preparados.');

    setInterval(refresh, 2000);

    await refresh();

  } catch (error) {

    say(
      'No se pudo cargar el motor de movimientos: ' +
      error.message
    );

  }

})();
