
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
let cpuTurnTimer = null;
let cpuSyncRequired = false;
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

function cpuNode(tag, text, className) {

  const node = document.createElement(tag);

  if (text !== undefined && text !== null) {
    node.textContent = text;
  }

  if (className) {
    node.className = className;
  }

  return node;
}

function cpuPokemonImage(pokemon) {

  const fallback = () => {

    const emoji = cpuNode(
      'div',
      pokemon.emoji || '✨'
    );

    emoji.style.fontSize = '40px';

    return emoji;
  };

  if (!pokemon.image_url) {
    return fallback();
  }

  const img = document.createElement('img');

  img.src = pokemon.image_url;
  img.alt = pokemon.name;
  img.loading = 'lazy';

  img.onerror = () => {
    img.replaceWith(fallback());
  };

  return img;
}

function cpuElementName(element) {

  const labels = {
    normal: '⭐ Normal',
    fire: '🔥 Fuego',
    water: '💧 Agua',
    grass: '🌱 Planta',
    electric: '⚡ Eléctrico',
    ice: '❄️ Hielo',
    fighting: '🥊 Lucha',
    poison: '☠️ Veneno',
    ground: '🟤 Tierra',
    flying: '🪽 Volador',
    psychic: '🔮 Psíquico',
    bug: '🐛 Bicho',
    rock: '🪨 Roca',
    ghost: '👻 Fantasma',
    dragon: '🐉 Dragón',
    dark: '🌑 Siniestro',
    steel: '⚙️ Acero',
    fairy: '✨ Hada'
  };

  return labels[element] || element || '—';
}

function cpuBar(value, maximum, color) {

  const bar = cpuNode(
    'div',
    null,
    'cpu-bar'
  );

  const fill = cpuNode(
    'div',
    null,
    'cpu-bar-fill'
  );

  const percent = Math.max(
    0,
    Math.min(
      100,
      Number(value) /
      Math.max(1, Number(maximum)) * 100
    )
  );

  fill.style.width = percent + '%';
  fill.style.background = color;

  bar.append(fill);

  return bar;
}

function cpuDrawReserves(player) {

  const box = cpuNode(
    'div',
    null,
    'cpu-reserves'
  );

  (player.team || []).forEach((p, i) => {

    const card = cpuNode(
      'div',
      null,
      'cpu-reserve'
    );

    card.classList.toggle(
      'active',
      i === Number(player.active)
    );

    card.classList.toggle(
      'defeated',
      Number(p.hp) <= 0
    );

    card.append(
      cpuPokemonImage(p),
      cpuNode('span', p.name),
      cpuNode(
        'span',
        p.hp + '/' + p.max_hp
      )
    );

    box.append(card);
  });

  return box;
}

function cpuDrawFighter(player, label) {

  const card = cpuNode(
    'div',
    null,
    'cpu-fighter'
  );

  const pokemon =
    player.team?.[Number(player.active)];

  card.append(
    cpuNode(
      'div',
      label,
      'cpu-fighter-label'
    ),
    cpuNode('h3', player.nickname || label)
  );

  if (!pokemon) {

    card.append(
      cpuNode('p', 'Sin Pokémon activo')
    );

    return card;
  }

  card.append(
    cpuPokemonImage(pokemon),
    cpuNode('h3', pokemon.name),
    cpuNode(
      'p',
      cpuElementName(pokemon.element)
    )
  );

  const ratio =
    Number(pokemon.hp) /
    Math.max(1, Number(pokemon.max_hp));

  const hpColor =
    ratio > 0.5 ? '#52df7c' :
    ratio > 0.25 ? '#facc15' :
    '#ef4444';

  card.append(
    cpuBar(
      pokemon.hp,
      pokemon.max_hp,
      hpColor
    ),
    cpuNode(
      'p',
      pokemon.hp + ' / ' +
      pokemon.max_hp + ' PV'
    ),
    cpuBar(
  player.energy ?? 0,
  100,
  Number(player.energy) >= 100
    ? '#facc15'
    : '#38bdf8'
),
cpuNode(
  'p',
  '⚡ Energía: ' +
  (player.energy ?? 0) +
  ' / 100'
)
  );

  const condition =
    pokemon.status === 'normal'
      ? '🟢 Sin alteraciones'
      : '⚠️ ' + pokemon.status +
        ' · ' +
        (pokemon.status_turns || 0) +
        ' turnos';

  card.append(
    cpuNode('p', condition),
    cpuNode(
      'p',
      '🛡️ Escudo: ' +
      (player.shield ? 'Activo' : 'No')
    ),
    cpuNode(
      'p',
      '💪 Potenciador: ' +
      (player.boost ? 'Activo' : 'No')
    ),
    cpuDrawReserves(player)
  );

  return card;
}

