export interface DepreciationEntry {
  month: string
  amountCents: number
}

/** Straight-line monthly depreciation, starting in the month of purchase. */
export function depreciationSchedule(costCents: number, startDate: string, lifeYears: number, residualCents = 0): DepreciationEntry[] {
  const months = Math.max(1, Math.round(lifeYears * 12))
  const total = costCents - residualCents
  const monthly = Math.round(total / months)
  let year = Number(startDate.slice(0, 4))
  let month = Number(startDate.slice(5, 7))
  const entries: DepreciationEntry[] = []
  for (let i = 0; i < months; i++) {
    const amount = i === months - 1 ? total - monthly * (months - 1) : monthly
    entries.push({ month: `${year}-${String(month).padStart(2, '0')}`, amountCents: amount })
    if (++month > 12) { month = 1; year++ }
  }
  return entries
}

export function depreciationForYear(schedule: DepreciationEntry[], year: number): number {
  const prefix = `${year}-`
  return schedule.filter((e) => e.month.startsWith(prefix)).reduce((sum, e) => sum + e.amountCents, 0)
}

export function depreciationUntil(schedule: DepreciationEntry[], yearInclusive: number): number {
  return schedule.filter((e) => Number(e.month.slice(0, 4)) <= yearInclusive).reduce((sum, e) => sum + e.amountCents, 0)
}
