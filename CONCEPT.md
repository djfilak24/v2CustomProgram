# Concept Statement — Milestone: Command Center Demo

*July 2026 · branch `milestone/command-center-demo` (working branch
`claude/client-experience`) · companions: [ROADMAP.md](./ROADMAP.md) ·
[SCENARIO_SCORECARD.md](./SCENARIO_SCORECARD.md) · [COUNCIL_ADVISORY.md](./COUNCIL_ADVISORY.md)*

---

## What it is

**A workplace-programming engagement in a link.**

A client receives one URL — a cinematic home page made for them — and three
low-friction doors to tell NELSON how their organization works: an
interactive survey they can start on a phone and finish on a laptop, a
workbook they can circulate offline, or simply "do it live with us."
Every door feeds one canonical record.

NELSON receives the other half: a **Command Center** that fetches any
engagement in one screen, a **Studio** built for the live working session,
and a **deliverable that is revealed, not dumped** — a composable 8–12-beat
presentation pushed only when a designer says it's ready, mirrored by its
own PDF, backed by a fit-planning Excel handoff.

Everything converges on one number: **the square footage that fits who they
actually are** — measured, when they have one, against *their* number.

## How it works

1. **Intake, engineered for honesty.** The survey never blocks (skips
   become the session's agenda, not failures), asks the one number worth
   asking — *do you already have a footprint in mind?* — as a spotlight
   moment, autosaves to the engagement so any device resumes, and finishes
   into encouragement ("above average"), not a dead end. The workbook
   round-trips through a styled Excel; the live door pings the team and
   turns the survey into the session's instrument.

2. **The engine does the math; the survey feeds it evidence.** The
   calculation engine (born in Fast Track) runs seat-sharing formulas,
   attendance-peak demand, and planning ratios that flex with the hybrid
   policy — more focus booths as desks share, more meeting variety when
   everyone's anchored. The survey replaces industry defaults with the
   client's real departments, cadence, and named seat assignments.

3. **The designer applies judgment — visibly.** The Command Center answers
   the six questions in one screen: what they said · what the system
   recommends · which door and how completely · the deliverable's state ·
   is it ready · push it back. The Studio runs the session: gaps flagged
   and closed with notes, planning dials (circulation, load factor) turned
   on the record, every deviation derived into a decision log, every
   survey answer one keystroke away — and the whole session persists.

4. **The reveal carries the session.** The deck composes itself to the
   engagement's story (growth slide only when headcounts move; "Your
   number" only when a target exists; "What we decided together" only when
   a session happened) and the designer curates from there. Push it, and
   the client's home page becomes their program's home. Export it, and
   fit planning gets the persisted truth.

## Why it wins

- **Telling us about your workplace becomes the easiest part of the
  project** — three doors, zero blockers, visible payoff, and a prep sheet
  instead of homework.
- **Nothing captured goes dark.** The founder's thesis, enforced by
  structure: there is no question in the intake that doesn't surface on a
  designer's screen, organized well enough to show a client.
- **The number has a story.** Not "here's what the math says" but "here's
  what the ratios say you should be, here's your number, and here's the
  honest path between them — with every compromise priced and its
  condition named."
- **Human-in-the-loop is the product, not a disclaimer.** Every reveal
  passes through a designer; every session edit is on the record; the
  deliverable is the meeting's memory, not a report generator's output.

## The operating principles (standing law)

0. The engine is the foundation — every surface amplifies it.
1. One data contract, many doors.
2. Nothing captured goes dark.
3. Never blocked — skips become the agenda.
4. Human-in-the-loop reveal, always.
5. SF speaks designer (36 SF reads 6′ × 6′; ratios show their reasoning).
6. The client never sees the toolbox — but any panel we show them is
   presentation-grade.

## The surfaces, at this milestone

| Audience | Surface | Job |
|---|---|---|
| Client | `/s/<token>` | their home page — three doors, workbook return, deliverable once pushed |
| Client | `/survey?e=` | the intake — target spotlight, cross-device resume, auto-submit |
| Client | `/prep/<token>` | the session prep sheet — gaps with who-can-help |
| Client | `/d/<token>` | the deliverable — 8–12 composable beats + print PDF, share-gated |
| NELSON | `/` | **Mission Control** — the demo home; every surface one hop, one-click demo engagement |
| NELSON | `/engagements` | the console — statuses, links, share |
| NELSON | `/command/<token>` | the Command Center — one engagement, fetched |
| NELSON | `/studio` | the Studio — the live-session cockpit |
| NELSON | `/brief/<token>` | the designer brief — printable, armed |
| NELSON | `/review` | validation dashboard + program map |
| NELSON | `/lab` | Phase-0 explorations; `/canvas` — the frozen original |
