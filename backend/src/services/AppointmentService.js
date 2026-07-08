import { Types } from 'mongoose'
import AppointmentRepository from '../repositories/AppointmentRepository.js'
import BranchRepository from '../repositories/BranchRepository.js'
import UserRepository from '../repositories/UserRepository.js'
import ServiceRepository from '../repositories/ServiceRepository.js'
import KgRateRepository from '../repositories/KgRateRepository.js'
import PromoCodeService from './PromoCodeService.js'
import * as SettingService from './SettingService.js'
import inventoryService from './InventoryService.js'
import AuditService from './AuditService.js'
import { ApiError } from '../utils/ApiError.js'
import appointmentModel from '../../models/appointmentModel.js'

const VALID_STATUSES = ['pending_approval', 'approved', 'picked_up', 'in_progress', 'out_for_delivery', 'delivered']

// ─── HELPER: resolve kg rate using floor + ₱10/0.1kg fractional surcharge ───
//
// Business rule:
//   • Base  = rate of floor(actualKg)          e.g. 1.1kg → 1kg rate = ₱100
//   • Each 0.1kg (or part) above the floor     e.g. 1.1kg → 1 unit   = +₱10
//   • Fractional charge is capped at (nextBracketRate − baseRate) so we
//     never charge MORE than just jumping to the next bracket
//   • >7kg = 7kg rate + ₱20/kg overweight (unchanged)
//
// Examples (1kg=₱100, 2kg=₱200, 3kg=₱270):
//   1.0kg → ₱100
//   1.1kg → ₱100 + 1×₱10 = ₱110
//   1.3kg → ₱100 + 3×₱10 = ₱130
//   1.9kg → ₱100 + 9×₱10 = ₱190
//   2.9kg → ₱200 + min(9×₱10, ₱270−₱200) = ₱200 + ₱70 = ₱270  (capped)
//   7.5kg → ₱600 + 0.5×₱20 = ₱610
//
const resolveKgRate = async (actualKg) => {
  // ── >7kg overweight ──────────────────────────────────────────────────────────
  if (actualKg > 7) {
    const maxRate = await KgRateRepository.findByKg(7)
    if (!maxRate) throw new ApiError(404, 'No rate found for 7kg')
    const extraKg          = parseFloat((actualKg - 7).toFixed(4))
    const overweightCharge = parseFloat((extraKg * 20).toFixed(2))
    const actualKgPrice    = parseFloat((maxRate.price + overweightCharge).toFixed(2))
    return { actualKgPrice, overweightCharge }
  }

  // ── 1–7kg: floor bracket + fractional surcharge ──────────────────────────────
  const floorKg = Math.max(1, Math.floor(actualKg))          // sub-1kg guard → floor to 1
  const decimal = parseFloat((actualKg - floorKg).toFixed(4)) // e.g. 1.1 → 0.1

  const baseRate = await KgRateRepository.findByKg(floorKg)
  if (!baseRate) throw new ApiError(404, `No rate found for ${floorKg}kg`)

  // Exact bracket — no surcharge needed
  if (decimal === 0) {
    return { actualKgPrice: baseRate.price, overweightCharge: 0 }
  }

  // ceil(decimal / 0.1) so 0.1 → 1 unit, 0.11 → 2 units, 0.35 → 4 units
  const fractionalUnits  = Math.ceil(parseFloat((decimal / 0.1).toFixed(6)))
  const fractionalCharge = fractionalUnits * 10

  // Cap: fractional charge cannot push price above the next bracket rate
  let cappedCharge = fractionalCharge
  if (floorKg < 7) {
    const nextRate = await KgRateRepository.findByKg(floorKg + 1)
    if (nextRate) {
      const maxDelta = nextRate.price - baseRate.price
      cappedCharge   = Math.min(fractionalCharge, maxDelta)
    }
  }

  const actualKgPrice = parseFloat((baseRate.price + cappedCharge).toFixed(2))
  return { actualKgPrice, overweightCharge: 0 }
}

class AppointmentService {

