/*
 * install.js
 * Boton "Instalar app" para movil (PWA).
 *
 * En Android/Chrome se usa el aviso nativo (beforeinstallprompt). En iPhone,
 * iPad y navegadores sin instalador automatico se muestran los pasos para
 * "Anadir a pantalla de inicio". Tambien registra el service worker que
 * permite abrir la app sin cobertura una vez cargada. El aviso de version nueva
 * vive en pwa-update.js.
 */

(function () {
    let deferredPrompt = null;
    let installed = false;
    let help = null;
    let lastFocus = null;

    const ua = navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.navigator.standalone === true;
    }

    function shouldShowButton() {
        if (location.protocol === 'file:') return false;
        if (installed || isStandalone()) return false;
        if (deferredPrompt) return true;
        return isIos || isAndroid;
    }

    function refresh() {
        if (!document.body) return;
        document.body.classList.toggle('pwa-install-ready', shouldShowButton());
    }

    function showToast(message) {
        if (typeof App !== 'undefined' && App && typeof App.notify === 'function') {
            App.notify(message, 'success');
            return;
        }

        const stack = document.getElementById('toastStack');
        if (!stack) return;
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        stack.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 260);
        }, 3200);
    }

    function helpMarkup() {
        const ios = '<section class="install-help-block">' +
            '<h4>iPhone / iPad · Safari</h4>' +
            '<ol>' +
            '<li>Abre esta página en <strong>Safari</strong>.</li>' +
            '<li>Toca el botón <strong>Compartir</strong> (⬆️) de la barra inferior.</li>' +
            '<li>Elige <strong>Añadir a pantalla de inicio</strong> y confirma con <strong>Añadir</strong>.</li>' +
            '</ol>' +
            '</section>';

        const android = '<section class="install-help-block">' +
            '<h4>Android · Chrome</h4>' +
            '<ol>' +
            '<li>Abre esta página en <strong>Chrome</strong>.</li>' +
            '<li>Toca el menú <strong>⋮</strong> de arriba a la derecha.</li>' +
            '<li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li>' +
            '</ol>' +
            '</section>';

        const desktop = '<section class="install-help-block">' +
            '<h4>Ordenador · Chrome / Edge</h4>' +
            '<ol>' +
            '<li>Pulsa el icono de <strong>instalar</strong> de la barra de direcciones.</li>' +
            '<li>Si no aparece, abre el menú <strong>⋮</strong> y elige <strong>Instalar aplicación</strong>.</li>' +
            '</ol>' +
            '</section>';

        let blocks = desktop + ios + android;
        if (isIos) blocks = ios + android;
        else if (isAndroid) blocks = android + ios;

        return '<div class="install-help-card" role="dialog" aria-modal="true" ' +
            'aria-labelledby="installHelpTitle">' +
            '<div class="install-help-head">' +
            '<h3 id="installHelpTitle">📲 Instalar DCI Reporter</h3>' +
            '<button type="button" class="install-help-close" data-install-close ' +
            'aria-label="Cerrar">✕</button>' +
            '</div>' +
            '<p>La app se abre a pantalla completa y guarda tus torneos en este ' +
            'dispositivo. Elige el método de tu teléfono:</p>' +
            blocks +
            '<p class="install-help-note">La instalación necesita abrir la página por ' +
            '<strong>HTTPS</strong> (por ejemplo, GitHub Pages) o por ' +
            '<strong>localhost</strong>; abrir el archivo <code>index.html</code> ' +
            'directamente no permite instalar la app.</p>' +
            '</div>';
    }

    function ensureHelp() {
        if (help) return help;
        help = document.createElement('div');
        help.className = 'install-help';
        help.hidden = true;
        help.innerHTML = helpMarkup();
        document.body.appendChild(help);
        return help;
    }

    function openHelp() {
        if (!document.body) return;
        const node = ensureHelp();
        lastFocus = document.activeElement;
        node.hidden = false;
        document.body.classList.add('install-help-open');
        const close = node.querySelector('[data-install-close]');
        if (close) close.focus();
    }

    function closeHelp() {
        if (!help || help.hidden) return;
        help.hidden = true;
        document.body.classList.remove('install-help-open');
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    async function install() {
        if (!deferredPrompt) {
            openHelp();
            return;
        }

        const promptEvent = deferredPrompt;
        deferredPrompt = null;

        try {
            promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice && choice.outcome === 'accepted') installed = true;
        } catch (err) {
            openHelp();
        }

        refresh();
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

        const register = () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.warn('No se pudo registrar el service worker:', err);
            });
        };

        if (document.readyState === 'complete') register();
        else window.addEventListener('load', register, { once: true });
    }

    function onDocumentClick(event) {
        const target = event.target instanceof Element ? event.target : event.target.parentElement;
        if (!target) return;

        const trigger = target.closest('[data-install-app]');
        if (trigger) {
            event.preventDefault();
            install();
            return;
        }

        if (target.closest('[data-install-close]')) {
            event.preventDefault();
            closeHelp();
            return;
        }

        if (help && !help.hidden && event.target === help) closeHelp();
    }

    function onKeydown(event) {
        if (event.key === 'Escape' && help && !help.hidden) closeHelp();
    }

    function init() {
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeydown);

        const displayMode = window.matchMedia('(display-mode: standalone)');
        if (displayMode.addEventListener) displayMode.addEventListener('change', refresh);
        else if (displayMode.addListener) displayMode.addListener(refresh);

        refresh();
        registerServiceWorker();
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        refresh();
    });

    window.addEventListener('appinstalled', () => {
        installed = true;
        deferredPrompt = null;
        refresh();
        if (document.body) {
            showToast('✅ App instalada. Búscala en tu pantalla de inicio.');
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
