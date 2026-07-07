# Council Review — Workplace Programming Tool

> Five-persona committee grading of the application as of `88be26e`
> (branch `claude/survey-consolidated`, 2026-07-07). Each persona scored
> independently against what matters to *them*; synthesis and roadmap at the end.
> Re-run this council after each major milestone and append the new scorecard.

**What was reviewed:** the full flow — Workplace Strategy Discovery survey
(`/survey`, 10 steps, 3 people-modes, demo scenarios), the Validation Review
(`/review`, Dashboard / Detailed responses / Recommended program tabs, gaps
toggle, goal strategy), and the Advanced Canvas (`/`, Fast-Track engine,
Workbench/Briefing/Focus, dept manager, targets sidebar). Plus the codebase:
~12,200 lines app+lib+components, 56 tests (53 pass, 3 pre-existing engine
parity failures), zero backend (localStorage handoff).

---

## Scorecard (all scores /10)

| Persona | Lens | Score |
|---|---|---|
| Marta · Workplace Strategy Principal | Does it run my meeting and produce a real program? | **6.9** |
| Dana · Client Office Manager | Is the survey worth 5 minutes of my week? | **7.2** |
| Felix · Product / UX Designer | Is this one coherent, accessible product? | **5.9** |
| Priya · Staff Engineer | Can a team safely build on this? | **4.9** |
| Victor · Commercial Director | Can we sell, demo, and expand with this? | **6.5** |
| **Council average** | | **6.3 — strong prototype, not yet a product** |

---

## 1) Marta — Workplace Strategy Principal (runs the 2-hour validation meetings)

| Category | Score | Evidence |
|---|---|---|
| Survey fidelity to the discipline | 8.5 | Asks the right things in the right order: people → goals → existing → cadence → offices-before-desks (leaders first) → adjacency → collab config → support → narrative. Office⇄desk XOR matches how allocation actually works. Interior/exterior placement is a question competitors skip. |
| Meeting readiness (review) | 8 | The review is genuinely meeting-shaped: biggest gaps first, live dials that re-run the engine mid-conversation, ratios shown per line, existing-vs-proposed with the "what we don't know" gaps surfaced. The goal-vs-math strategy banner ("Goal and math pull apart") is exactly the conversation opener I need. |
| Canvas as the deep-dive tool | 6 | Powerful, but dense — the department-by-department walk works, targets reconcile, roster survives. But existing conditions captured in the survey are stored yet **not visible anywhere in the canvas**, and there's no side-by-side scenario ("Plan A vs Plan B") for the negotiation moment. |
| Handoff to fit-planning | 4 | The whole point of the funnel — and there is **no export**. No PDF, no Excel, no print stylesheet. Notes assemble nicely into state and then have nowhere to go. |

**Marta's top 3 moves**
1. **Export or it didn't happen** — one-click PDF summary (dashboard + program table + notes) and an Excel/CSV of the program. This is the deliverable my client pays for.
2. **Scenario compare** — snapshot the program, change assumptions, show A/B deltas. Every real meeting negotiates between two futures.
3. **Surface existing conditions in the canvas** — the before/after story shouldn't evaporate the moment I leave the review.

---

## 2) Dana — Client Office Manager (fills in the survey, attends the meeting)

| Category | Score | Evidence |
|---|---|---|
| Clarity of questions | 8 | Plain language, well-framed ("This isn't about offices — a dedicated desk is an assigned workstation"). The leader crown model finally matches how I think about my org. Choice cards over form fields. |
| Time and effort honesty | 7 | Detailed-by-default with "Simplify to save time" is respectful, but "3–5 minutes" on the hero is optimistic for the detailed lane at 10 steps with a full roster. Naming 90 people is real work; there's no CSV/paste import for the roster. |
| Trust and feel | 9 | The live radar responding to my answers, the polish, the "we'll talk live" defer option — it feels like a firm that has done this before. Best-in-class for an intake form. |
| Can I stop and come back? | 3 | **"Save & Continue Later" is a dead button.** No handler; a refresh mid-survey loses everything. For a survey sent by email to a busy ops manager, resumability is table stakes. |

