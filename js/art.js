/*
 * art.js
 * Identidad de color de los torneos y arte asociado.
 *
 * Cada torneo puede llevar una identidad de color (blanco, azul, negro, rojo,
 * verde o artefacto). Esa identidad decora la lista de torneos, la cabecera
 * del detalle y los carteles que se comparten.
 *
 * Arte por color:
 *   - Se busca la imagen en assets/images/colors/<clave>.jpg
 *     (también se aceptan .jpeg, .png y .webp). Si no existe, se pinta un
 *     degradado con el símbolo de maná: la app nunca se rompe por falta de arte.
 *
 * El arte es fijo: se edita en la carpeta, no se sube ni se guarda desde la app.
 *
 * Simbolos de mana: assets/images/symbols/<clave>.svg (SVG oficiales).
 */

const Art = (() => {
    const VALID = ['w', 'u', 'b', 'r', 'g', 'c'];

    // Catalogo de identidades de color. "arch" es el arquetipo de la ilustracion.
    const COLORS = [
        {
            key: 'w', name: 'Blanco', arch: 'Ángel guardián', accent: '#efe6c8',
            symbol: 'assets/images/symbols/w.svg',
            files: ['w.jpg', 'w.jpeg', 'w.png', 'w.webp'],
        },
        {
            key: 'u', name: 'Azul', arch: 'Hechicero astrónomo', accent: '#4a8fd4',
            symbol: 'assets/images/symbols/u.svg',
            files: ['u.jpg', 'u.jpeg', 'u.png', 'u.webp'],
        },
        {
            key: 'b', name: 'Negro', arch: 'Señor demonio', accent: '#9c86b8',
            symbol: 'assets/images/symbols/b.svg',
            files: ['b.jpg', 'b.jpeg', 'b.png', 'b.webp'],
        },
        {
            key: 'r', name: 'Rojo', arch: 'Dragón de la montaña', accent: '#d05a45',
            symbol: 'assets/images/symbols/r.svg',
            files: ['r.jpg', 'r.jpeg', 'r.png', 'r.webp'],
        },
        {
            key: 'g', name: 'Verde', arch: 'Guardián del bosque', accent: '#4f9f6a',
            symbol: 'assets/images/symbols/g.svg',
            files: ['g.jpg', 'g.jpeg', 'g.png', 'g.webp'],
        },
        {
            key: 'c', name: 'Artefacto', arch: 'Gólem de relojería', accent: '#cfc7b4',
            symbol: 'assets/images/symbols/c.svg',
            files: ['c.jpg', 'c.jpeg', 'c.png', 'c.webp'],
        },
    ];

    const byKey = {};
    COLORS.forEach((color) => { byKey[color.key] = color; });

    // ------------------------------------------------------------------
    // CATALOGO
    // ------------------------------------------------------------------
    // Devuelve la clave valida ('w', 'u'...) o '' si no hay identidad.
    function normalize(value) {
        const key = String(value || '').toLowerCase();
        return VALID.indexOf(key) >= 0 ? key : '';
    }

    // Datos de una identidad de color (o null si no tiene).
    function meta(key) {
        return byKey[normalize(key)] || null;
    }

    // Lista completa de identidades (copia para no exponer el catalogo).
    function list() {
        return COLORS.slice();
    }

    // Etiqueta corta: "Blanco". Sin color devuelve "Sin color".
    function shortLabel(key) {
        const color = meta(key);
        return color ? color.name : 'Sin color';
    }

    // Etiqueta larga: "Blanco · Ángel guardián".
    function label(key) {
        const color = meta(key);
        return color ? color.name + ' · ' + color.arch : 'Sin color';
    }

    // Aplica el acento de color a un nodo (data-color + variable CSS --accent).
    function applyAccent(node, key) {
        if (!node) return;
        const color = meta(key);
        node.dataset.color = color ? color.key : 'none';
        if (color) {
            node.style.setProperty('--accent', color.accent);
        } else {
            node.style.removeProperty('--accent');
        }
    }

    // Fuentes a probar para pintar el arte de un color: los archivos de
    // assets/images/colors/ en orden (jpg, jpeg, png, webp).
    function sources(key) {
        const color = meta(key);
        if (!color) return [];
        return color.files.map((name) => 'assets/images/colors/' + name);
    }

    // ------------------------------------------------------------------
    // PINTADO EN EL DOM
    // ------------------------------------------------------------------
    // Pinta el arte de un color dentro de un contenedor: imagen (con cadena
    // de respaldo jpg -> jpeg -> png -> webp), degradado de fondo y símbolo.
    function paint(container, key, opts) {
        opts = opts || {};
        if (!container) return container;
        const color = meta(key);
        container.innerHTML = '';
        container.classList.add('art-frame');
        applyAccent(container, color ? color.key : '');

        if (!color) return container;

        const chain = sources(color.key);
        if (chain.length) {
            const img = document.createElement('img');
            img.className = 'art-img';
            img.alt = opts.alt || (color.name + ' · ' + color.arch);
            img.loading = opts.eager ? 'eager' : 'lazy';
            img.decoding = 'async';
            img.addEventListener('load', () => container.classList.add('has-art'));
            img.addEventListener('error', () => {
                // Si falla el formato actual, prueba el siguiente de la cadena
                // (jpg -> jpeg -> png -> webp) sin saltarse ninguno.
                if (chain.length) {
                    img.src = chain.shift();
                } else {
                    img.remove();
                    container.classList.remove('has-art');
                }
            });
            img.src = chain.shift();
            container.appendChild(img);
        }

        if (opts.symbol !== false) {
            const sym = document.createElement('img');
            sym.className = 'art-sym';
            sym.src = color.symbol;
            sym.alt = '';
            sym.loading = 'lazy';
            sym.setAttribute('aria-hidden', 'true');
            sym.addEventListener('error', () => sym.remove());
            container.appendChild(sym);
        }

        return container;
    }
    // ------------------------------------------------------------------
    // IMAGENES PARA LOS CARTELES (CANVAS)
    // ------------------------------------------------------------------
    function loadImage(src) {
        return new Promise((resolve) => {
            if (!src) { resolve(null); return; }
            const img = new Image();
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', () => resolve(null));
            img.src = src;
        });
    }

    // En file:// dibujar archivos locales "mancha" el canvas y rompe la
    // exportacion PNG, asi que solo usamos imagenes del disco si la app se
    // sirve por http(s) (GitHub Pages, servidor local...).
    function canDrawDefaults() {
        return typeof location !== 'undefined' && location.protocol !== 'file:';
    }

    function firstLoaded(list) {
        if (!list.length) return Promise.resolve(null);
        return loadImage(list[0]).then((img) => {
            if (img || list.length === 1) return img;
            return firstLoaded(list.slice(1));
        });
    }

    // Imagen lista para dibujar en un cartel (o null si no hay/no se puede).
    function posterImage(key) {
        const color = meta(key);
        if (!color || !canDrawDefaults()) return Promise.resolve(null);
        return firstLoaded(sources(color.key));
    }

    // Simbolo de mana en imagen para los carteles (solo por http/https).
    function posterSymbol(key) {
        const color = meta(key);
        if (!color || !canDrawDefaults()) return Promise.resolve(null);
        return loadImage(color.symbol);
    }

    return {
        normalize,
        meta,
        list,
        shortLabel,
        label,
        applyAccent,
        sources,
        paint,
        loadImage,
        posterImage,
        posterSymbol,
    };
})();

