/**
 * Survey-facing space catalog — mirrors the Fast-Track engine's full collaborative
 * and support space lists (name, SF, planning ratio) so respondents see and pick
 * from the same set the engine programs. Ids match the engine space names. Keep
 * in sync with lib/fast-track-calculations.ts.
 *
 * photo/description/uses power the "Learn more" drill-down so a respondent can
 * fully understand a space type before saying they need it.
 * TODO(imagery): photos are placeholder office shots — swap for NELSON's
 * space-type photography when supplied.
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
  /** Reference photo for the drill-down. */
  photo: string
  /** What this space is, in a sentence or two. */
  description: string
  /** How teams actually use it. */
  uses: string[]
}

export const COLLAB_CATALOG: CatalogSpace[] = [
  {
    id: "Phone Room / Focus Booth", label: "Phone / focus booth", icon: "phone", sfEach: 48, capacity: 1,
    ratio: "≈ 1 per 12 workstations", photo: "/office-2.jpg",
    description: "A one-person enclosed booth for calls and heads-down focus — the pressure valve of an open plan.",
    uses: ["Private calls and video meetings without booking a room", "An hour of deep focus away from the open floor", "Confidential HR or client conversations"],
  },
  {
    id: "Huddle Room / Flex", label: "Huddle room / flex", icon: "users", sfEach: 140, capacity: 4,
    ratio: "≈ 1 per 15 workstations", photo: "/office-3.jpg",
    description: "A small enclosed room for 2–4 people — the workhorse of hybrid collaboration.",
    uses: ["Quick team syncs and 1:1s", "Video calls with a shared screen", "Overflow focus space when booths are full"],
  },
  {
    id: "Project Room", label: "Project room", icon: "presentation", sfEach: 150, capacity: 6,
    ratio: "by team / project", photo: "/office-4.jpg",
    description: "A dedicated room a team can claim for the life of a project — walls that hold the work in progress.",
    uses: ["War-room style project work with pin-up walls", "Standing daily check-ins for one team", "Leaving work-in-progress up between sessions"],
  },
  {
    id: "Medium Conference", label: "Medium conference", icon: "presentation", sfEach: 280, capacity: 8,
    ratio: "1 per 40 seats", photo: "/office-1.jpg",
    description: "The classic 6–8 person meeting room with full AV — where most scheduled meetings actually happen.",
    uses: ["Scheduled team meetings and client calls", "Hybrid meetings with remote participants on screen", "Working sessions that need a door and a display"],
  },
  {
    id: "Large Conference", label: "Large conference", icon: "presentation", sfEach: 400, capacity: 12,
    ratio: "1 per 80 seats", photo: "/office-5.jpg",
    description: "A 10–12 person boardroom-scale space for the meetings that matter.",
    uses: ["Leadership and board meetings", "Client presentations and pitches", "Cross-team planning sessions"],
  },
  {
    id: "Training Room", label: "Training room", icon: "presentation", sfEach: 600, capacity: 20,
    ratio: "1 per 80 seats", photo: "/office-4.jpg",
    description: "A large flat-floor room with reconfigurable furniture for classes, onboarding, and all-hands overflow.",
    uses: ["Onboarding cohorts and skills training", "Workshops with breakout table groups", "Town-hall overflow with a live feed"],
  },
  {
    id: "Open Collaboration Space", label: "Open collaboration", icon: "coffee", sfEach: 150, capacity: 6,
    ratio: "1 per 25 seats", photo: "/office-1.jpg",
    description: "Unbookable soft seating and standing-height tables in the open — collaboration you don't have to schedule.",
    uses: ["Impromptu conversations that outgrow a desk", "Casual 1:1s over coffee", "A change of scenery for laptop work"],
  },
]

