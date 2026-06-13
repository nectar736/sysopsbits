# About Page Refactor Design

## Layout
Card-based single-column vertical layout. No sidebar. Each logical section is a visually distinct card with soft shadows, rounded corners.

## Sections (in order)
1. **Hero Card** — "PMP-Certified Systems Administrator" headline, subtitle, optional avatar placeholder
2. **Professional Summary Card** — Combined bio + results-driven summary text
3. **Areas of Expertise Card** — Two sub-groups: domain expertise (Cloud Infrastructure, Microsoft 365, Azure Networking, Entra ID, Intune, Hybrid Enterprise, Identity & Compliance, Endpoint Mgmt) and tools (Windows Server, SCCM, Meraki, PowerShell, Microsoft Graph). Rendered as inline badge/chips.
4. **Certifications Card** — Responsive grid of badge cards, each showing cert name, issuer, year, verify link. Grouped by vendor with subtle dividers. Vendor label colors: Microsoft=blue, CompTIA=orange, Cisco=dark blue, PMI=green.
5. **About SysOpsBits Card** — Site mission, coverage areas, values
6. **Disclosure & Contact Card** — Affiliate disclosure, contact link, social links

## Certifications data
| Cert | Org | Year | Verify |
|------|-----|------|--------|
| A+ | CompTIA | 2018 | HP4GMCNFND1E1Y99 |
| Network+ (CCNA) | Cisco | 2019 | 436344170952HKWL |
| M365 Administrator Expert | Microsoft | 2024 | Learn transcript |
| M365 Endpoint Administrator Associate | Microsoft | 2024 | Learn transcript |
| Azure Fundamentals | Microsoft | 2024 | Learn transcript |
| Azure Administrator Associate | Microsoft | 2025 | Learn transcript |
| Azure Network Engineer Associate | Microsoft | 2025 | Learn transcript |
| Identity and Access Admin Associate | Microsoft | 2025 | Learn transcript |
| PMP | PMI | 2026 | Credly badge |
| Project+ | CompTIA | 2025 | SKD99G1YXBBESC9J |
| Security+ | CompTIA | 2021 | MH3CR3SP0LV11K5Y |

## CSS
- New styles in about.css or inline in about.html
- Card pattern: white bg, border-radius: 12px, box-shadow, padding: 1.5rem
- Cert grid: display:grid, repeat(auto-fill, minmax(260px, 1fr))
- Badge chips: inline-block, small padding, border-radius, vendor colors

## Verify URLs
- CompTIA: https://www.certmetrics.com/comptia/public/verification.aspx?code={code}
- Cisco: https://www.certmetrics.com/cisco/public/verification.aspx?code={code}
- Microsoft: https://learn.microsoft.com/en-us/users/mattyhip/transcript/vn4wzi0qlq3o6np?tab=credentials-tab
- PMP: https://www.credly.com/badges/1415a863-86e8-4148-bdbd-5e9f14f23e28
