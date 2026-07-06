# Survey → Advanced Canvas — Mapping & Demo Plan

> The plan to "pour" everything the survey captures into the Advanced Canvas
> with nothing wasted, segment **existing vs. future**, add a **presenter demo
> mode**, and an **existing-vs-proposed comparison** — then the loop to build it.
> Companion to SURVEY_SPEC.md. This is the build contract for the next phase.

---

## 1. Where we are (the waste audit)

`applySurveySeed()` today ports only part of the payload and lets the engine
regenerate the rest from ratios:

| Survey data | Ported today? | Lands in |
|---|---|---|
| headcount, days, %offices, fully-remote | ✅ | `OnboardingInputs` + engine |
| departments (name, current/future HC) | ✅ | `Department[]` (+ `planForGrowth`) |
| private offices per dept | ✅ | `Department.officeCount`, `%offices` |
| workstation / office **sizes** | ✅ | baseline `sfEach` on seeded spaces |
| **dedicated-desk allocations** (per dept / per person) | ❌ | — (engine derives seats) |
| **collaboration selections + per-dept counts** | ❌ | — (engine regenerates collab) |
| **support selections** | ❌ | — (engine regenerates support) |
| **existing counts** (workstations, offices, collab, support) | ❌ | — (no existing store yet) |
| **adjacency priority stack** | ❌ | — (should be notes/adjacency) |
| **qualitative** (loves / pains / imbalances) | ❌ | — (should be notes) |
| **roster employee names** | ❌ | — (only headcount survives) |

**Goal:** every row above lands somewhere real and editable in the canvas.

---

## 2. The canvas data schema (targets)

From `app/page.tsx`:

- `Department` — `{ id, name, color, headcount, futureHeadcount?, officeCount, hybridWorkers, workstations }`
- `EditableSpace` — `{ id, name, zone, quantity, capacity, sfEach, totalArea,
  workstationType, departmentAllocations[], notes, customName, isActive }`
- `config`, `targets` (headcount/office/workstation/hybrid), `projectInfo`,
  `planForGrowth`.

**New schema this phase introduces:**

- `existingConditions` — a parallel, read-only baseline the comparison reads:
  ```ts
  interface ExistingConditions {
    workstations: { count: number; sfEach: number }
    offices: { count: number; sfEach: number }
    reuseFurniture?: "reuse" | "mixed" | "new"
    collab: { name: string; count: number; sfEach: number }[]
    support: { name: string; count: number; sfEach: number }[]
    totalSF: number
  }
  ```
- `Employee` roster carried on `Department.employees?` (names + per-person
  desk/office flags) so person-level intent survives into the canvas.

---

## 3. The one rule: Existing ≠ Proposed

"What they have today" and "what they're programming for the future" are
**independent**. We carry both, never collapse them:

- **Existing** ← survey `existing*` (counts × the size/SF they told us). The
  current footprint. Read-only baseline.
- **Proposed** ← the programmed future: departments (future HC), desk/office
  allocations, collab/support **selections**, growth. The editable canvas.

The **comparison panel** diffs them (SF + counts by category). The selection of
a space = a *future* need; its "have today" count = *existing*. Same catalog,
two independent quantities.

---

## 4. Full mapping function (`mapSurveyToCanvas`)

Replace the partial `applySurveySeed` with a complete, pure mapper +
thin React glue. Pseudocode of the destinations:

```
departments[]      ← survey.people.departments (+ employees roster,
                       futureHeadcount, officeCount from per-dept/per-person)
editableSpaces{}   ← engine baseline, then OVERLAY survey intent:
   • workstations  : sfEach from existing.workstationSF; dedicated vs flex split
                     from dedicated allocations; departmentAllocations from
                     per-dept / per-person desk assignments
   • private office: quantity + departmentAllocations from officesByDept /
                     per-person; sfEach from existing.officeSF
   • collaboration : ensure each SELECTED type exists at qty from per-dept counts
                     (or ratio fallback); departmentAllocations per dept
   • support       : ensure each SELECTED support space is active
existingConditions ← existing.existingWorkstations/Offices × sizes,
                     existingCollab/existingSupport × catalog SF
config/targets     ← inputs (unchanged)
projectInfo.notes  ← qualitative + adjacency (ranked) + deferred + roster names
planForGrowth      ← any per-dept future ≠ current
```

