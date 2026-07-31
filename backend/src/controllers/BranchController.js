import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import branchService from '../services/BranchService.js'
import appointmentService from '../services/AppointmentService.js'
import AuditService from '../services/AuditService.js'

// ─── AUTH ─────────────────────────────────────────────────────────
const loginBranch = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const token  = await branchService.login(email, password)
  const branch = await branchService.getProfileByEmail(email)

  await AuditService.logLogin(
    { userId: branch._id, name: branch.name, role: 'branchadmin' },
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  )

  res.json(new ApiResponse(200, { token }, 'Login successful'))
})

const logoutBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.getProfile(req.user.id)

  await AuditService.logLogout(
    { userId: branch._id, name: branch.name, role: 'branchadmin' }
  )

  res.json(new ApiResponse(200, {}, 'Logged out successfully'))
})

// ─── PROFILE ──────────────────────────────────────────────────────
const getBranchProfile = asyncHandler(async (req, res) => {
  const branch = await branchService.getProfile(req.user.id)
  res.json(new ApiResponse(200, { branch }))
})

const updateBranchProfile = asyncHandler(async (req, res) => {
  const branch = await branchService.updateProfile(req.user.id, req.body, req.file)
  res.json(new ApiResponse(200, { branch }, 'Profile updated'))
})

// ─── APPOINTMENTS ─────────────────────────────────────────────────
const getBranchAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAppointmentsByBranch(req.user.id)
  res.json(new ApiResponse(200, { appointments }))
})

const cancelAppointment = asyncHandler(async (req, res) => {
  const branch = await branchService.getProfile(req.user.id)
  const actor  = { userId: branch._id, name: branch.name, role: 'branchadmin' }
  await appointmentService.cancelAppointment(
    req.body.appointmentId, 'branch', req.user.id, actor
  )
  res.json(new ApiResponse(200, {}, 'Appointment cancelled'))
})

const completeAppointment = asyncHandler(async (req, res) => {
  await appointmentService.completeAppointment(req.body.appointmentId, req.user.id)
  res.json(new ApiResponse(200, {}, 'Appointment completed'))
})

const getBranchDashboard = asyncHandler(async (req, res) => {
  const dashData = await appointmentService.getBranchDashboardData(req.user.id)
  res.json(new ApiResponse(200, { dashData }))
})

const branchList = asyncHandler(async (req, res) => {
  const branches = await branchService.getAllBranches()
  res.json(new ApiResponse(200, { branches }))
})

const changeBranchAvailability = asyncHandler(async (req, res) => {
  const branch = await branchService.changeBranchAvailability(req.body.branchId)
  res.json(new ApiResponse(200, { branch }, 'Availability updated'))
})

const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const branch = await branchService.getProfile(req.user.id)
  const actor  = { userId: branch._id, name: branch.name, role: 'branchadmin' }
  await appointmentService.updateDeliveryStatus(
    req.body.appointmentId,
    req.user.id,
    req.body.status,
    actor
  )
  res.json(new ApiResponse(200, {}, 'Status updated'))
})

// ─── CONFIRM ACTUAL WEIGHT ────────────────────────────────────────
const confirmActualWeight = asyncHandler(async (req, res) => {
  const { appointmentId, actualServices } = req.body
  if (!appointmentId || !Array.isArray(actualServices) || actualServices.length === 0)
    throw new ApiError(400, 'appointmentId and actualServices are required')

  const branch = await branchService.getProfile(req.user.id)
  const actor  = { userId: branch._id, name: branch.name, role: 'branchadmin' }

  const appointment = await appointmentService.confirmActualWeight(
    appointmentId,
    req.user.id,
    actualServices,
    actor
  )

  res.json(new ApiResponse(200, { appointment }, 'Actual weight confirmed. Client notified of final amount.'))
})

