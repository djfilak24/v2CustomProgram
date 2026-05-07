import type { ProgramInput, ProgramOutput } from "./types"
import { computeTotalSeats } from "./presence"
import { CIRCULATION_MULTIPLIERS } from "./spaceCatalog"
import { roundUp, roundNearest, minQty, zeroIfBelow, threshold01, suppressIfDays } from "./qty"

export function computeProgram(input: ProgramInput): ProgramOutput {
  const { headcount, fullyRemote, percentOffices, daysInOffice, rentableAddOn, grossRentPerRSF } = input

  // Calculate total seats
  const totalSeats = computeTotalSeats(headcount, fullyRemote, daysInOffice)

  // Seat split
  const offices = Math.ceil(totalSeats * (percentOffices / 100))
  const workstations = totalSeats - offices

  // Calculate collaborative spaces
  const phoneRooms = roundUp(workstations / 10)
  const huddleRooms = roundUp(workstations / 15)
  const mediumConference = roundUp(totalSeats / 40)
  const largeConference = roundNearest(totalSeats / 100)
  const trainingRoom = threshold01(totalSeats, 60)
  const openCollaboration = roundUp(totalSeats / 25)

  // Calculate touchdown (remainder to lock concurrency)
  const touchdown = Math.max(headcount - fullyRemote - totalSeats - phoneRooms - huddleRooms - openCollaboration, 0)

  // Calculate workpoints total
  const workpointsTotal = offices + workstations + touchdown + phoneRooms + huddleRooms + openCollaboration

  // Calculate support spaces
  const reception = 1
  const receptionUnitSF = totalSeats < 250 ? 450 : 900
  const interviewRoom = zeroIfBelow(roundNearest(totalSeats / 250), 250)
  const multipurposeRoom = zeroIfBelow(roundNearest(totalSeats / 750), 750)
  const workCafeUnitSF = headcount * 6
  const workCafe = 1
  const kitchenStorage = roundNearest(totalSeats / 100)
  const pantry = minQty(roundNearest(totalSeats / 80), 1)
  const quietLibrary = zeroIfBelow(roundNearest(totalSeats / 400), 400)
  const wellnessRoom = zeroIfBelow(roundNearest(totalSeats / 200), 200)
  const mothersRoom = zeroIfBelow(roundNearest(totalSeats / 50), 50)
  const coatsStorage = minQty(roundNearest(totalSeats / 50), 1)
  const lockers = suppressIfDays(roundNearest((offices + workstations) / 3), daysInOffice, 5)
  const printerArea = minQty(roundNearest(totalSeats / 50), 1)
  const mailRoom = roundNearest(totalSeats / 200)
  const fileRoom = roundNearest(totalSeats / 100)
  const facilitiesStorage = roundNearest(totalSeats / 100)
  const mdfServerRoom = threshold01(totalSeats, 150)
  const idf = minQty(roundNearest(totalSeats / 150), 1)
  const itInventory = threshold01(totalSeats, 300)
  const itHelpDesk = threshold01(totalSeats, 500)
  const internalStair = 0 // placeholder

  // Calculate base areas (before circulation)
  const individualBase = offices * 120 + workstations * 42 + touchdown * 30
  const collaborativeBase =
    phoneRooms * 36 +
    huddleRooms * 120 +
    mediumConference * 250 +
    largeConference * 400 +
    trainingRoom * 600 +
    openCollaboration * 150
  const supportBase =
    reception * receptionUnitSF +
    workCafeUnitSF +
    interviewRoom * 120 +
    multipurposeRoom * 1200 +
    kitchenStorage * 100 +
    pantry * 100 +
    quietLibrary * 500 +
    wellnessRoom * 300 +
    mothersRoom * 80 +
    coatsStorage * 40 +
    lockers * 5 +
    printerArea * 75 +
    mailRoom * 300 +
    fileRoom * 200 +
    facilitiesStorage * 150 +
    mdfServerRoom * 150 +
    idf * 80 +
    itInventory * 120 +
    itHelpDesk * 100 +
    internalStair * 500

  // Apply circulation multipliers
  const individualUSF = individualBase * (1 + CIRCULATION_MULTIPLIERS.individual)
  const collaborativeUSF = collaborativeBase * (1 + CIRCULATION_MULTIPLIERS.collaborative)
  const supportUSF = supportBase * (1 + CIRCULATION_MULTIPLIERS.support)

  const totalUSF = individualUSF + collaborativeUSF + supportUSF
  const totalRSF = totalUSF * (1 + rentableAddOn)

  // Calculate baseline (5-day policy)
  const baselineSeats = computeTotalSeats(headcount, fullyRemote, 5)
  const baselineOffices = Math.ceil(baselineSeats * (percentOffices / 100))
  const baselineWorkstations = baselineSeats - baselineOffices

  const baselineIndividualBase = baselineOffices * 120 + baselineWorkstations * 42
  const baselineCollaborativeBase =
    roundUp(baselineWorkstations / 10) * 36 +
    roundUp(baselineWorkstations / 15) * 120 +
    roundUp(baselineSeats / 40) * 250 +
    roundNearest(baselineSeats / 100) * 400 +
    threshold01(baselineSeats, 60) * 600 +
    roundUp(baselineSeats / 25) * 150
  const baselineSupportBase =
    1 * (baselineSeats < 250 ? 450 : 900) +
    headcount * 6 +
    zeroIfBelow(roundNearest(baselineSeats / 250), 250) * 120 +
    zeroIfBelow(roundNearest(baselineSeats / 750), 750) * 1200 +
    roundNearest(baselineSeats / 100) * 100 +
    minQty(roundNearest(baselineSeats / 80), 1) * 100 +
    zeroIfBelow(roundNearest(baselineSeats / 400), 400) * 500 +
    zeroIfBelow(roundNearest(baselineSeats / 200), 200) * 300 +
    zeroIfBelow(roundNearest(baselineSeats / 50), 50) * 80 +
    minQty(roundNearest(baselineSeats / 50), 1) * 40 +
    0 * 5 + // lockers suppressed at 5-day
    minQty(roundNearest(baselineSeats / 50), 1) * 75 +
    roundNearest(baselineSeats / 200) * 300 +
    roundNearest(baselineSeats / 100) * 200 +
    roundNearest(baselineSeats / 100) * 150 +
    threshold01(baselineSeats, 150) * 150 +
    minQty(roundNearest(baselineSeats / 150), 1) * 80 +
    threshold01(baselineSeats, 300) * 120 +
    threshold01(baselineSeats, 500) * 100

  const baselineUSF =
    baselineIndividualBase * (1 + CIRCULATION_MULTIPLIERS.individual) +
    baselineCollaborativeBase * (1 + CIRCULATION_MULTIPLIERS.collaborative) +
    baselineSupportBase * (1 + CIRCULATION_MULTIPLIERS.support)
  const baselineRSF = baselineUSF * (1 + rentableAddOn)

  // Calculate metrics (per-workplace = seats only)
  const usfPerWorkplace = totalUSF / Math.max(totalSeats, 1)
  const rsfPerWorkplace = totalRSF / Math.max(totalSeats, 1)
  const usfPerPerson = totalUSF / Math.max(headcount, 1)
  const rsfPerPerson = totalRSF / Math.max(headcount, 1)

  // Calculate savings
  const usfSavings = baselineUSF - totalUSF
  const rsfSavings = baselineRSF - totalRSF
  const annualRentSavings = rsfSavings * grossRentPerRSF

  // Build rows array
  const rows = [
    // Individual spaces
    { category: "Individual" as const, name: "Office", count: offices, unitSF: 120, totalUSF: offices * 120 },
    {
      category: "Individual" as const,
      name: "Workstation",
      count: workstations,
      unitSF: 42,
      totalUSF: workstations * 42,
    },
    { category: "Individual" as const, name: "Touchdown", count: touchdown, unitSF: 30, totalUSF: touchdown * 30 },

    // Collaborative spaces
    {
      category: "Collaborative" as const,
      name: "Phone / Focus Booth",
      ratio: 10,
      count: phoneRooms,
      unitSF: 36,
      totalUSF: phoneRooms * 36,
    },
    {
      category: "Collaborative" as const,
      name: "Huddle / Flex",
      ratio: 15,
      count: huddleRooms,
      unitSF: 120,
      totalUSF: huddleRooms * 120,
    },
    {
      category: "Collaborative" as const,
      name: "Medium Conference",
      ratio: 40,
      count: mediumConference,
      unitSF: 250,
      totalUSF: mediumConference * 250,
    },
    {
      category: "Collaborative" as const,
      name: "Large Conference",
      ratio: 100,
      count: largeConference,
      unitSF: 400,
      totalUSF: largeConference * 400,
    },
    {
      category: "Collaborative" as const,
      name: "Training Room",
      count: trainingRoom,
      unitSF: 600,
      totalUSF: trainingRoom * 600,
    },
    {
      category: "Collaborative" as const,
      name: "Open Collaboration",
      ratio: 25,
      count: openCollaboration,
      unitSF: 150,
      totalUSF: openCollaboration * 150,
    },

    // Support spaces
    {
      category: "Support" as const,
      name: "Reception",
      count: reception,
      unitSF: receptionUnitSF,
      totalUSF: reception * receptionUnitSF,
    },
    {
      category: "Support" as const,
      name: "Work Café / Community Hub",
      count: workCafe,
      unitSF: workCafeUnitSF,
      totalUSF: workCafeUnitSF,
    },
    {
      category: "Support" as const,
      name: "Kitchen Storage",
      ratio: 100,
      count: kitchenStorage,
      unitSF: 100,
      totalUSF: kitchenStorage * 100,
    },
    {
      category: "Support" as const,
      name: "Pantry/Kitchenette",
      ratio: 80,
      count: pantry,
      unitSF: 100,
      totalUSF: pantry * 100,
    },
    {
      category: "Support" as const,
      name: "Workplace Lockers",
      ratio: 3,
      count: lockers,
      unitSF: 5,
      totalUSF: lockers * 5,
    },
  ].filter((row) => row.count > 0)

  return {
    seats: { total: totalSeats, offices, workstations },
    smallRooms: {
      phone: phoneRooms,
      huddle: huddleRooms,
      openCollab: openCollaboration,
      medium: mediumConference,
      large: largeConference,
      training: trainingRoom,
    },
    touchdown,
    workpointsTotal,
    areas: {
      indiv: individualUSF,
      collab: collaborativeUSF,
      support: supportUSF,
      USF: totalUSF,
      RSF: totalRSF,
      rentableAddOn,
    },
    metrics: { usfPerWorkplace, rsfPerWorkplace, usfPerPerson, rsfPerPerson },
    baseline: { USF: baselineUSF, RSF: baselineRSF },
    savings: { USF: usfSavings, RSF: rsfSavings, annualRent: annualRentSavings },
    rows,
  }
}
