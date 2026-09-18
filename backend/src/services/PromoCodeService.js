import PromoCodeRepository from '../repositories/PromoCodeRepository.js'
import UserRepository from '../repositories/UserRepository.js'
import { ApiError } from '../utils/ApiError.js'

class PromoCodeService {

  // ─── ADMIN: GET ALL ────────────────────────────────────────────────────────
  async getAllPromoCodes({ page, limit, search, isActive } = {}) {
    return PromoCodeRepository.findAll({ page, limit, search, isActive })
  }

  // ─── ADMIN: GET BY ID ──────────────────────────────────────────────────────
  async getPromoCodeById(id) {
    const promoCode = await PromoCodeRepository.findById(id)
    if (!promoCode) throw new ApiError(404, 'Promo code not found')
    return promoCode
  }

  // ─── ADMIN: CREATE ─────────────────────────────────────────────────────────
  async createPromoCode(data) {
    data.code = data.code?.toUpperCase().trim()

    if (!data.code) throw new ApiError(400, 'Code is required')
    if (!data.discountType) throw new ApiError(400, 'Discount type is required')
    if (!data.discountValue) throw new ApiError(400, 'Discount value is required')
    if (data.discountType === 'percent' && data.discountValue > 100)
      throw new ApiError(400, 'Percent discount cannot exceed 100')

    const existing = await PromoCodeRepository.findByCode(data.code)
    if (existing) throw new ApiError(400, 'A promo code with this name already exists')

    return PromoCodeRepository.create(data)
  }

  // ─── ADMIN: UPDATE ─────────────────────────────────────────────────────────
  async updatePromoCode(id, data) {
    if (data.code) {
      data.code = data.code.toUpperCase().trim()
      const existing = await PromoCodeRepository.findByCode(data.code)
      if (existing && existing.id !== id)
        throw new ApiError(400, 'A promo code with this name already exists')
    }

    if (data.discountType === 'percent' && data.discountValue > 100)
      throw new ApiError(400, 'Percent discount cannot exceed 100')

    const updated = await PromoCodeRepository.updateById(id, data)
    if (!updated) throw new ApiError(404, 'Promo code not found')
    return updated
  }

  // ─── ADMIN: DELETE ─────────────────────────────────────────────────────────
  async deletePromoCode(id) {
    const deleted = await PromoCodeRepository.deleteById(id)
    if (!deleted) throw new ApiError(404, 'Promo code not found')
    return deleted
  }

  // ─── ADMIN: TOGGLE ACTIVE ──────────────────────────────────────────────────
  async togglePromoCode(id) {
    const promoCode = await this.getPromoCodeById(id)
    return PromoCodeRepository.updateById(id, { isActive: !promoCode.isActive })
  }

