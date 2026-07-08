import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  price:    { type: Number, required: true, min: 0 },
  image:    { type: String, default: null },   // Cloudinary URL
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const serviceModel = mongoose.models.service || mongoose.model('service', serviceSchema)
export default serviceModel