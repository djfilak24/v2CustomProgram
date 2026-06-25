# Survey Spec — "Programming Pre-Work" Intake

> The client-facing 5-minute survey that pre-populates the tool. Derived from the
> NELSON Programming Orientation email (the orientation doc) + product vision.
> This is the **build contract** for Phase 3 of `IMPROVEMENT_LOOP.md`.

---

## 1. The one rule everything follows

**Structured capture, never AI-interpreted free text.** Every answer is a typed
value (number, count, enum, boolean) that maps *deterministically* into the
tool's state. Free text exists only as *supplementary notes* that ride along to
the fit-planning handoff — it is never the primary signal for any calculation.

Why: the dream is "response is captured, not processed and dependent on AI to
interpret mixed text answers." So we design the *questions* to emit clean data.

---

## 2. The three lanes (decision-tree pattern)

Every question offers up to three ways to answer. The client picks their depth.

| Lane | What it is | Time | Emits |
|------|-----------|------|-------|
| **Quick** | One tap / a sensible default / a single number. | seconds | A clean default value |
| **Detailed** | Drill into a hierarchy — per-department, per-space-type counts. Only appears if they *want* to go deeper. | minutes | Granular per-entity values |
| **Defer** | "We'll cover this live." First-class, always available, never a failure. | instant | A `deferred` flag (tool shows it as "to confirm") |

The **Quick lane alone completes the whole survey in ≤5 minutes.** Detailed and
Defer are opt-in. More homework → more accurate prep → faster live session. The
live meeting then *validates* a real program instead of *extracting* from zero.

---

## 3. The department spine (no re-asking, ever)

Departments are entered **once** in Section 1 and then **flow forward** into every
later question. This is the core of "no one's wasting or repeating brain power."

```
Section 1: define Departments[]  (name + current HC)
        │
        ├─► Section 1b: future HC per dept        (pre-filled rows)
        ├─► Section 2:  days/week + dedicated/flex per dept   (pre-filled rows)
        ├─► Section 3a: private offices ± per dept            (pre-filled rows)
        └─► Section 3b: collaboration counts per dept         (pre-filled rows)
```

Each downstream question renders one row per department already on screen — the
client only adjusts counts (± steppers), never re-types names.

---

## 4. Section-by-section → tool data mapping

The survey sections mirror the orientation doc. Each emits typed data that maps
to the tool's real types (`Department`, `OnboardingInputs`, `EditableSpace`).

### Section 1 — Your People  →  `Department[]` + `totalHeadcount`
- **Quick:** total headcount (one number). Departments optional.
- **Detailed:** add departments with current HC (`Department.name`, `.headcount`).
- **1b Future (3–5 yr):** per-dept future HC → `Department.futureHeadcount`.
  Quick lane = single growth % applied to all; Detailed = per-dept.
- Growth/shrink/reorg flags → handoff notes.
- ➜ Tool: seeds `departments[]`, `targetHeadcount` = Σ headcount.

### Section 2 — How Your Teams Work  →  `daysInOffice`, `fullyRemote`, hybrid
- **Quick:** one company-wide in-office days/week → `OnboardingInputs.daysInOffice`
  (drives `hybrid` when < 5).
- **Detailed:** days/week per department; who's dedicated vs flex →
  `Department.hybridWorkers` (flex count) and dedicated seat intent.
- Fully-remote count → `OnboardingInputs.fullyRemote`.
- Cross-functional adjacencies → handoff notes (adjacency hints; tool has no
  adjacency engine yet — captured for the team).
- ➜ Tool: `config.daysInOffice/hybrid/fullyRemote`, per-dept `hybridWorkers`,
  `targetHybridWorkers`.

### Section 3 — Your Space Types  →  `Department.officeCount` + `EditableSpace[]`
- **3a Private offices:** "Do department heads need private offices?" renders all
  departments; ± per dept → `Department.officeCount`, summed to `targetOfficeCount`,
  and `percentOffices` derived. Quick lane = a single office % default.
- **3b Collaboration space:** the showcase decision tree. A text box for context,
  and below it a list of types (Huddle, Project Room, Open Lounge, Conference —
  from `SPACE_PRESETS`). Click a type → it expands to per-department count rows
  (departments pre-pulled). Counts → `EditableSpace.quantity` in the Collaborative
  zone with `departmentAllocations[]`.
