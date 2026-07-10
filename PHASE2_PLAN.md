# Phase 2 — The Deliverable, and What Becomes of Advanced Canvas

*Planning document — agreed before any of it is built. Nothing here is started yet.*

---

## 1 · What we're building

After a client submits (survey, workbook, or live session), the engagement produces
**the deliverable**: a designed, branded program document. Two forms, one source:

- **The interactive deliverable (build first)** — a web-based, slide-style presentation
  at their engagement link. Advance through it like a keynote: cover → profile →
  program map → the numbers → what's next. Key decisions (workstation size, office
  size, growth horizon) are *editable in place* and the whole program recomputes live —
  "what if we went to 6×6?" answered on screen, in the meeting.
- **The PDF deliverable (build second)** — the same template rendered non-interactive
  and paginated. Print of the same components; no second design to maintain.

Every new engagement pumps its data into the same template. The components update,
the deliverable is done. No hand assembly.

## 2 · The architecture that makes both cheap

**One rule: the deliverable is a pure function of the engagement.**

```
Engagement (SurveyResult + edits)
        │
   deliverable model  =  buildDeliverable(result, overrides)
        │                      (pure lib/ function: runs engine, comparison,
        │                       program map layout, profile — all existing code)
        ├── <SlideDeck/>   → /d/<token>  (interactive, advance/edit)
        └── <PrintDeck/>   → same components, print CSS → PDF
```

Almost every visual already exists and is already pure:
`computeProfile` (radar), `buildProgramMap` (bubble map), `buildComparison`
(existing vs proposed + gaps), `computeSpaceProgram` (SF, ratios). Phase 2 is
mostly **composition and design**, not new math.

**Editable decisions** = a small `overrides` object (`{ workstationSF?, officeSF?,
growthPct?, … }`) applied before the engine runs. Editing a slide writes an override,
recomputes, and re-renders — and *saves the override to the engagement*, so what
NELSON presented is what's on record. The PDF renders result + saved overrides:
the printed document always matches the last thing shown on screen.

### The slides (v1 deck)

1. **Cover** — client name, date, NELSON brand, hero photography
2. **Who you are** — headcount today → future, departments, ways of working
3. **Workplace Profile** — the radar, large and annotated
4. **Program Map** — the whiteboard bubble diagram, full-bleed
5. **The verdict** — proposed SF, delta vs today, the goal-vs-math strategy line
6. **Existing vs proposed** — by space type, with the gaps called out
7. **The program table** — every space, count × size, ratio used *(the editable slide)*
8. **What's next** — validation decisions still open, session agenda

### Sequence & rough effort

| Step | What | Size |
|---|---|---|
| 2.1 | `buildDeliverable()` + overrides model, engagement stores overrides | S |
| 2.2 | `/d/<token>` slide shell — advance, keyboard/swipe, progress dots | M |
| 2.3 | Slides 1–6 from existing components, restyled for presentation scale | M |
| 2.4 | Slide 7 editable (size chips → recompute → visible ripple) | M |
| 2.5 | Print pass — same deck, `@page` CSS, one slide per page → PDF | S |
| 2.6 | Console: "Open deliverable" per engagement; client link gated until NELSON flips "share" | S |

Gating decision built in from day one: the deliverable exists at `/d/<token>` but the
client only sees it **after NELSON presents it** (a `shared` flag on the engagement) —
protects the reveal, same philosophy as the profile-only thank-you.

## 3 · What becomes of Advanced Canvas

Position: **Advanced Canvas becomes NELSON-internal tooling — clients never need it.**
The client-facing arc is complete without it: landing → intake → deliverable → session.

What clients currently get from the canvas is replaced by the deliverable (presentation)
and the review (working session). What NELSON needs from it distills to three jobs:

1. **Adjust** — change program decisions mid-session → the review + editable
   deliverable slide progressively absorb this.
2. **Inspect** — the card layout showing every space type with detail and which
   departments hold what → worth extracting as a **Spaces browser** inside the
   review (the one canvas UI pattern worth keeping).
3. **Hand off** — package the validated program for the fit-planning team →
   a **Fit-Planning Package** export: program table (counts, sizes, SF), dept
   allocations, adjacency ranks, existing-conditions notes, size-mix inventory —
   Excel + PDF, one button in the review.

Recommendation: don't decompose the canvas now. Freeze it as-is (it still works,
NELSON-only), extract the Spaces browser + Fit-Planning Package into the review
during Phase 2, and after both engines share the same deliverable model, retiring
the canvas becomes a deletion, not a migration. Fast-Track Explorer gets the same
treatment on its own track: extracted to a scoped client route (`/explore?e=`) as
a fourth landing door, saving its config to the engagement.

## 4 · Prerequisite (small, do first)

**Engagements hold one result today; they need a submissions list** —
`submissions: [{ source: "survey" | "workbook" | "fast-track" | "session-edit", result, at }]`.
The deliverable reads the latest; the console shows the history. Cheap now,
painful after the deliverable and explorer both write to the same slot.

## 5 · Open decisions (founder)

1. **Deliverable reveal**: gated behind NELSON "share" flag (recommended) or
   visible to the client immediately on submit?
2. **Which decisions are editable on slide 7?** Proposed v1: workstation size,
   office size, growth %. (Collab ratios stay NELSON-only in the review.)
3. **PDF depth**: mirror all 8 slides, or a 4-page executive cut (cover, profile,
   map, verdict+table)?
4. **Email flow** (noted for later): submit-confirmation + "your deliverable is
   ready" emails pointing back to the home page — needs a send provider (Resend
   or similar) and a founder decision on sender identity. Not in Phase 2 builds.
