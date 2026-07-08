import mongoose from 'mongoose'

const extraServiceSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  fee:         { type: Number, required: true, min: 0 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true })

const extraServiceModel =
  mongoose.models.extraService ||
  mongoose.model('extraService', extraServiceSchema)

export default extraServiceModel