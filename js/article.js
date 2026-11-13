// Article pages: reading progress bar and table-of-contents state.
// The TOC and related links are plain HTML (scripts/build_article_extras.py); this only enhances them.
(function () {
    'use strict';
    var article = document.querySelector('article.post');
    if (!article) return;

    // Reading progress. CSS scroll timelines drive it where supported; otherwise --read is set here.
    var bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bar, document.body.firstChild);

    var cssDriven = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
    if (!cssDriven) {
        var queued = false;
        var update = function () {
            queued = false;
            var doc = document.documentElement;
            var max = doc.scrollHeight - window.innerHeight;
            var value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
            bar.style.setProperty('--read', value.toFixed(4));
        };
        var onScroll = function () {
            if (!queued) {
                queued = true;
                window.requestAnimationFrame(update);
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
    }

    // Table of contents: open beside the text on wide screens, mark the section being read.
    var toc = document.querySelector('.post-toc');
    if (!toc) return;
    var details = toc.querySelector('details');
    var wide = window.matchMedia('(min-width: 1200px)');
    var syncOpen = function () { if (details && wide.matches) details.open = true; };
    syncOpen();
    if (wide.addEventListener) wide.addEventListener('change', syncOpen);

    var links = {};
    Array.prototype.forEach.call(toc.querySelectorAll('a[href^="#"]'), function (a) {
        links[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
    });
    var headings = Array.prototype.filter.call(article.querySelectorAll('h2[id]'), function (h) { return links[h.id]; });
    if (!headings.length || !('IntersectionObserver' in window)) return;

    var current = null;
    var mark = function (id) {
        if (id === current) return;
        if (current && links[current]) links[current].removeAttribute('aria-current');
        current = id;
        if (id && links[id]) links[id].setAttribute('aria-current', 'true');
    };
    var pick = function () {
        var line = window.innerHeight * 0.3;
        var id = null;
        for (var i = 0; i < headings.length; i++) {
            if (headings[i].getBoundingClientRect().top <= line) id = headings[i].id;
        }
        mark(id || headings[0].id);
    };
    var io = new IntersectionObserver(pick, { rootMargin: '0px 0px -60% 0px' });
    headings.forEach(function (h) { io.observe(h); });
    window.addEventListener('scroll', function () { window.requestAnimationFrame(pick); }, { passive: true });
    pick();
})();
