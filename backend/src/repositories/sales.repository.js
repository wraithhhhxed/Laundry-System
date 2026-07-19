// backend/src/repositories/sales.repository.js
import prisma from '../config/prismaClient.js'

const COMPLETED_MATCH = { isCompleted: true, cancelled: false, payment: true }

export const buildDateMatch = ({ preset, from, to }) => {
  if (preset === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)
    return { createdAt: { gte: start, lte: end } }
  }
  if (preset === 'week') {
    const start = new Date()
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    return { createdAt: { gte: start } }
  }
  if (preset === 'month') {
    const start = new Date()
    start.setDate(1); start.setHours(0, 0, 0, 0)
    return { createdAt: { gte: start } }
  }
  if (from && to) {
    return { createdAt: { gte: new Date(from), lte: new Date(to) } }
  }
  return {}
}

// Kapareho ng dating buildGroupId sa Mongo — nagbabalik ng {y,m,d,h} object,
// hindi flat string, para hindi masira ang frontend na malamang umaasa sa
// _id.y / _id.m / atbp.
const buildGroupKey = (date, preset) => {
  const d = new Date(date)
  if (preset === 'today') {
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours() }
  }
  if (preset === 'week') {
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
  }
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

const sortByYMDH = (a, b) => {
  const ai = a._id, bi = b._id
  return (ai.y - bi.y) || (ai.m - bi.m) || ((ai.d || 0) - (bi.d || 0)) || ((ai.h || 0) - (bi.h || 0))
}

// ── SUMMARY (grouped by date bucket) ────────────────────────────────────────
// NOTE: Prisma/Postgres walang direktang "group by date part" katulad ng
// Mongo $group + $year/$month — kaya kinukuha muna natin lahat ng matching
// appointments, tapos ginagrupo sa JavaScript. Sapat na 'to sa laki ng datos
// ng thesis project na 'to; kung lalaki na ang volume sa hinaharap, mas
// mainam nang gumamit ng raw SQL (date_trunc) o materialized view.
export const getSummary = async (match, preset) => {
  const appointments = await prisma.appointment.findMany({
    where: { ...COMPLETED_MATCH, ...match },
  })

  const buckets = {}
  for (const a of appointments) {
    const key = buildGroupKey(a.createdAt, preset)
    const bucketKey = JSON.stringify(key)
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = {
        _id: key,
        grossTotal: 0,
        discountedTotal: 0,
        vatAmount: 0,
        finalAmount: 0,
        totalDiscount: 0,
        addOnsTotal: 0,
        count: 0,
      }
    }
    const b = buckets[bucketKey]
    b.grossTotal += a.totalAmount
    b.discountedTotal += a.totalAmount - a.discountAmount
    b.vatAmount += a.vatAmount
    b.finalAmount += a.finalAmount
    b.totalDiscount += a.discountAmount
    b.addOnsTotal += a.addOnsTotal
    b.count += 1
  }

  return Object.values(buckets).sort(sortByYMDH)
}

// ── PER BRANCH ───────────────────────────────────────────────────────────────
export const getPerBranch = async (match) => {
  const appointments = await prisma.appointment.findMany({
    where: { ...COMPLETED_MATCH, ...match },
  })

  const buckets = {}
  for (const a of appointments) {
    const key = a.branchId
    if (!buckets[key]) {
      buckets[key] = {
        _id: key,
        branchData: a.branchData,
        grossTotal: 0,
        vatAmount: 0,
        finalAmount: 0,
        totalDiscount: 0,
        count: 0,
      }
    }
    const b = buckets[key]
    b.grossTotal += a.totalAmount
    b.vatAmount += a.vatAmount
    b.finalAmount += a.finalAmount
    b.totalDiscount += a.discountAmount
    b.count += 1
  }

  return Object.values(buckets).sort((x, y) => y.finalAmount - x.finalAmount)
}

// ── PER SERVICE ──────────────────────────────────────────────────────────────
// Mas simple na ngayon kumpara dati — hindi na kailangan ng $lookup papunta
// sa services collection, dahil ang AppointmentService rows natin ay may
// sarili nang name/price snapshot.
export const getPerService = async (match) => {
  const appointments = await prisma.appointment.findMany({
    where: { ...COMPLETED_MATCH, ...match },
    include: { services: true },
  })

  const buckets = {}
  for (const a of appointments) {
    for (const s of a.services) {
      const key = s.serviceId
      if (!buckets[key]) {
        buckets[key] = { name: s.name, price: s.price, count: 0, revenue: 0 }
      }
      buckets[key].count += 1
      buckets[key].revenue += s.price
    }
  }

  return Object.values(buckets).sort((x, y) => y.revenue - x.revenue)
}

// ── KG VOLUME (dating "KG Revenue") ─────────────────────────────────────────
// Hindi na revenue ang laman nito — dahil hindi na presyo driver ang kilo sa
// fixed-package pricing model natin, ang kg ay 7kg CAPACITY CHECK LANG per
// load. Pure volume stats na lang ito: total/average na kilo na na-proseso
// (kapaki-pakinabang para sa operational insight — hal. gaano karaming
// trabaho ang na-handle — hiwalay sa pera, na nasa ibang 4 functions na).
export const getKgRevenue = async (match) => {
  const appointments = await prisma.appointment.findMany({
    where: { ...COMPLETED_MATCH, ...match },
    include: { services: true },
  })

  let totalKg = 0
  let loadCount = 0

  for (const a of appointments) {
    for (const s of a.services) {
      totalKg += s.kg
      loadCount += 1
    }
  }

  return [{
    totalKg,
    loadCount,
    avgKgPerLoad: loadCount > 0 ? parseFloat((totalKg / loadCount).toFixed(2)) : 0,
  }]
}

// ── PROMO SUMMARY ─────────────────────────────────────────────────────────────
export const getPromoSummary = async (match) => {
  const appointments = await prisma.appointment.findMany({
    where: { ...COMPLETED_MATCH, ...match, promoCode: { not: null } },
  })

  const buckets = {}
  for (const a of appointments) {
    const key = a.promoCode
    if (!buckets[key]) {
      buckets[key] = {
        _id: key,
        timesUsed: 0,
        totalDiscount: 0,
        totalFinal: 0,
        discountType: a.discountType,
        discountValue: a.discountValue,
      }
    }
    const b = buckets[key]
    b.timesUsed += 1
    b.totalDiscount += a.discountAmount
    b.totalFinal += a.finalAmount
  }

  return Object.values(buckets).sort((x, y) => y.timesUsed - x.timesUsed)
}