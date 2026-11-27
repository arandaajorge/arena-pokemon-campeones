
(()=>{
'use strict';

const el=id=>document.getElementById(id);

let db=null;
let uid=null;
let roomId=null;
let session=null;
let catalog=[];
let owned=[];
let teams=[];
let selected=['','',''];
let dirty=false;
let busy=false;
let reading=false;

const check=r=>{
  if(r.error)throw r.error;
  return r.data;
};

const rarities={
  common:'Común',
  rare:'Raro',
  secret:'Secreto'
};

const colors={
  common:'#a3a3a3',
  rare:'#38bdf8',
  secret:'#facc15'
};

const style=document.createElement('style');

style.textContent=`
#pokemonTeamPanel{
  margin:16px 0;
  padding:12px;
}
.team-slots{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:6px;
  margin:12px 0;
}
.team-slot{
  min-width:0;
  padding:8px 3px;
  background:#34296a;
  border:2px solid #8c72d7;
  border-radius:14px;
  text-align:center;
  cursor:pointer;
}
.team-slot.active{
  border-color:#facc15;
  box-shadow:0 0 10px #facc1555;
}
.team-slot img{
  width:100%;
  aspect-ratio:1;
  object-fit:contain;
}
.team-slot strong{
  display:block;
  font-size:12px;
  overflow-wrap:anywhere;
}
.team-slot small{
  font-size:11px;
}
.team-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:6px;
  max-height:360px;
  overflow:auto;
  padding:4px;
}
.team-choice{
  min-width:0;
  padding:8px 3px;
  border:2px solid var(--rarity);
  border-radius:12px;
  background:#34296a;
  color:white;
  text-align:center;
}
.team-choice img{
  width:100%;
  aspect-ratio:1;
  object-fit:contain;
}
.team-choice strong{
  display:block;
  font-size:12px;
  overflow-wrap:anywhere;
}
.team-choice small{
  font-size:11px;
}
.team-choice.selected{
  background:#155e75;
}
.team-actions{
  display:grid;
  gap:8px;
  margin:15px 0;
}
.team-player{
  padding:10px;
  margin:6px 0;
  border-radius:10px;
  background:#34296a;
}
#teamSearch{
  width:100%;
  margin:8px 0;
}
`;

document.head.append(style);

const panel=document.createElement('div');

panel.id='pokemonTeamPanel';
panel.className='panel';
panel.hidden=true;

panel.innerHTML=`
<h3>⚔️ Prepara tu equipo</h3>

<p>Selecciona tres Pokémon diferentes
de tu colección online.</p>

<div id="teamSlots"
class="team-slots"></div>

<p id="teamSelectionHint"></p>

<input id="teamSearch"
placeholder="Buscar en mi colección"
autocomplete="off">

<div id="teamChoices"
class="team-grid"></div>

<div class="team-actions">

  <button id="teamSave">
    💾 Guardar equipo
  </button>

  <button id="teamReady">
    ⚔️ ¡Estoy preparado!
  </button>

  <button id="teamUnready" hidden>
    ✏️ Cambiar mi equipo
  </button>

</div>

<h3>👥 Estado de los jugadores</h3>

<div id="teamPlayers"></div>

<button id="teamStart"
style="width:100%" hidden>
  🔥 Iniciar combate
</button>

<p id="teamStatus"
role="status"
aria-live="polite"></p>
`;

el('onlineMembers').after(panel);

let activeSlot=0;

const status=t=>{
  el('teamStatus').textContent=t;
};

function myTeam(){

  return teams.find(
    t=>t.player_id===uid
  );
}

function isReady(){

  return myTeam()?.ready===true;
}

function pokemon(id){

  return catalog.find(
    p=>p.id===id
  );
}

function validTeam(){

  return selected.every(
    id=>id&&owned.includes(id)
  )&&new Set(selected).size===3;
}

function text(tag,value){

  const n=document.createElement(tag);

  n.textContent=value;

  return n;
}

function image(p){

  const img=document.createElement('img');

  img.alt=p.name;
  img.loading='lazy';

  const fallback=()=>{

    const icon=text(
      'div',p.emoji||'✨'
    );

    icon.style.fontSize='36px';

    img.replaceWith(icon);
  };

  img.onerror=fallback;

  if(p.image_url){

    img.src=p.image_url;

    return img;
  }

  return text('div',p.emoji||'✨');
}

function choose(id){

  if(busy||isReady())return;

  if(!owned.includes(id))return;

  if(selected.includes(id)){

    status(
      'No puedes repetir Pokémon en tu equipo.'
    );

    return;
  }

  selected[activeSlot]=id;

  dirty=true;

  const empty=selected.findIndex(
    p=>!p
  );

  if(empty>=0)
    activeSlot=empty;

  draw();

  status(
    validTeam()
    ?'Equipo completo. Guarda o confirma.'
    :'Selecciona otro Pokémon.'
  );
}

function drawSlots(){

  const box=el('teamSlots');

  box.replaceChildren();

  const names=[
    'Titular',
    'Reserva 1',
    'Reserva 2'
  ];

  selected.forEach((id,i)=>{

    const slot=document.createElement('button');

    slot.type='button';

    slot.className='team-slot';

    slot.style.color='white';

    if(activeSlot===i)
      slot.classList.add('active');

    slot.disabled=busy||isReady();

    slot.onclick=()=>{

      activeSlot=i;

      drawSlots();
    };

    slot.append(
      text('small',names[i])
    );

    const p=pokemon(id);

    if(p){

      slot.append(

        image(p),

        text('strong',p.name),

        text('small',p.max_hp+' PV')
      );

    }else{

      const empty=text('div','➕');

      empty.style.fontSize='36px';

      slot.append(

        empty,

        text('strong','Elegir')
      );
    }

    box.append(slot);
  });

  el('teamSelectionHint').textContent=

    isReady()
    ?'🔒 Equipo confirmado'
    :'Seleccionando: '+names[activeSlot];
}

function drawChoices(){

  const box=el('teamChoices');

  box.replaceChildren();

  const search=el('teamSearch')
    .value.trim().toLowerCase();

  for(const p of catalog){

    if(!owned.includes(p.id))
      continue;

    if(search&&!p.name.toLowerCase()
      .includes(search))
      continue;

    const card=document.createElement('button');

    card.type='button';

    card.className='team-choice';

    card.style.setProperty(
      '--rarity',
      colors[p.rarity]||'#a78bfa'
    );

    const chosen=selected.includes(p.id);

    if(chosen)
      card.classList.add('selected');

    card.disabled=
      busy||isReady()||chosen;

    card.append(

      image(p),

      text('strong',p.name),

      text('small',p.max_hp+' PV'),

      text('div',
        chosen
        ?'✓ Elegido'
        :rarities[p.rarity]||p.rarity
      )
    );

    card.onclick=()=>choose(p.id);

    box.append(card);
  }
}

function drawPlayers(){

  const box=el('teamPlayers');

  box.replaceChildren();

  for(const player of session?.players||[]){

    const team=teams.find(
      t=>t.player_id===player.player_id
    );

    const row=document.createElement('div');

    row.className='team-player';

    row.append(
      text('strong',
        player.nickname||'Jugador'
      )
    );

    const ready=team?.ready===true;

    const label=text('p',

      ready
      ?'🟢 Preparado'
      :team
      ?'🟡 Equipo guardado'
      :'⚪ Seleccionando equipo'
    );

    row.append(label);

    box.append(row);
  }

  if((session?.players||[]).length<2){

    box.append(
      text('p',
        '⏳ Esperando al segundo jugador...'
      )
    );
  }
}

function draw(){

  drawSlots();
  drawChoices();
  drawPlayers();

  const ready=isReady();

  const complete=validTeam();

  el('teamSave').hidden=ready;

  el('teamReady').hidden=ready;

  el('teamUnready').hidden=!ready;

  el('teamSave').disabled=
    busy||!complete;

  el('teamReady').disabled=
    busy||!complete;

  el('teamUnready').disabled=busy;

  const bothReady=
    teams.length===2&&
    teams.every(t=>t.ready===true)&&
    session?.players?.length===2;

  el('teamStart').hidden=
    !session?.is_host;

  el('teamStart').disabled=
    busy||!bothReady;
}

async function connect(){

  if(!window.supabase)
    throw Error('Supabase no disponible');

  db ||= window.supabase.createClient(

    'https://bwupxxeeaewdstjzmwob.supabase.co',

    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
  );

  const {session:authSession}=check(
    await db.auth.getSession()
  );

  if(!authSession)return false;

  const {user}=check(
    await db.auth.getUser()
  );

  if(uid!==user.id){

    uid=user.id;

    roomId=null;

    dirty=false;

    selected=['','',''];
  }

  return true;
}

async function refresh(){

  if(reading||busy)return;

  if(el('online').classList.contains('hidden')
    ||el('onlineRoom').hidden){

    panel.hidden=true;

    return;
  }

  reading=true;

  try{

    if(!await connect())return;

    const code=el('onlineRoomCode')
      .textContent.match(/\d{6}/)?.[0];

    if(!code)return;

    const recovery=check(
      await db.rpc('recover_game_session')
    );

    const current=(recovery.sessions||[])
      .find(s=>s.code===code);

    if(!current
      ||current.game_type!=='pokemon'
      ||current.room_status!=='waiting'){

      panel.hidden=true;

      return;
    }

    const changed=roomId!==current.room_id;

    if(changed){

      roomId=current.room_id;

      selected=['','',''];

      activeSlot=0;

      dirty=false;

      catalog=[];

      owned=[];

      teams=[];
    }

    session=current;

    check(await db.rpc(
      'initialize_player_inventory'
    ));

    const results=await Promise.all([

      db.from('pokemon_catalog')
        .select('*')
        .order('name'),

      db.from('player_collection')
        .select('pokemon_id,quantity')
        .eq('player_id',uid),

      db.from('pokemon_teams')
        .select('*')
        .eq('room_id',roomId)

    ]);

    const [c,o,t]=results.map(check);

    if(el('onlineRoom').hidden
      ||!el('onlineRoomCode')
      .textContent.includes(code))
      return;

    catalog=c;

    owned=o.filter(
      p=>Number(p.quantity)>0
    ).map(p=>p.pokemon_id);

    teams=t;

    const mine=myTeam();

    if(!dirty||mine?.ready){

      selected=mine

      ?[
        mine.pokemon_1,
        mine.pokemon_2,
        mine.pokemon_3
      ]

      :['','',''];

      dirty=false;
    }

    panel.hidden=false;

    draw();

    if(changed){

      status(
        'Selecciona tu equipo de combate.'
      );
    }

  }catch(e){

    status(e.message||'Error al cargar equipos');

  }finally{

    reading=false;
  }
}

async function saveTeam(ready){

  if(busy||reading||!roomId)return;

  if(!validTeam()){

    status(
      'Selecciona tres Pokémon diferentes.'
    );

    return;
  }

  busy=true;

  draw();

  try{

    const result=check(
      await db.rpc('set_pokemon_team',{

        p_room_id:roomId,

        p_pokemon_1:selected[0],

        p_pokemon_2:selected[1],

        p_pokemon_3:selected[2],

        p_ready:ready
      })
    );

    if(result.success===false)
      throw Error(
        result.error||'No se pudo guardar'
      );

    dirty=false;

    status(
      ready
      ?'🟢 ¡Estás preparado para combatir!'
      :'💾 Equipo guardado correctamente.'
    );

  }catch(e){

    status(e.message||'Error al guardar');

  }finally{

    busy=false;

    await refresh();

    draw();
  }
}

async function startMatch(){

  if(busy||reading||!roomId)return;

  if(!session?.is_host)return;

  if(teams.length!==2
    ||!teams.every(t=>t.ready))
    return;

  if(!confirm(
    '¿Iniciar el combate Pokémon?'
  ))return;

  busy=true;

  draw();

  try{

    const result=check(
      await db.rpc('start_pokemon_match',{

        p_room_id:roomId
      })
    );

    if(result.success===false)
      throw Error(
        result.error||'No se pudo iniciar'
      );

    dirty=false;

    status(
      '🔥 Combate creado correctamente.'
    );

    alert(
      '¡Combate iniciado! El tablero jugable se integrará en el siguiente paso.'
    );

  }catch(e){

    status(e.message||'Error al iniciar');

  }finally{

    busy=false;

    await refresh();
  }
}

el('teamSearch').oninput=drawChoices;

el('teamSave').onclick=()=>{
  saveTeam(false);
};

el('teamReady').onclick=()=>{
  saveTeam(true);
};

el('teamUnready').onclick=()=>{
  saveTeam(false);
};

el('teamStart').onclick=startMatch;

setInterval(refresh,3000);

})();
