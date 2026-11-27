
(() => {
  'use strict';

  if (window.LiamcitoEffects) return;

  const layer = document.createElement('div');
  layer.className = 'lg-fx-layer';
  layer.setAttribute('aria-hidden','true');
  document.body.append(layer);

  const colors = {
    fire:'#fb923c',
    water:'#38bdf8',
    electric:'#facc15',
    grass:'#4ade80',
    psychic:'#c084fc',
    ice:'#a5f3fc',
    poison:'#c084fc',
    dragon:'#818cf8',
    fighting:'#f87171',
    normal:'#e2e8f0',
    dark:'#a78bfa',
    ghost:'#a78bfa',
    rock:'#d6b68a',
    ground:'#d6b68a',
    steel:'#94a3b8',
    fairy:'#f9a8d4',
    bug:'#bef264',
    flying:'#7dd3fc'
  };

  function point(target) {
    const rect = target?.getBoundingClientRect();

    if (!rect) {
      return {
        x:innerWidth/2,
        y:innerHeight/2
      };
    }

    return {
      x:rect.left+rect.width/2,
      y:rect.top+rect.height/2
    };
  }

  function element(tag,cls,x,y,color) {
    const item = document.createElement(tag);

    item.className = cls;
    item.style.left = x+'px';
    item.style.top = y+'px';

    if (color) item.style.color = color;

    layer.append(item);

    item.addEventListener(
      'animationend',
      () => item.remove(),
      {once:true}
    );

    setTimeout(() => item.remove(),1800);

    return item;
  }

  function particles(target,color,count=18) {
    const p = point(target);

    for (let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2;
      const distance = 30+Math.random()*110;

      const item = element(
        'span',
        'lg-fx-particle',
        p.x,p.y,color
      );

      item.style.setProperty(
        '--fx-x',
        Math.cos(angle)*distance+'px'
      );

      item.style.setProperty(
        '--fx-y',
        Math.sin(angle)*distance+'px'
      );

      item.style.setProperty(
        '--fx-duration',
        (500+Math.random()*450)+'ms'
      );

      item.style.width =
        (6+Math.random()*12)+'px';

      item.style.height = item.style.width;
    }
  }

  function flash(color) {
    const item = element(
      'div','lg-fx-flash',0,0,color
    );

    item.style.background = color;
  }

  function text(target,value,color='#fff') {
    const p = point(target);

    const item = element(
      'div','lg-fx-text',
      p.x,p.y,color
    );

    item.textContent = value;
  }

  function ring(target,color) {
    const p = point(target);

    element(
      'div','lg-fx-ring',
      p.x,p.y,color
    );
  }

  function animate(target,cls) {
    if (!target) return;

    target.classList.remove(cls);
    void target.offsetWidth;
    target.classList.add(cls);

    setTimeout(
      () => target.classList.remove(cls),
      950
    );
  }

  function attack(attacker,defender,options={}) {
    const type = options.element || 'normal';
    const color = colors[type] || '#e2e8f0';
    const action = options.action || 'normal';

    animate(attacker,'lg-fx-attack');

    if (action==='ultimate') {
      flash(color);
      ring(defender,color);
      particles(defender,color,35);
    } else if (
      action==='elemental' ||
      action==='strong'
    ) {
      particles(defender,color,24);
    } else {
      particles(defender,color,12);
    }

    if (options.missed) {
      text(defender,'¡FALLÓ!','#facc15');
      return;
    }

    animate(defender,'lg-fx-shake');

    if (options.damage>0) {
      text(
        defender,
        '-'+options.damage,
        options.critical?'#facc15':'#fff'
      );
    }

    if (options.critical) {
      flash('#facc15');
      text(defender,'¡CRÍTICO!','#facc15');
    }
  }

  function heal(target,amount) {
    animate(target,'lg-fx-heal');
    particles(target,'#4ade80',22);
    text(target,'+'+amount,'#4ade80');
  }

  function shield(target) {
    animate(target,'lg-fx-shield');
    ring(target,'#38bdf8');
    particles(target,'#38bdf8',18);
  }

  function victory(target) {
    particles(target,'#facc15',45);
    particles(target,'#c084fc',30);
    flash('#facc15');
    text(target,'🏆 ¡VICTORIA!','#facc15');
  }

  window.LiamcitoEffects = {
    attack,
    heal,
    shield,
    victory,
    particles,
    text
  };

  console.info(
    'Liamcito GameStore · Efectos Pokémon V1'
  );

})();
