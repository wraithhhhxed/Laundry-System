import { createContext, useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export const BranchesContext = createContext()

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const BranchesContextProvider = (props) => {
  const USE_MOCK_QR = true
  const mockPollAttempts = useRef({})

  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [bToken, setBToken] = useState(localStorage.getItem('bToken') || '')

  const staffRole = bToken ? decodeToken(bToken)?.staffRole : null

  const [branchProfile, setBranchProfile] = useState(null)
  const [appointments, setAppointments]   = useState([])
  const [dashData, setDashData]           = useState(null)
  const [walkInServices, setWalkInServices] = useState([])

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
        backendUrl + `/api/branch/lookup-phone/${phone}`,
        { headers: authHeader(bToken) }
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
        backendUrl + '/api/branch/create-walk-in',
        payload,
        { headers: authHeader(bToken) }
      )
      if (data.success) {
        toast.success('Walk-in appointment created successfully.')
        debouncedRefresh()
        return (
          data.data?.appointment ||
          data.appointment ||
          data.data ||
          true
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
        backendUrl + '/api/branch/lucky-wheel/spin',
        { userId },
        { headers: authHeader(bToken) }
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

  const refreshTimer = useRef(null)
  const lastFetch    = useRef(0)
  const MIN_INTERVAL = 3000

  const getBranchAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/branch/appointments', { headers: authHeader(bToken) })
      if (data.success) setAppointments(data.data.appointments.reverse())
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }, [bToken, backendUrl])

  const debouncedRefresh = useCallback((delay = 800) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      const now = Date.now()
      if (now - lastFetch.current < MIN_INTERVAL) return
      lastFetch.current = now
      await getBranchAppointments()
    }, delay)
  }, [getBranchAppointments])

  const loginBranch = async (email, password) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/branch/login', { email, password })
      if (data.success) {
        localStorage.setItem('bToken', data.data.token)
        setBToken(data.data.token)
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  const logoutBranch = async () => {
    try {
      await axios.post(backendUrl + '/api/branch/logout', {}, { headers: authHeader(bToken) })
    } catch (error) {
      console.error('Logout audit failed:', error)
    } finally {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      mockPollAttempts.current = {}
      localStorage.removeItem('bToken')
      setBToken('')
      setBranchProfile(null)
      setAppointments([])
      setDashData(null)
    }
  }

  const getBranchProfile = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/branch/profile', { headers: authHeader(bToken) })
      if (data.success) setBranchProfile(data.data.branch)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const updateBranchProfile = async (formData) => {
    try {
      const form = new FormData()
      form.append('address',   formData.address)
      form.append('available', formData.available)
      if (formData.fees)  form.append('fees',  formData.fees)
      if (formData.about) form.append('about', formData.about)
      if (formData.image) form.append('image', formData.image)
      const { data } = await axios.post(
        backendUrl + '/api/branch/update-profile', form, { headers: authHeader(bToken) }
      )
      if (data.success) { toast.success('Profile updated'); await getBranchProfile() }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/complete-appointment',
        { appointmentId },
        { headers: authHeader(bToken) }
      )
      if (data.success) { toast.success(data.message); debouncedRefresh() }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/cancel-appointment',
        { appointmentId },
        { headers: authHeader(bToken) }
      )
      if (data.success) { toast.success(data.message); debouncedRefresh() }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getBranchDashboard = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/branch/dashboard', { headers: authHeader(bToken) })
      if (data.success) setDashData(data.data.dashData)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const updateDeliveryStatus = async (appointmentId, status) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/update-delivery-status',
        { appointmentId, status },
        { headers: authHeader(bToken) }
      )
      if (data.success) { toast.success('Status updated'); debouncedRefresh() }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const confirmActualWeight = async (appointmentId, actualServices) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/confirm-actual-weight',
        { appointmentId, actualServices },
        { headers: authHeader(bToken) }
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
        backendUrl + '/api/branch/confirm-payment',
        { appointmentId, paymentMethod },
        { headers: authHeader(bToken) }
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

  const generateQrPayment = async (appointmentId) => {
    try {
      if (USE_MOCK_QR) {
        mockPollAttempts.current[appointmentId] = 0

        return {
          qrImageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIj5Nb2NrIFFSIENvZGU8L3RleHQ+PC9zdmc+',
          paymentIntentId: 'mock_' + appointmentId
        }
      } else {
        const { data } = await axios.post(
          backendUrl + `/api/branch/appointments/${appointmentId}/qr-payment`,
          {},
          { headers: authHeader(bToken) }
        )
        if (data.success) {
          return data.data
        } else {
          toast.error(data.message)
          throw new Error(data.message)
        }
      }
    } catch (error) {
      console.error('Generate QR error:', error)
      toast.error(error.response?.data?.message || error.message)
      throw error
    }
  }

  const getQrPaymentStatus = async (appointmentId) => {
    try {
      if (USE_MOCK_QR) {
        const attempts = (mockPollAttempts.current[appointmentId] || 0) + 1
        mockPollAttempts.current[appointmentId] = attempts

        if (attempts >= 3) {
          return { paid: true, status: 'succeeded' }
        }
        return { paid: false, status: 'pending' }
      } else {
        const { data } = await axios.get(
          backendUrl + `/api/branch/appointments/${appointmentId}/qr-payment/status`,
          { headers: authHeader(bToken) }
        )
        if (data.success) {
          return data.data
        } else {
          console.error('QR status check failed:', data.message)
          throw new Error(data.message)
        }
      }
    } catch (error) {
      console.error('Check QR status error:', error)
      throw error
    }
  }

  const archiveAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/archive-appointment',
        { appointmentId },
        { headers: authHeader(bToken) }
      )

      if (data.success) {
        toast.success('Appointment archived successfully')
        await getBranchAppointments()
        return true
      } else {
        toast.error(data.message)
        return false
      }
    } catch (error) {
      console.error('Error archiving appointment:', error)
      toast.error(error.response?.data?.message || error.message)
      return false
    }
  }

  const deleteStaff = async (staffId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/branch/staff/${staffId}`,
        { headers: authHeader(bToken) }
      )
      if (data.success) {
        toast.success(data.message || 'Staff removed successfully')
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

  useEffect(() => {
    if (!bToken) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') debouncedRefresh(300)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [bToken, debouncedRefresh])

  const value = {
    backendUrl,
    bToken, setBToken,
    staffRole,
    loginBranch, logoutBranch,
    branchProfile, getBranchProfile, updateBranchProfile,
    appointments, getBranchAppointments,
    completeAppointment, cancelAppointment,
    dashData, getBranchDashboard,
    updateDeliveryStatus,
    confirmActualWeight,
    archiveAppointment,
    confirmPayment,
    walkInServices, getWalkInServices,
    lookupPhone,
    createWalkInAppointment,
    spinWheelForCustomer,
    generateQrPayment,
    getQrPaymentStatus,
    deleteStaff,
  }

  return (
    <BranchesContext.Provider value={value}>
      {props.children}
    </BranchesContext.Provider>
  )
}

export default BranchesContextProvider