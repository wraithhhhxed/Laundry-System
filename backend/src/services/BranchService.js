import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import BranchRepository from '../repositories/BranchRepository.js'
import ServiceRepository from '../repositories/ServiceRepository.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import BranchStaffRepository from '../repositories/BranchStaffRepository.js'


const computeFeesFromServices = async (specialityNames = []) => {
  if (!specialityNames.length) return 0
  const activeServices = await ServiceRepository.findActive()
  const matched = activeServices.filter(s => specialityNames.includes(s.name))
  if (!matched.length) return 0
  // fees ay Int sa Prisma schema — i-round dahil decimal ang posibleng
  // resulta ng Math.min sa mga Service.price (Float).
  return Math.round(Math.min(...matched.map(s => s.price)))
}

class BranchService {

  async getProfileByEmail(email) {
    return await BranchRepository.findByEmail(email)
  }

  async getProfile(branchId) {
    const branch = await BranchRepository.findById(branchId)
    if (!branch) throw new ApiError(404, 'Branch not found')
    return branch
  }

  async updateProfile(branchId, updates, imageFile) {
    const { fees, address, available, about } = updates || {}

    const updateData = {}
    if (fees !== undefined) updateData.fees = fees
    if (about !== undefined) updateData.about = about
    if (available !== undefined) {
      updateData.available = available === 'true' || available === true
    }
    if (address) {
      updateData.address = typeof address === 'string' ? JSON.parse(address) : address
    }
    if (imageFile) {
      updateData.image = await uploadToCloudinary(imageFile.buffer, 'laundry-app/branches')
    }

    return await BranchRepository.updateById(branchId, updateData)
  }

  async addBranch(branchData, imageFile) {
  const { name, email, password, speciality, about, address, phone } = branchData

  if (!name || !email || !password) throw new ApiError(400, 'Missing required fields')

  // ── Check kung existing na ang email sa BranchStaff (hindi na sa Branch) ──
  const existingStaff = await BranchStaffRepository.findByEmail(email)
  if (existingStaff) throw new ApiError(409, 'Email already in use')

  const hashedPassword = await bcrypt.hash(password, 10)

  const parsedSpeciality = speciality
    ? (typeof speciality === 'string' ? JSON.parse(speciality) : speciality)
    : []

  const parsedAddress = address
    ? (typeof address === 'string' ? JSON.parse(address) : address)
    : {}

  // ── Auto-compute fees from selected service prices ────────────
  const computedFees = await computeFeesFromServices(parsedSpeciality)

  let imageUrl = ''
  if (imageFile) {
    imageUrl = await uploadToCloudinary(imageFile.buffer, 'laundry-app/branches')
  }

  // ── Gumawa ng Branch record (WALANG email/password na field) ──
  const branch = await BranchRepository.create({
    name,
    speciality: parsedSpeciality,
    about,
    fees: computedFees,
    address: parsedAddress,
    phone,
    image: imageUrl,
    date: BigInt(Date.now())
  })

  // ── Awtomatikong gumawa ng unang BRANCH_ADMIN para sa bagong branch ──
  await BranchStaffRepository.create({
    firstName: 'Branch',
    lastName: 'Admin',
    email,
    password: hashedPassword,
    role: 'BRANCH_ADMIN',
    branchId: branch.id,
    isActive: true,
  })

  return branch
}

  async updateBranch(branchId, branchData) {
    const { name, email, phone, speciality, about, address } = branchData

    const parsedSpeciality = Array.isArray(speciality) ? speciality : []

    // ── Recompute fees when services change ───────────────────────
    const computedFees = await computeFeesFromServices(parsedSpeciality)

    return await BranchRepository.updateById(branchId, {
      name, phone,
      speciality: parsedSpeciality,
      about,
      fees: computedFees,
      address,
    })
  }

  async changeBranchAvailability(branchId) {
    return await BranchRepository.toggleAvailability(branchId)
  }

  async getAllBranches() {
    return await BranchRepository.findAll()
  }
}

export default new BranchService()