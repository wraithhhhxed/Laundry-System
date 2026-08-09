
import prisma from '../config/prismaClient.js';

class ProductRepository {
  async findAll(filter = {}) {
    return await prisma.product.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id) {
    return await prisma.product.findUnique({ where: { id } })
  }

  async create(data) {
    return await prisma.product.create({ data })
  }

  async update(id, data) {
    return await prisma.product.update({ where: { id }, data })
  }

  async delete(id) {
    return await prisma.product.delete({ where: { id } })
  }

  async findActive() {
    return await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }
}

export default new ProductRepository()