import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import extraServiceService from '../services/ExtraServiceService.js'

// ─── PUBLIC ───────────────────────────────────────────────────────
const getActiveExtraServices = asyncHandler(async (req, res) => {
  const extraServices = await extraServiceService.getActiveExtraServices()
  res.json(new ApiResponse(200, { extraServices }))
})

// ─── ADMIN (called from extraServiceRoute, auth handled by middleware) ───────
const getAllExtraServices = asyncHandler(async (req, res) => {
  const extraServices = await extraServiceService.getAllExtraServices()
  res.json(new ApiResponse(200, { extraServices }))
})

const createExtraService = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.createExtraService(req.body)
  res.json(new ApiResponse(201, { extraService }, 'Extra service created'))
})

const updateExtraService = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.updateExtraService(req.params.id, req.body)
  res.json(new ApiResponse(200, { extraService }, 'Extra service updated'))
})

const deleteExtraService = asyncHandler(async (req, res) => {
  await extraServiceService.deleteExtraService(req.params.id)
  res.json(new ApiResponse(200, {}, 'Extra service deleted'))
})

const toggleExtraService = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.toggleExtraService(req.params.id)
  res.json(new ApiResponse(200, { extraService },
    `Extra service ${extraService.isActive ? 'enabled' : 'disabled'} successfully`))
})

export {
  getActiveExtraServices,
  getAllExtraServices,
  createExtraService,
  updateExtraService,
  deleteExtraService,
  toggleExtraService,
}