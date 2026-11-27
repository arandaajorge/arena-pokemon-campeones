
(() => {
  'use strict';

  if (window.LiamcitoCpuEffects) return;

  const seen = new Map();
  const MAX_MATCHES = 30;

  function play(data) {
    try {
      const fx = window.LiamcitoEffects;

      if (!fx || !data) return;

      const {
        matchId,
        version,
        event,
        game,
        enemyBox,
        myBox,
        finished,
        result
      } = data;

      if (!matchId || !event || !game) {
        if (matchId && !seen.has(matchId)) {
          seen.set(matchId,Number(version));
        }
        return;
      }

      const currentVersion = Number(version);

      if (!Number.isFinite(currentVersion)) return;

      /*
        Primera aparición de una partida:
        establecer referencia sin reproducir
        acciones antiguas al recargar.
      */
      if (!seen.has(matchId)) {
        seen.set(matchId,currentVersion);
        return;
      }

      if (currentVersion<=seen.get(matchId)) {
        return;
      }

      seen.set(matchId,currentVersion);

      if (seen.size>MAX_MATCHES) {
        seen.delete(seen.keys().next().value);
      }

      const actorIsHuman = Number(event.player)===1;

      const actor = actorIsHuman
        ? myBox
        : enemyBox;

      const target = actorIsHuman
        ? enemyBox
        : myBox;

      if (!actor || !target) return;

      const actorPlayer = game.players?.[
        actorIsHuman?'1':'2'
      ];

      /*
        Buscar el Pokémon que realizó la acción.
        Puede no ser el Pokémon activo después
        de un cambio automático.
      */
      const actorPokemon = actorPlayer?.team?.find(
        p => p.name===event.pokemon
      );

      const element =
        actorPokemon?.element || 'normal';

      const action = event.action;

      if (
        ['normal','strong','elemental','ultimate']
          .includes(action)
      ) {
        fx.attack(actor,target,{
          action,
          element,
          damage:Number(event.damage||0),
          missed:!!event.missed,
          critical:!!event.critical
        });
      }

      if (
        action==='heal' &&
        Number(event.healing)>0
      ) {
        fx.heal(
          actor,
          Number(event.healing)
        );
      }

      if (action==='shield') {
        fx.shield(actor);
      }

      if (action==='boost') {
        fx.particles(actor,'#c084fc',20);
        fx.text(actor,'🚀 POTENCIA','#c084fc');
      }

      if (event.status_applied) {
        const colors = {
          burn:'#fb923c',
          freeze:'#a5f3fc',
          paralysis:'#facc15',
          poison:'#c084fc',
          sleep:'#93c5fd',
          confusion:'#e879f9'
        };

        const color =
          colors[event.status_applied] ||
          '#ffffff';

        fx.particles(target,color,16);
      }

      if (action==='status_skip') {
        fx.text(
          actor,
          '¡TURNO PERDIDO!',
          '#facc15'
        );
      }

      /*
        Celebrar únicamente victorias humanas
        confirmadas por el servidor.
      */
      if (finished && result==='win') {
        setTimeout(() => {
          const cpuSection =
            document.getElementById('cpu');

          if (
            cpuSection &&
            !cpuSection.classList.contains('hidden')
          ) {
            fx.victory(myBox);
          }
        },450);
      }

    } catch (error) {
      /*
        Un error visual nunca debe impedir
        jugar o sincronizar una partida.
      */
      console.warn(
        'Efecto CPU no disponible:',
        error
      );
    }
  }

  window.LiamcitoCpuEffects = {
    play
  };

})();