Keep it a **pure function** (`lib/survey/mapSurveyToCanvas.ts`) returning a
`CanvasSeed`, unit-tested, so the round-trip is verifiable without UI — same
discipline as `seedToolFromSurvey` (which this supersedes/extends).

---

## 5. Presenter demo mode

A presenter-only path to seat a complete, polished end product on demand —
independent of what a given prospect fills in.

- **Entry:** `/survey?demo=1` (or a discreet "Demo" control) → a presenter menu
  of curated **scenarios** (e.g. *Tech Startup 120*, *Law Firm 60*, *Enterprise
  400*). Each scenario is a full `SurveyResult` fixture.
- Picking one **seeds the whole thing**: survey answers pre-filled (so you can
  walk the survey *or* skip to the program) and the canvas fully populated incl.
  existing-vs-proposed comparison.
- Fixtures live in `lib/survey/demo-scenarios.ts`. Adding a scenario = adding a
  fixture; no code changes.
- Lets the presenter show any path's finished output in seconds.

---

## 6. Existing-vs-proposed comparison panel

A canvas section (its own isolated area, per earlier discussion) that reads
`existingConditions` vs the live program:

- By category (Workstations, Offices, Collaboration, Support, Total): existing
  SF/count → proposed SF/count, with the delta and % change.
- Drives the first-pass review meeting ("you have X today, the program suggests
  Y — let's discuss").
- Read-only baseline; the proposed side stays fully editable in the canvas.

---

## 7. The loop (build sequence to the demo stage)

Each iteration: build → verify (build + unit tests + a headless click-through)
→ commit → check off. Pause for product calls only.

**Survey / review (the demo path) — round now:**

- [x] **S0 — Validation Review + presenter demo** (done: `/review`, 3 scenarios).
- [ ] **S1 — Demo at the *start* of the survey.** The scenario buttons belong on
  the survey hero, not the review: picking one pre-populates every answer so the
  presenter clicks through a fully-filled survey. (Demo on the review stays as a
  shortcut.) Seeds `SurveyState` from a scenario (`surveyStateFromResult`).
- [ ] **S2 — Expanded by default, "Simplify" as the option.** Invert the lanes:
  everything shows expanded so the client sees what's asked; a global **Simplify
  to save time** control collapses the optional depth, with a marker on the
  questions that simplify (and copy making clear the simple path does NOT
  compromise the output — only the time spent). Demo forces expanded.
- [ ] **S3 — Live-engine validation screen.** The narrative's decision points
  (planning headcount / future HC, in-office days, remote) become inline
  controls in a boxed treatment — ± / slider — that re-run the engine so the
  whole comparison updates live (the Fast-Track calculator, embedded in the
  sentence). Per-line **SF control** too, not just count.

**Canvas landing (D) — next round:**

- [ ] **M1 — `mapSurveyToCanvas` (pure + tested).** Full payload → `CanvasSeed`
  incl. collab/support overlay, desk/office allocations, roster, notes. No UI.
- [ ] **M2 — Wire M1 into the tool** so "Open in Advanced Canvas" pumps
  everything into the right slot. Fix on landing:
  - "No program loaded yet" on the workbench after a seed.
  - Top toggles **Show Allocations / Departments / Goals** are dead (Edit works).
  - Card **width** squished by the targets sidebar — content clipped (e.g. a
    quantity of 18 shows "1"). Guarantee card contents are always legible.
- [ ] **M3 — Department Manager as its own section** that captures + controls the
  per-person roster + counts that currently vanish on import (headcounts survive,
  the people/detail beneath them don't).
- [ ] **M4 — `existingConditions` store + comparison panel inside the canvas.**
- [ ] **M5 — Summary polish** + the one-flow story (demo → survey → review →
  canvas).

Phase-3 survey content is largely done; this phase makes it a **full-feature
application**, not a survey that throws data away at the door.

---

## 8. Decisions (locked)

1. **Collab/support seeding** → ratio quantity (drives the comparison narrative).
2. **Demo entry** → primary on the **survey hero**; review keeps a shortcut. URL
   `?demo=<key>` works on both.
3. **Comparison** → its own review home **and** a summary improvement before the
   canvas; a comparison panel also lands inside the canvas (M4).
