// backend/src/services/ProductService.js
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
    const payload = {
      name: data.name,
      description: data.description || '',
      price: Number(data.price),
      category: data.category,
      image: data.image || '',
    }
    return await ProductRepository.create(payload)
  }

  async updateProduct(id, data) {
    const existing = await ProductRepository.findById(id)
    if (!existing) throw new ApiError(404, 'Product not found')

    const payload = {}
    if (data.name        !== undefined && data.name        !== 'undefined') payload.name        = data.name
    if (data.description !== undefined && data.description !== 'undefined') payload.description = data.description
    if (data.price       !== undefined && data.price       !== 'undefined') payload.price       = Number(data.price)
    if (data.category    !== undefined && data.category    !== 'undefined') payload.category    = data.category
    if (data.isActive    !== undefined && data.isActive    !== 'undefined') payload.isActive    = data.isActive === 'true' || data.isActive === true
    if (data.image       !== undefined && data.image       !== 'undefined') payload.image       = data.image

    return await ProductRepository.update(id, payload)
  }

  async deleteProduct(id) {
    const existing = await ProductRepository.findById(id)
    if (!existing) throw new ApiError(404, 'Product not found')
    return await ProductRepository.delete(id)
  }

  async toggleActive(id) {
    const product = await ProductRepository.findById(id)
    if (!product) throw new ApiError(404, 'Product not found')
    return ProductRepository.update(id, { isActive: !product.isActive })
  }
}

export default new ProductService()