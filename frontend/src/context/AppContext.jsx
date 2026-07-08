import { createContext, useState, useEffect, useRef } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'

export const AppContext = createContext()

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const REFRESH_INTERVAL = 30000 // 30 seconds

const AppContextProvider = (props) => {

  const currencySymbol = '₱'
  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [branches, setBranches]         = useState([])
  const [token, setToken]               = useState(localStorage.getItem('token') || false)
  const [userData, setUserData]         = useState(false)
  const [appointments, setAppointments] = useState([])

  const branchesTimerRef = useRef(null)
  const faqsTimerRef     = useRef(null)

  const getBranchesData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/branches')
      if (data.success) {
        setBranches(data.data.branches.filter(b => b.available))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getFaqs = async () => {
    const { data } = await axios.get(`${backendUrl}/api/settings/faqs`)
    if (!data.success) throw new Error(data.message)
    return data.data.faqs
  }

  const loadUserProfileData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/get-profile', {
        headers: authHeader(token)
      })
      if (data.success) setUserData(data.data.userData)
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getUserAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: authHeader(token)
      })
      if (data.success) setAppointments(data.data.appointments.reverse())
    } catch (error) {
      toast.error(error.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: authHeader(token) }
      )
      if (data.success) { toast.success(data.message); getUserAppointments() }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const createPayment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/create-payment`,
        { appointmentId },
        { headers: authHeader(token) }
      )
      if (!data.success) { toast.error(data.message); return }
      const { checkoutUrl } = data.data
      window.location.href = checkoutUrl
    } catch (error) {
      toast.error(error.message)
    }
  }

  const validatePromo = async (code, orderSubtotal) => {
    const { data } = await axios.post(
      `${backendUrl}/api/user/promo/validate`,
      { code, orderSubtotal },
      { headers: authHeader(token) }
    )
    if (!data.success) throw new Error(data.message)
    return data.data
  }

  const logoutUser = async () => {
    try {
      await axios.post(`${backendUrl}/api/user/logout`, {}, { headers: authHeader(token) })
    } catch (error) {
      console.error('Logout audit failed:', error)
    } finally {
      setToken(false)
      localStorage.removeItem('token')
      setUserData(false)
      setAppointments([])
    }
  }

  // ── Auto-refresh: branches every 30s ──
  useEffect(() => {
    getBranchesData()
    branchesTimerRef.current = setInterval(getBranchesData, REFRESH_INTERVAL)
    return () => clearInterval(branchesTimerRef.current)
  }, [])

  // ── Auto-refresh: faqs — stored in state so HomeFaqs stays in sync ──
  const [faqs, setFaqs] = useState([])
  const fetchFaqs = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/settings/faqs`)
      if (data.success) setFaqs(data.data.faqs)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchFaqs()
    faqsTimerRef.current = setInterval(fetchFaqs, REFRESH_INTERVAL)
    return () => clearInterval(faqsTimerRef.current)
  }, [])

  useEffect(() => {
    if (token) loadUserProfileData()
    else setUserData(false)
  }, [token])

  const value = {
    branches, getBranchesData,
    faqs, getFaqs,
    currencySymbol,
    backendUrl,
    token, setToken,
    userData, setUserData,
    loadUserProfileData,
    appointments,
    getUserAppointments,
    cancelAppointment,
    createPayment,
    validatePromo,
    logoutUser,
  }

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  )
}

export default AppContextProvider