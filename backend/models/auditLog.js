import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        // Appointment
        'APPOINTMENT_CREATED',
        'APPOINTMENT_STATUS_CHANGED',
        'APPOINTMENT_WEIGHT_CONFIRMED',
        'APPOINTMENT_PAYMENT_UPDATED',
        'APPOINTMENT_CANCELLED',

        // Auth
        'USER_LOGIN',
        'USER_LOGIN_FAILED',
        'USER_LOGOUT',

        // Settings
        'SETTING_CHANGED',

        // Inventory / Add-ons
        'INVENTORY_UPDATED',
        'INVENTORY_CREATED',
        'INVENTORY_DELETED',

        // Branch staff actions
        'BRANCH_CREATED',
        'BRANCH_UPDATED',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DELETED',
      ],
      index: true,
    },

    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name:   { type: String, default: 'System' },
      role:   { type: String, default: 'system' }, // superadmin | branchadmin | staff | client | system
    },

    target: {
      type:       { type: String }, // 'Appointment' | 'User' | 'Setting' | 'Inventory' | 'Branch'
      id:         { type: mongoose.Schema.Types.ObjectId },
      label:      { type: String }, // human-readable e.g. appointment reference number
    },

    branchId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Branch',
      index: true,
    },

    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after:  { type: mongoose.Schema.Types.Mixed, default: null },

    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    // e.g. { ip, userAgent, paymentMethod, reason }
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound indexes for common query patterns
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.userId': 1, createdAt: -1 });
auditLogSchema.index({ branchId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;