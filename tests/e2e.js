/*
 * e2e.js — prueba de humo real con Edge headless + CDP (sin dependencias).
 *
 * 1) Sirve la app por HTTP con python -m http.server.
 * 2) Abre Edge headless con --remote-debugging-port.
 * 3) Crea un torneo por la interfaz, comprueba lista/detalle, cambia el color,
 *    sube arte con la galería arcana, genera los carteles PNG y verifica que el
 *    canvas no queda "manchado" (toDataURL funciona).
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

        // 2) Abrir el detalle y comprobar cabecera, banner y galería.
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
                gallery: document.getElementById('artGallery').children.length,
                gallerySymbols: document.querySelectorAll('#artGallery .art-sym').length,
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
        check('galería con 6 tarjetas', detail.gallery === 6, detail.gallery);
        check('galería con 6 símbolos', detail.gallerySymbols === 6, detail.gallerySymbols);

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

        // 4) Subir arte desde la Galería arcana (flujo real de la interfaz).
        const art = await evaluate(`
            const c = document.createElement('canvas');
            c.width = 120; c.height = 180;
            const x = c.getContext('2d');
            const grad = x.createLinearGradient(0, 0, 120, 180);
            grad.addColorStop(0, '#0f3d2a'); grad.addColorStop(1, '#8ad6a1');
            x.fillStyle = grad; x.fillRect(0, 0, 120, 180);
            const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
            const file = new File([blob], 'arte-verde.png', { type: 'image/png' });
            const input = document.getElementById('artFileInput');
            if (!input) return { error: 'no hay input de arte' };
            const upload = document.querySelector('[data-art-upload="g"]');
            if (!upload) return { error: 'no hay botón de subida para g' };
            upload.click();
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 600));
            const stored = JSON.parse(localStorage.getItem('dci.art') || '{}');
            const frames = document.querySelectorAll('#artGallery .art-card-frame');
            const frameG = frames[4] || null;
            return {
                prefix: String(stored.g || '').slice(0, 23),
                hasG: !!stored.g,
                custom: Art.hasCustom('g'),
                firstSource: Art.sources('g')[0].slice(0, 23),
                frames: frames.length,
                galleryHasArt: document.querySelectorAll('#artGallery .art-card-frame.has-art').length,
                galleryCustom: Array.from(document.querySelectorAll('#artGallery .art-card-frame .art-img'))
                    .filter((im) => im.src.indexOf('data:image') === 0).length,
                cardImg: frameG ? (frameG.querySelector('.art-img') || {}).src || '' : '',
                bannerImg: (document.querySelector('#detailBanner .art-img') || {}).src || '',
                thumbImg: (document.querySelector('#tournamentList .tournament-art .art-img') || {}).src || '',
                uploadLabel: (document.querySelector('[data-art-upload="g"]') || {}).textContent || '',
                clearButton: !!document.querySelector('[data-art-clear="g"]'),
            };
        `);
        check('la galería usa el arte subido (JPEG en dci.art)', art.hasG && art.custom &&
            art.prefix.indexOf('data:image/jpeg') === 0, art.prefix);
        check('sources prioriza el arte subido', art.firstSource.indexOf('data:image/jpeg') === 0, art.firstSource);
        check('la galería pinta el arte subido', art.galleryCustom === 1, art.galleryCustom);
        check('la tarjeta del color usa el data URL', art.cardImg.indexOf('data:image/jpeg') === 0,
            art.cardImg.slice(0, 24));
        check('el banner usa el data URL', art.bannerImg.indexOf('data:image/jpeg') === 0,
            art.bannerImg.slice(0, 24));
        check('la miniatura de la lista usa el data URL', art.thumbImg.indexOf('data:image/jpeg') === 0,
            art.thumbImg.slice(0, 24));
        check('la galería ofrece cambiar y quitar el arte',
            /Cambiar/.test(art.uploadLabel) && art.clearButton, art.uploadLabel);

        // 5) Quitar el arte devuelve el degradado de respaldo.
        const cleared = await evaluate(`
            document.querySelector('[data-art-clear="g"]').click();
            await new Promise((r) => setTimeout(r, 400));
            const stored = JSON.parse(localStorage.getItem('dci.art') || '{}');
            const banner = document.querySelector('#detailBanner .art-img');
            return {
                removed: !stored.g,
                custom: Art.hasCustom('g'),
                firstSource: Art.sources('g')[0] || '',
                bannerImg: banner ? banner.src : '',
                uploadLabel: (document.querySelector('[data-art-upload="g"]') || {}).textContent || '',
            };
        `);
        check('quitar arte limpia dci.art', cleared.removed && cleared.custom === false);
        check('el arte vuelve al archivo de respaldo',
            cleared.firstSource.indexOf('assets/images/colors/g.') !== -1, cleared.firstSource);
        check('el botón vuelve a Subir arte', /Subir/.test(cleared.uploadLabel), cleared.uploadLabel);

        // 5b) Anotar resultados con el desplegable central (P1 · marcador · P2).
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

        // 8) Contador de mesa: 2-4 asientos, vidas, veneno, maná y navegación.
        const mesa = await evaluate(`
            document.getElementById('tabTable').click();
            await new Promise((r) => setTimeout(r, 250));
            const seats = () => Array.from(document.querySelectorAll('#tableSeats .seat'));
            const seat = (i) => document.querySelector('#tableSeats .seat[data-seat="' + i + '"]');
            const lifeOf = (i) => Number(seat(i).querySelector('[data-role="life"]').textContent);
            const info = {
                viewVisible: !document.getElementById('view-table').hidden,
                detailHidden: document.getElementById('view-detail').hidden,
                tabActive: document.getElementById('tabTable').classList.contains('is-active'),
                seats: seats().length,
                life: lifeOf(0),
                rotatedTop: seat(0).getAttribute('data-facing'),
                rotatedBottom: seat(3).getAttribute('data-facing'),
                manaCards: document.querySelectorAll('#tableMana .mana-card').length,
                manaCells: document.querySelectorAll('#tableMana .mana-cell').length,
                startLife: document.getElementById('tableStartLife').value,
            };
            seat(0).querySelector('[data-action="life"][data-delta="1"]').click();
            seat(0).querySelector('[data-action="life"][data-delta="-5"]').click();
            info.afterLife = lifeOf(0);
            for (let i = 0; i < 10; i += 1) {
                seat(1).querySelector('[data-action="poison"][data-delta="1"]').click();
            }
            info.poison = Number(seat(1).querySelector('[data-role="poison"]').textContent);
            info.lethal = seat(1).querySelector('[data-role="poison-box"]').classList.contains('is-lethal');

            const manaBtn = (n, color, delta) => document.querySelector(
                '#tableMana [data-mana-seat="' + n + '"] [data-action="mana"][data-mana="' +
                color + '"][data-delta="' + delta + '"]');
            manaBtn(2, 'r', 1).click();
            manaBtn(2, 'r', 1).click();
            manaBtn(2, 'w', 1).click();
            info.manaR = Number(document.querySelector(
                '#tableMana [data-mana-seat="2"] [data-role="mana-r"]').textContent);
            info.manaW = Number(document.querySelector(
                '#tableMana [data-mana-seat="2"] [data-role="mana-w"]').textContent);

            const nameInput = seat(3).querySelector('.seat-name');
            nameInput.value = 'Marta';
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            const colorSelect = seat(0).querySelector('.seat-color');
            colorSelect.value = 'g';
            colorSelect.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((r) => setTimeout(r, 120));
            info.color = seat(0).getAttribute('data-color');
            info.artFrame = !!seat(0).querySelector('.seat-art.art-frame');

            document.getElementById('tableCount').querySelector('[data-count="2"]').click();
            await new Promise((r) => setTimeout(r, 150));
            info.onlyTwo = seats().length;
            document.getElementById('tableCount').querySelector('[data-count="4"]').click();
            await new Promise((r) => setTimeout(r, 150));
            info.status = document.getElementById('tableStatus').textContent;
            info.nameSaved = seat(3).querySelector('.seat-name').value;
            info.stored = JSON.parse(localStorage.getItem('dci.table') || '{}');
            info.savedView = localStorage.getItem('dci.view');
            return info;
        `);
        check('la pestaña Mesa muestra el contador', mesa.viewVisible && mesa.detailHidden && mesa.tabActive,
            JSON.stringify([mesa.viewVisible, mesa.detailHidden, mesa.tabActive]));
        check('4 asientos con 20 vidas', mesa.seats === 4 && mesa.life === 20,
            mesa.seats + ' · ' + mesa.life);
        check('vidas iniciales por defecto 20', mesa.startLife === '20', mesa.startLife);
        check('los asientos de enfrente se giran', mesa.rotatedTop === 'top' && !mesa.rotatedBottom,
            mesa.rotatedTop + '/' + mesa.rotatedBottom);
        check('maná con tarjeta y 6 colores por jugador',
            mesa.manaCards === 4 && mesa.manaCells === 24, mesa.manaCards + ' · ' + mesa.manaCells);
        check('+1 y −5 dejan 16 vidas', mesa.afterLife === 16, mesa.afterLife);
        check('10 contadores de veneno marcan aviso letal', mesa.poison === 10 && mesa.lethal === true,
            mesa.poison + ' · ' + mesa.lethal);
        check('el maná suma por color y jugador', mesa.manaR === 2 && mesa.manaW === 1,
            mesa.manaR + ' rojo · ' + mesa.manaW + ' blanco');
        check('cambiar el color del asiento pinta su arte',
            mesa.color === 'g' && mesa.artFrame === true, mesa.color + ' · ' + mesa.artFrame);
        check('cambiar a 2 jugadores deja 2 asientos', mesa.onlyTwo === 2, mesa.onlyTwo);
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
            const mana = document.querySelector('#tableMana [data-mana-seat="2"] [data-role="mana-r"]');
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
            document.getElementById('tabTournaments').click();
            await new Promise((r) => setTimeout(r, 150));
            return {
                listHidden: document.getElementById('view-tournaments').hidden,
                detailVisible: !document.getElementById('view-detail').hidden,
                tabActive: document.getElementById('tabTournaments').classList.contains('is-active'),
                view: localStorage.getItem('dci.view'),
            };
        `);
        check('volver a Torneos mantiene el torneo abierto',
            back.listHidden && back.detailVisible && back.tabActive, JSON.stringify(back));
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
