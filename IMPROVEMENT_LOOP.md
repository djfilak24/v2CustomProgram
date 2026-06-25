# Improvement Loop — Audit, Refine, Verify

> Shared state for the autonomous improvement loop. Each iteration: read this
> file, pick the **top unchecked item**, implement it, verify, commit + push,
> check it off, append a note to the Changelog. Keep this file truthful — it is
> the single record of what's done and what's next.

**Branch:** `claude/stabilize-dedupe`
**Decided focus:** Stabilize & de-dupe (demo-safe, visible wins).
**Monolith strategy:** Refactor opportunistically — when you fix an area, extract
it into its own component file. No big-bang rewrite.

---

## Loop protocol (run this every iteration)

1. **Pick** the first item in the Backlog that is not `[x]` and not `[blocked]`.
2. **Implement** the smallest correct change. If the area is a good extraction
   candidate (a self-contained chunk of `app/page.tsx`), pull it into its own
   file under `components/` as part of the fix.
3. **Verify**:
   - `pnpm test --run` — must not introduce *new* failures beyond the 3 known
     pre-existing ones (see Baseline below).
   - `pnpm build` for changes that could break compilation (type errors, imports).
   - Sanity-check the specific behavior changed.
4. **Commit + push** to `claude/stabilize-dedupe` with a clear message.
5. **Update this file**: check the item off, add a Changelog entry with the
   commit subject and a one-line "what/why".
6. If an item is ambiguous or needs a product decision, mark it `[blocked]` with
   a note and move to the next item — do not guess on product direction.

**Guardrails:**
- Don't change calc-engine output in `lib/calc/` without flagging it — those are
  the tested source of truth.
- Don't "fix" the 3 pre-existing test failures by editing expectations. Flag them.
- Preserve the existing look/feel. The user likes the UI; this is cleanup, not
  redesign. No deleting features (Department Manager stays).

---

## Baseline (captured at loop start)

- Tests: **24 passing, 3 failing** (pre-existing, see ABOUT.md §6.5):
  - `presence` 2-day policy: 133 vs expected 131
  - `computeProgram` Seed B: 133 vs expected 131
  - `computeProgram` Seed A: USF 29,115 vs expected 29,484
- Build: assumed green (verify on first build-affecting change).

---

## Backlog (in priority order)

### Phase 1 — Stabilize & de-dupe (current)

- [x] **1. Unify SF-each stepper increment.** ✅ Both card and table steppers now
  default to `±1` with `Shift-click = ±10` (coarse). Identical behavior across
  surfaces; tooltip hints discoverability.
- [ ] **2. Department Manager allocation correctness pass.** Audit per-department
  allocation steppers in the Workbench table (~line 2890) and card view. Confirm
  allocations: never exceed quantity×capacity, stay in sync between table and card
  views, and roll up correctly into `configuredByDeptAndType`. Fix discrepancies.
- [ ] **3. Single config-targets surface.** Targets currently render as BOTH a
  card-in-canvas and a sidebar. Collapse to one source of truth (the sidebar).
  Extract into `components/config-targets.tsx`. Remove the redundant in-canvas card.
- [ ] **4. Make config-vs-input visually distinct.** Apply a consistent visual
  treatment so "configuration" (ratios/policy/targets) reads differently from
  "input" (the client's actual rooms/numbers). See ABOUT.md §7.
- [ ] **5. Polish the program bar.** The top program bar is cramped. Improve
  hierarchy/spacing so the headline program metrics are legible at a glance.

### Phase 2 — Opportunistic structure (as touched)

- [ ] **6. Extract DepartmentManager** from `app/page.tsx` into its own component.
- [ ] **7. Extract ProgramTable / SpaceCard** rendering into dedicated files.
- [ ] **8. Extract canvas-mode toolbar** (Focus/Workbench/Briefing switch).

### Phase 3 — Vision foundation (do NOT start without user go-ahead)

- [ ] **9. Intake survey** (5-min) that pre-populates inputs. *Needs product
  spec from user before build.*
- [ ] **10. Live department-by-department meeting flow.** *Needs spec.*
- [ ] **11. Fit-planning handoff export** (program + notes). *Needs spec.*

---

## Changelog

_(newest first — append one line per shipped item)_

- **#1 SF stepper unified** — card + table both default ±1, Shift-click ±10. Was
  inconsistent (card ±1, table ±10). Tests unchanged (24 pass / 3 pre-existing fail).
- _loop start: branch created, baseline captured, ABOUT.md + this file added._
