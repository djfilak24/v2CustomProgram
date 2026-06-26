/**
 * Survey-facing space catalog — mirrors the Fast-Track engine's full collaborative
 * and support space lists (name, SF, planning ratio) so respondents see and pick
 * from the same set the engine programs. Ids match the engine space names. Keep
 * in sync with lib/fast-track-calculations.ts.
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
  { id: "Phone Room / Focus Booth", label: "Phone / focus booth", icon: "phone", sfEach: 48, capacity: 1, ratio: "≈ 1 per 12 workstations" },
  { id: "Huddle Room / Flex", label: "Huddle room / flex", icon: "users", sfEach: 140, capacity: 4, ratio: "≈ 1 per 15 workstations" },
  { id: "Project Room", label: "Project room", icon: "presentation", sfEach: 150, capacity: 6, ratio: "by team / project" },
  { id: "Medium Conference", label: "Medium conference", icon: "presentation", sfEach: 280, capacity: 8, ratio: "1 per 40 seats" },
  { id: "Large Conference", label: "Large conference", icon: "presentation", sfEach: 400, capacity: 12, ratio: "1 per 80 seats" },
  { id: "Training Room", label: "Training room", icon: "presentation", sfEach: 600, capacity: 20, ratio: "1 per 80 seats" },
  { id: "Open Collaboration Space", label: "Open collaboration", icon: "coffee", sfEach: 150, capacity: 6, ratio: "1 per 25 seats" },
]

export const SUPPORT_CATALOG: CatalogSpace[] = [
  { id: "Reception", label: "Reception / front of house", icon: "building", sfEach: 250, ratio: "1 (front of house)" },
  { id: "Work Cafe", label: "Work café", icon: "coffee", sfEach: 270, ratio: "7.5 SF / person" },
  { id: "Pantry / Kitchenette", label: "Pantry / kitchenette", icon: "coffee", sfEach: 100, ratio: "1 per 80 seats" },
  { id: "Multipurpose Room", label: "Multipurpose / town hall", icon: "presentation", sfEach: 1200, ratio: "1 per 750 seats" },
  { id: "Interview Room", label: "Interview room", icon: "users", sfEach: 140, ratio: "1 per 250 seats" },
  { id: "Quiet Library", label: "Quiet library", icon: "box", sfEach: 500, ratio: "1 per 400 seats" },
  { id: "Wellness Room Suite", label: "Wellness suite", icon: "heart", sfEach: 300, ratio: "1 per 200 seats" },
  { id: "Mothers Room", label: "Mother's room", icon: "heart", sfEach: 80, ratio: "1 per 50 seats" },
  { id: "Printer / Copy Area", label: "Printer / copy area", icon: "printer", sfEach: 80, ratio: "1 per 50 seats" },
  { id: "Mail Room", label: "Mail room", icon: "box", sfEach: 300, ratio: "1 per 200 seats" },
  { id: "File Room", label: "File room", icon: "box", sfEach: 200, ratio: "1 per 100 seats" },
  { id: "Coats / Storage Closet", label: "Coats / storage closet", icon: "box", sfEach: 40, ratio: "1 per 50 seats" },
  { id: "Kitchen Storage", label: "Kitchen storage", icon: "box", sfEach: 100, ratio: "1 per 100 seats" },
  { id: "Facilities Storage", label: "Facilities storage", icon: "box", sfEach: 150, ratio: "1 per 100 seats" },
  { id: "Workplace Lockers", label: "Workplace lockers", icon: "box", sfEach: 5, ratio: "1 per 3 unassigned seats" },
  { id: "MDF / Server Room", label: "MDF / server room", icon: "box", sfEach: 150, ratio: "1 per 150 seats" },
  { id: "IDF", label: "IDF / network closet", icon: "box", sfEach: 80, ratio: "1 per 150 seats" },
  { id: "IT / Tech Storage", label: "IT / tech storage", icon: "box", sfEach: 120, ratio: "1 per 300 seats" },
  { id: "IT Help Desk", label: "IT help desk", icon: "building", sfEach: 100, ratio: "1 per 500 seats" },
]
