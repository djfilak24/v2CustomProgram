import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeProgram({
  headcount,
  fullyRemote,
  percentOffices,
  daysInOffice,
  rentableAddOn,
  grossRentPerRSF,
}: {
  headcount: number
  fullyRemote: number
  percentOffices: number
  daysInOffice: number
  rentableAddOn: number
  grossRentPerRSF: number
}) {
  // Calculate basic metrics
  const inOfficeHeadcount = headcount - Math.round((headcount * fullyRemote) / 100)
  const loadFactor = daysInOffice / 5
  const workpointsTotal = Math.round(inOfficeHeadcount * loadFactor)

  // Calculate seats
  const offices = Math.round((inOfficeHeadcount * percentOffices) / 100)
  const workstations = workpointsTotal - offices
  const touchdown = Math.round(inOfficeHeadcount * 0.1) // 10% touchdown spaces

  // Calculate meeting rooms based on headcount ratios
  const phoneRooms = Math.ceil(inOfficeHeadcount / 25) // 1 per 25 people
  const huddleRooms = Math.ceil(inOfficeHeadcount / 20) // 1 per 20 people
  const mediumConf = Math.ceil(inOfficeHeadcount / 40) // 1 per 40 people
  const largeConf = Math.ceil(inOfficeHeadcount / 80) // 1 per 80 people
  const trainingRooms = Math.ceil(inOfficeHeadcount / 100) // 1 per 100 people
  const openCollab = Math.ceil(inOfficeHeadcount / 50) // 1 per 50 people

  // Calculate areas (standard sizes)
  const workstationSize = 42 // SF per workstation
  const officeSize = 120 // SF per office
  const touchdownSize = 30 // SF per touchdown

  const individualUSF = workstations * workstationSize + offices * officeSize + touchdown * touchdownSize
  const collaborativeUSF =
    phoneRooms * 36 + huddleRooms * 120 + mediumConf * 250 + largeConf * 400 + trainingRooms * 600 + openCollab * 150
  const supportUSF = 450 + 1500 + Math.ceil(headcount / 125) * 200 + Math.round(inOfficeHeadcount * 0.25) * 5 // reception + work cafe + kitchen/pantry + lockers

  const totalUSF = individualUSF + collaborativeUSF + supportUSF
  const totalRSF = Math.round(totalUSF * (1 + rentableAddOn))

  // Calculate baseline (traditional office)
  const baselineRSF = headcount * 225 // 225 RSF per person traditional
  const savings = {
    USF: baselineRSF - totalUSF,
    RSF: baselineRSF - totalRSF,
    annualRent: (baselineRSF - totalRSF) * grossRentPerRSF,
  }

  return {
    workpointsTotal,
    seats: {
      total: workstations + offices,
      workstations,
      offices,
    },
    touchdown,
    smallRooms: {
      phone: phoneRooms,
      huddle: huddleRooms,
      medium: mediumConf,
      large: largeConf,
      training: trainingRooms,
      openCollab,
    },
    areas: {
      indiv: individualUSF,
      collab: collaborativeUSF,
      support: supportUSF,
      USF: totalUSF,
      RSF: totalRSF,
      rentableAddOn,
    },
    baseline: {
      RSF: baselineRSF,
    },
    savings,
    support: {
      reception: 1,
      workCafe: 1,
      kitchenStorage: Math.ceil(headcount / 125),
      pantry: Math.ceil(headcount / 125),
      lockers: Math.round(inOfficeHeadcount * 0.25),
    },
  }
}
