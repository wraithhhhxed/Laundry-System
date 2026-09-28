import LuckyWheelRepository from '../repositories/LuckyWheelRepository.js'
import UserRepository from '../repositories/UserRepository.js'
import { ApiError } from '../utils/ApiError.js'
import prisma from '../config/prismaClient.js'

class LuckyWheelService {

  static async getSetup() {
    return await LuckyWheelRepository.getSetup()
  }

  static async updateSetup(data) {
    return await LuckyWheelRepository.updateSetup(data)
  }

  static async spinWheel(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new ApiError(404, 'User not found')

    if (user.loyaltyStamps < 19)
      throw new ApiError(400, 'User must have at least 19 stamps to spin')

    const existingUnredeemed = await LuckyWheelRepository.getUserSpins(userId, true)
    if (existingUnredeemed.length > 0)
      throw new ApiError(400, 'User has an unredeemed spin already')

    let slotNumber = Math.floor(Math.random() * 6) + 1
    let prizeType

    if (slotNumber <= 2) prizeType = 'FREE_SERVICE'
    else if (slotNumber <= 4) prizeType = 'FREE_DISCOUNT'
    else prizeType = 'FREE_BAG'

    // Free Service: pick the service NOW (saved on the spin), no separate pick step
    let selectedService = null
    if (prizeType === 'FREE_SERVICE') {
      const setup = await LuckyWheelRepository.getSetup()
      const services = setup?.availableServices || []
      if (services.length === 0) {
        // admin hasn't set any free services: fall back to discount
        prizeType = 'FREE_DISCOUNT'
        slotNumber = 3
      } else {
        selectedService = services[Math.floor(Math.random() * services.length)]
      }
    }

    const createdSpin = await LuckyWheelRepository.createSpin({
      userId,
      slotNumber,
      prizeType,
      spinDate: new Date(),
    })

    if (selectedService) {
      await LuckyWheelRepository.updateSpin(createdSpin.id, { selectedValue: selectedService })
    }

    const spin = await LuckyWheelRepository.getSpinById(createdSpin.id)
    return { spin, slotNumber, prizeType }
  }

  static async pickPrize(spinId, userId, selectedValue = null) {
    const spin = await LuckyWheelRepository.getSpinById(spinId)
    if (!spin) throw new ApiError(404, 'Spin not found')
    if (spin.userId !== userId) throw new ApiError(403, 'Spin does not belong to user')
    if (spin.isRedeemed) throw new ApiError(400, 'Spin already redeemed')

    const setup = await LuckyWheelRepository.getSetup()

    if (spin.prizeType === 'FREE_SERVICE') {
      // If spinWheel already picked the service, keep it — don't re-randomize.
      if (spin.selectedValue) {
        return spin
      }

      if (!setup.availableServices || setup.availableServices.length === 0)
        throw new ApiError(400, 'No services available for lucky wheel')

      const randomIndex = Math.floor(Math.random() * setup.availableServices.length)
      const selectedService = setup.availableServices[randomIndex]
      await LuckyWheelRepository.updateSpin(spinId, { selectedValue: selectedService })
    }
    // FREE_DISCOUNT and FREE_BAG no longer generate promo codes.
    // The discount / bag prize is applied automatically by
    // AppointmentService.bookAppointment() and createWalkInAppointment()
    // based on the held spin's prizeType.

    return await LuckyWheelRepository.getSpinById(spinId)
  }

  static async generatePromoCodeForPrize(spin, type) {
    const timestamp = Date.now().toString().slice(-6)
    let code, description, discountType, discountValue

    if (type === 'DISCOUNT') {
      const setup = await LuckyWheelRepository.getSetup()
      const wheelDiscountAmount = setup?.discountAmount ?? 50

      code = `FREEDISCOUNT${timestamp}`
      description = `Lucky Wheel: Free ₱${wheelDiscountAmount} Discount`
      discountType = 'flat'
      discountValue = wheelDiscountAmount
    } else if (type === 'BAG') {
      code = `FREELAUNDYBAG${timestamp}`
      description = 'Lucky Wheel: Free Laundry Bag'
      discountType = 'flat'
      discountValue = 0
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code,
        description,
        discountType,
        discountValue,
        minOrderAmount: 0,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        assignedMilestone: 'LUCKY_WHEEL',
      },
    })

    return promoCode
  }

  static async getUserUnredeemedSpins(userId) {
    return await LuckyWheelRepository.getUserSpins(userId, true)
  }

  static async getUserAllSpins(userId) {
    return await LuckyWheelRepository.getUserSpins(userId, false)
  }

  static async redeemSpin(spinId, branchStaffId) {
    const spin = await LuckyWheelRepository.getSpinById(spinId)
    if (!spin) throw new ApiError(404, 'Spin not found')
    if (spin.isRedeemed) throw new ApiError(400, 'Spin already redeemed')

    return await LuckyWheelRepository.updateSpin(spinId, {
      isRedeemed: true,
      redeemedAt: new Date(),
      redeemedBy: branchStaffId,
    })
  }
}

export default LuckyWheelService