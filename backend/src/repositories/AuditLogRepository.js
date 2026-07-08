import auditLogModel from '../../models/auditLogModel.js'

class AuditLogRepository {
  async create(data) {
    return await auditLogModel.create(data);
  }

  async findAll({ page = 1, limit = 20, actorModel, action, search } = {}) {
    const filter = {};
    if (actorModel) filter.actorModel = actorModel;
    if (action) filter.action = action;
    if (search) {
      filter.$or = [
        { actorName: { $regex: search, $options: 'i' } },
        { actorEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await auditLogModel.countDocuments(filter);
    const logs = await auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  async deleteOlderThan(days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await auditLogModel.deleteMany({ createdAt: { $lt: cutoff } });
  }
}

export default new AuditLogRepository();