function cpuHealSeconds(player) {

  const dates = [
    healUntil,
    player?.heal_available_at
  ]
    .filter(Boolean)
    .map(value => new Date(value).getTime())
    .filter(Number.isFinite);

  if (!dates.length) return 0;

  return Math.max(
    0,
    Math.ceil(
      (Math.max(...dates) - Date.now()) / 1000
    )
  );
}

function cpuAvailableReserves(player) {

  return (player.team || [])
    .map((pokemon, index) => ({
      pokemon,
      index
    }))
    .filter(item =>
      item.index !== Number(player.active) &&
      Number(item.pokemon.hp) > 0
    );
}

function cpuActionAvailability(player, action) {

  if (!session || session.status !== 'playing') {

    return {
      allowed: false,
      reason: 'Combate finalizado'
    };
  }

  if (busy || loading) {

    return {
      allowed: false,
      reason: 'Procesando...'
    };
  }

  if (Number(session.current_turn) !== 1) {

    return {
      allowed: false,
      reason: 'Turno de la CPU'
    };
  }

  const pokemon =
    player.team?.[Number(player.active)];

  if (!pokemon || Number(pokemon.hp) <= 0) {

    return {
      allowed: false,
      reason: 'Pokémon no disponible'
    };
  }

  const cooldown = Number(
    pokemon.cooldowns?.[action] || 0
  );

  if (cooldown > 0) {

    return {
      allowed: false,
      reason: 'Recarga: ' + cooldown + ' turnos'
    };
  }

  if (
    action === 'ultimate' &&
    Number(player.energy || 0) < 100
  ) {

    return {
      allowed: false,
      reason: 'Requiere 100 de energía'
    };
  }

  if (action === 'heal') {

    if (
      Number(pokemon.hp) >=
      Number(pokemon.max_hp)
    ) {

      return {
        allowed: false,
        reason: 'Vida completa'
      };
    }

    const seconds = cpuHealSeconds(player);

    if (seconds > 0) {

      return {
        allowed: false,
        reason: 'Disponible en ' + seconds + ' s'
      };
    }
  }

  if (
    action === 'switch' &&
    cpuAvailableReserves(player).length === 0
  ) {

    return {
      allowed: false,
      reason: 'Sin reservas disponibles'
    };
  }

  return {
    allowed: true,
    reason: ''
  };
}

function cancelCpuTurn() {

  if (cpuTurnTimer !== null) {

    clearTimeout(cpuTurnTimer);

    cpuTurnTimer = null;
  }
}

function scheduleCpuTurn() {

  cancelCpuTurn();

  if (
    !visible() ||
    !ready ||
    busy ||
    loading ||
    cpuSyncRequired ||
    !session ||
    session.status !== 'playing' ||
    Number(session.current_turn) !== 2
  ) {

    return;
  }

  const matchId = session.match_id;
  const version = session.version;

  cpuTurnTimer = setTimeout(() => {

    cpuTurnTimer = null;

    if (
      !visible() ||
      busy ||
      loading ||
      cpuSyncRequired ||
      !session ||
      session.match_id !== matchId ||
      session.version !== version ||
      session.status !== 'playing' ||
      Number(session.current_turn) !== 2
    ) {

      return;
    }

    executeCpuAction('cpu_turn');

  }, 900);
}

