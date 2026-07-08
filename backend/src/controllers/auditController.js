import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import AuditRepository from '../repositories/AuditRepository.js'

/**
 * GET /api/audit-logs
 * Super admin only.
 *
 * Query params:
 *   action, branchId, actorName, actorRole, targetType,
 *   dateFrom, dateTo, page, limit
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    action,
    branchId,
    actorName,
    actorRole,
    targetType,
    dateFrom,
    dateTo,
    page  = 1,
    limit = 50,
  } = req.query

  const result = await AuditRepository.findAll({
    action,
    branchId,
    actorName,
    actorRole,
    targetType,
    dateFrom,
    dateTo,
    page:  Number(page),
    limit: Number(limit),
  })

  return res.status(200).json(
    new ApiResponse(200, result, 'Audit logs fetched successfully')
  )
})

/**
 * GET /api/audit-logs/target/:type/:id
 * Super admin only. Get history for a specific record (e.g. one appointment).
 */
const getAuditLogsByTarget = asyncHandler(async (req, res) => {
  const { type, id } = req.params
  const limit = Number(req.query.limit) || 20

  if (!type || !id) throw new ApiError(400, 'type and id are required')

  const logs = await AuditRepository.findByTarget(type, id, limit)

  return res.status(200).json(
    new ApiResponse(200, logs, 'Audit logs fetched successfully')
  )
})

export { getAuditLogs, getAuditLogsByTarget }