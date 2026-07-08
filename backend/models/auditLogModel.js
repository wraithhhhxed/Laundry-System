import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'actorModel'
  },
  actorModel: {
    type: String,
    required: true,
    enum: ['user', 'branch', 'admin']
  },
  actorName: { type: String },
  actorEmail: { type: String },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout']
  },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const auditLogModel = mongoose.models.auditLog || mongoose.model('auditLog', auditLogSchema);
export default auditLogModel;