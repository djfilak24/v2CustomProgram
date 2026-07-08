/**
 * Survey types — the structured payload produced by the "Programming Pre-Work"
 * intake survey. See SURVEY_SPEC.md.
 *
 * Hard rule: every field here is a typed value captured directly from the survey
 * UI. No free text is ever interpreted to drive a calculation — narrative fields
 * exist only to ride along to the fit-planning handoff (notes).
 */

/** A question the client chose to answer "live" instead of now. */
export type DeferredQuestionId = string

export interface SurveyDepartment {
  /** Stable id assigned in the survey (used to key all downstream per-dept data). */
  id: string
  name: string
  /** Current in-office headcount for this department. */
  headcount: number
  /**
   * Future (3–5 yr) headcount. When omitted, the tool applies
   * `people.companyGrowthPct` (or leaves it flat). Some departments grow, some
   * shrink — this is the realistic, fit-planning-relevant case.
   */
  futureHeadcount?: number
  /** Named roster (leaders or full team) — survives into the canvas Dept Manager. */
  employees?: { id: string; name: string; isLeader?: boolean }[]
}

export interface SurveyResult {
  meta: {
    clientName: string
    completedBy: string
    /** ISO timestamp. */
    completedAt: string
  }

  /**
   * Your Goals — the motivators behind the project. Frames the "how much space"
   * conversation and steers gap strategy; narrative-only, never a calculation input.
   */
  goals?: {
    /** Selected drivers (growth, optimize, flexibility, density, amenity, focus). */
    motivators: string[]
    /** Where they sit on the square-footage tension. */
    posture?: "expand" | "balance" | "optimize"
  }

  /** Section 1 — Your People (+ growth, §4.5 of the spec). */
  people: {
    departments: SurveyDepartment[]
    /** Σ department headcount, or the Quick-lane single number when no depts. */
    totalHeadcount: number
    /** Quick-lane uniform growth %, applied to depts without explicit future HC. */
    companyGrowthPct?: number
  }

  /** Section 2 — How Your Teams Work. */
  work: {
    /** Company-wide in-office days/week (Quick lane). 1–5. <5 implies hybrid. */
    daysInOffice: number
    /**
     * Per-dept override of days/week (Detailed lane), keyed by department id.
     * Holds a single representative value (the band minimum) for seeding; see
     * `perDeptDaysRange` for the full recorded range.
     */
    perDeptDays?: Record<string, number>
    /**
     * Full per-dept in-office day ranges (Detailed lane), keyed by department id.
     * When a client gives a range ("1–3 days"), the end evaluation can take the
     * min or max as appropriate. Exact answers have min === max.
     */
    perDeptDaysRange?: Record<string, { min: number; max: number }>
    /** Departments the client marked "not sure" on cadence (to confirm live). */
    daysUnsureDepts?: string[]
    /** Headcount that is fully remote (never seated). */
    fullyRemote: number
    /** Per-dept count of people needing a dedicated/assigned seat (Detailed). */
    dedicatedByDept?: Record<string, number>
    /** Cross-functional adjacency hints → handoff notes. */
    adjacencyNotes?: string
    /**
     * Ranked adjacency pairs (department ids), most important first — the
     * structured form behind adjacencyNotes. Drives the Program Map's cluster
     * gravity and link weights.
     */
    adjacencyPairs?: { a: string; b: string }[]
  }

  /** Section 3 — Your Space Types. */
  spaces: {
    /** Private offices per department (the ± steppers). Keyed by department id. */
    privateOfficesByDept: Record<string, number>
    /** Where private offices sit relative to the window line. */
    officePlacement?: "exterior" | "interior" | "mixed" | "unsure"
    /** Collaboration spaces: per-type counts, optionally split by department. */
    collaboration: SurveyCollaborationItem[]
    /** Per-type room configuration (setup, monitor, custom notes). */
    collabConfig?: Record<string, { build?: string; monitor?: string; notes?: string }>
    /** Support spaces the client flagged as must-have (preset names + custom). */
    support: string[]
  }

  /** Section 4 — What's Working / What Isn't (narrative by design → notes). */
  qualitative: {
    loves?: string
    painPoints?: string
    imbalances?: string
  }

  /** Section 5 — Special Considerations → seeded special spaces + notes. */
  special: {
    equipment?: string
    security?: string
    wishlist?: string
    storage?: string
  }

  /**
   * Existing conditions — today's furniture posture and standard sizes. Sets the
   * baseline program (workstation/office SF) and feeds the existing-vs-proposed
   * comparison. Asked early so later steps can pull existing counts forward.
   */
  existing?: {
    furniture?: "reuse" | "mixed" | "new"
    /** Workstation footprint SF (e.g. 6×8 = 48). Baselines workstation sizing. */
    workstationSF?: number
    /** Private-office footprint SF (e.g. 10×12 = 120). Baselines office sizing. */
    officeSF?: number
    reuseConfTables?: boolean
    existingWorkstations?: number
    existingOffices?: number
    /** Collaboration spaces in place today (type id → count). */
    existingCollab?: Record<string, number>
    /** Support spaces in place today (type id → count). */
    existingSupport?: Record<string, number>
  }

  /** Questions explicitly deferred to the live session. */
  deferred: DeferredQuestionId[]
}

export interface SurveyCollaborationItem {
  /** Space preset name, e.g. "Huddle Room", "Project Room", "Open Collaboration Lounge". */
  type: string
  /** Per-department count for this collaboration type, keyed by department id. */
  byDept: Record<string, number>
}
