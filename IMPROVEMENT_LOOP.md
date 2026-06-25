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
- [x] **2. Department Manager allocation correctness pass.** ✅ Fixed silent
  over-allocation: `updateSpace` now reconciles `departmentAllocations` when
  quantity drops (trims largest allocations to fit). The per-stepper clamps
  (`updateDeptAlloc`) were already correct; the gap was the quantity-change path,
  which is now centralized for card, table, numeric entry, and recalibrate.
  _Note: this UI-state logic isn't unit-tested (lives in page.tsx); candidate for
  extraction + test when the table/cards are pulled out (items 6–7)._
- [x] **3. Single config-targets surface.** ✅ The in-canvas card (lines ~4601–5473)
  was a full duplicate of the sidebar (Company Targets + Program Status +
  Department Management) shown only when the sidebar was closed — the "arbitrary
  pop-up". Gated off so the sidebar is the single home; closing it now hides
  targets (full-width canvas) with the "Targets" toggle to reopen. Build verified.
  _The dead JSX is intentionally left for physical removal during extraction
  (items 6–7) per "don't randomly delete 870 lines" — fully reversible meanwhile._
- [~] **4. Make config-vs-input visually distinct.** PARTIAL: added a clarifying
  subtitle to the sidebar config header ("What to aim for · not the live program")
  to seat the mental model. Fuller treatment (distinct visual language for the
  config layer vs. the input/program layer across the whole canvas) is held for
  user review — it's taste-sensitive and the user likes the current UI.
- [ ] **5. Polish the program bar.** The top program bar is cramped. Improve
  hierarchy/spacing so the headline program metrics are legible at a glance.

### Phase 2 — Opportunistic structure (as touched)

- [ ] **6. Extract DepartmentManager** from `app/page.tsx` into its own component.
- [ ] **7. Extract ProgramTable / SpaceCard** rendering into dedicated files.
- [ ] **8. Extract canvas-mode toolbar** (Focus/Workbench/Briefing switch).

### Phase 3 — Survey → program vision (spec'd in SURVEY_SPEC.md)

Spec done (`SURVEY_SPEC.md`). Two open decisions before build: delivery model
(recommend new `/survey` route, zero-backend) + per-dept depth default. Build order:

- [ ] **9. `SurveyResult` type + `seedToolFromSurvey()` mapper** (pure data + unit
  tests). De-risks everything downstream; no UI.
- [ ] **10. Survey shell** — sections, progress, Quick/Detailed/Defer lane control.
- [ ] **11. Department spine** — define depts once, forward-populate every section.
- [ ] **12. Section 3b collaboration decision-tree** (the showcase interaction).
- [ ] **13. Sample-program preview** (Briefing mode + canned scenario).
- [ ] **14. Handoff** — import a `SurveyResult` into the live tool.

---

## Changelog

_(newest first — append one line per shipped item)_

- **#3 Single targets surface** — gated off the in-canvas Configuration Targets
  duplicate; sidebar is now the single source. Closing it hides targets instead of
  popping a redundant card into the canvas. Build verified clean.
- **#2 Dept allocation reconcile** — lowering a space's quantity no longer leaves
  stale over-allocations; `updateSpace` trims largest dept allocations to fit.
- **#1 SF stepper unified** — card + table both default ±1, Shift-click ±10. Was
  inconsistent (card ±1, table ±10). Tests unchanged (24 pass / 3 pre-existing fail).
- _loop start: branch created, baseline captured, ABOUT.md + this file added._
