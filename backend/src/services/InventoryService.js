// src/services/InventoryService.js
import InventoryRepository from '../repositories/InventoryRepository.js'
import ProductRepository from '../repositories/ProductRepository.js'
import { ApiError } from '../utils/ApiError.js'

class InventoryService {
  async getBranchInventory(branchId) {
    return InventoryRepository.findByBranch(branchId)
  }

  async getAllInventory() {
    return InventoryRepository.findAll()
  }

  async getLowStock(branchId) {
    return InventoryRepository.findLowStock(branchId)
  }

  async setStock(branchId, productId, quantity, lowStockThreshold = 5) {
    const product = await ProductRepository.findById(productId)
    if (!product) throw new ApiError(404, 'Product not found')
    if (quantity < 0) throw new ApiError(400, 'Quantity cannot be negative')

    return InventoryRepository.upsert(branchId, productId, quantity, lowStockThreshold)
  }

  async restock(branchId, productId, qty) {
    if (qty <= 0) throw new ApiError(400, 'Restock quantity must be greater than zero')

    const existing = await InventoryRepository.findByBranchAndProduct(branchId, productId)
    if (!existing) throw new ApiError(404, 'Inventory record not found for this branch')

    return InventoryRepository.restock(branchId, productId, qty)
  }

  async deduct(branchId, productId, qty) {
    if (qty <= 0) throw new ApiError(400, 'Deduct quantity must be greater than zero')

    const existing = await InventoryRepository.findByBranchAndProduct(branchId, productId)
    if (!existing) throw new ApiError(404, 'Inventory record not found for this branch')
    if (existing.quantity < qty) throw new ApiError(400, 'Insufficient stock')

    const updated = await InventoryRepository.deduct(branchId, productId, qty)
    if (!updated) throw new ApiError(400, 'Insufficient stock')
    return updated
  }

  async removeFromBranch(branchId, productId) {
    const existing = await InventoryRepository.findByBranchAndProduct(branchId, productId)
    if (!existing) throw new ApiError(404, 'Inventory record not found')
    return InventoryRepository.delete(branchId, productId)
  }
}

export default new InventoryService()