**Dana's top 3 moves**
1. **Make Save & Continue Later real** — persist `SurveyState` to localStorage on every patch (trivial today), and a resume banner. Later: a tokenized link.
2. **Roster import** — paste a list of names (or CSV) instead of typing 90 people one by one.
3. **Honest time estimate per lane** — "Quick ≈ 4 min · Detailed ≈ 12 min" and a running "about N min left" from the step you're on.

---

## 3) Felix — Product / UX Designer

| Category | Score | Evidence |
|---|---|---|
| Survey + review visual system | 9 | The dark navy/cyan Poppins system with chunky cards, the stepped progress with section labels, the radar, crowns for leaders, amber for gaps — coherent, confident, memorable. |
| One product? | 4 | The moment you click "Open in Advanced Canvas" you fall from that world into a **light slate/teal utility app** with different type, chrome, and iconography. The client watches the brand evaporate mid-meeting. Two products stitched at the seam. |
| Canvas information architecture | 5 | Workbench is powerful but everything shouts at once: toolbar toggles, targets sidebar, per-card steppers, dept rollups. Briefing mode helps. There's dead JSX (`{false && …}`) and a permanently hidden legacy sidebar still shipping in the bundle. |
| Accessibility | 5 | Meaning carried by color alone in places (amber crowns, cyan selection), `text-white/40`-level contrast on dark, no visible focus states audit, no reduced-motion audit beyond one pulse, untested keyboard paths on custom controls (steppers, chips, adjacency graph). |

**Felix's top 3 moves**
1. **Unify the design language** — bring the canvas into the navy/cyan brand system (or a light twin of it): same type scale, same accent, same card language. The handoff moment should feel like a door, not a cliff.
2. **Canvas progressive disclosure** — default the Workbench to a calm view (cards + totals), move power toggles behind a "workbench tools" cluster; the presenter chooses density, the client never sees it.
3. **Accessibility pass** — contrast tokens (≥4.5:1 for text), non-color affordances (crown + "Leader" text on hover already exists — make it persistent), focus-visible rings, keyboard support on steppers/chips.

---

## 4) Priya — Staff Engineer

| Category | Score | Evidence |
|---|---|---|
| Domain library quality | 8 | `lib/survey/*` is the right shape: pure, typed, documented modules (`sections`, `types`, `mapSurveyToCanvas`, `comparison`, `demo-scenarios`) with 29 focused tests. The mapper-with-tests pattern (M1 before M2) is how this should grow. |
| The monolith | 3 | `app/page.tsx` is **6,173 lines with 67 useStates** — components, types, business logic, and three canvas modes in one client file. Every feature lands here eventually and every edit risks the whole surface. Interfaces (`Department`, `EditableSpace`) are defined *inside* the component. |
| Correctness guardrails | 4 | `ignoreBuildErrors: true` in next.config; **3 failing engine parity tests** (`lib/calc` Seed A/B, presence model) sitting red in the suite — either the engine drifted or the seeds did, and nobody can tell which. No CI config in repo, no lint gate. |
| Data layer | 4 | localStorage-only: fine for the demo, but no versioned schema (a saved seed from last month may not parse), duplicate mappers (`seedToolFromSurvey` inside `mapSurveyToCanvas` overlap), and no migration story to a backend. |

**Priya's top 3 moves**
1. **Resolve the red tests, then gate** — decide whether Seed A/B parity or the engine is right, fix, then turn off `ignoreBuildErrors` and add a CI step (typecheck + vitest) so red can't ship.
2. **Decompose page.tsx on the existing seams** — extract `SpaceCard`, `ZoneTable`, `TargetsSidebar`, `DepartmentManager`, `BriefingView` and the interfaces into modules; target <1,500 lines for the shell. Delete the dead `{false && …}` JSX and the hidden legacy sidebar.
3. **Version the seed schema** — `{ v: 2, ...SurveyResult }` with a tolerant parser, so survey/tool can evolve independently; it's also the contract a future backend inherits.

