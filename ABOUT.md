# About This App — Workplace Programming Tool

> Plain-language map of what this tool is, how it's built, and where the bodies
> are buried. Written for whoever (human or AI) picks this up next. Keep it
> current as the structure changes.

---

## 1. What it is

A **workplace programming calculator** for commercial real estate / fit-planning.
You feed it a client's headcount and work policy, and it produces a **space
program**: how many of each room/desk type they need, the square footage, and
how it rolls up by department and zone. The output is meant to be handed off to
a fit-planning team.

The long-term vision (not yet built):

1. Send the client a **5-minute survey** → captures business basics (offices,
   workstations, conferencing type/volume, growth, work policy).
2. Survey **pre-populates** the tool.
3. Run a **live 2-hour meeting**, going department by department, filling in real
   needs with the client in the room.
4. End with a full program that can be **sliced, diced, and drilled into**, with
   notes that make handoff to fit-planning easy.

---

## 2. The two ways to build a program

| Mode | What it is | When you'd use it |
|------|-----------|-------------------|
| **Fast Track** | Ratio-driven. Enter headcount + in-office policy, the engine spits out a starting program from fixed ratios. Simple, fast, opinionated. | "I don't know exactly what I need — give me a sensible baseline." |
| **Advanced Canvas** | Full manual control. Every space is an editable card (or table row) with quantity, SF each, capacity, workspace type, and per-department allocation. | "I know my needs and want to dial each one." |

You typically **start in Fast Track, then move to Advanced Canvas** — which lands
you on the **Workbench**. (Switching back to Fast Track warns you that Advanced
customizations won't transfer.)

### Advanced Canvas has three "canvas modes"
Set by `canvasMode` state (`"focus" | "workbench" | "briefing"`):

- **Focus** — minimal, table-first, fewest columns.
- **Workbench** — the full toolbox: all columns, workspace-type chips, capacity,
  per-department allocation steppers, notes, and the Targets sidebar.
- **Briefing** — read-only presentation view.

---

## 3. Core concepts / data model

All defined inside `app/page.tsx` (see the monolith note below).

- **`EditableSpace`** (extends `Space`): one room/desk type.
  Key fields: `quantity`, `sfEach`, `capacity`, `totalArea` (= quantity × sfEach),
  `zone`, `workstationType` (`"employee" | "private" | "flex" | null`),
  `departmentAllocations[]`, `customName`, `isActive`, `notes`, `ratio`.
- **`Department`**: a named group with a headcount; spaces are allocated to
  departments via `departmentAllocations` (`{ departmentId, count }`).
- **Zones**: `Focus Open`, `Focus Enclosed`, `Collaborative`, `Support`,
  `Wellness`. Each zone has a **circulation multiplier** (RSF → USF), e.g. Focus
  Open +45%.
- **Workspace types** drive "planned vs configured" targets:
  - `employee` → planned = `targetHeadcount − targetOfficeCount`
  - `private` → planned = `targetOfficeCount`
  - `flex` → planned = `targetHybridWorkers`
  - `getWorkspaceTypeDistribution()` computes planned / configured / delta.
- **`configTargets`** (`app/page.tsx` ~line 1361): currently only
  `fullyRemoteEmployees` and `percentOffices`. NOTE: targets are *also* derived
  in several other places — there is **no single source of truth** yet (see
  Known Issues).

### Space catalog
The "Add Space" picker presets live in `app/page.tsx` (~line 870, `SPACE_PRESETS`)
with `sfEach`/`capacity`/`workspaceType` per preset. A separate, clean catalog
also exists in `lib/calc/spaceCatalog.ts`.

---

## 4. The calculation engine (the healthy part)

`lib/calc/` is clean, typed, and **unit-tested** (vitest). This is where the math
lives and it should stay the source of truth for calculations:

- `computeProgram.ts` — top-level program computation (seats → spaces → areas).
- `presence.ts` — presence/seat-demand model (desk-sharing by days-in-office).
- `qty.ts` — quantity/ratio helpers.
- `spaceCatalog.ts` — canonical space definitions.
- `types.ts` — shared types.
- `__tests__/` — parity tests against known "seed" scenarios.

Other lib helpers bridge Fast Track → Canvas:
`fast-track-calculations.ts`, `generate-canvas-from-fast-track.ts`,
`seed-canvas-from-fast-track.ts`, `convert-program-to-spaces.ts`.

---

## 5. File map

```
app/
  page.tsx          ← THE MONOLITH (~5,976 lines). Almost the entire UI + state.
  layout.tsx, globals.css, page loading
components/
  onboarding-modal.tsx     ← intake (Fast Track vs Advanced entry, inputs)
  fast-track-explorer.tsx  ← Fast Track ratio view
  dashboard-summary.tsx    ← KPI dashboard
  program-table.tsx        ← table rendering helpers
  treemap-view.tsx, comparison-view.tsx, seat-demand-view.tsx, briefing-view.tsx
  input-panel.tsx, numeric-slider-input.tsx, formula-flyout.tsx
  ui/                      ← shadcn/Radix primitives
lib/
  calc/                    ← calculation engine (TESTED) — see §4
  *.ts                     ← Fast Track ↔ Canvas bridges
hooks/, utils/kpi.ts       ← misc helpers
```

Stack: **Next.js 16, React 19, Tailwind v4, Radix/shadcn, Recharts, vitest.**
Package manager: **pnpm**. Dev: `pnpm dev`. Test: `pnpm test --run`.

---

## 6. Known issues / tech debt (as of this audit)

1. **The monolith.** `app/page.tsx` is ~5,976 lines — every mode, view, type, and
   handler in one component. This is the root cause of the "mashup of evolved
   features" feeling. Strategy: **extract opportunistically** as each area is
   touched (DepartmentManager, ConfigTargets, ProgramTable → own files).
2. **Config-targets redundancy.** Targets render BOTH as a card inside the canvas
   AND in a Targets sidebar — two surfaces, same data, no single source of truth.
   They also appear "arbitrarily" because visibility is mode-driven, not intentional.
3. **Stepper increment inconsistency.** SF-each adjusts by `±1` in card view
   (`page.tsx:2210/2220`) but hardcoded `±10` in table view (`page.tsx:2835/2855`).
4. **Department Manager** allocation (per-dept steppers, table view ~line 2890) is
   tangled into the same `updateSpace` path and needs a focused correctness pass.
5. **Pre-existing test failures (3).** Calc output has drifted from test
   expectations:
   - `presence`/`computeProgram`: 2-day policy returns **133 seats, tests expect 131**.
   - `computeProgram` Seed A: USF **29,115 vs expected 29,484** (diff 369).
   These are NOT to be "fixed" by editing the test expectations without
   confirming whether the engine or the test is correct — could mask a real
   regression. Flagged for human decision.

---

## 7. Config vs. Input (the mental model we're moving toward)

A recurring source of confusion. The intended separation:

- **Configuration** = the *rules/policy/ratios* (circulation %, desk-share ratios,
  workspace-type targets, benchmark presets). Set once, applies broadly.
- **Input** = *this specific client's actual numbers* (headcount, department
  counts, the rooms they actually want).

The UI should make this distinction visually obvious and stop duplicating the
"targets" surface. That's an active workstream — see `IMPROVEMENT_LOOP.md`.
