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

- [ ] **M1 — `mapSurveyToCanvas` (pure + tested).** Full payload → `CanvasSeed`
  incl. collab/support overlay, desk/office allocations, notes. No UI. Unit
  tests assert nothing is dropped.
- [ ] **M2 — Wire M1 into the tool.** Replace `applySurveySeed`; land in the
  canvas with the complete program (verify round-trip headlessly).
- [ ] **M3 — `existingConditions` store + survey→existing mapping.** Carry the
  "have today" counts/sizes into the baseline.
- [ ] **M4 — Comparison panel** in the canvas (existing vs proposed).
- [ ] **M5 — Presenter demo mode** + 3 scenario fixtures.
- [ ] **M6 — Summary polish** + the end-to-end preview story (survey → program →
  comparison) as one demoable flow.

Phase-3 survey content is largely done; this phase makes it a **full-feature
application**, not a survey that throws data away at the door.

---

## 8. Open product decisions (need a call)

1. **Collab/support seeding:** when a type is selected with no count, seed the
   engine's ratio quantity, or qty 1? (Recommend ratio — matches the SF/ratio we
   showed.)
2. **Demo entry:** query param vs. a visible presenter control vs. both?
3. **Comparison home:** a new top-level canvas tab/section, or a panel inside the
   existing dashboard?
