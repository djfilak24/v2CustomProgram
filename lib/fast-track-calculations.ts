export interface SummaryInputs {
  clientName: string;
  programmedBy: string;
  totalHeadcount: number;
  fullyRemote: number;
  percentOffices: number;
  grossRent: number;
  daysInOffice: number;
  rentableFactor: number;
}

export interface SurveyBlock {
  label: string;
  rows: SurveyRow[];
}

export interface SurveyRow {
  type: string;
  daysInOffice: string;
  surveyInput: number;
  deskShare: number;
  surveyAfterRemote: number;
  headcount: number;
  seatCount: number;
}

export interface SpaceItem {
  name: string;
  category: "individual" | "collaborative" | "support";
  areaSf: number;
  ratio: number | null;
  quantity: number;
  totalArea: number;
  ratioLabel?: string;
}

export interface SpaceProgram {
  individual: SpaceItem[];
  individualSubtotal: number;
  individualCirculation: number;
  individualTotal: number;
  collaborative: SpaceItem[];
  collaborativeSubtotal: number;
  collaborativeCirculation: number;
  collaborativeTotal: number;
  support: SpaceItem[];
  supportSubtotal: number;
  supportCirculation: number;
  supportTotal: number;
  netAssignableTotal: number;
  netAssignable: number;
  circulationTotal: number;
  grossUsable: number;
  usfPerSeat: number;
  rentableAddOnFactor: number;
  rentableAddOnArea: number;
  rentableAddOn: number;
  estimatedRentable: number;
  rentableFactor: number;
  rsfPerSeat: number;
  totalSeatDemand: number;
  circulationMultiplierIndividual: number;
  circulationMultiplierCollaborative: number;
  circulationMultiplierSupport: number;
}

export interface DashboardMetrics {
  workstations: number;
  offices: number;
  totalSeatCount: number;
  touchDownSpaces: number;
  phoneRooms: number;
  huddleRooms: number;
  openCollabSpaces: number;
  totalWorkpoints: number;
  conferenceSeats: number;
  usableAreaPerWorkplace: number;
  usableAreaPerPerson: number;
  rentableAreaPerWorkplace: number;
  rentableAreaPerPerson: number;
  hybridUsableArea: number;
  hybridRentableArea: number;
  fullOccUsableArea: number;
  fullOccRentableArea: number;
  usfSavings: number;
  rsfSavings: number;
  annualRentSavings: number;
  pieChartData: { name: string; value: number }[];
  // Efficiency metrics
  fullOccRsfPerWorkplace: number;
  fullOccRsfPerPerson: number;
  hybridUsfPerWorkplace: number;
  hybridUsfPerPerson: number;
}

export const DEFAULT_INPUTS: SummaryInputs = {
  clientName: "Client Name",
  programmedBy: "Programmed By",
  totalHeadcount: 250,
  fullyRemote: 0,
  percentOffices: 10,
  grossRent: 50,
  daysInOffice: 4,
  rentableFactor: 0.22,
};

const SURVEY_DEFAULTS: Record<number, number[]> = {
  1: [0.05, 0.15, 0.25, 0.55],
  2: [0.25, 0.30, 0.40, 0.05],
  3: [0.35, 0.40, 0.20, 0.05],
  4: [0.65, 0.20, 0.10, 0.05],
  5: [1.00, 0.00, 0.00, 0.00],
};

const DESK_SHARE_RATIOS = [1.0, 0.6, 0.4, 0.2, 0.0];

