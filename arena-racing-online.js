
(()=>{
'use strict';

const root=document.getElementById('onlineRoom');
if(!root)return;

const panel=document.createElement('section');
panel.id='onlineRacingTrack';
panel.hidden=true;
panel.style.cssText='margin:18px 0;padding:14px;border:2px solid #38bdf8;border-radius:18px;background:#0c1739;text-align:center';

panel.innerHTML=`
<h3>🏁 Turbo Racing · Dos jugadores</h3>
<p id="onlineRaceNames"></p>
<p style="color:#fde68a;font-size:13px">
PRUEBA DE CONTROLES · Los movimientos todavía no se transmiten al otro celular.
</p>
<canvas id="onlineRaceCanvas" width="400" height="460"
style="display:block;width:100%;max-width:400px;margin:auto;border-radius:14px;background:#111827"></canvas>
<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
<button id="onlineRaceLeft" type="button">◀ Izquierda</button>
<button id="onlineRaceRight" type="button">Derecha ▶</button>
</div>

<div style="margin:12px auto;max-width:400px">
  <button
    id="onlineRaceAccelerate"
    type="button"
    style="width:100%;background:linear-gradient(135deg,#22c55e,#eab308);touch-action:none;user-select:none"
  >
    🔥 MANTENER PARA ACELERAR
  </button>
  <p id="onlineRaceSpeed" style="font-weight:bold">
    Velocidad: 0 km/h
  </p>
  <p id="onlineRivalSpeed" style="color:#67e8f9;font-weight:bold">
  Rival: 0 km/h
</p>
</div>

<p id="onlineRaceNotice" aria-live="polite">
Prueba los controles de tu vehículo.
</p>`;

root.append(panel);

const canvas=panel.querySelector('canvas');
const ctx=canvas.getContext('2d');
const left=panel.querySelector('#onlineRaceLeft');
const right=panel.querySelector('#onlineRaceRight');

let lane=1;
let otherLane=1;
let number=1;
let names=['Jugador 1','Jugador 2'];
let animation=0;
let frame=0;
let roomId=null;

let accelerating=false;
let raceSpeed=0;
  let rivalSpeed=0;
let lastSpeedSent=0;
let speedFrame=0;
let lastSpeedTime=0;

const accelerateButton=panel.querySelector('#onlineRaceAccelerate');
const speedDisplay=panel.querySelector('#onlineRaceSpeed');

function setAccelerating(value){
  accelerating=Boolean(value)&&!panel.hidden;
  accelerateButton.textContent=accelerating
    ?'🔥 ACELERANDO...'
    :'🔥 MANTENER PARA ACELERAR';
}

accelerateButton.addEventListener('pointerdown',e=>{
  if(panel.hidden)return;
  e.preventDefault();
  accelerateButton.setPointerCapture(e.pointerId);
  setAccelerating(true);
});

for(const eventName of ['pointerup','pointercancel','lostpointercapture']){
  accelerateButton.addEventListener(eventName,()=>{
    setAccelerating(false);
  });
}

function updateRaceSpeed(time){
  const dt=lastSpeedTime
    ?Math.min((time-lastSpeedTime)/1000,0.05)
    :0;

  lastSpeedTime=time;

  if(!panel.hidden &&
     !document.getElementById('online').classList.contains('hidden')){

    const acceleration=accelerating?35:-24;

    raceSpeed=Math.max(
      0,
      Math.min(180,raceSpeed+acceleration*dt)
    );

    speedDisplay.textContent=
      'Velocidad: '+Math.round(raceSpeed)+' km/h';
    
if(
  raceChannel &&
  raceChannel.state==='joined' &&
  time-lastSpeedSent>=200
){
  lastSpeedSent=time;

  raceChannel.send({
    type:'broadcast',
    event:'car_speed',
    payload:{
      player_number:number,
      speed:Math.round(raceSpeed)
    }
  }).catch(console.error);
}

  }else{
    setAccelerating(false);
    lastSpeedTime=0;
  }

  
  speedFrame=requestAnimationFrame(updateRaceSpeed);
}

speedFrame=requestAnimationFrame(updateRaceSpeed);

let raceChannel=null;
let connectedRoom=null;


async function connectRaceRealtime(){
  if(!roomId || !number)return;

  const db=window.arenaOnlineSupabase;

  if(!db){
    console.warn('Supabase todavía no está disponible');
    return;
  }

  if(connectedRoom===roomId && raceChannel)return;

  if(raceChannel){
    await db.removeChannel(raceChannel);
    raceChannel=null;
  }

  connectedRoom=roomId;

  const currentRoom=roomId;

  const channel=db.channel(
    'racing-room-'+currentRoom,
    {
      config:{
        private:true
      }
    }
  );

  raceChannel=channel;

  channel.on('broadcast',{
    event:'car_move'
  },({payload})=>{
    if(roomId!==currentRoom)return;
    if(Number(payload?.player_number)===number)return;

    const nextLane=Number(payload?.lane);

    if(!Number.isInteger(nextLane))return;
    if(nextLane<0 || nextLane>2)return;

    otherLane=nextLane;
  });

channel.on('broadcast',{
  event:'car_speed'
},({payload})=>{
  if(roomId!==currentRoom)return;

  if(Number(payload?.player_number)===number)return;

  const speed=Number(payload?.speed);

  if(!Number.isFinite(speed))return;
  if(speed<0 || speed>180)return;

  rivalSpeed=speed;

  panel.querySelector('#onlineRivalSpeed').textContent=
    'Rival: '+Math.round(rivalSpeed)+' km/h';
});

  channel.subscribe((state,err)=>{
    if(state==='SUBSCRIBED'){
      console.log('🏁 Carrera conectada en tiempo real');
      panel.querySelector('#onlineRaceNotice').textContent=
        '🟢 Conexión online activa';
    }

    if(state==='CHANNEL_ERROR' || state==='TIMED_OUT'){
      console.error('Error Realtime:',err);
      panel.querySelector('#onlineRaceNotice').textContent=
        '⚠️ No se pudo conectar la carrera online';
    }
  });
}

function sendRaceMove(){
  if(!raceChannel || !roomId)return;

  raceChannel.send({
    type:'broadcast',
    event:'car_move',
    payload:{
      player_number:number,
      lane:lane
    }
  }).catch(console.error);
}

function move(delta){
  if(panel.hidden)return;

  lane=Math.max(0,Math.min(2,lane+delta));
sendRaceMove();
  panel.querySelector('#onlineRaceNotice').textContent=
    'Tu carril: '+(lane+1)+' de 3 · Movimiento local de prueba';
}

left.onclick=()=>move(-1);
right.onclick=()=>move(1);

document.addEventListener('keydown',e=>{
  if(
    panel.hidden||
    document.getElementById('online').classList.contains('hidden')
  )return;

  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    e.preventDefault();

    if(!e.repeat){
      move(e.key==='ArrowLeft'?-1:1);
    }
  }
});

function draw(){
  if(
    panel.hidden||
    document.getElementById('online').classList.contains('hidden')
  ){
    animation=0;
    return;
  }

  frame++;

  const w=canvas.width;
  const h=canvas.height;

  const sky=ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,'#16285e');
  sky.addColorStop(.55,'#5a2c83');
  sky.addColorStop(1,'#13162b');

  ctx.fillStyle=sky;
  ctx.fillRect(0,0,w,h);

  ctx.fillStyle='#fcd34d';
  ctx.beginPath();
  ctx.arc(315,72,34,0,Math.PI*2);
  ctx.fill();

  for(let i=0;i<11;i++){
    ctx.fillStyle=i%2?'#192447':'#273665';
    ctx.fillRect(i*42,125-(i%4)*22,32,100);
  }

  ctx.fillStyle='#2b3348';
  ctx.beginPath();
  ctx.moveTo(155,158);
  ctx.lineTo(245,158);
  ctx.lineTo(390,h);
  ctx.lineTo(10,h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle='#f8fafc';
  ctx.lineWidth=4;
  ctx.setLineDash([22,20]);
  ctx.lineDashOffset=-(frame*2)%42;

  for(let i=1;i<3;i++){
    ctx.beginPath();
    ctx.moveTo(155+i*30,158);
    ctx.lineTo(10+i*(380/3),h);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  function car(x,y,color,label){
    ctx.save();
    ctx.translate(x,y);

    ctx.fillStyle='#090d1c';
    ctx.fillRect(-27,-19,10,50);
    ctx.fillRect(17,-19,10,50);

    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.roundRect(-22,-32,44,64,10);
    ctx.fill();

    ctx.fillStyle='#bceaff';
    ctx.fillRect(-15,-17,30,16);

    ctx.fillStyle='#fff7c2';
    ctx.fillRect(-16,23,10,5);
    ctx.fillRect(6,23,10,5);

    ctx.font='bold 15px sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle='white';
    ctx.fillText(label,0,-43);

    ctx.restore();
  }

  const myX=75+lane*125;

  car(
    75+otherLane*125,
    255,
    number===1?'#22d3ee':'#fb7185',
    names[number===1?1:0]
  );

  car(
    myX,
    380,
    number===1?'#fb7185':'#22d3ee',
    'TÚ · '+names[number-1]
  );

  ctx.fillStyle='white';
  ctx.font='bold 16px sans-serif';
  ctx.fillText('VISTA PREVIA · SIN SINCRONIZACIÓN',10,25);

  animation=requestAnimationFrame(draw);
}


function update(detail){
  if(
    !detail||
    detail.game_type!=='racing'||
    detail.room_status!=='playing'
  ){
    panel.hidden=true;
    setAccelerating(false);

    if(animation)cancelAnimationFrame(animation);
    animation=0;
    return;
  }

  const nextId=detail.room_id;

  if(roomId!==nextId){
    roomId=nextId;
    lane=1;
    otherLane=1;
    frame=0;
    raceSpeed=0;
    setAccelerating(false);
  }

  number=Number(detail.player_number)||1;

  const ps=detail.players||[];

  names=[
    ps.find(p=>Number(p.player_number)===1)?.nickname||'Jugador 1',
    ps.find(p=>Number(p.player_number)===2)?.nickname||'Jugador 2'
  ];

  panel.querySelector('#onlineRaceNames').textContent=
    names[0]+' 🆚 '+names[1];

  panel.hidden=false;

  connectRaceRealtime();

  if(!animation)draw();
}

document.addEventListener(
  'arena:online-racing-session',
  e=>update(e.detail)
);

document.addEventListener('arena:section-change',e=>{
  if(e.detail?.section==='online'){
    if(!panel.hidden&&!animation)draw();
  }else if(animation){
    cancelAnimationFrame(animation);
    animation=0;
  }
});

})();
