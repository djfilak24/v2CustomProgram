# Fast-Track Program Brokers vs. Workplace Programming Tool
## Comparative Analysis & Integration Guide

---

## 1. INTAKE FLOW COMPARISON

### Current v0 Implementation (Workplace Tool)
- **Status**: No formal onboarding modal yet
- **Entry**: Direct to calculator with default values (250 HC, 10% offices, 4 days/week)
- **Future**: Visibility controls added but no decision tree

### Fast-Track Program (GitHub Repo)
- **Status**: Implemented intake modal
- **Entry**: Collects tenant context before launching calculator
- **Flow**: Broker sharing → Session creation → Store to localStorage
- **Inputs Captured**:
  - Tenant Name (required)
  - Current Office SF (optional)
  - Submarket (optional)
  - Broker Rep (optional)

**Gap**: Fast-Track gathers business context but lacks programmatic needs assessment.

---

## 2. RATIO SYSTEMS COMPARISON

### Fast-Track Program (Simplified - Ratio-Based)
All ratios are **seat/demand-driven**. No workspace types. Pure output generation.

#### Space Program Ratios (by Seat Demand `d10`)

**Individual (Personal Workspaces)**
- Resident Office: 140 SF each (derived from `%offices`)
- Unassigned Office: 140 SF each
- Resident Workstation: 42 SF each
- Unassigned Workstation: 42 SF each
- Touch Down: 30 SF each (overflow for unassigned)

**Collaborative (Meeting/Shared)**
- Phone Room: `1 : (12-15 seats)` depending on days/week
  - 5 days = 1:15
  - 4 days = 1:12
  - 1-3 days = 1:10
- Huddle Room: `1 : (15-25 seats)` depending on days/week
- Medium Conference: `1 : 40 seats` → 280 SF
- Large Conference: `1 : 80 seats` → 400 SF
- Training Room: `1 : 80 seats` → 600 SF
- Open Collaboration: `1 : 25 seats` → 150 SF

**Support**
- Reception: 250-750 SF (tiered by seat demand)
- Interview Room: `1 : 250 seats` → 140 SF
- Multipurpose: `1 : 750 seats` → 1,200 SF
- Work Cafe: `7.5 SF/person` (driven by headcount, not seats)
- Pantry/Kitchenette: `1 : 80 seats` → 100 SF
- Quiet Library: `1 : 400 seats` → 500 SF
- Wellness: `1 : 200 seats` → 300 SF
- Mothers Room: `1 : 50 seats` → 80 SF
- Lockers: `1 : 3 unassigned seats` (only if hybrid <5 days)
- Printer/Copy: `1 : 50 seats` → 80 SF
- Mail: `1 : 200 seats` → 300 SF
- File: `1 : 100 seats` → 200 SF
- Facilities Storage: `1 : 100 seats` → 150 SF
- MDF/Server: `1 : 150 seats` (min 1)
- IDF: `1 : 150 seats` (min 1)
- IT Storage: `1 : 300 seats`
- IT Help Desk: `1 : 500 seats`

**Circulation Multipliers (RSF → USF)**
- Individual: +45% (1.45x)
- Collaborative: +45% (1.45x)
- Support: +35% (1.35x)

---

### v0 Workplace Tool (Advanced - Workspace Type-Based)

The v0 tool uses **workspace types + seed data + recalibration** — NOT pure ratios.

#### Space Definitions by Zone & Workspace Type

**FOCUS OPEN** (Open-plan seated)
| Space | Qty | Capacity | SF Each | Workspace Type |
|-------|-----|----------|---------|----------------|
| Employee Workstations | 120 | 1 | 60 | **Employee** |
| Large Employee WS | 20 | 1 | 80 | **Employee** |
| Hoteling/Flex WS | 15 | 1 | 60 | **Flex** |
| Workpoint | 10 | 1 | 40 | (None) |

