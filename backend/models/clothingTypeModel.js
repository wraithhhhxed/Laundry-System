import mongoose from 'mongoose'

const clothingTypeSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const clothingTypeModel = mongoose.models.clothingType || mongoose.model('clothingType', clothingTypeSchema)
export default clothingTypeModel