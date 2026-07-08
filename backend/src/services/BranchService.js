import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import BranchRepository from '../repositories/BranchRepository.js'
import { ApiError } from '../utils/apiError.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import serviceModel from '../../models/serviceModel.js';


const computeFeesFromServices = async (specialityNames = []) => {
  if (!specialityNames.length) return 0
  const services = await serviceModel.find({
    name: { $in: specialityNames },
    isActive: true,
  })
  if (!services.length) return 0
  return Math.min(...services.map(s => s.price))
}

class BranchService {
  async login(email, password) {
    const branch = await BranchRepository.findByEmail(email)
    if (!branch) throw new ApiError(401, 'Invalid credentials')

    const isMatch = await bcrypt.compare(password, branch.password)
    if (!isMatch) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign(
      { id: branch._id, role: 'branch' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return token
  }

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

    const exists = await BranchRepository.findByEmail(email)
    if (exists) throw new ApiError(409, 'Branch already exists')

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

    return await BranchRepository.create({
      name, email,
      password: hashedPassword,
      speciality: parsedSpeciality,
      about,
      fees: computedFees,
      address: parsedAddress,
      phone,
      image: imageUrl,
      date: Date.now()
    })
  }

  async updateBranch(branchId, branchData) {
    const { name, email, phone, speciality, about, address } = branchData

    const parsedSpeciality = Array.isArray(speciality) ? speciality : []

    // ── Recompute fees when services change ───────────────────────
    const computedFees = await computeFeesFromServices(parsedSpeciality)

    return await BranchRepository.updateById(branchId, {
      name, email, phone,
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