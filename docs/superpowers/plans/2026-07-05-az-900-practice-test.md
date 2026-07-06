# AZ-900 Practice Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an interactive 10-question AZ-900 practice test page (`tutorials/az-900-practice-test.html`) following the exact pattern from `project-management/pmp-practice-test.html`, and add a listing card on `microsoft.html`.

**Architecture:** Single self-contained HTML page with inline `<style>` block for quiz CSS and a `<script>` block containing the questions data + JS logic. No build step, no external dependencies. The PMP page is the exact reference template — the JS pattern (questions array, renderQuestion(), showResults()), CSS (quiz-layout with sidebar), and HTML structure are cloned with these modifications:
- 10 questions instead of 20
- 3 domains: Cloud Concepts (blue), Azure Architecture & Services (amber), Management & Governance (green)
- Pass threshold: 70% instead of 60%
- Body data-page: "tutorials" for nav highlighting

**Tech Stack:** Vanilla HTML/CSS/JS — no frameworks, no build tools.

---

### Task 1: Create the AZ-900 Practice Test Page

**Files:**
- Create: `tutorials/az-900-practice-test.html`

**Reference:** `project-management/pmp-practice-test.html` — clone the full structure, replacing:
- Question count: 20 → 10
- Domains: People/Process/Business Environment → Cloud Concepts/Azure Architecture & Services/Management & Governance
- Pass threshold: 60% → 70%
- Body data-page: "project-management" → "tutorials"
- All metadata, descriptions, OG tags for AZ-900

- [ ] **Step 1: Write the page skeleton and quiz CSS**

Copy the full `<style>` block from `project-management/pmp-practice-test.html` (lines 24-308), replacing domain classes:

```css
.domain-concepts { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.domain-architecture { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.domain-governance { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
```

The `<head>` section should have:
```html
<title>AZ-900 Practice Test - 10 Free Questions - SysOpsBits</title>
<meta name="description" content="Free AZ-900 practice test with 10 questions covering Cloud Concepts, Azure Architecture & Services, and Management & Governance. Test your Azure fundamentals knowledge.">
<link rel="canonical" href="https://sysopsbits.com/tutorials/az-900-practice-test.html">
<meta property="og:title" content="AZ-900 Practice Test - 10 Free Questions - SysOpsBits">
<meta property="og:description" content="Free AZ-900 practice test covering Cloud Concepts, Azure Architecture, and Management & Governance.">
<meta property="og:url" content="https://sysopsbits.com/tutorials/az-900-practice-test.html">
```

Body tag: `<body data-page="tutorials">`

- [ ] **Step 2: Write the header section and quiz HTML skeleton**

PMP reference lines 310-348. Same quiz-layout structure but the header text mentions AZ-900:

```html
<main>
    <div class="container">
        <header class="section-header">
            <h1>AZ-900 Practice Test</h1>
            <p>10 questions covering Microsoft Azure Fundamentals (AZ-900) exam domains: Cloud Concepts, Azure Architecture &amp; Services, and Azure Management &amp; Governance.</p>
            <p class="section-stats">Passing score: <strong>70%</strong> | 10 questions</p>
        </header>

        <div class="callout callout-tip" style="margin-bottom: 1.5rem; text-align: center; font-size: 0.95rem;">
            Need more study materials? Grab the <strong><a href="https://buymeacoffee.com/mattyhip/e/538078" target="_blank" rel="noopener">AZ-900 Exam Guide</a></strong> with practice questions, labs, and exam tips.
        </div>

        <div class="quiz-container" id="quiz-container">
            <div class="quiz-layout">
                <div class="quiz-main">
                    <div class="quiz-header">
                        <span class="domain-badge" id="domain-badge">Cloud Concepts</span>
                        <span class="quiz-progress" id="quiz-progress">Question 1 of 10</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width: 10%"></div>
                    </div>
                    <div id="question-area"></div>
                    <div id="review-area"></div>
                    <div id="results-area" style="display:none"></div>
                </div>
                <aside class="quiz-sidebar" id="quiz-sidebar">
                    <h3>Questions</h3>
                    <div class="question-nav-grid" id="question-nav-grid"></div>
                </aside>
            </div>
        </div>
    </div>
</main>

<div id="footer-placeholder"></div>

<script src="../js/main.js" defer></script>
<script src="../js/partials.js" defer></script>
```

- [ ] **Step 3: Write the 10 AZ-900 questions data array**

All questions verified against Microsoft Learn AZ-900 official study guide and course page:

