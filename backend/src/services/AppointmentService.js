import AppointmentRepository from '../repositories/AppointmentRepository.js';
import BranchRepository from '../repositories/BranchRepository.js';
import UserRepository from '../repositories/UserRepository.js';
import ServiceRepository from '../repositories/ServiceRepository.js';
import PromoCodeService from './PromoCodeService.js';
import * as SettingService from './settingService.js';
import inventoryService from './InventoryService.js';
import AuditService from './AuditService.js';
import { ApiError } from '../utils/ApiError.js';
import EmailService from './EmailService.js';

// Added 'archived' to valid statuses
const VALID_STATUSES = ['pending_approval', 'approved', 'picked_up', 'in_progress', 'out_for_delivery', 'delivered', 'archived'];

class AppointmentService {

  // ─── BOOK APPOINTMENT ───────────────────────────────────────────
  async bookAppointment(userId, branchId, slotDate, slotTime, servicesInput, extraDetails = {}, promoCode = null, addOns = [], actor = null) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw new ApiError(404, 'Branch not found');
    if (!branch.available) throw new ApiError(400, 'Branch not available');

    const slotDateTime = new Date(`${slotDate}T${slotTime}`);
    if (isNaN(slotDateTime.getTime()))
      throw new ApiError(400, 'Invalid slot date or time format');

    if (!servicesInput || servicesInput.length === 0)
      throw new ApiError(400, 'At least one service is required');

    const enrichedServices = [];
    let servicesTotal = 0;

