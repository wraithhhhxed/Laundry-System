// backend/src/repositories/UserRepository.js
import prisma from '../config/prismaClient.js';

// Kapareho ng dating .select('-password') sa Mongoose — laging i-exclude ang
// password field sa mga query na hindi nangangailangan nito (findAll, listing, atbp).
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

  // ── User Maintenance (Admin) ──────────────────────────────────────────────

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

  // ─── Forgot Password ──────────────────────────────────────────────────────

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
}

export default new UserRepository();