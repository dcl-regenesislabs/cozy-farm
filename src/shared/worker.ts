import { CropType } from '../data/cropData'

export const WORKER_HIRE_COST = 800
export const WORKER_DAILY_WAGE = 150
export const WORKER_DAY_MS = 24 * 60 * 60 * 1000
export const WORKER_DEBUG_ENABLED = false

export type WorkerStatus = 'inactive' | 'active' | 'idle_no_seeds' | 'idle_unpaid'

export function getWorkerDebtDays(outstandingWages: number): number {
  return Math.max(0, Math.floor(outstandingWages / WORKER_DAILY_WAGE))
}

export function getTotalWorkerSeeds(seeds: Map<CropType, number>): number {
  let total = 0
  seeds.forEach((count) => {
    if (count > 0) total += count
  })
  return total
}

export function getWorkerStatus(args: {
  farmerHired: boolean
  workerUnpaidDays: number
  farmerSeeds: Map<CropType, number>
}): WorkerStatus {
  // `workerUnpaidDays` is persisted separately from the derived debt-day count:
  // outstanding wages drive UI/back-pay totals, while unpaidDays tracks consecutive
  // missed daily deductions for the 2-day shutdown rule.
  if (!args.farmerHired) return 'inactive'
  if (args.workerUnpaidDays >= 2) return 'idle_unpaid'
  if (getTotalWorkerSeeds(args.farmerSeeds) <= 0) return 'idle_no_seeds'
  return 'active'
}
