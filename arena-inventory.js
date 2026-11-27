
(()=>{
'use strict';

const el=id=>document.getElementById(id);

let db=null;
let uid=null;
let channel=null;
let reading=false;
let timer=null;

const check=r=>{
  if(r.error)throw r.error;
  return r.data;
};

const panel=document.createElement('div');

panel.id='onlineInventory';
panel.className='panel';
panel.style.margin='12px 0';

panel.innerHTML=`
  <h3>🎒 Inventario online</h3>

  <p>🪙 Monedas online:
    <strong id="cloudCoins">—</strong>
  </p>

  <p>🃏 Pokémon diferentes:
    <strong id="cloudUnique">—</strong>
  </p>

  <p>🎴 Total de cartas:
    <strong id="cloudTotal">—</strong>
  </p>

  <small>
    Tu progreso local se conserva por separado.
  </small>

  <p id="cloudStatus" role="status"></p>

  <button id="cloudRefresh" type="button">
    🔄 Actualizar inventario
  </button>

  <div id="cloudCards"
    style="display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:8px;margin-top:12px">
  </div>
`;

el('online').insertBefore(
  panel,
  el('onlineLobby')
);

const status=t=>{
  el('cloudStatus').textContent=t;
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

function drawCards(rows,catalog){

  const box=el('cloudCards');

  box.replaceChildren();

  const map=new Map(
    catalog.map(p=>[p.id,p])
  );

  for(const row of rows){

    const p=map.get(row.pokemon_id);

    if(!p)continue;

    const card=document.createElement('div');

    card.style.cssText=`
      background:#34296a;
      border:1px solid #8c72d7;
      border-radius:14px;
      padding:10px;
      text-align:center;
      overflow:hidden;
    `;

    if(p.image_url){

      const img=document.createElement('img');

      img.src=p.image_url;
      img.alt=p.name;
      img.loading='lazy';

      img.style.cssText=`
        width:100%;
        max-width:110px;
        aspect-ratio:1;
        object-fit:contain;
      `;

      img.onerror=()=>{

        const emoji=document.createElement('div');

        emoji.textContent=p.emoji||'✨';
        emoji.style.fontSize='48px';

        img.replaceWith(emoji);
      };

      card.append(img);
    }

    const name=document.createElement('strong');

    name.textContent=p.name;
    name.style.display='block';

    const info=document.createElement('p');

    info.textContent=
      p.max_hp+' PV · x'+row.quantity;

    const rarity=document.createElement('small');

    const labels={
      common:'Común',
      rare:'Raro',
      secret:'Secreto'
    };

    rarity.textContent=
      labels[p.rarity]||p.rarity;

    rarity.style.color=
      p.rarity==='secret'?'#facc15':
      p.rarity==='rare'?'#38bdf8':
      '#ddd';

    card.append(name,info,rarity);

    box.append(card);
  }
}

async function refresh(){

  if(!uid||reading)return;

  reading=true;

  try{

    const results=await Promise.all([

      db.from('player_wallets')
      .select('coins')
      .eq('player_id',uid)
      .single(),

      db.from('player_collection')
      .select('pokemon_id,quantity')
      .eq('player_id',uid),

      db.from('pokemon_catalog')
      .select(
        'id,name,emoji,image_url,max_hp,rarity'
      )

    ]);

    const [wallet,collection,catalog]=
      results.map(check);

    el('cloudCoins').textContent=
      wallet.coins;

    el('cloudUnique').textContent=
      collection.length;

    el('cloudTotal').textContent=
      collection.reduce(
        (sum,p)=>sum+Number(p.quantity),0
      );

    drawCards(collection,catalog);

    status('🟢 Inventario sincronizado');

  }catch(e){

    status(e.message||'Error de sincronización');

  }finally{

    reading=false;
  }
}

async function subscribe(){

  if(channel)return;

  channel=db.channel('inventory-'+uid)

  .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'player_wallets',
    filter:'player_id=eq.'+uid
  },()=>refresh())

  .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'player_collection',
    filter:'player_id=eq.'+uid
  },()=>refresh())

  .subscribe();
}

let opening=false;

async function open(){

  if(opening)return;

  opening=true;

  el('cloudRefresh').disabled=true;

  try{

    status('Conectando inventario…');

    if(!await connect()){

      status(
        'Crea o recupera tu perfil online primero.'
      );

      return;
    }

    await subscribe();

    await refresh();

  }catch(e){

    status(e.message||'Error de conexión');

  }finally{

    opening=false;

    el('cloudRefresh').disabled=false;
  }
}

el('cloudRefresh').onclick=open;

const previousShow=window.show;

window.show=function(id){

  previousShow(id);

  if(id==='online')open();
};

timer=setInterval(()=>{

  if(!el('online').classList.contains('hidden')){

    if(uid)refresh();
    else open();

  }

},5000);

})();
