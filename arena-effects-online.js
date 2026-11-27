
(() => {
  'use strict';

  if (window.LiamcitoOnlineEffects) return;

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
        playerNumber,
        enemyBox,
        myBox,
        finished,
        winnerId,
        userId
      } = data;

      if (!matchId) return;

      const currentVersion = Number(version);

      if (!Number.isFinite(currentVersion)) return;

      /*
        Al entrar a una partida existente,
        guardar la versión sin reproducir
        movimientos anteriores.
      */
      if (!seen.has(matchId)) {
        seen.set(matchId,currentVersion);
        return;
      }

      const previousVersion = seen.get(matchId);

      if (currentVersion<=previousVersion) return;

      seen.set(matchId,currentVersion);

      if (seen.size>MAX_MATCHES) {
        seen.delete(seen.keys().next().value);
      }

      if (!event || !game) return;

      const ownAction =
        Number(event.player)===Number(playerNumber);

      const attacker = ownAction
        ? myBox
        : enemyBox;

      const target = ownAction
        ? enemyBox
        : myBox;

      if (!attacker || !target) return;

      const actorSide = String(event.player);

      const actorPlayer = game.players?.[actorSide];

      const pokemon = actorPlayer?.team?.find(
        p => p.name===event.pokemon
      );

      const element = pokemon?.element || 'normal';

      const action = event.action;

      if (
        ['normal','strong','elemental','ultimate']
          .includes(action)
      ) {
        fx.attack(attacker,target,{
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
          attacker,
          Number(event.healing)
        );
      }

      if (action==='shield') {
        fx.shield(attacker);
      }

      if (action==='boost') {
        fx.particles(attacker,'#c084fc',20);
        fx.text(
          attacker,
          '🚀 POTENCIA',
          '#c084fc'
        );
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

        fx.particles(
          target,
          colors[event.status_applied] || '#fff',
          16
        );
      }

      if (action==='status_skip') {
        fx.text(
          attacker,
          '¡TURNO PERDIDO!',
          '#facc15'
        );
      }

      if (action==='switch') {
        fx.particles(attacker,'#a78bfa',20);
        fx.text(
          attacker,
          '🔄 CAMBIO',
          '#c4b5fd'
        );
      }

      /*
        La celebración solo corresponde
        al ganador confirmado por el servidor.
      */
      if (
        finished &&
        winnerId &&
        userId &&
        winnerId===userId
      ) {
        setTimeout(() => {
          const panel =
            document.getElementById(
              'arenaBattlePanel'
            );

          if (
            panel &&
            !panel.hidden &&
            document.getElementById('online') &&
            !document.getElementById('online')
              .classList.contains('hidden')
          ) {
            const currentFighter =
              panel.querySelector(
                '.ab-fighter.ab-own'
              );

            if (currentFighter) {
              fx.victory(currentFighter);
            }
          }
        },450);
      }

    } catch (error) {
      /*
        Los errores de efectos visuales
        no deben interrumpir el combate.
      */
      console.warn(
        'Efectos multijugador:',
        error
      );
    }
  }

  window.LiamcitoOnlineEffects = {
    play
  };

})();
