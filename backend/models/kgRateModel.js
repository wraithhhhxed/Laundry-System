import mongoose from 'mongoose'

const kgRateSchema = new mongoose.Schema({
  kg: { type: Number, required: true, min: 1, max: 7 },
  price:    { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const kgRateModel = mongoose.models.kgRate || mongoose.model('kgRate', kgRateSchema)
export default kgRateModel