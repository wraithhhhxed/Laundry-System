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
}