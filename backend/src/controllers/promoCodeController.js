import PromoCodeService from '../services/PromoCodeService.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const getAllPromoCodes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', isActive } = req.query
  const isActiveParsed = isActive === 'true' ? true : isActive === 'false' ? false : undefined
  const result = await PromoCodeService.getAllPromoCodes({
    page: Number(page), limit: Number(limit), search, isActive: isActiveParsed,
  })
  res.json(new ApiResponse(200, result, 'Promo codes fetched successfully'))
})

const getPromoCodeById = asyncHandler(async (req, res) => {
  const promoCode = await PromoCodeService.getPromoCodeById(req.params.id)
  res.json(new ApiResponse(200, promoCode, 'Promo code fetched successfully'))
})

const createPromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCodeService.createPromoCode(req.body)
  res.status(201).json(new ApiResponse(201, promoCode, 'Promo code created successfully'))
})

const updatePromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCodeService.updatePromoCode(req.params.id, req.body)
  res.json(new ApiResponse(200, promoCode, 'Promo code updated successfully'))
})

const deletePromoCode = asyncHandler(async (req, res) => {
  await PromoCodeService.deletePromoCode(req.params.id)
  res.json(new ApiResponse(200, null, 'Promo code deleted successfully'))
})

const togglePromoCode = asyncHandler(async (req, res) => {
  const promoCode = await PromoCodeService.togglePromoCode(req.params.id)
  res.json(new ApiResponse(200, promoCode,
    `Promo code ${promoCode.isActive ? 'activated' : 'deactivated'} successfully`
  ))
})

// POST /api/user/promo/validate — preview only, does NOT reserve usage
// Body: { code, orderSubtotal }
const validatePromoCode = asyncHandler(async (req, res) => {
  const { code, orderSubtotal } = req.body
  const result = await PromoCodeService.validateAndReservePromoCode(code, Number(orderSubtotal))

  // Release immediately — this endpoint is just for preview/UI feedback.
  // Actual reservation happens inside bookAppointment.
  await PromoCodeService.releasePromoCode(result.promoCodeId)

  res.json(new ApiResponse(200, result, 'Promo code applied successfully'))
})

export {
  getAllPromoCodes, getPromoCodeById,
  createPromoCode, updatePromoCode,
  deletePromoCode, togglePromoCode,
  validatePromoCode,
}