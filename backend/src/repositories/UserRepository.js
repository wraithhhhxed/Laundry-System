import userModel from '../../models/userModel.js'

class UserRepository {
  async findById(id) {
    return await userModel.findById(id)
  }

  async findByEmail(email) {
    return await userModel.findOne({ email })
  }

  async create(userData) {
    return await userModel.create(userData)
  }

  async updateById(id, updates) {
    return await userModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteById(id) {
    return await userModel.findByIdAndDelete(id)
  }

  async findAll() {
    return await userModel.find({}).select('-password')
  }

  // ── User Maintenance (Admin) ──────────────────────────────────────────────

  async findAllPaginated({ page = 1, limit = 15, search, isActive } = {}) {
    const filter = {}
    if (typeof isActive === 'boolean') filter.isActive = isActive
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }
    const total = await userModel.countDocuments(filter)
    const users = await userModel
      .find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    return { users, total, page, pages: Math.ceil(total / limit) }
  }

  async setActive(id, isActive) {
    return await userModel.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password')
  }
  
  // ─── Forgot Password ──────────────────────────────────────────────────────

  async findByResetToken(hashedToken) {
    return await userModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    })
  }

  async saveResetToken(userId, hashedToken, expires) {
    return await userModel.findByIdAndUpdate(userId, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expires,
    })
  }

  async clearResetToken(userId) {
    return await userModel.findByIdAndUpdate(userId, {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    })
  }
}

export default new UserRepository()