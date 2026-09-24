import PromoCodeRepository from '../repositories/PromoCodeRepository.js'
import UserRepository from '../repositories/UserRepository.js'
import { ApiError } from '../utils/ApiError.js'

class PromoCodeService {

  async getAllPromoCodes({ page, limit, search, isActive } = {}) {
    return PromoCodeRepository.findAll({ page, limit, search, isActive })
  }

  async getPromoCodeById(id) {
    const promoCode = await PromoCodeRepository.findById(id)
    if (!promoCode) throw new ApiError(404, 'Promo code not found')
    return promoCode
  }

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

  async deletePromoCode(id) {
    const deleted = await PromoCodeRepository.deleteById(id)
    if (!deleted) throw new ApiError(404, 'Promo code not found')
    return deleted
  }

  async togglePromoCode(id) {
    const promoCode = await this.getPromoCodeById(id)
    return PromoCodeRepository.updateById(id, { isActive: !promoCode.isActive })
  }

  async validateAndReservePromoCode(code, orderSubtotal, userId = null) {
    if (!code) throw new ApiError(400, 'Promo code is required')
    if (!orderSubtotal || orderSubtotal <= 0) throw new ApiError(400, 'Invalid order subtotal')

    const promo = await PromoCodeRepository.reserveUse(code, orderSubtotal)

    if (!promo) {
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
        eligible = user.loyaltyStamps >= 4 && !user.fifthStampRedeemedAt
      } else if (promo.assignedMilestone === 'TENTH') {
        eligible = user.loyaltyStamps >= 9 && !user.tenthStampRedeemedAt
      } else if (promo.assignedMilestone === 'FIFTEENTH') {
        eligible = user.loyaltyStamps >= 14 && !user.fifteenthStampRedeemedAt
      } else if (promo.assignedMilestone === 'LUCKY_WHEEL') {
        eligible = user.loyaltyStamps >= 19
      }

      if (!eligible) {
        await PromoCodeRepository.releaseUse(promo.id)
        throw new ApiError(400, 'You have already claimed this reward, or you have not unlocked it yet')
      }
    }

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

  async getLoyaltyStatus(user) {
    const [fifthCode, tenthCode, fifteenthCode] = await Promise.all([
      PromoCodeRepository.findByMilestone('FIFTH'),
      PromoCodeRepository.findByMilestone('TENTH'),
      PromoCodeRepository.findByMilestone('FIFTEENTH'),
    ])

    const fifthEligible     = user.loyaltyStamps >= 4  && !user.fifthStampRedeemedAt
    const tenthEligible     = user.loyaltyStamps >= 9  && !user.tenthStampRedeemedAt
    const fifteenthEligible = user.loyaltyStamps >= 14 && !user.fifteenthStampRedeemedAt

    return {
      loyaltyStamps: user.loyaltyStamps,

      fifthAvailable:     !!fifthCode     && fifthEligible,
      tenthAvailable:     !!tenthCode     && tenthEligible,
      fifteenthAvailable: !!fifteenthCode && fifteenthEligible,

      fifthStampRedeemedAt:     user.fifthStampRedeemedAt,
      tenthStampRedeemedAt:     user.tenthStampRedeemedAt,
      fifteenthStampRedeemedAt: user.fifteenthStampRedeemedAt,

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

      fifteenthStampReward: (fifteenthCode && fifteenthEligible) ? {
        code: fifteenthCode.code,
        description: fifteenthCode.description,
        discountType: fifteenthCode.discountType,
        discountValue: fifteenthCode.discountValue,
      } : null,
    }
  }

  async getMilestoneRewards() {
    const [fifthPromo, tenthPromo, fifteenthPromo] = await Promise.all([
      PromoCodeRepository.findByMilestone('FIFTH'),
      PromoCodeRepository.findByMilestone('TENTH'),
      PromoCodeRepository.findByMilestone('FIFTEENTH'),
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

      fifteenthStampReward: fifteenthPromo ? {
        code: fifteenthPromo.code,
        description: fifteenthPromo.description,
        discountType: fifteenthPromo.discountType,
        discountValue: fifteenthPromo.discountValue,
      } : null,
    };
  }

  async releasePromoCode(promoCodeId) {
    return PromoCodeRepository.releaseUse(promoCodeId)
  }

  _computeDiscount(promo, subtotal) {
    if (promo.discountType === 'flat') {
      return Math.min(promo.discountValue, subtotal)
    }
    return (promo.discountValue / 100) * subtotal
  }
}

export default new PromoCodeService()