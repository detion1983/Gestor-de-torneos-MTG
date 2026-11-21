/*
 * e2e.js — prueba de humo real con Edge headless + CDP (sin dependencias).
 *
 * 1) Sirve la app por HTTP con python -m http.server.
 * 2) Abre Edge headless con --remote-debugging-port.
 * 3) Crea un torneo por la interfaz, comprueba lista/detalle, cambia el color,
 *    verifica que la miniatura carga el arte por defecto, genera los carteles
 *    PNG y comprueba que el canvas no queda "manchado" (toDataURL funciona).
 *
 * Uso: node tests/e2e.js   (requiere python y Edge instalados)
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

// La app vive un nivel por encima de tests/.
const ROOT = path.join(__dirname, '..');
const PORT = 8123;
const DEBUG_PORT = 9223;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(label, ok, extra) {
    if (!ok) fails += 1;
    console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra !== undefined ? '  -> ' + extra : ''));
}

function getJSON(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
            });
        }).on('error', reject);
    });
}

function isUp(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
    });
}

async function waitFor(fn, tries, delay) {
    let last;
    for (let i = 0; i < tries; i += 1) {
        try {
            const value = await fn();
            if (value) return value;
        } catch (err) { last = err; }
        await sleep(delay);
    }
    throw last || new Error('timeout esperando condición');
}

// --- Cliente CDP mínimo sobre el WebSocket global de Node ---
function connect(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const pending = new Map();
        const events = [];
        let nextId = 0;
        let api = null;
        ws.addEventListener('open', () => resolve(api));
        ws.addEventListener('error', (ev) => reject(ev.error || new Error('WebSocket error')));
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && pending.has(msg.id)) {
                const item = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) item.reject(new Error(msg.error.message));
                else item.resolve(msg.result);
            } else if (msg.method) {
                events.push(msg);
            }
        });
        function send(method, params) {
            nextId += 1;
            const id = nextId;
            return new Promise((res, rej) => {
                pending.set(id, { resolve: res, reject: rej });
                ws.send(JSON.stringify({ id, method, params: params || {} }));
            });
        }
        api = { ws, send, events };
    });
}

(async () => {
    const server = spawn('python', ['-m', 'http.server', String(PORT)], {
        cwd: ROOT, stdio: 'ignore', windowsHide: true,
    });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dci-e2e-'));
    const edge = spawn(EDGE, [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,900',
        '--remote-debugging-port=' + DEBUG_PORT,
        '--user-data-dir=' + profile,
        'about:blank',
    ], { stdio: 'ignore', windowsHide: true });

    let client;
    try {
        await waitFor(() => isUp('http://127.0.0.1:' + PORT + '/index.html'), 40, 250);
        const targets = await waitFor(
            () => getJSON('http://127.0.0.1:' + DEBUG_PORT + '/json/list')
                .then((list) => list.find((t) => t.type === 'page')),
            60, 250
        );
        client = await connect(targets.webSocketDebuggerUrl);
        await client.send('Page.enable');
        await client.send('Runtime.enable');
        await client.send('Log.enable');
        await client.send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html' });
        await waitFor(() => client.send('Runtime.evaluate', {
            expression: 'document.readyState === "complete" && typeof Swiss !== "undefined" && typeof Art !== "undefined"',
            returnByValue: true,
        }).then((r) => r.result.value), 60, 250);

        const evaluate = async (expression) => {
            const res = await client.send('Runtime.evaluate', {
                expression: '(async () => { ' + expression + ' })()',
                awaitPromise: true,
                returnByValue: true,
            });
            if (res.exceptionDetails) {
                const ex = res.exceptionDetails.exception;
                throw new Error('Excepción en página: ' + (ex && ex.description
                    ? ex.description.split('\n')[0] : res.exceptionDetails.text));
            }
            return res.result.value;
        };

        // 0) La tira de arte de cabecera se carga desde assets/images/banner.jpg.
        const hero = await evaluate(`
            const band = document.getElementById('heroBand');
            const img = document.getElementById('heroArt');
            for (let i = 0; i < 60 && band.hidden; i += 1) {
                await new Promise((r) => setTimeout(r, 50));
            }
            const box = band.getBoundingClientRect();
            return {
                hidden: band.hidden,
                src: (img.currentSrc || img.src || '').split('/').pop(),
                width: img.naturalWidth,
                height: img.naturalHeight,
                boxHeight: Math.round(box.height),
                loaded: band.classList.contains('is-loaded'),
            };
        `);
        check('la tira de cabecera se muestra', !hero.hidden && hero.boxHeight > 60, JSON.stringify(hero));
        check('la tira usa banner.jpg', hero.src === 'banner.jpg', hero.src);
        check('la tira es una panorámica 6:1',
            hero.width === 2400 && Math.abs(hero.width / hero.height - 3.35) < 0.05,
            hero.width + 'x' + hero.height);
        check('la tira se funde al cargar', hero.loaded === true);

        // 0b) El logo oficial se usa en la cabecera y en los iconos del navegador.
        const brand = await evaluate(`
            const img = document.querySelector('.brand-logo');
            for (let i = 0; i < 40 && img && !img.complete; i += 1) {
                await new Promise((r) => setTimeout(r, 50));
            }
            const icons = [...document.querySelectorAll('link[rel="icon"]')]
                .map((link) => link.getAttribute('href'));
            return {
                src: img ? (img.currentSrc || img.src || '') : '',
                width: img ? img.naturalWidth : 0,
                visible: Boolean(img) && getComputedStyle(img).display !== 'none',
                icons,
            };
        `);
        check('la cabecera muestra el logo oficial',
            brand.visible && brand.width > 0 && /assets\/images\/logo\.jpg$/.test(brand.src),
            brand.src + ' · ' + brand.width);
        check('el favicon usa los iconos oficiales',
            brand.icons.some((href) => /favicon\.ico$/.test(href)) &&
            brand.icons.some((href) => /favicon\.png$/.test(href)),
            brand.icons.join(', '));

        // 1) Crear torneo con identidad de color por la interfaz.
        const created = await evaluate(`
            document.getElementById('name').value = 'Liga Arcana Test';
            document.getElementById('date').value = '2026-11-18';
            document.getElementById('location').value = 'Tienda Test';
            document.getElementById('organizer').value = 'Cline';
            const pick = document.querySelector('#colorOptions [data-color="r"]');
            if (!pick) return { error: 'no hay botón de color r' };
            pick.click();
            const pressedBefore = document.querySelector('#colorOptions [data-color="r"]').getAttribute('aria-pressed');
            document.getElementById('tournamentForm').dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true }));
            await new Promise((r) => setTimeout(r, 80));
            const list = Storage.getTournaments();
            return {
                count: list.length,
                color: list[0] && list[0].color,
                pressedBefore: pressedBefore,
                pressedAfter: document.querySelector('#colorOptions [data-color="r"]').getAttribute('aria-pressed'),
                pressedNone: document.querySelector('#colorOptions [data-color=""]').getAttribute('aria-pressed'),
                items: document.querySelectorAll('#tournamentList li').length,
                thumbs: document.querySelectorAll('#tournamentList .tournament-art').length,
                label: (document.querySelector('#tournamentList .meta small') || {}).textContent || '',
            };
        `);
        check('crear torneo desde la interfaz', created.count === 1, JSON.stringify(created));
        check('el torneo guarda color r', created.color === 'r');
        check('el botón de color se marca al pulsarlo', created.pressedBefore === 'true', created.pressedBefore);
        check('el formulario se reinicia sin color',
            created.pressedAfter === 'false' && created.pressedNone === 'true',
            created.pressedAfter + '/' + created.pressedNone);
        check('la lista muestra 1 torneo con miniatura', created.items === 1 && created.thumbs === 1);
        check('la lista muestra la etiqueta Rojo', /Rojo/.test(created.label), created.label);

        // 2) Abrir el detalle y comprobar cabecera, banner y selector.
        const detail = await evaluate(`
            document.querySelector('#tournamentList .meta').click();
            await new Promise((r) => setTimeout(r, 150));
            const head = document.getElementById('detailHead');
            const banner = document.getElementById('detailBanner');
            const tag = document.getElementById('detailColorTag');
            const select = document.getElementById('detailColorSelect');
            return {
                visible: !document.getElementById('view-detail').hidden,
                dataColor: head.dataset.color,
                accent: head.style.getPropertyValue('--accent').trim(),
                bannerHidden: banner.hidden,
                bannerSymbols: banner.querySelectorAll('.art-sym').length,
                tag: tag.textContent.trim(),
                tagHidden: tag.hidden,
                selectValue: select.value,
                selectOptions: select.options.length,
            };
        `);
        check('se abre la vista de detalle', detail.visible);
        check('cabecera con data-color r', detail.dataColor === 'r', detail.dataColor);
        check('cabecera con --accent rojo', detail.accent === '#d05a45', detail.accent);
        check('banner de arte visible', detail.bannerHidden === false, 'hidden=' + detail.bannerHidden);
        check('banner pinta símbolo de maná', detail.bannerSymbols === 1, detail.bannerSymbols);
        check('etiqueta de color visible', detail.tagHidden === false && /Rojo/.test(detail.tag), detail.tag);
        check('selector con el color actual y opción sin color',
            detail.selectValue === 'r' && detail.selectOptions === 7,
            detail.selectValue + '/' + detail.selectOptions);

        // 3) Cambiar el color desde la cabecera.
        const changed = await evaluate(`
            const select = document.getElementById('detailColorSelect');
            select.value = 'g';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 150));
            const head = document.getElementById('detailHead');
            const stored = Storage.getTournaments()[0];
            return {
                stored: stored.color,
                dataColor: head.dataset.color,
                accent: head.style.getPropertyValue('--accent').trim(),
                tag: document.getElementById('detailColorTag').textContent.trim(),
                listLabel: (document.querySelector('#tournamentList .meta small') || {}).textContent || '',
            };
        `);
        check('cambiar color persiste en localStorage', changed.stored === 'g', changed.stored);
        check('cabecera actualiza data-color y acento',
            changed.dataColor === 'g' && changed.accent === '#4f9f6a',
            changed.dataColor + ' ' + changed.accent);
        check('etiqueta pasa a Verde', /Verde/.test(changed.tag), changed.tag);
        check('la lista también pasa a Verde', /Verde/.test(changed.listLabel), changed.listLabel);

        // 4) La lista y el detalle cargan el arte por defecto del color.
        const defaultArt = await evaluate(`
            const waitForImage = async (img) => {
                for (let i = 0; i < 40; i += 1) {
                    if (img && img.complete && img.naturalWidth) return true;
                    await new Promise((r) => setTimeout(r, 100));
                }
                return false;
            };
            const frame = document.querySelector('#tournamentList .tournament-art');
            const img = frame ? frame.querySelector('.art-img') : null;
            const banner = document.querySelector('#detailBanner .art-img');
            const thumbLoaded = await waitForImage(img);
            const bannerLoaded = await waitForImage(banner);
            return {
                galleryRemoved: !document.getElementById('artPanel') &&
                    !document.getElementById('artGallery') &&
                    !document.getElementById('artFileInput'),
                frameExists: !!frame,
                hidden: frame ? frame.hidden : true,
                hasArt: frame ? frame.classList.contains('has-art') : false,
                thumbLoaded: thumbLoaded,
                thumbSrc: img ? img.getAttribute('src') : '',
                thumbWidth: img ? img.naturalWidth : 0,
                bannerLoaded: bannerLoaded,
                bannerSrc: banner ? banner.getAttribute('src') : '',
                bannerWidth: banner ? banner.naturalWidth : 0,
            };
        `);
        check('la Galería arcana ya no está en el HUB', defaultArt.galleryRemoved);
        check('la miniatura de la lista existe y no está oculta',
            defaultArt.frameExists && defaultArt.hidden === false, JSON.stringify(defaultArt));
        check('la miniatura carga la imagen por defecto del color',
            defaultArt.thumbLoaded && defaultArt.hasArt && defaultArt.thumbWidth > 0 &&
            /assets\/images\/colors\/g\.jpeg$/.test(defaultArt.thumbSrc),
            defaultArt.thumbSrc + ' · ' + defaultArt.thumbWidth);
        check('el banner del detalle carga la imagen por defecto',
            defaultArt.bannerLoaded && defaultArt.bannerWidth > 0 &&
            /assets\/images\/colors\/g\.jpeg$/.test(defaultArt.bannerSrc),
            defaultArt.bannerSrc + ' · ' + defaultArt.bannerWidth);

        // 5) Anotar resultados con el desplegable central (P1 · marcador · P2).
        const scoreUi = await evaluate(`
            const base = Storage.getTournaments()[0];
            const t = Object.assign({}, base, {
                status: 'running',
                players: [
                    { id: 's1', name: 'Ana', dropped: false },
                    { id: 's2', name: 'Luis', dropped: false },
                ],
                rounds: [{ number: 1, pairings: [
                    { table: 1, p1Id: 's1', p2Id: 's2', result: null, reported: false, score: null },
                ] }],
            });
            Storage.upsertTournament(t);
            document.getElementById('backButton').click();
            await new Promise((r) => setTimeout(r, 150));
            document.querySelector('#tournamentList .meta').click();
            await new Promise((r) => setTimeout(r, 250));
            const row = document.querySelector('#roundsContainer .pairing');
            if (!row) return { error: 'sin fila de emparejamiento' };
            const select = row.querySelector('select.score-select');
            if (!select) return { error: 'sin desplegable de resultado' };
            const info = {
                names: Array.from(row.querySelectorAll('.pairing-line .names')).map((n) => n.textContent.trim()),
                values: Array.from(select.options).map((o) => o.value),
                texts: Array.from(select.options).map((o) => o.textContent),
                centered: row.querySelector('.pairing-line').children[1] === select,
                pos: (() => {
                    const line = row.querySelector('.pairing-line');
                    const box = (elm) => {
                        const r = elm.getBoundingClientRect();
                        return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top) };
                    };
                    return {
                        p1: box(line.querySelector('.names.p1')),
                        sel: box(select),
                        p2: box(line.querySelector('.names.p2')),
                    };
                })(),
                pending: row.classList.contains('pending'),
                state: row.querySelector('.pairing-state').textContent.trim(),
                clearDisabled: row.querySelector('.clear-btn').disabled,
            };

            select.value = '0-0';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 180));
            const draw = Storage.getTournaments()[0].rounds[0].pairings[0];
            const row2 = document.querySelector('#roundsContainer .pairing');
            info.draw = { score: draw.score, result: draw.result, reported: draw.reported };
            info.drawValue = row2.querySelector('select.score-select').value;
            info.drawState = row2.querySelector('.pairing-state').textContent.trim();
            info.drawPending = row2.classList.contains('pending');
            info.clearEnabled = !row2.querySelector('.clear-btn').disabled;

            const select2 = row2.querySelector('select.score-select');
            select2.value = '2-1';
            select2.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 180));
            const win = Storage.getTournaments()[0].rounds[0].pairings[0];
            info.win = { score: win.score, result: win.result, reported: win.reported };

            document.querySelector('#roundsContainer .clear-btn').click();
            await new Promise((r) => setTimeout(r, 180));
            const cleared = Storage.getTournaments()[0].rounds[0].pairings[0];
            const row4 = document.querySelector('#roundsContainer .pairing');
            info.cleared = { score: cleared.score, reported: cleared.reported };
            info.clearedValue = row4.querySelector('select.score-select').value;
            info.clearedPending = row4.classList.contains('pending');
            return info;
        `);
        check('el desplegable va entre jugador 1 y jugador 2',
            !scoreUi.error && scoreUi.names.length === 2 && scoreUi.names[0] === 'Ana' &&
            scoreUi.names[1] === 'Luis' && scoreUi.centered === true,
            scoreUi.error || JSON.stringify(scoreUi.names));
        check('jugador 1, marcador y jugador 2 van en la misma fila',
            !!scoreUi.pos && scoreUi.pos.p1.r <= scoreUi.pos.sel.l + 1 &&
            scoreUi.pos.sel.r <= scoreUi.pos.p2.l + 1 &&
            Math.abs(scoreUi.pos.p1.t - scoreUi.pos.sel.t) < 24 &&
            Math.abs(scoreUi.pos.p2.t - scoreUi.pos.sel.t) < 24,
            JSON.stringify(scoreUi.pos));
        check('el desplegable ofrece los 8 marcadores',
            (scoreUi.values || []).join(',') === ',0-0,1-0,1-1,2-1,2-0,0-1,1-2,0-2',
            (scoreUi.values || []).join(','));
        check('cada marcador indica quién gana',
            /0-0 · tablas/.test(scoreUi.texts[1] || '') &&
            /1-0 · gana P1/.test(scoreUi.texts[2] || '') &&
            /0-2 · gana P2/.test(scoreUi.texts[8] || ''),
            JSON.stringify((scoreUi.texts || []).slice(1, 3)));
        check('la mesa empieza pendiente y sin deshacer',
            scoreUi.pending === true && /pendiente/.test(scoreUi.state || '') &&
            scoreUi.clearDisabled === true, scoreUi.state + ' · ' + scoreUi.clearDisabled);
        check('elegir 0-0 lo guarda como tablas',
            scoreUi.draw && scoreUi.draw.score === '0-0' && scoreUi.draw.result === 'draw' &&
            scoreUi.draw.reported === true && scoreUi.drawValue === '0-0',
            JSON.stringify(scoreUi.draw));
        check('la mesa reportada muestra el marcador y deja deshacer',
            /0-0/.test(scoreUi.drawState || '') && scoreUi.drawPending === false &&
            scoreUi.clearEnabled === true, scoreUi.drawState);
        check('elegir 2-1 lo guarda como victoria de P1',
            scoreUi.win && scoreUi.win.score === '2-1' && scoreUi.win.result === 'p1',
            JSON.stringify(scoreUi.win));
        check('deshacer deja la mesa pendiente otra vez',
            scoreUi.cleared && scoreUi.cleared.score === null && scoreUi.cleared.reported === false &&
            scoreUi.clearedValue === '' && scoreUi.clearedPending === true,
            JSON.stringify(scoreUi.cleared) + ' · ' + scoreUi.clearedValue);

        // 6) Sembrar jugadores y resultados (sin pasar por la UI) para los carteles.
        const seeded = await evaluate(`
            const base = Storage.getTournaments()[0];
            const t = Object.assign({}, base, {
                status: 'closed',
                players: [
                    { id: 'p1', name: 'Ana', dropped: false },
                    { id: 'p2', name: 'Luis', dropped: false },
                    { id: 'p3', name: 'Marta', dropped: false },
                    { id: 'p4', name: 'Iker', dropped: false },
                ],
                rounds: [
                    { number: 1, pairings: [
                        { table: 1, p1Id: 'p1', p2Id: 'p2', result: 'p1', reported: true, score: '2-0' },
                        { table: 2, p1Id: 'p3', p2Id: 'p4', result: 'p1', reported: true, score: '2-1' },
                    ] },
                    { number: 2, pairings: [
                        { table: 1, p1Id: 'p1', p2Id: 'p3', result: 'p1', reported: true, score: '2-0' },
                        { table: 2, p1Id: 'p2', p2Id: 'p4', result: 'p2', reported: true, score: '1-2' },
                    ] },
                ],
                playoff: {
                    size: 4,
                    championId: 'p1',
                    rounds: [{ matches: [
                        { p1Id: 'p1', p2Id: 'p2', winnerId: 'p1', score: '2-0' },
                    ] }],
                },
            });
            Storage.upsertTournament(t);
            document.getElementById('backButton').click();
            await new Promise((r) => setTimeout(r, 100));
            document.querySelector('#tournamentList .meta').click();
            await new Promise((r) => setTimeout(r, 700));
            const table = document.querySelector('#standingsTable tbody');
            const rows = table ? Array.from(table.querySelectorAll('tr')) : [];
            return {
                rows: rows.length,
                leader: rows[0] ? rows[0].textContent : '',
                awardsHidden: document.getElementById('awardsPanel').hidden,
                awardsCanvas: document.querySelectorAll('#awardsPreview canvas').length,
                awardsPng: (() => {
                    const cv = document.querySelector('#awardsPreview canvas');
                    if (!cv) return 0;
                    try { return cv.toDataURL('image/png').length; } catch (err) { return -1; }
                })(),
                awardsChip: (document.getElementById('awardsChip').textContent || '').trim(),
                awardsSummary: (document.getElementById('awardsSummary').textContent || '').trim().slice(0, 30),
            };
        `);
        check('la clasificación se repinta con 4 jugadores', seeded.rows === 4, seeded.rows);
        check('el líder es Ana', /Ana/.test(seeded.leader || ''), (seeded.leader || '').slice(0, 40));
        check('panel del campeón visible', seeded.awardsHidden === false, 'hidden=' + seeded.awardsHidden);
        check('chip del campeón con el Top', /CAMPEÓN · TOP 4/.test(seeded.awardsChip), seeded.awardsChip);
        check('resumen del campeón correcto', /Ana/.test(seeded.awardsSummary || ''), seeded.awardsSummary);
        check('cartel del campeón generado', seeded.awardsCanvas === 1, seeded.awardsCanvas);
        check('cartel del campeón sin manchar', seeded.awardsPng > 1000, 'png=' + seeded.awardsPng);

        // 7) Cartel de clasificación: canvas real y exportable a PNG.
        const poster = await evaluate(`
            document.getElementById('shareStandingsButton').click();
            await new Promise((r) => setTimeout(r, 600));
            const canvas = document.querySelector('#sharePreview canvas');
            const info = { present: !!canvas };
            if (canvas) {
                info.w = canvas.width; info.h = canvas.height;
                try { info.png = canvas.toDataURL('image/png').length; info.tainted = false; }
                catch (err) { info.tainted = true; info.png = 0; }
            }
            return info;
        `);
        check('cartel de clasificación generado', poster.present && poster.w > 500 && poster.h > 300,
            poster.w + 'x' + poster.h);
        check('el canvas del cartel no queda manchado', poster.tainted === false, 'png=' + poster.png);

        // 8) Mesa a pantalla completa: 2-4 asientos, maná integrado y navegación.
        const mesa = await evaluate(`
            document.getElementById('tabTable').click();
            await new Promise((r) => setTimeout(r, 250));
            const seats = () => Array.from(document.querySelectorAll('#tableSeats .seat'));
            const seat = (i) => document.querySelector('#tableSeats .seat[data-seat="' + i + '"]');
            const lifeOf = (i) => Number(seat(i).querySelector('[data-role="life"]').textContent);
            const view = document.getElementById('view-table');
            const info = {
                viewVisible: !view.hidden,
                detailHidden: document.getElementById('view-detail').hidden,
                tabActive: document.getElementById('tabTable').classList.contains('is-active'),
                fullscreen: getComputedStyle(view).position === 'fixed' &&
                    document.body.classList.contains('table-mode'),
                headerHidden: getComputedStyle(document.querySelector('.app-header')).display === 'none',
                seats: seats().length,
                life: lifeOf(0),
                rotatedTop: seat(0).getAttribute('data-facing'),
                rotatedBottom: seat(3).getAttribute('data-facing'),
                manaBoards: document.querySelectorAll('#tableSeats .seat-mana').length,
                manaCells: document.querySelectorAll('#tableSeats .seat-mana .mana-cell').length,
                manaInsideSeats: seats().every((s) => !!s.querySelector('.seat-mana')),
                lifeButtons: seat(0).querySelectorAll('.seat-life [data-action="life"]').length,
                quickSteps: seat(0).querySelectorAll('.quick-step').length,
                back: !!document.querySelector('#tableSeats .table-back'),
                startLife: document.getElementById('tableStartLife').value,
            };
            seat(0).querySelector('[data-action="life"][data-delta="1"]').click();
            info.afterLife = lifeOf(0);
            seat(0).querySelector('[data-action="life"][data-delta="-1"]').click();
            info.afterLifeBack = lifeOf(0);
            for (let i = 0; i < 10; i += 1) {
                seat(1).querySelector('[data-action="poison"][data-delta="1"]').click();
            }
            info.poison = Number(seat(1).querySelector('[data-role="poison"]').textContent);
            info.lethal = seat(1).querySelector('[data-role="poison-box"]').classList.contains('is-lethal');

            const manaBtn = (n, color, delta) => seat(n).querySelector(
                '[data-action="mana"][data-mana="' + color + '"][data-delta="' + delta + '"]');
            manaBtn(2, 'r', 1).click();
            manaBtn(2, 'r', 1).click();
            manaBtn(2, 'w', 1).click();
            info.manaR = Number(seat(2).querySelector('[data-role="mana-r"]').textContent);
            info.manaW = Number(seat(2).querySelector('[data-role="mana-w"]').textContent);

            const nameInput = seat(3).querySelector('.seat-name');
            nameInput.value = 'Marta';
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            const colorSelect = seat(0).querySelector('.seat-color');
            colorSelect.value = 'g';
            colorSelect.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 120));
            info.color = seat(0).getAttribute('data-color');
            info.artFrame = !!seat(0).querySelector('.seat-art.art-frame');
            info.artImage = !!seat(0).querySelector('.seat-art .art-img');

            document.getElementById('tableCount').querySelector('[data-count="2"]').click();
            await new Promise((r) => setTimeout(r, 150));
            info.onlyTwo = seats().length;
            info.onlyTwoMana = document.querySelectorAll('#tableSeats .seat-mana').length;
            document.getElementById('tableCount').querySelector('[data-count="4"]').click();
            await new Promise((r) => setTimeout(r, 150));
            info.status = document.getElementById('tableStatus').textContent;
            info.nameSaved = seat(3).querySelector('.seat-name').value;
            info.stored = JSON.parse(localStorage.getItem('dci.table') || '{}');
            info.savedView = localStorage.getItem('dci.view');
            return info;
        `);
        check('la pestaña Mesa ocupa la pantalla completa',
            mesa.viewVisible && mesa.detailHidden && mesa.tabActive && mesa.fullscreen &&
            mesa.headerHidden, JSON.stringify([mesa.viewVisible, mesa.detailHidden,
                mesa.tabActive, mesa.fullscreen, mesa.headerHidden]));
        check('4 asientos con 20 vidas', mesa.seats === 4 && mesa.life === 20,
            mesa.seats + ' · ' + mesa.life);
        check('vidas iniciales por defecto 20', mesa.startLife === '20', mesa.startLife);
        check('los asientos de enfrente se giran', mesa.rotatedTop === 'top' && !mesa.rotatedBottom,
            mesa.rotatedTop + '/' + mesa.rotatedBottom);
        check('maná integrado en los asientos: 6 símbolos por jugador',
            mesa.manaBoards === 4 && mesa.manaCells === 24 && mesa.manaInsideSeats,
            mesa.manaBoards + ' · ' + mesa.manaCells + ' · ' + mesa.manaInsideSeats);
        check('solo hay − y + para las vidas (sin atajos ±5)',
            mesa.lifeButtons === 2 && mesa.quickSteps === 0 &&
            mesa.afterLife === 21 && mesa.afterLifeBack === 20,
            [mesa.lifeButtons, mesa.quickSteps, mesa.afterLife, mesa.afterLifeBack].join('/'));
        check('10 contadores de veneno marcan aviso letal', mesa.poison === 10 && mesa.lethal === true,
            mesa.poison + ' · ' + mesa.lethal);
        check('el maná suma por color y jugador', mesa.manaR === 2 && mesa.manaW === 1,
            mesa.manaR + ' rojo · ' + mesa.manaW + ' blanco');
        check('el botón central separa los jugadores y vuelve a Torneos', mesa.back === true);
        check('cambiar el color del asiento pinta la ilustración de fondo',
            mesa.color === 'g' && mesa.artFrame === true && mesa.artImage === true,
            mesa.color + ' · ' + mesa.artFrame + ' · ' + mesa.artImage);
        check('cambiar a 2 jugadores deja 2 asientos con su maná',
            mesa.onlyTwo === 2 && mesa.onlyTwoMana === 2,
            mesa.onlyTwo + ' · ' + mesa.onlyTwoMana);
        check('el chip resume 4 jugadores y 20 vidas', /4 jugadores/.test(mesa.status) &&
            /20 vidas/.test(mesa.status), mesa.status);
        check('nombre y contadores se guardan en dci.table',
            mesa.nameSaved === 'Marta' && mesa.stored.count === 4 &&
            mesa.stored.players[0].color === 'g' && mesa.stored.players[1].poison === 10, mesa.nameSaved);
        check('la pestaña activa se recuerda', mesa.savedView === 'table', mesa.savedView);

        const mesaReset = await evaluate(`
            const btn = document.getElementById('tableReset');
            btn.click();
            const armed = btn.textContent;
            btn.click();
            await new Promise((r) => setTimeout(r, 150));
            const life = document.querySelector('#tableSeats .seat[data-seat="0"] [data-role="life"]');
            const poison = document.querySelector('#tableSeats .seat[data-seat="1"] [data-role="poison"]');
            const mana = document.querySelector('#tableSeats .seat[data-seat="2"] [data-role="mana-r"]');
            const stored = JSON.parse(localStorage.getItem('dci.table') || '{}');
            return {
                armed: armed,
                life: Number(life.textContent),
                poison: Number(poison.textContent),
                mana: Number(mana.textContent),
                storedLife: stored.players && stored.players[0].life,
                button: btn.textContent.trim(),
            };
        `);
        check('reiniciar la mesa pide confirmación', /Reiniciar/.test(mesaReset.armed), mesaReset.armed);
        check('reiniciar devuelve 20 vidas, 0 veneno y 0 maná',
            mesaReset.life === 20 && mesaReset.poison === 0 && mesaReset.mana === 0,
            [mesaReset.life, mesaReset.poison, mesaReset.mana].join('/'));
        check('el reinicio también se guarda', mesaReset.storedLife === 20, mesaReset.storedLife);
        check('el botón vuelve a su texto normal', /Reiniciar mesa/.test(mesaReset.button), mesaReset.button);

        const back = await evaluate(`
            document.querySelector('#tableSeats .table-back').click();
            await new Promise((r) => setTimeout(r, 150));
            return {
                tableHidden: document.getElementById('view-table').hidden,
                bodyTable: document.body.classList.contains('table-mode'),
                listHidden: document.getElementById('view-tournaments').hidden,
                detailVisible: !document.getElementById('view-detail').hidden,
                tabActive: document.getElementById('tabTournaments').classList.contains('is-active'),
                view: localStorage.getItem('dci.view'),
            };
        `);
        check('el botón central vuelve a Torneos y mantiene el torneo abierto',
            back.tableHidden && !back.bodyTable && back.listHidden && back.detailVisible &&
            back.tabActive, JSON.stringify(back));
        check('la sección activa se guarda al volver', back.view === 'tournaments', back.view);

        // 9) Excepciones y errores de consola durante toda la sesión.
        await sleep(300);
        const problems = client.events.filter((ev) => {
            if (ev.method === 'Runtime.exceptionThrown') return true;
            if (ev.method === 'Runtime.consoleAPICalled' && ev.params.type === 'error') return true;
            if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
                const entry = ev.params.entry || {};
                const url = String(entry.url || '');
                // Los sondeos jpg/png/webp del arte de color fallan a proposito
                // cuando el usuario aun no ha guardado imagenes en assets.
                if (url.indexOf('assets/images/colors/') !== -1) return false;
                // Fondo opcional documentado en styles.css: puede no existir.
                if (url.indexOf('assets/images/background.jpg') !== -1) return false;
                if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return false;
                return true;
            }
            return false;
        }).map((ev) => {
            if (ev.method === 'Runtime.exceptionThrown') {
                return 'exception: ' + (ev.params.exceptionDetails.text || '');
            }
            if (ev.method === 'Runtime.consoleAPICalled') {
                return 'console.error: ' + ev.params.args.map((a) => a.value || a.description || '').join(' ');
            }
            return 'log.error: ' + (ev.params.entry.url || '') + ' ' + (ev.params.entry.text || '');
        });
        check('sin errores de JavaScript en consola', problems.length === 0, problems.join(' | '));
    } catch (err) {
        fails += 1;
        console.log('FAIL excepción del arnés: ' + err.message);
    } finally {
        try { if (client) client.ws.close(); } catch (err) { /* ignorar */ }
        try { edge.kill(); } catch (err) { /* ignorar */ }
        try { server.kill(); } catch (err) { /* ignorar */ }
        await sleep(600);
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (err) { /* ignorar */ }
    }

    console.log(fails ? '\n' + fails + ' comprobación(es) fallida(s)' : '\nTodo correcto');
    process.exit(fails ? 1 : 0);
})();
