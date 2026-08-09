
import prisma from '../config/prismaClient.js';


const SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  speciality: true,
  about: true,
  fees: true,
  address: true,
  available: true,
  slotsBooked: true,
  date: true,
};

class BranchRepository {
  async findById(id) {
    return await prisma.branch.findUnique({ where: { id } });
  }

  async findByEmail(email) {
    return await prisma.branch.findUnique({ where: { email } });
  }

  async findAll() {
    return await prisma.branch.findMany();
  }

  async findAllPaginated({ page = 1, limit = 15, search, available } = {}) {
    const where = {};
    if (available !== undefined) where.available = available;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, branches] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({
        where,
        select: SAFE_FIELDS,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { branches, total, page, pages: Math.ceil(total / limit) };
  }

  async create(branchData) {
    return await prisma.branch.create({ data: branchData });
  }

  async updateById(id, updates) {
    return await prisma.branch.update({ where: { id }, data: updates });
  }

  async deleteById(id) {
    try {
      
      await prisma.inventory.deleteMany({
        where: { branchId: id }
      });

     
      const branch = await prisma.branch.delete({
        where: { id }
      });

      return branch;
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }

  async updateSlotsBooked(id, slots) {
    return await prisma.branch.update({
      where: { id },
      data: { slotsBooked: slots },
    });
  }

  async toggleAvailability(id) {
    const branch = await prisma.branch.findUnique({ where: { id } });
    return await prisma.branch.update({
      where: { id },
      data: { available: !branch.available },
    });
  }
}

export default new BranchRepository();