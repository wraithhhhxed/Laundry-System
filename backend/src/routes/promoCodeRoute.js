import express from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import {
  getAllPromoCodes,
  getPromoCodeById,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  validatePromoCode,
} from '../controllers/promoCodeController.js'

// ─── ADMIN: full CRUD ──────────────────────────────────────────────
// Mounted at /api/admin/promo-codes
const adminPromoRouter = express.Router()

adminPromoRouter.route('/')
  .get(protect('admin'), getAllPromoCodes)
  .post(protect('admin'), createPromoCode)

adminPromoRouter.route('/:id')
  .get(protect('admin'), getPromoCodeById)
  .put(protect('admin'), updatePromoCode)
  .delete(protect('admin'), deletePromoCode)

adminPromoRouter.patch('/:id/toggle', protect('admin'), togglePromoCode)

// ─── BRANCH: read-only ─────────────────────────────────────────────
// Mounted at /api/branch/promo-codes
const branchPromoRouter = express.Router()

branchPromoRouter.get('/',    protect('branch'), getAllPromoCodes)
branchPromoRouter.get('/:id', protect('branch'), getPromoCodeById)

// ─── USER: validate only ───────────────────────────────────────────
// Mounted at /api/user/promo
const userPromoRouter = express.Router()

userPromoRouter.post('/validate', protect('user'), validatePromoCode)

export { adminPromoRouter, branchPromoRouter, userPromoRouter }