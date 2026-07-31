import * as settingRepo from '../repositories/settingRepository.js'
import AuditService from './AuditService.js'
import { ApiError } from '../utils/ApiError.js'

const assertValidKey = (key) => {
  if (typeof key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
    throw new ApiError(400, `Invalid setting key: "${key}".`)
  }
}

// Totoong deliveryStatus enum (6 values). "cancelled" ay HIWALAY na boolean flag
// (appliesToCancelled), hindi bahagi ng deliveryStatus.
const VALID_STATUSES = [
  'pending_approval', 'approved', 'picked_up',
  'in_progress', 'out_for_delivery', 'delivered',
]

const DEFAULT_REFUND_REASONS = [
  { reason: 'Change of mind',       applicableStatuses: ['pending_approval', 'approved'], appliesToCancelled: true,  isActive: true },
  { reason: 'Duplicate booking',    applicableStatuses: ['pending_approval', 'approved'], appliesToCancelled: true,  isActive: true },
  { reason: 'Long wait time',       applicableStatuses: ['pending_approval', 'approved'], appliesToCancelled: false, isActive: true },
  { reason: 'Damaged clothing',     applicableStatuses: ['delivered'],                    appliesToCancelled: false, isActive: true },
  { reason: 'Missing items',        applicableStatuses: ['delivered'],                    appliesToCancelled: false, isActive: true },
  { reason: 'Poor wash quality',    applicableStatuses: ['delivered'],                    appliesToCancelled: false, isActive: true },
  { reason: 'Wrong items returned', applicableStatuses: ['delivered'],                    appliesToCancelled: false, isActive: true },
  { reason: 'Other',                applicableStatuses: VALID_STATUSES,                   appliesToCancelled: true,  isActive: true },
]

const DEFAULT_FAQS = [
  { question: 'How do I book an appointment?',  answer: 'You can book an appointment online through our website by selecting your preferred branch and available time slot.', order: 0, active: true },
  { question: 'How long does laundry take?',    answer: 'Typical turnaround is 24–48 hours depending on the service type and branch workload.',                             order: 1, active: true },
  { question: 'Can I cancel my appointment?',   answer: 'Yes, you can cancel before your laundry is picked up. Cancellations after pick-up may be subject to our refund policy.', order: 2, active: true },
  { question: 'How do I pay?',                  answer: 'We accept online payments via credit/debit card and e-wallets through our secure PayMongo checkout.',               order: 3, active: true },
]

// ── VAT Rate ──────────────────────────────────────────────────────────────────

export const getVatRate = async () => {
  const setting = await settingRepo.getSettingByKey('vatRate')
  if (!setting) return 0.12

  const parsed = parseFloat(setting.value)
  if (isNaN(parsed) || parsed < 0 || parsed > 1) return 0.12
  return parsed
}

/**
 * @param {number} rate
 * @param {{ userId?, name?, role? }} [actor]  - pass from controller (req.user)
 */
export const updateVatRate = async (rate, actor = null) => {
  const parsed = Number(rate)

  if (rate === null || rate === '' || !isFinite(parsed) || isNaN(parsed)) {
    throw new ApiError(400, 'VAT rate must be a finite decimal number (e.g. 0.12 for 12%).')
  }
  if (parsed < 0 || parsed > 1) {
    throw new ApiError(400, `VAT rate out of range: received ${parsed}. Must be between 0 and 1 inclusive.`)
  }

  const currentRate = await getVatRate()

  const result = await settingRepo.upsertSetting('vatRate', parsed, 'VAT rate applied after promo discount')

  await AuditService.logSettingChanged(
    actor ?? { name: 'Admin', role: 'superadmin' },
    'vatRate',
    currentRate,
    parsed
  )

  return result
}

// ── Refund Reasons ────────────────────────────────────────────────────────────

export const getRefundReasons = async () => {
  const setting = await settingRepo.getSettingByKey('refundReasons')
  return setting ? setting.value : DEFAULT_REFUND_REASONS
}

// deliveryStatus: string, cancelled: boolean — parehong ipasa ng caller
export const getRefundReasonsForStatus = async (deliveryStatus, cancelled = false) => {
  const reasons = await getRefundReasons()
  if (cancelled) {
    return reasons.filter(r => r.isActive && r.appliesToCancelled)
  }
  return reasons.filter(r => r.isActive && r.applicableStatuses.includes(deliveryStatus))
}

