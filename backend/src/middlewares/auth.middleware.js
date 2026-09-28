import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import UserRepository from '../repositories/UserRepository.js'
import BranchStaffRepository from '../repositories/BranchStaffRepository.js'
import AdminRepository from '../repositories/AdminRepository.js'

// Usage:
//   protect()                  — any authenticated role
//   protect('admin')           — admin only
//   protect('branch')          — branch only
//   protect('admin', 'branch') — multiple roles allowed

const protect = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  // Read from Authorization: Bearer <token>
  // Falls back to req.headers.token during migration
  const authHeader = req.headers.authorization
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : req.headers.token

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  // decoded = { id, role, staffRole?, branchId?, iat, exp }

  if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
    throw new ApiError(403, 'Forbidden, insufficient permissions')
  }

  // ── Populate name + email for audit logging ──────────────────
  let name  = 'Unknown'
  let email = null
  try {
    if (decoded.role === 'branch') {
      const staff = await BranchStaffRepository.findById(decoded.id)
      if (staff) {
        name  = `${staff.firstName} ${staff.lastName}`
        email = staff.email ?? null
      }
    } else if (decoded.role === 'admin') {
      const admin = await AdminRepository.findById(decoded.id)
      if (admin) {
        name  = admin.name  ?? name
        email = admin.email ?? null
      }
    } else {
      const user = await UserRepository.findById(decoded.id)
      if (user) {
        name  = user.name  ?? name
        email = user.email ?? null
      }
    }
  } catch {
    // Non-fatal — audit log will just show 'Unknown'
  }
  // ─────────────────────────────────────────────────────────────

  req.user = {
    id:        decoded.id,
    role:      decoded.role,
    staffRole: decoded.staffRole ?? null,
    branchId:  decoded.branchId ?? null,
    name,
    email,
  }

  next()
})

export { protect }