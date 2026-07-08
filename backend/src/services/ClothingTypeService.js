import ClothingTypeRepository from '../repositories/ClothingTypeRepository.js'
import { ApiError } from '../utils/ApiError.js'

class ClothingTypeService {
  async getAllClothingTypes() {
    return await ClothingTypeRepository.findAll()
  }

  async getActiveClothingTypes() {
    return await ClothingTypeRepository.findActive()
  }

  async addClothingType(data) {
    const { name, price } = data
    if (!name || price === undefined) throw new ApiError(400, 'Name and price are required')
    if (price < 0) throw new ApiError(400, 'Price cannot be negative')
    return await ClothingTypeRepository.create({ name, price })
  }

  async updateClothingType(id, data) {
    const type = await ClothingTypeRepository.findById(id)
    if (!type) throw new ApiError(404, 'Clothing type not found')
    return await ClothingTypeRepository.updateById(id, data)
  }

  async deleteClothingType(id) {
    const type = await ClothingTypeRepository.findById(id)
    if (!type) throw new ApiError(404, 'Clothing type not found')
    return await ClothingTypeRepository.deleteById(id)
  }
}

export default new ClothingTypeService()