- **3c Support spaces:** checklist (copy/print, storage, break, wellness,
  mother's room) → `EditableSpace` in Support/Wellness zones (default qty 1).
- ➜ Tool: private offices, collaborative + support spaces with allocations.

### Section 4 — What's Working / What Isn't  →  notes (qualitative)
- Loves / pain points / over-under-used. All free text BY DESIGN (this is the
  one place narrative is the point). → handoff notes, tagged by theme.
- ➜ Tool: notes section; nothing calculated.

### Section 5 — Special Considerations  →  special `EditableSpace[]` + notes
- Specialized equipment/infra (labs, server rooms) → Support spaces + notes.
- Security / compliance / visitor-facing → notes (front-of-house intent).
- Wish list → notes.
- Storage today vs future + digital-transformation timeline → storage space sizing
  hint + notes.
- ➜ Tool: a few seeded special spaces + rich handoff notes.

### NOT asked (the orientation doc is explicit — NELSON handles these)
Circulation factors, SF sizing standards, R/U ratios, adjacency/stacking,
benchmarks. These stay as **tool configuration**, never survey questions. (This is
exactly the config-vs-input line we're drawing in the UI.)

---

## 5. Output payload (survey → tool handoff)

The survey emits one structured object that pre-populates the tool. Shape mirrors
existing types so seeding is a direct map (no transformation guesswork):

```ts
interface SurveyResult {
  meta: { clientName: string; completedBy: string; completedAt: string }
  people: {
    departments: { name: string; headcount: number; futureHeadcount?: number }[]
    totalHeadcount: number            // = Σ headcount (or Quick-lane single number)
  }
  work: {
    daysInOffice: number              // company-wide (Quick) ...
    perDeptDays?: Record<string, number>   // ... or per-dept (Detailed)
    fullyRemote: number
    dedicatedByDept?: Record<string, number>
    adjacencyNotes?: string
  }
  spaces: {
    privateOfficesByDept: Record<string, number>     // → Department.officeCount
    collaboration: { type: string; byDept: Record<string, number> }[]
    support: string[]                                 // checklist of must-haves
  }
  qualitative: { loves?: string; painPoints?: string; imbalances?: string }
  special: { equipment?: string; security?: string; wishlist?: string; storage?: string }
  deferred: string[]                  // ids of questions marked "talk live"
}
```

A `seedToolFromSurvey(result)` mapper translates this into `departments[]`,
`OnboardingInputs`, and `editableSpaces` — reusing the existing
`seed-canvas-from-fast-track` / `convert-program-to-spaces` machinery where possible.

---

## 6. Sample-program preview ("here's what yours will look like")

Per the orientation doc's "Attached: Sample Completed Program." At the *start* of
the survey, show a read-only sample program (reuse the tool's **Briefing** canvas
mode with a canned scenario) so the client sees the end product before answering.
Sets expectations and motivates the homework.

---

## 7. Open architectural decisions (need user call)

1. **Where the survey lives & how data returns to the tool.** Options:
   - **(A) New route in this app** (`/survey`), zero-backend: result encoded to a
     shareable link or downloadable JSON the broker imports. Fastest MVP.
   - **(B) Same route + lightweight backend** (Vercel KV / DB) keyed by a code:
     client submits, broker opens by code. Cleaner UX, needs infra.
   - **(C) Standalone micro-app.** Most isolation, most overhead.
   - _Recommendation: (A) now, designed so (B) is a drop-in later._
2. **Per-department depth default.** Start everyone in the Quick (company-wide)
   lane and let them opt into per-department detail? (Recommended — protects the
   5-minute budget.)

---

## 8. Build sequence (Phase 3 backlog — see IMPROVEMENT_LOOP.md)

1. `SurveyResult` type + `seedToolFromSurvey()` mapper (+ unit tests). Pure data,
   no UI — testable and de-risks everything downstream.
2. Survey shell: sections, progress, the Quick/Detailed/Defer lane control.
3. Department spine + forward-population wiring.
4. Section 3b collaboration decision-tree (the showcase interaction).
5. Sample-program preview (Briefing mode + canned scenario).
6. Handoff: import a `SurveyResult` into the live tool.
