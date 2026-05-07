export type Space = {
  name: string
  capacity: number
  workstationType?: "employee" | "private" | "flex" | null
  quantity?: number
}

const WORKPOINT_TYPES = new Set<string>([
  "Employee Workstations",
  "Large Employee Workstations",
  "Workpoint",
  "Hoteling / Flex Workstation",
  "Private Offices",
  "Shared Private Office",
  "Office for the Day",
])

const MEETING_TYPES = new Set<string>([
  "Huddle Room/Collaboration",
  "Medium Conference",
  "Large Conference",
  "Extra Large Conference",
  "Training Room",
  "Immersive Work Room",
  "Reservable Project Room",
  "Charette / Pin-up",
])

export function getSeatBuckets(spaces: Space[]) {
  let assignable = 0 // feeds headcount
  let meeting = 0
  let desks = 0 // employee workstations
  let offices = 0 // private offices
  let flex = 0 // hoteling/flex workstations
  let phoneBooths = 0

  for (const s of spaces) {
    const cap = Math.max(0, Number(s.capacity) || 0)

    // Use workstation tagging system for assignable seats
    if (s.workstationType === "employee") {
      assignable += cap
      desks += cap
    } else if (s.workstationType === "private") {
      assignable += cap
      offices += cap
    } else if (s.workstationType === "flex") {
      assignable += cap
      flex += cap
    }
    // Meeting rooms by name (keep existing logic)
    else if (MEETING_TYPES.has(s.name)) {
      meeting += cap
    }
    // Phone booths by name
    else if (s.name.toLowerCase().includes("phone booth")) {
      phoneBooths += s.quantity || 1 // Count spaces, not capacity
    }
  }

  return { assignable, meeting, desks, offices, flex, phoneBooths }
}

function sharingForDays(days: number) {
  // workers per seat (desk sharing)
  return ({ 1: 1.0, 2: 1.6, 3: 1.3, 4: 1.1, 5: 1.0 } as Record<number, number>)[days] ?? 1.3
}

function peakPresenceForDays(days: number) {
  // % of total headcount expected on the busiest day
  return ({ 1: 0.45, 2: 0.6, 3: 0.7, 4: 0.85, 5: 1.0 } as Record<number, number>)[days] ?? 0.7
}

export function computeKpis(
  spaces: Space[],
  state: { hybridEnabled?: boolean; daysInOffice?: number; shareFactor?: number; peakRate?: number },
) {
  const { assignable, meeting, desks, offices, flex, phoneBooths } = getSeatBuckets(spaces)

  const primaryInOfficeHeadcount = desks + offices

  const peakInOffice = desks + offices + flex

  // Use the primary headcount (dedicated seats) as the demand, and total assignable as supply
  // This represents how well the space accommodates the workforce
  const peakSeatCoverage = primaryInOfficeHeadcount / Math.max(1, assignable)
  const meetingPer100 = peakInOffice ? (meeting / peakInOffice) * 100 : 0

  return {
    assignableWorkpoints: assignable,
    meetingSeats: meeting,
    planningHeadcount: primaryInOfficeHeadcount, // Now represents primary in-office headcount
    peakInOffice,
    peakSeatCoverage,
    meetingSeatsPer100Peak: meetingPer100,
    desks,
    offices,
    flex,
    phoneBooths,
  }
}
