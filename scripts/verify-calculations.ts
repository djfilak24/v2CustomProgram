import { computeProgram } from "../lib/calc/computeProgram"

console.log("[v0] Starting calculation verification...")

// Test Case A (Parity Check)
console.log("\n=== Test Case A (Parity Check) ===")
const resultA = computeProgram({
  headcount: 250,
  fullyRemote: 30,
  percentOffices: 10,
  daysInOffice: 3,
  rentableAddOn: 0.19,
  grossRentPerRSF: 50,
})

console.log(`Total Seats: ${resultA.totalSeats} (expected: 150)`)
console.log(`Offices: ${resultA.individual.offices.qty} (expected: 15)`)
console.log(`Workstations: ${resultA.individual.workstations.qty} (expected: 135)`)
console.log(`Phone: ${resultA.support.phone.qty} (expected: 14)`)
console.log(`Huddle: ${resultA.collab.huddle.qty} (expected: 9)`)
console.log(`Open Collab: ${resultA.collab.openCollab.qty} (expected: 6)`)
console.log(`Training: ${resultA.collab.training.qty} (expected: 1)`)
console.log(`Medium: ${resultA.collab.medium.qty} (expected: 4)`)
console.log(`Large: ${resultA.collab.large.qty} (expected: 2)`)
console.log(`Touchdown: ${resultA.support.touchdown.qty} (expected: 41)`)
console.log(`Workpoints: ${resultA.workpoints} (expected: 220)`)
console.log(`USF: ${Math.round(resultA.usf)} (expected: ~29484)`)
console.log(`RSF: ${Math.round(resultA.rsf)} (expected: ~35086)`)
console.log(`Baseline RSF: ${Math.round(resultA.baselineRsf)} (expected: ~43712)`)
console.log(`RSF Savings: ${Math.round(resultA.rsfSavings)} (expected: ~8625)`)
console.log(`Annual Rent: ${Math.round(resultA.annualRent)} (expected: ~431258)`)

// Test Case B (2 days in office)
console.log("\n=== Test Case B (2 Days in Office) ===")
const resultB = computeProgram({
  headcount: 250,
  fullyRemote: 30,
  percentOffices: 10,
  daysInOffice: 2,
  rentableAddOn: 0.19,
  grossRentPerRSF: 50,
})

console.log(`Total Seats: ${resultB.totalSeats} (expected: ~131)`)

// Test Case C (4 days in office)
console.log("\n=== Test Case C (4 Days in Office) ===")
const resultC = computeProgram({
  headcount: 250,
  fullyRemote: 30,
  percentOffices: 10,
  daysInOffice: 4,
  rentableAddOn: 0.19,
  grossRentPerRSF: 50,
})

console.log(`Total Seats: ${resultC.totalSeats} (expected: ~181)`)

// Edge Case: FR = HC (fully remote)
console.log("\n=== Edge Case: Fully Remote ===")
const resultEdge1 = computeProgram({
  headcount: 100,
  fullyRemote: 100,
  percentOffices: 10,
  daysInOffice: 3,
  rentableAddOn: 0.19,
  grossRentPerRSF: 50,
})

console.log(`Total Seats: ${resultEdge1.totalSeats} (expected: 0)`)
console.log(`Café: ${resultEdge1.support.cafe.qty} (expected: 1, unit: ${resultEdge1.support.cafe.unit})`)

// Edge Case: 5 days in office (no lockers)
console.log("\n=== Edge Case: 5 Days in Office ===")
const resultEdge2 = computeProgram({
  headcount: 250,
  fullyRemote: 30,
  percentOffices: 10,
  daysInOffice: 5,
  rentableAddOn: 0.19,
  grossRentPerRSF: 50,
})

console.log(`Lockers: ${resultEdge2.support.lockers.qty} (expected: 0 - suppressed by rule)`)

console.log("\n[v0] Verification complete!")
