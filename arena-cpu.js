
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  let db = null;
  let uid = null;
  let profile = null;

  let difficulties = [];
  let collection = [];

  let difficulty = null;
  let selected = [null, null, null];

  let session = null;
  let coins = 0;
  let healUntil = null;

  let loading = false;
  let busy = false;
  let ready = false;

  const check = r => {
    if (r.error) throw r.error;
    return r.data;
  };

  const visible = () =>
    !el('cpu').classList.contains('hidden');

  const status = text => {
    el('cpuStatus').textContent = text;
  };

  const css = document.createElement('style');

  css.textContent = `
    #cpuDifficulties {
      display:grid;
      grid-template-columns:
        repeat(2,minmax(0,1fr));
      gap:10px;
      margin:12px 0;
    }

    .cpu-difficulty {
      color:white;
      border:2px solid transparent;
      border-radius:16px;
      padding:15px 6px;
      text-align:center;
      min-width:0;
    }

    .cpu-difficulty.selected {
      border-color:#facc15;
      box-shadow:0 0 16px #facc1566;
    }

    .cpu-difficulty small {
      display:block;
      margin-top:6px;
      color:white;
      font-size:12px;
    }

    .cpu-team-grid {
      display:grid;
      grid-template-columns:
        repeat(3,minmax(0,1fr));
      gap:8px;
      margin:15px 0;
    }

    .cpu-slot {
      background:#34296a;
      border:1px solid #8c72d7;
      border-radius:14px;
      padding:8px;
      text-align:center;
      min-width:0;
    }

    .cpu-slot select {
      width:100%;
      font-size:12px;
      padding:8px 3px;
    }

    .cpu-slot img {
      width:100%;
      max-width:120px;
      aspect-ratio:1;
      object-fit:contain;
    }

    .cpu-slot strong {
      display:block;
      overflow-wrap:anywhere;
      font-size:13px;
    }

    .cpu-slot small {
      display:block;
      margin:6px 0;
    }

    .cpu-empty {
      font-size:45px;
      min-height:65px;
      display:grid;
      place-items:center;
    }

    #cpuWallet {
      background:#39286c;
      border-radius:12px;
      padding:12px;
      color:#facc15;
      font-weight:bold;
    }

    #cpuStart {
      width:100%;
      margin:12px 0;
    }

    #cpuResume {
      padding:16px;
      background:#34296a;
      border:2px solid #facc15;
      border-radius:16px;
      margin:12px 0;
    }

    #cpuAccount button {
      margin:8px 0;
    }

    #cpuStatus {
      color:#ffde86;
      overflow-wrap:anywhere;
    }
  `;

  document.head.append(css);

const battleCss = document.createElement('style');

battleCss.textContent = `
  #cpuBattle {
    margin-top:16px;
  }

  .cpu-battle-header {
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:8px;
    margin-bottom:12px;
  }

  .cpu-battle-turn {
    background:#39286c;
    border:1px solid #8c72d7;
    border-radius:12px;
    padding:12px;
    text-align:center;
    font-weight:bold;
    margin:12px 0;
  }

  .cpu-battle-grid {
    display:grid;
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap:8px;
  }

  .cpu-fighter {
    min-width:0;
    background:#34296a;
    border:1px solid #8c72d7;
    border-radius:16px;
    padding:10px;
    text-align:center;
    overflow:hidden;
  }

  .cpu-fighter h3 {
    margin:6px 0;
    overflow-wrap:anywhere;
    font-size:17px;
  }

  .cpu-fighter img {
    width:100%;
    max-width:180px;
    aspect-ratio:1;
    object-fit:contain;
    filter:drop-shadow(0 8px 8px #0005);
  }

  .cpu-fighter p {
    font-size:12px;
    margin:7px 0;
  }

  .cpu-fighter-label {
    color:#ddd6fe;
    font-size:12px;
    font-weight:bold;
  }

  .cpu-bar {
    height:12px;
    background:#17132e;
    border-radius:20px;
    overflow:hidden;
    margin-top:8px;
  }

  .cpu-bar-fill {
    height:100%;
    border-radius:20px;
    transition:width .35s ease;
  }

  .cpu-reserves {
    display:grid;
    grid-template-columns:
      repeat(3,minmax(0,1fr));
    gap:4px;
    margin-top:12px;
  }

  .cpu-reserve {
    min-width:0;
    background:#211a53;
    border:1px solid #6554a0;
    border-radius:9px;
    padding:4px;
    font-size:9px;
    overflow-wrap:anywhere;
  }

  .cpu-reserve.active {
    border:2px solid #facc15;
  }

  .cpu-reserve.defeated {
    opacity:.4;
    filter:grayscale(1);
  }

  .cpu-reserve img {
    width:100%;
    max-width:55px;
    aspect-ratio:1;
    object-fit:contain;
  }

  .cpu-reserve span {
    display:block;
  }

  .cpu-battle-actions {
    display:grid;
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap:8px;
    margin:15px 0;
  }

  .cpu-battle-actions button {
    min-width:0;
    color:white;
    font-size:13px;
    padding:12px 5px;
    border-radius:12px;
  }

  .cpu-battle-actions small {
    display:block;
    color:white;
    font-size:10px;
    margin-top:5px;
  }

  .cpu-battle-log {
    background:#17132e;
    border-radius:12px;
    padding:12px;
    color:#ffde86;
    font-size:13px;
    overflow-wrap:anywhere;
  }

  .cpu-abandon {
    width:100%;
    background:#9f294b;
    color:white;
    margin-top:15px;
  }
`;

