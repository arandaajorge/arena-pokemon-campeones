
(()=>{
'use strict';

const el=id=>document.getElementById(id);

const modes={
  pokemon:'⚔️ Pokémon',
  chess:'♟️ Ositos vs. Capibaras',
  racing:'🏎️ Turbo Racing',
  tridents:'🔱 Tridentes Acuáticos'
};

const labels={
  waiting:'En espera',
  playing:'En partida',
  finished:'Finalizada'
};

let db,uid,selected=null,busy=false,
reading=false,channel=null,timer=null;

const status=t=>el('onlineStatus').textContent=t;

const check=r=>{
  if(r.error)throw r.error;
  return r.data;
};

const node=(tag,text)=>{
  const n=document.createElement(tag);
  n.textContent=text;
  return n;
};

const button=(text,fn)=>{
  const b=node('button',text);
  b.type='button';
  b.onclick=fn;
  return b;
};

const lobby=el('onlineLobby'),
roomBox=el('onlineRoom');

el('online').querySelector('h2 + p').textContent=
'Crea una sala privada o recupera una partida guardada. Los tableros competitivos se integrarán en los siguientes pasos.';

el('onlineMode').replaceChildren(
  ...Object.entries(modes).map(
    ([v,t])=>new Option(t,v)
  )
);

const sessions=node('div','');
sessions.id='onlineSessions';
sessions.style.margin='16px 0';

const recover=button(
  '🔄 Recuperar partidas',
  ()=>run(async()=>{
    await connect(false);
    await refresh();
  })
);

lobby.append(recover,sessions);

const back=button(
  'Ver mis salas',
  ()=>run(async()=>{
    selected=null;
    await watch();
    await refresh();
  })
);

roomBox.append(back);

// Preparación exclusiva de Turbo Racing Online.
// No modifica las carreras individuales ni otras modalidades.
const racingReadyPanel=node('div','');
racingReadyPanel.id='racingReadyPanel';
racingReadyPanel.style.margin='16px 0';
racingReadyPanel.hidden=true;

const racingReadyInfo=node('p','');
const racingReadyButton=button('✅ Estoy listo',()=>run(async()=>{
  if(!selected||!uid)throw Error('Abre primero una sala de carreras');
  const roomId=selected;
  const nextReady=racingReadyButton.dataset.ready!=='true';
  check(await db.rpc('set_racing_ready',{
    p_room_id:roomId,
    p_ready:nextReady
  }));
  status(nextReady?'Preparación guardada.':'Ya no estás preparado.');
  await refresh();
}));

racingReadyPanel.append(racingReadyInfo,racingReadyButton);
roomBox.append(racingReadyPanel);

async function connect(create){

  if(!window.supabase)
    throw Error('No se pudo cargar Supabase');

  db ||= window.supabase.createClient(
    'https://bwupxxeeaewdstjzmwob.supabase.co',
    'sb_publishable_oeSBm8VNRI5Upna4skkHKg_JOB5rbDU'
  );

  let {session}=check(
    await db.auth.getSession()
  );

  if(!session&&create)
    session=check(
      await db.auth.signInAnonymously()
    ).session;

  if(!session){
    uid=null;
    return false;
  }

  const user=check(
    await db.auth.getUser()
  ).user;

  uid=user.id;

  const profile=check(
    await db.from('players')
    .select('nickname')
    .eq('id',uid)
    .maybeSingle()
  );

  if(profile&&!el('onlineName').value.trim())
    el('onlineName').value=profile.nickname;

  return !!profile;
}

async function run(fn){

  if(busy)return;

  busy=true;

  for(const b of [
    el('onlineCreate'),
    el('onlineJoin'),
    el('onlineLeave'),
    recover,
    back,
    racingReadyButton
  ])b.disabled=true;

  try{
    await fn();
  }catch(e){
    status(e.message||'Error de conexión');
  }finally{

    busy=false;

    for(const b of [
      el('onlineCreate'),
      el('onlineJoin'),
      recover,
      back
    ])b.disabled=false;

    el('onlineLeave').disabled=
      roomBox.dataset.playing==='true';
    racingReadyButton.disabled=
      busy||racingReadyPanel.hidden||racingReadyButton.dataset.member!=='true';
  }
}

async function watch(){

  if(channel){
    await db.removeChannel(channel);
    channel=null;
  }

  if(!selected)return;

  const filter='room_id=eq.'+selected;

  channel=db.channel('arena-ui-'+selected)

  .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'room_players',
    filter
  },()=>refresh())

  .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'game_matches',
    filter
  },()=>refresh())

  .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'game_rooms',
    filter:'id=eq.'+selected
  },()=>refresh())

  .subscribe();
}

