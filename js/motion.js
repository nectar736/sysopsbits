// Site-wide motion: reveal on enter, card tilt and cursor glow.
// Content is visible by default. Nothing here runs for visitors who prefer reduced motion,
// and nothing inside an article body is ever animated.
(function () {
    'use strict';

    var REVEAL_SELECTOR = '.home-section-head, .section-header, .posts-grid > .post-card, .guide-card, .topic-card, .feature, .log-row';
    var TILT_SELECTOR = '.post-card, .guide-card';

    function clamp01(n) {
        return n < 0 ? 0 : n > 1 ? 1 : n;
    }

    function round2(n) {
        return Math.round(n * 100) / 100 + 0; // "+ 0" turns -0 into 0
    }

    // Tilt (degrees) and glow position (percent) for a pointer at x,y over rect.
    // Pointer at the top edge tips the top toward the viewer (positive rx); right edge gives positive ry.
    function tiltFor(rect, x, y, maxDeg) {
        var max = typeof maxDeg === 'number' ? maxDeg : 6;
        var nx = rect.width > 0 ? clamp01((x - rect.left) / rect.width) : 0.5;
        var ny = rect.height > 0 ? clamp01((y - rect.top) / rect.height) : 0.5;
        return {
            rx: round2((0.5 - ny) * 2 * max),
            ry: round2((nx - 0.5) * 2 * max),
            gx: round2(nx * 100),
            gy: round2(ny * 100)
        };
    }

    if (typeof module === 'object' && module.exports) {
        module.exports = { tiltFor: tiltFor, REVEAL_SELECTOR: REVEAL_SELECTOR, TILT_SELECTOR: TILT_SELECTOR };
    }
    if (typeof document === 'undefined' || !window.matchMedia) return;

    var root = document.documentElement;
    var motionQuery = window.matchMedia('(prefers-reduced-motion: no-preference)');
    var observer = null;

    function showAll() {
        var pending = document.querySelectorAll('[data-reveal="pending"]');
        for (var i = 0; i < pending.length; i++) pending[i].setAttribute('data-reveal', 'in');
    }

    function gsapOwnsEntrances() {
        return root.classList.contains('gsap-ready') && document.body.getAttribute('data-page') === 'index';
    }

    function initReveal() {
        if (!('IntersectionObserver' in window)) return;
        var viewport = window.innerHeight || root.clientHeight;
        var targets = document.querySelectorAll(REVEAL_SELECTOR);
        observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (!entries[i].isIntersecting) continue;
                observer.unobserve(entries[i].target);
                // On the homepage GSAP animates entrances once it has loaded (js/home-scene.js).
                if (gsapOwnsEntrances()) continue;
                entries[i].target.setAttribute('data-reveal', 'in');
            }
        }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

        for (var i = 0; i < targets.length; i++) {
            var el = targets[i];
            if (el.closest('article.post')) continue;
            // Only hide what the visitor cannot see yet; anything on screen stays put.
            if (el.getBoundingClientRect().top < viewport) continue;
            var index = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.setProperty('--reveal-i', String(Math.min(index, 5)));
            el.setAttribute('data-reveal', 'pending');
            observer.observe(el);
        }
    }

    var tilted = null;
    var frame = 0;
    var pointerX = 0;
    var pointerY = 0;

    function clearTilt(el) {
        if (!el) return;
        el.classList.remove('is-tilting');
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
        el.style.removeProperty('--gx');
        el.style.removeProperty('--gy');
    }

    function applyTilt() {
        frame = 0;
        if (!tilted) return;
        var t = tiltFor(tilted.getBoundingClientRect(), pointerX, pointerY);
        tilted.style.setProperty('--rx', t.rx + 'deg');
        tilted.style.setProperty('--ry', t.ry + 'deg');
        tilted.style.setProperty('--gx', t.gx + '%');
        tilted.style.setProperty('--gy', t.gy + '%');
    }

    function onPointerMove(e) {
        if (e.pointerType === 'touch') return;
        var el = e.target && e.target.closest ? e.target.closest(TILT_SELECTOR) : null;
        if (el !== tilted) {
            clearTilt(tilted);
            tilted = el;
            if (el) el.classList.add('is-tilting');
        }
        if (!el) return;
        pointerX = e.clientX;
        pointerY = e.clientY;
        if (!frame) frame = window.requestAnimationFrame(applyTilt);
    }

    function resetTilt() {
        clearTilt(tilted);
        tilted = null;
    }

    function initTilt() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.addEventListener('pointermove', onPointerMove, { passive: true });
        root.addEventListener('pointerleave', resetTilt);
        window.addEventListener('blur', resetTilt);
    }

    function stop() {
        root.classList.remove('motion-ok');
        if (observer) observer.disconnect();
        document.removeEventListener('pointermove', onPointerMove);
        resetTilt();
        showAll();
    }

    // Returning from the back/forward cache: never leave content hidden.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) showAll();
    });

    if (!motionQuery.matches) return;
    root.classList.add('motion-ok');
    initReveal();
    initTilt();

    var onChange = function (e) { if (!e.matches) stop(); };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onChange);
    else if (motionQuery.addListener) motionQuery.addListener(onChange);
})();
