/*
 * storage.js
 * Capa de persistencia basada en localStorage.
 *
 * Toda la app lee y escribe a traves de este modulo, de modo que si en el
 * futuro se quiere migrar a un backend online (Firebase, Supabase, etc.) solo
 * hay que reemplazar las funciones de este archivo sin tocar la UI.
 *
 * Datos que guarda:
 *   - "dci.tournaments" : lista de torneos (con rondas y resultados)
 *   - "dci.players"     : registro global de jugadores ya conocidos
 *       (para poder reutilizarlos / recordar inscripciones al crear torneos nuevos)
 */

const Storage = (() => {
    const TOURNAMENTS_KEY = 'dci.tournaments';
    const PLAYERS_KEY = 'dci.players';

    // ---------- Utilidades internas ----------
    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (err) {
            console.error('Error leyendo "' + key + '" de localStorage:', err);
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.error('Error escribiendo "' + key + '" en localStorage:', err);
        }
    }

    // ---------- Torneos ----------
    function getTournaments() {
        return readJSON(TOURNAMENTS_KEY, []);
    }

    function saveTournaments(list) {
        writeJSON(TOURNAMENTS_KEY, list);
    }

    function getTournament(id) {
        return getTournaments().find((t) => t.id === id) || null;
    }

    function upsertTournament(tournament) {
        const list = getTournaments();
        const idx = list.findIndex((t) => t.id === tournament.id);
        if (idx >= 0) {
            list[idx] = tournament;
        } else {
            list.push(tournament);
        }
        saveTournaments(list);
        return tournament;
    }

    function deleteTournament(id) {
        const list = getTournaments().filter((t) => t.id !== id);
        saveTournaments(list);
    }

    // ---------- Registro global de jugadores ----------
    // Permite "recordar" inscripciones: al inscribir un jugador en un torneo,
    // se guarda en el registro global para autocompletar en torneos futuros.
    function getKnownPlayers() {
        return readJSON(PLAYERS_KEY, []);
    }

    function rememberPlayers(names) {
        const known = getKnownPlayers();
        const set = new Set(known.map((p) => p.toLowerCase()));
        let changed = false;
        names.forEach((name) => {
            const clean = (name || '').trim();
            if (clean && !set.has(clean.toLowerCase())) {
                known.push(clean);
                set.add(clean.toLowerCase());
                changed = true;
            }
        });
        if (changed) {
            known.sort((a, b) => a.localeCompare(b, 'es'));
            writeJSON(PLAYERS_KEY, known);
        }
        return known;
    }

    // ---------- Import / Export ----------
    function exportAll() {
        return {
            exportedAt: new Date().toISOString(),
            tournaments: getTournaments(),
            players: getKnownPlayers(),
        };
    }

    function importAll(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Formato de importacion invalido.');
        }
        if (Array.isArray(data.tournaments)) {
            saveTournaments(data.tournaments);
        }
        if (Array.isArray(data.players)) {
            writeJSON(PLAYERS_KEY, data.players);
        }
    }

    return {
        getTournaments,
        saveTournaments,
        getTournament,
        upsertTournament,
        deleteTournament,
        getKnownPlayers,
        rememberPlayers,
        exportAll,
        importAll,
    };
})();