```javascript
const questions = [
    { id: 1, domain: "Cloud Concepts", question: "Which statement describes the shared responsibility model in cloud computing?", options: ["The cloud provider is responsible for ALL security, including customer data", "The customer is responsible for ALL security, including physical datacenter security", "Security responsibilities are shared — the provider secures the physical infrastructure, and the customer secures their data, identities, and applications", "Security responsibilities are determined by a third-party auditor after deployment"], correct: 2, explanation: "In the shared responsibility model, the cloud provider is responsible for the security OF the cloud (physical hosts, network, datacenters), while the customer is responsible for security IN the cloud (data, identities, app configurations). The split varies by service model — IaaS gives the customer more responsibility than SaaS." },

    { id: 2, domain: "Cloud Concepts", question: "A web application experiences sudden traffic spikes during a flash sale. Which cloud benefit ensures the application can automatically add resources to handle the load?", options: ["High availability", "Scalability", "Reliability", "Security"], correct: 1, explanation: "Scalability (specifically, horizontal scaling or elastic scaling) enables resources to automatically increase during demand spikes and decrease when demand falls. High availability ensures uptime. Reliability ensures the system recovers from failures. Scalability directly addresses variable workload demands." },

    { id: 3, domain: "Cloud Concepts", question: "A company wants to develop a custom application without managing operating systems, middleware, or runtime environments. Which cloud service model is MOST appropriate?", options: ["Infrastructure as a Service (IaaS)", "Platform as a Service (PaaS)", "Software as a Service (SaaS)", "Function as a Service (FaaS)"], correct: 1, explanation: "PaaS provides a managed hosting environment where the customer deploys code without managing the underlying OS, middleware, or runtime. IaaS requires managing VMs and OS. SaaS delivers ready-to-use software. FaaS (serverless) is a subset of PaaS for event-driven code." },

    { id: 4, domain: "Azure Architecture & Services", question: "An application must remain available even if an entire Azure datacenter fails. Which Azure infrastructure feature provides this level of resilience?", options: ["Availability Zones within a single region", "A single Availability Set in one datacenter", "Region Pairs that replicate across geographically separate regions", "Azure Traffic Manager with DNS-level routing"], correct: 0, explanation: "Availability Zones are physically separate datacenters within an Azure region. Each zone has independent power, cooling, and networking. Deploying across zones protects against a single datacenter failure. Region Pairs protect against a full region failure. Availability Sets protect against rack-level failures within one datacenter." },

    { id: 5, domain: "Azure Architecture & Services", question: "A DevOps team needs to deploy containerized microservices with orchestration in Azure. Which Azure compute service is BEST suited for this workload?", options: ["Azure Virtual Machines", "Azure Kubernetes Service (AKS)", "Azure Functions", "Azure App Service"], correct: 1, explanation: "AKS is Azure's managed Kubernetes service for container orchestration — it handles deployment, scaling, and management of containerized applications. VMs require manual container management. Functions is serverless (event-driven code). App Service is for web apps, not container orchestration." },

    { id: 6, domain: "Azure Architecture & Services", question: "A storage account must maintain three synchronous copies of data within a single datacenter. Which Azure storage redundancy option meets this requirement?", options: ["Locally Redundant Storage (LRS)", "Zone-Redundant Storage (ZRS)", "Geo-Redundant Storage (GRS)", "Read-Access Geo-Redundant Storage (RA-GRS)"], correct: 0, explanation: "LRS replicates data three times within a single physical datacenter (one storage scale unit). ZRS replicates across three availability zones. GRS replicates to a paired region. RA-GRS adds read access to the secondary region. For single-datacenter, three-copy synchronous replication, LRS is the correct choice." },

    { id: 7, domain: "Azure Architecture & Services", question: "Which Azure service provides identity and access management, including features like multi-factor authentication and conditional access?", options: ["Microsoft Entra ID (formerly Azure AD)", "Azure Policy", "Azure RBAC", "Microsoft Defender for Cloud"], correct: 0, explanation: "Microsoft Entra ID is Azure's cloud-based identity and access management service. It provides authentication (including MFA and passwordless), single sign-on (SSO), and conditional access policies. Azure Policy enforces compliance rules. RBAC is an authorization system within Entra ID. Defender for Cloud is a security management tool." },

    { id: 8, domain: "Management & Governance", question: "A company wants to compare the total cost of running their on-premises workload versus migrating to Azure. Which Azure tool should they use?", options: ["Azure Pricing Calculator", "Azure Total Cost of Ownership (TCO) Calculator", "Azure Cost Management", "Azure Migrate"], correct: 1, explanation: "The TCO Calculator estimates cost savings by comparing on-premises infrastructure costs (servers, storage, networking, labor, electricity) with Azure costs. The Pricing Calculator estimates costs for new Azure deployments. Cost Management monitors and optimizes existing Azure spending. Azure Migrate is a migration tool." },

    { id: 9, domain: "Management & Governance", question: "An administrator needs to prevent accidental deletion of a critical resource group. Which Azure feature should they use?", options: ["Azure Policy", "Resource locks", "Azure RBAC", "Tags"], correct: 1, explanation: "Resource locks prevent accidental deletion or modification of Azure resources. A CanNotDelete lock prevents deletion but allows read/update. A ReadOnly lock prevents all changes. Azure Policy enforces compliance rules. RBAC controls who can act. Tags organize resources for billing and management." },

    { id: 10, domain: "Management & Governance", question: "Which Azure service provides personalized recommendations for improving cost efficiency, security, reliability, and performance of Azure resources?", options: ["Azure Monitor", "Azure Service Health", "Azure Advisor", "Microsoft Purview"], correct: 2, explanation: "Azure Advisor analyzes deployed resources and provides best-practice recommendations across five categories: Reliability, Security, Cost, Performance, and Operational Excellence. Azure Monitor collects metrics/logs. Service Health tracks Azure platform status and planned maintenance. Microsoft Purview governs data across hybrid environments." }
];
```

