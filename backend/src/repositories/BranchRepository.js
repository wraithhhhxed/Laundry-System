import branchModel from '../../models/branchModel.js'

class BranchRepository {
  async findById(id) {
    return await branchModel.findById(id)
  }

  async findByEmail(email) {
    return await branchModel.findOne({ email })
  }

  async findAll() {
    return await branchModel.find({})
  }

  async findAllPaginated({ page = 1, limit = 15, search, available } = {}) {
    const filter = {}
    if (available !== undefined) filter.available = available
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    const total    = await branchModel.countDocuments(filter)
    const branches = await branchModel
      .find(filter)
      .select('-password')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    return { branches, total, page, pages: Math.ceil(total / limit) }
  }

  async create(branchData) {
    return await branchModel.create(branchData)
  }

  async updateById(id, updates) {
    return await branchModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteById(id) {
    return await branchModel.findByIdAndDelete(id)
  }

  async updateSlotsBooked(id, slots) {
    return await branchModel.findByIdAndUpdate(
      id,
      { slots_booked: slots },
      { new: true }
    )
  }

  async toggleAvailability(id) {
    const branch = await branchModel.findById(id)
    return await branchModel.findByIdAndUpdate(
      id,
      { available: !branch.available },
      { new: true }
    )
  }
}

export default new BranchRepository()