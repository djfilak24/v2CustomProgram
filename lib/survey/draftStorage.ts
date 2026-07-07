/**
 * Survey draft persistence — autosaves in-progress answers so a respondent can
 * close the tab (or hit "Save & Continue Later") and pick up where they left
 * off. Versioned so the shape can evolve; a draft that doesn't parse is simply
 * ignored (never blocks starting fresh). Cleared on finish.
 *
 * This is the localStorage half of "resume is sacred" (COUNCIL_ADVISORY §3.5);
 * a backend engagement record replaces the storage layer later without touching
 * callers.
 */
import type { LaneMap, StepId, SurveyState } from "./sections"

const KEY = "nelson:surveyDraft"
const VERSION = 1

export interface SurveyDraft {
  v: number
  savedAt: string
  stepIndex: number
  state: SurveyState
  lanes: LaneMap
  deferred: StepId[]
}

export function saveSurveyDraft(d: Omit<SurveyDraft, "v" | "savedAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, savedAt: new Date().toISOString(), ...d }))
  } catch {
    /* storage unavailable — survey still works, just no resume */
  }
}

export function loadSurveyDraft(): SurveyDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as SurveyDraft
    if (d.v !== VERSION || !d.state || !Array.isArray(d.deferred)) return null
    return d
  } catch {
    return null
  }
}

export function clearSurveyDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* no-op */
  }
}

/** Human label for the resume banner, e.g. "2 hours ago" / "yesterday". */
export function draftAge(savedAt: string): string {
  const ms = Date.now() - new Date(savedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return "recently"
  const min = Math.round(ms / 60000)
  if (min < 2) return "moments ago"
  if (min < 60) return `${min} minutes ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  const day = Math.round(hr / 24)
  return day === 1 ? "yesterday" : `${day} days ago`
}
