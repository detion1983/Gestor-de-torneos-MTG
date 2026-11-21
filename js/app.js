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
    const APP_VERSION = 'v2.4.5';

    // Clave donde se recuerda la ultima seccion abierta (torneos o mesa).
    const VIEW_KEY = 'dci.view';

    // Tema visual: claro (pergamino) por defecto y oscuro opcional. La clave
    // coincide con el script de arranque de index.html para evitar destellos.
    const THEME_KEY = 'dci.theme';
    const THEME_COLORS = { light: '#f4eee2', dark: '#08070d' };

    // Tira de arte de cabecera: panoramica opcional con las seis ilustraciones.
    // Se prueba cada formato en orden y se usa el primero que exista.
    const HERO_DIR = 'assets/images/';
    const HERO_FILES = ['banner.jpg', 'banner.jpeg', 'banner.png', 'banner.webp'];

    // Estado de la UI
    let currentTournamentId = null;
    // Identidad de color elegida en el formulario de creacion ('' = sin color).
    let selectedColor = '';
    // Token para descartar carteles que terminan de pintarse fuera de tiempo.
    let awardsToken = 0;

    // Referencias del DOM
    const el = {};

    function cacheDom() {
        el.viewTournaments = document.getElementById('view-tournaments');
        el.viewDetail = document.getElementById('view-detail');
        el.viewTable = document.getElementById('view-table');
        el.tabTournaments = document.getElementById('tabTournaments');
        el.tabTable = document.getElementById('tabTable');

        // Conmutador de tema: cabecera y franja central de la mesa.
        el.themeToggle = document.getElementById('themeToggle');
        el.themeIcon = document.getElementById('themeIcon');
        el.themeLabel = document.getElementById('themeLabel');
        el.tableThemeToggle = document.getElementById('tableThemeToggle');
        el.tableThemeIcon = document.getElementById('tableThemeIcon');
        el.tableThemeLabel = document.getElementById('tableThemeLabel');

        el.tournamentForm = document.getElementById('tournamentForm');
        el.tournamentList = document.getElementById('tournamentList');
        el.emptyTournaments = document.getElementById('emptyTournaments');

        el.playerForm = document.getElementById('playerForm');
        el.playerName = document.getElementById('playerName');
        el.knownPlayers = document.getElementById('knownPlayers');
        el.playerList = document.getElementById('playerList');
        el.emptyPlayers = document.getElementById('emptyPlayers');
        el.toggleRegistrationButton = document.getElementById('toggleRegistrationButton');
        el.registrationClosedNote = document.getElementById('registrationClosedNote');

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

        // Cabecera y contadores
        el.appVersionChip = document.getElementById('appVersionChip');
        el.heroBand = document.getElementById('heroBand');
        el.heroArt = document.getElementById('heroArt');
        el.detailStatus = document.getElementById('detailStatus');
        el.tournamentCount = document.getElementById('tournamentCount');
        el.playerBadge = document.getElementById('playerBadge');
        el.roundsChip = document.getElementById('roundsChip');
        el.playoffChip = document.getElementById('playoffChip');
        el.toastStack = document.getElementById('toastStack');

        // Panel de vista previa para compartir
        el.sharePanel = document.getElementById('sharePanel');
        el.shareTitle = document.getElementById('shareTitle');
        el.sharePreview = document.getElementById('sharePreview');
        el.shareCopyImage = document.getElementById('shareCopyImage');
        el.shareDownload = document.getElementById('shareDownload');
        el.shareNative = document.getElementById('shareNative');
        el.shareCopyText = document.getElementById('shareCopyText');
        el.shareWhatsapp = document.getElementById('shareWhatsapp');
        el.shareClose = document.getElementById('shareClose');
        el.shareHint = document.getElementById('shareHint');

        // Cartel del campeón
        el.awardsPanel = document.getElementById('awardsPanel');
        el.awardsChip = document.getElementById('awardsChip');
        el.awardsSummary = document.getElementById('awardsSummary');
        el.awardsPreview = document.getElementById('awardsPreview');
        el.awardsCopyImage = document.getElementById('awardsCopyImage');
        el.awardsDownload = document.getElementById('awardsDownload');
        el.awardsNative = document.getElementById('awardsNative');

        // Identidad de color
        el.colorOptions = document.getElementById('colorOptions');
        el.detailHead = document.getElementById('detailHead');
        el.detailBanner = document.getElementById('detailBanner');
        el.detailColorTag = document.getElementById('detailColorTag');
        el.detailColorSelect = document.getElementById('detailColorSelect');
    }

    // ------------------------------------------------------------------
    // TIRA DE ARTE DE CABECERA
    // Si existe assets/images/banner.jpg (o .jpeg, .png, .webp) se pinta una
    // panoramica con las seis ilustraciones entre la cabecera y las pestanas.
    // Sin archivo la banda se queda oculta y la app no cambia.
    // ------------------------------------------------------------------
    function mountHeroBand() {
        if (!el.heroBand || !el.heroArt) return;
        const img = el.heroArt;
        let next = 0;
        img.addEventListener('load', () => {
            el.heroBand.hidden = false;
            el.heroBand.classList.add('is-loaded');
        });
        img.addEventListener('error', () => {
            next += 1;
            if (next < HERO_FILES.length) {
                img.src = HERO_DIR + HERO_FILES[next];
            } else {
                img.removeAttribute('src');
                el.heroBand.hidden = true;
            }
        });
        img.src = HERO_DIR + HERO_FILES[0];
    }

    function init() {
        cacheDom();
        applyTheme(loadTheme(), false);
        applyVersion();
        mountHeroBand();
        bindEvents();
        initTimer();
        renderColorOptions();
        renderDetailColorOptions();
        renderTournaments();
        refreshKnownPlayers();
        updatePlayerCount();
        // Contador de mesa (vidas, veneno y mana). La vista vive oculta hasta
        // que se elige la pestana "Mesa".
        if (typeof Table !== 'undefined') Table.init();
        showSection(loadSection());
    }

    // Ultima seccion usada: 'table' si el usuario se quedo en la mesa.
    function loadSection() {
        try {
            return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'tournaments';
        } catch (err) {
            return 'tournaments';
        }
    }

    // Pinta la version en el pie de pagina, en la cabecera y en el titulo.
    function applyVersion() {
        const label = document.getElementById('appVersion');
        if (label) label.textContent = APP_VERSION;
        if (el.appVersionChip) el.appVersionChip.textContent = APP_VERSION;
        document.title = baseTitle();
    }

    function baseTitle() {
        return 'Torneos de Magic · DCI Reporter ' + APP_VERSION;
    }

    // ----------------------------------------------------------------
    // TEMA CLARO / OSCURO
    // El tema claro es el de por defecto. La preferencia se guarda en
    // localStorage y se comparte entre la cabecera y la Mesa.
    // ----------------------------------------------------------------
    function loadTheme() {
        try {
            return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
        } catch (err) {
            return 'light';
        }
    }

    function currentTheme() {
        return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
    }

    function applyTheme(theme, persist) {
        const dark = theme === 'dark';
        document.documentElement.classList.toggle('theme-dark', dark);
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);

        const icon = dark ? '☀️' : '🌙';
        const label = dark ? 'Claro' : 'Oscuro';
        const action = dark ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro';
        [[el.themeToggle, el.themeIcon, el.themeLabel],
            [el.tableThemeToggle, el.tableThemeIcon, el.tableThemeLabel]].forEach((parts) => {
            const button = parts[0];
            const iconNode = parts[1];
            const labelNode = parts[2];
            if (iconNode) iconNode.textContent = icon;
            if (labelNode) labelNode.textContent = label;
            if (!button) return;
            button.setAttribute('aria-label', action);
            button.setAttribute('title', action);
        });

        if (persist) {
            try {
                localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
            } catch (err) { /* sin persistencia: el tema sigue funcionando */ }
        }
    }

    function toggleTheme() {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
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
            setTimeout(() => { document.title = baseTitle(); }, 4000);
        }
    }

    // ----------------------------------------------------------------
    // AVISOS NO BLOQUEANTES Y CONFIRMACIONES
    // ----------------------------------------------------------------
    // Aviso flotante. type: 'info' (por defecto) | 'success' | 'error'.
    function toast(message, type) {
        if (!el.toastStack) return;
        const box = document.createElement('div');
        box.className = 'toast ' + (type || 'info');
        box.textContent = message;
        el.toastStack.appendChild(box);
        const life = type === 'error' ? 5200 : 3200;
        setTimeout(() => {
            box.classList.add('out');
            setTimeout(() => box.remove(), 260);
        }, life);
    }

    // Diálogo de confirmación propio (sustituye a window.confirm).
    // Devuelve una promesa: true si el organizador acepta.
    function askConfirm(options) {
        const opts = options || {};
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'modal';

            const title = document.createElement('h3');
            title.textContent = opts.title || '¿Seguro?';
            modal.appendChild(title);

            const text = document.createElement('p');
            text.textContent = opts.message || '';
            modal.appendChild(text);

            const actions = document.createElement('div');
            actions.className = 'modal-actions';

            const cancel = document.createElement('button');
            cancel.className = 'btn ghost';
            cancel.type = 'button';
            cancel.textContent = opts.cancelLabel || 'Cancelar';

            const ok = document.createElement('button');
            ok.className = 'btn ' + (opts.danger === false ? 'primary' : 'danger');
            ok.type = 'button';
            ok.textContent = opts.okLabel || 'Aceptar';

            function close(value) {
                document.removeEventListener('keydown', onKey);
                overlay.remove();
                resolve(value);
            }

            function onKey(event) {
                if (event.key === 'Escape') close(false);
                if (event.key === 'Enter') close(true);
            }

            cancel.addEventListener('click', () => close(false));
            ok.addEventListener('click', () => close(true));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close(false);
            });
            document.addEventListener('keydown', onKey);

            actions.appendChild(cancel);
            actions.appendChild(ok);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            ok.focus();
        });
    }

    // ----------------------------------------------------------------
    // EVENTOS
    // ----------------------------------------------------------------
    function bindEvents() {
        el.tournamentForm.addEventListener('submit', onCreateTournament);
        el.playerForm.addEventListener('submit', onAddPlayer);
        if (el.toggleRegistrationButton) {
            el.toggleRegistrationButton.addEventListener('click', onToggleRegistration);
        }
        el.generateRoundButton.addEventListener('click', onGenerateRound);
        el.undoRoundButton.addEventListener('click', onUndoRound);
        el.backButton.addEventListener('click', showTournamentList);
        el.deleteTournamentButton.addEventListener('click', onDeleteTournament);
        el.exportButton.addEventListener('click', onExport);
        el.importInput.addEventListener('change', onImport);

        // Pestanas de seccion: torneos y mesa.
        if (el.tabTournaments) {
            el.tabTournaments.addEventListener('click', () => showSection('tournaments'));
        }
        if (el.tabTable) {
            el.tabTable.addEventListener('click', () => showSection('table'));
        }

        // Tema claro/oscuro (cabecera y franja central de la Mesa).
        if (el.themeToggle) el.themeToggle.addEventListener('click', toggleTheme);
        if (el.tableThemeToggle) el.tableThemeToggle.addEventListener('click', toggleTheme);

        el.shareRoundButton.addEventListener('click', onCopyRoundImage);
        el.shareStandingsButton.addEventListener('click', onCopyStandingsImage);
        el.shareBracketButton.addEventListener('click', onShareBracket);
        el.undoPlayoffButton.addEventListener('click', onUndoPlayoffRound);
        el.closeSwissButton.addEventListener('click', onCloseSwiss);
        if (el.saveConfigButton) {
            el.saveConfigButton.addEventListener('click', onSaveConfig);
        }

        // Compartir: vista previa, copiar imagen, descargar, compartir y texto.
        if (el.shareClose) el.shareClose.addEventListener('click', closeSharePanel);
        if (el.shareCopyImage) el.shareCopyImage.addEventListener('click', copyShareCanvas);
        if (el.shareDownload) el.shareDownload.addEventListener('click', downloadShareCanvas);
        if (el.shareNative) el.shareNative.addEventListener('click', nativeShareCanvas);
        if (el.shareCopyText) {
            el.shareCopyText.addEventListener('click', () => {
                if (!shareState) return;
                copyToClipboard(shareState.text, () => toast('Texto copiado al portapapeles', 'success'));
            });
        }

        // Cartel del campeón.
        if (el.awardsCopyImage) el.awardsCopyImage.addEventListener('click', copyAwardsCanvas);
        if (el.awardsDownload) el.awardsDownload.addEventListener('click', downloadAwardsCanvas);
        if (el.awardsNative) el.awardsNative.addEventListener('click', nativeAwardsCanvas);

        // Identidad de color.
        if (el.colorOptions) el.colorOptions.addEventListener('click', onPickColor);
        if (el.detailColorSelect) el.detailColorSelect.addEventListener('change', onDetailColorChange);
    }

    function onCreateTournament(event) {
        event.preventDefault();
        const tournament = Swiss.createTournament({
            name: document.getElementById('name').value,
            date: document.getElementById('date').value,
            location: document.getElementById('location').value,
            organizer: document.getElementById('organizer').value,
            color: selectedColor,
        });
        Storage.upsertTournament(tournament);
        el.tournamentForm.reset();
        selectedColor = '';
        renderColorOptions();
        renderTournaments();
        toast('Torneo «' + tournament.name + '» creado. Entra para inscribir jugadores.', 'success');
    }

    // ----------------------------------------------------------------
    // IDENTIDAD DE COLOR
    // ----------------------------------------------------------------
    // Botones de color del formulario de creacion.
    function renderColorOptions() {
        if (!el.colorOptions) return;
        el.colorOptions.innerHTML = '';
        const options = [{ key: '', name: 'Sin color', arch: 'Neutro' }].concat(Art.list());
        options.forEach((color) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-opt';
            btn.dataset.color = color.key;
            btn.setAttribute('aria-pressed', selectedColor === color.key ? 'true' : 'false');
            btn.title = color.key
                ? color.name + ' · ' + color.arch
                : 'Torneo sin identidad de color';
            if (color.key) {
                btn.style.setProperty('--accent', color.accent);
                const img = document.createElement('img');
                img.className = 'color-opt-symbol';
                img.src = color.symbol;
                img.alt = '';
                img.addEventListener('error', () => img.remove());
                btn.appendChild(img);
            } else {
                const mark = document.createElement('span');
                mark.className = 'color-opt-symbol color-opt-none';
                mark.textContent = '◇';
                mark.setAttribute('aria-hidden', 'true');
                btn.appendChild(mark);
            }
            const name = document.createElement('span');
            name.className = 'color-opt-name';
            name.textContent = color.name;
            const arch = document.createElement('span');
            arch.className = 'color-opt-arch';
            arch.textContent = color.arch;
            btn.appendChild(name);
            btn.appendChild(arch);
            el.colorOptions.appendChild(btn);
        });
    }

    // Selecciona / deselecciona un color en el formulario.
    function onPickColor(event) {
        const btn = event.target.closest('.color-opt');
        if (!btn) return;
        const key = btn.dataset.color || '';
        selectedColor = (selectedColor === key) ? '' : key;
        renderColorOptions();
    }

    // Opciones del selector de color de la cabecera del torneo.
    function renderDetailColorOptions() {
        if (!el.detailColorSelect) return;
        el.detailColorSelect.innerHTML = '';
        [{ key: '', name: 'Sin color' }].concat(Art.list()).forEach((color) => {
            const option = document.createElement('option');
            option.value = color.key;
            option.textContent = color.key
                ? color.name + ' (' + color.key.toUpperCase() + ')'
                : color.name;
            el.detailColorSelect.appendChild(option);
        });
    }

    // Cambia el color de un torneo ya creado.
    function onDetailColorChange() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        tournament.color = Art.normalize(el.detailColorSelect.value);
        Storage.upsertTournament(tournament);
        renderDetail();
        renderTournaments();
        toast(tournament.color
            ? 'Color del torneo: ' + Art.label(tournament.color)
            : 'Torneo sin identidad de color', 'success');
    }

    // Pinta el arte del torneo como fondo de la cabecera del detalle.
    function paintDetailBanner(tournament) {
        if (!el.detailHead) return;
        const color = Art.normalize(tournament.color);
        Art.applyAccent(el.detailHead, color);

        if (el.detailBanner) {
            el.detailBanner.hidden = !color;
            if (color) {
                Art.paint(el.detailBanner, color, { alt: '', eager: true });
            } else {
                el.detailBanner.innerHTML = '';
            }
        }

        if (el.detailColorTag) {
            el.detailColorTag.hidden = !color;
            if (color) {
                el.detailColorTag.textContent = Art.label(color);
                el.detailColorTag.style.setProperty('--accent', Art.meta(color).accent);
            }
        }

        if (el.detailColorSelect) {
            el.detailColorSelect.value = color;
        }
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
            toast('No puedes cambiar la configuración: la fase suiza ya está cerrada.', 'error');
            return;
        }
        const newRounds = Swiss.normalizeRoundCount(el.configRoundCount.value);
        // No permitir fijar menos rondas de las ya generadas.
        if (newRounds && newRounds < tournament.rounds.length) {
            toast('No puedes fijar menos rondas de las ya generadas (' +
                tournament.rounds.length + ').', 'error');
            return;
        }
        tournament.roundCount = newRounds;
        tournament.topSize = Swiss.normalizeTopSize(el.configTopSize.value);
        tournament.roundMinutes = Swiss.normalizeRoundMinutes(el.configRoundMinutes.value);
        Storage.upsertTournament(tournament);
        // Refleja el tiempo de ronda configurado en el cronometro (si esta parado).
        syncTimerFromConfig(tournament.roundMinutes);
        renderDetail();
        toast('Configuración guardada', 'success');
    }

    function onAddPlayer(event) {
        event.preventDefault();
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.registrationClosed) {
            toast('La inscripción está cerrada. Pulsa «🔓 Reabrir inscripción» para añadir jugadores.',
                'error');
            return;
        }
        const player = Swiss.addPlayer(tournament, el.playerName.value);
        if (!player) {
            toast('Nombre vacío o jugador ya inscrito.', 'error');
            return;
        }
        Storage.upsertTournament(tournament);
        Storage.rememberPlayers([player.name]);
        el.playerName.value = '';
        renderDetail();
        refreshKnownPlayers();
        updatePlayerCount();
        toast(player.name + ' inscrito', 'success');
    }

    // Cierra o reabre las inscripciones. Mientras están cerradas no se pueden
    // añadir ni quitar jugadores; los retiros (drop) siguen disponibles.
    async function onToggleRegistration() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;

        const closing = !tournament.registrationClosed;
        if (closing && tournament.players.length === 0) {
            toast('Inscribe al menos un jugador antes de cerrar la inscripción.', 'error');
            return;
        }
        if (closing) {
            const ok = await askConfirm({
                title: '¿Cerrar la inscripción?',
                message: 'Con ' + tournament.players.length + ' jugador' +
                    (tournament.players.length === 1 ? '' : 'es') +
                    ' inscrito' + (tournament.players.length === 1 ? '' : 's') +
                    '. No se podrán añadir ni quitar jugadores hasta que la reabras.',
                okLabel: 'Cerrar inscripción',
                danger: false,
            });
            if (!ok) return;
        }

        tournament.registrationClosed = closing;
        Storage.upsertTournament(tournament);
        renderDetail();
        toast(closing ? 'Inscripción cerrada' : 'Inscripción reabierta',
            closing ? 'info' : 'success');
    }

    function onGenerateRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;

        // Regla del sistema suizo: sin resultados completos no hay ronda nueva.
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (last && !Swiss.isRoundComplete(last)) {
            const pend = Swiss.pendingCount(last);
            toast('Faltan ' + pend + ' resultado(s) de la Ronda ' + last.number +
                '. En suizo los emparejamientos dependen de la ronda anterior.', 'error');
            return;
        }

        // Limite de rondas planificado: ya se generaron todas las previstas.
        if (Swiss.isScheduleComplete(tournament)) {
            const planned = Swiss.plannedRounds(tournament);
            const top = Swiss.plannedTop(tournament);
            toast('Ya has generado todas las rondas previstas (' + planned + '). ' +
                (top ? 'Cierra la suiza para generar el Top ' + top + '.'
                     : 'Cierra la fase suiza para finalizar el torneo.'), 'error');
            return;
        }

        const round = Swiss.generateRound(tournament);
        if (!round) {
            toast('Necesitas al menos 2 jugadores activos para generar una ronda.', 'error');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
        // Al iniciar la ronda, arranca automaticamente el cronometro con el
        // tiempo de ronda configurado (y lo reinicia si ya estaba corriendo).
        startRoundTimer(Swiss.plannedMinutes(tournament));
        toast('Ronda ' + round.number + ' generada', 'success');
    }

    async function onUndoRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.playoff) {
            toast('La fase suiza ya está cerrada. Usa «Deshacer última ronda Top».', 'error');
            return;
        }
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (!last) return;
        const pend = Swiss.pendingCount(last);
        const extra = pend > 0
            ? '\n\n⚠️ La Ronda ' + last.number + ' tiene ' + pend +
              ' resultado(s) sin introducir que también se perderán.'
            : '';
        const ok = await askConfirm({
            title: '¿Deshacer la Ronda ' + last.number + '?',
            message: 'Se eliminarán sus ' + Swiss.playableCount(last) + ' mesa(s) y todos sus ' +
                'resultados para que puedas volver a introducirlos.' + extra,
            okLabel: 'Deshacer ronda',
        });
        if (!ok) return;
        const roundNumber = last.number;
        const removed = Swiss.undoLastRound(tournament);
        if (!removed) {
            toast('No se pudo deshacer la ronda.', 'error');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
        toast('Ronda ' + roundNumber + ' eliminada', 'success');
    }

    async function onUndoPlayoffRound() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || !tournament.playoff) return;
        const p = tournament.playoff;
        const last = p.rounds[p.rounds.length - 1];
        if (!last) return;
        const ok = await askConfirm({
            title: '¿Deshacer «' + last.name + '»?',
            message: 'Se eliminarán sus ' + last.matches.length +
                ' partido(s) y sus resultados.',
            okLabel: 'Deshacer ronda',
        });
        if (!ok) return;
        const removed = Swiss.undoLastPlayoffRound(tournament);
        if (!removed) {
            toast('No se pudo deshacer la ronda.', 'error');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
        toast('Ronda «' + last.name + '» eliminada', 'success');
    }

    async function onDeleteTournament() {
        const tournament = Storage.getTournament(currentTournamentId);
        const ok = await askConfirm({
            title: '¿Eliminar el torneo?',
            message: 'Se borrará definitivamente «' + (tournament ? tournament.name : 'este torneo') +
                '» con sus jugadores, rondas y resultados.',
            okLabel: 'Eliminar torneo',
        });
        if (!ok) return;
        Storage.deleteTournament(currentTournamentId);
        currentTournamentId = null;
        showTournamentList();
        renderTournaments();
        toast('Torneo eliminado', 'success');
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
        toast('Datos exportados a torneos-magic-datos.json', 'success');
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
                toast('Datos importados correctamente', 'success');
            } catch (err) {
                toast('No se pudo importar: ' + err.message, 'error');
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
        if (el.tournamentCount) {
            el.tournamentCount.textContent = tournaments.length === 1
                ? '1 torneo' : tournaments.length + ' torneos';
        }

        tournaments
            .slice()
            .reverse()
            .forEach((t) => {
                const li = document.createElement('li');
                const color = Art.normalize(t.color);
                Art.applyAccent(li, color);
                if (color) li.classList.add('has-color');

                const art = document.createElement('div');
                art.className = 'tournament-art';
                Art.paint(art, color, { alt: '', symbol: false, eager: true });
                art.hidden = !color;
                art.addEventListener('click', () => openTournament(t.id));

                const meta = document.createElement('div');
                meta.className = 'meta';
                const planned = Swiss.plannedRounds(t);
                const top = Swiss.plannedTop(t);
                const planBits = [];
                if (planned) planBits.push(planned + ' rondas');
                if (top) planBits.push('Top ' + top);
                const active = t.players.filter((p) => !p.dropped).length;
                const champion = t.playoff && t.playoff.championId
                    ? t.players.find((p) => p.id === t.playoff.championId)
                    : null;
                meta.innerHTML =
                    '<strong>' + escapeHtml(t.name) + '</strong>' +
                    '<small>' + escapeHtml(formatDate(t.date)) + ' · ' +
                    escapeHtml(t.location || 'sin lugar') + ' · ' +
                    (color ? escapeHtml(Art.shortLabel(color)) + ' · ' : '') +
                    active + '/' + t.players.length + ' jugadores' +
                    (planBits.length ? ' · ' + planBits.join(' · ') : '') +
                    (champion ? ' · 🏆 ' + escapeHtml(champion.name) : '') +
                    '</small>';
                meta.addEventListener('click', () => openTournament(t.id));

                const badge = document.createElement('span');
                badge.className = 'badge ' + t.status;
                badge.textContent = statusLabel(t.status);

                const del = document.createElement('button');
                del.className = 'btn danger small';
                del.textContent = 'Eliminar';
                del.addEventListener('click', async () => {
                    const ok = await askConfirm({
                        title: '¿Eliminar el torneo?',
                        message: 'Se borrará «' + t.name + '» con sus ' + t.players.length +
                            ' jugador(es), ' + t.rounds.length + ' ronda(s) y todos sus resultados.',
                        okLabel: 'Eliminar',
                    });
                    if (!ok) return;
                    Storage.deleteTournament(t.id);
                    renderTournaments();
                    toast('Torneo eliminado', 'success');
                });

                li.appendChild(art);
                li.appendChild(meta);
                li.appendChild(badge);
                li.appendChild(del);
                el.tournamentList.appendChild(li);
            });
    }

    // ----------------------------------------------------------------
    // NAVEGACION
    // ----------------------------------------------------------------
    // Muestra la seccion pedida ('tournaments' o 'table') y la recuerda. En
    // torneos se respeta si hay un torneo abierto (detalle) o la lista.
    function showSection(section) {
        const isTable = section === 'table';
        // La mesa ocupa toda la pantalla y oculta cabecera, navegación y pie.
        document.body.classList.toggle('table-mode', isTable);
        if (el.viewTable) el.viewTable.hidden = !isTable;
        if (isTable) {
            el.viewTournaments.hidden = true;
            el.viewDetail.hidden = true;
        } else {
            el.viewTournaments.hidden = !!currentTournamentId;
            el.viewDetail.hidden = !currentTournamentId;
        }
        if (el.tabTournaments) {
            el.tabTournaments.classList.toggle('is-active', !isTable);
            el.tabTournaments.setAttribute('aria-selected', isTable ? 'false' : 'true');
        }
        if (el.tabTable) {
            el.tabTable.classList.toggle('is-active', isTable);
            el.tabTable.setAttribute('aria-selected', isTable ? 'true' : 'false');
        }
        try {
            localStorage.setItem(VIEW_KEY, isTable ? 'table' : 'tournaments');
        } catch (err) {
            // Sin almacenamiento disponible: la seccion solo dura esta visita.
        }
        if (isTable) {
            closeSharePanel();
            if (typeof Table !== 'undefined') Table.refresh();
        }
        if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
    }

    function openTournament(id) {
        currentTournamentId = id;
        closeSharePanel();
        showSection('tournaments');
        renderDetail();
    }

    function showTournamentList() {
        currentTournamentId = null;
        closeSharePanel();
        showSection('tournaments');
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
            tournament.name + ' · ' + formatDate(tournament.date || '') +
            ' · ' + (tournament.location || 'sin lugar');

        if (el.detailStatus) {
            el.detailStatus.className = 'badge ' + tournament.status;
            el.detailStatus.textContent = statusLabel(tournament.status);
        }

        paintDetailBanner(tournament);

        renderPlayers(tournament);
        renderRounds(tournament);
        renderStandings(tournament);
        renderPlayoff(tournament);
        renderRoundStatus(tournament);
        renderConfig(tournament);
        renderAwards(tournament);
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
            if (el.closeSwissButton) el.closeSwissButton.disabled = true;
            if (el.closeTopSize) el.closeTopSize.hidden = true;
            return;
        }
        if (el.closeSwissButton) el.closeSwissButton.disabled = false;
        const parts = [];
        parts.push('Rondas generadas: ' + tournament.rounds.length +
            (planned ? ' de ' + planned : ' (sin límite definido)'));
        parts.push(top ? 'Top previsto: Top ' + top : 'Sin eliminatoria final');
        parts.push(minutes ? 'Tiempo de ronda: ' + minutes + ' min' : 'Sin tiempo de ronda fijo');
        el.configHint.textContent = parts.join(' · ') + '.';

        // Sincroniza el selector de Top del toolbar con lo configurado.
        if (el.closeTopSize) {
            el.closeTopSize.disabled = !top;
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
        const closed = !!tournament.registrationClosed;

        if (el.playerForm) el.playerForm.hidden = closed;
        if (el.registrationClosedNote) el.registrationClosedNote.hidden = !closed;
        if (el.toggleRegistrationButton) {
            el.toggleRegistrationButton.textContent = closed
                ? '🔓 Reabrir inscripción'
                : '🔒 Cerrar inscripción';
            el.toggleRegistrationButton.title = closed
                ? 'Permite volver a añadir o quitar jugadores'
                : 'Bloquea las altas y bajas de jugadores';
            el.toggleRegistrationButton.classList.toggle('ghost', !closed);
            el.toggleRegistrationButton.classList.toggle('danger', closed);
        }

        if (el.playerBadge) {
            const active = tournament.players.filter((p) => !p.dropped).length;
            const dropped = tournament.players.length - active;
            el.playerBadge.textContent = active + (active === 1 ? ' activo' : ' activos') +
                (dropped ? ' · ' + dropped + ' retirado' + (dropped === 1 ? '' : 's') : '');
        }

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
                toast(player.name + (player.dropped ? ' retirado del torneo' : ' reactivado'),
                    player.dropped ? 'info' : 'success');
            });

            const remove = document.createElement('button');
            remove.className = 'btn danger small';
            remove.textContent = 'Quitar';
            remove.disabled = closed || tournament.rounds.length > 0;
            if (tournament.rounds.length > 0) {
                remove.title = 'No se puede quitar tras empezar las rondas';
            } else if (closed) {
                remove.title = 'La inscripción está cerrada: reábrela para quitar jugadores';
            }
            remove.addEventListener('click', () => {
                if (tournament.registrationClosed) {
                    toast('La inscripción está cerrada: reábrela para quitar jugadores.', 'error');
                    return;
                }
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

        if (el.roundsChip) {
            const total = tournament.rounds.length;
            const planned = Swiss.plannedRounds(tournament);
            el.roundsChip.textContent = total
                ? 'Ronda ' + total + (planned ? ' de ' + planned : '')
                : 'Sin rondas';
        }

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
                const isBye = pairing.p2Id === null;
                const row = document.createElement('div');
                row.className = 'pairing' + (isBye ? ' bye' : '') +
                    (!isBye && !pairing.reported ? ' pending' : '');

                if (isBye) {
                    // Descanso: no hay rival ni resultado que anotar.
                    row.appendChild(buildPairingHead('Mesa ' + pairing.table,
                        'BYE · victoria automática', 'is-bye'));
                    row.appendChild(buildPairingLine(
                        playerName(tournament, pairing.p1Id),
                        'descansa esta ronda',
                        buildStaticScore('BYE')
                    ));
                    details.appendChild(row);
                    return;
                }

                const p1 = playerName(tournament, pairing.p1Id);
                const p2 = playerName(tournament, pairing.p2Id);

                const clearBtn = buildClearButton(!pairing.reported,
                    'Borrar el resultado y dejarlo pendiente', () => {
                        Swiss.clearResult(tournament, round.number, pairing.table);
                        Storage.upsertTournament(tournament);
                        renderDetail();
                    });

                // Fila: P1 a la izquierda, desplegable en el centro y P2 a la derecha.
                row.appendChild(buildPairingHead(
                    'Mesa ' + pairing.table,
                    pairing.reported ? '✅ ' + (pairing.score || 'guardado') : '⏳ pendiente',
                    pairing.reported ? 'is-done' : 'is-pending',
                    clearBtn
                ));
                row.appendChild(buildPairingLine(p1, p2,
                    buildScoreSelect(resultChoices(p1, p2), pairing.score, (value) => {
                        if (value) {
                            Swiss.setResult(tournament, round.number, pairing.table, value);
                        } else {
                            Swiss.clearResult(tournament, round.number, pairing.table);
                        }
                        Storage.upsertTournament(tournament);
                        renderDetail();
                    }, 'Resultado de ' + p1 + ' contra ' + p2)
                ));

                details.appendChild(row);
            });

            el.roundsContainer.appendChild(details);
        });
    }

    // Marcadores de un Bo3 en el orden del desplegable: primero los que no
    // pierde el jugador 1 (incluidos los empates) y luego los del jugador 2.
    const SCORE_VALUES = ['0-0', '1-0', '1-1', '2-1', '2-0', '0-1', '1-2', '0-2'];

    // Opciones del desplegable central. `includeDraws` se desactiva en la
    // eliminatoria directa, donde un empate no clasifica a nadie.
    function resultChoices(p1, p2, includeDraws) {
        const withDraws = includeDraws !== false;
        return SCORE_VALUES
            .filter((value) => withDraws || (value !== '0-0' && value !== '1-1'))
            .map((value) => {
                const games = value.split('-').map((n) => parseInt(n, 10));
                if (games[0] === games[1]) {
                    return {
                        value: value,
                        text: value + ' · tablas',
                        title: 'Tablas ' + value + ' (' + p1 + ' contra ' + p2 + ')',
                    };
                }
                const p1Wins = games[0] > games[1];
                return {
                    value: value,
                    text: value + ' · gana ' + (p1Wins ? 'P1' : 'P2'),
                    title: (p1Wins ? p1 : p2) + ' gana ' + value,
                };
            });
    }

    // Cabecera de la mesa: numero, estado del resultado y boton de deshacer.
    function buildPairingHead(tableLabel, stateText, stateClass, extra) {
        const head = document.createElement('div');
        head.className = 'pairing-head';

        const tableNo = document.createElement('span');
        tableNo.className = 'table-no';
        tableNo.textContent = tableLabel;
        head.appendChild(tableNo);

        const state = document.createElement('span');
        state.className = 'pairing-state' + (stateClass ? ' ' + stateClass : '');
        state.textContent = stateText;
        head.appendChild(state);

        if (extra) head.appendChild(extra);
        return head;
    }

    // Linea del marcador: P1 | centro (desplegable o texto) | P2.
    function buildPairingLine(p1Text, p2Text, middle, opts) {
        const options = opts || {};
        const line = document.createElement('div');
        line.className = 'pairing-line';

        const left = document.createElement('span');
        left.className = 'names p1' + (options.winner === 'p1' ? ' winner' : '');
        left.textContent = p1Text;
        if (options.title1) left.title = options.title1;
        line.appendChild(left);

        line.appendChild(middle);

        const right = document.createElement('span');
        right.className = 'names p2' + (options.winner === 'p2' ? ' winner' : '');
        right.textContent = p2Text;
        if (options.title2) right.title = options.title2;
        line.appendChild(right);

        return line;
    }

    // Desplegable con todos los marcadores posibles (opcion vacia = pendiente).
    function buildScoreSelect(options, current, onPick, ariaLabel) {
        const select = document.createElement('select');
        select.className = 'score-select';
        select.setAttribute('aria-label', ariaLabel);
        select.title = ariaLabel + ' · elige el marcador';

        const pending = document.createElement('option');
        pending.value = '';
        pending.textContent = '—';
        pending.title = 'Sin resultado (pendiente)';
        select.appendChild(pending);

        options.forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            option.title = opt.title;
            select.appendChild(option);
        });

        // Marcadores antiguos (p. ej. Bo3 de 3 partes) se muestran sin perderlos.
        if (current && !options.some((opt) => opt.value === current)) {
            const legacy = document.createElement('option');
            legacy.value = current;
            legacy.textContent = current + ' · registro antiguo';
            select.appendChild(legacy);
        }

        select.value = current || '';
        select.classList.toggle('is-reported', !!current);
        select.addEventListener('change', () => onPick(select.value));
        return select;
    }

    // Hueco central sin desplegable (BYE, cruce pendiente de rival...).
    function buildStaticScore(text) {
        const box = document.createElement('span');
        box.className = 'score-static';
        box.textContent = text;
        return box;
    }

    function buildClearButton(disabled, title, onClick) {
        const btn = document.createElement('button');
        btn.className = 'btn ghost small clear-btn';
        btn.type = 'button';
        btn.textContent = '✖ Deshacer';
        btn.title = title;
        btn.disabled = disabled;
        btn.addEventListener('click', onClick);
        return btn;
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
                '<td class="record" title="Victorias-derrotas-empates; el bye cuenta como victoria">' +
                    s.matchRecord + '</td>' +
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

        if (el.playoffChip) {
            el.playoffChip.textContent = p
                ? 'Top ' + p.size + (p.championId ? ' · finalizado' : ' · en juego')
                : 'Top';
        }

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
                const ready = !!(match.p1Id && match.p2Id);
                const row = document.createElement('div');
                row.className = 'pairing' + (ready && !match.winnerId ? ' pending' : '');

                const p1 = seedName(tournament, match.p1Id, match.p1Seed);
                const p2 = seedName(tournament, match.p2Id, match.p2Seed);
                const winner = match.winnerId === match.p1Id ? 'p1'
                    : (match.winnerId === match.p2Id ? 'p2' : '');

                if (!ready) {
                    row.appendChild(buildPairingHead('M' + match.slot,
                        'esperando rivales', 'is-pending'));
                    row.appendChild(buildPairingLine(p1, p2, buildStaticScore('—')));
                    box.appendChild(row);
                    return;
                }

                const clearBtn = buildClearButton(!match.score,
                    'Borrar el resultado de este cruce', () => {
                        Swiss.clearPlayoffResult(tournament, roundIndex, match.slot);
                        Storage.upsertTournament(tournament);
                        renderDetail();
                    });

                row.appendChild(buildPairingHead('M' + match.slot,
                    match.winnerId ? '✅ ' + (match.score || 'guardado') : '⏳ pendiente',
                    match.winnerId ? 'is-done' : 'is-pending',
                    clearBtn));
                // En eliminatoria no hay tablas: solo marcadores con ganador.
                row.appendChild(buildPairingLine(p1, p2,
                    buildScoreSelect(resultChoices(p1, p2, false), match.score, (value) => {
                        if (!value) {
                            Swiss.clearPlayoffResult(tournament, roundIndex, match.slot);
                            Storage.upsertTournament(tournament);
                            renderDetail();
                            return;
                        }
                        Swiss.setPlayoffResult(tournament, roundIndex, match.slot, value);
                        const result = Swiss.advancePlayoff(tournament);
                        Storage.upsertTournament(tournament);
                        renderDetail();
                        if (result && result.champion) {
                            toast('🏆 ¡Campeón: ' +
                                playerName(tournament, tournament.playoff.championId) + '!', 'success');
                            scrollToAwards();
                        }
                    }, 'Resultado de ' + p1 + ' contra ' + p2),
                    { winner: winner }));
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

    function seedName(tournament, id, seed) {
        if (!id) return '(pendiente)';
        return (seed ? seed + '. ' : '') + playerName(tournament, id);
    }

    // ----------------------------------------------------------------
    // COMPARTIR (PNG / portapapeles)
    // ----------------------------------------------------------------
    // Ronda y clasificacion se copian directamente al portapapeles con un unico
    // boton-icono. El bracket conserva su dialogo con texto e imagen.
    function onCopyRoundImage() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || tournament.rounds.length === 0) {
            toast('Todavía no hay rondas para compartir.', 'error');
            return;
        }
        const round = tournament.rounds[tournament.rounds.length - 1];
        copyGeneratedImage(tournament, 'Ronda ' + round.number, null,
            'pairings', round.number);
    }

    function onCopyStandingsImage() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        const standings = Swiss.calculateStandings(tournament);
        if (!standings.length) {
            toast('Aún no hay clasificación que compartir.', 'error');
            return;
        }
        copyGeneratedImage(tournament, 'Clasificación', null, 'standings');
    }

    // Genera el cartel y lo deja en el portapapeles en el MISMO clic. La
    // promesa del PNG se pasa a ClipboardItem para que Safari/iOS sigan dentro
    // del gesto del usuario aunque el canvas se dibuje despues. Si el navegador
    // no sabe copiar imagenes, se descarga como respaldo.
    // `kind` elige el dibujo de tabla: clasificacion o emparejamientos.
    function copyGeneratedImage(tournament, title, blocks, kind, roundNumber) {
        const canvasPromise = kind
            ? createTableCanvas(tournament, kind, roundNumber)
            : createShareCanvas(tournament, title, blocks);
        const blobPromise = canvasPromise.then((canvas) => Share.canvasToBlob(canvas));
        const filename = 'magic-' + slug(title) + '.png';

        Share.copyImageToClipboard(blobPromise).then((ok) => {
            if (ok) {
                toast('Imagen copiada al portapapeles. Pégala con Ctrl+V.', 'success');
                return null;
            }
            return canvasPromise.then((canvas) => {
                downloadCanvas(canvas, filename);
                toast('No se pudo copiar: imagen descargada', 'info');
            });
        }).catch(() => {
            toast('No se pudo generar la imagen en este navegador.', 'error');
        });
    }

    function onShareBracket() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament || !tournament.playoff) {
            toast('No hay eliminatoria generada.', 'error');
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
        if (tournament.playoff.championId) {
            blocks.push({
                heading: 'Campeón',
                lines: [playerName(tournament, tournament.playoff.championId)],
            });
        }
        openShare('Eliminación Top ' + tournament.playoff.size, blocks, text);
    }

    async function onCloseSwiss() {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;
        if (tournament.playoff) {
            toast('La fase suiza ya está cerrada.', 'error');
            return;
        }
        // No se puede cerrar la suiza con partidas pendientes.
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (last && !Swiss.isRoundComplete(last)) {
            toast('No puedes cerrar la suiza: la Ronda ' + last.number + ' tiene ' +
                Swiss.pendingCount(last) + ' resultado(s) sin introducir.', 'error');
            return;
        }

        // Tamano del Top: si el torneo esta configurado SIN Top, se cierra como
        // suizo puro aunque el selector oculto conserve un valor antiguo. Con
        // Top, manda el selector del toolbar y si no, lo configurado.
        const configured = Swiss.plannedTop(tournament);
        const selected = configured
            ? (el.closeTopSize
                ? (Swiss.normalizeTopSize(el.closeTopSize.value) || configured)
                : configured)
            : 0;

        if (!selected) {
            // Sin eliminatoria final: se cierra el torneo como suizo puro.
            const ok = await askConfirm({
                title: '¿Cerrar la fase suiza?',
                message: 'El torneo finalizará sin eliminación: la clasificación actual ' +
                    'quedará como resultado final.',
                okLabel: 'Cerrar torneo',
                danger: false,
            });
            if (!ok) return;
            tournament.status = 'closed';
            Storage.upsertTournament(tournament);
            renderDetail();
            toast('Torneo cerrado. Cartel del campeón listo.', 'success');
            scrollToAwards();
            return;
        }

        const ok = await askConfirm({
            title: '¿Cerrar la suiza y generar el Top ' + selected + '?',
            message: 'Los ' + selected + ' mejores de la clasificación pasarán a la ' +
                'eliminación directa. Podrás deshacer la última ronda del Top si hay ' +
                'algún error.',
            okLabel: 'Generar Top ' + selected,
            danger: false,
        });
        if (!ok) return;

        const playoff = Swiss.generatePlayoff(tournament, selected);
        if (!playoff) {
            toast('No hay suficientes jugadores para un Top ' + selected + '.', 'error');
            return;
        }
        Storage.upsertTournament(tournament);
        renderDetail();
        toast('Top ' + selected + ' generado', 'success');
        scrollToAwards();
    }

    // Dialogo de compartir: copiar texto, abrir WhatsApp, descargar/compartir imagen.
    // ----------------------------------------------------------------
    // COMPARTIR: VISTA PREVIA, IMAGEN Y TEXTO
    // ----------------------------------------------------------------
    let shareState = null;  // { title, text, canvas, filename }
    let awardsState = null; // { canvas, filename }

    function slug(text) {
        return String(text || 'cartel')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'cartel';
    }

    function formatDate(iso) {
        if (!iso) return 'sin fecha';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function setPreview(container, canvas) {
        if (!container) return;
        container.innerHTML = '';
        canvas.classList.add('poster-canvas');
        container.appendChild(canvas);
    }

    // Carga el arte y el color del torneo una sola vez para cualquier cartel.
    function shareArtOptions(tournament) {
        const color = Art.normalize(tournament.color);
        // El arte se carga antes de dibujar. Si no hay arte (o no se puede usar
        // en canvas) el cartel se genera igual con el fondo del tema.
        return Promise.all([Art.posterImage(color), Art.posterSymbol(color)]).then((images) => ({
            art: images[0],
            symbol: images[1],
            accent: color ? Art.meta(color).accent : '',
            colorName: color ? Art.shortLabel(color) : '',
        }));
    }

    // Prepara el cartel generico (bracket) con el arte y el color del torneo.
    function createShareCanvas(tournament, title, blocks) {
        const subtitle = [formatDate(tournament.date), tournament.location]
            .filter(Boolean).join(' · ');
        // Evita repetir el titulo como encabezado del primer bloque (sin borrar
        // las lineas del bloque, solo su encabezado).
        const cleanBlocks = (blocks || []).map((b) => ({
            heading: (b.heading && String(b.heading).toLowerCase() === String(title).toLowerCase())
                ? '' : b.heading,
            lines: b.lines || [],
        }));

        return shareArtOptions(tournament).then((options) =>
            Share.renderImage(title, subtitle, cleanBlocks, options)
        );
    }

    // Cartel con formato de tabla para la clasificacion o una ronda.
    function createTableCanvas(tournament, kind, roundNumber) {
        return shareArtOptions(tournament).then((options) => (
            kind === 'standings'
                ? Share.renderStandingsImage(tournament, options)
                : Share.renderPairingsImage(tournament, roundNumber, options)
        ));
    }

    // Genera el cartel y abre el panel de vista previa con sus acciones.
    function openShare(title, blocks, text) {
        const tournament = Storage.getTournament(currentTournamentId);
        if (!tournament) return;

        const tournamentId = tournament.id;
        createShareCanvas(tournament, title, blocks).then((canvas) => {
            if (currentTournamentId !== tournamentId) return;
            shareState = {
                title: title,
                text: text,
                canvas: canvas,
                filename: 'magic-' + slug(title) + '.png',
            };

            if (el.shareTitle) el.shareTitle.textContent = 'Compartir · ' + title;
            setPreview(el.sharePreview, canvas);
            if (el.shareWhatsapp) el.shareWhatsapp.href = Share.whatsappLink(text);
            if (el.sharePanel) {
                el.sharePanel.hidden = false;
                el.sharePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            toast('Vista previa lista: cópiala o descárgala', 'info');
        });
    }

    function closeSharePanel() {
        if (el.sharePanel) el.sharePanel.hidden = true;
        shareState = null;
    }

    // Copia una imagen PNG ya dibujada al portapapeles.
    function copyImageToClipboard(canvas) {
        return Share.copyImageToClipboard(Share.canvasToBlob(canvas));
    }

    function downloadCanvas(canvas, filename) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename || 'cartel.png';
        link.click();
    }

    function shareCanvasFile(canvas, filename, title) {
        Share.canvasToBlob(canvas).then((blob) => {
            if (!blob) {
                downloadCanvas(canvas, filename);
                return;
            }
            const file = new File([blob], filename || 'cartel.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: title || 'Torneo de Magic' })
                    .catch(() => { /* el usuario canceló: no hacemos nada */ });
            } else {
                downloadCanvas(canvas, filename);
                toast('Tu navegador no comparte archivos: imagen descargada', 'info');
            }
        });
    }

    function copyShareCanvas() {
        if (!shareState) return;
        copyImageToClipboard(shareState.canvas).then((ok) => {
            if (ok) {
                toast('Imagen copiada al portapapeles', 'success');
            } else {
                downloadCanvas(shareState.canvas, shareState.filename);
                toast('No se pudo copiar: imagen descargada', 'info');
            }
        });
    }

    function downloadShareCanvas() {
        if (!shareState) return;
        downloadCanvas(shareState.canvas, shareState.filename);
        toast('Imagen descargada', 'success');
    }

    function nativeShareCanvas() {
        if (!shareState) return;
        shareCanvasFile(shareState.canvas, shareState.filename, shareState.title);
    }

    // ----------------------------------------------------------------
    // CARTEL DEL CAMPEÓN
    // ----------------------------------------------------------------
    // Prepara los datos del cartel: campeón, finalista y mejor suizo.
    function buildAwardsInfo(tournament) {
        const standings = Swiss.calculateStandings(tournament);
        const p = tournament.playoff;
        const leader = standings[0] || null;
        const active = tournament.players.filter((pl) => !pl.dropped).length;

        function statLine(entry) {
            if (!entry) return null;
            const record = entry.matchesWon + '-' + entry.matchesLost +
                (entry.matchesDrawn ? '-' + entry.matchesDrawn : '');
            return {
                stat: entry.matchPoints + ' pts',
                record: record,
                subline: 'OMW ' + fmtPct(entry.omw) + ' · GW ' + fmtPct(entry.gameWinPct) +
                    (entry.byeCount ? ' · ' + entry.byeCount + ' bye' : ''),
            };
        }

        const info = {
            tournamentName: tournament.name,
            chipLabel: 'CAMPEÓN',
            champion: null,
            second: null,
            third: null,
            emptyText: 'Cierra la fase suiza para generar el cartel.',
            footer: 'DCI Reporter · ' + APP_VERSION,
        };

        if (p && p.championId) {
            const championEntry = standings.find((s) => s.player.id === p.championId);
            const stats = statLine(championEntry);
            info.chipLabel = 'CAMPEÓN · TOP ' + p.size;
            info.champion = {
                name: playerName(tournament, p.championId),
                stat: stats ? stats.stat + ' en la fase suiza' : '',
                record: stats ? stats.record : '',
                subline: stats ? stats.subline : '',
            };

            // Finalista: perdedor de la final (ultima ronda del Top).
            const lastRound = p.rounds[p.rounds.length - 1];
            const finalMatch = lastRound && lastRound.matches[0];
            if (finalMatch && finalMatch.winnerId) {
                const loserId = finalMatch.winnerId === finalMatch.p1Id
                    ? finalMatch.p2Id : finalMatch.p1Id;
                if (loserId) {
                    const loserStats = statLine(standings.find((s) => s.player.id === loserId));
                    info.second = {
                        label: 'Finalista',
                        name: playerName(tournament, loserId),
                        detail: finalMatch.score ? 'Final ' + finalMatch.score
                            : (loserStats ? loserStats.stat : ''),
                    };
                }
            }

            if (leader && leader.player.id !== p.championId) {
                info.third = {
                    label: 'Mejor suizo',
                    name: leader.player.name,
                    detail: leader.matchPoints + ' pts · OMW ' + fmtPct(leader.omw),
                };
            } else {
                // El campeon ya era el lider suizo: mostramos el 3er clasificado.
                const third = standings[2];
                info.third = third ? {
                    label: '3º clasificado',
                    name: third.player.name,
                    detail: third.matchPoints + ' pts · OMW ' + fmtPct(third.omw),
                } : null;
            }
        } else if (p) {
            // Eliminatoria en juego: mostramos al lider provisional.
            const stats = statLine(leader);
            info.chipLabel = 'ELIMINATORIA EN CURSO';
            info.emptyText = 'La eliminatoria está en juego: el cartel se completa al coronar al campeón.';
            info.champion = leader ? {
                name: leader.player.name,
                stat: 'Líder de la fase suiza',
                record: stats ? stats.stat : '',
                subline: stats ? stats.subline : '',
            } : null;
        } else if (tournament.status === 'closed') {
            const stats = statLine(leader);
            info.chipLabel = 'CAMPEÓN SUIZO';
            info.champion = leader ? {
                name: leader.player.name,
                stat: stats ? stats.stat + ' en la fase suiza' : '',
                record: stats ? stats.record : '',
                subline: stats ? stats.subline : '',
            } : null;

            const second = standings[1];
            info.second = second ? {
                label: '2º clasificado',
                name: second.player.name,
                detail: second.matchPoints + ' pts · OMW ' + fmtPct(second.omw),
            } : null;

            const third = standings[2];
            info.third = third ? {
                label: '3º clasificado',
                name: third.player.name,
                detail: third.matchPoints + ' pts · OMW ' + fmtPct(third.omw),
            } : null;
        } else {
            return null; // torneo en curso: el cartel se genera al cerrar
        }

        const rounds = tournament.rounds.length;
        info.meta = [
            rounds ? rounds + ' ronda' + (rounds === 1 ? '' : 's') + ' suizas' : '',
            active + ' jugador' + (active === 1 ? '' : 'es'),
            formatDate(tournament.date),
            tournament.location || '',
        ].filter(Boolean).join(' · ');

        return info;
    }

    // Pinta el cartel del campeon en el panel de premios.
    function renderAwards(tournament) {
        if (!el.awardsPanel) return;

        const visible = !!tournament.playoff || tournament.status === 'closed';
        const info = visible ? buildAwardsInfo(tournament) : null;
        if (!info || !info.champion) {
            awardsToken += 1;
            el.awardsPanel.hidden = true;
            awardsState = null;
            return;
        }

        const token = ++awardsToken;
        const color = Art.normalize(tournament.color);
        Promise.all([Art.posterImage(color), Art.posterSymbol(color)]).then((images) => {
            if (token !== awardsToken) return; // otro cartel mas reciente
            const canvas = Share.renderChampionsImage(Object.assign({}, info, {
                art: images[0],
                symbol: images[1],
                accent: color ? Art.meta(color).accent : '',
                colorName: color ? Art.shortLabel(color) : '',
            }));
            awardsState = {
                canvas: canvas,
                filename: 'magic-campeon-' + slug(info.champion.name) + '.png',
            };

            el.awardsPanel.hidden = false;
            setPreview(el.awardsPreview, canvas);
            if (el.awardsChip) el.awardsChip.textContent = info.chipLabel;
            if (el.awardsSummary) {
                el.awardsSummary.innerHTML =
                    '<strong>' + escapeHtml(info.champion.name) + '</strong> · ' +
                    escapeHtml(info.chipLabel) + '. ' + escapeHtml(info.meta) + '.';
            }
        });
    }

    function scrollToAwards() {
        if (!el.awardsPanel || el.awardsPanel.hidden) return;
        el.awardsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function copyAwardsCanvas() {
        if (!awardsState) return;
        copyImageToClipboard(awardsState.canvas).then((ok) => {
            if (ok) {
                toast('Cartel copiado al portapapeles', 'success');
            } else {
                downloadCanvas(awardsState.canvas, awardsState.filename);
                toast('No se pudo copiar: cartel descargado', 'info');
            }
        });
    }

    function downloadAwardsCanvas() {
        if (!awardsState) return;
        downloadCanvas(awardsState.canvas, awardsState.filename);
        toast('Cartel descargado', 'success');
    }

    function nativeAwardsCanvas() {
        if (!awardsState) return;
        shareCanvasFile(awardsState.canvas, awardsState.filename, 'Cartel del campeón');
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

    return { init, notify: toast };
})();

document.addEventListener('DOMContentLoaded', App.init);
