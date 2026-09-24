import { createContext, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export const AdminContext = createContext()

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const USE_MOCK_QR = true

const AdminContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [aToken, setAToken]               = useState(localStorage.getItem('aToken') || '')
  const [branches, setBranches]           = useState([])
  const [appointments, setAppointments]   = useState([])
  const [dashData, setDashData]           = useState(null)
  const [services, setServices]           = useState([])
  const [clothingTypes, setClothingTypes] = useState([])
  const [kgRates, setKgRates]             = useState([])
  const [promoCodes, setPromoCodes]       = useState([])
  const [extraServices, setExtraServices] = useState([])
  const [walkInServices, setWalkInServices] = useState([])

  const refreshTimer = useRef(null)
  const lastFetch    = useRef(0)
  const MIN_INTERVAL = 3000

  const mockPollAttempts = useRef({})

  const getAllAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/all-appointments', { headers: authHeader(aToken) })
      if (data.success) setAppointments(data.data.appointments.reverse())
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }, [aToken, backendUrl])

  const debouncedRefresh = useCallback((delay = 800) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      const now = Date.now()
      if (now - lastFetch.current < MIN_INTERVAL) return
      lastFetch.current = now
      await getAllAppointments()
    }, delay)
  }, [getAllAppointments])

  const getAllBranches = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/all-branches', { headers: authHeader(aToken) })
      if (data.success) setBranches(data.data.branches)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const changeAvailability = async (branchId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { branchId }, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllBranches() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); debouncedRefresh() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const approveBooking = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/approve-booking',
        { appointmentId },
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success('Booking approved'); debouncedRefresh() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.response?.data?.message || error.message) }
  }

  const updateDeliveryStatus = async (appointmentId, status) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/update-delivery-status',
        { appointmentId, status },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success(`Status updated to ${status.replace(/_/g, ' ')}`)
        debouncedRefresh()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const archiveAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/archive-appointment',
        { appointmentId },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Appointment archived successfully')
        await getAllAppointments()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const confirmActualWeight = async (appointmentId, actualServices) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/confirm-actual-weight',
        { appointmentId, actualServices },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Actual weight confirmed. Final amount updated.')
        debouncedRefresh()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const confirmPayment = async (appointmentId, paymentMethod) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/confirm-payment',
        { appointmentId, paymentMethod },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success(`Payment confirmed (${paymentMethod})`)
        debouncedRefresh()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const getDashboardData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: authHeader(aToken) })
      if (data.success) setDashData(data.data.dashData)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deleteAllAppointments = async () => {
    try {
      const { data } = await axios.delete(
        backendUrl + '/api/admin/appointments/delete-all',
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success(data.message)
        await getAllAppointments()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const getAllServices = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/services', { headers: authHeader(aToken) })
      if (data.success) setServices(data.data.services)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const addService = async (serviceData, imageFile) => {
    try {
      const formData = new FormData()
      formData.append('name',        serviceData.name)
      formData.append('price',       serviceData.price)
      formData.append('description', serviceData.description ?? '')
      formData.append('isActive',    serviceData.isActive ?? true)
      if (imageFile instanceof File) formData.append('image', imageFile)
      const { data } = await axios.post(backendUrl + '/api/admin/services', formData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateService = async (id, serviceData, imageFile) => {
    try {
      const formData = new FormData()
      if (serviceData.name        !== undefined) formData.append('name',        serviceData.name)
      if (serviceData.price       !== undefined) formData.append('price',       serviceData.price)
      if (serviceData.description !== undefined) formData.append('description', serviceData.description)
      if (serviceData.isActive    !== undefined) formData.append('isActive',    serviceData.isActive)
      if (imageFile instanceof File)             formData.append('image',      imageFile)
      const { data } = await axios.put(
        backendUrl + `/api/admin/services/${id}`,
        formData,
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success(data.message); getAllServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deleteService = async (id) => {
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/services/${id}`, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const getAllClothingTypes = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/clothing-types', { headers: authHeader(aToken) })
      if (data.success) setClothingTypes(data.data.clothingTypes)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const addClothingType = async (typeData) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/clothing-types', typeData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllClothingTypes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateClothingType = async (id, typeData) => {
    try {
      const { data } = await axios.put(backendUrl + `/api/admin/clothing-types/${id}`, typeData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllClothingTypes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deleteClothingType = async (id) => {
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/clothing-types/${id}`, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllClothingTypes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const getAllKgRates = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/kg-rates', { headers: authHeader(aToken) })
      if (data.success) setKgRates(data.data.kgRates)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const addKgRate = async (rateData) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/kg-rates', rateData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllKgRates() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateKgRate = async (id, rateData) => {
    try {
      const { data } = await axios.put(backendUrl + `/api/admin/kg-rates/${id}`, rateData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllKgRates() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deleteKgRate = async (id) => {
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/kg-rates/${id}`, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllKgRates() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const getAllPromoCodes = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/promo-codes', { headers: authHeader(aToken) })
      if (data.success) setPromoCodes(data.data.promoCodes)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const addPromoCode = async (promoData) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/promo-codes', promoData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllPromoCodes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updatePromoCode = async (id, promoData) => {
    try {
      const { data } = await axios.put(backendUrl + `/api/admin/promo-codes/${id}`, promoData, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllPromoCodes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deletePromoCode = async (id) => {
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/promo-codes/${id}`, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllPromoCodes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const togglePromoCode = async (id) => {
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/promo-codes/${id}/toggle`, {}, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllPromoCodes() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const getAllExtraServices = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/extra-services', { headers: authHeader(aToken) })
      if (data.success) setExtraServices(data.extraServices)
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const addExtraService = async (payload) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/extra-services', payload, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllExtraServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateExtraService = async (id, payload) => {
    try {
      const { data } = await axios.put(backendUrl + `/api/admin/extra-services/${id}`, payload, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllExtraServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const toggleExtraService = async (id) => {
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/extra-services/${id}/toggle`, {}, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllExtraServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const deleteExtraService = async (id) => {
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/extra-services/${id}`, { headers: authHeader(aToken) })
      if (data.success) { toast.success(data.message); getAllExtraServices() }
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const getWalkInServices = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/services')
      if (data.success) setWalkInServices(data.data.services)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const lookupPhone = async (phone) => {
    try {
      const { data } = await axios.get(
        backendUrl + `/api/admin/lookup-phone/${phone}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) return data.data.user
      return null
    } catch (error) {
      return null
    }
  }

  const createWalkInAppointment = async (payload) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/create-walk-in',
        payload,
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Walk-in appointment created successfully.')
        debouncedRefresh()
        return (
          data.data?.appointment ||
          data.appointment ||
          data.data ||
          null
        )
      } else {
        toast.error(data.message)
        return null
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return null
    }
  }

  const spinWheelForCustomer = async (userId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/admin/lucky-wheel/spin',
        { userId },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        return data.data
      } else {
        toast.error(data.message)
        return null
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return null
    }
  }

  const generateQrPayment = async (appointmentId) => {
    if (USE_MOCK_QR) {
      mockPollAttempts.current[appointmentId] = 0
      return {
        qrImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="white" width="200" height="200"/%3E%3Crect fill="black" x="20" y="20" width="160" height="160"/%3E%3Ctext x="100" y="105" font-size="14" text-anchor="middle" fill="white"%3EMOCK QR%3C/text%3E%3C/svg%3E',
        paymentIntentId: 'mock_' + appointmentId,
      }
    }

    try {
      const { data } = await axios.post(
        backendUrl + `/api/admin/appointments/${appointmentId}/qr-payment`,
        {},
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        return {
          qrImageUrl:      data.data?.qrImageUrl      || data.qrImageUrl,
          paymentIntentId: data.data?.paymentIntentId || data.paymentIntentId,
        }
      }
      toast.error(data.message || 'Failed to generate QR code')
      return null
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return null
    }
  }

  const getQrPaymentStatus = async (appointmentId) => {
    if (USE_MOCK_QR) {
      const attempts = (mockPollAttempts.current[appointmentId] || 0) + 1
      mockPollAttempts.current[appointmentId] = attempts

      if (attempts >= 3) {
        return { paid: true, status: 'succeeded' }
      }
      return { paid: false, status: 'pending' }
    }

    try {
      const { data } = await axios.get(
        backendUrl + `/api/admin/appointments/${appointmentId}/qr-payment/status`,
        { headers: authHeader(aToken) }
      )
      if (data.success) return data.data || data
      return null
    } catch (error) {
      return null
    }
  }

  const getVatRate = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/settings/vat')
      if (data.success) return data.data.vatRate
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateVatRate = async (vatRate) => {
    try {
      const { data } = await axios.put(backendUrl + '/api/settings/vat', { vatRate }, { headers: authHeader(aToken) })
      if (data.success) { toast.success('VAT rate updated successfully'); return true }
      else toast.error(data.message)
    } catch (error) { toast.error(error.response?.data?.message || error.message) }
  }

  const getRefundReasons = async (status) => {
    try {
      const url = status
        ? `${backendUrl}/api/settings/refund-reasons?status=${status}`
        : `${backendUrl}/api/settings/refund-reasons`
      const { data } = await axios.get(url)
      if (data.success) return data.data.reasons
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateRefundReasons = async (reasons) => {
    try {
      const { data } = await axios.put(
        backendUrl + '/api/settings/refund-reasons',
        { reasons },
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success('Refund reasons updated'); return true }
      else toast.error(data.message)
    } catch (error) { toast.error(error.response?.data?.message || error.message) }
  }

  const getFaqs = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/settings/faqs')
      if (data.success) return data.data.faqs
      else toast.error(data.message)
    } catch (error) { toast.error(error.message) }
  }

  const updateFaqs = async (faqs) => {
    try {
      const { data } = await axios.put(
        backendUrl + '/api/settings/faqs',
        { faqs },
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success('FAQs updated successfully'); return true }
      else toast.error(data.message)
    } catch (error) { toast.error(error.response?.data?.message || error.message) }
  }

  const getAuditLogs = async (filters = {}) => {
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      )
      const { data } = await axios.get(backendUrl + '/api/audit-logs', {
        headers: authHeader(aToken),
        params,
      })
      if (data.success) return data.data
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const logoutAdmin = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    mockPollAttempts.current = {}
    localStorage.removeItem('aToken')
    setAToken('')
    setBranches([])
    setAppointments([])
    setDashData(null)
    setServices([])
    setClothingTypes([])
    setKgRates([])
    setPromoCodes([])
    setExtraServices([])
    setWalkInServices([])
  }

  const value = {
    aToken, setAToken,
    backendUrl,
    logoutAdmin,
    branches, getAllBranches, changeAvailability,
    appointments, getAllAppointments, cancelAppointment,
    approveBooking,
    updateDeliveryStatus,
    archiveAppointment,
    confirmActualWeight,
    confirmPayment,
    dashData, getDashboardData,
    deleteAllAppointments,
    services, getAllServices, addService, updateService, deleteService,
    clothingTypes, getAllClothingTypes, addClothingType, updateClothingType, deleteClothingType,
    kgRates, getAllKgRates, addKgRate, updateKgRate, deleteKgRate,
    promoCodes, getAllPromoCodes, addPromoCode, updatePromoCode, deletePromoCode, togglePromoCode,
    extraServices, getAllExtraServices, addExtraService, updateExtraService, toggleExtraService, deleteExtraService,
    walkInServices, getWalkInServices,
    lookupPhone,
    createWalkInAppointment,
    spinWheelForCustomer,
    generateQrPayment,
    getQrPaymentStatus,
    getVatRate, updateVatRate,
    getRefundReasons, updateRefundReasons,
    getFaqs, updateFaqs,
    getAuditLogs,
    USE_MOCK_QR,
  }

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  )
}

export default AdminContextProvider