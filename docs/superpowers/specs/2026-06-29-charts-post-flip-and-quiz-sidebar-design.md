# Charts Post — Flip Cards & Quiz Sidebar Design

## Objective
Add hover-triggered CSS 3D card flip animations and a quiz sidebar question navigator to `visual-tools-charts-flashcards-pmp.html`.

## Architecture
Pure CSS flip (no JS), vanilla JS quiz sidebar matching `pmp-practice-test.html` pattern. Single HTML file, no build step.

## Files
- Modify: `project-management/visual-tools-charts-flashcards-pmp.html`

## Flip Cards — Visual Design

### HTML Structure (per card)
```html
<div class="flashcard" style="--card-color: #3b82f6">
  <div class="flashcard-inner">
    <div class="flashcard-front">
      <span class="chart-name">Gantt Chart</span>
    </div>
    <div class="flashcard-back">
      <span class="track-label">Planning</span>
      <div class="definition">A horizontal bar chart...</div>
      <div class="exam-tip">Memorize: Gantt = timeline bars</div>
    </div>
  </div>
</div>
```

### Color Assignments (--card-color)
| Use Case | Color |
|----------|-------|
| Planning / Scheduling | `#3b82f6` (blue) |
| Scope / Requirements | `#22c55e` (green) |
| Communication | `#8b5cf6` (purple) |
| Quality | `#f59e0b` (amber) |
| Risk | `#ef4444` (red) |
| Procurement | `#14b8a6` (teal) |
| Stakeholder | `#ec4899` (pink) |
| Cost | `#f97316` (orange) |

### CSS Flip Mechanism
- `.flashcard`: `position: relative; perspective: 1000px;`
- `.flashcard-inner`: `position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s ease;`
- `.flashcard:hover .flashcard-inner`: `transform: rotateY(180deg);`
- `.flashcard-front, .flashcard-back`: `position: absolute; inset: 0; backface-visibility: hidden; border-radius: inherit;`
- `.flashcard-back`: `transform: rotateY(180deg);`

### Front Face Design
- `background: linear-gradient(135deg, var(--card-color), color-mix(in srgb, var(--card-color) 60%, black))`
- `.chart-name`: font-size 1.25rem, font-weight 700, color white, text-shadow for readability
- Centered with `display: flex; align-items: center; justify-content: center; padding: 1rem; text-align: center;`

### Back Face Design
- `background: var(--bg-card)` (site dark card bg)
- `.track-label`: small, uppercase, subtle color at top
- `.definition`: font-size 0.95rem, line-height 1.5, primary text color
- `.exam-tip`: small, italic, `var(--accent)` or muted color, at bottom
- Padding: 1.25rem, flex column layout, `justify-content: center`

## Quiz Sidebar

### Layout
- Wrap quiz section in `.quiz-layout` (flex container)
- `#quiz-main`: `flex: 1; min-width: 0;`
- `#quiz-sidebar`: `width: 220px; flex-shrink: 0; position: sticky; top: 2rem; align-self: start;`

### Sidebar Content
- Heading "Questions" or "Quiz Navigator"
- `#question-nav-grid`: CSS grid `grid-template-columns: repeat(4, 1fr); gap: 0.5rem;`
- 10 buttons numbered 1–10. Last row has 2 buttons.
- States: default (gray outline/bg), `.active` (accent color), `.answered` (filled accent), `.correct` (green), `.incorrect` (red)
- JS: `renderSidebar()` updates on each answer/click. `goToQuestion(idx)` navigates.
- On results (all reviewed), sidebar hides (`display: none`).

### JS Changes
- Add `const questions = [...]` array (10 items from existing quiz data)
- Add `renderSidebar()`, `goToQuestion(idx)`, `renderQuestion()`, `showResults()` — same pattern as reference
- `renderQuestion()`: radio options, "Review" button, "Back" button, "Next Question" / "See Results" button
- Review shows correct/incorrect with full explanation
- Results screen: score %, pass/fail (60% passing), domain breakdown, retake button

## Page Flow
1. Article intro / section header
2. Flashcard grid (10 cards with 3D hover flip)
3. Quiz section (sidebar navigator + 10 questions)
4. CTA block promoting paid course + link to free practice test

## CTA & Cross-Promotion

### Bottom CTA (after quiz)
Promote the paid course https://buymeacoffee.com/mattyhip/e/537680:
- "Ready for the full PMP exam?" style messaging
- "Get 80 additional practice questions with step-by-step explanations"
- Prominent link/button matching existing buy-me-a-coffee styling

### Practice Test Reference
Insert an engaging reference to the free practice test before or near the quiz section:
- e.g. "Already know these charts? Put your skills to the test with the full PMP Practice Test →" linking to `/project-management/pmp-practice-test.html`
- Placed as a callout or inline note within the intro/transition text

## Mobile Responsiveness
- `.flashcard`: hover only works on devices with hover capability. On touch devices, cards remain face-up (no flip). This is acceptable — the content is still readable.
- Quiz sidebar: below 768px, sidebar stacks below quiz main content (`flex-direction: column`)

## Accessibility
- Cards are `div` elements with no interactive role (hover decoration only) — no ARIA changes needed
- Quiz uses standard `<button>`, `<input type="radio">`, `<label>` — natively accessible
