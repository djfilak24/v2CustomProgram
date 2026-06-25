/**
 * Survey shell model — the data-driven steps and the live "Workplace Profile"
 * radar scoring. This is the SHELL: representative steps that exercise every
 * interaction (card grids, radio + follow-up, the Quick/Detailed lanes, the
 * radar, progress). The real per-field wiring to SurveyResult lands in the
 * spine + decision-tree steps (IMPROVEMENT_LOOP items 11–12).
 */

export type ProfileAxis =
  | "Collaboration"
  | "Flexibility"
  | "Growth"
  | "Density"
  | "Privacy"
  | "Amenity"

export const PROFILE_AXES: ProfileAxis[] = [
  "Collaboration",
  "Flexibility",
  "Growth",
  "Density",
  "Privacy",
  "Amenity",
]

export type ProfileScores = Record<ProfileAxis, number>

/** Everyone starts here; the radar fills out as answers come in. */
export const BASELINE_SCORE = 2.5

export type Lane = "quick" | "detailed"

export type StepKind = "cards" | "radio-number"

export interface StepOption {
  id: string
  label: string
  description?: string
  /** Key into the icon map in components/survey/choice-card.tsx. */
  icon?: string
  /** Small stat lines shown on big cards (e.g. "70% in-office"). */
  stats?: string[]
  /** How selecting this nudges the live Workplace Profile radar. */
  profile?: Partial<ProfileScores>
}

export interface SurveyStep {
  id: string
  /** Short label shown in the progress bar. */
  section: string
  title: string
  subtitle: string
  kind: StepKind
  /** cards: allow multiple selections. */
  multi?: boolean
  options?: StepOption[]
  /** radio-number: label for the conditional number input. */
  followupLabel?: string
  /** What the Detailed lane unlocks here (shown when lane === "detailed"). */
  detailedHint?: string
}

/**
 * Representative shell steps. Content is illustrative — the point is the
 * interaction model and feel, per the inspiration.
 */
export const SURVEY_STEPS: SurveyStep[] = [
  {
    id: "industry",
    section: "Industry",
    title: "What industry are you in?",
    subtitle: "Select all that apply so we can tune the starting benchmarks.",
    kind: "cards",
    multi: true,
    detailedHint: "Add a sub-vertical and any regulatory notes per selection.",
    options: [
      { id: "legal", label: "Legal", description: "Law firms, legal services", icon: "scale", profile: { Privacy: 4, Amenity: 1 } },
      { id: "finance", label: "Finance", description: "Banking, financial services", icon: "building", profile: { Privacy: 3, Density: 2 } },
      { id: "tech", label: "Tech / Media", description: "Technology, media, creative", icon: "lightbulb", profile: { Collaboration: 4, Flexibility: 3, Growth: 3 } },
      { id: "consulting", label: "Consulting", description: "Professional services", icon: "briefcase", profile: { Flexibility: 3, Collaboration: 2 } },
      { id: "healthcare", label: "Healthcare", description: "Medical, healthcare services", icon: "stethoscope", profile: { Privacy: 3, Amenity: 2 } },
      { id: "consumer", label: "Consumer Goods", description: "Retail, consumer products", icon: "shopping-bag", profile: { Amenity: 3, Collaboration: 2 } },
    ],
  },
  {
    id: "cadence",
    section: "Work Patterns",
    title: "How does your team work?",
    subtitle: "A typical week in the office sets how much we plan to share seats.",
    kind: "cards",
    multi: false,
    detailedHint: "Set in-office days per department instead of company-wide.",
    options: [
      { id: "full", label: "Mostly in-office", description: "4–5 days / week", icon: "building", stats: ["Higher density", "Assigned seats"], profile: { Density: 4, Privacy: 2 } },
      { id: "hybrid", label: "Balanced hybrid", description: "2–3 days / week", icon: "calendar", stats: ["Shared seats", "Flexible"], profile: { Flexibility: 4, Collaboration: 2 } },
      { id: "remote", label: "Mostly remote", description: "0–1 days / week", icon: "home", stats: ["Touchdown-led", "Low density"], profile: { Flexibility: 5, Density: -1 } },
    ],
  },
  {
    id: "private-offices",
    section: "Space Types",
    title: "Do you need private offices?",
    subtitle: "For leadership or roles that need enclosed, assigned space.",
    kind: "radio-number",
    followupLabel: "Roughly how many private offices?",
    detailedHint: "Assign private offices per department with ± steppers.",
    options: [
      { id: "yes", label: "Yes, we need private offices", profile: { Privacy: 4 } },
      { id: "no", label: "No, open workspace is sufficient", profile: { Collaboration: 3, Density: 2 } },
    ],
  },
  {
    id: "collaboration",
    section: "Space Types",
    title: "What collaboration spaces matter most?",
    subtitle: "Pick the shared spaces your teams actually use.",
    kind: "cards",
    multi: true,
    detailedHint: "Set a count per type, per department (the decision tree).",
    options: [
      { id: "huddle", label: "Huddle rooms", description: "2–4 people, quick syncs", icon: "users", profile: { Collaboration: 3 } },
      { id: "project", label: "Project rooms", description: "Dedicated team space", icon: "presentation", profile: { Collaboration: 3, Privacy: 1 } },
      { id: "phone", label: "Phone / focus rooms", description: "Heads-down, calls", icon: "phone", profile: { Privacy: 3, Flexibility: 1 } },
      { id: "lounge", label: "Open lounges", description: "Casual, social", icon: "coffee", profile: { Amenity: 3, Collaboration: 2 } },
    ],
  },
  {
    id: "growth",
    section: "Growth",
    title: "What does the next 3–5 years look like?",
    subtitle: "Growth here becomes your planning headcount for fit planning.",
    kind: "cards",
    multi: false,
    detailedHint: "Set future headcount per department — some grow, some shrink.",
    options: [
      { id: "stable", label: "Stable", description: "±5% headcount", icon: "minus", profile: { Growth: 1 } },
      { id: "growing", label: "Growing", description: "+10–25% headcount", icon: "trending-up", profile: { Growth: 4, Density: 1 } },
      { id: "rapid", label: "Rapid / reshaping", description: "+25% or shifting team mix", icon: "sparkles", profile: { Growth: 6, Flexibility: 2 } },
    ],
  },
]

export type Answer =
  | { kind: "cards"; selected: string[] }
  | { kind: "radio-number"; choice: string | null; count: number | null }

/** Compute the live radar scores from current answers. Clamped 0–10. */
export function computeProfile(
  steps: SurveyStep[],
  answers: Record<string, Answer>,
): ProfileScores {
  const scores: ProfileScores = {
    Collaboration: BASELINE_SCORE,
    Flexibility: BASELINE_SCORE,
    Growth: BASELINE_SCORE,
    Density: BASELINE_SCORE,
    Privacy: BASELINE_SCORE,
    Amenity: BASELINE_SCORE,
  }
  for (const step of steps) {
    const a = answers[step.id]
    if (!a || !step.options) continue
    const chosenIds =
      a.kind === "cards" ? a.selected : a.choice ? [a.choice] : []
    for (const id of chosenIds) {
      const opt = step.options.find((o) => o.id === id)
      if (!opt?.profile) continue
      for (const [axis, delta] of Object.entries(opt.profile)) {
        scores[axis as ProfileAxis] += delta as number
      }
    }
  }
  for (const axis of PROFILE_AXES) {
    scores[axis] = Math.max(0, Math.min(10, Math.round(scores[axis] * 10) / 10))
  }
  return scores
}
