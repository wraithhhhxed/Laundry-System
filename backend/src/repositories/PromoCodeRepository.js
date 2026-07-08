import promoCodeModel from '../../models/promoCodeModel.js'

class PromoCodeRepository {

  async findAll({ page = 1, limit = 10, search = '', isActive } = {}) {
    const query = {}

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    if (typeof isActive === 'boolean') {
      query.isActive = isActive
    }

    const skip = (page - 1) * limit

    const [promoCodes, total] = await Promise.all([
      promoCodeModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      promoCodeModel.countDocuments(query),
    ])

    return { promoCodes, total, page, totalPages: Math.ceil(total / limit) }
  }

  async findById(id) {
    return promoCodeModel.findById(id)
  }

  async findByCode(code) {
    return promoCodeModel.findOne({ code: code.toUpperCase().trim() })
  }

  async create(data) {
    const promoCode = new promoCodeModel(data)
    return promoCode.save()
  }

  async updateById(id, data) {
    return promoCodeModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
  }

  // ─── ATOMIC: check eligibility + increment in ONE query ───────────────────
  // Uses $and to wrap both $or conditions — a plain JS object cannot have two
  // keys with the same name, so two bare $or entries would silently overwrite
  // each other. $and avoids that entirely.
  async reserveUse(code, orderSubtotal) {
    const now = new Date()
    return promoCodeModel.findOneAndUpdate(
      {
        code:           code.toUpperCase().trim(),
        isActive:       true,
        minOrderAmount: { $lte: orderSubtotal },
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        ],
      },
      { $inc: { usedCount: 1 } },
      { new: true }
    )
  }

  // ─── UNDO a reservation if booking fails after reserveUse ─────────────────
  async releaseUse(id) {
    return promoCodeModel.findByIdAndUpdate(
      id,
      { $inc: { usedCount: -1 } },
      { new: true }
    )
  }

  async incrementUsedCount(id) {
    return promoCodeModel.findByIdAndUpdate(
      id,
      { $inc: { usedCount: 1 } },
      { new: true }
    )
  }

  async deleteById(id) {
    return promoCodeModel.findByIdAndDelete(id)
  }
}

export default new PromoCodeRepository()