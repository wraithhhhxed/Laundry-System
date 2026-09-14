import prisma from '../config/prismaClient.js';
import { ApiError } from '../utils/ApiError.js';

const INCLUDE_RELATIONS = {
  services: true,
  addOns: true,
  clothingTypes: true,
};

const RELATION_FIELDS = ['services', 'addOns', 'clothingTypes'];

function stripRelationFields(updates) {
  const clean = { ...updates };
  for (const field of RELATION_FIELDS) delete clean[field];
  return clean;
}

class AppointmentRepository {
  async findById(id) {
    return await prisma.appointment.findUnique({
      where: { id },
      include: INCLUDE_RELATIONS,
    });
  }

  async findByUserId(userId) {
    return await prisma.appointment.findMany({
      where: { userId },
      include: INCLUDE_RELATIONS,
    });
  }

  async findByBranchId(branchId) {
    return await prisma.appointment.findMany({
      where: { branchId },
      include: INCLUDE_RELATIONS,
    });
  }

  async findAll() {
    return await prisma.appointment.findMany({
      include: INCLUDE_RELATIONS,
    });
  }

  async create(appointmentData) {
    const { services = [], addOns = [], clothingTypes = [], ...rest } = appointmentData;
    return await prisma.appointment.create({
      data: {
        ...rest,
        services: { create: services },
        addOns: { create: addOns },
        clothingTypes: { create: clothingTypes },
      },
      include: INCLUDE_RELATIONS,
    });
  }

  // Create appointment inside a single transaction with a per-day
  // capacity check (machineCount × 5) to prevent race conditions.
  async createWithCapacityCheck(branchId, slotDate, appointmentData) {
    const { services = [], addOns = [], clothingTypes = [], ...rest } = appointmentData;

    return await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw new ApiError(404, 'Branch not found');

      const activeCount = await tx.appointment.count({
        where: { branchId, slotDate, cancelled: false },
      });

      const capacity = branch.machineCount * 5;
      if (activeCount >= capacity)
        throw new ApiError(400, 'Branch is fully booked for this date');

      return await tx.appointment.create({
        data: {
          ...rest,
          branchId,
          slotDate,
          services: { create: services },
          addOns: { create: addOns },
          clothingTypes: { create: clothingTypes },
        },
        include: INCLUDE_RELATIONS,
      });
    });
  }

  // Record the actualKg for a specific AppointmentService row without
  // recalculating price. Uses the row's own id (not positional index).
  async updateServiceActualKg(appointmentServiceId, actualKg) {
    return await prisma.appointmentService.update({
      where: { id: appointmentServiceId },
      data: { actualKg },
    });
  }

  // Used when the client chooses "split into 2 loads" for an overweight
  // appointment — creates a new AppointmentService row with its own
  // fixed price snapshot.
  async addSplitLoad(appointmentId, { serviceId, name, price, kg }) {
    return await prisma.appointmentService.create({
      data: {
        appointmentId,
        serviceId,
        name,
        price,
        kg,
        actualKg: kg,
      },
    });
  }

  // Used by the auto-cancel checker/cron — finds appointments still in
  // "pending_decision" overweight status past their deadline.
  async findPendingOverweightPastDeadline() {
    return await prisma.appointment.findMany({
      where: {
        overweightStatus: 'pending_decision',
        overweightDeadline: { lt: new Date() },
        cancelled: false,
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async updateById(id, updates) {
    return await prisma.appointment.update({
      where: { id },
      data: stripRelationFields(updates),
      include: INCLUDE_RELATIONS,
    });
  }

  async cancelById(id) {
    return await prisma.appointment.update({
      where: { id },
      data: { cancelled: true },
      include: INCLUDE_RELATIONS,
    });
  }

  async updateDeliveryStatus(id, deliveryStatus) {
    return await prisma.appointment.update({
      where: { id },
      data: { deliveryStatus },
      include: INCLUDE_RELATIONS,
    });
  }

  async markCompleted(id) {
    return await prisma.appointment.update({
      where: { id },
      data: { isCompleted: true },
      include: INCLUDE_RELATIONS,
    });
  }

  async markPaid(id) {
    return await prisma.appointment.update({
      where: { id },
      data: {
        payment: true,
        paymentStatus: 'paid_online',
        paymentMethod: 'online',
        paymentPaidAt: new Date(),
      },
      include: INCLUDE_RELATIONS,
    });
  }

  async saveSessionId(id, sessionId) {
    return await prisma.appointment.update({
      where: { id },
      data: { sessionId },
      include: INCLUDE_RELATIONS,
    });
  }

  async saveQrPaymentIntentId(id, qrPaymentIntentId) {
    return await prisma.appointment.update({
      where: { id },
      data: { qrPaymentIntentId },
      include: INCLUDE_RELATIONS,
    });
  }
}

export default new AppointmentRepository();