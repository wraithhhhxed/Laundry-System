import prisma from '../config/prismaClient.js';

class BranchStaffRepository {
  async findById(id) {
    return await prisma.branchStaff.findUnique({ where: { id } });
  }

  async findByEmail(email) {
    return await prisma.branchStaff.findUnique({ where: { email } });
  }

  async findAllByBranch(branchId) {
    return await prisma.branchStaff.findMany({ where: { branchId } });
  }

  async create(staffData) {
    return await prisma.branchStaff.create({ data: staffData });
  }

  async updateById(id, updates) {
    return await prisma.branchStaff.update({ where: { id }, data: updates });
  }

    async deleteById(id) {
    return await prisma.branchStaff.delete({ where: { id } });
  }
}

export default new BranchStaffRepository();