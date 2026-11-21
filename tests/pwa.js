/*
 * pwa.js — comprobaciones estáticas de la PWA (sin navegador).
 * Revisa manifest, iconos, service worker, instalador, aviso de actualización
 * y que las versiones de caché coincidan con APP_VERSION.
 *
 * Uso: node tests/pwa.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let failures = 0;

function ok(name, condition, detail) {
    if (condition) {
        console.log('PASS ' + name + (detail ? '  -> ' + detail : ''));
    } else {
        failures += 1;
        console.error('FAIL ' + name + (detail ? '  -> ' + detail : ''));
    }
}

function pngSize(file) {
    const buffer = fs.readFileSync(path.join(root, file));
    const signature = buffer.slice(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function fileSize(file) {
    return fs.statSync(path.join(root, file)).size;
}

const app = read('js/app.js');
const html = read('index.html');
const css = read('css/styles.css');
const sw = read('sw.js');
const install = read('js/install.js');
const update = read('js/pwa-update.js');
const manifestText = read('manifest.json');

let manifest = null;
try {
    manifest = JSON.parse(manifestText);
} catch (err) {
    console.error('FAIL manifest.json no es JSON valido -> ' + err.message);
    failures += 1;
}

const appVersion = (app.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
const cacheVersion = (sw.match(/CACHE_VERSION\s*=\s*'([^']+)'/) || [])[1];
const cacheName = (sw.match(/const CACHE_NAME\s*=\s*([^;]+);/) || [])[1];

ok('manifest.json valido', Boolean(manifest));
if (manifest) {
    ok('manifest nombre y nombre corto', Boolean(manifest.name && manifest.short_name),
        manifest.short_name);
    ok('manifest start_url', manifest.start_url === './index.html', manifest.start_url);
    ok('manifest scope', manifest.scope === './', manifest.scope);
    ok('manifest display standalone', manifest.display === 'standalone', manifest.display);
    ok('manifest colores de tema', Boolean(manifest.background_color && manifest.theme_color),
        manifest.theme_color);

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    ok('manifest incluye iconos', icons.length >= 3, icons.length + ' iconos');
    ['192x192', '512x512'].forEach((size) => {
        const icon = icons.find((item) => item.sizes === size && item.src.indexOf('maskable') === -1);
        ok('manifest icono ' + size, Boolean(icon), icon && icon.src);
        if (icon) {
            const actual = pngSize(icon.src.replace(/^\.\//, ''));
            ok('icono ' + size + ' existe y mide ' + size,
                Boolean(actual && actual.width + 'x' + actual.height === size),
                actual ? actual.width + 'x' + actual.height : 'falta');
        }
    });
    const maskable = icons.find((item) => (item.purpose || '').indexOf('maskable') !== -1);
    ok('manifest icono maskable 512x512',
        Boolean(maskable && maskable.sizes === '512x512'), maskable && maskable.src);
    if (maskable) {
        const actual = pngSize(maskable.src.replace(/^\.\//, ''));
        ok('icono maskable existe y mide 512x512',
            Boolean(actual && actual.width === 512 && actual.height === 512),
            actual ? actual.width + 'x' + actual.height : 'falta');
    }

    ok('logo oficial de la app en assets/images/logo.jpg',
        fs.existsSync(path.join(root, 'assets/images/logo.jpg')),
        'assets/images/logo.jpg');

    const iconFiles = [
        'assets/images/icons/icon-192.png',
        'assets/images/icons/icon-512.png',
        'assets/images/icons/icon-maskable-512.png',
        'assets/images/icons/apple-touch-icon.png',
    ];
    iconFiles.forEach((file) => {
        ok('icono generado con el logo oficial: ' + file,
            fs.existsSync(path.join(root, file)) && fileSize(file) > 10000,
            fs.existsSync(path.join(root, file)) ? fileSize(file) + ' bytes' : 'falta');
    });
    ok('favicon PNG oficial generado',
        fs.existsSync(path.join(root, 'assets/images/favicon.png')) &&
        fileSize('assets/images/favicon.png') > 2000,
        fs.existsSync(path.join(root, 'assets/images/favicon.png')) ?
            fileSize('assets/images/favicon.png') + ' bytes' : 'falta');
    ok('favicon ICO oficial generado',
        fs.existsSync(path.join(root, 'assets/images/favicon.ico')) &&
        fileSize('assets/images/favicon.ico') > 5000,
        fs.existsSync(path.join(root, 'assets/images/favicon.ico')) ?
            fileSize('assets/images/favicon.ico') + ' bytes' : 'falta');
}

ok('index enlaza manifest.json', /<link\s+rel="manifest"\s+href="manifest\.json"/.test(html));
ok('index enlaza apple-touch-icon', /rel="apple-touch-icon"/.test(html));
ok('index usa el logo oficial en la cabecera',
    /class="brand-logo"[^>]+src="assets\/images\/logo\.jpg"/.test(html));
ok('index enlaza favicon oficial (ICO y PNG)',
    /rel="icon"[^>]+favicon\.ico/.test(html) &&
    /rel="icon"[^>]+favicon\.png/.test(html));
ok('index ya no usa los iconos provisionales',
    !/logo\.svg|favicon\.svg/.test(html));
ok('index tiene boton de instalacion', /id="installAppButton"/.test(html) &&
    /data-install-app/.test(html));
ok('el boton de instalacion usa el icono oficial',
    /install-fab-icon[^>]+icons\/icon-192\.png/.test(html));
ok('index carga install.js', /js\/install\.js\?v=\d+\.\d+\.\d+/.test(html));
ok('index carga pwa-update.js', /js\/pwa-update\.js\?v=\d+\.\d+\.\d+/.test(html));
ok('index no mezcla versiones ?v=', [...new Set([...html.matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]))]
    .every((version) => version === appVersion.replace(/^v/, '')),
    [...new Set([...html.matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]))].join(', '));
ok('APP_VERSION y CACHE_VERSION coinciden', appVersion === cacheVersion,
    appVersion + ' / ' + cacheVersion);
ok('CACHE_NAME usa la version',
    Boolean(cacheName && cacheName.trim() === "'dci-reporter-' + CACHE_VERSION"), cacheName);

const shell = (sw.match(/const APP_SHELL = \[([\s\S]*?)\];/) || [])[1] || '';
[
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/app.js',
    './js/install.js',
    './js/pwa-update.js',
    './assets/images/icons/icon-192.png',
    './assets/images/icons/icon-512.png',
    './assets/images/icons/icon-maskable-512.png',
].forEach((file) => ok('APP_SHELL incluye ' + file, shell.indexOf("'" + file + "'") !== -1));

const shellFiles = [...shell.matchAll(/'([^']+)'/g)]
    .map((match) => match[1])
    .filter((file) => file !== './');
const missingShell = shellFiles.filter((file) => !fs.existsSync(path.join(root, file)));
ok('todos los archivos de APP_SHELL existen', missingShell.length === 0,
    missingShell.length ? missingShell.join(', ') : shellFiles.length + ' archivos');

const extra = (sw.match(/const EXTRA_ASSETS = \[([\s\S]*?)\];/) || [])[1] || '';
ok('EXTRA_ASSETS incluye el logo oficial',
    extra.indexOf("'./assets/images/logo.jpg'") !== -1);
ok('EXTRA_ASSETS incluye el favicon oficial',
    extra.indexOf("'./assets/images/favicon.png'") !== -1 &&
    extra.indexOf("'./assets/images/favicon.ico'") !== -1);
ok('EXTRA_ASSETS ya no incluye logo.svg ni favicon.svg',
    extra.indexOf('logo.svg') === -1 && extra.indexOf('favicon.svg') === -1);
ok('EXTRA_ASSETS incluye el banner', extra.indexOf("'./assets/images/banner.jpg'") !== -1);
ok('EXTRA_ASSETS incluye el arte por color',
    extra.indexOf("'./assets/images/colors/w.jpeg'") !== -1 &&
    extra.indexOf("'./assets/images/colors/c.jpeg'") !== -1);
ok('EXTRA_ASSETS no bloquea la instalación',
    /EXTRA_ASSETS\.map\(\(url\) => cache\.add\(url\)\.catch/.test(sw));

const installBlock = sw.slice(sw.indexOf("self.addEventListener('install'"),
    sw.indexOf("self.addEventListener('activate'"));
ok('la version nueva espera (install sin skipWaiting)', !/skipWaiting\s*\(/.test(installBlock));
ok('el service worker acepta SKIP_WAITING',
    /event\.data === 'SKIP_WAITING'[\s\S]*?skipWaiting\(\)/.test(sw));

ok('install.js registra sw.js', /serviceWorker\.register\('sw\.js'\)/.test(install));
ok('install.js escucha beforeinstallprompt', /beforeinstallprompt/.test(install));
ok('install.js escucha appinstalled', /appinstalled/.test(install));
ok('install.js atiende data-install-app', /data-install-app/.test(install));
ok('install.js muestra el logo oficial en la ayuda',
    /install-help-logo[^>]+logo\.jpg/.test(install));

ok('pwa-update.js vigila updatefound', /updatefound/.test(update));
ok('pwa-update.js vigila controllerchange', /controllerchange/.test(update));
ok('pwa-update.js envia SKIP_WAITING', /postMessage\('SKIP_WAITING'\)/.test(update));
ok('pwa-update.js tiene boton Actualizar', /data-update-apply/.test(update));
ok('pwa-update.js tiene boton cerrar', /data-update-close/.test(update));

ok('estilos del aviso de actualizacion', /\.update-toast\s*\{/.test(css) &&
    /\.update-toast\.is-visible\s*\{/.test(css));
ok('estilos del boton instalar', /\.install-fab\s*\{/.test(css) &&
    /body\.pwa-install-ready \.install-fab\s*\{/.test(css));
ok('estilos de la ayuda de instalacion', /\.install-help\s*\{/.test(css) &&
    /\.install-help-card\s*\{/.test(css));
ok('estilos del logo en la ayuda de instalacion', /\.install-help-logo\s*\{/.test(css));

console.log('');
if (failures) {
    console.error('=== ' + failures + ' COMPROBACIONES PWA FALLIDAS ===');
    process.exit(1);
}
console.log('=== TODAS LAS COMPROBACIONES PWA OK ===');
