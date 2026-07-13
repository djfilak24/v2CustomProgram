# Roadmap

*2026-07-13, rev. 2 (same day) · supersedes the phase plans inside Advisories
#1–#2. Ordered by the founder's stated axis: maximize the client's onboarding
flow, and give the designer everything needed to reach the client's
square-foot goals — with the engine recognized as the foundation everything
amplifies (see [CONCEPT.md → The engine](./CONCEPT.md)).*

Full findings behind this ordering: [COUNCIL_ADVISORY.md → Advisory #7](./COUNCIL_ADVISORY.md)
and its founder-response addendum.

---

## Phase 0 — Design discovery *(prototype-style, before the hardening)*

The founder's ruling on rev. 1: the remaining roadmap is the
"next-level hardening layer," and before hardening anything we get the
prototype-style discovery, UI, and visual design work out of the way — so
we harden the *right* surfaces. Phase 0 is exploratory by charter:
throwaway comps welcome, breadth over polish, decisions recorded.

0.1 **Revisit the Studio environment from a UI standpoint.** The cockpit
    works; now design it. Layout and density studies, the visual hierarchy
    of a live session, how the target line / delta map / scenario compare
    want to live on screen — explored as prototypes against the three view
    presets, before any of it is production code.

0.2 **Revisit the deliverable experience.** The deck is honest scaffolding
    (Advisory #5's own words). Explore the presentation arc as a designed
    object: pacing, the verdict-vs-target beat, how session decisions and
    compromises read to a client, print parity.

0.3 **Deepen the designer cockpit — concept work pulled up from Phase C.**
    Scenario A/B, the segment-and-compare workflow (engine ratios vs.
    survey findings vs. today), and the audit-the-implications view are
    prototyped here so their real shape informs what Phase A persists.

0.4 **Design the target conversation.** The four-question model (today ·
    how you're designing work · what the ratios say you should be · can we
    hit your number) and the delta map with its three verdicts — *room to
    spare / in line / below industry-recognized density without the hybrid
    policy to support it* — including how compromises are expressed in the
    engine's own levers. This is design work first; A3 builds what 0.4
    settles.

0.5 **The Command Center** *(added from the founder's lab review)* — the
    designer's fetch-one-engagement home page: what they said · what the
    system recommends · doors & completeness · deliverable review → push ·
    session prep (agenda from gaps, prep pack, screen kit). Prototyped at
    `/lab/command`.

0.6 **Client dashboard rework brief** — tame the bar charts, keep the
    radar, add effort-vs-typical encouragement (illustrative benchmarks
    until real ones exist) and a "Prep for the live session" debrief CTA.

*Exit criteria: founder-approved comps for Studio, deliverable, and the
target conversation; a decided shape for scenarios/segmentation. Then the
hardening phases below proceed with confidence.*

*Status 2026-07-13: 0.1 decided — **Direction A, the Delta Cockpit** wins
(the Ledger's session-record timeline migrates into A's feed). 0.2–0.5
comps approved in principle; scenario scorecard run — see
[SCENARIO_SCORECARD.md](./SCENARIO_SCORECARD.md) for scores, gaps CC-1…CC-6,
and the loop plan (S4 and S5 are the journeys to re-score).*

*Status 2026-07-13 (overnight, loop iteration 1): **A1, A2, A3 shipped** —
Studio sessions persist to the engagement and the deck renders them
(including the "What we decided together" slide); the target runs survey →
Studio → deck. CC-2/CC-4/CC-5 shipped client-side (prep sheet at
`/prep/<token>`, survey-complete reframing, recommended program NELSON-first
for engagement runs). CC-1's event log landed. Re-scores in the scorecard;
next: CC-1 surface + CC-6 do-it-live lane, then B5/B6.*

## Phase A — Close the loop *(the program you build is the program they get)*

The Studio can build the right program today — and then lose it. Until a
session survives a refresh and reaches the client's deck, the deepest tool
in the app is a demo of itself.

1. **Persist the Studio session.** Counts, additions, renames, notes, gap
   resolutions and the derived decision log become a `session-edit`
   submission on the engagement (the submissions list was built for exactly
   this — Advisory #6 deferred it deliberately; real use has now arrived).
   Reload restores the working state; the console shows "session in
   progress / session closed."
2. **The deliverable renders the Studio's program.** `/d/<token>` currently
   rebuilds from intake + unit-SF overrides only — quantity edits, added
   lines and closed gaps never reach the client. The deck (and its PDF, and
   the fit-planning package) must consume the persisted session so there is
   exactly one program.
3. **The target conversation, built.** (Implements what Phase 0.4 designs.)
   No target exists anywhere in the data model today — nowhere to ask "do
   you have a lease, a building, a budget in mind?" Add it end-to-end: the
   intake question, a field on the engagement, a target line on the
   Studio's allocation bar with a live gap-to-target delta, and the
   verdict-vs-target beat in the deliverable. Not pass/fail — the delta
   map: *room to spare* · *in line* · *below industry-recognized density
   without the hybrid policy to support it*, with compromises expressed in
   the engine's own levers (days/week, seat sharing, attendance peaks,
   collab ratios, circulation) so the client decides what they will and
   won't trade. This turns every session from "here's a number" into
   "here's how we get to *your* number."
4. **Planning dials.** Circulation multipliers and the rentable load factor
   are hard-coded (45/45/45/35% · ×1.22). Make them editable in the Studio
   (logged as decisions, exported in the package) — they are the honest
   levers a designer pulls to close a gap to target.

## Phase B — Maximize the onboarding flow *(the client side)*

5. **Cross-device resume.** Survey autosave is localStorage; someone who
   starts on a phone cannot finish on a laptop. Graduate autosave to the
   engagement record (debounced state save keyed by token; resume banner
   anywhere). Promised in Advisory #4, not yet delivered.
6. **The email loop.** Today the link travels by copy-paste and nothing
   notifies anyone. Minimum viable: send-the-link email, "you're partway
   through" nudge, submission notification to NELSON, and the share-flag
   email that delivers the deliverable. This is the retention half of
   onboarding.
7. **Distributed department mini-links (Door 2).** The 70-person client's
   reality: our contact distributes 2–3-minute scoped slices to ~10
   department leaders; a completion board shows who's answered; answers
   merge into the same record (the per-dept data model already supports
   it). The single biggest onboarding multiplier for mid-size clients —
   today the workbook carries this case awkwardly.
8. **Founder content.** Replace `TODO(imagery)` photography and
   `TODO(founder)` stats on the landing and space gallery with real NELSON
   assets — the only remaining placeholders a client can see.

## Phase C — Deepen the designer's cockpit

9. **Scenario A/B.** Save a session as a named scenario ("Conservative" /
   "Growth"), duplicate, compare totals side-by-side, present either.
   Builds the shape prototyped in Phase 0.3, once sessions persist (A1).
10. **What-changed diff.** The submissions log already appends every
    return; show the delta between submissions (headcount moved, offices
    +2) so re-intake is a conversation, not a re-read.
11. **Deliverable v2 leftovers** (Advisory #5): presenter-notes strip,
    cover one-liner + client photography, category-safe page breaks,
    original→edited deltas in the program table, radar annotations.
12. **Per-person seat picks into the contract.** The survey UI captures
    exactly who gets an office/desk; only per-dept counts survive into
    `SurveyResult`. Carry the picks through so the Studio and program map
    show the client's actual assignments, not a derived convention.

## Phase D — Platform hygiene *(before the second real client)*

13. **Real auth.** Replace the shared NELSON passcode with real sign-in;
    add token revocation / regenerate-link on engagements.
14. **Retire the legacy canvas.** `/` is frozen by design; once the Studio
    covers daily use (post A-B), retirement is a deletion. One adjust
    surface should remain: Studio for sessions, review for validation.
15. **Analytics on the funnel.** Progress pings exist; add a simple
    timeline per engagement (opened → started → stalled at step N →
    returned) to learn where clients drop.

---

### Sequencing logic, in one paragraph

Phase 0 first, by founder ruling: everything after it is the hardening
layer, and you don't harden surfaces you're about to redesign — the Studio
UI, the deliverable arc, and the target conversation get their
prototype-style discovery pass before production code commits to a shape.
Then A before B because onboarding improvements multiply whatever loop
they feed — and today's loop leaks at its last mile (sessions evaporate;
the deck ignores session edits). B before C's remainder because the
client-side funnel is the stated maximand and Door 2 + email are its
biggest levers (C's conceptual heart — the deeper cockpit — was already
pulled up into Phase 0). D is the debt to clear before this carries a
second concurrent client. The target work is deliberately early (0.4
design, A3 build): it converts the whole apparatus from "computes a
program" to "navigates to the client's number," which is the concept —
and it is pure amplification of the engine that started all of this.
