/**
 * Zero-backend handoff (SURVEY_SPEC Option A): the survey writes a SurveyResult
 * to localStorage; the tool reads it on load, seeds a starting program, and
 * clears it. Designed so a real backend can replace this without touching callers.
 */
import type { SurveyResult } from "./types"

const KEY = "nelson:surveySeed"

export function saveSurveySeed(result: SurveyResult): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(result))
  } catch {
    /* storage unavailable — survey still completes, just no handoff */
  }
}

export function loadSurveySeed(): SurveyResult | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SurveyResult) : null
  } catch {
    return null
  }
}

export function clearSurveySeed(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* no-op */
  }
}
