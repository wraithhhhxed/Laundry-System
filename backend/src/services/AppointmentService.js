import AppointmentRepository from '../repositories/AppointmentRepository.js';
import BranchRepository from '../repositories/BranchRepository.js';
import UserRepository from '../repositories/UserRepository.js';
import ServiceRepository from '../repositories/ServiceRepository.js';
import PromoCodeService from './PromoCodeService.js';
import * as SettingService from './SettingService.js';
import inventoryService from './InventoryService.js';
import AuditService from './AuditService.js';
import { ApiError } from '../utils/ApiError.js';

const VALID_STATUSES = ['pending_approval', 'approved', 'picked_up', 'in_progress', 'out_for_delivery', 'delivered'];

// NOTE: Ang PromoCodeService, SettingService, at inventoryService ay hindi pa
// kasama sa Prisma migration na ito (hiwalay na TODO) — kung Mongoose pa rin
// sila sa likod, posibleng mag-error ang mga tawag dito hangga't hindi pa
// sila na-convert.

class AppointmentService {

  // ─── BOOK APPOINTMENT ───────────────────────────────────────────
  // Fixed per-load/package pricing lang — ang `kg` ay 7kg CAPACITY CHECK LANG,
  // HINDI presyo driver. Ang presyo ay direktang snapshot ng Service.price.
  async bookAppointment(userId, branchId, slotDate, slotTime, servicesInput, extraDetails = {}, promoCode = null, addOns = [], actor = null) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw new ApiError(404, 'Branch not found');
    if (!branch.available) throw new ApiError(400, 'Branch not available');

    const slotDateTime = new Date(`${slotDate}T${slotTime}`);
    if (isNaN(slotDateTime.getTime()))
      throw new ApiError(400, 'Invalid slot date or time format');

    const slotsBooked = branch.slotsBooked || {};
    if (slotsBooked[slotDate]) {
      const slotCount = slotsBooked[slotDate].filter((t) => t === slotTime).length;
      if (slotCount >= 5) throw new ApiError(400, 'Slot fully booked');
    }

    if (!servicesInput || servicesInput.length === 0)
      throw new ApiError(400, 'At least one service is required');

    const enrichedServices = [];
    let servicesTotal = 0;

    for (const item of servicesInput) {
      const { serviceId, kg } = item;
      // kg = capacity check lang (7kg cap per load), hindi presyo driver.
      if (!kg || kg < 1 || kg > 7)
        throw new ApiError(400, `KG must be between 1 and 7 (got ${kg})`);

      const service = await ServiceRepository.findById(serviceId);
      if (!service) throw new ApiError(400, `Service not found: ${serviceId}`);

      enrichedServices.push({
        serviceId: service.id,
        name: service.name,
        price: service.price, // snapshot ng fixed package price noong booking
        kg,
        actualKg: null,
      });

      servicesTotal += service.price;
    }

    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
    const subtotal = servicesTotal + addOnsTotal;

    let promoCodeId = null;
    let promoCodeStr = null;
    let discountType = null;
    let discountValue = 0;
    let discountAmount = 0;

    if (promoCode) {
      // Discount base = services lang (hindi kasama addOns), gaya ng dating lohika.
      const validated = await PromoCodeService.validateAndReservePromoCode(promoCode, servicesTotal);
      promoCodeId = validated.promoCodeId;
      promoCodeStr = validated.code;
      discountType = validated.discountType;
      discountValue = validated.discountValue;
      discountAmount = validated.discountAmount;
    }

    let vatRate = 0;
    let vatAmount = 0;
    let finalAmount;

    try {
      const discountedBase = subtotal - discountAmount;
      vatRate = await SettingService.getVatRate();
      vatAmount = parseFloat((discountedBase * vatRate).toFixed(2));
      finalAmount = parseFloat((discountedBase + vatAmount).toFixed(2));
    } catch (err) {
      if (promoCodeId) await PromoCodeService.releasePromoCode(promoCodeId);
      throw err;
    }

