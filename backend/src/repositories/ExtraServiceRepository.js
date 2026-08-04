
import prisma from '../config/prismaClient.js';

class ExtraServiceRepository {

  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? {} : { isActive: true };
    return await prisma.extraService.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id) {
    return await prisma.extraService.findUnique({ where: { id } });
  }

  async create(data) {
    return await prisma.extraService.create({ data });
  }

  async updateById(id, updates) {
    return await prisma.extraService.update({ where: { id }, data: updates });
  }

  async deleteById(id) {
    try {
      return await prisma.extraService.delete({ where: { id } });
    } catch (err) {
      if (err.code === 'P2025') return null; 
      throw err;
    }
  }
}

export default new ExtraServiceRepository();