export function computeSeatDemandBlock(
  blockDays: number,
  totalHeadcount: number,
  fullyRemote: number,
  surveyInputs?: number[]
): SurveyBlock {
  const surveys =
    surveyInputs || SURVEY_DEFAULTS[blockDays] || [0.25, 0.25, 0.25, 0.25];
  const remotePercent =
    totalHeadcount > 0
      ? Math.round((fullyRemote / totalHeadcount) * 100) / 100
      : 0;

  const rows: SurveyRow[] = [];

  for (let i = 0; i < 4; i++) {
    const surveyAfterRemote =
      Math.round(surveys[i] * (1 - remotePercent) * 100) / 100;
    const headcount = Math.ceil(totalHeadcount * surveyAfterRemote);
    const seatCount = headcount * DESK_SHARE_RATIOS[i];

    const types = [
      "Resident Seat",
      "Unassigned Seat",
      "Unassigned Seat",
      "Unassigned Seat",
    ];
    const dayLabels = ["4 or 5", "3", "2", "1"];

    rows.push({
      type: types[i],
      daysInOffice: dayLabels[i],
      surveyInput: surveys[i],
      deskShare: DESK_SHARE_RATIOS[i],
      surveyAfterRemote,
      headcount,
      seatCount,
    });
  }

  rows.push({
    type: "Fully Remote",
    daysInOffice: "0",
    surveyInput: 0,
    deskShare: 0,
    surveyAfterRemote: remotePercent,
    headcount: fullyRemote,
    seatCount: 0,
  });

  return {
    label: `${blockDays} DAY${blockDays > 1 ? "S" : ""}/WEEK`,
    rows,
  };
}

export function computeAllSeatDemandBlocks(
  totalHeadcount: number,
  fullyRemote: number,
  customSurveys?: Record<number, number[]>
): SurveyBlock[] {
  const blocks: SurveyBlock[] = [];
  for (let d = 1; d <= 5; d++) {
    blocks.push(
      computeSeatDemandBlock(
        d,
        totalHeadcount,
        fullyRemote,
        customSurveys?.[d]
      )
    );
  }
  return blocks;
}

export function getTotalSeatDemand(block: SurveyBlock): number {
  return block.rows.reduce((sum, r) => sum + r.seatCount, 0);
}

export function getResidentSeatCount(block: SurveyBlock): number {
  return block.rows[0]?.seatCount || 0;
}

function getPhoneRoomRatio(daysInOffice: number): number {
  if (daysInOffice === 5) return 15;
  if (daysInOffice === 4) return 12;
  return 10;
}

function getHuddleRoomRatio(daysInOffice: number): number {
  if (daysInOffice === 5) return 25;
  if (daysInOffice === 4) return 20;
  return 15;
}

function getReceptionArea(seatDemand: number): number {
  if (seatDemand < 100) return 250;
  if (seatDemand < 250) return 450;
  return 750;
}