    let appointmentCreated = false;
    try {
      if (!slotsBooked[slotDate]) slotsBooked[slotDate] = [];
      slotsBooked[slotDate].push(slotTime);
      await BranchRepository.updateSlotsBooked(branchId, slotsBooked);

      const user = await UserRepository.findById(userId);
      const { preferredPaymentMethod = 'cash', ...otherDetails } = extraDetails;

      const appointment = await AppointmentRepository.create({
        userId,
        branchId,
        branchData: branch,
        userData: user,
        services: enrichedServices,
        clothingTypes: [],
        addOns,
        servicesTotal,
        addOnsTotal,
        totalAmount: subtotal - discountAmount,
        vatRate,
        vatAmount,
        promoCodeId,
        promoCode: promoCodeStr,
        discountType,
        discountValue,
        discountAmount,
        finalAmount,
        slotDate,
        slotTime,
        date: BigInt(Date.now()),
        deliveryStatus: 'pending_approval',
        paymentStatus: 'unpaid',
        preferredPaymentMethod,
        ...otherDetails,
      });
      appointmentCreated = true;

      // ── AUDIT ──────────────────────────────────────────────────
      await AuditService.logAppointmentCreated(
        actor ?? { name: 'Client', role: 'client', userId },
        appointment
      );
      // ──────────────────────────────────────────────────────────

      return appointment;
    } catch (err) {
      if (promoCodeId && !appointmentCreated)
        await PromoCodeService.releasePromoCode(promoCodeId);
      throw err;
    }
  }

  // ─── CONFIRM ACTUAL WEIGHT ──────────────────────────────────────
  // Checkpoint LANG bago mag-request ng bayad — HINDI presyo trigger.
  // Kung sumobra ang timbang sa 7kg cap: bawasan ng customer O gawing 2
  // hiwalay na load — WALANG automatic "overweight fee" formula dito.
  //
  // CAVEAT: gumagamit pa rin ng `serviceIndex` (positional) ang controller
  // para i-match ang tamang load — hindi ito 100% guaranteed na order sa
  // Postgres kagaya ng dating Mongoose embedded array. Gumana ito nang tama
  // sa normal na paggamit (freshly-created rows), pero kung gusto ng
  // mas mahigpit na garantiya sa hinaharap, iminumungkahi kong magdagdag ng
  // explicit na `loadIndex` column sa AppointmentService model.
  async confirmActualWeight(appointmentId, branchId, actualServices, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.branchId !== branchId)
      throw new ApiError(403, 'Unauthorized');
    if (appointment.cancelled)
      throw new ApiError(400, 'Cannot update a cancelled appointment');

    for (const { serviceIndex, actualKg } of actualServices) {
      if (actualKg === null || actualKg === undefined || actualKg === '')
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight is required`);

      const parsed = Number(actualKg);
      if (isNaN(parsed) || !isFinite(parsed))
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight must be a valid number`);
      if (parsed <= 0)
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight must be greater than 0`);
      if (parsed > 50)
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight of ${parsed}kg seems unrealistic (max 50kg per basket)`);
    }

    // ── snapshot before ────────────────────────────────────────
    const beforeSnapshot = appointment.services.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      actualKg: s.actualKg,
    }));
    // ──────────────────────────────────────────────────────────

    for (const { serviceIndex, actualKg } of actualServices) {
      const svc = appointment.services[serviceIndex];
      if (!svc) throw new ApiError(400, `No service at index ${serviceIndex}`);

      const parsed = parseFloat(Number(actualKg).toFixed(2));
      await AppointmentRepository.updateServiceActualKg(svc.id, parsed);
    }

    const updated = await AppointmentRepository.updateById(appointmentId, {
      weightConfirmedAt: new Date(),
      weightConfirmedBy: branchId,
      paymentStatus: 'pending_payment',
    });

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logWeightConfirmed(
      actor ?? { name: 'Branch', role: 'branchadmin', userId: branchId },
      appointment,
      { services: beforeSnapshot, paymentStatus: appointment.paymentStatus },
      {
        services: updated.services.map((s) => ({
          serviceId: s.serviceId,
          name: s.name,
          actualKg: s.actualKg,
        })),
        finalAmount: updated.finalAmount,
        paymentStatus: 'pending_payment',
      }
    );
    // ────────────────────────────────────────────────────────────

    return updated;
  }

  // ─── CONFIRM PAYMENT ────────────────────────────────────────────
  async confirmPayment(appointmentId, paymentMethod, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');

    if (!['cash', 'online'].includes(paymentMethod))
      throw new ApiError(400, 'Payment method must be cash or online');

    const paymentStatus = paymentMethod === 'cash' ? 'paid_cash' : 'paid_online';

    // ── snapshot before ────────────────────────────────────────
    const before = {
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod ?? null,
    };
    // ──────────────────────────────────────────────────────────

    const updated = await AppointmentRepository.updateById(appointmentId, {
      payment: true,
      paymentStatus,
      paymentMethod,
      paymentPaidAt: new Date(),
    });

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logPaymentUpdated(
      actor ?? { name: 'System', role: 'system' },
      appointment,
      before,
      { paymentStatus, paymentMethod, paymentPaidAt: new Date() }
    );
    // ────────────────────────────────────────────────────────────

    return updated;
  }

  // ─── CANCEL APPOINTMENT ─────────────────────────────────────────
  async cancelAppointment(appointmentId, cancelledBy, actorId, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');

    if (cancelledBy === 'user' && appointment.userId !== actorId)
      throw new ApiError(403, 'Unauthorized');
    if (cancelledBy === 'branch' && appointment.branchId !== actorId)
      throw new ApiError(403, 'Unauthorized');

    if (cancelledBy === 'user' && appointment.deliveryStatus !== 'pending_approval')
      throw new ApiError(400, 'Cancellation is no longer allowed once your appointment has been approved by the branch');

    await AppointmentRepository.cancelById(appointmentId);

    const branch = await BranchRepository.findById(appointment.branchId);
    if (branch) {
      const slotsBooked = branch.slotsBooked || {};
      if (slotsBooked[appointment.slotDate]) {
        const idx = slotsBooked[appointment.slotDate].indexOf(appointment.slotTime);
        if (idx > -1) slotsBooked[appointment.slotDate].splice(idx, 1);
        await BranchRepository.updateSlotsBooked(appointment.branchId, slotsBooked);
      }
    }

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logAppointmentCancelled(
      actor ?? { name: cancelledBy, role: cancelledBy },
      appointment,
      `Cancelled by ${cancelledBy}`
    );
    // ────────────────────────────────────────────────────────────

    return true;
  }

  // ─── COMPLETE APPOINTMENT ───────────────────────────────────────
  async completeAppointment(appointmentId, branchId, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.branchId !== branchId)
      throw new ApiError(403, 'Unauthorized');
    return await AppointmentRepository.markCompleted(appointmentId);
  }

  // ─── UPDATE DELIVERY STATUS ─────────────────────────────────────
  async updateDeliveryStatus(appointmentId, branchId, newStatus, actor = null) {
    if (!VALID_STATUSES.includes(newStatus)) throw new ApiError(400, 'Invalid status');

    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.branchId !== branchId)
      throw new ApiError(403, 'Unauthorized');

    const fromStatus = appointment.deliveryStatus;

    const updates = { deliveryStatus: newStatus };
    if (newStatus === 'delivered') updates.isCompleted = true;

    if (newStatus === 'picked_up' && Array.isArray(appointment.addOns) && appointment.addOns.length > 0) {
      for (const addOn of appointment.addOns) {
        try {
          await inventoryService.deduct(appointment.branchId, addOn.productId, addOn.quantity);
        } catch (err) {
          console.warn(`[Inventory] Failed to deduct: ${err.message}`);
        }
      }
    }

    const updated = await AppointmentRepository.updateById(appointmentId, updates);

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logStatusChange(
      actor ?? { name: 'Branch', role: 'branchadmin', userId: branchId },
      appointment,
      fromStatus,
      newStatus
    );
    // ────────────────────────────────────────────────────────────

    return updated;
  }

  // ─── GETTERS ────────────────────────────────────────────────────
  async getAppointmentsByUser(userId) {
    return await AppointmentRepository.findByUserId(userId);
  }

  async getAppointmentsByBranch(branchId) {
    return await AppointmentRepository.findByBranchId(branchId);
  }

  async getAllAppointments() {
    return await AppointmentRepository.findAll();
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────
  async getDashboardData() {
    const [appointments, totalBranches, totalCustomers] = await Promise.all([
      AppointmentRepository.findAll(),
      BranchRepository.findAll().then((b) => b.length),
      UserRepository.findAll ? UserRepository.findAll().then((u) => u.length) : 0,
    ]);
    return this._buildDashboard(appointments, { totalBranches, totalCustomers, includeCounts: true });
  }

  async getBranchDashboardData(branchId) {
    const appointments = await AppointmentRepository.findByBranchId(branchId);
    return this._buildDashboard(appointments, { includeCounts: false });
  }

  _buildDashboard(appointments, { totalBranches, totalCustomers, includeCounts }) {
    const statusCounts = {
      completed: appointments.filter((a) => a.isCompleted).length,
      cancelled: appointments.filter((a) => a.cancelled).length,
      pending: appointments.filter((a) => !a.isCompleted && !a.cancelled).length,
    };

    // finalAmount = SNAPSHOT ng presyo noong booking, hindi na nagbabago
    // pagkatapos ng weight confirmation — kaya ito na lang ang gamitin.
    const totalEarnings = appointments
      .filter((a) => a.isCompleted)
      .reduce((sum, a) => sum + (a.finalAmount ?? a.totalAmount ?? 0), 0);

    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyMap[key] = 0;
    }
    appointments
      .filter((a) => a.isCompleted)
      .forEach((a) => {
        // a.date ay BigInt sa Prisma — kailangang i-convert papunta Number
        // bago ipasa sa `new Date()`.
        const key = new Date(Number(a.date)).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (monthlyMap[key] !== undefined)
          monthlyMap[key] += a.finalAmount ?? a.totalAmount ?? 0;
      });

    const earningsByMonth = Object.entries(monthlyMap).map(([month, earnings]) => ({ month, earnings }));
    const latestAppointments = [...appointments]
      .sort((a, b) => Number(b.date) - Number(a.date))
      .slice(0, 5);

    const serviceMap = {};
    appointments.forEach((a) => {
      const serviceList = Array.isArray(a.services) ? a.services : [];
      serviceList.forEach((s) => {
        const name = s?.name || 'Unknown';
        serviceMap[name] = (serviceMap[name] || 0) + 1;
      });
    });
    const appointmentsByService = Object.entries(serviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalEarnings,
      totalAppointments: appointments.length,
      statusCounts,
      earningsByMonth,
      latestAppointments,
      appointmentsByService,
      ...(includeCounts && { totalBranches, totalCustomers }),
    };
  }
}

export default new AppointmentService();