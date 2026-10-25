// Navigation toggle lives in partials.js (initNavToggle). Binding it here too would toggle twice per click.

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Newsletter form handling
document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value;
        
        // Here you would typically send the email to your newsletter service
        // For now, we'll show a success message
        const successMessage = document.createElement('div');
        successMessage.className = 'newsletter-success';
        successMessage.textContent = 'Thank you for subscribing!';
        successMessage.style.cssText = 'background: #d4edda; color: #155724; padding: 1rem; border-radius: 6px; margin-top: 1rem;';
        
        this.parentNode.appendChild(successMessage);
        this.reset();
        
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
    });
});

// Lazy loading for images (if not using native lazy loading)
if ('loading' in HTMLImageElement.prototype === false) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.loading = 'lazy';
    });
}

// Copy code functionality
document.querySelectorAll('pre code').forEach(block => {
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.textContent = 'Copy';
    button.style.cssText = 'position: absolute; top: 0.5rem; right: 0.5rem; background: #4a5568; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;';
    
    const pre = block.parentNode;
    pre.style.position = 'relative';
    pre.appendChild(button);
    
    button.addEventListener('click', () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        });
    });
});
// Conversion tracking: report study-guide and affiliate clicks to GA4
document.addEventListener('click', function(e) {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link || typeof gtag !== 'function') return;
    const href = link.href;
    let type = null;
    if (href.indexOf('buymeacoffee.com/mattyhip/e/') !== -1) type = 'study_guide';
    else if (/amzn\.to|amazon\.com/.test(href)) type = 'amazon_affiliate';
    if (!type) return;
    const placement = link.closest('.product-cta') ? 'article_cta'
        : link.closest('.guide-card') ? 'home_guides'
        : link.closest('.post-card') ? 'card'
        : link.closest('.site-header, .site-footer') ? 'nav' : 'inline';
    gtag('event', type === 'study_guide' ? 'select_promotion' : 'affiliate_click', {
        link_url: href,
        link_type: type,
        placement: placement,
        product: link.dataset.product || '',
        page_path: location.pathname
    });
});
