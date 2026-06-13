# PMP Practice Test Design

## Objective
Create a new "Project Management" category on SysOpsBits with a 20-question PMP practice test as the first post.

## Architecture
Self-contained HTML page (Approach A) — vanilla JS, no dependencies.

## Files
- Create: `project-management/pmp-practice-test.html`
- Modify: `categories.html` (add 4th category card)

## Quiz Data Model
Each question object: `{ id, domain, question, options: [], correct, explanation }`

20 questions across 3 PMI domains:
- **People** (42%) — 8 questions: leadership, team building, conflict resolution, communication
- **Process** (50%) — 10 questions: scope, schedule, cost, risk, quality, procurement, stakeholder engagement
- **Business Environment** (8%) — 2 questions: compliance, organizational change, strategic alignment

## UX Flow
1. **Quiz view**: One question at a time. Radio buttons for options. "Next Question" button. Progress bar (Q 1/20). Domain indicator.
2. **Review mode**: After answering, if user clicks "Review" instead of "Next", show correct/incorrect with explanation. Option to continue.
3. **Results screen**: % score, pass/fail (PMP passing = 60%), domain breakdown table showing correct/total per domain, "Retake" button.
4. **Question navigation**: Can only move forward. Can't change after reviewing.

## Visual Design
- Clean card layout matching site theme
- Green highlight for correct, red for incorrect in review mode
- Section header matching existing category page style

## Updates to categories.html
- Add "Project Management" card (data-count="1") linking to the practice test

## Phase 2: Navigation & Quiz Sidebar

### Project Management Category Landing Page
- Create `project-management.html` — follows the pattern of `tutorials.html` / `tools.html`
  - Section header with title "Project Management" and description
  - `.posts-grid` with article cards (starts with just the PMP practice test)
  - Uses `data-page="project-management"` for active nav highlighting

### Navigation Changes
- **`partials/header.html`**: Add `<li><a href="project-management.html" data-page="project-management">Project Management</a></li>` after Tools
- **`partials/category-nav.html`**: Add link after Tools in same order
- **`partials/footer.html`**: Add to the Categories section (after Tools)

### Quiz Right-Sidebar Question Navigator
**`project-management/pmp-practice-test.html`**:
- Convert `.quiz-container` to two-column flex layout (`display: flex; gap: 2rem`)
- **Left column** (`flex: 1`): existing question content unchanged
- **Right column** (`width: 200px; flex-shrink: 0`): question navigation panel
  - "Questions" heading, 5×4 grid of numbered buttons (1–20)
  - States: unanswered (gray), answered (green), current (primary gradient), reviewed-correct, reviewed-incorrect
  - Clicking a number calls `goToQuestion(n)` function
- **Back button**: "Previous Question" button below question actions, disabled on Q1
- **Responsive**: sidebar collapses to top strip or below content on narrow screens
- **JS changes**: 
  - Add `goToQuestion(idx)` function
  - Update `renderQuestion()` to re-render sidebar state
  - Add `renderSidebar()` to build question grid
