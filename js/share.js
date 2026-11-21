/*
 * share.js
 * Texto e imagenes para compartir por WhatsApp / Discord / redes.
 *
 *  - Texto formateado: ronda, emparejamientos, clasificacion y bracket.
 *  - Carteles PNG dibujados con Canvas (sin librerias externas):
 *      renderImage(title, subtitle, blocks)  -> bracket generico
 *      renderStandingsImage(tournament)      -> clasificacion como tabla
 *      renderPairingsImage(tournament, n)    -> ronda como tarjetas por mesa
 *      renderChampionsImage(info)            -> cartel del campeon al cerrar
 *    Todos devuelven un <canvas> listo para copiar, descargar o compartir.
 */

const Share = (() => {
    // Paleta del tema "Arena arcana" (coincide con css/styles.css).
    const C = {
        void: '#08070d',
        night: '#100d1c',
        panel: '#1a1630',
        panel2: '#221c3d',
        gold: '#d9b25f',
        goldBright: '#f3dfae',
        goldDim: '#8a6f35',
        ink: '#efe6d2',
        dim: '#a99f8c',
        line: 'rgba(217, 178, 95, 0.28)',
        lineSoft: 'rgba(217, 178, 95, 0.12)',
        green: '#5fc07f',
    };

    // Cinco colores de mana, en orden WUBRG.
    const MANA = ['#efe6c8', '#4a8fd4', '#9c86b8', '#d05a45', '#4f9f6a'];

    const SERIF = 'Cinzel, Georgia, "Times New Roman", serif';
    const SANS = '"Barlow", "Segoe UI", Arial, sans-serif';
    const MONO = 'Consolas, "Courier New", monospace';

    // ------------------------------------------------------------------
    // TEXTO
    // ------------------------------------------------------------------
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

    // Solo los emparejamientos de la ultima ronda (sin clasificacion).
    function pairingsOnlyText(tournament) {
        const round = tournament.rounds[tournament.rounds.length - 1];
        if (!round) return '';
        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Ronda ' + round.number);
        round.pairings.forEach((pr) => {
            const p2 = pr.p2Id === null ? '(BYE)' : playerName(tournament, pr.p2Id);
            lines.push('Mesa ' + pr.table + ' · ' + playerName(tournament, pr.p1Id) + ' vs ' + p2);
        });
        return lines.join('\n');
    }

    // Solo la clasificacion.
    function standingsOnlyText(tournament) {
        const standings = Swiss.calculateStandings(tournament);
        if (!standings.length) return '';
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

    // Texto del bracket de eliminacion.
    function bracketText(tournament) {
        const p = tournament.playoff;
        if (!p) return '';
        const lines = [];
        lines.push('🏆 ' + tournament.name + ' — Eliminación (Top ' + p.size + ')');
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

    // ------------------------------------------------------------------
    // UTILIDADES DE DIBUJO
    // ------------------------------------------------------------------
    function playerName(tournament, id, seed) {
        const p = tournament.players.find((x) => x.id === id);
        const name = p ? p.name : '(pendiente)';
        return seed ? (seed + '. ' + name) : name;
    }

    function formatDate(iso) {
        if (!iso) return '';
        const parts = String(iso).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function fmtPct(value) {
        return (value * 100).toFixed(2).replace('.', ',') + '%';
    }

    function clip(text, max) {
        const s = String(text);
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }

    // Recorta con puntos suspensivos solo si no cabe con la fuente actual.
    function fitText(ctx, text, maxWidth) {
        const full = String(text);
        if (ctx.measureText(full).width <= maxWidth) return full;
        let cut = full;
        while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
            cut = cut.slice(0, -1);
        }
        return cut + '…';
    }

    function font(weight, size, family) {
        return weight + ' ' + size + 'px ' + family;
    }

    // Ajusta el tamano de la fuente para que el texto quepa en maxWidth.
    function fitFont(ctx, text, maxWidth, startSize, minSize, weight, family) {
        let size = startSize;
        while (size > minSize) {
            ctx.font = font(weight || 700, size, family || SERIF);
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        }
        ctx.font = font(weight || 700, size, family || SERIF);
        return size;
    }

    // Parte un texto en lineas que quepan en maxWidth con la fuente actual.
    function wrapLines(ctx, text, maxWidth) {
        const words = String(text).split(/\s+/).filter(Boolean);
        if (!words.length) return [''];
        const lines = [];
        let current = '';
        words.forEach((word) => {
            const next = current ? current + ' ' + word : word;
            if (ctx.measureText(next).width <= maxWidth || !current) {
                current = next;
            } else {
                lines.push(current);
                current = word;
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function drawManaStrip(ctx, x, y, w, h, alpha) {
        const seg = w / MANA.length;
        ctx.save();
        ctx.globalAlpha = alpha == null ? 0.9 : alpha;
        MANA.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(x + i * seg, y, seg + 0.6, h);
        });
        ctx.restore();
    }

    function drawGlow(ctx, x, y, r, color) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function drawBackdrop(ctx, w, h, art, accent) {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#161029');
        bg.addColorStop(0.55, '#0c0a16');
        bg.addColorStop(1, '#08070d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        if (art) drawArt(ctx, w, h, art);

        drawGlow(ctx, w * 0.5, -40, 420,
            accent ? hexToRgba(accent, 0.26) : 'rgba(155, 122, 232, 0.22)');
        drawGlow(ctx, w * 0.08, h * 0.9, 320, 'rgba(217, 178, 95, 0.12)');
        drawGlow(ctx, w * 0.95, h * 0.75, 300, 'rgba(74, 143, 212, 0.12)');
    }

    // Convierte "#rrggbb" en "rgba(r, g, b, alpha)".
    function hexToRgba(hex, alpha) {
        const value = String(hex || '').replace('#', '');
        if (!/^[0-9a-f]{6}$/i.test(value)) {
            return 'rgba(217, 178, 95, ' + alpha + ')';
        }
        const num = parseInt(value, 16);
        return 'rgba(' + ((num >> 16) & 255) + ', ' +
            ((num >> 8) & 255) + ', ' + (num & 255) + ', ' + alpha + ')';
    }

    // Dibuja el arte de fondo cubriendo todo el cartel, con un velo oscuro
    // para que el texto siga siendo legible.
    function drawArt(ctx, w, h, art) {
        if (!art || !art.width || !art.height) return;
        const scale = Math.max(w / art.width, h / art.height);
        const dw = art.width * scale;
        const dh = art.height * scale;
        ctx.save();
        ctx.drawImage(art, (w - dw) / 2, (h - dh) / 2, dw, dh);
        const veil = ctx.createLinearGradient(0, 0, 0, h);
        veil.addColorStop(0, 'rgba(8, 7, 13, 0.52)');
        veil.addColorStop(0.45, 'rgba(8, 7, 13, 0.74)');
        veil.addColorStop(1, 'rgba(8, 7, 13, 0.93)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    // Barra fina con el acento de la identidad de color del torneo.
    function drawAccentBar(ctx, w, y, accent) {
        if (!accent) return;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, hexToRgba(accent, 0.15));
        grad.addColorStop(0.5, hexToRgba(accent, 0.9));
        grad.addColorStop(1, hexToRgba(accent, 0.15));
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, w, 3);
    }

    // Simbolo de mana (SVG ya cargado) en una posicion y tamano dados.
    function drawSymbol(ctx, symbol, x, y, size, alpha) {
        if (!symbol) return;
        ctx.save();
        ctx.globalAlpha = alpha == null ? 0.9 : alpha;
        ctx.drawImage(symbol, x, y, size, size);
        ctx.restore();
    }

    function letterSpace(ctx, px) {
        if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
    }

    // ------------------------------------------------------------------
    // CARTEL GENERICO (ronda / clasificacion / bracket)
    // options = { art, symbol, accent, colorName }
    // ------------------------------------------------------------------
    function renderImage(title, subtitle, blocks, options) {
        options = options || {};
        const DPR = 2;
        const W = 900;
        const PAD = 46;
        const LINE = 30;
        const symbolSize = options.symbol ? 46 : 0;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = font(400, 17, SANS);

        // Pre-partir las lineas para calcular la altura exacta del cartel.
        const prepared = (blocks || []).map((b) => {
            const lines = [];
            (b.lines || []).forEach((raw) => {
                wrapLines(ctx, String(raw), W - PAD * 2).forEach((l) => lines.push(l));
            });
            return { heading: b.heading || '', lines: lines };
        });

        let H = 152;
        prepared.forEach((b) => { H += (b.heading ? 32 : 8) + b.lines.length * LINE + 22; });
        H = Math.max(H + 56, 360);

        canvas.width = W * DPR;
        canvas.height = H * DPR;
        ctx.scale(DPR, DPR);

        drawBackdrop(ctx, W, H, options.art, options.accent);
        drawManaStrip(ctx, 0, 0, W, 8);
        drawAccentBar(ctx, W, 8, options.accent);

        // Simbolo de mana de la identidad del torneo (arriba a la derecha).
        if (symbolSize) {
            drawSymbol(ctx, options.symbol, W - PAD - symbolSize, 22, symbolSize, 0.95);
        }

        // Cabecera
        ctx.textAlign = 'left';
        const titleWidth = W - PAD * 2 - (symbolSize ? symbolSize + 12 : 0);
        ctx.fillStyle = C.goldBright;
        fitFont(ctx, title, titleWidth, 32, 20, 700, SERIF);
        ctx.fillText(title, PAD, 68);

        ctx.fillStyle = C.dim;
        ctx.font = font(400, 16, SANS);
        ctx.fillText(clip(subtitle || '', 90), PAD, 96);

        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, 118);
        ctx.lineTo(W - PAD, 118);
        ctx.stroke();

        // Bloques
        let y = 158;
        prepared.forEach((b) => {
            if (b.heading) {
                ctx.fillStyle = C.gold;
                ctx.font = font(700, 15, SANS);
                letterSpace(ctx, 2);
                ctx.fillText(String(b.heading).toUpperCase(), PAD, y);
                letterSpace(ctx, 0);
                y += 30;
            } else {
                y += 8;
            }
            ctx.font = font(400, 16, MONO);
            ctx.fillStyle = C.ink;
            b.lines.forEach((ln) => {
                ctx.fillText(ln, PAD, y);
                y += LINE;
            });
            y += 22;
        });

        // Pie
        ctx.font = font(400, 12, SANS);
        ctx.fillStyle = 'rgba(217, 178, 95, 0.6)';
        ctx.textAlign = 'left';
        ctx.fillText('DCI Reporter · Magic: The Gathering', PAD, H - 22);
        ctx.textAlign = 'right';
        const stamp = new Date().toLocaleDateString('es-ES');
        ctx.fillText(options.colorName ? options.colorName + ' · ' + stamp : stamp, W - PAD, H - 22);

        return canvas;
    }

    // ------------------------------------------------------------------
    // CARTELES CON FORMATO DE TABLA
    // ------------------------------------------------------------------
    // La clasificacion y los emparejamientos se dibujan como en la app:
    // cabeceras de columna, filas alternas, mesas con su estado y el
    // marcador en el centro. Nada de volcar el texto en lineas monosespaciadas.
    const BOARD = {
        width: 960,
        pad: 36,
        header: 146,
        footer: 44,
    };

    function boardMeta(tournament) {
        return [formatDate(tournament.date), tournament.location]
            .filter(Boolean).join(' · ');
    }

    function createBoardCanvas(height) {
        const DPR = 2;
        const canvas = document.createElement('canvas');
        canvas.width = BOARD.width * DPR;
        canvas.height = height * DPR;
        const ctx = canvas.getContext('2d');
        ctx.scale(DPR, DPR);
        return { canvas: canvas, ctx: ctx };
    }

    function paintBoardHeader(ctx, width, height, tournament, kicker, options) {
        const PAD = BOARD.pad;
        drawBackdrop(ctx, width, height, options.art, options.accent);
        drawManaStrip(ctx, 0, 0, width, 8);
        drawAccentBar(ctx, width, 8, options.accent);

        if (options.symbol) {
            drawSymbol(ctx, options.symbol, width - PAD - 44, 22, 44, 0.95);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = C.goldDim;
        ctx.font = font(700, 11, SANS);
        letterSpace(ctx, 3);
        ctx.fillText(String(kicker || '').toUpperCase(), PAD, 50);
        letterSpace(ctx, 0);

        const titleWidth = width - PAD * 2 - (options.symbol ? 58 : 0);
        ctx.fillStyle = C.goldBright;
        fitFont(ctx, tournament.name || 'Torneo', titleWidth, 32, 20, 700, SERIF);
        ctx.fillText(tournament.name || 'Torneo', PAD, 84);

        ctx.fillStyle = C.dim;
        ctx.font = font(400, 15, SANS);
        ctx.fillText(clip(boardMeta(tournament) || 'Magic: The Gathering', 90), PAD, 108);

        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, 126);
        ctx.lineTo(width - PAD, 126);
        ctx.stroke();

        return BOARD.header;
    }

    function paintBoardFooter(ctx, width, height, options) {
        const PAD = BOARD.pad;
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(400, 12, SANS);
        ctx.fillStyle = 'rgba(217, 178, 95, 0.6)';
        ctx.textAlign = 'left';
        ctx.fillText('DCI Reporter · Magic: The Gathering', PAD, height - 22);

        ctx.textAlign = 'right';
        const stamp = new Date().toLocaleDateString('es-ES');
        ctx.fillText(options.colorName ? options.colorName + ' · ' + stamp : stamp,
            width - PAD, height - 22);
    }

    function standingColumns(innerWidth) {
        const cols = [
            { label: '#', width: 52, align: 'center' },
            { label: 'JUGADOR', width: 0, align: 'left' },
            { label: 'PTS', width: 70, align: 'center' },
            { label: 'OMW%', width: 94, align: 'center' },
            { label: 'GW%', width: 88, align: 'center' },
            { label: 'OGW%', width: 88, align: 'center' },
        ];
        const fixed = cols.reduce((sum, col) => sum + col.width, 0);
        cols[1].width = innerWidth - fixed;
        return cols;
    }

    // Clasificacion con las mismas columnas y jerarquia que #standingsTable.
    function renderStandingsImage(tournament, options) {
        options = options || {};
        const W = BOARD.width;
        const PAD = BOARD.pad;
        const inner = W - PAD * 2;
        const headH = 40;
        const rowH = 44;
        const standings = Swiss.calculateStandings(tournament);
        const rows = Math.max(standings.length, 1);
        const tableTop = BOARD.header;
        const tableH = headH + rows * rowH;
        const height = tableTop + tableH + 18 + BOARD.footer;

        const board = createBoardCanvas(height);
        const ctx = board.ctx;
        paintBoardHeader(ctx, W, height, tournament, 'Clasificación', options);

        // Cabecera de la tabla, con el mismo degradado que los <th>.
        const thead = ctx.createLinearGradient(0, tableTop, 0, tableTop + headH);
        thead.addColorStop(0, '#322a55');
        thead.addColorStop(1, '#221b3a');
        ctx.fillStyle = thead;
        ctx.fillRect(PAD, tableTop, inner, headH);

        const cols = standingColumns(inner);
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.font = font(700, 12, SANS);
        letterSpace(ctx, 1);
        let hx = PAD;
        cols.forEach((col) => {
            ctx.textAlign = col.align;
            ctx.fillStyle = C.gold;
            const tx = col.align === 'center' ? hx + col.width / 2 : hx + 12;
            ctx.fillText(col.label, tx, tableTop + headH / 2 + 1);
            hx += col.width;
        });
        letterSpace(ctx, 0);

        ctx.strokeStyle = C.line;
        ctx.beginPath();
        ctx.moveTo(PAD, tableTop + headH - 0.5);
        ctx.lineTo(PAD + inner, tableTop + headH - 0.5);
        ctx.stroke();

        // Base opaca bajo las filas: el arte del fondo no debe competir con
        // los numeros. En la web la tabla vive sobre un panel solido.
        ctx.fillStyle = 'rgba(11, 9, 19, 0.86)';
        ctx.fillRect(PAD, tableTop + headH, inner, rows * rowH);

        if (!standings.length) {
            ctx.textAlign = 'center';
            ctx.font = font(400, 16, SANS);
            ctx.fillStyle = C.dim;
            ctx.fillText('Todavía no hay jugadores inscritos.',
                PAD + inner / 2, tableTop + headH + rowH / 2);
        }

        standings.forEach((s, index) => {
            const ry = tableTop + headH + index * rowH;
            const mid = ry + rowH / 2;
            const leader = index === 0;

            ctx.fillStyle = index % 2 === 1
                ? 'rgba(155, 122, 232, 0.055)'
                : 'rgba(11, 9, 19, 0.42)';
            ctx.fillRect(PAD, ry, inner, rowH);
            if (leader) {
                ctx.fillStyle = 'rgba(217, 178, 95, 0.14)';
                ctx.fillRect(PAD, ry, inner, rowH);
                ctx.fillStyle = C.gold;
                ctx.fillRect(PAD, ry, 3, rowH);
            }

            let x = PAD;
            ctx.textAlign = 'center';
            ctx.font = font(700, 17, SERIF);
            ctx.fillStyle = leader ? C.goldBright
                : (index === 1 ? '#cfd3da' : (index === 2 ? '#c98a5b' : C.gold));
            ctx.fillText(String(s.rank), x + cols[0].width / 2, mid + 1);
            x += cols[0].width;

            const nameX = x + 12;
            const badgeW = s.byeCount ? 66 : 0;
            const nameMax = cols[1].width - 24 - (badgeW ? badgeW + 8 : 0);
            ctx.textAlign = 'left';
            ctx.save();
            if (s.player.dropped) ctx.globalAlpha = 0.55;
            fitFont(ctx, s.player.name, nameMax, 17, 13, 600, SANS);
            const shown = fitText(ctx, s.player.name, nameMax);
            ctx.fillStyle = C.ink;
            ctx.fillText(shown, nameX, mid + 1);
            if (s.player.dropped) {
                const nameWidth = ctx.measureText(shown).width;
                ctx.fillStyle = 'rgba(239, 230, 210, 0.65)';
                ctx.fillRect(nameX, mid + 1, nameWidth, 1);
            }
            ctx.restore();

            if (s.byeCount) {
                const bx = x + cols[1].width - 12 - 60;
                ctx.fillStyle = 'rgba(217, 178, 95, 0.14)';
                roundRect(ctx, bx, mid - 10, 60, 20, 7);
                ctx.fill();
                ctx.strokeStyle = C.line;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.textAlign = 'center';
                ctx.font = font(700, 10, SANS);
                ctx.fillStyle = C.gold;
                ctx.fillText('BYE x' + s.byeCount, bx + 30, mid + 1);
            }
            x += cols[1].width;

            const values = [
                String(s.matchPoints),
                fmtPct(s.omw),
                fmtPct(s.gameWinPct),
                fmtPct(s.ogw),
            ];
            values.forEach((value, valueIndex) => {
                const col = cols[valueIndex + 2];
                ctx.textAlign = 'center';
                ctx.font = valueIndex === 0
                    ? font(700, 18, SANS)
                    : font(400, 15, SANS);
                ctx.fillStyle = valueIndex === 3 ? C.dim : C.ink;
                if (s.player.dropped) ctx.globalAlpha = 0.55;
                ctx.fillText(value, x + col.width / 2, mid + 1);
                ctx.globalAlpha = 1;
                x += col.width;
            });

            ctx.strokeStyle = 'rgba(217, 178, 95, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD, ry + rowH - 0.5);
            ctx.lineTo(PAD + inner, ry + rowH - 0.5);
            ctx.stroke();
        });

        // Borde exterior de la tabla.
        ctx.strokeStyle = C.lineSoft;
        ctx.lineWidth = 1;
        ctx.strokeRect(PAD + 0.5, tableTop + 0.5, inner - 1, tableH - 1);
        ctx.restore();

        paintBoardFooter(ctx, W, height, options);
        return board.canvas;
    }

    // Ronda con una tarjeta por mesa (P1 · marcador · P2), igual que en la app.
    function renderPairingsImage(tournament, roundNumber, options) {
        options = options || {};
        const W = BOARD.width;
        const PAD = BOARD.pad;
        const inner = W - PAD * 2;
        const bandH = 42;
        const rowH = 86;
        const gap = 8;
        const round = (roundNumber != null)
            ? tournament.rounds.find((r) => r.number === roundNumber)
            : tournament.rounds[tournament.rounds.length - 1];
        const pairings = round ? round.pairings : [];
        const count = Math.max(pairings.length, 1);
        const listTop = BOARD.header + bandH + 12;
        const height = listTop + count * rowH + (count - 1) * gap + 18 + BOARD.footer;

        const board = createBoardCanvas(height);
        const ctx = board.ctx;
        paintBoardHeader(ctx, W, height, tournament, 'Emparejamientos', options);

        // Banda de la ronda: nombre a la izquierda y progreso a la derecha.
        const band = ctx.createLinearGradient(0, BOARD.header, 0, BOARD.header + bandH);
        band.addColorStop(0, 'rgba(58, 48, 96, 0.9)');
        band.addColorStop(1, 'rgba(28, 23, 48, 0.95)');
        ctx.fillStyle = band;
        ctx.fillRect(PAD, BOARD.header, inner, bandH);
        ctx.fillStyle = C.gold;
        ctx.fillRect(PAD, BOARD.header, 3, bandH);

        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = C.goldBright;
        ctx.font = font(700, 18, SERIF);
        ctx.fillText(round ? 'Ronda ' + round.number : 'Sin rondas',
            PAD + 16, BOARD.header + bandH / 2 + 1);

        let progress = 'Aún no hay mesas';
        if (round) {
            const total = Swiss.playableCount(round);
            const pend = Swiss.pendingCount(round);
            progress = (total - pend) + '/' + total + ' resultados';
        }
        ctx.textAlign = 'right';
        ctx.font = font(700, 12, SANS);
        ctx.fillStyle = C.dim;
        letterSpace(ctx, 1);
        ctx.fillText(progress.toUpperCase(), W - PAD - 16, BOARD.header + bandH / 2 + 1);
        letterSpace(ctx, 0);
        ctx.restore();

        if (!pairings.length) {
            ctx.save();
            ctx.fillStyle = 'rgba(11, 9, 19, 0.68)';
            roundRect(ctx, PAD, listTop, inner, rowH, 8);
            ctx.fill();
            ctx.strokeStyle = C.lineSoft;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = font(400, 16, SANS);
            ctx.fillStyle = C.dim;
            ctx.fillText(round ? 'Esta ronda todavía no tiene mesas.' : 'Genera una ronda para ver los emparejamientos.',
                PAD + inner / 2, listTop + rowH / 2);
            ctx.restore();
        }

        pairings.forEach((pairing, index) => {
            paintPairingCard(ctx, tournament, pairing, PAD,
                listTop + index * (rowH + gap), inner, rowH);
        });

        paintBoardFooter(ctx, W, height, options);
        return board.canvas;
    }

    // Tarjeta de una mesa: cabecera con Mesa + estado y fila P1 · marcador · P2.
    function paintPairingCard(ctx, tournament, pairing, x, y, w, h) {
        const bye = pairing.p2Id === null;
        const done = !bye && !!pairing.reported;
        const pending = !bye && !done;

        const card = ctx.createLinearGradient(x, y, x, y + h);
        if (bye) {
            card.addColorStop(0, 'rgba(43, 88, 58, 0.55)');
            card.addColorStop(1, 'rgba(11, 24, 17, 0.94)');
        } else {
            card.addColorStop(0, 'rgba(30, 25, 52, 0.96)');
            card.addColorStop(1, 'rgba(11, 9, 19, 0.94)');
        }
        ctx.fillStyle = card;
        roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = bye ? 'rgba(95, 192, 127, 0.42)' : C.lineSoft;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = bye ? C.green
            : (pending ? 'rgba(217, 178, 95, 0.65)' : 'rgba(95, 192, 127, 0.55)');
        ctx.fillRect(x + 1, y + 9, 3, h - 18);

        ctx.save();
        ctx.textBaseline = 'middle';

        // Etiqueta de la mesa.
        const tableLabel = 'Mesa ' + pairing.table;
        ctx.font = font(700, 11, SANS);
        letterSpace(ctx, 0.5);
        const pillW = Math.max(72, ctx.measureText(tableLabel.toUpperCase()).width + 20);
        ctx.fillStyle = 'rgba(8, 7, 13, 0.7)';
        roundRect(ctx, x + 14, y + 12, pillW, 22, 6);
        ctx.fill();
        ctx.strokeStyle = bye ? 'rgba(95, 192, 127, 0.45)' : C.line;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = bye ? C.green : C.gold;
        ctx.fillText(tableLabel.toUpperCase(), x + 14 + pillW / 2, y + 23);
        letterSpace(ctx, 0);

        // Estado del resultado, como el .pairing-state de la web.
        const state = bye ? 'BYE · victoria automática'
            : (done ? '✅ ' + (pairing.score || 'guardado') : '⏳ pendiente');
        ctx.textAlign = 'left';
        ctx.font = font(700, 11, SANS);
        ctx.fillStyle = bye || done ? C.green : C.gold;
        ctx.fillText(state, x + 14 + pillW + 12, y + 23);

        // Nombres a los lados y marcador en el centro.
        const boxW = 122;
        const boxX = x + w / 2 - boxW / 2;
        const nameMax = boxX - (x + 16) - 20;
        const p1 = playerName(tournament, pairing.p1Id);
        const p2 = bye ? 'descansa esta ronda' : playerName(tournament, pairing.p2Id);

        ctx.textAlign = 'left';
        ctx.font = font(600, 17, SANS);
        fitFont(ctx, p1, nameMax, 17, 12, 600, SANS);
        ctx.fillStyle = C.ink;
        ctx.fillText(fitText(ctx, p1, nameMax), x + 16, y + 61);

        ctx.textAlign = 'right';
        fitFont(ctx, p2, nameMax, bye ? 14 : 17, 12, bye ? 400 : 600, SANS);
        ctx.fillStyle = bye ? C.dim : C.ink;
        ctx.fillText(fitText(ctx, p2, nameMax), x + w - 16, y + 61);

        const scoreText = bye ? 'BYE' : (done ? (pairing.score || 'OK') : '—');
        ctx.fillStyle = done || bye
            ? 'rgba(95, 192, 127, 0.14)'
            : 'rgba(8, 7, 13, 0.45)';
        roundRect(ctx, boxX, y + 46, boxW, 30, 8);
        ctx.fill();
        if (pending) {
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = C.line;
        } else {
            ctx.strokeStyle = 'rgba(95, 192, 127, 0.55)';
        }
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.textAlign = 'center';
        ctx.font = font(700, 18, MONO);
        ctx.fillStyle = bye || done ? C.green : C.dim;
        ctx.fillText(scoreText, x + w / 2, y + 62);
        ctx.restore();
    }

    function paintAwardCard(ctx, x, y, w, h, data) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(42, 35, 74, 0.94)');
        grad.addColorStop(1, 'rgba(15, 12, 26, 0.94)');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 178, 95, 0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = C.goldDim;
        ctx.font = font(700, 11, SANS);
        letterSpace(ctx, 2);
        ctx.fillText(String(data.label || '').toUpperCase(), x + w / 2, y + 30);
        letterSpace(ctx, 0);

        ctx.fillStyle = C.ink;
        fitFont(ctx, data.name || '—', w - 34, 23, 14, 700, SERIF);
        ctx.fillText(data.name || '—', x + w / 2, y + 68);

        ctx.fillStyle = C.dim;
        ctx.font = font(400, 13, SANS);
        ctx.fillText(clip(data.detail || '', 54), x + w / 2, y + 94);

        drawManaStrip(ctx, x + w / 2 - 42, y + 110, 84, 3, 0.55);
    }

    // ------------------------------------------------------------------
    // CARTEL DEL CAMPEON
    // info = {
    //   tournamentName, meta, chipLabel,
    //   champion: { name, stat, subline, record } | null,
    //   second: { label, name, detail } | null,
    //   third:  { label, name, detail } | null,
    //   emptyText, footer
    // }
    // ------------------------------------------------------------------
    function renderChampionsImage(info) {
        info = info || {};
        const DPR = 2;
        const W = 900;
        const H = 620;

        const canvas = document.createElement('canvas');
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        const ctx = canvas.getContext('2d');
        ctx.scale(DPR, DPR);

        drawBackdrop(ctx, W, H, info.art, info.accent);
        drawManaStrip(ctx, 0, 0, W, 8);
        drawAccentBar(ctx, W, 8, info.accent);

        // Marca de agua con el simbolo de mana detras del nombre.
        if (info.symbol) {
            drawSymbol(ctx, info.symbol, W / 2 - 150, 92, 300, 0.09);
        }

        // Marco doble dorado
        ctx.strokeStyle = 'rgba(217, 178, 95, 0.55)';
        ctx.lineWidth = 2;
        roundRect(ctx, 24, 34, W - 48, H - 62, 18);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(217, 178, 95, 0.18)';
        ctx.lineWidth = 1;
        roundRect(ctx, 34, 44, W - 68, H - 82, 14);
        ctx.stroke();

        // Cabecera
        ctx.textAlign = 'center';
        ctx.fillStyle = C.goldDim;
        ctx.font = font(700, 13, SANS);
        letterSpace(ctx, 3);
        ctx.fillText('DCI REPORTER · MAGIC: THE GATHERING', W / 2, 84);
        letterSpace(ctx, 0);

        // Etiqueta de color arriba a la izquierda y simbolo a la derecha.
        if (info.colorName) {
            ctx.textAlign = 'left';
            ctx.fillStyle = hexToRgba(info.accent || C.gold, 0.95);
            ctx.font = font(700, 11, SANS);
            letterSpace(ctx, 2);
            ctx.fillText(String(info.colorName).toUpperCase(), 58, 88);
            letterSpace(ctx, 0);
            ctx.textAlign = 'center';
        }
        if (info.symbol) {
            drawSymbol(ctx, info.symbol, W - 80, 62, 34, 0.95);
        }

        ctx.fillStyle = C.ink;
        const tournamentName = clip(info.tournamentName || 'Torneo', 60);
        fitFont(ctx, tournamentName, W - 170, 26, 15, 700, SERIF);
        ctx.fillText(tournamentName, W / 2, 118);

        const champion = info.champion && info.champion.name ? info.champion : null;

        // Etiqueta (CAMPEON / LIDER SUIZO...)
        ctx.fillStyle = champion ? C.gold : C.dim;
        ctx.font = font(700, 16, SANS);
        letterSpace(ctx, 4);
        ctx.fillText(info.chipLabel || 'CAMPEÓN', W / 2, 176);
        letterSpace(ctx, 0);

        // Nombre protagonista
        ctx.fillStyle = champion ? C.goldBright : C.dim;
        fitFont(ctx, champion ? champion.name : '—', W - 140, 64, 24, 900, SERIF);
        if (champion) {
            ctx.shadowColor = 'rgba(217, 178, 95, 0.45)';
            ctx.shadowBlur = 28;
        }
        ctx.fillText(champion ? clip(champion.name, 42) : '—', W / 2, 258);
        ctx.shadowBlur = 0;

        if (champion) {
            const stats = [champion.stat, champion.record].filter(Boolean);
            ctx.fillStyle = C.ink;
            ctx.font = font(600, 17, SANS);
            ctx.fillText(stats.join('   ·   '), W / 2, 296);

            if (champion.subline) {
                ctx.fillStyle = C.dim;
                ctx.font = font(400, 14, SANS);
                ctx.fillText(clip(champion.subline, 90), W / 2, 322);
            }
        } else {
            ctx.fillStyle = C.dim;
            ctx.font = font(400, 16, SANS);
            ctx.fillText(info.emptyText || 'El cartel se completa al cerrar el torneo.', W / 2, 300);
        }

        // Separador con rombo central
        const sepY = 356;
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 210, sepY);
        ctx.lineTo(W / 2 - 30, sepY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W / 2 + 30, sepY);
        ctx.lineTo(W / 2 + 210, sepY);
        ctx.stroke();
        ctx.save();
        ctx.translate(W / 2, sepY);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = C.gold;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();

        // Tarjetas secundarias
        const cards = [info.second, info.third].filter(Boolean);
        if (cards.length) {
            const gap = 26;
            const cardW = (W - 96 - gap) / 2;
            const cardH = 130;
            cards.forEach((card, i) => {
                paintAwardCard(ctx, 48 + i * (cardW + gap), 384, cardW, cardH, card);
            });
        }

        // Pie
        ctx.fillStyle = 'rgba(239, 230, 210, 0.78)';
        ctx.font = font(500, 13, SANS);
        ctx.fillText(clip(info.meta || '', 110), W / 2, 552);

        ctx.fillStyle = 'rgba(217, 178, 95, 0.55)';
        ctx.font = font(400, 11, SANS);
        ctx.fillText(info.footer || 'DCI Reporter', W / 2, 576);

        return canvas;
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve) => {
            if (canvas.toBlob) {
                canvas.toBlob(resolve, 'image/png');
            } else {
                resolve(null);
            }
        });
    }

    // Copia un PNG al portapapeles para pegarlo directamente (Ctrl+V en el PC,
    // mantener pulsado > Pegar en el movil). Acepta el Blob o una Promise<Blob>:
    // Safari/iOS solo permiten usar el portapapeles dentro del gesto del usuario
    // y, en cambio, admiten que la imagen se termine de dibujar despues.
    // Devuelve Promise<boolean>: false si el navegador no sabe copiar imagenes.
    function copyImageToClipboard(blobOrPromise) {
        const clipboard = navigator.clipboard;
        if (!clipboard || !clipboard.write || typeof window.ClipboardItem !== 'function') {
            return Promise.resolve(false);
        }
        const blobPromise = Promise.resolve(blobOrPromise);
        const item = (data) => new window.ClipboardItem({ 'image/png': data });
        let first;
        try {
            first = clipboard.write([item(blobPromise)]);
        } catch (err) {
            // Navegadores que no admiten promesas dentro de ClipboardItem:
            // se reintenta abajo con el Blob ya resuelto.
            first = Promise.reject(err);
        }
        return first.then(() => true).catch(() => blobPromise
            .then((blob) => clipboard.write([item(blob)]))
            .then(() => true)
            .catch(() => false));
    }

    return {
        roundText,
        pairingsOnlyText,
        standingsOnlyText,
        bracketText,
        whatsappLink,
        renderImage,
        renderStandingsImage,
        renderPairingsImage,
        renderChampionsImage,
        canvasToBlob,
        copyImageToClipboard,
        playerName,
        formatDate,
    };
})();




