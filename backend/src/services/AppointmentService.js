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
import NotificationService from './NotificationService.js';
import axios from 'axios';

const VALID_STATUSES = ['pending_approval', 'approved', 'picked_up', 'in_progress', 'out_for_delivery', 'delivered', 'archived'];

class AppointmentService {

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
    let validatedPromo = null;

    if (promoCode) {
      validatedPromo = await PromoCodeService.validateAndReservePromoCode(promoCode, servicesTotal, userId);
      promoCodeId = validatedPromo.promoCodeId;
      promoCodeStr = validatedPromo.code;
      discountType = validatedPromo.discountType;
      discountValue = validatedPromo.discountValue;
      discountAmount = validatedPromo.discountAmount;
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

      // ── Milestone redemption AFTER successful booking ─────────────
      if (validatedPromo?.assignedMilestone === 'FIFTH') {
        await UserRepository.markFifthStampRedeemed(userId);
      } else if (validatedPromo?.assignedMilestone === 'TENTH') {
        await UserRepository.resetLoyaltyCycle(userId);
      }
      // ──────────────────────────────────────────────────────────────

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

          // ── FIX: Loop until excess is used up (7kg max per basket) ──
          let remainingKg = excessKg;
          while (remainingKg > 0) {
            const basketKg = parseFloat(Math.min(7, remainingKg).toFixed(2));
            await AppointmentRepository.addSplitLoad(appointmentId, {
              serviceId: svc.serviceId,
              name: svc.name,
              price: svc.price,
              kg: basketKg,
            });
            addedPriceTotal += svc.price ?? 0;
            remainingKg -= basketKg;
          }
          // ──────────────────────────────────────────────────────────

          await AppointmentRepository.updateServiceActualKg(svc.id, 7);
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

  async generateWalkInQrPayment(appointmentId) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.payment) throw new ApiError(400, 'Appointment is already paid');

    const rawAmount = appointment.finalAmount ?? appointment.totalAmount ?? 0;
    if (!rawAmount || rawAmount <= 0)
      throw new ApiError(400, 'Appointment has no valid amount for payment');

    const secretAuth = `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`;
    const publicAuth = `Basic ${Buffer.from(process.env.PAYMONGO_PUBLIC_KEY + ':').toString('base64')}`;

