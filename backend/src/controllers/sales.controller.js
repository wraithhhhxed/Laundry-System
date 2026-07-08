import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { getFullReport } from '../services/Sales.Service.js'

export const getSalesReport = asyncHandler(async (req, res) => {
  const filters = {
    preset:   req.query.preset,
    from:     req.query.from,
    to:       req.query.to,
    branchId: req.query.branchId,
  }

  const data = await getFullReport(filters, req.user)
  res.status(200).json(new ApiResponse(200, data, 'Sales report fetched successfully'))
})