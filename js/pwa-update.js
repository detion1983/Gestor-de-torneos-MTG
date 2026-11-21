/*
 * pwa-update.js
 * Aviso de actualización de la PWA.
 *
 * El service worker nuevo se queda esperando cuando la app ya está abierta.
 * Este módulo lo detecta, muestra un aviso flotante y solo activa la versión
 * nueva cuando el usuario pulsa "Actualizar". Así no se mezclan HTML, CSS y
 * JS de dos versiones en la misma pestaña.
 *
 * Se carga aparte de install.js para que una instalación antigua pueda
 * recibir este aviso la primera vez que se publica.
 */

(function () {
    let updateWorker = null;
    let updateNotice = null;
    let updateRequested = false;
    let updateFallback = null;

    function ensureUpdateNotice() {
        if (updateNotice) return updateNotice;

        updateNotice = document.createElement('div');
        updateNotice.className = 'update-toast';
        updateNotice.setAttribute('role', 'status');
        updateNotice.setAttribute('aria-live', 'polite');
        updateNotice.innerHTML =
            '<span class="update-toast-text">🔄 Hay una versión nueva disponible.</span>' +
            '<span class="update-toast-actions">' +
            '<button type="button" class="update-toast-button" data-update-apply>Actualizar</button>' +
            '<button type="button" class="update-toast-close" data-update-close ' +
            'aria-label="Cerrar aviso de actualización">✕</button>' +
            '</span>';
        document.body.appendChild(updateNotice);
        return updateNotice;
    }

    function showUpdateNotice(worker) {
        if (!worker || !document.body) return;
        updateWorker = worker;
        ensureUpdateNotice().classList.add('is-visible');
    }

    function hideUpdateNotice() {
        if (updateNotice) updateNotice.classList.remove('is-visible');
    }

    function applyUpdate() {
        if (!updateWorker) {
            window.location.reload();
            return;
        }

        updateRequested = true;
        const button = updateNotice && updateNotice.querySelector('[data-update-apply]');
        if (button) {
            button.disabled = true;
            button.textContent = 'Actualizando…';
        }

        try {
            updateWorker.postMessage('SKIP_WAITING');
        } catch (err) {
            window.location.reload();
            return;
        }

        clearTimeout(updateFallback);
        updateFallback = setTimeout(() => {
            if (updateRequested) window.location.reload();
        }, 3000);
    }

    function onControllerChange() {
        if (!updateRequested) return;
        updateRequested = false;
        clearTimeout(updateFallback);
        window.location.reload();
    }

    function watchWorker(worker) {
        if (!worker) return;

        const checkState = () => {
            if (worker.state === 'installed') showUpdateNotice(worker);
        };

        worker.addEventListener('statechange', checkState);
        checkState();
    }

    function watchRegistration(registration) {
        if (registration.installing) watchWorker(registration.installing);
        if (registration.waiting) showUpdateNotice(registration.waiting);
        registration.addEventListener('updatefound', () => {
            watchWorker(registration.installing);
        });
    }

    function onDocumentClick(event) {
        const target = event.target instanceof Element ? event.target : event.target.parentElement;
        if (!target) return;

        if (target.closest('[data-update-apply]')) {
            event.preventDefault();
            applyUpdate();
            return;
        }

        if (target.closest('[data-update-close]')) {
            event.preventDefault();
            hideUpdateNotice();
        }
    }

    function onKeydown(event) {
        if (event.key === 'Escape' && updateNotice &&
            updateNotice.classList.contains('is-visible')) {
            hideUpdateNotice();
        }
    }

    function init() {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeydown);
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        // install.js registra el service worker. ready espera a que haya una
        // version activa y devuelve la registration para vigilar actualizaciones.
        navigator.serviceWorker.ready.then(watchRegistration).catch((err) => {
            console.warn('No se pudo comprobar la actualización de la app:', err);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
