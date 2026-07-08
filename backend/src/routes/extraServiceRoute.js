import express from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import {
  getActiveExtraServices,
  getAllExtraServices,
  createExtraService,
  updateExtraService,
  deleteExtraService,
  toggleExtraService,
} from '../controllers/extraServiceController.js'

const router = express.Router()

// ─── PUBLIC (no auth) ─────────────────────────────────────────────────────────
router.get('/active', getActiveExtraServices)

// ─── ADMIN (auth required) ────────────────────────────────────────────────────
router.get('/',               protect('admin'), getAllExtraServices)
router.post('/',              protect('admin'), createExtraService)
router.put('/:id',            protect('admin'), updateExtraService)
router.delete('/:id',         protect('admin'), deleteExtraService)
router.patch('/:id/toggle',   protect('admin'), toggleExtraService)

export default router