async function executeCpuAction(
  action,
  target = null
) {

  if (
    !visible() ||
    !ready ||
    busy ||
    loading ||
    cpuSyncRequired ||
    !session ||
    session.status !== 'playing'
  ) {

    return;
  }

  const player =
    session.game_state?.players?.['1'];

  if (!player) return;

  const turn =
    Number(session.current_turn);

  if (action === 'cpu_turn') {

    if (turn !== 2) return;

  } else {

    if (turn !== 1) return;

    const availability =
      cpuActionAvailability(player, action);

    if (!availability.allowed) {

      status(availability.reason);

      return;
    }

    if (action === 'switch') {

      const validTarget =
        cpuAvailableReserves(player)
          .some(item => item.index === target);

      if (!validTarget) return;

    } else {

      target = null;
    }
  }

  cancelCpuTurn();

  busy = true;

  const matchId = session.match_id;
  const expectedVersion = session.version;

  let completed = false;

  drawBattle();

  status(
    action === 'cpu_turn'
      ? '🤖 La CPU está pensando...'
      : '⚔️ Ejecutando movimiento...'
  );

  try {

    const result = check(
      await db.rpc(
        'pokemon_cpu_action',
        {
          p_match_id: matchId,
          p_action: action,
          p_expected_version: expectedVersion,
          p_target: target
        }
      )
    );

    if (!result?.success) {

      throw new Error(
        result?.message ||
        result?.error ||
        'No se pudo ejecutar el movimiento.'
      );
    }

    session = {
      ...session,
      game_state: result.game_state,
      current_turn: result.current_turn,
      version: result.version,
      status: result.status,
      result: result.result,
      winner_side: result.winner_side,
      victory_reward: result.victory_reward,
      reward_granted: result.reward_granted
    };

    coins = Number(
      result.coins ?? coins
    );

    healUntil =
      result.heal_available_at || null;

    completed = true;

    drawWallet();

    if (session.status === 'finished') {

      status(
        session.result === 'win'
          ? '🏆 ¡Victoria! Recompensa: ' +
            session.reward_granted +
            ' monedas.'
          : 'El combate ha terminado. Derrota.'
      );

    } else {

      status(
        Number(session.current_turn) === 1
          ? '🟢 Es tu turno.'
          : '🤖 Turno de la CPU.'
      );
    }

  } catch (error) {

    cpuSyncRequired = true;

    console.error(
      'Error de combate CPU:',
      error
    );

    status(
      '⚠️ ' +
      (error.message || 'Error de combate') +
      '. Recuperando estado del servidor...'
    );

    try {

      const recovered = check(
        await db.rpc('recover_cpu_sessions')
      );

      if (!recovered?.success) {

        throw new Error(
          'No se pudo recuperar la partida.'
        );
      }

      const current =
        (recovered.sessions || [])
          .find(item =>
            item.match_id === matchId &&
            item.game_type === 'pokemon' &&
            item.status === 'playing'
          );

      coins = Number(
        recovered.coins ?? coins
      );

      healUntil =
        recovered.heal_available_at || null;

      drawWallet();

      if (current) {

        session = current;

        cpuSyncRequired = false;

        status(
          '🟢 Estado del combate recuperado.'
        );

      } else {

        status(
          '⚠️ La partida ya no está activa. ' +
          'Sal al menú y vuelve a entrar.'
        );
      }

    } catch (recoveryError) {

      console.error(
        'Error de recuperación CPU:',
        recoveryError
      );

      status(
        '⚠️ No se pudo sincronizar la partida. ' +
        'Sal al menú y vuelve a entrar.'
      );
    }

  } finally {

    busy = false;

    if (visible() && session) {

      drawBattle();

      if (completed) {

        scheduleCpuTurn();
      }
    }
  }
}

function cpuDrawActions(player) {

  const box = cpuNode(
    'div',
    null,
    'cpu-battle-actions'
  );

  const pokemon =
    player.team?.[Number(player.active)];

  const cooldowns =
    pokemon?.cooldowns || {};

  const actions = [
    ['normal', '⚔️ Ataque normal', '#2563eb'],
    ['strong', '💥 Ataque fuerte', '#c2410c'],
    ['elemental', '🔥 Ataque elemental', '#7e22ce'],
    ['ultimate', '⚡ Ataque definitivo', '#854d0e'],
    ['shield', '🛡️ Escudo', '#1e40af'],
    ['boost', '💪 Potenciador', '#9333ea'],
    ['heal', '💚 Curación', '#166534'],
    ['switch', '🔄 Cambiar Pokémon', '#475569']
  ];

  for (const [action, label, color] of actions) {

    const button = cpuNode(
      'button',
      label
    );

    button.type = 'button';

    button.dataset.action = action;

    button.style.background = color;

    // Se habilitarán en la siguiente etapa.
    button.disabled = true;

    let detail = '';

    if (action === 'normal') {

      detail =
        'Daño base: ' +
        (pokemon?.normal_damage ?? 0);

    } else if (action === 'strong') {

      detail =
        'Daño base: ' +
        (pokemon?.super_damage ?? 0);

    }

    const cooldown =
      Number(cooldowns[action] || 0);

    if (cooldown > 0) {

      detail +=
        (detail ? ' · ' : '') +
        'Recarga: ' + cooldown;

    }

    if (detail) {

      button.append(
        cpuNode('small', detail)
      );
    }

    box.append(button);
  }

  return box;
}