**FOCUS ENCLOSED** (Private/semi-private)
| Space | Qty | Capacity | SF Each | Workspace Type |
|-------|-----|----------|---------|----------------|
| Private Offices | 30 | 1 | 120 | **Private** |
| Shared Private Office | 5 | 2 | 150 | (None) |
| Office for the Day | 8 | 1 | 100 | (None) |

**COLLABORATIVE**
| Space | Qty | Capacity | SF Each |
|-------|-----|----------|---------|
| Phone Booth | 10 | 1 | 40 |
| Huddle Room | 10 | 4 | 150 |
| Medium Conference | 4 | 8 | 250 |
| Large Conference | 2 | 12 | 400 |
| Training Room | 2 | 16 | 400 |
| Immersive Work Room | 3 | 6 | 200 |

**Admin-Configurable Ratios** (for recalibration)
- `rsfPerPerson`: 233 RSF (benchmark)
- `employeeWorkstation`: 1:120 (1 seat per 120 HC)
- `hoteling`: 1:15 (1 flex per 15 HC)
- `workpoint`: 1:10
- `privateOffice`: 1:50
- `phoneBooth`: 1:25
- `defaultRatio`: 1:50 (fallback)

**Recalibration Logic**:
1. **Workspace-typed cards** → Use direct company targets
   - Employee WS → Total HC - Private Offices
   - Private → Target Office Count
   - Flex → Target Hybrid Workers
2. **Non-typed cards** → Use ratio lookups by name
   - "Phone Booth" → matches 1:25 ratio
   - Apply formula: `ceil(headcount / ratio)`

**Circulation Factors** (RSF → USF)
- Focus Open: +40% (1.40x)
- Focus Enclosed: +40% (1.40x)
- Collaborative: +30% (1.30x)
- Support: +25% (1.25x)
- Wellness: +20% (1.20x)

**Key Difference**: v0 lets users **manually configure** each card's quantity and workspace type, then **recalibrate** via ratios. Fast-Track **auto-calculates** everything from a single seat demand formula.

---

## 3. SEAT DEMAND CALCULATION MODELS

### Fast-Track (Survey-Driven Demand)

Uses **SURVEY_DEFAULTS** based on `daysInOffice`:

```
SURVEY_DEFAULTS[days] = [percent_4-5days, percent_3days, percent_2days, percent_1day]

1 day:  [0.05,  0.15,  0.25, 0.55]
2 days: [0.25,  0.30,  0.40, 0.05]
3 days: [0.35,  0.40,  0.20, 0.05]
4 days: [0.65,  0.20,  0.10, 0.05]
5 days: [1.00,  0.00,  0.00, 0.00]
```

Each cohort gets a **desk share ratio** (1.0, 0.6, 0.4, 0.2 respectively):
- 4-5 day people = 1.0 desk each (resident seat)
- 3 day people = 0.6 desks (shared)
- 2 day people = 0.4 desks (hoteling)
- 1 day people = 0.2 desks (touchdown)
- Fully remote = 0 desks

**Example**: 250 HC, 4 days/week, 0% remote, 10% offices
- Using [0.65, 0.20, 0.10, 0.05]:
  - 163 at 1.0 = 163 resident seats → ~16 offices + ~147 workstations
  - 50 at 0.6 = 30 shared seats
  - 25 at 0.4 = 10 hoteling
  - 12 at 0.2 = 2.4 touchdown
  - **Total demand ≈ 205 seats**

### v0 Tool (Simpler Allocation Model)

**No survey blocks.** Direct allocation by type:

1. Calculate total headcount to seat
   - Remove `fullyRemote`
   - Remove any configured exclusions
2. Allocate by `percentOffices`
   - Offices → `%offices * HC`
   - Workstations → `(100 - %offices) * HC`
3. **No desk sharing** — 1 person = 1 seat minimum
   - Exception: Growth mode tracks future capacity

---

## 4. PROPOSED MERGED ONBOARDING DECISION TREE

