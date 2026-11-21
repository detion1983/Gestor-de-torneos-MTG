/*
 * smoke.js — comprobación rápida de la lógica de color/arte sin navegador.
 * Carga art.js, swiss.js y storage.js en un contexto vm con stubs mínimos.
 *
 * Uso: node tests/smoke.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// La app vive un nivel por encima de tests/.
const root = path.join(__dirname, '..');
let fails = 0;
function check(label, ok, extra) {
    if (!ok) fails += 1;
    console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra ? '  -> ' + extra : ''));
}

function makeContext(initialStore) {
    const store = Object.assign({}, initialStore || {});
    const ctx = {
        console,
        JSON, Math, Date, Promise, Object, Array, String, Number, Set, Map, RegExp, Error,
        setTimeout, clearTimeout,
        localStorage: {
            getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; },
        },
        location: { protocol: 'http:' },
        document: {
            createElement: () => ({
                classList: { add() {}, remove() {} },
                dataset: {},
                style: { setProperty() {}, removeProperty() {} },
                appendChild() {},
                addEventListener() {},
            }),
        },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    ['js/art.js', 'js/table.js', 'js/swiss.js', 'js/storage.js'].forEach((file) => {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
    });
    return { ctx, store };
}

const { ctx } = makeContext();
// Los modulos usan `const X = (() => {...})();`, asi que sus nombres viven en
// el ambito lexico del contexto y se leen evaluando su nombre, no como props.
const grab = (context, name) => vm.runInContext(name, context);
const Art = grab(ctx, 'Art');
const Swiss = grab(ctx, 'Swiss');
const Storage = grab(ctx, 'Storage');

check('Art/Swiss/Storage cargados', !!Art && !!Swiss && !!Storage);

// --- Catálogo de colores ---
const keys = Art.list().map((c) => c.key);
check('catálogo con 6 identidades', keys.join('') === 'wubrgc', keys.join(''));

Art.list().forEach((color) => {
    const symbolOk = fs.existsSync(path.join(root, color.symbol));
    check('símbolo en disco: ' + color.key + ' (' + color.symbol + ')', symbolOk);
    check('acento hex válido: ' + color.key, /^#[0-9a-f]{6}$/i.test(color.accent), color.accent);
    check('nombres de archivo de arte: ' + color.key,
        color.files.every((f) => f.indexOf(color.key + '.') === 0), color.files.join(','));
});

// --- normalize / meta / labels ---
check("normalize('R') === 'r'", Art.normalize('R') === 'r');
check("normalize(' G ') === ''", Art.normalize(' G ') === '');
check('normalize(null) === ""', Art.normalize(null) === '');
check('meta("r").name === Rojo', Art.meta('r') && Art.meta('r').name === 'Rojo');
check('meta("z") === null', Art.meta('z') === null);
check('shortLabel("") === "Sin color"', Art.shortLabel('') === 'Sin color');
check('label("b") incluye arquetipo', Art.label('b') === 'Negro · Señor demonio', Art.label('b'));

// --- sources: arte por defecto desde la carpeta ---
check('sources("w") usa assets/images/colors/', Art.sources('w')[0] === 'assets/images/colors/w.jpg',
    Art.sources('w').join(', '));
check('sources("") vacío', Art.sources('').length === 0);
check('cada color acepta jpg, jpeg, png y webp', Art.list().every((color) =>
    ['jpg', 'jpeg', 'png', 'webp'].every((ext) => color.files.indexOf(color.key + '.' + ext) >= 0)),
    Art.list().map((c) => c.files.join('|')).join('  '));
check('sources("r") incluye el respaldo .jpeg',
    Art.sources('r').indexOf('assets/images/colors/r.jpeg') === 1, Art.sources('r').join(', '));
const colorDir = path.join(root, 'assets/images/colors');
check('la carpeta de arte por color existe', fs.existsSync(colorDir));
Art.list().forEach((color) => {
    const found = color.files.filter((name) => fs.existsSync(path.join(colorDir, name)));
    check('arte por defecto en disco: ' + color.key, found.length > 0, found.join(', ') || 'ninguno');
});
const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('la Galería arcana ya no está en el HUB',
    !/id="artPanel"/.test(homeHtml) && !/id="artGallery"/.test(homeHtml) &&
    !/id="artFileInput"/.test(homeHtml));

// --- tira de arte de cabecera (assets/images/banner.*) ---
const HERO_FILES = ['banner.jpg', 'banner.jpeg', 'banner.png', 'banner.webp'];
const heroHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const heroCss = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const heroApp = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const heroOnDisk = HERO_FILES.filter((f) => fs.existsSync(path.join(root, 'assets/images', f)));
check('la tira de cabecera está en disco', heroOnDisk.length === 1, heroOnDisk.join(', ') || 'ninguna');
check('index.html monta la banda de cabecera',
    /id="heroBand"/.test(heroHtml) && /id="heroArt"/.test(heroHtml) && /class="hero-band"/.test(heroHtml));
check('app.js prueba los cuatro formatos del banner',
    HERO_FILES.every((f) => heroApp.indexOf(f) >= 0), HERO_FILES.join(', '));
check('la banda tiene estilo propio',
    /\.hero-band\s*\{/.test(heroCss) && /\.hero-art\s*\{/.test(heroCss));
if (heroOnDisk.length === 1) {
    const heroBytes = fs.statSync(path.join(root, 'assets/images', heroOnDisk[0])).size;
    check('el banner pesa menos de 400 KB', heroBytes < 400 * 1024, Math.round(heroBytes / 1024) + ' KB');
}

// --- applyAccent ---
const node = { dataset: {}, style: { value: '', setProperty(k, v) { this.value = k + '=' + v; }, removeProperty() { this.value = ''; } } };
Art.applyAccent(node, 'g');
check('applyAccent data-color', node.dataset.color === 'g');
check('applyAccent --accent', node.style.value === '--accent=#4f9f6a', node.style.value);
delete node.dataset.color;
Art.applyAccent(node, '');
check('applyAccent sin color -> none', node.dataset.color === 'none');

// --- swiss: el color se guarda en el torneo ---
const t = Swiss.createTournament({ name: 'Liga de prueba', date: '2026-11-18', color: 'r' });
check('createTournament guarda color "r"', t.color === 'r', String(t.color));
check('createTournament color inválido -> ""',
    Swiss.createTournament({ name: 'x', color: 'azul' }).color === '', '');
check('createTournament sin color -> ""', Swiss.createTournament({ name: 'x' }).color === '');
if (typeof Swiss.normalizeColor === 'function') {
    check('normalizeColor("B") === "b"', Swiss.normalizeColor('B') === 'b');
}

// --- swiss: marcadores del desplegable de resultados ---
const SCORE_LIST = ['0-0', '1-0', '1-1', '2-1', '2-0', '0-1', '1-2', '0-2'];
check('Swiss.SCORES tiene los 8 marcadores',
    Swiss.SCORES.length === SCORE_LIST.length && SCORE_LIST.every((s) => Swiss.SCORES.indexOf(s) !== -1),
    Swiss.SCORES.join(','));
const draw00 = Swiss.parseScore('0-0');
check('0-0 son tablas sin ganador', draw00 && draw00.winner === 'draw' &&
    draw00.p1 === 0 && draw00.p2 === 0, JSON.stringify(draw00));
const draw11 = Swiss.parseScore('1-1');
check('1-1 son tablas con un game cada uno', draw11 && draw11.winner === 'draw' &&
    draw11.p1 === 1 && draw11.p2 === 1, JSON.stringify(draw11));
check('2-1 es victoria de P1', Swiss.parseScore('2-1').winner === 'p1');
check('1-2 es victoria de P2', Swiss.parseScore('1-2').winner === 'p2');

const res = Swiss.createTournament({ name: 'Resultados', date: '2026-11-18' });
res.players = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto' }];
res.rounds = [{ number: 1, pairings: [
    { table: 1, p1Id: 'a', p2Id: 'b', result: null, reported: false, score: null },
] }];
Swiss.setResult(res, 1, 1, '0-0');
check('setResult guarda 0-0 como tablas', res.rounds[0].pairings[0].score === '0-0' &&
    res.rounds[0].pairings[0].result === 'draw' && res.rounds[0].pairings[0].reported === true);
Swiss.clearResult(res, 1, 1);
check('clearResult deja la mesa pendiente', res.rounds[0].pairings[0].reported === false &&
    res.rounds[0].pairings[0].score === null);

const top = Swiss.createTournament({ name: 'Top', date: '2026-11-18' });
top.playoff = { size: 2, championId: null, rounds: [{ name: 'Final', matches: [
    { slot: 1, p1Id: 'a', p2Id: 'b', p1Seed: 1, p2Seed: 2, score: null, winnerId: null },
] }] };
Swiss.setPlayoffResult(top, 0, 1, '1-1');
check('un empate en el Top no da ganador', top.playoff.rounds[0].matches[0].winnerId === null,
    String(top.playoff.rounds[0].matches[0].winnerId));

// --- storage: el color sobrevive a guardar/leer y exportar/importar ---
Storage.upsertTournament(t);
check('storage devuelve el color', Storage.getTournament(t.id).color === 'r');
const dump = Storage.exportAll();
const third = makeContext();
grab(third.ctx, 'Storage').importAll(JSON.parse(JSON.stringify(dump)));
const reimported = grab(third.ctx, 'Storage').getTournament(t.id);
check('export/import conserva el color', !!reimported && reimported.color === 'r');

// --- mesa: estado, topes y persistencia ---
const Table = grab(ctx, 'Table');
check('Table cargado', !!Table);
const mesa = Table.getState();
check('mesa por defecto: 4 jugadores · 20 vidas', mesa.count === 4 && mesa.startLife === 20, mesa.count + ' · ' + mesa.startLife);
check('mesa con 4 asientos', mesa.players.length === 4, String(mesa.players.length));
check('nombres por defecto', mesa.players[0].name === 'Jugador 1', mesa.players[0].name);
check('maná inicial a 0', mesa.players.every((p) => Object.keys(p.mana).length === 6 &&
    Object.keys(p.mana).every((k) => p.mana[k] === 0)));

Table.adjust(0, -3);
check('restar 3 vidas deja 17', Table.getState().players[0].life === 17, Table.getState().players[0].life);
Table.adjust(0, 5);
check('sumar 5 vidas deja 22', Table.getState().players[0].life === 22, Table.getState().players[0].life);
Table.adjust(1, -999);
check('las vidas tienen suelo (-99)', Table.getState().players[1].life === -99, Table.getState().players[1].life);

Table.adjustPoison(1, 12);
check('el veneno se puede pasar de 10', Table.getState().players[1].poison === 12);
Table.adjustPoison(2, -5);
check('el veneno no baja de 0', Table.getState().players[2].poison === 0);

Table.adjustMana(2, 'u', 2);
Table.adjustMana(2, 'U', 1);
check('maná azul acumulado (clave en mayúscula aceptada)', Table.getState().players[2].mana.u === 3,
    Table.getState().players[2].mana.u);
Table.adjustMana(2, 'u', -9);
check('el maná no baja de 0', Table.getState().players[2].mana.u === 0);
Table.adjustMana(2, 'z', 3);
check('color de maná inválido se ignora', Table.getState().players[2].mana.u === 0);

Table.setColor(3, 'R');
check('setColor normaliza a "r"', Table.getState().players[3].color === 'r',
    Table.getState().players[3].color);
Table.setName(0, '  Ana  ');
check('setName recorta espacios', Table.getState().players[0].name === 'Ana',
    JSON.stringify(Table.getState().players[0].name));

Table.setCount(2);
check('setCount(2) deja dos asientos', Table.getState().count === 2);
Table.setCount(4);
check('setCount recupera los cuatro', Table.getState().count === 4);
Table.setCount(7);
check('setCount ignora valores fuera de 2-4', Table.getState().count === 4);

Table.setStartLife(40);
check('vidas iniciales 40 se aplican a todos',
    Table.getState().startLife === 40 && Table.getState().players.every((p) => p.life === 40));
Table.resetAll();
check('resetAll deja 40 vidas, 0 veneno y 0 maná',
    Table.getState().players.every((p) => p.life === 40 && p.poison === 0 &&
        Object.keys(p.mana).every((k) => p.mana[k] === 0)));

// --- saneado de datos corruptos ---
const fixed = Table.sanitize({ count: 9, startLife: 33, rotate: 'sí', players: [
    { name: '   ', life: 'x', poison: -5, mana: { w: 500 } },
] });
check('sanitize corrige el número de jugadores', fixed.count === 4, fixed.count);
check('sanitize corrige las vidas iniciales', fixed.startLife === 20, fixed.startLife);
check('sanitize conserva rotate', fixed.rotate === true);
check('sanitize rellena nombre y vida', fixed.players[0].name === 'Jugador 1' && fixed.players[0].life === 20,
    fixed.players[0].name + ' · ' + fixed.players[0].life);
check('sanitize ajusta veneno y maná', fixed.players[0].poison === 0 && fixed.players[0].mana.w === 99,
    fixed.players[0].poison + ' · ' + fixed.players[0].mana.w);

// --- la mesa se guarda en dci.table y se recupera al reabrir ---
const raw = JSON.parse(ctx.localStorage.getItem('dci.table'));
check('se guarda en dci.table', !!raw && raw.count === 4, JSON.stringify(raw && raw.count));
const reopened = makeContext({ 'dci.table': JSON.stringify({
    count: 3, startLife: 40, rotate: false,
    players: [
        { name: 'Marta', color: 'g', life: 33, poison: 2, mana: { w: 1, u: 0, b: 0, r: 0, g: 4, c: 0 } },
    ],
}) }).ctx;
const Table3 = grab(reopened, 'Table');
const restored = Table3.getState();
check('al reabrir recupera 3 jugadores', restored.count === 3, restored.count);
check('al reabrir recupera nombre, color y vida',
    restored.players[0].name === 'Marta' && restored.players[0].color === 'g' && restored.players[0].life === 33,
    restored.players[0].name + ' ' + restored.players[0].color + ' ' + restored.players[0].life);
check('al reabrir recupera veneno y maná', restored.players[0].poison === 2 && restored.players[0].mana.g === 4);
check('al reabrir recupera la rotación', restored.rotate === false);

// --- clasificación: récord V-D-E (victorias-derrotas-empates) ---
const tRecord = Swiss.createTournament({ name: 'Récord V-D-E' });
Swiss.addPlayer(tRecord, 'Ana');
Swiss.addPlayer(tRecord, 'Luis');
Swiss.generateRound(tRecord);
Swiss.setResult(tRecord, 1, 1, '2-1');
const recordWin = Swiss.calculateStandings(tRecord)
    .map((row) => row.matchRecord).sort().join(',');
check('standings: V-D-E tras una victoria (1-0-0 y 0-1-0)',
    recordWin === '0-1-0,1-0-0', recordWin);

Swiss.setResult(tRecord, 1, 1, '1-1');
const recordDraw = Swiss.calculateStandings(tRecord)
    .map((row) => row.matchRecord).sort().join(',');
check('standings: V-D-E tras un empate (0-0-1)',
    recordDraw === '0-0-1,0-0-1', recordDraw);

console.log(fails ? '\n' + fails + ' comprobación(es) fallida(s)' : '\nTodo correcto');
process.exit(fails ? 1 : 0);
