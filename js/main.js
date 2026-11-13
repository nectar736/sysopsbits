// Navigation toggle lives in partials.js (initNavToggle). Binding it here too would toggle twice per click.
// In-page links use native anchor behaviour (CSS handles smooth scrolling and the header offset).

// Copy button on code blocks. Styled by .copy-button in main.css.
document.querySelectorAll('pre > code').forEach(block => {
    const pre = block.parentNode;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code');
    pre.classList.add('has-copy');
    pre.appendChild(button);

    button.addEventListener('click', () => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(block.textContent).then(() => {
            button.textContent = 'Copied';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        }).catch(() => {});
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
        : link.closest('.book-grid') ? 'store'
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
