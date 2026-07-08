import ExtraServiceRepository from '../repositories/ExtraServiceRepository.js'
import { ApiError } from '../utils/ApiError.js'

class ExtraServiceService {

  // ─── PUBLIC: GET ALL ACTIVE ────────────────────────────────────────────────
  async getActiveExtraServices() {
    return ExtraServiceRepository.findAll({ includeInactive: false })
  }

  // ─── ADMIN: GET ALL ────────────────────────────────────────────────────────
  async getAllExtraServices() {
    return ExtraServiceRepository.findAll({ includeInactive: true })
  }

  // ─── ADMIN: GET BY ID ──────────────────────────────────────────────────────
  async getExtraServiceById(id) {
    const extraService = await ExtraServiceRepository.findById(id)
    if (!extraService) throw new ApiError(404, 'Extra service not found')
    return extraService
  }

  // ─── ADMIN: CREATE ─────────────────────────────────────────────────────────
  async createExtraService(data) {
    if (!data.name?.trim())         throw new ApiError(400, 'Name is required')
    if (data.fee == null)           throw new ApiError(400, 'Fee is required')
    if (Number(data.fee) < 0)       throw new ApiError(400, 'Fee cannot be negative')

    return ExtraServiceRepository.create({
      name:        data.name.trim(),
      description: data.description?.trim() || '',
      fee:         Number(data.fee),
      isActive:    data.isActive ?? true,
    })
  }

  // ─── ADMIN: UPDATE ─────────────────────────────────────────────────────────
  async updateExtraService(id, data) {
    await this.getExtraServiceById(id) // throws 404 if missing

    if (data.fee != null && Number(data.fee) < 0)
      throw new ApiError(400, 'Fee cannot be negative')

    const update = {}
    if (data.name        != null) update.name        = data.name.trim()
    if (data.description != null) update.description = data.description.trim()
    if (data.fee         != null) update.fee         = Number(data.fee)
    if (data.isActive    != null) update.isActive    = data.isActive

    return ExtraServiceRepository.updateById(id, update)
  }

  // ─── ADMIN: DELETE ─────────────────────────────────────────────────────────
  async deleteExtraService(id) {
    const deleted = await ExtraServiceRepository.deleteById(id)
    if (!deleted) throw new ApiError(404, 'Extra service not found')
    return deleted
  }

  // ─── ADMIN: TOGGLE ACTIVE ──────────────────────────────────────────────────
  async toggleExtraService(id) {
    const extraService = await this.getExtraServiceById(id)
    return ExtraServiceRepository.updateById(id, { isActive: !extraService.isActive })
  }
}

export default new ExtraServiceService()