Based on requirements + both systems:

```
┌──────────────────────────────────────────────┐
│   WORKPLACE PROGRAMMING CALCULATOR           │
│     How would you like to start?             │
└──────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐   ┌────────┐   ┌─────────────┐
    │ KNOWN  │   │ GUIDED │   │   JUST      │
    │ NEEDS  │   │INQUIRY │   │  EXPLORE    │
    └────────┘   └────────┘   └─────────────┘
        │            │              │
    ┌───┴──┐     ┌────────────┐  ┌──────────┐
    ▼      ▼     ▼            ▼  ▼          ▼
┌─────┐┌─────┐┌──────────┐┌──────────┐┌────┐┌────┐
│EXACT││GUIDED││ QUICK    ││SURVEY &  ││PLAY││ N/A│
│FROM ││FROM  ││ CONFIG   ││GENERATE  ││WITH││    │
│ZERO ││INPUTS││ (Hybrid) ││(Fast-Trk)││UI  ││    │
└─────┘└─────┘└──────────┘└──────────┘└────┘└────┘
  │       │         │           │         │     │
  └─ INTAKE MODAL (Broker Context) ─────────┘
  │
  ▼
┌─────────────────────────────┐
│   SURVEY QUESTIONS          │
│   (If GUIDED or SURVEY mode)│
├─────────────────────────────┤
│ • Industry vertical         │
│ • Collab intensity          │
│ • Growth forecast           │
│ • Remote policy             │
│ • Benchmark awareness       │
└─────────────────────────────┘
  │
  ▼
┌─────────────────────────────┐
│   CALCULATOR OPENS          │
│   Pre-populated per mode    │
├─────────────────────────────┤
│ • Inputs pre-filled         │
│ • Discrepancy badges show   │
│   areas differing from      │
│   industry benchmarks       │
│ • Full edit access          │
└─────────────────────────────┘
```

**Modal Inputs (Broker Context - Always Collected)**:
- Company Name
- Current Office SF (optional)
- Submarket (optional)
- Broker Rep (optional)

**Survey Questions (GUIDED/SURVEY Paths)**:
1. **Industry** (affects bench marks + defaults)
   - Tech/Finance (high collab, flex)
   - Corporate (mixed)
   - Creative (high collab)
   - Other
2. **Collaboration Intensity**
   - Low (lots of heads-down work, low meeting rooms)
   - Medium (balanced)
   - High (lots of shared spaces, huddles)
3. **Hybrid Policy**
   - 5 days/week (everyone in office)
   - 4 days/week
   - 3 days/week
   - Variable/flexible
4. **Growth**
   - Stable (-5% to +5%)
   - Growing (+6% to +25%)
   - Rapid (+25%+)
5. **Remote Employees**
   - None
   - Up to 20%
   - 20-40%
   - 40%+

---

## 5. INTEGRATION ROADMAP

### Phase 1: Merge Intake Modal
- [ ] Use Fast-Track modal as base (better UI, glass panel aesthetic)
- [ ] Add optional survey questions
- [ ] Store tenant context to session/DB
- [ ] Pass to calculator for personalization

### Phase 2: Implement Decision Tree
- [ ] Add "How would you like to start?" screen before modal
- [ ] Route users to appropriate path (Exact/Guided/Survey/Explore)
- [ ] Pre-populate calculator based on path

### Phase 3: Merge Ratio Systems
- [ ] Expose Fast-Track survey defaults as admin-configurable presets
- [ ] Add survey-driven seat demand blocks alongside current allocation
- [ ] Let users choose: "Allocate directly" vs "Survey-based demand"

### Phase 4: Benchmark Comparisons
- [ ] Tag each space type with industry benchmarks (by survey answers)
- [ ] Show discrepancy badges (e.g., "Your phone booth ratio is 15% below industry for Tech/Finance")
- [ ] Alert user to unusual ratios vs peers

