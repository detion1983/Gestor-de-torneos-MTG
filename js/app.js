/*
 * app.js
 * Controlador de la interfaz. Conecta el DOM con Storage (persistencia) y
 * Swiss (logica de torneos). No contiene reglas de negocio ni de guardado.
 */

const App = (() => {
    // ------------------------------------------------------------------
    // VERSION DE LA APP
    // Cambia SOLO esta linea al publicar una version nueva.
    // Formato recomendado: vMAYOR.MENOR.PARCHE  (p. ej. v1.1.0)
    // ------------------------------------------------------------------
    const APP_VERSION = 'v1.2.0';

    // Estado de la UI
    let currentTournamentId = null;

    // Referencias del DOM
    const el = {};

    function cacheDom() {
        el.viewTournaments = document.getElementById('view-tournaments');
        el.viewDetail = document.getElementById('view-detail');

        el.tournamentForm = document.getElementById('tournamentForm');
        el.tournamentList = document.getElementById('tournamentList');
        el.emptyTournaments = document.getElementById('emptyTournaments');

        el.playerForm = document.getElementById('playerForm');
        el.playerName = document.getElementById('playerName');
        el.knownPlayers = document.getElementById('knownPlayers');
        el.playerList = document.getElementById('playerList');
        el.emptyPlayers = document.getElementById('emptyPlayers');

        el.detailTitle = document.getElementById('detailTitle');
        el.roundsContainer = document.getElementById('roundsContainer');
        el.standingsBody = document.querySelector('#standingsTable tbody');

        el.generateRoundButton = document.getElementById('generateRoundButton');
        el.undoRoundButton = document.getElementById('undoRoundButton');
        el.backButton = document.getElementById('backButton');
        el.deleteTournamentButton = document.getElementById('deleteTournamentButton');
        el.exportButton = document.getElementById('exportButton');
        el.importInput = document.getElementById('importInput');
        el.playerCount = document.getElementById('playerCount');

        el.shareRoundButton = document.getElementById('shareRoundButton');
        el.shareStandingsButton = document.getElementById('shareStandingsButton');
        el.shareBracketButton = document.getElementById('shareBracketButton');
        el.undoPlayoffButton = document.getElementById('undoPlayoffButton');
        el.closeSwissButton = document.getElementById('closeSwissButton');
        el.closeTopSize = document.getElementById('closeTopSize');
        el.playoffPanel = document.getElementById('playoffPanel');
        el.playoffContainer = document.getElementById('playoffContainer');

        el.configRoundCount = document.getElementById('configRoundCount');
        el.configTopSize = document.getElementById('configTopSize');
        el.configRoundMinutes = document.getElementById('configRoundMinutes');
        el.saveConfigButton = document.getElementById('saveConfigButton');
        el.configHint = document.getElementById('configHint');

        el.timerDisplay = document.getElementById('timerDisplay');
        el.timerStatus = document.getElementById('timerStatus');
        el.timerMinutes = document.getElementById('timerMinutes');
        el.timerStartButton = document.getElementById('timerStartButton');
        el.timerAddButton = document.getElementById('timerAddButton');
        el.timerAddMinutes = document.getElementById('timerAddMinutes');
        el.timerResetButton = document.getElementById('timerResetButton');
        el.timerTestButton = document.getElementById('timerTestButton');
    }

    function init() {
        cacheDom();
        applyVersion();
        bindEvents();
        initTimer();
        renderTournaments();
        refreshKnownPlayers();
        updatePlayerCount();
    }

    // Pinta la version en el pie de pagina y en el titulo de la pestana.
    function applyVersion() {
        const label = document.getElementById('appVersion');
        if (label) label.textContent = APP_VERSION;
        document.title = 'Gestión de Torneos de Magic ' + APP_VERSION + ' 🏆';
    }

    // ----------------------------------------------------------------
    // CRONOMETRO DE RONDA
    // ----------------------------------------------------------------
    function initTimer() {
        // Conecta los callbacks del modulo con la interfaz.
        RoundTimer.onTick = (remaining, total) => {
            el.timerDisplay.textContent = RoundTimer.format(remaining);
            const warningZone = remaining <= RoundTimer.WARNING_THRESHOLD;
            const overtime = remaining < 0; // prorroga: cuenta en negativo (rojo)
            el.timerDisplay.classList.toggle('warning', warningZone && remaining > 0);
            el.timerDisplay.classList.toggle('expired', remaining === 0);
            el.timerDisplay.classList.toggle('overtime', overtime);
        };
        RoundTimer.onStateChange = (running) => {
            el.timerStartButton.textContent = running ? '⏸️ Pausar' : '▶️ Iniciar';
            if (running) {
                el.timerStatus.textContent = 'En marcha';
            } else {
                const rem = RoundTimer.getRemaining();
                el.timerStatus.textContent = rem < 0 ? '⏰ Prórroga' : 'Detenido';
            }
            el.timerStatus.classList.toggle('running', running);
            el.timerMinutes.disabled = running;
            // El boton de anadir tiempo solo esta activo con la ronda en marcha.
            if (el.timerAddButton) el.timerAddButton.disabled = !running;
        };
        RoundTimer.onWarning = () => {
            el.timerStatus.textContent = '⚠️ ¡5 minutos!';
            el.timerStatus.classList.add('warning');
            ring('¡Quedan 5 minutos de ronda!');
        };
        RoundTimer.onEnd = () => {
            el.timerStatus.textContent = '⏰ ¡Tiempo! Prórroga';
            el.timerStatus.classList.remove('warning');
            el.timerStatus.classList.add('expired');
            ring('¡Se acabó el tiempo de la ronda!');
        };

        RoundTimer.setDuration(parseInt(el.timerMinutes.value, 10) || 25);
        el.timerDisplay.textContent = RoundTimer.format(RoundTimer.getRemaining());

        el.timerMinutes.addEventListener('change', () => {
            RoundTimer.setDuration(parseInt(el.timerMinutes.value, 10) || 25);
            el.timerDisplay.textContent = RoundTimer.format(RoundTimer.getRemaining());
        });

        el.timerStartButton.addEventListener('click', () => RoundTimer.toggle());

        // Anade minutos de prorroga (por defecto 5) y reanuda si estaba en marcha.
        if (el.timerAddButton) {
            el.timerAddButton.addEventListener('click', () => {
                const min = parseInt(el.timerAddMinutes.value, 10) || 5;
                RoundTimer.addTime(min);
                // El estado de marcha no cambia; solo aseguramos etiqueta/avisos.
                if (RoundTimer.isRunning()) el.timerStatus.textContent = 'En marcha';
                el.timerStatus.classList.remove('warning', 'expired');
                el.timerDisplay.classList.remove('warning', 'expired', 'overtime');
            });
        }

        el.timerResetButton.addEventListener('click', () => {
            RoundTimer.reset();
            el.timerStatus.textContent = 'Detenido';
            el.timerStatus.classList.remove('warning', 'expired', 'running');
            el.timerDisplay.classList.remove('warning', 'expired', 'overtime');
        });

        el.timerTestButton.addEventListener('click', () => RoundTimer.play('warning'));
    }

    // Reinicia el cronometro con la duracion configurada y lo arranca. Se llama
    // automaticamente al generar una ronda nueva. Si no hay minutos configurados
    // usa el valor del campo "Minutos" (o 25 por defecto).
    function startRoundTimer(countdownMinutes) {
        const min = parseInt(countdownMinutes, 10) ||
            parseInt(el.timerMinutes.value, 10) || 25;
        // Refleja el tiempo configurado en el campo de minutos del cronometro.
        if (el.timerMinutes) el.timerMinutes.value = String(min);
        RoundTimer.reset();
        RoundTimer.setDuration(min);
        el.timerStatus.classList.remove('warning', 'expired', 'running');
        el.timerDisplay.classList.remove('warning', 'expired', 'overtime');
        RoundTimer.start();
        ring('⏱️ Ronda iniciada: ' + min + ' minutos.');
    }

    // Aviso visual opcional (no bloquea) cuando suenan los avisos.
    function ring(message) {
        // Efecto de parpadeo del titulo de la pestana para llamar la atencion.
        if (typeof document !== 'undefined') {
            document.title = '⏰ ' + message;
            setTimeout(() => { document.title = 'Gestión de Torneos de Magic ' + APP_VERSION + ' 🏆'; }, 4000);
        }
    }

    // ----------------------------------------------------------------
    // EVENTOS
    // ----------------------------------------------------------------
    function bindEvents() {
        el.tournamentForm.addEventListener('submit', onCreateTournament);
        el.playerForm.addEventListener('submit', onAddPlayer);
        el.generateRoundButton.addEventListener('click', onGenerateRound);
        el.undoRoundButton.addEventListener('click', onUndoRound);
        el.backButton.addEventListener('click', showTournamentList);
        el.deleteTournamentButton.addEventListener('click', onDeleteTournament);
        el.exportButton.addEventListener('click', onExport);
        el.importInput.addEventListener('change', onImport);

        el.shareRoundButton.addEventListener('click', onShareRound);
        el.shareStandingsButton.addEventListener('click', onShareStandings);
        el.shareBracketButton.addEventListener('click', onShareBracket);
        el.undoPlayoffButton.addEventListener('click', onUndoPlayoffRound);
        el.closeSwissButton.addEventListener('click', onCloseSwiss);
        if (el.saveConfigButton) {
            el.saveConfigButton.addEventListener('click', onSaveConfig);
        }
    }

    function onCreateTournament(event) {
        event.preventDefault();
        const tournament = Swiss.createTournament({
            name: document.getElementById('name').value,
            date: document.getElementById('date').value,
            location: document.getElementById('location').value,
            organizer: document.getElementById('organizer').value,
        });
        Storage.upsertTournament(tournament);
        el.tournamentForm.reset();
        renderTournaments();
    }

    // Aplica al cronometro los minutos configurados en el torneo: refleja el
    // valor en el campo "Minutos" y reinicia la cuenta si el cronometro esta
    // detenido. Si la ronda esta en marcha no se interrumpe (se aplicara al
    // generar la siguiente ronda).
    function syncTimerFromConfig(minutes) {
        if (!el.timerMinutes) return;
        const min = Swiss.normalizeRoundMinutes(minutes);
        if (!min) return; // sin tiempo fijo: no tocamos el cronometro
        if (RoundTimer.isRunning()) return;
        el.timerMinutes.value = String(min);
        RoundTimer.reset();
        RoundTimer.setDuration(min);
        el.timerDisplay.textContent = RoundTimer.format(RoundTimer.getRemaining());
        el.timerStatus.textContent = 'Detenido';
        el.timerStatus.classList.remove('warning', 'expired', 'running');
        el.timerDisplay.classList.remove('warning', 'expired', 'overtime');
    }

    // Guarda los cambios de configuracion (rondas planificadas y Top) desde la
    // vista de detalle. Solo se permite mientras la fase suiza no este cerrada.
    function onSaveConfig() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.playoff || tournament.status === 'closed') {
            alert('No puedes cambiar la configuración: la fase suiza ya está cerrada.');
            return;
        }
        const newRounds = Swiss.normalizeRoundCount(el.configRoundCount.value);
        // No permitir fijar menos rondas de las ya generadas.
        if (newRounds && newRounds < tournament.rounds.length) {
            alert('No puedes fijar menos rondas de las ya generadas (' +
                tournament.rounds.length + ').');
            return;
        }
        tournament.roundCount = newRounds;
        tournament.topSize = Swiss.normalizeTopSize(el.configTopSize.value);
        tournament.roundMinutes = Swiss.normalizeRoundMinutes(el.configRoundMinutes.value);
        Storage.upsertTournament(tournament);
        // Refleja el tiempo de ronda configurado en el cronometro (si esta parado).
        syncTimerFromConfig(tournament.roundMinutes);
        renderDetail();
    }

    function onAddPlayer(event) {
        event.preventDefault();
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        const player = Swiss.addPlayer(tournament, el.playerName.value);
        if (!player) {
            alert('Nombre vacío o jugador ya inscrito.');
            return;
        }
        Storage.upsertTournament(tournament);
        Storage.rememberPlayers([player.name]);
        el.playerName.value = '';
        renderDetail();
        refreshKnownPlayers();
        updatePlayerCount();
    }

    function onGenerateRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;

        // Regla del sistema suizo: sin resultados completos no hay ronda nueva.
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (last && !Swiss.isRoundComplete(last)) {
            const pend = Swiss.pendingCount(last);
            alert('No puedes generar la siguiente ronda todavía.\n\n' +
                'La Ronda ' + last.number + ' tiene ' + pend +
                ' resultado(s) sin introducir. En el sistema suizo los emparejamientos ' +
                'dependen de los resultados de la ronda anterior: introduce todos los ' +
                'resultados y vuelve a intentarlo.');
            return;
        }

        // Limite de rondas planificado: ya se generaron todas las previstas.
        if (Swiss.isScheduleComplete(tournament)) {
            const planned = Swiss.plannedRounds(tournament);
            const top = Swiss.plannedTop(tournament);
            alert('Ya has generado todas las rondas previstas (' + planned + ').\n\n' +
                'Si has cerrado las inscripciones, pulsa «Cerrar suiza y generar Top' +
                (top ? ' ' + top : '') + '» para pasar a la eliminatoria.\n' +
                'Si necesitas alguna ronda más, aumenta el número de rondas en ' +
                '«Configuración de rondas y Top».');
            return;
        }

        const round = Swiss.generateRound(tournament);
        if (!round) {
            alert('Necesitas al menos 2 jugadores activos para generar una ronda.');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
        // Al iniciar la ronda, arranca automaticamente el cronometro con el
        // tiempo de ronda configurado (y lo reinicia si ya estaba corriendo).
        startRoundTimer(Swiss.plannedMinutes(tournament));
    }

    function onUndoRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.playoff) {
            alert('La fase suiza ya está cerrada. Usa «Deshacer última ronda Top» ' +
                'si necesitas corregir la eliminatoria.');
            return;
        }
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (!last) return;
        const pend = Swiss.pendingCount(last);
        const extra = pend > 0
            ? '\n\n⚠️ La Ronda ' + last.number + ' tiene ' + pend +
              ' resultado(s) sin introducir que también se perderán.'
            : '';
        if (!confirm('¿Deshacer la Ronda ' + last.number + '?\n\n' +
            'Se eliminarán sus ' + Swiss.playableCount(last) + ' mesa(s) y todos sus ' +
            'resultados para que puedas volver a introducirlos.' + extra)) return;
        const removed = Swiss.undoLastRound(tournament);
        if (!removed) {
            alert('No se pudo deshacer la ronda.');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
    }

    function onUndoPlayoffRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || !tournament.playoff) return;
        const p = tournament.playoff;
        const last = p.rounds[p.rounds.length - 1];
        if (!last) return;
        if (!confirm('¿Deshacer la ronda «' + last.name + '» de la eliminación?\n\n' +
            'Se eliminarán sus ' + last.matches.length +
            ' partido(s) y sus resultados.')) return;
        const removed = Swiss.undoLastPlayoffRound(tournament);
        if (!removed) {
            alert('No se pudo deshacer la ronda.');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
    }

    function onDeleteTournament() {
        if (!confirm('¿Eliminar este torneo definitivamente?')) return;
        Storage.deleteTournament(currentTournamentId);
        currentTournamentId = null;
        showTournamentList();
        renderTournaments();
    }

    function onExport() {
        const data = Storage.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'torneos-magic-datos.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function onImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                Storage.importAll(JSON.parse(reader.result));
                renderTournaments();
                refreshKnownPlayers();
                updatePlayerCount();
                alert('Datos importados correctamente.');
            } catch (err) {
                alert('No se pudo importar: ' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // ----------------------------------------------------------------
    // RENDER: LISTA DE TORNEOS
    // ----------------------------------------------------------------
    function renderTournaments() {
        const tournaments = Storage.getTournaments();
        el.tournamentList.innerHTML = '';
        el.emptyTournaments.hidden = tournaments.length > 0;

        tournaments
            .slice()
            .reverse()
            .forEach((t) => {
                const li = document.createElement('li');

                const meta = document.createElement('div');
                meta.className = 'meta';
                const planned = Swiss.plannedRounds(t);
                const top = Swiss.plannedTop(t);
                const planBits = [];
                if (planned) planBits.push(planned + ' rondas');
                if (top) planBits.push('Top ' + top);
                meta.innerHTML =
                    '<strong>' + escapeHtml(t.name) + '</strong>' +
                    '<small>' + escapeHtml(t.date || 'sin fecha') + ' · ' +
                    escapeHtml(t.location || 'sin lugar') + ' · ' +
                    t.players.length + ' jugadores' +
                    (planBits.length ? ' · ' + planBits.join(' · ') : '') +
                    '</small>';
                meta.addEventListener('click', () => openTournament(t.id));

                const badge = document.createElement('span');
                badge.className = 'badge ' + t.status;
                badge.textContent = statusLabel(t.status);

                const del = document.createElement('button');
                del.className = 'btn danger small';
                del.textContent = 'Eliminar';
                del.addEventListener('click', () => {
                    if (confirm('¿Eliminar "' + t.name + '"?')) {
                        Storage.deleteTournament(t.id);
                        renderTournaments();
                    }
                });

                li.appendChild(meta);
                li.appendChild(badge);
                li.appendChild(del);
                el.tournamentList.appendChild(li);
            });
    }

    // ----------------------------------------------------------------
    // NAVEGACION
    // ----------------------------------------------------------------
    function openTournament(id) {
        currentTournamentId = id;
        el.viewTournaments.hidden = true;
        el.viewDetail.hidden = false;
        renderDetail();
    }

    function showTournamentList() {
        currentTournamentId = null;
        el.viewDetail.hidden = true;
        el.viewTournaments.hidden = false;
    }

    // ----------------------------------------------------------------
    // RENDER: DETALLE (jugadores, rondas, standings)
    // ----------------------------------------------------------------
    function renderDetail() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) {
            showTournamentList();
            return;
        }

        el.detailTitle.textContent =
            tournament.name + ' · ' + (tournament.date || 'sin fecha') +
            ' · ' + (tournament.location || 'sin lugar');

        renderPlayers(tournament);
        renderRounds(tournament);
        renderStandings(tournament);
        renderPlayoff(tournament);
        renderRoundStatus(tournament);
        renderConfig(tournament);
    }

    // Rellena el panel de configuracion (rondas planificadas y Top) y lo bloquea
    // una vez cerrada la fase suiza.
    function renderConfig(tournament) {
        if (!el.configRoundCount) return;
        const planned = Swiss.plannedRounds(tournament);
        const top = Swiss.plannedTop(tournament);
        const minutes = Swiss.plannedMinutes(tournament);
        const locked = !!tournament.playoff || tournament.status === 'closed';

        el.configRoundCount.value = planned ? planned : '';
        el.configTopSize.value = String(top);
        el.configRoundMinutes.value = minutes ? minutes : '';
        el.configRoundCount.disabled = locked;
        el.configTopSize.disabled = locked;
        el.configRoundMinutes.disabled = locked;
        el.saveConfigButton.disabled = locked;

        // Refleja el tiempo de ronda configurado en el cronometro (si esta parado).
        syncTimerFromConfig(minutes);

        if (locked) {
            el.configHint.textContent = tournament.playoff
                ? 'Fase suiza cerrada: la configuración ya no se puede modificar.'
                : 'Torneo finalizado sin eliminatoria. Usa «Deshacer última ronda» para reabrirlo.';
            return;
        }
        const parts = [];
        parts.push('Rondas generadas: ' + tournament.rounds.length +
            (planned ? ' de ' + planned : ' (sin límite definido)'));
        parts.push(top ? 'Top previsto: Top ' + top : 'Sin eliminatoria final');
        parts.push(minutes ? 'Tiempo de ronda: ' + minutes + ' min' : 'Sin tiempo de ronda fijo');
        el.configHint.textContent = parts.join(' · ') + '.';

        // Sincroniza el selector de Top del toolbar con lo configurado.
        if (el.closeTopSize) {
            if (top) {
                el.closeTopSize.value = String(top);
                el.closeTopSize.hidden = false;
            } else {
                // Sin Top: el select se oculta y el boton cierra el torneo.
                el.closeTopSize.hidden = true;
            }
        }
        if (el.closeSwissButton) {
            const plannedRounds = Swiss.plannedRounds(tournament);
            const scheduleDone = Swiss.isScheduleComplete(tournament);
            el.closeSwissButton.textContent = top
                ? '🔒 Cerrar suiza y generar Top ' + top
                : (scheduleDone || plannedRounds ? '🔒 Cerrar suiza (sin Top)' : '🔒 Cerrar suiza');
        }
    }

    // Controla el boton de generar ronda y muestra el progreso de resultados.
    function renderRoundStatus(tournament) {
        const btn = el.generateRoundButton;
        if (!btn) return;

        // Boton de deshacer: solo activo si hay rondas suizas y no se cerro la suiza.
        const undo = el.undoRoundButton;
        if (undo) {
            const canUndo = tournament.rounds.length > 0 && !tournament.playoff;
            undo.disabled = !canUndo;
            undo.title = canUndo
                ? 'Elimina la Ronda ' + tournament.rounds.length +
                  ' (con sus resultados) para volver a introducirla.'
                : (tournament.playoff
                    ? 'La fase suiza ya está cerrada.'
                    : 'Aún no hay rondas que deshacer.');
        }

        const last = tournament.rounds[tournament.rounds.length - 1];
        const complete = !last || Swiss.isRoundComplete(last);

        // No se puede generar ronda si la ultima no esta completa, ya hay playoff,
        // se alcanzo el numero de rondas planificado o el torneo se cerro sin Top.
        const lockedByPlayoff = !!tournament.playoff;
        const closedWithoutTop = tournament.status === 'closed' && !tournament.playoff;
        const scheduleDone = Swiss.isScheduleComplete(tournament);
        btn.disabled = !complete || lockedByPlayoff || closedWithoutTop || scheduleDone;

        if (lockedByPlayoff) {
            btn.textContent = '🔒 Fase suiza cerrada';
            btn.title = 'La fase suiza ya se cerró y se generó la eliminación.';
            return;
        }
        if (closedWithoutTop) {
            btn.textContent = '🏁 Torneo finalizado';
            btn.title = 'El torneo se cerró sin eliminatoria final. ' +
                'Puedes reabrirlo con «Deshacer última ronda» si necesitas corregir algo.';
            return;
        }
        if (!complete) {
            const pend = Swiss.pendingCount(last);
            const total = Swiss.playableCount(last);
            btn.textContent = '⏳ Faltan ' + pend + '/' + total + ' resultados';
            btn.title = 'Introduce todos los resultados de la Ronda ' + last.number +
                ' para emparejar la siguiente.';
            return;
        }
        if (scheduleDone) {
            const planned = Swiss.plannedRounds(tournament);
            const top = Swiss.plannedTop(tournament);
            btn.textContent = '✅ Rondas completas (' + planned + '/' + planned + ')';
            btn.title = 'Ya se generaron todas las rondas previstas. ' +
                (top ? 'Pulsa «Cerrar suiza y generar Top ' + top + '» para la eliminatoria.'
                     : 'Cierra la fase suiza para finalizar el torneo.');
            return;
        }

        const planned = Swiss.plannedRounds(tournament);
        btn.disabled = false;
        btn.textContent = planned
            ? '🎲 Generar ronda ' + (tournament.rounds.length + 1) + ' de ' + planned
            : '🎲 Generar siguiente ronda';
        btn.title = '';
    }

    function renderPlayers(tournament) {
        el.playerList.innerHTML = '';
        el.emptyPlayers.hidden = tournament.players.length > 0;

        tournament.players.forEach((player) => {
            const li = document.createElement('li');
            if (player.dropped) li.classList.add('dropped');

            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = player.name;

            const drop = document.createElement('button');
            drop.className = 'btn ghost small';
            drop.textContent = player.dropped ? 'Reactivar' : 'Retirar';
            drop.addEventListener('click', () => {
                player.dropped = !player.dropped;
                Storage.upsertTournament(tournament);
                renderDetail();
            });

            const remove = document.createElement('button');
            remove.className = 'btn danger small';
            remove.textContent = 'Quitar';
            remove.disabled = tournament.rounds.length > 0;
            if (tournament.rounds.length > 0) {
                remove.title = 'No se puede quitar tras empezar las rondas';
            }
            remove.addEventListener('click', () => {
                tournament.players = tournament.players.filter((p) => p.id !== player.id);
                Storage.upsertTournament(tournament);
                renderDetail();
            });

            li.appendChild(name);
            li.appendChild(drop);
            li.appendChild(remove);
            el.playerList.appendChild(li);
        });
    }

    function playerName(tournament, id) {
        const p = tournament.players.find((x) => x.id === id);
        return p ? p.name : '(desconocido)';
    }

    function renderRounds(tournament) {
        el.roundsContainer.innerHTML = '';

        if (tournament.rounds.length === 0) {
            const p = document.createElement('p');
            p.className = 'empty';
            p.textContent = 'Aún no hay rondas. Añade jugadores y pulsa "Generar siguiente ronda".';
            el.roundsContainer.appendChild(p);
            return;
        }

        tournament.rounds.forEach((round) => {
            const details = document.createElement('details');
            details.className = 'round';
            details.open = round.number === tournament.rounds.length;

            const summary = document.createElement('summary');
            const total = Swiss.playableCount(round);
            const pend = Swiss.pendingCount(round);
            const done = total - pend;
            const status = round.number === tournament.rounds.length
                ? (pend === 0 ? ' ✅ completa' : ' ⏳ faltan ' + pend)
                : '';
            summary.textContent =
                'Ronda ' + round.number + '  (' + done + '/' + total + ' resultados)' + status;
            details.appendChild(summary);

            round.pairings.forEach((pairing) => {
                const row = document.createElement('div');
                row.className = 'pairing' + (pairing.p2Id === null ? ' bye' : '');

                const tableNo = document.createElement('span');
                tableNo.className = 'table-no';
                tableNo.textContent = 'Mesa ' + pairing.table;
                row.appendChild(tableNo);

                const players = document.createElement('div');
                players.className = 'players';
                if (pairing.p2Id === null) {
                    players.innerHTML =
                        '<span class="names">' +
                        escapeHtml(playerName(tournament, pairing.p1Id)) +
                        '</span> <span class="vs">— BYE (victoria automática)</span>';
                } else {
                    players.innerHTML =
                        '<span class="names">' + escapeHtml(playerName(tournament, pairing.p1Id)) +
                        '</span><span class="vs">vs</span><span class="names">' +
                        escapeHtml(playerName(tournament, pairing.p2Id)) + '</span>';
                }
                row.appendChild(players);

                if (pairing.p2Id !== null) {
                    row.appendChild(buildResultButtons(tournament, round.number, pairing));
                }
                details.appendChild(row);
            });

            el.roundsContainer.appendChild(details);
        });
    }

    // Definicion de todos los resultados posibles de una ronda (Bo3),
    // agrupados y ordenados por ganador. Cada grupo lleva una etiqueta.
    function resultOptions(p1, p2) {
        return [
            {
                label: p1 + ' gana',
                options: [
                    { value: '2-0', title: p1 + ' gana 2-0' },
                    { value: '2-1', title: p1 + ' gana 2-1' },
                    { value: '1-0', title: p1 + ' gana 1-0 (rival concede / no se presenta)' },
                ],
            },
            {
                label: 'Empate',
                options: [
                    { value: '1-1', title: 'Empate 1-1 (por tiempo / tablas)' },
                ],
            },
            {
                label: p2 + ' gana',
                options: [
                    { value: '0-1', title: p2 + ' gana 1-0 (rival concede / no se presenta)' },
                    { value: '0-2', title: p2 + ' gana 2-0' },
                    { value: '1-2', title: p2 + ' gana 2-1' },
                ],
            },
        ];
    }

    function buildResultButtons(tournament, roundNumber, pairing) {
        const wrap = document.createElement('div');
        wrap.className = 'result-buttons';

        const p1 = playerName(tournament, pairing.p1Id);
        const p2 = playerName(tournament, pairing.p2Id);

        resultOptions(p1, p2).forEach((group) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'result-group';

            const label = document.createElement('span');
            label.className = 'result-group-label';
            label.textContent = group.label;
            groupEl.appendChild(label);

            group.options.forEach((opt) => {
                const btn = document.createElement('button');
                btn.className = 'btn ghost small score-btn';
                btn.textContent = opt.value;
                btn.title = opt.title;
                if (pairing.score === opt.value) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    Swiss.setResult(tournament, roundNumber, pairing.table, opt.value);
                    Storage.upsertTournament(tournament);
                    renderDetail();
                });
                groupEl.appendChild(btn);
            });
            wrap.appendChild(groupEl);
        });

        // Boton para deshacer / borrar el resultado introducido.
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn ghost small score-btn clear-btn';
        clearBtn.textContent = '✖ Deshacer';
        clearBtn.title = 'Borrar el resultado y dejarlo pendiente';
        clearBtn.disabled = !pairing.reported;
        clearBtn.addEventListener('click', () => {
            Swiss.clearResult(tournament, roundNumber, pairing.table);
            Storage.upsertTournament(tournament);
            renderDetail();
        });
        wrap.appendChild(clearBtn);

        return wrap;
    }

    function renderStandings(tournament) {
        const standings = Swiss.calculateStandings(tournament);
        el.standingsBody.innerHTML = '';

        standings.forEach((s) => {
            const tr = document.createElement('tr');
            if (s.player.dropped) tr.classList.add('dropped');
            tr.innerHTML =
                '<td class="rank">' + s.rank + '</td>' +
                '<td>' + escapeHtml(s.player.name) +
                (s.byeCount ? ' <span class="badge">bye x' + s.byeCount + '</span>' : '') +
                '</td>' +
                '<td>' + s.matchPoints + '</td>' +
                '<td>' + fmtPct(s.omw) + '</td>' +
                '<td>' + fmtPct(s.gameWinPct) + '</td>' +
                '<td>' + fmtPct(s.ogw) + '</td>';
            el.standingsBody.appendChild(tr);
        });
    }

    function fmtPct(value) {
        return (value * 100).toFixed(2).replace('.', ',') + '%';
    }

    // ----------------------------------------------------------------
    // ELIMINACION DIRECTA (TOP 4 / TOP 8)
    // ----------------------------------------------------------------
    function renderPlayoff(tournament) {
        const p = tournament.playoff;
        el.playoffPanel.hidden = !p;

        // Boton de deshacer la ultima ronda del Top (solo si hay eliminacion).
        if (el.undoPlayoffButton) {
            el.undoPlayoffButton.disabled = !p || p.rounds.length === 0;
        }
        if (!p) return;

        el.playoffContainer.innerHTML = '';

        p.rounds.forEach((round, roundIndex) => {
            const box = document.createElement('div');
            box.className = 'round';

            const head = document.createElement('div');
            head.className = 'round-head';
            head.textContent = round.name;
            box.appendChild(head);

            round.matches.forEach((match) => {
                const row = document.createElement('div');
                row.className = 'pairing';

                const tableNo = document.createElement('span');
                tableNo.className = 'table-no';
                tableNo.textContent = 'M' + match.slot;
                row.appendChild(tableNo);

                const players = document.createElement('div');
                players.className = 'players';
                players.innerHTML =
                    '<span class="names' + (match.winnerId === match.p1Id ? ' winner' : '') + '">' +
                    escapeHtml(seedName(tournament, match.p1Id, match.p1Seed)) +
                    '</span><span class="vs">vs</span><span class="names' +
                    (match.winnerId === match.p2Id ? ' winner' : '') + '">' +
                    escapeHtml(seedName(tournament, match.p2Id, match.p2Seed)) + '</span>';
                row.appendChild(players);

                if (match.p1Id && match.p2Id) {
                    row.appendChild(buildPlayoffButtons(tournament, roundIndex, match));
                } else {
                    const wait = document.createElement('span');
                    wait.className = 'empty';
                    wait.textContent = 'pendiente';
                    row.appendChild(wait);
                }
                box.appendChild(row);
            });

            el.playoffContainer.appendChild(box);
        });

        if (p.championId) {
            const champ = document.createElement('div');
            champ.className = 'champion';
            champ.textContent = '🥇 Campeón: ' + playerName(tournament, p.championId);
            el.playoffContainer.appendChild(champ);
        }
    }

    function buildPlayoffButtons(tournament, roundIndex, match) {
        const wrap = document.createElement('div');
        wrap.className = 'result-buttons';

        const p1 = playerName(tournament, match.p1Id);
        const p2 = playerName(tournament, match.p2Id);

        resultOptions(p1, p2).forEach((group) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'result-group';

            const label = document.createElement('span');
            label.className = 'result-group-label';
            label.textContent = group.label;
            groupEl.appendChild(label);

            group.options.forEach((opt) => {
                const btn = document.createElement('button');
                btn.className = 'btn ghost small score-btn';
                btn.textContent = opt.value;
                btn.title = opt.title;
                if (match.score === opt.value) btn.classList.add('active');
                btn.addEventListener('click', () => {
                    Swiss.setPlayoffResult(tournament, roundIndex, match.slot, opt.value);
                    Swiss.advancePlayoff(tournament);
                    Storage.upsertTournament(tournament);
                    renderDetail();
                });
                groupEl.appendChild(btn);
            });
            wrap.appendChild(groupEl);
        });

        // Boton para deshacer el resultado del cruce de eliminatoria.
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn ghost small score-btn clear-btn';
        clearBtn.textContent = '✖ Deshacer';
        clearBtn.title = 'Borrar el resultado de este cruce';
        clearBtn.disabled = !match.score;
        clearBtn.addEventListener('click', () => {
            Swiss.clearPlayoffResult(tournament, roundIndex, match.slot);
            Storage.upsertTournament(tournament);
            renderDetail();
        });
        wrap.appendChild(clearBtn);

        return wrap;
    }

    function seedName(tournament, id, seed) {
        if (!id) return '(pendiente)';
        return (seed ? seed + '. ' : '') + playerName(tournament, id);
    }

    // ----------------------------------------------------------------
    // COMPARTIR (WhatsApp / PNG)
    // ----------------------------------------------------------------
    function onShareRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || tournament.rounds.length === 0) {
            alert('Todavía no hay rondas para compartir.');
            return;
        }
        const text = Share.roundText(tournament, null, { includeStandings: true });
        openShareDialog(tournament, 'Ronda ' + tournament.rounds.length,
            [{ heading: 'Emparejamientos', lines: pairLines(tournament) }], text);
    }

    function onShareStandings() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        const standings = Swiss.calculateStandings(tournament);
        const lines = standings.map((s, i) =>
            (i + 1) + 'º ' + s.player.name + ' — ' + s.matchPoints + ' pts');
        const text = '🏆 ' + tournament.name + '\n━━━ CLASIFICACIÓN ━━━\n' + lines.join('\n');
        openShareDialog(tournament, 'Clasificación',
            [{ heading: 'Clasificación', lines: lines }], text);
    }

    function onShareBracket() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || !tournament.playoff) {
            alert('No hay eliminatoria generada.');
            return;
        }
        const text = Share.bracketText(tournament);
        const blocks = tournament.playoff.rounds.map((r) => ({
            heading: r.name,
            lines: r.matches.map((m) =>
                'M' + m.slot + '  ' + seedName(tournament, m.p1Id, m.p1Seed) +
                ' vs ' + seedName(tournament, m.p2Id, m.p2Seed) +
                (m.score ? '  (' + m.score + ')' : '')),
        }));
        openShareDialog(tournament, 'Eliminación Top ' + tournament.playoff.size, blocks, text);
    }

    function pairLines(tournament) {
        const round = tournament.rounds[tournament.rounds.length - 1];
        return round.pairings.map((pr) => {
            const p2 = pr.p2Id === null ? '(BYE)' : playerName(tournament, pr.p2Id);
            return 'Mesa ' + pr.table + '  ' + playerName(tournament, pr.p1Id) + ' vs ' + p2;
        });
    }

    function onCloseSwiss() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.playoff) {
            alert('La fase suiza ya está cerrada.');
            return;
        }
        // No se puede cerrar la suiza con partidas pendientes.
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (last && !Swiss.isRoundComplete(last)) {
            alert('No puedes cerrar la fase suiza todavía.\n\nLa Ronda ' + last.number +
                ' tiene ' + Swiss.pendingCount(last) + ' resultado(s) sin introducir.');
            return;
        }

        // Tamano del Top: manda el que el organizador elija en el selector del
        // toolbar; si no lo cambia, se usa el configurado en el torneo.
        const configured = Swiss.plannedTop(tournament);
        const selected = el.closeTopSize
            ? Swiss.normalizeTopSize(el.closeTopSize.value)
            : configured;

        if (!selected) {
            // Sin eliminatoria final: se cierra el torneo como suizo puro.
            if (!confirm('¿Cerrar la fase suiza y finalizar el torneo (sin Top)?\n\n' +
                'La clasificación actual quedará como resultado final.')) return;
            tournament.status = 'closed';
            Storage.upsertTournament(tournament);
            renderDetail();
            return;
        }

        if (!confirm('¿Cerrar la fase suiza y generar el Top ' + selected + '?')) return;
        const playoff = Swiss.generatePlayoff(tournament, selected);
        if (!playoff) {
            alert('No hay suficientes jugadores para un Top ' + selected + '.');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
    }

    // Dialogo de compartir: copiar texto, abrir WhatsApp, descargar/compartir imagen.
    function openShareDialog(tournament, title, blocks, text) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        const h = document.createElement('h3');
        h.textContent = '📤 Compartir: ' + title;
        modal.appendChild(h);

        // Texto de ayuda: flujo pensado para pegar en WhatsApp de escritorio.
        const help = document.createElement('p');
        help.className = 'share-help';
        help.innerHTML = 'Copia el texto y pégalo en tu <strong>grupo de WhatsApp</strong> ' +
            '(WhatsApp de escritorio: <em>Ctrl+V</em>). También puedes copiar solo una parte ' +
            'con los botones de abajo.';
        modal.appendChild(help);

        const ta = document.createElement('textarea');
        ta.className = 'share-text';
        ta.value = text;
        ta.readOnly = true;
        ta.title = 'Clic para seleccionar todo y copiar';
        ta.addEventListener('click', () => ta.select());
        modal.appendChild(ta);

        // Aviso de copiado (feedback visible).
        const feedback = document.createElement('div');
        feedback.className = 'share-feedback';
        feedback.hidden = true;
        feedback.textContent = '✅ Copiado al portapapeles';
        modal.appendChild(feedback);

        const showFeedback = () => {
            feedback.hidden = false;
            clearTimeout(feedback._t);
            feedback._t = setTimeout(() => (feedback.hidden = true), 1800);
        };

        // --- Copiado rápido de cada parte ---
        const quick = document.createElement('div');
        quick.className = 'modal-actions';

        const copyPairsBtn = document.createElement('button');
        copyPairsBtn.className = 'btn ghost';
        copyPairsBtn.textContent = '📋 Copiar emparejamientos';
        copyPairsBtn.addEventListener('click', () => {
            copyToClipboard(Share.pairingsOnlyText(tournament), showFeedback);
        });

        const copyStandBtn = document.createElement('button');
        copyStandBtn.className = 'btn ghost';
        copyStandBtn.textContent = '📊 Copiar clasificación';
        copyStandBtn.addEventListener('click', () => {
            copyToClipboard(Share.standingsOnlyText(tournament), showFeedback);
        });

        quick.appendChild(copyPairsBtn);
        quick.appendChild(copyStandBtn);
        modal.appendChild(quick);

        // --- Acciones principales ---
        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn primary';
        copyBtn.textContent = '📋 Copiar todo';
        copyBtn.addEventListener('click', () => {
            copyToClipboard(text, () => { showFeedback(); copyBtn.textContent = '✅ Copiado'; });
            setTimeout(() => (copyBtn.textContent = '📋 Copiar todo'), 1500);
        });

        const waBtn = document.createElement('button');
        waBtn.className = 'btn primary';
        waBtn.textContent = '🟢 Abrir WhatsApp';
        waBtn.addEventListener('click', () => window.open(Share.whatsappLink(text), '_blank'));

        const imgBtn = document.createElement('button');
        imgBtn.className = 'btn ghost';
        imgBtn.textContent = '🖼️ Descargar imagen';
        imgBtn.addEventListener('click', () => downloadImage(tournament, title, blocks));

        const shareImgBtn = document.createElement('button');
        shareImgBtn.className = 'btn ghost';
        shareImgBtn.textContent = '📲 Compartir imagen';
        shareImgBtn.addEventListener('click', () => shareImage(tournament, title, blocks));

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn ghost';
        closeBtn.textContent = 'Cerrar';
        closeBtn.addEventListener('click', () => overlay.remove());

        actions.appendChild(copyBtn);
        actions.appendChild(waBtn);
        actions.appendChild(imgBtn);
        actions.appendChild(shareImgBtn);
        actions.appendChild(closeBtn);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);

        // Auto-copiado al abrir: listo para pegar en WhatsApp con Ctrl+V.
        copyToClipboard(text, () => {
            ta.focus();
            ta.setSelectionRange(0, ta.value.length);
            showFeedback();
        });
    }

    // Copia al portapapeles con feedback y fallback.
    // El feedback se muestra de inmediato para que el usuario reciba respuesta
    // aunque el navegador tarde en resolver la promesa del portapapeles.
    function copyToClipboard(text, onDone) {
        const after = () => { if (onDone) onDone(); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            let settled = false;
            const once = () => { if (!settled) { settled = true; after(); } };
            navigator.clipboard.writeText(text).then(once).catch(() => {
                if (!settled) { settled = true; fallbackCopy(text, after); }
            });
            // Si la promesa no responde (algunos entornos), mostramos feedback igual.
            setTimeout(once, 300);
        } else {
            fallbackCopy(text, after);
        }
    }

    function buildCanvas(tournament, title, blocks) {
        const subtitle = [tournament.date, tournament.location]
            .filter(Boolean).join(' · ');
        return Share.renderImage(title, subtitle, blocks);
    }

    function downloadImage(tournament, title, blocks) {
        const canvas = buildCanvas(tournament, title, blocks);
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'torneo-' + title.toLowerCase().replace(/\s+/g, '-') + '.png';
        a.click();
    }

    function shareImage(tournament, title, blocks) {
        const canvas = buildCanvas(tournament, title, blocks);
        Share.canvasToBlob(canvas).then((blob) => {
            const file = new File([blob], 'torneo.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: title }).catch(() => {});
            } else {
                downloadImage(tournament, title, blocks);
            }
        });
    }

    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignorar */ }
        document.body.removeChild(ta);
        done();
    }

    function refreshKnownPlayers() {
        el.knownPlayers.innerHTML = '';
        Storage.getKnownPlayers().forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            el.knownPlayers.appendChild(option);
        });
    }

    function updatePlayerCount() {
        el.playerCount.textContent =
            'Jugadores recordados: ' + Storage.getKnownPlayers().length;
    }

    // ----------------------------------------------------------------
    // UTILIDADES
    // ----------------------------------------------------------------
    function statusLabel(status) {
        if (status === 'running') return 'En curso';
        if (status === 'closed') return 'Cerrado';
        return 'Abierto';
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
