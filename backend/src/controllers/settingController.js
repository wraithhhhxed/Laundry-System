import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import * as settingService from '../services/SettingService.js'

export const getVatRate = asyncHandler(async (req, res) => {
  const rate = await settingService.getVatRate()
  res.json(new ApiResponse(200, { vatRate: rate }, 'VAT rate fetched'))
})

export const updateVatRate = asyncHandler(async (req, res) => {
  const { vatRate } = req.body
  const updated = await settingService.updateVatRate(vatRate)
  res.json(new ApiResponse(200, updated, 'VAT rate updated'))
})

export const getAllSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.getAllSettings()
  res.json(new ApiResponse(200, settings, 'Settings fetched'))
})

export const getRefundReasons = asyncHandler(async (req, res) => {
  const { status } = req.query
  const reasons = status
    ? await settingService.getRefundReasonsForStatus(status)
    : await settingService.getRefundReasons()
  res.json(new ApiResponse(200, { reasons }, 'Refund reasons fetched'))
})

export const updateRefundReasons = asyncHandler(async (req, res) => {
  const { reasons } = req.body
  const updated = await settingService.updateRefundReasons(reasons)
  res.json(new ApiResponse(200, updated, 'Refund reasons updated'))
})

export const getFaqs = asyncHandler(async (req, res) => {
  const faqs = await settingService.getFaqs()
  res.json(new ApiResponse(200, { faqs }, 'FAQs fetched successfully'))
})

export const updateFaqs = asyncHandler(async (req, res) => {
  const { faqs } = req.body
  const updated = await settingService.updateFaqs(faqs)
  res.json(new ApiResponse(200, { faqs: updated.value }, 'FAQs updated successfully'))
})