/*
 * table.js
 * Contador de mesa para partidas presenciales: vidas, veneno y maná flotante.
 *
 * Cada jugador (de 2 a 4) tiene su asiento con:
 *   - Nombre editable y color de identidad (reutiliza Art y sus símbolos).
 *   - Contador de vidas de 20 (o 40 para Commander) con botones grandes y
 *     atajos de ±1 y ±5.
 *   - Contador de veneno (avisa al llegar a 10) y reinicio individual.
 *
 * El maná flotante vive en un panel aparte: una tarjeta por jugador con los
 * seis símbolos oficiales (blanco, azul, negro, rojo, verde y artefacto) y sus
 * botones de sumar/restar. Así los contadores se leen bien con 2, 3 o 4
 * jugadores en pantalla.
 *
 * Todo el estado se guarda en localStorage (clave "dci.table") y se recupera
 * al volver a abrir la app. Este módulo no mezcla nada con los torneos.
 */

const Table = (() => {
    const STORE_KEY = 'dci.table';
    // Número de asientos permitidos y vidas iniciales ofrecidas.
    const COUNTS = [2, 3, 4];
    const START_LIVES = [20, 40];
    // Orden de los símbolos de maná (el mismo que usa el resto de la app).
    const MANA = ['w', 'u', 'b', 'r', 'g', 'c'];
    // Reglas de la mesa: 10 contadores de veneno hacen perder la partida.
    const POISON_MAX = 10;
    const POISON_LIMIT = 99; // se puede seguir contando, pero se avisa desde 10
    const MANA_LIMIT = 99;
    const LIFE_MIN = -99;
    const LIFE_MAX = 999;
    const NAME_MAX = 16;
    const DEFAULT_NAMES = ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4'];
    const DEFAULT_COLORS = ['w', 'u', 'b', 'r'];

    // Estado en memoria (se carga la primera vez que se necesita).
    let state = null;
    // Referencias del DOM (solo existen cuando la vista de mesa está montada).
    const el = {};
    // Confirmación en dos pasos del botón de reiniciar.
    let resetTimer = null;
    let resetArmed = false;

    // ------------------------------------------------------------------
    // ESTADO
    // ------------------------------------------------------------------
    function blankMana() {
        const mana = {};
        MANA.forEach((key) => { mana[key] = 0; });
        return mana;
    }

    function blankPlayer(index, startLife) {
        return {
            name: DEFAULT_NAMES[index] || 'Jugador ' + (index + 1),
            color: DEFAULT_COLORS[index] || '',
            life: startLife,
            poison: 0,
            mana: blankMana(),
        };
    }

    function defaultState() {
        const startLife = 20;
        return {
            count: 4,
            startLife,
            rotate: true,
            players: [0, 1, 2, 3].map((index) => blankPlayer(index, startLife)),
        };
    }

    function clampInt(value, min, max, fallback) {
        const number = Math.round(Number(value));
        if (!isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    function sanitizePlayer(raw, index, startLife) {
        const base = blankPlayer(index, startLife);
        const src = raw && typeof raw === 'object' ? raw : {};
        const hasColor = Object.prototype.hasOwnProperty.call(src, 'color');
        const name = String(src.name == null ? base.name : src.name).slice(0, NAME_MAX).trim();
        const mana = {};
        MANA.forEach((key) => {
            const value = src.mana && typeof src.mana === 'object' ? src.mana[key] : 0;
            mana[key] = clampInt(value, 0, MANA_LIMIT, 0);
        });
        return {
            name: name || base.name,
            color: hasColor ? Art.normalize(src.color) : base.color,
            life: clampInt(src.life, LIFE_MIN, LIFE_MAX, startLife),
            poison: clampInt(src.poison, 0, POISON_LIMIT, 0),
            mana,
        };
    }

    // Convierte cualquier cosa (JSON viejo, roto o vacío) en un estado válido.
    function sanitize(raw) {
        const base = defaultState();
        const src = raw && typeof raw === 'object' ? raw : {};
        const startLife = START_LIVES.indexOf(Number(src.startLife)) >= 0
            ? Number(src.startLife)
            : base.startLife;
        const count = COUNTS.indexOf(Number(src.count)) >= 0 ? Number(src.count) : base.count;
        const players = [0, 1, 2, 3].map((index) =>
            sanitizePlayer(src.players && src.players[index], index, startLife));
        return {
            count,
            startLife,
            rotate: src.rotate !== false,
            players,
        };
    }

    function load() {
        if (state) return state;
        let raw = null;
        try {
            const text = localStorage.getItem(STORE_KEY);
            raw = text ? JSON.parse(text) : null;
        } catch (err) {
            console.error('No se pudo leer el estado de la mesa:', err);
        }
        state = sanitize(raw);
        return state;
    }

    function save() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch (err) {
            console.error('No se pudo guardar el estado de la mesa:', err);
        }
    }

    function playerAt(seat) {
        load();
        const index = Number(seat);
        return state.players[index] || null;
    }

    // ------------------------------------------------------------------
    // ACCIONES (todas guardan y repintan los valores afectados)
    // ------------------------------------------------------------------
    function setCount(count) {
        load();
        const next = Number(count);
        if (COUNTS.indexOf(next) < 0 || next === state.count) return;
        state.count = next;
        save();
        render();
    }

    // Cambia las vidas iniciales y las aplica a todos los jugadores.
    function setStartLife(value) {
        load();
        const next = Number(value);
        if (START_LIVES.indexOf(next) < 0) return;
        state.startLife = next;
        state.players.forEach((player) => { player.life = next; });
        save();
        render();
    }

    function setRotate(value) {
        load();
        state.rotate = value !== false;
        if (el.rotate) el.rotate.checked = state.rotate;
        save();
        render();
    }

    function adjust(seat, delta) {
        const player = playerAt(seat);
        const step = Math.round(Number(delta)) || 0;
        if (!player || !step) return;
        player.life = clampInt(player.life + step, LIFE_MIN, LIFE_MAX, player.life);
        save();
        syncValues();
    }

    function adjustPoison(seat, delta) {
        const player = playerAt(seat);
        const step = Math.round(Number(delta)) || 0;
        if (!player || !step) return;
        player.poison = clampInt(player.poison + step, 0, POISON_LIMIT, player.poison);
        save();
        syncValues();
    }

    function adjustMana(seat, key, delta) {
        const player = playerAt(seat);
        const color = Art.normalize(key);
        const step = Math.round(Number(delta)) || 0;
        if (!player || !color || !step) return;
        player.mana[color] = clampInt(player.mana[color] + step, 0, MANA_LIMIT, 0);
        save();
        syncValues();
    }

    function clearMana() {
        load();
        state.players.forEach((player) => { player.mana = blankMana(); });
        save();
        syncValues();
    }

    function resetSeat(seat) {
        const player = playerAt(seat);
        if (!player) return;
        player.life = state.startLife;
        player.poison = 0;
        player.mana = blankMana();
        save();
        syncValues();
    }

    // Reinicia vidas, veneno y maná de todos (mantiene nombres y colores).
    function resetAll() {
        load();
        state.players.forEach((player) => {
            player.life = state.startLife;
            player.poison = 0;
            player.mana = blankMana();
        });
        save();
        syncValues();
    }

    function setName(seat, value) {
        const player = playerAt(seat);
        if (!player) return;
        player.name = String(value == null ? '' : value).slice(0, NAME_MAX).trim();
        save();
        const card = el.mana
            ? el.mana.querySelector('[data-mana-seat="' + seat + '"] .mana-card-name')
            : null;
        if (card) card.textContent = player.name.trim() || ('Jugador ' + (Number(seat) + 1));
    }

    function setColor(seat, key) {
        const player = playerAt(seat);
        if (!player) return;
        player.color = Art.normalize(key);
        save();
        render();
    }

    // ------------------------------------------------------------------
    // PINTADO
    // ------------------------------------------------------------------
    function facingTop(index) {
        if (!state.rotate) return false;
        if (state.count === 2) return index === 0;
        // Con 3 jugadores el asiento de enfrente ocupa la fila superior entera;
        // con 4, los dos asientos superiores se giran para su jugador.
        return index === 0 || (state.count === 4 && index === 1);
    }

    function makeButton(label, attributes, ariaLabel) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = attributes.className;
        btn.textContent = label;
        Object.keys(attributes).forEach((key) => {
            if (key === 'className') return;
            btn.setAttribute('data-' + key, attributes[key]);
        });
        btn.setAttribute('aria-label', ariaLabel);
        return btn;
    }

    function buildSeat(player, index) {
        const seat = document.createElement('article');
        seat.className = 'seat';
        seat.dataset.seat = String(index);
        if (facingTop(index)) seat.dataset.facing = 'top';
        Art.applyAccent(seat, player.color);

        const art = document.createElement('div');
        art.className = 'seat-art';
        art.setAttribute('aria-hidden', 'true');
        Art.paint(art, player.color, { alt: '', symbol: false });
        seat.appendChild(art);

        const head = document.createElement('div');
        head.className = 'seat-head';

        const name = document.createElement('input');
        name.className = 'seat-name';
        name.type = 'text';
        name.maxLength = NAME_MAX;
        name.value = player.name;
        name.setAttribute('aria-label', 'Nombre del jugador ' + (index + 1));
        name.addEventListener('input', () => setName(index, name.value));
        name.addEventListener('blur', () => {
            if (name.value.trim()) return;
            name.value = DEFAULT_NAMES[index] || 'Jugador ' + (index + 1);
            setName(index, name.value);
        });

        const select = document.createElement('select');
        select.className = 'seat-color';
        select.setAttribute('aria-label', 'Color del jugador ' + (index + 1));
        const none = document.createElement('option');
        none.value = '';
        none.textContent = 'Sin color';
        select.appendChild(none);
        Art.list().forEach((color) => {
            const option = document.createElement('option');
            option.value = color.key;
            option.textContent = color.name;
            select.appendChild(option);
        });
        select.value = player.color || '';
        select.addEventListener('change', () => setColor(index, select.value));

        const reset = makeButton('⟳', {
            className: 'seat-reset', action: 'reset-seat', seat: index,
        }, 'Reiniciar las vidas y contadores del jugador ' + (index + 1));
        reset.title = 'Reiniciar jugador';

        head.appendChild(name);
        head.appendChild(select);
        head.appendChild(reset);
        seat.appendChild(head);

        const life = document.createElement('div');
        life.className = 'seat-life';

        const minus = makeButton('−', {
            className: 'seat-step seat-minus', action: 'life', delta: -1, seat: index,
        }, 'Restar 1 vida al jugador ' + (index + 1));
        const pips = document.createElement('div');
        pips.className = 'seat-life-box';
        const value = document.createElement('output');
        value.className = 'seat-life-value';
        value.dataset.role = 'life';
        value.textContent = String(player.life);
        value.setAttribute('aria-live', 'polite');
        const caption = document.createElement('span');
        caption.className = 'seat-life-label';
        caption.textContent = 'vidas';
        pips.appendChild(value);
        pips.appendChild(caption);
        const plus = makeButton('+', {
            className: 'seat-step seat-plus', action: 'life', delta: 1, seat: index,
        }, 'Sumar 1 vida al jugador ' + (index + 1));

        life.appendChild(minus);
        life.appendChild(pips);
        life.appendChild(plus);
        seat.appendChild(life);

        const quick = document.createElement('div');
        quick.className = 'seat-quick';
        [[-5, '−5'], [-1, '−1'], [1, '+1'], [5, '+5']].forEach((pair) => {
            quick.appendChild(makeButton(pair[1], {
                className: 'quick-step', action: 'life', delta: pair[0], seat: index,
            }, (pair[0] > 0 ? 'Sumar ' : 'Restar ') + Math.abs(pair[0]) +
                ' vidas al jugador ' + (index + 1)));
        });
        seat.appendChild(quick);

        const counters = document.createElement('div');
        counters.className = 'seat-counters';

        const poison = document.createElement('div');
        poison.className = 'counter counter-poison';
        poison.dataset.role = 'poison-box';
        const poisonLabel = document.createElement('span');
        poisonLabel.className = 'counter-label';
        poisonLabel.textContent = '☠️ Veneno';
        poison.appendChild(poisonLabel);
        poison.appendChild(makeButton('−', {
            className: 'counter-btn', action: 'poison', delta: -1, seat: index,
        }, 'Quitar un contador de veneno al jugador ' + (index + 1)));
        const poisonValue = document.createElement('output');
        poisonValue.className = 'counter-value';
        poisonValue.dataset.role = 'poison';
        poisonValue.textContent = String(player.poison);
        poison.appendChild(poisonValue);
        poison.appendChild(makeButton('+', {
            className: 'counter-btn', action: 'poison', delta: 1, seat: index,
        }, 'Añadir un contador de veneno al jugador ' + (index + 1)));
        const poisonMax = document.createElement('span');
        poisonMax.className = 'counter-max';
        poisonMax.textContent = '/' + POISON_MAX;
        poison.appendChild(poisonMax);

        counters.appendChild(poison);
        seat.appendChild(counters);

        return seat;
    }

    function symbolImage(key, className, alt) {
        const symbol = Art.meta(key);
        const img = document.createElement('img');
        img.className = className;
        img.src = symbol ? symbol.symbol : '';
        img.alt = alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => img.remove());
        return img;
    }

    function buildManaCard(player, index) {
        const card = document.createElement('div');
        card.className = 'mana-card';
        card.dataset.manaSeat = String(index);
        Art.applyAccent(card, player.color);

        const head = document.createElement('div');
        head.className = 'mana-card-head';
        const tag = document.createElement('span');
        tag.className = 'mana-card-tag';
        tag.textContent = 'J' + (index + 1);
        const name = document.createElement('span');
        name.className = 'mana-card-name';
        name.textContent = player.name.trim() || ('Jugador ' + (index + 1));
        head.appendChild(tag);
        head.appendChild(name);
        card.appendChild(head);

        const cells = document.createElement('div');
        cells.className = 'mana-cells';
        MANA.forEach((key) => {
            const color = Art.meta(key);
            const cell = document.createElement('div');
            cell.className = 'mana-cell';
            cell.dataset.color = key;

            const top = document.createElement('div');
            top.className = 'mana-cell-top';
            top.appendChild(symbolImage(key, 'mana-cell-sym', color ? color.name : key));
            const value = document.createElement('output');
            value.className = 'mana-cell-value';
            value.dataset.role = 'mana-' + key;
            value.textContent = String(player.mana[key] || 0);
            top.appendChild(value);
            cell.appendChild(top);

            const buttons = document.createElement('div');
            buttons.className = 'mana-cell-buttons';
            buttons.appendChild(makeButton('−', {
                className: 'counter-btn', action: 'mana', mana: key, delta: -1, seat: index,
            }, 'Quitar un maná ' + (color ? color.name : key) + ' al jugador ' + (index + 1)));
            buttons.appendChild(makeButton('+', {
                className: 'counter-btn', action: 'mana', mana: key, delta: 1, seat: index,
            }, 'Añadir un maná ' + (color ? color.name : key) + ' al jugador ' + (index + 1)));
            cell.appendChild(buttons);

            cells.appendChild(cell);
        });
        card.appendChild(cells);

        return card;
    }

    function syncToolbar() {
        if (el.status) {
            el.status.textContent = state.count + ' jugadores · ' + state.startLife + ' vidas';
        }
        if (el.count) {
            Array.prototype.forEach.call(el.count.querySelectorAll('[data-count]'), (btn) => {
                const active = Number(btn.dataset.count) === state.count;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }
        if (el.startLife) el.startLife.value = String(state.startLife);
        if (el.rotate) el.rotate.checked = state.rotate;
    }

    function syncValues() {
        if (!el.seats) return;
        load();
        state.players.slice(0, state.count).forEach((player, index) => {
            const seat = el.seats.querySelector('[data-seat="' + index + '"]');
            if (!seat) return;

            const life = seat.querySelector('[data-role="life"]');
            if (life) {
                life.textContent = String(player.life);
                const box = life.parentNode;
                if (box && box.classList) {
                    box.classList.toggle('is-dead', player.life <= 0);
                    box.classList.toggle('is-low', player.life > 0 && player.life <= 5);
                }
            }

            const poison = seat.querySelector('[data-role="poison"]');
            if (poison) poison.textContent = String(player.poison);
            const poisonBox = seat.querySelector('[data-role="poison-box"]');
            if (poisonBox) poisonBox.classList.toggle('is-lethal', player.poison >= POISON_MAX);
        });

        if (el.mana) {
            state.players.slice(0, state.count).forEach((player, index) => {
                MANA.forEach((key) => {
                    const out = el.mana.querySelector(
                        '[data-mana-seat="' + index + '"] [data-role="mana-' + key + '"]');
                    if (!out) return;
                    out.textContent = String(player.mana[key] || 0);
                    const cell = out.closest ? out.closest('.mana-cell') : null;
                    if (cell) cell.classList.toggle('is-empty', !player.mana[key]);
                });
            });
        }
        syncToolbar();
    }

    function renderMana() {
        if (!el.mana) return;
        el.mana.innerHTML = '';
        state.players.slice(0, state.count).forEach((player, index) => {
            el.mana.appendChild(buildManaCard(player, index));
        });
    }

    function render() {
        if (!el.seats) return;
        load();
        el.seats.dataset.count = String(state.count);
        el.seats.innerHTML = '';
        for (let index = 0; index < state.count; index += 1) {
            el.seats.appendChild(buildSeat(state.players[index], index));
        }
        renderMana();
        syncValues();
    }

    // ------------------------------------------------------------------
    // EVENTOS
    // ------------------------------------------------------------------
    function notify(message, type) {
        if (typeof App !== 'undefined' && App.notify) {
            App.notify(message, type);
            return;
        }
        if (el.status) el.status.textContent = message;
    }

    function onSeatClick(event) {
        const btn = event.target.closest ? event.target.closest('button[data-action]') : null;
        if (!btn) return;
        const index = Number(btn.dataset.seat);
        const delta = Number(btn.dataset.delta) || 0;
        if (btn.dataset.action === 'life') adjust(index, delta);
        else if (btn.dataset.action === 'poison') adjustPoison(index, delta);
        else if (btn.dataset.action === 'reset-seat') resetSeat(index);
    }

    function onManaClick(event) {
        const btn = event.target.closest
            ? event.target.closest('button[data-action="mana"]')
            : null;
        if (!btn) return;
        adjustMana(Number(btn.dataset.seat), btn.dataset.mana, Number(btn.dataset.delta) || 0);
    }

    function onCountClick(event) {
        const btn = event.target.closest ? event.target.closest('button[data-count]') : null;
        if (!btn) return;
        setCount(btn.dataset.count);
    }

    // El reinicio de toda la mesa se pide dos veces (evita borrar por error).
    function onResetClick() {
        if (!el.reset) return;
        if (resetArmed) {
            resetArmed = false;
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = null;
            el.reset.classList.remove('is-armed');
            el.reset.textContent = '🔄 Reiniciar mesa';
            resetAll();
            notify('Mesa reiniciada a ' + load().startLife + ' vidas', 'success');
            return;
        }
        resetArmed = true;
        el.reset.classList.add('is-armed');
        el.reset.textContent = '⚠️ ¿Reiniciar todo?';
        resetTimer = setTimeout(() => {
            resetArmed = false;
            resetTimer = null;
            el.reset.classList.remove('is-armed');
            el.reset.textContent = '🔄 Reiniciar mesa';
        }, 3200);
    }

    function onClearMana() {
        clearMana();
        notify('Maná flotante vaciado', 'info');
    }

    // ------------------------------------------------------------------
    // ARRANQUE
    // ------------------------------------------------------------------
    function init() {
        el.seats = document.getElementById('tableSeats');
        el.mana = document.getElementById('tableMana');
        el.status = document.getElementById('tableStatus');
        el.count = document.getElementById('tableCount');
        el.startLife = document.getElementById('tableStartLife');
        el.rotate = document.getElementById('tableRotate');
        el.reset = document.getElementById('tableReset');
        el.clearMana = document.getElementById('tableManaClear');
        if (!el.seats) return;

        if (el.count) el.count.addEventListener('click', onCountClick);
        if (el.startLife) {
            el.startLife.addEventListener('change', () => setStartLife(el.startLife.value));
        }
        if (el.rotate) {
            el.rotate.addEventListener('change', () => setRotate(el.rotate.checked));
        }
        if (el.reset) el.reset.addEventListener('click', onResetClick);
        if (el.clearMana) el.clearMana.addEventListener('click', onClearMana);
        el.seats.addEventListener('click', onSeatClick);
        if (el.mana) el.mana.addEventListener('click', onManaClick);

        render();
    }

    return {
        init,
        refresh: render,
        getState: load,
        defaultState,
        sanitize,
        setCount,
        setStartLife,
        setRotate,
        adjust,
        adjustPoison,
        adjustMana,
        clearMana,
        resetSeat,
        resetAll,
        setName,
        setColor,
        POISON_MAX,
        MANA,
        COUNTS,
        START_LIVES,
    };
})();