export function computeSpaceProgram(
  inputs: SummaryInputs,
  blocks: SurveyBlock[],
  forceDays?: number
): SpaceProgram {
  const days = forceDays ?? inputs.daysInOffice;
  const blockIndex = days - 1;
  const block = blocks[blockIndex];

  const totalSeatDemand = getTotalSeatDemand(block);
  const residentSeatCount = getResidentSeatCount(block);

  const circulationMultiplierIndividual = 0.45;
  const circulationMultiplierSupport = 0.35;

  const residentOfficeQty = residentSeatCount * (inputs.percentOffices / 100);
  const unassignedOfficeQty = Math.max(
    0,
    totalSeatDemand * (inputs.percentOffices / 100) - residentOfficeQty
  );
  const residentWsQty =
    residentSeatCount * ((100 - inputs.percentOffices) / 100);
  const unassignedWsQty = Math.max(
    0,
    totalSeatDemand -
      residentOfficeQty -
      unassignedOfficeQty -
      residentWsQty
  );

  const targetTotal = Math.round(totalSeatDemand);
  const rawValues = [residentOfficeQty, unassignedOfficeQty, residentWsQty, unassignedWsQty];
  const floored = rawValues.map(v => Math.floor(v));
  let remainder = targetTotal - floored.reduce((a, b) => a + b, 0);
  const fractions = rawValues.map((v, i) => ({ i, frac: v - floored[i] }));
  fractions.sort((a, b) => b.frac - a.frac);
  for (const f of fractions) {
    if (remainder <= 0) break;
    floored[f.i]++;
    remainder--;
  }
  const residentOfficeQtyR = Math.max(0, floored[0]);
  const unassignedOfficeQtyR = Math.max(0, floored[1]);
  const residentWsQtyR = Math.max(0, floored[2]);
  const unassignedWsQtyR = Math.max(0, floored[3]);

  const phoneRoomRatio = getPhoneRoomRatio(days);
  const huddleRoomRatio = getHuddleRoomRatio(days);
  const totalWorkstations = residentWsQtyR + unassignedWsQtyR;

  const phoneRoomQty =
    totalWorkstations > 0
      ? Math.ceil(totalWorkstations / phoneRoomRatio)
      : 0;
  const huddleRoomQty =
    totalWorkstations > 0
      ? Math.ceil(totalWorkstations / huddleRoomRatio)
      : 0;
  const openCollabQty =
    totalSeatDemand > 0
      ? Math.ceil(totalSeatDemand / 25)
      : 0;

  const touchDownRaw =
    inputs.totalHeadcount -
    inputs.fullyRemote -
    totalSeatDemand -
    phoneRoomQty -
    huddleRoomQty -
    openCollabQty;
  const touchDownQty = Math.max(0, Math.round(touchDownRaw));

  const mediumConfQty =
    totalSeatDemand > 0 ? Math.ceil(totalSeatDemand / 40) : 0;
  const largeConfQty =
    totalSeatDemand > 0 ? Math.round(totalSeatDemand / 80) : 0;
  const trainingRoomQty = totalSeatDemand / 80 < 1 ? 0 : 1;

  const individual: SpaceItem[] = [
    {
      name: "Resident Office",
      category: "individual",
      areaSf: 140,
      ratio: null,
      quantity: residentOfficeQtyR,
      totalArea: 140 * residentOfficeQtyR,
    },
    {
      name: "Unassigned Office",
      category: "individual",
      areaSf: 140,
      ratio: null,
      quantity: unassignedOfficeQtyR,
      totalArea: 140 * unassignedOfficeQtyR,
    },
    {
      name: "Resident Workstation",
      category: "individual",
      areaSf: 42,
      ratio: null,
      quantity: residentWsQtyR,
      totalArea: 42 * residentWsQtyR,
    },
    {
      name: "Unassigned Workstation",
      category: "individual",
      areaSf: 42,
      ratio: null,
      quantity: unassignedWsQtyR,
      totalArea: 42 * unassignedWsQtyR,
    },
    {
      name: "Touch Down Spot",
      category: "individual",
      areaSf: 30,
      ratio: null,
      quantity: touchDownQty,
      totalArea: 30 * touchDownQty,
    },
  ];

  const individualSubtotal = individual.reduce((s, i) => s + i.totalArea, 0);
  const individualCirculation = Math.round(
    individualSubtotal * circulationMultiplierIndividual
  );
  const individualTotal = individualSubtotal + individualCirculation;

  const collaborative: SpaceItem[] = [
    {
      name: "Phone Room / Focus Booth",
      category: "collaborative",
      areaSf: 48,
      ratio: phoneRoomRatio,
      quantity: phoneRoomQty,
      totalArea: 48 * phoneRoomQty,
      ratioLabel: `1:${phoneRoomRatio} workstations`,
    },
    {
      name: "Huddle Room / Flex",
      category: "collaborative",
      areaSf: 140,
      ratio: huddleRoomRatio,
      quantity: huddleRoomQty,
      totalArea: 140 * huddleRoomQty,
      ratioLabel: `1:${huddleRoomRatio} workstations`,
    },
    {
      name: "Medium Conference",
      category: "collaborative",
      areaSf: 280,
      ratio: 40,
      quantity: mediumConfQty,
      totalArea: 280 * mediumConfQty,
      ratioLabel: "1:40 seats",
    },
    {
      name: "Large Conference",
      category: "collaborative",
      areaSf: 400,
      ratio: 80,
      quantity: largeConfQty,
      totalArea: 400 * largeConfQty,
      ratioLabel: "1:80 seats",
    },
    {
      name: "Training Room",
      category: "collaborative",
      areaSf: 600,
      ratio: 80,
      quantity: trainingRoomQty,
      totalArea: 600 * trainingRoomQty,
      ratioLabel: "1:80 seats",
    },
    {
      name: "Open Collaboration Space",
      category: "collaborative",
      areaSf: 150,
      ratio: 25,
      quantity: openCollabQty,
      totalArea: 150 * openCollabQty,
      ratioLabel: "1:25 seats",
    },
  ];

  const collaborativeSubtotal = collaborative.reduce(
    (s, i) => s + i.totalArea,
    0
  );
  const collaborativeCirculation = Math.round(
    collaborativeSubtotal * circulationMultiplierIndividual
  );
  const collaborativeTotal = collaborativeSubtotal + collaborativeCirculation;

  const d10 = totalSeatDemand;
  const interviewQty =
    d10 / 250 < 1 ? 0 : Math.round(d10 / 250);
  const multipurposeQty =
    d10 / 750 < 1 ? 0 : Math.round(d10 / 750);
  const workCafeArea = Math.round(d10 * 7.5);
  const kitchenStorageQty = d10 > 0 ? Math.round(d10 / 100) : 0;
  const pantryQty = d10 / 80 < 1 ? 1 : Math.round(d10 / 80);
  const libraryQty = d10 / 400 < 1 ? 0 : Math.round(d10 / 400);
  const wellnessQty = d10 / 200 < 1 ? 0 : Math.round(d10 / 200);
  const mothersQty = d10 / 50 < 1 ? 0 : Math.round(d10 / 50);
  const coatsQty = d10 / 50 < 1 ? 1 : Math.round(d10 / 50);
  const unassignedSeats = unassignedOfficeQtyR + unassignedWsQtyR;
  const lockerQty =
    days === 5
      ? 0
      : unassignedSeats > 0
        ? Math.round(unassignedSeats / 3)
        : 0;
  const printerQty = d10 / 50 < 1 ? 1 : Math.round(d10 / 50);
  const mailQty = d10 > 0 ? Math.round(d10 / 200) : 0;
  const fileQty = d10 > 0 ? Math.round(d10 / 100) : 0;
  const facilitiesQty = d10 > 0 ? Math.round(d10 / 100) : 0;
  const mdfQty = d10 / 150 < 1 ? 0 : 1;
  const idfQty = d10 / 150 < 1 ? 1 : Math.round(d10 / 150);
  const itStorageQty = d10 / 300 < 1 ? 0 : 1;
  const itHelpQty = d10 / 500 < 1 ? 0 : 1;

  const support: SpaceItem[] = [
    {
      name: "Reception",
      category: "support",
      areaSf: getReceptionArea(d10),
      ratio: null,
      quantity: 1,
      totalArea: getReceptionArea(d10),
      ratioLabel: "",
    },
    {
      name: "Interview Room",
      category: "support",
      areaSf: 140,
      ratio: 250,
      quantity: interviewQty,
      totalArea: 140 * interviewQty,
      ratioLabel: "1:250 seats",
    },
    {
      name: "Multipurpose Room",
      category: "support",
      areaSf: 1200,
      ratio: 750,
      quantity: multipurposeQty,
      totalArea: 1200 * multipurposeQty,
      ratioLabel: "1:750 seats",
    },
    {
      name: "Work Cafe",
      category: "support",
      areaSf: workCafeArea,
      ratio: 7.5,
      quantity: 1,
      totalArea: workCafeArea,
      ratioLabel: "7.5 sf/person",
    },
    {
      name: "Kitchen Storage",
      category: "support",
      areaSf: 100,
      ratio: 100,
      quantity: kitchenStorageQty,
      totalArea: 100 * kitchenStorageQty,
      ratioLabel: "1:100 seats",
    },
    {
      name: "Pantry / Kitchenette",
      category: "support",
      areaSf: 100,
      ratio: 80,
      quantity: pantryQty,
      totalArea: 100 * pantryQty,
      ratioLabel: "1:80 seats",
    },
    {
      name: "Quiet Library",
      category: "support",
      areaSf: 500,
      ratio: 400,
      quantity: libraryQty,
      totalArea: 500 * libraryQty,
      ratioLabel: "1:400 seats",
    },
    {
      name: "Wellness Room Suite",
      category: "support",
      areaSf: 300,
      ratio: 200,
      quantity: wellnessQty,
      totalArea: 300 * wellnessQty,
      ratioLabel: "1:200 seats",
    },
    {
      name: "Mothers Room",
      category: "support",
      areaSf: 80,
      ratio: 50,
      quantity: mothersQty,
      totalArea: 80 * mothersQty,
      ratioLabel: "1:50 seats",
    },
    {
      name: "Coats / Storage Closet",
      category: "support",
      areaSf: 40,
      ratio: 50,
      quantity: coatsQty,
      totalArea: 40 * coatsQty,
      ratioLabel: "1:50 seats",
    },
    {
      name: "Workplace Lockers",
      category: "support",
      areaSf: 5,
      ratio: 3,
      quantity: lockerQty,
      totalArea: 5 * lockerQty,
      ratioLabel: "1:3 unassigned seats",
    },
    {
      name: "Printer / Copy Area",
      category: "support",
      areaSf: 80,
      ratio: 50,
      quantity: printerQty,
      totalArea: 80 * printerQty,
      ratioLabel: "1:50 seats",
    },
    {
      name: "Mail Room",
      category: "support",
      areaSf: 300,
      ratio: 200,
      quantity: mailQty,
      totalArea: 300 * mailQty,
      ratioLabel: "1:200 seats",
    },
    {
      name: "File Room",
      category: "support",
      areaSf: 200,
      ratio: 100,
      quantity: fileQty,
      totalArea: 200 * fileQty,
      ratioLabel: "1:100 seats",
    },
    {
      name: "Facilities Storage",
      category: "support",
      areaSf: 150,
      ratio: 100,
      quantity: facilitiesQty,
      totalArea: 150 * facilitiesQty,
      ratioLabel: "1:100 seats",
    },
    {
      name: "MDF / Server Room",
      category: "support",
      areaSf: 150,
      ratio: 150,
      quantity: mdfQty,
      totalArea: 150 * mdfQty,
      ratioLabel: "1:150 seats",
    },
    {
      name: "IDF",
      category: "support",
      areaSf: 80,
      ratio: 150,
      quantity: idfQty,
      totalArea: 80 * idfQty,
      ratioLabel: "1:150 seats",
    },
    {
      name: "IT / Tech Storage",
      category: "support",
      areaSf: 120,
      ratio: 300,
      quantity: itStorageQty,
      totalArea: 120 * itStorageQty,
      ratioLabel: "1:300 seats",
    },
    {
      name: "IT Help Desk",
      category: "support",
      areaSf: 100,
      ratio: 500,
      quantity: itHelpQty,
      totalArea: 100 * itHelpQty,
      ratioLabel: "1:500 seats",
    },
    {
      name: "Internal Stair",
      category: "support",
      areaSf: 500,
      ratio: null,
      quantity: 0,
      totalArea: 0,
      ratioLabel: "1 per floor",
    },
  ];

  const supportSubtotal = support.reduce((s, i) => s + i.totalArea, 0);
  const supportCirculation = Math.round(
    supportSubtotal * circulationMultiplierSupport
  );
  const supportTotal = supportSubtotal + supportCirculation;

  const netAssignable =
    individualSubtotal + collaborativeSubtotal + supportSubtotal;
  const circulationTotal =
    individualCirculation + collaborativeCirculation + supportCirculation;
  const grossUsable = individualTotal + collaborativeTotal + supportTotal;
  const rentableAddOnArea = Math.round(grossUsable * inputs.rentableFactor);
  const estimatedRentable = grossUsable + rentableAddOnArea;
  const totalSeatCountForMetric = residentOfficeQtyR + unassignedOfficeQtyR + residentWsQtyR + unassignedWsQtyR;

  return {
    individual,
    individualSubtotal,
    individualCirculation,
    individualTotal,
    collaborative,
    collaborativeSubtotal,
    collaborativeCirculation,
    collaborativeTotal,
    support,
    supportSubtotal,
    supportCirculation,
    supportTotal,
    netAssignable,
    circulationTotal,
    grossUsable,
    usfPerSeat:
      totalSeatCountForMetric > 0 ? Math.round(grossUsable / totalSeatCountForMetric) : 0,
    rentableAddOnFactor: inputs.rentableFactor,
    rentableAddOnArea,
    estimatedRentable,
    rsfPerSeat:
      totalSeatCountForMetric > 0
        ? Math.round(estimatedRentable / totalSeatCountForMetric)
        : 0,
    totalSeatDemand: Math.round(totalSeatDemand),
    circulationMultiplierIndividual,
    circulationMultiplierSupport,
  };
}

