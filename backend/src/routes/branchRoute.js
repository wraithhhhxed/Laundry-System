import express from 'express'
import upload from '../middlewares/multer.js'
import { protect } from '../middlewares/auth.middleware.js'
import {
  loginBranch, logoutBranch,
  getBranchProfile,
  updateBranchProfile,
  getBranchAppointments,
  cancelAppointment,
  completeAppointment,
  getBranchDashboard,
  changeBranchAvailability,
  updateDeliveryStatus,
  confirmActualWeight,
  confirmPayment,
  createWalkInAppointment,
  lookupPhone,
  archiveAppointment,
} from '../controllers/BranchController.js'
import {
  getAllPromoCodes,
  getPromoCodeById,
} from '../controllers/promoCodeController.js'

const branchRouter = express.Router()

// ─── Public ───────────────────────────────────────────────────────
branchRouter.post('/login', loginBranch)

// ─── Protected ────────────────────────────────────────────────────
branchRouter.get('/profile',                 protect('branch'), getBranchProfile)
branchRouter.post('/update-profile',         protect('branch'), upload.single('image'), updateBranchProfile)
branchRouter.get('/appointments',            protect('branch'), getBranchAppointments)
branchRouter.post('/complete-appointment',   protect('branch'), completeAppointment)
branchRouter.post('/cancel-appointment',     protect('branch'), cancelAppointment)
branchRouter.get('/dashboard',               protect('branch'), getBranchDashboard)
branchRouter.post('/update-delivery-status', protect('branch'), updateDeliveryStatus)
branchRouter.post('/change-availability',    protect('branch'), changeBranchAvailability)
branchRouter.post('/logout',                 protect('branch'), logoutBranch)
branchRouter.post('/create-walk-in',         protect('branch'), createWalkInAppointment)

// ─── Actual weight + payment ──────────────────────────────────────
branchRouter.post('/confirm-actual-weight',  protect('branch'), confirmActualWeight)
branchRouter.post('/confirm-payment',        protect('branch'), confirmPayment)

// ─── Walk-in Phone Lookup ─────────────────────────────────────────
branchRouter.get('/lookup-phone/:phone',     protect('branch'), lookupPhone)

// ⭐ ARCHIVE APPOINTMENT ROUTE
branchRouter.post('/archive-appointment',    protect('branch'), archiveAppointment)

// ─── Promo Codes (read-only) ──────────────────────────────────────
branchRouter.get('/promo-codes',     protect('branch'), getAllPromoCodes)
branchRouter.get('/promo-codes/:id', protect('branch'), getPromoCodeById)

export default branchRouter