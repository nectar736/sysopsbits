# AZ-900 Practice Test — Design Spec

## Overview

A free 10-question AZ-900 practice test page for the SysOpsBits Microsoft category. Follows the exact pattern established by `project-management/pmp-practice-test.html`: interactive quiz with sidebar navigation, domain badges, progress bar, review explanations, and results breakdown.

## File & Location

- **File:** `tutorials/az-900-practice-test.html`
- **Listing thumbnail:** `images/az-900.png` (existing asset)
- **Category:** Microsoft — linked from `microsoft.html`
- **Canonical URL:** `https://sysopsbits.com/tutorials/az-900-practice-test.html`
- **Script loading:** `defer` pattern (not sync+inline)
- **Pattern:** Inline `<style>` block for quiz-specific CSS, no external dependencies

## Authority Source

All questions verified against Microsoft Learn official materials:
- [AZ-900 Course Page](https://learn.microsoft.com/en-us/training/courses/az-900t00/)
- [AZ-900 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900) (skills measured as of July 20, 2026)
- [Learning Path: Describe Azure Architecture and Services](https://learn.microsoft.com/en-us/training/paths/azure-fundamentals-describe-azure-architecture-services/)
- [Learning Path: Describe Azure Management and Governance](https://learn.microsoft.com/en-us/training/paths/describe-azure-management-governance/)

## Question Distribution (10 questions)

| Domain | Exam Weight | Questions | Badge Color |
|--------|------------|-----------|-------------|
| Cloud Concepts | 25-30% | 3 (Q1-Q3) | Blue (#06b6d4) |
| Azure Architecture & Services | 35-40% | 4 (Q4-Q7) | Amber (#f59e0b) |
| Management & Governance | 30-35% | 3 (Q8-Q10) | Green (#22c55e) |

## Question Topics (Verified Against MS Learn)

### Cloud Concepts (Q1-Q3)
1. **Cloud computing definition & shared responsibility** — What cloud computing is, how security responsibility splits between provider and customer depending on service model.
2. **Benefits: high availability vs scalability vs reliability vs predictability** — Distinguish between HA (uptime), scalability (elasticity), reliability (resilience), and predictability (consistent performance/cost).
3. **IaaS vs PaaS vs SaaS use cases** — Match the right service type to scenarios: lift-and-shift (IaaS), custom app dev (PaaS), end-user software (SaaS).

### Azure Architecture & Services (Q4-Q7)
4. **Regions, region pairs, availability zones** — Physical infrastructure hierarchy: datacenter → availability zone → region → region pair. Purpose of region pairs for disaster recovery.
5. **Azure compute options** — VMs (full control, IaaS), Containers (orchestrated by AKS/Azure Container Instances), Functions (serverless, event-driven). When to use each.
6. **Azure storage redundancy** — LRS (3 copies in one datacenter), ZRS (3 copies across zones), GRS (3 copies locally + 3 in paired region). Trade-offs between durability/cost.
7. **Microsoft Entra ID, RBAC, authentication** — Entra ID (formerly Azure AD) is the directory service. RBAC provides fine-grained access management. MFA, SSO, passwordless authentication methods.

### Management & Governance (Q8-Q10)
8. **Cost management** — Pricing calculator (estimates), TCO calculator (compares on-prem vs cloud), tags (resource metadata for cost tracking/billing), Azure Cost Management.
9. **Governance & compliance tools** — Azure Policy (enforce rules), resource locks (prevent deletion/modification), Microsoft Purview (data governance/cataloging).
10. **Monitoring tools** — Azure Advisor (best practice recommendations), Azure Service Health (platform status + planned maintenance), Azure Monitor (metrics, logs, alerts, Application Insights).

## Layout Structure

```
.quiz-layout
├── .quiz-main (flex: 1)
│   ├── .quiz-header → domain badge + "Question X of 10"
│   ├── .progress-bar > .progress-fill (width updates)
│   ├── #question-area → question text + radio options + nav buttons
│   ├── #review-area → explanation box (correct/incorrect verdict)
│   └── #results-area (hidden until all reviewed) → score, pass/fail, domain breakdown, retake
└── .quiz-sidebar (sticky, width: 220px)
    └── .question-nav-grid (grid 4 cols, numbered buttons)
```

## Interactive States

- **Unvisited:** Empty number button with border
- **Answered:** Green border/background (#22c55e) with checkmark
- **Reviewed-correct:** Green fill
- **Reviewed-incorrect:** Red fill (#ef4444)
- **Active:** Accent gradient overlay

## Results Screen

- Score percentage (large text)
- Pass/Fail at ≥70% threshold (real AZ-900 passing score is 700/1000)
- Domain breakdown table: domain name + correct/total + percentage
- "Retake Test" button
- Callout linking to BuyMeACoffee AZ-900 study guide

## Page Integration

- Add post-card to `microsoft.html` listing page
- Callout at quiz top: "Need more study materials? Get the full AZ-900 exam guide..."
- `<body data-page="tutorials">` for nav highlighting
- Standard Google Analytics + Adsense

## Passing Threshold

AZ-900 requires 700 out of 1000 points. For this 10-question practice test, **≥70% (7/10)** is displayed as passing, consistent with the real exam standard.

## CSS

All quiz styles are inlined in a `<style>` block within the page, identical to the PMP test pattern. No modifications needed to `main.css` or `shortcodes.css`.
