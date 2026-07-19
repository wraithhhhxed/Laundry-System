// backend/src/repositories/AdminRepository.js
import prisma from '../config/prismaClient.js';

class AdminRepository {
  async findByEmail(email) {
    return await prisma.admin.findUnique({ where: { email } });
  }

  async findById(id) {
    return await prisma.admin.findUnique({ where: { id } });
  }

  async create(data) {
    return await prisma.admin.create({ data });
  }
}

export default new AdminRepository();