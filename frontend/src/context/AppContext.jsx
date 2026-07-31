import { createContext, useState, useEffect, useRef } from "react"
import axios from 'axios'
import { toast } from 'react-toastify'

export const AppContext = createContext()

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const REFRESH_INTERVAL = 30000 // 30 seconds
const NOTIFICATION_POLL = 15000 // 15 seconds (notifications)
const NOTIFICATION_AUTO_DISMISS = 5000 // 5 seconds

const AppContextProvider = (props) => {

  const currencySymbol = '₱'
  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const [branches, setBranches]         = useState([])
  const [token, setToken]               = useState(localStorage.getItem('token') || false)
  const [userData, setUserData]         = useState(false)
  const [appointments, setAppointments] = useState([])
  
  // ── NOTIFICATIONS ──────────────────────────────────────────────────
  // Load notifications from localStorage on init
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })
  
  const [unreadCount, setUnreadCount] = useState(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed.filter(n => !n.read).length
      } catch {
        return 0
      }
    }
    return 0
  })
  
  const appointmentsSnapshotRef = useRef([])
  const notificationTimerRef = useRef(null)
  const dismissTimersRef = useRef({})

  const branchesTimerRef = useRef(null)
  const faqsTimerRef     = useRef(null)

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
    // Update unread count
    const unread = notifications.filter(n => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

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
      if (data.success) {
        const fetchedAppointments = data.data.appointments.reverse()
        setAppointments(fetchedAppointments)
        
        // ── DETECT STATUS CHANGES ──────────────────────────────────
        detectStatusChanges(fetchedAppointments)
        // ───────────────────────────────────────────────────────────
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // ── DETECT STATUS CHANGES & CREATE NOTIFICATIONS ──────────────────
  const detectStatusChanges = (currentAppointments) => {
    currentAppointments.forEach((current) => {
      const previous = appointmentsSnapshotRef.current.find(a => a.id === current.id)
      
      if (!previous) return // New appointment (ignore, not a status change)

      const prevStatus = previous.deliveryStatus
      const currStatus = current.deliveryStatus

      // Status changed?
      if (prevStatus !== currStatus) {
        const notif = generateNotification(current, currStatus)
        if (notif) addNotification(notif)
      }
    })

    // Update snapshot for next comparison
    appointmentsSnapshotRef.current = currentAppointments
  }

  // ── NOTIFICATION GENERATOR ────────────────────────────────────────
  const generateNotification = (appointment, newStatus) => {
    const statusMessages = {
      picked_up: {
        title: 'Laundry Picked Up',
        message: `Our rider has picked up your laundry and it is now on its way to ${appointment.branch?.name || 'branch'} for processing.`,
      },
      in_progress: {
        title: 'Laundry in Progress',
        message: 'Your laundry is being processed. Check back soon!',
      },
      out_for_delivery: {
        title: 'Out for Delivery',
        message: 'Your laundry is on the way! Get ready to receive it.',
      },
      delivered: {
        title: 'Laundry Delivered',
        message: 'Your laundry has been successfully delivered.',
      },
      approved: {
        title: 'Appointment Approved',
        message: `Your appointment at ${appointment.branch?.name || 'branch'} has been approved.`,
      },
      cancelled: {
        title: 'Appointment Cancelled',
        message: `Your appointment at ${appointment.branch?.name || 'branch'} has been cancelled.`,
      },
    }

    return statusMessages[newStatus]
      ? {
          id: `${appointment.id}-${newStatus}-${Date.now()}`,
          appointmentId: appointment.id,
          status: newStatus,
          timestamp: Date.now(),
          read: false,
          ...statusMessages[newStatus],
        }
      : null
  }

  // ── ADD NOTIFICATION ───────────────────────────────────────────────
  const addNotification = (notif) => {
    setNotifications((prev) => {
      // Check if notification already exists (prevent duplicates)
      const exists = prev.some(n => n.id === notif.id)
      if (exists) return prev
      return [notif, ...prev].slice(0, 20) // Keep last 20
    })
  }

  // ── REMOVE NOTIFICATION ────────────────────────────────────────────
  const removeNotification = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  // ── MARK NOTIFICATION AS READ ──────────────────────────────────────
  const markNotificationAsRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    )
  }

  // ── CLEAR ALL NOTIFICATIONS ────────────────────────────────────────
  const clearAllNotifications = () => {
    setNotifications([])
    Object.values(dismissTimersRef.current).forEach((timer) => clearTimeout(timer))
    dismissTimersRef.current = {}
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

  const resolveOverweight = async (appointmentId, resolution) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/resolve-overweight`,
        { appointmentId, resolution },
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
      clearAllNotifications()
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

  // ── AUTO-POLL APPOINTMENTS & DETECT CHANGES (if logged in) ────────
  useEffect(() => {
    if (!token) return

    // Initial fetch
    getUserAppointments()

    // Poll every 15 seconds
    notificationTimerRef.current = setInterval(() => {
      getUserAppointments()
    }, NOTIFICATION_POLL)

    return () => {
      if (notificationTimerRef.current) clearInterval(notificationTimerRef.current)
    }
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
    resolveOverweight,
    validatePromo,
    logoutUser,
    // ── NOTIFICATIONS ──────────────────────────────────────────────
    notifications,
    unreadCount,
    removeNotification,
    markNotificationAsRead,
    clearAllNotifications,
  }

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  )
}

export default AppContextProvider