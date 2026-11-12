// Partial Loader - Loads header and footer dynamically
let _partialsLoaded = false;

async function loadPartials() {
    if (_partialsLoaded) return;
    _partialsLoaded = true;
    const partialsPath = getPartialsPath();

    // Pages ship with the header and footer inlined (scripts/sync_partials.py) so crawlers
    // see the navigation. Only fetch partials for pages whose placeholders are still empty.
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder && headerPlaceholder.children.length > 0) {
        setActiveNav();
        initNavToggle();
        initThemeToggle();
        initAdSense();
        return;
    }
    
    try {
        // Load header
        const headerResponse = await fetch(partialsPath + 'header.html');
        const headerHtml = await headerResponse.text();
        document.getElementById('header-placeholder').innerHTML = headerHtml;
        
        // Load footer
        const footerResponse = await fetch(partialsPath + 'footer.html');
        const footerHtml = await footerResponse.text();
        document.getElementById('footer-placeholder').innerHTML = footerHtml;
        
        // Load category nav (if placeholder exists)
        const categoryNavPlaceholder = document.getElementById('category-nav-placeholder');
        if (categoryNavPlaceholder) {
            const categoryNavResponse = await fetch(partialsPath + 'category-nav.html');
            const categoryNavHtml = await categoryNavResponse.text();
            categoryNavPlaceholder.innerHTML = categoryNavHtml;
            fixCategoryNavLinks(partialsPath);
        }
        
        // Load newsletter (if placeholder exists)
        const newsletterPlaceholder = document.getElementById('newsletter-placeholder');
        if (newsletterPlaceholder) {
            const newsletterResponse = await fetch(partialsPath + 'newsletter.html');
            const newsletterHtml = await newsletterResponse.text();
            newsletterPlaceholder.innerHTML = newsletterHtml;
        }
        
        // Fix all nav links (header + footer) after all partials loaded
        fixMainNavLinks(partialsPath);
        
        // Set active navigation item
        setActiveNav();
        
        // Re-initialize navigation toggle
        initNavToggle();
        
        // Initialize theme toggle
        initThemeToggle();
        
        // Initialize AdSense
        initAdSense();
        
    } catch (error) {
        console.error('Error loading partials:', error);
        // Fallback: load via synchronous method if fetch fails
        loadPartialsFallback();
    }
}

function getPartialsPath() {
    const path = window.location.pathname;
    
    // Get the directory containing the current file
    const lastSlash = Math.max(path.lastIndexOf('/'));
    const dirPart = lastSlash > 0 ? path.substring(0, lastSlash + 1) : '/';
    
    // Count directory depth from root
    // "/" = 0, "/comparisons" = 1, "/comparisons/subdir" = 2
    const depth = (dirPart.match(/\//g) || []).length - 1;
    
    if (depth === 0 || dirPart === '/') {
        // At root - partials is at root
        return 'partials/';
    } else {
        // In subdirectory - need to go up
        return '../'.repeat(depth) + 'partials/';
    }
}

function fixCategoryNavLinks(partialsPath) {
    // partialsPath is like "partials/" or "../partials/"
    // We need the base to get to root
    const basePath = partialsPath.replace('partials/', '');
    
    const navLinks = document.querySelectorAll('.category-nav-list a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('/')) {
            link.setAttribute('href', basePath + href);
        }
    });
}

function fixMainNavLinks(partialsPath) {
    // Fix main navigation and footer links using same logic as category nav
    const basePath = partialsPath.replace('partials/', '');
    
    const navLinks = document.querySelectorAll('.nav-menu a, .site-branding a, .footer-section a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('/')) {
            link.setAttribute('href', basePath + href);
        }
    });
}

function setActiveNav() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        const pageAttr = link.getAttribute('data-page');
        if (!pageAttr) return;
        const page = pageAttr.replace(/-/g, '');
        if (page === currentPage) {
            link.classList.add('active');
        }
    });
}

function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '').replace(/-/g, '');
}

