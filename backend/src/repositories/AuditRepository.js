import AuditLog from '../../models/AuditLog.js';

class AuditRepository {
  async create(data) {
    const log = new AuditLog(data);
    return log.save();
  }

  async findAll(filters = {}) {
    const {
      action,
      branchId,
      actorName,
      actorRole,
      targetType,
      dateFrom,
      dateTo,
      page  = 1,
      limit = 50,
    } = filters;

    const query = {};

    // Support comma-separated action values (e.g. "USER_LOGIN,USER_LOGOUT")
    if (action) {
      const actions = action.split(',').map(a => a.trim()).filter(Boolean);
      query.action = actions.length === 1 ? actions[0] : { $in: actions };
    }

    if (branchId)   query.branchId       = branchId;
    if (actorRole)  query['actor.role']  = actorRole;
    if (targetType) query['target.type'] = targetType;

    if (actorName) {
      query['actor.name'] = { $regex: actorName, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Exclude ghost records — old logs written before auth middleware fix
    // that have no real actor name (stored as null or 'System')
    query['actor.name'] = query['actor.name'] ?? { $nin: [null, 'System'] };

    const skip  = (page - 1) * limit;
    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return {
      logs,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByTarget(targetType, targetId, limit = 20) {
    return AuditLog.find({
      'target.type': targetType,
      'target.id':   targetId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export default new AuditRepository();