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
- **1b Future (3–5 yr) — GROWTH, first-class (see §4.5):** per-dept future HC →
  `Department.futureHeadcount`. Quick = single company growth % applied to all;
  Detailed = per-dept grow/shrink.
- Reorg flags → handoff notes.
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

### 4.5 — Growth is a first-class dimension (drives fit-planning headcount)

Growth is not a side note — it is the bridge from "today's people" to **planning
headcount**, which is what the fit-planning team designs against. It must be
captured at BOTH levels because real orgs grow unevenly (and, increasingly, AI is
reshaping team makeup — some teams grow, some shrink):

- **Company level:** a single growth % (Quick lane). Applies uniformly.
- **Department level:** per-dept future HC — some `+`, some `−` (Detailed lane).
  This is the realistic case and what produces a defensible planning headcount.

Mapping into the tool's existing growth machinery (already built — do not
reinvent): per-dept `futureHeadcount` feeds `planForGrowth` future KPIs and the
Current → Future deltas in the Configuration Targets. The survey simply *seeds*
`Department.futureHeadcount`; the tool already derives future offices/workstations/
hybrid from it.

- ➜ Tool: `Department.futureHeadcount` per dept; enables growth mode on import;
  planning headcount = Σ futureHeadcount (falls back to current where unset).

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
    companyGrowthPct?: number         // Quick-lane growth applied uniformly when a
                                      // dept has no explicit futureHeadcount
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

## 7. Decisions (locked)

1. **Delivery = Option A.** New `/survey` route in this app, zero-backend. Result
   becomes a **shareable link** under the published URL. Designed so a real backend
   (Option B) drops in later without reworking the survey.
2. **Entry point = the "I Need Help" button.** On the onboarding intent screen
   (`onboarding-modal.tsx` ~line 229) the middle button is currently `disabled` /
   "Coming Soon". It becomes the entry to this survey flow — i.e. the three-door
   decision tree is: "I know my needs" (manual) · **"I need help" (survey)** ·
   "Just exploring" (demo data).
3. **Quick-by-default, depth always visible.** Everyone starts in the Quick
   (company-wide) lane to protect the 5-minute budget, BUT the Detailed lane is
   visibly offered on each question (not hidden behind a toggle). At survey start
   we explicitly point out that going deeper is optional, with a **short demo**
   showing how a nested answer (e.g. departments → per-dept counts) supports the
   final program. Defer remains always available.

---

## 8. Build sequence (Phase 3 backlog — see IMPROVEMENT_LOOP.md)

1. `SurveyResult` type + `seedToolFromSurvey()` mapper (+ unit tests). Pure data,
   no UI — testable and de-risks everything downstream.
2. Survey shell: sections, progress, the Quick/Detailed/Defer lane control.
3. Department spine + forward-population wiring.
4. Section 3b collaboration decision-tree (the showcase interaction).
5. Sample-program preview (Briefing mode + canned scenario).
6. Handoff: import a `SurveyResult` into the live tool.
