# Store Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Store" tab to SysOpsBits header that links to a new store page displaying digital products (e-books and guides).

**Architecture:** Static HTML site with dynamically loaded header via JavaScript. Create new store.html page following existing pattern (tutorials.html, tools.html).

**Tech Stack:** HTML, CSS (existing main.css), JavaScript (existing partials.js)

---

### Task 1: Add Store Navigation to Header

**Files:**
- Modify: `partials/header.html`

- [ ] **Step 1: Add Store nav item to header**

Open `partials/header.html` and add a new list item after the Contact link (line 23) but before the Support link (line 24):

```html
<li><a href="store.html" data-page="store">Store</a></li>
```

The nav-menu section should now look like:
```html
<ul class="nav-menu">
    <li><a href="index.html" data-page="index">Home</a></li>
    <li><a href="tutorials.html" data-page="tutorials">Tutorials</a></li>
    <li><a href="comparisons.html" data-page="comparisons">Comparisons</a></li>
    <li><a href="tools.html" data-page="tools">Tools</a></li>
    <li><a href="categories.html" data-page="categories">Categories</a></li>
    <li><a href="about.html" data-page="about">About</a></li>
    <li><a href="contact.html" data-page="contact">Contact</a></li>
    <li><a href="store.html" data-page="store">Store</a></li>
    <li class="support-link">...</li>
</ul>
```

- [ ] **Step 2: Commit changes**

```bash
git add partials/header.html
git commit -m "feat: add Store nav item to header"
```

---

### Task 2: Create Store Page

**Files:**
- Create: `store.html`

- [ ] **Step 1: Create store.html**

Create a new file `store.html` in the sysopsbits root directory (same level as index.html, tutorials.html). Use this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Store - Digital Products - SysOpsBits</title>
    <meta name="description" content="Purchase digital products including e-books and guides for sysops professionals.">
    
    <link rel="canonical" href="https://sysopsbits.com/store.html">
    <meta property="og:title" content="Store - Digital Products - SysOpsBits">
    <meta property="og:description" content="Purchase digital products including e-books and guides for sysops professionals.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://sysopsbits.com/store.html">
    
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/syntax.css">
    <link rel="icon" type="image/x-icon" href="favicon.ico">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-B67YJF8565"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-B67YJF8565');
</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3952146885815694"
     crossorigin="anonymous"></script>
</script></head>
<body data-page="store">
    <div id="header-placeholder"></div>

    <main>
        <div class="container">
            <header class="section-header">
                <h1>Store</h1>
                <p>Digital products to help you level up your sysops skills.</p>
            </header>

            <div class="posts-grid">
                <article class="post-card">
                    <div class="post-image">
                        <a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener">
                            <img src="images/az-104.jpg" alt="Azure Administrator Exam Guide" loading="lazy">
                        </a>
                    </div>
                    <div class="post-content">
                        <div class="post-meta">
                            <span class="category">Store</span>
                        </div>
                        <h3><a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener">Azure Administrator Exam Guide</a></h3>
                        <p>Comprehensive study guide for the AZ-104 Azure Administrator exam. Covers all objectives with practice questions and hands-on labs.</p>
                        <a href="https://buymeacoffee.com/mattyhip/e/537655" target="_blank" rel="noopener" class="read-more">Buy Now →</a>
                    </div>
                </article>
            </div>
        </div>
    </main>

    <div id="footer-placeholder"></div>

    <script src="js/main.js" defer></script>
    <script src="js/partials.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Commit changes**

```bash
git add store.html
git commit -m "feat: create store page with digital products"
```

---

### Task 3: Verify JavaScript Handles Store Page

**Files:**
- Verify: `js/partials.js` (should already work, verify)

- [ ] **Step 1: Verify getCurrentPage handles "store"**

The existing `getCurrentPage()` function in `js/partials.js` converts filenames like `store.html` to `store` by:
1. Getting filename from path: `store.html`
2. Removing `.html`: `store`
3. Replacing hyphens with empty string: `store`

Since `store.html` has no hyphens, it will return `store`, which matches the `data-page="store"` attribute in the header. No changes needed.

- [ ] **Step 2: Commit verification (or note if changes needed)**

```bash
git status
# If no changes needed, note that js/partials.js already handles store page correctly
git commit --allow-empty -m "chore: verify store page works with existing partials.js"
```

---

### Task 4: Verify Image Exists

**Files:**
- Verify: `images/az-104.jpg` (note: may not exist yet)

- [ ] **Step 1: Check if az-104.jpg exists**

```bash
ls -la images/az-104.jpg
```

- If the image doesn't exist, the product card will show a broken image. The user indicated the image "will be the first digital product for sale" - they may need to add it later.
- For now, proceed with the implementation. If image is missing, it can be added later.

---

## Summary

**Tasks completed:**
1. ✅ Add Store nav item to header (partials/header.html)
2. ✅ Create store.html page (store.html)
3. ✅ Verify JavaScript handles store page (js/partials.js - no changes needed)
4. ⚠️ Verify az-104.jpg exists (may need user to add)

**Next Steps:**
- Test by opening store.html in browser
- Verify header shows Store tab
- Verify clicking Store navigates to store.html
- Verify active nav state highlights Store tab
- Verify product card displays and links to Buy Me a Coffee