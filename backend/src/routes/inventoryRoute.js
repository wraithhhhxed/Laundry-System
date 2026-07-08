import express from 'express'
import {
  getBranchInventory,
  getAllInventory,
  getBranchInventoryById,
  getInStockProductIds,
  getLowStock,
  setStock,
  restock,
  deduct,
  removeFromBranch,
} from '../controllers/inventoryController.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

// ─── PUBLIC — no auth ─────────────────────────────────────────────────────
// Used by appointment booking page to filter out-of-stock add-ons
router.get('/public/:branchId/in-stock', getInStockProductIds)

// ─── Super Admin ──────────────────────────────────────────────────────────
router.get('/all',                         protect('admin'), getAllInventory)
router.get('/branch/:branchId',            protect('admin'), getBranchInventoryById)
router.get('/branch/:branchId/low-stock',  protect('admin'), getLowStock)

// ─── Branch Admin ─────────────────────────────────────────────────────────
router.get('/',                            protect('branch'), getBranchInventory)
router.get('/low-stock',                   protect('branch'), getLowStock)
router.post('/set',                        protect('branch', 'admin'), setStock)
router.post('/restock',                    protect('branch', 'admin'), restock)
router.post('/deduct',                     protect('branch', 'admin'), deduct)
router.delete('/:productId',              protect('branch', 'admin'), removeFromBranch)

export default router