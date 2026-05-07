export type ProgramInput = {
  headcount: number // HC
  fullyRemote: number // FR
  percentOffices: number // 0..100
  daysInOffice: 2 | 3 | 4 | 5 // policy selector
  rentableAddOn: number // RAF, e.g., 0.19
  grossRentPerRSF: number // $/RSF/yr
  currency?: string // e.g., 'USD'
}

export type ProgramOutput = {
  seats: { total: number; offices: number; workstations: number }
  smallRooms: { phone: number; huddle: number; openCollab: number; medium: number; large: number; training: number }
  touchdown: number
  workpointsTotal: number // offices + workstations + touchdown + phone + huddle + openCollab
  areas: { indiv: number; collab: number; support: number; USF: number; RSF: number; rentableAddOn: number }
  metrics: { usfPerWorkplace: number; rsfPerWorkplace: number; usfPerPerson: number; rsfPerPerson: number }
  baseline: { USF: number; RSF: number }
  savings: { USF: number; RSF: number; annualRent: number }
  rows: {
    category: "Individual" | "Collaborative" | "Support"
    name: string
    ratio?: number
    count: number
    unitSF: number
    totalUSF: number
  }[]
}

export type PresenceWeights = {
  resident: number
  d3: number
  d2: number
  d1: number
  remote: number
}

export type PopulationShares = {
  resident: number
  d3: number
  d2: number
  d1: number
}

export type SpaceItem = {
  name: string
  category: "Individual" | "Collaborative" | "Support"
  unitSF: number
  base?: "S" | "WS" | "HC" // S = TotalSeats, WS = workstations, HC = headcount
  ratio?: number
  rounding?: "ceil" | "round" | "floor"
  gate?: number // minimum threshold
  min?: number // minimum quantity
  suppressIfDays?: number // suppress if daysInOffice equals this value
  unitPerHeadcount?: boolean // special case for work cafe
  unitBySeatThresholds?: { threshold: number; unitSF: number }[] // for reception
}
