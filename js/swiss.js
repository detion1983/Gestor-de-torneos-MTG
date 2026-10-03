/*
 * swiss.js
 * Logica de torneos: emparejamiento suizo, byes y calculo de clasificacion
 * con los desempates habituales de DCI (OMW%, GW%, OGW%).
 *
 * Sistema de puntos (por defecto, formato competitivo):
 *   Victoria = 3, Empate = 1, Derrota = 0.
 * El bye cuenta como victoria para el jugador que lo recibe.
 */

const Swiss = (() => {
    // Constantes de puntuacion configurables por torneo.
    const DEFAULT_POINTS = { win: 3, draw: 1, loss: 0 };

    function newId() {
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    // ------------------------------------------------------------------
    // FACTORY: crea un torneo nuevo con estructura consistente
    // ------------------------------------------------------------------
    function createTournament(data) {
        return {
            id: newId(),
            name: data.name || 'Torneo sin nombre',
            date: data.date || '',
            location: data.location || '',
            organizer: data.organizer || '',
            format: data.format || 'Standard',
            // Planificacion definida por el organizador al crear el torneo:
            //   roundCount:   numero de rondas suizas planificadas (0 = sin limite)
            //   topSize:      tamano de la eliminatoria directa (0 = sin Top)
            //   roundMinutes: duracion de cada ronda en minutos (0 = sin tiempo fijo)
            roundCount: normalizeRoundCount(data.roundCount),
            topSize: normalizeTopSize(data.topSize),
            roundMinutes: normalizeRoundMinutes(data.roundMinutes),
            status: 'open', // 'open' | 'running' | 'closed'
            createdAt: new Date().toISOString(),
            players: [], // { id, name, dropped }
            rounds: [],  // [{ number, pairings: [{ table, p1Id, p2Id, result, reported }] }]
        };
    }

    // Numero de rondas planificado: entero >= 0 (0 o invalido = sin limite).
    function normalizeRoundCount(value) {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return Math.min(n, 99);
    }

    // Tamano del Top: solo 0 (sin Top), 2, 4 u 8.
    function normalizeTopSize(value) {
        const n = parseInt(value, 10);
        if (n === 2 || n === 4 || n === 8) return n;
        return 0;
    }

    // Duracion de ronda en minutos: entero entre 1 y 240 (0 = sin tiempo fijo).
    function normalizeRoundMinutes(value) {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return Math.min(n, 240);
    }

    // Numero de rondas planificado de un torneo (0 = sin limite). Admite
    // torneos antiguos sin el campo.
    function plannedRounds(tournament) {
        return normalizeRoundCount(tournament && tournament.roundCount);
    }

    // Tamano del Top configurado (0 = sin Top).
    function plannedTop(tournament) {
        return normalizeTopSize(tournament && tournament.topSize);
    }

    // Duracion de ronda configurada en minutos (0 = sin tiempo fijo). Admite
    // torneos antiguos sin el campo.
    function plannedMinutes(tournament) {
        return normalizeRoundMinutes(tournament && tournament.roundMinutes);
    }

    // Comprueba si ya se han generado todas las rondas planificadas.
    function isScheduleComplete(tournament) {
        const planned = plannedRounds(tournament);
        if (!planned) return false; // sin limite -> nunca se completa por agenda
        return tournament.rounds.length >= planned;
    }

    function addPlayer(tournament, name) {
        const clean = (name || '').trim();
        if (!clean) return null;
        const exists = tournament.players.some(
            (p) => p.name.toLowerCase() === clean.toLowerCase()
        );
        if (exists) return null;
        const player = { id: newId(), name: clean, dropped: false };
        tournament.players.push(player);
        return player;
    }

    // ------------------------------------------------------------------
    // EMPAREJAMIENTO SUIZO
    // Agrupa jugadores activos por puntuacion descendente, empareja evitando
    // repetir rival cuando sea posible; numero impar -> bye al de menor
    // puntuacion que aun no haya recibido bye.
    // ------------------------------------------------------------------

    // ¿Dos jugadores comparten EXACTAMENTE el mismo standing? (mismos puntos
    // y mismos desempates). Sirve para sortear el bye entre empatados.
    // Ademas, si el candidato ya recibio bye antes, no se considera "empatado"
    // para evitar repetirselo mientras haya otros sin bye.
    function sameStanding(a, b, byed) {
        if (byed && (byed.has(a.player.id) !== byed.has(b.player.id))) return false;
        return (
            a.matchPoints === b.matchPoints &&
            a.omw === b.omw &&
            a.gameWinPct === b.gameWinPct &&
            a.ogw === b.ogw
        );
    }

    // Elige un indice al azar de una lista (sorteo). Devuelve null si vacia.
    function pickRandom(indexes) {
        if (!indexes || indexes.length === 0) return null;
        return indexes[Math.floor(Math.random() * indexes.length)];
    }

    function generateRound(tournament, points) {
        // REGLA DEL SISTEMA SUIZO: no se puede emparejar una ronda nueva si la
        // ronda anterior tiene partidas sin resultado (incluye byes, que ya nacen
        // reportados). Los emparejamientos dependen de los resultados previos.
        if (tournament.rounds.length > 0) {
            const last = tournament.rounds[tournament.rounds.length - 1];
            if (!isRoundComplete(last)) return null;
        }

        // Limite de rondas planificado por el organizador: si ya se generaron
        // todas las rondas previstas, no se crea ninguna mas.
        if (isScheduleComplete(tournament)) return null;

        const standings = calculateStandings(tournament, points);
        const active = standings.filter((s) => !s.player.dropped);

        if (active.length < 2) return null; // no hay suficientes jugadores

        const roundNumber = tournament.rounds.length + 1;
        const pairings = [];
        let byePlayer = null;

        const faced = buildFacedMap(tournament);
        const byed = buildByeSet(tournament);

        const pool = active.slice(); // ordenado por standings (mejor -> peor)
        if (pool.length % 2 !== 0) {
            // ESTILO WIZARDS: el bye va al PEOR clasificado que aun no haya
            // recibido bye. Como `pool` esta ordenado de mejor a peor, el peor
            // es el ultimo NO byeado. Si varios comparten EXACTAMENTE el mismo
            // standing (puntos y desempates), se sortea entre ellos (aleatorio),
            // igual que hace el software oficial al no haber criterio objetivo.
            // Solo si TODOS los activos ya recibieron bye (caso irreal en un
            // torneo normal) se repite, eligiendo al peor de todos.
            let lastIdx = -1;
            for (let i = pool.length - 1; i >= 0; i--) {
                if (!byed.has(pool[i].player.id)) { lastIdx = i; break; }
            }
            if (lastIdx === -1) lastIdx = pool.length - 1; // todos byeados: peor a secas

            const worst = pool[lastIdx];
            // Candidatos empatados en el mismo standing que el peor elegible.
            const tied = [];
            for (let i = 0; i < pool.length; i++) {
                if (sameStanding(pool[i], worst, byed)) tied.push(i);
            }
            const pickIdx = pickRandom(tied);
            byePlayer = pool.splice(pickIdx === null ? lastIdx : pickIdx, 1)[0];
        }

        const used = new Set();
        let table = 1;
        for (let i = 0; i < pool.length; i++) {
            if (used.has(pool[i].player.id)) continue;
            const a = pool[i];
            used.add(a.player.id);

            let opponentIndex = -1;
            for (let j = i + 1; j < pool.length; j++) {
                if (used.has(pool[j].player.id)) continue;
                if (!hasFaced(faced, a.player.id, pool[j].player.id)) {
                    opponentIndex = j;
                    break;
                }
            }
            if (opponentIndex === -1) {
                for (let j = i + 1; j < pool.length; j++) {
                    if (!used.has(pool[j].player.id)) {
                        opponentIndex = j;
                        break;
                    }
                }
            }
            if (opponentIndex === -1) continue;

            const b = pool[opponentIndex];
            used.add(b.player.id);
            pairings.push({
                table: table++,
                p1Id: a.player.id,
                p2Id: b.player.id,
                result: null,
                reported: false,
            });
        }

        if (byePlayer) {
            pairings.push({
                table: table++,
                p1Id: byePlayer.player.id,
                p2Id: null,
                result: 'bye',
                reported: true,
            });
        }

        const round = { number: roundNumber, pairings };
        tournament.rounds.push(round);
        if (tournament.status === 'open') tournament.status = 'running';
        return round;
    }

    // ------------------------------------------------------------------
    // ESTADO DE RONDA
    // Una ronda esta completa cuando todas sus mesas tienen resultado.
    // Los byes nacen con reported=true, por lo que no cuentan como pendientes.
    // ------------------------------------------------------------------
    function isRoundComplete(round) {
        if (!round) return true;
        return round.pairings.every((pr) => pr.p2Id === null || pr.reported);
    }

    // Numero de partidas de una ronda aun sin resultado (excluye byes).
    function pendingCount(round) {
        if (!round) return 0;
        return round.pairings.filter((pr) => pr.p2Id !== null && !pr.reported).length;
    }

    // Total de partidas jugables de una ronda (excluye byes).
    function playableCount(round) {
        if (!round) return 0;
        return round.pairings.filter((pr) => pr.p2Id !== null).length;
    }

    function buildFacedMap(tournament) {
        const map = new Map();
        tournament.players.forEach((p) => map.set(p.id, new Set()));
        tournament.rounds.forEach((round) => {
            round.pairings.forEach((pr) => {
                if (pr.p2Id) {
                    map.get(pr.p1Id) && map.get(pr.p1Id).add(pr.p2Id);
                    map.get(pr.p2Id) && map.get(pr.p2Id).add(pr.p1Id);
                }
            });
        });
        return map;
    }

    function hasFaced(faced, aId, bId) {
        const set = faced.get(aId);
        return set ? set.has(bId) : false;
    }

    function buildByeSet(tournament) {
        const set = new Set();
        tournament.rounds.forEach((round) => {
            round.pairings.forEach((pr) => {
                if (pr.p2Id === null && pr.p1Id) set.add(pr.p1Id);
            });
        });
        return set;
    }

    // ------------------------------------------------------------------
    // RESULTADOS
    // El organizador introduce el marcador exacto de games, estilo DCI.
    // Todas las combinaciones posibles de una ronda al mejor de 3 (Bo3):
    //   Victoria P1: '2-0'  '2-1'  '1-0'  (rival concede / no se presenta)
    //   Empate:      '1-1'  (por tiempo / tablas)
    //   Victoria P2: '0-1'  (rival concede / no se presenta)  '0-2'  '1-2'
    // Se guarda el marcador real para que GW% y OGW% sean correctos.
    // Internamente se deriva el ganador: 'p1' | 'p2' | 'draw'.
    // ------------------------------------------------------------------
    const SCORES = ['2-0', '2-1', '1-0', '1-1', '0-1', '0-2', '1-2'];

    // Devuelve los games ganados por cada lado a partir del marcador.
    function parseScore(score) {
        if (!score) return null;
        if (score === 'bye') return { p1: 2, p2: 0, draws: 0, winner: 'p1' };
        const parts = score.split('-').map((n) => parseInt(n, 10));
        if (parts.length === 2) {
            // '2-0' / '2-1' / '0-2' / '1-2' -> victoria por games.
            // '1-1' -> empate (partida detenida por tiempo sin desempate).
            return {
                p1: parts[0],
                p2: parts[1],
                draws: 0,
                winner: parts[0] > parts[1] ? 'p1' : (parts[1] > parts[0] ? 'p2' : 'draw'),
            };
        }
        // Formato de 3 partes (p. ej. '1-1-1'): cada lado gana 1 game y hay draws.
        // Se mantiene por compatibilidad con torneos antiguos; el marcador jugado
        // siempre resulta en empate.
        return { p1: parts[0], p2: parts[1], draws: parts[2] || 0, winner: 'draw' };
    }

    function setResult(tournament, roundNumber, table, score) {
        const round = tournament.rounds.find((r) => r.number === roundNumber);
        if (!round) return;
        const pairing = round.pairings.find((p) => p.table === table);
        if (!pairing || pairing.p2Id === null) return; // bye no editable
        const parsed = parseScore(score);
        if (!parsed) return;
        pairing.score = score;          // marcador exacto: '2-0', '2-1', '1-1', ...
        pairing.result = parsed.winner; // 'p1' | 'p2' | 'draw'
        pairing.reported = true;
    }

    // Deshace el resultado de un emparejamiento (lo devuelve a "pendiente").
    function clearResult(tournament, roundNumber, table) {
        const round = tournament.rounds.find((r) => r.number === roundNumber);
        if (!round) return;
        const pairing = round.pairings.find((p) => p.table === table);
        if (!pairing || pairing.p2Id === null) return;
        pairing.score = null;
        pairing.result = null;
        pairing.reported = false;
    }

    // ------------------------------------------------------------------
    // DESHACER ULTIMA RONDA
    // Elimina por completo la ultima ronda generada (con todos sus
    // resultados) para poder volver a introducirlos en caso de fallo humano.
    // Solo se permite si no se ha generado ya la eliminacion directa.
    // Devuelve la ronda eliminada, o null si no se pudo deshacer.
    // ------------------------------------------------------------------
    function undoLastRound(tournament) {
        if (!tournament || tournament.playoff) return null; // suiza ya cerrada
        if (tournament.rounds.length === 0) return null;
        const removed = tournament.rounds.pop();
        // Si ya no quedan rondas suizas, el torneo vuelve a estado 'open'.
        if (tournament.rounds.length === 0) {
            tournament.status = 'open';
        } else if (tournament.status === 'closed') {
            // Se habia cerrado sin Top: al deshacer una ronda se reabre.
            tournament.status = 'running';
        }
        return removed;
    }

    // Deshace la ultima ronda de la eliminatoria directa (Top 4/8).
    // Elimina esa ronda y su resultado; si se habia coronado campeon, lo limpia.
    // Devuelve la ronda eliminada, o null si no se pudo deshacer.
    function undoLastPlayoffRound(tournament) {
        const p = tournament && tournament.playoff;
        if (!p || p.rounds.length === 0) return null;
        const removed = p.rounds.pop();
        // Al quitar una ronda, el champion depende de ella: se recalcula.
        const last = p.rounds[p.rounds.length - 1];
        p.championId = (last && last.matches.length === 1 &&
            last.matches[0].winnerId) ? last.matches[0].winnerId : null;
        // Si se vacia toda la eliminatoria, se reabre la fase suiza.
        if (p.rounds.length === 0) {
            tournament.playoff = null;
            tournament.status = 'running';
        }
        return removed;
    }

    // ------------------------------------------------------------------
    // CLASIFICACION (STANDINGS) CON DESEMPATES DCI
    //   Match Points -> puntos de partido
    //   OMW%  -> % victorias de los rivales
    //   GW%   -> % de partidas ganadas
    //   OGW%  -> % partidas de los rivales
    // ------------------------------------------------------------------
    function calculateStandings(tournament, points) {
        const pts = points || DEFAULT_POINTS;
        const stats = new Map();

        tournament.players.forEach((player) => {
            stats.set(player.id, {
                player,
                matchPoints: 0,
                matchesWon: 0,
                matchesDrawn: 0,
                matchesLost: 0,
                byeCount: 0,
                gamesWon: 0,
                gamesDrawn: 0,
                gamesLost: 0,
                opponents: [],
            });
        });

        tournament.rounds.forEach((round) => {
            round.pairings.forEach((pr) => {
                if (!pr.reported && pr.result !== 'bye') return;
                const a = stats.get(pr.p1Id);
                if (!a) return;

                if (pr.p2Id === null) { // bye
                    a.matchPoints += pts.win;
                    a.matchesWon += 1;
                    a.byeCount += 1;
                    return;
                }

                const b = stats.get(pr.p2Id);
                if (!b) return;

                a.opponents.push(b.player.id);
                b.opponents.push(a.player.id);

                const games = scoreToGames(pr);
                a.gamesWon += games.p1Wins;
                a.gamesLost += games.p2Wins;
                b.gamesWon += games.p2Wins;
                b.gamesLost += games.p1Wins;
                if (games.draws) {
                    a.gamesDrawn += games.draws;
                    b.gamesDrawn += games.draws;
                }

                if (pr.result === 'p1') {
                    a.matchPoints += pts.win;
                    a.matchesWon += 1;
                    b.matchPoints += pts.loss;
                    b.matchesLost += 1;
                } else if (pr.result === 'p2') {
                    b.matchPoints += pts.win;
                    b.matchesWon += 1;
                    a.matchPoints += pts.loss;
                    a.matchesLost += 1;
                } else if (pr.result === 'draw') {
                    a.matchPoints += pts.draw;
                    a.matchesDrawn += 1;
                    b.matchPoints += pts.draw;
                    b.matchesDrawn += 1;
                }
            });
        });

        const list = Array.from(stats.values());
        list.forEach((s) => {
            s.matchWinPct = matchWinPct(s);
            s.gameWinPct = gameWinPct(s);
        });
        list.forEach((s) => {
            s.omw = opponentsAverage(s, list, 'matchWinPct');
            s.ogw = opponentsAverage(s, list, 'gameWinPct');
        });

        list.sort((x, y) => {
            if (y.matchPoints !== x.matchPoints) return y.matchPoints - x.matchPoints;
            if (y.omw !== x.omw) return y.omw - x.omw;
            if (y.gameWinPct !== x.gameWinPct) return y.gameWinPct - x.gameWinPct;
            if (y.ogw !== x.ogw) return y.ogw - x.ogw;
            return x.player.name.localeCompare(y.player.name, 'es');
        });

        list.forEach((s, i) => (s.rank = i + 1));
        return list;
    }

    function matchWinPct(s) {
        const played = s.matchesWon + s.matchesDrawn + s.matchesLost;
        if (played === 0) return 0;
        const pct = (s.matchesWon + s.matchesDrawn / 2) / played;
        return Math.max(pct, 0.33);
    }

    function gameWinPct(s) {
        const played = s.gamesWon + s.gamesDrawn + s.gamesLost;
        if (played === 0) return 0;
        const pct = (s.gamesWon + s.gamesDrawn / 2) / played;
        return Math.max(pct, 0.33);
    }

    function opponentsAverage(s, list, field) {
        const opps = s.opponents
            .map((id) => list.find((x) => x.player.id === id))
            .filter(Boolean);
        if (opps.length === 0) return 0;
        const sum = opps.reduce((acc, o) => acc + o[field], 0);
        return sum / opps.length;
    }

    // Marcador guardado -> games ganados por cada lado.
    function scoreToGames(pairing) {
        const parsed = parseScore(pairing.score || fallbackScore(pairing.result));
        if (!parsed) return { p1Wins: 0, p2Wins: 0, draws: 0 };
        return { p1Wins: parsed.p1, p2Wins: parsed.p2, draws: parsed.draws };
    }

    // Compatibilidad con torneos antiguos que solo guardaban 'p1'/'p2'/'draw'.
    function fallbackScore(result) {
        if (result === 'p1') return '2-0';
        if (result === 'p2') return '0-2';
        if (result === 'draw') return '1-1';
        return null;
    }

    // ------------------------------------------------------------------
    // ELIMINACION DIRECTA (TOP 2 / TOP 4 / TOP 8) — estilo DCI
    // Se genera a partir de la clasificacion final de la fase suiza.
    // Emparejamiento por seeds:
    //   Top 8: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6  -> cuartos -> semis -> final
    //   Top 4: 1 vs 4, 2 vs 3                  -> semis -> final
    //   Top 2: 1 vs 2                          -> final directa
    // ------------------------------------------------------------------
    function generatePlayoff(tournament, size) {
        size = normalizeTopSize(size);
        if (!size) return null;
        const standings = calculateStandings(tournament);
        if (standings.length < size) return null;

        const seeds = standings.slice(0, size).map((s) => s.player.id);

        // Orden de enfrentamientos por seed (indices 0-based).
        let order;
        let roundName;
        if (size === 8) {
            order = [[0, 7], [3, 4], [1, 6], [2, 5]];
            roundName = 'Cuartos de final';
        } else if (size === 4) {
            order = [[0, 3], [1, 2]];
            roundName = 'Semifinales';
        } else { // size === 2
            order = [[0, 1]];
            roundName = 'Final';
        }

        const matches = order.map((pair, i) => ({
            slot: i + 1,
            p1Id: seeds[pair[0]],
            p2Id: seeds[pair[1]],
            p1Seed: pair[0] + 1,
            p2Seed: pair[1] + 1,
            score: null,
            winnerId: null,
        }));

        tournament.playoff = {
            size: size,
            createdAt: new Date().toISOString(),
            championId: null,
            rounds: [{ name: roundName, matches: matches }],
        };
        tournament.status = 'closed';
        return tournament.playoff;
    }

    // Avanza la eliminatoria: si todos los partidos de la ultima ronda tienen
    // ganador, crea la siguiente ronda. Si era la final, marca campeon.
    function advancePlayoff(tournament) {
        const p = tournament.playoff;
        if (!p) return null;

        const last = p.rounds[p.rounds.length - 1];
        if (last.matches.some((m) => !m.winnerId)) return null; // faltan resultados

        const winners = last.matches.map((m) => m.winnerId);

        if (winners.length === 1) {
            p.championId = winners[0];
            return { champion: true };
        }

        const nextName = winners.length === 2 ? 'Final' : 'Semifinales';
        const nextMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
            nextMatches.push({
                slot: i / 2 + 1,
                p1Id: winners[i],
                p2Id: winners[i + 1],
                p1Seed: null,
                p2Seed: null,
                score: null,
                winnerId: null,
            });
        }
        p.rounds.push({ name: nextName, matches: nextMatches });
        return { next: true };
    }

    // Registra el resultado de un partido de eliminatoria.
    function setPlayoffResult(tournament, roundIndex, slot, score) {
        const p = tournament.playoff;
        if (!p) return;
        const round = p.rounds[roundIndex];
        if (!round) return;
        const match = round.matches.find((m) => m.slot === slot);
        if (!match) return;
        const parsed = parseScore(score);
        if (!parsed) return;
        match.score = score;
        match.winnerId = parsed.winner === 'p1' ? match.p1Id : match.p2Id;
    }

    // Deshace el resultado de un partido de eliminatoria.
    function clearPlayoffResult(tournament, roundIndex, slot) {
        const p = tournament.playoff;
        if (!p) return;
        const round = p.rounds[roundIndex];
        if (!round) return;
        const match = round.matches.find((m) => m.slot === slot);
        if (!match) return;
        match.score = null;
        match.winnerId = null;
    }

    return {
        DEFAULT_POINTS,
        SCORES,
        parseScore,
        newId,
        createTournament,
        normalizeRoundCount,
        normalizeTopSize,
        normalizeRoundMinutes,
        plannedRounds,
        plannedTop,
        plannedMinutes,
        isScheduleComplete,
        addPlayer,
        generateRound,
        isRoundComplete,
        pendingCount,
        playableCount,
        setResult,
        clearResult,
        undoLastRound,
        undoLastPlayoffRound,
        calculateStandings,
        generatePlayoff,
        advancePlayoff,
        setPlayoffResult,
        clearPlayoffResult,
    };
})();