  // ─── BOOK APPOINTMENT ───────────────────────────────────────────
  async bookAppointment(userId, branchId, slotDate, slotTime, servicesInput, extraDetails = {}, promoCode = null, addOns = [], actor = null) {
    const branch = await BranchRepository.findById(branchId)
    if (!branch) throw new ApiError(404, 'Branch not found')
    if (!branch.available) throw new ApiError(400, 'Branch not available')

    const slotDateTime = new Date(`${slotDate}T${slotTime}`)
    if (isNaN(slotDateTime.getTime()))
      throw new ApiError(400, 'Invalid slot date or time format')

    const slotsBooked = branch.slots_booked || {}
    if (slotsBooked[slotDate]) {
      const slotCount = slotsBooked[slotDate].filter(t => t === slotTime).length
      if (slotCount >= 5) throw new ApiError(400, 'Slot fully booked')
    }

    if (!servicesInput || servicesInput.length === 0)
      throw new ApiError(400, 'At least one service is required')

    const enrichedServices = []
    let servicesTotal = 0
    let kgPriceTotal  = 0

    for (const item of servicesInput) {
      const { serviceId, kg } = item
      if (!kg || kg < 1 || kg > 7)
        throw new ApiError(400, `KG must be between 1 and 7 (got ${kg})`)

      const service = await ServiceRepository.findById(serviceId)
      if (!service) throw new ApiError(400, `Service not found: ${serviceId}`)

      const kgRate = await KgRateRepository.findByKg(kg)
      if (!kgRate) throw new ApiError(404, `No rate found for ${kg}kg`)

      enrichedServices.push({
        serviceId:        service._id,
        name:             service.name,
        price:            service.price,
        kg,
        kgPrice:          kgRate.price,
        actualKg:         null,
        actualKgPrice:    null,
        overweightCharge: 0,
      })

      servicesTotal += service.price
      kgPriceTotal  += kgRate.price
    }

    const addOnsTotal = addOns.reduce((sum, a) => sum + (a.price * a.quantity), 0)
    const serviceBase = servicesTotal + kgPriceTotal
    const totalAmount = serviceBase + addOnsTotal

    let promoCodeId    = null
    let promoCodeStr   = null
    let discountType   = null
    let discountValue  = 0
    let discountAmount = 0

    if (promoCode) {
      const validated = await PromoCodeService.validateAndReservePromoCode(promoCode, serviceBase)
      promoCodeId     = validated.promoCodeId
      promoCodeStr    = validated.code
      discountType    = validated.discountType
      discountValue   = validated.discountValue
      discountAmount  = validated.discountAmount
    }

    let vatRate   = 0
    let vatAmount = 0
    let finalAmount

    try {
      const discountedBase = totalAmount - discountAmount
      vatRate     = await SettingService.getVatRate()
      vatAmount   = parseFloat((discountedBase * vatRate).toFixed(2))
      finalAmount = parseFloat((discountedBase + vatAmount).toFixed(2))
    } catch (err) {
      if (promoCodeId) await PromoCodeService.releasePromoCode(promoCodeId)
      throw err
    }

    let appointmentCreated = false
    try {
      if (!slotsBooked[slotDate]) slotsBooked[slotDate] = []
      slotsBooked[slotDate].push(slotTime)
      await BranchRepository.updateSlotsBooked(branchId, slotsBooked)

      const user = await UserRepository.findById(userId)
      const { preferredPaymentMethod = 'cash', ...otherDetails } = extraDetails

      const appointment = await AppointmentRepository.create({
        userId,
        branchId,
        branchData:    branch.toObject(),
        userData:      user.toObject(),
        services:      enrichedServices,
        clothingTypes: [],
        addOns,
        servicesTotal,
        kgPrice:       kgPriceTotal,
        addOnsTotal,
        totalAmount,
        vatRate,
        vatAmount,
        promoCodeId,
        promoCode:     promoCodeStr,
        discountType,
        discountValue,
        discountAmount,
        finalAmount,
        slotDate,
        slotTime,
        date:                   Date.now(),
        deliveryStatus:         'pending_approval',
        paymentStatus:          'unpaid',
        preferredPaymentMethod,
        ...otherDetails
      })
      appointmentCreated = true

      // ── AUDIT ──────────────────────────────────────────────────
      await AuditService.logAppointmentCreated(
        actor ?? { name: 'Client', role: 'client', userId },
        appointment
      )
      // ──────────────────────────────────────────────────────────

      return appointment

    } catch (err) {
      if (promoCodeId && !appointmentCreated)
        await PromoCodeService.releasePromoCode(promoCodeId)
      throw err
    }
  }