---

## 5) Victor — Commercial Director (sells the engagement, runs demos)

| Category | Score | Evidence |
|---|---|---|
| Demo-ability | 9 | Three one-click industry scenarios with named rosters, leaders, goals, and deliberate gaps (enterprise's unknown office size) — a rep can tell the full story in 10 minutes without typing. The demo switcher in the review header is exactly right. |
| Differentiation | 8 | Survey → live-dial validation → deep canvas is a story competitors (static questionnaires + spreadsheets) can't tell. The goal-vs-math banner turns a calculator into an advisory posture. |
| Pipeline readiness | 5 | No shareable artifact: I can't send a client *their* review link (localStorage is device-local), can't leave behind a PDF, can't co-brand. The canvas's visual mismatch undercuts the premium first impression the survey earns. |
| Stickiness / expansion | 4 | One-shot flow. No accounts, no saved engagements, no way to run the same client a year later against last year's program. Nothing measurable (no analytics on survey completion/drop-off). |

**Victor's top 3 moves**
1. **Leave-behind artifact** — branded PDF of the review (same visual system) auto-generated at meeting end. That document circulates internally at the client and sells the next phase.
2. **Shareable engagement link** — even a lightweight backend (one table: engagement id → SurveyResult JSON) turns "demo on my laptop" into "link in the follow-up email."
3. **Completion analytics** — step-level drop-off on the survey tells us which questions cost us respondents; today we're blind.

---

## Cross-cutting themes (what the council agrees on)

1. **The last mile is missing.** Everyone lands on the same P0: the funnel ends
   in state, not an artifact. Export (PDF/Excel) + shareable persistence is the
   single highest-leverage investment.
2. **Two products, one seam.** The survey/review experience is A-grade; the
   canvas is a different, older product. Visual unification + calmer default
   Workbench closes the gap at exactly the moment the client is watching.
3. **The prototype's debt is now the constraint.** The 6k-line monolith, dead
   tests, and `ignoreBuildErrors` were fine while proving the concept; they are
   now the biggest tax on every next feature.
4. **Captured ≠ used.** Goals, adjacency, existing conditions, and office
   placement are captured beautifully and then under-leveraged downstream —
   each should visibly shape the program or the canvas, or clients will stop
   answering them.
5. **Resumability is broken at both ends** — dead Save-&-Continue on the survey,
   no saved engagements on the canvas.

## Roadmap to the next level

**P0 — the product moment (do first)**
- [ ] PDF export of the Validation Review (dashboard + program + notes, branded)
- [ ] Excel/CSV export of the program (canvas + review)
- [ ] Wire Save & Continue Later: persist SurveyState on every patch + resume banner
- [ ] Fix the 3 red engine tests; remove `ignoreBuildErrors`; add CI (typecheck + tests)

**P1 — one coherent product**
- [ ] Canvas visual unification with the survey/review design system
- [ ] Decompose `app/page.tsx` (SpaceCard, ZoneTable, TargetsSidebar, DepartmentManager, BriefingView); delete dead JSX
- [ ] Surface existing conditions + handoff notes inside the canvas (before/after panel)
- [ ] Scenario compare (snapshot A/B with deltas)
- [ ] Versioned seed schema; lightweight backend for shareable engagement links

**P2 — compounding advantages**
- [ ] Goals → engine influence (optimize posture tightens ratios; expand loosens) with visible "because you said X" annotations
- [ ] Roster CSV/paste import; per-lane honest time estimates
- [ ] Accessibility pass (contrast, focus, keyboard, non-color signals)
- [ ] Survey completion analytics (step drop-off)
- [ ] Adjacency data → canvas adjacency hints (not just notes)
- [ ] Mobile/tablet verification for the survey (clients will open it on phones)

---

*Council methodology: each persona graded only their lens, using the running
app (survey demos, review tabs, canvas seed flow) and the codebase (structure,
tests, config) as evidence. Scores are calibrated so 5 = credible prototype,
7 = shippable with caveats, 9 = best-in-class.*
