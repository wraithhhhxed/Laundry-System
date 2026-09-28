import prisma from '../config/prismaClient.js';

class NotificationService {
  async create(userId, type, title, message) {
    try {
      return await prisma.notification.create({
        data: { userId, type, title, message },
      });
    } catch (err) {
      console.warn(`[Notification] Failed to create: ${err.message}`);
      return null;
    }
  }

  async getForUser(userId, limit = 20) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId, userId) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async clearAll(userId) {
    return await prisma.notification.deleteMany({ where: { userId } });
  }
}

export default new NotificationService();