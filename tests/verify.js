/*
 * verify.js — comprobaciones estáticas de integración (sin navegador).
 * Revisa que los IDs usados existan en index.html, que la API de Art. usada
 * esté exportada, que las clases aplicadas tengan estilo y que las versiones
 * de caché (?v=) coincidan con APP_VERSION.
 *
 * Uso: node tests/verify.js
 */
const fs = require('fs');
const path = require('path');
// La app vive un nivel por encima de tests/.
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const app = read('js/app.js');
const share = read('js/share.js');
const table = read('js/table.js');
const art = read('js/art.js');
const html = read('index.html');
const css = read('css/styles.css');

// 1) IDs usados en app.js frente a los definidos en index.html
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([app, table].flatMap((src) => [...src.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)].map((m) => m[1])));
const missingIds = [...usedIds].filter((id) => !htmlIds.has(id));

// 2) API de Art usada frente a la exportada
const artExport = new Set(
    [...art.matchAll(/^\s{8}([A-Za-z]+),$/gm)].map((m) => m[1])
);
const artUsed = new Set([
    ...[app, share, table].flatMap((src) => [...src.matchAll(/\bArt\.([A-Za-z]+)\s*\(/g)].map((m) => m[1])),
]);
const missingApi = [...artUsed].filter((name) => !artExport.has(name));

// 3) Clases art-/color- usadas en app.js que no aparecen en styles.css
// Un className puede traer varias clases ("btn ghost small"): se comprueba token a token.
const classStrings = [
    ...[app, table].flatMap((src) => [...src.matchAll(/classList\.(?:add|toggle)\(\s*'([^']+)'/g)].map((m) => m[1])),
    ...[app, table].flatMap((src) => [...src.matchAll(/className\s*=\s*'([^']+)'/g)].map((m) => m[1])),
];
const classUsed = new Set();
classStrings.forEach((value) => {
    value.split(/\s+/).filter(Boolean).forEach((token) => classUsed.add(token));
});
const missingClasses = [...classUsed].filter((c) => !css.includes('.' + c));

console.log('IDs usados:', usedIds.size, '| faltan en index.html:', missingIds.length ? missingIds : 'ninguno');
console.log('API Art usada:', [...artUsed].sort().join(', '));
console.log('API Art exportada:', [...artExport].sort().join(', '));
console.log('Art API faltante:', missingApi.length ? missingApi : 'ninguna');
console.log('Clases sin estilo:', missingClasses.length ? missingClasses : 'ninguna');
console.log('Versión index.html ?v= únicos:', [...new Set([...html.matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]))].join(', '));
console.log('APP_VERSION app.js:', (app.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1]);
