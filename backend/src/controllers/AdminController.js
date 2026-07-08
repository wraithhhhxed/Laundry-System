import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import branchService from '../services/BranchService.js'
import appointmentService from '../services/AppointmentService.js'
import serviceService from '../services/ServiceService.js'
import clothingTypeService from '../services/ClothingTypeService.js'
import kgRateService from '../services/KgRateService.js'
import AppointmentRepository from '../repositories/AppointmentRepository.js'
import AuditService from '../services/AuditService.js'
import UserRepository from '../repositories/UserRepository.js'
import BranchRepository from '../repositories/BranchRepository.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import extraServiceService from '../services/ExtraServiceService.js'

// ─── HELPERS ──────────────────────────────────────────────────────
const adminActor = () => ({
  userId: null,
  name:   'Super Admin',
  role:   'superadmin',
})

// ─── AUTH ─────────────────────────────────────────────────────────
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD)
    throw new ApiError(401, 'Invalid credentials')
  const token = jwt.sign({ id: email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })

  await AuditService.logLogin(
    { name: 'Super Admin', role: 'superadmin', userId: null },
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  )

  res.json(new ApiResponse(200, { token }, 'Login successful'))
})

const logoutAdmin = asyncHandler(async (req, res) => {
  await AuditService.logLogout({ name: 'Super Admin', role: 'superadmin', userId: null })

  res.json(new ApiResponse(200, {}, 'Logged out successfully'))
})

// ─── BRANCHES ─────────────────────────────────────────────────────
const addBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.addBranch(req.body, req.file)
  await AuditService.logBranchCreated(adminActor(), branch)
  res.json(new ApiResponse(201, { branch }, 'Branch added'))
})

const allBranches = asyncHandler(async (req, res) => {
  const branches = await branchService.getAllBranches()
  res.json(new ApiResponse(200, { branches }))
})

const changeBranchAvailability = asyncHandler(async (req, res) => {
  const branch = await branchService.changeBranchAvailability(req.body.branchId)
  res.json(new ApiResponse(200, { branch }, 'Availability updated'))
})

// ─── APPOINTMENTS ─────────────────────────────────────────────────
const allAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAllAppointments()
  res.json(new ApiResponse(200, { appointments }))
})

const cancelAppointment = asyncHandler(async (req, res) => {
  await appointmentService.cancelAppointment(
    req.body.appointmentId, 'admin', null, adminActor()
  )
  res.json(new ApiResponse(200, {}, 'Appointment cancelled'))
})

const adminDashboard = asyncHandler(async (req, res) => {
  const dashData = await appointmentService.getDashboardData()
  res.json(new ApiResponse(200, { dashData }))
})

const approveBooking = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  const appointment = await AppointmentRepository.findById(appointmentId)
  if (!appointment) throw new ApiError(404, 'Appointment not found')
  if (appointment.deliveryStatus !== 'pending_approval')
    throw new ApiError(400, 'Appointment is not pending approval')

  await AppointmentRepository.updateById(appointmentId, { deliveryStatus: 'approved' })

  await AuditService.logStatusChange(
    adminActor(),
    appointment,
    'pending_approval',
    'approved'
  )

  res.json(new ApiResponse(200, {}, 'Booking approved'))
})

const approvePayment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  const appointment = await AppointmentRepository.findById(appointmentId)
  if (!appointment) throw new ApiError(404, 'Appointment not found')
  await AppointmentRepository.updateById(appointmentId, { payment: true })
  res.json(new ApiResponse(200, {}, 'Payment approved'))
})

const VALID_DELIVERY_STATUSES = [
  'pending_approval', 'approved', 'picked_up',
  'in_progress', 'out_for_delivery', 'delivered',
]

