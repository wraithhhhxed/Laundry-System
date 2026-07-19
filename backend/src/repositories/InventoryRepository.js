// backend/src/repositories/InventoryRepository.js
import prisma from '../config/prismaClient.js';

class InventoryRepository {
  async findByBranch(branchId) {
    return await prisma.inventory.findMany({
      where: { branchId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBranchAndProduct(branchId, productId) {
    return await prisma.inventory.findUnique({
      where: { branchId_productId: { branchId, productId } },
      include: { product: true },
    });
  }

  async findAll() {
    return await prisma.inventory.findMany({
      include: {
        branch: { select: { name: true } },
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsert(branchId, productId, quantity, lowStockThreshold) {
    return await prisma.inventory.upsert({
      where: { branchId_productId: { branchId, productId } },
      update: { quantity, lowStockThreshold },
      create: { branchId, productId, quantity, lowStockThreshold },
      include: { product: true },
    });
  }

  // ─── ATOMIC: conditional decrement gamit ang transaction + optimistic
  // concurrency check (parehong pattern gaya ng PromoCodeRepository.reserveUse) ──
  async deduct(branchId, productId, qty) {
    return await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { branchId_productId: { branchId, productId } } });
      if (!inv || inv.quantity < qty) return null;

      const result = await tx.inventory.updateMany({
        where: { branchId, productId, quantity: inv.quantity },
        data: { quantity: { decrement: qty } },
      });

      if (result.count === 0) return null; // may nauna nang caller — natalo sa race

      return await tx.inventory.findUnique({ where: { branchId_productId: { branchId, productId } } });
    });
  }

  async restock(branchId, productId, qty) {
    return await prisma.inventory.update({
      where: { branchId_productId: { branchId, productId } },
      data: { quantity: { increment: qty } },
    });
  }

  // NOTE: si Prisma ay walang built-in na paraan para i-compare ang dalawang
  // column (quantity vs lowStockThreshold) diretso sa `where` nang walang raw
  // SQL — kaya kinukuha muna natin lahat ng records ng branch, tapos
  // fini-filter sa JavaScript. Sapat na 'to sa laki ng datos natin.
  async findLowStock(branchId) {
    const inventories = await prisma.inventory.findMany({
      where: { branchId },
      include: { product: { select: { name: true, category: true, image: true } } },
    });
    return inventories.filter((inv) => inv.quantity <= inv.lowStockThreshold);
  }

  async delete(branchId, productId) {
    return await prisma.inventory.delete({
      where: { branchId_productId: { branchId, productId } },
    });
  }
}

export default new InventoryRepository();