import kgRateModel from '../../models/kgRateModel.js'

class KgRateRepository {
  async findAll() {
    return await kgRateModel.find({}).sort({ kg: 1 })
  }

  async findActive() {
    return await kgRateModel.find({ isActive: true }).sort({ kg: 1 })
  }

  async findById(id) {
    return await kgRateModel.findById(id)
  }

  async findByKg(kg) {
    return await kgRateModel.findOne({ kg, isActive: true })
  }

  async create(data) {
    return await kgRateModel.create(data)
  }

  async updateById(id, updates) {
    return await kgRateModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteById(id) {
    return await kgRateModel.findByIdAndDelete(id)
  }
}

export default new KgRateRepository()