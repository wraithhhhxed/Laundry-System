// src/repositories/InventoryRepository.js
import Inventory from '../../models/inventoryModel.js'

class InventoryRepository {
  async findByBranch(branchId) {
    return Inventory.find({ branchId })
      .populate('productId', 'name description price category image isActive')
      .sort({ createdAt: -1 })
  }

  async findByBranchAndProduct(branchId, productId) {
    return Inventory.findOne({ branchId, productId })
      .populate('productId', 'name description price category image isActive')
  }

  async findAll() {
    return Inventory.find()
      .populate('branchId', 'name')
      .populate('productId', 'name description price category image isActive')
      .sort({ createdAt: -1 })
  }

  async upsert(branchId, productId, quantity, lowStockThreshold) {
    return Inventory.findOneAndUpdate(
      { branchId, productId },
      { quantity, lowStockThreshold },
      { upsert: true, new: true }
    ).populate('productId', 'name description price category image isActive')
  }

  async deduct(branchId, productId, qty) {
    return Inventory.findOneAndUpdate(
      { branchId, productId, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }
    )
  }

  async restock(branchId, productId, qty) {
    return Inventory.findOneAndUpdate(
      { branchId, productId },
      { $inc: { quantity: qty } },
      { new: true }
    )
  }

  async findLowStock(branchId) {
    return Inventory.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } },
      { $match: { $expr: { $lte: ['$quantity', '$lowStockThreshold'] } } },
    ]).then(res =>
      Inventory.populate(res, { path: 'productId', select: 'name category image' })
    )
  }

  async delete(branchId, productId) {
    return Inventory.findOneAndDelete({ branchId, productId })
  }
}

export default new InventoryRepository()