document.head.append(battleCss);

  async function connect() {

    if (!window.supabase) {
      throw Error('Supabase no disponible');
    }

    db ||= window.supabase.createClient(
      'https://bwupxxeeaewdstjzmwob.supabase.co',
      'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
    );

    const { session: authSession } = check(
      await db.auth.getSession()
    );

    if (!authSession) return false;

    const { user } = check(
      await db.auth.getUser()
    );

    if (!user) return false;

    uid = user.id;

    profile = check(
      await db.from('players')
        .select('id,nickname')
        .eq('id', uid)
        .maybeSingle()
    );

    if (!profile) return false;

    check(await db.rpc(
      'initialize_player_inventory'
    ));

    return true;
  }

  function drawAccount(connected) {

    const box = el('cpuAccount');

    box.replaceChildren();

    if (connected && profile) {

      const p = document.createElement('p');

      p.textContent =
        '👤 Entrenador: ' + profile.nickname;

      box.append(p);

      return;
    }

    const p = document.createElement('p');

    p.textContent =
      'Necesitas un perfil online para jugar contra CPU.';

    const button = document.createElement('button');

    button.type = 'button';

    button.textContent =
      '🌐 Ir al multijugador online';

    button.onclick = () => window.show('online');

    box.append(p, button);
  }

  function drawWallet() {

    el('cpuWallet').textContent =
      '🪙 Monedas online: ' + coins;
  }

  async function loadData() {

    const results = await Promise.all([

      db.from('cpu_difficulties')
        .select(
          'id,name,intelligence_level,pokemon_reward'
        )
        .eq('active', true)
        .order('intelligence_level'),

      db.from('player_collection')
        .select('pokemon_id,quantity')
        .eq('player_id', uid)
        .gt('quantity', 0),

      db.from('pokemon_catalog')
        .select(
          'id,name,emoji,image_url,max_hp,element,rarity'
        ),

      db.rpc('recover_cpu_sessions')

    ]);

    const [
      levels,
      owned,
      catalog,
      recovered
    ] = results.map(check);

    if (!recovered?.success) {

      throw Error(
        recovered?.message ||
        recovered?.error ||
        'No se pudieron recuperar las partidas'
      );
    }

    difficulties = levels || [];

    const catalogMap = new Map(
      catalog.map(p => [p.id, p])
    );

    collection = owned
      .filter(row => catalogMap.has(row.pokemon_id))
      .map(row => ({
        ...catalogMap.get(row.pokemon_id),
        quantity: Number(row.quantity)
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    coins = Number(recovered.coins ?? 0);

    healUntil =
      recovered.heal_available_at || null;

    session = (recovered.sessions || [])
      .find(s =>
        s.game_type === 'pokemon' &&
        s.status === 'playing'
      ) || null;

    if (!difficulties.some(
      d => d.id === difficulty
    )) {
      difficulty = null;
    }

    selected = selected.map(id =>
      collection.some(p => p.id === id)
        ? id
        : null
    );
  }

  function drawDifficulties() {

    const box = el('cpuDifficulties');

    box.replaceChildren();

    const colors = {
      easy: '#166534',
      normal: '#1e40af',
      hard: '#9a3412',
      expert: '#991b1b'
    };

    const icons = {
      easy: '🟢',
      normal: '🔵',
      hard: '🟠',
      expert: '🔴'
    };

    for (const d of difficulties) {

      const button =
        document.createElement('button');

      button.type = 'button';

      button.className =
        'cpu-difficulty';

      button.style.background =
        colors[d.id] || '#4e3b96';

      button.classList.toggle(
        'selected',
        difficulty === d.id
      );

      button.disabled = busy || loading;

      button.setAttribute(
        'aria-pressed',
        String(difficulty === d.id)
      );

      const name =
        document.createElement('strong');

      name.textContent =
        (icons[d.id] || '🎯') + ' ' + d.name;

      const reward =
        document.createElement('small');

      reward.textContent =
        '🏆 ' + d.pokemon_reward + ' monedas';

      const intelligence =
        document.createElement('small');

      intelligence.textContent =
        'Nivel ' + d.intelligence_level;

      button.append(
        name,
        reward,
        intelligence
      );

      button.onclick = () => {

        if (busy || loading) return;

        difficulty = d.id;

        drawDifficulties();

        validateTeam();
      };

      box.append(button);
    }
  }

  function drawTeam() {

    const box = el('cpuTeamSelection');

    box.replaceChildren();

    const grid =
      document.createElement('div');

    grid.className = 'cpu-team-grid';

    for (let i = 0; i < 3; i++) {

      const slot =
        document.createElement('div');

      slot.className = 'cpu-slot';

      const title =
        document.createElement('strong');

      title.textContent =
        'Pokémon ' + (i + 1);

      slot.append(title);

      const pokemon = collection.find(
        p => p.id === selected[i]
      );

      if (pokemon?.image_url) {

        const img =
          document.createElement('img');

        img.src = pokemon.image_url;
        img.alt = pokemon.name;

        img.onerror = () => {

          const emoji =
            document.createElement('div');

          emoji.className = 'cpu-empty';

          emoji.textContent =
            pokemon.emoji || '✨';

          img.replaceWith(emoji);
        };

        slot.append(img);

      } else {

        const emoji =
          document.createElement('div');

        emoji.className = 'cpu-empty';

        emoji.textContent =
          pokemon?.emoji || '❔';

        slot.append(emoji);
      }

      const info =
        document.createElement('small');

      info.textContent = pokemon
        ? pokemon.max_hp + ' PV'
        : 'Sin seleccionar';

      slot.append(info);

      const select =
        document.createElement('select');

      select.setAttribute(
        'aria-label',
        'Pokémon ' + (i + 1)
      );

      select.add(
        new Option('Seleccionar', '')
      );

      for (const p of collection) {

        const option =
          new Option(p.name, p.id);

        option.disabled = selected.some(
          (id, index) =>
            index !== i && id === p.id
        );

        select.add(option);
      }

      select.value = selected[i] || '';

      select.disabled = busy || loading;

      select.onchange = () => {

        selected[i] = select.value || null;

        drawTeam();

        validateTeam();
      };

      slot.append(select);

      grid.append(slot);
    }

    box.append(grid);

    const count =
      document.createElement('small');

    count.textContent =
      'Pokémon disponibles: ' +
      collection.length;

    box.append(count);
  }

  function validateTeam() {

    const valid =

      ready &&

      !busy &&

      !loading &&

      !session &&

      difficulties.some(
        d => d.id === difficulty
      ) &&

      selected.every(id =>
        id && collection.some(p => p.id === id)
      ) &&

      new Set(selected).size === 3;

    el('cpuStart').disabled = !valid;

    return valid;
  }

  function drawResume() {

    const box = el('cpuResume');

    box.replaceChildren();

    box.hidden = !session;

    el('cpuSetup').hidden = !!session;

    if (!session) return;

    const title =
      document.createElement('h3');

    title.textContent =
      '⚔️ Tienes una partida pendiente';

    const info =
      document.createElement('p');

    info.textContent =
      'Dificultad: ' +
      (
        session.difficulty_name ||
        session.difficulty
      );

    const turn =
      document.createElement('p');

    turn.textContent =
      Number(session.current_turn) === 1
        ? 'Turno del jugador'
        : 'Turno de la CPU';

    const reward =
      document.createElement('p');

    reward.textContent =
      '🏆 Premio por victoria: ' +
      session.victory_reward +
      ' monedas';

    const note =
      document.createElement('small');

    note.textContent =
      'Partida recuperada correctamente. ' +
      'El tablero de combate se habilitará ' +
      'en la siguiente etapa.';

    box.append(
      title,
      info,
      turn,
      reward,
      note
    );
  }

  async function open() {

    if (loading || busy) return;

    loading = true;
    ready = false;

    uid = null;
    profile = null;
    session = null;

    coins = 0;
    healUntil = null;

    difficulty = null;
    selected = [null, null, null];

    difficulties = [];
    collection = [];

    el('cpuStart').disabled = true;

    el('cpuSetup').hidden = true;
    el('cpuResume').hidden = true;
    el('cpuBattle').hidden = true;
    el('cpuResult').hidden = true;

    el('cpuWallet').textContent =
      '🪙 Monedas online: —';

    el('cpuAccount').replaceChildren();

    status('Conectando con Supabase…');

    try {

      const connected = await connect();

      drawAccount(connected);

      if (!connected) {

        status(
          'Crea o recupera tu perfil online primero.'
        );

        return;
      }

      await loadData();

      ready = true;

      drawWallet();

      drawResume();

      if (session) {

        status(
          '🟢 Partida CPU recuperada.'
        );

      } else if (collection.length < 3) {

        status(
          'Necesitas al menos tres Pokémon diferentes.'
        );

      } else {

        status(
          '🟢 Selecciona dificultad y equipo.'
        );
      }

    } catch (e) {

      ready = false;

      status(
        e.message ||
        'Error al cargar el modo CPU'
      );

      console.error('Arena CPU:', e);

    } finally {

      loading = false;

      if (ready) {

        drawDifficulties();

        drawTeam();
      }

      validateTeam();
    }
  }

  
async function startCpuMatch() {

  if (!validateTeam()) return;

  busy = true;

  el('cpuStart').disabled = true;

  drawDifficulties();
  drawTeam();

  status('⚔️ Creando partida contra CPU…');

  try {

    const result = check(
      await db.rpc(
        'start_pokemon_cpu_match',
        {
          p_difficulty: difficulty,
          p_pokemon_1: selected[0],
          p_pokemon_2: selected[1],
          p_pokemon_3: selected[2]
        }
      )
    );

    if (!result?.success) {

      throw Error(
        result?.message ||
        result?.error ||
        'No se pudo iniciar la partida CPU'
      );
    }

    session = {

      match_id: result.match_id,

      game_type: 'pokemon',

      difficulty: result.difficulty,

      difficulty_name:
        difficulties.find(
          d => d.id === result.difficulty
        )?.name || result.difficulty,

      status: 'playing',

      current_turn: result.current_turn,

      version: result.version,

      game_state: result.game_state,

      victory_reward: result.victory_reward,

      reward_granted: 0

    };

    drawResume();

    status(
      result.recovered
        ? '🟢 Partida existente recuperada.'
        : '🟢 Partida CPU creada correctamente.'
    );

    console.log(
      'Partida CPU:',
      session
    );

  } catch (e) {

    status(
      e.message ||
      'Error al iniciar el combate CPU'
    );

    console.error(
      'Error al iniciar CPU:',
      e
    );

  } finally {

    busy = false;

    drawDifficulties();

    drawTeam();

    validateTeam();
  }
}

el('cpuStart').onclick = startCpuMatch;


  document.addEventListener(
    'arena:section-change',
    event => {

      if (
        event.detail?.section === 'cpu'
      ) {
        open();
      }
    }
  );

  if (visible()) open();

})();
