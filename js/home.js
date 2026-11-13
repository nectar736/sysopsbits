// Homepage only: decides whether and when to load the 3D hero scene (js/home-scene.js).
// The static SVG in .hero-scene stays as the fallback whenever the scene is skipped or fails.
(function () {
    'use strict';

    // 'none' keeps the static SVG and downloads nothing; 'lite' is the simplified scene.
    function chooseSceneMode(env) {
        if (env.reducedMotion || env.saveData || !env.webgl) return 'none';
        if (env.width < 768 || !env.finePointer) return 'lite';
        if (typeof env.cores === 'number' && env.cores <= 4) return 'lite';
        if (typeof env.memory === 'number' && env.memory <= 4) return 'lite';
        return 'full';
    }

    // Desktop loads when the browser is idle after load; touch and narrow screens wait for the first interaction.
    function loadTrigger(env) {
        return env.width >= 768 && env.finePointer ? 'idle' : 'interaction';
    }

    if (typeof module === 'object' && module.exports) {
        module.exports = { chooseSceneMode: chooseSceneMode, loadTrigger: loadTrigger };
    }
    if (typeof document === 'undefined') return;

    var canvas = document.getElementById('hero-canvas');
    if (!canvas || !window.matchMedia) return;

    function hasWebGL() {
        try {
            var probe = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    var conn = navigator.connection || {};
    var env = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        saveData: conn.saveData === true,
        webgl: hasWebGL(),
        width: window.innerWidth,
        finePointer: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
        cores: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory
    };

    var mode = chooseSceneMode(env);
    if (mode === 'none') return;

    var started = false;
    function start() {
        if (started) return;
        started = true;
        import('./home-scene.js')
            .then(function (m) { return m.start({ canvas: canvas, mode: mode }); })
            .catch(function () { /* the static SVG stays */ });
    }

    if (loadTrigger(env) === 'idle') {
        var later = function () {
            if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 3000 });
            else setTimeout(start, 1200);
        };
        if (document.readyState === 'complete') later();
        else window.addEventListener('load', later, { once: true });
    } else {
        var events = ['pointerdown', 'scroll', 'keydown', 'touchstart'];
        var onFirst = function () {
            events.forEach(function (name) { window.removeEventListener(name, onFirst); });
            start();
        };
        events.forEach(function (name) { window.addEventListener(name, onFirst, { passive: true }); });
    }
})();
