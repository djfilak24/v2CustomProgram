# Concept Statement

*Current as of 2026-07-13 · branch `claude/client-experience` · maintained alongside [ROADMAP.md](./ROADMAP.md) and [COUNCIL_ADVISORY.md](./COUNCIL_ADVISORY.md)*

---

## The statement

**A workplace-programming engagement in a link.**

The client receives one URL — a cinematic home page made for them — and three
low-friction doors to tell us about their organization: an interactive survey
they can finish on a phone, a workbook they can circulate to department
leaders, or a live working session with us. Every door feeds the same
canonical engagement record.

NELSON receives the other half: a console that watches the intake happen in
real time, a Studio to review what came in, close the gaps live with the
client, and shape the program with a designer's hands — and a deliverable
that is *revealed, not dumped*: a keynote-quality deck and matching PDF that
we share when the program has been through human judgment, plus a
fit-planning package that hands the validated program to the floor-plate team.

One promise in each direction. To the client: **telling us about your
workplace will be the easiest part of your project.** To the designer:
**every answer they give appears somewhere you can use it — organized so any
screen is safe to put in front of the client — and it all converges on one
number: the square footage that fits who they actually are.**

## The engine — the foundation everything amplifies

Underneath every surface is the calculation engine that started in Fast
Track and powered the original Advanced Canvas
(`lib/fast-track-calculations.ts`). It is the mastermind; the rest of the
application exists to feed it better inputs and present its output better.

What makes its math *workplace design* rather than arithmetic:

- **The hybrid policy is the hinge.** A days-per-week policy drives a
  seat-demand model: an attendance distribution (peak-usage bands — who's
  in 4–5 days, 3, 2, 1), adjusted for fully-remote headcount, multiplied
  through the **seat-sharing formula** (desk-share ratios 1.0 / 0.6 / 0.4 /
  0.2 / 0 by attendance band). Resident vs. unassigned seats fall out of
  that — not out of headcount.
- **Collaboration ratios flex with the policy.** Phone rooms run 1:15
  workstations in a 5-day office but 1:10 at ≤3 days; huddles 1:25 vs 1:15
  — a denser, shared-desk office needs *more* decompression space.
- **The full stack is explicit:** category circulation multipliers, the
  rentable load factor, per-space ratio overrides — and the engine already
  computes the hybrid vs. full-occupancy delta in USF, RSF, and annual rent.

The chain, stated once: **Fast Track is the engine with sliders. The survey
is the engine with evidence** — real departments, real cadence, real seat
assignments replacing industry defaults. **The Studio is the engine with
judgment** — a designer segmenting, comparing engine ratios against survey
findings, and auditing the implications live. **The deliverable is the
engine with a narrative.** If a surface doesn't amplify the engine, it
doesn't belong in the product.

## The target conversation *(the destination — see ROADMAP Phase 0/A)*

The engine's output becomes a client's answer only when it meets their
number. Four questions, answered together:

1. **What do you have today?** (existing conditions — captured)
2. **How are you designing your business to work?** (policy, cadence,
   culture — captured)
3. **What *should* your square footage be?** (what the ratios say, given
   how the team actually works — computed)
4. **Can we achieve *your* target?** (lease, building, budget — **not yet
   captured anywhere; the known hole**)

The product's job is the delta map between #3 and #4, with three honest
verdicts: *room to spare* · *in line* · *below industry-recognized density
without the hybrid policy to support it* — and in that last case, the
compromises that would make it work, spelled out in the engine's own
levers (days/week, seat sharing, attendance peaks, collab ratios,
circulation), so the client decides with real data what they will and
won't trade. Everyone's program depends on their business; our job is to
make the big deltas visible.

## What it does today, by actor

**The client**
- Lands on `/s/<token>` — their permanent home page for the engagement:
  brand-forward, animated, and honest about what happens next.
- Chooses a door: the survey (`/survey?e=<token>`, mobile-optimized,
  skip-anything, autosaves), the intake workbook (Excel + guide, returnable
  by drag-and-drop on the same page), or "do it live" with NELSON.
- Is never blocked: every question is skippable; skipped questions become
  gaps we close together, not failures.
- Finishes to a thank-you that acknowledges receipt and points home. When
  NELSON flips the share flag, their home page carries the deliverable:
  an 8-slide program deck (`/d/<token>`) and its print-ready PDF.

**The NELSON strategist**
- `/engagements` — creates engagements, watches live status (link opened,
  survey step N of M, workbook downloaded, returned), copies links, flips
  the deliverable share flag.
- `/review` — the validation review: verdict hero, detailed responses,
  program map, printable report.
- `/studio` — the live-session cockpit: every program line as a working
  card (qty × unit SF, dimension-bilingual: 36 SF reads 6′ × 6′), category
  color language, gaps room with resolutions, a decision log derived from
  deviations rather than typed, every intake answer one keystroke away,
  named seat assignments, the program map, and three preset views —
  Workbench, Focus, Briefing (safe to project).

**The fit-planning team**
- One button in the Studio: the Fit-Planning Package — a styled Excel with
  Program, Departments, Adjacencies, Existing & size-mix, client's words,
  session Decisions, and Gaps sheets.

## Operating principles (standing law)

0. **The engine is the foundation.** Every surface exists to amplify it —
   the survey feeds it evidence, the Studio applies judgment to it, the
   deliverable narrates it. A feature that doesn't connect to the engine's
   math is decoration.
1. **One data contract, many doors.** `SurveyResult` is the product; every
   intake mode is a door into it, every surface reads from it.
2. **Nothing captured goes dark.** "There should never be a question asked
   that doesn't appear somewhere downstream" — the founder's thesis,
   Advisory #6.
3. **Never blocked.** Skip anything; skips become gaps; gaps become the
   agenda of the live session.
4. **Human-in-the-loop reveal.** The deliverable ships when a designer says
   so, never automatically on submit.
5. **SF speaks designer.** Square footage always shows its footprint;
   ratios always show their reasoning (ratio · survey · today).
6. **The client never sees the toolbox** — but any panel we do show them is
   presentation-grade.
