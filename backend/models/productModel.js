import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },
  category:    { type: String, enum: ['detergent', 'conditioner', 'bleach', 'other'], default: 'other' },
  image:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('Product', productSchema)