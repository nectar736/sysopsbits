# Chart Sample SVGs — Design Spec

## Goal
Add 3 inline SVG diagrams (Gantt chart, Kanban board, Cumulative flow diagram) to `visual-tools-charts-flashcards-pmp.html` as preview samples of the paid course promoted in the post.

## Placement
Between the flashcards callout (line 618) and the quiz section (line 619), as a new "Chart Examples" section.

## Section Structure
- Heading: "Chart Examples: What You'll Get in the Full Guide"
- Short intro text
- 3-column responsive grid (3 cols → 1 col on mobile)
- Each cell: SVG + title + caption
- Bottom CTA linking to paid course

## SVGs
1. **Gantt Chart** — 5 horizontal bars (Research, Design, Development, Testing, Launch) with date axis (Week 1-6), dependency arrows, milestone diamond
2. **Kanban Board** — 3 columns (To Do, In Progress, Done), 2-3 cards per column, WIP limit badges, color-coded priority
3. **Cumulative Flow Diagram** — 3 stacked bands (Backlog, In Progress, Done) over time, legend, axis labels

All SVGs use `currentColor` and CSS custom properties for theme support. Grid CSS uses site's existing `--bg-card`, `--border-color`, etc.

## CSS
A small `<style>` block in the `<head>` for the diagram grid layout (`.diagram-grid`, `.diagram-card`, `.diagram-svg-wrapper`).

## Approval
Approved via brainstorming process on 2026-07-02.
