import mongoose from 'mongoose'
import Appointment from '../../models/appointmentModel.js'


const completedMatch = { isCompleted: true, cancelled: false, payment: true }

const buildDateMatch = ({ preset, from, to }) => {
  if (preset === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end   = new Date(); end.setHours(23, 59, 59, 999)
    return { createdAt: { $gte: start, $lte: end } }
  }
  if (preset === 'week') {
    const start = new Date()
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    return { createdAt: { $gte: start } }
  }
  if (preset === 'month') {
    const start = new Date()
    start.setDate(1); start.setHours(0, 0, 0, 0)
    return { createdAt: { $gte: start } }
  }
  if (from && to) {
    return { createdAt: { $gte: new Date(from), $lte: new Date(to) } }
  }
  return {}
}

const buildGroupId = (preset) => {
  if (preset === 'today') {
    return { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' }, h: { $hour: '$createdAt' } }
  }
  if (preset === 'week') {
    return { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } }
  }
  return { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }
}

export const getSummary = async (match, preset) =>
  Appointment.aggregate([
    { $match: { ...completedMatch, ...match } },
    {
      $group: {
        _id:             buildGroupId(preset),
        grossTotal:      { $sum: '$totalAmount' },
        discountedTotal: { $sum: { $subtract: ['$totalAmount', '$discountAmount'] } },
        vatAmount:       { $sum: '$vatAmount' },
        finalAmount:     { $sum: '$finalAmount' },
        totalDiscount:   { $sum: '$discountAmount' },
        addOnsTotal:     { $sum: '$addOnsTotal' },
        count:           { $sum: 1 },
      }
    },
    { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1, '_id.h': 1 } }
  ])

export const getPerBranch = async (match) =>
  Appointment.aggregate([
    { $match: { ...completedMatch, ...match } },
    {
      $group: {
        _id:           '$branchId',
        branchData:    { $first: '$branchData' },
        grossTotal:    { $sum: '$totalAmount' },
        vatAmount:     { $sum: '$vatAmount' },
        finalAmount:   { $sum: '$finalAmount' },
        totalDiscount: { $sum: '$discountAmount' },
        count:         { $sum: 1 },
      }
    },
    { $sort: { finalAmount: -1 } }
  ])

export const getPerService = async (match) =>
  Appointment.aggregate([
    { $match: { ...completedMatch, ...match } },
    { $unwind: '$services' },
    {
      $group: {
        _id:   '$services',
        count: { $sum: 1 },
      }
    },
    {
      $lookup: {
        from:         'services',
        localField:   '_id',
        foreignField: '_id',
        as:           'service'
      }
    },
    { $unwind: '$service' },
    {
      $project: {
        name:    '$service.name',
        price:   '$service.price',
        count:   1,
        revenue: { $multiply: ['$service.price', '$count'] }
      }
    },
    { $sort: { revenue: -1 } }
  ])

export const getKgRevenue = async (match) =>
  Appointment.aggregate([
    { $match: { ...completedMatch, ...match } },
    {
      $group: {
        _id:            null,
        totalKgRevenue: { $sum: '$kgPrice' },
        totalKg:        { $sum: '$kg' },
        avgKgPrice:     { $avg: '$kgPrice' },
        count:          { $sum: 1 },
      }
    }
  ])

export const getPromoSummary = async (match) =>
  Appointment.aggregate([
    { $match: { ...completedMatch, ...match, promoCode: { $ne: null } } },
    {
      $group: {
        _id:           '$promoCode',
        timesUsed:     { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' },
        totalFinal:    { $sum: '$finalAmount' },
        discountType:  { $first: '$discountType' },
        discountValue: { $first: '$discountValue' },
      }
    },
    { $sort: { timesUsed: -1 } }
  ])

export { buildDateMatch }