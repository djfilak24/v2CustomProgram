# Roadmap

*2026-07-13 · supersedes the phase plans inside Advisories #1–#2 (their built
items are done; their unbuilt items are re-ranked here). Ordered by the
founder's stated axis: maximize the client's onboarding flow, and give the
designer everything needed to reach the client's square-foot goals.*

Full findings behind this ordering: [COUNCIL_ADVISORY.md → Advisory #7](./COUNCIL_ADVISORY.md).

---

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
3. **The square-foot target.** The app's mission is to help clients reach
   their SF goals — and no target exists anywhere in the data model. Add it
   end-to-end: an intake question ("do you have a footprint in mind — a
   lease, a building, a budget?"), a field on the engagement, a target line
   on the Studio's allocation bar with a live gap-to-target delta, and a
   verdict-vs-target beat in the deliverable. This turns every session from
   "here's a number" into "here's how we get to *your* number."
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
   The natural next power tool once sessions persist (A1).
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

A before B because onboarding improvements multiply whatever loop they feed
— and today's loop leaks at its last mile (sessions evaporate; the deck
ignores session edits). B before C because the client-side funnel is the
founder's stated maximand and Door 2 + email are its biggest levers. C
deepens what already works; D is the debt to clear before this carries a
second concurrent client. The target (A3) is deliberately in the first
phase: it converts the whole apparatus from "computes a program" to
"navigates to the client's number," which is the concept.
