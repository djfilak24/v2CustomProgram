# Council Advisory — Intake Architecture & Product Direction

> Follow-up to [COUNCIL_REVIEW.md](./COUNCIL_REVIEW.md). The founder accepted the
> review and put a sharper question to the council:
>
> *"How do we build this to be nimble enough — but organized in the right order —
> to extract this information based on how our clients prefer to work, and
> present it back in a way that's easy to digest?"*
>
> Specifically: send-a-link intuitiveness, question fatigue, never-blocked
> flexibility, distributed intake (department leaders each fill their slice),
> a document round-trip (send a form out, import it back), existing conditions
> in the canvas, view refinement, and flipping the visual direction to light.

---

## 1. The core ruling: one data contract, many doors

The survey is not the product. **`SurveyResult` is the product** — the canonical,
versioned record of everything a client can tell us. Every intake mode is just a
different door into the same contract, and every downstream surface (review,
canvas, exports) reads from it.

```
                    ┌──────────────────────────────┐
  Solo link ───────►│                              │───► Validation Review
  Dept mini-links ─►│   SurveyResult (versioned)   │───► Advanced Canvas
  Live meeting ────►│   one engagement, one record │───► PDF / Excel handoff
  Doc round-trip ──►│                              │───► (future: year-2 rerun)
                    └──────────────────────────────┘
```