// ─── CONFIRM PAYMENT ─────────────────────────────────────────────
const confirmPayment = asyncHandler(async (req, res) => {
  const { appointmentId, paymentMethod } = req.body
  if (!appointmentId || !paymentMethod)
    throw new ApiError(400, 'appointmentId and paymentMethod are required')

  const branch = await branchService.getProfile(req.user.id)
  const actor  = { userId: branch._id, name: branch.name, role: 'branchadmin' }

  const appointment = await appointmentService.confirmPayment(
    appointmentId, paymentMethod, actor
  )

  res.json(new ApiResponse(200, { appointment }, 'Payment confirmed'))
})

// ─── WALK-IN QUICK ADD ────────────────────────────────────────────
const createWalkInAppointment = asyncHandler(async (req, res) => {
  const {
    phone,
    guestName,
    slotTime,
    services,
    addOns,
    overweightResolution,
    specialInstructions,
    pickupAddress,
    deliveryAddress,
    fulfillmentMethod,
    paymentMethod,   // ← BAGO
    email,           // ← BAGO
  } = req.body

  // ─── VALIDATIONS ──────────────────────────────────────────────
  if (!phone || !services || !Array.isArray(services) || services.length === 0)
    throw new ApiError(400, 'phone and services (array) are required')

  if (fulfillmentMethod && !['SELF_PICKUP', 'DELIVERY'].includes(fulfillmentMethod))
    throw new ApiError(400, 'fulfillmentMethod must be SELF_PICKUP or DELIVERY')

  // ✅ BAGONG VALIDATIONS para sa paymentMethod at email
  if (paymentMethod && !['CASH', 'ONLINE'].includes(paymentMethod))
    throw new ApiError(400, 'paymentMethod must be CASH or ONLINE')
  
  if (paymentMethod === 'ONLINE' && !email)
    throw new ApiError(400, 'email is required when paymentMethod is ONLINE')

  // ─── CREATE APPOINTMENT ──────────────────────────────────────
  const branch = await branchService.getProfile(req.user.id)
  const actor  = { userId: branch._id, name: branch.name, role: 'branchadmin' }

  const appointment = await appointmentService.createWalkInAppointment(
    phone,
    guestName || null,
    req.user.id,
    slotTime || 'walk_in',
    services,
    overweightResolution || null,
    {
      specialInstructions,
      pickupAddress,
      deliveryAddress,
      // ✅ BAGONG MGA FIELD
      preferredPaymentMethod: paymentMethod === 'ONLINE' ? 'online' : 'cash',
      email: paymentMethod === 'ONLINE' ? email : null,
    },
    addOns || [],
    actor,
    fulfillmentMethod || 'SELF_PICKUP'
  )

  res.json(new ApiResponse(201, { appointment }, 'Walk-in appointment created successfully'))
})

// ─── WALK-IN PHONE LOOKUP ─────────────────────────────────────────
const lookupPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params
  const user = await appointmentService.lookupUserByPhone(phone)
  res.json(new ApiResponse(200, { user }))
})

// ⭐ ARCHIVE APPOINTMENT - SIMPLE
const archiveAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  
  if (!appointmentId) {
    throw new ApiError(400, 'appointmentId is required')
  }

  const branch = await branchService.getProfile(req.user.id)
  const actor = { userId: branch._id, name: branch.name, role: 'branchadmin' }

  await appointmentService.archiveAppointment(
    appointmentId,
    req.user.id,
    actor
  )

  res.json(new ApiResponse(200, {}, 'Appointment archived successfully'))
})

export {
  loginBranch,
  logoutBranch,
  getBranchProfile,
  updateBranchProfile,
  getBranchAppointments,
  cancelAppointment,
  completeAppointment,
  getBranchDashboard,
  branchList,
  changeBranchAvailability,
  updateDeliveryStatus,
  confirmActualWeight,
  confirmPayment,
  createWalkInAppointment,
  lookupPhone,
  archiveAppointment,
}