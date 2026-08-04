// backend/src/repositories/AuditRepository.js
import prisma from '../config/prismaClient.js';

class AuditRepository {
  async create(data) {
    return await prisma.auditLog.create({ data });
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
      page = 1,
      limit = 50,
    } = filters;

    const and = [];

    // Support comma-separated action values (e.g. "USER_LOGIN,USER_LOGOUT")
    if (action) {
      const actions = action.split(',').map((a) => a.trim()).filter(Boolean);
      and.push({ action: actions.length === 1 ? actions[0] : { in: actions } });
    }

    if (branchId) and.push({ branchId });

    if (actorRole) {
      and.push({ actor: { path: ['role'], equals: actorRole } });
    }

    if (targetType) {
      and.push({ target: { path: ['type'], equals: targetType } });
    }

    if (actorName) {
      and.push({ actor: { path: ['name'], string_contains: actorName, mode: 'insensitive' } });
    } else {
     
      and.push({ NOT: { actor: { path: ['name'], equals: 'System' } } });
    }

    if (dateFrom || dateTo) {
      const createdAt = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      and.push({ createdAt });
    }

    const where = and.length > 0 ? { AND: and } : {};

    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    return {
      logs,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByTarget(targetType, targetId, limit = 20) {
    return await prisma.auditLog.findMany({
      where: {
        AND: [
          { target: { path: ['type'], equals: targetType } },
          { target: { path: ['id'], equals: targetId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export default new AuditRepository();