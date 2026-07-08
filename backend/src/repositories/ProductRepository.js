// src/repositories/ProductRepository.js
import Product from '../../models/productModel.js'

class ProductRepository {
  async findAll(filter = {}) {
    return Product.find(filter).sort({ createdAt: -1 })
  }

  async findById(id) {
    return Product.findById(id)
  }

  async create(data) {
    return Product.create(data)
  }

  async update(id, data) {
    return Product.findByIdAndUpdate(id, data, { new: true })
  }

  async delete(id) {
    return Product.findByIdAndDelete(id)
  }

  async findActive() {
    return Product.find({ isActive: true }).sort({ category: 1, name: 1 })
  }
}

export default new ProductRepository()