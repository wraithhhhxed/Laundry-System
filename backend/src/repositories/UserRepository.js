import prisma from '../config/prismaClient.js';


const SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  googleId: true,
  image: true,
  address: true,
  gender: true,
  dob: true,
  phone: true,
  isActive: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
  createdAt: true,
  updatedAt: true,
};

class UserRepository {
  async findById(id) {
    return await prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email) {
    return await prisma.user.findUnique({ where: { email } });
  }
  async findByPhone(phone) {
    return await prisma.user.findUnique({ where: { phone } });
  }

  async create(userData) {
    return await prisma.user.create({ data: userData });
  }

  async updateById(id, updates) {
    return await prisma.user.update({ where: { id }, data: updates });
  }

  async deleteById(id) {
    return await prisma.user.delete({ where: { id } });
  }

  async findAll() {
    return await prisma.user.findMany({ select: SAFE_FIELDS });
  }

  async findAllPaginated({ page = 1, limit = 15, search, isActive } = {}) {
    const where = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: SAFE_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  async setActive(id, isActive) {
    return await prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_FIELDS,
    });
  }

  async findByResetToken(hashedToken) {
    return await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });
  }

  async saveResetToken(userId, hashedToken, expires) {
    return await prisma.user.update({
      where: { id: userId },
      data: { resetPasswordToken: hashedToken, resetPasswordExpires: expires },
    });
  }

  async clearResetToken(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { resetPasswordToken: null, resetPasswordExpires: null },
    });
  }

  async incrementLoyaltyStamps(userId) {
    const res = await prisma.user.updateMany({
      where: { id: userId, loyaltyStamps: { lt: 20 } },
      data: { loyaltyStamps: { increment: 1 } },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return { ...user, stampAdded: res.count === 1 };
  }

  async markFifthStampRedeemed(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { fifthStampRedeemedAt: new Date() },
    });
  }

  async markTenthStampRedeemed(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { tenthStampRedeemedAt: new Date() },
    });
  }

  async markFifteenthStampRedeemed(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { fifteenthStampRedeemedAt: new Date() },
    });
  }

  // Atomic claim: succeeds only if the field is still null
  async claimMilestone(userId, milestone) {
    const field = {
      FIFTH: 'fifthStampRedeemedAt',
      TENTH: 'tenthStampRedeemedAt',
      FIFTEENTH: 'fifteenthStampRedeemedAt',
    }[milestone];
    if (!field) return false;
    const res = await prisma.user.updateMany({
      where: { id: userId, [field]: null },
      data: { [field]: new Date() },
    });
    return res.count === 1;
  }

  // Compensation: undo a claim if the appointment failed
  async unclaimMilestone(userId, milestone) {
    const field = {
      FIFTH: 'fifthStampRedeemedAt',
      TENTH: 'tenthStampRedeemedAt',
      FIFTEENTH: 'fifteenthStampRedeemedAt',
    }[milestone];
    if (!field) return;
    await prisma.user.update({
      where: { id: userId },
      data: { [field]: null },
    });
  }

  async resetLoyaltyCycle(userId) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyStamps: 0,
        fifthStampRedeemedAt: null,
        tenthStampRedeemedAt: null,
        fifteenthStampRedeemedAt: null,
      },
    });
  }
}

export default new UserRepository();