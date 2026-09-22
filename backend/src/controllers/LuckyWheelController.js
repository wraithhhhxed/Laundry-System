import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import LuckyWheelService from '../services/LuckyWheelService.js'

// ─── HELPERS ──────────────────────────────────────────────────────
const adminActor = (req) => ({
  userId: req.user?.id   ?? null,
  name:   req.user?.name ?? 'Super Admin',
  role:   req.user?.role ?? 'admin',
})

const userActor = (req) => ({
  userId: req.user?.id ?? null,
  name:   req.user?.name ?? 'User',
  role:   'user',
})

// ─── SUPER ADMIN: Get & Update Setup ──────────────────────────────
const getWheelSetup = asyncHandler(async (req, res) => {
  const setup = await LuckyWheelService.getSetup()
  res.json(new ApiResponse(200, { setup }, 'Lucky wheel setup retrieved'))
})

const updateWheelSetup = asyncHandler(async (req, res) => {
  const { availableServices, discountAmount, bagPrizeName } = req.body

  if (!Array.isArray(availableServices))
    throw new ApiError(400, 'availableServices must be an array of service names')

  if (discountAmount !== undefined && discountAmount <= 0)
    throw new ApiError(400, 'discountAmount must be > 0')

  const setup = await LuckyWheelService.updateSetup({
    availableServices: availableServices || undefined,
    discountAmount: discountAmount || undefined,
    bagPrizeName: bagPrizeName || undefined,
  })

  res.json(new ApiResponse(200, { setup }, 'Lucky wheel setup updated'))
})

// ─── USER: Spin the Wheel (at 20th stamp) ────────────────────────
const spinWheel = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'User not authenticated')

  const { spin, slotNumber, prizeType } = await LuckyWheelService.spinWheel(userId)

  res.json(new ApiResponse(200, 
    { spin, slotNumber, prizeType }, 
    'Wheel spun successfully!'
  ))
})

// ─── USER: Pick Prize (after spin) ───────────────────────────────
const pickPrize = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'User not authenticated')

  const { spinId, selectedValue } = req.body
  if (!spinId) throw new ApiError(400, 'spinId is required')

  const updatedSpin = await LuckyWheelService.pickPrize(spinId, userId, selectedValue)

  res.json(new ApiResponse(200, { spin: updatedSpin }, 'Prize selected successfully'))
})

// ─── USER: Get Unredeemed Spins ──────────────────────────────────
const getUnredeemedSpins = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'User not authenticated')

  const spins = await LuckyWheelService.getUserUnredeemedSpins(userId)

  res.json(new ApiResponse(200, { spins }, 'Unredeemed spins retrieved'))
})

// ─── USER: Get All Spins (history) ──────────────────────────────
const getAllSpins = asyncHandler(async (req, res) => {
  const userId = req.user?.id
  if (!userId) throw new ApiError(401, 'User not authenticated')

  const spins = await LuckyWheelService.getUserAllSpins(userId)

  res.json(new ApiResponse(200, { spins }, 'All spins retrieved'))
})

// ─── BRANCH STAFF: Redeem Spin ──────────────────────────────────
const redeemSpin = asyncHandler(async (req, res) => {
  const { spinId } = req.body
  if (!spinId) throw new ApiError(400, 'spinId is required')

  const staffId = req.user?.id
  if (!staffId) throw new ApiError(401, 'Staff not authenticated')

  const redeemed = await LuckyWheelService.redeemSpin(spinId, staffId)

  res.json(new ApiResponse(200, { spin: redeemed }, 'Spin redeemed successfully'))
})

export {
  getWheelSetup, updateWheelSetup,
  spinWheel, pickPrize,
  getUnredeemedSpins, getAllSpins,
  redeemSpin,
}