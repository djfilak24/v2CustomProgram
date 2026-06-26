/**
 * Survey-facing space catalog — the SF sizing and planning ratios our engine
 * uses, surfaced so respondents can see what each space costs and how we size it
 * when they pick. Ids match COLLAB_TYPES / SUPPORT_TYPES (and resolve to the
 * tool's SPACE_PRESETS on import). Values mirror the Fast-Track engine defaults.
 */
export interface CatalogSpace {
  id: string
  label: string
  icon: string
  /** Typical area per room, SF. */
  sfEach: number
  /** Seats per room, where meaningful. */
  capacity?: number
  /** Human-readable planning ratio the engine applies. */
  ratio: string
}

export const COLLAB_CATALOG: CatalogSpace[] = [
  { id: "Huddle Room", label: "Huddle room", icon: "users", sfEach: 140, capacity: 4, ratio: "≈ 1 per 15 seats" },
  { id: "Project Room", label: "Project room", icon: "presentation", sfEach: 150, capacity: 6, ratio: "by team / project" },
  { id: "Phone Room", label: "Phone / focus room", icon: "phone", sfEach: 48, capacity: 1, ratio: "≈ 1 per 12 seats" },
  { id: "Open Collaboration Lounge", label: "Open lounge", icon: "coffee", sfEach: 150, capacity: 6, ratio: "≈ 1 per 25 seats" },
  { id: "Conference Room", label: "Conference room", icon: "presentation", sfEach: 280, capacity: 8, ratio: "≈ 1 per 40 seats" },
]

export const SUPPORT_CATALOG: CatalogSpace[] = [
  { id: "Copy/Print", label: "Copy / print", icon: "printer", sfEach: 80, ratio: "≈ 1 per 50 seats" },
  { id: "Storage", label: "Storage", icon: "box", sfEach: 150, ratio: "≈ 1 per 100 seats" },
  { id: "Break Room", label: "Break room / pantry", icon: "coffee", sfEach: 120, capacity: 6, ratio: "≈ 1 per 80 seats" },
  { id: "Wellness Room", label: "Wellness / mother's room", icon: "heart", sfEach: 80, capacity: 1, ratio: "≈ 1 per 200 seats" },
  { id: "Reception", label: "Reception / front of house", icon: "building", sfEach: 250, ratio: "1 (front of house)" },
  { id: "Mail Room", label: "Mail room", icon: "box", sfEach: 120, ratio: "≈ 1 per 200 seats" },
]
