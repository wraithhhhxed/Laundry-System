import { createContext, useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export const BranchesContext = createContext()

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const BranchesContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [bToken, setBToken]               = useState(localStorage.getItem('bToken') || '')
  const [branchProfile, setBranchProfile] = useState(null)
  const [appointments, setAppointments]   = useState([])
  const [dashData, setDashData]           = useState(null)

  // ─── WALK-IN ──────────────────────────────────────────────────
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

  // ─── Debounced refresh ────────────────────────────────────────
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

  // ⭐ ARCHIVE APPOINTMENT - SIMPLE
  const archiveAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + '/api/branch/archive-appointment',
        { appointmentId },
        { headers: authHeader(bToken) }
      )
      
      if (data.success) {
        toast.success('Appointment archived successfully')
        await getBranchAppointments()  // Immediate refresh, not debounced
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

  // Tab visibility refresh
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
    loginBranch, logoutBranch,
    branchProfile, getBranchProfile, updateBranchProfile,
    appointments, getBranchAppointments,
    completeAppointment, cancelAppointment,
    dashData, getBranchDashboard,
    updateDeliveryStatus,
    confirmActualWeight,
    archiveAppointment,
    confirmPayment,
    // ── WALK-IN ──────────────────────────────────────────────────
    walkInServices, getWalkInServices,
    lookupPhone,
    createWalkInAppointment,
  }

  return (
    <BranchesContext.Provider value={value}>
      {props.children}
    </BranchesContext.Provider>
  )
}

export default BranchesContextProvider