function cpuDescribeEvent(event) {

  if (!event) {

    return '¡Comienza la batalla contra CPU!';
  }

  const actor =
    Number(event.player) === 1
      ? '👤 Tú'
      : '🤖 CPU';

  const pokemon =
    event.pokemon || 'Pokémon';

  const target =
    event.target || 'Rival';

  const damage =
    Number(event.damage || 0);

  const healing =
    Number(event.healing || 0);

  const labels = {
    normal: 'Ataque normal',
    strong: 'Ataque fuerte',
    elemental: 'Ataque elemental',
    ultimate: 'Ataque definitivo'
  };

  let message = '';

  switch (event.action) {

    case 'normal':
    case 'strong':
    case 'elemental':
    case 'ultimate':

      message =
        actor + ': ' +
        pokemon + ' utilizó ' +
        labels[event.action] + '.';

      if (event.missed) {

        message += ' ¡El ataque falló!';

      } else {

        message +=
          ' ' + target +
          ' recibió ' + damage +
          ' puntos de daño.';

        if (event.critical) {
          message += ' ¡Golpe crítico!';
        }

        if (Number(event.multiplier) > 1) {
          message += ' ¡Muy efectivo!';
        }

        if (Number(event.multiplier) < 1) {
          message += ' Poco efectivo.';
        }
      }

      break;

    case 'shield':

      message =
        actor + ': ' +
        pokemon + ' activó su escudo.';

      break;

    case 'boost':

      message =
        actor + ': ' +
        pokemon + ' activó su potenciador.';

      break;

    case 'heal':

      message =
        actor + ': ' +
        pokemon + ' recuperó ' +
        healing + ' PV.';

      break;

    case 'switch':

      message =
        actor + ': retiró a ' +
        pokemon + ' y cambió de Pokémon.';

      break;

    case 'status_skip':

      message =
        actor + ': ' +
        pokemon +
        ' perdió su turno por un efecto de estado.';

      break;

    default:

      message =
        actor + ': movimiento registrado.';
  }

  return message;
}

function drawBattle() {

  const box = el('cpuBattle');

  box.replaceChildren();

  if (!session || !session.game_state) {

    box.hidden = true;

    return;
  }

  const game = session.game_state;

  const player = game.players?.['1'];

  const opponent = game.players?.['2'];

  if (!player || !opponent) {

    box.hidden = true;

    status('Estado de combate incompleto.');

    return;
  }

  box.hidden = false;

  el('cpuSetup').hidden = true;
  el('cpuResume').hidden = true;
  el('cpuResult').hidden = true;

  const header = cpuNode(
    'div',
    null,
    'cpu-battle-header'
  );

  header.append(
    cpuNode(
      'strong',
      '🎯 ' +
      (
        session.difficulty_name ||
        session.difficulty
      )
    ),
    cpuNode(
      'small',
      '🏆 Premio: ' +
      session.victory_reward +
      ' monedas'
    ),
    cpuNode(
      'small',
      'Ronda: ' + (game.round ?? 1)
    )
  );

  const playerTurn =
    Number(session.current_turn) === 1;

  const turn = cpuNode(
    'div',
    playerTurn
      ? '⚔️ ¡Es tu turno!'
      : '🤖 Turno de la CPU',
    'cpu-battle-turn'
  );

  turn.style.color =
    playerTurn ? '#86efac' : '#facc15';

  const fighters = cpuNode(
    'div',
    null,
    'cpu-battle-grid'
  );

  fighters.append(
    cpuDrawFighter(player, 'TU EQUIPO'),
    cpuDrawFighter(opponent, 'RIVAL CPU')
  );

  const log = cpuNode(
    'div',
    null,
    'cpu-battle-log'
  );

  log.append(
  cpuNode(
    'strong',
    '📜 Registro de combate'
  )
);

const history = Array.isArray(game.history)
  ? game.history.slice(-6).reverse()
  : [];

if (history.length) {

  history.forEach(event => {

    log.append(
      cpuNode(
        'p',
        cpuDescribeEvent(event)
      )
    );
  });

} else {

  log.append(
    cpuNode(
      'p',
      cpuDescribeEvent(game.last_action)
    )
  );
}

  const abandon = cpuNode(
    'button',
    '🏳️ Abandonar combate',
    'cpu-abandon'
  );

  abandon.type = 'button';

  // Se conectará a su RPC posteriormente.
  abandon.disabled = true;

  box.append(
    header,
    turn,
    fighters,
    cpuDrawActions(player),
    log,
    abandon
  );
}
function drawResume() {

  el('cpuResume').replaceChildren();

  el('cpuResume').hidden = true;

  el('cpuSetup').hidden = !!session;

  if (session) {

    drawBattle();

  } else {

    el('cpuBattle').hidden = true;

    el('cpuResult').hidden = true;

  }
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