This is why the council is optimistic: the hard part — *knowing what to ask and
where each answer lands* — is largely done ("in combination we've identified the
complete picture"). What remains is doors and destinations, not discovery.

**Immediate implication:** stamp a version on the seed (`{ v: 2, ... }`) and keep
per-field provenance in mind (`answeredBy`, `source: link|import|live`) — the
distributed mode needs it, and it's nearly free to add now.

## 2. The three intake doors

### Door 1 — Solo link (exists; harden it)  · Effort: S
The current survey, with the fatigue fixes below. This remains the demo star and
the small-client path.

### Door 2 — Distributed mini-links (the 70-person reality)  · Effort: M
The scenario the founder described is the *normal* one: our contact distributes
to ~10 department leaders; each answers only their slice; the contact aggregates.

**Design:**
- The coordinator (our contact) starts an **engagement**: company basics, goals,
  existing conditions, and the department spine (names + who leads them).
- Each department gets a **mini-link**: a 2–3 minute slice scoped to that
  department only — headcount confirm, roster/leaders, cadence, dedicated desks,
  offices, collab needs, pain points. No company-wide questions, no other
  departments visible.
- Answers merge into the same `SurveyResult` keyed by department id (the spine
  already keys every per-dept map — the data model needs almost no change).
- The coordinator sees a **completion board** (Engineering ✅ · Sales ⏳ · Ops ✉️
  not opened), can nudge, override, or fill in for a silent department, then
  submits the aggregate to the review.

**Honest requirement:** this is the feature that forces the lightweight backend
(engagement id → JSON + per-dept token links). That backend was already P1 for
shareable links; distributed intake is the reason to build it *now* rather than
later. One table, no auth for respondents (tokenized links), coordinator gets a
magic link.

### Door 3 — Document round-trip (offline reality)  · Effort: M export / L import
Some clients will always want "just send me the form." The council endorses the
instinct and advises sequencing it in three honest steps:

1. **Workbook export (build first)** — generate the "completed-state document":
   every question, pre-filled with whatever we already know, blanks and prompts
   for the rest. Two formats: branded **PDF** (read/annotate/circulate) and
   **Excel workbook** (one tab per section, structured cells with validation —
   department grid, roster list, existing counts, collab checklist). Excel is
   the one that round-trips.
2. **Quick-entry grid (build second)** — a dense, keyboard-first "operator mode"
   screen where the coordinator (or we) can key a filled-out paper/PDF/Word
   answer set into the engagement in ~10 minutes. This delivers 90% of the
   import value at 10% of the cost, immediately.
3. **Automated import (build last)** — parse the returned Excel workbook into
   `SurveyResult` (deterministic, because we generated the layout). The council
   explicitly advises **against** parsing Word/PDF returns — fragile, endless
   edge cases; the Excel workbook + quick-entry grid covers those returns.

## 3. The anti-fatigue contract (applies to every door)

These become product rules, not suggestions:

1. **Never blocked.** Every question skippable; "Not sure — we'll talk live" on
   everything (it exists on most steps; audit for full coverage). Continue is
   never disabled. Skipped ≠ failed: skipped questions become *gaps*, and gaps
   are already a first-class, presenter-friendly concept in the review.
2. **Visible payoff, immediately.** The radar does this; go further — a
   persistent "your program so far: ~12,400 SF · 54 seats" ticker that moves as
   they answer. Every answered question should visibly move *something*.
3. **Answer once.** The department spine already carries forward; distributed
   mode extends the same principle across people.
4. **Honest time.** Per-lane estimates on the hero ("Quick ≈ 4 min · Detailed ≈
   12 min"), "about N min left" in the header, and a roster **paste/CSV import**
   so naming 70 people isn't 70 text boxes.
5. **Resume is sacred.** Autosave `SurveyState` on every patch + resume banner
   (the dead "Save & Continue Later" button becomes real). With Door 2, resume
   graduates from localStorage to the engagement record.

## 4. The traceability matrix — "answers must visibly do something"

The founder flagged this as the most important line in the review. The council
agrees and makes it operational: **no question ships unless this table says
where its answer surfaces.** Current audit:

| Survey answer | Review | Canvas | Engine/Program | Verdict |
|---|---|---|---|---|
| Departments + headcounts | ✅ tables/tiles | ✅ dept cards | ✅ totals | ✅ |
| Future headcount (per-dept) | ✅ narrative dial | ✅ growth mode | ✅ planning HC | ✅ |
| Named roster | ✅ responses tab | ✅ dept manager chips | — | ✅ |
| Leaders (crowns) | ✅ crowned, sorted | ✅ crowned chips | — | ✅ |
| Dedicated desks per dept | ✅ | ✅ dept cards + space allocations (**bug fixed this commit**) | ✅ targets | ✅ |
| Private offices per dept | ✅ | ✅ | ✅ | ✅ |
| Work cadence (per-dept ranges) | ⚠️ company # only — ranges not shown | ❌ | ⚠️ seeds min of band | **Gap** |
| Goals / motivators / posture | ✅ chips + strategy banner | ❌ | ❌ narrative only | **Gap** (P2: posture nudges ratios, annotated "because you said optimize") |
| Existing counts & sizes | ✅ comparison + gaps | ❌ stored, never shown | baseline SF only | **Gap** (P0: before/after panel in canvas) |
| Office placement (int/ext) | ✅ responses | ❌ | ❌ | **Gap** (notes + future stacking hints) |
| Collab room config | ✅ responses | ✅ space notes | — | ✅ |
| Custom support spaces | ✅ | ✅ seeded as spaces | — | ✅ |
| Adjacency pairs (ranked) | ✅ text | ❌ notes only | ❌ | **Gap** (canvas adjacency panel) |
| Qualitative + deferred | ✅ responses | ❌ handoffNotes stored, not shown | — | **Gap** (notes panel in canvas) |

Five gaps, all of the same species: **captured, then invisible in the canvas.**
Closing "existing + notes in canvas" (one before/after + notes panel) closes
three of them at once.

## 5. Visual direction: flip to light — ruled

NELSON's brand is predominantly light; the canvas is already light. **The survey
and review migrate to a light NELSON expression; dark becomes a presentation
option, not the identity.**

- Build the shared token layer first: Poppins scale, cyan `#00badc` accent,
  slate neutrals, one card/radius/shadow language, semantic colors (amber =
  gap/attention, emerald = surplus/on-track, violet = offices).
- The survey keeps everything that makes it great — chunky choice cards, radar,
  progress rhythm, crowns — re-skinned light. The canvas adopts the same tokens
  (mostly accent + type + card polish, since it's already light slate).
- Sequence: tokens → canvas accent/type alignment (cheap, immediate coherence) →
  survey/review light re-skin (the bigger visual lift, one focused pass).

## 6. Views: three audiences, not three modes

Refactor the mental model from "Simple / Workbench / Briefing" to **who is
looking at the screen**:

| View | Audience | Content posture |
|---|---|---|
| **Present** (Briefing, elevated) | The client, on the wall | Read-only story: goals → before/after → program → gaps. Brand-forward. |
| **Facilitate** (calm default canvas) | Us, mid-meeting | Cards + totals + dept walk; existing/proposed side panel; one or two controls, everything else put away. |
| **Build** (Workbench) | Us, at the desk | Full toolbox — every toggle, table mode, targets sidebar, recalibrate. |

The canvas opens in **Facilitate** when arriving from the review (a meeting is
happening), **Build** when opened directly. The client never accidentally sees
the toolbox.

## 7. Build order (the council's sequencing)

**Phase 1 — Trust the loop (1 sprint-ish, no backend)**
1. ✅ Dept-card counts honor dedicated-desk answers (fixed in this commit)
2. Autosave + resume (make the dead button real)
3. Skip-anything audit + gap propagation (skipped → review gaps)
4. Existing conditions + handoff notes panel **in the canvas**
5. Fix 3 red engine tests, drop `ignoreBuildErrors`, add CI

**Phase 2 — The artifact (what clients hold)**
6. PDF export of the review (branded leave-behind)
7. Excel export: program + the **workbook** (this is also Door 3's export half)
8. Shared design tokens + canvas alignment (coherence before the re-skin)

**Phase 3 — The doors (backend arrives)**
9. Engagement backend (one table, tokenized links)
10. Distributed mini-links + coordinator completion board
11. Quick-entry grid (operator import)
12. Survey/review light re-skin on the token layer

**Phase 4 — Compounding**
13. Automated Excel import · goals→engine (annotated) · adjacency in canvas ·
    analytics · scenario A/B · monolith decomposition (ongoing alongside)

**The one-sentence strategy:** make the single-player loop airtight and visibly
lossless first (Phases 1–2) — because the distributed and offline doors multiply
whatever loop they feed. Ten mini-links into a leaky funnel is ten times the
leak; into an airtight one, it's the moat.

---
*Also fixed in this commit: full-roster/per-dept dedicated-desk counts now land
on the department cards in the canvas (was: formula `headcount − offices`
ignored the survey's answer). Covered by 2 new tests; 31 survey tests green.*
