// src/services/ProductService.js
import ProductRepository from '../repositories/ProductRepository.js'
import { ApiError } from '../utils/ApiError.js'

class ProductService {
  async getAllProducts() {
    return ProductRepository.findAll()
  }

  async getActiveProducts() {
    return ProductRepository.findActive()
  }

  async getProductById(id) {
    const product = await ProductRepository.findById(id)
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  }

  async createProduct(data) {
    const product = await ProductRepository.create(data)
    return product
  }

  async updateProduct(id, data) {
    const product = await ProductRepository.update(id, data)
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  }

  async deleteProduct(id) {
    const product = await ProductRepository.delete(id)
    if (!product) throw new ApiError(404, 'Product not found')
    return product
  }

  async toggleActive(id) {
    const product = await ProductRepository.findById(id)
    if (!product) throw new ApiError(404, 'Product not found')
    return ProductRepository.update(id, { isActive: !product.isActive })
  }
}

export default new ProductService()