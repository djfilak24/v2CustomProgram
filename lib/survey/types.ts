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
}

export interface SurveyResult {
  meta: {
    clientName: string
    completedBy: string
    /** ISO timestamp. */
    completedAt: string
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
    /** Per-dept override of days/week (Detailed lane), keyed by department id. */
    perDeptDays?: Record<string, number>
    /** Headcount that is fully remote (never seated). */
    fullyRemote: number
    /** Per-dept count of people needing a dedicated/assigned seat (Detailed). */
    dedicatedByDept?: Record<string, number>
    /** Cross-functional adjacency hints → handoff notes. */
    adjacencyNotes?: string
  }

  /** Section 3 — Your Space Types. */
  spaces: {
    /** Private offices per department (the ± steppers). Keyed by department id. */
    privateOfficesByDept: Record<string, number>
    /** Collaboration spaces: per-type counts, optionally split by department. */
    collaboration: SurveyCollaborationItem[]
    /** Support spaces the client flagged as must-have (preset names). */
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

  /** Questions explicitly deferred to the live session. */
  deferred: DeferredQuestionId[]
}

export interface SurveyCollaborationItem {
  /** Space preset name, e.g. "Huddle Room", "Project Room", "Open Collaboration Lounge". */
  type: string
  /** Per-department count for this collaboration type, keyed by department id. */
  byDept: Record<string, number>
}
