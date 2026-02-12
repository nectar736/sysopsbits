# SysOpsBits - Production-Ready Hugo Blog

A fast, SEO-optimized static blog built with Hugo for sysopsbits.com, focused on DevOps tutorials, cloud hosting comparisons, and infrastructure guides.

## 🚀 Quick Start

### Prerequisites
- Hugo 0.136.5 or later
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/sysopsbits.git
cd sysopsbits

# Install theme dependencies
git submodule update --init --recursive

# Start development server
hugo server -D

# Build for production
hugo --gc --minify
```

## 📁 Project Structure

```
sysopsbits/
├── config.toml              # Hugo configuration
├── content/                  # Content files
│   ├── posts/              # Blog posts
│   ├── tutorials/          # Tutorial content
│   ├── comparisons/        # Comparison articles
│   ├── reviews/           # Product reviews
│   ├── tools/             # Tool guides
│   ├── about.md           # About page
│   ├── contact.md         # Contact page
│   ├── affiliate-disclosure.md
│   └── privacy-policy.md
├── static/                  # Static assets
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript
│   ├── images/            # Images
│   ├── robots.txt         # SEO robots file
│   └── CNAME              # Domain configuration
├── themes/                  # Custom theme
│   └── sysopsbits/        # Theme files
├── layouts/                 # Template overrides
├── .github/                 # GitHub workflows
│   └── workflows/
│       └── deploy.yml     # Deployment configuration
└── README.md               # This file
```

## 🎨 Theme Features

- **Minimal & Fast**: Optimized for performance with minimal JavaScript
- **SEO Optimized**: Structured data, meta tags, sitemaps
- **Mobile-First**: Responsive design for all devices
- **Dark/Light Code**: Syntax highlighting with GitHub theme
- **Monetization Ready**: Affiliate links, newsletter, ad placeholders
- **Accessibility**: WCAG 2.1 compliant markup

## 📝 Content Structure

### Front Matter Variables
```yaml
---
title: "Article Title"
description: "SEO description"
date: 2026-01-15T10:00:00Z
lastmod: 2026-01-20T14:30:00Z
categories: ["Tutorials"]
tags: ["linux", "backups", "automation"]
featuredImage: "/images/article-image.jpg"
showAffiliateDisclosure: true
---
```

### Supported Content Types
- **Posts**: Regular blog articles
- **Tutorials**: Step-by-step guides
- **Comparisons**: Product/service comparisons
- **Reviews**: Honest product reviews
- **Tools**: Tool recommendations and guides

## 🛠️ Shortcodes

### CTA Button
```hugo
{{< cta-button url="https://example.com" text="Get Started" class="btn-primary" >}}
```

### Product Card
```hugo
{{< product-card title="DigitalOcean" description="Cloud hosting" url="https://digitalocean.com" rating="5" >}}
```

### Comparison Table
```hugo
{{< comparison-table headers="Feature,Provider A,Provider B" >}}
<tr><td>Price</td><td>$5/month</td><td>$10/month</td></tr>
{{< /comparison-table >}}
```

### Newsletter Embed
```hugo
{{< newsletter title="Subscribe" description="Get weekly tips" >}}
```

### Ad Placeholder
```hugo
{{< ad-placeholder position="top" type="banner" >}}
```

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Push to main branch - automatic deployment via GitHub Actions

### Manual Deployment
```bash
# Build site
hugo --gc --minify

# Deploy to GitHub Pages
cd public
git init
git add .
git commit -m "Deploy site"
git push -f https://github.com/yourusername/yourusername.github.io.git main
```

## 🔧 Configuration

### Site Settings (config.toml)
```toml
baseURL = 'https://sysopsbits.com'
languageCode = 'en-us'
title = 'SysOpsBits'
theme = 'sysopsbits'

[params]
  description = "Practical Infrastructure. No Fluff."
  author = "John"
  tagline = "Practical Infrastructure. No Fluff."
```

### SEO Optimization
- Automatic sitemap generation
- RSS feed support
- Open Graph meta tags
- Twitter Card support
- Structured data (JSON-LD)
- Canonical URLs

## 📊 Performance

### Optimization Features
- **Minified CSS/JS**: Reduced file sizes
- **Lazy Loading**: Images load on scroll
- **Gzip/Brotli**: Server compression
- **CDN Ready**: Static asset optimization
- **Lighthouse Score**: Target 95+

### Core Web Vitals
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

## 💰 Monetization

### Affiliate Links
- Product recommendations with disclosure
- Comparison tables with affiliate CTAs
- Honest reviews with affiliate links

### Newsletter Integration
- Email capture forms
- Newsletter shortcodes
- Privacy-compliant setup

### Ad Support
- Banner ad placeholders
- Sidebar ad spaces
- Responsive ad layouts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `hugo server`
5. Submit a pull request

### Content Guidelines
- Focus on practical, actionable advice
- Include real examples and commands
- Add affiliate disclosures where applicable
- Use proper SEO structure

## 📈 SEO Best Practices

### On-Page SEO
- Keyword-optimized titles and descriptions
- Proper heading structure (H1 → H6)
- Internal linking strategy
- Image alt text optimization

### Technical SEO
- Fast loading times
- Mobile responsiveness
- SSL certificate
- Clean URL structure

## 🛡️ Security

- **HTTPS Only**: SSL/TLS encryption
- **No User Data**: No server-side data collection
- **Privacy Compliant**: GDPR ready
- **Secure Headers**: CSP, HSTS, XSS protection

## 📞 Support

- **Documentation**: Check theme documentation
- **Issues**: Report bugs via GitHub Issues
- **Community**: Join discussions in Discussions tab

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Hugo](https://gohugo.io/)
- Deployed on [GitHub Pages](https://pages.github.com/)
- Inspired by modern static site best practices

---

**Ready to start your sysops blog?** Fork this repository and customize it for your needs!