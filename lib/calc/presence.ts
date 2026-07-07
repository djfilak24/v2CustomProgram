import type { PresenceWeights, PopulationShares } from "./types"

export const PRESENCE_WEIGHTS: PresenceWeights = {
  resident: 1.0,
  d3: 0.6,
  d2: 0.4,
  d1: 0.2,
  remote: 0.0,
}

export const POPULATION_SHARES: Record<2 | 3 | 4 | 5, PopulationShares> = {
  2: { resident: 0.25, d3: 0.3, d2: 0.4, d1: 0.05 },
  3: { resident: 0.35, d3: 0.4, d2: 0.2, d1: 0.05 },
  4: { resident: 0.65, d3: 0.2, d2: 0.1, d1: 0.05 },
  5: { resident: 1.0, d3: 0, d2: 0, d1: 0 },
}

/**
 * Ceil that ignores float noise. Weighted presence factors like
 * 0.25·1 + 0.3·0.6 + 0.4·0.4 + 0.05·0.2 are exactly 0.60 in decimal but come
 * out as 0.6000000000000001 in binary — a bare Math.ceil then invents a seat
 * that doesn't exist (220 × 0.60 → 133 instead of 132). Round to 1e-9 first.
 */
const ceilExact = (n: number) => Math.ceil(Math.round(n * 1e9) / 1e9)

export function computeTotalSeats(headcount: number, fullyRemote: number, daysInOffice: 2 | 3 | 4 | 5): number {
  const inOffice = Math.max(headcount - fullyRemote, 0)

  const shares = POPULATION_SHARES[daysInOffice]
  if (!shares) {
    console.error(`[v0] Invalid daysInOffice value: ${daysInOffice}. Must be 2, 3, 4, or 5.`)
    // Default to 3-day policy if invalid value
    const fallbackShares = POPULATION_SHARES[3]
    const seatsRaw =
      inOffice *
      (fallbackShares.resident * PRESENCE_WEIGHTS.resident +
        fallbackShares.d3 * PRESENCE_WEIGHTS.d3 +
        fallbackShares.d2 * PRESENCE_WEIGHTS.d2 +
        fallbackShares.d1 * PRESENCE_WEIGHTS.d1)
    return ceilExact(seatsRaw)
  }

  const seatsRaw =
    inOffice *
    (shares.resident * PRESENCE_WEIGHTS.resident +
      shares.d3 * PRESENCE_WEIGHTS.d3 +
      shares.d2 * PRESENCE_WEIGHTS.d2 +
      shares.d1 * PRESENCE_WEIGHTS.d1)

  return ceilExact(seatsRaw)
}