export function computeDashboard(
  inputs: SummaryInputs,
  hybridProgram: SpaceProgram,
  fullOccProgram: SpaceProgram
): DashboardMetrics {
  const workstations =
    hybridProgram.individual[2].quantity + hybridProgram.individual[3].quantity;
  const offices =
    hybridProgram.individual[0].quantity + hybridProgram.individual[1].quantity;
  const totalSeatCount = workstations + offices;
  const touchDownSpaces = hybridProgram.individual[4].quantity;
  const phoneRooms = hybridProgram.collaborative[0].quantity;
  const huddleRooms = hybridProgram.collaborative[1].quantity;
  const openCollabSpaces = hybridProgram.collaborative[5].quantity;
  const totalWorkpoints =
    totalSeatCount + touchDownSpaces + phoneRooms + huddleRooms + openCollabSpaces;

  const conferenceSeats =
    huddleRooms * 6 +
    hybridProgram.collaborative[2].quantity * 10 +
    hybridProgram.collaborative[3].quantity * 14 +
    hybridProgram.collaborative[4].quantity * 24;

  const usfSavings = fullOccProgram.grossUsable - hybridProgram.grossUsable;
  const rsfSavings =
    fullOccProgram.estimatedRentable - hybridProgram.estimatedRentable;
  const annualRentSavings = inputs.grossRent * rsfSavings;

  return {
    workstations,
    offices,
    totalSeatCount,
    touchDownSpaces,
    phoneRooms,
    huddleRooms,
    openCollabSpaces,
    totalWorkpoints,
    conferenceSeats,
    usableAreaPerWorkplace:
      totalSeatCount > 0
        ? Math.round(hybridProgram.grossUsable / totalSeatCount)
        : 0,
    usableAreaPerPerson:
      inputs.totalHeadcount > 0
        ? Math.round(hybridProgram.grossUsable / inputs.totalHeadcount)
        : 0,
    rentableAreaPerWorkplace:
      totalSeatCount > 0
        ? Math.round(hybridProgram.estimatedRentable / totalSeatCount)
        : 0,
    rentableAreaPerPerson:
      inputs.totalHeadcount > 0
        ? Math.round(hybridProgram.estimatedRentable / inputs.totalHeadcount)
        : 0,
    hybridUsableArea: hybridProgram.grossUsable,
    hybridRentableArea: hybridProgram.estimatedRentable,
    fullOccUsableArea: fullOccProgram.grossUsable,
    fullOccRentableArea: fullOccProgram.estimatedRentable,
    usfSavings,
    rsfSavings,
    annualRentSavings,
    pieChartData: [
      { name: "Individual Space", value: hybridProgram.individualTotal },
      { name: "Collaboration Space", value: hybridProgram.collaborativeTotal },
      { name: "Support Space", value: hybridProgram.supportTotal },
      { name: "Rentable Factor", value: hybridProgram.rentableAddOnArea },
    ],
    // Efficiency metrics
    fullOccRsfPerWorkplace: totalSeatCount > 0 
      ? Math.round(fullOccProgram.estimatedRentable / totalSeatCount) 
      : 0,
    fullOccRsfPerPerson: inputs.totalHeadcount > 0 
      ? Math.round(fullOccProgram.estimatedRentable / inputs.totalHeadcount) 
      : 0,
    hybridUsfPerWorkplace: totalSeatCount > 0 
      ? Math.round(hybridProgram.grossUsable / totalSeatCount) 
      : 0,
    hybridUsfPerPerson: inputs.totalHeadcount > 0 
      ? Math.round(hybridProgram.grossUsable / inputs.totalHeadcount) 
      : 0,
  };
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatCurrency(n: number): string {
  return `$${formatNumber(n)}`;
}