export const SUPPORT_CATALOG: CatalogSpace[] = [
  {
    id: "Reception", label: "Reception / front of house", icon: "building", sfEach: 250,
    ratio: "1 (front of house)", photo: "/office-1.jpg",
    description: "The arrival moment — where visitors are greeted and the brand shows up first.",
    uses: ["Visitor check-in and waiting", "First impression of the workplace brand", "Security and access control point"],
  },
  {
    id: "Work Cafe", label: "Work café", icon: "coffee", sfEach: 270,
    ratio: "7.5 SF / person", photo: "/office-5.jpg",
    description: "A café-style destination that doubles as all-day casual work space — often the heart of the floor.",
    uses: ["Lunch, coffee, and social connection", "Casual meetings and laptop work between sessions", "Hosting internal events and celebrations"],
  },
  {
    id: "Pantry / Kitchenette", label: "Pantry / kitchenette", icon: "coffee", sfEach: 100,
    ratio: "1 per 80 seats", photo: "/office-2.jpg",
    description: "The neighborhood coffee-and-snacks point serving a zone of desks.",
    uses: ["Coffee, water, and snack service", "Two-minute hallway conversations", "Small appliance and dishware storage"],
  },
  {
    id: "Multipurpose Room", label: "Multipurpose / town hall", icon: "presentation", sfEach: 1200,
    ratio: "1 per 750 seats", photo: "/office-4.jpg",
    description: "The biggest room in the house — reconfigurable for all-hands, events, and training at scale.",
    uses: ["All-hands and town halls", "Large trainings and workshops", "Client events and open houses"],
  },
  {
    id: "Interview Room", label: "Interview room", icon: "users", sfEach: 140,
    ratio: "1 per 250 seats", photo: "/office-3.jpg",
    description: "A polished, private room near reception for candidate interviews — no walk of shame through the floor.",
    uses: ["Candidate interviews without floor access", "Vendor and guest meetings", "Private conversations near front of house"],
  },
  {
    id: "Quiet Library", label: "Quiet library", icon: "box", sfEach: 500,
    ratio: "1 per 400 seats", photo: "/office-2.jpg",
    description: "A no-talking zone with library rules — the deepest focus setting the floor offers.",
    uses: ["Sustained deep-focus work", "Reading and research", "A refuge from an active open plan"],
  },
  {
    id: "Wellness Room Suite", label: "Wellness suite", icon: "heart", sfEach: 300,
    ratio: "1 per 200 seats", photo: "/office-3.jpg",
    description: "Rooms for rest and recovery — part of a workplace that takes wellbeing seriously.",
    uses: ["Rest and recovery breaks", "Meditation and prayer when no dedicated room exists", "Nursing parents when no mother's room exists"],
  },
  {
    id: "Mothers Room", label: "Mother's room", icon: "heart", sfEach: 80,
    ratio: "1 per 50 seats", photo: "/office-2.jpg",
    description: "A private, lockable room for nursing parents — required by law in most jurisdictions, and simply right.",
    uses: ["Nursing and pumping with privacy and refrigeration", "A calm, lockable personal room"],
  },
  {
    id: "Prayer Room", label: "Prayer room", icon: "heart", sfEach: 150,
    ratio: "1 per 200 seats", photo: "/office-3.jpg",
    description: "A quiet, dedicated space for prayer and reflection — inclusive workplaces plan for it rather than improvise.",
    uses: ["Daily prayer with appropriate privacy", "Meditation and quiet reflection", "Ablution-adjacent placement where possible"],
  },
  {
    id: "Printer / Copy Area", label: "Printer / copy area", icon: "printer", sfEach: 80,
    ratio: "1 per 50 seats", photo: "/office-4.jpg",
    description: "Distributed print points with supplies storage — close enough to reach, far enough to keep noise off desks.",
    uses: ["Print, copy, scan for a neighborhood of desks", "Office supplies storage", "Shredding and secure disposal"],
  },
  {
    id: "Mail Room", label: "Mail room", icon: "box", sfEach: 300,
    ratio: "1 per 200 seats", photo: "/office-5.jpg",
    description: "Central intake for mail and packages — sized for the e-commerce era, not 1995.",
    uses: ["Package receiving and staging", "Outbound shipping", "Mail sorting and distribution"],
  },
  {
    id: "File Room", label: "File room", icon: "box", sfEach: 200,
    ratio: "1 per 100 seats", photo: "/office-1.jpg",
    description: "Secure central filing for what must stay on paper — legal, HR, and compliance records.",
    uses: ["Active records that regulations keep on paper", "Locked storage for sensitive files", "Long-term document retention"],
  },
  {
    id: "Coats / Storage Closet", label: "Coats / storage closet", icon: "box", sfEach: 40,
    ratio: "1 per 50 seats", photo: "/office-2.jpg",
    description: "Coat and bag storage for unassigned-seat workplaces — small, but missed immediately when absent.",
    uses: ["Coats and umbrellas in winter", "Day storage for bags and helmets"],
  },
  {
    id: "Kitchen Storage", label: "Kitchen storage", icon: "box", sfEach: 100,
    ratio: "1 per 100 seats", photo: "/office-5.jpg",
    description: "Back-of-house storage keeping the café and pantries stocked.",
    uses: ["Bulk dry goods and beverage storage", "Catering equipment between events"],
  },
  {
    id: "Facilities Storage", label: "Facilities storage", icon: "box", sfEach: 150,
    ratio: "1 per 100 seats", photo: "/office-4.jpg",
    description: "Where facilities keeps the floor running — furniture parts, supplies, seasonal decor.",
    uses: ["Spare furniture and parts", "Cleaning and maintenance supplies", "Event and seasonal storage"],
  },
  {
    id: "Workplace Lockers", label: "Workplace lockers", icon: "box", sfEach: 5,
    ratio: "1 per 3 unassigned seats", photo: "/office-3.jpg",
    description: "Personal day-lockers that make unassigned seating livable — your stuff has a home even if your desk moves.",
    uses: ["Personal storage for flexible-seat workers", "Laptop and valuables security", "Gym and commuter gear"],
  },
  {
    id: "MDF / Server Room", label: "MDF / server room", icon: "box", sfEach: 150,
    ratio: "1 per 150 seats", photo: "/office-4.jpg",
    description: "The main network room — conditioned, secured, and non-negotiable.",
    uses: ["Core network and server equipment", "Telecom demarcation point"],
  },
  {
    id: "IDF", label: "IDF / network closet", icon: "box", sfEach: 80,
    ratio: "1 per 150 seats", photo: "/office-2.jpg",
    description: "Distributed network closets serving each zone of the floor.",
    uses: ["Zone network switches and patching", "AV and security head-end equipment"],
  },
  {
    id: "IT / Tech Storage", label: "IT / tech storage", icon: "box", sfEach: 120,
    ratio: "1 per 300 seats", photo: "/office-5.jpg",
    description: "Secure storage for laptops, peripherals, and spares — IT's working inventory.",
    uses: ["New equipment staging and imaging", "Spares, returns, and e-waste holding"],
  },
  {
    id: "IT Help Desk", label: "IT help desk", icon: "building", sfEach: 100,
    ratio: "1 per 500 seats", photo: "/office-1.jpg",
    description: "A walk-up tech bar where IT meets the floor — support you can see beats a ticket queue.",
    uses: ["Walk-up troubleshooting and equipment swaps", "New-hire device pickup"],
  },
]
