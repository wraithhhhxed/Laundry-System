// backend/src/repositories/PromoCodeRepository.js
import prisma from '../config/prismaClient.js';

class PromoCodeRepository {

  async findAll({ page = 1, limit = 10, search = '', isActive } = {}) {
    const where = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [promoCodes, total] = await Promise.all([
      prisma.promoCode.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.promoCode.count({ where }),
    ]);

    return { promoCodes, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id) {
    return await prisma.promoCode.findUnique({ where: { id } });
  }

  async findByCode(code) {
    return await prisma.promoCode.findUnique({ where: { code: code.toUpperCase().trim() } });
  }

  async create(data) {
  const payload = { ...data };
  if (payload.expiresAt) {
    payload.expiresAt = new Date(payload.expiresAt);
  }
  return await prisma.promoCode.create({ data: payload });
}

  async updateById(id, data) {
  const payload = { ...data };
  if (payload.expiresAt) {
    payload.expiresAt = new Date(payload.expiresAt);
  }
  return await prisma.promoCode.update({ where: { id }, data: payload });
}

  // ─── ATOMIC: check eligibility + increment in ONE transaction ─────────────
  // Postgres/Prisma walang direktang katumbas ng Mongoose findOneAndUpdate na
  // may kumplikadong conditions sa isang atomic call. Sa halip, gumagamit
  // tayo ng transaction + optimistic concurrency check: kinukuha muna natin
  // ang kasalukuyang usedCount, tapos ini-include ito sa WHERE clause ng
  // update — kung may ibang caller na nauna nang nag-increment (nagbago na
  // ang usedCount), 0 ang matched rows at malalaman nating natalo tayo sa
  // race, kaya babalik tayo ng null (parehong resulta gaya ng Mongoose
  // findOneAndUpdate na walang na-match).
  async reserveUse(code, orderSubtotal) {
    const now = new Date();
    const normalizedCode = code.toUpperCase().trim();

    return await prisma.$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code: normalizedCode } });
      if (!promo) return null;

      const eligible =
        promo.isActive &&
        promo.minOrderAmount <= orderSubtotal &&
        (!promo.expiresAt || promo.expiresAt > now) &&
        (promo.maxUses === null || promo.usedCount < promo.maxUses);

      if (!eligible) return null;

      const result = await tx.promoCode.updateMany({
        where: { id: promo.id, usedCount: promo.usedCount },
        data: { usedCount: { increment: 1 } },
      });

      if (result.count === 0) return null; // may nauna nang caller — natalo tayo sa race

      return await tx.promoCode.findUnique({ where: { id: promo.id } });
    });
  }

  // ─── UNDO a reservation if booking fails after reserveUse ─────────────────
  async releaseUse(id) {
    return await prisma.promoCode.update({
      where: { id },
      data: { usedCount: { decrement: 1 } },
    });
  }

  async incrementUsedCount(id) {
    return await prisma.promoCode.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  async deleteById(id) {
    return await prisma.promoCode.delete({ where: { id } });
  }
}

export default new PromoCodeRepository();