  // ─── USER: VALIDATE & RESERVE (atomic) ────────────────────────────────────
  // Atomically checks eligibility AND increments usedCount in one DB round-trip.
  // This eliminates the race condition where two users both pass a maxUses=1 check.
  // If booking subsequently fails, call releasePromoCode(promoCodeId) to undo.
  async validateAndReservePromoCode(code, orderSubtotal, userId = null) {
    if (!code) throw new ApiError(400, 'Promo code is required')
    if (!orderSubtotal || orderSubtotal <= 0) throw new ApiError(400, 'Invalid order subtotal')

    // Single atomic reserve — only one concurrent caller can win
    const promo = await PromoCodeRepository.reserveUse(code, orderSubtotal)

    if (!promo) {
      // reserveUse returned null — find the code to give a specific error message
      const found = await PromoCodeRepository.findByCode(code)
      if (!found)                                          throw new ApiError(404, 'Promo code not found')
      if (!found.isActive)                                 throw new ApiError(400, 'Promo code is inactive')
      if (found.expiresAt && new Date() > found.expiresAt) throw new ApiError(400, 'Promo code has expired')
      if (found.maxUses !== null && found.usedCount >= found.maxUses)
                                                          throw new ApiError(400, 'Promo code has reached its usage limit')
      if (orderSubtotal < found.minOrderAmount)
        throw new ApiError(400, `Minimum order of ₱${found.minOrderAmount.toFixed(2)} required`)
      throw new ApiError(400, 'Promo code is not eligible')
    }

    // ── NEW: per-user milestone eligibility check ──────────────────────
    if (promo.assignedMilestone) {
      if (!userId) {
        await PromoCodeRepository.releaseUse(promo.id)
        throw new ApiError(400, 'This is a loyalty reward code — customer account is required')
      }

      const user = await UserRepository.findById(userId)
      if (!user) {
        await PromoCodeRepository.releaseUse(promo.id)
        throw new ApiError(404, 'User not found')
      }

      let eligible = false
      if (promo.assignedMilestone === 'FIFTH') {
        eligible = user.loyaltyStamps >= 5 && !user.fifthStampRedeemedAt
      } else if (promo.assignedMilestone === 'TENTH') {
        eligible = user.loyaltyStamps >= 10 && !user.tenthStampRedeemedAt
      }

      if (!eligible) {
        await PromoCodeRepository.releaseUse(promo.id)
        throw new ApiError(400, 'You have already claimed this reward, or you have not unlocked it yet')
      }
    }
    // ─────────────────────────────────────────────────────────────────

    const discountAmount = this._computeDiscount(promo, orderSubtotal)

    return {
      promoCodeId:    promo.id,
      code:           promo.code,
      discountType:   promo.discountType,
      discountValue:  promo.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      assignedMilestone: promo.assignedMilestone || null,
    }
  }

  // ─── USER: LOYALTY STATUS ──────────────────────────────────────────────────
  async getLoyaltyStatus(user) {
    const [fifthCode, tenthCode] = await Promise.all([
      PromoCodeRepository.findByMilestone('FIFTH'),
      PromoCodeRepository.findByMilestone('TENTH'),
    ])

    const fifthEligible = user.loyaltyStamps >= 5 && !user.fifthStampRedeemedAt
    const tenthEligible = user.loyaltyStamps >= 10 && !user.tenthStampRedeemedAt

    return {
      loyaltyStamps: user.loyaltyStamps,
      fifthAvailable: !!fifthCode && fifthEligible,
      tenthAvailable: !!tenthCode && tenthEligible,
      fifthStampRedeemedAt: user.fifthStampRedeemedAt,
      tenthStampRedeemedAt: user.tenthStampRedeemedAt,
      fifthStampReward: (fifthCode && fifthEligible) ? {
        code: fifthCode.code,
        description: fifthCode.description,
        discountType: fifthCode.discountType,
        discountValue: fifthCode.discountValue,
      } : null,
      tenthStampReward: (tenthCode && tenthEligible) ? {
        code: tenthCode.code,
        description: tenthCode.description,
        discountType: tenthCode.discountType,
        discountValue: tenthCode.discountValue,
      } : null,
    }
  }

  // ─── USER: GET MILESTONE REWARDS (for walk-in lookup) ────────────────────
  async getMilestoneRewards() {
    const [fifthPromo, tenthPromo] = await Promise.all([
      PromoCodeRepository.findByMilestone('FIFTH'),
      PromoCodeRepository.findByMilestone('TENTH'),
    ]);

    return {
      fifthStampReward: fifthPromo ? {
        code: fifthPromo.code,
        description: fifthPromo.description,
        discountType: fifthPromo.discountType,
        discountValue: fifthPromo.discountValue,
      } : null,
      tenthStampReward: tenthPromo ? {
        code: tenthPromo.code,
        description: tenthPromo.description,
        discountType: tenthPromo.discountType,
        discountValue: tenthPromo.discountValue,
      } : null,
    };
  }

  // ─── INTERNAL: Release a reservation if booking fails after reserve ────────
  async releasePromoCode(promoCodeId) {
    return PromoCodeRepository.releaseUse(promoCodeId)
  }

  // ─── HELPER ────────────────────────────────────────────────────────────────
  _computeDiscount(promo, subtotal) {
    if (promo.discountType === 'flat') {
      return Math.min(promo.discountValue, subtotal)
    }
    return (promo.discountValue / 100) * subtotal
  }
}

export default new PromoCodeService()