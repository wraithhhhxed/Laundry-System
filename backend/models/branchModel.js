
import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    email:      { type: String, required: true, unique: true },  // ← NEW
    password:   { type: String, required: true },                // ← NEW
    phone:      { type: String, required: true },
    image:      { type: String, required: true },
    speciality: { type: [String], required: true },
    about:      { type: String, required: true },
    fees:       { type: Number, default: 0 },
    address: {
        line1: { type: String, required: true },
        line2: { type: String, required: true }
    },
    available:    { type: Boolean, default: true },
    slots_booked: { type: Object, default: {} },
    date:         { type: Number, default: Date.now }
}, { minimize: false })

const branchModel = mongoose.models.branch || mongoose.model('branch', branchSchema)

export default branchModel