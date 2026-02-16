// Partial Loader - Loads header and footer dynamically
document.addEventListener('DOMContentLoaded', function() {
    loadPartials();
});

async function loadPartials() {
    const partialsPath = getPartialsPath();
    
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
        
        // Set active navigation item
        setActiveNav();
        
        // Re-initialize navigation toggle
        initNavToggle();
        
    } catch (error) {
        console.error('Error loading partials:', error);
        // Fallback: load via synchronous method if fetch fails
        loadPartialsFallback();
    }
}

function getPartialsPath() {
    const path = window.location.pathname;
    
    // Check if we're in a subdirectory
    // For /sysopsbits/comparisons/file.html, we need ../partials/
    // For /sysopsbits/file.html (root of subfolder), we need partials/
    
    const sysopsbitsMatch = path.match(/^\/sysopsbits(\/|$)/);
    if (sysopsbitsMatch) {
        // We're in /sysopsbits/ directory
        const afterSysopsbits = path.slice('/sysopsbits'.length);
        
        // Count additional directory levels
        const remainingPath = afterSysopsbits.replace(/^\//, '').replace(/[^/]/g, '');
        const depth = (remainingPath.match(/\//g) || []).length;
        
        if (depth === 0) {
            // At /sysopsbits/file.html - partials is at root
            return 'partials/';
        } else {
            // At /sysopsbits/subdir/file.html - need to go up
            return '../'.repeat(depth) + 'partials/';
        }
    }
    
    // Default for local development or root
    return 'partials/';
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

function setActiveNav() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
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
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (navToggle && navMenu && !navToggle.contains(event.target) && !navMenu.contains(event.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
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
    
    setActiveNav();
    initNavToggle();
}
