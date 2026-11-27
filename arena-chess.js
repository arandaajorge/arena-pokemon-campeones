
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  const SUPABASE_URL =
    'https://bwupxxeeaewdstjzmwob.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU';

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const roomBox = el('onlineRoom');

  if (!roomBox || el('arenaChessPanel')) return;

  let uid = null;
  let currentSession = null;
  let currentCode = null;
  let reading = false;
  let busy = false;
  let channel = null;
  let watchedRoom = null;
  let lastSignature = '';

  const symbols = {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟'
  };

  const pieceNames = {
    k: 'Rey',
    q: 'Reina',
    r: 'Torre',
    b: 'Alfil',
    n: 'Caballo',
    p: 'Peón'
  };

  const style = document.createElement('style');

  style.textContent = `
    #arenaChessPanel {
      margin: 18px 0;
      padding: 12px;
      background: #111827;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 18px;
      width: 100%;
      box-sizing: border-box;
    }

    #arenaChessPanel[hidden] {
      display: none !important;
    }

    #arenaChessPanel h3 {
      text-align: center;
      margin: 8px 0 16px;
    }

    .ac-player {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      margin: 10px 0;
      border-radius: 12px;
      background: #1e293b;
      border: 2px solid transparent;
    }

    .ac-player.ac-turn {
      border-color: #22c55e;
    }

    .ac-avatar {
      font-size: 34px;
      line-height: 1;
    }

    .ac-player-info {
      flex: 1;
      min-width: 0;
    }

    .ac-player-info strong {
      display: block;
      overflow-wrap: anywhere;
    }

    .ac-player-info small {
      color: #cbd5e1;
    }

    .ac-turn-label {
      font-size: 12px;
      color: #86efac;
    }

    #acBoard {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      width: 100%;
      aspect-ratio: 1;
      border: 3px solid #475569;
      border-radius: 8px;
      overflow: hidden;
      box-sizing: border-box;
    }

    #acBoard .ac-square {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      aspect-ratio: 1;
      min-width: 0;
      min-height: 0;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      overflow: hidden;
    }

    #acBoard .ac-light {
      background: #ead8b5;
    }

    #acBoard .ac-dark {
      background: #9b7553;
    }

    #acBoard .ac-last {
      box-shadow: inset 0 0 0 3px #facc15;
    }

    #acBoard .ac-check {
      background: #dc5555;
    }

    .ac-animal {
      font-size: clamp(12px, 4.5vw, 27px);
      line-height: 1;
      pointer-events: none;
    }

    .ac-symbol {
      font-size: clamp(14px, 5vw, 29px);
      font-weight: bold;
      line-height: 1;
      pointer-events: none;
    }

    .ac-white {
      color: white;
      text-shadow: 0 1px 3px #000;
    }

    .ac-black {
      color: #171717;
      text-shadow: 0 1px 2px #fff;
    }

    .ac-coordinate {
      position: absolute;
      bottom: 1px;
      right: 2px;
      font-size: 8px;
      color: #30251b;
      pointer-events: none;
    }

    #acStatus {
      text-align: center;
      padding: 12px;
      border-radius: 10px;
      background: #1e293b;
      overflow-wrap: anywhere;
    }

    #acCaptures,
    #acDetails {
      font-size: 13px;
      color: #cbd5e1;
      overflow-wrap: anywhere;
    }

    #acHistory {
      max-height: 140px;
      overflow-y: auto;
      padding: 10px;
      background: #0f172a;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.8;
    }

    #acStart,
    #acRefresh {
      width: 100%;
      margin: 8px 0;
    }
  `;

  document.head.append(style);

  const panel = document.createElement('div');

  panel.id = 'arenaChessPanel';
  panel.hidden = true;

  panel.innerHTML = `
    <h3>🧸 Ositos vs. Capibaras 🦫</h3>

    <div id="acStatus">
      Recuperando partida...
    </div>

    <button id="acStart" type="button" hidden>
      ♟️ Iniciar partida
    </button>

    <div id="acGame" hidden>

      <div id="acOpponent"></div>

      <div id="acBoard"></div>

      <div id="acMe"></div>

      <p id="acCaptures"></p>

      <p id="acDetails"></p>

      <h4>Historial de movimientos</h4>

      <div id="acHistory"></div>

    </div>

    <button id="acRefresh" type="button">
      🔄 Actualizar tablero
    </button>
  `;

  roomBox.append(panel);

  function check(response) {
    if (response.error) throw response.error;
    return response.data;
  }

  function setStatus(text) {
    el('acStatus').textContent = text;
  }

  function isVisible() {

    const online = el('online');

    return online &&
      !online.hidden &&
      !online.classList.contains('hidden') &&
      !roomBox.hidden;

  }

  function getRoomCode() {

    const text =
      el('onlineRoomCode')?.textContent || '';

    return text.match(/\b\d{6}\b/)?.[0] || null;

  }

  function parseFen(fen) {

    if (typeof fen !== 'string') {
      throw Error('Posición no disponible');
    }

    const ranks = fen.split(' ')[0].split('/');

    if (ranks.length !== 8) {
      throw Error('Tablero no válido');
    }

    const board = {};

    ranks.forEach((rank, row) => {

      let col = 0;

      for (const value of rank) {

        if (/^[1-8]$/.test(value)) {

          col += Number(value);

        } else {

          if (
            !/^[prnbqkPRNBQK]$/.test(value) ||
            col >= 8
          ) {
            throw Error('Pieza no válida');
          }

          const square =
            'abcdefgh'[col] + (8 - row);

          board[square] = value;

          col++;

        }

      }

      if (col !== 8) {
        throw Error('Fila no válida');
      }

    });

    return board;

  }

  function getMyColor(state) {

    if (state.white?.player_id === uid) {
      return 'w';
    }

    if (state.black?.player_id === uid) {
      return 'b';
    }

    return null;

  }

  function renderPlayer(container, player, color, turn) {

    const card = document.createElement('div');

    card.className =
      'ac-player' +
      (color === turn ? ' ac-turn' : '');

    const avatar = document.createElement('span');

    avatar.className = 'ac-avatar';

    avatar.textContent =
      color === 'w' ? '🧸' : '🦫';

    const info = document.createElement('div');

    info.className = 'ac-player-info';

    const name = document.createElement('strong');

    name.textContent =
      player?.nickname || 'Jugador';

    const team = document.createElement('small');

    team.textContent =
      color === 'w'
        ? 'Ositos · Blancas'
        : 'Capibaras · Negras';

    info.append(name, team);

    const indicator = document.createElement('span');

    indicator.className = 'ac-turn-label';

    indicator.textContent =
      color === turn ? 'Su turno' : '';

    card.append(avatar, info, indicator);

    container.replaceChildren(card);

  }

  function renderBoard(state, myColor) {

    const board = parseFen(state.fen);

    const container = el('acBoard');

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const file =
          myColor === 'b' ? 7 - col : col;

        const rank =
          myColor === 'b' ? row + 1 : 8 - row;

        const square = 'abcdefgh'[file] + rank;

        const piece = board[square];

        const cell = document.createElement('div');

        cell.className =
          'ac-square ' +
          ((file + rank) % 2 === 0
            ? 'ac-light'
            : 'ac-dark');

        cell.dataset.square = square;

        if (
          state.last_move?.from === square ||
          state.last_move?.to === square
        ) {
          cell.classList.add('ac-last');
        }

        if (piece) {

          const white =
            piece === piece.toUpperCase();

          const type = piece.toLowerCase();

          const color = white ? 'w' : 'b';

          if (
            type === 'k' &&
            state.check &&
            state.turn === color
          ) {
            cell.classList.add('ac-check');
          }

          const animal = document.createElement('span');

          animal.className = 'ac-animal';

          animal.textContent =
            white ? '🧸' : '🦫';

          const symbol = document.createElement('span');

          symbol.className =
            'ac-symbol ' +
            (white ? 'ac-white' : 'ac-black');

          symbol.textContent = symbols[type];

          cell.title =
            pieceNames[type] + ' · ' +
            (white ? 'Blancas' : 'Negras') +
            ' · ' + square;

          cell.append(animal, symbol);

        } else {

          cell.title = square;

        }

        const coordinate =
          document.createElement('span');

        coordinate.className = 'ac-coordinate';

        coordinate.textContent = square;

        cell.append(coordinate);

        fragment.append(cell);

      }

    }

    container.replaceChildren(fragment);

  }

  function renderHistory(state) {

    const moves = state.moves || [];

    const lines = [];

    for (let i = 0; i < moves.length; i += 2) {

      const number = Math.floor(i / 2) + 1;

      const white = moves[i]?.san || '';

      const black = moves[i + 1]?.san || '';

      lines.push(
        number + '. ' + white + ' ' + black
      );

    }

    const history = el('acHistory');

    history.textContent =
      lines.join('   ') || 'Sin movimientos';

    history.scrollTop = history.scrollHeight;

  }

  function renderCaptures(state) {

    const captured = state.captured || {};

    const format = list =>
      (list || []).map(
        piece => symbols[piece] || piece
      ).join(' ') || 'Ninguna';

    el('acCaptures').textContent =
      '🧸 Capturas: ' + format(captured.white) +
      ' | 🦫 Capturas: ' + format(captured.black);

  }

  function render(session) {

    panel.hidden = false;

    const state = session.game_state;

    const waiting =
      session.room_status === 'waiting';

    const canStart =
      waiting &&
      session.is_host &&
      (session.players || []).length === 2;

    el('acStart').hidden = !canStart;

    el('acStart').disabled = busy;

    el('acGame').hidden =
      !state || !state.fen;

    if (waiting) {

      setStatus(
        (session.players || []).length < 2
          ? 'Esperando al segundo jugador...'
          : session.is_host
            ? 'Todo listo para iniciar.'
            : 'Esperando que el anfitrión inicie.'
      );

      return;

    }

    if (!state || !state.fen) {

      setStatus('No hay tablero disponible.');

      return;

    }

    const myColor = getMyColor(state);

    if (!myColor) {

      setStatus('No perteneces a esta partida.');

      el('acGame').hidden = true;

      return;

    }

    const signature = [
      session.match_id,
      session.version,
      session.room_status,
      myColor,
      state.fen,
      state.white?.nickname,
      state.black?.nickname
    ].join('|');

    if (signature !== lastSignature) {

      const finished =
        session.match_status === 'finished' ||
        session.room_status === 'finished';

      const activeTurn =
        finished ? null : state.turn;

      renderPlayer(
        el('acOpponent'),
        myColor === 'w' ? state.black : state.white,
        myColor === 'w' ? 'b' : 'w',
        activeTurn
      );

      renderPlayer(
        el('acMe'),
        myColor === 'w' ? state.white : state.black,
        myColor,
        activeTurn
      );

      renderBoard(state, myColor);

      renderCaptures(state);

      renderHistory(state);

      el('acDetails').textContent =
        'Versión: ' + session.version +
        ' · Movimientos: ' +
        (state.moves || []).length;

      lastSignature = signature;

    }

    if (
      session.match_status === 'finished' ||
      session.room_status === 'finished'
    ) {

      if (state.draw) {

        setStatus('🤝 Partida terminada en tablas.');

      } else if (session.winner_id === uid) {

        setStatus('🏆 ¡Ganaste la partida!');

      } else {

        setStatus('Partida finalizada. Ganó tu rival.');

      }

    } else {

      const myTurn = state.turn === myColor;

      setStatus(
        (myTurn ? '🟢 Es tu turno' : '⏳ Turno del rival') +
        (state.check ? ' · ⚠️ JAQUE' : '')
      );

    }

  }

  async function watch(roomId) {

    if (watchedRoom === roomId) return;

    if (channel) {

      await db.removeChannel(channel);

      channel = null;

    }

    watchedRoom = roomId;

    if (!roomId) return;

    channel = db.channel(
      'arena-chess-' + roomId
    )

    .on('postgres_changes', {

      event: '*',
      schema: 'public',
      table: 'game_matches',
      filter: 'room_id=eq.' + roomId

    }, () => refresh())

    .on('postgres_changes', {

      event: '*',
      schema: 'public',
      table: 'room_players',
      filter: 'room_id=eq.' + roomId

    }, () => refresh())

    .on('postgres_changes', {

      event: '*',
      schema: 'public',
      table: 'game_rooms',
      filter: 'id=eq.' + roomId

    }, () => refresh())

    .subscribe();

  }

  async function refresh() {

    if (reading || busy) return;

    reading = true;

    try {

      const code =
        isVisible() ? getRoomCode() : null;

      const mode =
        el('onlineRoomMode')?.textContent || '';

      if (!code || !mode.includes('Capibaras')) {

        panel.hidden = true;

        currentSession = null;
        currentCode = null;
        lastSignature = '';

        await watch(null);

        return;

      }

      if (currentCode !== code) {

        currentCode = code;
        currentSession = null;
        lastSignature = '';

        el('acGame').hidden = true;
        el('acStart').hidden = true;

        setStatus('Recuperando partida...');

      }

      panel.hidden = false;

      const auth = check(
        await db.auth.getSession()
      );

      if (!auth.session) {

        panel.hidden = true;

        return;

      }

      uid = auth.session.user.id;

      const result = check(
        await db.rpc('recover_game_session')
      );

      if (!isVisible() || getRoomCode() !== code) {

        panel.hidden = true;

        return;

      }

      const session = (result.sessions || []).find(
        s =>
          String(s.code) === code &&
          s.game_type === 'chess'
      );

      if (!session) {

        panel.hidden = true;

        currentSession = null;

        await watch(null);

        return;

      }

      currentSession = session;

      render(session);

      await watch(session.room_id);

    } catch (error) {

      if (!panel.hidden) {

        setStatus(
          'Error: ' +
          (error.message || 'No se pudo sincronizar')
        );

      }

    } finally {

      reading = false;

    }

  }

  async function startMatch() {

    if (busy || !currentSession) return;

    if (
      !currentSession.is_host ||
      currentSession.room_status !== 'waiting'
    ) return;

    busy = true;

    el('acStart').disabled = true;

    setStatus('Iniciando partida...');

    try {

      check(await db.rpc(
        'start_chess_match',
        {
          p_room_id: currentSession.room_id
        }
      ));

    } catch (error) {

      setStatus(
        error.message || 'No se pudo iniciar'
      );

    } finally {

      busy = false;

      el('acStart').disabled = false;

      await refresh();

    }

  }

  el('acStart').onclick = startMatch;

  el('acRefresh').onclick = refresh;

  setInterval(refresh, 2000);

  refresh();

})();
