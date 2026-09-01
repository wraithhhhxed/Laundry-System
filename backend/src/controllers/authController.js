import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import UserRepository from '../repositories/UserRepository.js'
import BranchStaffRepository from '../repositories/BranchStaffRepository.js'
import AdminRepository from '../repositories/AdminRepository.js'
import AuditService from '../services/AuditService.js'

const unifiedLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    throw new ApiError(400, 'Email and password are required')

  // 1. Try User (customer) first
  let account = await UserRepository.findByEmail(email)
  if (account) {
    if (!account.password) throw new ApiError(401, 'Invalid credentials')
    const isMatch = await bcrypt.compare(password, account.password)
    if (!isMatch) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign({ id: account.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' })

    await AuditService.logLogin(
      { userId: account.id, name: account.name, role: 'client' },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )

    return res.json(new ApiResponse(200, { token, role: 'user' }, 'Login successful'))
  }

  // 2. Try BranchStaff (Branch Admin / Staff)
  account = await BranchStaffRepository.findByEmail(email)
  if (account && account.isActive) {
    const isMatch = await bcrypt.compare(password, account.password)
    if (!isMatch) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign(
  { id: account.id, role: 'branch', staffRole: account.role, branchId: account.branchId },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)

    await AuditService.logLogin(
      { userId: account.id, name: `${account.firstName} ${account.lastName}`, role: account.role },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )

    return res.json(new ApiResponse(200, { token, role: 'branch', staffRole: account.role }, 'Login successful'))
  }

  // 3. Try Admin
  account = await AdminRepository.findByEmail(email)
  if (account && account.isActive) {
    const isMatch = await bcrypt.compare(password, account.password)
    if (!isMatch) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign({ id: account.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })

    await AuditService.logLogin(
      { userId: account.id, name: account.name, role: 'admin' },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )

    return res.json(new ApiResponse(200, { token, role: 'admin' }, 'Login successful'))
  }

  // Wala sa lahat
  throw new ApiError(401, 'Invalid credentials')
})

export { unifiedLogin }