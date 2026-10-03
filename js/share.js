/*
 * share.js
 * Genera contenido para compartir por WhatsApp:
 *   - Texto formateado (emparejamientos / clasificacion / bracket).
 *   - Imagen PNG dibujada con Canvas (descargable o compartible).
 * No depende de librerias externas.
 */

const Share = (() => {
    // Construye el texto completo de una ronda + clasificacion.
    function roundText(tournament, roundNumber, opts) {
        opts = opts || {};
        const round = (roundNumber != null)
            ? tournament.rounds.find((r) => r.number === roundNumber)
            : tournament.rounds[tournament.rounds.length - 1];
        if (!round) return '';

        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Ronda ' + round.number);
        const meta = [];
        if (tournament.date) meta.push('📅 ' + formatDate(tournament.date));
        if (tournament.location) meta.push('📍 ' + tournament.location);
        if (meta.length) lines.push(meta.join(' · '));
        lines.push('');
        lines.push('━━━ EMPAREJAMIENTOS ━━━');

        round.pairings.forEach((pr) => {
            const p1 = playerName(tournament, pr.p1Id);
            if (pr.p2Id === null) {
                lines.push('Mesa ' + pr.table + ' · ' + p1 + ' (BYE)');
            } else {
                lines.push('Mesa ' + pr.table + ' · ' + p1 + ' vs ' + playerName(tournament, pr.p2Id));
            }
        });

        if (opts.includeStandings === false) return lines.join('\n');

        const standings = Swiss.calculateStandings(tournament);
        if (standings.length) {
            lines.push('');
            lines.push('━━━ CLASIFICACIÓN ━━━');
            standings.forEach((s, i) => {
                lines.push(
                    (i + 1) + 'º ' + s.player.name + '  ' + s.matchPoints + ' pts' +
                    '  (OMW ' + fmtPct(s.omw) + ' · GW ' + fmtPct(s.gameWinPct) +
                    ' · OGW ' + fmtPct(s.ogw) + ')'
                );
            });
        }
        return lines.join('\n');
    }

    // Texto del bracket de eliminacion.
    function bracketText(tournament) {
        const p = tournament.playoff;
        if (!p) return '';
        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Eliminación (' + 'Top ' + p.size + ')');
        lines.push('');
        p.rounds.forEach((round) => {
            lines.push('━━━ ' + round.name.toUpperCase() + ' ━━━');
            round.matches.forEach((m) => {
                const p1 = playerName(tournament, m.p1Id, m.p1Seed);
                const p2 = playerName(tournament, m.p2Id, m.p2Seed);
                let line = 'Mesa ' + m.slot + ' · ' + p1 + ' vs ' + p2;
                if (m.score) line += '   → ' + m.score;
                lines.push(line);
            });
            lines.push('');
        });
        if (p.championId) {
            lines.push('🥇 CAMPEÓN: ' + playerName(tournament, p.championId));
        }
        return lines.join('\n').trim();
    }

    // Enlace wa.me para abrir WhatsApp con el texto ya escrito.
    function whatsappLink(text) {
        return 'https://wa.me/?text=' + encodeURIComponent(text);
    }

    // Solo los emparejamientos de la ultima ronda (sin clasificacion).
    function pairingsOnlyText(tournament) {
        const round = tournament.rounds[tournament.rounds.length - 1];
        if (!round) return '';
        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Ronda ' + round.number);
        round.pairings.forEach((pr) => {
            const p1 = playerName(tournament, pr.p1Id);
            if (pr.p2Id === null) {
                lines.push('Mesa ' + pr.table + ' · ' + p1 + ' (BYE)');
            } else {
                lines.push('Mesa ' + pr.table + ' · ' + p1 + ' vs ' + playerName(tournament, pr.p2Id));
            }
        });
        return lines.join('\n');
    }

    // Solo la clasificacion (sin emparejamientos).
    function standingsOnlyText(tournament) {
        const standings = Swiss.calculateStandings(tournament);
        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Clasificación');
        standings.forEach((s, i) => {
            lines.push(
                (i + 1) + 'º ' + s.player.name + '  ' + s.matchPoints + ' pts' +
                '  (OMW ' + fmtPct(s.omw) + ' · GW ' + fmtPct(s.gameWinPct) +
                ' · OGW ' + fmtPct(s.ogw) + ')'
            );
        });
        return lines.join('\n');
    }

    // ------------------------------------------------------------------
    // IMAGEN PNG generada con Canvas
    // ------------------------------------------------------------------
    function renderImage(title, subtitle, blocks) {
        // blocks: [{ heading, lines: [..] }]
        const DPR = 2; // nitidez
        const pad = 40;
        const width = 720;
        const lineH = 34;

        // Calcular altura necesaria.
        let height = pad + 90; // cabecera
        blocks.forEach((b) => { height += 50 + b.lines.length * lineH + 20; });
        height += pad;

        const canvas = document.createElement('canvas');
        canvas.width = width * DPR;
        canvas.height = height * DPR;
        const ctx = canvas.getContext('2d');
        ctx.scale(DPR, DPR);

        // Fondo
        ctx.fillStyle = '#0f2027';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#123c2a';
        ctx.fillRect(0, 0, width, 90);

        // Cabecera
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Segoe UI, Arial';
        ctx.fillText(clip(title, 34), pad, 44);
        ctx.font = '18px Segoe UI, Arial';
        ctx.fillStyle = '#c8e6c9';
        ctx.fillText(clip(subtitle || '', 50), pad, 72);

        let y = 132;
        ctx.font = '22px Consolas, monospace';

        blocks.forEach((b) => {
            ctx.fillStyle = '#ffd54f';
            ctx.font = 'bold 22px Segoe UI, Arial';
            ctx.fillText(b.heading, pad, y);
            y += 34;

            ctx.font = '20px Consolas, monospace';
            b.lines.forEach((ln) => {
                ctx.fillStyle = '#e8f5e9';
                ctx.fillText(clip(ln, 52), pad, y);
                y += lineH;
            });
            y += 16;
        });

        return canvas;
    }

    function clip(text, max) {
        const s = String(text);
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    }

    // ------------------------------------------------------------------
    // UTILIDADES
    // ------------------------------------------------------------------
    function playerName(tournament, id, seed) {
        const p = tournament.players.find((x) => x.id === id);
        const name = p ? p.name : '(pendiente)';
        return seed ? (seed + '. ' + name) : name;
    }

    function formatDate(iso) {
        if (!iso) return '';
        const parts = iso.split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function fmtPct(value) {
        return (value * 100).toFixed(2).replace('.', ',') + '%';
    }

    return {
        roundText,
        pairingsOnlyText,
        standingsOnlyText,
        bracketText,
        whatsappLink,
        renderImage,
        canvasToBlob,
    };
})();
