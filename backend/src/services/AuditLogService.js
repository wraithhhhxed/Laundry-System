import AuditLogRepository from '../repositories/AuditLogRepository.js';

class AuditLogService {
  async log({ actorId, actorModel, actorName, actorEmail, action, req }) {
    const ip = req?.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || 'unknown';
    const userAgent = req?.headers['user-agent'] || 'unknown';
    return await AuditLogRepository.create({
      actorId, actorModel, actorName, actorEmail, action, ip, userAgent
    });
  }

  async getLogs(filters) {
    return await AuditLogRepository.findAll(filters);
  }
}

export default new AuditLogService();