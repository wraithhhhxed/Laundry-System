import { Router } from 'express'
import { getAuditLogs, getAuditLogsByTarget } from '../controllers/auditController.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = Router()

// All audit routes: super admin only
router.use(protect('admin'))

// GET /api/audit-logs?action=&branchId=&actorName=&dateFrom=&dateTo=&page=&limit=
router.get('/', getAuditLogs)

// GET /api/audit-logs/target/:type/:id  (e.g. /target/Appointment/abc123)
router.get('/target/:type/:id', getAuditLogsByTarget)

export default router