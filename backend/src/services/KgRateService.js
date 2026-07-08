import KgRateRepository from '../repositories/KgRateRepository.js'
import { ApiError } from '../utils/ApiError.js'

class KgRateService {
  async getAllKgRates() {
    return await KgRateRepository.findAll()
  }

  async getActiveKgRates() {
    return await KgRateRepository.findActive()
  }

  async addKgRate(data) {
    const { kg, price } = data
    if (!kg || price === undefined) throw new ApiError(400, 'KG and price are required')
   if (kg < 1 || kg > 7) throw new ApiError(400, 'KG must be between 1 and 7')
    if (price < 0) throw new ApiError(400, 'Price cannot be negative')

    const existing = await KgRateRepository.findByKg(kg)
    if (existing) throw new ApiError(400, `KG rate for ${kg}kg already exists`)

    return await KgRateRepository.create({ kg, price })
  }

  async updateKgRate(id, data) {
    const rate = await KgRateRepository.findById(id)
    if (!rate) throw new ApiError(404, 'KG rate not found')
    return await KgRateRepository.updateById(id, data)
  }

  async deleteKgRate(id) {
    const rate = await KgRateRepository.findById(id)
    if (!rate) throw new ApiError(404, 'KG rate not found')
    return await KgRateRepository.deleteById(id)
  }

  async getPriceByKg(kg) {
    const rate = await KgRateRepository.findByKg(kg)
    if (!rate) throw new ApiError(404, `No rate found for ${kg}kg`)
    return rate.price
  }
}

export default new KgRateService()