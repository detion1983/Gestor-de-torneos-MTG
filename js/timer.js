/*
 * timer.js
 * Cronometro de ronda para el organizador. Independiente del DOM y de Storage:
 * expone una API de temporizador y avisos acusticos que la UI (app.js) conecta.
 *
 * Caracteristicas:
 *  - Cuenta atras configurable (minutos).
 *  - Aviso acustico 5 minutos antes del final (configurable).
 *  - Aviso al terminar el tiempo.
 *  - Al llegar a 0 el cronometro NO se detiene: sigue contando en NEGATIVO
 *    (tiempo extra / prorroga). La UI lo muestra en rojo.
 *  - addTime(min): suma tiempo en marcha (p. ej. minutos de prorroga).
 *  - Sonidos opcionales en assets/sounds/; si no existen, genera un pitido
 *    por codigo con la Web Audio API (no requiere archivos).
 */

const RoundTimer = (() => {
    // Rutas de sonidos opcionales (si existen se usan; si no, pitido por codigo).
    const SOUNDS = {
        start: 'assets/sounds/round-start.mp3',
        warning: 'assets/sounds/round-warning.mp3',
        end: 'assets/sounds/round-end.mp3',
        tick: 'assets/sounds/round-tick.mp3',
    };

    // Estado interno
    let totalSeconds = 25 * 60; // duracion configurada (por defecto 25 min)
    let remaining = totalSeconds; // segundos restantes
    let running = false;
    let tickHandle = null; // setInterval
    let warningFired = false;
    let endFired = false;
    let lastTickMinute = null;
    let endTimestamp = null;
    let audioCtx = null; // contexto de Web Audio (se crea al primer uso)
    const audioCache = {}; // HTMLAudioElement por clave

    // Callbacks que la UI puede asignar
    let onTick = null; // (remainingSeconds, totalSeconds) cada segundo
    let onWarning = null; // al disparar el aviso de 5 minutos
    let onEnd = null; // al llegar a 0
    let onStateChange = null; // (running) al iniciar/pausar/parar

    // Umbral de aviso (segundos antes del final). 5 minutos por defecto.
    const WARNING_THRESHOLD = 5 * 60;

    // ----------------------------------------------------------------
    // AUDIO
    // ----------------------------------------------------------------
    function ensureAudioCtx() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }
        return audioCtx;
    }

    // Pitido generado por codigo (respaldo si no hay archivos de sonido).
    // kind: 'warning' | 'end' | 'start' | 'tick'
    function beep(kind) {
        const ctx = ensureAudioCtx();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        let count = 1;
        let freq = 880;
        let dur = 0.18;
        let gap = 0.22;

        if (kind === 'warning') { count = 3; freq = 660; dur = 0.2; gap = 0.25; }
        else if (kind === 'end') { count = 5; freq = 990; dur = 0.25; gap = 0.3; }
        else if (kind === 'start') { count = 1; freq = 1320; dur = 0.15; gap = 0.2; }
        else if (kind === 'tick') { count = 1; freq = 760; dur = 0.08; gap = 0.1; }

        const now = ctx.currentTime;
        for (let i = 0; i < count; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t0 = now + i * gap;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        }
    }

    // Reproduce un aviso: intenta el archivo de assets/sounds/, si falla -> pitido.
    function play(kind) {
        const src = SOUNDS[kind];
        if (!src) { beep(kind); return; }
        try {
            let audio = audioCache[kind];
            if (!audio) {
                audio = new Audio(src);
                audio.preload = 'auto';
                audioCache[kind] = audio;
            }
            audio.currentTime = 0;
            const p = audio.play();
            if (p && typeof p.catch === 'function') p.catch(() => beep(kind));
        } catch (e) {
            beep(kind);
        }
    }

    // ----------------------------------------------------------------
    // NUCLEO DEL CRONOMETRO
    // ----------------------------------------------------------------
    function setDuration(minutes) {
        const m = Math.max(1, Math.floor(Number(minutes) || 0));
        totalSeconds = m * 60;
        if (!running) {
            remaining = totalSeconds;
            warningFired = false;
            endFired = false;
            lastTickMinute = null;
            endTimestamp = null;
            emitTick();
        }
        return totalSeconds;
    }

    function start() {
        if (running) return;
        running = true;
        ensureAudioCtx(); // desbloquea audio tras gesto del usuario
        play('start');
        endTimestamp = Date.now() + remaining * 1000;
        if (onStateChange) onStateChange(true);
        tickHandle = setInterval(step, 250);
        step();
    }

    function pause() {
        if (!running) return;
        running = false;
        if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
        endTimestamp = null;
        if (onStateChange) onStateChange(false);
    }

    function toggle() {
        if (running) pause(); else start();
    }

    function reset() {
        pause();
        remaining = totalSeconds;
        warningFired = false;
        endFired = false;
        lastTickMinute = null;
        endTimestamp = null;
        emitTick();
    }

    // Suma tiempo (minutos) al cronometro en marcha. Si estaba en negativo
    // (prorroga) lo devuelve hacia positivo. Mantiene el estado de marcha.
    function addTime(minutes) {
        const m = Math.floor(Number(minutes) || 0);
        if (m === 0) return remaining;
        const delta = m * 60;
        remaining += delta;
        // Si vuelve a estar en positivo, permitimos que vuelvan a sonar los avisos.
        if (remaining > 0) {
            endFired = false;
            if (remaining > WARNING_THRESHOLD) warningFired = false;
        }
        if (running) {
            endTimestamp = Date.now() + remaining * 1000;
        }
        emitTick();
        return remaining;
    }

    // Avanza el temporizador. Usa Date.now() para no acumular error.
    // Al pasar por 0 dispara el aviso de fin UNA vez pero sigue contando en
    // negativo (tiempo extra), por lo que no se detiene.
    function step() {
        if (!running) return;
        if (endTimestamp === null) endTimestamp = Date.now() + remaining * 1000;
        // Redondeamos al segundo mas cercano SIN recortar en 0: puede ser negativo.
        remaining = Math.round((endTimestamp - Date.now()) / 1000);
        emitTick();

        // Aviso de 5 minutos antes (solo cuenta atras, antes de llegar a 0)
        if (!warningFired && remaining <= WARNING_THRESHOLD && remaining > 0) {
            warningFired = true;
            play('warning');
            if (onWarning) onWarning(remaining);
        }

        // Avisos del ultimo minuto (60, 30 y 10 segundos)
        if (remaining <= 60 && remaining > 0) {
            if (remaining === 60 || remaining === 30 || remaining === 10) {
                if (lastTickMinute !== remaining) {
                    lastTickMinute = remaining;
                    play('tick');
                }
            }
        }

        // Fin del tiempo: se avisa UNA vez y se sigue en negativo (prorroga).
        if (remaining <= 0 && !endFired) {
            endFired = true;
            play('end');
            if (onEnd) onEnd();
        }
    }

    function emitTick() {
        if (onTick) onTick(remaining, totalSeconds);
    }

    // ----------------------------------------------------------------
    // GETTERS
    // ----------------------------------------------------------------
    function getRemaining() { return remaining; }
    function getTotal() { return totalSeconds; }
    function isRunning() { return running; }

    // Formatea segundos como MM:SS. Si es negativo (prorroga) antepone '-'.
    function format(seconds) {
        const neg = seconds < 0;
        const s = Math.floor(Math.abs(seconds));
        const m = Math.floor(s / 60);
        const ss = s % 60;
        const body = String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
        return neg ? '-' + body : body;
    }

    // ----------------------------------------------------------------
    // API PUBLICA
    // ----------------------------------------------------------------
    return {
        setDuration,
        start,
        pause,
        toggle,
        reset,
        addTime,
        getRemaining,
        getTotal,
        isRunning,
        format,
        play, // permite probar sonidos desde la UI
        set onTick(fn) { onTick = fn; },
        set onWarning(fn) { onWarning = fn; },
        set onEnd(fn) { onEnd = fn; },
        set onStateChange(fn) { onStateChange = fn; },
        WARNING_THRESHOLD,
        SOUNDS,
    };
})();
