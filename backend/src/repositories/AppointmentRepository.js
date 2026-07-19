// backend/src/repositories/AppointmentRepository.js
import prisma from '../config/prismaClient.js';

// Lahat ng related rows na kailangang isama sa bawat query — sa Postgres,
// 'services', 'addOns', at 'clothingTypes' ay TOTOONG hiwalay na tables na
// (AppointmentService, AppointmentAddOn, AppointmentClothingType), hindi na
// embedded subdocuments gaya ng dati sa Mongoose.
//
// NOTE: hindi natin ma-i-include ang buong ClothingType detail (pangalan,
// atbp.) dahil ang AppointmentClothingType.clothingTypeId ay plain string
// lang sa schema natin, walang @relation papunta sa ClothingType model
// (parehong desisyon gaya ng serviceId/productId — walang enforced FK).
// Makukuha lang dito ang clothingTypeId; kung kailangan ng pangalan,
// kakailanganin ng hiwalay na lookup o dagdag na "name" snapshot column.
const INCLUDE_RELATIONS = {
  services: true,
  addOns: true,
  clothingTypes: true,
};

// Mga field na TOTOONG relations sa Prisma (hindi puwedeng ipasa nang diretso
// sa isang plain `data: updates` object) — kung sakaling may laman ang
// `updates` na isa sa mga ito, tatanggalin natin muna para hindi mag-error
// ang prisma.appointment.update(). Layunin: kagaya ng dating $set sa Mongoose
// na hindi dapat basta-basta nabubura/napapalitan ang related data.
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
    // Ang services/addOns/clothingTypes ay ipinapasa bilang plain arrays
    // (kagaya ng dating Mongoose shape) — dito na natin ino-convert papunta
    // sa Prisma nested-write format na kailangan ng relation tables.
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

  // Checkpoint lang — ini-record ang actualKg ng isang partikular na load
  // (AppointmentService row), HINDI nire-recalculate ang presyo. Ginagamit
  // ang sariling `id` ng row (hindi positional index) para ligtas at tiyak
  // kung aling load talaga ang ina-update.
  async updateServiceActualKg(appointmentServiceId, actualKg) {
    return await prisma.appointmentService.update({
      where: { id: appointmentServiceId },
      data: { actualKg },
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
}

export default new AppointmentRepository();