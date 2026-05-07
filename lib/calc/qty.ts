export function roundUp(value: number): number {
  return Math.ceil(value)
}

export function roundNearest(value: number): number {
  return Math.round(value)
}

export function roundDown(value: number): number {
  return Math.floor(value)
}

export function minQty(value: number, min: number): number {
  return Math.max(value, min)
}

export function zeroIfBelow(value: number, threshold: number): number {
  return value < threshold ? 0 : value
}

export function threshold01(seats: number, threshold: number): number {
  return seats >= threshold ? 1 : 0
}

export function suppressIfDays(qty: number, daysInOffice: number, suppressDay: number): number {
  return daysInOffice === suppressDay ? 0 : qty
}

export function unitPerHeadcount(headcount: number, multiplier: number): number {
  return headcount * multiplier
}

export function unitBySeatThresholds(seats: number, thresholds: { threshold: number; unitSF: number }[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (seats >= thresholds[i].threshold) {
      return thresholds[i].unitSF
    }
  }
  return thresholds[0]?.unitSF || 0
}
