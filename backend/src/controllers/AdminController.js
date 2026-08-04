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
import AuditRepository from '../repositories/AuditRepository.js'
import AdminRepository from '../repositories/AdminRepository.js'

// ─── HELPERS ──────────────────────────────────────────────────────

const adminActor = (req) => ({
  userId: req.user?.id   ?? null,
  name:   req.user?.name ?? 'Super Admin',
  role:   req.user?.role ?? 'admin',
})

// ─── AUTH ─────────────────────────────────────────────────────────
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const admin = await AdminRepository.findByEmail(email)
  if (!admin || !admin.isActive)
    throw new ApiError(401, 'Invalid credentials')

  const isMatch = await bcrypt.compare(password, admin.password)
  if (!isMatch)
    throw new ApiError(401, 'Invalid credentials')

  const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })

  await AuditService.logLogin(
    { userId: admin.id, name: admin.name, role: 'admin' },
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  )

  res.json(new ApiResponse(200, { token }, 'Login successful'))
})

const logoutAdmin = asyncHandler(async (req, res) => {
  await AuditService.logLogout({
    userId: req.user?.id   ?? null,
    name:   req.user?.name ?? 'Super Admin',
    role:   req.user?.role ?? 'admin',
  })

  res.json(new ApiResponse(200, {}, 'Logged out successfully'))
})

// ─── BRANCHES ─────────────────────────────────────────────────────
const addBranch = asyncHandler(async (req, res) => {
  const branch = await branchService.addBranch(req.body, req.file)
  await AuditService.logBranchCreated(adminActor(req), branch)
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
    req.body.appointmentId, 'admin', null, adminActor(req)
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
    adminActor(req),
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

  await AuditService.logStatusChange(adminActor(req), appointment, fromStatus, status)

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
    adminActor(req)
  )

  res.json(new ApiResponse(200, { appointment: updated }, 'Actual weight confirmed by admin'))
})

// ─── CONFIRM PAYMENT (admin override) ────────────────────────────
const confirmPayment = asyncHandler(async (req, res) => {
  const { appointmentId, paymentMethod } = req.body
  if (!appointmentId || !paymentMethod)
    throw new ApiError(400, 'appointmentId and paymentMethod are required')

  const appointment = await appointmentService.confirmPayment(
    appointmentId, paymentMethod, adminActor(req)
  )
  res.json(new ApiResponse(200, { appointment }, 'Payment confirmed by admin'))
})

//  ARCHIVE APPOINTMENT (Super Admin)
const archiveAppointment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  if (!appointmentId) throw new ApiError(400, 'appointmentId is required')

  const appointment = await AppointmentRepository.findById(appointmentId)
  if (!appointment) throw new ApiError(404, 'Appointment not found')

  await appointmentService.archiveAppointment(
    appointmentId,
    appointment.branchId,  
    adminActor(req)
  )

  res.json(new ApiResponse(200, {}, 'Appointment archived successfully'))
})

// ─── WALK-IN QUICK ADD ────────
const createWalkInAppointment = asyncHandler(async (req, res) => {
  const {
    branchId,      
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
    email,
  } = req.body

  // ─── VALIDATIONS ──────────────────────────────────────────────
  if (!branchId)
    throw new ApiError(400, 'branchId is required')

  if (!phone || !services || !Array.isArray(services) || services.length === 0)
    throw new ApiError(400, 'phone and services (array) are required')

  if (fulfillmentMethod && !['SELF_PICKUP', 'DELIVERY'].includes(fulfillmentMethod))
    throw new ApiError(400, 'fulfillmentMethod must be SELF_PICKUP or DELIVERY')

  if (paymentMethod && !['CASH', 'ONLINE'].includes(paymentMethod))
    throw new ApiError(400, 'paymentMethod must be CASH or ONLINE')

  if (paymentMethod === 'ONLINE' && !email)
    throw new ApiError(400, 'email is required when paymentMethod is ONLINE')

  // ─── VERIFY BRANCH EXISTS ───────────────────────────────────────
  const branch = await BranchRepository.findById(branchId)
  if (!branch) throw new ApiError(404, 'Branch not found')

  // ─── CREATE APPOINTMENT ──────────────────────────────────────
  const appointment = await appointmentService.createWalkInAppointment(
    phone,
    guestName || null,
    branchId,                     
    slotTime || 'walk_in',
    services,
    overweightResolution || null,
    {
      specialInstructions,
      pickupAddress,
      deliveryAddress,
      preferredPaymentMethod: paymentMethod === 'ONLINE' ? 'online' : 'cash',
      email: paymentMethod === 'ONLINE' ? email : null,
    },
    addOns || [],
    adminActor(req),            
    fulfillmentMethod || 'SELF_PICKUP'
  )

  res.json(new ApiResponse(201, { appointment }, 'Walk-in appointment created successfully'))
})

// ─── WALK-IN PHONE LOOKUP (Super Admin) ───────────────────────────
const lookupPhone = asyncHandler(async (req, res) => {
  const { phone } = req.params
  const user = await appointmentService.lookupUserByPhone(phone)
  res.json(new ApiResponse(200, { user }))
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
  const {
    page = 1, limit = 20,
    action, branchId, actorName, actorRole, targetType,
    dateFrom, dateTo,
  } = req.query

  const data = await AuditRepository.findAll({
    page: Number(page), limit: Number(limit),
    action:     action     || undefined,
    branchId:   branchId   || undefined,
    actorName:  actorName  || undefined,
    actorRole:  actorRole  || undefined,
    targetType: targetType || undefined,
    dateFrom:   dateFrom   || undefined,
    dateTo:     dateTo     || undefined,
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
    adminActor(req), user,
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
    adminActor(req), user,
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
    adminActor(req), user,
    { isActive: !isActive },
    { isActive }
  )
  res.json(new ApiResponse(200, { user }, `User ${isActive ? 'activated' : 'deactivated'} successfully`))
})

const deleteUser = asyncHandler(async (req, res) => {
  const user = await UserRepository.deleteById(req.params.id)
  if (!user) throw new ApiError(404, 'User not found')
  await AuditService.logUserDeleted(adminActor(req), user)
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
    adminActor(req), branch,
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
    adminActor(req), updated,
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
  archiveAppointment,
  createWalkInAppointment, 
  lookupPhone,              

  getAllServices, addService, updateService, deleteService,

  getAllClothingTypes, addClothingType, updateClothingType, deleteClothingType,

  getAllKgRates, addKgRate, updateKgRate, deleteKgRate,

  getAuditLogs,
  getAllUsers, getUserById, addUser, updateUser, toggleUserStatus, deleteUser,

  getBranches, getBranchByIdAdmin, updateBranchAdmin,
  
  toggleBranchStatus, deleteBranchAdmin, resetBranchPassword,
  
  getAllExtraServices, getExtraServiceById, addExtraService,
  updateExtraService, toggleExtraServiceStatus, deleteExtraService,
}