    try {
      const intentRes = await axios.post(
        'https://api.paymongo.com/v1/payment_intents',
        {
          data: {
            attributes: {
              amount: Math.round(rawAmount * 100),
              currency: 'PHP',
              payment_method_allowed: ['qrph'],
              description: `Walk-in appointment ${appointmentId}`,
              metadata: { appointmentId },
            },
          },
        },
        { headers: { Authorization: secretAuth, 'Content-Type': 'application/json' } }
      );

      const paymentIntentId = intentRes.data.data.id;
      const clientKey = intentRes.data.data.attributes.client_key;

      const methodRes = await axios.post(
        'https://api.paymongo.com/v1/payment_methods',
        { data: { attributes: { type: 'qrph' } } },
        { headers: { Authorization: publicAuth, 'Content-Type': 'application/json' } }
      );

      const paymentMethodId = methodRes.data.data.id;

      const attachRes = await axios.post(
        `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
        { data: { attributes: { payment_method: paymentMethodId, client_key: clientKey } } },
        { headers: { Authorization: publicAuth, 'Content-Type': 'application/json' } }
      );

      const qrImageUrl = attachRes.data.data.attributes.next_action?.code?.image_url;
      if (!qrImageUrl) throw new ApiError(500, 'QR code was not returned by PayMongo');

      await AppointmentRepository.saveQrPaymentIntentId(appointmentId, paymentIntentId);

      return { qrImageUrl, paymentIntentId };
    } catch (err) {
      console.error('PayMongo QRPH error:', JSON.stringify(err.response?.data, null, 2) || err.message);
      throw new ApiError(500, err.response?.data?.errors?.[0]?.detail ?? 'QR code generation failed');
    }
  }

  async checkQrPaymentStatus(appointmentId) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.payment) return { paid: true };

    const paymentIntentId = appointment.qrPaymentIntentId;
    if (!paymentIntentId) throw new ApiError(400, 'No QR payment session found for this appointment');

    const secretAuth = `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`;

    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { Authorization: secretAuth } }
    );

    const status = response.data.data.attributes.status;

    if (status === 'succeeded') {
      await AppointmentRepository.updateById(appointmentId, {
        payment: true,
        paymentStatus: 'paid_online',
        paymentMethod: 'online',
        paymentPaidAt: new Date(),
      });
      return { paid: true };
    }

    return { paid: false, status };
  }

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

  async completeAppointment(appointmentId, branchId, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId);
    if (!appointment) throw new ApiError(404, 'Appointment not found');
    if (appointment.branchId !== branchId)
      throw new ApiError(403, 'Unauthorized');
    return await AppointmentRepository.markCompleted(appointmentId);
  }

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

      await NotificationService.create(
        appointment.userId,
        'picked_up',
        'Order Picked Up',
        'Your laundry has been picked up and is on its way to the branch.'
      );
    }

    if (newStatus === 'in_progress') {
      await NotificationService.create(
        appointment.userId,
        'in_progress',
        'Laundry in Progress',
        'Your laundry is currently being processed.'
      );
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

      await NotificationService.create(
        appointment.userId,
        'delivered',
        'Order Delivered',
        'Your laundry has been delivered. Thank you for choosing Selfie Wash!'
      );

      try {
        const updatedUser = await UserRepository.incrementLoyaltyStamps(appointment.userId);
        const newStampCount = updatedUser.loyaltyStamps;

        if (newStampCount === 5) {
          await NotificationService.create(
            appointment.userId,
            'stamp_milestone_5',
            'Reward Unlocked!',
            'You\'ve earned your 5th stamp! Check your profile for your reward.'
          );
        } else if (newStampCount === 10) {
          await NotificationService.create(
            appointment.userId,
            'stamp_milestone_10',
            'Reward Unlocked!',
            'You\'ve earned your 10th stamp! Check your profile for your reward.'
          );
        }
      } catch (err) {
        console.warn(`[Loyalty] Stamp increment failed: ${err.message}`);
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

    // ─── PROMO CODE VALIDATION ────────────────────────────────────
    let promoCodeId = null;
    let promoCodeStr = null;
    let discountType = null;
    let discountValue = 0;
    let discountAmount = 0;
    let validatedPromo = null;

    if (extraDetails.promoCode) {
      validatedPromo = await PromoCodeService.validateAndReservePromoCode(extraDetails.promoCode, servicesTotal, user.id);
      promoCodeId = validatedPromo.promoCodeId;
      promoCodeStr = validatedPromo.code;
      discountType = validatedPromo.discountType;
      discountValue = validatedPromo.discountValue;
      discountAmount = validatedPromo.discountAmount;
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
      const { preferredPaymentMethod = 'cash', email, promoCode: _ignoredPromoCode, ...otherDetails } = extraDetails;

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
          totalAmount: subtotal - discountAmount,
          vatRate,
          vatAmount,
          promoCodeId,
          promoCode: promoCodeStr,
          discountType,
          discountValue,
          discountAmount,
          finalAmount,
          slotTime: slotTime || 'walk_in',
          date: BigInt(Date.now()),
          weightConfirmedAt: new Date(),
          weightConfirmedBy: branchId,
          deliveryStatus: 'approved',
          paymentStatus: 'pending_payment',
          preferredPaymentMethod,
          ...otherDetails,
        }
      );
      appointmentCreated = true;

      // ── Save delivery address if provided ──────────────────────────
      if (fulfillmentMethod === 'DELIVERY' && extraDetails.address && extraDetails.address.trim()) {
        try {
          await UserRepository.updateById(user.id, { address: extraDetails.address.trim() });
        } catch (err) {
          console.warn(`[Address] Failed to save address: ${err.message}`);
        }
      }
      // ─────────────────────────────────────────────────────────────

      // ── Milestone redemption AFTER successful booking ─────────────
      if (validatedPromo?.assignedMilestone === 'FIFTH') {
        await UserRepository.markFifthStampRedeemed(user.id);
      } else if (validatedPromo?.assignedMilestone === 'TENTH') {
        await UserRepository.resetLoyaltyCycle(user.id);
      }
      // ──────────────────────────────────────────────────────────────

      if (preferredPaymentMethod === 'online' && userEmail) {
        try {
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

              // ── FIX: Loop until excess is used up (7kg max per basket) ──
              let remainingKg = excessKg;
              while (remainingKg > 0) {
                const basketKg = parseFloat(Math.min(7, remainingKg).toFixed(2));
                await AppointmentRepository.addSplitLoad(appointment.id, {
                  serviceId: svc.serviceId,
                  name: svc.name,
                  price: svc.price,
                  kg: basketKg,
                });
                addedPriceTotal += svc.price ?? 0;
                remainingKg -= basketKg;
              }
              // ──────────────────────────────────────────────────────────

              await AppointmentRepository.updateServiceActualKg(svc.id, 7);
            }
          }

          if (addedPriceTotal > 0) {
            const newServicesTotal = appointment.servicesTotal + addedPriceTotal;
            const newSubtotal = newServicesTotal + appointment.addOnsTotal - appointment.discountAmount;
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
      if (promoCodeId && !appointmentCreated) await PromoCodeService.releasePromoCode(promoCodeId);
      throw err;
    }
  }

      async lookupUserByPhone(phone) {
    const user = await UserRepository.findByPhone(phone);
    if (!user) return null;

    const { fifthStampReward, tenthStampReward } =
      await PromoCodeService.getMilestoneRewards();

    // Convert address object to readable string
    let addressString = null;
    if (user.address) {
      if (typeof user.address === 'string') {
        addressString = user.address;
      } else if (typeof user.address === 'object') {
        // Join line1 + line2 with comma separator
        addressString = [user.address.line1, user.address.line2]
          .filter(Boolean)
          .join(', ');
      }
    }

    return {
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: addressString,
      loyaltyStamps: user.loyaltyStamps,
      fifthStampRedeemedAt: user.fifthStampRedeemedAt,
      fifthStampReward,
      tenthStampReward,
    };
  }

  async getAppointmentsByUser(userId) {
    return await AppointmentRepository.findByUserId(userId);
  }

  async getAppointmentsByBranch(branchId) {
    return await AppointmentRepository.findByBranchId(branchId);
  }

  async getAllAppointments() {
    return await AppointmentRepository.findAll();
  }

  async deleteAllAppointments(actor = null) {
    const result = await AppointmentRepository.deleteAllAppointments();
    console.log(`[Maintenance] Deleted ${result.count} appointment(s) and their related records.`);
    return { deletedCount: result.count };
  }

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

  async archiveAppointment(appointmentId, branchId, actor) {
    const result = await this.updateDeliveryStatus(appointmentId, branchId, 'archived', actor);

    await AppointmentRepository.updateById(appointmentId, {
      archived: true,
      archivedAt: new Date(),
      archivedBy: actor?.userId || branchId,
    });

    return await AppointmentRepository.findById(appointmentId);
  }
}

export default new AppointmentService();