const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { appointmentId, status } = req.body
  if (!appointmentId || !status)
    throw new ApiError(400, 'appointmentId and status are required')
  if (!VALID_DELIVERY_STATUSES.includes(status))
    throw new ApiError(400, `Invalid status: ${status}`)

  const appointment = await AppointmentRepository.findById(appointmentId)
  if (!appointment) throw new ApiError(404, 'Appointment not found')

  const fromStatus = appointment.deliveryStatus
  await AppointmentRepository.updateDeliveryStatus(appointmentId, status)

  await AuditService.logStatusChange(adminActor(), appointment, fromStatus, status)

  res.json(new ApiResponse(200, {}, 'Delivery status updated'))
})

// ─── CONFIRM ACTUAL WEIGHT (admin override) ───────────────────────
const confirmActualWeight = asyncHandler(async (req, res) => {
  const { appointmentId, actualServices } = req.body
  if (!appointmentId || !Array.isArray(actualServices) || actualServices.length === 0)
    throw new ApiError(400, 'appointmentId and actualServices are required')

  const appointment = await AppointmentRepository.findById(appointmentId)
  if (!appointment) throw new ApiError(404, 'Appointment not found')

  const updated = await appointmentService.confirmActualWeight(
    appointmentId,
    appointment.branchId.toString(),
    actualServices,
    adminActor()
  )

  res.json(new ApiResponse(200, { appointment: updated }, 'Actual weight confirmed by admin'))
})

// ─── CONFIRM PAYMENT (admin override) ────────────────────────────
const confirmPayment = asyncHandler(async (req, res) => {
  const { appointmentId, paymentMethod } = req.body
  if (!appointmentId || !paymentMethod)
    throw new ApiError(400, 'appointmentId and paymentMethod are required')

  const appointment = await appointmentService.confirmPayment(
    appointmentId, paymentMethod, adminActor()
  )
  res.json(new ApiResponse(200, { appointment }, 'Payment confirmed by admin'))
})

// ─── SERVICES ─────────────────────────────────────────────────────
const getAllServices = asyncHandler(async (req, res) => {
  const services = await serviceService.getAllServices()
  res.json(new ApiResponse(200, { services }))
})

const addService = asyncHandler(async (req, res) => {
  const service = await serviceService.addService(req.body, req.file)
  res.json(new ApiResponse(201, { service }, 'Service added'))
})

const updateService = asyncHandler(async (req, res) => {
  const service = await serviceService.updateService(req.params.id, req.body, req.file)
  res.json(new ApiResponse(200, { service }, 'Service updated'))
})

const deleteService = asyncHandler(async (req, res) => {
  await serviceService.deleteService(req.params.id)
  res.json(new ApiResponse(200, {}, 'Service deleted'))
})

// ─── CLOTHING TYPES ───────────────────────────────────────────────
const getAllClothingTypes = asyncHandler(async (req, res) => {
  const clothingTypes = await clothingTypeService.getAllClothingTypes()
  res.json(new ApiResponse(200, { clothingTypes }))
})

const addClothingType = asyncHandler(async (req, res) => {
  const clothingType = await clothingTypeService.addClothingType(req.body)
  res.json(new ApiResponse(201, { clothingType }, 'Clothing type added'))
})

const updateClothingType = asyncHandler(async (req, res) => {
  const clothingType = await clothingTypeService.updateClothingType(req.params.id, req.body)
  res.json(new ApiResponse(200, { clothingType }, 'Clothing type updated'))
})

const deleteClothingType = asyncHandler(async (req, res) => {
  await clothingTypeService.deleteClothingType(req.params.id)
  res.json(new ApiResponse(200, {}, 'Clothing type deleted'))
})

// ─── KG RATES ─────────────────────────────────────────────────────
const getAllKgRates = asyncHandler(async (req, res) => {
  const kgRates = await kgRateService.getAllKgRates()
  res.json(new ApiResponse(200, { kgRates }))
})

const addKgRate = asyncHandler(async (req, res) => {
  const kgRate = await kgRateService.addKgRate(req.body)
  res.json(new ApiResponse(201, { kgRate }, 'KG rate added'))
})

