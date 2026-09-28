import prisma from '../config/prismaClient.js'

class LuckyWheelRepository {
  static async getSetup() {
    let setup = await prisma.luckyWheelSetup.findFirst()
    if (!setup) {
      setup = await prisma.luckyWheelSetup.create({
        data: {
          availableServices: [],
          discountAmount: 50,
          bagPrizeName: 'Selfie Wash Laundry Bag',
          isActive: true,
        },
      })
    }
    return setup
  }

  static async updateSetup(data) {
    return await prisma.luckyWheelSetup.update({
      where: { id: (await this.getSetup()).id },
      data,
    })
  }

  static async createSpin(spinData) {
    return await prisma.luckyWheelSpin.create({
      data: spinData,
    })
  }

  // Atomic: returns true only if THIS call flipped isRedeemed false -> true
  static async claimSpin(spinId) {
    const res = await prisma.luckyWheelSpin.updateMany({
      where: { id: spinId, isRedeemed: false },
      data: { isRedeemed: true, redeemedAt: new Date() },
    })
    return res.count === 1
  }

  static async unclaimSpin(spinId) {
    await prisma.luckyWheelSpin.updateMany({
      where: { id: spinId },
      data: { isRedeemed: false, redeemedAt: null, appointmentId: null },
    })
  }

  static async linkSpinToAppointment(spinId, appointmentId) {
    await prisma.luckyWheelSpin.update({
      where: { id: spinId },
      data: { appointmentId },
    })
  }

  static async getUserSpins(userId, onlyRedeemable = false) {
    const where = { userId }
    if (onlyRedeemable) where.isRedeemed = false
    return await prisma.luckyWheelSpin.findMany({
      where,
      orderBy: { spinDate: 'desc' },
    })
  }

  static async getSpinById(spinId) {
    return await prisma.luckyWheelSpin.findUnique({
      where: { id: spinId },
    })
  }

  static async updateSpin(spinId, data) {
    return await prisma.luckyWheelSpin.update({
      where: { id: spinId },
      data,
    })
  }

  static async getSpinByPromoCode(promoCode) {
    return await prisma.luckyWheelSpin.findFirst({
      where: { promoCode },
    })
  }
}

export default LuckyWheelRepository