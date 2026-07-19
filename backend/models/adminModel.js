import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema({
  name:                 { type: String, required: true },
  email:                { type: String, required: true, unique: true },
  password:             { type: String, required: true },
  isActive:             { type: Boolean, default: true },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date,   default: null },
}, { timestamps: true, minimize: false })

const adminModel = mongoose.models.admin || mongoose.model('admin', adminSchema)
export default adminModel