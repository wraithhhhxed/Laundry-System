import clothingTypeModel from '../../models/clothingTypeModel.js'

class ClothingTypeRepository {
  async findAll() {
    return await clothingTypeModel.find({})
  }

  async findActive() {
    return await clothingTypeModel.find({ isActive: true })
  }

  async findById(id) {
    return await clothingTypeModel.findById(id)
  }

  async create(data) {
    return await clothingTypeModel.create(data)
  }

  async updateById(id, updates) {
    return await clothingTypeModel.findByIdAndUpdate(id, updates, { new: true })
  }

  async deleteById(id) {
    return await clothingTypeModel.findByIdAndDelete(id)
  }
}

export default new ClothingTypeRepository()