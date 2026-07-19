// backend/src/repositories/ServiceRepository.js
import prisma from '../config/prismaClient.js';

class ServiceRepository {
  async findAll() {
    return await prisma.service.findMany();
  }

  async findActive() {
    return await prisma.service.findMany({ where: { isActive: true } });
  }

  async findById(id) {
    return await prisma.service.findUnique({ where: { id } });
  }

  async findByIds(ids) {
    return await prisma.service.findMany({ where: { id: { in: ids } } });
  }

  async create(data) {
    return await prisma.service.create({ data });
  }

  async updateById(id, updates) {
    return await prisma.service.update({ where: { id }, data: updates });
  }

  async deleteById(id) {
    return await prisma.service.delete({ where: { id } });
  }
}

export default new ServiceRepository(); 