
(() => {
  'use strict';

  const el = id => document.getElementById(id);

  let db, uid, profile, session;
  let difficulties = [];
  let collection = [];
  let difficulty = null;
  let selected = [null,null,null];
  let coins = 0;
  let healUntil = null;
  let loading = false;
  let busy = false;
  let ready = false;
  let syncRequired = false;
  let cpuTimer = null;
  let animatedEvent = '';

  const visible = () =>
    !el('cpu').classList.contains('hidden');

  const check = r => {
    if (r.error) throw r.error;
    return r.data;
  };

  const status = text => {
    el('cpuStatus').textContent = text;
  };

  function node(tag,text,cls,parent) {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    if (parent) parent.append(n);
    return n;
  }

  const css = document.createElement('style');

  css.textContent = `
    #cpu [hidden] {
      display:none!important;
    }

    #cpuDifficulties,
    .cpu-battle-actions {
      display:grid;
      grid-template-columns:
        repeat(2,minmax(0,1fr));
      gap:8px;
      margin:12px 0;
    }

    .cpu-difficulty {
      color:white;
      border:2px solid transparent;
      border-radius:14px;
      padding:14px 6px;
      min-width:0;
    }

    .cpu-difficulty.selected {
      border-color:#facc15;
      box-shadow:0 0 12px #facc1566;
    }

    .cpu-difficulty small,
    .cpu-battle-actions small {
      display:block;
      margin-top:4px;
      font-size:11px;
      color:#e2e8f0;
    }

    .cpu-team-grid {
      display:grid;
      grid-template-columns:
        repeat(3,minmax(0,1fr));
      gap:6px;
      margin:12px 0;
    }

    .cpu-slot {
      background:#34296a;
      border:1px solid #8c72d7;
      border-radius:12px;
      padding:6px;
      text-align:center;
      min-width:0;
      overflow-wrap:anywhere;
    }

    .cpu-slot select {
      width:100%;
      min-width:0;
      font-size:12px;
      padding:8px 2px;
    }

    .cpu-slot img {
      width:100%;
      max-width:120px;
      aspect-ratio:1;
      object-fit:contain;
    }

    .cpu-slot strong,
    .cpu-slot small {
      display:block;
      margin:5px 0;
      font-size:12px;
    }

    .cpu-empty {
      font-size:42px;
      min-height:65px;
      display:grid;
      place-items:center;
    }

    #cpuWallet {
      background:#39286c;
      color:#facc15;
      border-radius:10px;
      padding:9px;
      font-weight:bold;
    }

    #cpuStart {
      width:100%;
      margin:10px 0;
    }

    #cpuStatus {
      color:#ffde86;
      font-size:13px;
      overflow-wrap:anywhere;
    }

    #cpuBattle {
      width:100%;
      box-sizing:border-box;
      margin-top:8px;
    }

    .cpu-battle-header {
      display:flex;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:5px;
      font-size:12px;
    }

    .cpu-battle-turn {
      padding:10px;
      margin:8px 0;
      border-radius:10px;
      background:#29354b;
      text-align:center;
      font-weight:800;
    }

    .cpu-battle-turn.mine {
      background:#174b36;
      color:#86efac;
    }

    .cpu-battle-grid {
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .cpu-fighter {
      display:grid;
      grid-template-columns:
        minmax(0,1fr) 42%;
      gap:8px;
      align-items:center;
      padding:10px;
      min-width:0;
      border-radius:16px;
      background:linear-gradient(
        135deg,#25334b,#182235
      );
      border:1px solid #43516b;
      overflow:hidden;
    }

    .cpu-fighter.own {
      grid-template-columns:
        42% minmax(0,1fr);
      background:linear-gradient(
        135deg,#35265c,#202b48
      );
      border-color:#6956a3;
    }

    .cpu-fighter-info {
      min-width:0;
      overflow-wrap:anywhere;
    }

    .cpu-fighter-info h3 {
      font-size:18px;
      margin:4px 0;
    }

    .cpu-fighter-info p {
      font-size:12px;
      margin:3px 0;
    }

    .cpu-fighter-label {
      font-size:11px;
      color:#cbd5e1;
    }

    .cpu-art {
      display:flex;
      align-items:center;
      justify-content:center;
      min-width:0;
    }

    .cpu-art img {
      width:100%;
      max-width:220px;
      height:145px;
      object-fit:contain;
      filter:drop-shadow(0 8px 8px #0006);
    }

    .cpu-bar {
      width:100%;
      height:10px;
      background:#0b1220;
      border-radius:20px;
      overflow:hidden;
      margin-top:5px;
    }

    .cpu-bar.energy {
      height:6px;
    }

    .cpu-bar-fill {
      height:100%;
      border-radius:20px;
      transition:width .3s;
    }

    .cpu-reserves {
      display:flex;
      gap:6px;
      margin-top:8px;
    }

    .cpu-ball {
      width:14px;
      height:14px;
      border-radius:50%;
      background:linear-gradient(
        #ef4444 44%,
        #111 44%,
        #111 56%,
        white 56%
      );
      border:1px solid #111;
    }

    .cpu-ball.active {
      outline:2px solid #facc15;
      outline-offset:1px;
    }

    .cpu-ball.defeated {
      opacity:.3;
      filter:grayscale(1);
    }

    .cpu-event {
      background:#111a30;
      color:#facc15;
      padding:8px;
      border-radius:10px;
      text-align:center;
      font-size:12px;
      min-height:34px;
      overflow-wrap:anywhere;
    }

    .cpu-battle-actions button {
      width:100%;
      min-width:0;
      min-height:50px;
      color:white;
      font-size:13px;
      font-weight:800;
      padding:8px 4px;
      border-radius:10px;
      border:1px solid #ffffff22;
      box-sizing:border-box;
      overflow-wrap:anywhere;
      touch-action:manipulation;
    }

    .cpu-battle-actions button:disabled {
      opacity:.4;
      filter:saturate(.5);
    }

    .cpu-battle-log {
      background:#17132e;
      border-radius:12px;
      padding:10px;
      font-size:12px;
      color:#cbd5e1;
      margin-top:8px;
    }

    .cpu-battle-log p {
      margin:6px 0;
    }

    .cpu-abandon {
      width:100%;
      background:#9f294b;
      color:white;
      margin-top:10px;
    }

    .cpu-result-card {
      background:#252047;
      border:1px solid #8c72d7;
      border-radius:16px;
      padding:16px;
      text-align:center;
      margin:12px 0;
    }

    .cpu-result-card button {
      width:100%;
      margin-top:10px;
    }

    .cpu-hit {
      animation:cpu-hit .5s ease;
    }

    .cpu-attack {
      animation:cpu-attack .5s ease;
    }

    .cpu-healing {
      animation:cpu-healing .7s ease;
    }

    .cpu-defense {
      animation:cpu-defense .7s ease;
    }

    @keyframes cpu-hit {
      20%,60% {
        transform:translateX(-5px);
        filter:brightness(1.8);
      }
      40%,80% {
        transform:translateX(5px);
      }
    }

    @keyframes cpu-attack {
      50% {
        transform:scale(1.06);
        filter:brightness(1.3);
      }
    }

    @keyframes cpu-healing {
      50% {
        box-shadow:inset 0 0 35px #22c55e;
      }
    }

    @keyframes cpu-defense {
      50% {
        box-shadow:inset 0 0 35px #38bdf8;
      }
    }

    @media(max-width:600px) {
      main:has(#cpu:not(.hidden)) {
        width:100%!important;
        max-width:100%!important;
        padding-left:4px!important;
        padding-right:4px!important;
        box-sizing:border-box;
      }

      #cpu {
        width:100%!important;
        max-width:100%!important;
        margin-left:0!important;
        margin-right:0!important;
        padding:6px!important;
        box-sizing:border-box;
      }

      .cpu-fighter {
        padding:8px;
      }

      .cpu-art img {
        height:125px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      .cpu-hit,.cpu-attack,
      .cpu-healing,.cpu-defense {
        animation:none!important;
      }
    }
  `;

  document.head.append(css);

  const levels = {
    easy:'Fácil',
    normal:'Normal',
    hard:'Difícil',
    expert:'Experto'
  };

  const effects = {
    normal:'Sin alteraciones',
    burn:'🔥 Quemadura',
    freeze:'❄️ Congelado',
    paralysis:'⚡ Parálisis',
    poison:'☠️ Veneno',
    sleep:'💤 Dormido',
    confusion:'💫 Confusión'
  };

  const elements = {
    normal:'Normal',
    fire:'🔥 Fuego',
    water:'💧 Agua',
    grass:'🌱 Planta',
    electric:'⚡ Eléctrico',
    ice:'❄️ Hielo',
    fighting:'🥊 Lucha',
    poison:'☠️ Veneno',
    ground:'Tierra',
    flying:'Volador',
    psychic:'🔮 Psíquico',
    bug:'Bicho',
    rock:'Roca',
    ghost:'👻 Fantasma',
    dragon:'🐉 Dragón',
    dark:'Siniestro',
    steel:'Acero',
    fairy:'Hada'
  };

  const actions = [
    ['normal','⚔️ Ataque normal','#334155'],
    ['strong','💥 Ataque fuerte','#854d0e'],
    ['elemental','⚡ Elemental','#1e40af'],
    ['ultimate','🔥 Definitivo','#991b1b'],
    ['shield','🛡️ Escudo','#155e75'],
    ['boost','🚀 Potenciador','#6b21a8'],
    ['heal','💚 Curación','#166534'],
    ['switch','🔄 Cambiar Pokémon','#433878']
  ];

  function image(p) {
    const fallback = () => {
      const n = node('div',p?.emoji || '✨');
      n.style.fontSize = '42px';
      return n;
    };

    if (!p?.image_url) return fallback();

    const img = node('img');
    img.src = p.image_url;
    img.alt = p.name;
    img.onerror = () => img.replaceWith(fallback());
    return img;
  }

  function drawWallet() {
    el('cpuWallet').textContent =
      '🪙 Monedas online: ' + coins;
  }

  async function connect() {
    if (!window.supabase) {
      throw Error('Supabase no disponible');
    }

    db ||= window.supabase.createClient(
      'https://bwupxxeeaewdstjzmwob.supabase.co',
      'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
    );

    const auth = check(await db.auth.getSession());

    if (!auth.session) return false;

    const {user} = check(await db.auth.getUser());

    if (!user) return false;

    uid = user.id;

    profile = check(
      await db.from('players')
        .select('id,nickname')
        .eq('id',uid)
        .maybeSingle()
    );

    if (!profile) return false;

    check(await db.rpc('initialize_player_inventory'));

    return true;
  }

  function drawAccount(connected) {
    const box = el('cpuAccount');

    box.replaceChildren();

    if (connected && profile) {
      node('p','👤 '+profile.nickname,null,box);
      return;
    }

    node(
      'p',
      'Necesitas un perfil online para jugar.',
      null,
      box
    );

    const b = node(
      'button',
      '🌐 Crear o recuperar perfil',
      null,
      box
    );

    b.type = 'button';
    b.onclick = () => window.show('online');
  }

  async function recoverData() {
    const r = check(
      await db.rpc('recover_cpu_sessions')
    );

    if (!r?.success) {
      throw Error(
        r?.message || r?.error ||
        'No se pudo recuperar la partida'
      );
    }

    coins = Number(r.coins ?? coins);
    healUntil = r.heal_available_at || null;

    drawWallet();

    return r.sessions || [];
  }

  async function loadData() {
    const results = await Promise.all([
      db.from('cpu_difficulties')
        .select('id,name,intelligence_level,pokemon_reward')
        .eq('active',true)
        .order('intelligence_level'),

      db.from('player_collection')
        .select('pokemon_id,quantity')
        .eq('player_id',uid)
        .gt('quantity',0),

      db.from('pokemon_catalog')
        .select('id,name,emoji,image_url,max_hp,element,rarity'),

      recoverData()
    ]);

    difficulties = check(results[0]) || [];

    const owned = check(results[1]) || [];
    const catalog = check(results[2]) || [];
    const recovered = results[3];

    const map = new Map(
      catalog.map(p => [p.id,p])
    );

    collection = owned
      .filter(p => map.has(p.pokemon_id))
      .map(p => ({
        ...map.get(p.pokemon_id),
        quantity:Number(p.quantity)
      }))
      .sort((a,b) => a.name.localeCompare(b.name));

    session = recovered.find(s =>
      s.game_type === 'pokemon' &&
      s.status === 'playing'
    ) || null;

    if (!difficulties.some(d => d.id === difficulty)) {
      difficulty = null;
    }

    selected = selected.map(id =>
      collection.some(p => p.id === id)
        ? id : null
    );
  }

  function drawDifficulties() {
    const box = el('cpuDifficulties');

    box.replaceChildren();

    const colors = {
      easy:'#166534',
      normal:'#1e40af',
      hard:'#9a3412',
      expert:'#991b1b'
    };

    const icons = {
      easy:'🟢',
      normal:'🔵',
      hard:'🟠',
      expert:'🔴'
    };

    for (const d of difficulties) {
      const b = node(
        'button',
        null,
        'cpu-difficulty',
        box
      );

      b.type = 'button';
      b.style.background = colors[d.id] || '#4e3b96';
      b.disabled = busy || loading;

      b.classList.toggle(
        'selected',
        difficulty === d.id
      );

      b.setAttribute(
        'aria-pressed',
        String(difficulty === d.id)
      );

      node(
        'strong',
        (icons[d.id] || '🎯')+' '+d.name,
        null,b
      );

      node(
        'small',
        '🏆 '+d.pokemon_reward+' monedas',
        null,b
      );

      node(
        'small',
        'Nivel '+d.intelligence_level,
        null,b
      );

      b.onclick = () => {
        if (busy || loading) return;
        difficulty = d.id;
        drawDifficulties();
        validateTeam();
      };
    }
  }

  function drawTeam() {
    const box = el('cpuTeamSelection');

    box.replaceChildren();

    const grid = node(
      'div',null,'cpu-team-grid',box
    );

    for (let i=0;i<3;i++) {
      const slot = node(
        'div',null,'cpu-slot',grid
      );

      node('strong','Pokémon '+(i+1),null,slot);

      const p = collection.find(
        x => x.id === selected[i]
      );

      if (p) {
        slot.append(image(p));
      } else {
        node('div','❔','cpu-empty',slot);
      }

      node(
        'small',
        p ? p.max_hp+' PV' : 'Sin seleccionar',
        null,slot
      );

      const select = node('select',null,null,slot);

      select.setAttribute(
        'aria-label',
        'Pokémon '+(i+1)
      );

      select.add(new Option('Seleccionar',''));

      for (const pokemon of collection) {
        const option = new Option(
          pokemon.name,pokemon.id
        );

        option.disabled = selected.some(
          (id,index) =>
            index !== i && id === pokemon.id
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
    }

    node(
      'small',
      'Pokémon disponibles: '+collection.length,
      null,box
    );
  }

  function validateTeam() {
    const valid =
      ready &&
      !busy &&
      !loading &&
      !session &&
      difficulties.some(d => d.id === difficulty) &&
      selected.every(id =>
        id && collection.some(p => p.id === id)
      ) &&
      new Set(selected).size === 3;

    el('cpuStart').disabled = !valid;

    return valid;
  }

  function bar(value,max,color,energy=false) {
    const b = node(
      'div',
      null,
      'cpu-bar'+(energy?' energy':'')
    );

    const fill = node(
      'div',null,'cpu-bar-fill',b
    );

    fill.style.width = Math.max(
      0,
      Math.min(100,100*value/Math.max(1,max))
    )+'%';

    fill.style.background = color;

    return b;
  }

  function fighter(player,own) {
    const card = node(
      'div',
      null,
      'cpu-fighter'+(own?' own':'')
    );

    const p = player.team?.[Number(player.active)];

    if (!p) {
      node('p','Sin Pokémon activo',null,card);
      return card;
    }

    const info = node(
      'div',null,'cpu-fighter-info'
    );

    node(
      'div',
      (own?'Tú · ':'Rival · ')+player.nickname,
      'cpu-fighter-label',
      info
    );

    node('h3',p.name,null,info);

    node(
      'p',
      elements[p.element] || p.element,
      null,info
    );

    const ratio = p.hp/Math.max(1,p.max_hp);

    const color =
      ratio>.5 ? '#4ade80' :
      ratio>.2 ? '#facc15' : '#ef4444';

    info.append(bar(p.hp,p.max_hp,color));

    node(
      'p',
      p.hp+' / '+p.max_hp+' PV',
      null,info
    );

    info.append(
      bar(
        player.energy || 0,
        100,
        player.energy>=100?'#facc15':'#38bdf8',
        true
      )
    );

    node(
      'p',
      '⚡ Energía '+(player.energy||0)+'/100',
      null,info
    );

    node(
      'p',
      (effects[p.status]||p.status||'Normal')+
      (p.status_turns
        ?' · '+p.status_turns+' turnos':''),
      null,info
    );

    if (player.shield || player.boost) {
      node(
        'p',
        (player.shield?'🛡️ Escudo ':'')+
        (player.boost?'🚀 Potenciador':''),
        null,info
      );
    }

    const reserves = node(
      'div',null,'cpu-reserves',info
    );

    player.team.forEach((pokemon,i) => {
      const ball = node(
        'span',null,'cpu-ball',reserves
      );

      ball.classList.toggle(
        'active',i===Number(player.active)
      );

      ball.classList.toggle(
        'defeated',pokemon.hp<=0
      );

      ball.title =
        pokemon.name+' · '+pokemon.hp+
        '/'+pokemon.max_hp+' PV';
    });

    const art = node('div',null,'cpu-art');

    art.append(image(p));

    if (own) {
      card.append(art,info);
    } else {
      card.append(info,art);
    }

    return card;
  }

  function healSeconds(player) {
    const time = Math.max(
      Date.parse(healUntil)||0,
      Date.parse(player?.heal_available_at)||0
    );

    return Math.max(
      0,Math.ceil((time-Date.now())/1000)
    );
  }

  function reserves(player) {
    return (player.team||[])
      .map((pokemon,index) => ({pokemon,index}))
      .filter(x =>
        x.index!==Number(player.active) &&
        x.pokemon.hp>0
      );
  }

  function availability(player,action) {
    if (!session || session.status!=='playing') {
      return 'Combate finalizado';
    }

    if (syncRequired) return 'Sincronización requerida';

    if (busy || loading) return 'Procesando…';

    if (Number(session.current_turn)!==1) {
      return 'Turno de la CPU';
    }

    const p = player.team?.[Number(player.active)];

    if (!p || p.hp<=0) return 'No disponible';

    const cd = Number(p.cooldowns?.[action]||0);

    if (cd>0) return 'Recarga: '+cd+' turnos';

    if (action==='ultimate' && player.energy<100) {
      return 'Requiere 100 de energía';
    }

    if (action==='heal') {
      if (p.hp>=p.max_hp) return 'Vida completa';

      const sec = healSeconds(player);

      if (sec>0) return 'Disponible en '+sec+' s';
    }

    if (action==='switch' && !reserves(player).length) {
      return 'Sin reservas disponibles';
    }

    return '';
  }

  function drawSwitch(player,box) {
    if (availability(player,'switch')) return;

    box.replaceChildren();

    const title = node(
      'strong',
      'Selecciona tu próximo Pokémon',
      null,box
    );

    title.style.gridColumn = '1/-1';

    for (const {pokemon,index} of reserves(player)) {
      const b = node('button',null,null,box);

      b.type = 'button';
      b.style.background = '#34296a';

      const img = image(pokemon);
      img.style.width = '85px';
      img.style.maxWidth = '100%';

      b.append(img);

      node('div',pokemon.name,null,b);

      node(
        'small',
        pokemon.hp+'/'+pokemon.max_hp+' PV',
        null,b
      );

      b.onclick = () => execute('switch',index);
    }

    const cancel = node(
      'button','Cancelar',null,box
    );

    cancel.type = 'button';
    cancel.style.gridColumn = '1/-1';
    cancel.onclick = drawBattle;
  }

  function drawActions(player) {
    const box = node(
      'div',null,'cpu-battle-actions'
    );

    const p = player.team[player.active];

    const details = {
      normal:'Daño base: '+p.normal_damage,
      strong:'Ataque de mayor potencia',
      elemental:'Ataque de elemento',
      ultimate:'Consume 100 de energía',
      shield:'Activa protección',
      boost:'Potencia el ataque',
      heal:'Recupera hasta 25% de PV',
      switch:reserves(player).length+' reservas'
    };

    for (const [action,label,color] of actions) {
      const b = node('button',label,null,box);

      b.type = 'button';
      b.dataset.action = action;
      b.style.background = color;

      const reason = availability(player,action);

      b.disabled = !!reason;

      node(
        'small',
        reason || details[action],
        null,b
      );

      b.onclick = () => {
        if (action==='switch') {
          drawSwitch(player,box);
        } else {
          execute(action);
        }
      };
    }

    return box;
  }

  function tickHeal() {
    if (!visible() || !session) return;

    const b = el('cpuBattle').querySelector(
      '[data-action="heal"]'
    );

    const player = session.game_state?.players?.['1'];

    if (!b || !player) return;

    const reason = availability(player,'heal');

    b.disabled = !!reason;

    const small = b.querySelector('small');

    if (small) {
      small.textContent =
        reason || 'Recupera hasta 25% de PV';
    }
  }

  function describe(ev) {
    if (!ev) return '¡Comienza el combate!';

    const actor = Number(ev.player)===1
      ? 'Tú' : 'CPU';

    const name = ev.pokemon || 'Pokémon';

    const label = actions.find(
      a => a[0]===ev.action
    )?.[1] || ev.action;

    let text = actor+': '+name+' · '+label;

    if (ev.action==='status_skip') {
      text = actor+': '+name+' perdió su turno';
    }

    if (ev.missed) text += ' · Falló';

    if (ev.damage) text += ' · −'+ev.damage+' PV';

    if (ev.healing) text += ' · +'+ev.healing+' PV';

    if (ev.critical) text += ' · ¡Crítico!';

    if (!ev.missed && ev.multiplier>1) {
      text += ' · ¡Muy efectivo!';
    }

    if (!ev.missed && ev.multiplier===0) {
      text += ' · Sin efecto';
    } else if (
      !ev.missed &&
      ev.multiplier>0 &&
      ev.multiplier<1
    ) {
      text += ' · Poco efectivo';
    }

    if (ev.status_applied) {
      text += ' · '+(
        effects[ev.status_applied] ||
        ev.status_applied
      );
    }

    return text;
  }

  function drawBattle() {
    const box = el('cpuBattle');

    box.replaceChildren();

    if (!session?.game_state) {
      box.hidden = true;
      return;
    }

    const game = session.game_state;
    const player = game.players?.['1'];
    const opponent = game.players?.['2'];

    if (!player || !opponent) {
      box.hidden = true;
      status('Estado de combate incompleto');
      return;
    }

    box.hidden = false;

    el('cpuSetup').hidden = true;
    el('cpuResume').hidden = true;
    el('cpuResult').hidden = true;

    const done = session.status!=='playing';

    const mine = Number(session.current_turn)===1;

    const header = node(
      'div',null,'cpu-battle-header',box
    );

    node(
      'strong',
      '🎯 '+(
        session.difficulty_name ||
        levels[session.difficulty] ||
        session.difficulty
      ),
      null,header
    );

    node(
      'small',
      '🏆 '+session.victory_reward+' monedas',
      null,header
    );

    node(
      'small',
      'Ronda '+(game.round||1),
      null,header
    );

    node(
      'div',
      done
        ?'Combate terminado'
        :mine
          ?'⚔️ ¡Es tu turno!'
          :'🤖 Turno de la CPU',
      'cpu-battle-turn'+(mine&&!done?' mine':''),
      box
    );

    const grid = node(
      'div',null,'cpu-battle-grid',box
    );

    const enemyBox = fighter(opponent,false);

    const myBox = fighter(player,true);

    const ev = game.last_action;

    grid.append(
      enemyBox,
      node('div',describe(ev),'cpu-event'),
      myBox
    );

    if (ev) {
      const key = session.match_id+':'+session.version;

      if (key!==animatedEvent) {
        animatedEvent = key;

        const own = Number(ev.player)===1;

        const actor = own?myBox:enemyBox;
        const target = own?enemyBox:myBox;

        if (ev.damage>0) {
          actor.classList.add('cpu-attack');
          target.classList.add('cpu-hit');
        }

        if (ev.healing>0) {
          actor.classList.add('cpu-healing');
        }

        if (ev.action==='shield') {
          actor.classList.add('cpu-defense');
        }

        if (ev.action==='boost') {
          actor.classList.add('cpu-attack');
        }
      }
    }

    if (done) {
      const result = node(
        'div',null,'cpu-result-card',box
      );

      const title =
        session.status==='abandoned'
          ?'Partida abandonada'
          :session.result==='win'
            ?'🏆 ¡VICTORIA!'
            :session.result==='draw'
              ?'🤝 TABLAS'
              :'Combate terminado';

      node('h2',title,null,result);

      node(
        'p',
        '🪙 Recompensa: +'+
        Number(session.reward_granted||0)+' monedas',
        null,result
      );

      const again = node(
        'button','⚔️ Nuevo combate',null,result
      );

      again.type = 'button';
      again.onclick = open;

      const home = node(
        'button','🏠 Menú principal',null,result
      );

      home.type = 'button';
      home.onclick = () => window.show('home');

    } else {
      box.append(drawActions(player));

      if (syncRequired) {
        const retry = node(
          'button',
          '🔄 Recuperar partida',
          null,box
        );

        retry.type = 'button';
        retry.disabled = busy;
        retry.onclick = open;

      } else if (!mine && !busy) {
        const retry = node(
          'button',
          '🤖 Continuar turno CPU',
          null,box
        );

        retry.type = 'button';
        retry.onclick = () => execute('cpu_turn');
      }

      const abandon = node(
        'button',
        '🏳️ Abandonar combate',
        'cpu-abandon',
        box
      );

      abandon.type = 'button';
      abandon.disabled = busy || syncRequired;
      abandon.onclick = abandonMatch;
    }

    const log = node(
      'details',null,'cpu-battle-log',box
    );

    node(
      'summary',
      '📜 Registro de combate',
      null,log
    );

    const history = Array.isArray(game.history)
      ? game.history.slice(-6).reverse()
      : [];

    if (history.length) {
      history.forEach(e =>
        node('p',describe(e),null,log)
      );
    } else {
      node('p',describe(ev),null,log);
    }
  }

  function cancelCpuTurn() {
    if (cpuTimer!==null) {
      clearTimeout(cpuTimer);
      cpuTimer = null;
    }
  }

  function scheduleCpuTurn() {
    cancelCpuTurn();

    if (
      !visible() || !ready || busy || loading ||
      syncRequired || !session ||
      session.status!=='playing' ||
      Number(session.current_turn)!==2
    ) return;

    const id = session.match_id;
    const version = session.version;

    cpuTimer = setTimeout(() => {
      cpuTimer = null;

      if (
        !visible() || busy || loading ||
        syncRequired ||
        session?.match_id!==id ||
        session?.version!==version ||
        session?.status!=='playing' ||
        Number(session.current_turn)!==2
      ) return;

      execute('cpu_turn');

    },900);
  }

  async function recoverMatch(id) {
    const recovered = await recoverData();

    const current = recovered.find(s =>
      s.match_id===id &&
      s.game_type==='pokemon'
    );

    if (current) {
      session = current;
      syncRequired = false;
      return true;
    }

    const row = check(
      await db.from('cpu_matches')
        .select('*')
        .eq('id',id)
        .eq('player_id',uid)
        .eq('game_type','pokemon')
        .maybeSingle()
    );

    if (!row) return false;

    session = {
      ...session,
      ...row,
      match_id:row.id,
      difficulty:row.difficulty_id
    };

    syncRequired = false;

    return true;
  }

  async function execute(action,target=null) {
    if (
      !visible() || !ready || busy || loading ||
      syncRequired || !session ||
      session.status!=='playing'
    ) return;

    const player = session.game_state?.players?.['1'];

    if (!player) return;

    if (action==='cpu_turn') {
      if (Number(session.current_turn)!==2) return;
    } else {
      const reason = availability(player,action);

      if (reason) {
        status(reason);
        return;
      }

      if (action==='switch') {
        if (!reserves(player).some(
          x => x.index===target
        )) return;
      } else {
        target = null;
      }
    }

    cancelCpuTurn();

    busy = true;

    const id = session.match_id;
    const version = session.version;

    let completed = false;

    drawBattle();

    status(
      action==='cpu_turn'
        ?'🤖 La CPU está pensando…'
        :'⚔️ Ejecutando movimiento…'
    );

    try {
      const r = check(
        await db.rpc('pokemon_cpu_action',{
          p_match_id:id,
          p_action:action,
          p_expected_version:version,
          p_target:target
        })
      );

      if (!r?.success) {
        throw Error(
          r?.message || r?.error ||
          'Movimiento rechazado'
        );
      }

      session = {
        ...session,
        game_state:r.game_state,
        current_turn:r.current_turn,
        version:r.version,
        status:r.status,
        result:r.result,
        winner_side:r.winner_side,
        victory_reward:
          r.victory_reward ?? session.victory_reward,
        reward_granted:r.reward_granted
      };

      coins = Number(r.coins ?? coins);
      healUntil = r.heal_available_at || null;

      drawWallet();

      completed = true;

      status(
        session.status==='finished'
          ?session.result==='win'
            ?'🏆 ¡Victoria!'
            :'Combate terminado'
          :Number(session.current_turn)===1
            ?'🟢 Es tu turno'
            :'🤖 Turno de la CPU'
      );

      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch {}
      }

    } catch (error) {
      syncRequired = true;

      status(
        '⚠️ '+error.message+
        '. Recuperando estado…'
      );

      try {
        if (await recoverMatch(id)) {
          status('Estado recuperado. Puedes continuar.');
        } else {
          status('No se encontró la partida.');
        }
      } catch (e) {
        status('No se pudo sincronizar. Pulsa Recuperar partida.');
      }

    } finally {
      busy = false;

      if (visible()) {
        drawBattle();

        if (completed) scheduleCpuTurn();
      }
    }
  }

  async function abandonMatch() {
    if (
      busy || syncRequired || !session ||
      session.status!=='playing'
    ) return;

    if (!confirm(
      '¿Abandonar este combate? No recibirás recompensa.'
    )) return;

    cancelCpuTurn();

    busy = true;

    const id = session.match_id;

    drawBattle();

    try {
      const r = check(
        await db.rpc('abandon_cpu_match',{
          p_match_id:id,
          p_expected_version:session.version
        })
      );

      if (r?.success===false) {
        throw Error(
          r.message || r.error ||
          'No se pudo abandonar'
        );
      }

      await recoverMatch(id);

      if (session.status==='playing') {
        throw Error('No se confirmó el abandono');
      }

      status('Combate abandonado.');

    } catch (e) {
      syncRequired = true;

      try {
        await recoverMatch(id);
      } catch {}

      status(e.message || 'Error al abandonar');

    } finally {
      busy = false;

      if (visible()) {
        drawBattle();
        scheduleCpuTurn();
      }
    }
  }

  async function open() {
    if (loading || busy) return;

    cancelCpuTurn();

    loading = true;
    ready = false;
    syncRequired = false;

    session = null;
    uid = null;
    profile = null;
    animatedEvent = '';

    coins = 0;
    healUntil = null;
    difficulty = null;
    selected = [null,null,null];

    el('cpuSetup').hidden = true;
    el('cpuBattle').hidden = true;
    el('cpuResume').hidden = true;
    el('cpuResult').hidden = true;
    el('cpuStart').disabled = true;

    el('cpuWallet').textContent =
      '🪙 Monedas online: —';

    el('cpuAccount').replaceChildren();

    status('Conectando con Supabase…');

    try {
      const connected = await connect();

      drawAccount(connected);

      if (!connected) {
        status('Crea o recupera tu perfil online primero.');
        return;
      }

      await loadData();

      ready = true;

      drawWallet();

      status(
        session
          ?'🟢 Partida recuperada'
          :collection.length<3
            ?'Necesitas tres Pokémon diferentes'
            :'Selecciona dificultad y equipo'
      );

    } catch (e) {
      ready = false;
      status(e.message || 'Error al cargar CPU');

    } finally {
      loading = false;

      if (ready) {
        el('cpuSetup').hidden = !!session;

        drawDifficulties();
        drawTeam();

        if (session && visible()) {
          drawBattle();
          scheduleCpuTurn();
        }
      }

      validateTeam();
    }
  }

  async function start() {
    if (!validateTeam()) return;

    busy = true;

    drawDifficulties();
    drawTeam();
    validateTeam();

    status('⚔️ Creando combate…');

    try {
      const r = check(
        await db.rpc('start_pokemon_cpu_match',{
          p_difficulty:difficulty,
          p_pokemon_1:selected[0],
          p_pokemon_2:selected[1],
          p_pokemon_3:selected[2]
        })
      );

      if (!r?.success) {
        throw Error(
          r?.message || r?.error ||
          'No se pudo iniciar'
        );
      }

      session = {
        match_id:r.match_id,
        game_type:'pokemon',
        difficulty:r.difficulty,
        difficulty_name:
          difficulties.find(
            d => d.id===r.difficulty
          )?.name || r.difficulty,
        status:'playing',
        current_turn:r.current_turn,
        version:r.version,
        game_state:r.game_state,
        victory_reward:r.victory_reward,
        reward_granted:0
      };

      animatedEvent = '';

      status(
        r.recovered
          ?'Partida recuperada'
          :'¡Comienza el combate!'
      );

    } catch (e) {
      status(e.message || 'Error al iniciar');

    } finally {
      busy = false;

      drawDifficulties();
      drawTeam();
      validateTeam();

      if (session && visible()) {
        drawBattle();
        scheduleCpuTurn();
      }
    }
  }

  el('cpuStart').onclick = start;

  document.addEventListener(
    'arena:section-change',
    event => {
      if (event.detail?.section==='cpu') {
        if (busy && session) {
          drawBattle();
        } else {
          open();
        }
      } else {
        cancelCpuTurn();
      }
    }
  );

  setInterval(tickHeal,250);

  if (visible()) open();

  console.info('Arena Pokémon CPU V6 cargado');

})();
