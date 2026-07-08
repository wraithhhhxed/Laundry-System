import { ApiError } from '../utils/ApiError.js'
import {
  buildDateMatch,
  getSummary,
  getPerBranch,
  getPerService,
  getKgRevenue,
  getPromoSummary,
} from '../repositories/sales.repository.js'

export const getFullReport = async (filters, user) => {
  const dateMatch = buildDateMatch(filters)
  if (!Object.keys(dateMatch).length) throw new ApiError(400, 'Date filter required')

  const match = { ...dateMatch }

  if (user.role === 'branch') {
    match.branchId = user.id
  } else if (filters.branchId) {
    match.branchId = filters.branchId
  }

  const [summary, perBranch, perService, kgResult, promos] = await Promise.all([
    getSummary(match, filters.preset),
    user.role === 'admin' ? getPerBranch(match) : null,
    getPerService(match),
    getKgRevenue(match),
    getPromoSummary(match),
  ])

  return {
    summary,
    perBranch,
    perService,
    kgRevenue: kgResult[0] ?? null,
    promos,
  }
}