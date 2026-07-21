import express from 'express'
import upload from '../middlewares/multer.js'
import { protect } from '../middlewares/auth.middleware.js'
import {
  registerUser,
  loginUser, logoutUser,
  getUserProfile,
  updateUserProfile,
  bookAppointment,
  listAppointments,
  cancelAppointment,
  requestRefund,
  resolveOverweight,
  createPaymentLink,
  verifyPayment,
  getActiveServices,
  getActiveClothingTypes,
  getActiveKgRates,
  googleAuthUser,
  changePassword,
  setPassword,
  forgotPassword,
  resetPassword,
} from '../controllers/UserController.js'
import { branchList } from '../controllers/BranchController.js'
import { validatePromoCode } from '../controllers/promoCodeController.js'

const userRouter = express.Router()

// ─── Public ───────────────────────────────────────────────────────
userRouter.post('/register',    registerUser)
userRouter.post('/login',       loginUser)
userRouter.post('/google-auth', googleAuthUser)
userRouter.get('/branches',     branchList)
userRouter.post('/forgot-password',         forgotPassword)
userRouter.post('/reset-password/:token',   resetPassword)

// ─── Public: Booking Options ──────────────────────────────────────
userRouter.get('/services',       getActiveServices)
userRouter.get('/clothing-types', getActiveClothingTypes)
userRouter.get('/kg-rates',       getActiveKgRates)

// ─── Protected ────────────────────────────────────────────────────
userRouter.get('/get-profile',         protect('user'), getUserProfile)
userRouter.post('/update-profile',     protect('user'), upload.single('image'), updateUserProfile)
userRouter.post('/book-appointment',   protect('user'), bookAppointment)
userRouter.get('/appointments',        protect('user'), listAppointments)
userRouter.post('/cancel-appointment', protect('user'), cancelAppointment)
userRouter.post('/request-refund',     protect('user'), requestRefund)
userRouter.post('/resolve-overweight', protect('user'), resolveOverweight)
userRouter.post('/create-payment',     protect('user'), createPaymentLink)
userRouter.post('/verify-payment',     protect('user'), verifyPayment)
userRouter.post('/logout',             protect('user'), logoutUser)
userRouter.post('/change-password',    protect('user'), changePassword)
userRouter.post('/set-password',       protect('user'), setPassword)

// ─── Promo Codes ──────────────────────────────────────────────────
userRouter.post('/promo/validate',     protect('user'), validatePromoCode)

export default userRouter