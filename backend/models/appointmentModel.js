import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema({
  userId:     { type: String, required: true },
  branchId:   { type: String, required: true },
  branchData: { type: Object, required: true },
  userData:   { type: Object, required: true },

  // ─── Per-service baskets (each with its own estimated kg) ─────
  services: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'service', required: true },
    name:      { type: String },
    price:     { type: Number },
    kg:        { type: Number, required: true, min: 1, max: 7 }, // estimated by client
    kgPrice:   { type: Number },
    actualKg:         { type: Number, default: null },           // set by branch after weighing
    actualKgPrice:    { type: Number, default: null },
    overweightCharge: { type: Number, default: 0 },
  }],

  clothingTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'clothingType',
  }],

  // ─── Add-ons ──────────────────────────────────────────────────
  addOns: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    name:      { type: String, required: true },
    price:     { type: Number, required: true },
    quantity:  { type: Number, required: true, min: 1 },
  }],

  // ─── Estimated amounts (set at booking) ───────────────────────
  servicesTotal:  { type: Number, required: true },
  kgPrice:        { type: Number, required: true },
  addOnsTotal:    { type: Number, default: 0 },
  totalAmount:    { type: Number, required: true },

  vatRate:        { type: Number, default: 0 },
  vatAmount:      { type: Number, default: 0 },

  promoCodeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'promoCode', default: null },
  promoCode:      { type: String,  default: null },
  discountType:   { type: String,  enum: ['flat', 'percent', null], default: null },
  discountValue:  { type: Number,  default: 0 },
  discountAmount: { type: Number,  default: 0 },

  finalAmount:    { type: Number, required: true },

  // ─── Actual amounts (set by branch after weighing) ────────────
  actualKgPriceTotal:    { type: Number, default: null },
  actualTotalAmount:     { type: Number, default: null },
  actualVatAmount:       { type: Number, default: null },
  actualFinalAmount:     { type: Number, default: null },
  overweightChargeTotal: { type: Number, default: 0 },
  weightConfirmedAt:     { type: Date,   default: null },
  weightConfirmedBy:     { type: String, default: null },

  // ─── Payment ──────────────────────────────────────────────────
  // preferredPaymentMethod: chosen by client at booking
  preferredPaymentMethod: {
    type: String,
    enum: ['cash', 'online'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: [
      'unpaid',           // default
      'pending_payment',  // weight confirmed, awaiting payment
      'paid_cash',        // branch confirmed cash
      'paid_online',      // online payment completed
    ],
    default: 'unpaid',
  },
  paymentMethod:  { type: String, enum: ['cash', 'online', null], default: null },
  paymentPaidAt:  { type: Date,   default: null },
  payment:        { type: Boolean, default: false }, // kept for backward compat

  // ─── Scheduling ───────────────────────────────────────────────
  slotDate: { type: String, required: true },
  slotTime: { type: String, required: true },
  date:     { type: Number, required: true },

  // ─── Addresses ────────────────────────────────────────────────
  pickupAddress: {
    line1: { type: String },
    line2: { type: String },
  },
  deliveryAddress: {
    line1: { type: String },
    line2: { type: String },
  },

  // ─── Status ───────────────────────────────────────────────────
  deliveryStatus: {
    type: String,
    enum: [
      'pending_approval',
      'approved',
      'picked_up',
      'in_progress',
      'out_for_delivery',
      'delivered',
    ],
    default: 'pending_approval',
  },
  cancelled:   { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },

  specialInstructions: { type: String },
  sessionId:           { type: String },

}, { timestamps: true })

const appointmentModel = mongoose.models.appointment || mongoose.model('appointment', appointmentSchema)
export default appointmentModel