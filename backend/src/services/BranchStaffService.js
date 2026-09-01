import bcrypt from 'bcrypt'
import BranchStaffRepository from '../repositories/BranchStaffRepository.js'
import BranchRepository from '../repositories/BranchRepository.js'
import { ApiError } from '../utils/ApiError.js'

class BranchStaffService {
  // requestedBy: { role: 'admin' | 'branch', staffRole?, branchId? }
  // Kung 'admin' ang gumagawa, pwede mag-specify ng kahit anong branchId + role.
  // Kung 'branch' (BRANCH_ADMIN) ang gumagawa, laging STAFF lang ang gagawin,
  // at laging sariling branchId lang ang gagamitin.
  async createStaff(requestedBy, staffData) {
    const { firstName, lastName, email, password } = staffData
    let { branchId, role } = staffData

    if (!firstName || !lastName || !email || !password)
      throw new ApiError(400, 'firstName, lastName, email, and password are required')

    if (requestedBy.role === 'admin') {
      if (!branchId) throw new ApiError(400, 'branchId is required')
      if (!['BRANCH_ADMIN', 'STAFF'].includes(role))
        throw new ApiError(400, 'role must be BRANCH_ADMIN or STAFF')
    } else {
      // Branch Admin: laging STAFF lang, laging sariling branch lang
      branchId = requestedBy.branchId
      role = 'STAFF'
    }

    const branch = await BranchRepository.findById(branchId)
    if (!branch) throw new ApiError(404, 'Branch not found')

    const existing = await BranchStaffRepository.findByEmail(email)
    if (existing) throw new ApiError(409, 'Email already in use')

    const hashedPassword = await bcrypt.hash(password, 10)

    const staff = await BranchStaffRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      branchId,
      isActive: true,
    })

    // Wag i-return ang password
    const { password: _pw, ...safeStaff } = staff
    return safeStaff
  }

  async listByBranch(branchId) {
    const staff = await BranchStaffRepository.findAllByBranch(branchId)
    return staff.map(({ password, ...rest }) => rest)
  }

  async deleteStaff(id) {
    const staff = await BranchStaffRepository.findById(id)
    if (!staff) throw new ApiError(404, 'Staff not found')

    await BranchStaffRepository.deleteById(id)
    return { firstName: staff.firstName, lastName: staff.lastName }
  }
}

export default new BranchStaffService()