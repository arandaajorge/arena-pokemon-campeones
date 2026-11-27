
(()=>{
'use strict';

const el=id=>document.getElementById(id);

let db=null;
let uid=null;
let wallet=0;
let catalog=[];
let collection=[];
let packs=[];
let busy=false;
let loading=false;
let pending=null;

const labels={
  common:'Común',
  rare:'Raro',
  secret:'Secreto'
};

const colors={
  common:'#a3a3a3',
  rare:'#38bdf8',
  epic:'#c084fc',
  legendary:'#facc15',
  ultra_secret:'#fb7185',
  secret:'#fb7185'
};

const check=r=>{
  if(r.error)throw r.error;
  return r.data;
};

const style=document.createElement('style');

style.textContent=`
#cloudStore input,#cloudStore select{
  width:100%;
  margin:6px 0;
  padding:12px;
  border-radius:12px;
  font-size:16px;
}
.cloud-grid{
  display:grid;
  grid-template-columns:repeat(
    2,minmax(0,1fr)
  );
  gap:10px;
}
.cloud-card{
  min-width:0;
  padding:10px;
  border:2px solid var(--rarity);
  border-radius:16px;
  background:#34296a;
  text-align:center;
  overflow:hidden;
}
.cloud-card img{
  width:100%;
  max-width:150px;
  aspect-ratio:1;
  object-fit:contain;
}
.cloud-card h4{
  margin:8px 0;
  overflow-wrap:anywhere;
}
.cloud-locked img{
  filter:brightness(0);
  opacity:.8;
}
.cloud-locked{
  background:#181433;
}
.cloud-pack{
  padding:15px;
  margin:12px 0;
  border:2px solid var(--rarity);
  border-radius:18px;
  background:linear-gradient(
    145deg,#34296a,#211a53
  );
}
.cloud-pack button{
  width:100%;
  margin-top:8px;
}
.cloud-pack-icon{
  font-size:54px;
  text-align:center;
}
#cloudPackDialog{
  width:min(94vw,540px);
  max-height:85vh;
  overflow:auto;
  border:2px solid #facc15;
  border-radius:24px;
  background:#211a53;
  color:white;
  padding:16px;
}
#cloudPackDialog::backdrop{
  background:#08051dee;
}
#cloudPackDialog .cloud-card{
  animation:reveal .5s ease-out;
}
.cloud-tabs{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin:12px 0;
}
.cloud-tabs button{
  padding:12px 5px;
  font-size:14px;
}
.cloud-tabs button.active{
  background:#38bdf8;
}
`;

document.head.append(style);

const panel=document.createElement('div');

panel.id='cloudStore';
panel.className='panel';

panel.innerHTML=`
<h3>🎁 Tienda e índice online</h3>

<p>🪙 Saldo online:
  <strong id="cloudStoreCoins">—</strong>
</p>

<div class="cloud-tabs">
  <button id="cloudTabPacks">
    🎁 Sobres
  </button>
  <button id="cloudTabDex">
    📖 Índice Pokémon
  </button>
</div>

<p id="cloudStoreStatus"
role="status"></p>

<div id="cloudPacks"></div>

<div id="cloudDex" hidden>

  <h3 id="cloudDexProgress">
    Colección
  </h3>

  <div class="hp">
    <div id="cloudDexBar"
      style="width:0%">
    </div>
  </div>

  <input id="cloudSearch"
    placeholder="Buscar Pokémon..."
    autocomplete="off">

  <select id="cloudOwned">
    <option value="all">
      Todos los Pokémon
    </option>
    <option value="owned">
      Obtenidos
    </option>
    <option value="missing">
      No obtenidos
    </option>
  </select>

  <select id="cloudRarity">
    <option value="all">
      Todas las rarezas
    </option>
    <option value="common">
      Comunes
    </option>
    <option value="rare">
      Raros
    </option>
    <option value="secret">
      Secretos
    </option>
  </select>

  <p id="cloudDexCount"></p>

  <div id="cloudDexCards"
    class="cloud-grid">
  </div>

</div>

<button id="cloudStoreRefresh"
  style="margin-top:15px">
  🔄 Actualizar
</button>

<p><small>
  Las compras online no utilizan
  tus monedas locales.
</small></p>
`;

el('onlineInventory').after(panel);

const dialog=document.createElement('dialog');

dialog.id='cloudPackDialog';

dialog.innerHTML=`
<h2>🎉 ¡Sobre abierto!</h2>

<p id="cloudPackSummary"></p>

<div id="cloudPackRewards"
  class="cloud-grid">
</div>

<button id="cloudPackClose"
  style="width:100%;margin-top:15px">
  Aceptar
</button>
`;

document.body.append(dialog);

el('cloudPackClose').onclick=()=>{
  dialog.close();
};

const status=t=>{
  el('cloudStoreStatus').textContent=t;
};

async function connect(){

  if(!window.supabase)
    throw Error('Supabase no disponible');

  db ||= window.supabase.createClient(
    'https://bwupxxeeaewdstjzmwob.supabase.co',
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
  );

  const {session}=check(
    await db.auth.getSession()
  );

  if(!session)return false;

  const {user}=check(
    await db.auth.getUser()
  );

  uid=user.id;

  const profile=check(
    await db.from('players')
    .select('id')
    .eq('id',uid)
    .maybeSingle()
  );

  if(!profile)return false;

  check(await db.rpc(
    'initialize_player_inventory'
  ));

  return true;
}

function pendingKey(){

  return 'arena_pending_pack_'+uid;
}

function readPending(){

  try{

    const saved=JSON.parse(
      localStorage.getItem(pendingKey())
    );

    if(saved?.packId&&saved?.requestId)
      return saved;

  }catch(e){}

  return null;
}

function savePending(value){

  localStorage.setItem(
    pendingKey(),
    JSON.stringify(value)
  );

  pending=value;
}

function clearPending(){

  localStorage.removeItem(
    pendingKey()
  );

  pending=null;
}

function makeCard(p,quantity,locked=false){

  const card=document.createElement('div');

  card.className='cloud-card';

  if(locked)
    card.classList.add('cloud-locked');

  card.style.setProperty(
    '--rarity',
    colors[p.rarity]||'#a78bfa'
  );

  const img=document.createElement('img');

  img.loading='lazy';

  img.alt=locked
    ?'Pokémon no obtenido'
    :p.name;

  if(p.image_url)
    img.src=p.image_url;

  const fallback=()=>{

    const icon=document.createElement('div');

    icon.textContent=locked
      ?'❓'
      :p.emoji||'✨';

    icon.style.fontSize='52px';

    img.replaceWith(icon);
  };

  img.onerror=fallback;

  card.append(img);

  if(!p.image_url)fallback();

  const name=document.createElement('h4');

  name.textContent=p.name;

  const hp=document.createElement('p');

  hp.textContent=p.max_hp+' PV';

  const rarity=document.createElement('small');

  rarity.textContent=
    labels[p.rarity]||p.rarity;

  rarity.style.color=
    colors[p.rarity]||'#ddd';

  const owned=document.createElement('p');

  owned.textContent=locked
    ?'🔒 No obtenido'
    :'En colección: x'+quantity;

  card.append(name,hp,rarity,owned);

  return card;
}

function drawDex(){

  const search=el('cloudSearch')
    .value.trim().toLowerCase();

  const owned=el('cloudOwned').value;

  const rarity=el('cloudRarity').value;

  const quantities=new Map(
    collection.map(p=>[
      p.pokemon_id,
      Number(p.quantity)
    ])
  );

  const total=catalog.length;

  const obtained=catalog.filter(
    p=>quantities.has(p.id)
  ).length;

  el('cloudDexProgress').textContent=
    '📖 '+obtained+' / '+total+' Pokémon';

  el('cloudDexBar').style.width=
    (total?obtained/total*100:0)+'%';

  const filtered=catalog.filter(p=>{

    const has=quantities.has(p.id);

    if(search&&!p.name.toLowerCase()
      .includes(search))return false;

    if(owned==='owned'&&!has)
      return false;

    if(owned==='missing'&&has)
      return false;

    if(rarity!=='all'&&p.rarity!==rarity)
      return false;

    return true;
  });

  el('cloudDexCount').textContent=
    filtered.length+' resultados';

  const fragment=
    document.createDocumentFragment();

  for(const p of filtered){

    const quantity=quantities.get(p.id)||0;

    fragment.append(
      makeCard(p,quantity,quantity===0)
    );
  }

  el('cloudDexCards').replaceChildren(
    fragment
  );
}

function drawPacks(){

  const box=el('cloudPacks');

  box.replaceChildren();

  for(const p of packs){

    const card=document.createElement('div');

    card.className='cloud-pack';

    card.style.setProperty(
      '--rarity',
      colors[p.id]||'#a78bfa'
    );

    const icon=document.createElement('div');

    icon.className='cloud-pack-icon';
    icon.textContent='🎁';

    const name=document.createElement('h3');

    name.textContent=p.name;

    const info=document.createElement('p');

    info.textContent=
      p.cards_per_pack+' cartas por sobre';

    const guarantees=[];

    if(p.guaranteed_common)
      guarantees.push(
        p.guaranteed_common+' común(es)'
      );

    if(p.guaranteed_rare)
      guarantees.push(
        p.guaranteed_rare+' raro(s)'
      );

    if(p.guaranteed_secret)
      guarantees.push(
        p.guaranteed_secret+' secreto(s)'
      );

    const guarantee=document.createElement('p');

    guarantee.textContent=
      'Garantía: '+guarantees.join(', ');

    const price=document.createElement('strong');

    price.textContent='🪙 '+p.price;

    const buy=document.createElement('button');

    const retry=pending?.packId===p.id;

    buy.textContent=retry
      ?'🔄 Recuperar compra pendiente'
      :wallet>=Number(p.price)
      ?'Abrir sobre'
      :'Monedas insuficientes';

    buy.disabled=
      busy||
      (!!pending&&!retry)||
      (!retry&&wallet<Number(p.price));

    buy.onclick=()=>purchase(p);

    card.append(
      icon,name,info,guarantee,price
    );

    if(p.id==='ultra_secret'){

      const secret=document.createElement('p');

      secret.textContent=
        '🐉 Charizard secreto: '+
        Number(p.charizard_probability)*100+
        '% por sobre';

      secret.style.color='#facc15';

      card.append(secret);
    }

    card.append(buy);

    box.append(card);
  }
}

async function refresh(){

  if(!uid)return;

  const results=await Promise.all([

    db.from('player_wallets')
      .select('coins')
      .eq('player_id',uid)
      .single(),

    db.from('player_collection')
      .select('pokemon_id,quantity')
      .eq('player_id',uid),

    db.from('pokemon_catalog')
      .select('*')
      .order('pokedex_id'),

    db.from('pokemon_packs')
      .select('*')
      .eq('active',true)
      .order('price')

  ]);

  const [w,c,d,p]=results.map(check);

  wallet=Number(w.coins);
  collection=c;
  catalog=d;
  packs=p;

  el('cloudStoreCoins').textContent=
    wallet;

  drawPacks();
  drawDex();
}

function reveal(cards){

  const box=el('cloudPackRewards');

  box.replaceChildren();

  for(const item of cards){

    const id=item.pokemon_id||item.id;

    const p=catalog.find(
      x=>x.id===id
    )||item;

    const owned=collection.find(
      x=>x.pokemon_id===id
    );

    box.append(
      makeCard(
        p,
        owned?.quantity||1
      )
    );
  }

  el('cloudPackSummary').textContent=
    'Obtuviste '+cards.length+' cartas.';

  if(!dialog.open)
    dialog.showModal();
}

async function purchase(pack){

  if(busy||!uid)return;

  if(pending&&pending.packId!==pack.id)
    return;

  if(!pending&&wallet<Number(pack.price))
    return;

  if(!pending&&!confirm(
    '¿Abrir '+pack.name+
    ' por '+pack.price+' monedas online?'
  ))return;

  busy=true;

  try{

    if(!pending){

      savePending({
        packId:pack.id,
        requestId:crypto.randomUUID()
      });
    }

    drawPacks();

    status('🎁 Abriendo sobre...');

    const result=check(
      await db.rpc('open_pokemon_pack',{
        p_pack_id:pending.packId,
        p_request_id:pending.requestId
      })
    );

    if(result.success===false)
      throw Error(
        result.error||'Compra no completada'
      );

    if(!Array.isArray(result.cards))
      throw Error(
        'Respuesta pendiente de verificar'
      );

    await refresh();

    reveal(result.cards);

    clearPending();

    status('🟢 Compra guardada correctamente');

    el('cloudRefresh')?.click();

  }catch(e){

    status(
      'No se pudo confirmar la compra: '+
      (e.message||'Error de conexión')+
      '. Si quedó pendiente, vuelve a pulsar recuperar compra.'
    );

  }finally{

    busy=false;

    drawPacks();
  }
}

function tab(dex){

  el('cloudPacks').hidden=dex;
  el('cloudDex').hidden=!dex;

  el('cloudTabPacks').classList.toggle(
    'active',!dex
  );

  el('cloudTabDex').classList.toggle(
    'active',dex
  );

  if(dex)drawDex();
}

el('cloudTabPacks').onclick=()=>{
  tab(false);
};

el('cloudTabDex').onclick=()=>{
  tab(true);
};

el('cloudSearch').oninput=drawDex;

el('cloudOwned').onchange=drawDex;

el('cloudRarity').onchange=drawDex;

async function open(){

  if(loading||busy)return;

  loading=true;

  el('cloudStoreRefresh').disabled=true;

  try{

    status('Cargando tienda online...');

    if(!await connect()){

      status(
        'Primero registra tu perfil online.'
      );

      return;
    }

    pending=readPending();

    await refresh();

    status(
      pending
      ?'Hay una compra pendiente de recuperar.'
      :'🟢 Tienda sincronizada'
    );

  }catch(e){

    status(e.message||'Error de conexión');

  }finally{

    loading=false;

    el('cloudStoreRefresh').disabled=false;
  }
}

el('cloudStoreRefresh').onclick=open;

const previousShow=window.show;

window.show=function(id){

  previousShow(id);

  if(id==='online')open();
};

tab(false);

})();
