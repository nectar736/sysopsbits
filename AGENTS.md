# AGENTS.md - Hugo Static Site Development Guidelines

This file contains guidelines for agentic coding agents working on the SysOpsBits Hugo static site.

## Build Commands

### Development
```bash
# Start development server with hot reload
hugo server -D

# Start server on specific port
hugo server -p 8080 -D

# Check site structure
hugo list all
```

### Production Build
```bash
# Build optimized static site
hugo --gc --minify

# Build with verbose output
hugo --gc --minify --verbose

# Check build without generating files
hugo --gc --minify --dryRun
```

### Testing & Validation
```bash
# No traditional tests - validate by checking:
hugo server -D  # Local preview
hugo --gc --minify  # Production build validation
```

## Project Structure

```
sysopsbits/
├── config.toml              # Hugo configuration
├── content/                  # Markdown content
│   ├── posts/              # Blog posts
│   ├── tutorials/          # Step-by-step guides
│   ├── comparisons/        # Product comparisons
│   ├── reviews/           # Product reviews
│   ├── tools/             # Tool recommendations
│   └── *.md               # Static pages (about, contact, etc.)
├── static/                  # Static assets
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript
│   ├── images/            # Images
│   └── robots.txt         # SEO configuration
├── themes/sysopsbits/       # Custom theme
│   ├── layouts/           # HTML templates
│   ├── static/            # Theme assets
│   └── layouts/shortcodes/ # Hugo shortcodes
└── .github/workflows/      # CI/CD deployment
```

## Content Guidelines

### Front Matter Structure
```yaml
---
title: "Article Title (Title Case)"
description: "SEO description under 160 characters"
date: 2026-01-15T10:00:00Z
lastmod: 2026-01-20T14:30:00Z
categories: ["Tutorials"]  # Capitalized, singular form
tags: ["linux", "backups", "automation"]  # lowercase, kebab-case
featuredImage: "/images/article-image.jpg"
showAffiliateDisclosure: true  # For posts with affiliate links
---
```

### Content Types & Naming
- **Posts**: `content/posts/article-name.md`
- **Tutorials**: `content/tutorials/tutorial-name.md`
- **Comparisons**: `content/comparisons/product-vs-product.md`
- **Reviews**: `content/reviews/product-review.md`
- **Tools**: `content/tools/tool-name.md`

### File Naming Convention
- Use kebab-case: `automated-linux-backups-restic.md`
- Include year in comparison posts: `digitalocean-vs-linode-2026.md`
- No spaces or special characters except hyphens

## Code Style Guidelines

### HTML/Templates (Hugo)
- Use semantic HTML5 tags (`<header>`, `<main>`, `<footer>`, `<article>`)
- Follow Hugo template syntax: `{{ .Variable }}`, `{{ range .Items }}`
- Include proper accessibility attributes
- Use responsive design with mobile-first approach

### CSS
- Use BEM-like naming: `.component-name`, `.component-name__element`
- Mobile-first responsive design with `@media` queries
- CSS custom properties for colors: `--primary-color: #3498db;`
- Use logical properties: `margin-inline: auto;`

### JavaScript
- Use modern ES6+ syntax
- Wrap in DOMContentLoaded event listener
- Use const/let instead of var
- Add JSDoc comments for functions

### Markdown
- Use ATX-style headings: `# Heading 1`, `## Heading 2`
- Include alt text for images: `![Description](image.jpg)`
- Use fenced code blocks with language specification
- Internal links use relative paths: `[Text](/path/to/page/)`

## Hugo Shortcodes

### Available Shortcodes
```hugo
{{< cta-button url="https://example.com" text="Get Started" class="btn-primary" >}}
{{< product-card title="Product" description="Description" url="link" rating="5" >}}
{{< comparison-table headers="Feature,Provider A,Provider B" >}}
{{< newsletter title="Subscribe" description="Get weekly tips" >}}
{{< ad-placeholder position="top" type="banner" >}}
```

### Creating New Shortcodes
- Place in `themes/sysopsbits/layouts/shortcodes/`
- Use kebab-case naming: `new-shortcode.html`
- Include proper HTML structure and accessibility

## SEO & Performance

### SEO Requirements
- All pages must have meta description
- Include structured data (JSON-LD) for articles
- Use proper heading hierarchy (H1 → H6)
- Add alt text to all images
- Include canonical URLs

### Performance Optimization
- Images: Use WebP format, include loading="lazy"
- CSS: Minify in production build
- JavaScript: Defer non-critical scripts
- Enable gzip/brotli compression on server

## Content Standards

### Writing Style
- Technical but accessible tone
- Use active voice: "Run this command" not "This command should be run"
- Include practical examples and real commands
- Add FAQ section for comprehensive posts

### Code Blocks
```bash
# Always specify language
command --option

# Include comments for complex commands
# This does X because Y
```

### Affiliate Links
- Always disclose when using affiliate links
- Use `rel="sponsored"` and `target="_blank"`
- Include honest pros/cons, not just promotion

## Deployment

### GitHub Pages
- Automatic deployment via `.github/workflows/deploy.yml`
- Push to main branch triggers build and deploy
- CNAME file configured for custom domain

### Local Testing
```bash
# Test production build locally
hugo --gc --minify
cd public
python -m http.server 8000  # Or use any static server
```

## Common Tasks

### Adding New Blog Post
1. Create file in appropriate content directory
2. Add proper front matter
3. Write content following style guidelines
4. Test locally with `hugo server -D`
5. Add relevant images to `static/images/`

### Updating Theme
1. Modify templates in `themes/sysopsbits/layouts/`
2. Update styles in `static/css/`
3. Test responsive design
4. Validate HTML structure

### SEO Optimization
1. Check meta titles and descriptions
2. Validate structured data
3. Test with Lighthouse
4. Ensure proper internal linking

## File Organization

### Images
- Store in `static/images/`
- Use descriptive names: `cloud-hosting-comparison.jpg`
- Optimize for web (compress, WebP format)
- Include featuredImage in front matter

### CSS Organization
- `main.css`: Core styles and layout
- `syntax.css`: Code highlighting
- `shortcodes.css`: Component-specific styles
- Use CSS custom properties for theming

### JavaScript
- Keep minimal and focused
- Use for interactive elements only
- Ensure graceful degradation
- Test across browsers

## Quality Assurance

### Before Committing
1. Test site locally: `hugo server -D`
2. Build production version: `hugo --gc --minify`
3. Check responsive design
4. Validate HTML structure
5. Test all links and forms

### Common Issues
- Missing front matter fields
- Incorrect image paths
- Broken internal links
- Missing alt text
- Invalid HTML structure

Remember: This is a static site - no server-side processing, no database, just pre-built HTML files serving content efficiently.