### Phase 5: Scenario + Growth
- [ ] Scenarios (already in v0) ✓
- [ ] Growth planning toggle (already in v0) ✓
- [ ] Combine with survey presets for growth projections

---

## 6. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                     INTAKE MODAL                        │
│  ┌────────────────┐       ┌──────────────────────────┐  │
│  │ Broker Context │       │ Decision Tree Path       │  │
│  ├────────────────┤       ├──────────────────────────┤  │
│  │ • Tenant Name  │◄─────►│ • Exact / Guided /       │  │
│  │ • Current SF   │       │   Survey / Explore       │  │
│  │ • Submarket    │       │ • Survey Q's (optional)  │  │
│  │ • Broker Rep   │       │ • Industry presets       │  │
│  └────────────────┘       └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              SESSION INITIALIZATION                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ SummaryInputs + Survey Responses + Broker Data   │  │
│  │ (Persisted to DB + localStorage)                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                 ┌─────────┼─────────┐
                 ▼         ▼         ▼
        ┌──────────────┐┌────────┐┌────────┐
        │ DEFAULT CALC ││SURVEY- ││MANUAL  │
        │(Explore mode)││DERIVED ││(Exact) │
        └──────────────┘└────────┘└────────┘
                 │         │         │
                 └────────┬┴────────┘
                          ▼
        ┌─────────────────────────────┐
        │ Space Program Calculation   │
        ├─────────────────────────────┤
        │ • Seat demand (survey/input)│
        │ • Allocations (HC-based)    │
        │ • Ratios (collaborative)    │
        │ • Circulation factors       │
        │ • RSF/USF conversion        │
        └─────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────┐
        │ Dashboard + Metrics         │
        ├─────────────────────────────┤
        │ • Seat breakdown            │
        │ • Cost analysis             │
        │ • Discrepancy badges        │
        │ • Scenarios (optional)      │
        │ • Growth projections        │
        └─────────────────────────────┘
```

---

## 7. KEY DECISIONS FOR MERGED TOOL

**Q1: Should we keep v0's workspace-type model or switch to Fast-Track's survey model?**
- **Answer**: Keep both as options. Fast-Track survey good for "I don't know my needs." v0 types good for "I know exactly what I want."

**Q2: How to handle ratio management?**
- **Answer**: Create admin panel with preset collections (Tech/Finance/Creative/Default). Let admin override by industry.

**Q3: How to present discrepancies?**
- **Answer**: Only show if survey was answered. Badge system: "Within range" / "10% below" / "25% above" with link to benchmark source.

**Q4: Storage: DB or localStorage?**
- **Answer**: Use both. DB for persistence + analytics. localStorage for session resumption.

**Q5: Scale to multiple tenants?**
- **Answer**: v0 already supports multi-department. Fast-Track already has broker authentication. Merge auth systems.

---

## 8. RECOMMENDATIONS FOR v0 INTEGRATION

1. **Adopt Fast-Track's Intake Modal UI** — It's cleaner, has broker context, uses glass panels
2. **Add Survey Block** — Optional, pre-fills primary inputs
3. **Keep v0's Card-Based UI** — Superior for manual adjustments
4. **Expose Both Calculation Methods**:
   - Fast-Track survey-driven seat demand (new)
   - v0 direct allocation (existing, default)
5. **Admin Panel Presets** — Store collections by industry + role (broker/corporate)
6. **Analytics** — Track survey answers → actual programmed ratios → spot anomalies
7. **Gradual Rollout**: Phase in survey → See live data → Refine benchmarks → Push alerts to outliers

---

## Next Steps

1. **Clone Fast-Track intake modal** → Adapt to v0 style
2. **Build decision tree screen** → Route logic
3. **Implement survey questions** → Store & use for defaults
4. **Create benchmark overlay** → Show comparisons live
5. **Test hybrid flows** → User research on paths (Exact vs Guided vs Explore)

