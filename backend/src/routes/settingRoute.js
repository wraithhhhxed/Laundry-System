import express from 'express'
import {
  getVatRate, updateVatRate,
  getAllSettings,
  getRefundReasons, updateRefundReasons,
  getFaqs, updateFaqs,
} from '../controllers/settingController.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.get('/vat',            getVatRate)
router.get('/refund-reasons', getRefundReasons)
router.get('/faqs',           getFaqs)

router.get('/',               protect('admin'), getAllSettings)
router.put('/vat',            protect('admin'), updateVatRate)
router.put('/refund-reasons', protect('admin'), updateRefundReasons)
router.put('/faqs',           protect('admin'), updateFaqs)

export default router