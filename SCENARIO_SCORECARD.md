# Scenario Scorecard — the whole flow, run and scored

*2026-07-13 · Phase 0 checkpoint. Method: every scenario below was exercised
against the real build — a fresh engagement pushed through the full spine
this session (create → landing → survey door → progress ping → submit →
console status → gated deliverable → push → deck, all green), plus the
browser-verified E2E passes that shipped each surface. Scores are honest:
they reward what works today and dock what a real client would feel.*

Axes (1–10): **Experience** (look & feel) · **Continuity** (no dead ends,
data flows to the next surface) · **Completeness** (what the record captures)
· **HITL** (the designer's command of the moment).

---

## S1 — Solo survey, Detailed lane · **8.6**
*Experience 9 · Continuity 8.5 · Completeness 9 · HITL 8*

The flagship, and it feels like it: the cinematic landing sells the process,
the survey is never-blocked with real payoff rhythm, mobile holds up through
two founder-review rounds, Finish auto-submits and the console shows
"Returned ✓" without the client doing anything extra.
**Docked for:** no cross-device resume (localStorage only — start on the
phone from the email, the laptop knows nothing), and the post-survey view
doesn't yet do the encouragement + "prep for the live session" framing the
founder specced (queued as the dashboard rework).

## S2 — Solo survey, Quick lane · **7.7**
*Experience 8 · Continuity 8.5 · Completeness 6.5 · HITL 8*

Works exactly as designed — more skips, more gaps, gaps become the session
agenda. **Docked for:** the client is never told that's *good*. The "you
answered above average / that's what live sessions are for" reassurance and
the prep debrief don't exist client-side yet; a quick-lane client currently
finishes into the same dashboard as everyone else.

## S3 — Workbook round-trip · **7.5**
*Experience 8 · Continuity 7 · Completeness 7.5 · HITL 7.5*

Styled workbook + guide are genuinely sendable; the landing's drag-and-drop
return works and logs the submission with its source. **Docked for:** total
silence — nobody is notified when a workbook lands; the client gets no
receipt beyond the thank-you screen; and a coordinator circulating tabs to
department leaders is simulating Door 2 by hand.

## S4 — "Do it live" (nothing upfront) · **5.5**
*Experience 7.5 · Continuity 5 · Completeness 3 · HITL 6*

The weakest journey. The landing presents the door beautifully — and then
nothing happens: no scheduling hook, no "what to expect," and the designer
opens a session with an empty record (the Studio expects a returned result).
The Command Center comp assumes a booked session; the product has no way to
book or run one from zero. **This door needs a real lane.**

## S5 — The designer loop: fetch → prep → session → push · **6.7**
*Experience 8 · Continuity 5.5 · Completeness 7 · HITL 6.5*

The founder's focus, and the audit agrees it's the gap. Every surface is
individually strong (console, review, Studio, deliverable), but the job is
spread across four pages with no single fetch point; the Studio session's
decisions/gaps/notes evaporate on refresh and never reach the client's deck
(H1); "push the program back" is a share flag on intake + unit-SF overrides,
not on the session's actual work; there's no prep pack, no agenda, no screen
kit. **The `/lab/command` comp is the drawn answer** — six pins mapping
exactly to the founder's six questions, plus the session prep kit and the
review → push state machine.

## S6 — Fit-planning handoff · **8.9**
*Experience 8.5 · Continuity 9 · Completeness 8.5 · HITL 9*

The strongest seam. One button, seven styled sheets, session decisions and
gap resolutions ride along with their notes. Docked half a point because it
exports the *session* state that S5 can't yet persist — the Excel can hold
more truth than the system remembers.

---

## Consolidated gaps → the pathway

Ordered by what unblocks what; (A/B refs = ROADMAP phases, CC = new from the
Command Center brief.)

| # | Gap | Fix | Where |
|---|-----|-----|-------|
| G1 | Studio session evaporates; deck ignores session edits | Persist session as a submission; deck renders it | **A1–A2** |
| G2 | No target in the data model | Survey question (light, optional, goals step) + engagement field; verdict instrument from 0.4 | **A3** |
| G3 | Designer job spread across 4 surfaces; no journey history | Command Center as a real surface (needs an event log on the engagement — today only latest progress survives) | **CC-1** |
| G4 | No prep pack | Client debrief + designer brief as generated printables from gaps | **CC-2** |
| G5 | Deck is fixed 8 slides | Beat-library composer behind review → push (share flag, grown up) | **CC-3** |
| G6 | Post-survey dashboard: bar-chart-heavy, no encouragement, no prep CTA | Dashboard rework per founder brief: effort benchmarks (illustrative until real), positive gap framing, "Prep for the live session" button, radar stays | **CC-4** |
| G7 | Recommended program visible pre-review | Gate it NELSON-side; client's pre-session view = radar + effort + prep | **CC-5** |
| G8 | "Do it live" is a dead end | Scheduling hook + empty-engagement session flow | **CC-6** |
| G9 | No notifications; no cross-device resume | Email loop; resume from engagement record | **B5–B6** |
| G10 | Program map on Zoom = a tab inside a tab | One-click full-screen present mode (ships with Direction A build) | with **A** |

**The loop from here:** build CC-1/CC-2 and G6 as the next lab→production
iterations, re-run this scorecard's S4 and S5 (the two failing journeys),
and repeat until S5 scores with S1. Then Phase A hardens what the loop
proved.

---

## Phase 0 rulings recorded this checkpoint (founder, 2026-07-13)

1. **Studio direction: A — the Delta Cockpit.** The Ledger loses; its best
   idea (the session record as a timeline) migrates into A's session feed.
2. **The deliverable is a composable beat library.** Not a fixed 8–10
   slides: a growing library of immersive output pages; the designer
   composes the presentation these conditions deserve. The storyboard (0.2)
   is the default arrangement.
3. **The target:** asked once, lightly, optionally in the survey (goals
   step); acknowledged on the client's dashboard *without a verdict*; the
   verdict and levers are the live session's reveal, run by the designer;
   the deliverable carries it afterward. Clients never link to lab pages —
   the lab is internal.
4. **The recommended program page turns NELSON-first.** Clients meet the
   program in the session and keep it via the pushed deliverable.
5. **Dashboard rework brief accepted** (CC-4 above), including invented-but-
   labeled effort benchmarks until real averages exist.