    for (const item of servicesInput) {
      const { serviceId, kg } = item;
      if (!kg || kg < 1 || kg > 7)
        throw new ApiError(400, `KG must be between 1 and 7 (got ${kg})`);

      const service = await ServiceRepository.findById(serviceId);
      if (!service) throw new ApiError(400, `Service not found: ${serviceId}`);

      enrichedServices.push({
        serviceId: service.id,
        name: service.name,
        price: service.price,
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
      const user = await UserRepository.findById(userId);
      const { preferredPaymentMethod = 'cash', ...otherDetails } = extraDetails;

      const appointment = await AppointmentRepository.createWithCapacityCheck(
        branchId,
        slotDate,
        {
          userId,
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
          slotTime,
          date: BigInt(Date.now()),
          deliveryStatus: 'pending_approval',
          paymentStatus: 'unpaid',
          preferredPaymentMethod,
          ...otherDetails,
        }
      );
      appointmentCreated = true;

      const slotsBooked = branch.slotsBooked || {};
      if (!slotsBooked[slotDate]) slotsBooked[slotDate] = [];
      slotsBooked[slotDate].push(slotTime);
      await BranchRepository.updateSlotsBooked(branchId, slotsBooked);

      await AuditService.logAppointmentCreated(
        actor ?? { name: 'Client', role: 'client', userId },
        appointment
      );

      return appointment;
    } catch (err) {
      if (promoCodeId && !appointmentCreated)
        await PromoCodeService.releasePromoCode(promoCodeId);
      throw err;
    }
  }

  // ─── CONFIRM ACTUAL WEIGHT ──────────────────────────────────────
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

    const beforeSnapshot = appointment.services.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      actualKg: s.actualKg,
    }));

    let totalExcessKg = 0;
    for (const { actualKg } of actualServices) {
      const parsed = parseFloat(Number(actualKg).toFixed(2));
      if (parsed > 7) totalExcessKg += parseFloat((parsed - 7).toFixed(2));
    }
    const isOverweight = totalExcessKg > 0;

    for (const { serviceIndex, actualKg } of actualServices) {
      const svc = appointment.services[serviceIndex];
      if (!svc) throw new ApiError(400, `No service at index ${serviceIndex}`);

      const parsed = parseFloat(Number(actualKg).toFixed(2));
      await AppointmentRepository.updateServiceActualKg(svc.id, parsed);
    }

    let updates;
    if (isOverweight) {
      const deadline = new Date();
      deadline.setHours(17, 0, 0, 0);

      updates = {
        weightConfirmedAt: new Date(),
        weightConfirmedBy: branchId,
        overweightStatus: 'pending_decision',
        overweightExcessKg: totalExcessKg,
        overweightNotifiedAt: new Date(),
        overweightDeadline: deadline,
      };
    } else {
      updates = {
        weightConfirmedAt: new Date(),
        weightConfirmedBy: branchId,
        paymentStatus: 'pending_payment',
      };
    }

    const updated = await AppointmentRepository.updateById(appointmentId, updates);

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
        paymentStatus: updated.paymentStatus,
        overweightStatus: updated.overweightStatus,
      }
    );

    return updated;
  }

  // ─── RESOLVE OVERWEIGHT DECISION ────────────────────────────────
  async resolveOverweight(appointmentId, userId, resolution, actor = null) {
    if (!['split', 'trim'].includes(resolution))
      throw new ApiError(400, 'Resolution must be "split" or "trim"');

    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.userId !== userId)
      throw new ApiError(403, 'Unauthorized');
    if (appointment.overweightStatus !== 'pending_decision')
      throw new ApiError(400, 'No pending overweight decision for this appointment');

    const before = {
      overweightStatus: appointment.overweightStatus,
      services: appointment.services.map((s) => ({ id: s.id, actualKg: s.actualKg })),
    };

    if (resolution === 'trim') {
      for (const svc of appointment.services) {
        if (svc.actualKg != null && svc.actualKg > 7) {
          await AppointmentRepository.updateServiceActualKg(svc.id, 7);
        }
      }
    } else {
      let addedPriceTotal = 0;
      for (const svc of appointment.services) {
        if (svc.actualKg != null && svc.actualKg > 7) {
          const excessKg = parseFloat((svc.actualKg - 7).toFixed(2));
          await AppointmentRepository.addSplitLoad(appointmentId, {
            serviceId: svc.serviceId,
            name: svc.name,
            price: svc.price,
            kg: excessKg > 7 ? 7 : excessKg,
          });
          await AppointmentRepository.updateServiceActualKg(svc.id, 7);
          addedPriceTotal += svc.price ?? 0;
        }
      }

      if (addedPriceTotal > 0) {
        const newServicesTotal = appointment.servicesTotal + addedPriceTotal;
        const newSubtotal = newServicesTotal + appointment.addOnsTotal - appointment.discountAmount;
        const newVatAmount = parseFloat((newSubtotal * appointment.vatRate).toFixed(2));
        const newFinalAmount = parseFloat((newSubtotal + newVatAmount).toFixed(2));

        await AppointmentRepository.updateById(appointmentId, {
          servicesTotal: newServicesTotal,
          totalAmount: newSubtotal,
          vatAmount: newVatAmount,
          finalAmount: newFinalAmount,
        });
      }
    }

    const updated = await AppointmentRepository.updateById(appointmentId, {
      overweightStatus: 'resolved',
      overweightResolution: resolution,
      overweightResolvedAt: new Date(),
      paymentStatus: 'pending_payment',
    });

    await AuditService.logWeightConfirmed(
      actor ?? { name: 'Client', role: 'client', userId },
      appointment,
      before,
      {
        overweightStatus: 'resolved',
        overweightResolution: resolution,
        services: updated.services.map((s) => ({ id: s.id, actualKg: s.actualKg })),
      }
    );

    return updated;
  }

  // ─── AUTO-CANCEL EXPIRED OVERWEIGHT DECISIONS ───────────────────
  async autoCancelExpiredOverweightDecisions() {
    const expired = await AppointmentRepository.findPendingOverweightPastDeadline();
    for (const appointment of expired) {
      await AppointmentRepository.cancelById(appointment.id);
      await AppointmentRepository.updateById(appointment.id, {
        overweightStatus: 'resolved',
      });

      await AuditService.logAppointmentCancelled(
        { name: 'System', role: 'system' },
        appointment,
        'Auto-cancelled: no overweight decision received by deadline'
      );
    }
    if (expired.length > 0)
      console.log(`[AutoCancel] Cancelled ${expired.length} appointment(s) with expired overweight decisions.`);
    return expired.length;
  }

  // ─── CONFIRM PAYMENT ────────────────────────────────────────────
  async confirmPayment(appointmentId, paymentMethod, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');

    if (!['cash', 'online'].includes(paymentMethod))
      throw new ApiError(400, 'Payment method must be cash or online');

    const paymentStatus = paymentMethod === 'cash' ? 'paid_cash' : 'paid_online';

    const before = {
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod ?? null,
    };

    const updated = await AppointmentRepository.updateById(appointmentId, {
      payment: true,
      paymentStatus,
      paymentMethod,
      paymentPaidAt: new Date(),
    });

    await AuditService.logPaymentUpdated(
      actor ?? { name: 'System', role: 'system' },
      appointment,
      before,
      { paymentStatus, paymentMethod, paymentPaidAt: new Date() }
    );

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

    await AuditService.logAppointmentCancelled(
      actor ?? { name: cancelledBy, role: cancelledBy },
      appointment,
      `Cancelled by ${cancelledBy}`
    );

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

    if (newStatus === 'picked_up') {
      try {
        const userEmail = appointment.userData?.email;
        if (userEmail) {
          await EmailService.sendPickupReadyEmail(userEmail, appointment);
        }
      } catch (err) {
        console.warn(`[Email] Pickup email failed: ${err.message}`);
      }
    }

    if (newStatus === 'picked_up' && Array.isArray(appointment.addOns) && appointment.addOns.length > 0) {
      for (const addOn of appointment.addOns) {
        try {
          await inventoryService.deduct(appointment.branchId, addOn.productId, addOn.quantity);
        } catch (err) {
          console.warn(`[Inventory] Failed to deduct: ${err.message}`);
        }
      }
    }

    if (newStatus === 'delivered') {
      try {
        const userEmail = appointment.userData?.email;
        if (userEmail) {
          await EmailService.sendDeliveryCompletedEmail(userEmail, appointment);
        }
      } catch (err) {
        console.warn(`[Email] Delivery email failed: ${err.message}`);
      }
    }

    const updated = await AppointmentRepository.updateById(appointmentId, updates);

    await AuditService.logStatusChange(
      actor ?? { name: 'Branch', role: 'branchadmin', userId: branchId },
      appointment,
      fromStatus,
      newStatus
    );

    return updated;
  }

  // ─── CREATE WALK-IN APPOINTMENT ──────────────────────────────────
  async createWalkInAppointment(phone, guestName, branchId, slotTime, servicesInput, overweightResolution = null, extraDetails = {}, addOns = [], actor = null, fulfillmentMethod = 'SELF_PICKUP') {
    let user = await UserRepository.findByPhone(phone);
    if (!user) {
      const newUserData = {
        name: guestName || `Guest-${phone}`,
        email: `guest-${Date.now()}-${phone.slice(-4)}@walkin.local`,
        phone,
        password: null,
      };
      user = await UserRepository.create(newUserData);
    }

    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw new ApiError(404, 'Branch not found');
    if (!branch.available) throw new ApiError(400, 'Branch not available');

    const slotDate = new Date().toISOString().split('T')[0];

    if (!servicesInput || servicesInput.length === 0)
      throw new ApiError(400, 'At least one service is required');

    const enrichedServices = [];
    let servicesTotal = 0;

    for (const item of servicesInput) {
      const { serviceId, actualKg } = item;
      if (!actualKg || actualKg < 1 || actualKg > 50)
        throw new ApiError(400, `Actual weight must be between 1 and 50kg (got ${actualKg})`);

      const service = await ServiceRepository.findById(serviceId);
      if (!service) throw new ApiError(400, `Service not found: ${serviceId}`);

      enrichedServices.push({
        serviceId: service.id,
        name: service.name,
        price: service.price,
        kg: actualKg,
        actualKg,
      });

      servicesTotal += service.price;
    }

    let totalExcessKg = 0;
    let hasOverweight = false;

    for (const svc of enrichedServices) {
      if (svc.actualKg > 7) {
        totalExcessKg += parseFloat((svc.actualKg - 7).toFixed(2));
        hasOverweight = true;
      }
    }

    const addOnsTotal = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
    const subtotal = servicesTotal + addOnsTotal;

    let vatRate = 0;
    let vatAmount = 0;
    let finalAmount;

    try {
      vatRate = await SettingService.getVatRate();
      vatAmount = parseFloat((subtotal * vatRate).toFixed(2));
      finalAmount = parseFloat((subtotal + vatAmount).toFixed(2));
    } catch (err) {
      throw err;
    }

    let appointmentCreated = false;
    try {
      // ✅ Extract preferredPaymentMethod and email from extraDetails
      const { preferredPaymentMethod = 'cash', email, ...otherDetails } = extraDetails;
      
      // ✅ Save email for email-sending logic later
      const userEmail = email || user.email;

      const appointment = await AppointmentRepository.createWithCapacityCheck(
        branchId,
        slotDate,
        {
          userId: user.id,
          bookingSource: 'WALK_IN',
          guestName: guestName || null,
          guestContact: phone,
          fulfillmentMethod,
          branchData: branch,
          userData: user,
          services: enrichedServices,
          clothingTypes: [],
          addOns,
          servicesTotal,
          addOnsTotal,
          totalAmount: subtotal,
          vatRate,
          vatAmount,
          promoCodeId: null,
          promoCode: null,
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          finalAmount,
          slotTime: slotTime || 'walk_in',
          date: BigInt(Date.now()),
          weightConfirmedAt: new Date(),
          weightConfirmedBy: branchId,
          deliveryStatus: 'approved',
          paymentStatus: 'pending_payment',
          preferredPaymentMethod,
          // ✅ Don't include email here to avoid Prisma error
          ...otherDetails,
        }
      );
      appointmentCreated = true;

      // ✅ If ONLINE payment and has email, send payment link
      if (preferredPaymentMethod === 'online' && userEmail) {
        try {
          // TODO: Implement PayMongo email link logic here
          // await EmailService.sendOnlinePaymentLink(userEmail, appointment);
          console.log(`[PayMongo] Would send payment link to ${userEmail} for appointment ${appointment.id}`);
        } catch (err) {
          console.warn(`[PayMongo] Failed to send payment link: ${err.message}`);
        }
      }

      if (hasOverweight && overweightResolution) {
        if (!['split', 'trim'].includes(overweightResolution))
          throw new ApiError(400, 'Resolution must be "split" or "trim"');

        if (overweightResolution === 'split') {
          let addedPriceTotal = 0;
          for (const svc of appointment.services) {
            if (svc.actualKg != null && svc.actualKg > 7) {
              const excessKg = parseFloat((svc.actualKg - 7).toFixed(2));
              await AppointmentRepository.addSplitLoad(appointment.id, {
                serviceId: svc.serviceId,
                name: svc.name,
                price: svc.price,
                kg: excessKg > 7 ? 7 : excessKg,
              });
              await AppointmentRepository.updateServiceActualKg(svc.id, 7);
              addedPriceTotal += svc.price ?? 0;
            }
          }

          if (addedPriceTotal > 0) {
            const newServicesTotal = appointment.servicesTotal + addedPriceTotal;
            const newSubtotal = newServicesTotal + appointment.addOnsTotal;
            const newVatAmount = parseFloat((newSubtotal * appointment.vatRate).toFixed(2));
            const newFinalAmount = parseFloat((newSubtotal + newVatAmount).toFixed(2));

            await AppointmentRepository.updateById(appointment.id, {
              servicesTotal: newServicesTotal,
              totalAmount: newSubtotal,
              vatAmount: newVatAmount,
              finalAmount: newFinalAmount,
              overweightStatus: 'resolved',
              overweightResolution: 'split',
              overweightResolvedAt: new Date(),
            });
          }
        } else if (overweightResolution === 'trim') {
          for (const svc of appointment.services) {
            if (svc.actualKg != null && svc.actualKg > 7) {
              await AppointmentRepository.updateServiceActualKg(svc.id, 7);
            }
          }

          await AppointmentRepository.updateById(appointment.id, {
            overweightStatus: 'resolved',
            overweightResolution: 'trim',
            overweightResolvedAt: new Date(),
          });
        }
      } else if (hasOverweight && !overweightResolution) {
        const deadline = new Date();
        deadline.setHours(17, 0, 0, 0);

        await AppointmentRepository.updateById(appointment.id, {
          overweightStatus: 'pending_decision',
          overweightExcessKg: totalExcessKg,
          overweightNotifiedAt: new Date(),
          overweightDeadline: deadline,
          paymentStatus: 'unpaid',
        });
      }

      await AuditService.logAppointmentCreated(
        actor ?? { name: 'Walk-in', role: 'branchadmin', userId: branchId },
        appointment
      );

      return await AppointmentRepository.findById(appointment.id);
    } catch (err) {
      throw err;
    }
  }

  // ─── WALK-IN PHONE LOOKUP ────────────────────────────────────────
  async lookupUserByPhone(phone) {
    const user = await UserRepository.findByPhone(phone);
    if (!user) return null;
    return { 
      name: user.name, 
      phone: user.phone, 
      email: user.email 
    };
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

  // ⭐ SIMPLE ARCHIVE - USING EXISTING updateDeliveryStatus
  async archiveAppointment(appointmentId, branchId, actor) {
    // First, update deliveryStatus to 'archived'
    const result = await this.updateDeliveryStatus(appointmentId, branchId, 'archived', actor);
    
    // Second, set the archived field to true
    await AppointmentRepository.updateById(appointmentId, {
      archived: true,
      archivedAt: new Date(),
      archivedBy: actor?.userId || branchId,
    });
    
    // Return the updated appointment
    return await AppointmentRepository.findById(appointmentId);
  }
}

export default new AppointmentService();