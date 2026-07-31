import express from 'express'
import upload from '../middlewares/multer.js'
import { protect } from '../middlewares/auth.middleware.js'
import {
  // auth
  loginAdmin, logoutAdmin,
  // branches
  addBranch, allBranches, changeBranchAvailability,
  // appointments
  allAppointments, cancelAppointment, adminDashboard, approveBooking, approvePayment,
  updateDeliveryStatus, confirmActualWeight, confirmPayment, archiveAppointment,
  // walk-in
  createWalkInAppointment, lookupPhone,
  // services
  getAllServices, addService, updateService, deleteService,
  // clothing types
  getAllClothingTypes, addClothingType, updateClothingType, deleteClothingType,
  // kg rates
  getAllKgRates, addKgRate, updateKgRate, deleteKgRate,
  // audit logs
  getAuditLogs,
  // user maintenance
  getAllUsers, getUserById, addUser, updateUser, toggleUserStatus, deleteUser,
  // branch maintenance
  getBranches, getBranchByIdAdmin, updateBranchAdmin,
  toggleBranchStatus, deleteBranchAdmin, resetBranchPassword,
  // extra services maintenance
  getAllExtraServices, getExtraServiceById, addExtraService,
  updateExtraService, toggleExtraServiceStatus, deleteExtraService,
} from '../controllers/AdminController.js'
import { branchList } from '../controllers/BranchController.js'
import {
  getAllPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
} from '../controllers/promoCodeController.js'
import {
  getVatRate,
  updateVatRate,
  getAllSettings,
} from '../controllers/settingController.js'

const adminRouter = express.Router()

// ─── AUTH ─────────────────────────────────────────────────────────
adminRouter.post('/login',  loginAdmin)
adminRouter.post('/logout', protect('admin'), logoutAdmin)

// ─── BRANCHES ─────────────────────────────────────────────────────
adminRouter.post('/add-branch',          protect('admin'), upload.single('image'), addBranch)
adminRouter.get('/all-branches',         protect('admin'), allBranches)
adminRouter.get('/branch-list',          protect('admin'), branchList)
adminRouter.post('/change-availability', protect('admin'), changeBranchAvailability)

// ─── APPOINTMENTS ──────────────────────────────────────────────────
adminRouter.get('/all-appointments',          protect('admin'), allAppointments)
adminRouter.post('/cancel-appointment',       protect('admin'), cancelAppointment)
adminRouter.post('/approve-booking',          protect('admin'), approveBooking)
adminRouter.post('/approve-payment',          protect('admin'), approvePayment)
adminRouter.post('/update-delivery-status',   protect('admin'), updateDeliveryStatus)
adminRouter.post('/confirm-actual-weight',    protect('admin'), confirmActualWeight)
adminRouter.post('/confirm-payment',          protect('admin'), confirmPayment)
adminRouter.post('/archive-appointment',      protect('admin'), archiveAppointment)
adminRouter.post('/create-walk-in',           protect('admin'), createWalkInAppointment)  // ← ADDED
adminRouter.get('/lookup-phone/:phone',       protect('admin'), lookupPhone)              // ← ADDED
adminRouter.get('/dashboard',                 protect('admin'), adminDashboard)

// ─── SERVICES ──────────────────────────────────────────────────────
adminRouter.get('/services',             protect('admin'), getAllServices)
adminRouter.post('/services',            protect('admin'), upload.single('image'), addService)
adminRouter.put('/services/:id',         protect('admin'), upload.single('image'), updateService)
adminRouter.delete('/services/:id',      protect('admin'), deleteService)

// ─── CLOTHING TYPES ────────────────────────────────────────────────
adminRouter.get('/clothing-types',        protect('admin'), getAllClothingTypes)
adminRouter.post('/clothing-types',       protect('admin'), addClothingType)
adminRouter.put('/clothing-types/:id',    protect('admin'), updateClothingType)
adminRouter.delete('/clothing-types/:id', protect('admin'), deleteClothingType)

// ─── KG RATES ──────────────────────────────────────────────────────
adminRouter.get('/kg-rates',             protect('admin'), getAllKgRates)
adminRouter.post('/kg-rates',            protect('admin'), addKgRate)
adminRouter.put('/kg-rates/:id',         protect('admin'), updateKgRate)
adminRouter.delete('/kg-rates/:id',      protect('admin'), deleteKgRate)

// ─── PROMO CODES ───────────────────────────────────────────────────
adminRouter.get('/promo-codes',              protect('admin'), getAllPromoCodes)
adminRouter.post('/promo-codes',             protect('admin'), createPromoCode)
adminRouter.get('/promo-codes/:id',          protect('admin'), getPromoCodeById)
adminRouter.put('/promo-codes/:id',          protect('admin'), updatePromoCode)
adminRouter.delete('/promo-codes/:id',       protect('admin'), deletePromoCode)
adminRouter.patch('/promo-codes/:id/toggle', protect('admin'), togglePromoCode)

// ─── SETTINGS ──────────────────────────────────────────────────────
adminRouter.get('/settings',             protect('admin'), getAllSettings)
adminRouter.get('/settings/vat',         getVatRate)
adminRouter.put('/settings/vat',         protect('admin'), updateVatRate)

// ─── AUDIT LOGS ────────────────────────────────────────────────────
adminRouter.get('/audit-logs',           protect('admin'), getAuditLogs)

// ─── USER MAINTENANCE ──────────────────────────────────────────────
adminRouter.get('/users',                protect('admin'), getAllUsers)
adminRouter.get('/users/:id',            protect('admin'), getUserById)
adminRouter.post('/users',               protect('admin'), upload.single('image'), addUser)
adminRouter.put('/users/:id',            protect('admin'), updateUser)
adminRouter.patch('/users/:id/status',   protect('admin'), toggleUserStatus)
adminRouter.delete('/users/:id',         protect('admin'), deleteUser)

// ─── BRANCH MAINTENANCE ────────────────────────────────────────────
adminRouter.get('/branches',                      protect('admin'), getBranches)
adminRouter.get('/branches/:id',                  protect('admin'), getBranchByIdAdmin)
adminRouter.put('/branches/:id',                  protect('admin'), updateBranchAdmin)
adminRouter.patch('/branches/:id/toggle-status',  protect('admin'), toggleBranchStatus)
adminRouter.delete('/branches/:id',               protect('admin'), deleteBranchAdmin)
adminRouter.patch('/branches/:id/reset-password', protect('admin'), resetBranchPassword)

// ─── EXTRA SERVICES MAINTENANCE ────────────────────────────────────
adminRouter.get('/extra-services',                 protect('admin'), getAllExtraServices)
adminRouter.get('/extra-services/:id',             protect('admin'), getExtraServiceById)
adminRouter.post('/extra-services',                protect('admin'), addExtraService)
adminRouter.put('/extra-services/:id',             protect('admin'), updateExtraService)
adminRouter.patch('/extra-services/:id/toggle',    protect('admin'), toggleExtraServiceStatus)
adminRouter.delete('/extra-services/:id',          protect('admin'), deleteExtraService)

export default adminRouter