import jwt from 'jsonwebtoken'
import { ApiError } from '../utils/apiError.js'
import { asyncHandler } from '../utils/asynchandler.js'

// Lazy-load the right model based on role
const getModel = async (role) => {
  if (role === 'branch') {
    const { default: m } = await import('../../models/branchModel.js')
    return m
  }
  // admin + client both live in userModel
  const { default: m } = await import('../../models/userModel.js')
  return m
}

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
  // decoded = { id, role, iat, exp }

  if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
    throw new ApiError(403, 'Forbidden, insufficient permissions')
  }

  // ── Populate name + email for audit logging ──────────────────
  let name  = 'Unknown'
  let email = null
  try {
    const Model = await getModel(decoded.role)
    const user  = await Model.findById(decoded.id).select('name email').lean()
    if (user) {
      name  = user.name  ?? name
      email = user.email ?? null
    }
  } catch {
    // Non-fatal — audit log will just show 'Unknown'
  }
  // ─────────────────────────────────────────────────────────────

  req.user = {
    id:    decoded.id,
    role:  decoded.role,
    name,
    email,
  }

  next()
})

export { protect }