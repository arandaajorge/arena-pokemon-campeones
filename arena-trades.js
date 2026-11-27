
(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const root = el('trade');

  if (!root || el('atTabs')) return;

  let db = null;
  let uid = null;
  let profile = null;

  let ownCollection = [];
  let otherCollection = [];
  let trainers = [];
  let trades = [];

  let catalog = new Map();
  let names = new Map();

  let receiver = '';
  let offered = '';
  let requested = '';

  let offeredQty = 1;
  let requestedQty = 1;

  let tab = 'new';
  let loading = false;
  let busy = false;
  let reading = false;
  let connected = false;
  let collectionLoading = false;

  let channel = null;
  let channelUid = null;
  let timer = null;
  let requestVersion = 0;
  let refreshQueued = false;

  const visible = () =>
    !root.classList.contains('hidden');

  const check = r => {
    if (r.error) throw r.error;
    return r.data;
  };

  function node(tag,text,cls,parent) {
    const n = document.createElement(tag);

    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    if (parent) parent.append(n);

    return n;
  }

  function button(text,cls,parent,action) {
    const b = node(
      'button',text,cls,parent
    );

    b.type = 'button';
    b.onclick = action;

    return b;
  }

  const rarityNames = {
    common:'Común',
    rare:'Raro',
    secret:'Secreto'
  };

  const tradeStates = {
    pending:'⏳ Pendiente',
    accepted:'✅ Aceptado',
    rejected:'❌ Rechazado',
    cancelled:'🚫 Cancelado',
    expired:'⌛ Vencido'
  };

  root.replaceChildren();

  node(
    'h2',
    '🔁 Centro de intercambios',
    null,root
  );

  const account = node(
    'div',null,'at-account',root
  );

  const tabs = node(
    'div',null,'at-tabs',root
  );

  tabs.id = 'atTabs';

  const newTab = button(
    '🔁 Nuevo',null,tabs,
    () => changeTab('new')
  );

  const pendingTab = button(
    '📨 Solicitudes',null,tabs,
    () => changeTab('pending')
  );

  const historyTab = button(
    '📜 Historial',null,tabs,
    () => changeTab('history')
  );

  const newView = node('div',null,null,root);

  const searchBox = node(
    'div',null,'at-search',newView
  );

  const search = node(
    'input',null,null,searchBox
  );

  search.type = 'search';
  search.placeholder = 'Buscar entrenador';
  search.maxLength = 30;

  const searchButton = button(
    'Buscar',null,searchBox,searchPlayers
  );

  search.addEventListener('keydown',e => {
    if (e.key==='Enter') {
      e.preventDefault();
      searchPlayers();
    }
  });

  node(
    'p','Selecciona un entrenador:',
    null,newView
  );

  const playerSelect = node(
    'select',null,null,newView
  );

  playerSelect.setAttribute(
    'aria-label','Entrenador destinatario'
  );

  playerSelect.onchange = async () => {

    receiver = playerSelect.value;
    requested = '';
    requestedQty = 1;
    otherCollection = [];

    await loadOtherCollection();
  };

  const cards = node(
    'div',null,'at-grid',newView
  );

  const submit = button(
    'Enviar propuesta de intercambio',
    'at-submit',
    newView,
    sendTrade
  );

  node(
    'p',
    'La propuesta dura 24 horas. Las cartas solo se transfieren cuando el destinatario acepta.',
    'at-notice',
    newView
  );

  const pendingView = node(
    'div',null,null,root
  );

  const historyView = node(
    'div',null,null,root
  );

  const refreshButton = button(
    '🔄 Actualizar intercambios',
    'at-refresh',
    root,
    () => refresh(true)
  );

  const statusBox = node(
    'p',null,'at-status',root
  );

  statusBox.setAttribute('role','status');
  statusBox.setAttribute('aria-live','polite');

  function status(text) {
    statusBox.textContent = text;
  }

  function pokemonImage(p) {

    const fallback = () =>
      node('div',p?.emoji || '❔','at-emoji');

    if (!p?.image_url) return fallback();

    const img = node('img');

    img.src = p.image_url;
    img.alt = p.name;
    img.loading = 'lazy';

    img.onerror = () => {
      img.replaceWith(fallback());
    };

    return img;
  }

  function playerName(id) {

    if (id===uid) {
      return profile?.nickname || 'Tú';
    }

    return names.get(id) ||
      'Entrenador '+String(id).slice(0,6);
  }

  function displayDate(value) {

    if (!value) return '—';

    const date = new Date(value);

    return Number.isFinite(date.getTime())
      ? date.toLocaleString('es-MX')
      : '—';
  }

  function expired(t) {

    return t.status==='pending' &&
      Date.parse(t.expires_at)<=Date.now();
  }

  function effectiveStatus(t) {

    return expired(t)
      ? 'expired'
      : t.status;
  }

  async function connect() {

    if (!window.supabase) {
      throw Error('Supabase no disponible');
    }

    db ||= window.supabase.createClient(
      'https://bwupxxeeaewdstjzmwob.supabase.co',
      'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
    );

    const auth = check(
      await db.auth.getSession()
    );

    if (!auth.session) return false;

    const {user} = check(
      await db.auth.getUser()
    );

    if (!user) return false;

    uid = user.id;

    profile = check(
      await db.from('players')
        .select('id,nickname')
        .eq('id',uid)
        .maybeSingle()
    );

    if (!profile) return false;

    check(
      await db.rpc('initialize_player_inventory')
    );

    names.set(uid,profile.nickname);

    return true;
  }

  function drawAccount() {

    account.replaceChildren();

    if (connected && profile) {

      node(
        'strong',
        '👤 '+profile.nickname,
        null,account
      );

      node(
        'p',
        'ID: '+uid.slice(0,8),
        'at-request-meta',
        account
      );

      return;
    }

    node(
      'p',
      'Necesitas un perfil online para intercambiar.',
      null,account
    );

    button(
      '🌐 Ir al modo online',
      null,account,
      () => window.show('online')
    );
  }

  async function fetchCollection(id) {

    const result = check(
      await db.rpc('get_trade_collection',{
        p_player_id:id
      })
    );

    return result || [];
  }

  async function fetchPlayers() {

    const result = check(
      await db.rpc('search_trade_players',{
        p_search:search.value.trim()
      })
    );

    trainers = result || [];

    trainers.forEach(p =>
      names.set(p.player_id,p.nickname)
    );
  }

  function drawPlayers() {

    playerSelect.replaceChildren();

    playerSelect.add(
      new Option('Seleccionar entrenador','')
    );

    for (const p of trainers) {

      playerSelect.add(
        new Option(
          p.nickname+
          ' · '+p.player_id.slice(0,8),
          p.player_id
        )
      );
    }

    if (!trainers.some(
      p => p.player_id===receiver
    )) {

      receiver = '';
      requested = '';
      requestedQty = 1;
      otherCollection = [];
    }

    playerSelect.value = receiver;

    playerSelect.disabled =
      !connected || busy || loading ||
      collectionLoading;
  }

  async function searchPlayers() {

    if (!connected || busy || loading ||
        reading || collectionLoading) return;

    reading = true;

    searchButton.disabled = true;

    try {

      await fetchPlayers();

      drawPlayers();
      drawCards();

      status(
        trainers.length+
        ' entrenadores encontrados.'
      );

    } catch (e) {

      status(e.message || 'Error de búsqueda');

    } finally {

      reading = false;
      searchButton.disabled = false;
    }
  }

  async function loadOtherCollection() {

    const id = receiver;

    const version = ++requestVersion;

    if (!id) {

      collectionLoading = false;
      otherCollection = [];
      drawPlayers();
      drawCards();

      return;
    }

    collectionLoading = true;

    drawPlayers();
    drawCards();

    status('Consultando colección...');

    try {

      const result = await fetchCollection(id);

      if (
        version!==requestVersion ||
        receiver!==id
      ) return;

      otherCollection = result;

      status(
        playerName(id)+
        ' tiene '+result.length+
        ' Pokémon diferentes.'
      );

    } catch (e) {

      if (version===requestVersion) {

        otherCollection = [];

        status(
          e.message ||
          'Error al consultar colección'
        );
      }

    } finally {

      if (version===requestVersion) {

        collectionLoading = false;

        drawPlayers();
        drawCards();
      }
    }
  }

  function drawCard(isOwn) {

    const list = isOwn
      ? ownCollection
      : otherCollection;

    const id = isOwn
      ? offered
      : requested;

    const p = list.find(
      item => item.pokemon_id===id
    );

    const card = node(
      'div',
      null,
      'at-card'+(isOwn?'':' receive')
    );

    node(
      'h3',
      isOwn?'TÚ OFRECES':'TÚ RECIBES',
      null,card
    );

    card.append(pokemonImage(p));

    node(
      'strong',
      p?.name || 'Sin seleccionar',
      null,card
    );

    if (p) {

      node(
        'small',
        p.max_hp+' PV · '+
        (rarityNames[p.rarity]||p.rarity),
        null,card
      );

      node(
        'small',
        'Disponibles: '+p.quantity,
        null,card
      );
    }

    const select = node(
      'select',null,null,card
    );

    select.setAttribute(
      'aria-label',
      isOwn?'Pokémon ofrecido':'Pokémon solicitado'
    );

    select.add(
      new Option('Seleccionar','')
    );

    for (const item of list) {

      const option = new Option(
        item.name+' ×'+item.quantity,
        item.pokemon_id
      );

      option.disabled =
        item.pokemon_id===
        (isOwn?requested:offered);

      select.add(option);
    }

    select.value = id;

    select.disabled =
      !connected || busy || loading ||
      (!isOwn && collectionLoading);

    select.onchange = () => {

      if (isOwn) {

        offered = select.value;
        offeredQty = 1;

      } else {

        requested = select.value;
        requestedQty = 1;
      }

      drawCards();
    };

    node(
      'small','Cantidad',null,card
    );

    const quantity = node(
      'input',null,null,card
    );

    quantity.type = 'number';
    quantity.min = '1';
    quantity.max = String(p?.quantity || 1);
    quantity.step = '1';
    quantity.inputMode = 'numeric';

    quantity.setAttribute(
      'aria-label',
      isOwn?'Cantidad ofrecida':'Cantidad solicitada'
    );

    quantity.value = String(
      isOwn?offeredQty:requestedQty
    );

    quantity.disabled =
      !p || busy || loading ||
      collectionLoading;

    quantity.oninput = () => {

      const value = Number(quantity.value);

      if (isOwn) offeredQty = value;
      else requestedQty = value;

      validate();
    };

    quantity.onchange = () => {

      const value = Math.max(
        1,
        Math.min(
          p?.quantity || 1,
          Math.floor(Number(quantity.value)||1)
        )
      );

      quantity.value = String(value);

      if (isOwn) offeredQty = value;
      else requestedQty = value;

      validate();
    };

    return card;
  }

  function validate() {

    const a = ownCollection.find(
      p => p.pokemon_id===offered
    );

    const b = otherCollection.find(
      p => p.pokemon_id===requested
    );

    const valid =
      connected &&
      !loading &&
      !busy &&
      !collectionLoading &&
      !!receiver &&
      receiver!==uid &&
      !!a &&
      !!b &&
      offered!==requested &&
      Number.isInteger(offeredQty) &&
      Number.isInteger(requestedQty) &&
      offeredQty>=1 &&
      requestedQty>=1 &&
      offeredQty<=a.quantity &&
      requestedQty<=b.quantity;

    submit.disabled = !valid;

    return valid;
  }

  function drawCards() {

    if (!ownCollection.some(
      p => p.pokemon_id===offered
    )) offered = '';

    if (!otherCollection.some(
      p => p.pokemon_id===requested
    )) requested = '';

    cards.replaceChildren(
      drawCard(true),
      drawCard(false)
    );

    validate();
  }

  async function fetchTrades() {

    const result = check(
      await db.from('pokemon_trades')
        .select('*')
        .or(
          'sender_id.eq.'+uid+
          ',receiver_id.eq.'+uid
        )
        .order('created_at',{
          ascending:false
        })
        .limit(200)
    );

    trades = result || [];
  }

  function summaryCard(id,quantity,label,receive) {

    const p = catalog.get(id);

    const card = node(
      'div',null,
      'at-card'+(receive?' receive':'')
    );

    node('h3',label,null,card);

    card.append(pokemonImage(p));

    node(
      'strong',
      p?.name || id,
      null,card
    );

    node(
      'small',
      'Cantidad: '+quantity,
      null,card
    );

    if (p) {

      node(
        'small',
        rarityNames[p.rarity]||p.rarity,
        null,card
      );
    }

    return card;
  }

  function tradeCard(t) {

    const outgoing = t.sender_id===uid;

    const other = outgoing
      ? t.receiver_id
      : t.sender_id;

    const currentStatus = effectiveStatus(t);

    const box = node(
      'div',null,'at-request'
    );

    node(
      'div',
      (outgoing?'📤 Enviado a ':'📥 Recibido de ')+
      playerName(other),
      'at-request-title',
      box
    );

    node(
      'p',
      tradeStates[currentStatus]||currentStatus,
      'at-request-meta',
      box
    );

    node(
      'p',
      'Creado: '+displayDate(t.created_at),
      'at-request-meta',
      box
    );

    const grid = node(
      'div',null,'at-grid',box
    );

    const giveId = outgoing
      ? t.offered_pokemon_id
      : t.requested_pokemon_id;

    const getId = outgoing
      ? t.requested_pokemon_id
      : t.offered_pokemon_id;

    const giveQty = outgoing
      ? t.offered_quantity
      : t.requested_quantity;

    const getQty = outgoing
      ? t.requested_quantity
      : t.offered_quantity;

    grid.append(
      summaryCard(
        giveId,giveQty,'TÚ ENTREGAS',false
      ),
      summaryCard(
        getId,getQty,'TÚ RECIBES',true
      )
    );

    if (currentStatus==='pending') {

      node(
        'p',
        'Vence: '+displayDate(t.expires_at),
        'at-request-meta',
        box
      );

      const actions = node(
        'div',null,
        'at-request-actions',box
      );

      if (outgoing) {

        const cancel = button(
          'Cancelar propuesta',
          'at-cancel',
          actions,
          () => respond(t,'cancel')
        );

        cancel.disabled = busy;

      } else {

        const accept = button(
          '✓ Aceptar',
          'at-accept',
          actions,
          () => respond(t,'accept')
        );

        const reject = button(
          '✕ Rechazar',
          'at-reject',
          actions,
          () => respond(t,'reject')
        );

        accept.disabled = busy;
        reject.disabled = busy;
      }

    } else if (t.resolved_at) {

      node(
        'p',
        'Resuelto: '+displayDate(t.resolved_at),
        'at-request-meta',
        box
      );
    }

    return box;
  }

  function drawTrades() {

    pendingView.replaceChildren();
    historyView.replaceChildren();

    const pending = trades.filter(
      t => effectiveStatus(t)==='pending'
    );

    const history = trades.filter(
      t => effectiveStatus(t)!=='pending'
    );

    const incoming = pending.filter(
      t => t.receiver_id===uid
    );

    const outgoing = pending.filter(
      t => t.sender_id===uid
    );

    pendingTab.textContent =
      '📨 Solicitudes'+
      (incoming.length
        ?' ('+incoming.length+')'
        :'');

    node(
      'h3',
      '📥 Recibidas · '+incoming.length,
      null,pendingView
    );

    if (!incoming.length) {

      node(
        'div',
        'No tienes propuestas recibidas.',
        'at-empty',
        pendingView
      );
    }

    incoming.forEach(t =>
      pendingView.append(tradeCard(t))
    );

    node(
      'h3',
      '📤 Enviadas · '+outgoing.length,
      null,pendingView
    );

    if (!outgoing.length) {

      node(
        'div',
        'No tienes propuestas enviadas.',
        'at-empty',
        pendingView
      );
    }

    outgoing.forEach(t =>
      pendingView.append(tradeCard(t))
    );

    if (!history.length) {

      node(
        'div',
        'Todavía no tienes intercambios finalizados.',
        'at-empty',
        historyView
      );
    }

    history.forEach(t =>
      historyView.append(tradeCard(t))
    );
  }

  function changeTab(next) {

    if (busy || loading || !connected) return;

    tab = next;

    renderTabs();

    if (tab!=='new') refresh();
  }

  function renderTabs() {

    tabs.hidden = !connected;

    newView.hidden =
      !connected || tab!=='new';

    pendingView.hidden =
      !connected || tab!=='pending';

    historyView.hidden =
      !connected || tab!=='history';

    refreshButton.hidden = !connected;

    newTab.classList.toggle(
      'selected',tab==='new'
    );

    pendingTab.classList.toggle(
      'selected',tab==='pending'
    );

    historyTab.classList.toggle(
      'selected',tab==='history'
    );
  }

  function refreshInventoryModules() {

    el('cloudRefresh')?.click();

    el('cloudStoreRefresh')?.click();
  }

  async function refresh(manual=false) {

    if (
      !connected || loading || busy ||
      reading || collectionLoading ||
      !visible()
    ) return;

    reading = true;

    try {

      const id = receiver;

      const results = await Promise.all([
        fetchCollection(uid),
        fetchTrades(),
        id?fetchCollection(id):Promise.resolve([])
      ]);

      ownCollection = results[0];

      if (receiver===id) {

        otherCollection = results[2];
      }

      drawTrades();

      /*
        No reconstruimos los selectores
        mientras el usuario escribe.
      */

      if (
        !cards.contains(document.activeElement)
      ) {

        drawCards();

      } else {

        validate();
      }

      if (manual) {

        status('Intercambios actualizados.');
      }

    } catch (e) {

      status(
        e.message ||
        'No se pudieron actualizar los intercambios'
      );

    } finally {

      reading = false;
    }
  }

  function queueRefresh() {

    if (refreshQueued) return;

    refreshQueued = true;

    setTimeout(() => {

      refreshQueued = false;

      if (visible()) refresh();

    },350);
  }

  async function watch() {

    if (channel && channelUid===uid) return;

    if (channel) {

      await db.removeChannel(channel);
      channel = null;
    }

    channelUid = uid;

    channel = db.channel(
      'arena-trades-'+uid
    )
    .on(
      'postgres_changes',
      {
        event:'*',
        schema:'public',
        table:'pokemon_trades',
        filter:'sender_id=eq.'+uid
      },
      queueRefresh
    )
    .on(
      'postgres_changes',
      {
        event:'*',
        schema:'public',
        table:'pokemon_trades',
        filter:'receiver_id=eq.'+uid
      },
      queueRefresh
    )
    .on(
      'postgres_changes',
      {
        event:'*',
        schema:'public',
        table:'player_collection',
        filter:'player_id=eq.'+uid
      },
      queueRefresh
    )
    .subscribe();
  }

  function setBusy(value) {

    busy = value;

    search.disabled = value;
    searchButton.disabled = value;

    refreshButton.disabled = value;

    drawPlayers();
    drawCards();
    drawTrades();
  }

  async function sendTrade() {

    if (!validate() || reading) return;

    const a = ownCollection.find(
      p => p.pokemon_id===offered
    );

    const b = otherCollection.find(
      p => p.pokemon_id===requested
    );

    if (!confirm(
      'Enviar a '+playerName(receiver)+'\n\n'+
      'Ofreces: '+a.name+' ×'+offeredQty+'\n'+
      'Solicitas: '+b.name+' ×'+requestedQty
    )) return;

    const payload = {
      p_receiver_id:receiver,
      p_offered_pokemon_id:offered,
      p_requested_pokemon_id:requested,
      p_offered_quantity:offeredQty,
      p_requested_quantity:requestedQty
    };

    setBusy(true);

    status('Enviando propuesta...');

    try {

      const result = check(
        await db.rpc(
          'create_pokemon_trade',
          payload
        )
      );

      if (!result?.success) {

        throw Error(
          result?.message ||
          result?.error ||
          'No se pudo enviar la propuesta'
        );
      }

      offered = '';
      requested = '';

      offeredQty = 1;
      requestedQty = 1;

      tab = 'pending';

      renderTabs();

      status('✅ Propuesta enviada correctamente.');

    } catch (e) {

      status(
        '⚠️ '+(e.message||'Error al enviar')+
        '. Consulta tus solicitudes antes de reintentar.'
      );

    } finally {

      setBusy(false);

      await refresh();
    }
  }

  async function respond(t,action) {

    if (
      busy || reading ||
      effectiveStatus(t)!=='pending'
    ) return;

    const outgoing = t.sender_id===uid;

    if (action==='cancel' && !outgoing) return;

    if (action!=='cancel' && outgoing) return;

    const messages = {
      accept:
        '¿Aceptar el intercambio? Las cartas se transferirán inmediatamente.',
      reject:
        '¿Rechazar esta propuesta?',
      cancel:
        '¿Cancelar esta propuesta?'
    };

    if (!confirm(messages[action])) return;

    setBusy(true);

    status('Procesando intercambio...');

    try {

      const result = check(
        await db.rpc(
          'respond_pokemon_trade',
          {
            p_trade_id:t.id,
            p_action:action
          }
        )
      );

      if (!result?.success) {

        throw Error(
          result?.message ||
          result?.error ||
          tradeStates[result?.status] ||
          'No se pudo procesar la propuesta'
        );
      }

      const texts = {
        accept:'✅ Intercambio completado.',
        reject:'Propuesta rechazada.',
        cancel:'Propuesta cancelada.'
      };

      status(texts[action]);

      if (action==='accept') {

        refreshInventoryModules();

        if (
          typeof window.showReward==='function'
        ) {

          window.showReward(
            '🔁 ¡Intercambio completado!',
            'Nueva carta en tu colección',
            'Las cartas fueron transferidas correctamente.'
          );
        }
      }

    } catch (e) {

      status(
        '⚠️ '+(e.message||'Error de intercambio')
      );

    } finally {

      setBusy(false);

      await refresh();
    }
  }

  async function open() {

    if (loading || busy || reading) return;

    loading = true;
    connected = false;

    requestVersion++;
    collectionLoading = false;

    tab = 'new';

    receiver = '';
    offered = '';
    requested = '';

    offeredQty = 1;
    requestedQty = 1;

    ownCollection = [];
    otherCollection = [];
    trainers = [];
    trades = [];

    names = new Map();

    renderTabs();

    status('Conectando con Supabase...');

    try {

      connected = await connect();

      drawAccount();

      if (!connected) {

        status(
          'Inicia sesión en el modo online primero.'
        );

        return;
      }

      const results = await Promise.all([

        fetchCollection(uid),

        db.from('pokemon_catalog')
          .select(
            'id,name,emoji,image_url,rarity,max_hp'
          ),

        fetchPlayers(),

        fetchTrades()

      ]);

      ownCollection = results[0];

      const allPokemon =
        check(results[1]) || [];

      catalog = new Map(
        allPokemon.map(p => [p.id,p])
      );

      await watch();

      status(
        '🟢 Centro de intercambios conectado.'
      );

    } catch (e) {

      connected = false;

      status(
        e.message ||
        'No se pudo cargar el centro de intercambios'
      );

    } finally {

      loading = false;

      drawAccount();
      renderTabs();
      drawPlayers();
      drawCards();
      drawTrades();
    }
  }

  document.addEventListener(
    'arena:section-change',
    event => {

      if (event.detail?.section==='trade') {

        open();
      }
    }
  );

  timer = setInterval(() => {

    if (visible() && connected) refresh();

  },5000);

  renderTabs();

  if (visible()) open();

  console.info(
    'Liamcito GameStore · Intercambios V1'
  );

})();
