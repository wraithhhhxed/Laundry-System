import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import branchService from '../services/BranchService.js'
import appointmentService from '../services/AppointmentService.js'
import AuditService from '../services/AuditService.js'
import branchStaffService from '../services/BranchStaffService.js'

// ─── AUTH ─────────────────────────────────────────────────────────

const logoutBranch = asyncHandler(async (req, res) => {
  // Use req.user directly instead of fetching branch again
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }

  await AuditService.logLogout(actor)

  res.json(new ApiResponse(200, {}, 'Logged out successfully'))
})

// ─── PROFILE ──────────────────────────────────────────────────────
const getBranchProfile = asyncHandler(async (req, res) => {
  const branch = await branchService.getProfile(req.user.branchId)
  res.json(new ApiResponse(200, { branch }))
})

const updateBranchProfile = asyncHandler(async (req, res) => {
  // Use req.user.branchId for branch lookup
  const branch = await branchService.updateProfile(req.user.branchId, req.body, req.file)
  res.json(new ApiResponse(200, { branch }, 'Profile updated'))
})

// ─── APPOINTMENTS ─────────────────────────────────────────────────
const getBranchAppointments = asyncHandler(async (req, res) => {
  // Pass req.user.branchId as branchId parameter
  const appointments = await appointmentService.getAppointmentsByBranch(req.user.branchId)
  res.json(new ApiResponse(200, { appointments }))
})

const cancelAppointment = asyncHandler(async (req, res) => {
  // Use req.user directly for actor
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }
  await appointmentService.cancelAppointment(
    req.body.appointmentId, 'branch', req.user.branchId, actor
  )
  res.json(new ApiResponse(200, {}, 'Appointment cancelled'))
})

const completeAppointment = asyncHandler(async (req, res) => {
  // Pass req.user.branchId as branchId parameter
  await appointmentService.completeAppointment(req.body.appointmentId, req.user.branchId)
  res.json(new ApiResponse(200, {}, 'Appointment completed'))
})

const getBranchDashboard = asyncHandler(async (req, res) => {
  // Pass req.user.branchId as branchId parameter
  const dashData = await appointmentService.getBranchDashboardData(req.user.branchId)
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
  // Use req.user directly for actor
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }
  await appointmentService.updateDeliveryStatus(
    req.body.appointmentId,
    req.user.branchId,
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

  // Use req.user directly for actor
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }

  const appointment = await appointmentService.confirmActualWeight(
    appointmentId,
    req.user.branchId,
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

  // Use req.user directly for actor
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }

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
    paymentMethod,
  } = req.body

  // ─── VALIDATIONS ──────────────────────────────────────────────
  if (!phone || !services || !Array.isArray(services) || services.length === 0)
    throw new ApiError(400, 'phone and services (array) are required')

  if (fulfillmentMethod && !['SELF_PICKUP', 'DELIVERY'].includes(fulfillmentMethod))
    throw new ApiError(400, 'fulfillmentMethod must be SELF_PICKUP or DELIVERY')

  if (paymentMethod && !['CASH', 'ONLINE'].includes(paymentMethod))
    throw new ApiError(400, 'paymentMethod must be CASH or ONLINE')

  // ─── CREATE APPOINTMENT ──────────────────────────────────────
  // Use req.user directly for actor instead of fetching branch
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }

  const appointment = await appointmentService.createWalkInAppointment(
    phone,
    guestName || null,
    req.user.branchId, // Use req.user.branchId
    slotTime || 'walk_in',
    services,
    overweightResolution || null,
    {
      specialInstructions,
      pickupAddress,
      deliveryAddress,
      preferredPaymentMethod: paymentMethod === 'ONLINE' ? 'online' : 'cash',
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

// ARCHIVE APPOINTMENT - SIMPLE
const archiveAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  
  if (!appointmentId) {
    throw new ApiError(400, 'appointmentId is required')
  }

  // Use req.user directly for actor
  const actor = { 
    userId: req.user.id, 
    name: req.user.name, 
    role: req.user.staffRole === 'BRANCH_ADMIN' ? 'branchadmin' : 'branchstaff' 
  }

  await appointmentService.archiveAppointment(
    appointmentId,
    req.user.branchId,
    actor
  )

  res.json(new ApiResponse(200, {}, 'Appointment archived successfully'))
})

// ─── STAFF MANAGEMENT (Branch Admin only) ─────────────────────────
const addStaff = asyncHandler(async (req, res) => {
  if (req.user.staffRole !== 'BRANCH_ADMIN')
    throw new ApiError(403, 'Only Branch Admins can add staff')

  const staff = await branchStaffService.createStaff(
    { role: 'branch', branchId: req.user.branchId },
    req.body
  )

  res.json(new ApiResponse(201, { staff }, 'Staff added successfully'))
})

const getBranchStaff = asyncHandler(async (req, res) => {
  const staff = await branchStaffService.listByBranch(req.user.branchId)
  res.json(new ApiResponse(200, { staff }))
})

const deleteStaff = asyncHandler(async (req, res) => {
  if (req.user.staffRole !== 'BRANCH_ADMIN')
    throw new ApiError(403, 'Only Branch Admins can delete staff')

  const staff = await branchStaffService.deleteStaff(
    { role: 'branch', branchId: req.user.branchId },
    req.params.id
  )

  res.json(new ApiResponse(200, {}, `${staff.firstName} ${staff.lastName} removed successfully`))
})

// ─── QR PAYMENT (WALK-IN) ─────────────────────────────────────────
const generateQrPayment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params   // ← from params (fixed)
  if (!appointmentId)
    throw new ApiError(400, 'appointmentId is required')

  const { qrImageUrl, paymentIntentId } = await appointmentService.generateWalkInQrPayment(appointmentId)
  
  res.json(new ApiResponse(200, { qrImageUrl, paymentIntentId }, 'QR code generated successfully'))
})

const getQrPaymentStatus = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params
  if (!appointmentId)
    throw new ApiError(400, 'appointmentId is required')

  const result = await appointmentService.checkQrPaymentStatus(appointmentId)
  
  res.json(new ApiResponse(200, result))
})

export {
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

  addStaff,
  getBranchStaff,
  deleteStaff,

  generateQrPayment,
  getQrPaymentStatus,
}