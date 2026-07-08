import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import userService from '../services/UserService.js'
import appointmentService from '../services/AppointmentService.js'
import serviceService from '../services/ServiceService.js'
import clothingTypeService from '../services/ClothingTypeService.js'
import kgRateService from '../services/KgRateService.js'
import AuditService from '../services/AuditService.js'
import { ApiError } from '../utils/apiError.js'

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body
  const token = await userService.register(name, email, password, phone, address)
  res.json(new ApiResponse(201, { token }, 'Registration successful'))
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const token = await userService.login(email, password)
  const user  = await userService.getProfileByEmail(email)

  await AuditService.logLogin(
    { userId: user._id, name: user.name, role: 'client' },
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  )

  res.json(new ApiResponse(200, { token }, 'Login successful'))
})

const logoutUser = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id)

  await AuditService.logLogout(
    { userId: user._id, name: user.name, role: 'client' }
  )

  res.json(new ApiResponse(200, {}, 'Logged out successfully'))
})

const getUserProfile = asyncHandler(async (req, res) => {
  const userData = await userService.getProfile(req.user.id)
  res.json(new ApiResponse(200, { userData }))
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const userData = await userService.updateProfile(req.user.id, req.body, req.file)
  res.json(new ApiResponse(200, { userData }, 'Profile updated'))
})

const bookAppointment = asyncHandler(async (req, res) => {
  const {
    branchId, slotDate, slotTime,
    services, addOns,
    specialInstructions, pickupAddress, deliveryAddress,
    promoCode, preferredPaymentMethod,
  } = req.body

  const user  = await userService.getProfile(req.user.id)
  const actor = { userId: user._id, name: user.name, role: 'client' }

  await appointmentService.bookAppointment(
    req.user.id,
    branchId,
    slotDate,
    slotTime,
    services || [],
    {
      specialInstructions,
      pickupAddress,
      deliveryAddress,
      preferredPaymentMethod: preferredPaymentMethod || 'cash',
    },
    promoCode || null,
    addOns    || [],
    actor
  )

  res.json(new ApiResponse(201, {}, 'Appointment booked successfully'))
})

const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.getAppointmentsByUser(req.user.id)
  res.json(new ApiResponse(200, { appointments }))
})

const cancelAppointment = asyncHandler(async (req, res) => {
  const user  = await userService.getProfile(req.user.id)
  const actor = { userId: user._id, name: user.name, role: 'client' }
  await appointmentService.cancelAppointment(
    req.body.appointmentId, 'user', req.user.id, actor
  )
  res.json(new ApiResponse(200, {}, 'Appointment cancelled'))
})

const requestRefund = asyncHandler(async (req, res) => {
  const { appointmentId, reason, note } = req.body
  await appointmentService.requestRefund(appointmentId, req.user.id, reason, note)
  res.json(new ApiResponse(200, {}, 'Refund request submitted successfully'))
})

const createPaymentLink = asyncHandler(async (req, res) => {
  const { checkoutUrl, sessionId } = await userService.createPaymentLink(req.body.appointmentId)
  res.json(new ApiResponse(200, { checkoutUrl, sessionId }))
})

const verifyPayment = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body
  const paid = await userService.verifyPayment(appointmentId)
  res.json(new ApiResponse(200, { paid }, paid ? 'Payment verified' : 'Payment pending'))
})

const getActiveServices = asyncHandler(async (req, res) => {
  const services = await serviceService.getActiveServices()
  res.json(new ApiResponse(200, { services }))
})

const getActiveClothingTypes = asyncHandler(async (req, res) => {
  const clothingTypes = await clothingTypeService.getActiveClothingTypes()
  res.json(new ApiResponse(200, { clothingTypes }))
})

const getActiveKgRates = asyncHandler(async (req, res) => {
  const kgRates = await kgRateService.getActiveKgRates()
  res.json(new ApiResponse(200, { kgRates }))
})

const googleAuthUser = asyncHandler(async (req, res) => {
  const { idToken } = req.body
  const token = await userService.googleAuth(idToken)
  res.json(new ApiResponse(200, { token }, 'Google login successful'))
})

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  await userService.changePassword(req.user.id, oldPassword, newPassword)
  res.json(new ApiResponse(200, {}, 'Password changed successfully'))
})

const setPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body
  await userService.setPassword(req.user.id, newPassword)
  res.json(new ApiResponse(200, {}, 'Password set successfully'))
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) throw new ApiError(400, 'Email is required.')
  await userService.forgotPassword(email)
  res.json(new ApiResponse(200, {}, 'Reset link sent to your email.'))
})

const resetPassword = asyncHandler(async (req, res) => {
  const { token }    = req.params
  const { password } = req.body
  if (!password)          throw new ApiError(400, 'New password is required.')
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters.')
  await userService.resetPassword(token, password)
  res.json(new ApiResponse(200, {}, 'Password reset successfully.'))
})

export {
  forgotPassword, resetPassword,
  registerUser, loginUser, logoutUser,
  getUserProfile, updateUserProfile,
  bookAppointment, listAppointments,
  cancelAppointment, requestRefund,
  createPaymentLink, verifyPayment,
  getActiveServices, getActiveClothingTypes, getActiveKgRates,
  googleAuthUser,
  changePassword, setPassword,
}