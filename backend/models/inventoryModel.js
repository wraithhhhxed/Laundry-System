
import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema({
  branchId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  productId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity:          { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: true })

inventorySchema.index({ branchId: 1, productId: 1 }, { unique: true })

export default mongoose.model('Inventory', inventorySchema)