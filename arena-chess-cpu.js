
(async () => {
  'use strict';

  const el = id => document.getElementById(id);

  if (el('chessCpu')) return;

  const URL =
    'https://bwupxxeeaewdstjzmwob.supabase.co';

  const KEY =
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU';

  const db = window.supabase.createClient(URL, KEY);

  let match = null;
  let game = null;
  let uid = null;
  let selected = null;
  let legal = [];
  let busy = false;
  let Chess = null;

  const section = document.createElement('section');

  section.id = 'chessCpu';
  section.className = 'panel hidden';

  section.innerHTML = `
    <h2>🧸 Ositos vs. Capibaras 🦫</h2>
    <p>Ajedrez contra CPU</p>

    <p id="ccWallet"></p>

    <div id="ccSetup">

      <label>Nombre del jugador
        <input id="ccName" maxlength="30"
          placeholder="Tu nombre">
      </label>

      <h3>Selecciona dificultad</h3>

      <div id="ccLevels">
        <button data-level="easy">
          🟢 Fácil · 25 🪙
        </button>

        <button data-level="normal">
          🔵 Normal · 50 🪙
        </button>

        <button data-level="hard">
          🟠 Difícil · 100 🪙
        </button>

        <button data-level="expert">
          🔴 Experto · 150 🪙
        </button>
      </div>

    </div>

    <div id="ccGame" hidden>

      <h3 id="ccOpponent"></h3>

      <p id="ccTurn"></p>

      <div id="ccBoard"></div>

      <h3 id="ccPlayer"></h3>

      <p id="ccDetails"></p>

      <p id="ccCaptures"></p>

      <div id="ccHistory"></div>

      <div id="ccResult" hidden></div>

      <button id="ccRetry" hidden>
        Continuar turno de CPU
      </button>

      <button id="ccAbandon">
        Abandonar partida
      </button>

      <button id="ccNew" hidden>
        Nueva partida
      </button>

    </div>

    <p id="ccStatus" role="status"></p>

    <dialog id="ccPromotion">
      <h3>Elige tu nueva pieza</h3>
      <button data-promotion="q">♕ Reina</button>
      <button data-promotion="r">♖ Torre</button>
      <button data-promotion="b">♗ Alfil</button>
      <button data-promotion="n">♘ Caballo</button>
      <button id="ccPromotionCancel">Cancelar</button>
    </dialog>
  `;

  document.querySelector('main').appendChild(section);

  const style = document.createElement('style');

  style.textContent = `
    #chessCpu [hidden] {
      display:none!important;
    }

    #ccLevels {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
    }

    #ccLevels button {
      min-height:65px;
    }

    #ccBoard {
      display:grid;
      grid-template-columns:repeat(8,1fr);
      width:100%;
      max-width:520px;
      margin:12px auto;
      border:4px solid #594333;
      border-radius:8px;
      overflow:hidden;
      box-sizing:border-box;
    }

    #ccBoard button {
      position:relative;
      aspect-ratio:1;
      min-width:0;
      min-height:0;
      width:100%;
      margin:0;
      padding:0;
      border:0;
      border-radius:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:0;
      color:#111;
      box-shadow:none;
      touch-action:manipulation;
    }

    #ccBoard .ccLight {
      background:#eadbc2;
    }

    #ccBoard .ccDark {
      background:#967354;
    }

    #ccBoard .ccSelected {
      background:#eab308!important;
    }

    #ccBoard .ccLast {
      box-shadow:inset 0 0 0 3px #facc15;
    }

    #ccBoard .ccCheck {
      background:#ef4444!important;
    }

    #ccBoard .ccLegal::after {
      content:'';
      position:absolute;
      width:25%;
      height:25%;
      border-radius:50%;
      background:#22c55e;
      opacity:.85;
    }

    #ccBoard .ccCapture {
      box-shadow:inset 0 0 0 4px #22c55e;
    }

    .ccAnimal {
      font-size:clamp(13px,5vw,30px);
      line-height:1;
    }

    .ccPiece {
      font-size:clamp(13px,4vw,24px);
      line-height:1;
      font-weight:bold;
    }

    .ccWhite {
      color:white;
      text-shadow:0 0 2px black,1px 1px black;
    }

    .ccBlack {
      color:#111;
      text-shadow:0 0 2px white;
    }

    #ccTurn {
      text-align:center;
      font-weight:900;
      padding:12px;
      background:#29334b;
      border-radius:12px;
    }

    #ccHistory {
      max-height:120px;
      overflow:auto;
      padding:12px;
      background:#141a2c;
      border-radius:10px;
      margin:12px 0;
      overflow-wrap:anywhere;
    }

    #ccResult {
      padding:20px;
      border:1px solid #8957ff;
      background:#24204a;
      border-radius:16px;
      text-align:center;
      font-size:23px;
      font-weight:900;
      white-space:pre-line;
    }

    #ccWallet {
      color:#facc15;
      font-weight:900;
    }

    #ccAbandon,#ccNew,#ccRetry {
      width:100%;
      margin-top:10px;
    }
  `;

  document.head.appendChild(style);

  const symbols = {
    w:{
      k:'♔',q:'♕',r:'♖',
      b:'♗',n:'♘',p:'♙'
    },
    b:{
      k:'♚',q:'♛',r:'♜',
      b:'♝',n:'♞',p:'♟'
    }
  };

  function status(text) {
    el('ccStatus').textContent = text;
  }

  function visible() {
    return !section.classList.contains('hidden');
  }

  function check(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function connect(create = false) {

    let data = check(
      await db.auth.getSession()
    );

    if (!data.session && create) {

      check(
        await db.auth.signInAnonymously()
      );

      data = check(
        await db.auth.getSession()
      );

    }

    if (!data.session) return false;

    const auth = check(
      await db.auth.getUser()
    );

    uid = auth.user.id;

    const profile = check(
      await db.from('players')
        .select('nickname')
        .eq('id',uid)
        .maybeSingle()
    );

    if (profile) {

      el('ccName').value = profile.nickname;

    } else if (create) {

      const name = el('ccName').value.trim();

      if (!name) {
        throw Error('Escribe tu nombre');
      }

      check(
        await db.from('players').insert({
          id:uid,
          nickname:name
        })
      );

    } else {

      return false;

    }

    return true;

  }

  async function wallet() {

    if (!uid) return;

    const data = check(
      await db.from('player_wallets')
        .select('coins')
        .eq('player_id',uid)
        .maybeSingle()
    );

    el('ccWallet').textContent = data
      ? '🪙 Saldo online: ' + data.coins
      : 'Monedero por inicializar';

  }

  async function recover() {

    if (!uid) return null;

    return check(
      await db.from('cpu_matches')
        .select('*')
        .eq('player_id',uid)
        .eq('game_type','chess')
        .eq('status','playing')
        .maybeSingle()
    );

  }

  function canPlay() {

    return !busy
      && visible()
      && match?.status === 'playing'
      && match.current_turn === 1;

  }

  function render() {

    el('ccSetup').hidden = !!match;
    el('ccGame').hidden = !match;

    if (!match) return;

    const s = match.game_state;

    game = new Chess(s.fen);

    const human = s.human_color;

    const own = human === 'w'
      ? s.white : s.black;

    const opponent = human === 'w'
      ? s.black : s.white;

    el('ccPlayer').textContent =
      (human === 'w' ? '🧸 ' : '🦫 ')
      + own.nickname;

    el('ccOpponent').textContent =
      (human === 'w' ? '🦫 ' : '🧸 ')
      + opponent.nickname;

    el('ccTurn').textContent =
      match.status !== 'playing'
        ? 'Partida finalizada'
        : match.current_turn === 1
          ? 'Tu turno' + (s.check ? ' · ¡JAQUE!' : '')
          : '🤖 Turno de la CPU';

    const files = human === 'w'
      ? 'abcdefgh' : 'hgfedcba';

    const ranks = human === 'w'
      ? '87654321' : '12345678';

    const board = el('ccBoard');

    board.replaceChildren();

    for (let r = 0; r < 8; r++) {

      for (let c = 0; c < 8; c++) {

        const square = files[c] + ranks[r];

        const piece = game.get(square);

        const cell = document.createElement('button');

        cell.type = 'button';
        cell.dataset.square = square;

        cell.setAttribute('aria-label',square);

        cell.className = (r+c)%2 === 0
          ? 'ccLight' : 'ccDark';

        if (
          s.last_move?.from === square ||
          s.last_move?.to === square
        ) {
          cell.classList.add('ccLast');
        }

        if (selected === square) {
          cell.classList.add('ccSelected');
        }

        if (legal.some(m => m.to === square)) {

          cell.classList.add(
            piece ? 'ccCapture' : 'ccLegal'
          );

        }

        if (piece) {

          const animal = document.createElement('span');

          animal.className = 'ccAnimal';

          animal.textContent =
            piece.color === 'w' ? '🧸' : '🦫';

          const symbol = document.createElement('span');

          symbol.className = 'ccPiece ' +
            (piece.color === 'w'
              ? 'ccWhite' : 'ccBlack');

          symbol.textContent =
            symbols[piece.color][piece.type];

          cell.append(animal,symbol);

          if (
            piece.type === 'k'
            && piece.color === s.turn
            && s.check
          ) {
            cell.classList.add('ccCheck');
          }

        }

        cell.onclick = () => selectSquare(square);

        board.appendChild(cell);

      }

    }

    el('ccDetails').textContent =
      'Jugadas: ' + s.moves.length
      + ' · Versión: ' + match.version;

    el('ccHistory').textContent =
      s.moves.map(m => m.san).join(' ')
      || 'Sin movimientos';

    el('ccCaptures').textContent =
      'Capturas 🧸 ' +
      (s.captured.white || [])
        .map(p => symbols.b[p]).join(' ')
      + ' | 🦫 ' +
      (s.captured.black || [])
        .map(p => symbols.w[p]).join(' ');

    const finished = match.status !== 'playing';

    el('ccAbandon').hidden = finished;
    el('ccNew').hidden = !finished;
    el('ccResult').hidden = !finished;

    el('ccRetry').hidden =
      finished || match.current_turn !== 2 || busy;

    if (finished) {

      const title =
        match.result === 'win' ? '🏆 ¡VICTORIA!' :
        match.result === 'loss' ? 'DERROTA' :
        match.result === 'draw' ? '🤝 TABLAS' :
        'Partida abandonada';

      el('ccResult').textContent =
        title + '\n🪙 +' +
        Number(match.reward_granted || 0)
        + ' monedas';

    }

  }

  async function start(difficulty) {

    if (busy) return;

    busy = true;

    try {

      if (!await connect(true)) return;

      check(
        await db.rpc('start_chess_cpu_match',{
          p_difficulty:difficulty
        })
      );

      match = await recover();

      selected = null;
      legal = [];

      await wallet();

      render();

      status('');

    } catch (error) {

      status(error.message || 'Error al iniciar');

    } finally {

      busy = false;

    }

    await cpuTurn();

  }

  async function send(action, move = {}) {

    if (busy || !match) return false;

    busy = true;

    const matchId = match.id;

    status(
      action === 'cpu_turn'
        ? '🤖 La CPU está pensando...'
        : 'Guardando movimiento...'
    );

    try {

      const auth = check(
        await db.auth.getSession()
      );

      const token = auth.session?.access_token;

      if (!token) {
        throw Error('Debes iniciar sesión');
      }

      const response = await fetch(
        URL + '/functions/v1/chess-cpu',
        {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'apikey':KEY,
            'Authorization':'Bearer ' + token
          },
          body:JSON.stringify({
            action,
            match_id:matchId,
            expected_version:Number(match.version),
            ...move
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw Error(data.error || 'Error del motor');
      }

      match = {
        ...match,
        ...data,
        id:matchId
      };

      selected = null;
      legal = [];

      status('');

      return true;

    } catch (error) {

      status(error.message || 'Error de conexión');

      try {

        const latest = check(
          await db.from('cpu_matches')
            .select('*')
            .eq('id',matchId)
            .maybeSingle()
        );

        if (latest) match = latest;

      } catch {}

      return false;

    } finally {

      busy = false;

      render();

      wallet().catch(() => {});

    }

  }

  async function cpuTurn() {

    if (
      busy || !visible()
      || match?.status !== 'playing'
      || match.current_turn !== 2
    ) return;

    await send('cpu_turn');

  }

  async function humanMove(from,to,promotion) {

    if (!canPlay()) return;

    const success = await send('move',{
      from,
      to,
      ...(promotion ? {promotion} : {})
    });

    if (success) await cpuTurn();

  }

  let pendingPromotion = null;

  function selectSquare(square) {

    if (!canPlay()) return;

    const possible = legal.filter(
      m => m.to === square
    );

    if (selected && possible.length) {

      if (possible.some(m => m.promotion)) {

        pendingPromotion = {
          from:selected,
          to:square
        };

        el('ccPromotion').showModal();

      } else {

        humanMove(selected,square);

      }

      return;

    }

    const piece = game.get(square);

    if (piece?.color === match.game_state.human_color) {

      selected = square;

      legal = game.moves({
        square,
        verbose:true
      });

    } else {

      selected = null;
      legal = [];

    }

    render();

  }

  section.querySelectorAll('[data-promotion]')
    .forEach(button => {

      button.onclick = () => {

        const move = pendingPromotion;

        pendingPromotion = null;

        el('ccPromotion').close();

        if (move) {

          humanMove(
            move.from,
            move.to,
            button.dataset.promotion
          );

        }

      };

    });

  el('ccPromotionCancel').onclick = () => {

    pendingPromotion = null;

    el('ccPromotion').close();

  };

  el('ccRetry').onclick = cpuTurn;

  el('ccAbandon').onclick = async () => {

    if (busy || !match) return;

    if (!confirm('¿Abandonar esta partida?')) return;

    busy = true;

    try {

      const result = check(
        await db.rpc('abandon_cpu_match',{
          p_match_id:match.id,
          p_expected_version:Number(match.version)
        })
      );

      if (result?.success === false) {
        throw Error(result.error || 'No se pudo abandonar');
      }

      match = null;
      selected = null;
      legal = [];

      render();

      status('Partida abandonada');

    } catch (error) {

      status(error.message);

    } finally {

      busy = false;

    }

  };

  el('ccNew').onclick = () => {

    match = null;
    selected = null;
    legal = [];

    render();

    status('');

  };

  section.querySelectorAll('[data-level]')
    .forEach(button => {

      button.onclick = () =>
        start(button.dataset.level);

    });

  async function open() {

    if (busy || !visible()) return;

    busy = true;

    try {

      if (!Chess) {

        const module = await import(
          'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm'
        );

        Chess = module.Chess;

      }

      if (await connect(false)) {

        match = await recover();

        await wallet();

      }

      selected = null;
      legal = [];

      render();

      status('');

    } catch (error) {

      status(error.message || 'Error al cargar ajedrez');

    } finally {

      busy = false;

    }

    await cpuTurn();

  }

  const menu = document.createElement('dialog');

  menu.id = 'ccModeMenu';

  menu.innerHTML = `
    <h2>🧸 Ositos vs. Capibaras 🦫</h2>
    <p>Selecciona cómo quieres jugar</p>
    <button id="ccModeCpu">
      🤖 Jugar contra CPU
    </button>
    <button id="ccModeOnline">
      🌐 Multijugador online
    </button>
    <button id="ccModeClose">
      Cerrar
    </button>
  `;

  document.body.appendChild(menu);

  el('ccModeCpu').onclick = () => {

    menu.close();

    window.show('chessCpu');

  };

  el('ccModeOnline').onclick = () => {

    menu.close();

    window.show('online');

    if (!el('onlineRoom').hidden) {

      const back = Array.from(
        el('onlineRoom').querySelectorAll('button')
      ).find(b => b.textContent.includes('Ver mis salas'));

      back?.click();

    }

    el('onlineMode').value = 'chess';

    el('onlineMode').dispatchEvent(
      new Event('change',{bubbles:true})
    );

  };

  el('ccModeClose').onclick = () => menu.close();

  document.addEventListener('click',event => {

    const button = event.target.closest(
      '[data-lg-game="chess"]'
    );

    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    menu.showModal();

  },true);

  const library = el('lgLibrary');

  if (library) {

    const button = document.createElement('button');

    button.textContent = '🤖 Ajedrez contra CPU';

    button.onclick = () => window.show('chessCpu');

    library.after(button);

  }

  const originalShow = window.show;

  window.show = function(id,...args) {

    const result = originalShow.call(this,id,...args);

    if (id === 'chessCpu') {

      open();

      requestAnimationFrame(() => {

        const title = el('arenaNavTitle');

        if (title) title.textContent = 'Ajedrez CPU';

      });

    }

    return result;

  };

  console.info('Arena Chess CPU V1.0 cargado');

})();
