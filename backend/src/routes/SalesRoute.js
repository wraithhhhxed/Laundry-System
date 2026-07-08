import express from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import { getSalesReport } from '../controllers/sales.controller.js'

const salesRouter = express.Router()

salesRouter.get('/report', protect('admin', 'branch'), getSalesReport)

export default salesRouter