function initNavToggle() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    function setMenu(open) {
        if (!navToggle || !navMenu) return;
        navMenu.classList.toggle('active', open);
        navToggle.classList.toggle('active', open);
        navToggle.setAttribute('aria-expanded', String(open));
    }

    function setDropdown(dropdown, open) {
        dropdown.classList.toggle('active', open);
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', String(open));
    }

    function closeDropdowns() {
        document.querySelectorAll('.nav-dropdown.active').forEach(dd => setDropdown(dd, false));
    }

    document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
        // Keyboard: close when focus moves out of the dropdown
        dropdown.addEventListener('focusout', function(e) {
            if (e.relatedTarget && !dropdown.contains(e.relatedTarget)) setDropdown(dropdown, false);
        });
        // A menu dismissed with Escape may open again on the next hover
        dropdown.addEventListener('pointerleave', function() {
            dropdown.classList.remove('dismissed');
        });
    });

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            setMenu(!navMenu.classList.contains('active'));
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
                setMenu(false);
            }
        });
    }

    // Dropdown toggle click handler (also fires for Enter and Space on the button)
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.closest('.nav-dropdown');
            if (!dropdown) return;
            dropdown.classList.remove('dismissed');
            setDropdown(dropdown, !dropdown.classList.contains('active'));
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', closeDropdowns);

    // Escape closes the innermost open thing and returns focus to its toggle
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        // Also hides a menu that is only open because the pointer is hovering it
        document.querySelectorAll('.nav-dropdown:hover').forEach(dd => dd.classList.add('dismissed'));
        const openDropdown = document.querySelector('.nav-dropdown.active');
        if (openDropdown) {
            setDropdown(openDropdown, false);
            const toggle = openDropdown.querySelector('.dropdown-toggle');
            if (toggle) toggle.focus();
        } else if (navMenu && navMenu.classList.contains('active')) {
            setMenu(false);
            navToggle.focus();
        }
    });

    // A page restored from the back/forward cache should not come back with the menu open
    window.addEventListener('pageshow', function(e) {
        if (!e.persisted) return;
        setMenu(false);
        closeDropdowns();
    });
}

// Fallback using XMLHttpRequest for older browsers
function loadPartialsFallback() {
    const partialsPath = getPartialsPath();
    
    // Load header
    const headerXHR = new XMLHttpRequest();
    headerXHR.open('GET', partialsPath + 'header.html', false);
    headerXHR.send();
    if (headerXHR.status === 200) {
        document.getElementById('header-placeholder').innerHTML = headerXHR.responseText;
    }
    
    // Load footer
    const footerXHR = new XMLHttpRequest();
    footerXHR.open('GET', partialsPath + 'footer.html', false);
    footerXHR.send();
    if (footerXHR.status === 200) {
        document.getElementById('footer-placeholder').innerHTML = footerXHR.responseText;
    }
    
    // Load category nav (if placeholder exists)
    const categoryNavPlaceholder = document.getElementById('category-nav-placeholder');
    if (categoryNavPlaceholder) {
        const categoryNavXHR = new XMLHttpRequest();
        categoryNavXHR.open('GET', partialsPath + 'category-nav.html', false);
        categoryNavXHR.send();
        if (categoryNavXHR.status === 200) {
            categoryNavPlaceholder.innerHTML = categoryNavXHR.responseText;
            fixCategoryNavLinks(partialsPath);
        }
    }
    
    // Load newsletter (if placeholder exists)
    const newsletterPlaceholder = document.getElementById('newsletter-placeholder');
    if (newsletterPlaceholder) {
        const newsletterXHR = new XMLHttpRequest();
        newsletterXHR.open('GET', partialsPath + 'newsletter.html', false);
        newsletterXHR.send();
        if (newsletterXHR.status === 200) {
            newsletterPlaceholder.innerHTML = newsletterXHR.responseText;
        }
    }
    
    fixMainNavLinks(partialsPath);
    fixCategoryNavLinks(partialsPath);
    setActiveNav();
    initNavToggle();
    initThemeToggle();
}

function initThemeToggle() {
    const toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    const darkLabel = document.getElementById('theme-label-dark');
    const lightLabel = document.getElementById('theme-label-light');

    let stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // The inline script in <head> normally sets this before first paint; this covers pages without it.
    const root = document.documentElement;
    if (stored === 'light' || (!stored && !prefersDark)) {
        root.classList.add('light-mode');
    }
    function reflect(isLight) {
        if (darkLabel) darkLabel.dataset.active = isLight ? 'false' : 'true';
        if (lightLabel) lightLabel.dataset.active = isLight ? 'true' : 'false';
        toggle.setAttribute('aria-pressed', String(isLight));
    }

    reflect(root.classList.contains('light-mode'));

    toggle.addEventListener('click', function() {
        const isLight = root.classList.toggle('light-mode');
        try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
        reflect(isLight);
        // Lets canvas-drawn things (the homepage scene) pick up the new colours
        document.dispatchEvent(new CustomEvent('themechange', { detail: { light: isLight } }));
    });
}

function initAdSense() {
    // No ads on error pages (AdSense policy: no ads on screens without publisher content)
    if (document.body && document.body.dataset.noAds === 'true') return;
    if (document.getElementById('adsbygoogle-script') || document.querySelector('script[src*="adsbygoogle.js"]')) return;
    const script = document.createElement('script');
    script.id = 'adsbygoogle-script';
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3952146885815694';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
}

// Self-initializing for defer/async loading; guard prevents double-run
loadPartials();
