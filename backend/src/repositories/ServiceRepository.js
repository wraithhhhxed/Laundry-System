import serviceModel from '../../models/serviceModel.js'

class ServiceRepository {
  async findAll() {
    return await serviceModel.find({})
  }

  async findActive() {
    return await serviceModel.find({ isActive: true })
  }

  async findById(id) {
    return await serviceModel.findById(id)
  }

  async findByIds(ids) {
    return await serviceModel.find({ _id: { $in: ids } })
  }

  async create(data) {
    return await serviceModel.create(data)
  }

  async updateById(id, updates) {
    return await serviceModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteById(id) {
    return await serviceModel.findByIdAndDelete(id)
  }
}

export default new ServiceRepository()