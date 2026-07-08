// src/routes/productRoute.js
import express from 'express'
import {
  getAllProducts, getActiveProducts, getProductById,
  createProduct, updateProduct, deleteProduct, toggleProductStatus
} from '../controllers/productController.js'
import { protect } from '../middlewares/auth.middleware.js'
import upload from '../middlewares/multer.js'

const router = express.Router()

// Public — for booking add-ons selection
router.get('/active', getActiveProducts)

// Admin only
router.get('/',              protect('admin'), getAllProducts)
router.get('/:id',           protect('admin'), getProductById)
router.post('/',             protect('admin'), upload.single('image'), createProduct)
router.put('/:id',           protect('admin'), upload.single('image'), updateProduct)
router.delete('/:id',        protect('admin'), deleteProduct)
router.patch('/:id/toggle',  protect('admin'), toggleProductStatus)

export default router