- [ ] **Step 4: Write the domain labels map**

```javascript
const domainLabels = {
    "Cloud Concepts": "domain-concepts",
    "Azure Architecture & Services": "domain-architecture",
    "Management & Governance": "domain-governance"
};
```

- [ ] **Step 5: Write the quiz JS logic (renderQuestion, showResults, renderSidebar)**

Clone the JS logic from the PMP page (lines 377-537) with these changes:
- Variable reference: `questions.length` auto-adapts to 10 (no hardcoded values)
- Pass threshold: change `pct >= 60` to `pct >= 70`
- Results text: update to say "Microsoft Azure Fundamentals (AZ-900) requires a passing score of approximately 70%."
- BuyMeACoffee link in the retake area: `https://buymeacoffee.com/mattyhip/e/538078`
- Init: `document.addEventListener("DOMContentLoaded", renderQuestion);`

The `showResults` results section should include the AZ-900 specific callout:

```javascript
resultsArea.innerHTML = `
    <div class="results-container">
        <h2>AZ-900 Practice Test Results</h2>
        <div class="results-score ${passed ? 'pass' : 'fail'}">${pct}%</div>
        <div class="results-pass-fail ${passed ? 'pass' : 'fail'}">${passed ? '✓ PASSED' : '✗ NOT PASSED'}</div>
        <p>You answered <strong>${totalCorrect}</strong> out of <strong>${questions.length}</strong> questions correctly. Microsoft Azure Fundamentals (AZ-900) requires a passing score of approximately 70%.</p>
        <div class="domain-breakdown">
            <h3>Domain Breakdown</h3>
            ${domainHtml}
        </div>
        <div class="retake-area">
            <button class="btn btn-success" onclick="location.reload()">Retake Test</button>
        </div>
        <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(245, 158, 11, 0.2);">
            <p style="margin: 0; font-size: 1rem;"><strong>Need more practice?</strong> Get the <a href="https://buymeacoffee.com/mattyhip/e/538078" target="_blank" rel="noopener">AZ-900 Exam Guide</a> with additional practice questions, hands-on labs, and exam tips.</p>
        </div>
    </div>
`;
```

- [ ] **Step 6: Assemble the complete page**

Combine Steps 1-5 into a single `tutorials/az-900-practice-test.html` file, following the same structure as the PMP reference:
1. DOCTYPE + `<html>`
2. `<head>` with meta, styles
3. `<body data-page="tutorials">` with header, quiz HTML, footer
4. `<script>` tags for JS: `main.js defer`, `partials.js defer`, then inline `<script>` with all JS

---

### Task 2: Add Post Card to Microsoft Listing

**Files:**
- Modify: `microsoft.html`

- [ ] **Step 1: Add the AZ-900 practice test post card**

Insert a new `<article class="post-card">` in the "Azure & Cloud" section of `microsoft.html`, after the existing Azure articles (before line 146, the closing `</div>` of the Azure & Cloud section). Use `images/az-900.png` as the thumbnail (existing asset used for the BuyMeACoffee badge). Use today's date `Jul 5, 2026`.

```html
                <article class="post-card">
                    <div class="post-image">
                        <img src="images/az-900.png" alt="AZ-900 Practice Test" loading="lazy">
                    </div>
                    <div class="post-content">
                        <div class="post-meta">
                            <a href="../microsoft.html" class="category" style="background:rgba(6,182,212,0.12);color:#06b6d4;border-color:rgba(6,182,212,0.2)">Microsoft</a>
                            <time datetime="2026-07-05">Jul 5, 2026</time>
                        </div>
                        <h3><a href="tutorials/az-900-practice-test.html">AZ-900 Practice Test: 10 Free Questions for Azure Fundamentals</a></h3>
                        <p>Test your Azure fundamentals knowledge with 10 free practice questions covering Cloud Concepts, Azure Architecture &amp; Services, and Management &amp; Governance. Interactive quiz with detailed explanations.</p>
                        <a href="tutorials/az-900-practice-test.html" class="read-more">Read More →</a>
                    </div>
                </article>

```

The `post-count` script at the bottom of `microsoft.html` auto-counts `.post-card` elements, so the count will update automatically.

---

### Task 3: Verify

- [ ] **Step 1: Open the page locally and verify**

Open `tutorials/az-900-practice-test.html` in Chrome via `chrome-devtools_new_page`. Verify:
- Quiz renders correctly with question 1 showing
- Sidebar shows 10 numbered buttons
- Can select options, navigate with Next/Back, and click Review
- Correct/incorrect verdict displays with explanation
- Results screen shows score, pass/fail, domain breakdown
- Retake button works

- [ ] **Step 2: Verify microsoft.html listing**

Open `microsoft.html` locally. Verify:
- AZ-900 practice test card appears in the Azure & Cloud section
- Thumbnail loads (`images/az-900.png`)
- Post count reflects the new article
- Link navigates to `tutorials/az-900-practice-test.html`
