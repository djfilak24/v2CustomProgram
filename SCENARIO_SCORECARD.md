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

---

# Iteration 1 — re-score (2026-07-13, overnight run)

The founder's signal: proceed through the loop and onward into the roadmap.
Built and verified this iteration (all E2E-tested, 73 tests green):
**the target end-to-end** (survey question → Studio target line → deck "Your
number" slide), **persisted Studio sessions + the deck rendering them** (H1
closed — including the new "What we decided together" slide carrying the
session's notes), **the prep experience** (survey-complete reframing with
above-average encouragement + the printable /prep/<token> client debrief),
and the **engagement event log** (CC-1's data layer).

| Scenario | Was | Now | What moved |
|---|---|---|---|
| S1 Solo survey, detailed | 8.6 | **8.9** | Completion screen honors effort, frames gaps as the agenda, hands off to prep. Still docked: cross-device resume (B5). |
| S2 Quick lane | 7.7 | **8.4** | The quick lane's many gaps now read as "that's what the session is for" + prep sheet. |
| S3 Workbook round-trip | 7.5 | **7.6** | Prep sheet works for workbook returns too. Still silent (B6). |
| S4 "Do it live" | 5.5 | **5.5** | Untouched — next iteration's target (CC-6 + CC-1). |
| S5 Designer loop | 6.7 | **7.6** | Sessions persist and reach the client's deck; target instrument live in Studio + deck; journey events recorded. Still docked: no unified command surface (CC-1 UI), no designer brief (CC-2b), map Zoom mode (G10). |
| S6 Fit-planning handoff | 8.9 | **9.2** | The Excel now exports persisted truth, not session-only memory. |

**Next iteration:** CC-1 (the Command Center as a real surface, consuming the
event log) + CC-6 (a real do-it-live lane) re-scores S4 and S5; then B5/B6
(resume + email) re-scores S1–S3. The loop continues until S5 scores with S1.

---

# Iteration 2 — re-score (2026-07-13)

Founder's note actioned (the target question is now an isolated dark
spotlight card on the goals step), then the two failing journeys attacked:
**the Command Center is a real surface** (`/command/<token>`, linked from
every console row) and **"do it live" is a lane, not a dead end**.

| Scenario | Was | Now | What moved |
|---|---|---|---|
| S4 "Do it live" | 5.5 | **7.2** | The door acts (pings + acknowledges), the console flags it ("Wants it live — schedule the session"), and the Command Center's empty state runs the play: survey-as-live-instrument + from-zero screen kit. Still docked: no scheduling itself, no notification (B6). |
| S5 Designer loop | 7.6 | **8.3** | One fetch surface: journey timeline from the event log, session-aware program with edits-applied chip, target acknowledged, gap-drafted agenda, prep pack, screen kit, review → push gate. Still docked: designer-brief printable, program-map present mode (G10), beat composer (CC-3). |

**Next:** B5/B6 (cross-device resume + the email loop) re-scores S1–S4's
remaining docks; CC-3 (beat composer) and G10 (map present mode) finish S5.

---

# Iterations 3–4 + the UI pass — final re-audit (2026-07-13)

Shipped since iteration 2 (all built, tested — 75 green — and E2E-verified):

- **B5 · Cross-device resume**: survey drafts sync to the engagement;
  verified with a second, cold browser context picking up the resume banner.
- **A4 · Planning dials**: circulation (individual/collab/support) + load
  factor, editable in the Studio's settings, derived into the decision log,
  persisted on the session, honored by the deck and exports.
- **G10 · Program map present mode**: one-click fullscreen for the Zoom share.
- **CC-3 · Beat composer**: the deck's NELSON toolbar curates slides per
  engagement; composition persists.
- **CC-2b · /brief/<token>**: the designer brief — printable, armed
  (gaps with their questions, headlines, quotes, the target cue, session notes).
- **B6 · Notifications**: intake returns + live-session requests email NELSON
  via Resend when `RESEND_API_KEY` + `NELSON_NOTIFY_EMAIL` are set (logged
  otherwise); "Email the link" template in the Command Center.
- **C12 · Seat picks in the contract**: the client's literal office/desk
  assignments survive into `SurveyResult`; the Studio prefers them over the
  hierarchy convention.
- **UI pass (founder's dashboard brief)**: "Where the space goes" replaces
  the tall bar pairs — allocation bar + one color-keyed row per category
  with today-ticks and delta chips; fixed the invisible white-on-white
  existing bars and seat segments; radar keeps its seat.

## Final scores

| Scenario | Phase-0 | Now |
|---|---|---|
| S1 Solo survey, detailed | 8.6 | **9.3** (resume + prep + elevated target) |
| S2 Quick lane | 7.7 | **8.7** |
| S3 Workbook round-trip | 7.5 | **8.3** (notify + prep; Door 2 still the ceiling) |
| S4 "Do it live" | 5.5 | **7.6** (notify closes the loop; scheduling still manual) |
| S5 Designer loop | 6.7 | **8.8** (command center + brief + dials + composer + persistence) |
| S6 Fit-planning handoff | 8.9 | **9.3** (exports persisted truth incl. dials) |

S5 now scores with S1 — the loop's stated exit condition.

## What remains, by design (the honest tail)

1. **B7 · Door 2 — distributed department mini-links.** The one large
   feature deliberately not rushed overnight: scoped per-department survey
   slices, merge rules, and the coordinator board deserve a founder-reviewed
   design round (a Phase-0-style comp first). The workbook carries the
   mid-size case meanwhile.
2. **D13 · Real auth + token revocation.** Needs a provider decision
   (founder's pick); the passcode stands for the pilot.
3. **C10 · Submission diff.** Requires keeping prior result snapshots —
   small schema change, next session.
4. **Founder content**: photography + verified benchmarks (all invented
   numbers are labeled in-product).
5. **Email polish**: Resend keys + a designed template set (the hook and
   the moments are wired).

---

# UI polish loop — the deliverable doubled down (2026-07-13)

Founder's brief: more or fewer slides? · graphically premium and effective
in their roles? · situational iterations for unique circumstances? · press
the Studio with everything onboarded since inception.

**The slide-count answer: it depends — and now it literally does.** The
deck runs 8–12 beats depending on the engagement's story: "Where you're
headed" appears only when headcounts actually move; "Your number" only
when a target was captured; "What we decided" only when a session did;
the composer trims the rest per engagement. Fixed decks are for template
shops.

**New beats:** the growth story (map-colored team bands, today→future) and
"How you work" — the engine-evidence dark slide that says WHY the policy
drives the program (the booth ratios tightening under sharing). **Premium
pass:** cover one-liner, compare rebuilt in the one visual system
(category band + today-ticks + delta chips), the program table speaking
category colors, dept chips carrying map colors.

**Studio pressed:** visible "session saved ✓" trust signal, dials-tuned
note on the rail, and the menu now reaches every new surface (Command
Center, designer brief, deliverable).

| Scenario | Was | Now |
|---|---|---|
| S5 Designer loop | 8.8 | **9.1** — the Studio narrates its own persistence; every surface one hop away |
| S6 Handoff/deliverable | 9.3 | **9.4** — the take-home now argues the engine, not just the answer |
| S1 / S2 | 9.3 / 8.7 | unchanged — their remaining docks are Door 2 + email keys |

Loop status: **S1 9.3 · S5 9.1 · S6 9.4 in the nines.** S2 8.7 / S3 8.3 /
S4 7.6 are capped by the by-design tail (Door 2, scheduling, email keys) —
those move when the founder makes their calls, not from more polish.
