# Council Advisory — Intake Architecture & Product Direction

> Follow-up to [COUNCIL_REVIEW.md](./COUNCIL_REVIEW.md). The founder accepted the
> review and put a sharper question to the council:
>
> *"How do we build this to be nimble enough — but organized in the right order —
> to extract this information based on how our clients prefer to work, and
> present it back in a way that's easy to digest?"*
>
> Specifically: send-a-link intuitiveness, question fatigue, never-blocked
> flexibility, distributed intake (department leaders each fill their slice),
> a document round-trip (send a form out, import it back), existing conditions
> in the canvas, view refinement, and flipping the visual direction to light.

---

## 1. The core ruling: one data contract, many doors

The survey is not the product. **`SurveyResult` is the product** — the canonical,
versioned record of everything a client can tell us. Every intake mode is just a
different door into the same contract, and every downstream surface (review,
canvas, exports) reads from it.

```
                    ┌──────────────────────────────┐
  Solo link ───────►│                              │───► Validation Review
  Dept mini-links ─►│   SurveyResult (versioned)   │───► Advanced Canvas
  Live meeting ────►│   one engagement, one record │───► PDF / Excel handoff
  Doc round-trip ──►│                              │───► (future: year-2 rerun)
                    └──────────────────────────────┘
```

This is why the council is optimistic: the hard part — *knowing what to ask and
where each answer lands* — is largely done ("in combination we've identified the
complete picture"). What remains is doors and destinations, not discovery.

**Immediate implication:** stamp a version on the seed (`{ v: 2, ... }`) and keep
per-field provenance in mind (`answeredBy`, `source: link|import|live`) — the
distributed mode needs it, and it's nearly free to add now.

## 2. The three intake doors

### Door 1 — Solo link (exists; harden it)  · Effort: S
The current survey, with the fatigue fixes below. This remains the demo star and
the small-client path.

### Door 2 — Distributed mini-links (the 70-person reality)  · Effort: M
The scenario the founder described is the *normal* one: our contact distributes
to ~10 department leaders; each answers only their slice; the contact aggregates.

**Design:**
- The coordinator (our contact) starts an **engagement**: company basics, goals,
  existing conditions, and the department spine (names + who leads them).
- Each department gets a **mini-link**: a 2–3 minute slice scoped to that
  department only — headcount confirm, roster/leaders, cadence, dedicated desks,
  offices, collab needs, pain points. No company-wide questions, no other
  departments visible.
- Answers merge into the same `SurveyResult` keyed by department id (the spine
  already keys every per-dept map — the data model needs almost no change).
- The coordinator sees a **completion board** (Engineering ✅ · Sales ⏳ · Ops ✉️
  not opened), can nudge, override, or fill in for a silent department, then
  submits the aggregate to the review.

**Honest requirement:** this is the feature that forces the lightweight backend
(engagement id → JSON + per-dept token links). That backend was already P1 for
shareable links; distributed intake is the reason to build it *now* rather than
later. One table, no auth for respondents (tokenized links), coordinator gets a
magic link.

### Door 3 — Document round-trip (offline reality)  · Effort: M export / L import
Some clients will always want "just send me the form." The council endorses the
instinct and advises sequencing it in three honest steps:

1. **Workbook export (build first)** — generate the "completed-state document":
   every question, pre-filled with whatever we already know, blanks and prompts
   for the rest. Two formats: branded **PDF** (read/annotate/circulate) and
   **Excel workbook** (one tab per section, structured cells with validation —
   department grid, roster list, existing counts, collab checklist). Excel is
   the one that round-trips.
2. **Quick-entry grid (build second)** — a dense, keyboard-first "operator mode"
   screen where the coordinator (or we) can key a filled-out paper/PDF/Word
   answer set into the engagement in ~10 minutes. This delivers 90% of the
   import value at 10% of the cost, immediately.
3. **Automated import (build last)** — parse the returned Excel workbook into
   `SurveyResult` (deterministic, because we generated the layout). The council
   explicitly advises **against** parsing Word/PDF returns — fragile, endless
   edge cases; the Excel workbook + quick-entry grid covers those returns.

## 3. The anti-fatigue contract (applies to every door)

These become product rules, not suggestions:

1. **Never blocked.** Every question skippable; "Not sure — we'll talk live" on
   everything (it exists on most steps; audit for full coverage). Continue is
   never disabled. Skipped ≠ failed: skipped questions become *gaps*, and gaps
   are already a first-class, presenter-friendly concept in the review.
2. **Visible payoff, immediately.** The radar does this; go further — a
   persistent "your program so far: ~12,400 SF · 54 seats" ticker that moves as
   they answer. Every answered question should visibly move *something*.
3. **Answer once.** The department spine already carries forward; distributed
   mode extends the same principle across people.
4. **Honest time.** Per-lane estimates on the hero ("Quick ≈ 4 min · Detailed ≈
   12 min"), "about N min left" in the header, and a roster **paste/CSV import**
   so naming 70 people isn't 70 text boxes.
5. **Resume is sacred.** Autosave `SurveyState` on every patch + resume banner
   (the dead "Save & Continue Later" button becomes real). With Door 2, resume
   graduates from localStorage to the engagement record.

## 4. The traceability matrix — "answers must visibly do something"

The founder flagged this as the most important line in the review. The council
agrees and makes it operational: **no question ships unless this table says
where its answer surfaces.** Current audit:

| Survey answer | Review | Canvas | Engine/Program | Verdict |
|---|---|---|---|---|
| Departments + headcounts | ✅ tables/tiles | ✅ dept cards | ✅ totals | ✅ |
| Future headcount (per-dept) | ✅ narrative dial | ✅ growth mode | ✅ planning HC | ✅ |
| Named roster | ✅ responses tab | ✅ dept manager chips | — | ✅ |
| Leaders (crowns) | ✅ crowned, sorted | ✅ crowned chips | — | ✅ |
| Dedicated desks per dept | ✅ | ✅ dept cards + space allocations (**bug fixed this commit**) | ✅ targets | ✅ |
| Private offices per dept | ✅ | ✅ | ✅ | ✅ |
| Work cadence (per-dept ranges) | ⚠️ company # only — ranges not shown | ❌ | ⚠️ seeds min of band | **Gap** |
| Goals / motivators / posture | ✅ chips + strategy banner | ❌ | ❌ narrative only | **Gap** (P2: posture nudges ratios, annotated "because you said optimize") |
| Existing counts & sizes | ✅ comparison + gaps | ❌ stored, never shown | baseline SF only | **Gap** (P0: before/after panel in canvas) |
| Office placement (int/ext) | ✅ responses | ❌ | ❌ | **Gap** (notes + future stacking hints) |
| Collab room config | ✅ responses | ✅ space notes | — | ✅ |
| Custom support spaces | ✅ | ✅ seeded as spaces | — | ✅ |
| Adjacency pairs (ranked) | ✅ text | ❌ notes only | ❌ | **Gap** (canvas adjacency panel) |
| Qualitative + deferred | ✅ responses | ❌ handoffNotes stored, not shown | — | **Gap** (notes panel in canvas) |

Five gaps, all of the same species: **captured, then invisible in the canvas.**
Closing "existing + notes in canvas" (one before/after + notes panel) closes
three of them at once.

## 5. Visual direction: flip to light — ruled

NELSON's brand is predominantly light; the canvas is already light. **The survey
and review migrate to a light NELSON expression; dark becomes a presentation
option, not the identity.**

- Build the shared token layer first: Poppins scale, cyan `#00badc` accent,
  slate neutrals, one card/radius/shadow language, semantic colors (amber =
  gap/attention, emerald = surplus/on-track, violet = offices).
- The survey keeps everything that makes it great — chunky choice cards, radar,
  progress rhythm, crowns — re-skinned light. The canvas adopts the same tokens
  (mostly accent + type + card polish, since it's already light slate).
- Sequence: tokens → canvas accent/type alignment (cheap, immediate coherence) →
  survey/review light re-skin (the bigger visual lift, one focused pass).

## 6. Views: three audiences, not three modes

Refactor the mental model from "Simple / Workbench / Briefing" to **who is
looking at the screen**:

| View | Audience | Content posture |
|---|---|---|
| **Present** (Briefing, elevated) | The client, on the wall | Read-only story: goals → before/after → program → gaps. Brand-forward. |
| **Facilitate** (calm default canvas) | Us, mid-meeting | Cards + totals + dept walk; existing/proposed side panel; one or two controls, everything else put away. |
| **Build** (Workbench) | Us, at the desk | Full toolbox — every toggle, table mode, targets sidebar, recalibrate. |

The canvas opens in **Facilitate** when arriving from the review (a meeting is
happening), **Build** when opened directly. The client never accidentally sees
the toolbox.

## 7. Build order (the council's sequencing)

**Phase 1 — Trust the loop (1 sprint-ish, no backend)**
1. ✅ Dept-card counts honor dedicated-desk answers (fixed in this commit)
2. Autosave + resume (make the dead button real)
3. Skip-anything audit + gap propagation (skipped → review gaps)
4. Existing conditions + handoff notes panel **in the canvas**
5. Fix 3 red engine tests, drop `ignoreBuildErrors`, add CI

**Phase 2 — The artifact (what clients hold)**
6. PDF export of the review (branded leave-behind)
7. Excel export: program + the **workbook** (this is also Door 3's export half)
8. Shared design tokens + canvas alignment (coherence before the re-skin)

**Phase 3 — The doors (backend arrives)**
9. Engagement backend (one table, tokenized links)
10. Distributed mini-links + coordinator completion board
11. Quick-entry grid (operator import)
12. Survey/review light re-skin on the token layer

**Phase 4 — Compounding**
13. Automated Excel import · goals→engine (annotated) · adjacency in canvas ·
    analytics · scenario A/B · monolith decomposition (ongoing alongside)

**The one-sentence strategy:** make the single-player loop airtight and visibly
lossless first (Phases 1–2) — because the distributed and offline doors multiply
whatever loop they feed. Ten mini-links into a leaky funnel is ten times the
leak; into an airtight one, it's the moat.

---
*Also fixed in this commit: full-roster/per-dept dedicated-desk counts now land
on the department cards in the canvas (was: formula `headcount − offices`
ignored the survey's answer). Covered by 2 new tests; 31 survey tests green.*

---
---

# Advisory #2 — Program Map, Access Model, Fast-Track Reveal
*(2026-07-08, following the founder's Phase-1 review)*

> Three founder directions put to the council: (1) an org-chart / whiteboard
> "bubble" view of the program; (2) the clarified access model — clients never
> touch the Advanced Canvas, so backend + per-department micro-links jump the
> queue; (3) Fast Track shows too much at once — inputs first, the full
> breakdown held back for an intentional reveal.

## 1. The Program Map (whiteboard bubble view) — unanimous, and overdue

The council's strongest endorsement of the session. This isn't a novelty view —
**it's the bubble diagram, a standard artifact of architectural programming**
that the tool has been computing but never drawing.

**Marta (strategist):** "This is what I draw on the whiteboard in every meeting
anyway. Department clusters, spaces sized by square footage, adjacency lines
between clusters, names on the offices. The tool has every input; give me the
drawing." It also finally makes adjacency answers *visibly do something* — the
oldest open row on the traceability matrix.

**Design contract (Felix):**
- A pan/zoom whiteboard surface, force-directed: each **department is a
  cluster** (tinted hull in the dept color), each **space is a bubble** sized by
  `√SF` (workstation blocks, office circles, dept-owned collab).
- **Named where applicable:** offices/dedicated desks show roster names
  (leaders crowned); unnamed seats render as count chips ("×22").
- **Adjacency = gravity + lines:** ranked adjacency pairs pull clusters
  together and draw weighted links (reusing the survey's priority color ramp).
- **Shared spaces** (conference, support, wellness) sit in a neutral center
  band between the clusters they serve.
- Read-first: v1 is a view (hover for detail, click to highlight a
  department); dragging/rearranging is v2.

**Placement (council ruling):** a fourth tab on the review — **"Program Map"**
— because the review is the client-facing meeting surface and already holds
the full SurveyResult + engine output. The canvas can mount the same component
later for the NELSON-side deep dive.

**Priya (effort):** M. All data exists (`mapSurveyToCanvas` spaces +
departmentAllocations, roster, `adjacencyPairs`). A pure layout function
(d3-force or a small custom simulation) + one SVG component; layout is unit-
testable. No backend dependency — buildable now.

**Victor:** "This is the screenshot that sells the engagement. It's also the
page a broker forwards."

## 2. Access model — the council stands corrected, and re-sequences

The founder's clarification changes the map: **the Advanced Canvas is
NELSON-only.** Clients see the survey and (in the meeting, driven by us) the
review. Fast Track and the survey are the only solo-exploration paths.

Consequences the council flags:

1. **"Open in Advanced Canvas" must stop being a client affordance.** Today it
   is the review's primary CTA. Move it behind a presenter affordance (subtle
   "NELSON" control in the header, not the hero button of the page). The
   client-facing CTA becomes the artifact ("Get your program summary") or
   simply the end of the guided meeting.
2. **The backend jumps from Phase 3 to Phase 2 — now the top of the queue.**
   With no canvas handoff for clients, the localStorage relay is only a
   same-device demo trick. Real engagements need: `engagements` (id, token,
   SurveyResult JSON, updated_at) + `dept_links` (token → engagement, dept id,
   status). Respondents get tokenized links (no login); the coordinator gets a
   completion board; NELSON gets the master result. A shared-secret gate on
   the canvas/review-admin side is acceptable v1 auth; real auth later.
3. **The artifact matters *more*, not less.** If clients never touch the deep
   tool, the PDF/Excel leave-behind is the only thing they hold. Exports stay
   Phase 2, right behind the backend.
4. **Solo Fast Track earns first-class status** as one of only two
   self-service doors — which makes direction #3 (below) strategic, not
   cosmetic.

## 3. Fast Track — stage the reveal (council agrees, with a design contract)

The critique is correct: today's Fast Track answers questions the user hasn't
asked yet. Anchoring a client with 30 derived numbers while they're still
choosing inputs is forcing information; it also spends the "wow" moment early
and cheaply.

**The arc every surface should share** (survey already does this):
**capture → reveal → drill.**

- **Stage 1 — Capture.** Inputs are the hero: 4–5 large, friendly controls
  (headcount, remote, days in office, % offices), with at most a whisper of
  live feedback — a single ticker strip (~total SF · seats) that moves as they
  dial. Enough to feel alive; not enough to anchor.
- **Stage 2 — Reveal.** An intentional "Generate my program" → the dashboard
  moment: staged, animated, the same visual grammar as the review dashboard
  (KPI tiles, category bars, profile). This is the payoff beat.
- **Stage 3 — Drill.** "See the full breakdown" opens the detailed tables for
  those who ask. Held back by default, never forced.

**Priya's sequencing note:** refactor Fast Track *with* the shared token layer
and reuse the review-dashboard components (StatTile, category bars) — one
styling pass, one component family, and Fast Track stops being a third visual
dialect. **Dana:** "Stage 1 is also exactly what the survey hero promises —
the two solo doors should feel like siblings."

## Re-sequenced roadmap (supersedes Advisory #1 phases 2–4)

**Phase 2 — The platform + the map**
1. Engagement backend (engagements + dept_links, tokenized) — *promoted per access model*
2. Distributed per-department micro-links + coordinator completion board
3. **Program Map** (review tab; force-layout bubbles, roster names, adjacencies)
4. Gate "Open in Advanced Canvas" behind a presenter affordance

**Phase 3 — The artifact + the reveal**
5. PDF export of the review (branded leave-behind — the only thing clients keep)
6. Excel export: program + intake workbook
7. Shared design tokens → Fast Track staged-reveal refactor (capture/reveal/drill)
8. Survey/review light re-skin on the token layer

**Phase 4 — Compounding** *(unchanged)*
9. Quick-entry grid · automated Excel import · goals→engine · analytics ·
   scenario A/B · monolith decomposition (ongoing)

**Dissent worth recording:** Victor argued the Program Map should ship *before*
the backend ("it demos; databases don't"). The council kept the backend first
because the access model makes distributed intake the blocker for real client
work — but agreed the Map is small enough to build in parallel if capacity
allows, and it requires zero backend.

---

# Advisory #3 — Dashboard Audit (implemented same-day)

The founder pushed the council to audit the review Dashboard. Findings, all
addressed in the same commit:

1. **No verdict.** The page said "what you told us" but never "what it means" —
   the money number (proposed SF + delta) was tile 6 of 6. → Now a verdict hero:
   the SF huge, the delta pill beside it, the goal-vs-math strategy line as the
   why, inputs as a quiet context rail.
2. **Flat hierarchy, duplicated numbers.** Six identical tiles, two repeating
   the subtitle. → Tiles folded into the hero context rail (People 400→440,
   Rhythm, Today).
3. **Strategy banner buried** below the fold. → Merged into the hero.
4. **Copy bug + mixed message** in "For the live session" ("the gaps above"
   pointed at nothing; alarming "16 data gaps" beside "Nothing was deferred").
   → Moved to the right rail, positive copy ("Everything answered — 16 program
   details to confirm together →").
5. **Bars labeled only one value.** → Both values labeled per row + per-type
   delta chips; the trade (e.g., −SF individual, +SF collaboration) is now the
   visible story.
6. **No seat story, no departments.** → "Where your N people sit" stacked bar
   (offices / dedicated / flex / remote, as declared) and a "Your teams" grid
   (today → future with growth arrows, dept colors matching the Program Map,
   link to the map).
7. **Radar outranked the money chart.** → Radar moved to the right rail.

---

# Advisory #4 — The Client-Pilot Audit (milestone: claude/client-experience)

> The founder: "Right now, the production app gives anyone with the link full
> access to everything… I'm starting to think about how I would set this up in
> a way where I could test it with a client." The committee audited today's
> build against that goal.

## Verdict: demoable A− · client-pilotable NOT YET — one missing organ

**What a client with the production link sees today:** everything. The survey,
but also three fictional demo companies one click away, a presenter scenario
pill on every step, the review with a quiet wrench into the NELSON-only canvas,
every export, and the canvas itself with its admin panel. Nothing distinguishes
a client from a NELSON presenter from a stranger.

**The deepest gap isn't cosmetic — it's that the solo link doesn't deliver.**
All data lives in the visitor's own localStorage. A client who finishes the
survey on their laptop has sent NELSON *nothing*; their review renders from
their own browser and we never see it. Today the only working return paths are
(a) the workbook round-trip and (b) them screen-sharing. The pipe from client
answers back to NELSON does not exist yet — that is the backend, and it is now
the single blocking item.

## The minimal client-pilot kit (in order)

1. **Engagement backend** — one table (engagement id, token, SurveyResult JSON,
   status, updated_at). The survey's finish button writes to it. This converts
   the survey from a demo into an instrument.
2. **Client links become scoped:** `/s/<token>` → the survey only, client name
   pre-seeded, no demo pill, no demo buttons, no canvas-reachable paths.
   Autosave graduates from localStorage to the engagement record (resume from
   any device).
3. **NELSON mode, explicitly:** presenter chrome (demo pill, scenario chips,
   wrench, exports-as-sender) renders only in NELSON mode — v1 can be a simple
   gate (passcode/flag), real auth later.
4. **A review-share decision** (question for the founder below): whether
   clients ever see the review alone or only in the meeting.

Everything else the pilot needs — survey quality, review, map, exports, the
workbook loop — already exists and is the strong part of the audit.

## Questions the committee sends back to the founder

1. **Database** (the blocking pick): Vercel Postgres (stays in the Vercel
   account, zero new vendors) vs. Supabase (free tier, more headroom, its own
   dashboard). Either works; the council mildly favors Vercel Postgres for
   fewest moving parts.
2. **What does the client's link show after they finish the survey?**
   (a) a thank-you full stop — the review is revealed in our meeting;
   (b) their dashboard + program map as a teaser, numbers saved for the meeting;
   (c) the full review. Marta favors (b): payoff without pre-empting the session.
3. **NELSON gate for the pilot:** shared passcode now (ships this week) vs.
   proper auth first (slower). Council: passcode now, auth later.
4. **Which door does the first real client get:** solo link, distributed
   department mini-links, or the workbook? Determines polish order.

---

# Advisory #5 — Deliverable v2, and the Studio (Canvas v2)

*Convened at the founder's request after the first deliverable shipped: "the PDF
was decent, the program summary was decent for a first pass — push it further.
And show me what Canvas v2 looks like from the NELSON point of view."*

## 1. Deliverable v2 — the committee's push list

The Broker: "The verdict slide already closes deals. What's missing is rhythm —
every slide currently lands at the same volume." The Designer: "First pass is
honest scaffolding. v2 is typography and pacing, not more features."

Ranked findings:

1. **Pacing/rhythm (Designer, Broker — unanimous):** alternate dark/light slides
   deliberately (dark = moments: cover, verdict; light = information). Add a
   subtle slide transition (fade/slide, 200–300ms) — hard cuts read as a web
   page, not a presentation. *(quick win — shipped with this advisory)*
2. **Cover carries the brand (Designer):** client name is right; add the client's
   own photography when NELSON has it, and a program one-liner ("60 → 67 people ·
   ~15,000 USF · hybrid") so the cover alone summarizes the engagement.
3. **Presenter notes (Strategist):** each slide gets a NELSON-only talking-points
   strip (hidden from clients and print) — the deck should coach the presenter.
4. **Print polish (Operator):** page footers (client · date · page N), and the
   program table must never break a category across pages.
5. **The program table earns a "what changed" story (Broker):** when overrides
   exist, show original → edited deltas subtly, so the session's decisions are
   visible in the take-home.
6. **Radar slide annotation (Strategist):** call out the two strongest axes in
   words next to the chart — clients remember sentences, not hexagons.

## 2. The Studio — Canvas v2 from the NELSON point of view

Ruling: **the Studio is an engagement workbench, not a canvas.** The old canvas
is a document you assemble; the Studio is a place you *inspect and adjust* a
program that already exists (because intake built it). Desktop-only by design —
below lg it shows a branded "open on desktop" screen and nothing else.

Blueprint (v1, prototyped alongside this advisory at /studio):

- **Left rail — the engagement:** picker (any returned engagement, or the local
  seed), live totals (net → circulation → gross → rentable), category rollups,
  and the handoff actions.
- **Center — the Spaces browser:** the one canvas pattern worth keeping, reborn.
  Every program line as a card: photo, qty × unit SF (both editable), planning
  ratio, and department allocation chips (who holds the offices/desks; collab
  by-dept counts where captured). Grouped by category, filterable.
- **Handoff — the Fit-Planning Package:** one button; an Excel with Program /
  Departments / Adjacencies / Existing & size-mix / Notes sheets — everything
  the fit-planning team needs to test the program on real floor plates.

What the Studio does NOT do (v1): scenario A/B, floorplate testing, ratio
editing (stays in the review), anything client-facing.

## 3. Retirement path for the old canvas (unchanged, reaffirmed)

Freeze `/` as-is. The Studio absorbs inspect + handoff now; the review keeps
adjust-in-session; when both cover daily use, retiring the canvas is a deletion.
The founder decides the date; nothing forces it.

---

# Advisory #6 — Studio v2: the founder's brief, ruled and sequenced

*The founder reviewed the Studio prototype: right skeleton, wrong emphasis in
places. His thesis becomes the committee's standing law:*

> **"There should never be a question asked that doesn't appear somewhere
> downstream. The designer should have access to everything — organized in a
> way that can be displayed in front of a client."**

## Rulings on the brief

1. **SF speaks designer (unanimous):** a square-footage number always shows its
   footprint — 36 SF reads "6′ × 6′"; non-preset values read "≈ 8′ × 7′". The
   Operator: "Fit planning thinks in dimensions; make the tool bilingual."
2. **Photos off the cards; the eye brings them back.** Cards are working
   surfaces — dense, scannable. An eye icon opens the same drill-down modal the
   survey uses (photo, uses, ratio) when someone needs to explain a space type.
3. **Duplicate is a first-class move.** Real programs run two office sizes, two
   conference standards. Duplicating a card creates an addition (renamable,
   deletable) that participates fully in totals — and lands in the decision log.
4. **Three numbers on every line: Ratio · Survey · Today.** What the engine's
   ratios suggest, what the client asked for in intake, what exists now. The
   Strategist: "That triangle IS the validation conversation."
5. **Deviation dots:** cyan dot = unit size changed from the ratio baseline,
   violet dot = quantity changed. Glanceable "what did we touch."
6. **The decision log is derived, not typed.** Every deviation from baseline,
   every duplicate/delete, every gap closed IS the log — notes attach to
   entries. No separate bookkeeping to forget during a live session.
7. **Gaps get a room of their own.** Missing baselines, unknown sizes, deferred
   questions — flagged in one panel, resolvable with a note, resolution flows
   into the decision log and the Fit-Planning Package.
8. **The survey drawer:** People (every named person, leaders crowned),
   Answers (goals, cadence, in-their-words, special), Existing (counts, sizes,
   size-mix). Everything from intake, one keystroke away, presentable.
9. **Sidebar hierarchy fixed:** ONE hero number (gross usable, with delta vs
   today) — everything else visibly subordinate. The confusion was two numbers
   fighting for primacy; now there's a headline and supporting cast.
10. **Preset views:** **Workbench** (cards + drawer — the daily driver),
    **Focus** (dense editable table for fast number work), **Briefing**
    (client-facing: edit chrome hidden, larger type — safe to project).

## Persistence note (deferred, deliberate)

Counts, additions, notes and gap resolutions are session-local in this
iteration; unit-size overrides persist to the engagement as before. Once the
session-edit shape settles in real use, the whole working state becomes a
"session-edit" submission on the engagement (the submissions list built for
exactly this). Ship the workflow first, then bottle it.

---
---

# Advisory #7 — The Full-Concept Audit
*(2026-07-13, convened at the founder's request: "We've been building a lot.
Let's do an audit. Where are we at? Where are the holes? What is the roadmap?
What have we accomplished?" — with the lens fixed on the end-user's onboarding
flow paired with the designer's power to reach the client's square-foot goals.)*

Companion documents produced with this advisory: **[CONCEPT.md](./CONCEPT.md)**
(the current concept statement) and **[ROADMAP.md](./ROADMAP.md)** (the
sequenced plan; supersedes the phase lists in Advisories #1–#2).

## The seats

| Seat | Lens |
|---|---|
| **The Client** *(new seat — the founder's stated focus)* | A 60-person company's office manager holding our link. Is every step obvious, fast, and worth it? |
| **The Strategist** (Marta) | Does the tool run a great validation session and land the program? |
| **The Designer** (Felix) | Is every surface presentation-grade? Does the visual language cohere? |
| **The Engineer** (Priya) | Data contract integrity, persistence, what breaks with two concurrent clients. |
| **The Broker** (Victor) | What closes the deal; what a client forwards to their board. |
| **The Operator** | Handoff quality to fit planning; assumptions honest and adjustable. |

## 1. Where we are — the accomplished record

Seventeen commits on `claude/client-experience` built a complete, verified
engagement pipeline. What exists and works (70 tests green, clean build,
every surface E2E-verified with the browser during development):

**The client side**
- `/s/<token>` — the cinematic engagement home page: hero carousel, stat
  band, aggregation scene, animated three-step story, and the **three
  doors** (survey · workbook+guide · live session), plus the workbook
  return drop-zone and a thank-you that acknowledges receipt.
- `/survey` — the interactive intake: department spine, named rosters with
  crowned leaders, seat hierarchy with bulk assign/release, custom sizes +
  today's size-mix inventory, drill-down galleries for all 26 space types,
  skip-anything with deferred-question capture, demo scenarios, autosave —
  **fully mobile-optimized** through two founder-review rounds.
- Workbook round-trip: styled Excel out, drag-and-drop import back in,
  guide page for circulation.

**The spine**
- Engagement backend: Postgres with file fallback; tokens, status, live
  progress pings (landing/survey-step/workbook), submissions log with
  source tagging, share flag, unit-SF overrides. NELSON passcode gate.
- `/engagements` — the console: create, watch live status, copy links,
  flip the deliverable share.

**The NELSON side**
- `/review` — validation review with verdict hero, program map, print report.
- `/d/<token>` — the share-gated 8-slide deliverable deck; the print pass
  IS the PDF; NELSON-editable key decisions.
- `/studio` — Studio v2 through two briefs: dimension-bilingual cards,
  ratio · survey · today on every line, duplicate/add/delete with a
  **derived** decision log, the gaps room with noted resolutions, the
  survey drawer (people / answers / existing — everything from intake),
  category color language with a validated palette, space-allocation
  chart, named seat assignments, the program map, display toggles,
  Workbench/Focus/Briefing views.
- The Fit-Planning Package: 7-sheet styled Excel including session
  Decisions and Gaps.

The founder's thesis (Advisory #6) is now structurally true on the NELSON
side: nothing the survey asks is invisible in the Studio.

## 2. The council's verdict on the full concept

**Unanimous:** the concept is right and the shape is now proven end-to-end.
One link in, one record, many doors, human-judged reveal, designer-grade
cockpit, clean handoff. No seat argued for a change in direction.

**Also unanimous:** the build is at its "last mile" moment. Three of the six
seats independently converged on the same top finding — and it is not a
feature idea, it is a loop that doesn't close.

## 3. The holes, ranked

**H1 · The Studio's work evaporates — and never reaches the client.**
*(Engineer, Strategist, Broker — the audit's headline.)* Counts, added
lines, notes, and gap resolutions are session-local by deliberate deferral
(Advisory #6.11); only unit-SF overrides persist. Worse: `/d/<token>`
rebuilds from intake + overrides only, so a program shaped live in the
Studio is **not** the program the client's deck shows. A refresh mid-session
loses the meeting. The strongest tool in the app currently produces the
least durable output. → Roadmap A1–A2.

**H2 · There is no square-foot target anywhere in the product.**
*(The Client, the Operator.)* The founder's mission statement — "help them
reach their square-foot goals" — names a number the data model never asks
for. No lease size, no shortlisted building, no budget footprint; the app
computes *a* number but never navigates to *their* number. The gap-to-target
delta is the natural spine of the live session and the deliverable's verdict.
→ Roadmap A3, with the planning dials (A4) as its honest levers.

**H3 · Onboarding breaks across devices.** *(The Client.)* Survey autosave
is localStorage; start on the phone from the email link, and the laptop
knows nothing. Advisory #4 promised resume-from-any-device; the engagement
record is sitting there ready to hold it. → Roadmap B5.

**H4 · Nothing notifies anyone.** *(The Client, Strategist.)* Links travel
by copy-paste; a finished survey pings no one; a stalled client is only
discovered by checking the console; the deliverable share flag sends no
email. The funnel has no voice. → Roadmap B6.

**H5 · The mid-size client's real path (Door 2) is still unbuilt.**
*(Strategist, Broker.)* Distributed department mini-links + completion board
— specified since Advisory #1, repeatedly deferred for good reasons. The
workbook covers this case, but a forwarded Excel is a colder onboarding than
ten 3-minute scoped links. → Roadmap B7.

**H6 · Baked-in planning math.** *(Operator.)* Circulation 45/45/45/35% and
load ×1.22 are constants. Markets, buildings, and negotiation postures vary;
the designer needs these dials — logged as decisions, not silently edited.
→ Roadmap A4.

**H7 · Smaller, real, listed for the record:** per-person seat picks don't
survive into `SurveyResult` (Studio derives them by convention — honest but
approximate); shared-passcode auth and unrevokable tokens; `TODO` imagery
and stats on client-visible pages; deliverable v2 leftovers (presenter
notes, page-break polish, override deltas); no scenario A/B; no
what-changed diff between submissions; legacy canvas retirement pending.
→ Roadmap B8, C9–C12, D13–D15.

## 4. What the council explicitly declines to add

- **No new intake questions.** The survey's length is at its ceiling; every
  proposed addition must displace something or become a Door-2 slice. (The
  target question, H2, earns its slot by being the engagement's premise.)
- **No client-facing Studio.** The access model (Advisory #2) stands.
- **No floor-plate/test-fit features.** That is the fit-planning team's
  craft; the product's job is to hand them a validated program, and it does.

## 5. The one-sentence strategy, restated for this stage

Advisory #1 said: *make the single-player loop airtight before multiplying
it.* The 2026-07 version: **the loop is built — now make it hold water.**
Persist the session, aim it at a target, let the deck tell the client what
the session decided, and only then multiply the doors (email, mini-links)
— because every new client we onboard flows into whatever loop exists on
that day.
