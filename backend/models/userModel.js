import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, default: null },  // null para sa Google users
    googleId: { type: String, default: null },  // ← DAGDAG ITO
    image:    { type: String, default: '...' },
    address:  { type: Object, default: { line1: '', line2: '' } },
    gender:   { type: String, default: 'Not Selected' },
    dob:      { type: String, default: 'Not Selected' },
    phone:    { type: String, default: '0000000000' },
    isActive: { type: Boolean, default: true },

    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date,   default: null },
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model('user', userSchema)

export default userModel