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
