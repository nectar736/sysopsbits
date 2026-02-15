// Partial Loader - Loads header and footer dynamically
document.addEventListener('DOMContentLoaded', function() {
    loadPartials();
});

async function loadPartials() {
    const basePath = getBasePath();
    
    try {
        // Load header
        const headerResponse = await fetch(basePath + 'partials/header.html');
        const headerHtml = await headerResponse.text();
        document.getElementById('header-placeholder').innerHTML = headerHtml;
        
        // Load footer
        const footerResponse = await fetch(basePath + 'partials/footer.html');
        const footerHtml = await footerResponse.text();
        document.getElementById('footer-placeholder').innerHTML = footerHtml;
        
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

function getBasePath() {
    // Determine base path based on current location
    const path = window.location.pathname;
    const depth = path.split('/').filter(part => part && !part.endsWith('.html')).length;
    return depth > 0 ? '../'.repeat(depth) : '';
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
            if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
}

// Fallback using XMLHttpRequest for older browsers
function loadPartialsFallback() {
    const basePath = getBasePath();
    
    // Load header
    const headerXHR = new XMLHttpRequest();
    headerXHR.open('GET', basePath + 'partials/header.html', false);
    headerXHR.send();
    if (headerXHR.status === 200) {
        document.getElementById('header-placeholder').innerHTML = headerXHR.responseText;
    }
    
    // Load footer
    const footerXHR = new XMLHttpRequest();
    footerXHR.open('GET', basePath + 'partials/footer.html', false);
    footerXHR.send();
    if (footerXHR.status === 200) {
        document.getElementById('footer-placeholder').innerHTML = footerXHR.responseText;
    }
    
    setActiveNav();
    initNavToggle();
}
