import extraServiceModel from '../../models/extraServiceModel.js'

class ExtraServiceRepository {

  async findAll({ includeInactive = false } = {}) {
    const filter = includeInactive ? {} : { isActive: true }
    return extraServiceModel.find(filter).sort({ createdAt: 1 })
  }

  async findById(id) {
    return extraServiceModel.findById(id)
  }

  async create(data) {
    return extraServiceModel.create(data)
  }

  async updateById(id, data) {
    return extraServiceModel.findByIdAndUpdate(id, data, { new: true })
  }

  async deleteById(id) {
    return extraServiceModel.findByIdAndDelete(id)
  }
}

export default new ExtraServiceRepository()