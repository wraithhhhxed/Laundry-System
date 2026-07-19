import ServiceRepository from '../repositories/ServiceRepository.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'

class ServiceService {
  async getAllServices() {
    return await ServiceRepository.findAll()
  }

  async getActiveServices() {
    return await ServiceRepository.findActive()
  }

  async addService(data, imageFile) {
    const { name, price } = data
    if (!name || price === undefined) throw new ApiError(400, 'Name and price are required')
    if (price < 0) throw new ApiError(400, 'Price cannot be negative')

    const payload = {
      name,
      price,
      description: data.description || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
    }

    if (imageFile) {
      payload.image = await uploadToCloudinary(imageFile.buffer, 'laundry-app/services')
    }

    return await ServiceRepository.create(payload)
  }

  async updateService(id, data, imageFile) {
    const service = await ServiceRepository.findById(id)
    if (!service) throw new ApiError(404, 'Service not found')

    const payload = {}

    if (data.name        !== undefined && data.name        !== 'undefined') payload.name        = data.name
    if (data.price       !== undefined && data.price       !== 'undefined') payload.price       = Number(data.price)
    if (data.description !== undefined && data.description !== 'undefined') payload.description = data.description
    if (data.isActive    !== undefined && data.isActive    !== 'undefined') payload.isActive    = data.isActive === 'true' || data.isActive === true

    if (imageFile) {
      payload.image = await uploadToCloudinary(imageFile.buffer, 'laundry-app/services')
    }

    return await ServiceRepository.updateById(id, payload)
  }

  async deleteService(id) {
    const service = await ServiceRepository.findById(id)
    if (!service) throw new ApiError(404, 'Service not found')
    return await ServiceRepository.deleteById(id)
  }
}

export default new ServiceService()