const updateKgRate = asyncHandler(async (req, res) => {
  const kgRate = await kgRateService.updateKgRate(req.params.id, req.body)
  res.json(new ApiResponse(200, { kgRate }, 'KG rate updated'))
})

const deleteKgRate = asyncHandler(async (req, res) => {
  await kgRateService.deleteKgRate(req.params.id)
  res.json(new ApiResponse(200, {}, 'KG rate deleted'))
})

// ─── AUDIT LOGS ───────────────────────────────────────────────────
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, actorModel, action, search } = req.query
  const data = await AuditLogService.getLogs({
    page: Number(page), limit: Number(limit),
    actorModel: actorModel || undefined,
    action: action || undefined,
    search: search || undefined
  })
  res.json(new ApiResponse(200, data))
})

// ─── USER MAINTENANCE ─────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, search, isActive } = req.query
  const data = await UserRepository.findAllPaginated({
    page: Number(page), limit: Number(limit),
    search: search || undefined,
    isActive: isActive !== undefined ? isActive === 'true' : undefined
  })
  res.json(new ApiResponse(200, data))
})

const getUserById = asyncHandler(async (req, res) => {
  const user = await UserRepository.findById(req.params.id)
  if (!user) throw new ApiError(404, 'User not found')
  res.json(new ApiResponse(200, { user }))
})

const addUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, address } = req.body

  if (!name || !email || !password)
    throw new ApiError(400, 'Name, email, and password are required')
  if (password.length < 8)
    throw new ApiError(400, 'Password must be at least 8 characters')

  const exists = await UserRepository.findByEmail(email)
  if (exists) throw new ApiError(409, 'Email already registered')

  const salt           = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  const payload = { name, email, phone, password: hashedPassword, address }

  if (req.file) {
    payload.image = await uploadToCloudinary(req.file.buffer, 'laundry-app/users')
  }

  const user = await UserRepository.create(payload)

  await AuditService.logUserUpdated(
    adminActor(), user,
    {},
    { name, email }
  )

  res.json(new ApiResponse(201, { user }, 'User created successfully'))
})

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, address } = req.body
  const before = await UserRepository.findById(req.params.id)
  const user   = await UserRepository.updateById(req.params.id, { name, email, phone, address })
  if (!user) throw new ApiError(404, 'User not found')
  await AuditService.logUserUpdated(
    adminActor(), user,
    { name: before.name, email: before.email },
    { name, email }
  )
  res.json(new ApiResponse(200, { user }, 'User updated successfully'))
})

const toggleUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body
  const user = await UserRepository.setActive(req.params.id, isActive)
  if (!user) throw new ApiError(404, 'User not found')
  await AuditService.logUserUpdated(
    adminActor(), user,
    { isActive: !isActive },
    { isActive }
  )
  res.json(new ApiResponse(200, { user }, `User ${isActive ? 'activated' : 'deactivated'} successfully`))
})

const deleteUser = asyncHandler(async (req, res) => {
  const user = await UserRepository.deleteById(req.params.id)
  if (!user) throw new ApiError(404, 'User not found')
  await AuditService.logUserDeleted(adminActor(), user)
  res.json(new ApiResponse(200, {}, 'User deleted successfully'))
})

// ─── BRANCH MAINTENANCE ───────────────────────────────────────────
const getBranches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, search, available } = req.query
  const data = await BranchRepository.findAllPaginated({
    page: Number(page), limit: Number(limit),
    search: search || undefined,
    available: available !== undefined ? available === 'true' : undefined,
  })
  res.json(new ApiResponse(200, data))
})

const getBranchByIdAdmin = asyncHandler(async (req, res) => {
  const branch = await BranchRepository.findById(req.params.id)
  if (!branch) throw new ApiError(404, 'Branch not found')
  res.json(new ApiResponse(200, { branch }))
})

const updateBranchAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, speciality, about, address } = req.body
  const before = await BranchRepository.findById(req.params.id)
  if (!before) throw new ApiError(404, 'Branch not found')
 
  const branch = await branchService.updateBranch(req.params.id, {
    name, email, phone, speciality, about, address
  })
 
  await AuditService.logBranchUpdated(
    adminActor(), branch,
    { name: before.name, email: before.email },
    { name, email }
  )
  res.json(new ApiResponse(200, { branch }, 'Branch updated successfully'))
})

const toggleBranchStatus = asyncHandler(async (req, res) => {
  const branch = await BranchRepository.findById(req.params.id)
  if (!branch) throw new ApiError(404, 'Branch not found')
  const updated = await BranchRepository.updateById(req.params.id, { available: !branch.available })
  await AuditService.logBranchUpdated(
    adminActor(), updated,
    { available: branch.available },
    { available: updated.available }
  )
  res.json(new ApiResponse(200, { branch: updated },
    `Branch ${updated.available ? 'activated' : 'deactivated'} successfully`))
})

const deleteBranchAdmin = asyncHandler(async (req, res) => {
  const branch = await BranchRepository.deleteById(req.params.id)
  if (!branch) throw new ApiError(404, 'Branch not found')
  res.json(new ApiResponse(200, {}, 'Branch deleted successfully'))
})

const resetBranchPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 8)
    throw new ApiError(400, 'Password must be at least 8 characters')
  const branch = await BranchRepository.findById(req.params.id)
  if (!branch) throw new ApiError(404, 'Branch not found')
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)
  await BranchRepository.updateById(req.params.id, { password: hashedPassword })
  res.json(new ApiResponse(200, {}, 'Branch password reset successfully'))
})

// ─── EXTRA SERVICES MAINTENANCE ───────────────────────────────────
const getAllExtraServices = asyncHandler(async (req, res) => {
  const extraServices = await extraServiceService.getAllExtraServices()
  res.json(new ApiResponse(200, { extraServices }))
})

const getExtraServiceById = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.getExtraServiceById(req.params.id)
  res.json(new ApiResponse(200, { extraService }))
})

const addExtraService = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.createExtraService(req.body)
  res.json(new ApiResponse(201, { extraService }, 'Extra service added'))
})

const updateExtraService = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.updateExtraService(req.params.id, req.body)
  res.json(new ApiResponse(200, { extraService }, 'Extra service updated'))
})

const toggleExtraServiceStatus = asyncHandler(async (req, res) => {
  const extraService = await extraServiceService.toggleExtraService(req.params.id)
  res.json(new ApiResponse(200, { extraService },
    `Extra service ${extraService.isActive ? 'enabled' : 'disabled'} successfully`))
})

const deleteExtraService = asyncHandler(async (req, res) => {
  await extraServiceService.deleteExtraService(req.params.id)
  res.json(new ApiResponse(200, {}, 'Extra service deleted'))
})

export {
  loginAdmin, logoutAdmin,
  addBranch, allBranches, changeBranchAvailability,
  allAppointments, cancelAppointment, adminDashboard, approveBooking, approvePayment,
  updateDeliveryStatus,
  confirmActualWeight, confirmPayment,
  getAllServices, addService, updateService, deleteService,
  getAllClothingTypes, addClothingType, updateClothingType, deleteClothingType,
  getAllKgRates, addKgRate, updateKgRate, deleteKgRate,
  getAuditLogs,
  getAllUsers, getUserById, addUser, updateUser, toggleUserStatus, deleteUser,
  getBranches, getBranchByIdAdmin, updateBranchAdmin,
  toggleBranchStatus, deleteBranchAdmin, resetBranchPassword,
  // Extra Services Maintenance
  getAllExtraServices, getExtraServiceById, addExtraService,
  updateExtraService, toggleExtraServiceStatus, deleteExtraService,
}