/**
 * @param {Array}  reasons
 * @param {{ userId?, name?, role? }} [actor]
 */
export const updateRefundReasons = async (reasons, actor = null) => {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    throw new ApiError(400, 'Refund reasons must be a non-empty array.')
  }

  for (const r of reasons) {
    if (!r.reason || typeof r.reason !== 'string' || r.reason.trim() === '') {
      throw new ApiError(400, 'Each refund reason must have a non-empty "reason" string.')
    }
    if (!Array.isArray(r.applicableStatuses)) {
      throw new ApiError(400, `Reason "${r.reason}" must have an applicableStatuses array (can be empty if appliesToCancelled is true).`)
    }
    for (const s of r.applicableStatuses) {
      if (!VALID_STATUSES.includes(s)) {
        throw new ApiError(400, `Invalid status "${s}" in reason "${r.reason}". Valid: ${VALID_STATUSES.join(', ')}.`)
      }
    }
    if (typeof r.appliesToCancelled !== 'boolean') {
      throw new ApiError(400, `Reason "${r.reason}" must have an appliesToCancelled boolean.`)
    }
    if (r.applicableStatuses.length === 0 && !r.appliesToCancelled) {
      throw new ApiError(400, `Reason "${r.reason}" must apply to at least one status or to cancelled appointments.`)
    }
    if (typeof r.isActive !== 'boolean') {
      throw new ApiError(400, `Reason "${r.reason}" must have an isActive boolean.`)
    }
  }

  const before = await getRefundReasons()
  const result = await settingRepo.upsertSetting('refundReasons', reasons, 'Refund reasons shown to users per delivery status')

  await AuditService.logSettingChanged(
    actor ?? { name: 'Admin', role: 'superadmin' },
    'refundReasons',
    before,
    reasons
  )

  return result
}

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const getFaqs = async () => {
  const setting = await settingRepo.getSettingByKey('faqs')
  if (!setting || !Array.isArray(setting.value) || setting.value.length === 0) return DEFAULT_FAQS
  return setting.value
}

/**
 * @param {Array}  faqs
 * @param {{ userId?, name?, role? }} [actor]
 */
export const updateFaqs = async (faqs, actor = null) => {
  if (!Array.isArray(faqs)) throw new ApiError(400, 'FAQs must be an array.')

  for (const f of faqs) {
    if (!f.question || typeof f.question !== 'string' || !f.question.trim())
      throw new ApiError(400, 'Each FAQ must have a non-empty question.')
    if (!f.answer || typeof f.answer !== 'string' || !f.answer.trim())
      throw new ApiError(400, 'Each FAQ must have a non-empty answer.')
  }

  const sanitized = faqs.map((f, i) => ({
    question: f.question.trim(),
    answer:   f.answer.trim(),
    order:    typeof f.order === 'number' ? f.order : i,
    active:   f.active !== false,
  }))

  const before = await getFaqs()
  const result = await settingRepo.upsertSetting('faqs', sanitized, 'FAQs shown on the homepage')

  await AuditService.logSettingChanged(
    actor ?? { name: 'Admin', role: 'superadmin' },
    'faqs',
    before,
    sanitized
  )

  return result
}

// ── Generic Settings ──────────────────────────────────────────────────────────

export const getAllSettings = async () => {
  return await settingRepo.getAllSettings()
}

export const getSettingByKey = async (key) => {
  assertValidKey(key)
  return await settingRepo.getSettingByKey(key)
}

/**
 * @param {string} key
 * @param {*}      value
 * @param {string} [description]
 * @param {{ userId?, name?, role? }} [actor]
 */
export const upsertSetting = async (key, value, description = '', actor = null) => {
  assertValidKey(key)

  if (typeof value === 'object' && value !== null) {
    throw new ApiError(400, 'Setting value must be a primitive (string, number, or boolean).')
  }

  const existing = await settingRepo.getSettingByKey(key)
  const before   = existing?.value ?? null
  const result   = await settingRepo.upsertSetting(key, value, description)

  await AuditService.logSettingChanged(
    actor ?? { name: 'Admin', role: 'superadmin' },
    key,
    before,
    value
  )

  return result
}