  // ─── CONFIRM ACTUAL WEIGHT ──────────────────────────────────────
  async confirmActualWeight(appointmentId, branchId, actualServices, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')
    if (appointment.branchId.toString() !== branchId)
      throw new ApiError(403, 'Unauthorized')
    if (appointment.cancelled)
      throw new ApiError(400, 'Cannot update a cancelled appointment')

    for (const { serviceIndex, actualKg } of actualServices) {
      if (actualKg === null || actualKg === undefined || actualKg === '')
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight is required`)

      const parsed = Number(actualKg)
      if (isNaN(parsed) || !isFinite(parsed))
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight must be a valid number`)
      if (parsed <= 0)
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight must be greater than 0`)
      if (parsed > 50)
        throw new ApiError(400, `Basket ${serviceIndex + 1}: actual weight of ${parsed}kg seems unrealistic (max 50kg per basket)`)
    }

    const updatedServices     = appointment.services.map(s => s.toObject ? s.toObject() : { ...s })
    let actualKgPriceTotal    = 0
    let overweightChargeTotal = 0

    // ── snapshot before ────────────────────────────────────────
    const beforeSnapshot = appointment.services.map(s => ({
      serviceId:     s.serviceId,
      name:          s.name,
      actualKg:      s.actualKg,
      actualKgPrice: s.actualKgPrice,
    }))
    // ──────────────────────────────────────────────────────────

    for (const { serviceIndex, actualKg } of actualServices) {
      const svc = updatedServices[serviceIndex]
      if (!svc) throw new ApiError(400, `No service at index ${serviceIndex}`)

      const parsed = parseFloat(Number(actualKg).toFixed(2))
      const { actualKgPrice, overweightCharge } = await resolveKgRate(parsed)

      updatedServices[serviceIndex] = {
        ...svc,
        actualKg:         parsed,
        actualKgPrice,
        overweightCharge,
      }

      actualKgPriceTotal    += actualKgPrice
      overweightChargeTotal += overweightCharge
    }

    const actualTotalAmount = appointment.servicesTotal + actualKgPriceTotal + appointment.addOnsTotal
    const discountedBase    = actualTotalAmount - (appointment.discountAmount || 0)
    const vatRate           = appointment.vatRate || 0
    const actualVatAmount   = parseFloat((discountedBase * vatRate).toFixed(2))
    const actualFinalAmount = parseFloat((discountedBase + actualVatAmount).toFixed(2))

    const positionalSets = {}
    updatedServices.forEach((svc, idx) => {
      positionalSets[`services.${idx}.actualKg`]         = svc.actualKg
      positionalSets[`services.${idx}.actualKgPrice`]    = svc.actualKgPrice
      positionalSets[`services.${idx}.overweightCharge`] = svc.overweightCharge
    })

    const updated = await appointmentModel.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          ...positionalSets,
          actualKgPriceTotal,
          overweightChargeTotal,
          actualTotalAmount,
          actualVatAmount,
          actualFinalAmount,
          weightConfirmedAt: new Date(),
          weightConfirmedBy: branchId,
          paymentStatus:     'pending_payment',
        },
      },
      { new: true }
    )

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logWeightConfirmed(
      actor ?? { name: 'Branch', role: 'branchadmin', userId: branchId },
      appointment,
      { services: beforeSnapshot, paymentStatus: appointment.paymentStatus },
      {
        services: updatedServices.map(s => ({
          serviceId:     s.serviceId,
          name:          s.name,
          actualKg:      s.actualKg,
          actualKgPrice: s.actualKgPrice,
        })),
        actualFinalAmount,
        paymentStatus: 'pending_payment',
      }
    )
    // ────────────────────────────────────────────────────────────

    return updated
  }

  // ─── CONFIRM PAYMENT ────────────────────────────────────────────
  async confirmPayment(appointmentId, paymentMethod, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')

    if (!['cash', 'online'].includes(paymentMethod))
      throw new ApiError(400, 'Payment method must be cash or online')

    const paymentStatus = paymentMethod === 'cash' ? 'paid_cash' : 'paid_online'

    // ── snapshot before ────────────────────────────────────────
    const before = {
      paymentStatus: appointment.paymentStatus,
      paymentMethod: appointment.paymentMethod ?? null,
    }
    // ──────────────────────────────────────────────────────────

    const updated = await appointmentModel.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          payment:       true,
          paymentStatus,
          paymentMethod,
          paymentPaidAt: new Date(),
        },
      },
      { new: true }
    )

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logPaymentUpdated(
      actor ?? { name: 'System', role: 'system' },
      appointment,
      before,
      { paymentStatus, paymentMethod, paymentPaidAt: new Date() }
    )
    // ────────────────────────────────────────────────────────────

    return updated
  }

  // ─── CANCEL APPOINTMENT ─────────────────────────────────────────
  async cancelAppointment(appointmentId, cancelledBy, actorId, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')

    if (cancelledBy === 'user' && appointment.userId.toString() !== actorId)
      throw new ApiError(403, 'Unauthorized')
    if (cancelledBy === 'branch' && appointment.branchId.toString() !== actorId)
      throw new ApiError(403, 'Unauthorized')

    if (cancelledBy === 'user' && appointment.deliveryStatus !== 'pending_approval')
      throw new ApiError(400, 'Cancellation is no longer allowed once your appointment has been approved by the branch')

    await AppointmentRepository.cancelById(appointmentId)

    const branch = await BranchRepository.findById(appointment.branchId)
    if (branch) {
      const slotsBooked = branch.slots_booked || {}
      if (slotsBooked[appointment.slotDate]) {
        const idx = slotsBooked[appointment.slotDate].indexOf(appointment.slotTime)
        if (idx > -1) slotsBooked[appointment.slotDate].splice(idx, 1)
        await BranchRepository.updateSlotsBooked(appointment.branchId, slotsBooked)
      }
    }

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logAppointmentCancelled(
      actor ?? { name: cancelledBy, role: cancelledBy },
      appointment,
      `Cancelled by ${cancelledBy}`
    )
    // ────────────────────────────────────────────────────────────

    return true
  }

  // ─── COMPLETE APPOINTMENT ───────────────────────────────────────
  async completeAppointment(appointmentId, branchId, actor = null) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')
    if (appointment.branchId.toString() !== branchId)
      throw new ApiError(403, 'Unauthorized')
    return await AppointmentRepository.markCompleted(appointmentId)
  }

  // ─── UPDATE DELIVERY STATUS ─────────────────────────────────────
  async updateDeliveryStatus(appointmentId, branchId, newStatus, actor = null) {
    if (!VALID_STATUSES.includes(newStatus)) throw new ApiError(400, 'Invalid status')

    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')
    if (appointment.branchId.toString() !== branchId)
      throw new ApiError(403, 'Unauthorized')

    const fromStatus = appointment.deliveryStatus

    const updates = { deliveryStatus: newStatus }
    if (newStatus === 'delivered') updates.isCompleted = true

    if (newStatus === 'picked_up' && Array.isArray(appointment.addOns) && appointment.addOns.length > 0) {
      for (const addOn of appointment.addOns) {
        try {
          await inventoryService.deduct(
            appointment.branchId.toString(),
            addOn.productId.toString(),
            addOn.quantity
          )
        } catch (err) {
          console.warn(`[Inventory] Failed to deduct: ${err.message}`)
        }
      }
    }

    const updated = await AppointmentRepository.updateById(appointmentId, updates)

    // ── AUDIT ────────────────────────────────────────────────────
    await AuditService.logStatusChange(
      actor ?? { name: 'Branch', role: 'branchadmin', userId: branchId },
      appointment,
      fromStatus,
      newStatus
    )
    // ────────────────────────────────────────────────────────────

    return updated
  }

  // ─── GETTERS ────────────────────────────────────────────────────
  async getAppointmentsByUser(userId) {
    return await AppointmentRepository.findByUserId(userId)
  }

  async getAppointmentsByBranch(branchId) {
    return await AppointmentRepository.findByBranchId(new Types.ObjectId(branchId))
  }

  async getAllAppointments() {
    return await AppointmentRepository.findAll()
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────
  async getDashboardData() {
    const [appointments, totalBranches, totalCustomers] = await Promise.all([
      AppointmentRepository.findAll(),
      BranchRepository.findAll().then(b => b.length),
      UserRepository.findAll ? UserRepository.findAll().then(u => u.length) : 0
    ])
    return this._buildDashboard(appointments, { totalBranches, totalCustomers, includeCounts: true })
  }

  async getBranchDashboardData(branchId) {
    const appointments = await AppointmentRepository.findByBranchId(new Types.ObjectId(branchId))
    return this._buildDashboard(appointments, { includeCounts: false })
  }

  _buildDashboard(appointments, { totalBranches, totalCustomers, includeCounts }) {
    const statusCounts = {
      completed: appointments.filter(a => a.isCompleted).length,
      cancelled:  appointments.filter(a => a.cancelled).length,
      pending:    appointments.filter(a => !a.isCompleted && !a.cancelled).length,
    }

    const totalEarnings = appointments
      .filter(a => a.isCompleted)
      .reduce((sum, a) => sum + (a.actualFinalAmount ?? a.finalAmount ?? a.totalAmount ?? 0), 0)

    const monthlyMap = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      monthlyMap[key] = 0
    }
    appointments.filter(a => a.isCompleted).forEach(a => {
      const key = new Date(a.date).toLocaleString('default', { month: 'short', year: '2-digit' })
      if (monthlyMap[key] !== undefined)
        monthlyMap[key] += (a.actualFinalAmount ?? a.finalAmount ?? a.totalAmount ?? 0)
    })

    const earningsByMonth    = Object.entries(monthlyMap).map(([month, earnings]) => ({ month, earnings }))
    const latestAppointments = [...appointments].sort((a, b) => b.date - a.date).slice(0, 5)

    const serviceMap = {}
    appointments.forEach(a => {
      const serviceList = Array.isArray(a.services) ? a.services : []
      serviceList.forEach(s => {
        const name = s?.name || 'Unknown'
        serviceMap[name] = (serviceMap[name] || 0) + 1
      })
    })
    const appointmentsByService = Object.entries(serviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalEarnings,
      totalAppointments: appointments.length,
      statusCounts,
      earningsByMonth,
      latestAppointments,
      appointmentsByService,
      ...(includeCounts && { totalBranches, totalCustomers })
    }
  }
}

export default new AppointmentService()