async function refresh(){

  if(!uid||reading)return;

  reading=true;

  try{

    const data=check(
      await db.rpc('recover_game_session')
    );

    const rows=data.sessions||[];

    sessions.replaceChildren(
      node('h3','Mis salas guardadas')
    );

    if(!rows.length)
      sessions.append(
        node('p','No tienes salas guardadas.')
      );

    for(const s of rows){

      const card=node('div','');

      card.className='packtile';

      card.style.setProperty(
        '--rare','#a78bfa'
      );

      card.append(

        node('p',
          `${modes[s.game_type]||s.game_type} · ${s.code} · ${labels[s.room_status]||s.room_status}`
        ),

        button('Abrir sala',()=>run(async()=>{
          selected=s.room_id;
          await watch();
          await refresh();
        }))

      );

      sessions.append(card);
    }

    const s=rows.find(
      r=>r.room_id===selected
    );

    if(!s){

      selected=null;
      lobby.hidden=false;
      roomBox.hidden=true;

      status('Sesión sincronizada.');

      return;
    }

    lobby.hidden=true;
    roomBox.hidden=false;

    el('onlineRoomCode').textContent=
      'Código: '+s.code;

    el('onlineRoomMode').textContent=
      (modes[s.game_type]||s.game_type)
      +' · '+
      (labels[s.room_status]||s.room_status);

    const box=el('onlineMembers');

    box.replaceChildren();

    // recover_game_session no garantiza que incluya el campo ready.
    // Se consulta room_players con la política SELECT de miembros.
    let racingPlayers=[];
    if(s.game_type==='racing'){
      racingPlayers=check(await db.from('room_players')
        .select('player_id,player_number,ready')
        .eq('room_id',s.room_id))||[];
    }
    const readyByNumber=new Map(
      racingPlayers.map(p=>[Number(p.player_number),p.ready===true])
    );

    for(const p of s.players||[]){

      box.append(
        node('p',
          `Jugador ${p.player_number??''}: ${p.nickname||'Jugador'}`+
          (s.game_type==='racing'
            ?(readyByNumber.get(Number(p.player_number))?' · ✅ Listo':' · ⏳ No listo')
            :'')
        )
      );
    }

    racingReadyPanel.hidden=!(s.game_type==='racing'&&s.room_status==='waiting');
    if(!racingReadyPanel.hidden){
      const me=racingPlayers.find(p=>p.player_id===uid);
      const myReady=me?.ready===true;
      const readyCount=racingPlayers.filter(p=>p.ready===true).length;
      racingReadyInfo.textContent=`Preparados: ${readyCount}/2`+
        (readyCount===2?' · Ambos listos. Próximamente: iniciar carrera.':'');
      racingReadyButton.dataset.ready=String(myReady);
      racingReadyButton.dataset.member=String(!!me);
      racingReadyButton.textContent=myReady?'↩️ Cancelar listo':'✅ Estoy listo';
      racingReadyButton.disabled=busy||!me;
    }

    if(s.match_id){

      box.append(

        node('p',
          'Partida guardada · versión '+s.version
        ),

        ...(s.game_type==='racing'?[]:[node('p',
          'Turno: jugador '+s.current_turn
        )])

      );

      if(s.game_type==='chess'){

        box.append(
          node('p',
            'Movimientos guardados: '+
            (s.game_state?.moves?.length||0)
          )
        );
      }
    }

    roomBox.dataset.playing=
      String(s.room_status==='playing');

    el('onlineLeave').disabled=
      busy||s.room_status==='playing';

    status(
      s.room_status==='playing'
      ?'Partida recuperada. El tablero jugable aún está pendiente.'
      :s.room_status==='finished'
      ?'Resultado guardado.'
      :s.game_type==='racing'?'Sala sincronizada. Marca Estoy listo para prepararte.'
      :'Sala sincronizada.'
    );

  }catch(e){

    status(
      e.message||'Error de sincronización'
    );

  }finally{

    reading=false;

  }
}

async function enter(join){

  const name=
    el('onlineName').value.trim();

  const code=
    el('onlineCode').value.trim();

  if(!name)
    throw Error('Escribe tu nombre');

  if(join&&!/^\d{6}$/.test(code))
    throw Error('Introduce seis dígitos');

  const exists=await connect(true);

  check(await(
    exists
    ?db.from('players')
       .update({nickname:name})
       .eq('id',uid)
    :db.from('players')
       .insert({id:uid,nickname:name})
  ));

  const s=check(
    await db.rpc(
      join
      ?'join_game_room'
      :'create_game_room',

      join
      ?{p_code:code}
      :{p_game_type:el('onlineMode').value}
    )
  );

  selected=s.room_id;

  await watch();
  await refresh();
}

el('onlineCreate').onclick=
  ()=>run(()=>enter(false));

el('onlineJoin').onclick=
  ()=>run(()=>enter(true));

el('onlineLeave').onclick=
  ()=>run(async()=>{

    if(!selected)return;

    check(await db.rpc(
      'leave_game_room',
      {p_room_id:selected}
    ));

    selected=null;

    await watch();
    await refresh();

  });

async function open(){

  await run(async()=>{

    if(await connect(false)){

      await refresh();

    }else{

      status(
        'Escribe tu nombre para crear o unirte a una sala.'
      );

    }

    if(!timer){

      timer=setInterval(()=>{

        if(
          !el('online').classList.contains('hidden')
          &&!busy
        )refresh();

      },4000);

    }

  });

}

const originalShow=window.show;

window.show=function(id){

  originalShow(id);

  if(id==='online')open();

};

})();
